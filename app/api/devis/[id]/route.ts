import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeTotals } from '@/lib/devisTotals'
import { normalizeLigne } from '@/lib/lignes'
import { datesDuStatut } from '@/lib/devisStatut'
import { authArtisan as verifierSession, estEchec, getUserRevocable } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'
import { normaliserLot, typeDevisDemande } from '@/lib/facturesTypes'
import { colonnesLotsPresentes, INDISPONIBLE_0176 } from '@/lib/facturesTypesServeur'
import { fonctionAbsente } from '@/lib/factureEmission'

const DEVIS_STATUTS = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire']

type LigneIn = { designation?: string; quantite?: number; unite?: string; prix_unitaire_ht?: number; tva_taux?: number }

// Met à jour un devis existant (champs + lignes remplacées + totaux recalculés).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // Contrôle central : refuse aussi les jetons antérieurs à une déconnexion globale (§11).
    const session = await verifierSession(req)
    if (estEchec(session)) return NextResponse.json({ error: session.error }, { status: session.status })
    const uid = session.uid

    // Vérifier la propriété
    // `*` : avec 0176, le type du devis (simple / par lots) — gardé quand la requête ne le dit pas (l'assistant, par exemple).
    const { data: owned } = await supabaseAdmin.from('devis').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    const b = await req.json()
    const lignes: LigneIn[] = Array.isArray(b?.lignes) ? b.lignes : []
    if (lignes.length > 200) return NextResponse.json({ error: 'Trop de lignes (200 max).' }, { status: 400 })

    // Franchise de TVA (défaut) ⇒ 0 % ; taux normalisé une seule fois (totaux = stockage).
    const { data: art } = await supabaseAdmin.from('artisans').select('tva_regime').eq('id', uid).maybeSingle()
    const franchise = ((art?.tva_regime as string | null) || 'franchise') === 'franchise'
    const eff = lignes.map((l) => normalizeLigne(l, franchise))
    const totals = computeTotals(eff, Number(b?.remise_pct) || 0)

    // Devis PAR LOTS (drapeau `devisLots`, 0176) — mêmes règles qu'à la création (app/api/devis/route.ts). Le type n'est changé
    // que s'il est demandé ; les lots des lignes ne sont écrits que sur un devis par lots.
    const lotsOuverts = actif('devisLots')
    const typeDevis = lotsOuverts ? typeDevisDemande(b?.type_devis) : null
    const colonnesLots = lotsOuverts ? await colonnesLotsPresentes() : false
    if (typeDevis === 'lots' && !colonnesLots) return NextResponse.json({ error: INDISPONIBLE_0176 }, { status: 503 })
    const typeFinal = typeDevis ?? ((owned as { type_devis?: unknown }).type_devis === 'lots' ? 'lots' : 'simple')
    const lignesEcrites = colonnesLots && typeFinal === 'lots'
      ? eff.map((l, i) => { const lot = normaliserLot((lignes[i] as { lot?: unknown })?.lot); return lot ? { ...l, lot } : l })
      : eff

    const patch: Record<string, unknown> = {
      objet: b?.objet ?? null,
      validite_jours: Number(b?.validite_jours) || 90,
      remise_pct: Number(b?.remise_pct) || 0,
      acompte_pct: Number(b?.acompte_pct) || 0,
      conditions: b?.conditions ?? null,
      notes: b?.notes ?? null,
      client_nom: b?.client_nom ?? null,
      client_email: b?.client_email ?? null,
      client_adresse: b?.client_adresse ?? null,
      total_ht: totals.total_ht,
      total_tva: totals.total_tva,
      total_ttc: totals.total_ttc,
      updated_at: new Date().toISOString(),
      ...(colonnesLots && typeDevis ? { type_devis: typeDevis } : {}),
    }
    if (typeof b?.statut === 'string' && DEVIS_STATUTS.includes(b.statut)) {
      patch.statut = b.statut
      // C1 + C5 (audit du 18/10) : envoyé ou signé « à la main » (écran Devis, assistant) = la date du geste, comme l'envoi
      // par e-mail et l'acceptation en ligne. Un seul calcul : lib/devisStatut.ts.
      Object.assign(patch, datesDuStatut(owned, b.statut))
    }

    // Les LIGNES d'abord, avec les totaux, en UNE transaction (0180, devis_lignes_remplacer). Audit argent du 21/10 (M2) : on
    // supprimait les lignes puis on réinsérait sans lire l'erreur — un échec (un émoji coupé en deux suffisait) laissait le devis
    // VIDE. Sans 0180 : suppression puis insertion vérifiée, et en cas d'échec les anciennes lignes sont remises.
    const remplacees = await remplacerLignes(id, uid, lignesEcrites, totals)
    if (!remplacees.ok) return NextResponse.json({ error: remplacees.error }, { status: 500 })

    const { error: upErr } = await supabaseAdmin.from('devis').update(patch).eq('id', id).eq('artisan_id', uid)
    if (upErr) { console.error('[devis PATCH]', upErr.message); return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 }) }

    return NextResponse.json({ ok: true, ...totals })
  } catch (e) {
    console.error('[devis PATCH] inattendu:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

/** Remplace les lignes d'un devis et ses totaux sans jamais le laisser vide : la fonction atomique de 0180, sinon un chemin
 *  compensé (anciennes lignes relues, puis remises si l'insertion échoue). */
async function remplacerLignes(devisId: string, uid: string, lignes: Record<string, unknown>[], totaux: { total_ht: number; total_tva: number; total_ttc: number }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.rpc('devis_lignes_remplacer', { p_devis: devisId, p_artisan: uid, p_lignes: lignes, p_totaux: totaux })
  if (!error) return { ok: true }
  if (!fonctionAbsente(error)) { console.error('[devis PATCH] lignes :', error.message); return { ok: false, error: 'Enregistrement des lignes impossible : le devis est resté tel qu’il était.' } }
  const { data: avant, error: lErr } = await supabaseAdmin.from('devis_lignes').select('*').eq('devis_id', devisId).order('ordre')
  if (lErr) { console.error('[devis PATCH] lecture des lignes :', lErr.message); return { ok: false, error: 'Enregistrement des lignes impossible : le devis est resté tel qu’il était.' } }
  const { error: dErr } = await supabaseAdmin.from('devis_lignes').delete().eq('devis_id', devisId)
  if (dErr) { console.error('[devis PATCH] suppression des lignes :', dErr.message); return { ok: false, error: 'Enregistrement des lignes impossible : le devis est resté tel qu’il était.' } }
  if (lignes.length) {
    const { error: iErr } = await supabaseAdmin.from('devis_lignes').insert(lignes.map((l, i) => ({ devis_id: devisId, ordre: i, ...l })))
    if (iErr) {
      console.error('[devis PATCH] insertion des lignes :', iErr.message)
      if ((avant ?? []).length) {
        const { error: rErr } = await supabaseAdmin.from('devis_lignes').insert(avant ?? [])
        if (rErr) console.error('[devis PATCH] REMISE DES ANCIENNES LIGNES IMPOSSIBLE :', rErr.message)
      }
      return { ok: false, error: 'Enregistrement des lignes impossible : les lignes d’avant ont été remises, rien n’a changé.' }
    }
  }
  const { error: tErr } = await supabaseAdmin.from('devis').update(totaux).eq('id', devisId).eq('artisan_id', uid)
  if (tErr) console.error('[devis PATCH] totaux :', tErr.message)
  return { ok: true }
}

// Supprime un devis (et ses lignes) — UNIQUEMENT tant qu'il est brouillon.
//
// L'ancien commentaire disait « un devis n'est pas une pièce comptable → suppression libre », et
// c'était faux dès qu'il est parti : quatre écrans promettent à l'artisan que « les devis envoyés
// et factures émises ne sont jamais supprimés — la loi impose de les conserver »
// (app/parametres/SectionDonnees.tsx, app/profil/page.tsx, app/api/donnees/route.ts), et
// lib/purgeComptes.ts les garde déjà à la purge. Un devis accepté supprimé emportait en plus le
// `devis_id` de la facture qu'il a produite (0006 : `on delete set null`), qui perdait sa pièce
// d'origine sans un mot.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: userData } = await getUserRevocable(token)
  if (!userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
  const uid = userData.user.id
  const { data: owned } = await supabaseAdmin.from('devis').select('id, statut, numero').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
  if ((owned.statut ?? 'brouillon') !== 'brouillon') {
    return NextResponse.json({
      error: `Le devis ${owned.numero ?? ''} est parti chez votre client : il ne peut plus être supprimé, seulement refusé ou laissé expirer. La loi impose de le conserver.`.trim(),
      code: 'conservation',
    }, { status: 409 })
  }
  await supabaseAdmin.from('devis_lignes').delete().eq('devis_id', id)
  const { error } = await supabaseAdmin.from('devis').delete().eq('id', id).eq('artisan_id', uid)
  if (error) return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
