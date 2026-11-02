# 031-013 — la file n8n lance aussi Claude Code par Orca

Date : 02/11/2026. Exécutant : claude-code. Réseau neuronal consulté d'abord : `regles_pour` (vault/CLAUDE.md, revue du dimanche),
`chercher` (ADR-002, brief `revoir-notes.md`, session du 01/11), puis `.claude/rules/architecture-outils.md` (n8n porte les
automatisations, aucun agent sans Orca) et la vidéo metakaihos (`plans/analyse-videos.md:1368-1475`, révision façon Anki,
l'agent qui relit est distinct de celui qui revoit, `:1428`).

## Routage par tâche (liste blanche locale, `scripts/hermes-tache-n8n.mjs`)

L'exécutant se lit au NOM de la tâche, dans `BRIEFS` (jamais dans ce que n8n envoie), et chaque entrée le dit explicitement :

| tâche | brief | exécutant |
|---|---|---|
| `revue-reseau-neuronal` | `revue-hebdo-reseau-neuronal.md` | hermes |
| `essai-boucle` | `essai-boucle.md` | hermes |
| `sante-reseau` | `sante-reseau.md` | hermes |
| `revoir-notes` (nouvelle) | `revoir-notes.md` | **claude** |

- `executantDe(tache)` rend `hermes`, `claude` ou `null` ; un nom d'exécutant inconnu, ou une tâche hors liste, rend `null` : la
  tâche n'est pas permise (écartée « bloque » par le precheck, jamais exécutée). `hermes` est la valeur par défaut d'une entrée
  sans exécutant.
- `--precheck` : un « 0 » dit aussi l'exécutant à lancer. Il est noté **avec la réservation du passage**, sous le verrou de la file,
  dans `onglets-hermes.json` (`{handle:null, passage, lance_le, executant}`). `--a-blanc` l'affiche (`EXECUTANT hermes|claude|aucun`).
  Codes de sortie inchangés (0, 1, 2).
- `--prendre [--passage=<id>] [--executant=hermes|claude]` : `hermes` par défaut, donc la consigne de Hermes n'a pas changé. Une tâche
  réservée à l'autre exécutant n'est ni montrée ni prise (`AUTRE EXECUTANT : …`, code 1) — tête de file, reprise du même passage,
  ou course : si `prendre` a quand même rendu la tâche de l'autre, elle est gardée sans porteur (`orpheline`) pour le prochain
  precheck, qui lancera son vrai exécutant. C'est ce qui interdit **mécaniquement** à Hermes la relecture de Claude Code.
  `--executant` illisible : `REFUS`, code 1, rien de pris. `--fini` : aucun changement.
- Répartiteur `scripts/lancer-hermes-file.mjs` : même passage (UUID), même verrou, même registre d'onglets, mêmes messages fixes
  (aucun titre ni sortie d'orca), même rejeu `--retry-launch`. Selon l'exécutant réservé :
  - hermes : `orca agent launch --agent hermes --surface terminal --prompt <consigne> --json` (inchangé) → `HERMES LANCÉ : …`
  - claude : `orca agent launch --agent claude --model claude-sonnet-5-5 --effort high --surface terminal --prompt <consigne> --json`
    → `CLAUDE CODE LANCÉ : …`. Les options `--model` et `--effort` (qui exige `--model`) existent : lues dans
    `orca agent launch --help` (aide seulement, aucun lancement réel).
  - exécutant absent ou inconnu au moment de lancer : `ÉCHEC … rien n'est lancé`, fermé par défaut (jamais « Hermes à défaut »).

## Consigne donnée à Claude Code (`consigneClaude`, `<passage>` = UUID tiré au lancement)

> Une tâche t'attend dans la file n8n de Presti ; elle est réservée à Claude Code. Commence par regles_pour du MCP cerveau
> (« exécuter une tâche de la file n8n ») et applique ce qu'il rend. Lance ensuite node scripts/hermes-tache-n8n.mjs --prendre
> --passage=<passage> --executant=claude < /dev/null : il affiche TACHE <id>, la tâche et le chemin de son brief. S'il affiche FILE
> VIDE, FILE OCCUPEE ou AUTRE EXECUTANT, arrête-toi là. Si la sortie est vide ou commence par PANNE, relance exactement la même
> commande (trois fois au plus, puis arrête-toi) : elle rend la même tâche. Lis ce brief en entier (chemin relatif à
> C:/Users/benja/Documents/presti) et exécute-le exactement, avec les outils MCP cerveau, en respectant ses interdits : ni commit,
> ni push, ni build, ni migration, aucun secret affiché ni lu (le fichier du jeton de la file ne s'ouvre pas). Rends ensuite la
> tâche avec node scripts/hermes-tache-n8n.mjs --fini <id> --resume « une ligne » < /dev/null (ou --bloque) ; si elle affiche PANNE,
> relance la même commande (trois fois au plus). Aucune donnée de prospect ni de client : si le brief en demande, rends la tâche --bloque.

## Brief `plans/011-cadrage-01-11/briefs/revoir-notes.md`

Section « Prise et fin » ajoutée (lignes de commande `--prendre --passage=<passage> --executant=claude` et `--fini <id> --resume …`).
Écart au périmètre « lignes de commande seulement », signalé : le paragraphe d'ouverture disait « ce brief n'entre jamais dans la
liste blanche `BRIEFS` », devenu faux ; je l'ai réécrit en une phrase (la tâche y est, avec l'exécutant `claude`). Rien d'autre.

## Banc `scripts/hermes-file-banc.mjs`

Faux orca : le journal des lancements note désormais `agent`, `model`, `effort`, `surface`. Aide `m.claude(passage)`.
Scénarios (constat 13, sauf S12) :
- **S12** (mis à jour) : la liste blanche suit la forme `{ brief, executant }`, quatre entrées exactes, aucune sans exécutant.
- **S13a** tâche Claude → onglet Claude : agent `claude`, modèle `claude-sonnet-5-5`, effort `high`, surface `terminal`, consigne avec
  `--executant=claude`, prise, fin et `regles_pour`, sans « Hermes » ; sortie `CLAUDE CODE LANCÉ`, aucun texte venu d'orca (titre piégé) ;
  registre d'onglets ; prise puis `--fini` de bout en bout.
- **S13b** tâche Hermes → onglet Hermes comme avant : agent `hermes`, ni modèle ni effort ni `--executant`.
- **S13c** tâche inconnue → écartée (`bloque`), aucun lancement ; derrière elle, `revoir-notes` lance Claude Code et n'est jamais bloquée.
- **S13d** Hermes (avec ou sans `--executant=hermes`, avec le même passage que Claude) ne reçoit jamais `revoir-notes` : rien pris
  (`prises = 0`, aucun fichier de reprise) ; Claude Code la reçoit, et retrouve la même après une sortie perdue ; l'inverse
  (`essai-boucle` refusée à Claude Code).
- **S13e** course (n8n rend la tâche de l'autre exécutant à la place de celle vue) : non montrée, gardée sans porteur, relancée pour Claude Code.
- **S13g** même course derrière une tâche inconnue.
- **S13f** `--executant=codex` : `REFUS`, rien pris ; `--precheck --a-blanc` dit `EXECUTANT claude` ; `lancer --essai` dit « lancerait
  Claude Code » / « lancerait Hermes » sans rien écrire.

Mutants ajoutés (M35 à M50, un par garde ; chacun fait rougir son scénario) : M35 répartiteur toujours Hermes · M36 mauvais modèle ·
M37 mauvais effort · M38 Hermes lancé comme Claude · M39 consigne sans `--executant=claude` · M40 onglet noté sans exécutant ·
M41 precheck sans exécutant (fermé par défaut) · M42 tête de file prise par Hermes · M43 reprise rendue à Hermes · M44 course montrée ·
M45 course derrière une inconnue montrée · M46 `--executant` quelconque accepté · M47 `--a-blanc` muet · M48 `revoir-notes` passée
à hermes · M49 tout à hermes par défaut · M50 tâche inconnue lance Hermes. M11 et M18 (anciens) mis à jour sur le nouvel appel
`prendre(brut ?? null, executant ?? 'hermes')`.

## Sorties (fichiers de ce dossier)

- `banc-complet.txt` : `node scripts/hermes-file-banc.mjs` → `OK : 41 scénarios verts (constats 1 à 13)`, `~/.presti : inchangé`, code 0 (54 s).
- `mutants-complets.txt` : `--mutants` → 51 mutants tués, `OK : tous les mutants sont tués`, code 0 (1 min 58 s).
- `node scripts/orchestre.mjs verifier 031-013` : voir `.orchestre/digest.md` (vert au moment de clore).

## Ce qui n'est PAS prouvé (à dire)

- Aucun `orca agent launch` réel, aucun `--prendre`/`--fini` sur la vraie file : tout le banc tourne sur un faux orca et un faux n8n.
  Seul appel réel : `lancer-hermes-file.mjs --essai` (un `peek` en lecture, « FILE VIDE ») et l'aide d'orca.
- Le comportement réel d'un Claude Code lancé par Orca (invites de permission, titre d'onglet) n'est pas éprouvé : s'il n'est pas en
  mode sans invite, il peut attendre une validation dans son onglet ; le titre de son onglet ne commence peut-être pas par « ✓ »,
  alors le nettoyage ne le fermera qu'après `VIE_ONGLET_MS` (6 h).
- `ABANDON_MS` (90 min) est le même pour Claude Code : une relecture de 10 notes plus longue serait reprise puis rendue « bloque ».
- Le workflow n8n qui dépose `revoir-notes` chaque semaine n'existe pas (n8n est hors périmètre) ; sans lui, rien ne la dépose.
- Rien écrit dans le vault (interdit ici) : la décision « Claude Code aussi par Orca » reste à y consigner par une tâche `SaaS/…`.
