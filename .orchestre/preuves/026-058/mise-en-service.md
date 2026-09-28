# 026-058 — mise en service du socle et de la surveillance sur l'usine (28/09/2026)

## Gestes de Benj
- (a), (b) et (d) : « je t'autorise continue de travailler », dans la conversation, le 28/09/2026 vers 12:35 (heure de Paris),
  en réponse à la demande explicite du « oui » pour le compte `agents`, `/etc/sudoers.d/presti-agents`, les assistants, `/srv/presti-agents`,
  le jeton de l'agent `usine` et `presti-surveillance.service`.
- (c) sans geste : `usine-coffre.mjs poser-jeton-agent usine` (le jeton n'est jamais affiché).

## Avant tout
- `node scripts/usine.mjs etat` : l'usine répond, Codex du compte `usine` connecté (5 fiches du moteur en cours à 10:09Z).
- `sudo -n true` sous `usine` : refusé (sudo restreint depuis le 25/09, LISEZMOI « Sudo restreint »). Les gestes root passent
  par `ubuntu`, même clé, comme le prévoient `usine-agents.mjs` et le LISEZMOI : `sudo -n true` sous `ubuntu` → OK.
  Ce n'est pas un contournement : c'est le compte d'administration documenté.

## Le socle à sec (`PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs socle --a-sec`, code 0, 112 lignes), relu :
- compte `agents` : `useradd --create-home --shell /usr/sbin/nologin`, refus s'il est dans sudo/adm/admin ; dossiers en 700 ;
- `/srv/presti-agents` : worktree détaché de `origin/main`, `usine:agents`, dossiers 2750, fichiers 640/750, deux liens d'écriture
  vers `~agents/travail` (refus si un vrai dossier est à leur place) ;
- `/srv/playwright` 2750 ;
- assistants `presti-coffre` et `presti-journal` : `root:root 755`, copiés de l'arbre déployé ;
- sudoers : exactement deux règles `usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-coffre|presti-journal`, `visudo -cf` avant
  l'installation en 440 ;
- ne touche ni au pare-feu, ni à sshd, n'installe aucun paquet.

## Le socle, pour de vrai (`PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs socle`, code 0)
- compte `agents` créé : `uid=1002(agents) gid=1002(agents) groups=1002(agents)` (aucun groupe d'administration) ;
- sudoers contrôlé par `visudo -cf` (« parsed OK ») puis installé en 440 ;
- `/srv/presti-agents` créé sur `origin/main`.

## `maj` (code 0) : dépendances sans scripts d'installation, Chromium Headless Shell 153 (Playwright) dans /srv/playwright.
Commit déployé : **bb8b009de14b74a6df0a77786884c03c52b7f17b** (= origin/main à 12:08). Aucun paquet n'a exigé son script.

## Le coffre (b, c)
- Premier essai : `agents-jeton.mjs` a posé l'empreinte puis planté (assertion libuv async.c:94 sous Windows, Node 24, process.exit
  pendant la fermeture du client) : rien n'a été envoyé. Corrigé (7e7be9e5), rejoué : `PRESTI_JETON_USINE : jeton posé, jamais affiché`.
- `usine-coffre.mjs noms` → `PRESTI_JETON_USINE` seul ; `etat` → `mode=600 proprietaire=agents noms=1`.

## La surveillance (d)
- `PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs installer surveillance` : presti-surveillance.service copiée, activée.
- Après 3 min : service `active (running)`, mesures écrites (`mesures-2026-09-28.jsonl`), mais le battement rendait **404** :
  `busAgents` était encore baissé en production. Levé par Claude Code sur l'autorisation de Benj (86472ce0, AR-2 adapté),
  déployé (cfe44a8, READY à 13:10) : `/api/agents/battement` sans jeton → 401.
- **Premier battement de l'agent `usine` : 2026-09-28 11:15:11 UTC** (ops.agents.battement_le).

## Charge du moment
- Mémoire : 4,1 Go utilisés sur 23,9 Go ; disque 68 % (30 Go sur 45). Le premier `--bilan` sur 24 h reste à noter demain (jamais de charge factice).
