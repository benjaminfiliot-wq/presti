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
    // Garde-fou (I4) : un devis réel ne dépasse pas ~200 lignes → borne anti-DoS/coût.
    if (lignes.length > 200) {
      return NextResponse.json({ error: 'Trop de lignes (200 max).' }, { status: 400 })
    }
    const s = (v: unknown, n: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)
    const totals = computeTotals(lignes.map((l) => ({ quantite: Number(l.quantite) || 0, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: Number(l.tva_taux) || 0 })), Number(b?.remise_pct) || 0)

    // Numéro en séquence continue
    const { data: n } = await supabaseAdmin.rpc('next_numero', { p_artisan: uid, p_type: 'devis' })
    const numero = `DEV-${new Date().getFullYear()}-${String(n ?? 1).padStart(4, '0')}`

    const { data: devis, error: dErr } = await supabaseAdmin
      .from('devis')
      .insert({
        artisan_id: uid,
        numero,
        objet: s(b?.objet, 300),
        statut: 'brouillon',
        validite_jours: Number(b?.validite_jours) || 90,
        remise_pct: Number(b?.remise_pct) || 0,
        acompte_pct: Number(b?.acompte_pct) || 0,
        conditions: s(b?.conditions, 4000),
        notes: s(b?.notes, 4000),
        client_nom: s(b?.client_nom, 160),
        client_email: s(b?.client_email, 200),
        client_adresse: s(b?.client_adresse, 300),
        total_ht: totals.total_ht,
        total_tva: totals.total_tva,
        total_ttc: totals.total_ttc,
      })
      .select('id, numero')
      .single()
    if (dErr) {
      console.error('[devis] insert:', dErr.message)
      return NextResponse.json({ error: 'Création du devis impossible' }, { status: 500 })
    }

    if (lignes.length) {
      await supabaseAdmin.from('devis_lignes').insert(
        lignes.map((l, i) => ({
          devis_id: devis.id,
          ordre: i,
          designation: (l.designation ?? '').slice(0, 300),
          quantite: Number(l.quantite) || 1,
          unite: l.unite ?? 'u',
          prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0,
          tva_taux: Number(l.tva_taux) || 20,
        })),
      )
    }

    return NextResponse.json({ ok: true, id: devis.id, numero: devis.numero })
  } catch (e) {
    console.error('[devis] erreur inattendue:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
