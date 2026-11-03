// Source de vérité des offres Presti — UNE matrice dont TOUT découle (v5 §3) :
// pages d'abonnement et de la landing, badges 🔒 dans la console, verrous serveur,
// textes d'aide. Avant, quatre endroits racontaient quatre histoires différentes.
//
// Règle du sprint : une ligne de la grille n'apparaît au public que si la fonctionnalité
// existe vraiment (drapeau `lib/flags.ts`). L'audit v4 a relevé des « promesses de vente
// non tenues » — la matrice est le seul endroit où on s'en protège structurellement.
import type { Tier } from './models'
import { FLAGS, type Flag } from './flags'

// 25/10 (Benj) : DEUX offres seulement. « Studio : tout est automatisé, mais il faut valider, sinon ça ne s'envoie pas. Signature :
// tout part automatiquement. » L'Essentiel n'est plus vendu ; son identifiant reste reconnu (comptes hérités, aucun abonné payant
// au 25/10), hors du tunnel, de la grille et des essais.
// 01/11 (Benj, bloc des offres corrigé : plans/011-cadrage-01-11/prompts-benj/p3-assistant-bloc-offres-corrige-0111.md) : une troisième
// offre, « Presti pour l'entreprise », sur mesure, sur démonstration et sur devis, SANS prix public. C'est la même autonomie que
// Signature (« pas un niveau d'autonomie différent »), avec un CRM et des automatisations adaptés à l'entreprise, et ses membres.
// Elle reste hors du tunnel en libre-service (PlanPayant ne bouge pas : ni Checkout, ni essai, ni colonne de la grille) :
// l'abonnement se crée à la main chez Stripe, avec metadata.plan = 'entreprise' (lib/abonnementSync.ts).
export type PlanId = 'gratuit' | 'essentiel' | 'studio' | 'signature' | 'entreprise' | 'business'
export type PlanPayant = 'studio' | 'signature'

/** Ce qu'une offre débloque. Le nom dit le domaine, puis la capacité. */
export type Capacite =
  | 'plateforme.conversation' | 'plateforme.ia.auto' | 'plateforme.ia.expert' | 'plateforme.comptes_clients'
  | 'plateforme.domaine_perso' | 'plateforme.personnalisation_avancee' | 'plateforme.regles'
  // 15/10 (Benj) : « La plateforme n'est disponible qu'à partir de Studio. Dans Essentiel il n'y a PAS de plateforme. » Tout ce qui la
  // compose commence avec Studio, pour TOUS les comptes (Essentiel existants compris) : la page de conversation publique, la réponse
  // préparée par l'IA, les comptes clients, les relances de conversation (J+2/J+5/J+10), le nom de domaine sur la page, la boîte e-mail
  // branchée, l'écran « Ma plateforme », « Messages » et « Réponses instantanées ». L'écran « Mes chiffres » (la comptabilité) aussi.
  // `chiffres.auto` : les automatisations de « Mes chiffres », et `plateforme.regles` : les règles, Signature seulement.
  // Essentiel garde ce qui n'est pas la plateforme : clients, devis chiffrés par l'IA sur ses prix, factures + Factur-X, tarifs, crédits.
  | 'plateforme.gestion' | 'chiffres' | 'chiffres.auto'
  | 'site.essentiel' | 'site.pro' | 'site.signature' | 'site.slides3d' | 'site.domaine_perso'
  | 'devis.ia' | 'devis.prix_artisan' | 'factures' | 'factures.electronique' | 'factures.relances'
  | 'inventaire.stock' | 'inventaire.recherche_ia'
  | 'canaux.email' | 'canaux.whatsapp' | 'canaux.reseaux'
  | 'relances' | 'export' | 'support.prioritaire'
  // 25/10 : `relances` et `factures.relances` = les relances sont PRÉPARÉES (Studio : l'artisan les valide) ; les variantes `.auto`
  // = elles partent seules (Signature).
  | 'relances.auto' | 'factures.relances.auto'
  | 'assistant' | 'assistant.pilote'
  | 'crm'
  // 02/11 (chantier 4) : inviter des membres dans son organisation, avec des rôles (titulaire, associé, administratif, compagnon,
  // invité). Offre Entreprise seulement ; rien ne l'annonce tant que le drapeau `organisations` est baissé.
  | 'organisation.membres'

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
  /** Prix sur devis (offre Entreprise) : `prixMois` vaut 0 sans que l'offre soit gratuite ni un essai. */
  surDevis?: boolean
  /** Montants mensuels d'avant un changement de prix, encore facturés aux abonnements ouverts à cet ancien prix : Stripe ne change
   *  pas seul le prix d'un abonnement en cours. `planDepuisMontant` (lib/abonnementSync.ts) les reconnaît, sinon un abonné à l'ancien
   *  prix ne serait plus rattaché à aucune offre. Jamais affichés ni vendus. */
  anciensPrixMois?: number[]
}

// Les capacités s'empilent : chaque palier reprend le précédent et ajoute.
const BASE: Capacite[] = [
  'devis.ia', 'devis.prix_artisan', 'factures', 'factures.electronique',
]
const STUDIO: Capacite[] = [
  ...BASE,
  // 15/10 (Benj) : LA PLATEFORME commence avec Studio (« Dans Essentiel il n'y a PAS de plateforme »). Ce bloc est le seul endroit qui la définit.
  'plateforme.conversation', 'plateforme.comptes_clients', 'plateforme.gestion',
  'plateforme.domaine_perso',
  'site.domaine_perso', // le nom de domaine sur la page de conversation (la décision du 04/09 « pour tous » est remplacée : Studio)
  'canaux.email', 'relances', // la boîte e-mail branchée, et les relances de CONVERSATION (J+2/J+5/J+10, lib/relances.ts), préparées
  // 25/10 (Benj) : en Studio rien ne part sans validation — `plateforme.ia.auto` (la réponse qui part seule) passe en Signature.
  'plateforme.personnalisation_avancee',
  // 15/10 (Benj) : sinon « il n'y a pas d'intérêt à prendre la 2e ou la 3e offre, à part pour le CRM et l'assistant ».
  'chiffres',
  // 15/10 (Benj, « En Studio ») — relances automatiques des factures impayées (opt-in, J+3/J+10/J+21 par défaut) : Studio et au-dessus.
  // Les comptes Essentiel qui avaient coché la case ne sont plus servis (route et passage quotidien refusent sur cette capacité) ;
  // leurs réglages restent, rien n'est effacé.
  'factures.relances',
  'inventaire.stock', 'inventaire.recherche_ia',
  'canaux.whatsapp', 'export',
  // 25/10 (Benj) : l'assistant de gestion passe en Studio, « sinon le système ne fonctionnera pas ». En Studio il prépare et l'artisan
  // confirme (cartes assistant_actions) ; sans CRM, ses outils CRM sont refusés (lib/assistant/garde.ts).
  'assistant',
]
const SIGNATURE: Capacite[] = [
  ...STUDIO,
  // 25/10 (Benj) : en Signature tout part automatiquement — la réponse aux demandes, les relances de conversation et d'impayés.
  'plateforme.ia.auto', 'relances.auto', 'factures.relances.auto',
  'plateforme.ia.expert', 'plateforme.regles',
  'chiffres.auto', // les automatisations de « Mes chiffres » (alerte impayés, export mensuel au comptable) : Signature
  'canaux.reseaux', 'support.prioritaire',
  // CRM « atelier vivant » (0141) : Signature (et Business, qui reprend Signature) seulement. Contrôlé côté serveur par
  // lib/crm/serveur.ts ; aucune ligne de la grille ne l'annonce tant que le drapeau `crm` est baissé.
  'crm',
  // 21/10 (décision du fondateur) — le PILOTE AUTOMATIQUE : une action préparée part seule après 10 minutes d'annulation possible,
  // type par type (lib/pilote/regles.ts). Signature (et Business) seulement ; caché tant que le drapeau `piloteAutomatique` est baissé.
  'assistant.pilote',
]
// 01/11 (Benj) : l'Entreprise reprend Signature à l'identique (même autonomie, même moteur n8n + Hermes + Orca) et ajoute les membres.
// Le CRM et les automatisations sur mesure se règlent par contrat, pas par une capacité de plus.
const ENTREPRISE: Capacite[] = [...SIGNATURE, 'organisation.membres']

export const PLANS: Record<PlanId, Plan> = {
  // Le compte sans abonnement (3 crédits, BASE, sans plateforme) : de quoi juger les devis chiffrés par l'IA. L'essai SANS CARTE
  // des offres payantes, lui, est un abonnement Stripe en période d'essai (ESSAI_JOURS ci-dessous).
  gratuit: { label: 'Essai', accroche: 'Pour juger les devis chiffrés par l’IA, sans carte.', creditsMois: 3, prixMois: 0, tiers: ['standard'], siteMax: 1, capacites: BASE },
  // Hérité, plus vendu depuis le 25/10 (voir PlanId). Gardé pour qu'un compte resté sur cet identifiant ne tombe pas à 3 crédits.
  essentiel: { label: 'Essentiel', accroche: 'Ancienne offre, plus proposée.', creditsMois: 80, prixMois: 29, tiers: ['standard'], siteMax: 1, capacites: BASE },
  // 03/11/2026, décision de Benj : Studio passe de 59 à 30 €, Signature de 99 à 60 € par mois. Le paiement prend ce prix
  // (app/api/subscribe/route.ts, price_data) ; les abonnements ouverts avant restent reconnus par anciensPrixMois.
  studio: { label: 'Studio', accroche: 'Tout est automatisé et préparé pour vous : vous validez d’un clic, rien ne part sans vous.', creditsMois: 250, prixMois: 30, anciensPrixMois: [59], tiers: ['standard', 'pro'], siteMax: 2, capacites: STUDIO },
  signature: { label: 'Signature', accroche: 'Tout part automatiquement : réponses, relances, Pilote et règles, plus le CRM.', creditsMois: 600, prixMois: 60, anciensPrixMois: [99], tiers: ['standard', 'pro', 'expert'], siteMax: 3, capacites: SIGNATURE },
  // Sur devis : prixMois 0 ne veut pas dire gratuit (surDevis) ; les crédits sont ceux de Signature tant que le contrat n'en fixe pas d'autres.
  entreprise: { label: 'Presti pour l’entreprise', accroche: 'Sur mesure : votre équipe, vos outils, vos automatisations. Sur démonstration et sur devis.', creditsMois: 600, prixMois: 0, surDevis: true, tiers: ['standard', 'pro', 'expert'], siteMax: 3, capacites: ENTREPRISE },
  // Fondateurs : plan interne, illimité (jamais décompté). Il reprend l'Entreprise, pour essayer l'écran d'équipe.
  business: { label: 'Business', accroche: '', creditsMois: 100000, prixMois: 0, tiers: ['standard', 'pro', 'expert'], siteMax: 3, capacites: ENTREPRISE },
}

// ─── L'essai gratuit SANS CARTE des abonnements payants (décision de Benj, 13/10/2026) ──────────────
// Une semaine de Studio (décision de Benj, 26/10/2026 ; deux semaines avant), trois de Signature, sans saisir de carte (l'Essentiel n'est plus vendu depuis le 25/10). UNE SEULE
// constante pour les durées : le Checkout (app/api/subscribe), le webhook, les textes et le juge (scripts/essais-gratuits-qa.mjs) la lisent.
// Règles : lib/essaiGratuit.ts (pures) et lib/essaiGratuitServeur.ts (base + Stripe).
export const ESSAI_JOURS: Record<PlanPayant, number> = { studio: 7, signature: 21 }

/** Plafond de crédits d'un essai, tous plans confondus. Sans carte, rien n'engage l'artisan : le coût IA d'un essai doit rester
 *  borné. La règle (lib/essaiGratuit.ts creditsEssai) : crédits du mois au prorata des jours d'essai sur 30, arrondis à
 *  l'entier inférieur, puis plafonnés ici. → Studio 58 · Signature 150 (au lieu de 420 au prorata pur). */
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
  for (const id of ['studio', 'signature'] as const) if (PLANS[id].capacites.includes(capacite)) return id
  return null
}

/** Message uniforme pour un 🔒 dans la console ou un 403 côté serveur. */
export function messageVerrou(capacite: Capacite): string {
  const o = offreMinimale(capacite)
  if (o) return `Disponible avec l’offre ${PLANS[o].label}.`
  return PLANS.entreprise.capacites.includes(capacite) ? `Disponible avec ${PLANS.entreprise.label}, sur démonstration.` : 'Non disponible.'
}

/** L'offre payante de référence d'un compte, pour comparer et pour proposer « l'offre au-dessus » : Signature pour Signature, Business
 *  (fondateurs) et Entreprise (même autonomie) ; Studio pour Studio ; aucune pour l'essai et l'Essentiel hérité. */
export function offreDeReference(plan: string | null | undefined): PlanPayant | null {
  if (plan === 'studio') return 'studio'
  if (plan === 'signature' || plan === 'business' || plan === 'entreprise') return 'signature'
  return null
}

// Offres payantes proposées dans le tunnel d'abonnement (l'ordre est celui de l'affichage).
export const OFFRES: { id: PlanPayant; label: string; prix: number; credits: number; accroche: string }[] =
  (['studio', 'signature'] as const).map((id) => ({ id, label: PLANS[id].label, prix: PLANS[id].prixMois, credits: PLANS[id].creditsMois, accroche: PLANS[id].accroche }))

// ─── Plafonds qui dépendent de l'offre (une seule écriture : la grille ci-dessous, lib/quotaMedia.ts et lib/assistant/cadrage.ts les lisent ici) ───
const MO = 1024 * 1024
/** Espace d'images de l'artisan (logo, réalisations, avatars, photos d'inventaire), en Mo. Appliqué par lib/quotaMedia.ts. */
export const PLAFOND_IMAGES_MO: Record<PlanId, number> = { gratuit: 25, essentiel: 100, studio: 400, signature: 1024, entreprise: 1024, business: 5120 }
/** Espace des photos de chantier envoyées par les clients, en Mo. Appliqué par lib/quotaMedia.ts. */
export const PLAFOND_PHOTOS_CLIENTS_MO: Record<PlanId, number> = { gratuit: 25, essentiel: 100, studio: 250, signature: 500, entreprise: 500, business: 2048 }
/**
 * 18/10 — Photos et pièces des chantiers du CRM (bucket privé chantier-pieces, migration 0163) : le CRM n'existe qu'en Signature et
 * Business (capacité `crm`), les autres offres n'ont donc rien. Pas de ligne dans la grille publique tant que le chantier n'est pas livré.
 */
export const PLAFOND_PIECES_CHANTIER_MO: Record<PlanId, number> = { gratuit: 0, essentiel: 0, studio: 0, signature: 2048, entreprise: 2048, business: 5120 }
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
  groupe: 'Automatisation' | 'Plateforme' | 'Site' | 'Devis & factures' | 'Comptabilité' | 'CRM' | 'Assistant de gestion' | 'Inventaire' | 'Canaux' | 'Inclus'
  label: string
  cellules: Record<PlanPayant, CelluleGrille>
  /** Les capacités (lib/plans.ts) que cette ligne annonce. Vide : ligne de chiffres (crédits, plafonds). */
  capacites: Capacite[]
  flag?: Flag
}

/** « oui / non » d'une capacité pour chaque offre payante, lu dans PLANS. */
const dePlan = (cap: Capacite): Record<PlanPayant, boolean> =>
  ({ studio: PLANS.studio.capacites.includes(cap), signature: PLANS.signature.capacites.includes(cap) })
/** Un texte par offre quand la capacité est présente, « — » (false) sinon : le « non » vient de PLANS, le texte de la ligne. */
const texteSi = (cap: Capacite, t: Record<PlanPayant, string>): Record<PlanPayant, CelluleGrille> => {
  const o = dePlan(cap)
  return { studio: o.studio ? t.studio : false, signature: o.signature ? t.signature : false }
}

/** Capacités qu'aucune offre n'a (le site vitrine est sorti des formules, 13/09 : il se commande à part). Déclarées ici pour que la
 *  vérification ne les confonde pas avec un oubli. */
export const CAPACITES_HORS_FORMULES: Capacite[] = ['site.essentiel', 'site.pro', 'site.signature', 'site.slides3d']

/** Le niveau d'automatisation de chaque offre, une seule écriture (grille des offres ET comparatif de l'accueil).
 *  25/10 (Benj) : Studio = tout est automatisé et préparé, rien ne part sans la validation de l'artisan ; Signature = tout part seul. */
export const AUTOMATISATION: Record<PlanPayant, string> = {
  studio: 'tout est automatisé et préparé pour vous : réponses à vos clients, devis, relances et assistant de gestion ; vous validez d’un clic, rien ne part sans vous',
  signature: 'tout part automatiquement : réponses à vos clients jour et nuit, relances des devis et des factures impayées, Pilote automatique et règles, alerte impayés et export à votre comptable, plus le CRM (jamais un prix estimé ni un paiement sans vous)',
}

export const GRILLE_COMPLETE: LigneGrille[] = [
  { groupe: 'Automatisation', label: 'Niveau d’automatisation', capacites: [], cellules: AUTOMATISATION },
  { groupe: 'Plateforme', label: 'La plateforme : page de conversation à votre marque', capacites: ['plateforme.conversation'], cellules: dePlan('plateforme.conversation') },
  // Dire pour chaque offre ce qui est AUTOMATIQUE et ce que l'artisan valide lui-même (25/10 : Studio prépare, Signature envoie seul).
  { groupe: 'Plateforme', label: 'Réponse aux demandes de vos clients', capacites: ['plateforme.ia.auto', 'plateforme.ia.expert', 'plateforme.regles'], cellules: {
    studio: 'préparée automatiquement en moins d’une minute, vous la validez d’un clic (modèles Standard + Pro)',
    signature: FLAGS.plateformeRegles ? 'automatique : elle part seule, jour et nuit, avec vos règles d’automatisation (modèles Standard, Pro + Expert)' : 'automatique : elle part seule, jour et nuit (modèles Standard, Pro + Expert)',
  } },
  { groupe: 'Plateforme', label: 'Comptes clients (lien magique, historique)', capacites: ['plateforme.comptes_clients'], cellules: dePlan('plateforme.comptes_clients') },
  // 15/10 : l'écran « Ma plateforme » (réglages de l'assistant, apparence, règles) fait partie de la plateforme : Studio, comptes Essentiel compris.
  // Thème, couleur et le reste de la personnalisation s'y règlent : ils suivent l'écran.
  { groupe: 'Plateforme', label: 'Écran « Ma plateforme » : réglages de l’assistant et apparence de votre page', capacites: ['plateforme.gestion'], cellules: dePlan('plateforme.gestion') },
  { groupe: 'Plateforme', label: 'Personnalisation', capacites: ['plateforme.personnalisation_avancee'], cellules: texteSi('plateforme.personnalisation_avancee', { studio: 'Thème, couleur, polices, fond, avatar, amorces', signature: 'Thème, couleur, polices, fond, avatar, amorces' }), flag: 'plateformePersona' },
  // Les relances sont celles d'une CONVERSATION (J+2, J+5, J+10, lib/relances.ts) — après une réponse, ou un devis envoyé
  // depuis la conversation (audit des promesses du 12/10). 25/10 : préparées en Studio, envoyées seules en Signature.
  { groupe: 'Plateforme', label: 'Relances des conversations (J+2, J+5, J+10)', capacites: ['relances', 'relances.auto'], cellules: {
    studio: PLANS.studio.capacites.includes('relances.auto') ? 'automatiques' : 'préparées automatiquement, vous les validez',
    signature: PLANS.signature.capacites.includes('relances.auto') ? 'automatiques : elles partent seules' : 'préparées automatiquement, vous les validez',
  } },
  { groupe: 'Site', label: 'Votre nom de domaine sur la page de conversation', capacites: ['site.domaine_perso', 'plateforme.domaine_perso'], cellules: dePlan('site.domaine_perso') },
  { groupe: 'Devis & factures', label: 'Devis chiffrés par l’IA sur vos prix : vous relisez et envoyez', capacites: ['devis.ia', 'devis.prix_artisan'], cellules: dePlan('devis.ia') },
  // « facture électronique » laissait croire à une facture conforme à la réforme et transmise par une plateforme agréée : c'est
  // un fichier XML Factur-X (CII) à télécharger, non validé au Schematron officiel ni embarqué dans un PDF/A-3 (lib/facturx.ts).
  { groupe: 'Devis & factures', label: 'Factures + export XML Factur-X', capacites: ['factures', 'factures.electronique'], cellules: dePlan('factures') },
  // 21/10 (0176) : devis par lots et types de facture — l'éditeur et la facturation de base, donc toutes les offres qui facturent.
  { groupe: 'Devis & factures', label: 'Devis par lots : un sous-total par corps de métier', capacites: ['factures'], cellules: dePlan('factures'), flag: 'devisLots' },
  { groupe: 'Devis & factures', label: 'Factures d’acompte, situations de travaux et facture de solde', capacites: ['factures'], cellules: dePlan('factures'), flag: 'facturesSituation' },
  // Relances d'impayés (lib/relancesImpayes.ts, migration 0159) : la ligne n'apparaît que drapeau levé.
  { groupe: 'Devis & factures', label: 'Relances des factures impayées une fois activées (J+3, J+10, J+21 réglables), arrêtées dès le paiement ou la réponse du client', capacites: ['factures.relances', 'factures.relances.auto'], cellules: {
    studio: PLANS.studio.capacites.includes('factures.relances.auto') ? 'automatiques' : 'préparées automatiquement, vous les validez',
    signature: PLANS.signature.capacites.includes('factures.relances.auto') ? 'automatiques : elles partent seules' : 'préparées automatiquement, vous les validez',
  }, flag: 'relancesImpayes' },
  // « Mes chiffres » (app/chiffres) : Studio et au-dessus. Les automatisations de cet écran (lib/comptaAutomatisations.ts) : Signature
  // (capacité `chiffres.auto`, vérifiée par /api/compta/reglages et le passage quotidien). Drapeaux levés le 15/10 (migration 0140 en base) ;
  // baissés, les lignes disparaîtraient de la grille.
  { groupe: 'Comptabilité', label: 'Écran « Mes chiffres » : chiffre d’affaires, impayés, devis à relancer, vos fichiers rangés par l’assistant', capacites: ['chiffres'], cellules: dePlan('chiffres') },
  { groupe: 'Comptabilité', label: 'Alerte e-mail quand une facture reste impayée, automatique une fois activée', capacites: ['chiffres.auto'], cellules: dePlan('chiffres.auto'), flag: 'comptaAlerteImpayes' },
  { groupe: 'Comptabilité', label: 'Export mensuel du journal des factures à votre comptable, automatique une fois activé', capacites: ['chiffres.auto'], cellules: dePlan('chiffres.auto'), flag: 'comptaExportMensuel' },
  // CRM « atelier vivant » (0141/0158, lib/crm/) : Signature seulement (capacité `crm`, vérifiée côté serveur par lib/crm/acces.ts) ;
  // les lignes n'apparaissent que drapeau levé. Chaque ligne décrit ce que le code fait, pas plus.
  { groupe: 'CRM', label: 'Pipeline des demandes et fiches clients', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  { groupe: 'CRM', label: 'Chantiers : statuts, tâches, matériaux réservés', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  { groupe: 'CRM', label: 'Équipe et véhicules affectés aux chantiers', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  { groupe: 'CRM', label: 'Carte Atelier : chantiers, équipe et alertes (retards, livraisons, stock bas), en temps réel', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  // L'assistant de gestion (016) : Studio et au-dessus depuis le 25/10 (capacité `assistant`, vérifiée côté serveur par
  // lib/assistant/acces.ts). Ses outils CRM restent Signature (capacité `crm`).
  { groupe: 'Assistant de gestion', label: 'Devis, factures et relances menés par la conversation', capacites: ['assistant'], cellules: dePlan('assistant'), flag: 'assistant' },
  { groupe: 'Assistant de gestion', label: 'Stock et tarifs pilotés par la conversation', capacites: ['assistant'], cellules: dePlan('assistant'), flag: 'assistant' },
  { groupe: 'Assistant de gestion', label: 'Le CRM piloté par la conversation', capacites: ['crm'], cellules: dePlan('crm'), flag: 'crm' },
  { groupe: 'Assistant de gestion', label: 'Briefing du matin : urgences, retards, ce qui vous attend', capacites: ['assistant'], cellules: dePlan('assistant'), flag: 'assistant' },
  { groupe: 'Assistant de gestion', label: 'Vous confirmez ce qui part chez un client ; journal des actions, annulables', capacites: ['assistant'], cellules: dePlan('assistant'), flag: 'assistant' },
  { groupe: 'Assistant de gestion', label: 'Limites', capacites: ['assistant'], cellules: texteSi('assistant', {
    studio: `${ASSISTANT_TOURS_MAX} messages par conversation · ${CREDIT_COST.standard} crédit par message`,
    signature: `${ASSISTANT_TOURS_MAX} messages par conversation · ${CREDIT_COST.standard} crédit par message (${CREDIT_COST.expert} avec le modèle Expert)`,
  }), flag: 'assistant' },
  // Pilote automatique (lib/pilote/, migration 0174) : Signature seulement ; la ligne n'apparaît que drapeau levé.
  { groupe: 'Assistant de gestion', label: 'Pilote automatique : ce que vous choisissez part seul après 10 minutes pour annuler (jamais un prix estimé, jamais un paiement)', capacites: ['assistant.pilote'], cellules: dePlan('assistant.pilote'), flag: 'piloteAutomatique' },
  { groupe: 'Inventaire', label: 'Stock par lieu, scan, seuils', capacites: ['inventaire.stock'], cellules: dePlan('inventaire.stock') },
  { groupe: 'Inventaire', label: 'Recherche IA chez vos fournisseurs', capacites: ['inventaire.recherche_ia'], cellules: texteSi('inventaire.recherche_ia', { studio: 'Standard + Pro', signature: 'Standard, Pro + Expert' }), flag: 'inventaireRecherche' },
  { groupe: 'Canaux', label: 'Votre boîte email branchée', capacites: ['canaux.email'], cellules: dePlan('canaux.email') },
  { groupe: 'Canaux', label: 'WhatsApp', capacites: ['canaux.whatsapp'], cellules: dePlan('canaux.whatsapp'), flag: 'canauxWhatsapp' },
  { groupe: 'Canaux', label: 'Réseaux sociaux', capacites: ['canaux.reseaux'], cellules: dePlan('canaux.reseaux'), flag: 'canauxReseaux' },
  // 21/10 (0177) : les canaux sans API d'un réseau tiers — capacités lues par les routes (lib/canaux/*).
  { groupe: 'Canaux', label: 'Telegram : votre bot, messages reçus et envoyés depuis Presti', capacites: ['canaux.whatsapp'], cellules: dePlan('canaux.whatsapp'), flag: 'canauxTelegram' },
  { groupe: 'Canaux', label: 'Vos réseaux regroupés : LinkedIn, Facebook, Instagram, TikTok, plateformes de devis (par leurs e-mails de notification)', capacites: ['canaux.email'], cellules: dePlan('canaux.email'), flag: 'canauxNotifications' },
  { groupe: 'Canaux', label: 'Un lien et un QR code par réseau vers votre page', capacites: ['plateforme.conversation'], cellules: dePlan('plateforme.conversation'), flag: 'canauxLiens' },
  { groupe: 'Canaux', label: 'Import des prospects de vos publicités (fichier CSV)', capacites: ['plateforme.conversation'], cellules: dePlan('plateforme.conversation'), flag: 'importProspects' },
  { groupe: 'Inclus', label: 'Crédits chaque mois', capacites: [], cellules: { studio: String(PLANS.studio.creditsMois), signature: String(PLANS.signature.creditsMois) } },
  { groupe: 'Inclus', label: 'Espace pour vos images (logo, réalisations)', capacites: [], cellules: { studio: tailleMo(PLAFOND_IMAGES_MO.studio), signature: tailleMo(PLAFOND_IMAGES_MO.signature) } },
  { groupe: 'Inclus', label: 'Espace pour les photos de chantier envoyées par vos clients', capacites: [], cellules: { studio: tailleMo(PLAFOND_PHOTOS_CLIENTS_MO.studio), signature: tailleMo(PLAFOND_PHOTOS_CLIENTS_MO.signature) } },
  // L'export est ouvert à TOUS (app/api/donnees/export, portabilité RGPD).
  { groupe: 'Inclus', label: 'Export de vos données', capacites: ['export'], cellules: dePlan('export') },
  // Délais de première réponse des CGU (§4) ; la demande d'un Signature arrive marquée « prioritaire » (app/api/support/demande).
  { groupe: 'Inclus', label: 'Support par écrit', capacites: ['support.prioritaire'], cellules: { studio: '2 jours ouvrés', signature: 'Prioritaire · 1 jour ouvré' } },
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
const PRECEDENTE: Record<PlanPayant, PlanPayant | null> = { studio: null, signature: 'studio' }

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
