# 026-048 — réparation du juge `scripts/usine-socle-qa.mjs` (27/09, nuit)

Réparation d'un juge déjà commité. Rien de 026-050 n'est modifié : le code jugé reste celui du commit aa286e5c.
Fichiers touchés :
- `scripts/usine-socle-qa.mjs` ;
- `scripts/fixtures/026/usine-socle/banc-sim.sh` (nouveau) ;
- `.orchestre/preuves/026-048/temoin/scripts/usine/presti-journal.sh` (témoin de `sait-echouer.mjs`, voir « Point à relire »).

Pour 026-053 : `resultat.patch` appliqué, et la fiche déplacée de `refuse/` vers `fait/`.

## Défauts

| # | Critère | Défaut | Preuve avant réparation |
|---|---|---|---|
| 1 | CF-8 | `instancierCoffre` écrivait les coffres d'essai en 644 (umask 022). `avec-coffre.mjs` les refuse, à raison, avec le code 4. Sous Linux, CF-8 rougissait donc sur le bon code. | Usine, `executer --nom=socle-qa-avant` (50f0451d) : `FAIL CF-8 — un nom seulement en commentaire : code 4 (3 attendu)`, et `ligne mal formée : code 4 (0 attendu)`. |
| 2 | CF-8 | Seul le mode 644 était essayé. Un contrôle qui ne regarde que les droits des autres accepterait un coffre en 640. | Signalé par Codex. Le sabotage n°7 le prouve (voir plus bas). |
| 3 | SO-2 | Le juge lisait seulement que `useradd` était « gardé par `id agents` », sans le sens de la garde. | Revue Codex (`~/bacs/rc-026-050`, jeton b2327057…), passage n°4 : condition inversée, **vert**. |
| 4 | SO-4 | Tout `chown usine:agents /srv/presti-agents` suffisait, même sans `-R`. | Revue Codex, passage n°5 : `chown` sans `-R`, **vert**. |
| 5 | SO-5 | Le juge demandait seulement un `systemctl … presti-` et un `exit 1` dans le texte. | Revue Codex, passage n°2 : garde de `maj` inversée, **vert**. |
| 6 | SO-6 | Le juge lisait les motifs des unités copiées et activées. Il ne voyait ni ce qui était vraiment activé, ni ce que `verify` contrôlait. | Revue Codex, passage n°3 : `installer` saute les unités présentes, **vert**. Défaut aussi relevé pour un `verify` pointé sur `/dev/null`. |
| 7 | SO-8 | Aucun essai de journal lié au coffre. Retirer le refus des liens physiques de `presti-journal.sh` restait vert. | Relevé dans la mission. Le sabotage n°6 le prouve. |

## Correctifs

- **CF-8** : `instancierCoffre` pose le mode 600 (`try { fs.chmodSync(cible, 0o600) } catch {}`). Sous POSIX, CF-8 essaie maintenant 644, 640 et 604 : chaque fois, code 4 exigé et aucun enfant lancé.
- **Banc de simulation** : `simuler()` dans le juge, avec `banc-sim.sh` dans les jeux d'essai.
  - Le script distant est **joué** sous bash : `socle.sh`, ou le texte que `usine-agents.mjs` envoie au faux ssh.
  - Ses chemins absolus (`/etc`, `/srv`, `/home`, `/usr`, `/var`, `/opt`) sont remis sous un bac.
  - Les commandes système sont des fonctions doublures qui consignent chaque appel. Rien n'est touché hors du bac. `find` et `install` agissent pour de vrai, mais seulement sous la racine du bac.
  - Les critères jugent **ce qui a été exécuté**.
- **SO-2** : `socle.sh` est joué deux fois.
  - Compte `agents` absent : exactement un `useradd agents` avec `--create-home`, et code 0.
  - Compte présent : aucun `useradd`, et code 0.
- **SO-4** :
  - La lecture exige un `chown` récursif (`-R`, `--recursive`, ou `find /srv/presti-agents … -exec chown usine:agents`).
  - Le banc exige ce `chown` récursif **exécuté** aux deux passages.
- **SO-5** : `maj` est joué sur le banc, avec `/srv/presti-agents/.git` et `/srv/playwright` posés.
  - Deux services `presti-*` en marche : code 1 exigé, et l'arbre non avancé.
  - Aucun service en marche : code 0, et `checkout … origin/main` exécuté.
  - `--forcer` avec des services en marche : code 0, et l'arbre avancé.
- **SO-6** : pour chacun des 6 groupes, `installer` puis `arreter` sont joués sur le banc. L'arbre porte les unités de tous les groupes, plus deux leurres.
  - `/etc/systemd/system` reçoit **exactement** les unités du groupe.
  - `systemd-analyze verify` porte sur ces unités, et elles seules. `/dev/null` est refusé. Chaque `verify` passe avant `daemon-reload`.
  - Chaque unité à activer passe par `enable --now` (puis `disable --now` pour `arreter`), et aucune unité d'un autre groupe.
- **SO-8** :
  - `travail/chef/cycles.jsonl` est posé en **lien physique** vers `~/.config/presti/agents.env`. Refus exigé, rien d'imprimé.
  - `travail/atelier/atelier.log` est posé en lien symbolique vers `~/.codex/auth.json`. Même exigence (sauté avec une note si le poste ne peut pas créer de lien symbolique).
- **SV-12** : le plafond était déjà passé à 1,5 s sous Windows (0,5 s sous Linux) dans le fichier de travail. Il est gardé tel quel et prouvé ci-dessous.

## Rejugé sur le code de 026-050 (vert attendu)

| Où | Commande | Résultat |
|---|---|---|
| PC | `node scripts/usine-socle-qa.mjs --groupe=coffre,socle` | **PASS**, 23/23 (après la pose du patch 026-053) |
| Usine | `executer --nom=socle-qa-repare` (e78b87b6 + paquet) | **PASS**, 23/23, 11 s, CF-8 « coffre en 644, 640 ou 604 → 4 » |
| Usine | `executer --nom=socle-qa-final` (après le patch 026-053) | **PASS**, 11,7 s |
| PC | même juge, `--racine=.orchestre/preuves/026-048/temoin` | **PASS** (après le correctif du témoin, voir plus bas) |

## Sabotages (rouge attendu)

Chaque sabotage est fait sur une **copie**, passée au juge par `--racine`. Il remplace un texte exact et vérifie que la copie a changé. Le dépôt n'est jamais modifié ; la copie est effacée après chaque passage.
- Sur le PC : sabotages n°1 à 6.
- Sur l'usine : copie intacte, puis n°1 à 7. Ils ont tourné dans le bac `~/bacs/socle-qa-repare`, par ssh.

| n° | Fichier | Sabotage | PC | Usine |
|---|---|---|---|---|
| 0 | — | copie intacte (témoin) | — | code 0 ✓ |
| 1 | `socle.sh` | `if ! id agents` devient `if id agents` | FAIL SO-2 (seul) | FAIL SO-2 (seul) |
| 2 | `socle.sh` | `chown -R usine:agents` devient `chown usine:agents` | FAIL SO-4 (seul) | FAIL SO-4 (seul) |
| 3 | `usine-agents.mjs` | garde de `maj` : `[ -n "${actifs// /}" ]` devient `[ -z … ]` | FAIL SO-5 (seul) | FAIL SO-5 (seul) |
| 4 | `usine-agents.mjs` | `installer` : `[ -e "$u" ] \|\| continue` devient `&& continue` | FAIL SO-6 (seul) | FAIL SO-6 (seul) |
| 5 | `usine-agents.mjs` | `systemd-analyze verify $installees` devient `verify /dev/null` | FAIL SO-6 (seul) | FAIL SO-6 (seul) |
| 6 | `presti-journal.sh` | le test `stat -c '%h' … != 1` (liens physiques) est retiré | FAIL SO-8 (seul) | FAIL SO-8 (seul) |
| 7 | `avec-coffre.mjs` | `(stat.mode & 0o777) !== 0o600` devient `(stat.mode & 0o007) !== 0` | sauté (NTFS) | FAIL CF-8 : « coffre en 640 : code 0, enfant lancé » |
| SV-12 | `surveillance.mjs` (026-053) | `setInterval(() => { const f = Date.now() + 400; while (Date.now() < f) {} }, 500)` dans la branche `--service` | FAIL SV-12 (seul) : **7,61 s** de processeur en 10 s (plafond 1,5 s) | — |

Rouge obtenu à chaque fois, sur le seul critère visé. Messages relevés :
- n°1 : « compte agents absent : code 1 […] 0 useradd », puis « déjà présent : 1 useradd ».
- n°3 : « services en marche : code 0 (1 attendu) », puis « au repos : code 1 ».
- n°4 : « presti-surveillance.service copiée mais jamais activée ».
- n°5 : « verify porte sur /dev/null ».
- n°6 : « lien physique vers le coffre : code 0, 1 ligne imprimée ».

## SV-12 et 026-053

- `git apply .orchestre/travail/usine/026-053/resultat.patch` : le patch n'était pas encore appliqué. `git apply --check` était propre avant la pose. Il ajoute `scripts/usine/surveillance.mjs` et `scripts/usine/systemd/presti-surveillance.service`.
- Juge lancé directement sur le PC, `--groupe=surveillance` : **PASS**. SV-12 mesure 9 tours pour **0,73 s** de processeur.
- `.orchestre/refuse/026-053.md` a été déplacé vers `.orchestre/fait/026-053.md`.
- `node scripts/orchestre.mjs verifier 026-053` : **✓ PASS**, en 111 s. SV-12 mesure 0,84 s. Preuve : `.orchestre/preuves/026-053/verifier.log`.
- Usine, `executer --nom=surveillance-053 -- node scripts/usine-socle-qa.mjs --groupe=surveillance` : **PASS**, en 41 s. SV-12 mesure 0,27 s, sous le plafond Linux de 0,5 s.

## Point à relire

- **Le témoin de `sait-echouer.mjs`** (`preuves/026-048/temoin/`) ne refusait pas les liens. Le SO-8 renforcé le faisait rougir, alors que `sait-echouer.mjs` exige un témoin vert. J'ai ajouté à son `presti-journal.sh` le refus des liens (symboliques ou physiques, code 3) : 2 lignes. Le témoin repasse **PASS** (coffre,socle, sur le PC). `sait-echouer.mjs` n'a pas été rejoué en entier.
- **Le banc remet les chemins sous le bac par le texte.** Un script qui fabriquerait ses chemins par morceaux lui échapperait. Ce n'est pas une mise en œuvre plausible du socle.
- **Le défaut « mineur » de Codex sur SO-9** (les commandes de reprise de la doc comparées à la fiche) n'est pas traité : hors mission.
