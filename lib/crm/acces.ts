// CRM — qui passe. Décision pure (rejouée par scripts/crm-qa.mjs) ; lib/crm/serveur.ts la nourrit de vraies valeurs.
//
// Ordre voulu :
//  1. drapeau baissé → 404, AVANT de lire la session : une route fermée ne dit rien, pas même « connectez-vous » ;
//  2. session invalide (absente, révoquée, suspendue, double authentification manquante) → son statut (401 / 403) ;
//  3. offre sans la capacité `crm` (lib/plans.ts : Signature et Business) → 403 et le message de verrou de la matrice.
// Pas de passe-droit fondateur : un fondateur passe parce que son offre (Business) porte la capacité, comme tout le monde.
import { messageVerrou, peut } from '../plans.ts'

export type Acces = { ok: true } | { ok: false; statut: 401 | 403 | 404; erreur: string | null; code?: string }

export function decisionAcces(p: {
  drapeau: boolean
  session: { ok: true } | { ok: false; statut: 401 | 403; erreur: string; code?: string }
  plan: string | null | undefined
}): Acces {
  if (!p.drapeau) return { ok: false, statut: 404, erreur: null }
  if (!p.session.ok) return { ok: false, statut: p.session.statut, erreur: p.session.erreur, ...(p.session.code ? { code: p.session.code } : {}) }
  if (!peut(p.plan, 'crm')) return { ok: false, statut: 403, erreur: `Le CRM atelier n’est pas dans votre offre. ${messageVerrou('crm')}`, code: 'offre' }
  return { ok: true }
}
