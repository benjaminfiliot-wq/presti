// Doublure de lib/direction/reconfirmation pour pause-qa (026-038). __JUGE_026__.reconfirmation dit le verdict du jeton :
// 'ok' (bon), 'absent', 'rejoue', 'expire', 'portee', 'indisponible'. Chaque appel est consigné (uid, portée, verdict).
import { NextResponse } from 'next/server'

const J = () => (globalThis.__JUGE_026__ ??= { seq: 0, doublures: [] })
const noter = (quoi, detail = {}) => { const j = J(); j.doublures.push({ rang: ++j.seq, quoi, ...detail }) }
export const EN_TETE = 'x-presti-reconfirmation'
export const PORTEES = ['securite', 'argent', 'artisan', 'reglages']
export const DUREE_S = 300

export async function emettre() { return null }
export async function consommer(uid, _jeton, portee) { const v = J().reconfirmation || 'absent'; noter('reconfirmation.consommer', { uid, portee, verdict: v }); return v }
export async function exigerReconfirmation(_req, uid, portee) {
  const v = J().reconfirmation || 'absent'
  noter('reconfirmation.exiger', { uid, portee, verdict: v })
  if (v === 'ok') return null
  const code = v === 'absent' ? 'reconfirmation_requise' : v
  return NextResponse.json({ error: 'Confirmation requise (doublure du juge).', code, portee }, { status: v === 'indisponible' ? 503 : 403 })
}
