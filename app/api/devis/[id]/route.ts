import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeTotals } from '@/lib/devisTotals'

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
    const totals = computeTotals(lignes.map((l) => ({ quantite: Number(l.quantite) || 0, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: Number(l.tva_taux) || 0 })), Number(b?.remise_pct) || 0)

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
    if (typeof b?.statut === 'string') patch.statut = b.statut

    const { error: upErr } = await supabaseAdmin.from('devis').update(patch).eq('id', id)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // Remplacer les lignes
    await supabaseAdmin.from('devis_lignes').delete().eq('devis_id', id)
    if (lignes.length) {
      await supabaseAdmin.from('devis_lignes').insert(
        lignes.map((l, i) => ({
          devis_id: id,
          ordre: i,
          designation: l.designation ?? '',
          quantite: Number(l.quantite) || 1,
          unite: l.unite ?? 'u',
          prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0,
          tva_taux: Number(l.tva_taux) || 20,
        })),
      )
    }

    return NextResponse.json({ ok: true, ...totals })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
