import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent, exigerTable } from '@/lib/agents/garde'
import { ops_tache_prendre } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const refus = estRefusAgent
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status })

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (refus(agent)) return reponseRefusAgent(agent)
  const table = await exigerTable(agent, 'taches')
  if (table) return reponseRefusAgent(table)
  const r = await ops_tache_prendre({ p_agent: agent.nom })
  if (!r.ok) return erreur(r.status, r.code)
  return NextResponse.json(r.data)
}
