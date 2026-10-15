// Qui passe sur un ÉCRAN réservé à une offre (15/10, Benj : « Ma plateforme » et « Mes chiffres » commencent avec Studio,
// pour tous les comptes). Décision PURE, rejouée par scripts/ecrans-offre-qa.mjs ; lib/accesOffreServeur.ts la nourrit de la
// vraie offre du compte. Le verrou est celui de la matrice (lib/plans.ts) : jamais un `plan === 'studio'` en dur.
import { PLANS, messageVerrou, offreMinimale, peut, type Capacite, type PlanPayant } from './plans.ts'

export type Ecran = 'plateforme' | 'chiffres'

/** Les écrans verrouillés par offre : la capacité qui les ouvre, leur nom, ce qu'ils contiennent (pour expliquer le verrou). */
export const ECRANS: Record<Ecran, { capacite: Capacite; nom: string; contenu: string }> = {
  plateforme: {
    capacite: 'plateforme.gestion',
    nom: 'Ma plateforme',
    contenu: 'le poste de pilotage de votre plateforme de conversation : réglages de l’assistant (ton, nom, horaires, mise en pause), apparence de votre page (thème, couleur, polices, avatar) et règles d’automatisation.',
  },
  chiffres: {
    capacite: 'chiffres',
    nom: 'Mes chiffres',
    contenu: 'votre tableau de bord comptable : chiffre d’affaires, impayés, devis à relancer, et vos fichiers de dépenses et de ventes rangés par l’assistant.',
  },
}

export type RefusOffre = {
  ok: false
  statut: 403
  code: 'offre'
  /** L'offre qui ouvre l'écran (id et nom) — pour le bouton « Voir les offres ». */
  offre: PlanPayant | null
  erreur: string
}
export type AccesOffre = { ok: true } | RefusOffre

/** Le compte (par son offre) a-t-il l'écran ? `sujet` : « L’écran « Mes chiffres » ». Sinon : 403, le message de la matrice, et l'offre qui l'ouvre. */
export function decisionEcran(plan: string | null | undefined, capacite: Capacite, sujet: string): AccesOffre {
  if (peut(plan, capacite)) return { ok: true }
  const o = offreMinimale(capacite)
  return { ok: false, statut: 403, code: 'offre', offre: o, erreur: `${sujet} n’est pas dans votre offre. ${messageVerrou(capacite)}` }
}

/** Idem pour un des deux écrans (« plateforme » / « chiffres »). */
export const decisionPourEcran = (plan: string | null | undefined, ecran: Ecran): AccesOffre => decisionEcran(plan, ECRANS[ecran].capacite, `L’écran « ${ECRANS[ecran].nom} »`)

/** Libellé de l'offre minimale d'une capacité (« Studio »), pour les écrans verrouillés. */
export const libelleOffreMinimale = (capacite: Capacite): string => { const o = offreMinimale(capacite); return o ? PLANS[o].label : 'supérieure' }
