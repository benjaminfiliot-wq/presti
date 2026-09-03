// Règles d'automatisation de la plateforme (v5 §9 G1) — le lien entre la réponse auto et
// le devis/facture auto. Une règle est une phrase dont chaque maillon est un réglage :
//
//   « Quand l'assistant a qualifié le besoin [et reçu au moins une photo]
//      → créer un devis brouillon avec le modèle X → me notifier
//      → si je valide → l'envoyer dans la conversation
//      → quand le client accepte → créer la facture d'acompte de N % »
//
// Deux principes non négociables (audit v5 §11) :
//  - aucun envoi au client sans le maillon « validation » quand il est activé ;
//  - jamais deux devis automatiques pour une conversation (index unique `devis_regle_par_lead_idx`).
//
// La DÉCISION est pure (testable sans base) ; l'APPLICATION est à part et reçoit ses effets
// en paramètres — le moteur ne sait pas créer un devis, il demande qu'on le fasse.

import type { Tier } from './models'

export type Maillons = {
  /** Créer un devis brouillon dès que la conversation est qualifiée. */
  devis_auto: boolean
  /** Attendre au moins une photo du client avant de chiffrer. */
  photo_requise: boolean
  /** Niveau de modèle pour chiffrer. */
  modele: Tier
  /** Prévenir l'artisan quand un brouillon est prêt. */
  notifier: boolean
  /** L'artisan doit valider avant que le devis parte dans la conversation. */
  validation: boolean
  /** Après validation (ou sans validation si désactivée) : envoyer dans la conversation. */
  envoyer_apres_validation: boolean
  /** À l'acceptation par le client : facture d'acompte de N %. null = pas de facture auto. */
  acompte_pct: number | null
}

export type Prereglage = 'prudent' | 'equilibre' | 'reactif' | 'tout_auto' | 'perso'

/** Les 4 préréglages proposés à l'artisan. Il en applique un, puis ajuste maillon par maillon. */
export const PREREGLAGES: Record<Exclude<Prereglage, 'perso'>, { nom: string; phrase: string; maillons: Maillons }> = {
  prudent: {
    nom: 'Prudent',
    phrase: 'L’assistant qualifie, vous faites le reste.',
    maillons: { devis_auto: false, photo_requise: true, modele: 'standard', notifier: true, validation: true, envoyer_apres_validation: false, acompte_pct: null },
  },
  equilibre: {
    nom: 'Équilibré',
    phrase: 'Un brouillon de devis vous attend, rien ne part sans vous.',
    maillons: { devis_auto: true, photo_requise: true, modele: 'pro', notifier: true, validation: true, envoyer_apres_validation: true, acompte_pct: null },
  },
  reactif: {
    nom: 'Réactif',
    phrase: 'Devis prêt sans photo, vous validez, l’acompte suit l’acceptation.',
    maillons: { devis_auto: true, photo_requise: false, modele: 'pro', notifier: true, validation: true, envoyer_apres_validation: true, acompte_pct: 30 },
  },
  tout_auto: {
    nom: 'Tout auto',
    phrase: 'Le devis part seul dans la conversation, l’acompte se facture à l’acceptation.',
    maillons: { devis_auto: true, photo_requise: false, modele: 'pro', notifier: true, validation: false, envoyer_apres_validation: true, acompte_pct: 30 },
  },
}

export const MAILLONS_DEFAUT: Maillons = PREREGLAGES.equilibre.maillons

/** Lit des maillons depuis la base (jsonb) sans jamais faire confiance à leur forme. */
export function normaliserMaillons(brut: unknown): Maillons {
  const o = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>
  const b = (k: keyof Maillons, d: boolean) => (typeof o[k] === 'boolean' ? (o[k] as boolean) : d)
  const modele: Tier = (['standard', 'pro', 'expert'] as const).includes(o.modele as Tier) ? (o.modele as Tier) : MAILLONS_DEFAUT.modele
  const pct = typeof o.acompte_pct === 'number' && o.acompte_pct > 0 && o.acompte_pct <= 100 ? Math.round(o.acompte_pct) : null
  return {
    devis_auto: b('devis_auto', MAILLONS_DEFAUT.devis_auto),
    photo_requise: b('photo_requise', MAILLONS_DEFAUT.photo_requise),
    modele,
    notifier: b('notifier', MAILLONS_DEFAUT.notifier),
    validation: b('validation', MAILLONS_DEFAUT.validation),
    envoyer_apres_validation: b('envoyer_apres_validation', MAILLONS_DEFAUT.envoyer_apres_validation),
    acompte_pct: pct,
  }
}

/** La règle, écrite en une phrase — c'est ce que l'artisan lit dans le constructeur. */
export function phraseRegle(m: Maillons): string {
  if (!m.devis_auto) return 'Quand l’assistant a qualifié le besoin → me notifier. Je crée le devis moi-même.'
  const parts = [
    `Quand l’assistant a qualifié le besoin${m.photo_requise ? ' et reçu au moins une photo' : ''}`,
    `créer un devis brouillon avec le modèle ${m.modele === 'expert' ? 'Expert' : m.modele === 'pro' ? 'Pro' : 'Standard'}`,
    m.notifier ? 'me notifier' : null,
    m.validation ? 'si je valide' : null,
    m.envoyer_apres_validation ? 'l’envoyer dans la conversation' : null,
    m.acompte_pct ? `quand le client accepte → créer la facture d’acompte de ${m.acompte_pct} %` : null,
  ].filter(Boolean)
  return parts.join(' → ') + '.'
}

export type ContexteConversation = {
  /** Le besoin est-il qualifié ? (type de chantier détecté, ou l'assistant a posé ses questions) */
  qualifie: boolean
  nbPhotos: number
  /** Un devis existe-t-il déjà pour cette conversation, quelle qu'en soit l'origine ? */
  devisExistant: boolean
  /** Prise de main par l'artisan : les règles se taisent, comme l'assistant. */
  priseEnMain: boolean
}

export type Decision =
  | { action: 'rien'; pourquoi: string }
  | { action: 'creer_devis'; modele: Tier; puisNotifier: boolean; envoyerSansValidation: boolean }

/** Décision pure : que faire maintenant, après une réponse de l'assistant ? */
export function decider(m: Maillons, actif: boolean, ctx: ContexteConversation): Decision {
  if (!actif) return { action: 'rien', pourquoi: 'règle désactivée' }
  if (ctx.priseEnMain) return { action: 'rien', pourquoi: 'l’artisan a pris la main' }
  if (ctx.devisExistant) return { action: 'rien', pourquoi: 'un devis existe déjà pour cette conversation' }
  if (!ctx.qualifie) return { action: 'rien', pourquoi: 'besoin pas encore qualifié' }
  if (!m.devis_auto) return { action: 'rien', pourquoi: 'devis automatique désactivé' }
  if (m.photo_requise && ctx.nbPhotos === 0) return { action: 'rien', pourquoi: 'photo attendue' }
  return {
    action: 'creer_devis',
    modele: m.modele,
    puisNotifier: m.notifier,
    // Sans maillon « validation », l'envoi dans la conversation est immédiat. C'est le seul
    // cas où quelque chose part sans l'artisan — et il l'a choisi explicitement (« Tout auto »).
    envoyerSansValidation: !m.validation && m.envoyer_apres_validation,
  }
}

/** Le pourcentage d'acompte à facturer à l'acceptation, ou null. */
export function acompteALAcceptation(m: Maillons, actif: boolean): number | null {
  return actif && m.acompte_pct ? m.acompte_pct : null
}
