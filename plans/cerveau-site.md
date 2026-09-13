# Le cerveau — générer le site d'un artisan (prompt v15 §3.3)

> Ce document est **la consigne de génération**. Il s'exécute tel quel, une fois par métier, par un exécutant qui ne
> connaît rien d'autre : il lit ce fichier, le dossier de l'artisan, et produit un dossier statique que
> `node scripts/site-qa.mjs <dossier>` juge. Il boucle jusqu'au vert. Il ne modifie ni le juge, ni ce document.
> Tenu par Claude Code (c'est un cerveau, §1.3) ; toute amélioration passe par lui et se voit dans le journal en fin de fichier.

## 0. La barre

Un site vendu 300 € à un artisan doit être **meilleur que ce qu'une agence locale lui vendrait 2 000 €** — et ça se mesure : `scripts/site-qa.mjs` vert sur tout (Lighthouse mobile ≥ 95 sur les quatre scores, LCP < 2,5 s, CLS < 0,1, TBT < 200 ms, robots, JSON-LD au sous-type exact, une page par commune servie et jamais une de plus, balises uniques, images AVIF/WebP, mentions obligatoires). Le juge gagne toujours sur l'effet : un fond animé qui coûte 0,3 s de LCP sur mobile est refusé, si beau soit-il. Le client d'un plombier ouvre le site **en 4G sur un chantier**.

Trois choses qu'un site d'agence ne fait presque jamais, et que celui-ci fait toujours : une **page par commune réellement servie** (le référencement local, c'est ça), des **photos de l'artisan traitées comme la matière principale**, et **zéro promesse qu'on ne tient pas** (ni classement Google, ni délai, ni prix).

## 1. Les entrées

Un dossier (pour une commande réelle : `sites_commandes` ; pour une démo : la fiche fictive donnée par la tâche) :

| Champ | Ce que c'est | Si absent |
|---|---|---|
| `metier` | clé parmi `plombier, electricien, chauffagiste, macon, menuisier, peintre, carreleur, couvreur, serrurier, paysagiste` (sinon `generique`) | `generique` |
| `nom` | le nom commercial | obligatoire |
| `metiers_secondaires` | 0 à 4 clés | aucune page métier |
| `communes` | les communes **réellement servies** (1 à 40) | obligatoire |
| `adresse`, `code_postal`, `ville`, `telephone`, `email`, `horaires` | les coordonnées réelles | pas de valeur inventée : la ligne est absente |
| `siren`, `decennale.assureur`, `decennale.numero` | mentions obligatoires d'un site d'artisan | obligatoires |
| `photos[]` | `{ fichier, legende?, role: avant \| apres \| chantier }` — les siennes, ou des photos libres attribuées | ≥ 3 |
| `logo` | facultatif | le nom en typographie |
| `avis_google_url` | l'adresse de sa fiche | pas de section avis |
| `plateforme_url` | sa page de conversation Presti (l'appel à l'action principal) | `#contact` |
| `url_base` | l'adresse publique du site (pour canonical, sitemap, OG) | `https://exemple.invalid` en démo |
| `demo` | `true` pour un site de démonstration : entreprise fictive, dit comme tel | `false` |

## 2. La sortie — un dossier statique, rien d'autre

`public/sites-demo/<metier>/` (démo) ou `sites/<commande>/` (commande). Dedans, et seulement ça :

- `index.html`, puis **une page par métier secondaire** (`/<metier-secondaire>/index.html`) et **une page par commune** (`/<metier>-<commune>/index.html`, slug sans accent), `/mentions-legales/index.html`, `/confidentialite/index.html` ;
- `styles.css` (≤ 30 Ko), `site.js` (≤ 10 Ko : menu mobile, reveal au défilement, rien d'autre), `fonts/` (woff2 auto-hébergées, ≤ 2 familles, ≤ 60 Ko au total, `OFL.txt` à côté), `images/` (AVIF + WebP, ≤ 200 Ko chacune, héros ≤ 250 Ko, largeurs 480/960/1600) ;
- `sitemap.xml`, `robots.txt` (`Allow: /` + `Sitemap:`), `site.json` (**le contrat du juge**, décrit en tête de `scripts/site-qa.mjs` : métier, communes, métiers secondaires, SIREN, décennale, `pages[]` typées avec leur `cible`, `demo`), `attributions.json` dès qu'une photo n'est pas celle de l'artisan (`fichier, auteur, source, licence, legende` — licences permises : celles de `LICENCES_PERMISES` dans le juge).
- **Aucune requête tierce** : pas de Google Fonts en ligne, pas d'analytics, pas de CDN, pas de police système « web safe » déguisée en identité. Tout est dans le dossier — c'est ce qui rend le site portable (H3) et rapide.

## 3. La direction artistique — une par métier, pas un thème qui change de couleur

Le moteur actuel a déjà huit identités (`lib/siteStyle.ts` : COUPLES et PRESETS_METIER) ; on part de là et on va plus loin. Chaque métier a **sa typographie, sa palette, sa texture, son rythme, son geste de héros**. Deux familles de police au plus (une display, une texte — parfois la même), en woff2 sous licence OFL, auto-hébergées.

| Métier | Typo display / texte | Accent · fond · encre | Texture · rythme | Le geste du héros | Ce que les photos font |
|---|---|---|---|---|---|
| plombier | Manrope / Manrope | `#1E6FA8` · `#F6F8FA` · `#10233A` | aucune · normal, angles 12 px | photo plein cadre d'une installation nette, titre 5 mots, un bouton | avant/après en paire, pièces d'eau en gros plan |
| electricien | Space Grotesk / IBM Plex Sans | `#E8B93B` · `#0F1115` (sombre) · `#F3F4F6` | bruit fin 25 % · serré, angles 4 px | fond sombre, tableau électrique en photo, titre en capitales espacées | photos très contrastées, cadrées carré |
| chauffagiste | Newsreader / IBM Plex Sans | `#D2622A` · `#FBF7F2` · `#2B1D14` | aucune · normal | photo chaude (chaudière, radiateur), titre serif, sous-titre technique | photos plein cadre, chaleur, pas de flou |
| macon | Archivo Narrow / IBM Plex Sans | `#8A8177` · `#EFEBE4` · `#1E1B18` | grain 45 % · serré, angles 0, filets 2 px | photo de gros œuvre plein cadre, titre en capitales condensées, filet | photos brutes, larges, une seule par section |
| menuisier | Fraunces / Fraunces | `#A9743F` · `#F7F1E6` · `#2A1E12` | papier 35 % · aéré, angles 6 px | photo de bois en détail, titre serif chaleureux | matières en gros plan, avant/après |
| peintre | Instrument Serif / Manrope | `#C2543F` · `#FFFDFB` · `#1C1A1A` | aucune · aéré, ample, angles 20 px | grand aplat de couleur, photo de pièce finie en retrait, bouton souligné | photos lumineuses, murs, pas de gens |
| carreleur | Manrope / Manrope | `#3C6E63` · `#F4F6F5` · `#14201D` | aucune · normal, angles 2 px, filet 1 px, largeur 1280 | grille : une photo, un motif de calepinage en CSS, titre | photos de sols et douches, cadrage droit |
| couvreur | Archivo Narrow / IBM Plex Sans | `#6B4A3A` · `#F1EDE8` · `#1D1714` | grain 55 % · normal, angles 0, filets 2 px | toiture plein cadre, ciel gardé, titre condensé | photos en contre-plongée, large |
| serrurier | Syne / Manrope | `#35506B` · `#F5F7F9` · `#0F1A26` | aucune · serré, angles 2 px | photo de serrure en gros plan, titre affirmé, **le téléphone dans le héros** | photos nettes, gros plans de mécanismes |
| paysagiste | Lora / IBM Plex Sans | `#4A7B3F` · `#F6F7F1` · `#1B2416` | papier 25 % · aéré, ample, angles 24 px | photo de jardin plein cadre, titre serif | photos larges, saisons |
| generique | Manrope / Manrope | `#3B4E63` · `#F7F8FA` · `#141A22` | aucune · normal, angles 10 px | photo plein cadre, titre 5 mots, un bouton | ce que le dossier donne |

Règles d'identité, non négociables :
- **White-label.** Rien de Presti sur le site : ni le corail `#D97757`, ni le fond nuit `#0A0C11`, ni le mot Presti hors du lien de la page de conversation. Le site est celui de l'artisan.
- **Mobile d'abord** : composé à 390 px, puis élargi. Titres 32-40 px sur mobile, 56-72 px au-delà de 960 px ; corps 17-18 px, interligne 1,55 ; contrastes ≥ 4,5:1 (Lighthouse Accessibilité ≥ 95 ne pardonne pas).
- **Animations retenues** : reveal au défilement (opacité + 12 px de translation, 400-500 ms, `ease-out`, une fois), pas de carrousel automatique, pas de parallaxe, pas de fond animé, `prefers-reduced-motion` respecté (les reveals deviennent instantanés). L'animation sert la lecture, jamais l'inverse.
- **Les photos sont la matière** : grandes, recadrées avec intention (jamais étirées), `<picture>` AVIF puis WebP, `width`/`height` déclarés, héros en `fetchpriority="high"` sans `loading="lazy"`, tout le reste `loading="lazy"`. Jamais de visuel de remplacement, jamais d'image générée par IA, jamais de photo dont on n'a pas la licence.
- **Passer les gabarits dans les skills** : `presti-design` (retenue, sens), `emil-design-eng` et `apple-design` (hiérarchie, espace, un seul geste fort par écran), `animation-vocabulary` et `improve-animations` (nommer et doser chaque mouvement). La preuve de passage va dans `.orchestre/preuves/<id>/skills.md` (une ligne par skill, ce qu'elle a changé) ; Claude Code les rassemble dans `plans/preuve-skills.md` à l'étape 6.

## 4. Les pages — ce qu'elles contiennent, dans cet ordre

**Accueil `/`**
1. En-tête : nom (ou logo), téléphone cliquable (`tel:`), un bouton « Demander un devis » → `plateforme_url` (sinon `#contact`). Menu mobile en un fichier JS de 40 lignes.
2. Héros : le geste du métier (tableau ci-dessus), **H1 = « <Métier> à <Ville> — <Nom> »** (5 à 9 mots), une phrase de sous-titre concrète (ce qu'il fait, où), un seul bouton principal.
3. Réassurance : trois faits **vérifiables** — « Assuré décennale (<assureur>) », « SIREN <siren> », « Devis clair et gratuit ». Aucun chiffre non sourcé (pas d'« années d'expérience », pas de « clients satisfaits », pas de note).
4. Prestations : 4 à 6, avec le vocabulaire du métier (`lib/ai/metiers.ts` : plombier → arrivée d'eau, groupe de sécurité, mitigeur, PER/cuivre/multicouche ; électricien → tableau, NF C 15-100, Consuel ; etc.), une phrase chacune, jamais un prix.
5. Réalisations : les photos, avant/après en paire quand le rôle le dit, légende courte ; en démo, l'attribution dans la légende.
6. Zone d'intervention : la liste des communes servies, **chacune en lien vers sa page** — c'est le maillage interne du référencement local.
7. Comment ça se passe : 3 ou 4 étapes (demande → réponse → devis → intervention), sans délai chiffré.
8. Avis : **uniquement** un lien « Voir nos avis Google » vers `avis_google_url` s'il existe ; jamais un avis recopié ou inventé. En démo : pas de section.
9. Questions fréquentes : 3 à 5, écrites avec les pièges du métier (jamais un diagnostic à distance, jamais une intervention promise par mauvais temps pour un couvreur, jamais un Consuel promis sans visite). Chaque réponse pousse vers la demande.
10. Contact : adresse, horaires, téléphone, le bouton principal. Pied de page : mentions légales, confidentialité, communes servies (liens).

**Page de commune `/<metier>-<commune>/`** — même squelette, spécifique : **H1 « <Métier> à <Commune> »**, title « <Métier> à <Commune> — <Nom> », description unique qui nomme la commune, un paragraphe d'introduction vrai (« <Nom> intervient à <Commune> et alentours pour … ») — **rien d'inventé sur la commune** (pas de quartiers, pas de monuments, pas de population), les prestations, 2 à 3 photos, le processus, le bouton, un fil d'Ariane vers l'accueil. Aucune page pour une commune absente du dossier : c'est une page satellite, le juge la refuse et Google la pénalise.

**Page de métier secondaire `/<metier-secondaire>/`** — H1 « <Métier secondaire> à <Ville> », prestations propres à ce métier, ses pièges, ses photos si elles existent.

**Mentions légales** — nom, forme juridique si connue, SIREN, adresse, téléphone, email, **assurance décennale : assureur et numéro**, hébergeur, directeur de publication (l'artisan), crédits photos (chaque auteur, licence, source) ; en démo, la phrase « Site de démonstration : entreprise fictive ». **Confidentialité** — quelles données le formulaire de demande collecte (via la page de conversation), pourquoi, combien de temps, les droits, aucun cookie tiers, aucune mesure d'audience.

## 5. Le référencement — mesuré par le juge, écrit ici

- `<html lang="fr">`, `<title>` unique 15-70 signes, `<meta name="description">` unique 50-160 signes, `<link rel="canonical">` = `url_base` + chemin, `og:title`/`og:description`/`og:image` (le héros), `<meta name="robots" content="index, follow">`, un seul H1, hiérarchie H2/H3 propre, `hreflang` inutile (français seul).
- JSON-LD sur chaque page publique : `@type` = le sous-type exact (`TYPES_METIER` du juge : Plumber, Electrician, HVACBusiness, HousePainter, RoofingContractor, Locksmith, GeneralContractor, HomeAndConstructionBusiness), `name`, `url`, `telephone`, `address` (PostalAddress complète), `openingHours`, `areaServed` (les communes), `image`, `sameAs` si un lien d'avis existe. Rien dans le JSON-LD qui ne soit sur la page.
- `sitemap.xml` : toutes les pages publiques (pas les légales), `lastmod` du jour de génération ; `robots.txt` : `User-agent: *`, `Allow: /`, `Sitemap: <url_base>/sitemap.xml`.
- Maillage : l'accueil lie chaque commune et chaque métier secondaire ; chaque page de commune lie l'accueil et 2 communes voisines (de la liste, jamais d'autres) ; le pied de page répète les communes.
- Ce qu'on n'écrit jamais : « première page », « n° 1 sur Google », une position, un délai de classement, un prix, un délai d'intervention chiffré, un avis, un chiffre d'expérience.

## 6. Le budget de performance (c'est lui qui fait les 95)

HTML par page ≤ 40 Ko ; CSS ≤ 30 Ko, inline le critique (héros) et charge le reste en un fichier ; JS ≤ 10 Ko, `defer`, aucun framework ; polices : 2 fichiers woff2 max, `font-display: swap`, `<link rel="preload">` sur la display ; images : AVIF + WebP, `srcset` 480/960/1600, héros ≤ 250 Ko, `width`/`height` partout (CLS = 0) ; total première page ≤ 600 Ko ; aucune requête tierce ; `<meta name="viewport">` ; couleur de fond peinte explicitement sur `html`.

## 7. Anti-fabrication — la règle de la maison, appliquée au site

Tout ce qui est écrit vient du dossier ou du vocabulaire du métier. Pas de témoignage, pas de logo de client, pas de « depuis 1998 » si le dossier ne le dit pas, pas de photo qui n'est pas la sienne ou libre et attribuée, pas de commune hors liste, pas de délai, pas de prix. Un site de démonstration le dit dans ses mentions et porte un SIREN visiblement fictif (`000000000`).

## 8. Livrer

1. Écrire le dossier complet, `site.json` et `attributions.json` compris.
2. `node scripts/site-qa.mjs <dossier> --statique` en boucle jusqu'au vert (rapide), puis `node scripts/site-qa.mjs <dossier>` (Lighthouse) jusqu'au vert.
3. Passer le site dans les cinq skills (§3) et écrire la preuve dans `.orchestre/preuves/<id>/skills.md`.
4. Quatre captures mobile (390 px) : accueil, une page de commune, réalisations, mentions — dans `.orchestre/preuves/<id>/`.
5. La tâche se termine en une ligne : `<id> : PASS|FAIL — <ligne du verdict>`.

## 9. Journal du cerveau

- 2026-09-13 — première version (Claude Code). Sources : `lib/siteStyle.ts` (8 identités), `lib/ai/metiers.ts` (vocabulaire et pièges), le juge `scripts/site-qa.mjs`. MotionSites (H6) et PromptedSite (H7) attendent l'accès de Benj : leur grammaire sera intégrée ici, jamais copiée.
