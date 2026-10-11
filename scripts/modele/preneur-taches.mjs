// scripts/modele/preneur-taches.mjs — les tâches de RÉDACTION INTERNE dont on distille les réponses pour le modèle maison « presti-preneur »
// (docs/agents/modele-maison-preneur.md). Trois sources, toutes sans donnée de prospect (le juge le prouve) :
//   1. REELLES : les tâches `redaction_interne` réellement passées par le bus (ops.taches, lues le 06/10/2026 à 21 h UTC), e-commerce seulement : celles de
//      maintenance d'agents (disjoncteur, preneur, bilan de cycle) sont aujourd'hui écartées par filtrerTaches et ne servent pas ;
//   2. CHEF : les tâches écrites à la main pour le Chef léger (CARTES de donnees-chef-leger.mjs), qu'il donnera au preneur : ce sont ses futures entrées ;
//   3. GABARITS : des variantes par produit, par livrable et par question d'acheteur (e-commerce), par métier, par objection et par livrable (Presti).
// EPREUVE : 12 tâches jamais vues (4 réelles mises de côté + 8 écrites à part), gardées pour la mesure sur l'usine ; aucune n'entre dans les données.
import { CARTES, hasard } from './donnees-chef-leger.mjs'

const T = 'redaction_interne'
const tache = (id, objet, titre, pourquoi, extra = {}) => ({ id, type: T, capacite: T, objet, charge: { titre, pourquoi }, attendu: 'travail', ...extra })
const STRAT = 'Stratégie e-commerce décidée le 06/10 au soir : docs/ecommerce/STRATEGIE-ECOM-0610-SOIR.md (deux produits, sans stock, eBay + TikTok organique).'

// ── 1. les tâches réelles du bus (06/10) ─────────────────────────────────────────────────────────────────────────────────
export const REELLES = [
  tache('reel-liste-produits', "Lister 5 produits éligibles pour la vente sur AliExpress, TikTok Shop et eBay, avec prix d'achat, prix de vente estimé, marge brute et disponibilité en stock UE, en vue de la validation par Benj.", 'Préparation liste produits e-commerce (AliExpress, TikTok Shop, eBay)', "Consigne Benj : priorité à l'acquisition e-commerce. Les produits doivent être compatibles avec les contraintes logistiques (expédition France pour TikTok Shop) et les règles de marge de Presti."),
  tache('reel-scripts-video-kits', 'Écrire trois scripts vidéo de 20 secondes chacun pour les produits kit tournevis précision, kit accrochage mural, niveau laser, et rangement atelier.', 'Rédaction de scripts vidéo', 'Les scripts sont nécessaires pour la production des vidéos promotionnelles.'),
  tache('reel-titres-ebay-kits', 'Écrire des titres et descriptions pour les produits kit tournevis précision, kit accrochage mural, niveau laser, et rangement atelier sur eBay.fr.', 'Rédaction de titres et descriptions pour eBay', 'Les titres et descriptions sont essentiels pour la visibilité des produits sur eBay.'),
  tache('reel-questions-ebay-kits', "Écrire une liste de cinq questions d'acheteurs avec réponses pour les produits kit tournevis précision, kit accrochage mural, niveau laser, et rangement atelier.", 'Rédaction de questions et réponses pour eBay', 'Les questions et réponses aident à répondre aux préoccupations des acheteurs potentiels.'),
  tache('reel-prompts-lea', "Écrire la fiche du personnage Léa et 10 prompts d'images Nano Banana verticaux qui gardent le même visage, scènes d'atelier", 'Prompts Nano Banana du personnage Léa', "Créer un personnage d'influenceuse IA constant (même visage, mêmes vêtements) pour les vidéos TikTok de Brico Travaux."),
  tache('reel-scripts-souffleur', 'Écrire 3 scripts TikTok de 20 secondes pour le mini souffleur turbo, joués par une influenceuse IA (Léa, bricoleuse), atelier, sans chiffre non prouvé', "3 scripts TikTok de 20 s pour l'influenceuse IA Léa", 'Lancement du mini souffleur turbo (docs/ecommerce/lancement-premier-produit-0610.md) sur le compte Brico Travaux avec une influenceuse générée par IA.'),
  tache('reel-strategie-videos', "Lire les analyses de vidéos e-commerce du Savoir et en tirer la stratégie marketing pour Brico Travaux et eBay : 5 règles concrètes, chacune sourcée", 'Stratégie marketing e-commerce tirée des vidéos', "Benj veut que l'écosystème choisisse la meilleure stratégie à partir des vidéos e-commerce analysées (docs/ecommerce/sources, docs/connaissance-videos) : produit, TikTok Brico Travaux, eBay."),
  tache('reel-plan-pubs', "Préparer le plan de test des publicités Meta et Google Ads pour le premier produit : ciblage, accroches, textes, budget de test et critère d'arrêt", 'Publicités Meta et Google Ads pour nos produits', 'Benj veut des publicités Meta (Facebook, Instagram) et Google Ads pour les produits e-commerce, en plus de TikTok.'),
  tache('reel-choix-boutique', 'Comparer eBay, TikTok Shop et Shopify pour notre boutique à partir des règles et des mesures du Savoir, et recommander', 'Boutique : eBay, TikTok Shop ou Shopify ?', 'Benj demande où ouvrir notre boutique. Règles lues : docs/ecommerce/recherches/regles-officielles-0510.md (TikTok Shop interdit le dropshipping depuis la Chine), mesures de marge : docs/ecommerce/recherches/vendus-ebay-aliexpress-0610.md, stratégie : STRATEGIE-0610.md.'),
  tache('reel-scripts-animes-souffleur', 'Écrire 3 scripts TikTok de présentation animée du mini souffleur avec les mots-clés de vidéos libres de droits à chercher pour chaque plan', 'Variante B des TikTok : présentation animée du produit', 'Benj veut deux variantes de vidéos : A l’influenceuse IA, B une présentation simple du produit avec animations et vidéos libres de droits de personnes en situation.'),
  tache('reel-annonces-deux-produits', "Rédiger les annonces eBay.fr complètes (titre de 80 signes, description, points forts, FAQ acheteur) du nettoyeur haute pression sans fil et de l'aspirateur de voiture sans fil", 'Annonces eBay complètes des deux produits', STRAT),
  tache('reel-scripts-anime-aspirateur', "Écrire 3 scripts TikTok de 15 à 20 secondes au format présentation animée pour l'aspirateur de voiture sans fil, avec les mots-clés de vidéos libres de droits par plan", "3 scripts animés (format B) pour l'aspirateur", STRAT),
  tache('reel-accroches-nettoyeur', 'Écrire 10 accroches TikTok de moins de 2 secondes pour le nettoyeur haute pression sans fil à batterie (voiture, terrasse, vélo), compte Brico Travaux', '10 accroches TikTok pour le nettoyeur haute pression sans fil', STRAT),
  tache('reel-scripts-anime-nettoyeur', 'Écrire 3 scripts TikTok de 15 à 20 secondes au format présentation animée pour le nettoyeur haute pression sans fil, avec les mots-clés de vidéos libres de droits par plan', '3 scripts animés (format B) pour le nettoyeur', STRAT),
  tache('reel-accroches-aspirateur', "Écrire 10 accroches TikTok de moins de 2 secondes pour l'aspirateur de voiture sans fil rechargeable, compte Brico Travaux", "10 accroches TikTok pour l'aspirateur de voiture sans fil", STRAT),
]
// mises de côté pour l'épreuve (réelles, jamais dans les données)
export const REELLES_EPREUVE = [
  tache('reel-scripts-lea-deux-produits', "Écrire 2 scripts TikTok de 20 secondes par produit (nettoyeur haute pression sans fil, aspirateur de voiture sans fil) joués par l'influenceuse IA Léa, mention personnage généré par IA", 'Scripts de Léa (format A) pour les deux produits', STRAT),
  tache('reel-reponses-acheteurs', "Rédiger 8 réponses types aux questions d'acheteurs eBay (délai, suivi, retour, garantie, colis abîmé, annulation) sans aucune promesse que nous ne pouvons pas tenir", 'Réponses types aux acheteurs eBay', STRAT),
  tache('reel-calendrier-7-jours', 'Écrire le calendrier de publication TikTok de 7 jours du compte Brico Travaux : 2 vidéos par jour et par produit, alternance formats A (Léa) et B (animé), heure et accroche', 'Calendrier TikTok de 7 jours', STRAT),
  tache('reel-annonce-cle-molette', "Rédiger un texte d'annonce eBay optimisé pour une clé à molette 300mm, incluant mots-clés, arguments techniques et prix compétitif.", 'Texte prêt à publier pour clé à molette', 'Premier livrable e-commerce conforme à la consigne Benj. Intégrer les règles eBay validées en veille.'),
]

// ── 2. les tâches que le Chef léger donnera (CARTES), en rédaction interne ────────────────────────────────────────────────
// Les tâches de code et la relecture de la consigne du Chef (un fichier hors du Savoir) n'en sont pas ; la relecture de la page d'accueil lit le site : IMPOSSIBLE attendu.
const HORS_CHEF = new Set(['juge-nombres-scripts', 'test-marque-blanche', 'relire-consigne-chef'])
export const CHEF = CARTES.filter((c) => !HORS_CHEF.has(c.id)).flatMap((c) => c.objet.map((o, i) => tache(`chef-${c.id}-${i + 1}`, o, c.titre, c.pourquoi, c.id === 'relire-page-accueil' ? { attendu: 'impossible' } : {})))

// ── 3. les gabarits ──────────────────────────────────────────────────────────────────────────────────────────────────────
const PRODUITS = [
  { id: 'nettoyeur', nom: 'nettoyeur haute pression sans fil', le: 'du nettoyeur haute pression sans fil', usages: ['voiture', 'terrasse', 'vélo', 'vitres', 'salon de jardin'] },
  { id: 'aspirateur', nom: 'aspirateur de voiture sans fil', le: "de l'aspirateur de voiture sans fil", usages: ['miettes entre les sièges', 'tapis de sol', 'coffre', 'siège enfant', "poils d'animaux"] },
  { id: 'souffleur', nom: 'mini souffleur turbo', le: 'du mini souffleur turbo', usages: ['établi de l’atelier', 'clavier', 'grille du barbecue', 'habitacle de voiture'] },
]
const QUESTIONS_ACHETEUR = [
  'Quand vais-je recevoir ma commande ?', 'Le colis est arrivé abîmé, que dois-je faire ?', 'Puis-je renvoyer le produit s’il ne me convient pas ?',
  'La batterie ne se recharge plus, que faire ?', 'Quelle garantie avez-vous sur ce produit ?', 'Je veux annuler ma commande, c’est possible ?',
  'Le suivi n’avance plus depuis plusieurs jours, où est mon colis ?', 'Est-ce que tous les accessoires sont fournis dans la boîte ?',
  'Pouvez-vous me faire une facture ?', 'Le produit marche-t-il sous la pluie ?', 'Faites-vous un prix pour deux exemplaires ?',
  'Le produit est-il neuf et dans sa boîte d’origine ?',
]
const LIVRABLES_ECOM = [
  (p) => [`Proposer 3 titres d'annonce eBay de 80 signes au plus pour le ${p.nom}, avec les mots que tapent les acheteurs, sans superlatif.`, `Titres d'annonce eBay ${p.le}`],
  (p) => [`Rédiger la description complète de l'annonce eBay ${p.le} : usage, contenu du colis, délai, retour et garantie légale, caractéristiques laissées à recopier.`, `Description eBay ${p.le}`],
  (p) => [`Écrire les 5 points forts de l'annonce eBay ${p.le}, une ligne chacun, sans performance chiffrée absente de la fiche.`, `Points forts de l'annonce ${p.le}`],
  (p, h) => { const n = h.un([5, 8, 10]); return [`Écrire ${n} accroches TikTok de 8 mots au plus pour le ${p.nom}, une par usage (${p.usages.slice(0, 3).join(', ')}), sans chiffre inventé.`, `${n} accroches TikTok ${p.le}`] },
  (p, h) => { const u = h.un(p.usages); return [`Écrire le script TikTok de 20 secondes (format A, Léa, personnage généré par IA) ${p.le} sur l'usage « ${u} » : problème, geste, résultat, texte à l'écran.`, `Script format A ${p.le} (${u})`] },
  (p, h) => { const u = h.un(p.usages); return [`Écrire le script TikTok format B (présentation animée) ${p.le} pour l'usage « ${u} », plan par plan, avec les mots-clés de vidéos libres de droits à chercher.`, `Script format B ${p.le} (${u})`] },
  (p) => [`Écrire 5 légendes TikTok pour les vidéos ${p.le}, chacune avec un appel vers le lien du profil, sans promesse de performance.`, `Légendes TikTok ${p.le}`],
  (p) => [`Rédiger la FAQ de l'annonce eBay ${p.le} : 6 questions d'acheteurs et leurs réponses, 3 phrases au plus chacune.`, `FAQ acheteur ${p.le}`],
  (p) => [`Écrire la liste de contrôle avant de publier l'annonce eBay ${p.le} : prix, délai réel, photos, batterie, retour, garantie ; une ligne par point.`, `Contrôle avant publication ${p.le}`],
  (p) => [`Rédiger le message envoyé à l'acheteur quand le ${p.nom} est expédié : remerciement, numéro de suivi à coller, délai annoncé, contact en cas de souci.`, `Message d'expédition ${p.le}`],
  (p) => [`Écrire le texte à l'écran d'une vidéo avant / après ${p.le} : 6 cartons de 6 mots au plus, du problème au lien du profil.`, `Texte à l'écran avant / après ${p.le}`],
  (p) => [`Résumer en un tableau les options de fournisseur ${p.le} lues dans le Savoir (prix, délai, automatisation de la commande) et dire laquelle retenir.`, `Choix du fournisseur ${p.le}`],
  (p) => [`Proposer une idée de lot ou de vente additionnelle pour le ${p.nom} sur eBay et rédiger la phrase qui la présente dans l'annonce.`, `Lot et vente additionnelle ${p.le}`],
  (p) => [`Rédiger 10 mots-clés de recherche eBay pour le ${p.nom}, classés du plus précis au plus large, avec la raison de chacun en 6 mots.`, `Mots-clés eBay ${p.le}`],
  (p) => [`Écrire la fiche de tournage de la vidéo de Léa ${p.le} : décor, plans, gestes, texte à l'écran, mention « personnage généré par IA ».`, `Fiche de tournage (Léa) ${p.le}`],
]
const REPONSE_ACHETEUR = (p, q) => [`Rédiger la réponse à un acheteur eBay ${p.le} qui écrit : « ${q} ». 4 phrases au plus, polie, sans promesse que nous ne pouvons pas tenir.`, `Réponse à un acheteur ${p.le}`]

const METIERS = ['plombier-chauffagiste', 'électricien', 'menuisier', 'couvreur', 'peintre', 'carreleur']
const OBJECTIONS = [
  "« C'est trop cher pour moi. »", "« Je n'ai pas confiance dans l'IA pour parler à mes clients. »", "« Je n'ai pas le temps d'installer un nouvel outil. »",
  "« J'ai peur que l'IA promette un prix à ma place. »", "« Mes clients m'appellent, ils n'écrivent pas. »", "« J'ai déjà un site, à quoi bon ? »",
  "« Et mes données, elles vont où ? »", "« Je réponds déjà à mes demandes le soir. »",
]
const LIVRABLES_PRESTI = [
  (m) => [`Écrire un post LinkedIn pour Presti qui raconte la journée d'un ${m} qui perd un chantier faute de répondre vite, puis ce que Presti change ; sans chiffre inventé.`, `Post LinkedIn Presti (${m})`],
  (m) => [`Rédiger le texte de la section « Pour qui » de la vitrine Presti pour un ${m} : son problème, ce que Presti fait pour lui, l'appel à l'essai ; 80 mots au plus.`, `Section « Pour qui » de la vitrine (${m})`],
  (m) => [`Écrire le script d'une vidéo de 20 secondes pour Presti : la vraie demande d'un client de ${m}, la réponse préparée, l'artisan qui valide.`, `Script vidéo Presti (${m})`],
  (m) => [`Rédiger 3 exemples de réponses qu'un ${m} pourrait envoyer avec Presti à une demande de devis, ton humain, sans prix ni délai inventé.`, `Exemples de réponses (${m})`],
  (m) => [`Écrire un post Facebook court pour la Page de Presti sur la relance des devis restés sans réponse, vu par un ${m}.`, `Post Facebook relance de devis (${m})`],
]
const PRESTI_SEULS = [
  ['Rédiger le message de bienvenue envoyé à un artisan qui vient de créer son essai Presti : ce qu’il doit faire en premier, en 5 phrases au plus.', 'Message de bienvenue de l’essai'],
  ["Écrire la relance d'un essai Presti expiré, à J+3, au nom de Presti : ce que ses crédits ont produit, la suite possible, sans pression.", "Relance de l'essai expiré (J+3)"],
  ["Écrire la relance d'un essai Presti expiré à J+7 : dernier message, simple, une question pour savoir ce qui a manqué.", "Relance de l'essai expiré (J+7)"],
  ['Rédiger la page « Questions » de la vitrine Presti : 6 questions d’artisans et leurs réponses, 2 phrases chacune, sans promesse non prouvée.', 'Questions de la vitrine'],
  ['Expliquer en 6 lignes à un artisan ce que montre le tableau de bord « Vos chiffres » de Presti et ce qu’il ne montre pas encore.', 'Le tableau de bord « Vos chiffres » expliqué'],
  ['Comparer en un tableau les offres Essai, Essentiel, Studio et Signature de Presti (prix, crédits, ce que fait l’assistant) à partir du Savoir.', 'Tableau des offres Presti'],
  ['Rédiger l’argumentaire du site à 300 € pour un artisan au téléphone : ce qu’il obtient, le délai, ce qui lui appartient ; 6 phrases au plus.', 'Argumentaire du site à 300 €'],
  ['Écrire la bio du compte Instagram @prestiapp : 150 signes au plus, la promesse, l’appel vers la vitrine, sans chiffre inventé.', 'Bio Instagram de Presti'],
  ['Rédiger la fiche « ce que l’IA de Presti ne fait jamais » pour la vitrine : prix inventé, délai promis, envoi sans validation… une ligne chacun.', "Ce que l'IA de Presti ne fait jamais"],
  ['Écrire 5 titres possibles pour le haut de la vitrine Presti, 8 mots au plus, centrés sur le chantier perdu faute de réponse rapide.', 'Titres du haut de la vitrine'],
  ["Rédiger le script d'appel téléphonique de Benj vers un artisan de la cible : accroche, question, offre d'essai ou de site, réponse à un refus.", "Script d'appel vers un artisan"],
  ['Écrire la note interne qui explique la différence entre le mode assisté (l’artisan valide) et le mode autonome (Studio) de Presti.', 'Mode assisté ou autonome'],
  ['Rédiger 4 messages de relance d’un devis Presti au nom de l’artisan, du plus doux au plus direct, chacun avec une question simple à la fin.', 'Relances de devis, quatre tons'],
  ['Écrire le texte de la carte « confiance » de la vitrine Presti : marque de l’artisan devant, validation par défaut, données hébergées ; 60 mots au plus.', 'Carte confiance de la vitrine'],
  ['Rédiger les règles de ton de Presti pour les publications : ce qu’on dit, ce qu’on ne dit jamais, trois exemples de phrases justes.', 'Règles de ton des publications'],
  ['Lister les 5 chantiers produit de Presti qui pèsent le plus sur la conversion et rédiger une phrase pour expliquer chacun à un artisan.', 'Les chantiers produit, expliqués'],
]
const IMPOSSIBLES = [
  ['Relever les prix des 20 dernières ventes eBay.fr du nettoyeur haute pression sans fil publiées aujourd’hui et rédiger un résumé des écarts.', 'Prix eBay du jour du nettoyeur'],
  ['Lire les commentaires reçus hier sous la dernière vidéo TikTok de Brico Travaux et rédiger une réponse à chacun.', 'Réponses aux commentaires TikTok d’hier'],
  ["Résumer les avis publiés cette semaine sur la page AliExpress du vendeur de l'aspirateur de voiture et dire s'ils changent notre choix.", 'Avis fournisseur de la semaine'],
  ['Rédiger la réponse au message d’acheteur reçu ce matin dans la messagerie eBay, en reprenant sa question mot pour mot.', 'Réponse au message eBay de ce matin'],
  ['Comparer les vues TikTok d’hier et d’avant-hier des vidéos du nettoyeur et rédiger la conclusion pour l’accroche de demain.', 'Comparaison des vues TikTok'],
  ['Relire la page tarifs en ligne sur prestiapp.fr ce soir et lister chaque phrase qui diffère de la grille actuelle.', 'Relecture de la page tarifs en ligne'],
  ['Relire le fichier promo-src/tiktok-chaine/lignes/aspirateur-03.json et corriger le texte à l’écran de chaque plan.', 'Correction du fichier de lignes de l’aspirateur'],
  ['Vérifier sur le site de la DGCCRF la règle actuelle de l’étiquetage des batteries et rédiger la mention à mettre dans l’annonce.', 'Mention batterie selon la DGCCRF'],
]

/** Les tâches générées (gabarits), dans un ordre fixe tiré de la graine. */
export function gabarits(graine = 20261007) {
  const h = hasard(graine)
  const out = []
  for (const p of PRODUITS) {
    LIVRABLES_ECOM.forEach((f, i) => { const [objet, titre] = f(p, h); out.push(tache(`ecom-${p.id}-${i + 1}`, objet, titre, h.un([STRAT, 'Le contenu organique en volume vient avant toute pub payante (stratégie du 06/10).', "Rien n'est publié avant le « publie » de Benj : le texte doit être juste ce jour-là.", 'La garde des nombres refuse tout chiffre absent des sources.'])) ) })
    const qs = p.id === 'souffleur' ? h.melange(QUESTIONS_ACHETEUR).slice(0, 4) : QUESTIONS_ACHETEUR
    qs.forEach((q, i) => { const [objet, titre] = REPONSE_ACHETEUR(p, q); out.push(tache(`acheteur-${p.id}-${i + 1}`, objet, titre, 'Répondre vite et juste évite les litiges dès la première vente. Aucune réponse ne part sans Benj : ce sont des modèles.')) })
  }
  for (const m of METIERS) LIVRABLES_PRESTI.forEach((f, i) => { const [objet, titre] = f(m); out.push(tache(`presti-${m.normalize('NFD').replace(/[^a-z-]/g, '')}-${i + 1}`, objet, titre, h.un(["L'acquisition passe par le contenu : la réponse rapide est la promesse la plus simple à comprendre pour un artisan.", 'Stratégie Presti du 06/10 : la preuve est le produit lui-même, montré tel quel, sans témoignage inventé.', 'Première cible : l’artisan du second œuvre seul ou avec un ou deux compagnons, qui reçoit déjà des demandes par Internet.'])) ) })
  OBJECTIONS.forEach((o, i) => {
    out.push(tache(`objection-${i + 1}-courte`, `Rédiger la réponse de Presti à l'objection d'un artisan ${o} en 3 phrases au plus, sans chiffre ni promesse non prouvés.`, `Réponse à une objection d’artisan (${i + 1})`, 'Les réponses aux objections servent au téléphone et sur la vitrine.'))
    out.push(tache(`objection-${i + 1}-post`, `Écrire un post LinkedIn court qui répond à l'objection ${o} qu'entend Presti chez les artisans, avec une scène concrète.`, `Post LinkedIn sur une objection (${i + 1})`, "Une objection entendue au téléphone vaut un post : c'est le mot exact des artisans."))
  })
  PRESTI_SEULS.forEach(([objet, titre], i) => out.push(tache(`presti-seul-${i + 1}`, objet, titre, h.un(['Stratégie Presti du 06/10 (docs/presti/STRATEGIE-GLOBALE-0610.md).', 'Le premier client payant doit réussir sa première semaine sans aide.', 'La vitrine transforme en essai la visite qu’amène un appel ou une publication.']))))
  IMPOSSIBLES.forEach(([objet, titre], i) => out.push(tache(`impossible-${i + 1}`, objet, titre, 'Demandé dans une consigne de Benj.', { attendu: 'impossible' })))
  return out
}

// ── l'épreuve : 8 tâches écrites à part, plus les 4 réelles mises de côté ────────────────────────────────────────────────
export const EPREUVE = [
  ...REELLES_EPREUVE,
  tache('epreuve-annonce-aspirateur-courte', "Rédiger une version courte de l'annonce eBay de l'aspirateur de voiture sans fil pour le téléphone : titre, 3 points forts, délai, retour.", "Annonce courte de l'aspirateur", STRAT),
  tache('epreuve-reponse-retard', "Rédiger la réponse à un acheteur du nettoyeur haute pression sans fil dont le colis a une semaine de retard et qui menace d'ouvrir un litige.", 'Réponse à un acheteur mécontent', 'Un litige ouvert pèse sur le compte vendeur : la réponse doit être juste et calme.'),
  tache('epreuve-accroches-hiver', "Écrire 6 accroches TikTok pour l'aspirateur de voiture sans fil adaptées à l'hiver (boue, sable, sel sur les tapis), sans chiffre inventé.", "Accroches d'hiver de l'aspirateur", 'Le relevé de marché suit la saison : les accroches doivent suivre.'),
  tache('epreuve-script-b-velo', 'Écrire le script format B (présentation animée) du nettoyeur haute pression sans fil pour le lavage d’un vélo boueux, plan par plan, avec les mots-clés de vidéos libres de droits.', 'Script B du nettoyeur (vélo)', STRAT),
  tache('epreuve-presti-chauffagiste', "Écrire un post LinkedIn pour Presti : un chauffagiste reçoit une demande de dépannage un dimanche soir, la réponse est prête quand il ouvre son téléphone.", 'Post LinkedIn : le dépannage du dimanche', "L'urgence rend la réponse rapide décisive."),
  tache('epreuve-presti-site-300', 'Rédiger le courriel de suivi envoyé à un artisan qui hésite à commander le site à 300 € : ce qu’il obtient, le délai, ce qui lui appartient.', 'Courriel de suivi du site à 300 €', 'Le site à 300 € sert de porte d’entrée (stratégie Presti du 06/10).'),
  tache('epreuve-presti-faq-credits', "Rédiger 4 questions-réponses qui expliquent les crédits de Presti à un artisan (ce qu'un crédit paie, ce qui se passe quand il n'en a plus).", 'FAQ des crédits', 'Le détail des crédits vient après les prix sur la vitrine.'),
  tache('epreuve-impossible-stats', 'Relever le nombre de visites de la vitrine prestiapp.fr de la semaine dernière et rédiger le point du lundi.', 'Point du lundi sur les visites', 'Les chiffres à suivre chaque semaine.', { attendu: 'impossible' }),
]

/** Toutes les tâches d'entraînement, dans l'ordre : réelles, Chef, gabarits. Les objets de l'épreuve n'y sont jamais (le juge le vérifie). */
export function tachesEntrainement() {
  return [...REELLES.map((t) => ({ ...t, origine: 'reelle' })), ...CHEF.map((t) => ({ ...t, origine: 'chef' })), ...gabarits().map((t) => ({ ...t, origine: 'gabarit' }))]
}
