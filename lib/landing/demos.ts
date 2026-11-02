// lib/landing/demos.ts — la passe 3 de la landing v2 (033-009) : ce que la page EXPLIQUE et MONTRE, en données.
// - DEMOS : les sept fonctions de la section 4, chacune avec une promesse d'une ligne, une explication pour un artisan (comment ça se
//   passe, ce qu'il valide en Studio, ce qui part seul en Signature) et les données d'exemple de sa démonstration animée
//   (app/landing/demos/*). Chaque geste montré existe dans le code aujourd'hui ; la source est écrite à côté.
// - JOURNEE : « Une journée avec Presti », sept diapositives (app/landing/Journee.tsx), dans la section 3.
// Règles : toute donnée est fictive et porte « Exemple » à l'écran ; les montants sont des NOMBRES ici, formatés à l'affichage (aucun
// prix d'abonnement : ceux-là vivent sur /offres, lus dans lib/plans.ts) ; le vert ne marque que « validé », « accepté », « payé ».
import type { Capacite } from '@/lib/plans'
import { STUDIO, SIGNATURE } from './contenu'

export type IdDemo = 'reponse' | 'devis' | 'relances' | 'factures' | 'inventaire' | 'assistant' | 'crm'

export type Demo = {
  id: IdDemo
  /** Le petit titre au-dessus de la promesse (le nom de la fonction). */
  nom: string
  /** La promesse, une ligne (h3). */
  promesse: string
  /** Deux ou trois phrases : comment ça se passe pour l'artisan. */
  explication: string
  /** Ce qui change selon l'offre, en une phrase chacune. */
  studio: string
  signature: string
  capacite: Capacite
  /** Le texte alternatif de la démonstration (elle est aria-hidden ; ce texte la décrit). */
  alt: string
}

export const DEMOS: Demo[] = [
  {
    // lib/plans.ts:63 (Studio prépare), :79 (plateforme.ia.auto en Signature), lib/plateformeConfig.ts:45 (défaut « assistée »).
    id: 'reponse', nom: 'Réponse aux demandes', capacite: 'plateforme.conversation',
    promesse: 'Chaque demande reçoit une réponse, à votre nom.',
    explication: 'Votre client écrit sur votre page, avec ses mots. Presti lit sa demande, pose les bonnes questions et prépare la réponse, signée de votre nom.',
    studio: `Avec ${STUDIO}, la réponse vous attend : vous la relisez et l’envoyez d’un clic.`,
    signature: `Avec ${SIGNATURE}, elle peut partir seule, si vous passez la réponse en mode automatique.`,
    alt: 'Exemple animé : une demande de client arrive, Presti prépare la réponse, l’artisan la valide et elle part à son nom.',
  },
  {
    // Promesse 14 (devis-source-e2e) : chaque ligne porte sa provenance ; un prix absent des tarifs de l'artisan est « estimé ».
    id: 'devis', nom: 'Devis sur vos tarifs', capacite: 'devis.ia',
    promesse: 'Le devis se chiffre sur vos prix, ligne par ligne.',
    explication: 'Presti lit la demande et propose les lignes du devis. Chaque ligne dit d’où vient son prix : de vos tarifs, ou « estimé » quand il ne le trouve pas chez vous. Vous relisez, corrigez, et envoyez.',
    studio: `Avec ${STUDIO} comme avec ${SIGNATURE}, un devis part quand vous l’avez validé.`,
    signature: 'Un prix estimé attend toujours votre accord.',
    alt: 'Exemple animé : les lignes d’un devis se remplissent une à une, marquées « Mes tarifs » ou « Estimé », puis le total s’affiche.',
  },
  {
    // lib/relances.ts:22-23 (J+2, J+5, J+10) ; lib/pilote/regles.ts:24 (10 minutes pour annuler) ; promesse 16 (arrêt à la réponse).
    id: 'relances', nom: 'Relances', capacite: 'relances',
    promesse: 'Plus aucun devis qu’on oublie de relancer.',
    explication: 'Un devis envoyé reste sans réponse ? Presti prépare les relances à J+2, J+5 et J+10, au nom de votre entreprise. Dès que le client répond ou accepte, elles s’arrêtent.',
    studio: `Avec ${STUDIO}, chaque relance attend votre clic.`,
    signature: `Avec ${SIGNATURE} et le pilote automatique, elle part seule après 10 minutes pour annuler.`,
    alt: 'Exemple animé : la frise des relances J+2, J+5 et J+10 d’un devis, « à valider » ou « partira dans 7 min », puis l’arrêt quand le client répond.',
  },
  {
    // lib/plans.ts:67 et :238 (relances d'impayés J+3, J+10, J+21, opt-in, arrêtées au paiement) ; promesse 15 (factures).
    id: 'factures', nom: 'Factures et impayés', capacite: 'factures',
    promesse: 'Le devis accepté devient facture.',
    explication: 'Votre client accepte le devis en ligne : la facture se prépare depuis ses lignes, avec ses mentions, en PDF. Si elle reste impayée, ses relances partent à J+3, J+10 et J+21, une fois activées, et s’arrêtent dès le paiement.',
    studio: `Avec ${STUDIO}, les relances d’impayés sont préparées et vous les validez.`,
    signature: `Avec ${SIGNATURE}, elles partent seules.`,
    alt: 'Exemple animé : un devis accepté devient une facture, une relance d’impayé se prépare, puis la facture passe « Payée ».',
  },
  {
    // Promesse 17 (stock par lieu, scan, seuils) ; drapeau inventaireRecherche levé (lib/flags.ts:58) ; seuil_alerte (lib/inventaire/types.ts:99).
    id: 'inventaire', nom: 'Inventaire', capacite: 'inventaire.stock',
    promesse: 'Vous savez ce qui reste, au dépôt et dans le camion.',
    explication: 'Le stock est rangé par lieu. Vous scannez un article, la quantité se met à jour. Sous le seuil que vous avez fixé, l’article passe en alerte, et Presti peut chercher son prix chez vos fournisseurs.',
    studio: `Dès ${STUDIO}, avec la recherche de prix chez vos fournisseurs.`,
    signature: '',
    alt: 'Exemple animé : le stock d’un article baisse au camion jusqu’à passer sous son seuil d’alerte.',
  },
  {
    // lib/plans.ts:73-74 (assistant en Studio, cartes à confirmer) ; lib/flags.ts:164 (assistant levé) ; exemple repris de contenu.ts.
    id: 'assistant', nom: 'Assistant de gestion', capacite: 'assistant',
    promesse: 'Vous demandez, au lieu de chercher.',
    explication: 'Vous lui écrivez comme à un collègue : « Fais le devis de Mme Martin pour 12 m² de carrelage. » Il lit vos tarifs, vos clients et votre stock, puis prépare le travail.',
    studio: `Avec ${STUDIO}, ce qui part chez un client attend votre clic « Confirmer ».`,
    signature: `Avec ${SIGNATURE}, il a aussi la main sur le CRM et le pilote automatique.`,
    alt: 'Exemple animé : l’artisan écrit une demande à l’assistant, qui prépare le brouillon d’un devis à confirmer.',
  },
  {
    // lib/plans.ts:84-86 (CRM en Signature) ; drapeau crm levé ; fiche chantier : facturé, encaissé, reste à encaisser, marge estimée.
    id: 'crm', nom: 'CRM et chantiers', capacite: 'crm',
    promesse: 'Vous savez où en est chaque chantier.',
    explication: 'Un seul écran pour vos demandes, vos clients et vos chantiers. Pour chaque chantier : ce qui est facturé, encaissé, ce qui reste à encaisser, et la marge sur matériaux, estimée.',
    studio: `Le CRM est compris dans ${SIGNATURE}.`,
    signature: '',
    alt: 'Exemple animé : la fiche d’un chantier se remplit, avec le facturé, l’encaissé, le reste à encaisser et la marge estimée.',
  },
]

/** Données d'exemple des démonstrations (montants en euros, formatés à l'affichage par euros()). */
export const EXEMPLES = {
  reponse: {
    client: 'Julien',
    demande: 'Bonjour, j’ai une fuite sous l’évier de la cuisine. Vous pourriez passer cette semaine ?',
    reponse: 'Bonjour Julien, merci pour votre message. Pour bien préparer l’intervention, pouvez-vous m’envoyer une photo sous l’évier et me dire depuis quand la fuite dure ?',
    signataire: 'Atelier Garnier',
  },
  devis: {
    titre: 'Salle de bains, douche à l’italienne',
    lignes: [
      { designation: 'Dépose de la baignoire', qte: '1 forfait', montant: 180, source: 'tarifs' as const },
      { designation: 'Receveur extra-plat 90 × 120', qte: '1 u', montant: 245, source: 'tarifs' as const },
      { designation: 'Paroi de douche vitrée', qte: '1 u', montant: 390, source: 'estime' as const },
      { designation: 'Pose et raccordements', qte: '6 h', montant: 330, source: 'tarifs' as const },
    ],
  },
  factures: { numero: 'F-2026-014', client: 'Mme Lefèvre', montant: 1145 },
  inventaire: { article: 'Raccord PER 16 mm', depart: 12, fin: 3, seuil: 4 },
  assistant: {
    question: 'Fais le devis de Mme Martin pour 12 m² de carrelage.',
    reponse: 'C’est prêt : le brouillon du devis de Mme Martin, 12 m² de carrelage, chiffré sur vos tarifs. Vous le relisez avant l’envoi ?',
  },
  crm: { chantier: 'Rénovation cuisine, Mme Roux', facture: 8400, encaisse: 5200, marge: 31 },
}

export const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export type Transition = 'pixels' | 'profondeur' | 'fondu'

export type Moment = {
  heure: string
  /** L'heure telle qu'un lecteur d'écran la dit. */
  heureLongue: string
  titre: string
  texte: string
  ecran: 'point' | 'demande' | 'reponse' | 'devis' | 'relance' | 'facture' | 'paiement'
  /** Comment cette diapositive ENTRE (la première n'a pas de transition). */
  entree: Transition
}

/** « Une journée avec Presti » : sept moments, sept écrans. Les heures sont un exemple de journée, pas une promesse de délai. */
export const JOURNEE: Moment[] = [
  {
    // lib/assistant/outils.ts:243 (briefing_du_matin, « point du jour », nombres comptés par le code).
    heure: '7 h', heureLongue: '7 heures', ecran: 'point', entree: 'fondu',
    titre: 'Le point du jour.',
    texte: 'Avant le premier chantier, vous savez ce qui attend : les demandes, les devis sans réponse, les factures en retard, le stock bas.',
  },
  {
    heure: '9 h 12', heureLongue: '9 heures 12', ecran: 'demande', entree: 'pixels',
    titre: 'Une demande arrive.',
    texte: 'Un client vous écrit depuis votre page, sur son téléphone, avec ses mots. Vous, vous êtes sur le chantier.',
  },
  {
    heure: '9 h 13', heureLongue: '9 heures 13', ecran: 'reponse', entree: 'profondeur',
    titre: 'Sa réponse est prête.',
    texte: `Presti a préparé la réponse, à votre nom. Avec ${STUDIO}, un clic l’envoie ; avec ${SIGNATURE}, elle peut partir seule.`,
  },
  {
    heure: '12 h 30', heureLongue: '12 heures 30', ecran: 'devis', entree: 'fondu',
    titre: 'Le devis, entre deux chantiers.',
    texte: 'Les lignes sont chiffrées sur vos tarifs. Un prix que Presti ne trouve pas chez vous est marqué « estimé ». Vous relisez, vous envoyez.',
  },
  {
    heure: '16 h', heureLongue: '16 heures', ecran: 'relance', entree: 'pixels',
    titre: 'La relance est prête.',
    texte: `Le devis de lundi est resté sans réponse : la relance de J+2 attend. Avec ${SIGNATURE} et le pilote automatique, elle part seule, 10 minutes après, si vous ne l’annulez pas.`,
  },
  {
    heure: '18 h', heureLongue: '18 heures', ecran: 'facture', entree: 'profondeur',
    titre: 'Le devis accepté devient facture.',
    texte: 'Le client a accepté en ligne. La facture se prépare depuis les lignes du devis, avec ses mentions, prête à partir.',
  },
  {
    heure: '21 h', heureLongue: '21 heures', ecran: 'paiement', entree: 'fondu',
    titre: 'Le règlement est noté.',
    texte: 'La facture passe « Payée », et ses relances s’arrêtent d’elles-mêmes. La soirée est à vous.',
  },
]
