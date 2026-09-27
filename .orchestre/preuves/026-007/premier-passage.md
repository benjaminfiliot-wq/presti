# 026-007 — premier passage à blanc de la sauvegarde quotidienne

Rapport du passage à blanc qui précède le premier envoi réel. Aucune valeur de secret n'apparaît ici : chemin, ligne et motif seulement.

## Passage à blanc

- Commande : `node scripts/instantane-quotidien.mjs --sans-pousser`
- Date : 2026-09-27T17:30:57Z (19 h 30, heure de Paris), code de sortie 0, 44 s
- Instantané local : commit `5ca6454c012b5dcc600d79b8b496a3e1cfa86373`, parent = HEAD local `82b6d603b853`
- Fichiers : 6 725
- Octets : 708 637 278 (675,8 Mio)
- Exclusions : 0 (aucune, ni `env`, ni `exe`, ni `taille`, ni `prospect`, ni secret)
- Vault de prospection : présent (listes `deja-contactes-*` et `phase0/suivi.csv` lues par le script)
- Le passage de la session principale à 19 h 28 donnait le même résultat : 6 721 fichiers, 0 exclusion (quatre fichiers de plus depuis, écrits par les chantiers qui tournent en parallèle).

## Scan des secrets, fait à part sur l'arbre de l'instantané

Méthode : `git ls-tree -r -l` du commit ci-dessus, puis `git cat-file --batch` sur chaque blob de moins de 2 Mo. Un blob qui porte un octet nul dans ses 8 premiers Kio est traité comme binaire.

- Blobs dans l'arbre : 6 725
- Fichiers texte lus : 4 506 (2 170 binaires écartés)
- Blobs de 2 Mo ou plus : 49, tous des médias (28 png, 10 webm, 7 mp4, 3 mp3, 1 avif), donc non lus
- Motifs cherchés : `sk_live_`, `rk_live_`, `sk-ant-`, `sb_secret_`, en-tête JWT `eyJhbGciOi`, `BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY`, `ghp_`, `github_pat_`, `AKIA`, `xox[bp]-`, et les affectations `(password|secret|token|api_key|apikey)\s*[:=]\s*['"][^'"]{16,}`
- Noms de fichiers sensibles (`.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials`, `service-account`, `.npmrc`…) : seulement `.env.local.example`, la clé publique `cle-sauvegarde.pub.pem` et deux fixtures de juge
- Occurrences brutes : 165. **Vrais secrets trouvés : 0.**

Ce que sont les 165 occurrences :

| Groupe | Nombre | Détail |
|---|---|---|
| Motif nommé sans valeur, ou valeur tronquée ou assemblée à l'exécution (regex, doc, fiche, fixture de juge) | 146 | suite de 0 à 7 caractères après le préfixe, par exemple `scripts/garde-commit.mjs`, `scripts/instantane-quotidien.mjs`, `scripts/usine-socle-qa.mjs`, `scripts/poser-env.mjs`, `scripts/cle-produit.mjs`, `scripts/firebase-poser.mjs:58` (test de forme PEM), `scripts/fixtures/026-pilotage/a/jeux.mjs`, `scripts/fixtures/026/usine-socle/coffre/cas-valeurs.json`, `scripts/pilotage-logique-qa.mjs`, les fiches 026-002, 026-005, 026-048 et 026-050 |
| En-tête JWT HS256 standard dans une regex | 1 | `scripts/garde-commit.mjs:17` (en-tête public, pas de charge utile) |
| Faux secrets de test déjà admis par `garde-commit` | 11 | valeurs `cle-…`, `secret-du-juge-…`, doublures : `scripts/bus-livraison-qa.mjs:206`, `scripts/canaux-e2e.mjs:43`, `scripts/fixtures/026-horloge-bus/bancs/faux-postgrest.mjs:56`, `scripts/formulaire-site-qa.mjs:643`, `scripts/publier-serie-qa.mjs:203`, `:750`, `:760`, `scripts/abonnement-e2e.mjs:249`, `scripts/relances-e2e.mjs:59` (clé « fausse » envoyée sur un port mort, dit le commentaire), `scripts/fuite-mdp-e2e.mjs:32` (mot de passe témoin du test de fuite), `scripts/fixtures/026-acquisition/sites/temoin-wpforms.invalid/contact.html:13` |
| Sentinelles d'une fiche | 4 | `.orchestre/brouillons-ecosysteme/026/026-041.md:72` (valeurs `…-026-sentinelle…`) |
| Faux positif dans du base64 d'image | 1 | `promo-src/assets-b64.json:1` (`AKIA` au milieu d'un PNG encodé) |
| Clés publiques de tiers, pas des secrets | 2 | `.claude/skills/media-use/scripts/lib/telemetry.mjs:19` : clé d'ingestion PostHog `phc_…` du paquet HyperFrames (clé publique par conception, livrée dans le paquet) ; `.orchestre/preuves/021-18/licence-page.html:50` : jeton de page d'un site de vidéos libres, servi à tout visiteur anonyme |

## Données de prospects

Scan des 6 676 blobs de moins de 2 Mo pour les numéros de téléphone français, les mots SIREN/SIRET et les adresses e-mail.

- Aucune liste de démarchage dans l'arbre. Le script, qui compare aux listes du vault, n'a rien exclu non plus.
- Les fichiers qui portent SIRET et téléphone sont des fixtures factices : `scripts/fixtures/026-acquisition/ademe/page-1.json` et `page-2.json`. Les 14 enregistrements ont des noms témoins, des SIRET et des téléphones en suites ou répétés, et des adresses e-mail en `.invalid` ou d'exemple.
- Les autres correspondances sont des faux positifs ou des démos : les `conversationId` de `.orchestre/agents.jsonl`, les chaînes piégées de `scripts/fixtures/026-pilotage/a/liens-fuzz.json`, les numéros d'essai de `scripts/ai-eval.mjs`, et les sites de démo publics `public/sites-demo/**`.

## Accord de Benj

- Date : 27/09/2026, vers 19 h 25 (heure de Paris), dans la conversation avec la session principale.
- Question posée : « Sauvegarde quotidienne (026-007). Elle crée une tâche planifiée Windows sur ton PC, et la fiche exige ton accord écrit. Tu me le donnes ? »
- Réponse exacte de Benj : « 1 autorisé 2 c'est sont nom de domaine donc il paye ». Le « 1 autorisé » répond à cette question.
- Portée de l'accord : premier envoi réel vers `benjaminfiliot-wq/presti-sauvegarde` et tâche planifiée Windows « Presti instantane quotidien » (étapes 3 et 4 de la fiche).

## Premier envoi réel : code 1, la fiche s'arrête là

- Commande : `node scripts/instantane-quotidien.mjs --pousser`, lancée à 17:41:55Z (19 h 41 à Paris). Sortie « ALERTE BENJ : instantané quotidien échoué », **code 1**.
- Ligne de journal : `branche: instantane-2026-09-27`, commit `1eadc661bae7`, 6 730 fichiers, 708 679 106 octets, 0 exclusion, **`ok: false`**.
- L'envoi a pourtant abouti. `git ls-remote` en lecture montre `refs/heads/instantane-2026-09-27` → `1eadc661bae7` sur le dépôt, le commit du journal. Son parent est `82b6d603b853`, qui était le HEAD local pendant tout le passage.
- La cause probable est l'invariant local du script (`invariant local modifié`). Le script compare HEAD, `git status --porcelain -uall` et l'empreinte de `.git/index` avant et après le passage. Or d'autres sessions écrivent dans le dépôt en même temps. Mesuré à 19:45:04 puis 19:45:53 : l'empreinte de l'index a changé et le statut différait de 93 lignes (le moteur indexait 026-066). Le moteur a ensuite commité deux fois : HEAD est passé à `049c69f`, puis à `04781c4`.
- L'arbre poussé a été scanné à son tour, sur les 4 511 fichiers texte lus. Il ne diffère de l'arbre du passage à blanc que par 9 fichiers d'orchestre. Les seules nouvelles occurrences sont les noms de motifs de ce rapport, sans aucune valeur. Vrais secrets : 0.
- Vercel, en lecture : un seul projet, `presti`. Ses 20 derniers déploiements viennent tous de `benjaminfiliot-wq/presti`, sur la branche `main`. Aucun ne vient de `presti-sauvegarde` après l'envoi de 19 h 41.
- Pas encore faits le 27/09 à 19 h 49, puisque le code 1 arrête la fiche : la tâche planifiée (étape 4), qui n'existe pas sur le poste, le passage planifié forcé (étape 5) et le `verifier` (étape 7).

## Reprise du 28/09 : le script réparé

Entre-temps, `scripts/instantane-quotidien.mjs` a été réparé hors de cette fiche (qui l'interdit) et contre-vérifié. L'invariant ne compare plus l'état du dépôt avant et après : il prouve ce que le script lui-même a écrit (liste fermée des commandes git, trace `GIT_TRACE2_EVENT` des écritures d'index, signature à jeton dans les reflogs, parent = HEAD lu au départ). Les commits, l'index et les fichiers des autres sessions ne le font plus échouer. La réparation est dans l'arbre de travail, pas encore commitée au moment de cette reprise ; c'est ce fichier-là que la tâche planifiée exécute.

## Envoi réel (étape 3) : code 0

- Commande : `node scripts/instantane-quotidien.mjs --pousser`, lancée le 28/09 à 00 h 38 (heure de Paris), 22:38:02Z. Sortie « Instantané b4f4d9cf86ca … instantane-2026-09-28 ; 0 exclusion(s). », **code 0**, 130 s.
- Ligne de journal : `branche: instantane-2026-09-28`, commit `b4f4d9cf86ca9090e22eb34146f9ab58b0c74265`, 7 069 fichiers, 712 143 640 octets, 0 exclusion, vault présent, **`ok: true`**.
- Relu à part par `git ls-remote` : `refs/heads/instantane-2026-09-28` → `b4f4d9cf86ca` sur le dépôt. Parent du commit : `616495004616`, le HEAD local au lancement. Le moteur a commité pendant le passage (HEAD est passé à `01424af71758`) : le script n'a pas rougi, c'est la réparation qui marche. Seule référence locale sur l'instantané : `refs/instantanes/quotidien-20260927223802302-edcc53`.
- Scan des secrets sur ce qui a changé depuis l'instantané du 27/09 (`1eadc661` → `b4f4d9cf`) : 425 fichiers ajoutés ou modifiés (353 + 72), 424 textes lus, 1 binaire, aucun de 2 Mo ou plus. Aucun nom de fichier sensible. 2 occurrences, toutes deux sur `.orchestre/brouillons-ecosysteme/026/026-041.md:72`, les sentinelles déjà connues (`…sentinelle…`, contrôlé sans afficher la valeur). **Vrais secrets : 0.**

## Tâche planifiée (étape 4)

- Créée le 28/09 à 00 h 44, exactement avec le bloc PowerShell de l'étape 4 de la fiche, sous le compte `LAPTOP-6KDEHT8P\benja`, depuis une session **non élevée** (pas de droits d'administrateur). Rien d'autre n'a été changé sur le poste.
- XML relu par `schtasks /Query /TN "Presti instantane quotidien" /XML` : `CalendarTrigger` quotidien (`DaysInterval` 1, départ 13:00 +02:00), `LogonTrigger` de `benja` avec `Delay` PT10M, `StartWhenAvailable` true, `RunOnlyIfNetworkAvailable` true, `ExecutionTimeLimit` PT30M, `MultipleInstancesPolicy` IgnoreNew, `LogonType` InteractiveToken, action `C:\Program Files\nodejs\node.exe` avec `scripts\instantane-quotidien.mjs --pousser`, dossier `C:\Users\benja\Documents\presti`.
- Prochain passage prévu : 28/09 à 13 h 00.

## Passage planifié forcé (étape 5) : résultat 0

- `Start-ScheduledTask -TaskName 'Presti instantane quotidien'` le 28/09 à 00 h 45 ; tâche revenue à `Ready` en 160 s. `Get-ScheduledTaskInfo` : `LastRunTime` 00:45:16, **`LastTaskResult` 0**.
- Dernière ligne de `.orchestre/travail/sauvegardes.jsonl` : `branche: instantane-2026-09-28-0046` (le nom du jour était pris, le script ajoute l'heure), commit `74780c4ee1174c2ba0637522b98824116d71844e`, 7 076 fichiers, 712 197 531 octets, 0 exclusion, **`ok: true`**.
- `git ls-remote` : `refs/heads/instantane-2026-09-28-0046` → `74780c4ee117` sur le dépôt ; parent `01424af71758`, présent dans le reflog local. Le gestionnaire d'identifiants Git sert donc bien au push lancé par le planificateur (le point « à vérifier » de l'étape 4).
- Scan du delta `b4f4d9cf` → `74780c4e` : 16 fichiers, 0 occurrence.
- Branches sur le dépôt après ce passage : `instantane-2026-09-24`, `instantane-2026-09-27`, `instantane-2026-09-28`, `instantane-2026-09-28-0046`.

## Vercel (étape 6)

- Constat du 27/09 à 19 h 45 (recopié) : un seul projet, `presti` ; ses 20 derniers déploiements viennent tous de `benjaminfiliot-wq/presti`, branche `main` ; aucun de `presti-sauvegarde` après l'envoi de 19 h 41.
- Relu en lecture le 28/09 à 00 h 49, après les deux envois de la nuit : toujours un seul projet, `presti`. Ses 13 déploiements depuis le 27/09 18:28Z viennent tous de `benjaminfiliot-wq/presti`, branche `main` ; le dernier (22:40:29Z) est le commit `01424af` de `main`. Aucun ne vient de `presti-sauvegarde`.

## Verifier (étape 7) : PASS

- `node scripts/orchestre.mjs verifier 026-007` (commande de la fiche : `node scripts/instantane-quotidien-qa.mjs --reel`) : PASS depuis `en-cours/` (22:50:00Z), puis la fiche est passée en `fait/` et le verifier relancé : **PASS depuis `fait/`** (22:50:20Z, code 0, 5 s). IQ-R1 à IQ-R5 verts ; sortie complète dans `verifier.log`.
