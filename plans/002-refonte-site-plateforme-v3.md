# PROMPT — Refonte v3 : moteur de sites vitrine + plateforme de contact (Presti)

> **Comment s'en servir.** Ouvrir Claude Code (ou Cowork) **dans `C:\Users\benja\Documents\presti`**, puis coller ce document en entier comme premier message. Il est écrit pour être lu par l'IA, pas par un humain pressé : il contient le contexte figé, les contraintes non négociables, les chantiers ordonnés, les budgets chiffrés et les critères de validation. Ne pas le résumer avant de le coller.
>
> Périmètre : le **site vitrine généré pour l'artisan** (`/site/[slug]`) et la **plateforme de contact** (`/l/[slug]`). La landing Presti (`/`) n'est concernée qu'en annexe H.

---

## 0. Rôle et posture attendus de toi (l'IA)

Tu es **directeur technique + directeur artistique** du moteur de sites de Presti. Tu travailles sur un produit **en production** (`prestiapp.fr`, `qg.prestiapp.fr`, Vercel, push `main` = déploie). Tes règles de conduite, dans cet ordre de priorité :

1. **Anti-vibecoding.** Aucun « c'est bon » sans le cycle de la skill `presti-verify` : éditer → `npm run build` (0 erreur) → `npm run typecheck` → déployer → **vérifier en direct** (routes 200, DOM/CSS inspectés, captures Playwright via `scripts/shot-site.mjs`) → nettoyer les données de test.
2. **Corrections incrémentales.** On fixe et on fait évoluer l'existant. **Interdiction de raser** `app/site/[slug]/page.tsx`, `SiteMotion.tsx`, `app/l/[slug]/*` pour repartir de zéro. Chaque refactor est une suite de pas réversibles, chacun compilable et déployable.
3. **Plan avant code.** Tu commences par produire le plan (§12), tu poses les questions de la §11, tu attends l'arbitrage de Benj sur les points marqués ⚠️, **puis** tu codes.
4. **Honnêteté technique.** Si un chantier ci-dessous est une mauvaise idée pour le produit (coût, perf, valeur réelle pour un artisan), tu le dis et tu proposes l'alternative — tu ne l'exécutes pas en silence pour faire plaisir.

---

## 1. Contexte figé (ne pas redécouvrir, ne pas contredire)

**Produit.** Presti — SaaS pour artisans français : répond en < 1 min aux demandes de devis, relance, chiffre les devis, édite les factures, et fournit à l'artisan **un site vitrine + une plateforme de contact à sa marque**. Benj build, Alexandre vend. Objectif n°1 actuel : **acquisition** — le site et la plateforme sont l'argument de vente le plus visible.

**Stack.** Next.js 15 (App Router, TS strict) · React 19 · Supabase (auth + Postgres + RLS) · Anthropic SDK · Stripe · Resend · `gsap` 3.15 · `lenis` 1.3 · `@react-pdf/renderer` · Playwright (dev). Déploiement Vercel. **Pas de Tailwind, pas de framework CSS** : tout en CSS maison dans `app/globals.css`.

**Fichiers du périmètre (à connaître avant d'écrire une ligne) :**

| Fichier | Rôle |
|---|---|
| `app/site/[slug]/page.tsx` | Rendu serveur du site vitrine (3 niveaux, thèmes, JSON-LD, metadata) |
| `app/site/[slug]/SiteMotion.tsx` | Motion du site : Lenis, reveals IO, parallax rAF |
| `app/l/[slug]/page.tsx` | Plateforme de contact (hero, prestations, réalisations, contact) |
| `app/l/[slug]/LeadForm.tsx` | Formulaire → conversation IA en direct (honeypot, reprise via localStorage) |
| `app/l/[slug]/PlatMotion.tsx` | Motion de la plateforme |
| `app/profil/page.tsx` | « Ma page » côté artisan : apparence, thème, accent, niveau de site, publication |
| `app/api/site/generate/route.ts` | Génération IA du contenu du site (consomme 1 crédit tier `pro`) |
| `lib/ai.ts` → `generateSiteContent` / `SiteContenu` | Prompt + schéma du contenu rédigé par l'IA |
| `lib/plans.ts` | Offres, crédits/mois, `siteMax` par formule |
| `lib/models.ts`, `lib/credits.ts` | Résolution modèle par plan, décompte atomique des crédits |
| `app/globals.css` | **2 128 lignes / 181 Ko** — tout le CSS du produit, y compris `.site` et `.plat` |
| `supabase/migrations/00*.sql` | 22 migrations ; les dernières : `0019_site_builder`, `0020_site_contenu`, `0021_site_contact`, `0022_theme` |
| `scripts/shot-site.mjs`, `shot-platv2.mjs`, `smoke-test.mjs`, `ai-eval.mjs` | Outillage de vérification |
| `.claude/skills/presti-design`, `presti-verify`, `presti-ai-lab` | Design system, discipline de vérif, éval IA |

**État actuel du moteur de site.** Trois niveaux (`site_tier` 1/2/3, borné par `siteMaxForPlan(plan)`), trois thèmes (`atelier` crème/serif, `nuit` sombre, `epure` blanc minimal), contenu rédigé par l'IA stocké dans `artisans.site_contenu` (`hero_accroche`, `hero_lede`, `apropos`, intros, `cta_*`, `meta_description`, `manifeste`, `mots_cles`). Niveau 3 = hero image plein-cadre, mots géants façon « FIND », blocs éditoriaux alternés façon « DRIP », manifeste parallax, galerie cinématique. Le site **ne contient pas** le chat : il renvoie vers `/l/[slug]`.

**Non négociables produit (règles de Benj, vault `SaaS/CLAUDE.md`) :**
- **White-label absolu.** Le site et la plateforme livrés n'affichent **jamais** « Presti », ni dans le DOM, ni dans les metadata, ni dans l'OG, ni dans un `data-*`, ni dans un commentaire HTML servi. Leur DNA est **distincte** de la console Presti (nuit graphite/orange).
- **Anti-fabrication.** L'IA n'invente **jamais** un fait sur un artisan : ni années d'expérience, ni certification, ni label, ni avis, ni chiffre, ni nom de client. Toute évolution du prompt de `generateSiteContent` conserve ce garde-fou mot pour mot et l'étend aux nouveaux champs.
- **Le contenu appartient à l'artisan.** Tout texte généré doit rester **éditable à 100 %** par lui.
- **RGPD.** Pages légales existantes ; toute nouvelle collecte (photo de chantier, géoloc, analytics) exige base légale, consentement explicite, durée de conservation, et mise à jour de `/confidentialite`.

---

## 2. Ce qui ne va pas aujourd'hui (constats vérifiés dans le code — point de départ du chantier)

Traite-les comme des **faits établis**, pas comme des hypothèses. Chacun est chiffré ou localisé.

1. **🔴 Les sites vitrine sont interdits d'indexation.** `app/site/[slug]/page.tsx` → `generateMetadata` renvoie `robots: { index: false, follow: false }`. Un artisan achète un site vitrine **pour être trouvé sur Google**. C'est le bug produit n°1 du périmètre : il annule la valeur perçue de l'offre « site ». (Le `noindex` se justifiait tant que les sites étaient en `prestiapp.fr/site/...` — il doit devenir conditionnel, cf. chantier G.)
2. **🔴 CSS monolithique.** `globals.css` (181 Ko) est chargé sur **toutes** les pages, y compris les sites clients white-label : poids inutile, risque de collision de classes, et surtout **fuite du design system Presti dans un livrable qui doit être étranger à Presti**.
3. **🟠 Images non optimisées.** Partout `<img>` avec `eslint-disable @next/next/no-img-element`, y compris le hero plein-cadre (LCP) et la galerie. Aucun redimensionnement, aucun AVIF/WebP, aucun `sizes`, aucun placeholder. Sur mobile 4G — le vrai contexte des clients d'artisans — c'est le premier facteur de perte.
4. **🟠 Les « thèmes » ne sont que des palettes.** Dans `globals.css` (l.1930+), `nuit` et `epure` ne redéfinissent que des couleurs et deux poids de police. **Le layout, le rythme, l'échelle typographique, les rayons, la texture sont identiques.** Trois artisans du même métier auront trois fois le même site. C'est l'inverse de la promesse « DNA au choix ».
5. **🟠 Layout figé en dur.** Les sections sont des `{tier === 3 && ...}` en JSX : l'artisan ne peut ni réordonner, ni masquer, ni doubler une section. Aucun modèle de données pour la composition de la page.
6. **🟠 Motion coûteuse sur mobile.** `SiteMotion.tsx` appelle `getBoundingClientRect()` pour N éléments **à chaque frame** de la boucle Lenis (mots géants, features, manifeste) → lecture de layout par frame, jank probable sur mobile milieu de gamme. Le parallax n'est jamais désactivé sur petit écran ni sur `saveData`.
7. **🟡 Régénérer son contenu coûte un crédit `pro`** (`api/site/generate`) sans versioning ni rollback : un artisan Essentiel (80 crédits) qui itère 10 fois sur son texte brûle son quota de réponses clients. Mauvais couplage entre « soigner sa vitrine » et « répondre à ses prospects ».
8. **🟡 Conversion en 2 sauts.** Le site renvoie vers `/l/[slug]` (autre page, autre URL). Le flag `site_contact_integre` existe mais le site ne l'exploite pas : chaque saut coûte des leads.
9. **🟡 A11y.** Les mots géants sont des `<a>` sans libellé explicite ; contrastes accent/crème non audités ; pas de `aria-current`, pas de skip-link.
10. **🟡 Aucun garde-fou de perf en CI.** Pas de budget de poids, pas de Lighthouse, pas de test de non-régression visuelle.

---

## 3. Objectif de la v3 (ce à quoi on mesure la réussite)

> **Un artisan qui publie son site doit obtenir, en moins de 10 minutes et sans savoir ce qu'est un thème, un site qu'on ne peut pas confondre avec celui du concurrent d'à côté — trouvable sur Google, rapide sur un téléphone en 4G, et qui transforme un visiteur en demande de devis qualifiée.**

Critères mesurables, à vérifier réellement (pas à déclarer) :

| # | Critère | Cible | Mesure |
|---|---|---|---|
| M1 | Site indexable quand publié | `index: true` + sitemap + canonical | `curl` sur `/site/[slug]`, source HTML |
| M2 | LCP mobile (4G simulée, hero image) | **< 2,5 s** | Lighthouse mobile via Playwright |
| M3 | CLS | **< 0,05** | idem |
| M4 | Poids de la page site, hors images | **< 180 Ko gzip** JS+CSS | rapport de build + `read_network_requests` |
| M5 | 60 fps au scroll sur mobile milieu de gamme | 0 long task > 50 ms au scroll | trace Playwright |
| M6 | Deux artisans du même métier, thèmes différents → sites visuellement **non superposables** | Jugement DA + captures côte à côte | `scripts/shot-site.mjs` sur 3 slugs de test |
| M7 | A11y | **0 violation critique axe-core**, contraste AA partout | axe-core dans Playwright |
| M8 | Taux de complétion du formulaire (plateforme) | instrumenté, baseline mesurée | événement anonyme côté serveur |
| M9 | `prefers-reduced-motion` | **tout le contenu visible, zéro mouvement** | test dédié |
| M10 | White-label | 0 occurrence de « presti » (insensible à la casse) dans le HTML servi de `/site/[slug]` et `/l/[slug]` | test automatisé dans `smoke-test.mjs` |

---

## 4. Chantier A — Architecture du moteur (fondation, à faire en premier)

**A1. Sortir le CSS du monolithe.** Extraire `.site*` et `.plat*` de `globals.css` vers deux feuilles dédiées chargées **uniquement** par leurs routes (`app/site/[slug]/site.css`, `app/l/[slug]/plat.css`, importées dans un `layout.tsx` de segment). Vérifier ensuite que `/site/[slug]` ne charge plus le CSS de la console. Ne **pas** en profiter pour réécrire les règles : déplacement à l'identique d'abord, refonte ensuite (deux commits distincts).

**A2. Layout dirigé par les données.** Introduire un schéma de composition versionné, stocké dans `artisans.site_layout` (migration `0023_site_layout.sql`, `jsonb`, défaut = composition dérivée du `site_tier` actuel pour ne casser aucun site existant) :

```ts
type SectionId = 'hero' | 'trust' | 'words' | 'features' | 'manifesto' | 'gallery' | 'services' | 'about' | 'process' | 'faq' | 'zone' | 'contact'
type SiteLayout = {
  v: 2
  sections: { id: SectionId; on: boolean; variant?: string; opts?: Record<string, unknown> }[]
}
```

Le rendu devient une boucle sur `sections` → un composant serveur par section (`app/site/[slug]/sections/Hero.tsx`, etc.), chacun recevant un contrat typé (`SectionProps = { a: Artisan; c: SiteContenu | null; theme: Theme; tier: 1|2|3 }`). Le gating par formule reste **serveur** : une section au-dessus du `siteMax` du plan est ignorée au rendu, jamais seulement masquée en CSS.

**A3. Contrat de thème.** Un thème n'est plus un `data-theme` qui change 12 couleurs, mais un **objet de tokens** (§5) + une éventuelle variante de layout par section. Type `Theme` exporté depuis `lib/themes.ts`, source de vérité unique, consommé par le CSS via des variables posées sur `<main class="site" data-theme=…>`.

**A4. Pas de régression.** Avant/après chaque pas : `node scripts/shot-site.mjs` sur au moins 3 slugs de test (un par thème, un par tier) et comparaison visuelle. Créer les comptes de test via l'API admin Supabase et **les supprimer après** (Benj veut zéro démo en base).

---

## 5. Chantier B — Thèmes v2 : de la palette à la vraie DNA

Objectif : que le choix du thème change **ce qu'on ressent**, pas seulement la couleur de fond. Chaque thème définit :

```ts
type Theme = {
  id: string; nom: string; desc: string           // libellés artisan, sans jargon
  fonts: { display: string; body: string; mono?: string }  // via next/font, subset latin, preload display
  scale: { h1: string; h2: string; body: string; ratio: number }  // échelle typographique propre
  rhythm: { section: string; gap: string; density: 'aere' | 'dense' }
  shape: { radius: string; border: string }
  texture: 'none' | 'grain' | 'paper' | 'noise-subtle'
  motion: { intensity: 0 | 1 | 2; ease: string; revealDistance: string }
  layout: Partial<Record<SectionId, string>>       // variante par défaut de chaque section
  palette: { bg, bg2, panel, ink, ink2, faint, line, dark, darkInk: string }
}
```

**Les 6 thèmes à livrer** (3 existants retravaillés + 3 nouveaux) — chacun doit viser un **type d'artisan**, pas un goût abstrait :

1. **Atelier** (existant, crème + serif éditorial) — menuisier, ébéniste, tailleur de pierre. Grain papier, serif à fort contraste, blocs alternés crème/sombre.
2. **Nuit** (existant, sombre) — électricien, domotique, piscine, serrurier. Grotesk, halo d'accent, images en mode « projecteur ».
3. **Épuré** (existant, blanc) — architecte d'intérieur, plaquiste, peintre haut de gamme. Beaucoup de blanc, échelle typo très large, zéro ornement.
4. **Chantier** (nouveau) — maçon, couvreur, terrassier. Franc, colonnes larges, numéros de section proéminents, typo condensée, filets épais, jaune de sécurité en accent par défaut.
5. **Bleu de travail** (nouveau) — plombier, chauffagiste, frigoriste. Dense et rassurant : blocs d'info, zone d'intervention en carte, horaires et urgences très visibles, moins de cinéma, plus d'utilité.
6. **Vitrine** (nouveau) — carreleur, cuisiniste, paysagiste. **La photo commande** : galerie plein écran, texte minimal, légendes discrètes, avant/après.

**Règles.** Aucun thème ne doit produire un rendu illisible avec l'accent libre choisi par l'artisan → écrire un **garde-fou de contraste** (`lib/contrast.ts` : calcul WCAG, correction automatique de l'accent en texte si ratio < 4,5 sur le fond du thème). Polices via `next/font` **scopées au thème** (ne pas charger 12 fontes pour en utiliser 2). Chaque thème est vérifié en tier 1, 2 et 3.

**Avant de coder les 3 nouveaux thèmes** : produire la direction visuelle avec la skill `design` (canvas Claude Design, 1 artboard par thème, desktop + mobile), la soumettre à Benj, **puis** coder. C'est le bon usage de Claude Design dans cette pile : fixer la cible, pas générer le site.

---

## 6. Chantier C — Le « wow » : motion, et 3D là où elle sert

### C0. Cadrage honnête (à lire avant de toucher à la 3D)

Pour 90 % des artisans, **une belle photo de leur chantier bat n'importe quelle scène 3D**. La 3D n'a de valeur que si elle montre quelque chose qu'une photo ne montre pas : une matière sous une lumière qui bouge, une coupe technique, un avant/après volumétrique. Donc :

- La 3D est **réservée au niveau Signature (tier 3)**, **opt-in**, et **jamais** le chemin par défaut.
- Elle est un **enrichissement progressif** : la page est complète, belle et fonctionnelle **sans** WebGL. Le canvas se greffe après, ou pas du tout.
- Les assets sont une **bibliothèque mutualisée par métier** (8 métiers), pas une modélisation par client — sinon le coût marginal du produit explose.
- Si tu conclus, chiffres à l'appui, que le budget de perf ne tient pas : **tu le dis et on garde le motion 2D**. Ce n'est pas un échec.

### C1. Motion 2D — corriger et pousser (prioritaire sur la 3D)

- **Supprimer les lectures de layout par frame** dans `SiteMotion.tsx` : mesurer les positions **une fois** (au montage + sur `resize`/`ResizeObserver`), stocker `top`/`height`, et ne calculer que des transforms à partir de `scrollY`. Zéro `getBoundingClientRect()` dans la boucle rAF.
- **Écrire les valeurs en variables CSS** (`--p`, `--py`) sur les éléments plutôt qu'en `style.transform` string : le CSS fait le reste, le JS ne fait que produire un nombre.
- **Couper le parallax** sous 760 px, sur `navigator.connection.saveData`, sur `effectiveType` ∈ {`slow-2g`,`2g`,`3g`}, et sur `prefers-reduced-motion`. Lenis lui-même : désactivé sur mobile (le scroll natif iOS/Android est meilleur que n'importe quelle inertie JS).
- **Pauser** toute animation dont la section est hors viewport (IntersectionObserver → flag).
- Ajouter, en tier 3, **trois gestes** qui font le niveau agence sans coûter cher : révélation par masque (déjà là sur les mots géants — l'étendre aux titres de section), **transition d'image partagée** entre la galerie et la lightbox (View Transitions API, avec repli), et un **curseur de matière** (léger, desktop uniquement, respectant `pointer: fine`).

### C2. WebGL — spécification technique (si Benj valide)

**Déclenchement.** Le canvas ne se monte que si **toutes** ces conditions sont vraies : `tier === 3` **et** `site_3d_active === true` **et** WebGL2 disponible **et** `matchMedia('(pointer:fine)')` **et** viewport ≥ 1024 px **et** `!prefers-reduced-motion` **et** `!saveData` **et** `deviceMemory >= 4`. Sinon : l'image `heroShot` existante reste, telle quelle. Le fallback n'est pas dégradé, c'est le rendu normal.

**Chargement.** `next/dynamic` avec `ssr: false`, importé **après** l'événement `load` et l'entrée en viewport. Three.js en import nommé (tree-shaking), **jamais** `import * as THREE`. Budget : **≤ 120 Ko gzip** de JS pour la couche 3D, **≤ 1,5 Mo** pour le GLB, **≤ 2 Mo** cumulés d'assets 3D par page.

**Rendu.** `WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })` + SMAA seulement si le budget le permet ; `setPixelRatio(Math.min(devicePixelRatio, 1.75))` ; boucle rAF **arrêtée** quand le canvas sort du viewport ou que l'onglet est caché ; une seule `DirectionalLight` + une `EnvironmentMap` compressée (HDRI 512 px en KTX2) — pas de post-processing lourd, pas d'ombres temps réel (ombres **bakées** dans les textures).

**Pipeline Blender → web** (à documenter dans `docs/3d-pipeline.md` et à scripter dans `scripts/gltf-build.mjs`) :

1. Modélisation/lookdev dans Blender (le MCP Blender est connecté sur la machine de Benj : `execute_blender_code` permet de scripter export et vérifications).
2. Budgets par asset : **≤ 60 k triangles**, **≤ 2 textures**, **1024 px** (2048 px seulement pour la matière du hero), UV propres, ombres et AO **bakées**.
3. Export **glTF 2.0 binaire (.glb)**, Y-up, échelle mètres, matériaux **Principled BSDF uniquement** (les node trees exotiques ne s'exportent pas).
4. Post-traitement obligatoire via `gltf-transform` : `dedup` → `prune` → `resample` → `weld` → `meshopt` (préféré à Draco pour le coût de décodage) → `webp`/`ktx2` pour les textures.
5. Vérification : temps de décodage < 150 ms sur un laptop milieu de gamme, poids final loggué dans le rapport de build.
6. Stockage : bucket Supabase public dédié, **immutable + hash dans le nom de fichier**, `Cache-Control: public, max-age=31536000, immutable`.

**Les scènes à construire (dans cet ordre, une seule livrée d'abord)** :

- **S1 — « La matière » (hero, tier 3).** Un plan/objet représentatif du métier (assemblage bois, cuivre soudé, carreau, enduit) en gros plan, avec une lumière qui suit **très légèrement** le scroll. Rotation max 8°, jamais de rotation libre à la souris (ça donne un jouet, pas un site d'artisan). Sert de toile de fond au titre, pas de sujet.
- **S2 — « Avant / après » (galerie).** Deux photos du même chantier, transition par déchirure/wipe en shader, pilotée par un slider accessible au clavier. Coût dérisoire, valeur commerciale immédiate.
- **S3 — « La coupe » (prestations, optionnel).** Vue éclatée d'une installation type du métier, annotée. Réservée aux métiers techniques (plombier, chauffagiste, électricien). À construire **seulement** si S1 et S2 tiennent les budgets.

**Alternative à évaluer et trancher explicitement** : Spline (scène hébergée, viewer ~90 Ko). Plus rapide à produire, moins contrôlable, dépendance externe sur un livrable white-label. Ma recommandation : **non** pour le runtime des sites clients (dépendance tierce + poids + branding), **oui** éventuellement pour des maquettes internes. Tranche et argumente.

### C3. HyperFrames — la place correcte

HyperFrames génère de la **vidéo**, pas de la 3D interactive. Son usage utile ici : produire **la vidéo de démonstration du site d'un artisan** (30 s, scroll filmé, musique, sous-titres) que **Alexandre envoie en prospection**, et les séquences de la landing Presti. Ce n'est **pas** un composant du runtime du site client. Livrable associé : `scripts/promo-video.mjs` qui capture le scroll d'un `/site/[slug]` avec Playwright et prépare le matériau à composer.

---

## 7. Chantier D — Contenu IA v2

**D1. Schéma v2.** Étendre `SiteContenu` (en gardant la rétro-compatibilité : les sites existants ont un objet v1) :

```ts
type SiteContenu = {
  v: 2
  hero_accroche, hero_lede, apropos, prestations_intro, realisations_intro,
  cta_titre, cta_texte, meta_description, manifeste: string
  mots_cles: string[]
  // nouveaux
  process: { titre: string; texte: string }[]        // 3-4 étapes « comment ça se passe »
  faq: { q: string; r: string }[]                    // 4-6 questions réelles du métier → schema.org FAQPage
  zone_texte: string                                  // phrase de zone d'intervention, SEO local
  services_reecrits: { nom: string; description: string }[] // reformulation des prestations saisies
  titres_sections: Partial<Record<SectionId, string>> // l'IA nomme les sections dans la voix de l'artisan
  ton: 'sobre' | 'chaleureux' | 'direct'              // choisi par l'artisan, pilote la rédaction
}
```

**D2. Garde-fous renforcés.** Le prompt système conserve **mot pour mot** l'interdiction de fabrication et l'étend aux nouveaux champs (une FAQ ne doit pas inventer de délai, de prix, de garantie ou de certification non fournis). Ajouter une **passe de validation programmatique** post-génération : rejeter toute sortie contenant un nombre d'années, un pourcentage, un prix, un label (`RGE`, `Qualibat`, `décennale`…) ou un superlatif absent des données d'entrée → régénérer une fois, puis dégrader proprement.

**D3. Économie de crédits.** Découpler « soigner sa vitrine » de « répondre à ses prospects » : la **première** génération de contenu de site est **offerte** (hors crédits) ; les régénérations **complètes** coûtent 1 crédit ; les régénérations **partielles** (une section) sont gratuites dans la limite de 10/mois. Versionner : `site_contenu_versions` (jsonb[], 5 dernières), avec **rollback en un clic**. Migration `0024_site_contenu_versions.sql`.

**D4. Éditabilité.** Chaque champ généré est éditable dans « Ma page » avec indication claire de l'origine (« rédigé pour vous — modifiable »). Une édition manuelle **verrouille** le champ : une régénération ne l'écrase plus sans confirmation.

**D5. Éval.** Étendre `scripts/ai-eval.mjs` : 8 profils d'artisans fictifs (un par métier), génération sur les 3 tiers de modèle, scoring automatique (longueurs respectées, JSON valide, zéro fait fabriqué détecté par la passe D2, mots-clés non redondants avec les libellés de prestations) + revue humaine. À faire tourner avant toute modification du prompt.

---

## 8. Chantier E — Plateforme `/l/[slug]` v3 (la machine à convertir)

La plateforme est l'endroit où l'argent se gagne : c'est elle qui transforme un visiteur en lead. Priorités :

1. **Mobile-first, réellement.** Refaire la hiérarchie sur 390 px avant le desktop : le formulaire doit être atteignable **sans scroller** au-delà d'un écran, avec CTA collant en bas (`position: sticky`, safe-area iOS).
2. **Le formulaire devient une conversation dès le premier champ.** Aujourd'hui : formulaire → puis chat. Cible : **un seul champ** (« Décrivez votre besoin ») + contact demandé **après** la première réponse de l'IA, quand la valeur est déjà démontrée. Mesurer avant/après (M8).
3. **Photo du chantier.** Upload d'1 à 3 photos depuis le téléphone (compression client `canvas` → WebP ≤ 1 Mo, EXIF **strippé**, y compris la géoloc), jointes au lead et affichées à l'artisan. C'est le meilleur accélérateur de chiffrage — et le premier point RGPD à traiter proprement.
4. **Qualification silencieuse.** L'IA extrait déjà l'intention (`analyzeLead`) : afficher côté artisan un **niveau d'urgence** et un **type de chantier**, et l'utiliser pour trier l'inbox de `/messages`.
5. **Réassurance concrète.** Remplacer les 4 cartes génériques (« Devis gratuit / Réponse rapide / Travail assuré ») par des éléments **vrais et vérifiables** : zone d'intervention réelle, horaires réels, délai de réponse **mesuré** sur les 30 derniers jours (« répond en général en 12 min » — calculé, jamais inventé), moyens de contact réels.
6. **Anti-abus.** Le honeypot existe ; ajouter rate-limit par IP **et** par slug (déjà partiellement en place côté `api/leads`), détection de flood, et un mode « pause » que l'artisan peut activer.
7. **Accusé de réception.** Email immédiat au prospect (Resend, expéditeur = **marque de l'artisan**, pas Presti) + rappel à l'artisan si aucune réponse humaine sous X minutes.
8. **Cohérence de DNA.** La plateforme partage les tokens de thème du site (§5) : même police, même échelle, même rythme. Un visiteur qui passe du site à la plateforme ne doit percevoir **aucune couture**.

---

## 9. Chantier F — Le studio côté artisan (« Ma page »)

`app/profil/page.tsx` fait 25 kB et mélange profil légal, apparence, site, plateforme. À scinder en **onglets** avec une vraie ergonomie d'éditeur :

- **Aperçu live** côte à côte (iframe sur `/site/[slug]?preview=1`, rafraîchie au changement, avec bascule desktop/mobile).
- **Composer sa page** : liste des sections (§A2) réordonnables (drag ou flèches — accessible clavier), interrupteurs on/off, variantes par section, sections verrouillées 🔒 selon la formule avec invitation à monter d'offre (le pattern est déjà en place pour les modèles IA — le réutiliser).
- **Images** : upload avec recadrage, compression et génération de plusieurs tailles, réordonnancement de la galerie, choix de la photo de hero, `alt` suggéré par l'IA et éditable.
- **Publier** : un bouton unique, un état clair (brouillon / en ligne), et **le lien à partager** — plus un QR code à imprimer pour le camion et les devis papier.
- **Domaine personnalisé** (offre Signature) : champ + instructions DNS + vérification automatique (cf. G2).

---

## 10. Chantier G — SEO, performance, accessibilité

**G1. 🔴 Indexation.** `robots: { index: a.site_active === true && a.site_seo !== false, follow: … }`. Ajouter : `alternates.canonical` (domaine perso si présent, sinon l'URL Presti), `sitemap.ts` dynamique listant les sites publiés, `LocalBusiness` JSON-LD **complet** (adresse, `openingHours`, `areaServed`, `sameAs` des réseaux, `image`, `priceRange`), `FAQPage` (D1), `BreadcrumbList`. Vérifier l'absence de duplicate content entre `/site/[slug]` et un éventuel domaine perso.

**G2. Domaine personnalisé.** Via l'API Vercel Domains : ajout du domaine au projet, instructions DNS générées pour l'artisan (OVH/Ionos/Gandi), vérification automatique, redirection 301 de l'URL Presti vers le domaine une fois validé. C'est le point qui rend le `noindex` inutile **et** qui justifie l'offre Signature.

**G3. Images.** Migrer vers `next/image` avec `sizes` explicites, `priority` sur le hero uniquement, `placeholder="blur"` (blurDataURL généré à l'upload), formats AVIF/WebP, et un `remotePatterns` restreint au bucket Supabase. Interdire tout nouveau `<img>` dans le périmètre (règle ESLint réactivée).

**G4. Fontes.** `next/font` avec `display: 'swap'`, subset `latin`, preload de la seule police d'affichage du thème actif. Zéro fonte chargée pour un thème non utilisé.

**G5. A11y.** axe-core dans Playwright (`scripts/a11y-site.mjs`), 0 violation critique. Skip-link, `<nav aria-label>`, libellés explicites sur les mots géants (`aria-label="Voir les réalisations : Sur-mesure"`), focus visible partout (déjà partiellement fait), contraste AA garanti par `lib/contrast.ts` (§5).

**G6. Budgets en CI.** Ajouter au workflow GitHub : `npm run build` + vérification que le JS de la route `/site/[slug]` reste sous le budget M4, + Lighthouse mobile sur un slug de démo, + le test white-label M10. Un dépassement **échoue le build**.

---

## 11. ⚠️ Décisions à faire trancher par Benj AVANT de coder

Pose-les en une fois, en recommandant une option pour chacune :

1. **Indexation & domaine.** Passe-t-on les sites publiés en indexables tout de suite (option A : sur l'URL `prestiapp.fr/site/...`), ou attend-on le domaine personnalisé (option B) ? *(Reco : A immédiatement pour l'offre actuelle, B en parallèle pour Signature.)*
2. **3D.** On lance C2 (scène S1 + S2, budget perf ci-dessus) ou on se concentre sur C1 + les 6 thèmes ? *(Reco : C1 + thèmes d'abord — le gain perçu par € investi est bien supérieur ; la 3D en second temps, sur Signature seulement.)*
3. **Nombre de thèmes.** 6 comme proposé, ou 4 pour aller plus vite et mieux les finir ?
4. **Contenu offert.** La première génération de contenu passe-t-elle hors crédits ? *(Reco : oui — c'est un coût marginal minuscule et un frein majeur à la mise en ligne.)*
5. **Plateforme.** Bascule-t-on sur le formulaire « un seul champ » (E2), qui change le flux de leads en production, ou teste-t-on d'abord en A/B ? *(Reco : A/B sur 2 semaines.)*

---

## 12. Ordre d'exécution et jalons

Chaque jalon est **déployable et vérifié** avant d'attaquer le suivant. Aucun jalon ne dépasse ~1 journée de travail.

| J | Contenu | Definition of done |
|---|---|---|
| **J0** | Audit + plan chiffré + réponses aux 5 décisions | Plan écrit dans `plans/003-*.md`, validé par Benj |
| **J1** | G1 (indexation, canonical, sitemap, JSON-LD complet) | `curl` montre `index,follow` sur un site publié ; Rich Results Test OK |
| **J2** | A1 (CSS scindé) + G3 (next/image) + M10 (test white-label) | Poids CSS de `/site/[slug]` divisé ; LCP mesuré avant/après ; smoke-test vert |
| **J3** | C1 (motion corrigée, budgets perf, reduced-motion) | Trace Playwright : 0 long task au scroll ; M9 vérifié |
| **J4** | A2 + A3 (sections data-driven + contrat de thème) | Tous les sites existants rendus **à l'identique** (comparaison de captures) |
| **J5** | B (6 thèmes, après validation des artboards Claude Design) | M6 : 3 captures côte à côte non superposables ; contraste AA sur les 6 |
| **J6** | D (contenu IA v2 + versioning + éditabilité) | `ai-eval` : 8/8 profils sans fait fabriqué ; rollback testé |
| **J7** | F (studio « Ma page ») | Un artisan test publie un site complet en < 10 min, chronométré |
| **J8** | E (plateforme v3) | M8 instrumenté, baseline enregistrée |
| **J9** | G2 (domaine perso) puis C2 (3D) si validé | Domaine de test résolu et servi ; budgets 3D respectés ou chantier arrêté |

---

## 13. Format de réponse attendu de toi, à chaque étape

1. **Ce que j'ai vérifié** (fichiers lus, mesures prises — pas de suppositions).
2. **Ce que je change et pourquoi**, avec le risque associé.
3. **Le diff**, par fichier, commenté en français dans le style du repo (commentaires qui expliquent l'intention, comme dans `SiteMotion.tsx`).
4. **La preuve** : sortie de build, codes HTTP, captures, mesures chiffrées. Jamais « c'est bon » sans preuve.
5. **Ce qui reste** et ce sur quoi j'attends une décision.

Commits en français, atomiques, un par pas réversible. Push sur `main` = déploiement : ne pousse **jamais** un pas non vérifié.

---

## 14. Pièges connus du repo (ne pas les redécouvrir dans la douleur)

- `overflow-x: hidden` sur un conteneur **casse `position: sticky`** → utiliser `overflow-x: clip` (bug déjà rencontré et corrigé sur la landing).
- Les **variables d'environnement Vercel** ne s'activent qu'après **redéploiement**.
- Le **cache DNS local (SFR)** est en retard → vérifier avec `nslookup <domaine> 8.8.8.8`.
- Le **pane navigateur intégré ne composite pas** → screenshots via `scripts/shot*.mjs` (Playwright + Chromium local), lecture DOM/CSS via `javascript_tool`.
- **RLS** : tout est scopé `artisan_id = auth.uid()` ; les routes publiques passent par `supabaseAdmin` — vérifier qu'aucune nouvelle route ne fuit de données d'un autre artisan.
- `consumeCredit` est **fail-open** (si la RPC casse, on ne bloque pas le client) : ne pas transformer ça en fail-closed sans décision explicite.
- **Zéro donnée de démo en base** : les comptes de test sont créés puis **supprimés**.
- Resend : domaine `prestiapp.fr` à vérifier (DNS OVH) — sans ça, les emails de la plateforme ne partent pas aux vrais prospects.

---

## Annexe H — Landing Presti (`/`), hors périmètre principal

Deux points seulement, à traiter après J5 : (1) montrer les **6 thèmes** dans la démo `FeatureShowcase.tsx` (aujourd'hui : 3) ; (2) intégrer une **vidéo HyperFrames** de 20-30 s montrant un site d'artisan réel qui scrolle, en remplacement du bloc statique — c'est l'argument de vente le plus direct pour la prospection d'Alexandre.

---

## Annexe I — Rappel de la pile d'outils et de qui fait quoi

| Outil | Rôle réel dans ce chantier | Ce qu'il ne fait pas |
|---|---|---|
| **Claude Design** (skill `design`) | Fixer la direction visuelle des 6 thèmes en artboards, avant le code | Ne produit pas le site 3D animé |
| **Claude Code** | Écrit le Next.js, le CSS, Three.js, les migrations, les tests | — |
| **Blender** (MCP connecté) | Modélisation/lookdev des assets métier, export glTF scripté | Ne fait pas de temps réel navigateur |
| **Three.js** | Le rendu 3D interactif dans la page (C2) | N'est chargé que si les 8 conditions de C2 sont vraies |
| **HyperFrames** | Vidéos promo (prospection, landing) | Aucun rôle dans le runtime des sites clients |
| **Skills `presti-design` / `presti-verify` / `presti-ai-lab`** | Design system, discipline de vérification, éval des prompts | — |
| **Playwright + `scripts/shot*.mjs`** | Voir le rendu réel, mesurer, comparer avant/après | — |

> Dernier mot : le différenciateur de Presti n'est pas la 3D, c'est qu'**un artisan qui n'a rien à écrire ni à choisir obtienne en 10 minutes un site qu'un studio lui aurait facturé 3 000 €**. Chaque décision de ce chantier se juge à cette aune.
