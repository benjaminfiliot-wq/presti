import { NextResponse } from 'next/server'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { creerFacture } from '@/lib/factureDepuisDevis'

export const runtime = 'nodejs'

// Crée une facture — à partir d'un devis (devis_id) ou de lignes fournies.
// Toute la logique (mentions bloquantes, numérotation, lignes, scellement) vit dans
// lib/factureDepuisDevis.ts — la même que la facture d'acompte automatique (v5 §9).
export async function POST(req: Request) {
  try {
    // Contrôle central : refuse aussi les jetons antérieurs à une déconnexion globale (§11).
    const session = await verifierSession(req)
    if (estEchec(session)) return NextResponse.json({ error: session.error }, { status: session.status })

    const b = await req.json().catch(() => ({}))
    const devisId: string | undefined = typeof b?.devis_id === 'string' ? b.devis_id : undefined
    const r = await creerFacture({ artisanId: session.uid, devisId, corps: devisId ? undefined : (b as Record<string, unknown>) })
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.code ? { code: r.code, manquantes: r.manquantes, lien: r.lien } : {}) }, { status: r.status })
    return NextResponse.json({ ok: true, id: r.id, numero: r.numero })
  } catch (e) {
    console.error('[factures] erreur inattendue:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
