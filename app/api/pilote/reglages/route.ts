import { NextResponse } from 'next/server'
import { consommerLimite } from '@/lib/limites'
import { ecrireReglages, lireReglages } from '@/lib/pilote/serveur'
import { lireReglagesPilote } from '@/lib/pilote/regles'
import { messageVerrou } from '@/lib/plans'
import { gardePilote } from '../garde'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Les RÉGLAGES du pilote automatique (21/10) : un interrupteur général et une case par type d'action. Écrire « coupé » (ou
// décocher un type) annule AUSSITÔT tout ce qui attendait (lib/pilote/serveur.ts ecrireReglages) : désactivation immédiate.
// Les garde-fous (prix sourcés, jamais d'argent, plafond, pause, idempotence) ne sont pas des réglages : lib/pilote/regles.ts.

export async function GET(req: Request) {
  const g = await gardePilote(req, { exigerSignature: false })
  if ('reponse' in g) return g.reponse
  return NextResponse.json({ reglages: await lireReglages(g.uid) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(req: Request) {
  const g = await gardePilote(req, { exigerSignature: false })
  if ('reponse' in g) return g.reponse
  if (!(await consommerLimite(`pilote-reglages:${g.uid}`, 60, 600))) return NextResponse.json({ error: 'Trop de changements en peu de temps.' }, { status: 429 })
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 })
  const voulus = lireReglagesPilote(b)
  // Hors Signature (compte rétrogradé, F1) : seulement COUPER — jamais activer ni cocher un type.
  if (!g.signature && (voulus.actif || Object.values(voulus.types).some(Boolean))) return NextResponse.json({ error: messageVerrou('assistant.pilote'), code: 'offre' }, { status: 403 })
  try {
    const r = await ecrireReglages(g.uid, voulus)
    return NextResponse.json({ ok: true, ...r })
  } catch {
    return NextResponse.json({ error: 'Les réglages n’ont pas pu être enregistrés.' }, { status: 503 })
  }
}

export async function POST() { return NextResponse.json({ error: 'Méthode non permise' }, { status: 405 }) }
export async function DELETE() { return NextResponse.json({ error: 'Méthode non permise' }, { status: 405 }) }
