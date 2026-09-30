export const BLOCS = ['argent', 'decider', 'appeler', 'envois', 'entonnoir', 'agents', 'code'] as const
export type Bloc = typeof BLOCS[number]

const BASE = '/controle?onglet=pilotage'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export const RE_LIEN_PILOTAGE = /^\/controle\?onglet=pilotage(?:&decision=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|&bloc=(?:argent|decider|appeler|envois|entonnoir|agents|code))?$/

export function lienPilotage(o?: { decision?: string; bloc?: Bloc }): string {
  if (typeof o?.decision === 'string' && UUID.test(o.decision)) return `${BASE}&decision=${o.decision}`
  if (typeof o?.bloc === 'string' && BLOCS.some(bloc => bloc === o.bloc)) return `${BASE}&bloc=${o.bloc}`
  return BASE
}

export function estLienPilotage(s: string): boolean {
  return typeof s === 'string' && RE_LIEN_PILOTAGE.test(s)
}
