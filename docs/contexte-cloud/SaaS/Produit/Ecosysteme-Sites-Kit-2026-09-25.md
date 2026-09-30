# Sites Presti — le squelette de base et le kit Figma (25/09/2026)

> Demande de Benj (25/09) : « pour les sites, n'oublie pas le kit Figma, la structure et le squelette de base des sites ».
> Écrit en lecture seule le 25/09 au soir : aucun commit, aucun outil payant, aucune génération (ni image, ni vidéo, ni voix), aucun appel au connecteur Figma (j'ai lu la description de ses outils, sans en appeler un seul). Chaque fait porte sa source `fichier:ligne` ; ce qui est déduit est dit « déduit ».
> Dépôt : `C:\Users\benja\Documents\presti` (HEAD `7d68786`, 25/09 19:06). Série 026 : `.orchestre/brouillons-ecosysteme/026/`.

## En bref

1. **Un moteur, trois squelettes.** `public/sites-demo/generer.mjs` (déterministe, sans modèle de langage) sort la **démo** Lestraque, le **site vendu** (`--source`) et la **maquette prospect** (`--maquette`). Les trois partagent les pages et les textes, pas l'habillage.
2. **Un site vendu ne ressemble pas à la démo.** Il prend la direction artistique (DA) *du métier* (`da.json`), sans effets ni relief ni mise en scène. Tout le « niveau Lestraque » (scènes, étapes et communes monumentales, nav retenue) ne vit que dans l'entrée `lestraque`. La vente est encore fermée : il est temps de trancher (décision D1).
3. **Le kit Figma est en retard et hors ligne.** Il date du 17/09 : 3 sources sur 44 ont changé, 1 ancre est cassée, et 2 autres cassent à cause des fins de ligne (CRLF) du poste. Il ne montre que la démo. Il n'est pas versionné, donc les adresses répondent 404.
4. **Le plan.** Un juge « kit à jour » : le léger compare les empreintes en quelques secondes, le complet est `kit-figma.mjs --verifier` et doit répondre « identique ». Ensuite, régénération après chaque PASS qui touche une source du kit, commit, push, `deploiement-etat`, contrôle noindex, puis import dans Figma des seules pages réécrites. Aucune fiche de la chaîne 026 n'en dépend, et rien de tout cela ne la bloque.
5. **Ce qui reste à Benj.** L'import html.to.design, seulement quand une page a changé, et encore peut-être pas s'il passe par le connecteur (essai `whoami` gratuit). Plus un « oui/non » sur D1. Rien d'autre. Nano Banana et Perplexity n'entrent pas dans ce chantier : le site montre les vraies photos de l'artisan, « rien d'inventé » (`lib/siteCommande.ts:21`).

---

## 1. Le squelette de base d'un site Presti

### 1.1 Un moteur, trois sorties

| | **Démo** (la vitrine) | **Site vendu** (commande payée) | **Maquette prospect** (acquisition) |
|---|---|---|---|
| Commande | `node public/sites-demo/generer.mjs lestraque [--sortie=<copie>]` | `generer.mjs --source=<dossier> --sortie=<dossier>` (`generer.mjs:1072-1080`) | `generer.mjs --maquette=<maquette.json> --sortie=<hors public/>` (`generer.mjs:1016-1070`) |
| Entrées | `site.json`, `contenu.json`, `attributions.json` + `images/` | `commande.json` (export de la commande), `contenu.json` (rédacteur v2), `photos/` + `attributions.json` (`generer.mjs:308-352`) | `maquette.json` (entreprise, métier, ville, communes, modèle) + `maquettes/modeles/<métier>/contenu.json` ; photos de démo créditées |
| Pages | accueil, 1 page par commune, 2 légales (7 pour Lestraque) | les mêmes, à chemins absolus, servies sous `/site-genere/<id>/` ou sur le domaine (`lib/sitesGeneres.ts:1-6`) | **une** page, `noindex, nofollow` (`generer.mjs:1049`) |
| Habillage | `_kit/kit.css` + `kit.js` + DA de `lestraque` | `kit.css` + `kit.js` + DA **du métier** + `_kit/formulaire.js` (`generer.mjs:489`, `:982`) | `_kit/maquette.css` seul : 3 jetons à lui (`--encre`, `--papier`, `--accent`), police Arial (`maquette.css:1-4`) |
| Effets | 5 familles (`recit`, `video`, `survol`, `eclate`, `telephone`) + relief WebGL | **aucun** : `da.relief = null`, `famillesActives = []` (`generer.mjs:315-316`) | aucun |
| Qui l'appelle | Claude Code, à la main | livreur de l'usine / GitHub Actions via `livrer-site.mjs` (026-100, 026-106) | l'Atelier des maquettes (026-097) |
| Contrat | le kit (A1-A5) | fiches 025-03 puis 025-21 | fiches 025-02, 025-11, 025-14 |
| Juges | `site-qa.mjs`, juges de la démo | `site-qa.mjs`, `generateur-vente-qa.mjs`, `formulaire-site-qa.mjs` | `maquette-qa.mjs` |

Le principe tient dans l'en-tête du générateur : « Aucun modèle de langage n'est appelé ici : c'est une mise en page déterministe, rejouable, jugeable par site-qa.mjs » (`generer.mjs:4`).

### 1.2 Les pages (A1 du kit)

| Type | Chemin | Gabarit | Particularité |
|---|---|---|---|
| Accueil | `/` | `accueil(page)` (`generer.mjs:705` ; le kit dit 663) | 11 sections, ci-dessous |
| Commune | `/<métier>-<commune>/`, une par commune servie | `interieure(page, index)` | héros en plein cadre, 3 ouvrages, 3 communes voisines, retour à l'accueil |
| Légales | `/mentions-legales/`, `/confidentialite/` | `legale(page)` | SIREN, décennale, crédits |

Les communes viennent de la commande : « Indiquez au moins une commune réellement servie — c'est la matière du référencement local » (`lib/siteCommande.ts:180`).

### 1.3 Les 11 sections de l'accueil (A2 du kit, `kit.json → accueil.sections`)

| N° | Section | Variantes (et ce qui les déclenche) | Nourrie par |
|---|---|---|---|
| 00 | Navigation | claire sur héros plein · solide après 40 px · sombre sur scène sombre · retenue (`da.navRetenue`) · bouton « Devis » quand le héros sort de l'écran · menu burger | `site.nom`, monogramme tiré de la police de titre |
| 01 | Héros | `plein` / `aplat` / `scinde` (selon `da.hero`) · relief WebGL (`da.relief`, démo seulement) | `contenu.json → h1` (mot-clé SEO en petit), `h1Ligne` (l'idée en grand), `chapeau` |
| 02 | Plateau : une phrase et trois chiffres | absent sans `site.plateau` · avec photo (`da.plateauPhoto`) | bloc `artisan` : citation, prénom, nom, installation, chiffres |
| 03 | Prestations | « scène » (`da.scenes`) ou section classique + liste · rail de cartes au téléphone · survol au bureau (famille `survol`) | section de genre `prestations` : h2, intro, h3 + p |
| 04 | Dans l'atelier | vidéo (famille `video`) · verbes animés (famille `recit`) | section `atelier`, `da.atelier` |
| 05 | Réalisations | travelling épinglé + compteur (accueil) · rangée de 3 (communes) · grille sans orpheline · rail au téléphone | section `galerie`, `da.galerie` (4 photos exactement dans la démo) |
| 06 | Communes | liste monumentale (`da.communesMonumentales`) ou simple | `site.communes` |
| 07 | Étapes | numéros monumentaux + jauge (`da.etapesMonumentales`) ou « Étape 0n » · figure éclatée (famille `eclate`) | section `etapes` : au moins 2 étapes |
| 08 | Questions | 1re ouverte au bureau, fermées au téléphone · faq classique sans `da.scenes` | section `faq` |
| 09 | Contact et devis | fond photo / fond matière / titre long / sans formulaire (bouton d'appel) / « Demande reçue » | section `contact`, `site.devis`, téléphone, e-mail |
| 10 | Pied de page | (la variante `pied--nuit` n'est jamais appelée) | nom, SIREN, décennale, crédits des photos |

Le genre d'une section se lit dans `contenu.json` (`genre`) ou, à défaut, dans son h2 (`generer.mjs:41-54`).

### 1.4 Les jetons (J1-J7 du kit)

- **Couleurs, polices, rayon, graisses, ombre, grain** : une entrée de `_kit/da.json` devient les variables `:root` de `styles.css`, à savoir `--accent`, `--accent-texte`, `--fond`, `--fond-2`, `--encre`, `--encre-2`, `--ligne`, `--rayon`, `--police-display`, `--police-texte`, `--graisse-titre/-ligne/-marque`, `--approche-titre`, `--ombre`, `--grain`, `--grain-mode`, `--motif` (`generer.mjs:394`).
- **Échelle typographique, espacements, grille, points de rupture, courbes et durées** : dans `_kit/kit.css`, communs à tous les sites. Par exemple, le h1 fait `clamp(2.6rem,6.4vw,5.6rem)` et le texte courant 1.0625rem (`kit.css:7`). Le point de rupture dominant est `min-width: 1024px` (152 règles).
- **Exceptions connues** : les couleurs des scènes sombres sont écrites en dur dans `kit.css` (#F4EDE2 ×27, #D4A574 ×23, #14110E ×13, #0E0A07 ×2), donc hors de `da.json` (écart relevé par le kit).
- `da.json` compte 11 métiers (plombier, électricien, chauffagiste, maçon, menuisier, peintre, carreleur, couvreur, serrurier, paysagiste, générique) plus `lestraque`. Le générateur en lit 51 champs ; 2 ne sont pas lus : `filigrane` et `labelPluriel` (`kit.json → champs_da`).

### 1.5 Ce qui change par métier, par artisan, et jamais

| Niveau | Ce qui change | Où |
|---|---|---|
| **Jamais** (tous les sites) | ordre et gabarits des sections, `kit.css`, `kit.js`, garde-fous, juge `site-qa`, `formulaire.js` (anti-spam « honeypot », repli affiché si l'envoi échoue) | `generer.mjs`, `_kit/` |
| **Par métier** | la DA : couleurs, paire de polices, rayon, héros (`plein`/`scinde`/`aplat`), texture, grain ; le modèle de maquette (menuisier, plombier, électricien, couvreur seulement) ; les libellés du métier | `da.json[<métier>]` ; `maquettes/modeles/<métier>/` |
| **Par artisan** | nom, téléphone, e-mail, SIREN, décennale ; communes, donc les pages communes ; métiers secondaires ; bloc `artisan` (prénom, nom, année d'installation, parcours de 140 signes au plus, citation, 3 chiffres), qui remplit le plateau ; les textes (`contenu.json`, écrits par le rédacteur v2 « à partir des seuls faits », 026-093) ; ses photos et leurs crédits ; le domaine ou l'adresse `/site-genere/<id>/` | `commandeVersSite()` (`generer.mjs:285-305`) ; `lib/siteCommande.ts:53-75` |

**À savoir, et c'est la décision D1.** En mode `--source`, la DA vaut `generique` + `da[<métier>]` (`generer.mjs:314`). `commandeVersSite()` ne pose pas de `site.da`, et l'option `--da` n'est pas transmise dans la branche `--source` (`generer.mjs:1077`). Conséquence : **deux plombiers ont exactement le même habillage**, et aucun site vendu ne peut recevoir la mise en scène de Lestraque. Les drapeaux `scenes`, `etapesMonumentales`, `communesMonumentales`, `navRetenue` et `signature` n'existent que dans l'entrée `lestraque`. Les entrées métier ne portent que couleurs, polices, rayon, héros et texture : `plombier` n'a rien d'autre, `menuisier` a en plus grain, graisse et approche (relevé de `da.json`). Un menuisier client reçoit donc un héros « scindé » en Fraunces, sans scènes ni étapes monumentales, alors que la vitrine lui montre Lestraque. Le commit `0170524` confirme que « la vente reste fermée (`siteCommandeVente = false`) » : on peut encore corriger avant la première vente.

### 1.6 Les garde-fous du squelette (extrait)

- Le téléphone apparaît au plus 2 fois hors du pied de page (3 en mode vendu) (`generer.mjs:153`).
- Aucune photo sans attribution (`generer.mjs:353`, `:1038`) ; aucune photo orpheline dans la démo (`:905`).
- Le h1 de la démo doit garder « Menuisier » et la commune ; cette règle est levée en mode vendu (`generer.mjs:924-926`).
- Le plateau est vérifié (`verifierPlateau(p, ou, source = false)`, `generer.mjs:224`) ; la cohérence des scènes aussi (`:915`).
- Les polices sont présentes et non tronquées (`generer.mjs:375`).
- `site-deposer.mjs` refuse tout dossier tant que `site-qa.mjs` n'est pas vert (`scripts/site-deposer.mjs:2-3`).

---

## 2. Le kit Figma : état mesuré, puis le plan « toujours à jour et en ligne »

### 2.1 L'état mesuré le 25/09

- **Contenu** (`public/sites-demo/kit/LISEZMOI.md:5-14`) : `banc-essai-1440.html` (24 cellules de test pour html.to.design), `index.html` (architecture A1-A5 et jetons J1-J7), `sections.html` (17 cadres figés de l'accueil de Lestraque), les feuilles de style, et `kit.json` (toutes les données, leurs origines, et l'empreinte sha256 des 44 sources lues). Il a été généré le 17/09 entre 00:22 et 00:33 par `scripts/kit-figma.mjs` (tâche 024-02 ; preuves dans `.orchestre/preuves/024-02/`, aucune fiche 024-02 dans `fait/`).
- **Déterminisme prouvé** : deux passages de suite donnent des empreintes identiques octet pour octet (`.orchestre/preuves/024-02/kit-determinisme.log`). Relancé sans changement, le script répond « identique » pour chaque fichier (`kit-figma.mjs:19`, `:2458`).
- **Retard des sources** (sha256 recalculés ce soir, lecture seule) : 3 sources sur 44 diffèrent, `public/sites-demo/generer.mjs`, `scripts/site-qa.mjs` et `lib/siteCommande.ts`. Les 41 autres (dont `da.json`, `kit.css`, `kit.js`, toutes les familles) sont identiques. Le kit avait lu ces trois fichiers au commit `09c5f52` ; ils ont changé aux commits `71fcca8` et `0170524` (série 025, 25/09). `generer.mjs` est passé de 957 à 1 096 lignes : toutes les citations `fichier:ligne` qui suivent l'insertion sont décalées (`accueil(page)` : 663 dans le kit, 705 aujourd'hui).
- **Ancres** : j'ai testé en statique les 268 ancres littérales de `kit-figma.mjs` contre les fichiers actuels (script jetable dans mon dossier temporaire, rien écrit dans le dépôt). **3 sont introuvables** :
  - 1 changement de code réel : `const famillesActives = options.familles ??` est devenu `options.source ? [] : (options.familles ?? …)`. L'ancre est citée en `kit-figma.mjs:606`.
  - 2 cassent **uniquement à cause des fins de ligne** : `"if (da.hero === 'plein') {\n      // Une idée monumentale"` et `"if (!p) return ''\n    // da.plateauPhoto"`. Les trois fichiers modifiés sont en **CRLF** sur le poste, alors que le kit les avait lus en LF. Le dépôt a `core.autocrlf=true` et aucun `.gitattributes` : un commit fait sur l'usine (Linux) arrive en CRLF au `git pull` du PC. `kit.css`, qui n'a pas bougé, est resté en LF. Sans correctif, le kit ne peut donc pas dire « identique » à la fois sur le PC et sur l'usine.
  - Le script s'arrête avant toute écriture sur une ancre introuvable (`kit-figma.mjs:7-8`) : relancé tel quel, il échouerait.
- **Ce qu'il ne montre pas** : le site vendu (DA métier, sans effets, `formulaire.js`, bloc artisan) et la maquette prospect (`maquette.css`). Sa liste « À savoir avant un site client » (`LISEZMOI.md:60-74`) est en partie périmée : le h1 « Menuisier/Rennes » n'est plus exigé en mode vendu, et le libellé du message vient désormais du contenu (`generer.mjs:620`). Une remarque reste vraie : aucun fichier de `app/` ni de `lib/` n'appelle `generer.mjs` (vérifié par grep), et cela durera jusqu'à `livrer-site.mjs` (026-100).
- **Versionnement et mise en ligne** : `git status` donne `?? public/sites-demo/kit/` et `?? scripts/kit-figma.mjs`. Rien n'est versionné, donc rien n'est en ligne (404). Poids : 1 152 539 octets, sous le plafond de 1,5 Mo que le script s'impose (`kit-figma.mjs:44`). Les pages HTML portent `<meta name="robots" content="noindex">`, et le script refuse de les écrire sans (`kit-figma.mjs:2444`). Aucun lien n'y mène : grep sur `app/`, `lib/`, `components/`, `app/robots.ts` et `app/sitemap.ts`, rien trouvé.
- **Corrections apportées à l'inventaire précédent** :
  - `_kit/maquette.css` et `_kit/formulaire.js` **sont versionnés** (commits `71fcca8`, `0170524`), contrairement à ce qu'il disait (« non tracké »).
  - L'exemple d'ancre `verifierPlateau(p, ou)` n'est pas cité par `kit-figma.mjs` ; les ancres réellement cassées sont les 3 ci-dessus.
  - Le disque C: a **34,7 Go libres** (`Get-PSDrive C` à 19 h 20), et non moins de 1,5 Go : une régénération tient sur le poste.

### 2.2 Le juge « kit à jour »

Deux niveaux, le premier pour déclencher, le second pour juger :

1. **Léger** (quelques secondes, ni Chromium, ni écriture) : `node scripts/kit-figma-etat.mjs`. Il lit `kit.json → sources`, recalcule chaque sha256 **sur le texte aux fins de ligne normalisées** (`\r\n` → `\n`) et répond « identique » (code 0), ou « en retard : n source(s) : … » (code 1). Pour un fichier LF, l'empreinte normalisée est égale à l'empreinte brute : les 41 empreintes du `kit.json` actuel restent donc valables. Option `--json` pour la station. Option `--reel` : il vérifie aussi que les adresses de production répondent 200, portent le noindex et servent les mêmes octets que le disque.
2. **Complet, le juge officiel** : `node scripts/kit-figma.mjs --verifier`. Il régénère tout en mémoire (copie, Chromium, contrôles), n'écrit rien, et sort en code 0 seulement si **chaque fichier est « identique »**. Code 1 et la liste des fichiers qui seraient « écrit » sinon. Ce mode n'existe pas encore (fiche 026-168).

### 2.3 Le circuit, du changement de code jusqu'à Figma

| Étape | Qui | Quand | Commande / geste |
|---|---|---|---|
| 1. Détecter | Claude Code | après chaque push d'un PASS, dans la routine existante (build, push, `deploiement-etat.mjs` jusqu'à READY : `INDEX.md:188`) | `node scripts/kit-figma-etat.mjs` : si « identique », fin |
| 2. Régénérer | Claude Code, sur le PC | au plus une fois par jour (on regroupe), entre deux fiches (une seule charge lourde à la fois sur le PC) | `node scripts/kit-figma.mjs`, puis `--verifier` doit répondre « identique » |
| 3. Enregistrer | Claude Code | aussitôt | commit « Kit Figma régénéré (sources : …) » limité à `public/sites-demo/kit/**` ; push ; `node scripts/deploiement-etat.mjs` jusqu'à READY (mémoire « Poussé ≠ déployé ») |
| 4. Contrôler en ligne | Claude Code | après READY | `node scripts/kit-figma-etat.mjs --reel` : 200, noindex, mêmes octets, aucun lien entrant |
| 5. Importer dans Figma | Benj, ou le connecteur (§4) | seulement si une page HTML a été « écrit » | html.to.design, **seulement les pages réécrites** (voir le budget ci-dessous) |

- **Ce qui déclenche** : tout fichier listé dans `kit.json → sources`, c'est-à-dire `generer.mjs`, `_kit/**`, `lestraque/**`, `site-qa.mjs`, `lib/siteCommande.ts`, `extraire-contenu.mjs`, etc. La v2 y ajoutera `maquettes/modeles/**` et les jeux d'essai qu'elle rend.
- **Ne bloque jamais la production.** Aucune des 166 fiches de la série 026 ne cite le kit (grep de `kit-figma`, `sites-demo/kit`, `kit.json`, `da.json`, `kit.css` et `_kit/` dans les 166 fiches : 0 résultat). Tant qu'il est en retard, le kit apparaît comme une ligne « kit en retard » dans le digest, pas comme un échec de fiche.
- **Budget d'import gratuit** : html.to.design donne 10 imports par période de 30 jours (`LISEZMOI.md:45` ; recherche `.orchestre/preuves/024-02/html-to-design.md:37`, dont les sources se contredisent entre 10 et 12). Un kit complet en coûte 5 (le banc d'essai, puis 2 pages × 2 largeurs). Avec la page `vente.html` de la v2 : 6, plus le banc une seule fois, ce qui reste sous le plafond de 4 pages par largeur fixé par cette même recherche (`html-to-design.md:133`). Règle proposée : ne réimporter que les pages que le script a « écrit », et le banc d'essai jamais une seconde fois. Si le crédit du mois est épuisé, on passe à la voie du connecteur (§4) pour les jetons, et le reste attend le mois suivant.
- **Adresses** (`LISEZMOI.md:34-37`), toujours avec le nom du fichier, car Next redirige `/kit/` vers `/kit` : `https://prestiapp.fr/sites-demo/kit/banc-essai-1440.html`, `…/index.html`, `…/sections.html`, et `…/vente.html` avec la v2.

### 2.4 Publication : noindex et aucun lien

- Garder le `<meta name="robots" content="noindex">` des pages HTML (déjà contrôlé par le script). Ne **pas** interdire le chemin dans `robots.txt` : Google ne verrait plus le noindex.
- **Ceinture et bretelles (recommandé)** : `kit.json`, `LISEZMOI.md` et les CSS ne sont pas du HTML, ils ne peuvent donc pas porter de balise meta. Il suffit d'ajouter une entrée `{ source: '/sites-demo/kit/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }` dans `headers()` de `next.config.mjs:94-99`. Ce fichier est partagé avec la migration Next 16 (026-006, 026-008) : cette ligne passe **après 026-008**.
- La CSP stricte (`next.config.mjs:98`) s'applique au kit. Elle ne gêne pas : le kit ne charge aucune ressource externe (contrôle du script, `LISEZMOI.md:26`).
- Aucun lien : le juge de 026-169 le vérifie (grep de `sites-demo/kit` hors du dossier du kit, et sitemap).

---

## 3. La place du squelette et du kit dans la chaîne 026

### 3.1 Le squelette est au cœur de deux chaînes

**Vente d'un site** (le squelette « site vendu ») :

- 026-025 achat public → 026-030 complément du dossier. Le contrat est `lib/siteCommande.ts` (bloc `artisan`, photos, communes).
- → 026-033 export (`commande.json`) → 026-093 rédacteur v2 (`contenu.json` v2 « à partir des seuls faits » ; RV-9 : `generer.mjs --source` puis `site-qa --statique`).
- → 026-100 `livrer-site.mjs` (`generer.mjs --source` → `site-deposer.mjs`, qui lance `site-qa`). Deux modes : `--ci`, plus le repli GitHub Actions 026-106 ; et `--usine` pour le livreur de l'usine (026-057, 026-141, 026-143).
- → bucket privé `sites` → `/site-genere/<id>/` → 026-078 Poste, « Mettre en ligne » → domaine.
- Juges : 026-029 (lot C : export, rédacteur, `livrer-site`, Actions), plus ceux de la série 025 (`generateur-vente-qa`, `formulaire-site-qa`, `site-qa`).
- `INDEX.md:427` : « les fiches qui exigent `generer.mjs --source` → 025-03 ».

**Acquisition** (le squelette « maquette prospect ») :

- 026-097 l'Atelier des maquettes, sur l'usine → `maquette.json` → `generer.mjs --maquette` (modèles de `maquettes/modeles/<métier>/`) → `maquette-capturer.mjs` → 026-075 vidéo de 15 à 20 s → 026-082 lien privé → le Répondeur ou le Facteur.
- Juges : 026-080 et 026-071, plus `maquette-qa` (025).
- Modèles disponibles : menuisier, plombier, électricien, couvreur (`maquettes/modeles/`). Pour un autre métier, pas de maquette (026-097, étape 5).

**Studio pubs** (026-108 à 026-166, côté pubs) : **n'utilise ni le squelette ni le kit.** Le gabarit HyperFrames (026-153) a ses propres polices et son picto ; les photos de démo `public/sites-demo/*/images` ne servent que de corpus d'essai aux juges (026-124, 026-126). Une option, que je ne recommande pas maintenant : faire lire à 026-153 l'accent et la police de titre de `da.json[<métier>]`, pour qu'une pub locale ait les couleurs du site de l'artisan (D3).

### 3.2 Le kit est hors de la chaîne, par construction

- Les fiches qui ont fait dériver le kit l'avaient mis dans leur `interdit` : 025-02, 025-03, 025-14 et 025-21 listent toutes `public/sites-demo/kit/**` (ligne 6 de chacune, `.orchestre/fait/`). Aucune fiche n'avait la charge de le resynchroniser ensuite.
- Les fiches 026 qui touchent aux sites (026-029, 033, 078, 080, 093, 097, 100, 106, 141, 143) interdisent `public/**` ou n'y écrivent pas. **Elles n'ont rien à retoucher pour le kit** : la routine du §2.3 suffit, et c'est plus sûr que de glisser une étape « kit » dans chaque fiche.
- Pour la suite, le kit sert de **documentation lisible du contrat** du squelette (quelle donnée nourrit quel bloc, A2) au rédacteur v2 et à Benj. Il n'est une dépendance de personne.

### 3.3 Les fiches à créer (à la suite de la série, sans renuméroter)

La série va de 026-001 à 026-166, sans trou (`INDEX.md:3`, CV-1) : les nouvelles prennent 026-167 et la suite. Suivant la règle « juges d'abord » (`INDEX.md:11`), la fiche de juges passe en premier.

| Id | Objet | Exécutant | Juge (`verifier`) | Dépend de | PC éteint | Gestes de Benj |
|---|---|---|---|---|---|---|
| **026-167** | Juges du kit : `scripts/kit-figma-etat.mjs` (juge léger « kit à jour », `--json`, `--reel`, `--autotest`) et `scripts/kit-figma-qa.mjs`, cahier de la v2 : empreintes aux fins de ligne normalisées, mode `--verifier`, page `vente.html`, écarts par mode, poids ≤ 1,5 Mo, noindex, aucun lien entrant, deux passages identiques ; plus le groupe `--partie=da-metier` pour 026-171. Témoins : une source modifiée d'un octet → rouge ; la même source passée en CRLF → **vert** ; une ancre retirée → arrêt avant écriture | claude-code | `node scripts/kit-figma-etat.mjs --autotest && node scripts/kit-figma-qa.mjs --preuve-echecs` (elle-même) | 025-21 (fait) | non | — |
| **026-168** | `kit-figma.mjs` v2 : (1) `lire()` et `sha()` sur texte normalisé ; (2) mode `--verifier` ; (3) réparer l'ancre `famillesActives` et celles que le passage signale ; (4) page `vente.html` : le site vendu rendu par `--source` sur les 4 jeux d'essai `scripts/fixtures/025/commandes-metiers/<métier>/` (DA métier, sans effets, formulaire, bloc artisan → plateau) et la maquette par `--maquette=scripts/fixtures/025/maquette-exemple.json` (`maquette.css` et ses 3 jetons) ; (5) A1, A2, A4, A5 et « À savoir » dits **par mode** (démo, vendu, maquette), avec le contrat de `lib/siteCommande.ts` ; (6) régénérer le kit. Périmètre : `scripts/kit-figma.mjs`, `public/sites-demo/kit/**`. Interdit : `generer.mjs`, `_kit/**`, `lestraque/**`, `maquettes/**`, `scripts/fixtures/**`, les juges | codex (PC : Chromium et Playwright y tournent depuis 024-02) | `node scripts/kit-figma-qa.mjs && node scripts/kit-figma-etat.mjs && node scripts/kit-figma.mjs --verifier` (026-167) | 026-167 | non | — |
| **026-169** | Mise en ligne du kit et routine « kit à jour » : commit de `public/sites-demo/kit/**`, `scripts/kit-figma.mjs`, `kit-figma-etat.mjs` et `kit-figma-qa.mjs` ; push ; `deploiement-etat.mjs` jusqu'à READY ; en-tête `X-Robots-Tag` sur `/sites-demo/kit/:path*` ; ajout de `node scripts/kit-figma-etat.mjs` à la routine après chaque PASS (`INDEX.md`, « Les vagues ») | claude-code | `node scripts/kit-figma-etat.mjs --reel` (026-167) | 026-168 ; après 026-008 (même fichier `next.config.mjs`) | oui (pages statiques) | — (diff non sensible) |
| **026-170** *(conditionnelle)* | Les jetons du kit dans Figma par le connecteur : écrire en variables Figma (collections « DA par métier », « Échelle », « Rayons ») les valeurs de `kit.json → jetons` via `use_figma`, dans un fichier dédié. Le juge relit par `get_variable_defs` et compare à `kit.json` : « identique ». **Attend** un essai `whoami` gratuit qui montre que le siège de Benj peut écrire, et combien d'appels son offre permet (inconnu à ce jour ; l'en-tête `kit-figma.mjs:3` disait non le 16/09) | claude-code (le connecteur n'existe que dans une session Claude) | relecture `get_variable_defs` comparée à `kit.json` (elle-même) | 026-169 | non | Donner le lien d'un fichier Figma vierge, ou dire « oui » à sa création dans ses brouillons |
| **026-171** *(si D1 = oui)* | Les DA métier rehaussées : ajouter aux entrées `menuisier`, `plombier`, `electricien`, `couvreur` de `da.json` les drapeaux de mise en scène de Lestraque (`scenes`, `etapesMonumentales`, `communesMonumentales`, `navRetenue`), **sans** ses photos, ses familles ni sa signature. Vérifier au passage ce que chaque drapeau exige (par exemple, les scènes lisent des photos par rôle : `prestationsPhotos`, `kickers`). L'entrée `lestraque` n'est pas touchée | codex (usine) | `node scripts/generateur-vente-qa.mjs && node scripts/maquette-qa.mjs --metier=menuisier,plombier,electricien,couvreur && node scripts/kit-figma-qa.mjs --partie=da-metier` (026-167, qui capture lui-même le rendu des 4 sites) | 026-167 ; **avant 026-100** si possible, pour que le premier site vendu en profite | oui | Regarder les 4 captures (bureau et téléphone) et dire « oui » |

### 3.4 Les fiches à retoucher

| Fiche | Retouche | Obligatoire ? |
|---|---|---|
| `INDEX.md` | Ajouter les lignes 026-167 à 026-171 au tableau et aux vagues. Dans « Les vagues » (`:188`), ajouter `node scripts/kit-figma-etat.mjs` après `deploiement-etat.mjs`. Dans « Ce que Benj fait » (`:313`), ajouter l'import Figma des pages réécrites et D1. Le décompte se fait par `juges-026-preuve.mjs --couverture` (026-001), jamais à la main | oui |
| 026-164 (Salles, suite : Chantier du code) | Une tuile « Kit Figma : à jour / en retard (n sources) » qui lit `kit-figma-etat.mjs --json` | non (confort) |
| 026-153 (gabarit HyperFrames des pubs locales) | Lire l'accent et la police de titre de `da.json[<métier>]` (D3) | non ; défaut proposé : non |
| 026-093 (rédacteur v2) | Citer `kit.json → accueil.sections[].donnees` comme table lisible « champ → bloc », sans en faire une dépendance | non |
| 026-029, 033, 078, 080, 097, 100, 106, 141, 143 | **Rien** : elles n'écrivent pas dans le kit et n'en dépendent pas | — |

**À signaler, hors de ce chantier.** `core.autocrlf=true` sans `.gitattributes` fait passer en CRLF, sur le PC, tout fichier committé depuis l'usine (Linux). Les autres juges qui calculent des empreintes sha256 sur des fichiers texte y sont exposés de la même façon (déduit, non vérifié fiche par fiche ; par exemple le manifeste sha256 de 026-126). Une ligne `* text=auto eol=lf` dans `.gitattributes` le réglerait pour tout le dépôt, mais elle renormalise des centaines de fichiers : elle mérite sa propre fiche, avec un diff relu, plutôt qu'un ajout en passant.

---

## 4. Le chemin Figma ↔ code (gratuit et sûr)

**Code → Figma (automatique, gratuit)**
- **Voie 1, en place** : `kit-figma.mjs` fabrique les pages, que l'on importe par html.to.design (extension Chrome à 1440 px, plugin ou extension à 390 px ; réglages dans `LISEZMOI.md:30-45`). C'est une capture, pas une liaison. Coût : 0 €, dans la limite de 10 imports par 30 jours.
- **Voie 2, à éprouver (026-170)** : `use_figma` écrit par l'API plugin de Figma (variables, styles, cadres) dans un fichier existant ; `create_new_file` crée un fichier vierge (il demande une `planKey`, que donne `whoami`). Pour les **jetons**, cette voie ne consomme aucun import html.to.design, et elle se juge : on relit par `get_variable_defs` et on compare à `kit.json`. Mais j'ignore si le siège de Benj peut écrire et avec quel quota : un `whoami` (lecture) le dira avant tout usage. Tant que ce n'est pas prouvé, la voie 1 reste celle de référence.

**Figma → code (jamais automatique)**
1. Benj change une valeur dans Figma (une couleur, un espacement, une paire de polices) ou y pose une annotation. Il envoie à Claude le lien du cadre (`…?node-id=…`) et une phrase.
2. Claude **lit** le cadre : `get_variable_defs`, `get_design_context`, `get_screenshot` (lecture seule, compris dans le connecteur).
3. Claude reporte la valeur **au bon niveau** : dans `da.json[<métier>]` si elle vaut pour un métier, dans `kit.css` si c'est une règle commune. Jamais dans l'entrée `lestraque` sans le dire, puisque `kit.css`, `kit.js` et `da.json` « font Lestraque » (`.orchestre/fait/025-14.md:68`).
4. On rejuge : `generer.mjs lestraque --sortie=<copie>` puis `site-qa.mjs <copie> --statique` ; `generateur-vente-qa.mjs` (les 4 métiers) ; `maquette-qa.mjs`. Ensuite, la routine du §2.3 régénère et republie le kit, que Benj voit revenir dans Figma.

**Pourquoi pas de pont automatique Figma → code.** Le générateur est déterministe et gardé : h1, plateau, attributions, répétitions, téléphone, tout est vérifié avant la moindre écriture. Du code produit depuis Figma contournerait ces garde-fous, et la promesse « rejouable, jugeable » (`generer.mjs:4`) tomberait. Code Connect n'apporte rien non plus : il relie des composants Figma à des composants de code, or le squelette est un gabarit HTML statique, sans bibliothèque de composants. Ce qui passe de Figma au code, c'est **un jeton**, porté par un humain ou par Claude sur demande, jamais une structure.

---

## 5. Ce qui revient à Benj (le moins possible)

| Quoi | Quand | Temps |
|---|---|---|
| Importer dans Figma les pages que le script a réécrites (html.to.design, `LISEZMOI.md:30-45`), ou rien si la voie 2 passe l'essai | après une régénération qui a réécrit une page HTML | environ 2 min par page et par largeur |
| **D1** : les sites vendus prennent-ils la mise en scène de Lestraque (drapeaux, sans ses photos ni ses effets) ? Proposé : **oui**, fiche 026-171, avant la première vente | une fois | un mot, puis regarder 4 captures |
| D2 : la maquette prospect reste-t-elle sobre (`maquette.css`, Arial, « À compléter avec vous ») plutôt qu'aux couleurs du métier ? Proposé : **oui, on la garde sobre** (c'est un brouillon privé) | une fois, facultatif | — |
| D3 : les pubs locales aux couleurs du métier ? Proposé : **non pour l'instant** | facultatif | — |
| S'il modifie un cadre dans Figma : envoyer le lien et une phrase | à son rythme | 30 s |

Tout le reste revient à Claude Code et aux exécutants : les juges, la régénération, le commit, le push, le contrôle du déploiement et du noindex. Aucune dépense : ni Nano Banana (payant, réservé au Studio pubs dans `Ecosysteme-Recherche-Pubs-2026-09-24.md`), ni Perplexity (tout ce qu'il faut est dans le code), ni licence Figma.

---

**Sources lues** : `presti/public/sites-demo/generer.mjs` ; `_kit/{da.json, maquette.css}` ; `kit/{LISEZMOI.md, kit.json}` ; `scripts/kit-figma.mjs` ; `scripts/site-deposer.mjs` ; `lib/{siteCommande.ts, sitesGeneres.ts}` ; `next.config.mjs` ; `.orchestre/fait/{025-02, 025-03, 025-11, 025-14, 025-21}.md` ; `.orchestre/brouillons-ecosysteme/026/{INDEX.md, 026-093, 026-097, 026-100}.md` et grep des 166 fiches ; `.orchestre/preuves/024-02/{kit-determinisme.log, passage-2.log, html-to-design.md}` ; `scripts/fixtures/025/` (liste des fichiers seulement). Mesures : sha256 des 44 sources, test statique des 268 ancres, fins de ligne, `git status`, `git log`, `Get-PSDrive C`, `du -sb`. Rien écrit hors de ce fichier, sauf un script jetable dans le dossier temporaire de la session. Aucune clé ni `.env.local` lus.
