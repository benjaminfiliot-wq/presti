import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { BLOCS_ROUTE, lireBloc, type BlocRoute } from '@/lib/pilotage/blocs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request) {
  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const domaine = exigerDomaine(f, 'sante', 'voir')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)

  const url = new URL(req.url)
  const nom = url.searchParams.get('bloc')
  if (!nom || !BLOCS_ROUTE.includes(nom as BlocRoute)) {
    const error = nom === 'argent'
      ? 'Le bloc Argent se lit sur /api/controle/tresorerie.'
      : 'Bloc inconnu.'
    return NextResponse.json({ error }, { status: 400 })
  }

  const decision = url.searchParams.get('decision')
  const epingle = decision && UUID.test(decision) ? decision : undefined
  return NextResponse.json({ bloc: nom, role: f.role, ...(await lireBloc(nom as BlocRoute, { epingle })) })
}
