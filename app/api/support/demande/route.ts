import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { notifierEntreprise } from '@/lib/email'
import { actif } from '@/lib/flags'
import { peut } from '@/lib/plans'
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

  const b = (await req.json().catch(() => null)) as { sujet?: unknown; message?: unknown; element?: unknown } | null
  const sujet = typeof b?.sujet === 'string' ? b.sujet.trim().slice(0, 160) : ''
  const message = typeof b?.message === 'string' ? b.message.trim() : ''
  if (message.length < 10) return NextResponse.json({ error: 'Décrivez votre problème en quelques mots.' }, { status: 400 })
  if (message.length > 10_000) return NextResponse.json({ error: 'Message trop long (10 000 caractères au maximum).' }, { status: 400 })

  // 0075 — l'artisan désigne ce dont il parle. C'est la SEULE façon pour Presti de demander à
  // regarder quelque chose : sans élément ici, le ticket n'ouvrira jamais aucun accès.
  const el = b?.element as { type?: unknown; id?: unknown } | undefined
  const elType = typeof el?.type === 'string' && ['lead', 'devis', 'facture'].includes(el.type) ? el.type : ''
  const elId = typeof el?.id === 'string' && /^[0-9a-f-]{36}$/i.test(el.id) ? el.id : ''
  if (!!el && (!elType || !elId)) return NextResponse.json({ error: 'Élément inconnu.' }, { status: 400 })

  const { data: a } = await supabaseAdmin.from('artisans').select('nom, email, plan').eq('id', s.uid).maybeSingle()
  const nom = a?.nom || a?.email || 'Un artisan'
  // Le délai promis par les CGU (§4) et la grille (lib/plans.ts, « Support par écrit »), écrit EN TÊTE du sujet, là où la
  // personne qui répond le lit : jusqu'au 12/10, rien dans le produit ne distinguait la demande d'un Signature (« tête de
  // file ») de celle d'un essai (audit des promesses, site, ligne 47).
  const marque = peut(a?.plan, 'support.prioritaire') ? '[Prioritaire · 1 jour ouvré]' : peut(a?.plan, 'plateforme.conversation') ? '[2 jours ouvrés]' : '[3 jours ouvrés]'

  // Le titre est résolu ICI, à partir de la base, et jamais recopié du navigateur : c'est ce que
  // l'artisan relira dans son écran de sécurité, et il doit venir de ses données, pas d'un champ.
  // La requête est bornée à lui : joindre l'identifiant d'un autre ne désigne rien.
  let elTitre = ''
  if (elType && elId) {
    const t = elType === 'lead'
      ? await supabaseAdmin.from('leads').select('id, created_at').eq('id', elId).eq('artisan_id', s.uid).maybeSingle()
      : elType === 'devis'
        ? await supabaseAdmin.from('devis').select('id, numero').eq('id', elId).eq('artisan_id', s.uid).maybeSingle()
        : await supabaseAdmin.from('factures').select('id, numero').eq('id', elId).eq('artisan_id', s.uid).maybeSingle()
    if (!t.data) return NextResponse.json({ error: 'Cet élément n’est pas dans votre compte.' }, { status: 400 })
    const d = t.data as { numero?: string | null; created_at?: string }
    elTitre = elType === 'lead'
      ? `Conversation du ${new Date(d.created_at ?? Date.now()).toLocaleDateString('fr-FR')}`
      : `${elType === 'devis' ? 'Devis' : 'Facture'} n° ${d.numero ?? '?'}`
  }

  // Le fil rejoint la messagerie de l'entreprise. Message-ID de notre fabrication : il n'y a pas
  // d'email entrant ici, mais le dédoublonnage et le fil de `courriers` en ont besoin.
  const messageId = `<support-${crypto.randomUUID()}@prestiapp.fr>`
  const { data: c, error: eC } = await supabaseAdmin.rpc('enregistrer_courrier', {
    p_message_id: messageId, p_fil: messageId, p_sens: 'recu',
    p_email: a?.email ?? '', p_nom: nom,
    p_sujet: `${marque} ${sujet || 'Demande d’aide'}`, p_corps: message,
    p_recu_le: new Date().toISOString(), p_boite: 'SUPPORT', p_uid: null,
  })
  if (eC) { console.error('[support] courrier :', eC.message); return NextResponse.json({ error: 'Votre message n’a pas pu être enregistré.', code: 'transaction' }, { status: 503 }) }

  const { data: t, error: eT } = await supabaseAdmin.from('tickets')
    .insert({
      artisan_id: s.uid, fil: messageId, sujet: sujet || 'Demande d’aide',
      element_type: elType || null, element_id: elId || null, element_titre: elTitre || null,
    })
    .select('id').single()
  if (eT) { console.error('[support] ticket :', eT.message); return NextResponse.json({ error: 'Votre message n’a pas pu être enregistré.', code: 'transaction' }, { status: 503 }) }

  // On prévient, sans faire échouer la demande si l'email ne part pas : le message est DÉJÀ en base,
  // et le perdre parce qu'une notification a raté serait le pire des deux mondes.
  await notifierEntreprise(`${marque} Demande d’aide — ${nom}`,`${nom}\n\n${message.slice(0, 2000)}`, a?.email ?? undefined)
    .catch(() => {})

  return NextResponse.json({
    ok: true, ticket: t.id,
    message: 'Votre demande est arrivée. Nous vous répondons par email.',
    // Dit ici, pour que personne ne le découvre au moment où la question se pose.
    element: elTitre || null,
    note: elTitre
      ? `Si nous avons besoin de regarder ${elTitre}, nous vous le demanderons : c’est vous qui ouvrez, pour une heure, et vous verrez exactement ce qui a été consulté.`
      : 'Vous n’avez joint aucun élément : nous ne pourrons donc rien demander à regarder sur ce message, et nous répondrons par écrit.',
  })
}
