export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserRevocable } from '@/lib/authArtisan'
import { envoyerDevisServeur } from '@/lib/envoisPdfServeur'

// Envoyer un devis au client (PDF joint). Le corps de l'envoi vit dans lib/envoisServeur.ts depuis le 21/10 : la même fonction sert
// au pilote automatique (lib/pilote/executeur.ts), qui n'a ainsi aucun chemin d'envoi à lui. Ici : la session, puis l'envoi.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData } = await getUserRevocable(token)
    if (!userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    const r = await envoyerDevisServeur(userData.user.id, id)
    return NextResponse.json(r.json, { status: r.status })
  } catch (e) {
    console.error('[devis envoyer] inattendu:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
