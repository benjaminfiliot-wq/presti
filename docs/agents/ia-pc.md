# Hermes et OpenClaw sur le PC de Benj

Depuis le 05/10/2026, Hermes et OpenClaw tournent aussi **sur le PC** (en plus de l'usine), pour faire partie de l'équipe : ils **relisent, recoupent et surveillent**. Ils ne produisent **jamais** de code de production de Presti seuls : le code reste chez Claude Code et Codex, avec les juges habituels. Tout ce qui est ci-dessous vit hors du dépôt, dans `C:\Users\benja\Documents\presti-ops\ia-pc\` (pas un dépôt git).

## Ce qui est installé

| | Version | Où | Taille | Fournisseurs |
|---|---|---|---|---|
| Hermes | v0.21.5 (2026.9.24) | `AppData\Local\hermes` (déjà là) | — | freellmapi : `gemini-3-flash-preview`, repli `ministral-14b` |
| OpenClaw | 2026.9.6 (eb377ac, la même révision que l'usine) | `AppData\Local\openclaw-pc` (paquet npm officiel `openclaw`, installé avec `--ignore-scripts`, 327 paquets) | 529 Mo | freellmapi (idem), repli local Ollama `qwen3:1.7b` (1,27 Go) |

freellmapi vit sur l'usine : les lanceurs ouvrent eux-mêmes le tunnel ssh (`127.0.0.1:3001`) et le referment par PID. Aucune clé n'est dans le dépôt ni dans une config : la clé est lue dans `presti-secrets\freellmapi.txt` et posée dans l'environnement du seul processus fils.

## Les lancer

```powershell
# état : installé ? joignable ? mémoire libre ?
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\benja\Documents\presti-ops\ia-pc\etat-ia-pc.ps1

# une tâche (consigne .md, dossier de sortie, données publiques déclarées)
powershell -NoProfile -ExecutionPolicy Bypass -File ...\ia-pc\tache-hermes.ps1   -Consigne c.md -Sortie .\sortie -Donnees publique
powershell -NoProfile -ExecutionPolicy Bypass -File ...\ia-pc\tache-openclaw.ps1 -Consigne c.md -Sortie .\sortie -Donnees publique
```

Même interface que les `tache.sh` de l'usine : la sortie contient `consigne.md`, `resultats/` (dont `RESUME.md`), `meta.json`, `statut.txt` (`OK`, `ECHEC-AGENT`, `ECHEC-RESUME-VIDE`, `REFUS-DONNEES`, `REFUS-MEMOIRE`). `OK` ne prouve pas que le contenu est juste : relire `resultats/`. Options : `-Modele provider/modèle`, `-DelaiSec` (900 par défaut), `-Outils` (Hermes seulement, `file` par défaut). Variables équivalentes : `HERMES_*` et `OPENCLAW_*` (`DONNEES`, `MODELE`, `DELAI`).

## Limites de mémoire

Le PC a 7,7 Go et il est souvent saturé par les autres agents (moins de 1 Go libre est courant). Chaque lanceur exige **plus de 1 200 Mo libres** : il attend jusqu'à `-AttenteMemoireSec` (120 s), puis refuse (code 6, statut `REFUS-MEMOIRE`) sans rien démarrer. **Un seul agent à la fois**, sans démon : le processus (arbre compris) est arrêté **par son PID** à la fin ou au délai, le tunnel aussi. Hermes met 30 à 130 s à démarrer ; ne jamais tuer par nom (`taskkill /IM` a déjà fermé tous les Chrome du PC).

## Ce qui est interdit

- **Aucune donnée de prospect ou de client**, jamais : `-Donnees publique` est obligatoire et `garde-prospects.mjs` (les mêmes motifs que l'usine) lit la consigne **avant** tout envoi ; un motif détecté = refus (code 4). Les modèles sont gratuits (freellmapi) et l'agent a le web.
- **Jamais de clé Claude/Anthropic** dans OpenClaw (greffon `anthropic` refusé, `models.mode = replace`) ; ni la connexion de Codex ni de Claude dans Hermes (`auth.adopt_external_logins: false`). Aucune connexion à un compte : pas de Nous Portal.
- **Aucun secret** de `presti-secrets/.env.local` dans leur espace de travail. **Aucun envoi réel** : pas de messagerie, pas de publication, pas d'achat.
- **Outils** : OpenClaw = profil `coding` + web, **sans shell**, fichiers limités à son dossier de travail (`tools.fs.workspaceOnly`). Hermes = jeu `file` seulement (jamais `terminal`, `code_execution`, `cronjob`, `delegation`, `computer_use`). **Limite connue** : les outils de fichiers de Hermes ne sont pas confinés à un dossier par sa config ; c'est la consigne et le dossier courant qui le tiennent. Ne rien confier à Hermes qu'on ne voudrait pas voir lu hors de son dossier.
- Ne touche ni à la config de Codex, de Claude Code, d'AtomicAgent, ni au Hermes/OpenClaw de l'usine.

## Essais réels du 05/10/2026 (consigne publique « liste 3 risques d'une migration SQL »)

| | Résultat |
|---|---|
| Hermes (`tache-hermes.ps1`) | `OK` en 65 s sur `freellmapi/gemini-3-flash-preview` ; 3 risques (verrouillage, intégrité, performance) avec détection et protection, `RESUME.md` + `risques_migration.txt` ; 9 625 jetons en entrée, 0 $. Un « réponds ok » direct avait aussi rendu `ok` en 79 s. |
| OpenClaw (`tache-openclaw.ps1`) | `OK` en 535 s : `gemini-3-flash-preview` a répondu 429 (« high demand » côté Google), le lanceur est retombé sur `ministral-14b` qui a rendu `RESUME.md` + fichier de résultats. Le démarrage seul prend 1 à 2 min sur ce PC chargé. |
| Refus | sans `-Donnees publique` : code 4 ; consigne avec un téléphone et « prospect » : code 4, rien envoyé ; mémoire libre < 1 200 Mo après l'attente : code 6. |
| Confinement de Hermes | **prouvé non confiné** : il a lu `C:\Windows\win.ini` hors de son dossier. OpenClaw, lui, limite ses fichiers à son dossier de travail. |

Après chaque essai : plus aucun `node`, `hermes` ni `ssh` de ces lanceurs en vie (`etat-ia-pc.ps1` les liste s'il en reste). Ce qui reste à Benj : `presti-ops/ia-pc/reste-pour-benj.md`. Les consignes passées à OpenClaw doivent être en ASCII pur (son contrôle UTF-8 refuse certains accents venus de Windows).
