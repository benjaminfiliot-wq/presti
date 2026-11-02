// lib/landing/contenu.ts — le texte de la landing v2 (chantier 2, lot 6), en DONNÉES : lu par app/landing/LandingV2.tsx, par les
// données structurées (lib/landing/donneesStructurees.ts) et par public/llms.txt (recopie à la main, même phrases).
// Source du texte : plans/011-cadrage-01-11/c2-lot4/texte.md (provisoire tant que Benj ne l'a pas validé). Les phrases sont gardées ;
// celles que la mise en page a obligé à couper sont listées dans .orchestre/preuves/033-003/resume.md.
// Règles : aucun prix ni durée d'essai sur l'accueil (ils vivent sur /offres, lus dans lib/plans.ts) ; l'offre de chaque carte est LUE
// dans lib/plans.ts (offreMinimale), jamais écrite à la main ; toute donnée fictive porte « Exemple » ; le vert ne marque que « validé ».
import { PLANS, offreMinimale, type Capacite } from '@/lib/plans'

/** « Dès Studio » ou « Avec Signature », lu dans la grille : la carte suit l'offre si la grille change. */
export function etiquetteOffre(capacite: Capacite): string {
  const o = offreMinimale(capacite)
  if (!o) return ''
  return o === 'studio' ? `Dès ${PLANS.studio.label}` : `Avec ${PLANS[o].label}`
}

export const STUDIO = PLANS.studio.label
export const SIGNATURE = PLANS.signature.label

export const SEO = {
  // 53 signes ; 146 signes (texte.md, livrable 8).
  titre: 'Presti — votre gestion d’artisan, simplifiée par l’IA',
  description: `Devis, factures, relances, stock : Presti prépare tout. Avec ${STUDIO}, vous validez d’un clic ; avec ${SIGNATURE}, réponses et relances partent seules.`,
}

export const HERO = {
  h1Debut: 'Votre gestion d’artisan,',
  h1Fin: 'simplifiée par l’IA.',
  // 033-005 (critique 033-004, défaut 6) : courte et sans jargon d'offre (p4-landing.md:40, :51). L'ancienne, gardée pour Benj :
  // « Presti prépare vos réponses, vos devis, vos relances et vos factures. Avec Studio, vous validez d’un clic ; avec Signature, les
  // réponses et les relances partent seules, si vous le choisissez. » La différence des offres passe à « Comment ça marche » (COMMENT).
  sousPhrase: 'Presti prépare vos réponses, vos devis, vos relances et vos factures, à votre nom.',
  microcopie: 'Essai gratuit, sans carte bancaire, sans engagement.',
  alt: 'Exemple : l’écran de Presti avec une demande de client, la réponse préparée et le devis chiffré.',
}

export const PROBLEME = {
  titre: 'Le chantier, vous savez faire. Le reste vous prend vos soirées.',
  sousPhrase: 'Trois choses qui coûtent des chantiers, sans qu’on s’en rende compte.',
  douleurs: [
    { titre: 'Trop de temps perdu sur les devis.', texte: 'Le soir, après le chantier, vous chiffrez encore. Le client, lui, attend.', icone: 'horloge' },
    { titre: 'Relances oubliées.', texte: 'Un devis envoyé, puis plus de nouvelles. Personne n’a relancé, et le chantier s’est fait ailleurs.', icone: 'boucle' },
    { titre: 'Inventaire et documents difficiles à suivre.', texte: 'Le stock est dans le camion, les factures dans un tiroir, les photos dans le téléphone.', icone: 'dossier' },
  ] as const,
  // La seule ligne chiffrée de la page, avec sa source dessous (plans/promesses.md, promesse 23 ; défaut de la question 11).
  chiffre: '7',
  chiffreTexte: 'Répondre dans l’heure donne près de 7 fois plus de chances d’avoir un vrai échange avec le client qu’une réponse plus tardive.',
  source: 'Source : Harvard Business Review, « The Short Life of Online Sales Leads » (étude sur 2 241 entreprises).',
}

/** En-tête de la section 3 : la différence des offres, sortie du héros (033-005, défaut 6), dite une fois, ici. */
export const COMMENT = {
  titre: 'Comment ça marche',
  sousPhrase: `Trois temps. Avec ${STUDIO}, vous validez chaque envoi ; avec ${SIGNATURE}, les réponses et les relances peuvent partir seules, si vous le choisissez.`,
}

/** Section 3 : le texte de Benj mot pour mot (tutoiement compris, question 6) ; chaque étape porte une capture du vrai produit. */
export const ETAPES = [
  {
    titre: 'Décris le chantier ou envoie ta demande.',
    texte: 'Votre client écrit depuis votre lien, avec ses mots. Ou vous décrivez le chantier vous-même.',
    exemple: 'Salle de bains de 6 m² : dépose de la baignoire, pose d’une douche à l’italienne.',
    image: '/demo/scene-1.webp', appareil: 'telephone' as const,
    legende: 'Le client écrit sur votre page, depuis son téléphone.',
  },
  {
    titre: 'Presti prépare le devis.',
    texte: 'Sur vos prix, ligne par ligne. Chaque ligne dit d’où vient son prix.',
    // 033-005 (défaut 11) : scene-6 recadrée sur le brouillon du devis (lignes, total), et non plus scene-3 (une conversation).
    image: '/demo/scene-6.webp', appareil: 'ordinateur' as const,
    // Recadrage en pixels de l'image source (1400 × 875) : la conversation et le brouillon, ni l'en-tête (il nomme le fournisseur du
    // modèle) ni la barre latérale (badge d'offre).
    recadre: { x: 290, y: 196, l: 690, h: 496 },
    recadreTel: { x: 300, y: 214, l: 530, h: 476 }, // au téléphone, plus serré : le texte du brouillon reste lisible
    legende: 'Le brouillon du devis : les lignes sur vos tarifs, le total, prêt à relire.',
  },
  {
    titre: 'Tu valides et envoies.',
    texte: 'Vous relisez, vous corrigez si besoin, et le devis part à votre client, à votre nom.',
    image: '/demo/scene-4.webp', appareil: 'telephone' as const,
    legende: 'Le client l’accepte en ligne ; l’acceptation est horodatée.',
  },
] as const

export type Fonction = {
  id: string; titre: string; capacite: Capacite
  coince: string; fait: string; gain: string
  image?: { src: string; l: number; h: number; focus: string; legende: string }
}

/** Section 4 : les six cartes de Benj, dans l'ordre du travail. `capacite` donne l'étiquette d'offre (lib/plans.ts). */
export const FONCTIONS: Fonction[] = [
  {
    id: 'devis', titre: 'Devis assistés par IA', capacite: 'devis.ia',
    coince: 'Un devis prend une soirée.',
    fait: 'Il lit la demande et propose les lignes, chiffrées sur vos tarifs. Un prix qu’il ne trouve pas chez vous est marqué comme estimé.',
    gain: 'Vous relisez au lieu de tout taper.',
    image: { src: '/demo/scene-4.webp', l: 780, h: 1688, focus: '50% 58%', legende: 'Un devis accepté par le client' },
  },
  {
    id: 'crm', titre: 'CRM clients', capacite: 'crm',
    coince: 'Les demandes, les clients et les chantiers sont éparpillés.',
    fait: 'Un seul écran pour vos demandes, vos fiches clients et vos chantiers (statut, tâches, matériaux réservés). Pour chaque chantier : ce qui est facturé, encaissé, ce qui reste à encaisser, et sa marge sur matériaux, estimée.',
    gain: 'Vous savez où en est chaque chantier.',
    // 033-005 (défaut 20) : scene-8, la fiche d'un chantier, dit exactement la carte (facturé, encaissé, reste à encaisser, marge estimée).
    image: { src: '/demo/scene-8.webp', l: 1400, h: 875, focus: '62% 30%', legende: 'La fiche d’un chantier : facturé, encaissé, reste à encaisser, marge estimée' },
  },
  {
    id: 'factures', titre: 'Factures et relances', capacite: 'factures',
    coince: 'Courir après un paiement.',
    fait: `Le devis accepté devient facture. Les relances des factures impayées, une fois activées, s’arrêtent dès le paiement. Avec ${STUDIO}, elles sont préparées et vous les validez ; avec ${SIGNATURE}, elles partent seules.`,
    gain: 'Plus aucune facture qu’on oublie de relancer.',
  },
  {
    id: 'inventaire', titre: 'Inventaire', capacite: 'inventaire.stock',
    coince: 'Savoir ce qui reste au dépôt et dans le camion.',
    fait: 'Le stock par lieu, le scan des articles, un seuil d’alerte par article, et la recherche d’un prix chez vos fournisseurs.',
    gain: 'Moins d’allers-retours pour une pièce oubliée.',
  },
  {
    id: 'documents', titre: 'Documents centralisés', capacite: 'chiffres',
    coince: 'Chercher un PDF, une photo, un relevé.',
    fait: `Les PDF de vos devis et de vos factures, vos fichiers rangés dans « Mes chiffres », et les pièces de chaque chantier avec ${SIGNATURE}.`,
    gain: 'Tout se retrouve au même endroit.',
  },
  {
    id: 'assistant', titre: 'Assistant de gestion', capacite: 'assistant',
    coince: 'Dix écrans pour une seule tâche.',
    fait: `Vous lui écrivez, il prépare. Exemple : « Fais le devis de Mme Martin pour 12 m² de carrelage. » Avec ${STUDIO}, ce qui part chez un client attend votre clic « Confirmer ».`,
    gain: 'Vous demandez, au lieu de chercher.',
    image: { src: '/demo/scene-6.webp', l: 1400, h: 875, focus: '45% 35%', legende: 'L’assistant prépare le brouillon du devis' },
  },
]

export const POUR_QUI = {
  titre: 'Pour qui',
  sousPhrase: 'Pour ceux qui font les chantiers, et pour ceux qui les organisent.',
  profils: [
    { nom: 'Artisans du bâtiment', detail: 'Seul ou avec un apprenti.', entreprise: false },
    { nom: 'TPE du bâtiment', detail: 'Quelques compagnons, un bureau qui tient la gestion.', entreprise: false },
    { nom: 'Artisans multi-chantiers', detail: 'Plusieurs chantiers ouverts en même temps.', entreprise: false },
    { nom: 'Architectes', detail: 'Des projets à suivre avec plusieurs corps de métier.', entreprise: true },
    { nom: 'Entreprises qui veulent industrialiser leur gestion', detail: 'Une équipe, des outils, des façons de faire à brancher.', entreprise: true },
  ],
}

/** Section 6 : le texte de Benj, mot pour mot (p4-landing.md:92-93), sans prix. */
export const ENTREPRISE = {
  titre: 'Presti pour l’entreprise',
  question: 'Vous avez plusieurs collaborateurs, un CRM, un inventaire ou des processus internes à automatiser ?',
  reponse: 'Nous intégrons Presti à votre organisation et connectons des agents IA à vos outils.',
  microcopie: 'Sur démonstration et sur devis.',
  lien: '/contact?motif=entreprise',
}

export const FINAL = {
  titre: 'Commencez par votre prochaine demande.',
  sousPhrase: 'Créez votre compte et regardez Presti préparer votre prochain devis.',
}

/**
 * AEO : la FAQ courte de la section 7, réponse d'abord, une ou deux phrases. Reprise MOT POUR MOT par FAQPage
 * (lib/landing/donneesStructurees.ts). Chaque réponse a sa source dans le code :
 * 1. lib/essaiGratuit.ts:5-9 (sans carte, résiliable) ; 2. lib/plans.ts:11-12, :205-208 (Studio prépare, Signature envoie ; jamais un prix
 * estimé ni un paiement sans l'artisan) ; 3. lib/email.ts:2-4 (expéditeur au nom de l'artisan, réponses vers lui) ; 4. promesse 14 de
 * plans/promesses.md (devis-source-e2e) ; 5. app/confidentialite/page.tsx:59 (base et photos dans l'Union) ; 6. lib/plans.ts:151 (deux
 * offres au mois), lib/faq.ts (sans engagement).
 */
export const FAQ_ACCUEIL: { question: string; reponse: string; lien?: { href: string; texte: string } }[] = [
  { question: 'Faut-il une carte bancaire pour essayer Presti ?', reponse: 'Non. L’essai est gratuit, sans carte bancaire et sans engagement.' },
  { question: 'Est-ce que Presti envoie des messages à ma place ?', reponse: `Seulement si vous le choisissez. Avec ${STUDIO}, les réponses, les devis et les relances sont préparés et vous les validez d’un clic ; avec ${SIGNATURE}, les réponses et les relances peuvent partir seules, mais un prix estimé ou un paiement attend toujours votre accord.` },
  // 033-005 (défaut 16) : ni « Non » ni « jamais » — l'adresse d'envoi reste contact@prestiapp.fr, seul domaine vérifié (lib/email.ts:2-4).
  { question: 'Mes clients voient-ils le nom Presti ?', reponse: 'Vos messages partent sous votre nom, et les réponses de vos clients arrivent chez vous.' },
  { question: 'D’où viennent les prix de mes devis ?', reponse: 'De vos tarifs. Chaque ligne dit d’où vient son prix, et un prix que Presti ne trouve pas chez vous est marqué comme estimé.' },
  { question: 'Où sont hébergées mes données ?', reponse: 'La base de données et les photos sont hébergées dans l’Union européenne. Le détail de chaque prestataire est dans la politique de confidentialité.', lien: { href: '/confidentialite', texte: 'Voir la politique de confidentialité' } },
  { question: 'Combien coûte Presti ?', reponse: `Deux abonnements au mois, ${STUDIO} et ${SIGNATURE}, sans engagement ; leurs prix sont sur la page Offres. Presti pour l’entreprise est sur devis.`, lien: { href: '/offres', texte: 'Voir les offres' } },
]

export const LIENS_ENTETE = [
  { href: '#fonctionnalites', texte: 'Fonctionnalités' },
  { href: '#pour-qui', texte: 'Pour qui' },
  { href: '#entreprise', texte: 'Entreprise' },
  { href: '/offres', texte: 'Offres' },
  { href: '/faq', texte: 'Questions' },
]

/**
 * Le volet « démo Entreprise » de /contact (motif lu dans le navigateur : /contact reste statique). « Ce qui se passe ensuite » : le texte
 * unique du plan du chantier 4 (chantier-4-assistant-plan.md:190-193), repris mot pour mot, affiché au-dessus du formulaire puis dans la
 * confirmation. Aucun délai (question 7), aucune marque, aucun prix.
 */
export const DEMO_ENTREPRISE = {
  titre: 'Demander une démo entreprise',
  sousPhrase: 'Presti pour l’entreprise se met en place avec vous, sur démonstration et sur devis.',
  ensuiteTitre: 'Ce qui se passe ensuite',
  ensuite: [
    'Un premier échange : nous vous posons quelques questions sur votre équipe, vos outils et les tâches qui vous prennent du temps.',
    'Un second rendez-vous : une démonstration sur vos propres cas, puis une proposition sur devis.',
    'Vous décidez librement.',
  ],
  tailles: ['1', '2 à 5', '6 à 20', 'plus de 20'],
  activites: ['Artisan', 'Entreprise du bâtiment', 'Architecte', 'Autre'],
  aideMessage: 'Facultatif : ce que vous aimeriez voir pendant la démonstration.',
  mention: 'Vos réponses servent seulement à préparer la démonstration.',
  merci: 'Merci, votre demande est bien partie.',
  erreurs: {
    prenom: 'Indiquez votre prénom.', email: 'Indiquez une adresse e-mail valide.', taille: 'Choisissez la taille de votre équipe.', activite: 'Choisissez votre activité.',
    envoi: 'L’envoi n’a pas abouti. Réessayez dans un moment, ou écrivez-nous depuis la page Contact.',
  },
  decideurs: [
    { titre: 'Vos données', texte: 'La base de données et les photos sont hébergées dans l’Union européenne.', lien: { href: '/confidentialite', texte: 'Voir la politique de confidentialité' } },
    { titre: 'Vos outils', texte: 'Nous l’intégrons pour vous, à partir de ce que vous utilisez déjà.' },
    { titre: 'Le prix', texte: 'Sur devis, après la démonstration. Pas de prix public.' },
  ],
  miseEnPlace: ['Vos données reprises dans Presti.', 'Vos façons de faire branchées sur vos outils.', 'Ce qui part automatiquement, nous le décidons ensemble.'],
}
