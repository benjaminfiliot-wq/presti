// Le comparatif de la landing (app/ComparatifConcurrents.tsx) — publicité comparative, article L122-1 du Code de la consommation :
// des FAITS vérifiables, DATÉS, aux MÊMES critères pour tous, lus sur les sites officiels des éditeurs, sans jugement de valeur.
//
// Règles de ce fichier (scripts/comparatif-qa.mjs les fait respecter) :
//  • chaque éditeur a une date de lecture et la liste des pages lues (SOURCES) ; chaque cellule porte l'adresse de la page où
//    elle a été lue (`url`) ;
//  • ce que l'éditeur ne dit pas sur ses pages s'écrit « Non indiqué » — jamais « Non » (on n'affirme pas une absence) ;
//  • la colonne Presti est CALCULÉE depuis le code (prix et essais : lib/plans.ts ; offre qui débloque : offreMinimale) ou
//    décrit une fonction qui existe — et dit aussi ce que Presti ne fait pas (facture électronique, impayés) ;
//  • seules des fonctions que Presti a réellement sont comparées (pas de planning, pas de comptabilité, pas de paie).
//
// Pour mettre à jour : relire les pages de SOURCES, changer les cellules ET COMPARATIF_DATE ensemble. Un comparatif plus vieux que
// 6 mois fait échouer scripts/comparatif-qa.mjs : il faut le relire, pas l'oublier.
import { ESSAI_JOURS, OFFRES, offreMinimale, PLANS } from './plans'
import { FLAGS } from './flags'

/** Jour de la lecture des sites des éditeurs (JJ/MM/AAAA). */
export const COMPARATIF_DATE = '15/10/2026'
export const COMPARATIF_DATE_ISO = '2026-10-15'

export type CritereId =
  | 'prix' | 'essai' | 'devis_factures' | 'facture_electronique' | 'ia_reponse' | 'ia_devis' | 'assistant' | 'crm' | 'stock' | 'relances'

export type CelluleConcurrent = {
  /** Le texte affiché. « Non indiqué » quand le site ne dit rien. */
  t: string
  /** La page de l'éditeur où ce fait a été lu. */
  url: string
}

export type Concurrent = {
  id: string
  nom: string
  site: string
  /** Les pages lues (liens affichés dans « Sources du comparatif »). */
  sources: { libelle: string; url: string }[]
  cellules: Record<CritereId, CelluleConcurrent>
}

export const CRITERES: { id: CritereId; libelle: string; flag?: 'assistant' | 'crm' }[] = [
  { id: 'prix', libelle: 'Prix du forfait payant le plus bas, par mois' },
  { id: 'essai', libelle: 'Essai gratuit' },
  { id: 'devis_factures', libelle: 'Devis et factures' },
  { id: 'facture_electronique', libelle: 'Facture électronique (réforme)' },
  { id: 'ia_reponse', libelle: 'IA qui prépare la réponse aux demandes des clients' },
  { id: 'ia_devis', libelle: 'IA qui chiffre le devis' },
  { id: 'assistant', libelle: 'Assistant IA qui agit sur la gestion (devis, factures, stock…)', flag: 'assistant' },
  { id: 'crm', libelle: 'Suivi des chantiers, clients, équipe', flag: 'crm' },
  { id: 'stock', libelle: 'Gestion de stock' },
  { id: 'relances', libelle: 'Relances automatiques' },
]

const NI = 'Non indiqué'

const H = 'https://www.henrri.com/nos-formules/'
const H_FE = 'https://www.henrri.com/mes-questions-dentrepreneurs/facturation-electronique-b2b/'
const H_SUP = 'https://support.henrri.com/hc/fr/articles/360018557417-D%C3%A9couvrez-Henrri-EXPERT-SMART-et-VIP-trois-formules-pour-aller-plus-loin'
const O = 'https://www.obat.fr/tarifs/'
const O_IA = 'https://www.obat.fr/devis-factures/devis-vocal-ia/'
const O_ACC = 'https://www.obat.fr/'
const T = 'https://www.tolteck.com/fr-fr/tarifs/'
const T_FO = 'https://www.tolteck.com/fr-fr/fonctionnalites/'
const T_FE = 'https://www.tolteck.com/fr-fr/facturation-electronique/'
const B = 'https://www.batappli.fr/tarifs'
const B_FO = 'https://www.batappli.fr/fonctionnalites'
const B_IA = 'https://www.batappli.fr/ia-devis-btp'

export const CONCURRENTS: Concurrent[] = [
  {
    id: 'henrri', nom: 'Henrri', site: 'henrri.com',
    sources: [
      { libelle: 'Henrri — nos formules', url: H },
      { libelle: 'Henrri — facturation électronique B2B', url: H_FE },
      { libelle: 'Henrri — aide : formules Expert, Smart et VIP', url: H_SUP },
    ],
    cellules: {
      prix: { t: 'Formule Pro gratuite ; Expert 19 € HT, sans engagement (17 € HT facturé à l’année)', url: H },
      essai: { t: 'Pas d’essai indiqué (formule Pro gratuite)', url: H },
      devis_factures: { t: 'Oui', url: H },
      facture_electronique: { t: 'Oui : « solution compatible », via des plateformes agréées partenaires, incluse', url: H_FE },
      ia_reponse: { t: NI, url: H_SUP },
      ia_devis: { t: 'En partie : assistant de rédaction et composition assistée (Smart, 29 € HT, et VIP)', url: H },
      assistant: { t: NI, url: H },
      crm: { t: 'En partie : suivi commercial des devis, tableaux de bord ; chantiers : non indiqué', url: H },
      stock: { t: NI, url: H },
      relances: { t: 'Impayés : automatiques en VIP (59 € HT), manuelles sinon', url: H },
    },
  },
  {
    id: 'obat', nom: 'Obat', site: 'obat.fr',
    sources: [
      { libelle: 'Obat — tarifs', url: O },
      { libelle: 'Obat — devis vocal par IA', url: O_IA },
      { libelle: 'Obat — accueil (essai gratuit)', url: O_ACC },
    ],
    cellules: {
      prix: { t: '32 € HT (grille micro-entreprise ; 49 € HT en artisan seul), sans engagement', url: O },
      essai: { t: '14 jours, sans carte bancaire', url: O_ACC },
      devis_factures: { t: 'Oui', url: O },
      facture_electronique: { t: 'Oui : via Iopole, plateforme agréée', url: O },
      ia_reponse: { t: NI, url: O },
      ia_devis: { t: 'Oui : dictée, texte, photo ou PDF ; 2 devis inclus, illimité en option', url: O_IA },
      assistant: { t: NI, url: O_IA },
      crm: { t: 'Oui : fiches et planning de chantier, tâches, suivi des temps (selon la formule)', url: O },
      stock: { t: 'Oui, simplifiée', url: O },
      relances: { t: 'Relances de paiement listées ; automatiques ou non : non précisé', url: O },
    },
  },
  {
    id: 'tolteck', nom: 'Tolteck', site: 'tolteck.com',
    sources: [
      { libelle: 'Tolteck — tarifs', url: T },
      { libelle: 'Tolteck — fonctionnalités', url: T_FO },
      { libelle: 'Tolteck — facturation électronique', url: T_FE },
    ],
    cellules: {
      prix: { t: '25 € HT (19 € HT facturé à l’année) ; offre unique', url: T },
      essai: { t: '30 jours, sans engagement ; carte : non indiqué', url: T_FE },
      devis_factures: { t: 'Oui', url: T_FO },
      facture_electronique: { t: 'Oui : plateforme agréée intégrée pour l’émission', url: T_FE },
      ia_reponse: { t: NI, url: T_FO },
      ia_devis: { t: NI, url: T_FO },
      assistant: { t: NI, url: T_FO },
      crm: { t: 'En partie : clients, statuts, tableau de bord ; chantiers : non indiqué', url: T_FO },
      stock: { t: NI, url: T },
      relances: { t: NI, url: T_FO },
    },
  },
  {
    id: 'batappli', nom: 'Batappli', site: 'batappli.fr',
    sources: [
      { libelle: 'Batappli — tarifs', url: B },
      { libelle: 'Batappli — fonctionnalités', url: B_FO },
      { libelle: 'Batappli — devis par IA', url: B_IA },
    ],
    cellules: {
      prix: { t: '39 € HT (Batappli Devis, 1 utilisateur)', url: B },
      essai: { t: '10 jours, sans engagement ; carte : non indiqué', url: B },
      devis_factures: { t: 'Oui', url: B },
      facture_electronique: { t: 'Oui : plateforme agréée eFacture incluse', url: B_FO },
      ia_reponse: { t: NI, url: B_IA },
      ia_devis: { t: 'Oui : Batappli.ia, voix ou texte ; 8 devis IA par mois (Devis)', url: B_IA },
      assistant: { t: NI, url: B_FO },
      crm: { t: 'Oui : suivi de chantier, tâches, planning (offre Artisan)', url: B },
      stock: { t: 'Oui (offre Artisan)', url: B },
      relances: { t: 'Suivi des impayés et relance depuis l’écran ; automatique ou non : non précisé', url: B_FO },
    },
  },
]

// ─── La colonne Presti : calculée ou décrite d'après le code ────────────────────────────────────────────────────────────
const dès = (cap: Parameters<typeof offreMinimale>[0]): string => { const o = offreMinimale(cap); return o ? PLANS[o].label : '' }
const jours = Object.values(ESSAI_JOURS)

export const PRESTI: Record<CritereId, string> = {
  prix: `${Math.min(...OFFRES.map((o) => o.prix))} € par mois (${PLANS.essentiel.label}), TVA non applicable ; ${PLANS.studio.label} ${PLANS.studio.prixMois} €, ${PLANS.signature.label} ${PLANS.signature.prixMois} €`,
  essai: `${Math.min(...jours)} à ${Math.max(...jours)} jours selon l’offre, sans carte`,
  devis_factures: 'Oui',
  // Honnête : un fichier XML Factur-X à télécharger, pas une plateforme agréée (lib/facturx.ts, lib/plans.ts).
  facture_electronique: 'Export XML Factur-X ; pas de plateforme agréée intégrée',
  ia_reponse: `Oui, dès ${dès('plateforme.conversation')} : la réponse est prête dans votre ton, vous l’envoyez (envoi automatique possible dès ${dès('plateforme.ia.auto')})`,
  ia_devis: `Oui, chiffré sur vos propres prix, dès ${dès('devis.ia')}`,
  assistant: `Oui, offre ${dès('assistant')} : devis, factures, stock, tarifs et CRM par la conversation ; vous confirmez ce qui part chez un client`,
  crm: `Oui, offre ${dès('crm')} : pipeline, chantiers, équipe et carte Atelier en temps réel`,
  stock: `Oui, dès ${dès('inventaire.stock')} : stock par lieu, scan, seuils`,
  relances: 'Conversations : J+2, J+5, J+10 ; pas de relance automatique des impayés',
}

/** Les critères montrés aujourd'hui : ceux dont la fonction est livrée (drapeaux de lib/flags.ts). */
export const CRITERES_VISIBLES = CRITERES.filter((c) => !c.flag || FLAGS[c.flag])

/** Les phrases de transparence, uniques : la page et le juge les lisent ici. */
export const COMPARATIF_MENTION = `Comparatif établi le ${COMPARATIF_DATE} d’après les sites des éditeurs.`
export const COMPARATIF_PRECAUTION = 'Offres, prix et fonctions évoluent : vérifiez sur le site de chaque éditeur. « Non indiqué » signifie que l’information n’a pas été trouvée sur les pages lues, pas que la fonction n’existe pas. Prix des concurrents en € hors taxes, tels qu’affichés ; Presti ne facture pas de TVA (art. 293 B du CGI). Les noms cités appartiennent à leurs propriétaires ; Presti n’a aucun lien avec eux.'
export const COMPARATIF_LIMITES = 'Là où les autres sont devant : la facturation électronique par une plateforme agréée intégrée, le planning de chantier (Obat, Batappli) et, chez Henrri, une formule gratuite.'
