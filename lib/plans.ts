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
  | 'devis.ia' | 'devis.prix_artisan' | 'factures' | 'factures.electronique' | 'factures.relances'
  | 'inventaire.stock' | 'inventaire.recherche_ia'
  | 'canaux.email' | 'canaux.whatsapp' | 'canaux.reseaux'
  | 'relances' | 'export' | 'support.prioritaire'
  | 'assistant'
  | 'crm'

type Plan = {
  label: string
  accroche: string
  creditsMois: number
  prixMois: number
  tiers: Tier[]
  /** Niveau de site vitrine des sites HISTORIQUES (origine « abonnement », §2.2 du v15) : 1 Essentiel, 2 Pro, 3 Signature.
   *  Depuis le 2026-09-13 le site n'est plus inclus dans aucune formule — il se commande à part (lib/siteCommande.ts) ;
   *  cette valeur ne sert qu'à continuer de servir les sites qui existaient, tels quels. */
  siteMax: 1 | 2 | 3
  capacites: Capacite[]
}

// Les capacités s'empilent : chaque palier reprend le précédent et ajoute.
const BASE: Capacite[] = [
  'plateforme.conversation', 'plateforme.comptes_clients', 'plateforme.domaine_perso',
  'site.domaine_perso', // décision Benj (04/09) : l'adresse sans « presti » est pour tous. Le site vitrine, lui, est sorti des formules (v15 §2.1)
  'devis.ia', 'devis.prix_artisan', 'factures', 'factures.electronique',
  // 15/10 — relances automatiques des factures impayées (opt-in, J+3/J+10/J+21 par défaut). Un e-mail, aucun crédit d'IA : dans toutes les offres,
  // comme les relances de conversation (`relances`). Pour la réserver à Studio, la déplacer dans STUDIO : la grille suit seule.
  'factures.relances',
  'canaux.email', 'relances',
]
const STUDIO: Capacite[] = [
  ...BASE,
  'plateforme.ia.auto', 'plateforme.personnalisation_avancee',
  'inventaire.stock', 'inventaire.recherche_ia',
  'canaux.whatsapp', 'export',
]
const SIGNATURE: Capacite[] = [
  ...STUDIO,
  'plateforme.ia.expert', 'plateforme.regles',
  'canaux.reseaux', 'support.prioritaire',
  // 016 A1/A2 — l'assistant de gestion de la console (Signature, donc Business). Caché tant que le drapeau `assistant` est baissé.
  'assistant',
  // CRM « atelier vivant » (0141) : Signature (et Business, qui reprend Signature) seulement. Contrôlé côté serveur par
  // lib/crm/serveur.ts ; aucune ligne de la grille ne l'annonce tant que le drapeau `crm` est baissé.
  'crm',
]

export const PLANS: Record<PlanId, Plan> = {
  // L'essai = l'Essentiel avec 3 crédits, pour juger sur ses vraies demandes avant de payer.
  gratuit: { label: 'Essai', accroche: 'Pour juger sur vos vraies demandes, sans carte.', creditsMois: 3, prixMois: 0, tiers: ['standard'], siteMax: 1, capacites: BASE },
  essentiel: { label: 'Essentiel', accroche: 'Pour ne plus louper une demande.', creditsMois: 80, prixMois: 29, tiers: ['standard'], siteMax: 1, capacites: BASE },
  studio: { label: 'Studio', accroche: 'L’assistant qui répond seul, jour et nuit.', creditsMois: 250, prixMois: 59, tiers: ['standard', 'pro'], siteMax: 2, capacites: STUDIO },
  signature: { label: 'Signature', accroche: 'L’atelier à plein régime : modèle Expert et règles d’automatisation.', creditsMois: 600, prixMois: 99, tiers: ['standard', 'pro', 'expert'], siteMax: 3, capacites: SIGNATURE },
  // Fondateurs : plan interne, illimité (jamais décompté).
  business: { label: 'Business', accroche: '', creditsMois: 100000, prixMois: 0, tiers: ['standard', 'pro', 'expert'], siteMax: 3, capacites: SIGNATURE },
}

// ─── L'essai gratuit SANS CARTE des abonnements payants (décision de Benj, 13/10/2026) ──────────────
// Une semaine d'Essentiel, deux de Studio, trois de Signature, sans saisir de carte. UNE SEULE constante pour les
// durées : le Checkout (app/api/subscribe), le webhook, les textes et le juge (scripts/essais-gratuits-qa.mjs) la lisent.
// Règles : lib/essaiGratuit.ts (pures) et lib/essaiGratuitServeur.ts (base + Stripe).
export const ESSAI_JOURS: Record<PlanPayant, number> = { essentiel: 7, studio: 14, signature: 21 }

/** Plafond de crédits d'un essai, tous plans confondus. Sans carte, rien n'engage l'artisan : le coût IA d'un essai doit rester
 *  borné. La règle (lib/essaiGratuit.ts creditsEssai) : crédits du mois au prorata des jours d'essai sur 30, arrondis à
 *  l'entier inférieur, puis plafonnés ici. → Essentiel 18 · Studio 116 · Signature 150 (au lieu de 420 au prorata pur). */
export const ESSAI_CREDITS_PLAFOND = 150

// Coût en crédits par niveau de modèle.
export const CREDIT_COST: Record<Tier, number> = { standard: 1, pro: 1, expert: 3 }

// Coût en crédits d'une recherche chez les fournisseurs, quand elle appelle réellement le service.
// Elle est facturée à part parce qu'elle coûte à peu près dix fois une génération de texte : ouvrir
// des pages de sites marchands se paie en dizaines de milliers de mots lus. Servie par le cache
// mutualisé, elle ne coûte rien à personne et ne se facture donc pas — c'est ce qui rend la
// fonction à la fois rentable pour nous et généreuse pour l'artisan : plus il cherche, plus le
// cache se remplit, moins chaque recherche coûte.
export const COUT_RECHERCHE: Record<Tier, number> = { standard: 2, pro: 2, expert: 3 }

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

// ─── Plafonds qui dépendent de l'offre (une seule écriture : la grille ci-dessous, lib/quotaMedia.ts et lib/assistant/cadrage.ts les lisent ici) ───
const MO = 1024 * 1024
/** Espace d'images de l'artisan (logo, réalisations, avatars, photos d'inventaire), en Mo. Appliqué par lib/quotaMedia.ts. */
export const PLAFOND_IMAGES_MO: Record<PlanId, number> = { gratuit: 25, essentiel: 100, studio: 400, signature: 1024, business: 5120 }
/** Espace des photos de chantier envoyées par les clients, en Mo. Appliqué par lib/quotaMedia.ts. */
export const PLAFOND_PHOTOS_CLIENTS_MO: Record<PlanId, number> = { gratuit: 25, essentiel: 100, studio: 250, signature: 500, business: 2048 }
export const enOctets = (mo: Record<PlanId, number>): Record<PlanId, number> =>
  Object.fromEntries(Object.entries(mo).map(([k, v]) => [k, v * MO])) as Record<PlanId, number>
/** Messages au plus par conversation avec l'assistant de gestion (décision de Benj du 12/10, plan 016 §9.2). Appliqué par lib/assistant/cadrage.ts. */
export const ASSISTANT_TOURS_MAX = 20
const tailleMo = (mo: number): string => (mo >= 1024 ? `${String(mo / 1024).replace('.', ',')} Go` : `${mo} Mo`)

// ─── La grille « qui a quoi », rendue telle quelle par la landing, /abonnement et les paramètres ─────────
//
// Une cellule = `true` (✅), `false` (—) ou un texte court. Une ligne portant un `flag`
// n'apparaît que si le drapeau est levé : ce qui n'est pas livré n'est pas vendu.
//
// UN SEUL CALCUL : chaque ligne déclare les capacités qu'elle annonce (`capacites`), et ses cellules « oui / non » sont
// CALCULÉES depuis PLANS[...].capacites (`dePlan`) — jamais retapées. scripts/offres-affichage-qa.mjs échoue si une
// capacité d'une offre n'est annoncée par aucune ligne, ou si une cellule contredit la capacité.

export type CelluleGrille = boolean | string
export type LigneGrille = {
  groupe: 'Automatisation' | 'Plateforme' | 'Site' | 'Devis & factures' | 'CRM' | 'Assistant de gestion' | 'Inventaire' | 'Canaux' | 'Inclus'
  label: string
  cellules: Record<PlanPayant, CelluleGrille>
  /** Les capacités (lib/plans.ts) que cette ligne annonce. Vide : ligne de chiffres (crédits, plafonds). */
  capacites: Capacite[]
  flag?: Flag
}

/** « oui / non » d'une capacité pour chaque offre payante, lu dans PLANS. */
const dePlan = (cap: Capacite): Record<PlanPayant, boolean> =>
  ({ essentiel: PLANS.essentiel.capacites.includes(cap), studio: PLANS.studio.capacites.includes(cap), signature: PLANS.signature.capacites.includes(cap) })
/** Un texte par offre quand la capacité est présente, « — » (false) sinon : le « non » vient de PLANS, le texte de la ligne. */
const texteSi = (cap: Capacite, t: Record<PlanPayant, string>): Record<PlanPayant, CelluleGrille> => {
  const o = dePlan(cap)
  return { essentiel: o.essentiel ? t.essentiel : false, studio: o.studio ? t.studio : false, signature: o.signature ? t.signature : false }
}

/** Capacités qu'aucune offre n'a (le site vitrine est sorti des formules, 13/09 : il se commande à part). Déclarées ici pour que la
 *  vérification ne les confonde pas avec un oubli. */
export const CAPACITES_HORS_FORMULES: Capacite[] = ['site.essentiel', 'site.pro', 'site.signature', 'site.slides3d']

/** 15/10 (Benj) : le niveau d'automatisation de chaque offre, une seule écriture (grille des offres ET comparatif de l'accueil).
 *  L'automatisation commence avec Studio (l'IA répond seule) et devient complète avec Signature (règles + assistant de gestion). */
export const AUTOMATISATION: Record<PlanPayant, string> = {
  essentiel: 'l’IA prépare vos réponses et vos devis, vous validez et envoyez ; seules les relances partent seules',
  studio: 'l’automatisation commence : l’IA répond seule à vos clients, jour et nuit',
  signature: 'automatisation complète : réponses selon vos règles, et l’assistant gère devis, factures, stock, tarifs et CRM (vous confirmez ce qui part chez un client)',
}

export const GRILLE_COMPLETE: LigneGrille[] = [
  { groupe: 'Automatisation', label: 'Niveau d’automatisation', capacites: [], cellules: AUTOMATISATION },
  { groupe: 'Plateforme', label: 'Page de conversation à votre marque', capacites: ['plateforme.conversation'], cellules: dePlan('plateforme.conversation') },
  // 15/10 (Benj) : dire pour chaque offre ce qui est AUTOMATIQUE et ce que l'artisan valide lui-même.
  { groupe: 'Plateforme', label: 'Réponse aux demandes de vos clients', capacites: ['plateforme.ia.auto', 'plateforme.ia.expert', 'plateforme.regles'], cellules: {
    essentiel: 'préparée par l’IA (modèle Standard) : vous la validez et l’envoyez',
    studio: 'automatique : l’IA répond seule, jour et nuit, ou vous validez (modèles Standard + Pro)',
    signature: FLAGS.plateformeRegles ? 'automatique, avec vos règles d’automatisation (modèles Standard, Pro + Expert)' : 'automatique (modèles Standard, Pro + Expert)',
  } },
  { groupe: 'Plateforme', label: 'Comptes clients (lien magique, historique)', capacites: ['plateforme.comptes_clients'], cellules: dePlan('plateforme.comptes_clients') },
  { groupe: 'Plateforme', label: 'Personnalisation', capacites: ['plateforme.personnalisation_avancee'], cellules: { essentiel: 'Thème + couleur', studio: 'Avancée : polices, fond, avatar, amorces', signature: 'Avancée : polices, fond, avatar, amorces' }, flag: 'plateformePersona' },
  // Les relances sont celles d'une CONVERSATION (J+2, J+5, J+10, lib/relances.ts) — après une réponse, ou un devis envoyé
  // depuis la conversation (audit des promesses du 12/10).
  { groupe: 'Plateforme', label: 'Relances des conversations, automatiques (J+2, J+5, J+10)', capacites: ['relances'], cellules: dePlan('relances') },
  { groupe: 'Site', label: 'Votre nom de domaine sur la page de conversation', capacites: ['site.domaine_perso', 'plateforme.domaine_perso'], cellules: dePlan('site.domaine_perso') },
  { groupe: 'Devis & factures', label: 'Devis chiffrés par l’IA sur vos prix : vous relisez et envoyez', capacites: ['devis.ia', 'devis.prix_artisan'], cellules: dePlan('devis.ia') },
  // « facture électronique » laissait croire à une facture conforme à la réforme et transmise par une plateforme agréée : c'est
  // un fichier XML Factur-X (CII) à télécharger, non validé au Schematron officiel ni embarqué dans un PDF/A-3 (lib/facturx.ts).
  { groupe: 'Devis & factures', label: 'Factures + export XML Factur-X', capacites: ['factures', 'factures.electronique'], cellules: dePlan('factures') },
  // Relances d'impayés (lib/relancesImpayes.ts, migration 0159) : la ligne n'apparaît que drapeau levé.
  { groupe: 'Devis & factures', label: 'Relances des factures impayées, automatiques une fois activées (J+3, J+10, J+21 réglables), arrêtées dès le paiement ou la réponse du client', capacites: ['factures.relances'], cellules: dePlan('factures.relances'), flag: 'relancesImpayes' },
  // CRM « atelier vivant » (0141/0158, lib/crm/) : Signature seulement (capacité `crm`, vérifiée côté serveur par lib/crm/acces.ts) ;
  // les lignes n'apparaissent que drapeau levé. Chaque ligne décrit ce que le code fait, pas plus.
  { groupe: 'CRM', label: 'Pipeline des demandes et fiches clients', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  { groupe: 'CRM', label: 'Chantiers : statuts, tâches, matériaux réservés', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  { groupe: 'CRM', label: 'Équipe et véhicules affectés aux chantiers', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  { groupe: 'CRM', label: 'Carte Atelier : chantiers, équipe et alertes (retards, livraisons, stock bas), en temps réel', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  // L'assistant de gestion (016) : Signature seulement (capacité `assistant`, vérifiée côté serveur par lib/assistant/acces.ts).
  { groupe: 'Assistant de gestion', label: 'Devis, factures et relances menés par la conversation', capacites: ['assistant'], cellules: dePlan('assistant'), flag: 'assistant' },
  { groupe: 'Assistant de gestion', label: 'Stock, tarifs et CRM pilotés par la conversation', capacites: ['assistant'], cellules: dePlan('assistant'), flag: 'assistant' },
  { groupe: 'Assistant de gestion', label: 'Briefing du matin : urgences, retards, ce qui vous attend', capacites: ['assistant'], cellules: dePlan('assistant'), flag: 'assistant' },
  { groupe: 'Assistant de gestion', label: 'Vous confirmez ce qui part chez un client ; journal des actions, annulables', capacites: ['assistant'], cellules: dePlan('assistant'), flag: 'assistant' },
  { groupe: 'Assistant de gestion', label: 'Limites', capacites: ['assistant'], cellules: texteSi('assistant', {
    essentiel: '', studio: '',
    signature: `${ASSISTANT_TOURS_MAX} messages par conversation · ${CREDIT_COST.standard} crédit par message (${CREDIT_COST.expert} avec le modèle Expert)`,
  }), flag: 'assistant' },
  { groupe: 'Inventaire', label: 'Stock par lieu, scan, seuils', capacites: ['inventaire.stock'], cellules: dePlan('inventaire.stock') },
  { groupe: 'Inventaire', label: 'Recherche IA chez vos fournisseurs', capacites: ['inventaire.recherche_ia'], cellules: texteSi('inventaire.recherche_ia', { essentiel: '', studio: 'Standard + Pro', signature: 'Standard, Pro + Expert' }), flag: 'inventaireRecherche' },
  { groupe: 'Canaux', label: 'Votre boîte email branchée', capacites: ['canaux.email'], cellules: dePlan('canaux.email') },
  { groupe: 'Canaux', label: 'WhatsApp', capacites: ['canaux.whatsapp'], cellules: dePlan('canaux.whatsapp'), flag: 'canauxWhatsapp' },
  { groupe: 'Canaux', label: 'Réseaux sociaux', capacites: ['canaux.reseaux'], cellules: dePlan('canaux.reseaux'), flag: 'canauxReseaux' },
  { groupe: 'Inclus', label: 'Crédits chaque mois', capacites: [], cellules: { essentiel: String(PLANS.essentiel.creditsMois), studio: String(PLANS.studio.creditsMois), signature: String(PLANS.signature.creditsMois) } },
  { groupe: 'Inclus', label: 'Espace pour vos images (logo, réalisations)', capacites: [], cellules: { essentiel: tailleMo(PLAFOND_IMAGES_MO.essentiel), studio: tailleMo(PLAFOND_IMAGES_MO.studio), signature: tailleMo(PLAFOND_IMAGES_MO.signature) } },
  { groupe: 'Inclus', label: 'Espace pour les photos de chantier envoyées par vos clients', capacites: [], cellules: { essentiel: tailleMo(PLAFOND_PHOTOS_CLIENTS_MO.essentiel), studio: tailleMo(PLAFOND_PHOTOS_CLIENTS_MO.studio), signature: tailleMo(PLAFOND_PHOTOS_CLIENTS_MO.signature) } },
  // L'export est ouvert à TOUS (app/api/donnees/export, portabilité RGPD).
  { groupe: 'Inclus', label: 'Export de vos données', capacites: ['export'], cellules: dePlan('export') },
  // Délais de première réponse des CGU (§4) ; la demande d'un Signature arrive marquée « prioritaire » (app/api/support/demande).
  { groupe: 'Inclus', label: 'Support par écrit', capacites: ['support.prioritaire'], cellules: { essentiel: '3 jours ouvrés', studio: '2 jours ouvrés', signature: 'Prioritaire · 1 jour ouvré' } },
]

/** La grille telle qu'on a le droit de la montrer aujourd'hui. */
export const GRILLE: LigneGrille[] = GRILLE_COMPLETE.filter((l) => !l.flag || FLAGS[l.flag])

/** Ce que dit une cellule, en une ligne de liste (ou null si l'offre n'a pas cette ligne). */
export function texteCellule(l: LigneGrille, c: CelluleGrille): string | null {
  if (c === false || c === '') return null
  if (c === true) return l.label
  if (l.label === 'Crédits chaque mois') return `${c} crédits chaque mois`
  if (l.label === 'Limites') return `Assistant de gestion : ${c}`
  if (l.groupe === 'Inclus' && /^\d+([,.]\d+)? (Mo|Go)$/.test(c)) return `${l.label} : ${c}`
  return `${l.label} — ${c}`
}

/** Les points forts d'une offre, dérivés de la grille (TOUTE la grille de l'offre : rien n'est coupé). */
export function pointsForts(id: PlanPayant): string[] {
  const pts: string[] = []
  for (const l of GRILLE) { const t = texteCellule(l, l.cellules[id]); if (t) pts.push(t) }
  return pts
}

export type LigneOffre = { groupe: LigneGrille['groupe']; texte: string; nouveau: boolean }
const PRECEDENTE: Record<PlanPayant, PlanPayant | null> = { essentiel: null, studio: 'essentiel', signature: 'studio' }

/** Le détail d'une offre pour les cartes : toutes ses lignes, avec `nouveau` quand la ligne n'existe pas dans l'offre d'en dessous. */
export function detailOffre(id: PlanPayant): { precedente: PlanPayant | null; lignes: LigneOffre[] } {
  const prec = PRECEDENTE[id]
  const lignes: LigneOffre[] = []
  for (const l of GRILLE) {
    const t = texteCellule(l, l.cellules[id])
    if (!t) continue
    const avant = prec ? texteCellule(l, l.cellules[prec]) : null
    // 15/10 : une ligne dont le texte change d'une offre à l'autre (ex. la réponse qui devient AUTOMATIQUE en Studio) est aussi
    // « en plus » : sans cela, l'offre du dessus ne montrait pas ce qui s'automatise.
    lignes.push({ groupe: l.groupe, texte: t, nouveau: !!prec && avant !== t })
  }
  return { precedente: prec, lignes }
}
