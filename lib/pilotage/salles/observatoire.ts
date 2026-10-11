// 026-178 — l'Observatoire : pilotage_prospects_departements() (0113, 026-175), agrégé par département — trouvés, contactés, oui —
// et RIEN d'autre : jamais un nom, une entreprise ni une adresse, quelles que soient les colonnes que la fonction rendrait un jour.
// Sous `sante`.
import type { Contexte } from '../station'
import { lignes, nombre } from './outils'

export async function lireDepartements(c: Contexte) {
  const l = lignes(await c.rpc('pilotage_prospects_departements'))
  return l.map((x) => ({ departement: String(x.departement ?? 'inconnu'), trouves: nombre(x.trouves), contactes: nombre(x.contactes), oui: nombre(x.oui) }))
}
export async function lire(c: Contexte) {
  return { departements: await lireDepartements(c) }
}
