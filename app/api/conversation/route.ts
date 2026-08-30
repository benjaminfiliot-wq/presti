import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateConversationReply, type ConvTurn } from '@/lib/ai'
import { sendEmail } from '@/lib/email'
import { consumeCredit } from '@/lib/credits'
import { getIp, isBanned, recordAbuse } from '@/lib/security'

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
}

async function leadByToken(token: string): Promise<Lead | null> {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, artisan_id, nom_prospect, contact, message, statut')
    .eq('token', token)
    .maybeSingle()
  return (data as Lead) ?? null
}

async function loadHistory(leadId: string): Promise<{ sens: 'in' | 'out'; type: string | null; contenu: string; sent_at: string }[]> {
  const { data } = await supabaseAdmin
    .from('messages')
    .select('sens, type, contenu, sent_at')
    .eq('lead_id', leadId)
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

    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, accent, logo_url, photo_url')
      .eq('id', lead.artisan_id)
      .maybeSingle()

    const history = await loadHistory(lead.id)
    return NextResponse.json({
      ok: true,
      artisan: { nom: artisan?.nom ?? null, metier: artisan?.metier ?? null, avatar: artisan?.logo_url || artisan?.photo_url || null },
      nom_prospect: lead.nom_prospect,
      messages: history.map((m) => ({ sens: m.sens, contenu: m.contenu, sent_at: m.sent_at })),
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

    // Anti-flood au niveau de la conversation : trop de messages du prospect sur une
    // fenêtre courte → on ralentit (et on journalise, ce qui peut déclencher un auto-ban).
    const history = await loadHistory(lead.id)
    const ins = history.filter((m) => m.sens === 'in')
    const recent = ins.filter((m) => Date.now() - new Date(m.sent_at).getTime() < 5 * 60 * 1000)
    if (recent.length >= 6) {
      await recordAbuse(ip, 'flood /api/conversation')
      return NextResponse.json({ error: 'Un instant — laissez-moi le temps de vous répondre 🙂' }, { status: 429 })
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
      .select('id, nom, metier, ton_style, email, is_founder')
      .eq('id', lead.artisan_id)
      .maybeSingle()
    if (!artisan) return NextResponse.json({ ok: true, reply: null })

    // Crédit pour la réponse IA. Épuisé → message tout de même sauvé, artisan notifié,
    // mais pas de réponse auto (il répondra lui-même depuis sa boîte de réception).
    const credit = await consumeCredit(artisan.id, 'standard', !!artisan.is_founder)
    if (!credit.ok) {
      if (artisan.email) {
        await sendEmail({
          to: artisan.email,
          subject: `Nouveau message — ${lead.nom_prospect || lead.contact || 'prospect'}`,
          text: `Un prospect vous a écrit sur votre page Presti :\n\n« ${message} »\n\nRépondez-lui depuis votre espace (Messages).`,
          replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
        }).catch(() => {})
      }
      return NextResponse.json({ ok: true, reply: null })
    }

    // Réponse IA contextuelle (tout l'historique + le nouveau message).
    let reply: string | null = null
    try {
      const turns: ConvTurn[] = [
        ...history.map((m) => ({ sens: m.sens, contenu: m.contenu })),
        { sens: 'in' as const, contenu: message },
      ]
      reply = await generateConversationReply(
        { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style },
        { nom_prospect: lead.nom_prospect, contact: lead.contact, message: lead.message },
        turns,
      )
    } catch (e) {
      console.error('[conversation] IA:', e)
    }

    if (reply) {
      await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: reply })
      await supabaseAdmin.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead.id)
    }

    // Notifie l'artisan qu'un échange est en cours (une fois par message entrant).
    if (artisan.email) {
      await sendEmail({
        to: artisan.email,
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
