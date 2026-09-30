import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent, exigerTable } from '@/lib/agents/garde'
import { ops_tache_rendre } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const refus = estRefusAgent
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status })

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (refus(agent)) return reponseRefusAgent(agent)
  const { id } = await ctx.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return erreur(400, 'id_invalide')
  if (Number(req.headers.get('content-length')) > 16 * 1024) return erreur(413, 'corps_trop_grand')
  let corps: Record<string, unknown>
  try {
    const brut = await req.text()
    if (new TextEncoder().encode(brut).length > 16 * 1024) return erreur(413, 'corps_trop_grand')
    corps = JSON.parse(brut)
  } catch { return erreur(400, 'json_invalide') }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps) || !['faite', 'echec'].includes(String(corps.resultat)) ||
    (corps.preuve_url !== undefined && corps.preuve_url !== null && typeof corps.preuve_url !== 'string') ||
    (corps.erreur !== undefined && corps.erreur !== null && typeof corps.erreur !== 'string')) return erreur(400, 'corps_invalide')
  const table = await exigerTable(agent, 'taches')
  if (table) return reponseRefusAgent(table)
  const r = await ops_tache_rendre({ p_agent: agent.nom, p_id: id, p_resultat: corps.resultat as string,
    p_preuve_url: corps.preuve_url as string | null | undefined, p_erreur: corps.erreur as string | null | undefined })
  if (!r.ok) return erreur(r.status, r.code)
  return NextResponse.json(r.data)
}
