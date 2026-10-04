// 026-178 — les lecteurs des vues de salle restantes, un par salle, chacun sous son domaine (DOMAINE_DE de lib/pilotage/station.ts).
// Aucune requête recopiée : les lectures du Poste (audience, bans, clients, cerveaux, tickets, santé, crons) viennent de
// lib/controle/lectures (026-174), passées par la route dans `c.deps.lectures` ; le MRR de lib/direction/stripe.ts, dans `c.deps.mrr`.
// Ce module n'importe jamais la base : `station.ts` reste importable sans elle (`trier`, `DOMAINE_DE`).
import type { Contexte } from '../station'
import * as commandement from './commandement'
import * as radar from './radar'
import * as crieur from './crieur'
import * as studio from './studio'
import * as chantier from './chantier'
import * as audience from './audience'
import * as securite from './securite'
import * as presti from './presti'
import * as observatoire from './observatoire'
import * as repos from './repos'
import * as natures from './natures'
import { lignes, nombre } from './outils'

export const LECTEURS: Readonly<Record<string, (c: Contexte) => Promise<unknown>>> = {
  commandement: commandement.lire, radar: radar.lire, crieur: crieur.lire, studio: studio.lire, chantier: chantier.lire,
  audience: audience.lire, securite: securite.lire, presti: presti.lire, observatoire: observatoire.lire, repos: repos.lire,
}
export { radar, observatoire, natures, crieur, studio }
export { sante } from './sante'

/** ACTIVE AUJ. d'une salle : pilotage_activite_salles(<minuit à Paris>) (0113), en minutes ; une salle absente de la réponse est à 0. */
export async function activiteDuJour(c: Contexte, salle: string) {
  const l = lignes(await c.rpc('pilotage_activite_salles', { p_depuis: c.depuisMinuit })).find((x) => x.salle === salle)
  return { minutes: l ? nombre(l.minutes) : 0 }
}
