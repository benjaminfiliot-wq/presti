// Doublure de lib/agents/fileArgent (026-045), pour tic-qa : balayerCommandesPayees et traiterFileArgent consignent leur
// appel (avec budgetMs), « durent » sur l'horloge simulée (J.config.<nom>.dureeMs) ou lèvent (J.config.<nom>.erreur).
import { jouer } from './commun-doublures.mjs'

export const HANDLERS = { commande_payee: async () => ({}), essai_e2e: async () => ({ ok: true }) }
export const balayerCommandesPayees = () => jouer('fileArgent.balayerCommandesPayees', null, () => ({ vues: 2, envoyees: 1 }))
export const traiterFileArgent = (o) => jouer('fileArgent.traiterFileArgent', o ?? {}, () => ({ lus: 1, faits: 1, echecs: 0, inconnus: 0, dureeMs: 0 }))
export const deposerEntreeUsine = async () => ({ depose: false })
