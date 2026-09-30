# Cursor, exécutant borné (026-222)

`bin/cursor.mjs` est l'adaptateur. **État au 29/09/2026 : voie INACTIVE** (accès non constaté, coût non mesuré). C'est l'issue
conforme de la fiche : rien n'est supposé gratuit, rien n'est installé, aucune dépense n'est ouverte.

## Ce que Cursor peut faire, et ne fait jamais

- Mêmes contrats de tâche que Codex et Antigravity : `id`, dossier de travail, `perimetre`, `interdit`.
- Jamais un verdict d'argent, de sécurité, de droits ou de cerveau (`accepterTache` refuse, avant tout lancement).
- Jamais plus que le `perimetre` écrit : chemin normalisé avant contrôle ; hors périmètre, dans `interdit` ou hors du dépôt → refus.
- Ni secret (`.env*`, `presti-secrets`, `.ssh`, `.claude`, `.codex/auth`, coffre), ni réseau hors de `tache.reseau` (hôte exact),
  ni commande de destruction (`git reset --hard`, `git clean`, `git stash`, `git restore`, `git checkout --`, `rm -rf`,
  `Remove-Item -Recurse`, `taskkill /IM`, `pkill -f`…). `verifierAction` arrête alors l'agent par une `ErreurCursor` dont
  `critere` nomme la cause (`secret`, `reseau`, `destruction`, `hors_perimetre`, `interdit`).
- L'adaptateur ne lit aucune clé. Si une clé devait exister un jour, le câblage d'activation la lirait dans `presti-secrets`,
  la passerait par `deps`, et ne l'afficherait jamais.

## Mode d'accès et tarification (constat du 29/09/2026, PC de Benj)

| Point | Constat | Source |
|---|---|---|
| Éditeur Cursor | présent, lanceur `cursor` version 3.20.17 | `cursor --version` |
| CLI headless d'agent (`cursor-agent`, `agent`) | **absente** du PATH | `which cursor-agent agent` |
| Compte connecté et offre | **non constatés** (rien lu : la config d'un compte n'est pas un fichier que l'adaptateur ouvre) | — |
| Coût par tâche | **non mesuré** : aucune page de tarifs relevée et datée ; l'éditeur n'est pas un mode automatisable à coût nul prouvé | — |

Conséquence : `evaluerVoie` rend `inactive`, `cout: 'non mesuré'` (jamais 0). Pour l'activer, il faut, ensemble et sourcés :
1. la CLI d'agent installée (geste de Benj ou de Claude, sans dépense) et un accès `{ cli, mode, constate_le, source }` ;
2. un `tarif { cout_par_tache: 0, source, constate_le }` relevé sur la page des tarifs de Cursor à la date du jour ;
3. le témoin du juge 026-220 en PASS (`node scripts/juges-026-completude-qa.mjs --preuve-echecs`).
Une mise à jour de l'outil ou du modèle refait ces trois constats avant de rouvrir.

## Journal et reprise

- `ligneJournal({ id, statut, fichiers, consommation })` : une ligne par tentative ; statuts `terminee`, `interrompue`,
  `refusee`, `inactive`, `desactivee`. Consommation inconnue = `« non mesuré »`, jamais 0. Aucune adresse, aucun texte personnel, aucune valeur de clé.
- `reprendre` récupère l'id et la preuve partielle (`<id>.partiel.json`) sous un **verrou exclusif** (`<id>.reprise.lock`,
  création exclusive) ; une seconde reprise concurrente est refusée (`reprise_concurrente`) et rien d'autre n'est écrit ni écrasé.
  `terminerReprise` lève le verrou ; `lancer` le lève toujours (`finally`).
- Un lancement interrompu laisse un état reprenable avec le même id ; jamais une seconde action externe aveugle.

## Activer, désactiver, basculer

- Activation : seulement quand `evaluerVoie` rend `active`. Ajouter alors `"cursor"` à `executants` dans `.orchestre/orchestre.json`
  du projet (l'orchestre ne le fait pas de lui-même : `DEFAUTS.executants` ne change pas).
- **Désactivation immédiate** : `node bin/cursor.mjs desactiver --racine=<projet> <raison>` pose `.orchestre/cursor-voie.json`
  (`actif: false`) ; `lancer` refuse aussitôt (`voie_coupee`) avant tout effet. Retirer `"cursor"` de `executants` complète.
- **Bascule** en cas de quota, de permission douteuse ou de coût qui apparaît : `REPLI` = antigravity → codex → claude-code,
  rendu par chaque refus et par `node bin/cursor.mjs etat`. La tâche retourne en `file/` ; un coût inconnu ou ≠ 0 ne se
  transforme jamais en autorisation.

## Limite de cette livraison

Le lancement réel n'est pas exercé : `lancer` prend un exécuteur injecté (`deps.executer`), remplacé par une doublure dans
tous les essais (« simulé » ne vaut pas « installé »). Les indicateurs de ligne de commande de `cursor-agent` figurant dans
`argv` sont à confirmer à l'installation.
