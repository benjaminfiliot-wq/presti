// TÉMOIN de usine-pubs-qa (026-199) : POST depot. Jamais déployé ; voir lib/pubs/usinePubs.ts voisin.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { AGENT, deposer, estUuid } from '@/lib/pubs/usinePubs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: entetes })

export async function POST(req: Request) {
  if (actif('busAgents') === false) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return erreur(403, 'agent')
  try { await ops_battement({ p_nom: agent.nom }) } catch { /* un battement manqué ne change pas le travail */ }
  if ((await pauseGenerale()).active) return erreur(423, 'pause')
  let corps: unknown
  try { corps = JSON.parse(await req.text()) } catch { return erreur(400, 'corps_invalide') }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps) || !estUuid((corps as Record<string, unknown>).travail)) return erreur(400, 'corps_invalide')
  const r = await deposer(String((corps as Record<string, unknown>).travail), corps as Record<string, unknown>)
  return NextResponse.json(r.body, { status: r.status, headers: entetes })
}
