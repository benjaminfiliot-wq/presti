import type { Sourcee } from '@/lib/direction/fraicheur'

// Ce qui fait qu'un service va bien, ou non (prompt v10 §2.1, v11 §1).
//
// Cette règle vit ici, et pas dans une route, parce que DEUX écrans l'affichent : le bandeau de la vue
// « Aujourd'hui » et la barre d'état permanente. Le 07/09, chacun faisait sa propre mesure — la barre
// annonçait « Service normal » pendant que le bandeau, dix pixels plus bas, disait « Service dégradé ».
// Deux affirmations contradictoires côte à côte détruisent la confiance dans tout l'écran, y compris
// dans ce qui est juste. Une seule règle, un seul verdict.
export type Niveau = 'ok' | 'degrade' | 'incident'
export type Controle = {
  cle: string
  libelle: string
  etat: 'ok' | 'warn' | 'crit' | 'info'
  detail: string
  source: Sourcee<unknown>['source']
  a: string
  cache: boolean
  manque?: string
}

/** Les contrôles qui parlent du SERVICE. */
const SERVICE = ['site', 'connexion', 'stripe', 'resend', 'crons']
/** Ceux dont la panne est un incident, pas une dégradation : sans eux, Presti ne rend plus son service. */
const VITAUX = ['site', 'connexion', 'stripe']

/**
 * Le verdict d'ensemble.
 *
 * Le budget IA en est exclu volontairement. Une facture qui dépasse ne dit rien de la santé du produit :
 * le site répond, Stripe encaisse, les emails partent. C'est une dépense à surveiller, et elle a sa
 * propre tuile. La faire peser sur l'état du service apprendrait à ignorer un bandeau orange — ce qui
 * est exactement le contraire du but d'un bandeau orange.
 */
export function niveauService(controles: Controle[]): Niveau {
  const pertinents = controles.filter((c) => SERVICE.includes(c.cle))
  if (pertinents.some((c) => c.etat === 'crit' && VITAUX.includes(c.cle))) return 'incident'
  if (pertinents.some((c) => c.etat === 'crit' || c.etat === 'warn')) return 'degrade'
  return 'ok'
}
