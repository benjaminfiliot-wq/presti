import { NextResponse } from 'next/server'
import { authArtisan, estEchec, revoquerSessions } from '@/lib/authArtisan'

// « Se déconnecter partout » (v4 §11) — et pour de vrai.
//
// Avant, ce bouton révoquait le jeton de rafraîchissement mais laissait les jetons
// d'accès déjà émis fonctionner jusqu'à leur expiration : jusqu'à une heure d'accès
// après une déconnexion demandée en urgence, typiquement depuis un poste partagé.
// Ici on pose une date de révocation que TOUTES les routes de Presti vérifient.

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })
  await revoquerSessions(s.uid)
  return NextResponse.json({
    ok: true,
    message: 'Toutes vos sessions ont été fermées, y compris celle-ci. Reconnectez-vous.',
  })
}
