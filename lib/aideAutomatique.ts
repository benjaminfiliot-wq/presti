// Centre d'aide : « Ce qui est automatique », « Qui a quoi » et les pastilles d'offre.
//
// Règle d'exactitude (la même que lib/aide.ts) : chaque phrase décrit un comportement VU dans le code, et le commentaire
// `// source:` au-dessus de chaque entrée donne le fichier et la ligne vérifiés à la rédaction. Les nombres qui existent déjà
// dans le code sont LUS (ESSAI_JOURS, PLANS, DUREES_MOIS, creditsEssai) ; ceux qu'on ne peut pas importer côté navigateur
// (réglage par défaut des réponses, cadence des relances) sont écrits ici ET contrôlés contre leur source par
// scripts/aide-automatique-qa.mjs. Les offres, elles, ne sont JAMAIS écrites : elles sortent de PLANS (lib/plans.ts).
//
// Module pur, sans réseau ni base : il se charge aussi bien côté navigateur que dans les suites de test.

import { ASSISTANT_TOURS_MAX, ESSAI_CREDITS_PLAFOND, ESSAI_JOURS, PLANS, peut, type Capacite, type PlanId, type PlanPayant } from './plans'
import { creditsEssai } from './essaiGratuit'
import { FLAGS, type Flag } from './flags'
import { DUREES_MOIS } from './legalArtisan'

/** Le délai d'annulation et le plafond du Pilote automatique : écrits ici (le module du pilote importe par alias, pas le navigateur
 *  de l'aide), contrôlés contre lib/pilote/regles.ts par scripts/aide-automatique-qa.mjs. */
export const PILOTE_DELAI_MIN = 10
export const PILOTE_PLAFOND_JOUR = 20

// ─── Les offres, du plus petit au plus grand ──────────────────────────────────────────────────────────
// 25/10 (Benj) : deux offres vendues, Studio et Signature. L'Essentiel n'est plus vendu : l'aide ne le nomme plus (un compte resté
// sur cet identifiant a les capacités de l'essai, lib/plans.ts BASE).
export type OffreAide = Extract<PlanId, 'gratuit' | 'studio' | 'signature'>
export const OFFRES_AIDE: readonly OffreAide[] = ['gratuit', 'studio', 'signature']

/** Le nom de l'offre tel que l'artisan le lit. L'offre `gratuit` s'appelle « Essai » dans PLANS ; l'aide dit « Gratuit ». */
export const NOM_OFFRE: Record<OffreAide, string> = { gratuit: 'Gratuit', studio: PLANS.studio.label, signature: PLANS.signature.label }

/** La première offre qui inclut une capacité (les offres au-dessus l'incluent aussi : les capacités s'empilent dans lib/plans.ts). */
export function offrePremiere(cap: Capacite | null): OffreAide {
  if (!cap) return 'gratuit'
  return OFFRES_AIDE.find((o) => peut(o, cap)) ?? 'signature'
}

/** La phrase de l'info-bulle d'une pastille. */
export function titrePastille(o: OffreAide): string {
  return o === 'gratuit'
    ? `Inclus dès l’offre Gratuit (l’essai, ${PLANS.gratuit.creditsMois} crédits), donc dans toutes les offres.`
    : `Inclus dès l’offre ${NOM_OFFRE[o]} ; les offres au-dessus l’incluent aussi.`
}

/**
 * Quelle capacité (lib/plans.ts) donne accès à chaque entrée du centre d'aide, par identifiant d'article OU de vidéo
 * (les deux familles partagent les mêmes identifiants quand elles parlent du même écran).
 * `null` : aucun verrou d'offre sur l'écran. `'a_part'` : ne fait partie d'aucune offre (le site se commande à part).
 */
export const CAPACITE_AIDE: Record<string, Capacite | null | 'a_part'> = {
  // source : lib/plans.ts BASE (devis.ia, devis.prix_artisan, factures) ; STUDIO (plateforme.*, chiffres, inventaire.*, canaux.email, assistant) ; SIGNATURE (crm, assistant.pilote, *.auto)
  dashboard: null, tarifs: 'devis.prix_artisan', profil: null, abonnement: null, support: null, offres: null, parametres: null,
  'parametres.legal': null, 'parametres.notifications': null, 'parametres.securite': null, 'parametres.donnees': null,
  devis: 'devis.ia', 'devis.editeur': 'devis.ia', factures: 'factures', 'devis.lots': 'factures', 'factures.types': 'factures',
  outils: 'plateforme.conversation', messages: 'plateforme.conversation', canaux: 'canaux.email', plateforme: 'plateforme.gestion',
  chiffres: 'chiffres', inventaire: 'inventaire.stock',
  crm: 'crm', 'crm.accueil': 'crm', 'crm.chantier': 'crm', 'crm.agenda': 'crm', assistant: 'assistant', pilote: 'assistant.pilote',
  site: 'a_part',
}

/** L'offre à afficher pour une entrée du centre d'aide, ou `null` quand l'entrée est « commandée à part ». */
export function offreAide(id: string): OffreAide | null {
  const c = CAPACITE_AIDE[id]
  if (c === 'a_part') return null
  return offrePremiere(c ?? null)
}

// ─── « Ce qui est automatique » ───────────────────────────────────────────────────────────────────────
export type EntreeAuto = {
  id: string
  titre: string
  texte: string
  /** La capacité qui donne accès (null : tous les comptes). */
  cap: Capacite | null
  /** L'entrée n'est montrée que si ce drapeau (lib/flags.ts) est levé : une fonctionnalité non finie n'apparaît pas. */
  flag?: Flag
  /** Réglage à cocher ? Vrai : rien ne se passe tant que l'artisan ne l'a pas activé lui-même. */
  surDemande?: boolean
}

const mois = (n: number) => `${n} mois`

/** Réglage par défaut des réponses : copié de lib/plateformeConfig.ts (CONFIG_DEFAUT, l.45 et l.57), contrôlé par scripts/aide-automatique-qa.mjs. */
export const REPONSES_PAR_CONVERSATION = 8
/** Cadence des relances de conversation : copiée de lib/relances.ts (CADENCE_RELANCES, l.21), contrôlée de même. */
export const CADENCE_CONVERSATION = [2, 5, 10] as const
/** Calendrier par défaut des relances d'impayés : copié de lib/relancesImpayes.ts (JOURS_PAR_DEFAUT, l.28 ; MAX_PAR_COMPTE_JOUR, l.25), contrôlé de même. */
export const CADENCE_IMPAYES = [3, 10, 21] as const
export const IMPAYES_MAX_PAR_JOUR = 10

const j = (c: readonly number[]) => c.map((n) => `J+${n}`).join(', ')

export const AUTOMATIQUE_SANS_ASSISTANT: EntreeAuto[] = [
  // source : lib/plateformeConfig.ts:45 (mode_reponse 'assistee' par défaut), :162 (en mode assistée, la réponse n'est pas envoyée), :183-185 (modeEffectif)
  {
    id: 'reponse-proposee',
    titre: 'Une réponse est rédigée pour chaque nouvelle demande',
    texte: 'Quand un visiteur vous écrit sur votre page de conversation, l’assistant rédige la réponse à sa place. Par défaut (mode « Assistée »), elle vous attend dans Messages : rien ne part chez votre client sans votre validation.',
    cap: 'plateforme.conversation',
  },
  // source : lib/plans.ts SIGNATURE (plateforme.ia.auto, 25/10) ; lib/plateformeConfig.ts:57 (limite_messages), :56 (mots d'alerte), :184 (verrou d'offre) ; app/api/leads/route.ts:368-371 (alerte à l’artisan)
  {
    id: 'reponse-seule',
    titre: 'Réponse envoyée seule, jour et nuit (mode « Automatique », à choisir vous-même)',
    texte: `Avec l’offre ${NOM_OFFRE[offrePremiere('plateforme.ia.auto')]}, dans Ma plateforme, vous pouvez laisser l’assistant répondre sans vous, 24 h sur 24 ou sur la plage horaire de votre choix, dans la limite de ${REPONSES_PAR_CONVERSATION} réponses par conversation (réglable). Si le message contient un mot d’alerte (urgence, fuite, gaz…), il se tait et vous êtes prévenu. Avec l’offre ${NOM_OFFRE[offrePremiere('plateforme.conversation')]}, le compte reste en « Assistée » : la réponse est préparée, vous la validez d’un clic.`,
    cap: 'plateforme.ia.auto',
    surDemande: true,
  },
  // source : lib/relances.ts:21 (cadence), :34-51 (armement après une réponse) ; app/api/cron/relances/route.ts:87 (seule une conversation « répondue » est relancée), :102 (offre avec plateforme), :110-115 (compte suspendu, page en pause),
  // :159-180 (25/10 : sans `relances.auto`, la relance est PROPOSÉE dans le fil et part au clic de l’artisan) ; mention de l’assistant à l’envoi seul
  {
    id: 'relances-conversation',
    titre: `Relances des conversations (${j(CADENCE_CONVERSATION)})`,
    texte: `Après une réponse envoyée à un visiteur, trois relances sont prévues s’il ne répond pas : ${j(CADENCE_CONVERSATION)}. Avec l’offre ${NOM_OFFRE[offrePremiere('relances')]}, chacune est rédigée pour vous et vous attend dans Messages : vous êtes prévenu, et elle ne part qu’après votre clic. Avec l’offre ${NOM_OFFRE[offrePremiere('relances.auto')]}, elles partent seules, sans relecture, et chacune dit qu’elle vient de l’assistant. Elles s’arrêtent dès que la conversation n’attend plus de lui, quand votre page est en pause, ou si le compte est suspendu.`,
    cap: 'relances',
  },
  // source : lib/relancesImpayes.ts:6-21 (règles ; 25/10 : préparée « a_valider » sans `factures.relances.auto`), :25 (10 par jour), :28 (J+3, J+10, J+21), :33 (désactivé par défaut), pied « envoyé automatiquement » à l’envoi seul ;
  // lib/relancesImpayesTour.ts:14-17, :81 ; app/api/cron/relances/route.ts
  {
    id: 'relances-impayes',
    titre: `Relances des factures impayées (${j(CADENCE_IMPAYES)} après l’échéance)`,
    texte: `Si vous cochez « Relancer automatiquement mes factures échues » (dans Factures), une relance est prévue ${j(CADENCE_IMPAYES)} après l’échéance (réglable, de 1 à 3 relances), avec votre texte. Avec l’offre ${NOM_OFFRE[offrePremiere('factures.relances.auto')]}, l’e-mail part seul et précise qu’il est automatique. Avec l’offre ${NOM_OFFRE[offrePremiere('factures.relances')]}, il est préparé, vous êtes prévenu, et il ne part que lorsque vous l’envoyez depuis Factures. Tant que vous ne cochez pas, rien n’est prévu. Chaque relance s’arrête dès que la facture est payée ou annulée, ou que le client écrit ; au plus ${IMPAYES_MAX_PAR_JOUR} par jour et par compte.`,
    cap: 'factures.relances',
    flag: 'relancesImpayes',
    surDemande: true,
  },
  // source : lib/devisExpiration.ts:1-14 ; app/api/cron/relances/route.ts:222-232
  {
    id: 'devis-expires',
    titre: 'Les devis dépassés passent en « expiré »',
    texte: 'Chaque jour, un devis envoyé dont la durée de validité est dépassée passe au statut « expiré ». Rien n’est envoyé à votre client, et vous pouvez rouvrir le devis depuis l’écran Devis.',
    cap: 'devis.ia',
  },
  // source : lib/purgesRgpd.ts:12-30 ; lib/legalArtisan.ts:145-171 (DUREES_MOIS) ; app/api/cron/relances/route.ts:201-212
  {
    id: 'purges',
    titre: 'Les données trop anciennes s’effacent seules',
    texte: `Chaque jour, Presti efface ce qui a dépassé la durée annoncée dans la politique de confidentialité : les conversations sans échange depuis ${mois(DUREES_MOIS.conversation)} (sauf celles liées à un devis signé ou à une facture) et les empreintes anti-abus après ${mois(DUREES_MOIS.anti_abus)}. Vos factures, elles, ne sont jamais effacées : elles sont conservées ${DUREES_MOIS.comptable / 12} ans.`,
    cap: null,
  },
  // source : lib/crm/rappelsTour.ts:1-6, :51 (offre avec CRM) ; app/api/cron/relances/route.ts:297-310
  {
    id: 'rappels-matin',
    titre: 'Rappels du matin',
    texte: 'Chaque matin, si des rappels de votre CRM sont dus aujourd’hui ou en retard, une notification vous prévient (si elles sont activées sur votre appareil, Paramètres → Notifications). Rien n’est envoyé à un client.',
    cap: 'crm',
    flag: 'crm',
  },
  // source : lib/apresChantierTour.ts:1-8 ; app/api/cron/relances/route.ts:261-296
  {
    id: 'apres-chantier',
    titre: 'Après le chantier : avis et entretien (réglage à activer)',
    texte: 'Si vous l’activez, le CRM pose seul un rappel « Demander un avis » et un rappel « Proposer l’entretien » après chaque chantier terminé. Aucun message ne part chez le client sans que vous ayez relu et confirmé.',
    cap: 'crm',
    flag: 'crmApresChantier',
    surDemande: true,
  },
  // source : lib/crm/carte.ts:92-103 (peutValider, champsValidation) ; app/api/crm/taches/[id]/route.ts:43 ; lib/crm/serveur.ts:89-93 (éteint par défaut)
  {
    id: 'validation-chantier',
    titre: 'Valider un chantier, à la main ou tout seul',
    texte: 'Quand toutes les tâches d’un chantier sont cochées, le bouton « Valider le chantier » apparaît : il le termine et le retire de la carte (vos données restent). Le réglage « Valider automatiquement » (éteint par défaut) le fait dès que la dernière tâche est cochée.',
    cap: 'crm',
    flag: 'crmAtelierVivant',
    surDemande: true,
  },
  // source : lib/crm/avancementAuto.ts:7-9 ; app/crm/PointageCompagnon.tsx ; app/pointage/[jeton]/route.ts (jeton dont seule l'empreinte est gardée)
  {
    id: 'pointage-compagnon',
    titre: 'L’avancement par vos compagnons, sans compte (lien à créer)',
    texte: 'Dans la fiche d’un chantier, « Créer le lien de pointage » donne une page à donner à un compagnon : sur son téléphone, sans compte, il coche « fait » les tâches terminées en fin de journée, et l’avancement du chantier se met à jour seul. Il ne voit que les tâches de ce chantier, ni prix ni client, et ne peut que cocher « fait » ; « Révoquer » coupe le lien à tout moment.',
    cap: 'crm',
    flag: 'crmPointage',
    surDemande: true,
  },
  // source : lib/crm/avancementAuto.ts:4-6, :20-24 ; app/api/crm/pieces/route.ts:86-92 (proposition, rien n'est coché d'office)
  {
    id: 'photo-apres',
    titre: 'Une photo « après » propose de cocher les tâches',
    texte: 'Quand vous ajoutez une photo « Après » dont la légende nomme une pièce (« salle de bain terminée »), le CRM propose de cocher les tâches de cette pièce. Rien n’est coché sans votre clic.',
    cap: 'crm',
    flag: 'crmPlan',
  },
  // source : app/crm/useTempsReel.ts:1-9, :48 (relecture toutes les 60 s) ; lib/crm/tempsReel.ts:25-28 (tables écoutées) ; lib/crm/accueil.ts:1-14 (arrivée en direct)
  {
    id: 'temps-reel',
    titre: 'Le CRM se met à jour en direct',
    texte: 'La maquette de l’atelier se met à jour seule quand une demande, un devis, une facture, un chantier, une tâche, le stock ou un rappel change, sans recharger la page (et se relit d’elle-même toutes les 60 secondes tant que l’onglet est visible). Une nouvelle demande apparaît en direct à l’accueil.',
    cap: 'crm',
    flag: 'crm',
  },
  // source : lib/crm/alertes.ts:13-14 (types d'alerte), :1-12 (règles = celles des autres écrans)
  {
    id: 'alertes-atelier',
    titre: 'Les alertes de l’atelier',
    texte: 'La maquette signale seule les chantiers en retard, les livraisons en retard ou attendues aujourd’hui, le stock sous son seuil, les chantiers terminés à facturer et ceux sans équipe. Ce sont des signalements à l’écran : rien n’est envoyé à personne.',
    cap: 'crm',
    flag: 'crm',
  },
]

// source : lib/assistant/outils-actions.ts:51-267 (SPEC : chaque action est « direct » ou « confirmation ») ; lib/assistant/boucle.ts (aucune tâche de fond :
// l'assistant n'est appelé que par POST /api/assistant, et aucun passage planifié de vercel.json ne le lance) ; app/assistant/page.tsx:276 (briefing sur demande)
export const AUTOMATIQUE_AVEC_ASSISTANT: EntreeAuto[] = [
  { id: 'a-devis', titre: 'Devis : d’une phrase à un brouillon', texte: 'Vous écrivez « fais un devis pour la demande de ce matin » : l’assistant crée le brouillon avec vos tarifs, le modifie, change son statut. L’envoi au client passe par une carte à confirmer.', cap: 'assistant', flag: 'assistant' },
  { id: 'a-factures', titre: 'Factures : préparer, encaisser, relancer', texte: 'Créer la facture, la marquer encaissée, relancer un devis ou une facture impayée : l’assistant prépare chaque geste, vous confirmez d’un clic.', cap: 'assistant', flag: 'assistant' },
  { id: 'a-tarifs', titre: 'Tarifs et stock', texte: 'Ajouter ou corriger un tarif, ajouter un article, ajuster une quantité : c’est fait tout de suite et noté au journal. Changer des prix en lot ou supprimer un tarif attend votre confirmation.', cap: 'assistant', flag: 'assistant' },
  { id: 'a-chantiers', titre: 'Chantiers (CRM)', texte: 'Créer ou modifier un chantier, affecter l’équipe, ajouter ou cocher une tâche, réserver du matériel, ajouter une note : fait tout de suite, noté au journal.', cap: 'crm', flag: 'crm' },
  { id: 'a-demandes', titre: 'Demandes et réponses aux clients', texte: 'Changer le statut d’une demande, écarter une réponse préparée. Répondre à un client ou envoyer la réponse préparée attend votre confirmation.', cap: 'assistant', flag: 'assistant' },
  // source : lib/assistant/avancement.ts ; lib/assistant/outils-actions.ts (avancer_chantier, écriture interne journalisée)
  { id: 'a-avancement', titre: 'Avancement des chantiers', texte: 'Vous écrivez « la cuisine des Martin est finie » : l’assistant coche les tâches qui correspondent sans doute possible (sinon il vous demande lesquelles) et l’avancement se met à jour dans le CRM, noté au journal.', cap: 'crm', flag: 'crm' },
  // source : lib/pilote/regles.ts:1-20 (garde-fous), :24 (DELAI_ANNULATION_MIN), :27 (PLAFOND_AUTO_JOUR), :37-44 (types) ; app/parametres/SectionPilote.tsx
  { id: 'a-pilote', titre: 'Pilote automatique (en option, à activer)', texte: `Ce que vous choisissez, type par type (réponses aux prospects, relances de devis ou d’impayés, envoi de devis ou de factures), part seul au bout de ${PILOTE_DELAI_MIN} minutes, sauf si vous l’annulez entre-temps. Jamais un devis dont un prix ne vient pas de vos tarifs, jamais un encaissement ; ${PILOTE_PLAFOND_JOUR} envois automatiques par jour au plus.`, cap: 'assistant.pilote', flag: 'piloteAutomatique', surDemande: true },
  { id: 'a-briefing', titre: 'Briefing du matin, à la demande', texte: 'Le bouton « Briefing du matin » résume ce qui est urgent, en retard ou en attente de vous. Il ne se lance pas tout seul et ne fait rien d’autre que vous informer.', cap: 'assistant', flag: 'assistant' },
]

/** « Est-ce entièrement automatique ? » — la réponse du centre d'aide, à publier telle quelle. */
export const QUESTION_ASSISTANT = 'L’assistant de gestion est-il entièrement automatique ?'
export const REPONSE_ASSISTANT: { titre: string; paragraphes: string[] } = {
  titre: FLAGS.piloteAutomatique
    ? 'Non, pas de lui-même : tout ce qui part chez un client attend votre clic, sauf ce que vous confiez au Pilote automatique.'
    : 'Non : tout ce qui part chez un client attend votre clic.',
  paragraphes: [
    'Un e-mail, une réponse, un devis envoyé, une relance : l’assistant ne les envoie jamais de lui-même. Il en prépare une carte, avec le texte exact qui partira, et rien ne se passe tant que vous n’avez pas cliqué sur « Confirmer ». Une carte non confirmée expire au bout de 24 heures et ne s’exécute plus.',
    'Il en va de même pour ce qui ne se défait pas ou touche à la comptabilité : émettre une facture, enregistrer un encaissement, supprimer, changer des prix en lot.',
    `Le reste (brouillons de devis, tarifs, stock, tâches, notes) est fait tout de suite, noté au journal des actions, et annulable quand c’est possible. L’assistant n’agit que lorsque vous lui écrivez, dans la limite de ${ASSISTANT_TOURS_MAX} messages par conversation. Les relances automatiques de la liste du dessus sont des réglages que vous avez activés vous-même : elles ne passent pas par lui.`,
    ...(FLAGS.piloteAutomatique ? [
      `La seule exception est le Pilote automatique (offre ${PLANS.signature.label}), et c’est vous qui l’activez, type par type, dans Paramètres : réponses aux prospects, relances de devis ou d’impayés, envoi de devis ou de factures, autres messages de l’assistant à vos clients. Ce qui est préparé s’affiche dans la liste « Partira dans … » et part seul au bout de ${PILOTE_DELAI_MIN} minutes, sauf si vous l’annulez. Restent toujours à votre clic : un devis dont un prix ne vient pas de vos tarifs, l’émission d’une facture, tout encaissement ou remboursement. Au plus ${PILOTE_PLAFOND_JOUR} envois automatiques par jour, rien ne part pendant une pause, et couper le pilote annule tout ce qui attendait.`,
    ] : []),
  ],
}

/** Les entrées visibles aujourd'hui (drapeaux levés). */
export const visibles = (l: readonly EntreeAuto[]): EntreeAuto[] => l.filter((e) => !e.flag || FLAGS[e.flag])

// ─── « Qui a quoi » : un tableau, fonctionnalité par fonctionnalité ───────────────────────────────────
export type LigneOffres = { id: string; label: string; cap: Capacite; flag?: Flag }

// source : lib/plans.ts GRILLE_COMPLETE (mêmes capacités, mêmes drapeaux) ; les cases sont CALCULÉES avec peut(), jamais retapées
export const LIGNES_OFFRES: LigneOffres[] = [
  { id: 'devis', label: 'Devis chiffrés par l’IA sur vos prix', cap: 'devis.ia' },
  { id: 'tarifs', label: 'Mes tarifs : votre bibliothèque de prix', cap: 'devis.prix_artisan' },
  { id: 'factures', label: 'Factures et export XML Factur-X', cap: 'factures' },
  { id: 'plateforme', label: 'Plateforme : page de conversation à votre marque', cap: 'plateforme.conversation' },
  { id: 'reponse-seule', label: 'Réponse envoyée seule par l’assistant (sinon préparée, vous validez)', cap: 'plateforme.ia.auto' },
  { id: 'relances-conv', label: 'Relances des conversations, préparées pour vous', cap: 'relances' },
  { id: 'relances-conv-auto', label: 'Relances des conversations envoyées seules', cap: 'relances.auto' },
  { id: 'comptes-clients', label: 'Comptes clients (lien magique, historique)', cap: 'plateforme.comptes_clients' },
  { id: 'email', label: 'Votre boîte e-mail branchée (Messages)', cap: 'canaux.email' },
  { id: 'chiffres', label: 'Mes chiffres', cap: 'chiffres' },
  { id: 'relances-impayes', label: 'Relances des factures impayées, préparées pour vous', cap: 'factures.relances', flag: 'relancesImpayes' },
  { id: 'relances-impayes-auto', label: 'Relances des factures impayées envoyées seules', cap: 'factures.relances.auto', flag: 'relancesImpayes' },
  { id: 'inventaire', label: 'Inventaire : stock par lieu, scan, seuils', cap: 'inventaire.stock' },
  { id: 'recherche', label: 'Recherche IA chez vos fournisseurs', cap: 'inventaire.recherche_ia', flag: 'inventaireRecherche' },
  { id: 'expert', label: 'Modèle Expert', cap: 'plateforme.ia.expert' },
  { id: 'regles', label: 'Règles d’automatisation', cap: 'plateforme.regles', flag: 'plateformeRegles' },
  { id: 'compta-auto', label: 'Alerte d’impayés par e-mail et export mensuel à votre comptable', cap: 'chiffres.auto', flag: 'comptaAlerteImpayes' },
  { id: 'crm', label: 'CRM atelier : maquette 3D vivante, chantiers, équipe, planning', cap: 'crm', flag: 'crm' },
  { id: 'assistant', label: 'Assistant de gestion (vous confirmez ce qui part chez un client)', cap: 'assistant', flag: 'assistant' },
  { id: 'pilote', label: `Pilote automatique : ce que vous choisissez part seul après ${PILOTE_DELAI_MIN} minutes pour annuler`, cap: 'assistant.pilote', flag: 'piloteAutomatique' },
]

export const lignesOffresVisibles = (): LigneOffres[] => LIGNES_OFFRES.filter((l) => !l.flag || FLAGS[l.flag])

/** La case d'une fonctionnalité pour une offre. */
export const inclus = (o: OffreAide, cap: Capacite): boolean => peut(o, cap)

/** Les crédits du mois, par offre (lus dans PLANS). */
export const creditsParMois = (o: OffreAide): number => PLANS[o].creditsMois

// ─── L'essai gratuit sans carte ───────────────────────────────────────────────────────────────────────
export type LigneEssai = { offre: PlanPayant; nom: string; jours: number; credits: number }

/** 14 / 21 jours (ESSAI_JOURS) et les crédits d'essai (creditsEssai : prorata, arrondi à l'inférieur, plafonné à ESSAI_CREDITS_PLAFOND). */
export const ESSAIS_AIDE = (): LigneEssai[] =>
  (['studio', 'signature'] as const).map((o) => ({ offre: o, nom: NOM_OFFRE[o], jours: ESSAI_JOURS[o], credits: creditsEssai(o) }))

export const PLAFOND_CREDITS_ESSAI = ESSAI_CREDITS_PLAFOND
