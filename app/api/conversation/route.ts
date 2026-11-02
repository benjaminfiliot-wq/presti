import { NextResponse } from 'next/server'
import { signalerPanneIA } from '@/lib/alerteService'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { suspensionEnCours } from '@/lib/suspension'
import { generateConversationReply, type ConvTurn } from '@/lib/ai'
import { notifierArtisan } from '@/lib/notifications'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { getPlateformeConfig, decisionReponse, personaDe, tonDeReponse } from '@/lib/plateformeConfig'
import { MESSAGES_ESCALADE_RELUS } from '@/lib/pilote/regles'
import { resolveModel } from '@/lib/models'
import { suiviDemande } from '@/lib/suiviDemande'
import { refusSiSansPlateforme } from '@/lib/plateformeAccesServeur'

// Conversation publique côté prospect : il rouvre SON fil via un jeton secret (uuid
// non devinable) et peut échanger avec l'artisan ; l'IA répond dans le fil. Aucun
// compte requis. Le jeton fait office de secret porteur : on ne renvoie jamais les
// données d'un autre lead, et on borne fortement pour éviter tout abus/amplification.

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_MSG = 4000
const MAX_TOURS = 60 // plafond dur de messages par conversation (anti-amplification IA)

type Lead = {
  id: string
  artisan_id: string
  nom_prospect: string | null
  contact: string | null
  message: string | null
  statut: string | null
  prise_en_main: boolean | null
}

async function leadByToken(token: string): Promise<Lead | null> {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, artisan_id, nom_prospect, contact, message, statut, prise_en_main')
    .eq('token', token)
    .maybeSingle()
  return (data as Lead) ?? null
}

async function loadHistory(leadId: string): Promise<{ sens: 'in' | 'out'; type: string | null; contenu: string; sent_at: string }[]> {
  const { data } = await supabaseAdmin
    .from('messages')
    .select('sens, type, contenu, sent_at')
    .eq('lead_id', leadId)
    .is('etat', null) // une proposition en attente ou rejetée n'existe pas pour le client
    .order('sent_at', { ascending: true })
    .limit(120)
  return (data as { sens: 'in' | 'out'; type: string | null; contenu: string; sent_at: string }[]) ?? []
}

// GET /api/conversation?token=…  → le fil (pour (ré)afficher la conversation).
export async function GET(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const token = new URL(req.url).searchParams.get('token')?.trim() || ''
    if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })

    const lead = await leadByToken(token)
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    // 15/10 (Benj) : la plateforme commence avec Studio — l'artisan d'une offre sans plateforme ne reçoit plus rien ici, et aucun crédit n'est touché.
    const ferme = await refusSiSansPlateforme(lead.artisan_id)
    if (ferme) return ferme

    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, accent, logo_url, photo_url, services, zone_intervention, bio, tva_regime, assurance_nom')
      .eq('id', lead.artisan_id)
      .maybeSingle()

    const history = await loadHistory(lead.id)

    // Carte Devis (§A3) : on n'expose QUE des devis réellement envoyés par l'artisan —
    // jamais un brouillon, qui n'a pas vocation à être vu par le client.
    const { data: dv } = await supabaseAdmin
      .from('devis')
      .select('id, numero, objet, total_ttc, statut, accepte_le')
      .eq('lead_id', lead.id)
      .in('statut', ['envoye', 'accepte', 'refuse'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    let lignes: { designation: string | null; quantite: number | null; unite: string | null }[] = []
    if (dv) {
      const { data } = await supabaseAdmin
        .from('devis_lignes').select('designation, quantite, unite').eq('devis_id', dv.id).order('ordre').limit(3)
      lignes = data ?? []
    }

    return NextResponse.json({
      ok: true,
      artisan: { nom: artisan?.nom ?? null, metier: artisan?.metier ?? null, avatar: artisan?.logo_url || artisan?.photo_url || null },
      nom_prospect: lead.nom_prospect,
      // Le client sait quand un humain a pris la main (loyauté, §A2).
      prise_en_main: lead.prise_en_main === true,
      statut: lead.statut ?? 'nouveau',
      // « Où en est ma demande » (§9 G2) : calculée depuis des états RÉELS, jamais devinée.
      suivi: suiviDemande({ statut: lead.statut, devisStatut: dv?.statut ?? null, priseEnMain: lead.prise_en_main }),
      messages: history.map((m) => ({ sens: m.sens, type: m.type, contenu: m.contenu, sent_at: m.sent_at })),
      devis: dv ? { ...dv, lignes } : null,
    })
  } catch (e) {
    console.error('[conversation] GET:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

// POST /api/conversation  { token, message, website(honeypot) } → réponse IA dans le fil.
export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const messageRaw = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    if (!messageRaw) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    // Honeypot anti-bot : champ caché qui doit rester vide.
    if (typeof body?.website === 'string' && body.website.trim()) {
      await recordAbuse(ip, 'honeypot /api/conversation')
      return NextResponse.json({ ok: true, reply: null })
    }

    const message = messageRaw.slice(0, MAX_MSG)

    const lead = await leadByToken(token)
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    // 15/10 (Benj) : la plateforme commence avec Studio — l'artisan d'une offre sans plateforme ne reçoit plus rien ici, et aucun crédit n'est touché.
    const ferme = await refusSiSansPlateforme(lead.artisan_id)
    if (ferme) return ferme

    // Anti-flood au niveau de la conversation : trop de messages du prospect sur une
    // fenêtre courte → on ralentit (et on journalise, ce qui peut déclencher un auto-ban).
    // Compteur atomique par conversation (audit v4 §3) : 6 messages / 5 min, exactement,
    // même en rafale parallèle — l'ancien filtre sur l'historique laissait tout passer.
    const history = await loadHistory(lead.id)
    if (!(await consommerLimiteStricte(`conv:${lead.id}`, 6, 5 * 60))) {
      await recordAbuse(ip, 'flood /api/conversation')
      return NextResponse.json({ error: 'Un instant — laissez-moi le temps de vous répondre 🙂' }, { status: 429 })
    }
    // Au-delà d'une conversation : plafonds par adresse (/64 en IPv6) et par artisan. Sans eux, ouvrir N demandes
    // puis écrire en boucle sur chacune faisait générer sans fin aux frais de l'artisan (audit offensif du 11/10, E3).
    if (!(await consommerLimiteStricte(`conv:ip:${ip}`, 30, 10 * 60)) || !(await consommerLimiteStricte(`conv:artisan:${lead.artisan_id}`, 60, 10 * 60))) {
      await recordAbuse(ip, 'flood /api/conversation (plafond adresse ou artisan)')
      return NextResponse.json({ error: 'Beaucoup de messages en ce moment. Réessayez dans quelques minutes.' }, { status: 429 })
    }
    if (history.length >= MAX_TOURS) {
      // Conversation très longue : on garde la trace du message mais on invite à finaliser
      // hors-ligne pour ne pas amplifier indéfiniment les coûts IA.
      await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: message })
      await supabaseAdmin.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead.id)
      return NextResponse.json({ ok: true, reply: null, closed: true })
    }

    // Trace du message entrant (jamais perdu, même si l'IA échoue ensuite).
    await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: message })
    await supabaseAdmin
      .from('leads')
      .update({ statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'en_discussion', updated_at: new Date().toISOString(), lu_le: null })
      .eq('id', lead.id)

    // Profil artisan (persona + crédits/fondateur).
    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('id, nom, metier, ton_style, email, is_founder, plan, leads_pause, services, zone_intervention, bio, tva_regime, assurance_nom')
      .eq('id', lead.artisan_id)
      .maybeSingle()
    if (!artisan) return NextResponse.json({ ok: true, reply: null })
    // Compte suspendu par la direction (v15 §5) : le moteur se tait, comme si l'artisan était en pause.
    if (await suspensionEnCours(artisan.id)) return NextResponse.json({ ok: true, reply: null, indisponible: true })

    // UNE décision, la même que /stream et /api/leads (v7, bloc 1b). Avant, cette route lisait
    // l'ancien booléen `reponse_auto` AVANT la config : remettre « auto » dans Ma plateforme ne
    // changeait rien ici. Le motif est toujours rendu — jamais un silence.
    const cfg = await getPlateformeConfig(artisan.id)
    // 02/11 (troisième audit 032-005, I3) : le fil récent du client est relu pour l'escalade, comme le pilote.
    const decision = decisionReponse(artisan, lead, cfg, { nbReponsesIA: history.filter((m) => m.sens === 'out' && m.type === 'reponse_auto').length, message,
      messagesClient: history.filter((m) => m.sens === 'in').slice(-MESSAGES_ESCALADE_RELUS).map((m) => m.contenu) })
    if (!decision.ok) {
      // En pause, le message attend dans Messages sans notification — comme sur /stream (l'aide le dit).
      if (artisan.email && decision.raison !== 'pause') {
        await notifierArtisan(artisan.id, 'nouvelle_demande', artisan.email, {
          leadId: lead.id,
          subject: decision.raison === 'escalade'
            ? `⚠️ Demande sensible (« ${decision.mot} ») — ${lead.nom_prospect || lead.contact || 'prospect'}`
            : `Nouveau message — ${lead.nom_prospect || lead.contact || 'prospect'}`,
          text: `Un prospect vous a écrit sur votre page Presti :\n\n« ${message} »\n\nRépondez-lui depuis votre espace (Messages).`,
          replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
        }).catch(() => {})
      }
      return NextResponse.json({ ok: true, reply: null, raison: decision.raison })
    }

    // Crédit pour la réponse IA. Épuisé → message tout de même sauvé, artisan notifié,
    // mais pas de réponse auto (il répondra lui-même depuis sa boîte de réception).
    // Le modèle réglé par l'artisan, débité à son vrai tarif (audit final, E-M1) — avant, cette route
    // servait le modèle par défaut et débitait « standard » quel que soit le réglage.
    const { model: modeleRegle, tier: tierRegle } = resolveModel(cfg.modele || 'standard', artisan.plan)
    const credit = await consumeCredit(artisan.id, tierRegle, !!artisan.is_founder)
    if (!credit.ok) {
      if (artisan.email) {
        await notifierArtisan(artisan.id, 'nouvelle_demande', artisan.email, {
          leadId: lead.id,
          subject: `Nouveau message — ${lead.nom_prospect || lead.contact || 'prospect'}`,
          text: `Un prospect vous a écrit sur votre page Presti :\n\n« ${message} »\n\nRépondez-lui depuis votre espace (Messages).`,
          replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
        }).catch(() => {})
      }
      return NextResponse.json({ ok: true, reply: null, raison: 'credits' })
    }

    // Réponse IA contextuelle (tout l'historique + le nouveau message).
    let reply: string | null = null
    try {
      const turns: ConvTurn[] = [
        ...history.map((m) => ({ sens: m.sens, contenu: m.contenu })),
        { sens: 'in' as const, contenu: message },
      ]
      reply = await generateConversationReply(
        { nom: artisan.nom, metier: artisan.metier, ton_style: tonDeReponse(cfg, artisan.ton_style), services: artisan.services, zone: artisan.zone_intervention, bio: artisan.bio, tva_regime: artisan.tva_regime, assurance_nom: artisan.assurance_nom },
        { nom_prospect: lead.nom_prospect, contact: lead.contact, message: lead.message },
        turns, modeleRegle, undefined, { persona: personaDe(cfg) },
      )
    } catch (e) {
      console.error('[conversation] IA:', e)
      await signalerPanneIA('réponse au client', e)
      // Le crédit est pris AVANT l'appel : si le modèle tombe, il repart. C'est la règle écrite en
      // tête de lib/credits.ts, appliquée dans stream/route.ts et oubliée ici : l'artisan payait une
      // réponse qu'il n'a jamais eue.
      if (credit?.ok) await rendreCredit(artisan.id, tierRegle, !!artisan.is_founder)
    }

    if (reply) {
      await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: reply })
      // Règles d'automatisation : déclenchées par le navigateur via /api/conversation/regles (un seul chemin).
      await supabaseAdmin.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead.id)
    }

    // Notifie l'artisan qu'un échange est en cours (une fois par message entrant).
    if (artisan.email) {
      await notifierArtisan(artisan.id, 'nouvelle_demande', artisan.email, {
        leadId: lead.id,
        subject: `Échange en cours — ${lead.nom_prospect || lead.contact || 'prospect'}`,
        text: `Un prospect discute sur votre page Presti.\n\nSon message :\n« ${message} »\n\n${reply ? `Réponse automatique envoyée :\n---\n${reply}` : '(réponse auto indisponible — répondez-lui depuis Messages)'}\n\nRetrouvez et poursuivez l'échange dans votre espace (Messages).`,
        replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, reply })
  } catch (e) {
    console.error('[conversation] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
