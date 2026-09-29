// lib/agents/acquisition/douleurs.ts — la bibliothèque des douleurs des artisans du bâtiment (fiche 026-073).
//
// Chaque entrée est une phrase que des artisans ont écrite eux-mêmes sur une page publique, lisible sans compte par un
// robot poli (robots.txt respecté), avec sa page source et la date de la relève. La citation est recopiée mot pour mot,
// fautes comprises : scripts/douleurs-qa.mjs (DL-4) relit chaque page et la retrouve, ou l'entrée échoue. Aucune donnée
// personnelle : ni pseudo, ni nom, ni ville, ni lien de profil ; la page source est celle du fil, jamais celle d'un auteur.
//
// Cible PROVISOIRE (décision du 29/09/2026, .orchestre/decisions.md) : 12 citations sur 3 métiers au moins ; la
// complétion à 40 citations sur 8 métiers est renvoyée à la fiche de suite 026-254. Toutes les entrées naissent à
// approuve: false : Benj les lit une fois, Claude Code passe les approuvées à true dans un commit à part. Seules les
// approuvées entrent dans un message. Une passe nouvelle AJOUTE des entrées, elle n'en réécrit jamais une approuvée.
import type { Metier } from './contrat'

export type Douleur = {
  id: string
  /** Un identifiant de METIERS, ou 'tous' pour une douleur commune au bâtiment. */
  metier: Metier['id'] | 'tous'
  /** La phrase exacte, telle qu'écrite sur la page (200 signes au plus). */
  citation: string
  /** La page du fil ou de l'article (jamais une page de profil). */
  source_url: string
  /** AAAA-MM-JJ : la date de la relève. */
  relevee_le: string
  mots_cles: readonly string[]
  /** Une phrase de vouvoiement qui finit par « ? » (160 signes au plus, sans chiffre) : celle qui entre dans le premier message. */
  question: string
  /** L'accroche d'objet (60 signes au plus). */
  accroche_objet: string
  approuve: boolean
}

export const DOULEURS: readonly Douleur[] = Object.freeze(
  [
    { id: "plombier-plateforme-meme-demande", metier: "plombier", citation: "la plateforme vens la meme proposition a plusieurs entreprises qui se retrouvent en concurrence et il arrive qu'aucune des trois ne remporte le chantier", source_url: "https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html", relevee_le: '2026-09-29', mots_cles: ["plateforme", "concurrence", "demande", "chantier"], question: "Quand une même demande est vendue à plusieurs entreprises, comment faites-vous pour que le client vous choisisse ?", accroche_objet: "Même demande, plusieurs concurrents ?", approuve: true },
    { id: "plombier-plateforme-contact-bidon", metier: "plombier", citation: "Bien souvent les chantiers vous sont attribués le vendredi, vous appelez le lundi, mais il s'agit d'un contact bidon", source_url: "https://plombiers-reunis.com/topic9863-que-pensez-vous-des-plateformes-de-mise-en-relation.html", relevee_le: '2026-09-29', mots_cles: ["plateforme", "contact", "rappel", "chantier"], question: "Les contacts payés sur une plateforme, combien débouchent sur un vrai chantier ?", accroche_objet: "Vos contacts payés, ça donne des chantiers ?", approuve: true },
    { id: "plombier-manque-clientele", metier: "plombier", citation: "je suis plombiers de métier et j'ai presque 20 ans d'expérience, ce qui me manque c'est la clientèle pour démarrer", source_url: "https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html", relevee_le: '2026-09-29', mots_cles: ["clientele", "demarrage", "installation"], question: "Quand on se lance à son compte, comment vos premiers clients vous trouvent-ils ?", accroche_objet: "Comment vos premiers clients vous trouvent ?", approuve: false },
    { id: "plombier-sans-clientele-risque", metier: "plombier", citation: "sans clientèle c'est risqué, si tu restes 1 ou 2 mois sans rien facturer ou presque rien, c'est pas top pour toi et pour tes finances", source_url: "https://plombiers-reunis.com/topic8284-avis-sur-creation-entreprise.html", relevee_le: '2026-09-29', mots_cles: ["clientele", "facturation", "tresorerie"], question: "Pendant les mois sans facture, qu'est-ce qui fait venir les prochains clients jusqu'à vous ?", accroche_objet: "Des mois creux, des clients qui reviennent ?", approuve: false },
    { id: "plombier-bureaucratie", metier: "plombier", citation: "toute cette bureaucratie, coute terriblement cher", source_url: "https://plombiers-reunis.com/topic8284-avis-sur-creation-entreprise.html", relevee_le: '2026-09-29', mots_cles: ["administratif", "paperasse", "cout"], question: "Le temps passé sur la paperasse, à quel moment de la semaine le prenez-vous ?", accroche_objet: "La paperasse, quand la faites-vous ?", approuve: true },
    { id: "chauffagiste-assurance-prix", metier: "chauffagiste", citation: "Je voudrais une assurance fiable mais je ne suis pas en mesure de mettre 330 € par mois", source_url: "https://plombiers-reunis.com/topic9711-decennale-et-responsabilite-civile-professionnelle.html", relevee_le: '2026-09-29', mots_cles: ["assurance", "charges", "installation"], question: "Quand les charges fixes du début pèsent lourd, comment trouvez-vous les clients qui les couvrent ?", accroche_objet: "Des charges fixes, des clients pour les couvrir ?", approuve: false },
    { id: "chauffagiste-recherches-sponsorisees", metier: "chauffagiste", citation: "Les recherches que je fais sur internet maintenant sont toutes sponsorisées, ils te vendraient n'importe quoi en te racontant n'importe quoi.", source_url: "https://plombiers-reunis.com/topic9711-decennale-et-responsabilite-civile-professionnelle.html", relevee_le: '2026-09-29', mots_cles: ["internet", "recherche", "publicite", "visibilite"], question: "Quand vos clients cherchent un chauffagiste sur internet, tombent-ils sur vous ou sur une publicité ?", accroche_objet: "Sur internet, c'est vous ou la pub ?", approuve: true },
    { id: "chauffagiste-reseau-perdu", metier: "chauffagiste", citation: "Je n'ai plus trop de réseau ,alors je voulais savoir si cela était vraiment un frein pour démarrer?", source_url: "https://plombiers-reunis.com/topic8284-avis-sur-creation-entreprise.html", relevee_le: '2026-09-29', mots_cles: ["reseau", "clientele", "demarrage"], question: "Après une pause, comment retrouvez-vous des clients sans réseau autour de vous ?", accroche_objet: "Sans réseau, comment trouver des clients ?", approuve: false },
    { id: "chauffagiste-paperasse", metier: "chauffagiste", citation: "Oui beaucoup de paperasse pour les différentes formation.", source_url: "https://plombiers-reunis.com/topic8284-avis-sur-creation-entreprise.html", relevee_le: '2026-09-29', mots_cles: ["paperasse", "formation", "administratif"], question: "Entre les formations, les dossiers et les papiers, quand vous reste-t-il du temps pour répondre aux clients ?", accroche_objet: "Des dossiers, mais des clients sans réponse ?", approuve: false },
    { id: "electricien-premier-devis", metier: "electricien", citation: "Et pour mon premier chantier évidemment je suis en difficulté pour établir le devis.", source_url: "https://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?t=13016", relevee_le: '2026-09-29', mots_cles: ["devis", "premier", "chantier"], question: "Devant un premier chantier, combien de temps vous faut-il pour mettre un devis sur papier ?", accroche_objet: "Le premier devis, en combien de temps ?", approuve: false },
    { id: "electricien-devis-une-heure", metier: "electricien", citation: "Je me doit d'effectuer des devis pour le patron en 1h max en comptant le matériel nécessaire + MO. Je trouve cela délicat et pas optimale niveau temps.", source_url: "https://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?t=12472", relevee_le: '2026-09-29', mots_cles: ["devis", "temps", "materiel", "main-oeuvre"], question: "Quand un devis doit partir dans l'heure, comment le préparez-vous sans y laisser votre soirée ?", accroche_objet: "Un devis dans l'heure, sans y passer la soirée ?", approuve: true },
    { id: "electricien-devis-longs", metier: "electricien", citation: "Les premiers devis vont être long a rédiger car il faut tout compter et vérifier sa marge", source_url: "https://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?t=12472", relevee_le: '2026-09-29', mots_cles: ["devis", "redaction", "marge"], question: "Vos devis, combien de temps passez-vous à les rédiger après une journée de chantier ?", accroche_objet: "Vos devis, le soir après le chantier ?", approuve: true },
    { id: "electricien-redactions-ratees", metier: "electricien", citation: "Ah Effectivement les premières rédactions sont compliquées et parfois ratées.", source_url: "https://www.volta-electricite.info/forums-volta-electricite/viewtopic.php?t=13016", relevee_le: '2026-09-29', mots_cles: ["devis", "redaction", "erreur"], question: "Comment évitez-vous les devis ratés quand vous les écrivez le soir, fatigué ?", accroche_objet: "Des devis sans erreur, même fatigué ?", approuve: false },
    { id: "tous-plateforme-curieux-du-prix", metier: "tous", citation: "la majorité du temps je n'ais pas eu le marché, sans compter les clients qui cherchent seulement a connaitre le prix de la prestation", source_url: "https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html", relevee_le: '2026-09-29', mots_cles: ["plateforme", "prix", "demande", "tri"], question: "Face aux clients qui veulent seulement connaître un prix, comment repérez-vous les vraies demandes ?", accroche_objet: "Les curieux du prix, comment les trier ?", approuve: true },
  ].map((d) => Object.freeze({ ...d, mots_cles: Object.freeze([...d.mots_cles]) })),
)
