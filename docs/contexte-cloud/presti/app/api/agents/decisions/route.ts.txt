import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent, exigerTable } from '@/lib/agents/garde'
import { ops_decision_creer, ops_decisions_tranchees } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const refus = estRefusAgent
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status })
const chaine = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const optionValide = (v: unknown): v is { cle: string; libelle: string; recommandee: boolean } =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  /^[a-z_]{2,30}$/.test(String((v as Record<string, unknown>).cle)) &&
  chaine((v as Record<string, unknown>).libelle) && String((v as Record<string, unknown>).libelle).length <= 80 &&
  typeof (v as Record<string, unknown>).recommandee === 'boolean'

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
  if (!corps || typeof corps !== 'object' || Array.isArray(corps) || !chaine(corps.question) ||
    !Array.isArray(corps.options) || corps.options.length < 2 || corps.options.length > 3 || !corps.options.every(optionValide) ||
    new Set(corps.options.map((o) => o.cle)).size !== corps.options.length ||
    corps.options.filter((o) => o.recommandee).length !== 1 || !chaine(corps.defaut) ||
    !corps.options.some((o) => o.cle === corps.defaut) || !chaine(corps.portee) || !chaine(corps.cle) ||
    !chaine(corps.echeance) || !Number.isFinite(Date.parse(corps.echeance)) ||
    (corps.contexte !== undefined && corps.contexte !== null && typeof corps.contexte !== 'string') ||
    (corps.montant_cents !== undefined && corps.montant_cents !== null && (!Number.isInteger(corps.montant_cents) || Number(corps.montant_cents) < 0)) ||
    (corps.tache !== undefined && corps.tache !== null && typeof corps.tache !== 'string')) return erreur(400, 'corps_invalide')
  const table = await exigerTable(agent, 'decisions')
  if (table) return reponseRefusAgent(table)
  const r = await ops_decision_creer({ p_agent: agent.nom, p_question: corps.question, p_contexte: corps.contexte as string | null | undefined,
    p_options: corps.options, p_defaut: corps.defaut, p_montant_cents: corps.montant_cents as number | null | undefined,
    p_portee: corps.portee, p_echeance: corps.echeance, p_cle: corps.cle, p_tache: corps.tache as string | null | undefined })
  if (!r.ok) return erreur(r.status, r.code)
  const ligne = r.data[0]
  return NextResponse.json({ id: ligne?.id, creee: ligne?.creee }, { status: ligne?.creee ? 201 : 200 })
}

export async function GET(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (refus(agent)) return reponseRefusAgent(agent)
  const url = new URL(req.url)
  const depuis = url.searchParams.get('depuis')
  const date = depuis === null ? NaN : Date.parse(depuis)
  const age = Date.now() - date
  if (url.searchParams.get('tranchees') !== '1' || !depuis || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(depuis) ||
    !Number.isFinite(date) || age < 0 || age > 30 * 86_400_000) return erreur(400, 'parametres_invalides')
  const r = await ops_decisions_tranchees({ p_agent: agent.nom, p_depuis: depuis })
  if (!r.ok) return erreur(r.status, r.code)
  return NextResponse.json(r.data)
}
