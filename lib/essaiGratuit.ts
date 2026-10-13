// lib/essaiGratuit.ts — les RÈGLES de l'essai gratuit sans carte (décision de Benj, 13/10/2026). Fonctions pures : ni base,
// ni réseau, ni horloge cachée. La route /api/subscribe, le webhook Stripe et le juge scripts/essais-gratuits-qa.mjs lisent
// les mêmes fonctions. Ce qui touche la base et Stripe est dans lib/essaiGratuitServeur.ts.
//
// Le principe : « 7 / 14 / 21 jours gratuits, sans carte » n'est dit que si c'est vrai.
//   • Durées : ESSAI_JOURS (lib/plans.ts), une seule constante.
//   • Sans carte : le Checkout ne demande pas de moyen de paiement (payment_method_collection: 'if_required') et, à la fin de
//     l'essai sans carte, Stripe ANNULE l'abonnement (trial_settings.end_behavior.missing_payment_method: 'cancel') ;
//     customer.subscription.deleted ramène le compte à l'offre d'Essai. Rien n'est perdu : seules les capacités de l'offre payante partent.
//   • Un seul essai par compte, et pas de nouvel essai pour un e-mail déjà passé par là.
//   • Crédits : au prorata des jours (voir creditsEssai).
import { ESSAI_JOURS, ESSAI_CREDITS_PLAFOND, PLANS, type PlanPayant } from './plans'

export const estPlanPayant = (plan: unknown): plan is PlanPayant => typeof plan === 'string' && Object.prototype.hasOwnProperty.call(ESSAI_JOURS, plan)

/** Durée de l'essai d'une offre, en jours (0 si l'offre n'en a pas : gratuit, business, inconnue). */
export const essaiJours = (plan: unknown): number => (estPlanPayant(plan) ? ESSAI_JOURS[plan] : 0)

/**
 * Crédits servis pour un essai — LA règle la plus sûre côté coûts, tranchée par défaut (Benj peut la changer ici seulement) :
 * crédits du mois × jours / 30, arrondis à l'inférieur, plafonnés à ESSAI_CREDITS_PLAFOND. Jamais le forfait mensuel entier :
 * sans carte, un compte jetable ne doit pas coûter le prix d'un mois de crédits IA.
 */
export function creditsEssai(plan: unknown): number {
  if (!estPlanPayant(plan)) return 0
  return Math.min(ESSAI_CREDITS_PLAFOND, Math.floor((PLANS[plan].creditsMois * ESSAI_JOURS[plan]) / 30))
}

/**
 * L'e-mail ramené à une forme comparable : minuscules, sans espaces ; pour Gmail/Googlemail, sans points ni « +étiquette »
 * (benj.f+x@gmail.com = benjf@gmail.com) ; pour les autres fournisseurs, sans « +étiquette » (la quasi-totalité l'ignore).
 * Le but : qu'un compte recréé avec la même boîte ne rouvre pas un essai.
 */
export function normaliserEmail(email: unknown): string {
  const e = String(email ?? '').trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at < 1) return e
  let local = e.slice(0, at)
  let domaine = e.slice(at + 1)
  local = local.split('+')[0]
  if (domaine === 'googlemail.com') domaine = 'gmail.com'
  if (domaine === 'gmail.com') local = local.replace(/\./g, '')
  return `${local}@${domaine}`
}

/** Ce qu'on sait d'un compte au moment de proposer l'essai. Chaque champ à vrai ferme l'essai. */
export type FaitsEssai = {
  /** artisans.stripe_subscription_id est renseigné : un abonnement court déjà. */
  abonnementEnCours: boolean
  /** Le registre des essais (essais_gratuits) connaît déjà ce compte ou cet e-mail. */
  essaiDejaPris: boolean
  /** Le client Stripe du compte, ou un client Stripe du même e-mail, a déjà eu un abonnement (même résilié). */
  abonnementDejaEu: boolean
  /** La vérification n'a pas pu aller jusqu'au bout (Stripe injoignable) : dans le doute, pas d'essai. */
  verificationImpossible?: boolean
}
export type RaisonRefus = 'abonnement_en_cours' | 'essai_deja_pris' | 'abonnement_deja_eu' | 'verification_impossible'
export type DecisionEssai = { essai: true; raison: 'ok' } | { essai: false; raison: RaisonRefus }

/** Un essai si et seulement si AUCUN fait ne le ferme. L'ordre des raisons est celui de la gravité. */
export function decisionEssai(f: FaitsEssai): DecisionEssai {
  if (f.abonnementEnCours) return { essai: false, raison: 'abonnement_en_cours' }
  if (f.essaiDejaPris) return { essai: false, raison: 'essai_deja_pris' }
  if (f.abonnementDejaEu) return { essai: false, raison: 'abonnement_deja_eu' }
  if (f.verificationImpossible) return { essai: false, raison: 'verification_impossible' }
  return { essai: true, raison: 'ok' }
}

/**
 * Les champs d'un Checkout d'abonnement qui portent l'essai. Sans essai : rien (le Checkout reste celui d'avant, carte
 * demandée tout de suite). Avec essai : durée de l'offre, aucune carte demandée, et annulation à la fin si aucune carte n'a été ajoutée.
 */
export function champsCheckoutEssai(plan: unknown, essai: boolean): {
  payment_method_collection?: 'if_required'
  jours: number
  subscription_data?: { trial_period_days: number; trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } }
} {
  const jours = essai ? essaiJours(plan) : 0
  if (!essai || jours < 1) return { jours: 0 }
  return {
    payment_method_collection: 'if_required',
    jours,
    subscription_data: { trial_period_days: jours, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } },
  }
}

/** Une session de Checkout d'essai : sa métadonnée essai_jours (posée par NOTRE serveur) doit être la durée de l'offre. → jours, ou 0. */
export function joursEssaiDeSession(metadata: Record<string, string> | null | undefined, plan: unknown): number {
  const n = Number(metadata?.essai_jours)
  return Number.isInteger(n) && n > 0 && n === essaiJours(plan) ? n : 0
}

/** La date (AAAA-MM-JJ) de fin d'un essai de `jours` jours commencé à `debut`. */
export function finEssai(debut: Date, jours: number): string {
  return new Date(debut.getTime() + jours * 86_400_000).toISOString().slice(0, 10)
}

type SousAbonnement = { status?: string; trial_end?: number | null; ended_at?: number | null; canceled_at?: number | null }

/**
 * Cet abonnement s'est-il terminé SANS avoir jamais été payé ? Vrai quand il avait un essai et qu'il a pris fin pendant
 * l'essai ou à son terme (une heure de marge pour les horloges) : annulation par Stripe faute de carte, ou résiliation en
 * cours d'essai. Faux pour un abonnement qui a payé puis a été résilié (l'artisan garde alors ses crédits restants).
 */
export function finDEssaiSansPaiement(sub: SousAbonnement, maintenant = Date.now()): boolean {
  if (!sub.trial_end) return false
  const fin = sub.ended_at ?? sub.canceled_at ?? Math.floor(maintenant / 1000)
  return fin <= sub.trial_end + 3600
}

/** Les statuts Stripe qui ferment un abonnement pour de bon : l'artisan retombe sur l'offre d'Essai. */
export const STATUTS_FERMES = ['canceled', 'incomplete_expired'] as const
export const abonnementFerme = (status: unknown): boolean => typeof status === 'string' && (STATUTS_FERMES as readonly string[]).includes(status)

/** Après la fin d'un essai non payé : au plus les crédits de l'offre d'Essai (les crédits de l'essai ne survivent pas à l'essai). */
export const creditsApresEssaiPerdu = (credits: number | null | undefined): number => Math.max(0, Math.min(credits ?? 0, PLANS.gratuit.creditsMois))

/** Le passage d'un essai à un abonnement payé (carte ajoutée, premier prélèvement) : l'événement l'annonce par previous_attributes.status. */
export const essaiDevenuPayant = (statutAvant: unknown, statutMaintenant: unknown): boolean => statutAvant === 'trialing' && statutMaintenant === 'active'
