import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { calculerJauges, type DonneesJauges } from '@/lib/agents/acquisition/jauges'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const entetes = { 'Cache-Control': 'private, no-store' }
  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404, headers: entetes })
  const fondateur = await estFondateur(req)
  if (estRefus(fondateur)) return reponseRefus(fondateur)
  const domaine = exigerDomaine(fondateur, 'sante', 'voir')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)
  const donnees = await magasinSupabase.jauges()
  return NextResponse.json({ jauges: calculerJauges(donnees as unknown as DonneesJauges, new Date()) }, { headers: entetes })
}
