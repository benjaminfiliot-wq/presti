// Doublure de lib/agents/garde.ts (026-040) : le contrat de la vraie garde, sans base. Dans l'ordre : un jeton absent ou mal formé →
// 401 `jeton` ; un jeton que le juge n'a pas posé → 401 `jeton` au MÊME corps ; un agent en pause → 423 `agent_en_pause` ;
// sinon l'agent. Le 403 « autre agent » est affaire de la route (agent.nom), comme pour le porteur et le livreur. Chaque appel à
// authAgent est consigné : un 404 « drapeau baissé » doit venir AVANT toute identité.
import { NextResponse } from './next-server.mjs'
import { U, noter } from './etat.mjs'
const FORMAT = /^pa_[a-z0-9_]{2,40}_[A-Za-z0-9_-]{43}$/
const REFUS_JETON = Object.freeze({ status: 401, code: 'jeton', error: 'jeton' })
export const PLAFOND_ESSAIS_IP = 30
export const FENETRE_ESSAIS_IP_S = 600
export const estRefusAgent = (r) => !!r && typeof r === 'object' && 'error' in r
export async function authAgent(req) {
  noter('garde.authAgent')
  const m = /^Bearer (\S+)$/.exec(req.headers.get('authorization') || '')
  if (!m || !FORMAT.test(m[1])) return REFUS_JETON
  const a = U().agents.get(m[1])
  if (!a) return REFUS_JETON
  if (a.en_pause) return { status: 423, code: 'agent_en_pause', error: 'agent_en_pause' }
  return { nom: a.nom, capacites: [], typesCrees: [], tablesEcrites: [], debitMinute: 60, route: new URL(req.url).pathname }
}
export async function exigerType() { return null }
export async function exigerTable() { return null }
export function reponseRefusAgent(r) {
  const headers = { 'cache-control': 'no-store' }
  if (r.status === 401) headers['www-authenticate'] = 'Bearer realm="agents"'
  return NextResponse.json({ error: r.error, code: r.code }, { status: r.status, headers })
}
