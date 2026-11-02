// PILOTE AUTOMATIQUE — les RÈGLES, sans réseau ni base (importable par le navigateur et rejouée par scripts/pilote-qa.mjs).
//
// Décision du fondateur du 21/10/2026 (offre Signature seulement, capacité `assistant.pilote`, drapeau `piloteAutomatique`) :
// une action PRÉPARÉE qui attend aujourd'hui la validation de l'artisan (réponse proposée à un prospect, carte de l'assistant
// qui part chez un client) part TOUTE SEULE après un DÉLAI D'ANNULATION de 10 minutes, si l'artisan a activé le pilote pour
// ce TYPE d'action, sauf s'il l'annule entre-temps. Rien n'est envoyé plus tôt, rien n'est envoyé sans être d'abord visible
// (liste « Partira dans … », notification avec bouton « Annuler »).
//
// Garde-fous TOUJOURS actifs, qu'aucun réglage ne désactive (ils sont ICI, pas dans l'écran) :
//  • jamais de prix hors des tarifs de l'artisan : un devis dont UNE ligne est estimée, « à chiffrer » ou à 0 € reste en
//    validation manuelle (`prixSources`) ;
//  • jamais de paiement ni de remboursement, ni rien d'irréversible côté comptable : ces outils ne sont pas pilotables
//    (`OUTILS_JAMAIS_AUTO`, et seule la liste fermée `OUTIL_TYPE` l'est) — et la même liste garde le mode « fait tout seul » de
//    l'assistant (lib/assistant/actions-serveur.ts) : ces gestes restent une carte d'un clic, toujours (§3.2, prompt de Benj du 01/11) ;
//  • jamais parler au nom de l'artisan sur un sujet d'escalade : au départ, les derniers messages du client sont relus
//    (`MOTS_ESCALADE_TOUJOURS` et les mots de l'artisan, `sujetEscalade`) ; un sujet sensible renvoie l'action à la main ;
//  • un plafond d'envois automatiques par jour et par compte (`PLAFOND_AUTO_JOUR`) ;
//  • la pause générale et la pause de l'artisan sont respectées (rien ne part, la file attend) ;
//  • idempotence : une seule ligne par objet préparé (`cleIdempotence`, contrainte unique en base), réclamée en une transition
//    atomique avant l'envoi ;
//  • tout est inscrit au journal (la table actions_auto EST le journal : préparée, partie, annulée, renvoyée en manuel, échec) ;
//  • désactivation immédiate : couper le pilote annule toute la file d'un coup, et chaque envoi relit les réglages juste avant.

import { peut } from '@/lib/plans'

/** Le délai d'annulation, en minutes : la seule écriture (écran, notification, file, tests). */
export const DELAI_ANNULATION_MIN = 10
export const DELAI_ANNULATION_MS = DELAI_ANNULATION_MIN * 60_000
/** Envois automatiques au plus, par compte et par jour glissant. Au-delà, l'action reste à valider à la main. */
export const PLAFOND_AUTO_JOUR = 20
/** Une action restée en file plus longtemps (pause générale prolongée, panne) ne part plus : trop vieille, elle repasse en manuel. */
export const ATTENTE_MAX_MS = 24 * 3600_000
/** Actions traitées au plus par passage du tic minute. */
export const LOT_PAR_PASSAGE = 15

export const TYPES_PILOTE = ['reponse_prospect', 'relance_devis', 'relance_impaye', 'envoi_devis', 'envoi_facture', 'assistant_client'] as const
export type TypePilote = typeof TYPES_PILOTE[number]
export const estTypePilote = (v: unknown): v is TypePilote => typeof v === 'string' && (TYPES_PILOTE as readonly string[]).includes(v)

export const LIBELLE_TYPE: Record<TypePilote, { label: string; detail: string }> = {
  reponse_prospect: { label: 'Réponses aux prospects', detail: 'La réponse préparée par l’assistant dans une conversation part seule après le délai.' },
  relance_devis: { label: 'Relances de devis', detail: 'Une relance de devis préparée par l’assistant de gestion part seule.' },
  relance_impaye: { label: 'Relances d’impayés', detail: 'Une relance de facture impayée préparée par l’assistant de gestion part seule.' },
  envoi_devis: { label: 'Envoi de devis', detail: 'Un devis préparé part seul — seulement si TOUS ses prix viennent de vos tarifs ou de vous.' },
  envoi_facture: { label: 'Envoi de factures', detail: 'Une facture déjà émise est envoyée seule au client (jamais émise ni encaissée par le pilote).' },
  assistant_client: { label: 'Autres messages de l’assistant à vos clients', detail: 'Un message rédigé par l’assistant de gestion pour un client part seul.' },
}

/**
 * Les outils de l'assistant de gestion que le pilote peut faire partir, et leur type. LISTE FERMÉE : un outil absent d'ici
 * reste toujours à confirmer d'un clic, même pilote activé.
 */
export const OUTIL_TYPE: Readonly<Record<string, TypePilote>> = {
  valider_reponse_proposee: 'reponse_prospect',
  relancer_devis: 'relance_devis',
  relancer_facture: 'relance_impaye',
  envoyer_devis: 'envoi_devis',
  envoyer_facture: 'envoi_facture',
  repondre_client: 'assistant_client',
  relancer_commande: 'assistant_client',
  demander_avis: 'assistant_client',
  envoyer_rappel_entretien: 'assistant_client',
}

/**
 * Les outils dont le pilote sait faire l'ENVOI sans la session de l'artisan (lib/pilote/executeur.ts, par les fonctions d'envoi
 * partagées de lib/envoisServeur.ts). Les autres outils client (relancer_commande, demander_avis, envoyer_rappel_entretien)
 * passent par des routes du CRM qui exigent la session : leurs cartes restent à confirmer d'un clic, même pilote activé.
 */
export const OUTILS_EXECUTABLES_PILOTE: readonly string[] = ['valider_reponse_proposee', 'relancer_devis', 'relancer_facture', 'envoyer_devis', 'envoyer_facture', 'repondre_client']

/**
 * Jamais automatiques, quel que soit le réglage : argent, comptabilité scellée, suppressions, lots de prix — la liste §3.2 du prompt
 * de Benj du 01/11 (plans/011-cadrage-01-11/prompts-benj/p3-assistant.md, annexe 2 : « Ces gestes restent des cartes, toujours »).
 * UNE seule liste, lue par le pilote (typePiloteDeOutil, decisionPilote) ET par le mode « fait tout seul » de l'assistant
 * (lib/assistant/actions-serveur.ts, `proposee`) : même demandé par l'artisan dans son message, un de ces gestes reste une carte d'un
 * clic. 02/11 : + creer_facture_libre (facture sans devis, émise et scellée à la confirmation) et supprimer_article.
 */
export const OUTILS_JAMAIS_AUTO: readonly string[] = [
  'marquer_facture_payee', 'creer_facture', 'creer_facture_libre', 'rembourser', 'payer', 'creer_avoir',
  'supprimer_devis_brouillon', 'supprimer_tarif', 'supprimer_article', 'augmenter_tarifs',
]
export const jamaisAutomatique = (outil: string): boolean => OUTILS_JAMAIS_AUTO.includes(outil)

/** Pourquoi un geste de OUTILS_JAMAIS_AUTO attend toujours le clic de l'artisan (la phrase que l'assistant lui redit) ; null sinon. */
export function raisonJamaisAuto(outil: string): string | null {
  if (!jamaisAutomatique(outil)) return null
  if (outil.startsWith('supprimer_')) return 'c’est une suppression de données, qui ne se défait pas d’office'
  if (outil === 'augmenter_tarifs') return 'c’est un changement de prix en lot'
  if (outil === 'marquer_facture_payee' || outil === 'rembourser' || outil === 'payer') return 'c’est de l’argent (encaissement, paiement ou remboursement)'
  return 'c’est de la comptabilité : une facture émise est scellée (numéro définitif, correction par un avoir)'
}

export function typePiloteDeOutil(outil: string): TypePilote | null {
  if (OUTILS_JAMAIS_AUTO.includes(outil) || !OUTILS_EXECUTABLES_PILOTE.includes(outil)) return null
  return Object.prototype.hasOwnProperty.call(OUTIL_TYPE, outil) ? OUTIL_TYPE[outil] : null
}

export type ReglagesPilote = { actif: boolean; types: Partial<Record<TypePilote, boolean>> }
export const REGLAGES_PILOTE_DEFAUT: ReglagesPilote = { actif: false, types: {} }

/** Nettoie des réglages venus de la base ou d'un corps de requête : seuls les types connus, seulement des booléens. */
export function lireReglagesPilote(brut: unknown): ReglagesPilote {
  const o = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>
  const t = (o.types && typeof o.types === 'object' && !Array.isArray(o.types) ? o.types : {}) as Record<string, unknown>
  const types: Partial<Record<TypePilote, boolean>> = {}
  for (const k of TYPES_PILOTE) if (t[k] === true) types[k] = true
  return { actif: o.actif === true, types }
}

export const typeActif = (r: ReglagesPilote, type: TypePilote): boolean => r.actif === true && r.types[type] === true

/** Une ligne de devis dont le prix est sourcé : vos tarifs, ou un prix que l'artisan a donné/saisi lui-même, et non nul. */
export type LignePrix = { prix_unitaire_ht: number | string | null; source_prix?: string | null }
const SOURCE_OK = /^(vos tarifs|tarif de l.artisan|prix donn[ée] par l.artisan)/i
export function ligneSourcee(l: LignePrix): boolean {
  const prix = Number(l.prix_unitaire_ht)
  if (!Number.isFinite(prix) || prix <= 0) return false
  const s = typeof l.source_prix === 'string' ? l.source_prix.trim() : ''
  // Audit du 21/10 (E1) : une provenance VIDE n'est PAS « saisie par l'artisan » — l'éditeur de devis la perdait à l'enregistrement,
  // et un prix estimé par l'IA aurait pu partir seul. Seules les provenances explicites comptent ; tout le reste reste à la main.
  return s !== '' && SOURCE_OK.test(s)
}
export const prixSources = (lignes: readonly LignePrix[]): boolean => lignes.length > 0 && lignes.every(ligneSourcee)

// ── §3.2 — l'ESCALADE (prompt de Benj du 01/11 : « parler au nom de l'artisan sur un sujet d'escalade (litige, sinistre, « fuite »,
// menace, avocat) » ne s'automatise jamais). Relue AU DÉPART de toute ligne de la file rattachée à une conversation (lib/pilote/file.ts).

/**
 * Les sujets d'escalade qu'aucun réglage ne retire, en plus des mots de l'artisan (Ma plateforme, `escalade_mots`, défaut
 * lib/plateformeConfig.ts CONFIG_DEFAUT). Repérés au DÉBUT d'un mot, accents et majuscules ignorés : « litiges », « sinistré »,
 * « menacé », « contesté », « l'avocat », « porter plainte » comptent. Quelques formes sont écrites à part (« tribunaux »,
 * « mis en demeure », « dégâts des eaux », « inondé »), parce qu'elles ne commencent pas comme le mot de base. Un mot de trop renvoie
 * l'action à la main : c'est le côté sûr ; un mot manqué ferait parler l'assistant à la place de l'artisan. Les mots dont le début est
 * celui de mots ordinaires (« gaz » et « gazon ») sont lus en mot entier : MOTS_ESCALADE_ENTIERS.
 */
export const MOTS_ESCALADE_TOUJOURS: readonly string[] = [
  'litige', 'litigieux', 'sinistre', 'avocat', 'menace', 'mise en demeure', 'en demeure', 'plainte', 'tribunal', 'tribunaux', 'huissier',
  'contentieux', 'conteste', 'contestation', 'arnaque', 'escroquerie', 'escroc',
  'urgence', 'fuite', 'dégât des eaux', 'dégâts des eaux', 'dégât d’eau', 'dégâts d’eau', 'inondation', 'inondé', 'assurance',
  // 02/11 (audits 032-001 D5 et 032-004) : les synonymes courants que la liste laissait passer — la justice, les dommages et les blessures,
  // le refus de payer, la réputation. Le lexique par métier reste à venir (plan du chantier 4, §3 S3).
  'justice', 'prud’hom', 'juridique', 'médiateur', 'conciliat', 'dgccrf', 'gendarme', 'préjudice', 'indemni', 'dédommag', 'réclamation',
  'lettre recommandée', 'recommandé avec', 'en recommandé', 'accusé de réception', 'vice caché', 'vices cachés', 'opposition',
  'malfaçon', 'décennale', 'expert', 'dégât', 'incendie', 'brûl', 'blessé', 'blessure', 'électrocut', 'monoxyde', 'intoxi', 'effondr', 'écroul',
  'infiltr', 'court-circuit', 'court circuit', 'danger', 'eau partout', 'est tombé', 'est tombée', 'sont tombés', 'une chute', 'fait une chute',
  'paierai pas', 'payerai pas', 'réglerai pas', 'paie pas', 'paye pas', 'pas payer cette', 'pas payer la', 'pas payer tant', 'refuse de payer',
  'refuse de régler', 'rembours', 'avis négatif', 'mauvais avis', 'mauvaise pub',
  // Troisième audit 032-005 (D5) : l'assureur, la menace, le vol, la poursuite, le refus de payer, la sécurité électrique, le signalement.
  'assureur', 'menaç', 'voleur', 'poursuiv', 'vous attaquer', 'paierai rien', 'payerai rien', 'pas un centime', 'bloque le paiement', 'retiens le solde',
  'retenir le solde', 'une étoile', 'explos', 'étincel', 'ça fume', 'pris une décharge', 'décharge électrique', 's’est coupé', 's’est blessé',
  'signalement', 'réclame', 'remise en état', 'conflit', 'dénonce',
  // Quatrième et cinquième audits (032-006 E2, 032-007 E3) : toutes les formes de « fuir » par leurs racines — fuit, fuite, fuient, a fui,
  // fuir, fuira, fuyait, fuyant (le §3.2 nomme la fuite) — et « perd de l'eau » ; « urgent ». Côté sûr : « fuir les ennuis » passe à la main.
  'fui', 'fuy', 'perd de l’eau', 'perdent de l’eau', 'perte d’eau', 'urgen', 'urgemment',
  // … et les synonymes courants relevés par 032-007 (moyens) : l'eau qui goutte, suinte ou déborde, la panne de chauffage, l'argent réclamé.
  'goutte', 'suinte', 'déborde', 'sous l’eau', 'de l’eau par terre', 'plus de chauffage', 'plus d’eau chaude', 'au plus vite', 'pressant',
  'entendre parler de moi', 'retiens le paiement', 'rendez-moi mon argent', 'une honte', 'avis sur google', 'plombs ont sauté', 'pris feu', 'court-jus',
  // … et ses synonymes manqués (D5) : l'eau qui coule, l'escroquerie, la plainte, les dommages, le travail bâclé, la fraude, le disjoncteur.
  'coule du', 'ça coule', 'goutte du', 'escroqu', 'plaindre', 'plains', 'dommages et', 'consommateur', 'bâcl', 'mal fait', 'fraude',
  'disjoncteur saute', 'ça disjoncte', 'disjoncte sans',
]
/**
 * 02/11 (contre-audit 032-004, D5) — les sujets repérés en MOT ENTIER seulement : leur début est celui de mots ordinaires (« gaz » de
 * « gazon », « gazinière » ou d'un nom propre, « procès » de « processus », « accident » d'« accidentellement »).
 */
export const MOTS_ESCALADE_ENTIERS: readonly string[] = ['gaz', 'procès', 'police', 'accident', 'accidents', 'pompiers', 'juge', 'ufc', 'vol', 'samu', 'urssaf']
/** Les messages ENTRANTS relus au départ (les plus récents de la conversation). */
export const MESSAGES_ESCALADE_RELUS = 10

const sansAccents = (s: string): string => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const enMots = (s: string): string => ` ${sansAccents(s).replace(/[^a-z0-9]+/g, ' ').trim()} `
const RACINES_TOUJOURS: readonly (readonly [string, string])[] = MOTS_ESCALADE_TOUJOURS.map((m) => [m, enMots(m).trim()] as const)
const RACINES_ENTIERES: readonly (readonly [string, string])[] = MOTS_ESCALADE_ENTIERS.map((m) => [m, enMots(m).trim()] as const)
// « Pas d'urgence, quand vous pouvez » n'est pas une urgence (contre-audit 032-004, D5) ; ni « sans dégât » un dégât, ni une « chute de
// neige » une chute (troisième audit 032-005).
const FAUSSE_URGENCE = / (?:pas d|sans|aucune|rien d) urgen[a-z]*| pas urgent[a-z]*| (?:sans|aucun|pas de) degats?| une chute de (?:neige|pluie|grele|feuilles)/g

/**
 * Le premier sujet d'escalade trouvé dans ces messages (ceux du CLIENT), ou null. Deux listes : MOTS_ESCALADE_TOUJOURS, au début d'un
 * mot ; et les mots de l'artisan, lus comme motEscalade (lib/plateformeConfig.ts) : n'importe où dans le texte, accents ignorés.
 */
export function sujetEscalade(messages: readonly unknown[], motsArtisan: readonly unknown[] | null = []): string | null {
  const liste: readonly unknown[] = Array.isArray(motsArtisan) ? motsArtisan : []
  const artisan = liste.filter((m): m is string => typeof m === 'string').map((m) => [m, sansAccents(m).trim()] as const).filter(([, k]) => k !== '')
  for (const brut of messages) {
    if (typeof brut !== 'string' || !brut.trim()) continue
    const mots = enMots(brut).replace(FAUSSE_URGENCE, ' ')
    for (const [m, k] of RACINES_TOUJOURS) if (k && mots.includes(` ${k}`)) return m
    for (const [m, k] of RACINES_ENTIERES) if (k && mots.includes(` ${k} `)) return m
    const texte = sansAccents(brut)
    for (const [m, k] of artisan) if (texte.includes(k)) return m
  }
  return null
}

export type MotifManuel =
  | 'drapeau' | 'offre' | 'inactif' | 'type_inactif' | 'jamais_auto' | 'prix_non_source' | 'plafond' | 'pause' | 'trop_ancienne'
  | 'suspendu' | 'limite_conversation' | 'contenu_client' | 'escalade'

export const LIBELLE_MOTIF: Record<MotifManuel, string> = {
  drapeau: 'Le pilote automatique n’est pas ouvert.',
  offre: 'Le pilote automatique est réservé à l’offre Signature.',
  inactif: 'Le pilote automatique est coupé.',
  type_inactif: 'Le pilote n’est pas activé pour ce type d’action.',
  jamais_auto: 'Cette action ne part jamais automatiquement (argent, comptabilité, suppression).',
  prix_non_source: 'Une ligne du devis a un prix estimé ou à chiffrer : il reste à valider à la main.',
  plafond: `Plafond de ${PLAFOND_AUTO_JOUR} envois automatiques par jour atteint : à valider à la main.`,
  pause: 'Pause en cours : rien ne part tant qu’elle dure.',
  trop_ancienne: 'Restée en attente plus de 24 h : elle repasse en validation manuelle.',
  suspendu: 'Compte suspendu : rien ne part.',
  limite_conversation: 'Limite de réponses de l’assistant atteinte dans cette conversation (Ma plateforme) : à valider à la main.',
  contenu_client: 'Préparée après la lecture de messages écrits par des tiers : elle ne part jamais seule, à valider à la main.',
  escalade: 'Le client parle d’un sujet sensible (litige, sinistre, avocat, urgence…) : à valider à la main.',
}

/**
 * Audit du 21/10 (M4, injection de prompt indirecte) : les outils de lecture de l'assistant qui rendent du texte ÉCRIT PAR UN TIERS
 * (messages de prospects, demandes de la salle d'attente, coordonnées de fournisseurs, rappels nés de demandes). Une carte créée dans
 * une conversation où l'un d'eux a été appelé est MARQUÉE (`_contenu_client_lu`) et ne part jamais par le pilote : c'est l'artisan
 * qui clique. Les lectures de ses propres pièces (devis, factures, chantiers, tarifs, stock, chiffres, réglages) ne marquent pas.
 */
export const OUTILS_CONTENU_TIERS: readonly string[] = ['lire_conversations', 'lire_fil', 'preparer_reponse', 'lire_ou_j_en_suis', 'briefing_du_matin', 'lire_commandes', 'lire_rappels']
export const MARQUE_CONTENU_TIERS = '_contenu_client_lu'

/**
 * Faut-il mettre cette action dans la file du pilote ? Appelée à la PRÉPARATION (et rejouée, en partie, juste avant l'envoi).
 * `lignes` : seulement pour un envoi de devis (le garde-fou des prix).
 */
export function decisionPilote(p: {
  drapeau: boolean
  plan: string | null | undefined
  reglages: ReglagesPilote
  type: TypePilote | null
  outil?: string
  lignes?: readonly LignePrix[]
  partiesDepuis24h: number
}): { auto: true; type: TypePilote } | { auto: false; motif: MotifManuel } {
  if (!p.drapeau) return { auto: false, motif: 'drapeau' }
  if (p.outil && OUTILS_JAMAIS_AUTO.includes(p.outil)) return { auto: false, motif: 'jamais_auto' }
  if (!p.type) return { auto: false, motif: 'jamais_auto' }
  if (!peut(p.plan, 'assistant.pilote')) return { auto: false, motif: 'offre' }
  if (!p.reglages.actif) return { auto: false, motif: 'inactif' }
  if (!typeActif(p.reglages, p.type)) return { auto: false, motif: 'type_inactif' }
  if (p.type === 'envoi_devis' && !prixSources(p.lignes ?? [])) return { auto: false, motif: 'prix_non_source' }
  if (p.partiesDepuis24h >= PLAFOND_AUTO_JOUR) return { auto: false, motif: 'plafond' }
  return { auto: true, type: p.type }
}

/** La clé d'idempotence : une seule ligne de file par objet préparé (contrainte unique (artisan_id, cle) en base). */
export const cleIdempotence = (source: 'carte' | 'proposition', refId: string): string => `${source}:${refId}`

export const partLe = (preteLe: Date): Date => new Date(preteLe.getTime() + DELAI_ANNULATION_MS)

/** L'action est-elle mûre (délai écoulé) ? trop vieille ? */
export function etatEcheance(l: { prete_le: string; part_le: string }, maintenant: Date): 'attendre' | 'partir' | 'trop_ancienne' {
  const t = maintenant.getTime()
  if (t - Date.parse(l.prete_le) > ATTENTE_MAX_MS) return 'trop_ancienne'
  return t >= Date.parse(l.part_le) ? 'partir' : 'attendre'
}

/** « Partira dans 7 min » / « Part maintenant ». */
export function texteDecompte(partLeIso: string, maintenant: Date = new Date()): string {
  const ms = Date.parse(partLeIso) - maintenant.getTime()
  if (!Number.isFinite(ms) || ms <= 30_000) return 'Part maintenant'
  const min = Math.ceil(ms / 60_000)
  return `Partira dans ${min} min`
}

export const STATUTS_FILE = ['a_partir', 'en_cours', 'annulee', 'partie', 'echec', 'manuel'] as const
export type StatutFile = typeof STATUTS_FILE[number]

/** Une ligne de la file telle que l'écran la reçoit (GET /api/pilote/file). */
export type LigneFile = {
  id: string
  type: TypePilote
  source: 'carte' | 'proposition'
  libelle: string
  prete_le: string
  part_le: string
  statut: StatutFile
  motif: string | null
  traite_le: string | null
}
