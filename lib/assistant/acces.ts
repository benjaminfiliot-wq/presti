// L'assistant de gestion de la console — QUI PASSE (offre Signature). Décision pure, rejouée par scripts/assistant-qa.mjs ;
// lib/assistant/garde.ts la nourrit de vraies valeurs pour les deux routes (/api/assistant et /api/assistant/actions).
//
// Ordre voulu (le même que lib/crm/acces.ts) :
//  1. drapeau baissé → 404, AVANT de lire la session : une route fermée ne dit rien ;
//  2. session invalide (absente, révoquée, suspendue, double authentification manquante) → son statut (401 / 403) ;
//  3. compte hors essai (ESSAI, tant que le drapeau est baissé) → 404 : il ne sait pas que l'assistant existe ;
//  4. offre sans la capacité `assistant` (lib/plans.ts : Signature et Business seulement) → 403 et le message de verrou.
// Pas de passe-droit fondateur : un fondateur passe parce que son offre (Business) porte la capacité, comme tout le monde.
// La vérification est SERVEUR : masquer l'entrée de menu ou le bouton ne protège rien, les URL restent appelables.
import { messageVerrou, peut } from '../plans'

export type AccesAssistant = { ok: true } | { ok: false; statut: 401 | 403 | 404; erreur: string | null; code?: string }

export function decisionAssistant(p: {
  drapeau: boolean
  session: { ok: true } | { ok: false; statut: 401 | 403; erreur: string; code?: string }
  ouvertPourCeCompte: boolean
  plan: string | null | undefined
}): AccesAssistant {
  if (!p.drapeau) return { ok: false, statut: 404, erreur: null }
  if (!p.session.ok) return { ok: false, statut: p.session.statut, erreur: p.session.erreur, ...(p.session.code ? { code: p.session.code } : {}) }
  if (!p.ouvertPourCeCompte) return { ok: false, statut: 404, erreur: null }
  if (!peut(p.plan, 'assistant')) return { ok: false, statut: 403, erreur: `L’assistant de gestion n’est pas dans votre offre. ${messageVerrou('assistant')}`, code: 'offre' }
  return { ok: true }
}
