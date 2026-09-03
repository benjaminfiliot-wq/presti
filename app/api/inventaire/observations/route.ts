import { NextResponse } from 'next/server'
import { authInventaire, estRefus } from '@/lib/inventaire/auth'
import { enregistrerObservation, listerObservations } from '@/lib/inventaire/observations'

// Historique des prix vus d'un matériau (§8 F1) — GET par matériau, POST une saisie.
//
// Chaque observation appartient à l'artisan connecté, et à lui seul (RLS + filtre
// artisan_id ici). Depuis cette route, la source ne peut être que « saisie » ou
// « facture » : la provenance « vu par l'assistant » est réservée au moteur de recherche
// (F3, côté serveur) — un client ne peut pas se fabriquer une observation « IA ».

export const runtime = 'nodejs'
export const maxDuration = 30

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request) {
  const a = await authInventaire(req)
  if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
  const id = (new URL(req.url).searchParams.get('materiau_id') || '').trim()
  if (!UUID.test(id)) return NextResponse.json({ error: 'Matériau manquant.' }, { status: 400 })
  const observations = await listerObservations(a.uid, id)
  return NextResponse.json({ ok: true, observations })
}

export async function POST(req: Request) {
  try {
    const a = await authInventaire(req)
    if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
    const b = await req.json().catch(() => null)
    if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Requête vide.' }, { status: 400 })
    if (!UUID.test(String(b.materiau_id || ''))) return NextResponse.json({ error: 'Matériau manquant.' }, { status: 400 })
    const source = b.source === 'facture' ? 'facture' : 'saisie'
    const r = await enregistrerObservation(a.uid, {
      materiau_id: b.materiau_id, fournisseur_id: UUID.test(String(b.fournisseur_id || '')) ? b.fournisseur_id : null,
      fournisseur_nom: b.fournisseur_nom, designation_vue: b.designation_vue,
      prix_ht: b.prix_ht, prix_ttc: b.prix_ttc, unite: b.unite, url: b.url, source,
      extrait: b.extrait, disponibilite: b.disponibilite, vu_le: typeof b.vu_le === 'string' ? b.vu_le : null,
    })
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 })
    return NextResponse.json({ ok: true, id: r.id, observations: await listerObservations(a.uid, b.materiau_id) })
  } catch (e) {
    console.error('[inventaire/observations] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
