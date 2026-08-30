import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeTotals } from '@/lib/devisTotals'
import { normalizeLigne } from '@/lib/lignes'

type LigneIn = { designation?: string; quantite?: number; unite?: string; prix_unitaire_ht?: number; tva_taux?: number }

// Crée une facture — à partir d'un devis (devis_id) ou de lignes fournies.
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token)
    if (uErr || !userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    const uid = userData.user.id

    const b = await req.json().catch(() => ({}))
    const devisId: string | undefined = typeof b?.devis_id === 'string' ? b.devis_id : undefined

    // Source des données : un devis existant (chemin principal) ou un corps standalone.
    let src: Record<string, unknown> = {}
    let lignes: LigneIn[] = []
    if (devisId) {
      const { data: devis } = await supabaseAdmin.from('devis').select('*').eq('id', devisId).eq('artisan_id', uid).maybeSingle()
      if (!devis) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
      const { data: dl } = await supabaseAdmin.from('devis_lignes').select('*').eq('devis_id', devisId).order('ordre')
      src = devis
      lignes = (dl ?? []) as LigneIn[]
    } else {
      src = b
      lignes = Array.isArray(b?.lignes) ? b.lignes : []
    }
    if (lignes.length > 200) return NextResponse.json({ error: 'Trop de lignes (200 max).' }, { status: 400 })

    // Franchise de TVA (défaut auto-entrepreneur) ⇒ 0 % ; sinon taux conservé (0 réel préservé).
    const { data: art } = await supabaseAdmin.from('artisans').select('tva_regime').eq('id', uid).maybeSingle()
    const franchise = ((art?.tva_regime as string | null) || 'franchise') === 'franchise'
    const eff = lignes.map((l) => normalizeLigne(l, franchise))
    const totals = computeTotals(eff, Number(src.remise_pct) || 0)

    const { data: n } = await supabaseAdmin.rpc('next_numero', { p_artisan: uid, p_type: 'facture' })
    const numero = `FAC-${new Date().getFullYear()}-${String(n ?? 1).padStart(4, '0')}`
    const echeance = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const s = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

    const { data: facture, error: fErr } = await supabaseAdmin
      .from('factures')
      .insert({
        artisan_id: uid,
        devis_id: devisId ?? null,
        numero,
        objet: s(src.objet, 300),
        statut: 'emise',
        date_echeance: echeance,
        remise_pct: Number(src.remise_pct) || 0,
        acompte_pct: Number(src.acompte_pct) || 0,
        conditions: s(src.conditions, 4000),
        notes: s(src.notes, 4000),
        client_nom: s(src.client_nom, 160),
        client_email: s(src.client_email, 200),
        client_adresse: s(src.client_adresse, 300),
        total_ht: totals.total_ht, total_tva: totals.total_tva, total_ttc: totals.total_ttc,
      })
      .select('id, numero')
      .single()
    if (fErr) { console.error('[factures] insert:', fErr.message); return NextResponse.json({ error: 'Création de la facture impossible' }, { status: 500 }) }

    if (eff.length) {
      await supabaseAdmin.from('factures_lignes').insert(
        eff.map((l, i) => ({ facture_id: facture.id, ordre: i, ...l })),
      )
    }

    return NextResponse.json({ ok: true, id: facture.id, numero: facture.numero })
  } catch (e) {
    console.error('[factures] erreur inattendue:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
