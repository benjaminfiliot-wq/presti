import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { notifierEntreprise } from '@/lib/email'
import { actif } from '@/lib/flags'
import crypto from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/support/demande — l'artisan demande de l'aide, depuis SA console.
//
// Pourquoi cette route existe, et pourquoi elle est la première pierre du mode support : le
// formulaire de contact du site est public et anonyme. Rien, aujourd'hui, ne prouve de qui vient une
// demande d'aide — et on n'ouvre pas une porte sur les données de quelqu'un sur la foi d'un email
// signé « Jean ». Ici, l'identité vient de la SESSION, jamais du corps de la requête.
//
// Ce que le ticket apporte, et rien de plus : un artisan prouvé. Le corps du message, lui, part dans
// la messagerie de l'entreprise (`courriers`, migration 0069) comme n'importe quel courrier — il n'y
// a pas deux endroits où lire ce que quelqu'un nous écrit.
//
// Un ticket n'autorise RIEN par lui-même. Il rend une demande d'accès POSSIBLE ; seul le clic de
// l'artisan, plus tard, ouvre quoi que ce soit.

export async function POST(req: Request) {
  if (!actif('supportArtisan')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })

  const b = (await req.json().catch(() => null)) as { sujet?: unknown; message?: unknown } | null
  const sujet = typeof b?.sujet === 'string' ? b.sujet.trim().slice(0, 160) : ''
  const message = typeof b?.message === 'string' ? b.message.trim() : ''
  if (message.length < 10) return NextResponse.json({ error: 'Décrivez votre problème en quelques mots.' }, { status: 400 })
  if (message.length > 10_000) return NextResponse.json({ error: 'Message trop long (10 000 caractères au maximum).' }, { status: 400 })

  const { data: a } = await supabaseAdmin.from('artisans').select('nom, email').eq('id', s.uid).maybeSingle()
  const nom = a?.nom || a?.email || 'Un artisan'

  // Le fil rejoint la messagerie de l'entreprise. Message-ID de notre fabrication : il n'y a pas
  // d'email entrant ici, mais le dédoublonnage et le fil de `courriers` en ont besoin.
  const messageId = `<support-${crypto.randomUUID()}@prestiapp.fr>`
  const { data: c, error: eC } = await supabaseAdmin.rpc('enregistrer_courrier', {
    p_message_id: messageId, p_fil: messageId, p_sens: 'recu',
    p_email: a?.email ?? '', p_nom: nom,
    p_sujet: sujet || 'Demande d’aide', p_corps: message,
    p_recu_le: new Date().toISOString(), p_boite: 'SUPPORT', p_uid: null,
  })
  if (eC) { console.error('[support] courrier :', eC.message); return NextResponse.json({ error: 'Votre message n’a pas pu être enregistré.', code: 'transaction' }, { status: 503 }) }

  const { data: t, error: eT } = await supabaseAdmin.from('tickets')
    .insert({ artisan_id: s.uid, fil: messageId, sujet: sujet || 'Demande d’aide' })
    .select('id').single()
  if (eT) { console.error('[support] ticket :', eT.message); return NextResponse.json({ error: 'Votre message n’a pas pu être enregistré.', code: 'transaction' }, { status: 503 }) }

  // On prévient, sans faire échouer la demande si l'email ne part pas : le message est DÉJÀ en base,
  // et le perdre parce qu'une notification a raté serait le pire des deux mondes.
  await notifierEntreprise(`Demande d’aide — ${nom}`, `${nom}\n\n${message.slice(0, 2000)}`, a?.email ?? undefined)
    .catch(() => {})

  return NextResponse.json({
    ok: true, ticket: t.id,
    message: 'Votre demande est arrivée. Nous vous répondons par email.',
    // Dit ici, pour que personne ne le découvre au moment où la question se pose.
    note: 'Si nous avons besoin de regarder un élément de votre compte, nous vous le demanderons : c’est vous qui ouvrez, pour une heure, et vous verrez exactement ce qui a été consulté.',
  })
}
