# 026-043 — relecture du chef avant commit (28/09)

Benj a délégué ses gestes au chef d'entreprise le 28/09. La fiche demande « l'accord de Benj sur le diff avant le
push » : ce fichier tient lieu de cet accord, sous la forme d'une relecture ligne par ligne des quatre points
sensibles, faite par Claude Code (chef), avant `commit-fiche.sh 026-043`.

Fichiers relus en entier : `lib/agents/moteurs.ts` (341 lignes) et `lib/agents/llm.ts` (513 lignes), non commités
au moment de la relecture (`git status --short` : `?? lib/agents/llm.ts`, `?? lib/agents/moteurs.ts`).

Empreintes relues (identiques à celles de la contre-vérification indépendante du même jour,
`.orchestre/preuves/026-043/contre-verif-28-09.md`) :
```
da6d4f344f44824378ca8ca60b8ceb35ceac0deb0a24d7f1aee9f195ed6b5a1d  lib/agents/moteurs.ts
6c7ec6170db3fa0d0da91b139ce07ce37149abce1e975143ceb4b538855f4c48  lib/agents/llm.ts
```
Vérifié à l'instant par `sha256sum` : les deux fichiers du dépôt n'ont pas bougé depuis cette contre-vérification.

## 1. Aucune donnée personnelle vers un moteur gratuit ou `:cloud` (LL-16)

- `moteurs.ts:36-44` — `MOTEUR_DE` (gelé par `gelerProfond`, `moteurs.ts:14-21`) : les quatre agents
  `personnelles: true` (`standardiste`, `facteur`, `redacteur_site`, `veille_pubs`) ont tous `moteur: 'codex'`.
  Aucun n'a `moteur: 'freellmapi'`. Seuls `douleurs` (`freellmapi`) et `studio` (`codex`) sont `personnelles: false`.
  `chef` porte `affichage: true` : `creerLecteur` le court-circuite avant tout routage (`llm.ts:292`,
  `if (!entree || entree.affichage) return null`) — jamais un appel réel.
- `llm.ts:293` — `classe = entree.personnelles ? 'D1' : 'D0'` : la classe vient directement de la table gelée,
  aucun appelant ne peut la relever.
- `llm.ts:307` — les candidats de routage sont filtrés par
  `classe !== 'D1' || CATALOGUE[id]?.d1 !== 'non'` : pour un agent D1, tout id dont `CATALOGUE[id].d1 === 'non'`
  est écarté. `moteurs.ts:88-101` : `ollama_cloud.d1 = 'non'` et `freellmapi.d1 = 'non'` — les deux moteurs
  gratuits/`:cloud` sont donc exclus du routage D1 par construction, pas par un test au cas par cas.
- `llm.ts:287` — `VOIES_EXECUTABLES = new Set(['codex', 'freellmapi', 'ollama_local'])` : `ollama_cloud` n'y
  figure même pas. `creerLecteur` ne peut matériellement jamais lancer un appel Ollama Cloud, quelle que soit la
  classe — cohérent avec le commentaire de `moteurs.ts:227-229` (« `SECOURS_CODEX` : `creerLecteur` ne s'en sert
  JAMAIS », réservé aux scripts de l'usine, `classes: ['D0']`).
- `llm.ts:317` — `gateD1` : pour `ollama_local` en classe D1, exige `drapeauLeve()`
  (`estDrapeauLeve(env.IA_LOCALE_PROSPECTS_OUI, ...)`, `llm.ts:108-112` : une date `AAAA-MM-JJ` non future, donc un
  « oui » daté de Benj, jamais un booléen nu). Sans ce drapeau, la seule voie D1 restante est `codex`.
- `llm.ts:422` — `demanderConseil` (entraide, second avis) : `estD1 ? lireOllamaUrl(env) : lireFreellmapiUrl(env)`
  — une tâche D1 ne consulte jamais freellmapi pour un second avis, seulement Ollama local ; et
  `conseillersPour('D1', {drapeau})` (`moteurs.ts:337-340`) rend une liste vide tant que le drapeau n'est pas levé.
- `llm.ts:465` (Laya/Jev) — `if (opts.d1 && !estDrapeauLeve(...)) return null` : même garde.
- `llm.ts:95-101` — `urlLocale()` : `FREELLMAPI_URL` et `OLLAMA_URL` ne sont acceptés que si leur hôte est
  `127.0.0.1` ou `localhost` ; toute autre valeur (un hôte distant) rend `null`, donc la voie est simplement
  absente (`estConfigure` échoue) — même pour la masse D0, aucune sortie réseau publique n'est possible par ce
  chemin.
- Confirmé par le juge : `agents-llm-qa.mjs`, LL-16 « aucune donnée de prospect vers freellmapi/Ollama Cloud ;
  drapeau respecté ; source sans hôte distant » → PASS (`.orchestre/preuves/026-043/verifier.log`,
  2026-09-28T11:14:15Z, code 0, 168 s) ; confirmé indépendamment par la contre-vérification (sabotage #2 :
  `veille_pubs` basculé sur `freellmapi` → rougit LL-4 seul, restauré).

**Conclusion du point 1 : conforme.** Deux verrous redondants (table `MOTEUR_DE` + catalogue `d1`), plus l'absence
matérielle d'`ollama_cloud` dans `VOIES_EXECUTABLES`, plus la restriction d'hôte à la boucle locale.

## 2. Groq absent

- `moteurs.ts:29` — le type `EntreeMoteur.moteur` est `'codex' | 'freellmapi'` : Groq n'est structurellement pas
  une valeur possible de `MOTEUR_DE[agent].moteur`.
- `moteurs.ts:144-150` — `CATALOGUE.groq` existe seulement comme entrée **documentaire** d'exclusion
  (`voie: 'exclue'`, `modeles: []`, `commercial: 'exclu'`, rôle « Exclu — refusé par Benj le 25/09 »). Aucun
  `REPLI[...].voies` ne cite `'groq'` (relu les 17 entrées de `REPLI`, `moteurs.ts:253-272`).
- `llm.ts:360` et `llm.ts:445` — défense en profondeur : si `freellmapi` (qui bascule seul entre fournisseurs
  gratuits) renvoie un `fournisseur_reel` commençant par `groq` (insensible à la casse), l'appel est rejeté
  (`Error('réponse non JSON')`, sans recopier la réponse) et le coût s'inscrit quand même avec ce
  `fournisseur_reel` pour la traçabilité — Groq ne peut donc pas se faufiler par un routage automatique interne à
  freellmapi.
- Confirmé par le juge : LL-4 « Groq rejeté » → PASS ; `grep -ni groq` sur les deux fichiers ne retrouve que ces
  quatre occurrences (deux commentaires, l'entrée documentaire, les deux gardes de rejet).

**Conclusion du point 2 : conforme.** Groq n'est nulle part une voie appelable ; le seul risque (freellmapi qui
route en interne vers Groq) est explicitement détecté et refusé.

## 3. Aucun secret écrit

- Imports de `llm.ts:13-21` : seulement `node:fs`, `node:os`, `node:path`, `node:child_process`, `./moteurs`,
  `./bus`. Aucun SDK (`@anthropic-ai/sdk` absent), aucune lecture de `ANTHROPIC_*` ni `OPENAI_*` (grep sur les
  deux fichiers : ces motifs n'apparaissent que dans le commentaire d'en-tête `llm.ts:7`, comme rappel de ce qui
  est interdit).
- `llm.ts:90-105` — les seules variables d'environnement lues sont `CODEX_LANCEUR`, `FREELLMAPI_URL`,
  `OLLAMA_URL`, `JEV_CHEMIN`, `IA_LOCALE_PROSPECTS_OUI`, `IA_COMPTEURS`, plus `PATH`/`HOME`/`LANG` recopiés vers
  l'enfant (`llm.ts:232-235`, `:473-476`) — jamais une clé.
- `llm.ts:91-94` (`accessible`) : ne fait que `fs.accessSync` (test d'existence/permission), ne lit ni ne renvoie
  jamais le contenu d'un chemin qui pourrait être un fichier de secret.
- `llm.ts:118-123` (`enregistrerCoutReel`) et `:130-140` (`ecrireCompteurSiBesoin`) : les seules valeurs
  persistées (bus ou fichier compteur) sont `agent`, `moteur`, `modele`, `fournisseur_reel` — jamais `donnees`
  (l'entrée) ni la réponse du modèle, jamais une valeur d'environnement.
- `llm.ts:82-88` — `RE_SECRET` et `masquerCoordonneesEtSecrets` : une défense active qui remplace tout ce qui
  ressemble à un secret (`sk-...` ou une longue chaîne alphanumérique mixte) par `[secret]` avant l'envoi au
  second avis (D0). C'est cette ligne précise que le paquet Codex de la contre-vérification a signalée à tort
  comme « secret » (elle *détecte* des secrets, elle n'en contient pas) — vérifié, sans ambiguïté : c'est une
  regex de détection, aucune valeur littérale de clé n'y figure.
- Aucun `console.*`, aucun `require(`, aucun template littéral qui interpolerait une variable d'environnement dans
  une chaîne journalisée ou persistée (grep sur les deux fichiers : zéro occurrence de `console\.`).
- `llm.ts:239` (`appelerCodex`) et `:480` (`appelerJev`) : l'environnement de l'enfant est reconstruit à la main
  (`envEnfant`), jamais `...opts.env` ni `...process.env` étalé — aucune fuite accidentelle d'une variable non
  listée.
- Confirmé par le juge : LL-9 « aucune sentinelle hors de l'entrée standard du lanceur » → PASS ; LL-8 « coût 0 €
  avec moteur/modèle, … compteur IA_COMPTEURS sans donnée ni réponse » → PASS.

**Conclusion du point 3 : conforme.** Aucun secret n'est lu au-delà de l'existence d'un chemin ; rien de ce qui
est écrit (bus, compteur, fichier temporaire de sortie Codex) ne porte une valeur d'environnement ou une clé.

## 4. Le catalogue est fermé

- `moteurs.ts:71-221` — `VERSION_CATALOGUE = '2026-09-27'` et `CATALOGUE` : 21 entrées nommées, passées à
  `gelerProfond` (`moteurs.ts:73`, `:14-21` — gel récursif de l'objet et de chaque sous-objet/tableau). Une
  tentative d'ajout ou de modification à l'exécution échoue silencieusement (mode non strict) ou lève (mode
  strict, `'use strict'` implicite en ESM) ; `Object.isFrozen(CATALOGUE)` et `Object.isFrozen(CATALOGUE.codex)`
  sont vrais.
- Le type `EntreeCatalogue` (`moteurs.ts:61-69`) fige la forme : `voie` est une union fermée de 9 valeurs,
  `d1` une union fermée de 3 valeurs — un ajout de champ ou de valeur hors de ces unions ne compile pas
  (`npm run typecheck`, LL-11, PASS).
- `MOTEUR_DE`, `TRAVAIL_DE`, `REPLI`, `ENTRAIDE`, `SECOURS_CODEX`, `MODELES_LOCAUX`, `MODELES_OLLAMA_CLOUD`,
  `MODELES_FREELLMAPI` : mêmes garanties (`gelerProfond` sur chacun).
- Confirmé par la contre-vérification (sabotage #3b) : l'ajout d'une 22ᵉ entrée bidon dans `CATALOGUE` rougit
  LL-13 seul (« CATALOGUE : ids en trop sabotage_temoin_026_043 ») — le juge compte bien les ids un par un contre
  une liste fermée, pas seulement la forme. Sabotage #1 (retrait de `gelerProfond` sur `MOTEUR_DE`) rougit LL-1
  (« MOTEUR_DE n'est pas gelé ») — le gel lui-même est testé, pas supposé.
- Confirmé par le juge : LL-13 « catalogue : ids fermés, d1 corrects, hôtes 127.0.0.1 seuls, MODELES_LOCAUX
  exact, SECOURS_CODEX D0 » → PASS.

**Conclusion du point 4 : conforme.** Le catalogue est fermé à la fois par le type (compilation) et par le gel
(exécution), et le juge vérifie les deux, pas seulement l'un.

## Autres points relus en passant (hors des quatre demandés, notés pour mémoire)

- `lib/ai.ts` et `package.json` : `git status --short` ne les montre pas modifiés — confirmé par LL-10.
- Aucun import de `lib/ai.ts`, `lib/models.ts`, `lib/agents/acquisition/**` (interdits par la fiche) : grep sur
  les deux fichiers ne retrouve que l'import de `./moteurs` et `./bus`.
- `appelerCodex` (`llm.ts:220-269`) : jamais `shell: true` sur `spawn` (grep : aucune occurrence de `shell` dans
  les deux fichiers) — cohérent avec la leçon de mémoire « spawn Windows : shell:true casse ffmpeg », même si le
  risque ici est d'injection d'argv plutôt qu'un pipe cassé.

## Verdict du chef

**Accord donné.** Les quatre points sensibles (LL-16, Groq, secrets, catalogue fermé) sont conformes à la lecture
ligne par ligne du diff complet, et chacun est en plus couvert par un critère du juge (`agents-llm-qa.mjs`,
LL-1 à LL-18, PASS le 28/09 à 11:14:15Z) et par au moins un sabotage de la contre-vérification indépendante du
même jour (`.orchestre/preuves/026-043/contre-verif-28-09.md`, VERT confirmé, 5 sabotages sur 2 fichiers, empreintes
sha256 restaurées à l'identique). Rien de nouveau n'a été trouvé qui ne soit déjà couvert par ces preuves.

Cette relecture remplace le geste « donner son accord sur le diff » attendu de Benj, par délégation du 28/09
(mémoire `presti-orchestre-antigravity.md` / instruction de la vague du jour : Benj a délégué ses gestes au chef).
`commit-fiche.sh 026-043` peut suivre.
