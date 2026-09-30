import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'

// Cron « contenu » (fiche 026-212, C09) : le passage qui, un jour, publiera les Reels Instagram et les vidéos Facebook
// par Graph (lib/contenu/metaPublier.ts). AUJOURD'HUI il ne publie rien et ne lit rien : R6 (le jeton Meta et ses droits)
// n'est pas levée, et R24 exige l'accord individuel de Benj sur chaque version exacte. Tant que le client Graph n'est pas
// configuré, la route rend « en attente du jeton » sans aucun appel réseau ni lecture de base.
// Ce qu'elle ne fera JAMAIS : publier sans accord individuel, lire un jeton d'ici, relancer une publication déjà faite.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const pause = await pauseGenerale()
  if (pause.active) return NextResponse.json({ pause: true, source: pause.source })

  return NextResponse.json({ ok: true, etat: 'en_attente_jeton', publie: 0 })
}
