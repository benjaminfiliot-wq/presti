// Pages de référencement « devis » de prestiapp.fr (27/10/2026) : le générateur gratuit, les modèles par métier, le guide et la page
// « logiciel de devis artisan ». UNE source pour leur contenu, leurs liens et le sitemap.
//
// Règles tenues ici, les mêmes que partout dans Presti :
//  • aucun chiffre non sourcé : pas un prix, pas une durée de chantier, pas une statistique. Les lignes d'exemple n'ont PAS de prix,
//    c'est l'artisan qui chiffre (« un prix qui a l'air sourcé alors qu'il est deviné est pire qu'un prix affiché comme estimé ») ;
//  • chaque règle de droit renvoie à son texte ou à la page officielle qui la porte (SOURCES ci-dessous) ;
//  • le prix d'une offre Presti se lit dans lib/plans.ts, jamais ici.

export const BASE = 'https://prestiapp.fr'

/** Les textes cités par les pages, lus le 27/10/2026. Les liens Légifrance sont ceux que donnent les fiches service-public. */
export const SOURCES = {
  servicePublicBatiment: { label: 'Service-public.fr (Entreprendre), fiche « Maçon : conditions d’accès et d’exercice », rubrique Devis (vérifiée le 21 février 2026)', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F39037' },
  servicePublicDevis: { label: 'Service-public.fr (Entreprendre), « Devis obligatoire : activités concernées »', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F31144' },
  arrete2017: { label: 'Arrêté du 24 janvier 2017 (publicité des prix des prestations de dépannage, de réparation et d’entretien dans le bâtiment et l’équipement de la maison)', url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000033935513/' },
  assuranceDecennale: { label: 'Code des assurances, art. L243-2 (attestation d’assurance décennale jointe aux devis et factures)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031010272' },
  artisanatAssurance: { label: 'Code de l’artisanat, art. L132-1 (mention de l’assurance sur le devis et la facture d’un artisan)', url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006075116/LEGISCTA000047362292' },
  artisanatMentions: { label: 'Code de l’artisanat, art. R132-1 (mentions obligatoires sur les documents contractuels d’un artisan)', url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006075116/LEGISCTA000047724892' },
  franchiseTva: { label: 'Service-public.fr (Entreprendre), « Franchise en base de TVA » (mention « TVA non applicable, article 293 B du CGI »)', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F21746' },
  tvaReduiteCapeb: { label: 'CAPEB, « Travaux dans les logements de plus de 2 ans : suppression des attestations des clients »', url: 'https://www.capeb.fr/actualites/travaux-dans-les-logements-de-plus-de-2-ans-suppression-des-attestations-des-clients' },
  tvaReduiteFfb: { label: 'FFB, « Attestation TVA : suppression et remplacement par une mention sur le devis ou la facture »', url: 'https://www.ffbatiment.fr/actualites-batiment/actualite-ba/attestation-tva-suppression-remplacement-mention-devis-facture' },
} as const
export type CleSource = keyof typeof SOURCES

/**
 * Les mentions d'un devis de travaux ou de dépannage dans le bâtiment, dans l'ordre de la fiche service-public F39037 (vérifiée le
 * 21/02/2026), plus le SIRET et la mention des pièces remplacées (F31144). `cle` relie la mention à la case du générateur.
 */
export const MENTIONS_DEVIS: { cle: string; label: string; detail: string; source: CleSource; condition?: string }[] = [
  { cle: 'date', label: 'Date de rédaction', detail: 'Le jour où vous établissez le devis.', source: 'servicePublicBatiment' },
  { cle: 'entreprise', label: 'Nom et adresse de l’entreprise', detail: 'Votre dénomination, votre forme juridique et votre adresse.', source: 'servicePublicBatiment' },
  { cle: 'siret', label: 'Numéro d’immatriculation (SIRET)', detail: 'L’identifiant de votre entreprise : il permet au client de vérifier qui s’engage.', source: 'artisanatMentions' },
  { cle: 'assurance', label: 'Assurance décennale', detail: 'Les coordonnées de l’assureur et la zone géographique couverte, lorsque cette assurance est obligatoire.', source: 'servicePublicBatiment', condition: 'travaux soumis à la garantie décennale' },
  { cle: 'client', label: 'Nom du client', detail: 'La personne pour qui le devis est établi.', source: 'servicePublicBatiment' },
  { cle: 'lieu', label: 'Lieu d’exécution', detail: 'L’adresse du chantier, si elle diffère de celle du client.', source: 'servicePublicBatiment' },
  { cle: 'nature', label: 'Nature exacte des travaux', detail: 'Ce que vous allez faire, en une ou deux phrases que le client comprend.', source: 'servicePublicBatiment' },
  { cle: 'lignes', label: 'Décompte détaillé', detail: 'Chaque prestation et chaque produit, avec sa quantité et son prix.', source: 'servicePublicBatiment' },
  { cle: 'tauxHoraire', label: 'Taux horaire de main-d’œuvre TTC', detail: 'Et la façon dont le temps estimé sera décompté.', source: 'servicePublicBatiment' },
  { cle: 'deplacement', label: 'Frais de déplacement', detail: 'S’il y en a.', source: 'servicePublicBatiment', condition: 's’il y en a' },
  { cle: 'totaux', label: 'Somme globale HT et TTC, avec le taux de TVA', detail: 'Le générateur les calcule à partir des lignes.', source: 'servicePublicBatiment' },
  { cle: 'validite', label: 'Durée de validité de l’offre', detail: 'Le temps pendant lequel vos prix tiennent.', source: 'servicePublicBatiment' },
  { cle: 'gratuit', label: 'Devis gratuit ou payant', detail: 'Et son coût lorsqu’il est payant.', source: 'servicePublicBatiment' },
  { cle: 'dechets', label: 'Enlèvement et gestion des déchets', detail: 'Comment les déchets du chantier seront enlevés et traités, et ce que cela coûte.', source: 'servicePublicBatiment' },
  { cle: 'pieces', label: 'Conservation des pièces remplacées', detail: 'Le client est informé qu’il peut garder les pièces, éléments ou appareils remplacés.', source: 'servicePublicDevis', condition: 'dépannage, réparation, entretien' },
]

export type LigneModele = { designation: string; unite: string; qte: number }
export type MetierDevis = {
  slug: string
  nom: string // « plombier »
  titre: string // « Plombier »
  /** Ce que ce devis a de particulier, en deux phrases. */
  intro: string
  /** Ce qu'il faut savoir avant de chiffrer : des questions à poser au client. Pratique, pas de chiffre. */
  questions: string[]
  /** Les lignes types, SANS prix : c'est l'artisan qui chiffre. Le générateur les reprend avec un prix à zéro. */
  lignes: LigneModele[]
  /** La nature des travaux pré-remplie dans le générateur. */
  nature: string
  /** Points de vigilance propres au métier. Chaque point de droit s'appuie sur SOURCES. */
  vigilance: string[]
  /** Le devis du métier est souvent un dépannage : l'arrêté de 2017 s'applique (taux horaire, déplacement, pièces). */
  depannage: boolean
}

// Phrases communes, écrites une fois.
const V_DEPANNAGE = 'Pour un dépannage, une réparation ou un entretien, le devis porte aussi votre taux horaire TTC, la façon dont le temps est décompté, les frais de déplacement s’il y en a, et informe le client qu’il peut garder les pièces remplacées (arrêté du 24 janvier 2017, fiche service-public F31144).'
const V_TVA = 'Dans un logement achevé depuis plus de deux ans, certains travaux relèvent de la TVA à 10 % ou à 5,5 %. Depuis la loi de finances pour 2025, l’attestation du client est remplacée par une mention sur le devis ou la facture signés (voir les modèles de mention de la CAPEB ou de la FFB).'
const V_DECENNALE = 'Ces travaux relèvent de la garantie décennale : les coordonnées de votre assureur et la zone couverte figurent sur le devis, et l’attestation d’assurance l’accompagne (art. L243-2 du Code des assurances).'

export const METIERS_DEVIS: MetierDevis[] = [
  {
    slug: 'plombier', nom: 'plombier', titre: 'Plombier',
    intro: 'Le devis de plombier se fait souvent à chaud : une fuite, un chauffe-eau en panne, un client pressé. C’est aussi le cas typique du devis de dépannage, avec ses mentions propres.',
    questions: [
      'Quel appareil est en cause : marque, modèle, capacité, âge approximatif ?',
      'L’eau est-elle coupée, et le client sait-il où se trouve le robinet d’arrêt ?',
      'Le logement est-il une maison ou un appartement, et à quel étage ?',
      'Le client peut-il envoyer une photo de l’installation et de la plaque signalétique ?',
      'Quels créneaux d’accès au logement sont possibles ?',
    ],
    lignes: [
      { designation: 'Déplacement', unite: 'forfait', qte: 1 },
      { designation: 'Recherche de panne', unite: 'h', qte: 1 },
      { designation: 'Fourniture : pièce de remplacement (à préciser)', unite: 'u', qte: 1 },
      { designation: 'Main-d’œuvre : remplacement et remise en eau', unite: 'h', qte: 1 },
      { designation: 'Évacuation de l’ancien matériel', unite: 'forfait', qte: 1 },
    ],
    nature: 'Dépannage plomberie : diagnostic et remplacement de la pièce défectueuse.',
    vigilance: [V_DEPANNAGE, V_TVA],
    depannage: true,
  },
  {
    slug: 'electricien', nom: 'électricien', titre: 'Électricien',
    intro: 'Le devis d’électricien va du dépannage d’un disjoncteur à la rénovation complète d’un tableau. Plus le chantier est gros, plus le détail par poste rassure le client.',
    questions: [
      'S’agit-il d’un dépannage, d’une mise en conformité ou d’une installation neuve ?',
      'Quel est l’âge de l’installation, et y a-t-il un diagnostic électrique récent (vente, location) ?',
      'Combien de pièces, de points lumineux et de prises sont concernés ?',
      'Le tableau est-il accessible, et la place permet-elle d’en poser un plus grand ?',
      'Le client peut-il envoyer une photo du tableau, porte ouverte ?',
    ],
    lignes: [
      { designation: 'Fourniture et pose : tableau électrique (à préciser)', unite: 'u', qte: 1 },
      { designation: 'Fourniture et pose : disjoncteurs divisionnaires', unite: 'u', qte: 1 },
      { designation: 'Fourniture et pose : interrupteur différentiel', unite: 'u', qte: 1 },
      { designation: 'Fourniture et pose : prises de courant', unite: 'u', qte: 1 },
      { designation: 'Main-d’œuvre : raccordement et essais', unite: 'h', qte: 1 },
    ],
    nature: 'Mise en sécurité de l’installation électrique : remplacement du tableau et raccordement.',
    vigilance: [V_DEPANNAGE, V_TVA],
    depannage: true,
  },
  {
    slug: 'chauffagiste', nom: 'chauffagiste', titre: 'Chauffagiste',
    intro: 'Entretien annuel, panne de chaudière ou remplacement d’un générateur : le devis de chauffagiste mélange souvent dépannage et gros équipement, et le taux de TVA change selon les travaux.',
    questions: [
      'Quel générateur est en place : énergie, marque, modèle, année ?',
      'S’agit-il d’un entretien, d’une panne ou d’un remplacement ?',
      'Quelle surface est chauffée, et combien d’émetteurs (radiateurs, plancher) ?',
      'Où sont l’évacuation des fumées et l’arrivée d’énergie ?',
      'Le client a-t-il un contrat d’entretien en cours ?',
    ],
    lignes: [
      { designation: 'Déplacement', unite: 'forfait', qte: 1 },
      { designation: 'Diagnostic de l’installation', unite: 'h', qte: 1 },
      { designation: 'Fourniture : générateur (à préciser)', unite: 'u', qte: 1 },
      { designation: 'Main-d’œuvre : dépose, pose et mise en service', unite: 'h', qte: 1 },
      { designation: 'Évacuation de l’ancien appareil', unite: 'forfait', qte: 1 },
    ],
    nature: 'Remplacement du générateur de chauffage et mise en service.',
    vigilance: [V_DEPANNAGE, V_TVA],
    depannage: true,
  },
  {
    slug: 'macon', nom: 'maçon', titre: 'Maçon',
    intro: 'Le devis de maçon porte des quantités : mètres carrés, mètres linéaires, mètres cubes. Ce sont elles que le client compare d’un devis à l’autre, donc elles doivent être lisibles.',
    questions: [
      'Quelles sont les dimensions de l’ouvrage, et le client a-t-il un plan ?',
      'L’accès au chantier permet-il le passage d’engins ou faut-il tout manutentionner ?',
      'Faut-il démolir ou évacuer un existant ?',
      'Le projet demande-t-il une déclaration préalable ou un permis, déjà obtenu ou non ?',
      'Le sol a-t-il fait l’objet d’une étude, pour une extension ?',
    ],
    lignes: [
      { designation: 'Installation de chantier', unite: 'forfait', qte: 1 },
      { designation: 'Terrassement et évacuation des terres', unite: 'm³', qte: 1 },
      { designation: 'Fondations', unite: 'ml', qte: 1 },
      { designation: 'Élévation des murs', unite: 'm²', qte: 1 },
      { designation: 'Évacuation des gravats', unite: 'forfait', qte: 1 },
    ],
    nature: 'Travaux de maçonnerie : fondations et élévation des murs.',
    vigilance: [V_DECENNALE, V_TVA],
    depannage: false,
  },
  {
    slug: 'peintre', nom: 'peintre', titre: 'Peintre',
    intro: 'Le devis de peintre se gagne sur la préparation : c’est elle qui fait la tenue, et c’est elle que le client ne voit pas. Une ligne par étape la rend visible.',
    questions: [
      'Quelles pièces, et quelles surfaces : murs, plafonds, boiseries, menuiseries ?',
      'Dans quel état sont les supports : fissures, papier peint à décoller, anciennes peintures ?',
      'Le client a-t-il choisi ses teintes et sa finition (mat, satin, velours) ?',
      'Le logement sera-t-il meublé pendant les travaux ?',
      'Quelle est la hauteur sous plafond ?',
    ],
    lignes: [
      { designation: 'Protection des sols et des meubles', unite: 'forfait', qte: 1 },
      { designation: 'Préparation des supports : rebouchage, ponçage', unite: 'm²', qte: 1 },
      { designation: 'Impression', unite: 'm²', qte: 1 },
      { designation: 'Peinture : deux couches de finition', unite: 'm²', qte: 1 },
      { designation: 'Nettoyage de fin de chantier', unite: 'forfait', qte: 1 },
    ],
    nature: 'Peinture intérieure : préparation des supports et deux couches de finition.',
    vigilance: [V_TVA, 'Indiquez la finition et la référence du produit quand le client l’a choisie : c’est ce qui évite le désaccord à la réception.'],
    depannage: false,
  },
  {
    slug: 'menuisier', nom: 'menuisier', titre: 'Menuisier',
    intro: 'Le devis de menuisier est souvent un devis sur mesure : il se fait après une prise de cotes, et chaque choix (essence, finition, quincaillerie) change le prix.',
    questions: [
      'La prise de cotes est-elle faite, ou faut-il prévoir un déplacement pour mesurer ?',
      'Quelle essence ou quel matériau, et quelle finition ?',
      'Faut-il déposer et évacuer l’ancien ouvrage ?',
      'Pour une fenêtre ou une porte extérieure : quelles performances le client attend-il ?',
      'Quel est l’accès pour livrer et monter l’ouvrage ?',
    ],
    lignes: [
      { designation: 'Prise de cotes', unite: 'forfait', qte: 1 },
      { designation: 'Fabrication sur mesure (à préciser)', unite: 'u', qte: 1 },
      { designation: 'Dépose de l’existant', unite: 'u', qte: 1 },
      { designation: 'Pose et réglages', unite: 'h', qte: 1 },
      { designation: 'Finition', unite: 'forfait', qte: 1 },
    ],
    nature: 'Fabrication et pose d’un ouvrage de menuiserie sur mesure.',
    vigilance: [V_TVA, 'Écrivez l’essence, la finition et la quincaillerie sur la ligne : sur un ouvrage sur mesure, c’est ce que le client a accepté.'],
    depannage: false,
  },
  {
    slug: 'couvreur', nom: 'couvreur', titre: 'Couvreur',
    intro: 'Le devis de couvreur part souvent d’une urgence (des tuiles envolées, une fuite) et d’une toiture qu’on ne voit pas depuis le sol. Les photos et les surfaces font le sérieux du devis.',
    questions: [
      'Quel type de couverture : tuiles, ardoises, bac acier, zinc ?',
      'Quelle surface de toiture, et quelle pente ?',
      'Le client a-t-il des photos du dommage, ou faut-il une visite ?',
      'Faut-il un échafaudage, une nacelle, une autorisation d’occupation de la voirie ?',
      'L’assurance habitation du client est-elle déjà prévenue (sinistre) ?',
    ],
    lignes: [
      { designation: 'Installation d’échafaudage ou de protections', unite: 'forfait', qte: 1 },
      { designation: 'Dépose de la couverture endommagée', unite: 'm²', qte: 1 },
      { designation: 'Fourniture et pose : tuiles ou ardoises (à préciser)', unite: 'm²', qte: 1 },
      { designation: 'Reprise des faîtages et des rives', unite: 'ml', qte: 1 },
      { designation: 'Évacuation des déchets', unite: 'forfait', qte: 1 },
    ],
    nature: 'Réparation de couverture : remplacement des éléments endommagés.',
    vigilance: [V_DECENNALE, V_DEPANNAGE],
    depannage: true,
  },
  {
    slug: 'carreleur', nom: 'carreleur', titre: 'Carreleur',
    intro: 'Le devis de carreleur se joue sur le support et le format : un grand carreau sur un sol à reprendre n’a rien à voir avec une pose simple. Le métré et la préparation doivent apparaître.',
    questions: [
      'Quelle surface au sol et au mur, pièce par pièce ?',
      'Quel est le support : chape, ancien carrelage, plancher bois ?',
      'Quel format de carreau, et qui le fournit ?',
      'Quel type de pose : droite, décalée, en diagonale ?',
      'Faut-il une étanchéité (douche à l’italienne, salle d’eau) ?',
    ],
    lignes: [
      { designation: 'Dépose de l’ancien revêtement', unite: 'm²', qte: 1 },
      { designation: 'Préparation du support : ragréage', unite: 'm²', qte: 1 },
      { designation: 'Système d’étanchéité sous carrelage', unite: 'm²', qte: 1 },
      { designation: 'Pose du carrelage', unite: 'm²', qte: 1 },
      { designation: 'Joints et plinthes', unite: 'ml', qte: 1 },
    ],
    nature: 'Pose de carrelage au sol : préparation du support et pose.',
    vigilance: [V_DECENNALE, V_TVA],
    depannage: false,
  },
]

export const metierParSlug = (slug: string): MetierDevis | undefined => METIERS_DEVIS.find((m) => m.slug === slug)

/** Les pages de la rubrique, pour le maillage interne (bloc « Pour aller plus loin ») et le sitemap. */
export const PAGES_DEVIS: { path: string; label: string; texte: string }[] = [
  { path: '/generateur-devis', label: 'Générateur de devis gratuit', texte: 'Faites un devis en ligne, sans compte, et téléchargez-le en PDF.' },
  { path: '/modele-devis', label: 'Modèles de devis par métier', texte: 'Les lignes, les questions à poser et les points de vigilance de chaque métier.' },
  { path: '/comment-faire-un-devis', label: 'Comment faire un devis', texte: 'Les mentions obligatoires et les étapes, textes officiels à l’appui.' },
  { path: '/logiciel-devis-artisan', label: 'Logiciel de devis artisan', texte: 'Presti : le devis chiffré par l’IA sur vos prix, depuis la demande du client.' },
]

/** Sérialise un bloc de données structurées pour un <script type="application/ld+json"> : `<`, `>` et `&` échappés. */
export const jsonLd = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
