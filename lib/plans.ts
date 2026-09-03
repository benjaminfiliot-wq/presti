// Source de vérité des offres Presti — UNE matrice dont TOUT découle (v5 §3) :
// pages d'abonnement et de la landing, badges 🔒 dans la console, verrous serveur,
// textes d'aide. Avant, quatre endroits racontaient quatre histoires différentes.
//
// Règle du sprint : une ligne de la grille n'apparaît au public que si la fonctionnalité
// existe vraiment (drapeau `lib/flags.ts`). L'audit v4 a relevé des « promesses de vente
// non tenues » — la matrice est le seul endroit où on s'en protège structurellement.
import type { Tier } from './models'
import { FLAGS, type Flag } from './flags'

export type PlanId = 'gratuit' | 'essentiel' | 'studio' | 'signature' | 'business'
export type PlanPayant = 'essentiel' | 'studio' | 'signature'

/** Ce qu'une offre débloque. Le nom dit le domaine, puis la capacité. */
export type Capacite =
  | 'plateforme.conversation' | 'plateforme.ia.auto' | 'plateforme.ia.expert' | 'plateforme.comptes_clients'
  | 'plateforme.domaine_perso' | 'plateforme.personnalisation_avancee' | 'plateforme.regles'
  | 'site.essentiel' | 'site.pro' | 'site.signature' | 'site.slides3d' | 'site.domaine_perso'
  | 'devis.ia' | 'devis.prix_artisan' | 'factures' | 'factures.electronique'
  | 'inventaire.stock' | 'inventaire.recherche_ia'
  | 'canaux.email' | 'canaux.whatsapp' | 'canaux.reseaux'
  | 'relances' | 'export' | 'support.prioritaire'

type Plan = {
  label: string
  accroche: string
  creditsMois: number
  prixMois: number
  tiers: Tier[]
  /** Niveau de site vitrine maximum inclus (1 Essentiel, 2 Pro, 3 Signature). */
  siteMax: 1 | 2 | 3
  capacites: Capacite[]
}

// Les capacités s'empilent : chaque palier reprend le précédent et ajoute.
const BASE: Capacite[] = [
  'plateforme.conversation', 'plateforme.comptes_clients',
  'site.essentiel',
  'devis.ia', 'devis.prix_artisan', 'factures', 'factures.electronique',
  'canaux.email', 'relances',
]
const STUDIO: Capacite[] = [
  ...BASE,
  'plateforme.ia.auto', 'plateforme.personnalisation_avancee',
  'site.pro',
  'inventaire.stock', 'inventaire.recherche_ia',
  'canaux.whatsapp', 'export',
]
const SIGNATURE: Capacite[] = [
  ...STUDIO,
  'plateforme.ia.expert', 'plateforme.regles', 'plateforme.domaine_perso',
  'site.signature', 'site.slides3d', 'site.domaine_perso',
  'canaux.reseaux', 'support.prioritaire',
]

export const PLANS: Record<PlanId, Plan> = {
  // L'essai = l'Essentiel avec 3 crédits, pour juger sur ses vraies demandes avant de payer.
  gratuit: { label: 'Essai', accroche: 'Pour juger sur vos vraies demandes, sans carte.', creditsMois: 3, prixMois: 0, tiers: ['standard'], siteMax: 1, capacites: BASE },
  essentiel: { label: 'Essentiel', accroche: 'Pour ne plus louper une demande.', creditsMois: 80, prixMois: 29, tiers: ['standard'], siteMax: 1, capacites: BASE },
  studio: { label: 'Studio', accroche: 'Présence en ligne soignée, et l’assistant qui répond seul.', creditsMois: 250, prixMois: 59, tiers: ['standard', 'pro'], siteMax: 2, capacites: STUDIO },
  signature: { label: 'Signature', accroche: 'L’atelier à plein régime, image d’agence, votre nom de domaine.', creditsMois: 600, prixMois: 99, tiers: ['standard', 'pro', 'expert'], siteMax: 3, capacites: SIGNATURE },
  // Fondateurs : plan interne, illimité (jamais décompté).
  business: { label: 'Business', accroche: '', creditsMois: 100000, prixMois: 0, tiers: ['standard', 'pro', 'expert'], siteMax: 3, capacites: SIGNATURE },
}

// Coût en crédits par niveau de modèle.
export const CREDIT_COST: Record<Tier, number> = { standard: 1, pro: 1, expert: 3 }

export const planConf = (plan: string | null | undefined): Plan => PLANS[(plan || 'gratuit') as PlanId] || PLANS.gratuit
// Niveau de site max autorisé par la formule (défaut : Essentiel).
export const siteMaxForPlan = (plan: string | null | undefined): 1 | 2 | 3 => planConf(plan).siteMax ?? 1

/**
 * LE verrou. Tous les contrôles d'offre côté serveur passent par ici — plus jamais un
 * `plan === 'studio'` en dur qui dérive de la grille vendue.
 */
export function peut(plan: string | null | undefined, capacite: Capacite): boolean {
  return planConf(plan).capacites.includes(capacite)
}

/** La première offre (payante) qui débloque une capacité — pour dire « Disponible avec Studio ». */
export function offreMinimale(capacite: Capacite): PlanPayant | null {
  for (const id of ['essentiel', 'studio', 'signature'] as const) if (PLANS[id].capacites.includes(capacite)) return id
  return null
}

/** Message uniforme pour un 🔒 dans la console ou un 403 côté serveur. */
export function messageVerrou(capacite: Capacite): string {
  const o = offreMinimale(capacite)
  return o ? `Disponible avec l’offre ${PLANS[o].label}.` : 'Non disponible.'
}

// Offres payantes proposées dans le tunnel d'abonnement (l'ordre est celui de l'affichage).
export const OFFRES: { id: PlanPayant; label: string; prix: number; credits: number; accroche: string }[] =
  (['essentiel', 'studio', 'signature'] as const).map((id) => ({ id, label: PLANS[id].label, prix: PLANS[id].prixMois, credits: PLANS[id].creditsMois, accroche: PLANS[id].accroche }))

// ─── La grille « qui a quoi », rendue telle quelle par la landing et /abonnement ─────────
//
// Une cellule = `true` (✅), `false` (—) ou un texte court. Une ligne portant un `flag`
// n'apparaît que si le drapeau est levé : ce qui n'est pas livré n'est pas vendu.

export type CelluleGrille = boolean | string
export type LigneGrille = {
  groupe: 'Plateforme' | 'Site' | 'Devis & factures' | 'Inventaire' | 'Canaux' | 'Inclus'
  label: string
  cellules: Record<PlanPayant, CelluleGrille>
  flag?: Flag
}

const GRILLE_COMPLETE: LigneGrille[] = [
  { groupe: 'Plateforme', label: 'Page de conversation à votre marque', cellules: { essentiel: true, studio: true, signature: true } },
  { groupe: 'Plateforme', label: 'Assistant IA', cellules: {
    essentiel: 'Standard · vous validez chaque réponse',
    studio: 'Standard + Pro · répond seul ou vous validez',
    signature: FLAGS.plateformeRegles ? 'Standard, Pro + Expert · règles d’automatisation' : 'Standard, Pro + Expert',
  } },
  { groupe: 'Plateforme', label: 'Comptes clients (lien magique, historique)', cellules: { essentiel: true, studio: true, signature: true } },
  { groupe: 'Plateforme', label: 'Personnalisation', cellules: { essentiel: 'Thème + couleur', studio: 'Avancée : polices, fond, avatar, amorces', signature: 'Avancée + votre nom de domaine' }, flag: 'plateformePersona' },
  { groupe: 'Site', label: 'Site vitrine', cellules: { essentiel: 'Essentiel', studio: 'Pro · galerie, à-propos', signature: FLAGS.siteSlides3d ? 'Signature · cinématique, slides 3D' : 'Signature · cinématique' } },
  { groupe: 'Site', label: 'Votre nom de domaine', cellules: { essentiel: false, studio: false, signature: true } },
  { groupe: 'Devis & factures', label: 'Devis chiffrés par l’IA, sur vos prix', cellules: { essentiel: true, studio: true, signature: true } },
  { groupe: 'Devis & factures', label: 'Factures + facture électronique', cellules: { essentiel: true, studio: true, signature: true } },
  { groupe: 'Devis & factures', label: 'Relances automatiques', cellules: { essentiel: true, studio: true, signature: true } },
  { groupe: 'Inventaire', label: 'Stock par lieu, scan, seuils', cellules: { essentiel: false, studio: true, signature: true } },
  { groupe: 'Inventaire', label: 'Recherche IA chez vos fournisseurs', cellules: { essentiel: false, studio: 'Standard + Pro', signature: '+ Expert' }, flag: 'inventaireRecherche' },
  { groupe: 'Canaux', label: 'Votre boîte email branchée', cellules: { essentiel: true, studio: true, signature: true } },
  { groupe: 'Canaux', label: 'WhatsApp', cellules: { essentiel: false, studio: true, signature: true }, flag: 'canauxWhatsapp' },
  { groupe: 'Canaux', label: 'Réseaux sociaux', cellules: { essentiel: false, studio: false, signature: true }, flag: 'canauxReseaux' },
  { groupe: 'Inclus', label: 'Crédits chaque mois', cellules: { essentiel: '80', studio: '250', signature: '600' } },
  { groupe: 'Inclus', label: 'Export de vos données', cellules: { essentiel: false, studio: true, signature: true } },
  { groupe: 'Inclus', label: 'Support prioritaire', cellules: { essentiel: false, studio: false, signature: true } },
]

/** La grille telle qu'on a le droit de la montrer aujourd'hui. */
export const GRILLE: LigneGrille[] = GRILLE_COMPLETE.filter((l) => !l.flag || FLAGS[l.flag])

/** Les 4-5 points forts d'une offre, dérivés de la grille (pour les cartes courtes). */
export function pointsForts(id: PlanPayant): string[] {
  const pts: string[] = []
  for (const l of GRILLE) {
    const c = l.cellules[id]
    if (c === false) continue
    pts.push(typeof c === 'string' && !/^\d+$/.test(c) ? `${l.label} — ${c}` : l.label === 'Crédits chaque mois' ? `${c} crédits chaque mois` : l.label)
  }
  return pts
}
