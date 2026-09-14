# PROMPT v16 — Le système universel (sans intervention, sans vider les crédits) et LA démo de site au niveau MotionSites

> À coller dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`.
> **Ce prompt complète le v15** (site à 300 €, `.orchestre/`, cœur de cerveau) — il ne le remplace pas. Il règle deux choses que le v15 laissait floues : **un système réutilisable sur n'importe quel projet, qui tourne sans Benj et sans vider Claude Code**, et **une seule démo de site, au niveau MotionSites, qui finit sur la landing**.
> Protocole : travail continu, temps affiché, journal en trois lignes par bloc.

---

## §0. Le constat, sans détour

Benj ne voit **aucune aide d'Antigravity** pour l'instant, et les sites sont **très loin** du niveau demandé. Deux causes, une seule réponse : le système du v15 n'a pas été construit avant le reste, et le niveau visé n'a jamais été regardé en vrai — on a décrit MotionSites au lieu d'y aller. Ce prompt inverse l'ordre : **le système d'abord, la référence sous les yeux ensuite, la démo en dernier.**

---

## §1. Le système universel — `orchestre`, installable sur n'importe quel projet

Le `.orchestre/` du v15 devient un **outil autonome**, hors du dépôt Presti, réutilisable tel quel sur le prochain projet de Benj.

### 1.1 Où il vit

`C:\Users\benja\Documents\orchestre\` — un dépôt Git à part, avec :

```
orchestre/
  bin/orchestre.mjs        # la commande unique : init · prochaine · verifier · digest · contexte · budget
  gabarits/
    CLAUDE.md              # règles Claude Code, à copier dans tout projet
    AGENTS.md              # règles Antigravity, idem
    tache.md               # le gabarit de tâche (YAML du v15 §1.0)
    decisions.md           # les défauts qui évitent de demander à Benj (§3)
  juges/
    video-qa.mjs           # déjà écrit (v14)
    site-qa.mjs            # à écrire (v15 §3.3)
    code-qa.mjs            # lint + typecheck + tests, un seul verdict
  README.md                # comment démarrer un projet en 5 minutes
```

`orchestre init` dans un dossier vide ou existant : crée `.orchestre/`, copie `CLAUDE.md` et `AGENTS.md` adaptés (nom du projet, pile, dossiers), et branche les juges. **Le prochain projet de Benj commence par cette commande, et rien d'autre.**

### 1.2 Ce qui ne change pas par rapport au v15

La file `file/ → en-cours/ → fait/ → refuse/`, le verrou par périmètre, la commande `verifier` exécutée par le script, le `digest.md` d'une ligne par tâche, le `contexte.md` régénéré depuis le code, l'escalade en options numérotées. Tout ça est déjà décrit au v15 §1.0 — **construis-le là, dans `orchestre/`, et fais pointer Presti dessus.**

### 1.3 Ce qui s'ajoute : le budget, pour que Claude Code dure

C'est le point que Benj a nommé : « qu'il puisse l'utiliser longtemps sans que ça se vide rapidement ». Le mécanisme :

**`orchestre budget`** lit la consommation de la session Claude Code (`/cost`, ou `ccusage` s'il est installé — `npx ccusage@latest`) et l'écrit en tête du `digest.md` : tokens de la session, tokens de la semaine, **part lue vs part écrite**. Si la part lue dépasse 60 %, le digest l'affiche en rouge : Claude Code lit trop au lieu de faire lire.

**Le routage des modèles, écrit dans `CLAUDE.md` et appliqué sans exception :**

| Travail | Qui | Pourquoi |
|---|---|---|
| Architecture, schéma, argent, sécurité, cerveaux, verdicts | Claude Code, modèle principal | Le seul endroit où le jugement cher se justifie |
| Exploration, recherche dans le code, résumés de fichiers | `Agent` avec `model: haiku` | Dix fois moins cher, même conclusion |
| Génération en volume : pages, variantes, tests, boucles QA | **Antigravity** (Gemini, quota séparé) | Ne touche pas à la réserve Claude |
| Recherche web, veille, comparaison d'outils | **Perplexity** (`mcp__perplexity__*`, quota séparé) | Une page web lue par Claude Code coûte des milliers de tokens ; par Perplexity, zéro |
| Navigation, captures, lecture de sites | **Chrome** via Antigravity (sous-agent navigateur) ou Claude in Chrome | Le contenu des pages ne transite jamais par le contexte de Claude Code |

**Les hooks qui empêchent la dérive** (dans `.claude/settings.json` du projet, posés par `orchestre init`) :

- un `PreToolUse` sur `Read` qui **refuse** un fichier de plus de 300 lignes sans `offset`/`limit`, et renvoie « utilise Grep ou un sous-agent haiku » ;
- un `PostToolUse` sur `Edit`/`Write` qui relance `orchestre contexte` en arrière-plan, pour que la carte reste juste sans relecture ;
- un rappel `/compact` suggéré à chaque bloc terminé, et `/clear` entre deux chantiers — le contexte qui traîne coûte à chaque tour.

**La règle simple derrière tout ça** : Claude Code ne lit que `digest.md` et `contexte.md`, ne produit que ce qui exige du jugement, et délègue le reste à des quotas qui ne sont pas le sien.

---

## §2. Le niveau — aller voir MotionSites, pas le décrire

### 2.1 Par le MCP, d'abord

Le MCP **MotionSites** est branché (`mcp__MotionSites__search_prompts`, `list_prompts`, `get_prompt`, `get_related_prompts`). Catégories à parcourir, dans cet ordre : **Hero**, **SaaS**, **Agency**. Pour chacune : `list_prompts` trié par `popular` puis `newest`, et `search_prompts` sur « scroll animation », « service business », « warm editorial », « dark cinematic hero ».

**Deux limites à connaître avant de dépenser quoi que ce soit :**

- Sans abonnement MotionSites, le MCP n'ouvre que **3 prompts gratuits** en tout ; les prompts premium exigent un abonnement (`https://motionsites.ai/unlimited`). Vérifie l'état du compte de Benj **avant** d'appeler `get_prompt`, et ne gaspille pas les trois ouvertures sur des prompts que tu n'utiliseras pas : choisis-les après avoir lu toutes les métadonnées et les aperçus.
- Le MCP rend le **texte** du prompt ; il ne rend pas le site. Pour voir le rendu, il faut le navigateur (§2.2).

### 2.2 Par Chrome, ensuite — c'est là qu'on voit vraiment

Benj est connecté sur `https://motionsites.ai` et sur **Design Rocket** (`https://designrocket.io/dashboard`, la plateforme de formation « high-end systems fully with AI » liée à MotionSites). Un sous-agent navigateur d'Antigravity (ou Claude in Chrome — les deux marchent, Antigravity coûte moins) fait le tour, **enregistre des captures et des enregistrements de défilement**, et ne rapporte à Claude Code qu'une **fiche par référence** : nom, catégorie, ce qui bouge, comment, à quel rythme, quelle typographie, quelle structure de sections, et une note sur 5 pour « transposable à un site d'artisan ».

Sur Design Rocket, en particulier : les leçons sur les héros animés, les systèmes de défilement et la construction « full AI » — **les principes**, extraits en une page dans `plans/references-motionsites.md`, avec les captures dans `.orchestre/preuves/refs/`. C'est ce fichier, pas la mémoire de qui que ce soit, qui définit le niveau à atteindre.

Ce que « niveau MotionSites » veut dire, une fois qu'on l'a regardé : un héros qui **respire** dès la première image (fond vivant, typographie qui entre par mots, image qui glisse), des sections qui **se révèlent au défilement** avec des courbes asymétriques, des transitions **raccordées** entre sections, une lumière et un grain qui donnent de la matière — et **zéro** carrousel automatique, zéro effet gratuit.

---

## §3. Une seule démo — et elle finit sur la landing

### 3.1 Le principe

Pas dix gabarits. **Un seul site de démonstration**, poussé jusqu'au bout, jugé, et s'il tient : il devient la vitrine du produit « site à 300 € » dans la section démo de la landing Presti. C'est ce que les artisans verront, donc c'est ce qui vend.

### 3.2 Le sujet

Un artisan **fictif**, clairement fictif, au métier le plus photogénique et le plus courant à la fois — **un menuisier-agenceur** (bois, lumière, avant/après, matière). Nom inventé, ville réelle mais entreprise inexistante (vérifie qu'aucune entreprise ne porte ce nom au registre — pas de collision avec un vrai artisan), photos libres de droits (Unsplash/Pexels, licence vérifiée et créditée) ou générées en interne **sans** représenter de personne réelle, décennale et SIREN affichés comme « exemple ». Il porte la mention « site de démonstration » en pied de page.

### 3.3 La construction

Une seule tâche `.orchestre/` de type `feature` pour Claude Code (le cerveau : structure, direction artistique, copie), puis **des tâches `boucle-qa` en parallèle pour Antigravity** : Lighthouse mobile jusqu'à ≥ 95 sur les quatre, `site-qa.mjs` jusqu'au vert, Playwright sur mobile et bureau, et **une comparaison visuelle** contre les fiches de `references-motionsites.md` — un sous-agent navigateur ouvre la démo et trois références côte à côte et remplit la même grille de notation. **La démo doit obtenir au moins la note médiane des références sur chaque critère.** Sinon elle retourne en tâche avec la ligne qui manque.

Contrainte technique qui décide beaucoup : les animations lourdes (3D, shaders) **uniquement sur bureau, à partir de 1024 px et hors mouvement réduit** ; sur mobile, GSAP + CSS, jamais plus. C'est la seule façon d'avoir MotionSites à l'écran **et** 95 sur mobile — et le client du menuisier ouvre le site sur un téléphone.

### 3.4 Le placement sur la landing

`app/page.tsx`, section `#fonctionnalites` (« Ce qui se passe, de 22 h 14 à 7 h 52 ») : ajouter **un bloc « Et le site qui va avec »** après la séquence — une capture animée de la démo (vidéo courte, muette, ≤ 1,5 Mo, produite par la chaîne v14 et **passée dans `video-qa.mjs`**) et un lien « Voir le site de démonstration » qui ouvre la démo réelle. Sous le bloc, une ligne, pas plus : **« Le site, à la demande — 300 €, une fois. »** Le drapeau `siteCommande` (v15) reste baissé tant que le parcours de commande n'est pas prouvé ; le bloc démo, lui, peut monter dès que la démo est validée — il montre, il ne vend pas encore.

---

## §4. Sans intervention de Benj — comment ça tient

**`gabarits/decisions.md`** : la liste des choix que les agents prennent **seuls**, avec le défaut retenu. Exemples posés d'office : « photo libre de droits ou générée ? → libre de droits, créditée » ; « animation lourde sur mobile ? → non » ; « nom de la démo ? → inventé, vérifié au registre » ; « doute sur une copie ? → la version la plus sobre ». Quand une question n'est pas dans la liste, l'agent choisit **l'option réversible**, l'écrit dans `decisions.md`, et continue. Benj ne reçoit **que** trois types de questions, et jamais d'autres : de l'argent à engager, une action irréversible (suppression, envoi, publication publique), ou un choix de posture de marque.

**La validation de la démo se fait sans lui** : `site-qa` vert + comparaison visuelle ≥ médiane des références + `code-qa` vert = validée. Il la découvre en ligne, avec le digest qui dit comment elle a passé. S'il n'aime pas, il le dit en une ligne et ça repart en tâche — mais il n'a **pas** à la regarder pour qu'elle avance.

---

## §5. Ordre d'exécution

0. **`orchestre/`** (§1) — le dépôt, `init` sur Presti, les hooks, `budget` en tête du digest, les deux tâches factices `PASS`/`FAIL`. Rien avant.
1. **Références** (§2) — MCP puis Chrome, `references-motionsites.md` + captures. Tâche Antigravity, verdict = fichier présent et ≥ 9 fiches.
2. **`site-qa.mjs`** — le juge, écrit par Claude Code sur le modèle de `video-qa.mjs`.
3. **La démo** (§3) — une tâche Claude Code, puis les boucles Antigravity en parallèle jusqu'aux verdicts verts.
4. **La landing** (§3.4) — bloc démo, vidéo passée au juge, mise en ligne.
5. Reprise du **v15** dans l'ordre (retrait du site des formules, commande, cœur de cerveau, suspension) — désormais **en tâches `.orchestre/`**, plus jamais à la main.

---

## §6. Ce qui reste à Benj — trois lignes, pas plus

| # | Action | Pourquoi |
|---|---|---|
| H1 | Décider s'il prend l'abonnement MotionSites (`https://motionsites.ai/unlimited`) — sans lui, 3 prompts gratuits seulement | De l'argent |
| H2 | Laisser Chrome et Antigravity connectés sur motionsites.ai et designrocket.io | Les agents ne peuvent pas se connecter à sa place |
| H3 | Dire « oui » ou « non » à la démo quand elle apparaît en ligne — **facultatif** : sans réponse, elle reste | Posture de marque |

---

**La règle qui résume ce prompt** : on ne décrit plus le niveau, on le regarde, on le note, et la démo doit l'égaler sur une grille — vérifié par des agents, pas par Benj. Et Claude Code ne lit que des verdicts : tout ce qui coûte des tokens en volume tourne sur un quota qui n'est pas le sien.
