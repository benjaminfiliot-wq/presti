import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { lireCsv } from '@/lib/prix/csv'

// Les tarifs de l'artisan (v4 §8/F2) — sa bibliothèque de prix réels.
// C'est la seule source de prix qui vaille : ce qu'il paie vraiment chez son fournisseur.

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_LIGNES = 3000 // un tarif fournisseur complet, pas une base de données

async function auth(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Non authentifié', status: 401 as const }
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return { error: 'Session expirée, reconnecte-toi.', status: 401 as const }
  return { uid: data.user.id }
}

// ── GET : la bibliothèque, avec de quoi juger sa fraîcheur.
export async function GET(req: Request) {
  const a = await auth(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()

  let requete = supabaseAdmin.from('prix_artisan')
    .select('id, designation, unite, prix_ht, tva_taux, fournisseur, reference, source, source_detail, date_prix', { count: 'exact' })
    .eq('artisan_id', a.uid).eq('actif', true)
  if (q) requete = requete.ilike('designation', `%${q.replace(/[%_]/g, '').replace(/[\s-]+/g, '%')}%`)

  const { data, count } = await requete.order('date_prix', { ascending: false }).limit(300)
  const lignes = data ?? []
  const plusAncien = lignes.length ? lignes[lignes.length - 1].date_prix : null
  return NextResponse.json({ ok: true, lignes, total: count ?? lignes.length, plus_ancien: plusAncien })
}

// ── POST : une saisie à la main, ou l'import d'un tarif complet.
export async function POST(req: Request) {
  try {
    const a = await auth(req)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    const b = await req.json().catch(() => null)

    // ── Import CSV. Deux temps : on montre d'abord ce qu'on a compris (apercu),
    // l'artisan valide, puis on enregistre. Personne n'écrase 400 prix à l'aveugle.
    if (typeof b?.csv === 'string') {
      const lu = lireCsv(b.csv.slice(0, 4_000_000), { fournisseur: b.fournisseur || null, tva: Number(b.tva) || 10 })
      if (!lu.lignes.length) {
        return NextResponse.json({
          error: 'Aucun tarif reconnu dans ce fichier. Il faut au minimum une colonne de libellé et une colonne de prix.',
          colonnes: lu.colonnes,
        }, { status: 400 })
      }
      const lignes = lu.lignes.slice(0, MAX_LIGNES)
      if (b.apercu) {
        return NextResponse.json({
          ok: true, apercu: true, colonnes: lu.colonnes,
          reconnues: lignes.length, ignorees: lu.ignorees, total: lu.total,
          exemples: lignes.slice(0, 8),
        })
      }

      // Le ré-import d'un tarif MET À JOUR les lignes existantes au lieu d'empiler des
      // doublons : un artisan réimporte son tarif chaque année, il ne veut pas 3 prix
      // différents pour la même référence.
      const aujourdhui = (typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date)) ? b.date : new Date().toISOString().slice(0, 10)
      const rangs = lignes.map((l) => ({
        artisan_id: a.uid, designation: l.designation, unite: l.unite, prix_ht: l.prix_ht,
        tva_taux: l.tva_taux, fournisseur: l.fournisseur, reference: l.reference,
        source: 'import', source_detail: String(b.fichier || 'import CSV').slice(0, 200),
        date_prix: aujourdhui, actif: true, maj_le: new Date().toISOString(),
      }))
      let ecrites = 0
      for (let i = 0; i < rangs.length; i += 500) {
        const { error } = await supabaseAdmin.from('prix_artisan')
          .upsert(rangs.slice(i, i + 500), { onConflict: 'artisan_id,designation,fournisseur,reference', ignoreDuplicates: false })
        if (error) { console.error('[tarifs] upsert:', error.message); break }
        ecrites += Math.min(500, rangs.length - i)
      }
      return NextResponse.json({ ok: true, enregistrees: ecrites, ignorees: lu.ignorees })
    }

    // ── Saisie manuelle d'une ligne.
    const designation = String(b?.designation || '').trim().slice(0, 300)
    const prix = Number(b?.prix_ht)
    if (!designation || !Number.isFinite(prix) || prix < 0) {
      return NextResponse.json({ error: 'Il faut un libellé et un prix.' }, { status: 400 })
    }
    const tva = Number(b?.tva_taux)
    const ligne = {
      artisan_id: a.uid, designation,
      unite: String(b?.unite || 'u').trim().slice(0, 16) || 'u',
      prix_ht: Math.round(prix * 100) / 100,
      tva_taux: [0, 5.5, 10, 20].includes(tva) ? tva : 10,
      fournisseur: String(b?.fournisseur || '').trim().slice(0, 120) || null,
      reference: String(b?.reference || '').trim().slice(0, 80) || null,
      source: 'saisie', source_detail: null,
      date_prix: new Date().toISOString().slice(0, 10), actif: true, maj_le: new Date().toISOString(),
    }
    const { error } = await supabaseAdmin.from('prix_artisan')
      .upsert(ligne, { onConflict: 'artisan_id,designation,fournisseur,reference' })
    if (error) { console.error('[tarifs] insert:', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 }) }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[tarifs] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

// ── DELETE : retirer une ligne, ou vider la bibliothèque.
export async function DELETE(req: Request) {
  const a = await auth(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (id) {
    await supabaseAdmin.from('prix_artisan').delete().eq('id', id).eq('artisan_id', a.uid)
    return NextResponse.json({ ok: true })
  }
  // Vidage complet : irréversible, donc confirmation explicite exigée.
  if (url.searchParams.get('confirm') !== 'SUPPRIMER') {
    return NextResponse.json({ error: 'Confirmation manquante.' }, { status: 400 })
  }
  await supabaseAdmin.from('prix_artisan').delete().eq('artisan_id', a.uid)
  return NextResponse.json({ ok: true, vide: true })
}
