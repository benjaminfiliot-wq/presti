# Brief — workflows n8n `presti-sauvegarde` et `presti-garde-sauvegarde` (chantier 4, lot L8, tâche 032-023)

Écrit le 02/11/2026 par Claude Code (hôte d'agents Oracle). Sources : tâche `.orchestre/en-cours/032-023.md` ; plan du chantier 4
(`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`) §4.1 (la sauvegarde, l.390-410), §4.3 (battement de 26 h, l.416), §14 « La suite » ligne 3,
§15 points 3 et 4, règles communes du §0 bis (l.127-158) ; preuve `032-020` (`scripts/sauvegarde.mjs`, codes de sortie, manifeste) ; règle n8n-first
(`.claude/rules/architecture-outils.md`) ; fiche `p5-entreprise/fiche-methode-n8n.md` point 5 (workflow d'erreur) ; réseau neuronal : `regles_pour`
(architecture-outils, ADR-001) et la note `memoire-presti/slack-comptes-rendus-2610` (`#presti-auto` est un canal PRIVÉ, zéro donnée de prospect).
Juge hors ligne : `scripts/sauvegarde-n8n-qa.mjs`. Exports : `.orchestre/preuves/032-023/*.workflow.json`.

Workflows, dans le n8n d'Oracle, **inactifs, jamais publiés** :

| Workflow | Identifiant | Horaire (Europe/Paris) | Délai borné |
|---|---|---|---|
| `presti-sauvegarde` | `16Gbnw1jg1JmFbfV` | tous les jours à 3 h 40 | 1 200 s |
| `presti-garde-sauvegarde` | `2uovL6sfTnINC3ka` | tous les jours à 4 h | 600 s |

Ni l'un ni l'autre n'écrit en base, n'appelle un modèle ni ne lit une donnée d'artisan : ils ne manient que des comptes, des noms de fichier et des dates.

## `presti-sauvegarde` — 14 nœuds

| # | Nœud | Type | Rôle |
|---|---|---|---|
| 1 | Déclencheur 3 h 40 | Schedule Trigger 1.4 | tous les jours à 3 h 40 ; fuseau du workflow `Europe/Paris` |
| 2 | Réglages de la sauvegarde | Code | jour de Paris, début du passage, dossier, conservation (14 jours) |
| 3 | Lancer la sauvegarde | SSH (clé privée) | `flock -n -E 75 /tmp/presti-sauvegarde.verrou timeout -k 30 900 node scripts/sauvegarde.mjs --dossier /home/usine/sauvegardes-presti`, dans `/home/usine/Documents/presti` ; `onError: continueRegularOutput` (une panne SSH devient un bilan en échec, pas un trou) |
| 4 | Lire la sauvegarde | Code | lit la ligne `✅ <archive> — N tables, L lignes, C comptes, K Ko, S s` ; code 0 = réussie, 75 = un autre passage tournait (verrou), 124/137 = délai, 2 = préconditions absentes, 1 = refus |
| 5 | Sauvegarde réussie ? | If | oui → relecture ; non → bilan sans relecture |
| 6 | Relire la dernière archive | SSH | `timeout -k 10 120 node scripts/sauvegarde.mjs --verifier --dernier --dossier /home/usine/sauvegardes-presti` |
| 7 | Bilan de la sauvegarde | Code | réussite = sauvegarde ET relecture vertes, relecture portée sur l'archive du passage, même nombre de tables ; rend tables, lignes, comptes, taille, durée |
| 8 | Écrire le battement | SSH | `<horodatage UTC> ok|echec` dans `/home/usine/sauvegardes-presti/battement-sauvegarde.txt`, à chaque passage |
| 9 | Sauvegarde et relecture réussies ? | If | oui → purge ; non → alerte |
| 10 | Purger les archives de plus de 14 jours | SSH | `find <dossier> -maxdepth 1 -type f -name '*.presti' -mtime +14 -delete` — seulement après un passage entièrement vert |
| 11 | Alerte Slack (échec) | Slack 2.7 | `#presti-auto`, identifiant existant « Slack account 2 » ; étape en échec et raison, jamais un secret |
| 12-13 | Échec du workflow → Alerte Slack (erreur du workflow) | Error Trigger → Slack | une exécution de production qui plante hors du bilan (le battement, la purge) alerte aussi |
| 14 | Note | Sticky | rappelle que le workflow est inactif |

Slack ne reçoit un message **qu'en échec** : la réussite n'a aucune sortie vers Slack (le juge le prouve sur le graphe). Le bilan de la réussite
(tables, lignes, taille, durée) reste dans l'exécution, gardée (`saveDataSuccessExecution: all` : aucune donnée de client, des comptes seulement).

## `presti-garde-sauvegarde` — 12 nœuds

| # | Nœud | Rôle |
|---|---|---|
| 1-2 | Déclencheur 4 h, Réglages de la garde | tous les jours à 4 h ; jour de Paris ; battement toléré : 26 h au plus |
| 3 | Lire les manifestes récents (SSH, dossier des sauvegardes) | `for f in $(ls -1 *.presti \| sort \| tail -n 3); do echo "== $f"; head -n 1 "$f"; done` : la première ligne d'une archive est son manifeste, lisible sans clé |
| 4 | Relire la dernière archive (SSH) | la même relecture `--verifier --dernier` |
| 5 | Lire le battement de la sauvegarde (SSH) | `cat <dossier>/battement-sauvegarde.txt` |
| 6 | Bilan de la garde (Code) | **alerte** si : dossier illisible ; aucune archive ; pas d'archive du jour (jour de Paris, lu dans le nom du fichier) ; relecture rouge ou portée sur une autre archive ; manifeste illisible ; **nombre de tables inférieur à celui de l'archive précédente** (égal ou plus : rien) ; battement absent, illisible ou de plus de 26 h (26 h pile tient) |
| 7 | Écrire le battement de la garde (SSH) | `<horodatage UTC> ok|echec` dans `battement-garde.txt`, à chaque passage |
| 8-9 | Garde satisfaite ? → Alerte Slack (garde) | alerte `#presti-auto` listant tous les écarts, seulement si la garde n'est pas satisfaite |
| 10-11 | Échec du workflow → Alerte Slack (erreur du workflow) | idem sauvegarde |

Pas d'archive précédente (première sauvegarde) ou précédente de format v1 sans comptes par table : aucune baisse n'est inventée.

## Défauts du lot, à valider par Benj

- **Dossier et dépôt sur l'hôte** : `/home/usine/sauvegardes-presti` (archives) et `/home/usine/Documents/presti` (la copie du dépôt où vit `scripts/sauvegarde.mjs`). Hors dépôt, hors vault.
- **Délais** : sauvegarde coupée à 900 s, relecture à 120 s ; la garde de 4 h suppose que tout est fini vers 3 h 58. **À mesurer au premier vrai passage** : si la sauvegarde réelle dure plus de 12 minutes, décaler la garde (le juge pose l'heure : `SPEC.garde.heure`).
- **Conservation** : 14 jours (plan §4.1). C'est la seule suppression des deux workflows, après un passage vert seulement ; si les sauvegardes cessent, rien n'est jamais purgé.
- **Un seul passage à la fois** : `flock -n` sur l'hôte (le code 75 dit « déjà en cours ») ; n8n Community n'a pas de verrou par workflow. Il faut `flock` (util-linux) sur l'hôte.
- **Slack** : « Slack account 2 » (`lR0GZ7FGXI3FCAF8`), celui que `hermes-file-taches-v1` utilise déjà. Il existe aussi « Slack account » (`tLDpu0VcYpBrl33J`). `#presti-auto` étant privé, l'application Slack doit y avoir été invitée.
- **Telegram du fondateur** (cité au plan §4.1 et §0 bis rang 26) : aucun identifiant Telegram dans `list_credentials` ; non câblé ici, aucun jeton n'a été saisi.
- **Workflow d'erreur** : « désigné » par un Error Trigger dans le workflow lui-même. Poser `settings.errorWorkflow` sur lui-même est refusé par n8n tant qu'il n'est pas publié (essayé le 02/11 : « has no published version »). Le juge refuse `errorWorkflow` dans les réglages. L'Error Trigger ne part que sur une exécution de production, jamais sur un essai manuel.
- **Battement** : chaque workflow écrit une ligne par passage. Ce qui lit le battement de la **garde** (plus de 26 h sans signe → alerte, plan §4.3) n'est pas construit ici : n8n arrêté ne peut pas s'alerter lui-même. À décider (question 1 de `resume.md`).

## Avant l'activation — les gestes de Benj (aucun agent ne les fait : `securite.md`)

1. **Clé de service sur l'hôte** : poser `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans `/home/usine/Documents/presti/.env.local` (`node scripts/ranger-env.mjs`, droits `600`, jamais dans git ni dans un export n8n). Le script ne lit `.env.local` que si les variables ne sont pas déjà posées.
2. **Clé publique de sauvegarde** : `cle-sauvegarde.pub.pem` à la racine du dépôt de l'hôte (elle y est versionnée). La clé **privée** reste dans `coffre-presti`, jamais sur l'hôte. Ouvrir la clé privée une fois, pour l'aller-retour de restauration (plan §15 point 4).
3. **Dossier** : `mkdir -p /home/usine/sauvegardes-presti` (le premier battement le crée aussi).
4. **Identifiant SSH dans n8n** : créer, dans n8n, un identifiant « SSH — clé privée » (par exemple « Hôte Oracle — sauvegarde ») vers l'hôte, avec une **clé réservée** à cet usage (utilisateur `usine` ; adresse de l'hôte vue depuis le conteneur n8n), puis le poser sur les huit nœuds SSH (quatre par workflow). **Aucun identifiant n'a été créé** : les nœuds sont livrés sans (`credentials` absent), et le juge rougit si on en pose un dans l'export sans le revoir.
5. **Un essai à la main** : exécuter `presti-sauvegarde` une fois depuis l'éditeur, regarder le bilan et le battement, vérifier la durée (point « Délais » ci-dessus) ; puis `node scripts/sauvegarde.mjs --verifier --dernier --dossier /home/usine/sauvegardes-presti --vivant` sur l'hôte.
6. **Publier** `presti-sauvegarde` puis `presti-garde-sauvegarde` (le « go » de Benj ; jamais un agent). Le lendemain à 4 h, la garde doit être silencieuse ; pour la voir rougir, renommer le battement un jour de test.
7. **Inscrire le juge** `scripts/sauvegarde-n8n-qa.mjs` au tableau `SUITES` de `scripts/tout-verifier.mjs` (hors ligne, `cout` nul, environ 4 s) : la session principale (lot L11).
8. Le brouillon n'est pas la version publiée : après publication, ré-exporter les deux workflows (`get_workflow_details`), rejouer le juge, et mettre à jour les empreintes si le code a changé (`node scripts/sauvegarde-n8n-qa.mjs --empreintes`).
