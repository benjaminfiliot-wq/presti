import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'

export const runtime = 'nodejs'

// Droit à l'effacement (RGPD) — avec 30 jours de grâce (sprint J-1 §6, migration 0052).
//
// Avant, ce bouton supprimait tout dans la seconde. Un artisan qui se trompait de bouton,
// ou un tiers sur un poste ouvert, effaçait dix ans de pièces comptables sans retour.
// Maintenant : la demande POSE une date (`suppression_demandee_le`) ; le compte continue de
// fonctionner, un bandeau rappelle l'échéance, et DELETE annule. La purge réelle est faite
// par /api/cron/purge-comptes une fois les 30 jours écoulés — la suppression de
// l'utilisateur auth cascade sur `artisans` puis leads, messages, devis… sauf si le compte a
// émis des factures : elles se conservent dix ans (art. L. 102 B du LPF), le compte est alors
// ANONYMISÉ et non effacé — voir lib/purgeComptes.ts. Le récapitulatif ci-dessous le dit
// avant que l'artisan ne confirme, jamais après.

const JOURS_DE_GRACE = 30
const dateDeSuppression = (demandeeLe: string) => new Date(new Date(demandeeLe).getTime() + JOURS_DE_GRACE * 86400000)

export async function GET(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  const [{ data: a }, convs, devis, factures, emises] = await Promise.all([
    supabaseAdmin.from('artisans').select('suppression_demandee_le, site_active, plateforme_active').eq('id', s.uid).maybeSingle(),
    supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('artisan_id', s.uid),
    supabaseAdmin.from('devis').select('id', { count: 'exact', head: true }).eq('artisan_id', s.uid),
    supabaseAdmin.from('factures').select('id', { count: 'exact', head: true }).eq('artisan_id', s.uid).then((r) => r, () => ({ count: 0 })),
    supabaseAdmin.from('factures').select('id', { count: 'exact', head: true }).eq('artisan_id', s.uid).eq('verrouillee', true).then((r) => r, () => ({ count: 0 })),
  ])
  const nbFactures = (factures as { count?: number | null }).count ?? 0
  const nbEmises = (emises as { count?: number | null }).count ?? 0
  return NextResponse.json({
    ok: true,
    demandee_le: a?.suppression_demandee_le ?? null,
    supprime_le: a?.suppression_demandee_le ? dateDeSuppression(a.suppression_demandee_le).toISOString() : null,
    disparait: [
      'Votre compte et votre accès à Presti',
      a?.site_active ? 'Votre site vitrine (dépublié immédiatement à la date de suppression)' : null,
      a?.plateforme_active !== false ? 'Votre plateforme de conversation' : null,
      `${convs.count ?? 0} conversation(s) et leurs messages`,
      nbEmises
        ? `${devis.count ?? 0} devis non facturé(s) et ${nbFactures - nbEmises} facture(s) brouillon`
        : `${devis.count ?? 0} devis et ${nbFactures} facture(s)`,
      'Vos tarifs, votre inventaire, vos images',
      'Vos coordonnées, votre accès : plus personne ne peut se connecter',
    ].filter(Boolean),
    conserve: nbEmises
      ? [
          `${nbEmises} facture(s) émise(s), les devis et clients qu'elles citent : la loi impose de les garder 10 ans (art. L. 102 B du LPF). Votre compte est donc anonymisé, pas effacé.`,
          'Votre identité d’émetteur (nom, forme juridique, SIRET, adresse, n° de TVA) reste sur ces factures : ce sont des mentions légales obligatoires.',
          `Exportez vos données avant ${JOURS_DE_GRACE} jours — vos propres obligations de conservation comptable vous incombent.`,
        ]
      : [
          `Rien après ${JOURS_DE_GRACE} jours — exportez vos données avant, vos obligations de conservation comptable (10 ans) vous incombent.`,
        ],
  })
}

/** Programme la suppression : confirmation par saisie obligatoire. */
export async function POST(req: Request) {
  try {
    const s = await authArtisan(req)
    if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
    const body = await req.json().catch(() => null)
    if (String(body?.confirm || '').trim().toUpperCase() !== 'SUPPRIMER') {
      return NextResponse.json({ error: 'Confirmation manquante.' }, { status: 400 })
    }
    const quand = new Date().toISOString()
    const { error } = await supabaseAdmin.from('artisans').update({ suppression_demandee_le: quand }).eq('id', s.uid)
    if (error) {
      console.error('[account/delete]', error.message)
      return NextResponse.json({ error: 'Demande impossible. Réessayez dans un instant.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, demandee_le: quand, supprime_le: dateDeSuppression(quand).toISOString() })
  } catch (e) {
    console.error('[account/delete] inattendu:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

/** Annule une suppression programmée, tant que la date n'est pas passée. */
export async function DELETE(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  const { error } = await supabaseAdmin.from('artisans').update({ suppression_demandee_le: null }).eq('id', s.uid)
  if (error) return NextResponse.json({ error: 'Annulation impossible pour l’instant.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
