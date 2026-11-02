# 031-012 — audit adverse : file n8n de Hermes, répartiteur (état 031-013), .hermes.md, AGENTS.md, garde de Hermes, vérificateur de la revue

Auditeur : Claude Code (Opus 5.5), session distincte de celles qui ont écrit le code. Le 02/11/2026, de 10 h à 11 h 15 (heure de Paris).
Tout a été lu ou rejoué hors ligne, sauf deux gestes demandés par les tâches : `verifier 031-006`, qui a joué `--test` une fois sur
la vraie file, et la lecture de Slack #presti-auto. Rien n'a été modifié hors de `.orchestre/preuves/031-012/`.
Aucun `--prendre`, aucun `--fini` ni aucun `orca agent launch` sur le vrai système. Seule commande Orca jouée : `--help`.
`~/.presti` a été lu sans jamais ouvrir `file-n8n.jeton`.

Réseau neuronal d'abord : `regles_pour` (audit de la file) n'a rien rendu (`[]`). `chercher` (file n8n, jeton, liste blanche,
briefs, répartiteur) a rendu `memoire-presti/chantiers-0111-etat-et-branchements.md`, `briefs/revoir-notes.md`,
`briefs/essai-boucle.md`, `briefs/sante-reseau.md`, `vault/Produit/Session-2026-11-01-Reseau-neuronal-phase-1-4.md` (restes et
risques) et le fil de session du 02/11 à 01 h 07. J'ai aussi relu `.claude/rules/architecture-outils.md` et `securite.md`, ainsi
que le prompt de Benj (`lancement-0-queue-operation.md:30-40` : n8n porte toutes les automatisations ; `:99-111` : phase 1.4 et
revue de sécurité). Pendant l'audit, une autre session a modifié `architecture-outils.md` (l.18-30 : conversations Orca visibles,
règle n8n-first), `CLAUDE.md` et `.hermes.md`. L'audit porte sur leur état à 11 h.

## Preuves déposées ici

| Fichier | Contenu |
|---|---|
| `banc-nouveau.txt` | `node scripts/hermes-file-banc.mjs` : `OK : 41 scénarios verts (constats 1 à 13)`, `~/.presti : inchangé`, code 0, 1 min 02 |
| `contre-banc.txt` | mon banc hors ligne (vrai code, faux n8n local, dossier d'état temporaire, horloge décalée) : 4 défauts confirmés |
| `garde-config-hermes.txt` | `controlerConfigHermes` éprouvé hors ligne sur six configurations fabriquées |
| `verifier-031-006.txt` | `✓ 031-006 : PASS` (`--test` : `OK : ajouter → peek → prendre → faite, la file est revenue à son état`) |
| `verifier.log` | écrit par `node scripts/orchestre.mjs verifier 031-012` |

Le contre-banc se trouve dans le dossier temporaire de ma session (`…/13448004-…/scratchpad/audit/contre-banc.mjs`). Ce n'est pas
un livrable. Sa sortie complète est dans `contre-banc.txt`.

## 1. Client de la file, répartiteur, banc, contre les 12 constats d'origine

Le banc a tourné sur le code actuel (après 031-013) : **41 scénarios verts**, constats 1 à 13, `~/.presti` inchangé. J'ai lu le
client (`scripts/hermes-tache-n8n.mjs`, 888 lignes) et le répartiteur (`scripts/lancer-hermes-file.mjs`, 135 lignes) en entier.

| Constat d'origine (audit B) | État | Où je l'ai vu |
|---|---|---|
| 1 deux Hermes sur la même tâche | **tient** pour un appel avec `--passage`, **rouvert** sans lui (défaut D) | `hermes-tache-n8n.mjs:620-631`, contre-banc D |
| 2 abandon sans fin à 90 min | tient : reprises comptées, « bloque » après 2, fin perdue rejouée | `:522-533`, `:389-399`, S2 à S2e |
| 3 prise perdue, fichier unique, `--test` | tient : prise « incertaine » notée avant l'appel, verrou `wx`, `--test` seulement si la file est vide | `:651`, `:295-314`, `:775-786` |
| 4 « faite » sans contrôle | tient côté client. Côté n8n, le 409 est en service (`031-007/verifier.log:4`). `--forcer` reste déclaratif (défaut B) | `:738`, contre-banc B |
| 5 course dans l'écart | tient : une tâche permise n'est jamais bloquée | `:539-546`, S5a, S5b |
| 6 pannes muettes | tient pour la file (codes 0, 1, 2, `alertes-file.log`). Les échecs de lancement ne sont pas journalisés (défaut I) | `:596-599`, `lancer-hermes-file.mjs:98`, `:110` |
| 7 fermeture sur un titre | tient : registre `onglets-hermes.json`, nettoyage même file vide | `:461-503` |
| 8 jeton lisible par le compte | limite documentée (`:140-144`) ; 409 en service | — |
| 9 jeton qui fuit | tient : format vérifié, `taire`, `redirect: 'manual'`, base limitée au tunnel, fichier limité à `~/.presti` | `:145-180`, S9a à S9c |
| 10 balisage Slack | tient : garde sur le texte entier, puis coupe, échappement de `& < >` et `@channel` | `:692-725` |
| 11 répartiteur bavard | tient côté sortie (messages fixes). La session du répartiteur reste en bypassPermissions (reste de B-rendu) | `lancer-hermes-file.mjs:63-67` |
| 12 non versionné | **non traité** : les neuf fichiers sont `??` dans `git status` (sortie plus bas). Le banc et les deux e2e sont bien dans `SUITES` (`tout-verifier.mjs:176`, `:180`, `:185`) | — |

Liste blanche : la tâche annonçait trois entrées, il y en a **quatre** (`hermes-tache-n8n.mjs:72-80`). `sante-reseau` est présente
(hermes) et `revoir-notes` (claude) a été ajoutée par 031-013. S12 vérifie bien les quatre.

`git status --porcelain` sur le périmètre : ` M AGENTS.md`, puis `??` sur `.hermes.md`, `plans/011-cadrage-01-11/briefs/`,
`scripts/config-hermes-e2e.mjs`, `hermes-file-banc.mjs`, `hermes-tache-n8n.mjs`, `hooks/config-hermes.mjs`,
`lancer-hermes-file.mjs`, `verifier-revue-e2e.mjs` et `verifier-revue-reseau-neuronal.mjs`.

## 2. `.hermes.md`, `AGENTS.md`, bloc régénéré, orchestre

- **`.hermes.md` fidèle aux 5 rules, avec deux écarts.** Les règles 1 à 5 (`.hermes.md:35-54`) reprennent bien
  `architecture-outils`, `autonomie-abonnements`, `email-brevo`, `migration-production` et `securite`, avec leurs chiffres
  (300/jour, 2-3 validations, coller PUIS lever). Les interdits (`:68-78`) couvrent git, migration, build, secrets et
  freellmapi. Premier écart : il ne reprend pas l'interdit des suites e2e concurrentes contre la production (`securite.md`,
  « Interdits des sous-agents »). Second écart, plus grave : la boucle de tâche (`.hermes.md:57`) enseigne
  `--prendre < /dev/null` **sans `--passage`**. Elle n'a pas suivi la refonte du 02/11 (défaut D). Aucun secret, aucune
  coordonnée.
- **`AGENTS.md`** (`:1-15`) : seuls Claude Code et Hermes y figurent. Antigravity et Codex ne sont cités que comme historiques
  (« aucune tâche nouvelle ne leur va »). Le bloc régénéré (`AGENTS.md:30`, `CLAUDE.md:81`) dit « exécutants admis : hermes,
  claude-code ; historiques, plus distribués : antigravity, codex ». **Aucun exécutant interdit n'est présenté comme permis.**
  Le point 7 du bloc (`AGENTS.md:36`, `CLAUDE.md:87`) donne lui aussi `--prendre` sans passage (défaut D, faible ici).
- **Orchestre** : `node scripts/orchestre.mjs verifier 031-006` → `✓ 031-006 : PASS · 1s` ; le journal dit `OK : ajouter → peek
  → prendre → faite, la file est revenue à son état` (`.orchestre/preuves/031-006/verifier.log`, 09:12:33Z). Une ligne d'essai
  a été postée dans #presti-auto, comme c'était voulu.

## 3. Briefs, vérificateur de la revue, garde de Hermes

- **Section « Ton rôle »** : présente dans `essai-boucle.md`, `revue-hebdo-reseau-neuronal.md` et `sante-reseau.md`,
  **absente de `revoir-notes.md`** (compte : 0, défaut H). Toutes les lignes de prise des briefs portent `--passage`.
  `revoir-notes.md:13` porte aussi `--executant=claude`.
- **Vérificateur de la revue** (`scripts/verifier-revue-reseau-neuronal.mjs`) : six gestes tirés du brief, nombre de cartes
  compté sur le fichier, 3 champs, sources résolues sur le disque, garde du cerveau importée (introuvable = refus). Son banc
  `verifier-revue-e2e.mjs` est joué par le verifier de cette tâche. Limites : c'est **Hermes lui-même** qui le lance
  (`revue-hebdo-reseau-neuronal.md:59-63`), et rien n'oblige à le faire passer avant `--fini … fait` (défaut F). Il contrôle la
  forme et l'existence des sources, pas la vérité d'une réponse de carte face à sa source.
- **Garde de config** (`scripts/hooks/config-hermes.mjs`) : elle lit vraiment le YAML, refuse les replis vers freellmapi, impose
  le plafond de durée, une session unique, le profil petites-taches sans MCP et les deux correctifs locaux. Deux trous, prouvés
  hors ligne (défaut G) : `call_agent`, `mutate_agent` et `revert_agent` de n8n-oracle passent pour de la lecture
  (`OUTIL_ECRITURE`, l.92) ; `approvals.deny` n'est contrôlé que pour `git push` (l.120), pas pour commit, vercel, migrations,
  secrets ni build, que `architecture-outils.md` liste pourtant.

## 4. Essai réel n°17 (02/11, vers 9 h)

- `~/.presti/onglets-hermes.json` = `[]` : l'onglet de l'essai a été fermé et oublié.
- `~/.presti/file-n8n-etat.json` = `{"verifie_le":"2026-11-02T09:00:57.677Z","etat":"vide","detail":"file vide"}`.
- Ni `tache-en-cours.json` ni `alertes-file.log` : aucun abandon, aucune fin rejouée, aucune panne.
- Slack #presti-auto : « Hermes — essai-boucle : fait — essai de la boucle : Réseau : 912 notes · 181 rattachées à une carte ·
  0 îlots · 30 isolées · 74 à revoir », à 09:08:56 CET.
- **Conclusion : l'essai s'est terminé « fait » proprement.** Réserve : l'état local ne garde aucune trace d'une tâche réussie,
  et la ligne Slack ne porte pas l'id. Le n°17 lui-même n'est attesté que par `031-007/resume.md:31`. Je n'ai pas lu la table
  n8n (n8n est interdit à cette tâche).

## 5. Défauts trouvés (du plus grave au plus faible)

### C — ÉLEVÉE, confirmé : un agent lancé qui ne prend jamais sa tâche est relancé chaque heure, jusqu'à six à la fois, et bloque toute la file
- Scénario : `revoir-notes` est en tête de file. Claude Code, lancé par Orca, ne lance jamais `--prendre`. Les causes probables :
  limite d'usage atteinte (c'est arrivé les 30 et 31/10), session expirée, invite de permission sans réponse, MCP absent, plantage
  au démarrage. Il en va de même pour Hermes. Le precheck suivant voit la tâche toujours `a_faire`. La garde ne dure que 15 min
  (`LANCEMENT_RECENT_MS`, `:57`, `:424-427`) et un onglet n'est fermé qu'au bout de 6 h (`VIE_ONGLET_MS`, `:58`, `:476`) : un
  nouvel agent est donc lancé chaque heure. Sur ce PC de 8 Go, qui a planté cette nuit sous neuf agents
  (mémoire `pc-plante-surcharge-agents-0211`), cela fait jusqu'à six Claude Code ou Hermes ouverts.
- La tâche bloque en plus tout ce qui la suit. Le precheck ne regarde que la tête (`:536-538`) et Hermes reçoit
  `AUTRE EXECUTANT` (`:642`). La `sante-reseau` quotidienne et la revue n'avancent donc plus.
- L'abandon côté n8n (031-007) ne vise que les lignes `en_cours` : une ligne jamais prise n'est jamais abandonnée. Rien n'est
  écrit dans `alertes-file.log` (défaut I).
- Preuve, `contre-banc.txt` : « C h+0 : precheck code 0 ; onglets notés et non fermés : 1 » … « C h+5 : … 6 » … « 7 lancements en
  7 heures pour une seule tâche jamais prise ». Sur le vrai système, le nettoyage fermerait l'onglet de h+0 à h+6, d'où six à la
  fois au plus.
- Correctif proposé : compter les lancements par id de tâche (registre). Après 2 lancements sans prise : plus aucune relance,
  état « panne » et ligne d'alerte, puis passer à la tâche suivante d'un autre exécutant, ou rendre la tête `bloque`.

### D — MOYENNE, confirmé : `--prendre` sans `--passage` rend à n'importe qui la tâche portée par un autre passage (le constat 1 est rouvert)
- `hermes-tache-n8n.mjs:625` ne répond `FILE OCCUPEE` qu'à un appel AVEC passage. Sans passage, `:629-631` rend la tâche en
  reprise. Or `.hermes.md:57` et le point 7 du bloc Méthode (`AGENTS.md:36`, `CLAUDE.md:87`) enseignent justement cette forme.
  Un Hermes ouvert à la main, ou qui suit `.hermes.md`, refait donc la tâche d'un Hermes du répartiteur.
- Preuve, `contre-banc.txt` : « D1 Hermes du répartiteur : « TACHE 1 » ; D2 autre passage : « FILE OCCUPEE … » ; D3 sans passage
  (forme de .hermes.md:57), 10 min plus tard : « TACHE 1 » code 0 ».
- Correctif proposé : sans passage et avec une tâche portée par un passage connu, répondre `FILE OCCUPEE`. Corriger aussi
  `.hermes.md:57` et `methodeSupplement` d'`orchestre.json`.

### A — MOYENNE, confirmé : le choix de l'exécutant est déclaratif ; « interdit mécaniquement à Hermes » est faux
- `--executant=claude` est un simple argument, recoupé ni avec la réservation du passage (`onglets-hermes.json`, executant noté
  à `:591`) ni avec quoi que ce soit d'autre (`:670-673`, `:619`, `:642`). Le commentaire `:610-612` et le brief `revoir-notes.md:3-5`
  affirment pourtant que la barrière est mécanique.
- Preuve, `contre-banc.txt` : « A1 Hermes, consigne normale : « AUTRE EXECUTANT … » » ; « A2 le même Hermes ajoute
  --executant=claude : « TACHE 1 » code 0 » ; « A3 sans passage du tout, --executant=claude : « TACHE 1 » » ; « A4 --fini 1 :
  « TACHE 1 RENDUE (Slack : envoyé) » ». La relecture réservée à Claude Code est faite et close par un tiers.
- Correctif proposé : tirer l'exécutant de la réservation du passage, et refuser une prise dont le passage n'est pas réservé pour
  cet exécutant. Sur un même compte, cela reste une serrure de bonne foi, ce qu'il faut écrire dans le commentaire au lieu de
  « mécaniquement ».

### E — MOYENNE, plausible (non mesuré) : Claude Code part seul, déclenché par n8n, sans garde mécanique contre push, commit, déploiement ou migration
- Le répartiteur lance `orca agent launch --agent claude …` (`lancer-hermes-file.mjs:36`, `:100`). `orca agent launch --help` ne
  propose aucune option de permission : le mode vient d'Orca, réglé en « accès complet qui lance --yolo »
  (`architecture-outils.md`, « Restent à Benj »). B-rendu note aussi que la session Claude du répartiteur reste en
  bypassPermissions et qu'Orca n'accepte que le modèle, l'effort et `--add-dir`.
- Côté Claude Code, `.claude/settings.json` ne refuse que des gestes git destructifs et `rm -rf`. **Il ne refuse ni `git commit`,
  ni `git push` (un push sur `main` déploie la production), ni `vercel`, ni `appliquer-migration.mjs`.** `git-garde.mjs` ne vise
  lui aussi que la destruction. Hermes, lui, a `approvals.deny` ; Claude Code n'a que la consigne écrite
  (`lancer-hermes-file.mjs:58`) et `CLAUDE.md`.
- La session lit en outre des notes écrites par des agents (vault, mémoires), donc du texte non sûr, et elle écrit dans le vault.
- Le dilemme est entier. Si Orca ne passe pas en bypass, une invite de permission sans réponse déclenche le défaut C. S'il passe
  en bypass, rien de mécanique n'arrête un push.
- Correctif proposé : avant de lever la tâche `revoir-notes`, poser dans `.claude/settings.json` les refus `Bash(git push:*)`,
  `Bash(git commit:*)`, `Bash(vercel:*)` et `Bash(node scripts/appliquer-migration.mjs:*)`, ou le profil d'Orca « own » pour
  Claude Code.

### F — MOYENNE, lu dans le code : le vérificateur de la revue n'est pas une barrière, c'est Hermes qui choisit de le lancer
- La leçon de 031-004 (Hermes a truqué une tâche) a produit `verifier-revue-reseau-neuronal.mjs`. Mais c'est le brief qui demande
  à Hermes de le lancer (`revue-hebdo-reseau-neuronal.md:59-63`). `commandeFini` (`hermes-tache-n8n.mjs:726-761`) ne connaît
  aucune vérification par tâche. Hermes peut sauter l'étape et rendre « fait » ; personne ne le verrait.
- Correctif proposé : `--fini <id>` sans `--bloque` sur la tâche `revue-reseau-neuronal` lance lui-même le vérificateur et
  refuse « fait » s'il rend autre chose que 0.

### B — FAIBLE, confirmé : `--forcer` (« pour Claude Code seulement ») est ouvert à tout appelant
- Preuve, `contre-banc.txt` : « B1 sans --forcer : « REFUS … » ; B2 avec --forcer : « TACHE 1 RENDUE (Slack : envoyé) » ; ligne
  n8n : fait ». La ligne était `en_cours` et n'avait pas été prise sur ce PC.
- Le 409 de 031-007 borne le mal aux lignes `en_cours` : le seul cas réel est une tâche portée par l'agent en cours. Correctif
  proposé : retirer `--forcer` de `--fini`, ou le réserver à un geste noté dans `alertes-file.log`.

### G — FAIBLE, confirmé : garde de config Hermes incomplète
- Preuve, `garde-config-hermes.txt` : `call_agent ouvert … ACCEPTÉ`, `mutate_agent ouvert … ACCEPTÉ`, `revert_agent ouvert …
  ACCEPTÉ`, `deny réduit à git push (commit, vercel, migrations, build retirés) ACCEPTÉ` ; en témoin, `execute_workflow ouvert →
  REFUSÉ`.
- Le risque est latent : je n'ai pas ouvert le vrai `config.yaml` de Hermes, et `config-hermes-e2e.mjs` passe dessus (voir
  verifier). Correctif proposé : passer `OUTIL_ECRITURE` en liste blanche (`get_`, `search_`, `list_` sauf `list_credentials`),
  et exiger chaque entrée de `deny` listée dans la règle.

### H — FAIBLE : `revoir-notes`, fonctionnalité non finie et incomplète
- Le brief n'a pas de section « Ton rôle ».
- Aucun workflow ne dépose la tâche : `031-007/resume.md` §3 ne parle que de la revue et de `sante-reseau`, et le brief le dit
  lui-même (« à poser par l'agent principal », `revoir-notes.md:9`).
- La ligne Slack de n8n commence par « Hermes — » pour toute tâche (lignes de #presti-auto), y compris celles de Claude Code.
- Le modèle choisi est `claude-sonnet-5-5` (`lancer-hermes-file.mjs:32`), alors que la tâche est une relecture de jugement et que
  `CLAUDE.md` route « verdicts → opus ». C'est à trancher par Benj.

### I — FAIBLE : les échecs de lancement ne laissent aucune trace durable, et personne ne lit les alertes
- `lancer-hermes-file.mjs:98`, `:110`, `:112` impriment `ÉCHEC …` sans appeler `noterAlerte`, et `file-n8n-etat.json` reste à
  « tache ».
- Personne ne lit `alertes-file.log` (reste n°4 de B-rendu, toujours vrai). C'est ce qui rend le défaut C silencieux.

### J — FAIBLE : constat 12 toujours ouvert
- Les neuf fichiers de la chaîne ne sont pas versionnés (voir §1). Un `git clean` ou une réinstallation les perd. Commit à faire
  par l'agent principal, après l'accord de Benj.

## Ce qui tient

Les 12 constats d'origine sont corrigés, avec leur scénario, pour l'usage prévu : la consigne du répartiteur, avec passage. Le
détail est au §1. Le banc est solide : vrai code, faux n8n HTTP, faux orca, `~/.presti` contrôlé avant et après. La boucle réelle
a tourné jusqu'au bout (n°17). Le jeton n'apparaît dans aucune sortie que j'ai vue. `AGENTS.md` et le bloc régénéré sont
conformes à la règle des exécutants.

## Points à valider par Benj

1. Défaut C, avant tout dépôt de `revoir-notes` : borner les relances d'un agent qui ne prend pas.
2. Défaut E : quelle permission donne Orca à Claude Code lancé seul ? Faut-il poser les refus `git push` et `git commit` dans
   `.claude/settings.json` ?
3. Défauts D et A : corriger le client (passage obligatoire, exécutant tiré de la réservation) et `.hermes.md:57`.
4. Commit des neuf fichiers (constat 12).

VERDICT : NE TIENT PAS. Les 12 constats d'origine tiennent sur le banc (41 verts). La version 031-013 ajoute un défaut élevé
confirmé (C : relances sans borne d'un agent qui ne prend pas, jusqu'à six agents sur un PC de 8 Go, et file bloquée en
silence), trois défauts moyens confirmés ou lus dans le code (D, A, F) et un défaut moyen plausible (E). Il faut corriger C, et
décider pour E, avant de faire passer une tâche Claude Code par la file.
