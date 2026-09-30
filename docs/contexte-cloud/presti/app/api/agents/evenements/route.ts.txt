import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent, exigerTable } from '@/lib/agents/garde'
import { ops_evenement_ajouter, ops_evenements_lire } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const refus = estRefusAgent
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status })

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (refus(agent)) return reponseRefusAgent(agent)
  if (Number(req.headers.get('content-length')) > 16 * 1024) return erreur(413, 'corps_trop_grand')
  let corps: Record<string, unknown>
  try {
    const brut = await req.text()
    if (new TextEncoder().encode(brut).length > 16 * 1024) return erreur(413, 'corps_trop_grand')
    corps = JSON.parse(brut)
  } catch { return erreur(400, 'json_invalide') }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps) || typeof corps.type !== 'string' || !corps.type.trim() ||
    typeof corps.resume !== 'string' || !corps.resume.trim() || corps.resume.length > 200 ||
    (corps.objet !== undefined && corps.objet !== null && typeof corps.objet !== 'string') ||
    (corps.tache !== undefined && corps.tache !== null && typeof corps.tache !== 'string')) return erreur(400, 'corps_invalide')
  const table = await exigerTable(agent, 'evenements')
  if (table) return reponseRefusAgent(table)
  const r = await ops_evenement_ajouter({ p_agent: agent.nom, p_type: corps.type, p_objet: corps.objet as string | null | undefined,
    p_resume: corps.resume, p_tache: corps.tache as string | null | undefined })
  if (!r.ok) return erreur(r.status, r.code)
  return NextResponse.json(r.data)
}

export async function GET(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (refus(agent)) return reponseRefusAgent(agent)
  const url = new URL(req.url)
  const apres = url.searchParams.get('apres')
  const limite = url.searchParams.get('limite')
  if ((apres !== null && (!/^\d+$/.test(apres) || !Number.isSafeInteger(Number(apres)))) ||
    (limite !== null && (!/^\d+$/.test(limite) || Number(limite) < 1 || Number(limite) > 200))) return erreur(400, 'parametres_invalides')
  const r = await ops_evenements_lire({ p_agent: agent.nom, p_apres: apres === null ? null : Number(apres), p_limite: limite === null ? null : Number(limite) })
  if (!r.ok) return erreur(r.status, r.code)
  return NextResponse.json(r.data)
}
