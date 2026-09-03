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

  // On n'annonce JAMAIS un succès qu'on n'a pas. Le premier code répondait « toutes vos
  // sessions ont été fermées » même quand la révocation avait échoué : l'artisan croyait
  // avoir coupé l'accès d'un ancien salarié, et ne changeait donc pas son mot de passe.
  if (!(await revoquerSessions(s.uid))) {
    return NextResponse.json({
      error: 'Impossible de fermer vos sessions pour l’instant. Par sécurité, changez votre mot de passe : cela coupe l’accès immédiatement.',
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: 'Toutes vos sessions ont été fermées, y compris celle-ci. Reconnectez-vous.',
  })
}
