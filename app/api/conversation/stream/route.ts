import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateConversationReply, type ConvTurn } from '@/lib/ai'
import { sendEmail } from '@/lib/email'
import { consumeCredit } from '@/lib/credits'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { consommerLimite } from '@/lib/limites'
import { getPlateformeConfig, iaDoitRepondre, type PlateformeConfig } from '@/lib/plateformeConfig'
import { resolveModel } from '@/lib/models'
import { declencherRegles } from '@/lib/reglesServeur'

// Ton de l'assistant (§A4) → persona passée au moteur de rédaction.
const TON: Record<PlateformeConfig['ton'], string> = {
  sobre: 'sobre, factuel et précis',
  chaleureux: 'professionnel, chaleureux et rassurant',
  direct: 'direct et efficace, sans détour',
}

// Conversation en STREAMING (v4 §A2) : le prospect voit la réponse s'écrire au fil de
// l'eau au lieu d'attendre un spinner opaque. Mêmes garde-fous que /api/conversation
// (jeton secret, honeypot, anti-flood, plafond de tours, crédits, mode manuel).
// Les erreurs AVANT le flux sortent en JSON classique ; ensuite tout passe en SSE.

export const runtime = 'nodejs'
export const maxDuration = 60

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_MSG = 4000
const MAX_TOURS = 60

type Lead = { id: string; artisan_id: string; nom_prospect: string | null; contact: string | null; message: string | null; statut: string | null; prise_en_main: boolean | null; type_chantier: string | null; photos: unknown }

async function leadByToken(token: string): Promise<Lead | null> {
  const { data } = await supabaseAdmin.from('leads').select('id, artisan_id, nom_prospect, contact, message, statut, prise_en_main, type_chantier, photos').eq('token', token).maybeSingle()
  return (data as Lead) ?? null
}
async function loadHistory(leadId: string) {
  const { data } = await supabaseAdmin.from('messages').select('sens, type, contenu, sent_at').eq('lead_id', leadId).is('etat', null).order('sent_at', { ascending: true }).limit(120)
  return (data as { sens: 'in' | 'out'; type: string | null; contenu: string; sent_at: string }[]) ?? []
}

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const messageRaw = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    if (!messageRaw) return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    if (typeof body?.website === 'string' && body.website.trim()) {
      await recordAbuse(ip, 'honeypot /api/conversation/stream')
      return NextResponse.json({ ok: true, reply: null })
    }
    const message = messageRaw.slice(0, MAX_MSG)

    const lead = await leadByToken(token)
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

    const history = await loadHistory(lead.id)
    // Même compteur atomique que /api/conversation (clé partagée : les deux routes
    // alimentent la même conversation) — 6 messages / 5 min, exactement.
    if (!(await consommerLimite(`conv:${lead.id}`, 6, 5 * 60))) {
      await recordAbuse(ip, 'flood /api/conversation/stream')
      return NextResponse.json({ error: 'Un instant — laissez-moi le temps de vous répondre 🙂' }, { status: 429 })
    }

    // Le message entrant est tracé AVANT toute génération : jamais perdu.
    await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: message })
    await supabaseAdmin.from('leads')
      .update({ statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'en_discussion', updated_at: new Date().toISOString(), lu_le: null })
      .eq('id', lead.id)

    if (history.length >= MAX_TOURS) return NextResponse.json({ ok: true, reply: null, closed: true })

    const { data: artisan } = await supabaseAdmin
      .from('artisans').select('id, nom, metier, ton_style, email, is_founder, reponse_auto, leads_pause, plan').eq('id', lead.artisan_id).maybeSingle()
    if (!artisan) return NextResponse.json({ ok: true, reply: null })

    const notifier = async (reply: string | null, alerte?: string) => {
      if (!artisan.email) return
      await sendEmail({
        to: artisan.email,
        subject: alerte
          ? `⚠️ ${alerte} — ${lead.nom_prospect || lead.contact || 'prospect'}`
          : `Échange en cours — ${lead.nom_prospect || lead.contact || 'prospect'}`,
        text: `Un prospect vous écrit sur votre page.\n\nSon message :\n« ${message} »\n\n${reply ? `Réponse automatique envoyée :\n---\n${reply}` : '(pas de réponse automatique — répondez-lui depuis Messages)'}\n\nPoursuivez l'échange dans votre espace (Messages).`,
        replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
      }).catch(() => {})
    }

    // ── Panneau de contrôle IA (§A4) : mode de réponse, escalade, plafond, plage horaire.
    // Un artisan sans configuration garde EXACTEMENT son comportement actuel.
    const cfg = await getPlateformeConfig(artisan.id, artisan.reponse_auto)
    const nbReponsesIA = history.filter((m) => m.sens === 'out' && m.type === 'reponse_auto').length

    // « Je prends la main » (v5 §9) : l'artisan répond lui-même sur CE fil. L'assistant se tait,
    // le client le voit (GET /api/conversation rend prise_en_main), l'artisan est prévenu.
    if (lead.prise_en_main) {
      await notifier(null, 'Nouveau message — vous avez la main')
      return NextResponse.json({ ok: true, reply: null, raison: 'humain' })
    }

    const decision = iaDoitRepondre(cfg, { nbReponsesIA, message, pause: artisan.leads_pause === true })

    // Mode ASSISTÉ (v5 §9) : l'assistant prépare, l'artisan valide. Avant, ce réglage se
    // contentait de faire taire l'assistant — « rien ne part sans vous » était vrai, mais
    // « l'assistant prépare » ne l'était pas. La proposition est écrite dans le fil avec
    // etat='proposition' : invisible du client, visible du poste de pilotage.
    if (!decision.ok && decision.raison === 'assistee') {
      const credit = await consumeCredit(artisan.id, 'standard', !!artisan.is_founder)
      if (credit.ok) {
        try {
          const { model, tier } = resolveModel(cfg.modele || 'standard', artisan.plan)
          const turns: ConvTurn[] = [...history.map((m) => ({ sens: m.sens, contenu: m.contenu })), { sens: 'in' as const, contenu: message }]
          const proposition = await generateConversationReply(
            { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style || TON[cfg.ton] || TON.chaleureux },
            { nom_prospect: lead.nom_prospect, contact: lead.contact, message: lead.message },
            turns, model,
          )
          if (proposition) {
            await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: proposition, etat: 'proposition', modele: tier })
            await supabaseAdmin.from('leads').update({ updated_at: new Date().toISOString(), lu_le: null }).eq('id', lead.id)
          }
        } catch (e) { console.error('[conversation/stream] proposition:', e) }
      }
      await notifier(null, 'Réponse proposée — à valider')
      return NextResponse.json({ ok: true, reply: null, raison: 'assistee' })
    }

    if (!decision.ok) {
      // L'IA se tait : on prévient l'artisan (alerte renforcée si un mot d'escalade a coupé).
      if (decision.raison === 'escalade') await notifier(null, `Demande sensible (« ${decision.mot} »)`)
      else if (decision.raison === 'limite') await notifier(null, 'Conversation à reprendre en main')
      else if (decision.raison !== 'pause') await notifier(null)
      return NextResponse.json({ ok: true, reply: null, raison: decision.raison })
    }
    const credit = await consumeCredit(artisan.id, 'standard', !!artisan.is_founder)
    if (!credit.ok) { await notifier(null); return NextResponse.json({ ok: true, reply: null }) }

    // ── Flux SSE
    const turns: ConvTurn[] = [...history.map((m) => ({ sens: m.sens, contenu: m.contenu })), { sens: 'in' as const, contenu: message }]
    const enc = new TextEncoder()
    const flux = new ReadableStream({
      async start(controller) {
        const envoyer = (o: unknown) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`)) } catch { /* client parti */ } }
        let complet = ''
        try {
          complet = await generateConversationReply(
            { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style || TON[cfg.ton] || TON.chaleureux },
            { nom_prospect: lead.nom_prospect, contact: lead.contact, message: lead.message },
            turns,
            undefined,
            (d) => { envoyer({ t: 'delta', v: d }) },
          )
        } catch (e) {
          console.error('[conversation/stream] IA:', e)
          envoyer({ t: 'error', v: "La réponse n'a pas pu être générée." })
        }
        if (complet) {
          await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: complet })
          await supabaseAdmin.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead.id)
          // Règles d'automatisation (v5 §9) : qualifié (+ photo) → devis brouillon → notifier.
          // Après la réponse, jamais avant : le client ne doit pas attendre le chiffrage.
          try { await declencherRegles({ lead, nbReponsesIA: nbReponsesIA + 1, artisanEmail: artisan.email, artisanNom: artisan.nom }) }
          catch (e) { console.error('[conversation/stream] règles:', e) }
        }
        await notifier(complet || null)
        envoyer({ t: 'done', v: complet })
        controller.close()
      },
    })

    return new Response(flux, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // pas de tampon proxy : les fragments partent tout de suite
      },
    })
  } catch (e) {
    console.error('[conversation/stream] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
