// Doublure de lib/agents/bus (026-045), pour tic-qa : chaque fonction du bus (0097, 0098) est un espion qui consigne son
// appel et rend { ok: true, data } ; J.config.<nom> = { erreur, dureeMs, rend } change son comportement.
import { jouer } from './commun-doublures.mjs'

const espion = (nom, data = null) => async (p) => {
  const r = await jouer(`bus.${nom}`, p ?? {}, () => ({ ok: true, data }))
  return r
}
export const STATUT_ERREUR = {}
export const ops_agent_enregistrer = espion('ops_agent_enregistrer')
export const ops_agent_poser_jeton = espion('ops_agent_poser_jeton')
export const ops_agent_par_jeton = espion('ops_agent_par_jeton', [])
export const ops_agent_retirer = espion('ops_agent_retirer')
export const ops_agent_pause = espion('ops_agent_pause')
export const ops_agent_echeance = espion('ops_agent_echeance')
export const ops_battement = espion('ops_battement')
export const ops_evenement_ajouter = espion('ops_evenement_ajouter', 1)
export const ops_evenements_lire = espion('ops_evenements_lire', [])
export const ops_evenements_purger = espion('ops_evenements_purger', 0)
export const ops_interrupteur = espion('ops_interrupteur', false)
export const ops_interrupteur_poser = espion('ops_interrupteur_poser')
export const ops_decision_creer = espion('ops_decision_creer', [])
export const ops_decision_trancher = espion('ops_decision_trancher')
export const ops_decisions_tranchees = espion('ops_decisions_tranchees', [])
export const ops_decisions_echues = espion('ops_decisions_echues', 0)
export const ops_type_sortant = espion('ops_type_sortant', false)
export const ops_tache_creer = espion('ops_tache_creer', [])
export const ops_tache_prendre = espion('ops_tache_prendre', [])
export const ops_tache_rendre = espion('ops_tache_rendre')
export const ops_tache_clore = espion('ops_tache_clore')
export const ops_baux_expirer = espion('ops_baux_expirer', 0)
export const ops_cout_ajouter = espion('ops_cout_ajouter')
export const ops_etat = espion('ops_etat', {})
export const ops_stockage_octets = espion('ops_stockage_octets', 0)
