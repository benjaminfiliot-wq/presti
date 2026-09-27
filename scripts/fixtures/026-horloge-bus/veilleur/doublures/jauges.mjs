// Doublure de lib/agents/acquisition/jauges (026-064), pour veilleur-qa (VA-18) : calculerJauges rend l'état que le cas du juge
// impose (J.config.jauges), quelle que soit la part utilisée : un veilleur qui recalcule un seuil au lieu de le lire ici se voit.
import { J, noter } from './commun-doublures.mjs'

export const JAUGES = []
export function calculerJauges(donnees, maintenant) {
  noter('jauges.calculerJauges', { donnees, maintenant: maintenant instanceof Date ? maintenant.toISOString() : maintenant ?? null })
  return (J().config?.jauges ?? []).map((j) => ({ reinitialise_le: null, ...j }))
}
export async function consommerJauge() { return true }
