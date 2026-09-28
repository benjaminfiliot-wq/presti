// Doublure de lib/controle/lectures (026-174 : bans(), cronsDuService()) et de lib/pilotage/salles/securite (026-178 :
// erreurs24h(), la lecture « erreurs des 24 h » de la salle Sécurité), pour vigile-qa (026-248). Chaque lecture est
// consignée ; sa valeur vient de __VIGILE_QA__.sources (une fonction par source, posée par la sonde du juge), et une
// source non posée lève (le serveur doit alors rendre sa section « non mesurée », jamais un 500).
const V = () => (globalThis.__VIGILE_QA__ ??= { drapeaux: {}, sources: {}, appels: [] })
async function lire(nom) {
  V().appels.push({ quoi: 'source', nom })
  const f = V().sources?.[nom]
  if (typeof f !== 'function') throw new Error(`source ${nom} non doublée`)
  return f()
}
export const bans = () => lire('bans')
export const cronsDuService = () => lire('crons')
export const erreurs24h = () => lire('erreurs')
export const santeService = () => lire('sante')
export const audience = () => lire('audience')
export const clients = () => lire('clients')
export const cerveaux = () => lire('cerveaux')
export const ticketsOuverts = () => lire('tickets')
