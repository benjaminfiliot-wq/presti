import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateConversationReply, type ConvTurn } from '@/lib/ai'
import { sendEmail } from '@/lib/email'
import { consumeCredit } from '@/lib/credits'
import { getIp, isBanned, recordAbuse } from '@/lib/security'

// Conversation en STREAMING (v4 §A2) : le prospect voit la réponse s'écrire au fil de
// l'eau au lieu d'attendre un spinner opaque. Mêmes garde-fous que /api/conversation
// (jeton secret, honeypot, anti-flood, plafond de tours, crédits, mode manuel).
// Les erreurs AVANT le flux sortent en JSON classique ; ensuite tout passe en SSE.

export const runtime = 'nodejs'
export const maxDuration = 60

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_MSG = 4000
const MAX_TOURS = 60

type Lead = { id: string; artisan_id: string; nom_prospect: string | null; contact: string | null; message: string | null; statut: string | null }

async function leadByToken(token: string): Promise<Lead | null> {
  const { data } = await supabaseAdmin.from('leads').select('id, artisan_id, nom_prospect, contact, message, statut').eq('token', token).maybeSingle()
  return (data as Lead) ?? null
}
async function loadHistory(leadId: string) {
  const { data } = await supabaseAdmin.from('messages').select('sens, type, contenu, sent_at').eq('lead_id', leadId).order('sent_at', { ascending: true }).limit(120)
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
    const recents = history.filter((m) => m.sens === 'in' && Date.now() - new Date(m.sent_at).getTime() < 5 * 60 * 1000)
    if (recents.length >= 6) {
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
      .from('artisans').select('id, nom, metier, ton_style, email, is_founder, reponse_auto, leads_pause').eq('id', lead.artisan_id).maybeSingle()
    if (!artisan) return NextResponse.json({ ok: true, reply: null })

    const notifier = async (reply: string | null) => {
      if (!artisan.email) return
      await sendEmail({
        to: artisan.email,
        subject: `Échange en cours — ${lead.nom_prospect || lead.contact || 'prospect'}`,
        text: `Un prospect discute sur votre page.\n\nSon message :\n« ${message} »\n\n${reply ? `Réponse automatique envoyée :\n---\n${reply}` : '(pas de réponse auto — répondez-lui depuis Messages)'}\n\nPoursuivez l'échange dans votre espace (Messages).`,
        replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
      }).catch(() => {})
    }

    // Pas de réponse IA : pause, mode manuel, ou crédits épuisés → le message est déjà sauvé.
    if (artisan.leads_pause === true || artisan.reponse_auto === false) {
      if (artisan.reponse_auto === false) await notifier(null)
      return NextResponse.json({ ok: true, reply: null, paused: artisan.leads_pause === true })
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
            { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style },
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
