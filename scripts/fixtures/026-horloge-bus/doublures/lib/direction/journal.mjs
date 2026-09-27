// Doublure de lib/direction/journal pour pause-qa (026-038). __JUGE_026__.journal : 'ok' (défaut) ou 'panne' (journaliser
// rend false). Chaque entrée est consignée avec son rang, pour juger l'ordre « journal, puis écriture ».
import { NextResponse } from 'next/server'

const J = () => (globalThis.__JUGE_026__ ??= { seq: 0, doublures: [] })
export function epurer(v) { return v }
export async function journaliser(e, _req) {
  const j = J()
  const ok = j.journal !== 'panne'
  let avant = null, apres = null
  try { avant = JSON.parse(JSON.stringify(e.avant ?? null)); apres = JSON.parse(JSON.stringify(e.apres ?? null)) } catch { avant = apres = '(illisible)' }
  j.doublures.push({ rang: ++j.seq, quoi: 'journal.journaliser', action: e.action, cible_type: e.cible_type ?? null, cible_id: e.cible_id ?? null, avant, apres, reconfirme: e.reconfirme === true, acteur: e.acteur && e.acteur.uid, ok })
  return ok
}
export const refusJournal = () => NextResponse.json({ error: 'Action refusée : le journal de direction est indisponible.', code: 'journal_indisponible' }, { status: 503 })
