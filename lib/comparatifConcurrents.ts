// Le comparatif de la landing (app/ComparatifConcurrents.tsx) — publicité comparative, article L122-1 du Code de la consommation :
// des FAITS vérifiables, DATÉS, aux MÊMES critères pour tous, lus sur les sites officiels des éditeurs, sans jugement de valeur.
//
// Règles de ce fichier (scripts/comparatif-qa.mjs les fait respecter) :
//  • chaque éditeur a une date de lecture et la liste des pages lues (SOURCES) ; chaque cellule porte l'adresse de la page où
//    elle a été lue (`url`) ;
//  • ce que l'éditeur ne dit pas sur ses pages s'écrit « Non indiqué » — jamais « Non » (on n'affirme pas une absence) ;
//  • la colonne Presti est CALCULÉE depuis le code (prix et essais : lib/plans.ts ; offre qui débloque : offreMinimale) ou
//    décrit une fonction qui existe — et dit aussi ce que Presti ne fait pas (facture électronique) ;
//  • « Ce que Presti fait de plus » (AVANTAGES) : chaque avantage cite UN critère du tableau et au moins une PREUVE dans le code
//    (fichier + motif que scripts/comparatif-qa.mjs retrouve). Pas de superlatif invérifiable : « aucun des quatre éditeurs lus
//    ne l'indique » n'est écrit que si les quatre cellules du critère disent « Non indiqué » (le juge le recompte) ;
//  • seules des fonctions que Presti a réellement sont comparées (pas de planning, pas de comptabilité, pas de paie).
//
// Pour mettre à jour : relire les pages de SOURCES, changer les cellules ET COMPARATIF_DATE ensemble. Un comparatif plus vieux que
// 6 mois fait échouer scripts/comparatif-qa.mjs : il faut le relire, pas l'oublier.
import { ESSAI_JOURS, OFFRES, offreMinimale, PLANS } from './plans'
import { FLAGS, type Flag } from './flags'
import { DELAI_TEXTE, PRIX_SITE_TEXTE } from './siteCommande'
import { JOURS_PAR_DEFAUT } from './relancesImpayes'

/** Jour de la lecture des sites des éditeurs (JJ/MM/AAAA). */
export const COMPARATIF_DATE = '15/10/2026'
export const COMPARATIF_DATE_ISO = '2026-10-15'

export type CritereId =
  | 'prix' | 'essai' | 'automatisation' | 'devis_factures' | 'facture_electronique' | 'ia_reponse' | 'ia_devis' | 'assistant' | 'crm' | 'stock' | 'relances' | 'site'

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

export const CRITERES: { id: CritereId; libelle: string; flag?: Flag }[] = [
  { id: 'prix', libelle: 'Prix du forfait payant le plus bas, par mois' },
  { id: 'essai', libelle: 'Essai gratuit' },
  // 15/10 (Benj) : Presti automatise réellement le travail ; le critère le montre, avec les mêmes règles de preuve que les autres.
  { id: 'automatisation', libelle: 'Automatisation : ce que le logiciel fait seul' },
  { id: 'devis_factures', libelle: 'Devis et factures' },
  { id: 'facture_electronique', libelle: 'Facture électronique (réforme)' },
  { id: 'ia_reponse', libelle: 'IA qui prépare la réponse aux demandes des clients' },
  { id: 'ia_devis', libelle: 'IA qui chiffre le devis' },
  { id: 'assistant', libelle: 'Assistant IA qui agit sur la gestion (devis, factures, stock…)', flag: 'assistant' },
  { id: 'crm', libelle: 'Suivi des chantiers, clients, équipe', flag: 'crm' },
  { id: 'stock', libelle: 'Gestion de stock' },
  { id: 'relances', libelle: 'Relances automatiques' },
  { id: 'site', libelle: 'Site vitrine pour l’artisan', flag: 'siteCommandeVente' },
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
      automatisation: { t: 'En partie : relance automatique des impayés en VIP (59 € HT) ; réponse aux clients : non indiqué', url: H },
      devis_factures: { t: 'Oui', url: H },
      facture_electronique: { t: 'Oui : « solution compatible », via des plateformes agréées partenaires, incluse', url: H_FE },
      ia_reponse: { t: NI, url: H_SUP },
      ia_devis: { t: 'En partie : assistant de rédaction et composition assistée (Smart, 29 € HT, et VIP)', url: H },
      assistant: { t: NI, url: H },
      crm: { t: 'En partie : suivi commercial des devis, tableaux de bord ; chantiers : non indiqué', url: H },
      stock: { t: NI, url: H },
      relances: { t: 'Impayés : automatiques en VIP (59 € HT), manuelles sinon', url: H },
      site: { t: NI, url: H },
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
      automatisation: { t: NI, url: O },
      devis_factures: { t: 'Oui', url: O },
      facture_electronique: { t: 'Oui : via Iopole, plateforme agréée', url: O },
      ia_reponse: { t: NI, url: O },
      ia_devis: { t: 'Oui : dictée, texte, photo ou PDF ; 2 devis inclus, illimité en option', url: O_IA },
      assistant: { t: NI, url: O_IA },
      crm: { t: 'Oui : fiches et planning de chantier, tâches, suivi des temps (selon la formule)', url: O },
      stock: { t: 'Oui, simplifiée', url: O },
      relances: { t: 'Relances de paiement listées ; automatiques ou non : non précisé', url: O },
      site: { t: NI, url: O },
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
      automatisation: { t: NI, url: T },
      devis_factures: { t: 'Oui', url: T_FO },
      facture_electronique: { t: 'Oui : plateforme agréée annoncée « directement intégrée » pour l’émission ; réception via Pennylane, incluse', url: T_FE },
      ia_reponse: { t: NI, url: T_FO },
      ia_devis: { t: NI, url: T_FO },
      assistant: { t: NI, url: T_FO },
      crm: { t: 'En partie : clients, statuts, tableau de bord ; chantiers : non indiqué', url: T_FO },
      stock: { t: NI, url: T },
      relances: { t: NI, url: T_FO },
      site: { t: NI, url: T_FO },
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
      automatisation: { t: NI, url: B },
      devis_factures: { t: 'Oui', url: B },
      facture_electronique: { t: 'Oui : plateforme agréée eFacture incluse', url: B_FO },
      ia_reponse: { t: NI, url: B_IA },
      ia_devis: { t: 'Oui : Batappli.ia, voix ou texte ; 8 devis IA par mois (Devis)', url: B_IA },
      assistant: { t: NI, url: B_FO },
      crm: { t: 'Oui : suivi de chantier, tâches, planning (offre Artisan)', url: B },
      stock: { t: 'Oui (offre Artisan)', url: B },
      relances: { t: 'Suivi des impayés et relance depuis l’écran ; automatique ou non : non précisé', url: B_FO },
      site: { t: NI, url: B_FO },
    },
  },
]

// ─── La colonne Presti : calculée ou décrite d'après le code ────────────────────────────────────────────────────────────
const dès = (cap: Parameters<typeof offreMinimale>[0]): string => { const o = offreMinimale(cap); return o ? PLANS[o].label : '' }
const jours = Object.values(ESSAI_JOURS)

export const PRESTI: Record<CritereId, string> = {
  // 25/10 (Benj) : deux offres ; le prix d'appel est le plus bas des offres vendues (OFFRES), lu dans lib/plans.ts.
  prix: `dès ${Math.min(...OFFRES.map((o) => o.prix))} € par mois, TVA non applicable : ${PLANS.studio.label} ${PLANS.studio.prixMois} €, ${PLANS.signature.label} ${PLANS.signature.prixMois} €`,
  essai: `${Math.min(...jours)} à ${Math.max(...jours)} jours selon l’offre, sans carte`,
  // 25/10 (Benj) : Studio = tout est préparé, l'artisan valide ; Signature = tout part seul (plateforme.ia.auto, relances.auto, factures.relances.auto).
  automatisation: `Oui, dans les deux offres : dès ${dès('plateforme.conversation')} tout est automatisé et préparé (réponses à vos clients, devis sur vos prix, relances, assistant de gestion), vous validez d’un clic ; complète en ${dès('plateforme.ia.auto')}, où tout part seul, jour et nuit (réponses, relances des conversations et des impayés, Pilote automatique, vos règles), avec l’alerte e-mail sur les impayés et l’export mensuel de vos factures (${dès('chiffres.auto')})`,
  devis_factures: 'Oui',
  // Honnête : un fichier XML Factur-X à télécharger, pas une plateforme agréée (lib/facturx.ts, lib/plans.ts).
  facture_electronique: 'Export XML Factur-X ; pas de plateforme agréée intégrée',
  // La réponse préparée est celle de la plateforme, dès Studio (prix et offre lus dans lib/plans.ts) ; envoyée seule en Signature (25/10).
  ia_reponse: `Oui, avec la plateforme dès l’offre ${dès('plateforme.conversation')} (${PLANS.studio.prixMois} € par mois) : la réponse est prête dans votre ton, vous la validez d’un clic ; en ${dès('plateforme.ia.auto')}, elle part seule (réglable)`,
  ia_devis: `Oui, chiffré sur vos propres prix, dans les deux offres`,
  assistant: `Oui, dès l’offre ${dès('assistant')} : devis, factures, stock et tarifs par la conversation (le CRM en ${dès('crm')}) ; vous confirmez ce qui part chez un client`,
  crm: `Oui, offre ${dès('crm')} : pipeline, chantiers, équipe et carte Atelier en temps réel`,
  stock: `Oui, dès ${dès('inventaire.stock')} : stock par lieu, scan, seuils`,
  // Impayés : seulement ce qui est livré (drapeau relancesImpayes, migration 0159). Baissé, la ligne redit ce qui manque.
  relances: FLAGS.relancesImpayes
    ? `Impayés : relances automatiques à cocher (${JOURS_PAR_DEFAUT.map((j) => `J+${j}`).join(', ')} réglables), préparées pour vous dès ${dès('factures.relances')}, envoyées seules en ${dès('factures.relances.auto')} ; relance préparée par l’assistant (${dès('assistant')}) ; conversations : J+2, J+5, J+10, envoyées seules en ${dès('relances.auto')}`
    : 'Conversations : J+2, J+5, J+10 ; pas de relance automatique des impayés',
  site: `Oui, à la demande : ${PRIX_SITE_TEXTE} une fois, sans abonnement ; une page par commune servie`,
}

/** Les critères montrés aujourd'hui : ceux dont la fonction est livrée (drapeaux de lib/flags.ts). */
export const CRITERES_VISIBLES = CRITERES.filter((c) => !c.flag || FLAGS[c.flag])

/** Les phrases de transparence, uniques : la page et le juge les lisent ici. */
export const COMPARATIF_MENTION = `Comparatif établi le ${COMPARATIF_DATE} d’après les sites des éditeurs.`
export const COMPARATIF_PRECAUTION = 'Offres, prix et fonctions évoluent : vérifiez sur le site de chaque éditeur. « Non indiqué » signifie que l’information n’a pas été trouvée sur les pages lues, pas que la fonction n’existe pas. Prix des concurrents en € hors taxes, tels qu’affichés ; Presti ne facture pas de TVA (art. 293 B du CGI). Les noms cités appartiennent à leurs propriétaires ; Presti n’a aucun lien avec eux.'
/** Court et neutre, APRÈS les avantages : ce que les autres font et que Presti ne fait pas. */
export const COMPARATIF_LIMITES_TITRE = 'Là où les autres sont devant'
export const COMPARATIF_LIMITES_LIGNES = [
  'La facturation électronique par une plateforme agréée : les quatre éditeurs la proposent ; Presti exporte aujourd’hui un fichier Factur-X, sans plateforme agréée intégrée.',
  'Le planning de chantier : Obat et Batappli.',
  'Une formule gratuite : Henrri.',
] as const
export const COMPARATIF_LIMITES = `${COMPARATIF_LIMITES_TITRE} : ${COMPARATIF_LIMITES_LIGNES.map((l) => l.replace(/\.$/, '')).join(' ; ')}.`

// ─── Ce que Presti fait de plus ─────────────────────────────────────────────────────────────────────────────────────────
// Chaque avantage : un critère du tableau, un texte affirmatif et factuel, et des PREUVES dans le code (fichier + motif, relus par
// scripts/comparatif-qa.mjs). `autres` : 'aucun' n'est accepté que si les quatre cellules du critère sont « Non indiqué » ; sinon une
// phrase factuelle dont chaque mot-clé `motsCellule` figure dans la cellule de l'éditeur nommé ; null : aucune comparaison avancée.
export type Avantage = {
  id: string
  critere: CritereId
  titre: string
  texte: string
  autres: 'aucun' | null | { phrase: string; motsCellule: { editeur: string; mot: string }[] }
  preuves: { fichier: string; motif: string }[]
  flag?: Flag
}

const prix = (id: 'studio' | 'signature') => PLANS[id].prixMois
/** La phrase de comparaison d'un avantage, ou null. 'aucun' : valable seulement si les quatre éditeurs disent « Non indiqué » (le juge le recompte). */
export const phraseAutres = (a: Avantage): string | null =>
  a.autres === null ? null : a.autres === 'aucun' ? 'Aucun des quatre éditeurs lus ne l’indique sur ses pages.' : a.autres.phrase

export const AVANTAGES: Avantage[] = [
  {
    id: 'automatisation', critere: 'automatisation', titre: 'Presti fait le travail à votre place',
    texte: `Ce n’est pas qu’un outil où l’on saisit ses devis : tout est automatisé. Avec ${PLANS.studio.label} (${prix('studio')} €), la réponse à vos clients, le devis sur vos prix, les relances et l’assistant de gestion sont préparés pour vous : vous validez d’un clic. Avec ${PLANS.signature.label} (${prix('signature')} €), tout part seul, jour et nuit : réponses, relances, Pilote automatique et vos règles. Jamais un prix estimé ni un paiement sans vous.`,
    autres: { phrase: 'Parmi les quatre éditeurs lus, seul Henrri indique une automatisation, limitée à la relance des impayés (formule VIP).', motsCellule: [{ editeur: 'henrri', mot: 'relance automatique' }] },
    // 25/10 : routage.ts ne teste plus `plateforme.ia.auto` (il teste `plateforme.conversation`) ; la preuve est la matrice (ce qui part seul est
    // Signature) et le verrou qui rétrograde en « assistée » sans l'offre (modeEffectif).
    preuves: [{ fichier: 'lib/plans.ts', motif: "'plateforme\\.ia\\.auto', 'relances\\.auto', 'factures\\.relances\\.auto'" }, { fichier: 'lib/plateformeConfig.ts', motif: "!peut\\(plan, 'plateforme\\.ia\\.auto'\\)\\) return \\{ mode: 'assistee'" }],
  },
  {
    id: 'reponse', critere: 'ia_reponse', titre: 'Chaque demande a déjà sa réponse',
    texte: `Quand un client vous écrit par votre lien, la réponse est prête en moins d’une minute, dans votre ton, avec les questions qui manquent et sans prix inventé : vous la validez d’un clic, ou elle part seule avec ${dès('plateforme.ia.auto')}. C’est la plateforme, dès l’offre ${dès('plateforme.conversation')} (${prix('studio')} € par mois).`,
    autres: 'aucun',
    preuves: [{ fichier: 'lib/ai.ts', motif: 'generateLeadReply' }, { fichier: 'lib/platStats.ts', motif: 'median < 60' }],
  },
  {
    id: 'assistant', critere: 'assistant', flag: 'assistant', titre: 'Un assistant qui fait le travail de gestion',
    texte: `Une phrase suffit : il prépare le devis ou la facture, relance un impayé, met à jour le stock ou les tarifs (et le CRM en ${dès('crm')}). Tout ce qui part chez un client attend votre confirmation, et chaque action est consignée dans un journal. Dès l’offre ${dès('assistant')}.`,
    autres: 'aucun',
    preuves: [{ fichier: 'lib/assistant/actions-serveur.ts', motif: 'R\\.relancer_facture' }, { fichier: 'lib/assistant/cartes.ts', motif: 'texteRelanceFacture' }, { fichier: 'lib/assistant/acces.ts', motif: "peut\\(p\\.plan, 'assistant'\\)" }],
  },
  {
    id: 'impayes', critere: 'relances', flag: 'relancesImpayes', titre: 'Les impayés se relancent, et s’arrêtent à temps',
    texte: `Une case à cocher : jusqu’à trois relances par e-mail après l’échéance (${JOURS_PAR_DEFAUT.map((j) => `J+${j}`).join(', ')} par défaut), dans un texte que vous avez relu, préparées pour vous avec ${dès('factures.relances')}, envoyées seules avec ${dès('factures.relances.auto')}. Elles s’arrêtent dès que la facture est payée ou annulée, ou que le client répond ; chaque relance est notée sur la facture. Dès l’offre ${dès('factures.relances')} (${prix('studio')} € par mois).`,
    autres: { phrase: 'Chez Henrri, les impayés sont automatiques dans la formule VIP, à 59 € HT par mois.', motsCellule: [{ editeur: 'henrri', mot: 'VIP' }, { editeur: 'henrri', mot: '59' }] },
    preuves: [{ fichier: 'lib/relancesImpayes.ts', motif: 'JOURS_PAR_DEFAUT' }, { fichier: 'lib/relancesImpayesTour.ts', motif: 'reponseClient' }, { fichier: 'app/factures/RelancesAuto.tsx', motif: 'Relancer automatiquement mes factures échues' }],
  },
  {
    id: 'crm', critere: 'crm', flag: 'crm', titre: 'Vos chantiers sur une carte, en temps réel',
    texte: `Les demandes, les chantiers, l’équipe et les véhicules au même endroit, et la carte Atelier qui se met à jour seule : retards, livraisons, stock bas. Dans le même outil que vos devis et vos factures. Offre ${dès('crm')}.`,
    autres: null,
    preuves: [{ fichier: 'app/crm/useTempsReel.ts', motif: 'postgres_changes' }, { fichier: 'lib/crm/tempsReel.ts', motif: 'supabase_realtime' }, { fichier: 'supabase/migrations/0158_crm_commandes_temps_reel.sql', motif: 'supabase_realtime' }],
  },
  {
    id: 'site', critere: 'site', flag: 'siteCommandeVente', titre: 'Un site à votre nom, une page par commune',
    texte: `${PRIX_SITE_TEXTE} une fois, sans abonnement : un site avec une page pour chaque commune que vous servez, avec un formulaire de contact pour que la demande arrive chez vous (relié à votre page de conversation dès l’offre ${dès('plateforme.conversation')}). ${DELAI_TEXTE}`,
    autres: 'aucun',
    preuves: [{ fichier: 'lib/siteCommande.ts', motif: 'PRIX_SITE_TEXTE' }, { fichier: 'lib/siteCommande.ts', motif: 'une page par commune' }],
  },
]

/** Les avantages montrés aujourd'hui : drapeau levé, et critère lui-même visible. */
export const AVANTAGES_VISIBLES = AVANTAGES.filter((a) => (!a.flag || FLAGS[a.flag]) && CRITERES_VISIBLES.some((c) => c.id === a.critere))
