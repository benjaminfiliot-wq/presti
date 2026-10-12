import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateConversationReply, type ConvTurn } from '@/lib/ai'
import { sendEmail } from '@/lib/email'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { signalerPanneIA } from '@/lib/alerteService'
import { resolveModel } from '@/lib/models'
import { getPlateformeConfig, personaDe } from '@/lib/plateformeConfig'
import { getUserRevocable } from '@/lib/authArtisan'
import { planifierRelances } from '@/lib/relances'
import { completerLeadCanal, envoyerReponseCanal, type IssueEnvoi } from '@/lib/canaux/serveur'

export const runtime = 'nodejs'
export const maxDuration = 60

// Boîte de réception artisan : répondre à un prospect dans le fil, ou demander à
// l'IA une suggestion de réponse. Authentifié (Bearer) + vérification de propriété
// du lead. L'insertion de messages passe par le service_role (aucune policy INSERT
// cliente sur `messages`), donc TOUJOURS après contrôle que le lead appartient à l'artisan.

type Lead = {
  id: string; artisan_id: string; nom_prospect: string | null
  contact: string | null; message: string | null; statut: string | null; prise_en_main: boolean | null
  canal: string | null
}

async function authArtisan(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data, error } = await getUserRevocable(token)
  if (error || !data?.user) return { error: NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 }) }
  return { uid: data.user.id }
}

async function ownedLead(leadId: string, uid: string): Promise<Lead | null> {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, artisan_id, nom_prospect, contact, message, statut, prise_en_main, canal')
    .eq('id', leadId)
    .maybeSingle()
  const lead = (data as Lead) ?? null
  if (!lead || lead.artisan_id !== uid) return null
  return lead
}

async function history(leadId: string): Promise<ConvTurn[]> {
  const { data } = await supabaseAdmin
    .from('messages')
    .select('sens, contenu, sent_at')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: true })
    .limit(120)
  return ((data as { sens: 'in' | 'out'; contenu: string }[]) ?? []).map((m) => ({ sens: m.sens, contenu: m.contenu }))
}

/** Le message parti par un canal garde la trace de son canal et de son identifiant chez Meta. */
function traceEnvoi(e: IssueEnvoi): { canal_id?: string; externe_id?: string } {
  if (!e.traite || !e.ok) return {}
  return { ...(e.canal_id ? { canal_id: e.canal_id } : {}), ...(e.externe_id ? { externe_id: e.externe_id } : {}) }
}
/** Ce que l'écran doit savoir : le canal, et pour Le Bon Coin le lien où coller la réponse. */
function reponseCanal(e: IssueEnvoi): { canal?: string; lien?: string } {
  if (!e.traite || !e.ok) return {}
  return { canal: e.canal, ...(e.manuel ? { lien: e.manuel.lien } : {}) }
}

export async function POST(req: Request) {
  try {
    const auth = await authArtisan(req)
    if ('error' in auth) return auth.error
    const uid = auth.uid

    const body = await req.json().catch(() => null)
    const ACTIONS = ['reply', 'suggest', 'valider', 'rejeter', 'prise_en_main', 'rendre_main', 'escalader'] as const
    type Action = typeof ACTIONS[number]
    const action: Action = (ACTIONS as readonly string[]).includes(body?.action) ? body.action : 'reply'
    const leadId = typeof body?.lead_id === 'string' ? body.lead_id : ''
    if (!leadId) return NextResponse.json({ error: 'Conversation manquante' }, { status: 400 })

    const lead = await ownedLead(leadId, uid)
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

    // ── Poste de pilotage (v5 §9) : prise de main, escalade, propositions de l'assistant.
    // « Rendre la main » a son propre nom (v7, 1d) : avant, il fallait savoir envoyer
    // `prise_en_main` avec `valeur:false` — l'audit l'a cru absent, et l'écran ne l'offrait
    // qu'en retour du même bouton. Le geste est désormais explicite, dans l'API et à l'écran.
    if (action === 'prise_en_main' || action === 'rendre_main' || action === 'escalader') {
      const valeur = action === 'escalader' ? true : action === 'rendre_main' ? false : body?.valeur !== false
      await supabaseAdmin.from('leads').update({
        prise_en_main: valeur, prise_en_main_le: valeur ? new Date().toISOString() : null,
        ...(action === 'escalader' ? { urgence: 'urgent', lu_le: null } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id)
      return NextResponse.json({ ok: true, prise_en_main: valeur })
    }
    if (action === 'valider' || action === 'rejeter') {
      const messageId = typeof body?.message_id === 'string' ? body.message_id : ''
      const { data: prop } = await supabaseAdmin.from('messages').select('id, contenu, etat').eq('id', messageId).eq('lead_id', lead.id).maybeSingle()
      if (!prop || prop.etat !== 'proposition') return NextResponse.json({ error: 'Proposition introuvable ou déjà traitée.' }, { status: 404 })
      if (action === 'rejeter') {
        await supabaseAdmin.from('messages').update({ etat: 'rejete' }).eq('id', prop.id)
        return NextResponse.json({ ok: true })
      }
      // Valider = le message devient réel pour le client (etat null), à l'instant de la validation,
      // et part par email si le prospect en a un. Texte éventuellement retouché par l'artisan.
      const texte = typeof body?.message === 'string' && body.message.trim() ? body.message.trim().slice(0, 4000) : prop.contenu
      // WhatsApp, Messenger, Instagram : la réponse part par la Graph API AVANT d'être marquée envoyée ; refusée (hors des 24 h,
      // jeton expiré…), la proposition reste en attente et l'artisan lit pourquoi. Le Bon Coin : pas d'API, il la colle lui-même.
      const envoi = await envoyerReponseCanal(await completerLeadCanal(lead), texte)
      if (envoi.traite && !envoi.ok) return NextResponse.json({ error: envoi.erreur, hors_fenetre: !!envoi.hors_fenetre }, { status: envoi.statut })
      await supabaseAdmin.from('messages').update({ etat: null, contenu: texte, sent_at: new Date().toISOString(), ...traceEnvoi(envoi) }).eq('id', prop.id)
      // `repondu`, pas `en_discussion` : une réponse vient de partir au nom de l'artisan, la balle
      // est chez le prospect. C'est le parcours NORMAL de l'Essentiel (l'assistant prépare, l'artisan
      // valide) — et c'est ce statut que le cron des relances exige.
      await supabaseAdmin.from('leads').update({ statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'repondu', updated_at: new Date().toISOString(), lu_le: new Date().toISOString() }).eq('id', lead.id)
      // Pas de relance automatique sur ces canaux : hors des 24 h, Meta la refuserait, et Le Bon Coin n'a pas d'API.
      if (envoi.traite) return NextResponse.json({ ok: true, emailed: false, ...reponseCanal(envoi) })
      if (lead.statut !== 'gagne' && lead.statut !== 'perdu') await planifierRelances(lead.id)
      const { data: artisanV } = await supabaseAdmin.from('artisans').select('nom, email').eq('id', uid).maybeSingle()
      let emailed = false
      if (lead.contact && lead.contact.includes('@')) {
        const r = await sendEmail({ to: lead.contact, fromName: artisanV?.nom?.trim() || 'Votre artisan', subject: `Réponse de ${artisanV?.nom ?? 'votre artisan'}`, text: `${texte}\n\n— ${artisanV?.nom ?? ''}`, replyTo: artisanV?.email ?? undefined }).catch(() => ({ ok: false }))
        emailed = !!r.ok
      }
      return NextResponse.json({ ok: true, emailed })
    }

    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, ton_style, email, is_founder, plan')
      .eq('id', uid)
      .maybeSingle()

    // ── Suggestion IA : renvoie un brouillon que l'artisan pourra éditer avant d'envoyer.
    //    L'artisan CHOISIT le modèle (Standard/Pro/Expert) ; on respecte sa formule.
    if (action === 'suggest') {
      // Le modèle ne se choisit plus ici : il vient de « Ma plateforme → Intelligence »
      // (v4 §B1 — l'IA vit dans la plateforme, la boîte de réception ne fait que proposer).
      const cfg = await getPlateformeConfig(uid)
      const { tier, model, downgraded } = resolveModel(cfg.modele || 'standard', artisan?.plan)
      const credit = await consumeCredit(uid, tier, !!artisan?.is_founder)
      if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })
      const turns = await history(leadId)
      if (!turns.length) { await rendreCredit(uid, tier, !!artisan?.is_founder); return NextResponse.json({ error: 'Aucun message à traiter.' }, { status: 400 }) }
      try {
        const reply = await generateConversationReply(
          { nom: artisan?.nom ?? null, metier: artisan?.metier ?? null, ton_style: artisan?.ton_style ?? null },
          { nom_prospect: lead.nom_prospect, contact: lead.contact, message: lead.message },
          turns,
          model,
          undefined,
          { persona: personaDe(cfg) },
        )
        return NextResponse.json({ ok: true, reply, tier, downgraded })
      } catch (e) {
        // La suggestion a échoué : l'entreprise le sait, le crédit revient (audit final, E, M5).
        console.error('[messages] suggestion IA:', e)
        await signalerPanneIA('suggestion de réponse (/api/messages)', e)
        await rendreCredit(uid, tier, !!artisan?.is_founder)
        return NextResponse.json({ error: 'La suggestion n’a pas pu être produite. Réessayez dans un instant.' }, { status: 502 })
      }
    }

    // ── Réponse de l'artisan (envoyée telle quelle dans le fil + par email si possible).
    const contenu = typeof body?.message === 'string' ? body.message.trim().slice(0, 4000) : ''
    if (!contenu) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    const envoi = await envoyerReponseCanal(await completerLeadCanal(lead), contenu)
    if (envoi.traite && !envoi.ok) return NextResponse.json({ error: envoi.erreur, hors_fenetre: !!envoi.hors_fenetre }, { status: envoi.statut })
    await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'manuel', contenu, ...traceEnvoi(envoi) })
    // `repondu` : l'artisan vient de parler, la balle repasse au prospect. `en_discussion` dit
    // l'inverse (le prospect a parlé en dernier) et sert de condition d'ARRÊT au cron — le poser
    // ici revenait à éteindre les relances de sa propre réponse.
    await supabaseAdmin
      .from('leads')
      .update({
        statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'repondu',
        updated_at: new Date().toISOString(),
        lu_le: new Date().toISOString(),
      })
      .eq('id', lead.id)

    // La promesse « Relances automatiques » de la grille, vraie dès l'Essentiel : elle ne dépend
    // plus de l'assistant autonome (vendu à partir de Studio), mais du fait qu'une réponse est partie.
    if (envoi.traite) return NextResponse.json({ ok: true, emailed: false, ...reponseCanal(envoi) })
    if (lead.statut !== 'gagne' && lead.statut !== 'perdu') await planifierRelances(lead.id)

    // Email au prospect si son contact est un email (sinon il verra la réponse sur la plateforme).
    let emailed = false
    if (lead.contact && lead.contact.includes('@')) {
      const r = await sendEmail({
        to: lead.contact,
        fromName: artisan?.nom?.trim() || 'Votre artisan', // white-label : le prospect voit la marque de l'artisan
        subject: `Réponse de ${artisan?.nom ?? 'votre artisan'}`,
        text: `${contenu}\n\n— ${artisan?.nom ?? ''}`,
        replyTo: artisan?.email ?? undefined,
      }).catch(() => ({ ok: false }))
      emailed = !!r.ok
    }

    return NextResponse.json({ ok: true, emailed })
  } catch (e) {
    console.error('[messages] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
