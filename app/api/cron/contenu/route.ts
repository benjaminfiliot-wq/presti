import { NextResponse } from 'next/server'
import { bearerEgal } from '@/lib/secretEgal' // audit du 20/10 : comparaison du secret en temps constant
import { pauseGenerale } from '@/lib/agents/pause'

// Cron « contenu » (fiche 026-212, C09) : le passage qui, un jour, publiera les Reels Instagram et les vidéos Facebook
// par Graph (lib/contenu/metaPublier.ts). AUJOURD'HUI il ne publie rien et ne lit rien : R6 (le jeton Meta et ses droits)
// n'est pas levée. Depuis la décision du 30/09 (confirmée par Benj le 04/10), il n'y a plus d'accord individuel par publication :
// les contrôles automatiques le remplacent (juges, pause générale, plafonds, doublons, chiffres vérifiés, coût nul, suspension à la
// pause). Tant que le client Graph n'est pas configuré, la route rend « en attente du jeton » sans aucun appel réseau ni lecture de base.
// Ce qu'elle ne fera JAMAIS : publier sous pause générale ou sans ces contrôles, lire un jeton d'ici, relancer une publication déjà faite.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!bearerEgal(auth, secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const pause = await pauseGenerale()
  if (pause.active) return NextResponse.json({ pause: true, source: pause.source })

  return NextResponse.json({ ok: true, etat: 'en_attente_jeton', publie: 0 })
}
