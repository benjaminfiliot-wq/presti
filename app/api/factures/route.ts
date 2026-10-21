import { NextResponse } from 'next/server'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { creerFacture } from '@/lib/factureDepuisDevis'
import { actif } from '@/lib/flags'
import { lirePct, typeFactureDemande } from '@/lib/facturesTypes'

export const runtime = 'nodejs'

// Crée une facture — à partir d'un devis (devis_id) ou de lignes fournies.
// Toute la logique (mentions bloquantes, numérotation, lignes, scellement) vit dans
// lib/factureDepuisDevis.ts — la même que la facture d'acompte automatique (v5 §9).
// 0176 (drapeau `facturesSituation`) : `type` (standard | acompte | situation | solde), `acompte_pct` pour un acompte,
// `avancement` ({ global: 70 } ou { lots: { "Lot 1 — Démolition": 100, … } }) pour une situation. Drapeau baissé : ces champs
// sont ignorés (le chemin d'avant), sauf « situation » et « solde » explicites, refusés en 404.
export async function POST(req: Request) {
  try {
    // Contrôle central : refuse aussi les jetons antérieurs à une déconnexion globale (§11).
    const session = await verifierSession(req)
    if (estEchec(session)) return NextResponse.json({ error: session.error }, { status: session.status })

    const b = await req.json().catch(() => ({}))
    const devisId: string | undefined = typeof b?.devis_id === 'string' ? b.devis_id : undefined
    const ouvert = actif('facturesSituation')
    const type = typeFactureDemande(b?.type)
    if (!ouvert && (type === 'situation' || type === 'solde')) return NextResponse.json({ error: 'Type de facture indisponible.' }, { status: 404 })
    if (ouvert && type === 'inconnu') return NextResponse.json({ error: 'Type de facture inconnu.' }, { status: 400 })
    const options = ouvert && type && type !== 'inconnu'
      ? {
        type,
        ...(type === 'acompte' ? { acomptePct: lirePct(b?.acompte_pct) ?? NaN } : {}),
        ...(type === 'situation' ? { avancement: { global: b?.avancement?.global, lots: b?.avancement?.lots && typeof b.avancement.lots === 'object' && !Array.isArray(b.avancement.lots) ? b.avancement.lots as Record<string, unknown> : null } } : {}),
      }
      : {}
    const r = await creerFacture({ artisanId: session.uid, devisId, corps: devisId ? undefined : (b as Record<string, unknown>), ...options })
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.code ? { code: r.code, manquantes: r.manquantes, lien: r.lien } : {}) }, { status: r.status })
    return NextResponse.json({ ok: true, id: r.id, numero: r.numero })
  } catch (e) {
    console.error('[factures] erreur inattendue:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
