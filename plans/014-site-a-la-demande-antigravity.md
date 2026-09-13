# PROMPT v15 — Le site à la demande (300 €), Claude Code × Antigravity, le cœur de cerveau, et la suspension

> À coller dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`.
> **Contrainte n° 1 de ce chantier : les tokens.** Le modèle qui lit ceci est cher. Tout ce qui est volumineux et répétitif part chez Antigravity (§1). Toi, tu gardes le jugement. Si tu te surprends à lire un fichier de 60 Ko en entier ou à régénérer dix pages similaires toi-même, tu as déjà perdu.
> Protocole : travail continu, temps affiché, **Vérifié · Produit · Preuve · Journal · Suivant** — mais le journal en **trois lignes par bloc**, pas trois pages.

---

## §0. Les décisions, telles quelles

1. **Le site vitrine sort de l'abonnement.** Il n'est plus inclus dans aucune formule.
2. **Il devient un produit à la demande : 300 €, une fois.** TVA non applicable (art. 293 B), donc 300 € nets. Volontairement bas : peu de clients, on attire, on ne perd personne.
3. **Le niveau attendu est très supérieur à ce qui existe.** Un site vendu 300 € à un artisan doit être meilleur que ce qu'une agence locale lui vendrait 2 000 €. Tant que ce niveau n'est pas atteint et prouvé, le site n'est **pas vendable** et le bouton n'apparaît pas.
4. **Le SEO est le cœur du produit.** Pas une case cochée : la raison d'acheter.
5. **Après, et seulement après** : la suspension de compte qui ne marche pas dans le Poste de contrôle (§5).

---

## §1. Le système de surproduction — Claude Code × Antigravity

Antigravity est installé sur la machine, avec son propre quota. Il ne partage rien avec ta réserve. Le principe : **tu penses, il produit**.

### 1.0 Le système se construit AVANT tout le reste — livrable n° 1

Rien de ce prompt ne démarre tant que ce système n'existe pas et n'a pas fait **un aller-retour complet sur une tâche factice**. Le but n'est pas « déléguer un peu » : c'est que tu ne lises plus jamais un diff, un fichier de test ou une page générée — **tu lis des verdicts**. C'est là que les tokens partent aujourd'hui, et c'est là qu'on les récupère.

**`.orchestre/` à la racine du dépôt**, avec ses quatre dossiers : `file/` (tâches à prendre), `en-cours/`, `fait/`, `refuse/`. Une tâche = un fichier Markdown à en-tête YAML, et **chaque champ est obligatoire** :

```yaml
id: 014-03
type: feature | test | contenu | audit | boucle-qa
objectif: une phrase
perimetre: [app/site/commander/**, lib/siteCommande.ts]   # seuls fichiers modifiables
interdit:  [lib/plans.ts, lib/stripe.ts, supabase/**]      # jamais touchés, même pour « aider »
verifier:  node scripts/site-qa.mjs public/sites-demo/plombier   # la commande qui tranche
budget:    { fichiers: 12, minutes: 40 }
preuve:    sortie de `verifier` collée + captures dans .orchestre/preuves/014-03/
```

**`scripts/orchestre.mjs`** — le chef de gare, sans serveur, sans base, juste des fichiers :

- `prochaine` : donne à Antigravity la prochaine tâche dont le périmètre **ne chevauche aucune tâche en cours** (deux agents sur les mêmes fichiers = du travail perdu). Pose un verrou `.lock` avec l'identifiant de l'agent.
- `verifier <id>` : quand une tâche passe dans `fait/`, **exécute sa commande `verifier` lui-même** et écrit le verdict — `PASS`, ou `FAIL` + la première ligne d'échec — dans `.orchestre/digest.md`. C'est le cœur du système : la vérification est mécanique, personne ne relit.
- `digest` : régénère `digest.md` — une ligne par tâche, cent lignes maximum. **C'est le seul fichier que tu lis** pour savoir où en est le chantier.
- `contexte` : régénère `.orchestre/contexte.md` **depuis le code** (routes de `app/`, exports de `lib/`, drapeaux de `lib/flags.ts`, capacités de `lib/plans.ts`, migrations) — une carte d'une page que ni toi ni Antigravity n'avez à redécouvrir en lisant. Relancée par hook après chaque fusion.

**Les deux fichiers de règles**, tenus à jour par le même script : `CLAUDE.md` (toi) et `AGENTS.md` (Antigravity — il le lit nativement) pointent tous deux vers `contexte.md` et portent les mêmes conventions : nommage, français des identifiants, zéro donnée réelle dans les tests, « une fonctionnalité non finie n'apparaît pas ».

**Le protocole d'escalade** : Antigravity bloqué n'écrit pas trois paragraphes — il dépose `<id>.question.md` avec **deux ou trois options numérotées**. Tu réponds par un chiffre et, au besoin, une ligne. Jamais une discussion.

**Le parallélisme** : Antigravity sait faire tourner plusieurs agents et des sous-agents navigateur. Les tâches de type `boucle-qa` (Lighthouse jusqu'au vert, Playwright, `site-qa`, `video-qa`) sont faites pour ça : tu en mets cinq dans `file/` avec des périmètres disjoints, et elles avancent en même temps pendant que tu écris le schéma.

**La mesure** : `digest.md` compte, en tête, tâches déléguées / tâches faites par toi, et lignes produites par chacun. Si tu produis plus de lignes qu'Antigravity sur une semaine, le système est mal utilisé — et c'est ce que Benj lira en premier.

**La preuve que le système marche, avant de lancer le reste** : une tâche factice `000-test` (créer un fichier, un test qui le vérifie), prise par Antigravity, vérifiée par `orchestre.mjs verifier`, apparue en `PASS` dans le digest. Puis une deuxième, conçue pour **échouer**, apparue en `FAIL` avec la bonne ligne. Tant que ces deux lignes ne sont pas dans le digest, tu n'as pas de système — tu as un dossier.

### 1.1 Le partage du travail

| Claude Code (toi — cher, rare) | Antigravity (volume, quota séparé) |
|---|---|
| Architecture, schéma de données, migrations | Génération des variantes de sites (métier × style) |
| Tout ce qui touche à Stripe et à l'argent | Pages de contenu, textes SEO par métier et par zone |
| Sécurité, RLS, verrous serveur | Tests Playwright, captures, parcours navigateur |
| Revue finale de chaque livrable d'Antigravity | Audits Lighthouse en boucle jusqu'au vert |
| Le prompt de génération de site (le « cerveau ») | Les exécutions de ce prompt, en série |

### 1.2 La passation

Les skills `handoff` et `claude-handoff` de `.claude/skills/` servent à **rédiger** les tâches de `.orchestre/file/` — pas à remplacer le système. Benj lance Antigravity sur `.orchestre/` ; dis-lui au journal quand des tâches sont prêtes, et combien peuvent tourner en parallèle.

### 1.3 Les règles de tokens, pour toi

- **Avant de lire un fichier** : est-ce que `contexte.md` ou `digest.md` répond déjà ? Si oui, tu ne lis pas.
- Exploration du code : **sous-agents sur un modèle moins cher** (`Agent` avec `model: haiku` ou `sonnet`), jamais toi. Tu reçois la conclusion, pas les fichiers.
- Aucun fichier de plus de 300 lignes lu en entier : `Grep` ciblé, `Read` avec `offset`/`limit`.
- Pas de relecture d'un fichier que tu viens d'écrire. Pas de relecture d'un diff d'Antigravity : tu lis son verdict.
- Tu n'écris toi-même que cinq choses : le schéma, l'argent, la sécurité, les cerveaux (prompts), et les verdicts. Tout le reste est une tâche dans `file/`.
- Journal court. Preuves sous forme de sorties de commandes, pas de paraphrases.

---

## §2. Retirer le site de l'abonnement — sans casser ce qui tourne

### 2.1 La grille (`lib/plans.ts`)

- Sortir `site.essentiel`, `site.pro`, `site.signature`, `site.slides3d` des listes `BASE`, `STUDIO`, `SIGNATURE`. Supprimer `siteMax` des plans, ou le passer à 0 partout — choisis ce qui casse le moins de code, et grep chaque usage de `siteMaxForPlan`.
- Retirer la ligne « Site vitrine » de `GRILLE_COMPLETE`. Renommer « Votre nom de domaine (site et page de conversation) » en **« Votre nom de domaine sur la page de conversation »** — le domaine sur la plateforme reste inclus partout.
- Ajouter, hors grille d'abonnement, un bloc **« Le site, à la demande — 300 € une fois »** rendu par la landing et `/abonnement`, avec les trois phrases qui le décrivent et le bouton `Commander mon site`.

### 2.2 Les artisans qui ont déjà un site

Aucun site existant ne disparaît. Migration : colonne `sites.origine` (`'abonnement'` pour l'existant, `'commande'` pour le nouveau), et `sites.actif` reste vrai. Un site d'origine `abonnement` continue de vivre tant que le compte existe. Zéro régression sur ces comptes : test dédié.

### 2.3 Tout ce qui promet encore le site inclus — à corriger le même jour

- `app/page.tsx` (landing), `app/abonnement`, `app/aide`, `lib/aide.ts` (grep « site vitrine », « inclus »).
- `plans/publications-lancement.md` §0 : la ligne « Site vitrine inclus dès l'Essentiel » devient fausse — corrige-la, et vérifie les trois variantes Facebook et LinkedIn qui pourraient s'y appuyer.
- `SaaS/Prospection/Guide-Presti-Demarchage.md` : le morceau n° 4 « Le site vitrine — trois niveaux » et la ligne du tableau des prix. Nouveau texte : « Le site : à la demande, 300 € une fois, avec un vrai travail de référencement. Ce n'est pas compris dans l'abonnement. »
- Les vidéos : la scène « Et votre site vous ressemble enfin » reste vraie mais ne doit plus être lue comme « inclus ». Note-le pour le pipeline v14 ; ne refais pas les vidéos ici.

---

## §3. Le produit « site à la demande »

### 3.1 La commande

Route `/site/commander`, accessible depuis la console (toute formule, **y compris l'essai** — un artisan peut acheter le site sans être abonné). Une interface en quatre écrans, pas un formulaire de trente champs :

1. **Le nom de domaine** — il en a un (on le branche : `lib/vercelDomains.ts` existe déjà) ou il n'en a pas (on lui propose d'en prendre un, en expliquant que le domaine reste **à son nom**, jamais au nôtre).
2. **Le métier et la zone** — métier principal, métiers secondaires, les communes réellement servies (une liste, pas un rayon fictif). C'est la matière du référencement local ; s'il est vague ici, le site sera vague.
3. **La matière** — photos de chantiers (avant/après quand il en a), logo s'il en a un, l'adresse professionnelle, le SIREN, les horaires, les assurances (décennale : numéro et assureur — obligatoire sur un site d'artisan), les avis Google existants s'il y en a.
4. **Le paiement** — Stripe Checkout en mode `payment` (pas `subscription`), 300 €, webhook qui crée la ligne `sites_commandes` avec statut `payee`. Aucune génération ne démarre avant le webhook.

### 3.2 La fabrication

Un site commandé passe par **quatre états** : `payee` → `generee` → `validee` → `en_ligne`.

- `payee → generee` : la génération tourne (§3.3). Aperçu privé sur une URL signée, envoyé à l'artisan **et** visible dans le Poste de contrôle.
- `generee → validee` : **un humain valide.** À 300 €, avec un niveau promis « très supérieur », on ne met pas en ligne un site que personne n'a regardé. Écran de validation dans le Poste de contrôle : aperçu, scores Lighthouse, liste des vérifications SEO, bouton « Mettre en ligne » ou « Renvoyer en génération avec une consigne ». *(Décision à confirmer par Benj — voir §6.)*
- `validee → en_ligne` : domaine branché, sitemap soumis, ligne au journal.

Délai annoncé à l'artisan : **48 h ouvrées**. Pas « instantané » — la validation humaine prend du temps et on ne promet pas ce qu'on ne tient pas.

### 3.3 Le niveau — inspiration et barre

**L'inspiration — MotionSites AI d'abord.** `https://motionsites.ai` : une bibliothèque de prompts de design (héros, sections, appels à l'action, **fonds animés et sites 3D**) faits pour être collés dans Claude ou Cursor, avec un **MCP** — c'est la référence que Benj veut voir atteinte. Branche ce MCP dans Claude Code (`claude mcp add`, selon la doc du site) ; s'il exige un compte, Benj le crée (§6). Ensuite, pour chaque métier : choisis deux ou trois prompts de héros et de sections, exécute-les, et **extrais la grammaire** — la construction du héros, le rythme des sections, le traitement des photos, les animations au défilement. En second, **PromptedSite** (`mcp__PromptedSite__*`, déjà branché) pour comparer ; ses gabarits premium demandent un accès Lifetime (`get_promptedsite_access`).

Deux garde-fous, non négociables : **on ne copie aucun gabarit tel quel** — on s'inspire d'une grammaire, on ne livre pas le site d'un autre ; et **le juge SEO gagne toujours sur l'effet**. MotionSites adore les fonds en shaders et la 3D ; un fond animé qui fait passer le LCP au-dessus de 2,5 s sur mobile est refusé, si beau soit-il. Le client d'un plombier ouvre le site en 4G sur un chantier, pas sur un Mac Studio. L'animation sert la lecture, jamais l'inverse.

**Le rendu.** Le moteur existant (`app/site/[slug]`, `lib/siteLayout.ts`, `lib/siteStyle.ts`) sert de base, mais le niveau visé le dépasse largement. Les skills `presti-design`, `apple-design`, `emil-design-eng`, `animation-vocabulary` et `improve-animations` sont dans `.claude/skills/` : passe chaque gabarit dedans, avec preuve dans `plans/preuve-skills.md` comme au v14. Ce que « très supérieur » veut dire, concrètement :

- une direction artistique **par métier** (un couvreur et un peintre n'ont pas le même site), pas un thème unique avec une couleur qui change ;
- les photos de l'artisan traitées comme la matière principale — grandes, recadrées, en AVIF/WebP, jamais un placeholder ;
- des animations retenues, au défilement, jamais un carrousel automatique ;
- un mobile parfait avant le bureau — c'est là que ses clients le trouvent ;
- **la page de conversation Presti intégrée** comme appel à l'action principal : le site existe pour amener la demande là où Presti répond.

**La barre SEO — mesurable, et bloquante.** Un site ne passe à `generee` que si tout ceci est vert, vérifié par un script `scripts/site-qa.mjs` construit sur le modèle de `video-qa.mjs` :

| Critère | Seuil |
|---|---|
| Lighthouse mobile : Performance, Accessibilité, Bonnes pratiques, SEO | **≥ 95** sur les quatre |
| `robots` | **index, follow** — le bug `noindex` de `app/site/[slug]/page.tsx` ne doit plus jamais revenir : test qui l'attrape |
| Données structurées | `LocalBusiness` avec le sous-type exact (`Plumber`, `Electrician`, `HousePainter`, `RoofingContractor`, `Locksmith`, `HVACBusiness`, `GeneralContractor`…), adresse, horaires, zone servie, téléphone ; validées sans erreur |
| Pages | une par métier, une par commune **réellement servie** — jamais de pages générées pour des villes où il ne va pas (ce sont des pages satellites, Google les pénalise et c'est mensonger) |
| Balises | `title` et `meta description` uniques par page, `canonical`, Open Graph, sitemap XML, `hreflang` inutile (français seul) |
| Images | AVIF/WebP, `alt` rédigé, dimensions déclarées, lazy sauf le héros |
| Core Web Vitals | LCP < 2,5 s, CLS < 0,1, INP < 200 ms — mesurés sur mobile simulé |
| Mentions obligatoires | mentions légales, SIREN, assurance décennale, politique de confidentialité — un site d'artisan sans décennale affichée est incomplet |

**Ce qu'on ne promet jamais dans la vente** : une position Google, un délai de classement, « première page ». On promet un site techniquement irréprochable et un référencement local **bien fait** ; le classement dépend du temps, des avis et de la concurrence, et on le dit.

**Après la mise en ligne** : un guide d'une page pour l'artisan — créer ou relier sa fiche Google Business Profile, y mettre le site, demander des avis. C'est ce qui pèse le plus en local, et ce n'est pas nous qui pouvons le faire à sa place.

---

## §4. Ordre d'exécution

0. **Toi, et rien d'autre avant** : le système du §1.0 — `.orchestre/`, `scripts/orchestre.mjs`, `contexte.md`, `CLAUDE.md` + `AGENTS.md`, et les deux tâches factices (`PASS` et `FAIL`) visibles dans `digest.md`. Ensuite seulement, tout le reste est lancé — et lancé **en tâches**, pas à la main.
1. **Toi** : schéma (`sites_commandes`, `sites.origine`), migration, Stripe Checkout `payment` + webhook, états, RLS. Test bout en bout du paiement en mode test.
2. **Toi** : `scripts/site-qa.mjs` — le juge. Sans juge, pas de génération.
3. **Tâche Antigravity `014-01`** : les quatre écrans de commande (`/site/commander`), à partir de ta spec.
4. **Toi** : le prompt de génération par métier — c'est le cerveau, il ne se délègue pas.
5. **Tâches Antigravity `014-02` → `014-10`, en parallèle** : une exécution par métier (plombier, électricien, chauffagiste, maçon, menuisier, peintre, carreleur, couvreur, serrurier), chacune bouclant sur `site-qa.mjs` jusqu'au vert, verdict `PASS` dans `digest.md`.
6. **Toi** : lecture du `digest.md`, écran de validation dans le Poste de contrôle, retrait du site des formules (§2), correction de tous les textes (§2.3).
7. **Tâche Antigravity `014-11`** : tests Playwright du parcours complet (commande → paiement test → aperçu → validation → en ligne) et non-régression des sites existants.
8. **Toi** : §7 (CLAUDE.md + vault), puis §8 en commençant par le registre et `evaluer.mjs` sur **un seul** cerveau — la détection d'urgence, avec le cas du vitrier comme premier cas de référence. Les autres cerveaux suivent une fois le cycle prouvé sur celui-là.
9. **Toi** : §5.

Le bouton `Commander mon site` n'apparaît en production (`lib/flags.ts`, drapeau `siteCommande`) **qu'après l'étape 7 verte** et un site de démonstration passé par le parcours complet, regardé par Benj.

---

## §5. La suspension qui ne marche pas

Après tout le reste. Dans le Poste de contrôle, « Suspendre un compte » n'a pas d'effet. Ne devine pas :

1. Reproduis : quel bouton, quelle route (`app/api/controle/...` ou `app/api/direction/...`, drapeau `actionsArtisan`, migration 0068), quelle réponse HTTP, quel état en base avant et après.
2. Les causes probables, dans l'ordre : la route écrit un champ que `lib/authArtisan.ts` ne lit pas ; la RLS empêche l'écriture avec la clé utilisée ; l'interface ne rafraîchit pas et l'état change en base sans que ça se voie.
3. Corrige, puis un test `scripts/suspension-e2e.mjs` : suspendre → l'artisan ne peut plus se connecter, sa page de conversation affiche un message neutre, ses relances s'arrêtent ; réactiver → tout revient. Sortie du test au journal.

---

## §6. Ce que seul Benj peut faire

| # | Action | Pourquoi |
|---|---|---|
| H1 | Créer le produit « Site — 300 € » dans Stripe (prix unique) et poser l'identifiant en variable d'environnement | L'argent, c'est lui |
| H2 | **Trancher** : validation humaine avant mise en ligne (recommandé) ou mise en ligne automatique | Change le délai promis et la charge de travail |
| H3 | **Trancher** : que devient un site commandé si l'artisan supprime son compte Presti ? (proposition : il reste en ligne 12 mois puis export statique offert) | À écrire dans les CGU avant la première vente |
| H4 | Lancer Antigravity sur `.orchestre/` dès que le journal annonce des tâches en `file/` | Le quota d'Antigravity est le sien |
| H5 | Regarder le site de démonstration de bout en bout avant de lever `siteCommande` | C'est lui qui dit « vendable » |
| H6 | Créer le compte **MotionSites AI** si son MCP l'exige, et donner l'accès à Claude Code | C'est la référence de niveau visée |
| H7 | Vérifier l'accès PromptedSite (Lifetime ou non) | Décide si les gabarits premium sont lisibles |

---

## §7. Antigravity, pour toujours — et dans le cerveau

**Règle permanente, pas seulement pour ce chantier** : quoi que tu fasses désormais dans ce dépôt, tu travailles **avec Antigravity**. Écris-le dans `CLAUDE.md` du dépôt, section « Méthode », en cinq lignes : le partage du §1.1, le système `.orchestre/` du §1.0, et la règle « tu ne produis toi-même que ce qui exige du jugement ». Un futur prompt qui ne mentionne pas Antigravity ne t'en dispense pas.

**Les deux sont connectés au vault — c'est le cerveau commun.** Antigravity ouvre un espace de travail à **deux dossiers** : `presti` et `SaaS`. Toi, tu y es déjà. La règle de partage est simple et elle vaut pour les deux : **ce que le code fait vit dans le dépôt** (`.orchestre/contexte.md`) ; **pourquoi on l'a décidé vit dans le vault** (`Decisions/`, `Journal-Decisions`, `Récap-Projet.md`). Avant toute tâche, chacun lit le `CLAUDE.md` du vault et `Produit/Carte-du-code.md` — cette carte est produite par `orchestre.mjs contexte` **dans le vault aussi**, en une page, pour que le vault sache toujours où en est le code sans qu'on relise `Récap-Projet.md` (22 Ko) à chaque session. Les écritures dans le vault passent par le même système que le reste : une tâche avec `perimetre: [SaaS/Produit/**]` ou `[SaaS/Decisions/**]`, jamais deux agents sur la même note en même temps. Antigravity lit ses règles dans `AGENTS.md` à la racine de l'espace de travail (ou dans son dossier de règles, selon sa version — vérifie et note-le) ; ce fichier pointe vers le vault au même titre que `CLAUDE.md`.

**Dans le vault Obsidian** (`C:\Users\benja\Documents\SaaS`) : crée `Produit/Antigravity.md` — ce que c'est, comment on s'en sert avec Claude Code, où est `.orchestre/`, ce qu'est un verdict dans `digest.md`. Relie-le depuis `Récap-Projet.md` et depuis `CLAUDE.md` du vault. Cinq à dix lignes, pas une thèse.

---

## §8. Le cœur de cerveau — pour que les IA de Presti s'améliorent

Presti n'a pas « des modèles » au sens entraîné : il a des **cerveaux configurés** — le prompt de conversation (`lib/ai.ts`), les consignes par métier (`lib/ai/metiers.ts`), le filtre anti-invention (`lib/ai/antiFabrication.ts`), la détection d'urgence (`lib/ai.ts:99-105`), le chiffrage (`lib/prix/`), la recherche fournisseurs, la persona de plateforme. Aujourd'hui, ils ne s'améliorent que quand quelqu'un y pense. Le vitrier dont la vitre cassée ressort en « normal » est resté là jusqu'à ce qu'un audit tombe dessus. **C'est ça qu'on arrête.**

Le cœur de cerveau, c'est **un cycle et un registre**, construits sur la skill `presti-ai-lab` déjà présente dans `.claude/skills/`.

### 8.1 Le registre — `lib/ai/cerveaux/`

Un dossier par cerveau, et dans chacun :

- `cas.jsonl` — les cas de référence : une entrée = une demande client, le contexte métier, la sortie **attendue** (ou les critères qu'elle doit remplir), et l'origine du cas.
- `evaluer.mjs` — rejoue tous les cas contre le cerveau tel qu'il est, et sort un score. Il tourne en CI : **une modification de prompt qui fait baisser le score ne se fusionne pas.**
- `journal.md` — chaque amélioration, datée : ce qui a changé, pourquoi, le score avant, le score après.

### 8.2 D'où viennent les cas — et d'où ils ne viennent jamais

- **Les corrections des artisans** : quand un artisan modifie un brouillon avant de l'envoyer, la différence entre le brouillon et l'envoi est le signal le plus précieux qui existe. Il n'entre dans le registre que **si l'artisan a activé « Aider Presti à s'améliorer »** dans ses réglages (désactivé par défaut), et **anonymisé** : ni nom, ni adresse, ni téléphone, ni photo — passage obligatoire par une fonction d'anonymisation testée.
- **Les cas de Benj et des auditeurs** : chaque défaut trouvé (le vitrier, la TVA, l'accusé de réception…) devient un cas de référence le jour même, avant même d'être corrigé.
- **Les cas synthétiques par métier** : Antigravity en génère en volume à partir des consignes de `metiers.ts` — cinquante par métier, relus par toi par échantillon.
- **Jamais** : les conversations privées lues telles quelles. La promesse « la forme, jamais le fond » (`supportArtisan`) s'applique au cerveau comme au support. Un cas qui entre dans le registre sans passer par l'anonymisation ou sans consentement est un incident.

### 8.3 Le cycle

Une fois par semaine — tâche planifiée, pas bonne volonté :

1. `evaluer.mjs` sur tous les cerveaux → scores au journal.
2. Les cas en échec sont triés : bug de consigne, manque de connaissance métier, ou cas mal écrit.
3. Antigravity propose les corrections de consignes ; **toi**, tu relis et tu fusionnes si le score monte sans faire baisser un autre cerveau.
4. Le tableau des scores est visible dans le **Poste de contrôle**, onglet « Cerveaux » : par cerveau, le score, la tendance, le dernier changement. Benj voit si Presti devient meilleur ou non.

### 8.4 Ce que « apprendre » veut dire ici, honnêtement

Pas d'entraînement de modèle, pas de fine-tuning : ce serait cher, lent, et sans intérêt à cette taille. Ce qui fait progresser Presti, c'est **des consignes plus justes, des règles de métier plus complètes, et une base de prix qui s'enrichit** — mesuré par des cas rejoués. C'est moins spectaculaire qu'un « modèle qui apprend », et c'est ce qui marche.

Documente le tout dans le vault : `Produit/Coeur-de-cerveau.md`, relié depuis `Récap-Projet.md`.

---

**La règle qui résume ce prompt** : un site n'est vendable que si `site-qa.mjs` est vert sur les quatre scores et que Benj l'a regardé. Tu ne fais toi-même que ce qu'Antigravity ne peut pas faire — le reste, tu le lui décris en un fichier et tu relis sa preuve. Et un cerveau de Presti ne change que si son score monte.
