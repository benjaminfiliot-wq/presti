// lib/agents/acquisition/contrat.ts — le contrat des agents d'acquisition (fiche 026-016, écrit par Claude Code).
//
// Voie gratuite du 25/09 : le premier contact part par le formulaire de contact du site de l'entreprise (`formulaire_site`,
// un par entreprise et à vie, jamais relancé, soumis sur l'usine par le porteur de 026-095) ; la suite part du Gmail de
// prospection, seulement à qui a écrit (`email_sollicite`, avec une preuve de demande). Aucune adresse n'est relevée sur un
// site (R4 = non). Chaque message part par le seul Facteur, avec trois verdicts enregistrés (J1 faits, J3 conformité,
// second juge). Jamais `prestiapp.fr` avant un « oui ».
//
// Types et constantes SEULEMENT : aucun import, aucun effet. Les agents sont des bibliothèques pures sous
// lib/agents/acquisition/ qui reçoivent le monde par injection (Recuperateur, Horloge, Magasin, Lecteur, Stockage) ; les
// porteurs d'envoi (`Porteur`) sont définis par 026-089 dans porteurs.ts, pas ici. Syntaxe effaçable seulement (les juges
// importent ce fichier par `node --import ./scripts/ts-loader.mjs`) : ni `enum`, ni `namespace`, ni propriété de paramètre.
// Un type s'importe par `import type` : sans lui, Node garde l'import et échoue au chargement.

// ── Noms ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** `facteur_usine` : le porteur du formulaire, sur l'usine (026-095). */
export type NomAgent =
  | 'vigie_meta'
  | 'recenseur'
  | 'juge_faits'
  | 'redacteur'
  | 'standardiste'
  | 'atelier_maquettes'
  | 'facteur'
  | 'facteur_usine'
  | 'repondeur'
export type Source = 'meta' | 'manuel' | 'entrant' | 'ademe_rge'
/** `marque` : un annonceur de la bibliothèque Meta, pour le Studio pubs (décision 3 de Benj). */
export type Cible = 'artisan' | 'marque'
/** Plus de canal `email` : aucune adresse n'est relevée ; l'e-mail ne sert qu'en réponse (`email_sollicite`). */
export type Canal = 'formulaire_site' | 'email_sollicite' | 'instagram' | 'facebook' | 'reponse_privee' | 'messagerie'
/**
 * `site_http` : l'accueil est servi sans HTTPS (extrait : l'URL lue) ; `site_mobile` : pas de balise viewport (extrait : le
 * titre) ; `site_copyright` : une année de copyright au plus l'année courante moins 4 (extrait : la mention, « © 2016 »).
 */
export type TypeFait = 'pub_meta' | 'site_titre' | 'site_h1' | 'site_intertitre' | 'site_http' | 'site_mobile' | 'site_copyright'
export type VerificationFait = 'ok' | 'absent' | 'injoignable' | 'non_verifiable'

// ── Faits et canaux ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Un fait lu mot pour mot sur une page datée. `id` : 16 premiers caractères hexadécimaux du SHA-256 de url + type + extrait. */
export interface Fait {
  id: string
  type: TypeFait
  extrait: string
  url: string
  lu_le: string
  verifie?: VerificationFait
  verifie_le?: string
  /** SHA-256 du texte normalisé de la page relue par J1. */
  empreinte_page?: string
  /** `pub_meta` : l'identifiant de l'annonce et celui de la page qui la porte. */
  annonce_id?: string
  page_id?: string
}
/**
 * Un canal trouvé. Aucune adresse n'est relevée sur un site (R4 = non) : la seule adresse e-mail d'un prospect est celle
 * qu'il a donnée lui-même (`nature: 'donnee_par_la_personne'`). Le canal d'un prospect froid est `formulaire_site`, de
 * valeur l'URL de la page du formulaire.
 */
export interface CanalTrouve {
  canal: Canal
  valeur: string
  url_source: string
  nature?: 'donnee_par_la_personne'
  verifie?: boolean
}

// ── Le formulaire de contact ──────────────────────────────────────────────────────────────────────────────────────────────
export type TechnologieFormulaire =
  | 'contact_form_7'
  | 'wpforms'
  | 'gravity_forms'
  | 'elementor'
  | 'divi'
  | 'wix'
  | 'jimdo'
  | 'webflow'
  | 'squarespace'
  | 'shopify'
  | 'html'
  | 'autre'
export const TECHNOLOGIES_FORMULAIRE: readonly TechnologieFormulaire[] = Object.freeze([
  'contact_form_7', 'wpforms', 'gravity_forms', 'elementor', 'divi', 'wix', 'jimdo', 'webflow', 'squarespace', 'shopify', 'html', 'autre',
] as const)
export interface ChampFormulaire {
  nom: string
  type: string
  requis: boolean
  /** `maxlength` du champ, s'il en a un. */
  max?: number
}
export interface Formulaire {
  url_page: string
  url_action: string
  methode: string
  champs: ChampFormulaire[]
  /** Les motifs d'un `select` obligatoire (vide sinon). */
  motifs: string[]
  technologie: TechnologieFormulaire
  telephone_requis: boolean
  /** `maxlength` du champ de message, sinon null. */
  longueur_max_message: number | null
}
/** Abandon définitif, jamais de contournement (garde-fous 5 à 7 de la voie gratuite). */
export type RaisonAbandon =
  | 'sans_formulaire'
  | 'captcha'
  | 'pot_de_miel'
  | 'case_robot'
  | 'question_antispam'
  | 'defi_js'
  | 'pare_feu'
  | 'extension_antispam'
  | 'refus_demarchage'
  | 'cgu_robots'
  | 'robots_txt'
  | 'telephone_requis'
  | 'motif_devis_seul'
  | 'plateforme'
export const RAISONS_ABANDON: readonly RaisonAbandon[] = Object.freeze([
  'sans_formulaire', 'captcha', 'pot_de_miel', 'case_robot', 'question_antispam', 'defi_js', 'pare_feu', 'extension_antispam',
  'refus_demarchage', 'cgu_robots', 'robots_txt', 'telephone_requis', 'motif_devis_seul', 'plateforme',
] as const)
export type VerdictFormulaire = { eligible: true } | { eligible: false; raison: RaisonAbandon }

// ── Preuves ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * La preuve qu'une personne a demandé la suite : l'id d'une ligne `ops.reponses` reçue de ce destinataire (`message_recu`),
 * ou la case cochée d'une demande entrante (`case_entrant`, 026-145). Un accusé automatique de site n'en est jamais une.
 */
export interface PreuveDemande {
  type: 'message_recu' | 'case_entrant'
  id: string
}
/** Les captures restent sur l'usine : la base ne garde que les empreintes et le chemin. */
export interface PreuveSoumission {
  code_http: number
  empreinte_texte: string
  empreinte_avant: string
  empreinte_apres: string
  chemin_usine: string
  technologie: TechnologieFormulaire
  soumis_le: string
}

// ── Candidats et prospects ────────────────────────────────────────────────────────────────────────────────────────────────
export interface Candidat {
  /** `^(siren|domaine|page_meta|instagram):.{2,160}$` (contrainte de 0096). */
  cle_dedup: string
  source: Source
  cible: Cible
  siren?: string | null
  domaine?: string | null
  page_meta?: string | null
  instagram?: string | null
  entreprise: string
  metier?: string | null
  commune?: string | null
  departement?: string | null
  code_postal?: string | null
  /** `marque` : le produit vu dans l'annonce. */
  produit?: string | null
  faits: Fait[]
  canaux: CanalTrouve[]
  /** false pour les proches (`PROCHES`) : jamais comptés dans la mesure. */
  froid: boolean
  conversation_id?: string | null
  formulaire?: Formulaire | null
  technologie?: TechnologieFormulaire | null
}
export type Etape =
  | 'candidat'
  | 'recense'
  | 'sans_canal'
  | 'rejete'
  | 'verifie'
  | 'maquette_prete'
  | 'prepare'
  | 'envoye'
  | 'oui'
  | 'non'
  | 'lien_prepare'
  | 'lien_envoye'
  | 'oppose'
  | 'a_decider'
export interface ProspectReserve extends Candidat {
  id: string
  etape: Etape
  tentatives: number
}
/** Ce qu'un agent écrit en changeant l'étape d'un prospect (`raison` pour un rejet, `raisons` pour J1). */
export interface PatchProspect {
  siren?: string | null
  entreprise?: string
  cible?: Cible
  metier?: string | null
  commune?: string | null
  departement?: string | null
  code_postal?: string | null
  naf?: string | null
  domaine?: string | null
  page_meta?: string | null
  instagram?: string | null
  faits?: Fait[]
  canaux?: CanalTrouve[]
  froid?: boolean
  formulaire?: Formulaire | null
  technologie?: TechnologieFormulaire | null
  raison?: string
  raisons?: string[]
}
export interface ClesOpposition {
  siren?: string | null
  domaine?: string | null
  email?: string | null
  instagram?: string | null
  page_meta?: string | null
  meta_id?: string | null
}
/** Un annonceur de la bibliothèque publicitaire de Meta (vigie, 026-072). */
export interface Annonceur {
  page_id: string
  page_nom: string
  domaine: string | null
  cible: Cible
  terme: string
  annonces: { id: string; textes: string[]; titres: string[]; debut: string | null }[]
}
/** `resume` : 200 signes au plus, sans donnée personnelle (des compteurs). */
export interface Evenement {
  agent: NomAgent
  type: string
  resume: string
  objet_id?: string
}

// ── Lectures (A8) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Ce que le recenseur retient de SIRENE : jamais les dirigeants, jamais d'adresse de rue ; `denomination` absente pour un EI. */
export interface FicheSirene {
  siren: string
  siret_siege: string | null
  naf: string
  metier: string | null
  code_postal: string | null
  commune: string | null
  departement: string | null
  entrepreneur_individuel: boolean
  cree_le: string | null
  denomination?: string
}
export type RefusSirene =
  | 'siren_invalide'
  | 'inactif'
  | 'diffusion_partielle'
  | 'hors_batiment'
  | 'trop_grand'
  | 'naf_exclu'
  | 'ambigu'
  | 'introuvable'
  | 'limite_api'
  | 'injoignable'
/** Un compte Instagram ou une page Facebook que l'artisan publie lui-même, avec la page où il a été lu. */
export interface ReseauLu {
  reseau: 'instagram' | 'facebook'
  compte: string
  url: string
  url_source: string
}
export interface LectureSite {
  domaine: string
  pages: { url: string; statut: number }[]
  faits: Fait[]
  siren: string | null
  formulaire: Formulaire | null
  verdict_formulaire: VerdictFormulaire
  reseaux: ReseauLu[]
}

// ── Envois ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** `reponse_rgpd` : la réponse due à une demande sur ses données, même à qui s'est opposé (RGPD art. 12(3)). */
export type TypeEnvoi = 'premier_contact' | 'relance' | 'lien_maquette' | 'reponse' | 'confirmation_stop' | 'reponse_rgpd'
export type Verdict = 'ok' | 'refus' | 'sans_objet' | 'injoignable'
export interface Verdicts {
  j1: Verdict
  j3: Verdict
  j2: Verdict
  j2_version: string | null
  raisons: string[]
}
/** `facteur_usine` pour `formulaire_site`, `gmail` pour `email_sollicite`, `repondeur` pour Meta. */
export type Envoyeur = 'facteur_usine' | 'gmail' | 'repondeur'
/**
 * `destinataire` : l'URL de la page du formulaire pour `formulaire_site` ; l'adresse de la personne pour `email_sollicite`
 * (`preuve_demande` obligatoire) ; l'identifiant Meta de la personne (`meta_id`) sur `reponse_privee` et `messagerie`, où
 * `prospect_id` peut être nul tant qu'elle n'est pas un prospect (la conversation est alors obligatoire, 0096 et 0106).
 * `reference` : un code de 6 signes tiré de l'empreinte de l'envoi, cité dans le texte (« Réf. … »).
 */
export interface EnvoiPrepare {
  prospect_id: string | null
  type: TypeEnvoi
  canal: Canal
  envoyeur: Envoyeur
  destinataire: string
  objet: string | null
  texte: string
  empreinte_texte: string
  modele_id: string
  variante: 'A' | 'B' | null
  fait_id: string | null
  douleur_id: string | null
  fil_envoi_id: string | null
  conversation_id: string | null
  preuve_demande: PreuveDemande | null
  reference: string | null
}
export interface EnvoiApprouve extends EnvoiPrepare {
  id: string
  verdicts: Verdicts
  prepare_le: string
}
export interface EnvoiEnAttente extends EnvoiPrepare {
  id: string
  prepare_le: string
}
/** La preuve d'un envoi : une `PreuveSoumission` pour un formulaire, l'identifiant et les en-têtes pour un courriel ou Meta. */
export type PreuveEnvoi = PreuveSoumission | { id_externe: string; entetes: Record<string, string> }
export type ResultatRegle = { ok: true } | { ok: false; raison: string }
export type ResultatPreparation = { ok: true; id: string } | { ok: false; raison: string }

// ── Paliers, état de l'envoi, signaux ─────────────────────────────────────────────────────────────────────────────────────
/** En formulaires par jour ouvré. `jours_au_vert` : null quand le passage se fait au bilan, ou au plafond. */
export interface Palier {
  id: 'P0' | 'P1' | 'P2' | 'P3' | 'P4'
  par_jour: number
  jours_au_vert: number | null
  regle: string
}
export interface EtatEnvoi {
  palier: Palier['id']
  envoi_froid: boolean
  formulaire_coupe_jusqua: string | null
  gmail_coupe_jusqua: string | null
  meta_coupe_jusqua: string | null
  technologies: { technologie: TechnologieFormulaire; etat: 'active' | 'pause' }[]
  modeles_suspendus: string[]
  notice_verifiee_le: string | null
  bilan_le: string | null
  /** Contre-revue du 25/09 au soir (0111, 026-063) : l'heure de la dernière relève du Gmail. */
  releve_gmail_le: string | null
  /** Le droit d'interroger `ads_archive`, et sa date. */
  ads_archive: { permis: boolean; le: string | null }
}
export interface Signal {
  type: 'stop' | 'plainte' | 'avis_abus' | 'echec_soumission' | 'reponse_positive' | 'gmail_refus' | 'erreur_meta_politique' | 'erreur_meta_debit'
  envoyeur?: Envoyeur
  envoi_id?: string
  modele_id?: string
  technologie?: TechnologieFormulaire
}
export interface Jauge {
  fournisseur: string
  consomme: number
  plafond: number
  jour: string
}

// ── Maquettes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface MaquetteEtat {
  id: string
  prospect_id: string
  etat: 'prete' | 'lien_cree' | 'purgee'
  chemin: string
  empreinte: string
  variante: 'A' | 'B' | null
  entrant: boolean
  prete_le: string
  expire_le: string | null
  jeton_hache: string | null
  objet: string | null
}

// ── Réponses et classement ────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * `accuse_site` : l'accusé automatique d'un formulaire (ni une réponse, ni une preuve de demande) ; `en_reponse_a` :
 * l'en-tête `In-Reply-To` d'un courriel.
 */
export interface ReponseProspect {
  id: string
  id_externe: string
  envoi_id: string | null
  conversation_id: string | null
  prospect_id: string | null
  canal: Canal
  source: 'courriel' | 'meta' | 'formulaire' | 'essai'
  texte: string
  auto: boolean
  accuse_site: boolean
  en_reponse_a: string | null
  recu_le: string
}
/**
 * `accuse_site` est posé en code par le Standard (026-085). Les quatre dernières classes ne sont posées que par Benj, en
 * tranchant une carte (`classe_par = 'benj'`).
 */
export type ClasseReponse =
  | 'oui'
  | 'question'
  | 'prix'
  | 'appel'
  | 'pas_maintenant'
  | 'reponse_auto'
  | 'accuse_site'
  | 'stop'
  | 'hostile'
  | 'sensible'
  | 'rgpd'
  | 'entrant'
  | 'autre'
  | 'a_lire'
  | 'hors_fil'
  | 'ignoree'
  | 'rgpd_acces'
  | 'rgpd_effacement'
  | 'rgpd_autre'
export interface Classement {
  classe: ClasseReponse
  source: 'regle' | 'lecteur' | 'defaut' | 'benj'
  certitude?: number
  extrait?: string
  faq_id?: string
  rappel_le?: string
  entrant?: { metier: string; commune: string; site: string; email?: string }
}
/** Chaque ligne porte l'heure et le type de notre dernier envoi au même destinataire. */
export interface ReponseARepondre extends ReponseProspect {
  classement: Classement
  notre_dernier_envoi_le: string | null
  notre_dernier_envoi_type: TypeEnvoi | null
}

// ── Décisions (cartes de Benj) ────────────────────────────────────────────────────────────────────────────────────────────
export type TypeDecision =
  | 'verifier_demande'
  | 'rgpd'
  | 'lire'
  | 'lire_reponse_non'
  | 'stockage'
  | 'palier'
  | 'studio_echantillon'
  | 'mesure_a_sec'
export interface OptionDecision {
  cle: string
  libelle: string
  recommandee: boolean
}
/** De 2 à 7 options : une carte sans option renvoyait Benj à une interface extérieure (revue du 25/09). */
export type OptionsDecision =
  | [OptionDecision, OptionDecision]
  | [OptionDecision, OptionDecision, OptionDecision]
  | [OptionDecision, OptionDecision, OptionDecision, OptionDecision]
  | [OptionDecision, OptionDecision, OptionDecision, OptionDecision, OptionDecision]
  | [OptionDecision, OptionDecision, OptionDecision, OptionDecision, OptionDecision, OptionDecision]
  | [OptionDecision, OptionDecision, OptionDecision, OptionDecision, OptionDecision, OptionDecision, OptionDecision]
/**
 * `cle_idempotence` : `acq:reponse:<reponse_id>:<type>` quand la décision porte sur une réponse, sinon
 * `acq:<type>:<prospect_id ou date>`. Trancher une carte de réponse fait reprendre la main aux agents : la route du
 * tranchage (026-074) appelle `acq_reponse_reclasser` (0106), puis le Standard fait les actes de la classe choisie à son
 * passage suivant, puis le Répondeur ou l'Atelier la traitent. Il n'y a plus de décision « appeler » ni « répondre ».
 */
export interface DecisionAcquisition {
  type: TypeDecision
  prospect_id?: string
  reponse_id?: string
  resume: string
  extrait?: string
  echeance?: string
  options: OptionsDecision
  defaut: string
  cle_idempotence: string
}
const option = (cle: string, libelle: string, recommandee = false): OptionDecision => Object.freeze({ cle, libelle, recommandee })
const OPTIONS_LIRE: OptionsDecision = [
  option('oui', 'Oui : il veut sa maquette'),
  option('question', 'Une question'),
  option('prix', 'Il demande le prix'),
  option('appel', 'Il veut un appel'),
  option('pas_maintenant', 'Pas maintenant (90 jours)'),
  option('stop', 'STOP : plus rien'),
  option('ignorer', 'Ignorer : rien ne part'),
]
const OPTIONS_VU: OptionsDecision = [option('vu', 'Vu', true), option('ne_rien_faire', 'Ne rien faire')]
/**
 * Les options de chaque carte et leur défaut (le plus prudent : rien ne part). `rgpd` : échéance à la réception + 25 jours
 * (la réponse est due dans le mois) ; `studio_echantillon` : `depose` posée par deposer-echantillon.mjs (026-166).
 */
export const OPTIONS_DECISIONS: Readonly<Record<TypeDecision, OptionsDecision>> = Object.freeze({
  lire: OPTIONS_LIRE,
  lire_reponse_non: OPTIONS_LIRE,
  rgpd: [
    option('rgpd_acces', 'Accès : le Répondeur envoie l\'export de ses données'),
    option('rgpd_effacement', 'Effacement : opposition définitive, puis effacement'),
    option('rgpd_autre', 'Autre : Benj répond lui-même'),
  ],
  verifier_demande: OPTIONS_VU,
  stockage: OPTIONS_VU,
  palier: OPTIONS_VU,
  mesure_a_sec: OPTIONS_VU,
  studio_echantillon: [option('depose', 'Échantillon déposé', true), option('ne_rien_faire', 'Ne rien faire')],
})
export const DEFAUTS_DECISIONS: Readonly<Record<TypeDecision, string>> = Object.freeze({
  lire: 'ignorer',
  lire_reponse_non: 'ignorer',
  rgpd: 'rgpd_autre',
  verifier_demande: 'ne_rien_faire',
  stockage: 'ne_rien_faire',
  palier: 'ne_rien_faire',
  mesure_a_sec: 'ne_rien_faire',
  studio_echantillon: 'ne_rien_faire',
})
export interface DecisionTranchee {
  id: string
  type: TypeDecision
  prospect_id: string | null
  reponse_id: string | null
  option: string
  tranche_le: string
}

// ── Conversations Meta, rendez-vous ───────────────────────────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string
  plateforme: 'instagram' | 'facebook'
  pseudo: string
  suit_le_compte: boolean
  fenetre_jusqua: string | null
  commentaire_id?: string | null
  reponse_privee_jusqua?: string | null
  prospect_id?: string | null
  /** L'identifiant Meta de la personne. */
  meta_id?: string | null
}
export interface LienRdv {
  prospect_id: string
  jeton_hache: string
  expire_le: string
  creneau: string | null
  /** Rendus par acq_rdv_par_jeton (0106, 026-061) depuis ops.prospects ; absents seulement d'un ancien jumeau. */
  metier?: string | null
  commune?: string | null
  statut?: string
}

// ── Le monde, injecté ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** `tronque` : la lecture s'est arrêtée à `maxOctets`. Une redirection est rendue telle quelle (3xx et `location`). */
export interface PageRecue {
  statut: number
  entetes: Record<string, string>
  corps: string
  url_finale: string
  tronque?: boolean
}
/** Une coupure réseau est une exception ; le récupérateur ne suit jamais une redirection. */
export type Recuperateur = (
  url: string,
  options: { entetes?: Record<string, string>; delaiMs?: number; maxOctets?: number },
) => Promise<PageRecue>
export interface Horloge {
  maintenant(): number
  attendre(ms: number): Promise<void>
}
export interface DepsReseau {
  recuperer: Recuperateur
  horloge: Horloge
}
export type Lecteur = (entree: { systeme: string; donnees: unknown }) => Promise<unknown>
export interface Budget {
  prendre(n: number): Promise<boolean>
}
export interface Stockage {
  deposer(chemin: string, octets: Uint8Array, type?: string): Promise<void>
  retirer(chemin: string): Promise<void>
  lire(chemin: string): Promise<Uint8Array | null>
  occupationOctets(): Promise<number>
}

// ── Le magasin (la base, injectée) ────────────────────────────────────────────────────────────────────────────────────────
export interface MagasinSocle {
  enPause(agent: NomAgent): Promise<boolean>
  enregistrerCandidats(c: Candidat[]): Promise<{ ajoutes: number; ignores: number }>
  /** Bail et tentatives (3 → `a_decider`) : réservé à A8 (`candidat`) et J1 (`recense`). */
  reserver(etape: 'candidat' | 'recense', limite: number, bailSecondes: number): Promise<ProspectReserve[]>
  /** false si l'étape a changé entre-temps. */
  mettreAJour(id: string, depuis: Etape, vers: Etape, patch: PatchProspect): Promise<boolean>
  estOppose(cles: ClesOpposition): Promise<boolean>
  /** Sans `expireLe` : définitive ; avec : temporaire (le « pas maintenant » de 90 jours). */
  opposer(cles: ClesOpposition, motif: string, source: string, expireLe?: string): Promise<void>
  enregistrerAnnonceurs(a: Annonceur[]): Promise<number>
  evenement(e: Evenement): Promise<void>
}
export interface Compteurs {
  envois: number
  nouveaux: number
}
export interface ContactPasse {
  envoi_id: string
  type: TypeEnvoi
  canal: Canal
  statut: string
  le: string
}
export interface MagasinEchanges {
  plafondDuJour(canal: Canal, envoyeur?: Envoyeur): Promise<Compteurs | null>
  envoisDuJour(canal: Canal, envoyeur?: Envoyeur): Promise<Compteurs>
  prospectsPourPremierContact(canal: Canal, limite: number): Promise<ProspectReserve[]>
  prospectsPourRelance(limite: number): Promise<ProspectReserve[]>
  /** `froid` : true, le froid préparé d'avance (parité de l'empreinte) ; false, les demandes (sans parité). */
  prospectsPourMaquette(limite: number, froid: boolean): Promise<ProspectReserve[]>
  prospectsOui(limite: number): Promise<ProspectReserve[]>
  historiqueContacts(prospectId: string): Promise<ContactPasse[]>
  perimerEnvois(): Promise<number>
  /** Fait avancer l'étape du prospect dans la même transaction. Ne lève jamais pour une règle. */
  preparerEnvoi(e: EnvoiPrepare): Promise<ResultatPreparation>
  envoisAApprouver(limite: number): Promise<EnvoiEnAttente[]>
  approuverEnvoi(id: string, verdicts: Verdicts): Promise<ResultatRegle>
  annulerEnvoi(id: string, raison: string): Promise<void>
  envoisApprouves(canal: Canal, limite: number): Promise<EnvoiApprouve[]>
  marquerEnvoye(id: string, preuve: PreuveEnvoi): Promise<void>
  marquerEchec(id: string, raison: string): Promise<void>
  /** Envois `formulaire_site` approuvés, prospect sans opposition, hors pause, technologie active, dans le reste du plafond. */
  formulairesAPorter(limite: number, bailSecondes: number): Promise<EnvoiApprouve[]>
  formulaireEchec(id: string, raison: string, definitif: boolean): Promise<void>
  curseurLire(nom: string): Promise<string | null>
  curseurPoser(nom: string, valeur: string): Promise<void>
  decisionsTranchees(type: TypeDecision, limite: number): Promise<DecisionTranchee[]>
  maquetteDe(prospectId: string): Promise<MaquetteEtat | null>
  /** Les entrants ne mangent pas le quota du palier. */
  maquettesDuJour(): Promise<{ faites_aujourdhui: number; pretes_non_utilisees: number; entrants_faites_aujourdhui: number }>
  enregistrerMaquettePrete(prospectId: string, infos: { chemin: string; empreinte: string; variante: 'A' | 'B' | null }): Promise<void>
  creerLienMaquette(prospectId: string, objet: string, jetonHache: string, expireLe: string): Promise<void>
  maquetteParJeton(jetonHache: string): Promise<MaquetteEtat | null>
  maquettesAPurger(limite: number): Promise<MaquetteEtat[]>
  marquerMaquettePurgee(id: string): Promise<void>
  /** Idempotente par `id_externe` ; rend le prospect rattaché, pour qu'un STOP mette aussitôt ses clés en opposition. */
  reponseRecue(r: Omit<ReponseProspect, 'id'>): Promise<{ id: string; nouvelle: boolean; prospect: { id: string; siren: string | null; domaine: string | null } | null }>
  reponsesATraiter(limite: number): Promise<ReponseProspect[]>
  classerReponse(id: string, c: Classement): Promise<void>
  reponsesARepondre(limite: number): Promise<ReponseARepondre[]>
  reponseRepondue(id: string, envoiId: string | null): Promise<void>
  /** Lit la décision tranchée et pose sur sa réponse la classe choisie ; idempotente. */
  reclasserReponse(decisionId: string, par: string): Promise<{ reponse_id: string; classe: ClasseReponse; prospect_id: string | null; conversation_id: string | null } | null>
  reponsesReclassees(limite: number): Promise<ReponseARepondre[]>
  actesFaits(reponseId: string): Promise<void>
  /** Ajoute au prospect entrant de cette conversation l'adresse qu'il a donnée ; rien pour un prospect froid. */
  ajouterEmailEntrant(conversationId: string, email: string): Promise<boolean>
  exportPersonne(prospectId: string): Promise<Record<string, unknown>>
  /** L'effacement se fait 7 jours plus tard, après la confirmation. */
  demanderEffacement(prospectId: string): Promise<{ efface_le: string }>
  conversation(id: string): Promise<Conversation | null>
  enregistrerConversation(c: Conversation): Promise<void>
  creerLienRdv(prospectId: string, jetonHache: string, expireLe: string): Promise<void>
  rdvParJeton(jetonHache: string): Promise<LienRdv | null>
  creneauxPris(depuis: string, jusqua: string): Promise<string[]>
  reserverRdv(jetonHache: string, creneau: string, telephone: string): Promise<ResultatRegle>
  creerDecision(d: DecisionAcquisition): Promise<{ id: string; cree: boolean }>
}
/** Migration 0111 (026-063). */
export interface MagasinEnvoi {
  etatEnvoi(): Promise<EtatEnvoi>
  signal(s: Signal): Promise<void>
  modelesSuspendus(): Promise<string[]>
  suspendreModele(modeleId: string, motif: string): Promise<void>
  /** false au-delà du plafond. */
  jaugeConsommer(fournisseur: string, n: number): Promise<boolean>
  jauges(): Promise<Jauge[]>
  echantillonDuSoir(jour: string): Promise<EnvoiApprouve[]>
  /** Réserve l'envoi AVANT qu'il parte (0122, acq_envoi_reserver) : approuve → en_cours_envoi, une seule tentative gagne. Raisons d'un refus : pause, plafond, deja_reserve, statut, introuvable, accord_perime, cle. */
  reserverEnvoi(id: string, cle: string): Promise<ResultatRegle>
  /** L'issue de l'envoi est inconnue (0122, acq_envoi_incertain) : il ne repart jamais tout seul, un contrôle le réconcilie (acq_envoi_reconcilier). */
  marquerIncertain(id: string, raison: string): Promise<void>
}
export type Magasin = MagasinSocle & MagasinEchanges & MagasinEnvoi

// ── Étapes et transitions (0096) ──────────────────────────────────────────────────────────────────────────────────────────
/** Les étapes absentes des clés (rejete, sans_canal, oppose) sont terminales. */
export const TRANSITIONS: Readonly<Partial<Record<Etape, readonly Etape[]>>> = Object.freeze({
  candidat: Object.freeze(['recense', 'sans_canal', 'rejete', 'oppose', 'a_decider'] as const),
  recense: Object.freeze(['verifie', 'rejete', 'oppose', 'a_decider'] as const),
  verifie: Object.freeze(['maquette_prete', 'prepare', 'oppose'] as const),
  /** `lien_prepare` : un entrant seulement, sa demande vaut « oui » (revue du 25/09). */
  maquette_prete: Object.freeze(['prepare', 'lien_prepare', 'oppose'] as const),
  prepare: Object.freeze(['envoye', 'verifie', 'maquette_prete', 'oppose'] as const),
  envoye: Object.freeze(['oui', 'non', 'oppose', 'a_decider'] as const),
  oui: Object.freeze(['lien_prepare', 'oppose'] as const),
  lien_prepare: Object.freeze(['lien_envoye', 'oui', 'oppose'] as const),
  lien_envoye: Object.freeze(['oppose'] as const),
  non: Object.freeze(['oppose'] as const),
  a_decider: Object.freeze(['candidat', 'recense', 'rejete', 'oppose'] as const),
})

// ── Métiers ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Metier {
  id: string
  libelle: string
  naf: readonly string[]
  terme_meta: string
}
export const METIERS: readonly Metier[] = Object.freeze([
  { id: 'menuisier', libelle: 'Menuisier', naf: ['43.32A'], terme_meta: 'menuiserie' },
  { id: 'plombier', libelle: 'Plombier', naf: ['43.22A'], terme_meta: 'plombier' },
  { id: 'chauffagiste', libelle: 'Chauffagiste', naf: ['43.22B'], terme_meta: 'chauffagiste' },
  { id: 'electricien', libelle: 'Électricien', naf: ['43.21A'], terme_meta: 'électricien' },
  { id: 'couvreur', libelle: 'Couvreur', naf: ['43.91B'], terme_meta: 'couvreur' },
  { id: 'charpentier', libelle: 'Charpentier', naf: ['43.91A'], terme_meta: 'charpente' },
  { id: 'carreleur', libelle: 'Carreleur', naf: ['43.33Z'], terme_meta: 'carrelage' },
  { id: 'peintre', libelle: 'Peintre en bâtiment', naf: ['43.34Z'], terme_meta: 'peinture bâtiment' },
  { id: 'macon', libelle: 'Maçon', naf: ['43.99C'], terme_meta: 'maçonnerie' },
  { id: 'serrurier', libelle: 'Serrurier', naf: ['43.32B'], terme_meta: 'serrurier' },
  { id: 'plaquiste', libelle: 'Plaquiste', naf: ['43.31Z'], terme_meta: 'plaquiste' },
].map((m) => Object.freeze({ ...m, naf: Object.freeze([...m.naf]) })))
/** La division 43 (travaux de construction spécialisés) et la construction de maisons (41.20A, 41.20B). */
export const NAF_BATIMENT: readonly string[] = Object.freeze([
  '41.20A', '41.20B',
  '43.11Z', '43.12A', '43.12B', '43.13Z',
  '43.21A', '43.21B', '43.22A', '43.22B', '43.29A', '43.29B',
  '43.31Z', '43.32A', '43.32B', '43.32C', '43.33Z', '43.34Z', '43.39Z',
  '43.91A', '43.91B', '43.99A', '43.99B', '43.99C', '43.99D', '43.99E',
])
/** Jamais une `marque` du Studio : santé, pharmacie, armes, jeux d'argent, tabac, alcool. */
export const NAF_EXCLUS_MARQUE: readonly string[] = Object.freeze([
  '86.10Z', '86.21Z', '86.22A', '86.22B', '86.22C', '86.23Z', '86.90A', '86.90B', '86.90C', '86.90D', '86.90E', '86.90F',
  '21.10Z', '21.20Z', '46.46Z', '47.73Z', '47.74Z',
  '25.40Z', '47.78B',
  '92.00Z',
  '12.00Z', '46.35Z', '47.26Z',
  '11.01Z', '11.02A', '11.02B', '11.03Z', '11.04Z', '11.05Z', '11.06Z', '46.34Z', '47.25Z',
])
/**
 * Les produits vendus en ligne que la vigie cherche pour la cible `marque` (026-072). Gelé : écrit par Claude Code, approuvé
 * une fois par Benj.
 */
export const TERMES_MARQUES: readonly string[] = Object.freeze([
  'bougie parfumée', 'cosmétique naturel', 'bijoux fantaisie', 'vêtements enfant', 'maroquinerie', 'thé en vrac',
  'café torréfié', 'accessoires chien', 'décoration intérieure', 'linge de lit', 'savon artisanal', 'chaussures cuir',
  'sac à dos', 'lunettes de soleil', 'montre bois', 'céramique artisanale', 'vêtements de sport', 'jouets en bois',
  'épicerie fine', 'papeterie',
])

// ── Réseau ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** L'en-tête d'un robot qui lit un site, pas un message : la règle « jamais prestiapp.fr » vise les messages. */
export const UA_RECENSEUR = 'PrestiRecenseur/1.0 (+https://prestiapp.fr/confidentialite#prospection)'
/**
 * Annuaires et plateformes : jamais le site de l'entreprise (modèle : scripts/emails-artisans-qa.mjs:21). Un domaine en est
 * s'il l'égale ou en est un sous-domaine.
 */
export const DOMAINES_EXCLUS: readonly string[] = Object.freeze([
  'pagesjaunes.fr', 'societe.com', 'pappers.fr', 'infogreffe.fr', 'habitatpresto.com', 'travaux.com', 'starofservice.com',
  'houzz.fr', 'houzz.com', 'mappy.com', 'cylex.fr', 'cylex-france.fr', '118712.fr', '118000.fr', 'kompass.com',
  'facebook.com', 'fb.com', 'instagram.com', 'linkedin.com', 'google.com', 'google.fr', 'verif.com', 'manageo.fr',
  'justacote.com', 'hellopro.fr', 'europages.fr', 'lesbonsartisans.fr', 'quotatis.fr', 'batiweb.com', 'ootravaux.fr',
  'yelp.fr', 'yelp.com', 'infobel.com', 'hoodspot.fr', 'capeb.fr',
])
/** Hébergeurs, créateurs de sites et agences : un domaine de ces fournisseurs n'est jamais celui de l'artisan. */
export const DOMAINES_TIERS: readonly string[] = Object.freeze([
  'ovh.com', 'ovh.net', 'ovhcloud.com', 'ionos.fr', 'ionos.com', 'o2switch.fr', 'o2switch.net', 'gandi.net', 'hostinger.fr',
  'hostinger.com', 'wix.com', 'wixsite.com', 'jimdo.com', 'jimdosite.com', 'wordpress.com', 'wordpress.org', 'godaddy.com',
  'planethoster.com', 'planethoster.net', 'infomaniak.com', 'infomaniak.ch', 'squarespace.com', 'webflow.io', 'shopify.com',
  'myshopify.com', 'simplesite.com', 'e-monsite.com', 'site-solocal.com', 'solocal.com',
])
/** Jamais une clé d'opposition de domaine ni un domaine de rattachement. */
export const MESSAGERIES_GRATUITES: readonly string[] = Object.freeze([
  'gmail.com', 'googlemail.com', 'outlook.fr', 'hotmail.fr', 'live.fr', 'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr',
  'laposte.net', 'yahoo.fr', 'icloud.com',
])
/** Jamais dans un formulaire, ni dans aucun message avant un « oui ». */
export const DOMAINE_PRINCIPAL = 'prestiapp.fr'

// ── Messages ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Garde-fou 1 : la première phrase de tout premier contact, mot pour mot (apostrophes droites). */
export const PREMIERE_PHRASE = 'Message commercial de Presti, rédigé et envoyé par l\'assistant IA de Presti. Ce n\'est pas une demande de devis.'
export const NOM_EXPEDITEUR = 'Benjamin Filiot – Presti'
/** L'adresse GitHub Pages de la notice, posée par 026-162 ; null d'ici là (J3 refuse alors tout formulaire : `notice_absente`). */
export const NOTICE_URL: string | null = 'https://benjaminfiliot-wq.github.io/presti-notice/'
/** La phrase qui dit d'où vient le contact, par source. */
export const SOURCES_LISTE: Readonly<Partial<Record<Source, string>>> = Object.freeze({
  ademe_rge: 'Votre site figure dans la liste publique des entreprises RGE de l\'ADEME.',
  meta: 'Votre publicité figure dans la bibliothèque publique des publicités de Meta.',
})

// ── Plafonds et paliers ───────────────────────────────────────────────────────────────────────────────────────────────────
/** Les graines de 0096 (026-010). Instagram et Facebook à froid : 0 (R5). Le formulaire s'ouvre par palier, jamais par une graine. */
export const PLAFONDS_DEFAUT: Readonly<Record<Canal, number>> = Object.freeze({
  instagram: 0,
  facebook: 0,
  formulaire_site: 0,
  email_sollicite: 50,
  reponse_privee: 50,
  messagerie: 100,
})
/** Voie gratuite §2, en formulaires par jour ouvré. P4 est le plafond des agents : au-delà, seul Benj. */
export const PALIERS: readonly Palier[] = Object.freeze([
  Object.freeze({ id: 'P0', par_jour: 5, jours_au_vert: 5, regle: '5 jours au vert' } as const),
  Object.freeze({ id: 'P1', par_jour: 10, jours_au_vert: 5, regle: '5 jours au vert' } as const),
  Object.freeze({ id: 'P2', par_jour: 20, jours_au_vert: null, regle: 'passage au bilan seulement (P2 lui-même ne demande que la sécurité)' } as const),
  Object.freeze({ id: 'P3', par_jour: 30, jours_au_vert: 5, regle: '5 jours au vert' } as const),
  Object.freeze({ id: 'P4', par_jour: 40, jours_au_vert: null, regle: 'plafond des agents : au-delà, seul Benj' } as const),
])
export const DATE_PREMIER_ENVOI = '2026-10-12'
/** R10 : le bilan du lundi qui suit le 100e contact froid. */
export const BILAN_CONTACTS = 100
export const EMAIL_SOLLICITE_JOUR = 50
/** Seuil de GO de la mesure à sec (026-165) : au moins 5 % de formulaires éligibles. */
export const SEUIL_ELIGIBLES = 0.05
/**
 * Voie gratuite §3.2, en compteurs absolus : 4 STOP sur 100 envois d'un modèle le suspendent ; 2 plaintes en 7 jours arrêtent
 * le formulaire jusqu'à Benj ; 1 avis d'abus l'arrête 48 h ; 3 échecs de soumission d'affilée mettent une technologie en
 * pause ; 300 envois sans réponse lèvent l'alerte « changer de message ». « Au vert » : 0 plainte, 0 avis d'abus, au plus
 * 3 STOP sur 100, moins de 3 échecs d'affilée, au moins une réponse positive dès P3.
 */
export const SEUILS = Object.freeze({ stop_100: 4, plaintes_7j: 2, avis_abus: 1, echecs_affilee: 3, sans_reponse: 300 } as const)

// ── Bornes des agents ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Le froid, suivant le palier. */
export const MAQUETTES_PAR_JOUR = 10
/** Les entrants, hors palier et hors parité : ils ont demandé leur maquette. */
export const MAQUETTES_ENTRANTS_JOUR = 5
export const REPONSES_MAX_PROSPECT_24H = 3
/** Ex-`REPONSES_MAX_BOITE_JOUR` : le filet contre une boucle de réponses sur le Gmail. */
export const REPONSES_MAX_JOUR = 20
/**
 * Aucune réponse à un message reçu moins de 10 min après notre dernier envoi QUAND celui-ci était déjà une réponse du
 * Répondeur, sauf STOP et RGPD : ce qui casse une boucle avec un répondeur automatique sans perdre le prospect qui répond
 * vite à une maquette.
 */
export const REPONSE_DELAI_MIN_MINUTES = 10
export const RGPD_REPONSES_MAX = 3
export const RGPD_FENETRE_JOURS = 35
export const META_APPELS_PAR_HEURE = 150
export const EXPIRATION_MAQUETTE_JOURS = 21
export const TENTATIVES_MAX = 3
export const DELAI_RECONTACT_JOURS = 90
export const PAS_MAINTENANT_JOURS = 90
export const MESSAGES_MAX_PAR_PROSPECT = 3
export const ECART_MIN_HEURES = 72
/** La seule relance : une fois, après un « oui », annoncée d'avance. Plus aucune relance à froid. */
export const RELANCE_MAQUETTE_JOURS = 4
export const FENETRE_META_HEURES = 24
export const REPONSE_PRIVEE_JOURS = 7
export const STOP_DELAI_MINUTES = 10
export const MOTS_MAX_FORMULAIRE = 120
/** Les proches : jamais comptés dans la mesure (plan §1.2). */
export const PROCHES: readonly string[] = Object.freeze(['filiot'])
export const EXTRAIT_MIN = 6
export const EXTRAIT_MAX = 120
export const BUDGET_EXECUTION_MS = 45000
