# Chantier 2 — Landing prestiapp.fr : diagnostic, trois directions, structure (plan à approuver)

Rédigé le 01/11/2026 selon le prompt 4 de Benj (`prompts-benj/p4-landing.md`) : « Ne génère pas le code complet avant mon choix
de direction. » Rien n'est construit avant son choix.

## 0. Décision de Benj (02/11/2026, matin) — elle prime sur la suite

- **Direction A avec le hero de B** : la v2 « Cinéma », avec l'écran réel de Presti animé en accroche.
- **Structure imposée du prompt 4, à la lettre** (« respecte bien ce que les prompts ont dit et les structures et les consignes
  données », « éviter la friction, aller au simple et à l'essentiel ») : 7 sections, dans l'ordre du prompt
  (`prompts-benj/p4-landing.md:33-103`) :
  1. Hero, avec « Essayer Presti » et « Presti pour l'entreprise » ;
  2. Problème ;
  3. Comment ça marche ;
  4. Fonctionnalités essentielles ;
  5. Pour qui ;
  6. Presti pour l'entreprise, avec son texte exact, sans prix ;
  7. CTA final, avec « Créer mon compte » et « Demander une démo entreprise ».
  Le §3 ci-dessous ajoutait « Confiance » et « Tarifs » sur la page et fusionnait Problème et Fonctionnalités : c'est corrigé. Tarifs,
  confiance, comparatif et maquette passent en pages secondaires (livrable 10 du prompt).
- Règle n8n-first : la landing est de l'interface. Toute automatisation qu'elle déclenche (demande de démo, maquette) passe par n8n.

## 1. Diagnostic de la page actuelle

- **`app/page.tsx` (433 lignes) compte 14 sections** : hero (l.176), bande d'accroche (l.210), preuve (l.222), `comment` (l.235),
  `fonctionnalites` (l.255 : `DemoSequence` ; `DemoVideo` seulement si le drapeau `landingVideo`, baissé à `lib/flags.ts:66`),
  `chiffres` (l.266), `compta` (fond clair, l.275), `pour-qui` (l.285), `confiance` (fond clair, l.303), `tarifs` (l.322),
  `comparatif` (l.376), `maquette` (`MaquetteForm`, l.386), `questions` (l.403), appel final (l.419). C'est deux fois le maximum
  de 7 que fixe le prompt.
- **Branche `refonte-1018`** (19/10, 37 commits absents de `main`, 86 fichiers) : une landing v2 « Cinéma » complète
  (`app/landing/LandingV2.tsx`, 353 lignes, et `landing-v2.css`, 153 lignes) derrière le drapeau `landingV2`. Ce drapeau n'existe
  que sur la branche, posé à `true` par un commit de prévisualisation à retirer avant fusion. Elle a 10 sections, avec le hero
  « Le premier qui répond décroche le chantier. ». La branche contient aussi des pages `/offres` (+102 lignes) et `/comparatif`
  (+43), et la console v2 « Instrument » (prévue pour le chantier 4).
- **Fichiers non commités du 27/10** (décision de Benj : on les garde et on les intègre), rassemblés sur la branche
  `vitrine-seo-2710` (dossier `presti-landing`) : 4 pages SEO (`comment-faire-un-devis`, `generateur-devis`,
  `logiciel-devis-artisan`, `modele-devis`), `SeoBlocs.tsx`, `ressources.css`, `lib/seoDevis.ts`, et des retouches de
  `Breadcrumb`, `PublicPied`, `globals.css`, `page.tsx`, `sitemap.ts`, `llms.txt`. Typage et compilation verts le 01/11, après
  deux corrections (FAQ par offre, délai d'annulation lu dans `lib/pilote/regles`).
- **Prix** : `lib/plans.ts:98-99` (Studio 59 €/mois, Signature 99 €/mois) et `ESSAI_JOURS` à `lib/plans.ts:108` (7 et 21 jours,
  sans carte). « Presti pour l'entreprise » : sur devis, sans prix public (décision du 01/11). Elle n'existe pas encore dans
  `lib/plans.ts` (c'est le chantier 4).
- **Mesures de départ** : la note du 18/10 donne un temps de blocage (TBT) de 950 ms sur ordinateur et de 2 900 ms sur mobile.
  La mesure du 01/11 par PageSpeed est refusée (quota du jour épuisé, HTTP 429) : on la refait en local (Lighthouse) avant le
  premier changement. Objectif du prompt : TBT mobile sous 200 ms, LCP sous 2,5 s, CLS sous 0,1.

## 2. Trois directions créatives

| | A — « Cinéma », sur la v2 existante (recommandée) | B — « Le produit en héros » | C — « Ce que vous perdez » |
|---|---|---|---|
| Idée | Reprendre `LandingV2` de `refonte-1018` (piste B recommandée le 18/10) et la ramener à 7 sections | Le vrai écran de Presti en accroche, animé carte par carte, mots un par un (grammaire de mikalianov et yova2n, analyse des vidéos du 01/11) | Un calculateur en accroche : l'artisan met ses propres chiffres (demandes reçues, temps de réponse) et voit ce qui lui échappe (RWKyUJLi-kI [03:26]) |
| Hero | « Le premier qui répond décroche le chantier. » | « Vos devis en quelques minutes. Presti prépare les relances et le suivi. » sur l'écran réel animé | « Combien de chantiers vous échappent chaque mois ? » |
| Structure | Les 7 sections du §3, en reprenant les blocs déjà écrits de la v2 (démo `HeroApp`, `DemoGestion`, `DemoSite`…) : on coupe de 10 à 7 | Les mêmes 7 sections, mais le hero est une démo plein cadre (devis créé, relance prévue, facture) qui défile carte par carte | Le hero est un calculateur (demandes par semaine, délai de réponse) qui donne « ce qui vous échappe », hypothèse écrite à côté ; puis les 6 autres sections |
| Textes | Promesse de vitesse ; phrases courtes, bénéfices d'abord, mots d'artisan ; « Studio prépare, vous validez ; Signature envoie seul » | Peu de texte : une phrase de promesse, puis une légende de 3 à 6 mots sous chaque étape de la démo | Orienté douleur : seulement les chiffres que l'artisan tape lui-même, jamais un chiffre inventé ni un résultat promis |
| Hiérarchie visuelle | Fond nuit, aube corail en dégradé CSS (sans WebGL) ; un grand titre à gauche, la démo à droite dès le premier écran ; sections claires pour Confiance et Tarifs ; beaucoup de vide | Le produit occupe environ 60 % du premier écran ; texte minimal ; mouvement continu chargé après l'affichage ; corail réservé à l'action | Un bloc interactif au centre, de grands chiffres, un contraste fort ; la solution vient juste après |
| Force | Le plus rapide et le plus sûr : déjà écrit, jugé par deux tours de jury le 19/10 | Le plus « futuriste » : le produit se montre au lieu de se décrire | Le plus orienté conversion |
| Risque | Moins neuve visuellement | Poids de l'animation : vidéo ou CSS chargée après l'affichage, jamais de WebGL au chargement | Tout chiffre affiché doit avoir une source ; rien sur la page n'est un résultat promis |

**Recommandation (défaut si Benj ne tranche pas)** : A comme base, avec le hero animé de B. C'est le meilleur rapport entre
vitesse, qualité et performance.

## 3. Structure recommandée : 7 sections, un message chacune

1. **Hero** : la promesse en une phrase, une sous-phrase, l'écran réel de Presti animé. Bouton principal « Essayer gratuitement »,
   bouton secondaire « Presti pour l'entreprise ».
2. **Ce que Presti fait à votre place** : 3 douleurs (temps des devis, relances oubliées, documents et stock), puis 6 fonctions
   (devis, factures et relances, clients, stock, documents, assistant), en vrais extraits animés. Chaque artisan fictif porte
   « Exemple ».
3. **Comment ça marche, en 3 temps** : vous décrivez le chantier, Presti prépare le devis, vous validez et envoyez.
4. **Pour qui** : artisans du bâtiment, TPE, artisans multi-chantiers, architectes et entreprises. Les deux derniers mènent au bloc
   entreprise.
5. **Confiance** : vos données, votre marque devant vos clients (marque blanche), RGPD, mentions légales.
6. **Tarifs** (Studio et Signature lus dans `lib/plans.ts`, essai sans carte), suivis du bloc **« Presti pour l'entreprise »**
   (texte exact du prompt, sans prix ; bouton « Demander une démo » vers `/contact` avec le motif « entreprise »).
7. **Questions, puis appel final** : « Créer mon compte » et « Demander une démo entreprise ».

**Ce qui passe sur `/offres` ou une sous-page** : le comparatif, les chiffres, le détail de la compta, la maquette de site
(`MaquetteForm`, gardée et toujours branchée sur les prospects entrants), et les 4 pages SEO du 27/10.

## 4. Questions encore ouvertes, avec leur défaut

1. Direction : A, B ou C ? Défaut : A, avec le hero de B.
2. Phrase du hero ? Défaut : celle de A. La variante de B est vraie pour les deux offres : Studio prépare, Signature envoie seul.
3. Destination du bouton « Demander une démo » ? Défaut : `/contact` avec le motif « entreprise ».

## 5. Après le choix de Benj : exécution

1. Branche `landing-0111` partie de `main`.
2. Y intégrer d'abord `vitrine-seo-2710`, puis `LandingV2`, sans le commit qui lève le drapeau.
3. Couper à 7 sections, derrière le drapeau `landingV2`, baissé en production.
4. Mesurer Lighthouse avant et après.
5. Écrire les tests au lanceur, capables de rougir :
   - 7 sections au plus et un seul `h1` ;
   - aucun prix en dur et aucune promesse interdite ;
   - ni bleu ni cyan ;
   - des liens qui marchent ;
   - l'ancienne page reste publique tant que le drapeau est baissé.
6. `npm run build`, push, puis `attendre-deploiement`, et vérification en direct sur mobile et sur ordinateur.
7. Audit distinct (promesses, accessibilité, performance).
8. Le drapeau ne se lève que sur le « oui » de Benj.

Répartition (règle de Benj du 01/11 au soir) : le texte, la structure et le code par Claude Code ; les variantes d'animation et les
captures par Hermes sur Haiku 5.5 ; un modèle gratuit de freellmapi seulement pour une petite tâche.
