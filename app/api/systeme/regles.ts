// LE SYSTÈME D'ASSISTANTS — règles pures des lectures (prompt 6, lot 036-011). Aucun accès à la base ici : ce module se rejoue
// tel quel dans scripts/interface-p6-qa.mjs (le juge), avec le drapeau baissé puis levé.
//
// Ce que ces lectures ne font jamais : écrire, lire un secret de connexion, décider d'un palier. L'app ne fait que l'interface
// (n8n-first, .claude/rules/architecture-outils.md) ; toute action passe par les routes qui existent déjà.
import { actif } from '@/lib/flags'
import { peut, type Capacite } from '@/lib/plans'

export const VUES = ['accueil', 'fait', 'connexions', 'departements', 'clients'] as const
export type VueSysteme = (typeof VUES)[number]
export const estVue = (v: string): v is VueSysteme => (VUES as readonly string[]).includes(v)

/** Drapeau baissé (ou absent) : la route n'existe pas, 404 avant toute session et toute lecture. */
export function decisionGarde(p: { drapeau: boolean; session: { ok: true } | { ok: false; statut: number; erreur: string } }): { ok: true } | { ok: false; statut: number; erreur: string } {
  if (!p.drapeau) return { ok: false, statut: 404, erreur: 'introuvable' }
  if (!p.session.ok) return { ok: false, statut: p.session.statut, erreur: p.session.erreur }
  return { ok: true }
}
export const drapeauSysteme = (): boolean => actif('systemeAgents')

/** Les colonnes lues, table par table. `connexions` ne liste JAMAIS secret_app ni secret_n8n : le juge le vérifie sur ce texte. */
export const COLONNES = {
  assistant_actions: 'id, outil, mode, statut, titre, apercu, resultat_resume, objet_type, cree_le, maj_le, expire_le',
  actions_auto: 'id, type, libelle, prete_le, part_le, statut, motif, traite_le',
  leads: 'id, nom_prospect, type_chantier, canal, statut, created_at',
  connexions: 'id, fournisseur, compte_affiche, etat, motif_erreur, verifiee_le, derniere_synchro, expire_le, retiree_le',
  departements_reglages: 'departement, palier, en_marche, plafond_jour, plafond_cout_centimes_jour, maj_le',
  couts_ia_jour: 'jour, departement, appels, cout_centimes',
} as const

/** Une table de 0193 pas encore posée : la lecture dit « pas encore ouvert », jamais une fausse donnée. */
export const tableAbsente = (e: { code?: string; message?: string } | null | undefined): boolean =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table|schema cache/i.test(e.message ?? ''))

export type Offre = 'signature' | 'studio'
/** Signature = le compte a le pilote (peut), jamais une comparaison de nom d'offre. */
export const estSignature = (plan: string | null | undefined): boolean => peut(plan, 'assistant.pilote')
export const offreDe = (plan: string | null | undefined): Offre => (estSignature(plan) ? 'signature' : 'studio')

/** Les sept départements du plan (§ 3.2) : titre, rôle, puis chaque type de travail. `capacite` = ce que `peut()` doit accorder pour que
 *  « part seul » soit ouvert ; `toujours` = les gestes que l'offre n'ouvre jamais (OUTILS_JAMAIS_AUTO) ; `bientot` = pas encore ouvert. */
export type TypeTravail = {
  id: string; nom: string; detail: string
  capacite?: Capacite
  toujours?: boolean
  bientot?: boolean
  /** Type du pilote (actions_auto.type) qui compte l'envoi du jour. */
  typePilote?: string
}
export type Departement = { id: string; titre: string; role: string; types: TypeTravail[]; interne?: { id: string; nom: string; detail: string }[] }

export const DEPARTEMENTS: Departement[] = [
  { id: 'accueil', titre: 'Accueil et réponse', role: 'Lit vos demandes et vos e-mails, prépare la réponse en moins d’une minute.', types: [
    { id: 'reponse-demande', nom: 'Réponse à une nouvelle demande', detail: 'Une demande sensible (litige, prix ferme, client mécontent) vous revient toujours.', capacite: 'plateforme.ia.auto', typePilote: 'reponse_prospect' },
    { id: 'reponse-client', nom: 'Réponse à un client existant', detail: 'Questions de suivi, date de passage, documents.', capacite: 'assistant.pilote', typePilote: 'assistant_client' },
  ] },
  { id: 'devis', titre: 'Devis', role: 'Chiffre sur vos tarifs ; une ligne sans tarif est marquée « estimé » et attend votre prix.', types: [
    { id: 'envoi-devis', nom: 'Envoi d’un devis', detail: 'Part seul seulement si tous ses prix viennent de vos tarifs.', capacite: 'assistant.pilote', typePilote: 'envoi_devis' },
  ] },
  { id: 'suivi', titre: 'Suivi et relances', role: 'Relance à J+2, J+5 et J+10, jamais deux fois en trois jours.', types: [
    { id: 'relance-conversation', nom: 'Relance d’une conversation', detail: 'Quand un client ne répond plus.', capacite: 'relances.auto' },
    { id: 'relance-devis', nom: 'Relance d’un devis', detail: 'Rien si le client a écrit, appelé ou signé entre-temps.', capacite: 'assistant.pilote', typePilote: 'relance_devis' },
  ] },
  { id: 'facturation', titre: 'Facturation et encaissement', role: 'Prépare la facture quand le chantier est fini ; relance jusqu’au paiement ou au motif.', types: [
    { id: 'envoi-facture', nom: 'Envoi d’une facture déjà émise', detail: 'La facture que vous avez émise, avec son lien de paiement.', capacite: 'assistant.pilote', typePilote: 'envoi_facture' },
    { id: 'relance-impaye', nom: 'Relance d’impayé', detail: 'S’arrête au paiement, ou au motif que vous rangez (contestation, échéancier).', capacite: 'factures.relances.auto', typePilote: 'relance_impaye' },
    { id: 'emettre-facture', nom: 'Émettre une facture, marquer payée', detail: 'C’est de l’argent : toujours votre clic.', toujours: true },
  ] },
  { id: 'apres', titre: 'Après-chantier et avis', role: 'Demande l’avis par un canal que le client a accepté ; prépare les réponses.', types: [
    { id: 'demande-avis', nom: 'Demande d’avis après chantier', detail: 'Pas encore ouvert à l’envoi seul.', bientot: true },
    { id: 'rappel-entretien', nom: 'Rappel d’entretien', detail: 'Pas encore ouvert à l’envoi seul.', bientot: true },
    { id: 'avis-negatif', nom: 'Réponse à un avis négatif', detail: 'Vous revient toujours, quelle que soit l’offre.', toujours: true },
  ] },
  { id: 'operations', titre: 'Agenda, chantiers et stock', role: 'Lit vos créneaux libres et votre stock ; prépare rendez-vous et commandes.', types: [
    { id: 'rendez-vous', nom: 'Rendez-vous sur un créneau libre', detail: 'Le créneau est lu dans votre agenda ; il ne se pose qu’après votre clic.', toujours: true },
    { id: 'rappel-veille', nom: 'Rappel la veille du rendez-vous', detail: 'Pas encore ouvert à l’envoi seul.', bientot: true },
    { id: 'commande-fournisseur', nom: 'Commande fournisseur', detail: 'C’est une dépense : toujours votre clic.', toujours: true },
  ] },
  { id: 'direction', titre: 'Votre direction', role: 'Pour vous seul : rien n’y part chez un client.', types: [], interne: [
    { id: 'page-matin', nom: 'Page du matin', detail: 'Chaque jour à 7 h 30, pour vous seul.' },
    { id: 'rapport-lundi', nom: 'Rapport du lundi', detail: 'Ce qui a rapporté la semaine passée, en euros.' },
  ] },
]

export type EtatVerrou = 'libre' | 'offre' | 'toujours' | 'bientot'
/** L'état d'un type pour une offre : le verrou d'offre passe par peut(), jamais par le nom de l'offre. */
export function verrouDe(plan: string | null | undefined, t: TypeTravail): EtatVerrou {
  if (t.toujours) return 'toujours'
  if (t.bientot) return 'bientot'
  if (t.capacite && !peut(plan, t.capacite)) return 'offre'
  return 'libre'
}

/** Les 19 outils de OUTILLAGE.md § 5, rangés comme la maquette « Connexions ». `fournisseur` = la valeur de connexions.fournisseur (0193)
 *  quand la table sait le dire ; `null` = pas encore branchable (la ligne dit « Connecter », sans jamais afficher une fausse donnée). */
export type OutilConnexion = { id: string; nom: string; logo: string; role: string; fournisseur: string | null; note?: string; sms?: boolean }
export const GROUPES_CONNEXIONS: { id: string; titre: string; outils: OutilConnexion[] }[] = [
  { id: 'mail', titre: 'Boîte mail', outils: [
    { id: 'gmail', nom: 'Gmail', logo: 'G', role: 'Lit vos nouveaux e-mails toutes les 5 minutes et écrit les réponses dans vos brouillons.', fournisseur: 'gmail' },
    { id: 'outlook', nom: 'Outlook', logo: 'O', role: 'Boîte Outlook ou Microsoft 365 : lecture des e-mails, réponses en brouillon.', fournisseur: 'outlook' },
    { id: 'imap-smtp', nom: 'Autre boîte mail (Orange, Free, SFR, OVH…)', logo: '@', role: 'Orange, Free, SFR, OVH… avec un mot de passe d’application que vous créez chez votre fournisseur.', fournisseur: 'imap' },
  ] },
  { id: 'agenda', titre: 'Agenda', outils: [
    { id: 'google-agenda', nom: 'Google Agenda', logo: 'GA', role: 'Lit vos créneaux libres pour en proposer. Aucun rendez-vous n’est posé sans vous.', fournisseur: 'google_agenda' },
    { id: 'outlook-agenda', nom: 'Outlook Agenda', logo: 'OA', role: 'Créneaux libres lus dans votre agenda Microsoft.', fournisseur: 'outlook_agenda' },
  ] },
  { id: 'docs', titre: 'Documents et tableurs', outils: [
    { id: 'google-drive', nom: 'Google Drive', logo: 'D', role: 'Range vos devis, factures et photos de chantier dans vos dossiers.', fournisseur: 'google_drive' },
    { id: 'onedrive', nom: 'OneDrive', logo: 'OD', role: 'Même rangement, dans vos dossiers Microsoft.', fournisseur: 'onedrive' },
    { id: 'google-sheets', nom: 'Google Sheets', logo: 'S', role: 'Vos tarifs ou un export, lus pour chiffrer sur vos prix.', fournisseur: null },
    { id: 'excel', nom: 'Excel', logo: 'X', role: 'Les mêmes tableaux, dans OneDrive.', fournisseur: null },
  ] },
  { id: 'avis', titre: 'Avis', outils: [
    { id: 'fiche-google', nom: 'Fiche Google', logo: 'F', role: 'Lire vos avis et y préparer une réponse. Un avis négatif vous revient toujours.', fournisseur: 'fiche_google', note: 'Google ouvre cet accès sur demande. En attendant, collez un avis dans la conversation : la réponse est préparée.' },
  ] },
  { id: 'messages', titre: 'Messageries', outils: [
    { id: 'whatsapp', nom: 'WhatsApp Business', logo: 'W', role: 'Les messages de vos clients arrivent dans leur conversation.', fournisseur: 'whatsapp' },
    { id: 'telegram', nom: 'Telegram', logo: 'T', role: 'Messages de vos clients, et vos alertes sur votre téléphone.', fournisseur: 'telegram' },
    { id: 'sms', nom: 'SMS', logo: 'SMS', role: 'Aujourd’hui, le SMS s’ouvre prêt à partir sur votre téléphone, d’un geste. L’envoi automatique ouvrira après accord sur son tarif.', fournisseur: null, sms: true },
  ] },
  { id: 'reseaux', titre: 'Réseaux', outils: [
    { id: 'facebook', nom: 'Facebook', logo: 'FB', role: 'Messenger et les formulaires de vos publicités : chaque contact devient une demande.', fournisseur: null },
    { id: 'instagram', nom: 'Instagram', logo: 'IG', role: 'Les messages privés de votre compte professionnel.', fournisseur: null },
    { id: 'linkedin', nom: 'LinkedIn', logo: 'in', role: 'Les messages de votre page. Aucun contact n’est collecté.', fournisseur: null },
  ] },
  { id: 'paiement', titre: 'Paiements', outils: [
    { id: 'stripe', nom: 'Stripe', logo: 'St', role: 'Lit les paiements reçus, pour arrêter une relance dès que le client a payé. Ne débite rien.', fournisseur: 'stripe_artisan' },
  ] },
  { id: 'equipe', titre: 'Équipe', outils: [
    { id: 'slack', nom: 'Slack', logo: 'Sl', role: 'Reçoit la page du matin et les alertes dans un canal de votre choix.', fournisseur: null },
    { id: 'teams', nom: 'Teams', logo: 'Te', role: 'La même chose dans Microsoft Teams.', fournisseur: null },
  ] },
]

/** Jour de Paris (AAAA-MM-JJ) : celui des coûts du jour, comme le calcule la base. */
export function jourParis(d: Date): string {
  const p = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  return p
}
