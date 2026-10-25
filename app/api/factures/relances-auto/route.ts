import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'
import { messageVerrou, offreMinimale, peut } from '@/lib/plans'
import { jourParis } from '@/lib/comptaTableau'
import { lireReglagesRelances, REGLAGES_RELANCES_PAR_DEFAUT } from '@/lib/relancesImpayes'
import { reglagesDeLigne } from '@/lib/relancesImpayesMagasin'

export const runtime = 'nodejs'

// Les relances automatiques des factures impayées (migration 0159) : réglage de l'artisan, journal, arrêt/reprise facture par facture.
// Fermée (404) drapeau baissé. Lit et écrit les SEULES lignes du compte de la session ; le service filtre toujours sur `session.uid`.
// Désactivées par défaut : activer, c'est un geste de l'artisan (PUT avec actif: true), jamais un effet de bord d'autre chose.
const ferme = () => !actif('relancesImpayes')
const NON_MISE_EN_PLACE = { error: 'Les relances automatiques ne sont pas encore disponibles. Réessayez plus tard.' }

async function disponible(uid: string): Promise<{ ok: true; auto: boolean } | { ok: false; statut: number; erreur: string; code?: 'offre'; offre?: string | null }> {
  const { data, error } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', uid).maybeSingle()
  if (error || !data) return { ok: false, statut: 503, erreur: 'Compte illisible.' }
  // 15/10 (Benj, « En Studio ») : la capacité est celle de Studio et au-dessus. Même forme de refus que les écrans réservés (lib/accesOffre.ts) :
  // { code: 'offre', offre } — l'écran Factures s'en sert pour montrer le réglage verrouillé.
  if (!data.is_founder && !peut(data.plan, 'factures.relances')) return { ok: false, statut: 403, code: 'offre', offre: offreMinimale('factures.relances'), erreur: `Les relances automatiques des factures ne sont pas dans votre offre. ${messageVerrou('factures.relances')}` }
  // 25/10 (Benj) : Signature (`factures.relances.auto`) — elles partent seules ; Studio — elles sont préparées, l'artisan les valide.
  return { ok: true, auto: peut(data.plan, 'factures.relances.auto') }
}

export async function GET(req: Request) {
  if (ferme()) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const session = await authArtisan(req)
  if (estEchec(session)) return NextResponse.json({ error: session.error, code: session.code }, { status: session.status })
  const dispo = await disponible(session.uid)
  if (!dispo.ok) return NextResponse.json({ error: dispo.erreur, code: dispo.code, offre: dispo.offre }, { status: dispo.statut, headers: { 'Cache-Control': 'no-store' } })
  const [r, j, a] = await Promise.all([
    supabaseAdmin.from('relances_impayes_reglages').select('actif, jours, textes, actif_depuis').eq('artisan_id', session.uid).maybeSingle(),
    supabaseAdmin.from('relances_impayes').select('facture_id, rang, jour, statut, envoyee_le').eq('artisan_id', session.uid).order('jour', { ascending: false }).limit(2000),
    supabaseAdmin.from('relances_impayes_arrets').select('facture_id, raison, le, reprise_le').eq('artisan_id', session.uid).limit(2000),
  ])
  if (r.error || j.error || a.error) { console.error('[factures/relances-auto] lecture', (r.error ?? j.error ?? a.error)?.message); return NextResponse.json(NON_MISE_EN_PLACE, { status: 503 }) }
  // Les relances préparées qui attendent l'artisan (offre Studio, migration 0181). Lues à part et TOLÉRÉES en erreur : sans 0181 la
  // colonne `texte` n'existe pas, la liste est vide, et le reste de l'écran (Signature compris) continue de marcher. Une facture qui
  // n'est plus due (payée, annulée) ne s'y montre pas : sa relance ne pourrait plus partir.
  const v = await supabaseAdmin.from('relances_impayes').select('id, facture_id, rang, jour, destinataire, sujet, texte, factures(numero, client_nom, statut, total_ttc)')
    .eq('artisan_id', session.uid).eq('statut', 'a_valider').order('jour', { ascending: true }).limit(200)
  if (v.error) console.error('[factures/relances-auto] à valider', v.error.message)
  type FactureJointe = { numero: string | null; client_nom: string | null; statut: string | null; total_ttc: number | string | null }
  const aValider = (v.error ? [] : (v.data ?? [])).map((x) => {
    const fj = (Array.isArray(x.factures) ? x.factures[0] : x.factures) as FactureJointe | null | undefined
    return { id: x.id as string, facture_id: x.facture_id as string, rang: x.rang as number, jour: x.jour as string, destinataire: x.destinataire as string, sujet: (x.sujet as string | null) ?? '', texte: (x.texte as string | null) ?? '', numero: fj?.numero ?? null, client_nom: fj?.client_nom ?? null, total_ttc: fj?.total_ttc ?? null, statut_facture: fj?.statut ?? null }
  }).filter((x) => x.statut_facture === 'emise')
  return NextResponse.json({
    reglages: r.data ? reglagesDeLigne(r.data) : REGLAGES_RELANCES_PAR_DEFAUT,
    journal: j.data ?? [],
    arrets: (a.data ?? []).filter((x) => !x.reprise_le),
    auto: dispo.auto,
    a_valider: aValider,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(req: Request) {
  if (ferme()) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const session = await authArtisan(req)
  if (estEchec(session)) return NextResponse.json({ error: session.error, code: session.code }, { status: session.status })
  const dispo = await disponible(session.uid)
  if (!dispo.ok) return NextResponse.json({ error: dispo.erreur, code: dispo.code, offre: dispo.offre }, { status: dispo.statut, headers: { 'Cache-Control': 'no-store' } })
  const lu = lireReglagesRelances(await req.json().catch(() => null))
  if (!lu.ok) return NextResponse.json({ error: lu.erreur }, { status: 400 })
  const avant = await supabaseAdmin.from('relances_impayes_reglages').select('actif, actif_depuis').eq('artisan_id', session.uid).maybeSingle()
  if (avant.error) { console.error('[factures/relances-auto] lecture', avant.error.message); return NextResponse.json(NON_MISE_EN_PLACE, { status: 503 }) }
  // « Actif depuis » : le jour où l'artisan a coché la case (information affichée, pas une règle).
  const depuis = lu.reglages.actif ? (avant.data?.actif ? avant.data.actif_depuis : jourParis(new Date())) : (avant.data?.actif_depuis ?? null)
  const { error } = await supabaseAdmin.from('relances_impayes_reglages').upsert(
    { artisan_id: session.uid, actif: lu.reglages.actif, jours: lu.reglages.jours, textes: lu.reglages.textes, actif_depuis: depuis, updated_at: new Date().toISOString() },
    { onConflict: 'artisan_id' },
  )
  if (error) { console.error('[factures/relances-auto] écriture', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 503 }) }
  return NextResponse.json({ ok: true, reglages: { ...lu.reglages, actif_depuis: depuis } })
}

/** Arrêter ou reprendre les relances d'UNE facture du compte. */
export async function POST(req: Request) {
  if (ferme()) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const session = await authArtisan(req)
  if (estEchec(session)) return NextResponse.json({ error: session.error, code: session.code }, { status: session.status })
  const dispo = await disponible(session.uid)
  if (!dispo.ok) return NextResponse.json({ error: dispo.erreur, code: dispo.code, offre: dispo.offre }, { status: dispo.statut, headers: { 'Cache-Control': 'no-store' } })
  const b = (await req.json().catch(() => null)) as { facture_id?: unknown; action?: unknown } | null
  const id = typeof b?.facture_id === 'string' && /^[0-9a-f-]{36}$/i.test(b.facture_id) ? b.facture_id : null
  if (!id || (b?.action !== 'arreter' && b?.action !== 'reprendre')) return NextResponse.json({ error: 'Demande illisible.' }, { status: 400 })
  // La facture doit être celle de CE compte : sinon introuvable, sans dire si elle existe ailleurs.
  const f = await supabaseAdmin.from('factures').select('id').eq('id', id).eq('artisan_id', session.uid).maybeSingle()
  if (f.error) return NextResponse.json({ error: 'Facture illisible.' }, { status: 503 })
  if (!f.data) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  const maintenant = new Date().toISOString()
  const { error } = b.action === 'arreter'
    ? await supabaseAdmin.from('relances_impayes_arrets').upsert({ facture_id: id, artisan_id: session.uid, raison: 'artisan', le: maintenant, reprise_le: null }, { onConflict: 'facture_id' })
    : await supabaseAdmin.from('relances_impayes_arrets').update({ reprise_le: maintenant }).eq('facture_id', id).eq('artisan_id', session.uid).is('reprise_le', null)
  if (error) { console.error('[factures/relances-auto] arrêt', error.message); return NextResponse.json({ error: 'Action impossible.' }, { status: 503 }) }
  return NextResponse.json({ ok: true })
}
