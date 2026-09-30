import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent, exigerTable, exigerType } from '@/lib/agents/garde'
import { ops_tache_creer } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const refus = estRefusAgent
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status })
const chaine = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (refus(agent)) return reponseRefusAgent(agent)
  const taille = Number(req.headers.get('content-length'))
  if (taille > 16 * 1024) return erreur(413, 'corps_trop_grand')
  let corps: Record<string, unknown>
  try {
    const brut = await req.text()
    if (new TextEncoder().encode(brut).length > 16 * 1024) return erreur(413, 'corps_trop_grand')
    corps = JSON.parse(brut)
  } catch { return erreur(400, 'json_invalide') }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps) || !chaine(corps.type) || !chaine(corps.cle) || !chaine(corps.capacite) ||
      (corps.origine !== undefined && corps.origine !== null && !chaine(corps.origine)) ||
      (corps.objet !== undefined && corps.objet !== null && typeof corps.objet !== 'string')) return erreur(400, 'corps_invalide')
  const table = await exigerTable(agent, 'taches')
  if (table) return reponseRefusAgent(table)
  const type = await exigerType(agent, corps.type)
  if (type) return reponseRefusAgent(type)
  const r = await ops_tache_creer({ p_agent: agent.nom, p_type: corps.type, p_cle: corps.cle, p_capacite: corps.capacite,
    p_charge: corps.charge ?? null, p_origine: corps.origine as string | null | undefined, p_objet: corps.objet as string | null | undefined })
  if (!r.ok) return erreur(r.status, r.code)
  const ligne = r.data[0]
  return NextResponse.json({ id: ligne?.id, creee: ligne?.creee }, { status: ligne?.creee ? 201 : 200 })
}
