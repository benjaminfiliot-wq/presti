// La NATURE d'un courrier : de quoi ça parle.
//
// Axe strictement indépendant du statut (`a_traiter` / `repondu` / `classe`, migration 0069), qui
// dit, lui, si c'est FAIT. Mélanger les deux ferait disparaître du courrier : un message rangé
// « technique » n'est pas un message traité.
//
// Le classement est DÉTERMINISTE — comparaisons de chaînes sur l'expéditeur, le sujet et une liste
// blanche d'en-têtes. Aucun appel de modèle, pas même en secours : ça se paierait à chaque email
// reçu, et surtout le rangement d'hier ne serait pas celui d'aujourd'hui. Une règle qui se trompe
// doit pouvoir se relire et se corriger ; une réponse de modèle, non.
//
// Cette liste est dupliquée à trois endroits, par construction : la contrainte `check` de la
// migration 0072, la validation de `app/api/controle/courriers/[fil]/action/route.ts`, et ici.
// Toute modification touche les trois — c'est la leçon de `statut`, qui vivait déjà à trois places.
//
// AUCUNE NATURE NE DÉCLENCHE JAMAIS RIEN. Ni créditer, ni prolonger, ni résilier, ni rembourser.
// Le `From` d'un email est une déclaration de celui qui l'envoie : écrire « contact@prestiapp.fr »
// ne coûte rien à personne. C'est une aide au tri, pas une frontière de sécurité.

export const NATURES = [
  { cle: 'artisan', libelle: 'Artisan', urgence: 'agir', quoi: 'Un artisan inscrit vous écrit.' },
  { cle: 'prospect', libelle: 'Prospect', urgence: 'agir', quoi: 'Le formulaire du site, ou une réponse dans un fil que nous avons ouvert.' },
  { cle: 'abonnement', libelle: 'Abonnements & comptes', urgence: 'agir', quoi: 'L’argent et les comptes : paiement, changement d’offre, résiliation, litige, inscription.' },
  { cle: 'non_remise', libelle: 'Non remis', urgence: 'agir', quoi: 'Un message n’est jamais arrivé chez son destinataire.' },
  { cle: 'fournisseur', libelle: 'Fournisseurs', urgence: 'lire', quoi: 'Un service dont l’entreprise dépend : facture, quota, incident, échéance.' },
  { cle: 'technique', libelle: 'Technique', urgence: 'lire', quoi: 'Nos propres machines : alertes, erreurs, tâches, rapports.' },
  { cle: 'a_lire', libelle: 'À lire', urgence: 'lire', quoi: 'Aucune règle n’a pu prouver de quoi il s’agit. C’est le défaut, et c’est une pile à descendre.' },
  { cle: 'reponse_auto', libelle: 'Réponse automatique', urgence: 'archiver', quoi: 'Un répondeur : absence, accusé de réception.' },
  { cle: 'diffusion', libelle: 'Diffusion', urgence: 'archiver', quoi: 'Envoi en masse — l’en-tête de liste le dit.' },
] as const

export type Nature = (typeof NATURES)[number]['cle']
export type Urgence = (typeof NATURES)[number]['urgence']

export const CLES_NATURE: readonly string[] = NATURES.map((n) => n.cle)
export const estNature = (v: unknown): v is Nature => typeof v === 'string' && CLES_NATURE.includes(v)
export const libelleNature = (cle: string): string => NATURES.find((n) => n.cle === cle)?.libelle ?? cle

/** L'ordre d'affichage : par urgence, jamais par volume ni par alphabet.
 *
 *  La question qu'on se pose en ouvrant la boîte le matin est « qu'est-ce qui me demande d'agir
 *  aujourd'hui ? ». Un classement par volume mettrait les notifications techniques en tête, et
 *  c'est précisément ce qu'on ne veut pas voir en premier.
 *
 *  « À lire » ouvre son groupe : c'est la pile du doute, celle qui doit descendre chaque matin. */
export const GROUPES: { titre: string; urgence: Urgence; natures: readonly Nature[] }[] = [
  { titre: 'Ce qui attend une réponse', urgence: 'agir', natures: ['artisan', 'prospect', 'abonnement', 'non_remise'] },
  { titre: 'À lire', urgence: 'lire', natures: ['a_lire', 'fournisseur', 'technique'] },
  { titre: 'Rien à faire', urgence: 'archiver', natures: ['reponse_auto', 'diffusion'] },
]

/** Ce que l'écran écrit sous le titre d'un fil, en clair : pourquoi il est rangé là.
 *
 *  Une erreur de classement doit se VOIR, sinon elle se subit. On dit donc la règle qui a mordu,
 *  en français, et on propose la correction juste à côté. */
export function raisonDuMotif(motif: string | null): string {
  if (!motif) return 'Rangé sans raison enregistrée.'
  if (motif.startsWith('artisan')) return 'l’adresse est celle d’un artisan inscrit.'
  if (motif === 'formulaire:contact') return 'il vient du formulaire de contact du site.'
  if (motif === 'formulaire:contact+artisan') return 'il vient du formulaire du site, et l’adresse de réponse est celle d’un artisan inscrit.'
  if (motif === 'interne:argent') return 'ce sujet est celui que Presti écrit pour un paiement, une offre ou un compte.'
  if (motif === 'interne:simulation') return 'c’est une simulation d’alerte, lancée volontairement.'
  if (motif === 'interne:repertorie') return 'c’est une alerte que Presti s’envoie à lui-même.'
  if (motif === 'interne:non-repertorie') return 'il vient de Presti, mais aucune règle ne le reconnaît.'
  if (motif === 'remise:mime') return 'sa structure est un rapport de non-remise (RFC 3464).'
  if (motif === 'remise:daemon') return 'il vient d’un serveur de messagerie et signale un échec de remise.'
  if (motif === 'entete:auto-submitted') return 'l’en-tête « Auto-Submitted » dit que c’est un envoi automatique.'
  if (motif === 'entete:liste') return 'il porte un en-tête de liste de diffusion.'
  if (motif === 'dmarc:rapport') return 'c’est un rapport DMARC agrégé sur prestiapp.fr.'
  if (motif === 'fil:reponse') return 'c’est une réponse dans un fil que nous avons ouvert.'
  if (motif === 'fil') return 'il appartient à un fil déjà rangé.'
  if (motif.startsWith('domaine:')) return `il vient du domaine ${motif.slice(8)}.`
  if (motif === 'defaut') return 'aucune règle n’a pu dire de quoi il s’agit.'
  if (motif.endsWith(':retro')) return 'il a été rangé après coup, sans ses en-têtes d’origine.'
  return motif
}
