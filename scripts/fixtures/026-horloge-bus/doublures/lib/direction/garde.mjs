// Doublure de lib/direction/garde pour pause-qa (026-038). Le juge règle, avant chaque appel, globalThis.__JUGE_026__.fondateur :
//   { mode: 'fondateur' | 'partenaire' | 'refus', uid, refus? } — un fondateur (rôle d'entreprise fondateur, direction), un
//   partenaire en lecture, ou le refus de la garde (401 par défaut). exigerDomaine rend le vrai verdict de lib/controle/droits.
// Chaque appel est consigné dans __JUGE_026__.doublures avec son rang (partagé avec le faux PostgREST).
import { NextResponse } from 'next/server'
import { peutFaire } from '@/lib/controle/droits'

const J = () => (globalThis.__JUGE_026__ ??= { seq: 0, doublures: [] })
const noter = (quoi, detail = {}) => { const j = J(); j.doublures.push({ rang: ++j.seq, quoi, ...detail }) }

export async function estFondateur(_req) {
  const f = J().fondateur || { mode: 'refus' }
  noter('garde.estFondateur', { mode: f.mode })
  if (f.mode === 'fondateur' || f.mode === 'partenaire') {
    const p = f.mode === 'partenaire'
    return { uid: f.uid, email: 'fondateur-temoin@exemple.invalid', role: p ? 'lecture' : 'direction', roleInterne: p ? 'partenaire' : 'fondateur', iat: Math.floor(Date.now() / 1000), ip: '127.0.0.1' }
  }
  return f.refus || { error: 'Session requise (doublure du juge).', status: 401, code: 'session' }
}
export async function estDirection(req) {
  const f = await estFondateur(req)
  if ('error' in f) return f
  if (f.role !== 'direction') return { error: 'Votre rôle est en lecture seule.', status: 403, code: 'lecture_seule' }
  return f
}
export function exigerDomaine(f, domaine, verbe) {
  noter('garde.exigerDomaine', { domaine, verbe, uid: f && f.uid })
  const v = peutFaire(f.roleInterne, domaine, verbe)
  if (!v.permis) return { error: v.raison, status: 403, code: 'hors_perimetre' }
  return { borne: v.borne }
}
export const domaineRefuse = (r) => 'error' in r
export const estRefus = (r) => 'error' in r
export const reponseRefus = (r) => NextResponse.json({ error: r.error, code: r.code }, { status: r.status })
