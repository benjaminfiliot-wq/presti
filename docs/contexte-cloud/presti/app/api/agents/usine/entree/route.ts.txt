import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, exigerTable, reponseRefusAgent } from '@/lib/agents/garde'
import { entree } from '@/lib/agents/usineDepot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const erreur = (status: number, error: string) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  const table = await exigerTable(agent, 'taches')
  if (table) return reponseRefusAgent(table)
  const taille = Number(req.headers.get('content-length'))
  if (taille > 16_384) return erreur(413, 'corps_trop_gros')
  let brut: string
  try { brut = await req.text() } catch { return erreur(400, 'corps_invalide') }
  if (new TextEncoder().encode(brut).length > 16_384) return erreur(413, 'corps_trop_gros')
  let corps: unknown
  try { corps = JSON.parse(brut) } catch { return erreur(400, 'corps_invalide') }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps) || !('tache' in corps) || typeof corps.tache !== 'string' || !UUID.test(corps.tache)) return erreur(400, 'corps_invalide')
  const resultat = await entree(agent, corps.tache)
  return 'status' in resultat ? erreur(resultat.status, resultat.error) : NextResponse.json(resultat)
}
