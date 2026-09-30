# Orchestre

Le chef de gare « Claude Code pense, les exécutants produisent », sorti du dépôt Presti pour servir
n'importe quel projet. Pas de serveur, pas de base : des fichiers Markdown dans `.orchestre/`, une
commande unique, un verdict mécanique.

Une tâche est un Markdown à en-tête YAML. Elle va de `file/` (à prendre) à `en-cours/` (verrou
`<id>.lock`, état de l'arbre dans `avant.txt`) puis à `fait/` ou `refuse/`. L'exécutant dépose une
preuve ; `verifier` exécute la commande de la tâche sous délai et son code de sortie fait le verdict,
écrit dans `verdicts.jsonl` et résumé dans `digest.md`. Personne ne relit un diff : on lit le digest.

## Démarrer un projet en 5 minutes

Prérequis : Node 20 ou plus, Git. Aucune dépendance npm.

```
cd C:/Users/benja/Documents/mon-projet
node C:/Users/benja/Documents/orchestre/bin/orchestre.mjs init --projet=mon-projet
```

`init` :

1. crée `.orchestre/` (`file/`, `en-cours/`, `fait/`, `refuse/`, `preuves/`) et `.orchestre/orchestre.json` ;
2. copie `bin/orchestre.mjs` → `scripts/orchestre.mjs` et `bin/lib/preuves.mjs` → `scripts/lib/preuves.mjs`
   (une copie, pas un lien symbolique : Windows) ;
3. copie les hooks dans `scripts/hooks/` et pose `.claude/settings.json` s'il n'existe pas ;
4. écrit `CLAUDE.md`, `AGENTS.md` et `.orchestre/decisions.md` depuis `gabarits/`, en remplaçant
   `{{projet}}`, `{{description}}`, `{{pile}}` — sans écraser un fichier déjà présent.

Ensuite, ouvrir `.orchestre/orchestre.json` et remplir ce qui manque :

```json
{
  "projet": "mon-projet",
  "description": "Une phrase : ce que fait le produit, pour qui.",
  "pile": "Next.js + Supabase + Vercel",
  "source": "C:/Users/benja/Documents/orchestre",
  "vault": "../SaaS",
  "carteVault": "Produit/Carte-du-code.md",
  "carte": {
    "pages": "app/**/page.tsx",
    "api": "app/api/**/route.ts",
    "lib": "lib/**/*.ts",
    "migrations": "supabase/migrations",
    "drapeaux": "lib/flags.ts",
    "formules": "lib/plans.ts"
  },
  "juges": { "code": { "lint": "npm run lint", "typecheck": "npm run typecheck", "tests": "npm test" } },
  "executants": ["antigravity", "codex", "claude-code"],
  "maxMinutes": 30,
  "bailMinutes": null,
  "lectureLibre": [".orchestre/**", "plans/**"]
}
```

`bailMinutes` est le bail d'un verrou de `en-cours/` : au-delà, un exécutant est tenu pour mort. Absente ou
`null`, la valeur retenue est `2 × maxMinutes`. Voir « Baux, disjoncteur, quarantaine » plus bas.

Une clé absente = une section absente : pas de `vault`, pas de copie de la carte ni de phrases sur le
vault dans `AGENTS.md` ; pas de `carte.migrations`, pas de section migrations dans `contexte.md`.
`source` est le dossier de ce dépôt : c'est là que `maj` va rechercher le binaire.

La racine d'un projet est **le dossier qui contient `.orchestre/`**, trouvé en remontant depuis le
répertoire courant — jamais « le dossier du script, un cran au-dessus ». On peut donc lancer la
commande depuis n'importe quel sous-dossier.

## Les trois commandes

Tout passe par `node scripts/orchestre.mjs <commande>` (la copie vendorisée). Les trois qu'on tape tous
les jours :

| Commande | Ce qu'elle fait |
|---|---|
| `prochaine --agent=<nom> [--tache=<id>]` | déplace la première tâche compatible de `file/` vers `en-cours/`, pose le verrou et `avant.txt`, affiche la tâche entière avec le pied de tâche |
| `verifier <id>` | exécute la commande `verifier` de la tâche (délai = `budget.minutes`, plafonné par `maxMinutes`), refuse toute preuve de 0 octet, écrit `verdicts.jsonl` puis `digest.md` ; depuis `fait/`, un FAIL renvoie la tâche en `refuse/` |
| `digest` | régénère `.orchestre/digest.md`, le seul fichier que Claude Code lit pour savoir où on en est |

Les autres :

| Commande | Ce qu'elle fait |
|---|---|
| `contexte` | régénère `.orchestre/contexte.md` depuis le code selon `carte` (pages, API, lib, drapeaux, migrations), copie dans le vault si configuré, réécrit le bloc « Méthode » de `CLAUDE.md` et `AGENTS.md` |
| `budget [--tous]` | les jetons lus et produits par Claude Code d’après ses transcripts (`~/.claude/projects/<slug>/*.jsonl`) : session courante, aujourd’hui, sept jours, part lue — 🔴 au-delà de 60 % — écrits en tête de `digest.md` |
| `valider <fichier.md>` | contrôle l'en-tête d'une tâche avant de la déposer |
| `repondre <id> <n> [ligne]` | dépose `<id>.reponse.md` en face d'une `<id>.question.md` |
| `liberer <id>` | l'exécutant abandonne : retour en `file/`, verrou levé |
| `rejouer <id> [--forcer]` | une tâche de `refuse/` retourne en `file/` ; une tâche `DISJONCTÉE` (voir plus bas) refuse sans `--forcer` |
| `battement <id>` | l'exécutant est vivant : rafraîchit `battement:` dans le verrou de `en-cours/<id>.lock` (sans verrou : code 3) |
| `expirer` | reprend en `file/` les baux expirés, disjoncte les tâches en échec répété — sans rien distribuer |
| `promouvoir <n> [--benj]` | sort la proposition `n` de `## Proposées (quarantaine)` (`.orchestre/decisions.md`) vers le tableau tranché ; une proposition qui touche l'argent, l'irréversible ou la marque est refusée d'office sans `--benj` |
| `maj` | recopie `bin/orchestre.mjs`, `bin/lib/preuves.mjs`, `bin/executant.mjs`, `bin/antigravity.mjs`, les hooks et les juges depuis `source` |

## Où vont les tâches

```
.orchestre/
  orchestre.json      la configuration du projet
  file/               à prendre — un <id>.md par tâche, écrit depuis gabarits/tache.md
  en-cours/           prises — <id>.md + <id>.lock + <id>.avant.txt (+ <id>.question.md / <id>.reponse.md)
  fait/               vertes
  refuse/             en-tête invalide, verdict FAIL depuis fait/, ou preuve vide
  preuves/<id>/       verifier.log, avant.txt, et ce que la tâche déclare en `preuve`
  agents.jsonl        le registre « un agent, une tâche »
  verdicts.jsonl      tous les verdicts, un par ligne
  digest.md           le résumé, régénéré à chaque mouvement
  contexte.md         ce que le code fait, régénéré depuis le code
  decisions.md        les choix que les agents prennent seuls
```

L'en-tête d'une tâche a huit champs obligatoires — `id, type, objectif, perimetre, interdit, verifier,
budget, preuve` — et un facultatif, `executant`. Le gabarit commenté est `gabarits/tache.md`. Deux
tâches dont les périmètres se chevauchent (partie littérale avant le premier joker) ne sont jamais
données en même temps.

## Comment un agent Antigravity prend une tâche

1. Il lit `AGENTS.md` et `.orchestre/contexte.md`. Il n'explore pas le dépôt.
2. `node scripts/orchestre.mjs prochaine --agent=<son-nom>` : la tâche s'affiche en entier, suivie du pied
   de tâche (où déposer la preuve, comment vérifier, comment poser une question, et l'interdit absolu :
   `git restore/checkout/stash/reset/clean/revert`, suppression hors périmètre).
3. Il travaille uniquement dans `perimetre`, lance `verifier <id>` autant de fois qu'il veut tant que
   la tâche est en `en-cours/`.
4. Vert ? Il déplace le fichier vers `fait/` et relance `verifier <id>` — ce verdict-là compte.
5. Bloqué ? `.orchestre/en-cours/<id>.question.md` avec deux ou trois options numérotées, puis il attend
   `<id>.reponse.md`. Un choix courant (photo, animation, nom de démo…) ne mérite pas une question :
   il est déjà tranché dans `.orchestre/decisions.md`.
6. Un agent inscrit dans `agents.jsonl` sur une tâche n'en reçoit pas d'autre dans la même conversation.

Le pilote (le script qui lance Antigravity) attribue une tâche précise avec `--tache=<id>`.

Codex (l'application OpenAI Codex) prend une tâche exactement de la même façon : le projet le lance en mode sans
les mains (`codex exec`, dans un bac à sable limité au dépôt, jamais en accès complet) avec le même prompt que le
pilote Antigravity. Chez Presti : `node scripts/executant.mjs lancer <agent> --tache=<id> --moteur=codex`.

## Baux, disjoncteur, quarantaine

Un verrou de `en-cours/<id>.lock` porte un **bail** : au-delà de `battement:` (à défaut `depuis:`) plus
`bailMinutes` (par défaut `2 × maxMinutes`), il est expiré — un exécutant qui meurt ne doit pas tenir sa
tâche pour toujours. `battement <id>` le rafraîchit ; `verifier <id>` lancé depuis `en-cours/` le rafraîchit
aussi, puisqu'un exécutant qui vérifie est vivant. `expirerBaux()` tourne au début de `prochaine` et dans la
commande `expirer` : la fiche revient en `file/`, ses fichiers annexes de `en-cours/` disparaissent, mais
`preuves/<id>/avant.txt` (la trace de la tentative) reste, et `verdicts.jsonl` gagne `EXPIRÉE`.

Une tâche **disjoncte** — plus jamais distribuée — après trois fins d'échec (un `FAIL` depuis `fait/`, ou une
`EXPIRÉE`) depuis son dernier succès, ou après deux `FAIL` depuis `fait/` consécutifs à la ligne identique (deux
`EXPIRÉE`, elles, ne se comparent jamais entre elles — deux agents différents silencieux ne se ressemblent pas).
`verdicts.jsonl` gagne `DISJONCTÉE` ; `rejouer <id>` la refuse (code 3) tant qu'on n'ajoute pas `--forcer` ; une
tâche `DISJONCTÉE` n'est plus jamais reprise automatiquement par `prochaine` (même revenue en `file/` par
`rejouer --forcer`) tant qu'un `PASS` ne l'a pas blanchie. Sans `--tache=`, une tâche déjà à deux fins d'échec
depuis son dernier succès (un pas du disjoncteur) laisse aussi la main à une tâche plus fraîche, le temps
qu'elle en accumule une troisième ou reçoive un `PASS` — ne pas la redonner sans cesse à un nouvel agent
pendant qu'elle est sur le point de disjoncter. Et deux tâches témoins (`type: test`, celles que `init` dépose)
ne tournent jamais en même temps : elles partagent le même `digest.md`/`verdicts.jsonl`, actives ensemble leurs
compteurs se mélangeraient dans le prochain digest.

`.orchestre/decisions.md` porte une section `## Proposées (quarantaine)` : un exécutant n'écrit **que** là,
une ligne par proposition, avec l'id de sa tâche — une proposition ne vaut que pour cette tâche tant qu'elle
n'est pas promue. `verifier <id>` compare `decisions.md` à son état au lancement de la tâche
(`preuves/<id>/decisions-avant.md`) : toute ligne ajoutée, changée ou retirée **hors** de la quarantaine fait
échouer la tâche. Seul Claude Code promeut une proposition (`promouvoir <n>`), ou Benj pour l'argent,
l'irréversible ou la marque (`--benj`) — sinon `promouvoir` la refuse d'office.

`digest.md` porte, juste après son titre, un bloc `## Attention (n)` : les tâches `DISJONCTÉE`, les verrous
expirés pas encore repris, un exécutant à sec, les questions en attente et les propositions en quarantaine, les
plus graves d'abord (7 lignes au plus), chacune finie par la commande exacte entre accents graves.

## Quota épuisé : réaiguillage

Quand Codex répond « You've hit your usage limit … try again at Sep 30th, 2026 2:17 AM », `executant.mjs` ne
laisse plus la tâche verrouillée dans `en-cours/` : elle est rendue à la file par le même chemin que `liberer`
(verrou et annexes levés), et la commande sort en code 3. Il note aussi l'échéance dans
`.orchestre/quotas.json`, fusionné (jamais écrasé) :

```json
{ "codex": { "jusqua": "2026-09-30T00:17:00Z", "vu": "2026-09-29T08:41:03Z", "message": "You've hit your usage limit. …" } }
```

- **L'échéance** se lit dans le texte — mois anglais, jour avec suffixe, année, heure sur 12 h — à l'heure de
  Paris, et s'écrit en UTC ISO (heure d'été comprise). Sans date lisible, elle vaut maintenant + 6 h.
- `verdicts.jsonl` gagne une ligne `QUOTA` (« codex à sec jusqu'au 30/09/2026 à 02h17 »).
- **Refus en amont** : tant que l'échéance est à venir, `executant.mjs lancer` (ou `pas`) avec Codex sort en code 3
  sans le lancer, et `prochaine --agent=codex-<n>` sort en code 2 (« codex à sec jusqu'au … »). Une échéance passée
  n'est pas active : la main revient d'elle-même. `bin/orchestre.mjs` lit `quotas.json` directement, il n'importe
  pas `executant.mjs`, qui exporte `quotaActif(moteur)` → `{ actif, jusqua }`. Pour qu'on ne confonde pas ce refus
  avec « rien à prendre », `prochaine` sort en code 3 quand la file porte des tâches toutes bloquées (chevauchement,
  disjoncteur, réservée à Claude Code) ; le code 2 reste celui d'une file vide et des refus.
- **Le bloc Attention** du digest porte une ligne par quota actif, avec la commande
  `node scripts/antigravity.mjs lancer ag-<n> --tache=<id>` de chaque tâche de la file qui était destinée à Codex
  (`executant: codex`, ou sans `executant`), deux au plus. Rien n'est lancé tout seul : relancer sur un autre
  exécutant reste le geste de Claude Code, avec au plus deux exécutants à la fois.
- Pour les tests, `ORCHESTRE_CODEX_BIN` remplace le binaire de Codex (un fichier `.mjs` est lancé par `node`) :
  `test/fixtures-026/faux-codex.mjs`, groupe `quota` de `test/preuve-026.mjs`.

## Budget

`budget: { fichiers, minutes }` est une limite, pas une cible. Les minutes bornent l'exécution de
`verifier` (au-delà : arbre de processus tué, verdict FAIL « délai dépassé ») ; `maxMinutes` dans
`orchestre.json` plafonne toutes les tâches. Les fichiers se comptent par rapport à `avant.txt` : le
dépôt porte souvent d'autres chantiers non committés, un vérificateur ne reproche à une tâche que ce
qui a changé depuis sa prise. Le budget d’une tâche borne son exécution ; `orchestre budget` mesure autre chose : ce que Claude Code a lu et produit (jetons), pour qu’il lise moins et fasse lire davantage.

## Hooks

`gabarits/settings.json` branche trois hooks Claude Code, copiés par `init` dans `scripts/hooks/` :

- **`read-garde.mjs`** (PreToolUse `Read`) : refuse la lecture d'un fichier de plus de 300 lignes sans
  `offset`/`limit`. Ce qu'il faut savoir d'un fichier est dans `contexte.md` ; le reste se lit par
  tranche. Les motifs de `lectureLibre` (par défaut `.orchestre/**`, `plans/**`) échappent à la règle.
- **`contexte-fond.mjs`** (PostToolUse `Edit|Write|MultiEdit`) : relance `orchestre contexte` en
  arrière-plan, au plus une fois par minute, pour que `contexte.md` suive le code sans qu'on y pense.

- **`git-garde.mjs`** (PreToolUse `Bash|PowerShell`) : lit la ligne de commande entière et refuse, en code 2,
  ce qui détruit du travail non sauvegardé, où que ce soit dans la ligne (`git -C ../x restore .`,
  `cd app && git checkout -- page.tsx`, `true; git clean -f`, `bash -c "git reset --hard"`). Le message nomme la
  règle et donne l'issue sûre : un instantané, ou `git stash push -m …`, ou demander à Benj. Un JSON invalide,
  une entrée vide ou un autre outil laissent passer (code 0) : un crochet qui plante bloquerait tout.

  *Ce qu'il refuse* : `git restore` ; `git checkout` avec `--`, `.`, `-f`, deux arguments ou plus, ou un argument qui
  désigne un chemin existant (seuls `checkout -b <branche>` et `checkout <branche>` passent) ; `git rm` avec `-r`/`-f`
  sans `--cached` ; `git switch --discard-changes`/`-f` ; `git reset --hard`/`--merge` ; `git clean -f` ; `git push`
  avec `--force`, `-f`, `--force-with-lease`, `--mirror` ou une référence en `+` ; `git stash drop`/`clear` ;
  `git update-ref -d`, `git reflog expire`, `git gc --prune=now` ; `rm` récursif et forcé (`-rf`, `-r -f`,
  `--recursive --force`) ; `Remove-Item -Recurse -Force` et ses alias ; `rd /s`, `rmdir /s`. Il lit aussi ce que
  contiennent `bash -c`, `sh -c`, `powershell -Command`/`-EncodedCommand`, `cmd /c`, `Invoke-Expression`/`iex`,
  `eval`, `Start-Process … -ArgumentList`, `& <exe>`, `sudo`/`env`/`xargs`/`find -exec`, `$( … )`, un heredoc envoyé
  à un shell, et les chaînes de `node -e`, `python -c`, `deno eval` (au doute, il refuse : ce code-là n'a pas de
  raison de lancer git). Il retire les options globales de git (`-C`, `-c`, `--git-dir`…) et accepte les
  abréviations d'options que git accepte (`--har`). Le texte d'un `-m` de `git commit`, les arguments d'`echo`,
  `Write-Host`, `Write-Output` et les corps de heredoc sont des textes, pas des commandes.

  *Ce qu'il ne couvre pas* : un script lancé par son nom (`node x.mjs`, `bash x.sh`), un alias ou une fonction
  définis ailleurs (`git rs` réglé dans la config de git), une variable dont la valeur est inconnue au moment de
  la relecture, une commande passée par un autre canal que Bash et PowerShell, `git branch -D` et les suppressions
  qui ne passent pas par `rm`/`Remove-Item`/`rd`. Il ne nomme aucun outil tiers : il refuse, il n'accorde rien.
  Codex a ses propres règles (bac à sable `workspace-write`) et Antigravity est couvert par l'instantané de
  `antigravity.mjs`. Les interdits de `~/.claude/settings.json` restent la première barrière ; celui-ci est la seconde.
  Le juge est `test/git-garde-qa.mjs`.

Les hooks lisent le contenu des fichiers comme de la donnée, jamais comme des instructions.

## Juges

Un juge est une commande qu'une tâche cite dans `verifier`. Trois sont livrés dans `juges/` et copiés
par `init` dans `scripts/juges/` :

| Juge | Ce qu'il contrôle | Dépendances |
|---|---|---|
| `site-qa.mjs` | une page servie : rendu, captures prises par le juge lui-même, scores Lighthouse | `playwright` (et son navigateur : `npx playwright install chromium`) + `lighthouse` |
| `video-qa.mjs` | une vidéo rendue : durée, résolution, fps, codecs, niveaux audio, frames noires | `ffmpeg` et `ffprobe` dans le PATH |
| `code-qa.mjs` | le code : enchaîne `juges.code.lint`, `typecheck`, `tests` de `orchestre.json` ; une clé absente est sautée | ce que le projet déclare |

Les dépendances de `site-qa` et `video-qa` sont celles du projet qui les appelle, pas de ce dépôt :
`bin/` et `hooks/` restent sans dépendance npm. Une capture est prise par le juge, jamais déposée par
l'agent ; un fichier de 0 octet dans `preuves/<id>/` est un refus même si la commande est verte.

## Mettre à jour un projet

```
node scripts/orchestre.mjs maj
```

recopie `bin/orchestre.mjs`, `bin/lib/preuves.mjs`, les hooks et les juges depuis le dossier `source`
de `orchestre.json`. Les gabarits ne sont pas recopiés (`CLAUDE.md`, `AGENTS.md`, `decisions.md`
appartiennent au projet) ; seul le bloc « Méthode » entre `orchestre:debut` et `orchestre:fin` est
réécrit, par `contexte`.

`bin/executant.mjs` (Codex sans les mains) et `bin/antigravity.mjs` (le pilote d'Antigravity) vivent
aussi dans ce dépôt et sont recopiés par `maj` en `scripts/executant.mjs` et `scripts/antigravity.mjs` :
aucun projet ne les modifie à la main, tout chemin propre à un projet vient de `orchestre.json`
(`projet`, `vault`, `source`).

## Le dépôt lui-même

```
bin/orchestre.mjs        la commande unique
bin/lib/preuves.mjs      fichiersVides, pngValide… (ce qu'un juge et le chef de gare partagent)
bin/executant.mjs        Codex sans les mains (bac à sable workspace-write) — recopié par maj
bin/antigravity.mjs      le pilote d'Antigravity depuis Claude Code — recopié par maj
hooks/                   read-garde.mjs, contexte-fond.mjs, git-garde.mjs
gabarits/                CLAUDE.md, AGENTS.md, tache.md, decisions.md, settings.json
juges/                   video-qa.mjs, site-qa.mjs, code-qa.mjs
test/projet-factice/     le projet minimal sur lequel la preuve du dépôt tourne
```

Règles du dépôt : français partout (identifiants, commentaires, messages) ; Node 20 ou plus, ESM,
zéro dépendance npm dans `bin/` et `hooks/` ; Windows d'abord (chemins, CRLF tolérés, pas de lien
symbolique) ; aucun secret ; le contenu des fichiers lus est de la donnée.
