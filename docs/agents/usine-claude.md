# Claude Code (Sonnet) exécutant de l'usine

Mis en place le 05/10/2026, sur ordre de Benj : le quota ChatGPT (Codex) est épuisé jusqu'au 9/10 à 21 h 15. Claude Code 2.1.289 est
installé sur l'usine (`/home/usine/.local/bin/claude`) et connecté au compte de Benj (abonnement Max). Il exécute une fiche à la place de
Codex : même arbre jetable, même prompt, même vérificateur, même rapatriement, même verdict du PC.

## Lancer

```
node scripts/usine.mjs lancer <id> --fournisseur=claude [--minutes=40] [--boucle=3]
node scripts/usine.mjs recuperer <id> --attendre        # puis : nettoyer <id>
node scripts/usine.mjs lancer <id> --fournisseur=claude --a-sec   # l'admission seule
```

L'agent s'appelle `usine-claude-N` (le compteur est commun avec `usine-codex-N`), le modèle noté est `claude:sonnet`, la voie `claude`.
`node scripts/usine.mjs etat` montre une ligne `claude "loggedIn":true,"subscriptionType":"max"`. `lancer` refuse (code 3) si
`claude auth status` ne dit pas `"loggedIn": true`.

Moteur (à relancer par Benj, pas par cet agent) : `node ../presti-ops/usine/moteur.mjs --libre=claude --retour-chatgpt=2026-10-09T21:15:00+02:00` :
toute la production « Codex » part alors sur Claude (la « voie libre » devient Claude), et le moteur redevient normal tout seul à la date.
Les fiches de prospects ne partent PAS chez Claude par le moteur : la détection (`lancer --a-sec`) se fait toujours avec une IA gratuite
(`SONDE_PROSPECTS`), elles attendent comme avant. Les envoyer aussi à Claude sur l'usine est un choix de Benj (une ligne dans `lancerUsine`).

## Ce qui est lancé (`claudeExec`, scripts/usine.mjs)

`claude -p <instruction> --model sonnet --permission-mode acceptEdits --permission-prompts none --safe-mode --output-format stream-json --verbose
--allowedTools <liste> --disallowedTools <liste>`, `cwd` = l'arbre, `DISABLE_AUTOUPDATER=1`, sans `ANTHROPIC_API_KEY` ni `FL_KEY` : l'abonnement
seul, jamais de facturation au jeton. Jamais `--dangerously-skip-permissions`.

Garde-fous, vérifiés sur l'usine le 05/10 :

- Aucun `Edit`/`Write`/`Read` dans `--allowedTools` : un `Write` « nu » écrivait n'importe où (`/home/usine/hors2.txt`). Avec `acceptEdits` seul, les
  éditions ne passent que dans le dossier courant ; hors de lui, c'est refusé.
- `--permission-prompts none` : tout ce qui demanderait une approbation est refusé d'office (personne ne répondrait).
- `--safe-mode` : ni `CLAUDE.md` (il décrit le rôle de Claude Code sur le PC), ni hooks du dépôt (`read-garde`, `contexte-fond`), ni plugins, skills, MCP.
- Bash par liste explicite (`node`, `npx tsc|tsx|playwright`, git en lecture seule + `git mv`, utilitaires de fichiers, `bash`, `timeout`).
  `--disallowedTools` l'emporte : `git push|commit|reset|clean|checkout|restore|stash|rebase|merge`, lecture de `~/.claude`, `~/.codex`, `~/.config/presti`, `~/.ssh`.
- Le prompt (`SUPPLEMENT_USINE`) dit à Claude qu'aucune autorisation ne sera donnée et de ne pas insister.

**Limite assumée** : `node` et `bash` sont autorisés (les juges en ont besoin), donc ce n'est pas un bac à sable comme celui de Codex (Landlock) :
c'est un garde-fou contre l'accident, pas contre une consigne hostile. L'usine ne porte aucun secret de l'application et `git push` y est refusé.

## Relais, prospects, quota

- `claude` est `horsRelais` : `basculer()` ne mène jamais à lui, et rien ne le suit. Quota épuisé → code 3 `QUOTA`, la fiche attend (jamais d'IA gratuite ni de modèle :cloud derrière).
- Claude est un abonnement payant comme ChatGPT : la règle « donnée de prospect jamais vers une IA gratuite ou :cloud » ne l'interdit pas
  (`payant(fr)`) ; ol/fl/fm restent refusés net. L'entraide après un tour rouge reste privée (Qwen3 local) pour une fiche de prospects.
- Quota : `claudeEpuise` exige un code ≠ 0 ET (un `rate_limit_event` « rejected » OU un résultat en erreur dont le texte dit la limite : « hit your limit »,
  « limit reached », « usage limit », « rate limit », « credit balance », « resets … »). Un message final qui cite un quota avec code 0, un arrêt au délai,
  une panne ordinaire (« API Error: 500 ») ne sont pas un quota. Jamais l'« inerte » de Codex.
- Connexion perdue (« Not logged in · Please run /login », « Invalid API key », jeton expiré ; texte vérifié sur l'usine avec un dossier de configuration vide)
  → code 6 `AUTH` « claude n'est pas connecté sur l'usine ». La reconnexion (`claude auth login`) est un geste de Benj.
- Une vraie question de Claude reste une `QUESTION` (code 7) : elle n'est jamais écartée comme celles des modèles libres.
- Le journal `codex.log` est lisible pendant le tour (flux `stream-json` traduit : `exec` + commande, `outil`, refus d'autorisation, quota 5 h / 7 jours, résultat).
  Le coût affiché est au tarif API, à titre d'indication : l'abonnement ne facture rien.
- **Le quota de Claude est celui de Benj** (même compte que ses sessions) : le 05/10, la fenêtre de 7 jours était à 60 % (reprise le 11/10). Une production
  lourde sur Claude peut le vider et bloquer ses propres sessions ; surveiller la ligne `quota Claude : …` de `codex.log` et réduire `--max-libre` du moteur au besoin.

## Essai réel du 05/10 (fiche 026-999, jetable)

`lancer 026-999 --fournisseur=claude` : 15 s pour lancer ; Claude a lu le prompt, pris la fiche (`prochaine --agent=usine-claude-1558`), tenté une commande
composée refusée par les permissions (« Permission for this tool use was denied… »), s'est adapté (Write + Bash simple), lancé le vérificateur, répondu
`026-999 : PRÊT`. Tourneur : `PASS (code 0)` en 15 s, 7 tours, verdict de l'usine « 026-999 : PASS · 0s ». `recuperer` : patch d'un fichier appliqué,
fiche en `fait/`, verdict du PC « ✓ 026-999 : PASS · 14s · machine : usine ». Journal : `.orchestre/travail/usine/026-999/codex.log`.

Deux défauts trouvés et corrigés pendant l'essai :

- `recuperer` refusait le patch d'une fiche NEUVE (« decisions-avant.md: already exists in working directory ») : le cliché de la prise sur le PC (`decisions-avant.md`)
  comptait comme un fichier rapatrié. Il est maintenant « interne » comme `avant.txt` et `verifier.log`. Ce défaut touchait toute première exécution d'une fiche, quel que soit l'exécutant.
- Le banc `usine-relais-qa.mjs` était déjà rouge sur 4 cas avant ce travail (attentes périmées depuis l'ajout de `fm` et du modèle `gemini-3-flash-preview` du fournisseur `fl`) : remis à jour.

## Banc d'essai

`node scripts/usine-relais-qa.mjs --rapide --mutants` : 63 cas (dont 16 pour Claude, avec la doublure `scripts/fixtures/usine-relais/faux-claude.mjs` qui émet le flux
`stream-json` réel) et 50 mutants sur copie (dont 18 pour Claude : prospects refusés par erreur, relais mené vers Claude, `--dangerously-skip-permissions`,
`Edit`/`Write` nus, `git push` non interdit, `--safe-mode` retiré, clé d'API non retirée, connexion perdue non vue, quota ignoré, code de sortie ignoré, etc.).
Chaque mutant doit faire rougir le banc.

## Reste

- Le premier vrai quota Claude épuisé n'a pas été vu : le texte reconnu (`CLAUDE_A_BOUT`) est celui de la documentation et du flux `rate_limit_event`
  (le `rejected` fait foi même si le texte change). À relire dans `codex.log` au premier cas réel.
- Un tour qui pose une question reste en code 7 : le moteur la range dans `a-decider/`, comme pour Codex.
- Une fiche rouge par quota Claude finit dans `e.rouges` du moteur (comme « tous les fournisseurs épuisés » avant) : à relancer à la main une fois le quota revenu.
