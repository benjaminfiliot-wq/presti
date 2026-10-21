import { NextResponse } from 'next/server'
import { consommerLimite } from '@/lib/limites'
import { annulerAuto, lireFile, lireReglages } from '@/lib/pilote/serveur'
import { DELAI_ANNULATION_MIN } from '@/lib/pilote/regles'
import { gardePilote } from '../garde'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// La FILE du pilote automatique d'un compte (21/10) : ce qui « partira dans … », et les dernières issues (journal).
// GET → { reglages, attente, recentes, delai_min, signature } ; lisible et annulable même hors Signature (audit du 21/10, F1) ; POST { id, decision: 'annuler' } → l'action ne partira pas (la carte ou la
// proposition reste, à valider à la main). Tout est lu et écrit avec artisan_id = uid de la session (lib/pilote/serveur.ts).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request) {
  const g = await gardePilote(req, { exigerSignature: false })
  if ('reponse' in g) return g.reponse
  try {
    const [reglages, file] = await Promise.all([lireReglages(g.uid), lireFile(g.uid)])
    return NextResponse.json({ reglages, ...file, delai_min: DELAI_ANNULATION_MIN, signature: g.signature }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'La file n’a pas pu être lue.' }, { status: 503 })
  }
}

export async function POST(req: Request) {
  const g = await gardePilote(req, { exigerSignature: false })
  if ('reponse' in g) return g.reponse
  if (!(await consommerLimite(`pilote-annuler:${g.uid}`, 120, 600))) return NextResponse.json({ error: 'Beaucoup de clics en peu de temps.' }, { status: 429 })
  const b = await req.json().catch(() => null)
  const id = typeof b?.id === 'string' ? b.id.trim().toLowerCase() : ''
  if (!UUID.test(id) || b?.decision !== 'annuler') return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 })
  try {
    const ok = await annulerAuto(g.uid, id)
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'Trop tard ou introuvable : cette action n’attend plus (déjà partie, déjà annulée).' }, { status: 409 })
  } catch {
    return NextResponse.json({ error: 'L’annulation n’a pas pu être enregistrée. Réessayez immédiatement.' }, { status: 503 })
  }
}

export async function PUT() { return NextResponse.json({ error: 'Méthode non permise' }, { status: 405 }) }
export async function PATCH() { return NextResponse.json({ error: 'Méthode non permise' }, { status: 405 }) }
export async function DELETE() { return NextResponse.json({ error: 'Méthode non permise' }, { status: 405 }) }
