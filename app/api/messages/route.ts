import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateConversationReply, type ConvTurn } from '@/lib/ai'
import { sendEmail } from '@/lib/email'
import { consumeCredit } from '@/lib/credits'
import { resolveModel } from '@/lib/models'

export const runtime = 'nodejs'
export const maxDuration = 60

// Boîte de réception artisan : répondre à un prospect dans le fil, ou demander à
// l'IA une suggestion de réponse. Authentifié (Bearer) + vérification de propriété
// du lead. L'insertion de messages passe par le service_role (aucune policy INSERT
// cliente sur `messages`), donc TOUJOURS après contrôle que le lead appartient à l'artisan.

type Lead = {
  id: string; artisan_id: string; nom_prospect: string | null
  contact: string | null; message: string | null; statut: string | null
}

async function authArtisan(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return { error: NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 }) }
  return { uid: data.user.id }
}

async function ownedLead(leadId: string, uid: string): Promise<Lead | null> {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, artisan_id, nom_prospect, contact, message, statut')
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

export async function POST(req: Request) {
  try {
    const auth = await authArtisan(req)
    if ('error' in auth) return auth.error
    const uid = auth.uid

    const body = await req.json().catch(() => null)
    const action = body?.action === 'suggest' ? 'suggest' : 'reply'
    const leadId = typeof body?.lead_id === 'string' ? body.lead_id : ''
    if (!leadId) return NextResponse.json({ error: 'Conversation manquante' }, { status: 400 })

    const lead = await ownedLead(leadId, uid)
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, ton_style, email, is_founder, plan')
      .eq('id', uid)
      .maybeSingle()

    // ── Suggestion IA : renvoie un brouillon que l'artisan pourra éditer avant d'envoyer.
    //    L'artisan CHOISIT le modèle (Standard/Pro/Expert) ; on respecte sa formule.
    if (action === 'suggest') {
      const { tier, model, downgraded } = resolveModel(typeof body?.model === 'string' ? body.model : 'standard', artisan?.plan)
      const credit = await consumeCredit(uid, tier, !!artisan?.is_founder)
      if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })
      const turns = await history(leadId)
      if (!turns.length) return NextResponse.json({ error: 'Aucun message à traiter.' }, { status: 400 })
      const reply = await generateConversationReply(
        { nom: artisan?.nom ?? null, metier: artisan?.metier ?? null, ton_style: artisan?.ton_style ?? null },
        { nom_prospect: lead.nom_prospect, contact: lead.contact, message: lead.message },
        turns,
        model,
      )
      return NextResponse.json({ ok: true, reply, tier, downgraded })
    }

    // ── Réponse de l'artisan (envoyée telle quelle dans le fil + par email si possible).
    const contenu = typeof body?.message === 'string' ? body.message.trim().slice(0, 4000) : ''
    if (!contenu) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'manuel', contenu })
    await supabaseAdmin
      .from('leads')
      .update({
        statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'en_discussion',
        updated_at: new Date().toISOString(),
        lu_le: new Date().toISOString(),
      })
      .eq('id', lead.id)

    // Email au prospect si son contact est un email (sinon il verra la réponse sur la plateforme).
    let emailed = false
    if (lead.contact && lead.contact.includes('@')) {
      const r = await sendEmail({
        to: lead.contact,
        fromName: artisan?.nom || undefined, // white-label : le prospect voit la marque de l'artisan
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
