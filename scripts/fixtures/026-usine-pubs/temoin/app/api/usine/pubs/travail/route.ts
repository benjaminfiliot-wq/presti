// TÉMOIN de usine-pubs-qa (026-199) : GET travail. Jamais déployé ; voir lib/pubs/usinePubs.ts voisin.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { AGENT, prendreTravail } from '@/lib/pubs/usinePubs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'no-store' }
const rien = () => NextResponse.json({ travail: null }, { headers: entetes })

export async function GET(req: Request) {
  if (actif('busAgents') === false) return NextResponse.json({ error: 'introuvable', code: 'introuvable' }, { status: 404, headers: entetes })
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return agent.status === 423 ? rien() : reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return NextResponse.json({ error: 'agent', code: 'agent' }, { status: 403, headers: entetes })
  try { await ops_battement({ p_nom: agent.nom }) } catch { /* un battement manqué ne change pas le travail */ }
  if ((await pauseGenerale()).active) return rien()
  const travail = await prendreTravail()
  return travail ? NextResponse.json(travail, { headers: entetes }) : rien()
}
