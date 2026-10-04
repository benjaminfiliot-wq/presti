// 026-178 — le lecteur de la salle Commandement. Sous `sante` ; le niveau et les missions en euros sont dans la sous-partie
// `argent` (comptabilite), produite par la MÊME fonction que direct.commandement (jamais recalculée ici). Les consignes reçues par le
// Chef sont les événements `consigne` et `consigne_lue`, passés par le masque des bulles (aucun contact, aucun lien).
import type { Contexte } from '../station'
import { bulles } from '../fil'
import { lignes } from './outils'

export async function lire(c: Contexte) {
  const cm = (await c.commandement('salle.commandement')) as Record<string, unknown>
  const consignes = bulles(lignes(await c.rpc('pilotage_evenements', { p_apres: null, p_limite: 20, p_agent: null, p_types: ['consigne', 'consigne_lue'] })))
  return { ...cm, consignes: consignes.map((b) => ({ id: b.id, le: b.le, texte: b.texte, cible: b.cible ?? null })) }
}
