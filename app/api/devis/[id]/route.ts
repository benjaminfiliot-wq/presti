import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeTotals } from '@/lib/devisTotals'
import { normalizeLigne } from '@/lib/lignes'

const DEVIS_STATUTS = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire']

type LigneIn = { designation?: string; quantite?: number; unite?: string; prix_unitaire_ht?: number; tva_taux?: number }

// Met à jour un devis existant (champs + lignes remplacées + totaux recalculés).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token)
    if (uErr || !userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    const uid = userData.user.id

    // Vérifier la propriété
    const { data: owned } = await supabaseAdmin.from('devis').select('id').eq('id', id).eq('artisan_id', uid).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    const b = await req.json()
    const lignes: LigneIn[] = Array.isArray(b?.lignes) ? b.lignes : []

    // Franchise de TVA (défaut) ⇒ 0 % ; taux normalisé une seule fois (totaux = stockage).
    const { data: art } = await supabaseAdmin.from('artisans').select('tva_regime').eq('id', uid).maybeSingle()
    const franchise = ((art?.tva_regime as string | null) || 'franchise') === 'franchise'
    const eff = lignes.map((l) => normalizeLigne(l, franchise))
    const totals = computeTotals(eff, Number(b?.remise_pct) || 0)

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
    }
    if (typeof b?.statut === 'string' && DEVIS_STATUTS.includes(b.statut)) patch.statut = b.statut

    const { error: upErr } = await supabaseAdmin.from('devis').update(patch).eq('id', id).eq('artisan_id', uid)
    if (upErr) { console.error('[devis PATCH]', upErr.message); return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 }) }

    // Remplacer les lignes
    await supabaseAdmin.from('devis_lignes').delete().eq('devis_id', id)
    if (eff.length) {
      await supabaseAdmin.from('devis_lignes').insert(
        eff.map((l, i) => ({ devis_id: id, ordre: i, ...l })),
      )
    }

    return NextResponse.json({ ok: true, ...totals })
  } catch (e) {
    console.error('[devis PATCH] inattendu:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

// Supprime un devis (et ses lignes). Un devis n'est pas une pièce comptable → suppression libre.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: userData } = await supabaseAdmin.auth.getUser(token)
  if (!userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
  const uid = userData.user.id
  const { data: owned } = await supabaseAdmin.from('devis').select('id').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
  await supabaseAdmin.from('devis_lignes').delete().eq('devis_id', id)
  const { error } = await supabaseAdmin.from('devis').delete().eq('id', id).eq('artisan_id', uid)
  if (error) return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
