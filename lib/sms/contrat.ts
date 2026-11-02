// lib/sms/contrat.ts — le contrat de l'adaptateur SMS (plan du chantier 4 §11 ; R5 §7.2). AUCUN fournisseur ici : ce fichier ne
// dit que « ce qu'on demande » et « ce qu'on rend ». Les SMS de Presti sont ceux de l'artisan à SES clients (ADR-007) ;
// jamais de prospection, jamais de SMS commercial.
//
// Tout est À BLANC tant que Benj n'a pas choisi le fournisseur, approuvé le coût d'un segment par écrit et donné son « go » :
// drapeau `smsClients` baissé (lib/flags.ts), `SMS_COUT_APPROUVE = null` (lib/sms/tarifs.ts).

/** Les trois seuls types de SMS, en liste fermée. Tout autre est refusé à la porte 1. */
export const TYPES_SMS = ['rappel_rdv', 'devis_pret', 'rappel_paiement'] as const
export type TypeSms = (typeof TYPES_SMS)[number]
export const estTypeSms = (v: unknown): v is TypeSms => typeof v === 'string' && (TYPES_SMS as readonly string[]).includes(v)

/** Seule provenance de numéro admise : le client l'a donné pour CE chantier (`clients.tel_source`, migration 0186, non appliquée). */
export const TEL_SOURCES_ADMISES = ['donne_pour_chantier'] as const

/** Plafonds du plan §11 (porte 6), en fail-closed : 10 par artisan et 100 en tout par jour, 8 € HT au plus par jour. */
export const PLAFOND_ARTISAN_JOUR = 10
export const PLAFOND_TOTAL_JOUR = 100
export const PLAFOND_EUROS_HT_JOUR = 8
/** Segments par SMS : un seul. (Le plan §11 dit « deux au plus » à la porte 5 ; les trois types tiennent en un, on ferme plus étroit.) */
export const SEGMENTS_MAX = 1

export type DemandeSms = {
  artisanId: string
  /** Offre de l'artisan (`peut(plan, 'assistant')`, porte 2). */
  plan: string | null | undefined
  /** Le geste de l'artisan (niveau 2) : sans lui, rien ne part, même en Signature. */
  gesteArtisan: boolean
  type: TypeSms | string
  clientId: string
  /** Numéro tel que saisi (06…, +33…, 0033…) ; normalisé par `numero.ts`. */
  telephone: string
  /** Provenance du numéro (`clients.tel_source`). */
  telSource: string | null | undefined
  /** Nom de l'artisan, devenu l'expéditeur après validation (`expediteur.ts`). */
  nomArtisan: string
  /** Le texte, STOP compris. */
  texte: string
  /** L'objet concerné (rendez-vous, devis, facture) : avec l'artisan, le client et le type, il fait la clé d'idempotence. */
  reference: string
  /** « blanc » (défaut) : rien ne sort. « reel » : exige coût approuvé, fournisseur, magasin et disjoncteur. */
  mode?: 'blanc' | 'reel'
}

export type MessageFournisseur = { expediteur: string; destinataire: string; texte: string; cleIdempotence: string }

/** Ce que rend un fournisseur. Une exception, un délai dépassé ou une réponse illisible valent `incertain` : jamais renvoyé. */
export type ReponseFournisseur =
  | { etat: 'accepte'; idFournisseur: string }
  | { etat: 'refuse'; raison: string }
  | { etat: 'incertain'; raison: string }

export interface Fournisseur {
  readonly nom: string
  envoyer(message: MessageFournisseur): Promise<ReponseFournisseur>
}

export type Porte = 1 | 2 | 3 | 4 | 5 | 6

export type Estimation = {
  segments: number
  encodage: 'gsm7' | 'ucs2'
  /** Coût HT calculé par le code ; `null` = « inconnu » (tarif non sourcé), jamais un chiffre deviné. */
  coutHt: number | null
  coutEtat: 'connu' | 'inconnu'
}

export type ResultatSms =
  | { etat: 'simule'; cle: string; estimation: Estimation; expediteur: string; destinataire: string }
  | { etat: 'envoye'; cle: string; estimation: Estimation; idFournisseur: string }
  | { etat: 'incertain'; cle: string; raison: string }
  | { etat: 'refuse'; porte: Porte; raison: string; cle?: string }

/** Le magasin des envois (la table `sms_envois` et `sms_oppositions` quand 0186 sera posée). Une lecture qui lève = doute = refus. */
export interface MagasinSms {
  opposition(numeroE164: string): Promise<boolean>
  etatDeLaCle(cle: string): Promise<'en_cours' | 'envoye' | 'incertain' | 'echec' | null>
  /** Pose la clé de façon atomique ; `false` si elle existe déjà. */
  reserver(cle: string, artisanId: string, segments: number): Promise<boolean>
  marquer(cle: string, etat: 'envoye' | 'incertain' | 'echec', idFournisseur?: string): Promise<void>
  compteursDuJour(artisanId: string): Promise<{ artisan: number; total: number; segmentsTotal: number }>
}
