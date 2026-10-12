import { NextResponse } from 'next/server'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { FLAGS, enEssai, type Flag } from '@/lib/flags'
import { ouvertPour } from '@/lib/essais'

// GET /api/essais — pour l'écran : quelles fonctionnalités en essai (lib/flags.ts ESSAI) sont ouvertes à CE compte.
// Ne renvoie que des booléens, jamais la liste des comptes.
export async function GET(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  const ouverts = Object.fromEntries((Object.keys(FLAGS) as Flag[]).filter(enEssai).map((f) => [f, ouvertPour(f, s.uid)]))
  return NextResponse.json(ouverts, { headers: { 'Cache-Control': 'private, no-store' } })
}
