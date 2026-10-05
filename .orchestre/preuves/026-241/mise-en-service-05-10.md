# 026-241 — mise en service de la couche Savoir, 05/10/2026 (Claude Code, agent Sonnet)

Autorité : l'ordre de Benj du 05/10 matin (« 2 : toute l'équipe tourne seule en automatique ; 5 : je t'autorise ; 6 : tu es autorisé, tu as toutes les clés, fais-le seul ; 3 en dernier ; 7 : je n'ai rien ») et D-0410-15 (compte `gardien` accordé). Gestes root par `gardien` (clé du poste `~/.ssh/presti-usine-gardien`), déposés par ssh depuis le PC.
Aucun interrupteur de `docs/savoir/reglages.json` n'est allumé (voir « Pas fait »).

## Fait

| # | Geste | Preuve |
|---|---|---|
| 1 | Dépôt `/srv/presti-savoir` et `/srv/presti-savoir/depot`, `agents:agents` 2770 (par gardien) | `sudo stat` : `agents:agents 2770 /srv/presti-savoir`, idem pour `/depot` |
| 2 | `usine` ajouté au groupe `agents` (`usermod -aG agents usine`) pour déposer dans le dépôt ; pas d'ACL (`setfacl` absent), pas de règle sudoers de plus | `id usine` → `groups=1000(usine),1002(agents)` ; sous `usine@` : `touch` puis `rm` dans le dépôt réussis |
| 3 | `/home/agents/travail/savoir` (agents, 700), requis par `ReadWritePaths` des deux services | `sudo stat` : `agents:agents 700` |
| 4 | Unités copiées depuis `/srv/presti-agents/scripts/usine/systemd/` (commit déployé e23051437), `systemd-analyze verify` sans erreur sur les six : `presti-chef-savoir-recevoir.{service,path}`, `presti-chef-savoir-index.{service,path}`, `presti-chef-bilan.{service,timer}` | sortie de l'installation : « verify ok » |
| 5 | Activés : `presti-chef-savoir-recevoir.path`, `presti-chef-savoir-index.path`, `presti-chef-bilan.timer` (7 h 35 Paris, prochain passage mardi 06/10 05:35 UTC) | `systemctl list-units 'presti-chef*'` : les deux `.path` `active waiting`, le timer `active waiting` |
| 6 | `PRESTI_JETON_CHEF` déjà au coffre de l'usine (posé par une autre session avant moi) : le bilan l'utilisera | `usine-coffre.mjs noms` |

Les unités `presti-chef-leger/plein/reunion/modele` n'ont PAS été installées par moi (`installer chef` les aurait toutes activées : j'ai installé les trois services de la fiche un par un). Une autre session les a installées entre-temps ; `presti-chef-plein.service` a échoué à 08:01 UTC (« événements illisibles (HTTP 200) ») puis a été arrêté à 08:18 : hors de cette fiche, signalé.

## Pas fait

1. **Premier envoi : BLOQUÉ par le plafond du contrat.** `node scripts/savoir/synchroniser.mjs` (export seul, `envoi` éteint) rend « plafond dépassé », code 1 : l'export porte 101 106 251 octets pour 5 301 fichiers, plafond `octets_total` = 80 000 000 (`docs/savoir/sources.json`). Mesure par une copie de l'exporteur (scratchpad, sans écrire d'export) : 36,8 Mo viennent de `presti:docs/contexte-cloud/presti` (1 632 fichiers), 16,7 Mo de `docs/contexte-cloud/presti-ops`, 1,9 Mo de `docs/contexte-cloud/SaaS`, 0,6 Mo de `MANIFESTE.json` : le dossier `docs/contexte-cloud/` (2 014 fichiers suivis par git, instantané du dépôt pour la reprise cloud) est ramassé par `presti:docs/**` et double les originaux. Sans lui : environ 45 Mo. Compartiments : general 4 966 fichiers, prospects 335, 183 reclassés, 4 écartés pour secret, 923 caviardages.
   Correctif (une ligne, à faire par le chef, `sources.json` m'est interdit par la fiche) : ajouter `"presti:docs/contexte-cloud/**"` à `exclusions`, rejouer `savoir-socle-qa`, puis relancer la synchronisation. Je n'ai ni contourné le plafond ni envoyé un export partiel avec un contrat de substitution.
2. **Interrupteurs** `envoi`, `lecons_dans_consignes`, `bilan_quotidien` : laissés éteints. `envoi` n'a pas d'objet tant que l'export n'est pas passé ; les leçons et le bilan se lisent depuis `/srv/presti-agents` (commit puis `maj`) et n'ont rien à lire tant que l'index est vide ; allumer un interrupteur « accordé » sans la preuve qui le justifie mentirait.
3. **Tâche Windows `Presti savoir`** : NON créée (consigne : script écrit, pas de tâche créée sans test, et le PC est à moins de 1 Go de mémoire libre alors qu'un export dure plus de 6 minutes). Script prêt : `tache-windows-presti-savoir.ps1` dans ce dossier ; voir `reste-pour-benj.md`.
4. **Juges `--reel`** (`savoir-socle-qa`, `savoir-recherche-qa`, `savoir-reflexion-qa`) : non lancés, SVS-R2 (indexation de moins de 26 h) et SVS-R3 (interrupteur envoi, tâche Windows) ne peuvent pas passer sans premier envoi.
5. **Section « Le savoir des agents »** du registre : déjà écrite (026-241, docs seulement) ; rien changé : elle reste exacte tant que rien n'a été envoyé.
6. Sémantique, recherche web, Perplexity : éteints, comme prévu par la fiche.

## Docs touchées

`docs/agents/usine.md` : trois lignes de services mises à jour (installés / jeton / minuteur), paragraphe du dépôt (groupe `agents`, travail/savoir, script de la tâche, plafond).
