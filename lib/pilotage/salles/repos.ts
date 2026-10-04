// 026-178 — la Salle de repos : les agents en pause (pilotage_agents), avec le motif posé et la date de leur dernière activité.
// Le motif est un texte libre du fondateur : il passe par le masque des bulles (adresse, lien, numéro, civilité). Personne en pause :
// la phrase, jamais une fenêtre « bientôt ». Sous `sante`.
import type { Contexte } from '../station'
import { masquer } from '../fil'

export async function lire(c: Contexte) {
  const agents = (await c.agents()).filter((a) => a.en_pause)
  return {
    agents: agents.map((a) => ({ nom: a.nom, motif: a.pause_motif ? masquer(a.pause_motif) : null, derniere_activite_le: a.dernier_le ?? null })),
    vide: agents.length ? null : 'Personne en pause : l’équipage travaille.',
  }
}
