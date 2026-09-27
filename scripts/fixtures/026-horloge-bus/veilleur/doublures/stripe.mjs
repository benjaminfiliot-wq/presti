// Doublure de lib/direction/stripe (026-045) : l'encaissé du mois vient du cas du juge (J.config.encaisse = { brut } ou
// { valeur: null }), au format Sourcee de lib/direction/fraicheur.ts. Aucune lecture de Stripe.
import { J, noter } from './commun-doublures.mjs'

const sourcee = (valeur, erreur) => ({ valeur, source: 'stripe', a: new Date().toISOString(), cache: false, ...(erreur ? { erreur } : {}) })
const encaisse = (brut) => ({ brut, frais: 0, net: brut, paiements: brut > 0 ? 1 : 0, rembourse: 0 })
export async function encaisseDuMois() {
  noter('stripe.encaisseDuMois', null)
  const c = J().config?.encaisse ?? { brut: 0 }
  if (c.valeur === null) return sourcee(null, 'Stripe injoignable (doublure)')
  return sourcee(encaisse(Number(c.brut) || 0))
}
export const encaisseDepuis = async () => sourcee(encaisse(0))
export const encaisseDuJour = async () => sourcee(encaisse(0))
export const encaisseSur7Jours = async () => sourcee(encaisse(0))
export const joignable = async () => sourcee({ disponible: 0, enAttente: 0, livemode: false })
export const mrr = async () => sourcee({ mrr: 0, abonnements: 0, parPlan: {}, enPause: 0, abonnementsEnPause: 0 })
export const conversionsDuJour = async () => sourcee(0)
export const echecsRecents = async () => sourcee([])
export const evenementsRecents = async () => sourcee([])
