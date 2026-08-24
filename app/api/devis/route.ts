import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeTotals } from '@/lib/devisTotals'

type LigneIn = { designation?: string; quantite?: number; unite?: string; prix_unitaire_ht?: number; tva_taux?: number }

// Crée un nouveau devis (numéro attribué en séquence continue).
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token)
    if (uErr || !userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    const uid = userData.user.id

    const b = await req.json()
    const lignes: LigneIn[] = Array.isArray(b?.lignes) ? b.lignes : []
    const totals = computeTotals(lignes.map((l) => ({ quantite: Number(l.quantite) || 0, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: Number(l.tva_taux) || 0 })), Number(b?.remise_pct) || 0)

    // Numéro en séquence continue
    const { data: n } = await supabaseAdmin.rpc('next_numero', { p_artisan: uid, p_type: 'devis' })
    const numero = `DEV-${new Date().getFullYear()}-${String(n ?? 1).padStart(4, '0')}`

    const { data: devis, error: dErr } = await supabaseAdmin
      .from('devis')
      .insert({
        artisan_id: uid,
        numero,
        objet: b?.objet ?? null,
        statut: 'brouillon',
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
      })
      .select('id, numero')
      .single()
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

    if (lignes.length) {
      await supabaseAdmin.from('devis_lignes').insert(
        lignes.map((l, i) => ({
          devis_id: devis.id,
          ordre: i,
          designation: l.designation ?? '',
          quantite: Number(l.quantite) || 1,
          unite: l.unite ?? 'u',
          prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0,
          tva_taux: Number(l.tva_taux) || 20,
        })),
      )
    }

    return NextResponse.json({ ok: true, id: devis.id, numero: devis.numero })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
