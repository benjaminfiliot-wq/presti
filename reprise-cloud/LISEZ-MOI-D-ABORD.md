# Reprise cloud — À LIRE D'ABORD

*Version 2 du 29/09/2026. Rafraîchie depuis le PC par `bash reprise-cloud/maj.sh` (mémoire, docs, usine, veille : copies figées, sans secret). Ce fichier, [LIMITES-DU-CLOUD.md](LIMITES-DU-CLOUD.md) et `outils/` sont écrits à la main pour le cloud : `maj.sh` n'y touche pas.*

Tu es une session Claude Code dans le cloud (claude.ai/code), sur le dépôt `benjaminfiliot-wq/presti`. Benj est le fondateur de Presti ; il parle en français familier et veut des réponses courtes et prêtes à l'emploi. **Réponds toujours en français.** Ce dossier te donne les mêmes connaissances et les mêmes règles que la session du PC ; [LIMITES-DU-CLOUD.md](LIMITES-DU-CLOUD.md) dit franchement ce que tu ne peux pas faire d'ici, et ce qui le rendrait possible.

## 1. La mission

1. **Finir la série 026** : les fiches de `.orchestre/brouillons-ecosysteme/026/` (l'INDEX donne les dépendances, les exécutants et les juges).
2. **Faire tourner l'écosystème 24 h/24** : des agents (Claude Code = chef d'entreprise, Codex et Antigravity = exécutants, Matt = directeur des opérations sur l'usine, les agents du bus) trouvent, contactent, fabriquent et facturent. Benj ne fait que les appels, l'argent et les accords.
3. **Première mission de l'écosystème une fois en place** (décision du 27/09) : remettre Presti entier à niveau. Fiche dédiée à écrire en fin de série.

Le dépôt de travail s'appelle « le dépôt » ; le PC de Benj est « le PC » ; l'usine Oracle (`88.96.53.3`) est « l'usine ». Le moteur multi-IA (`presti-ops/usine/moteur.mjs`) tourne **sur le PC** : il dépose les fiches, lance Codex sur l'usine, Gemini par Antigravity, et commite. Tu ne le commandes pas d'ici.

## 2. Ton premier quart d'heure

```bash
git fetch origin --prune && git log --oneline -5 origin/main      # le PC pousse toutes les 5 min : origin/main avance sans cesse
node reprise-cloud/outils/etat.mjs                                 # l'état de la série 026, CALCULÉ (voir §3)
node reprise-cloud/outils/etat.mjs --pretes                        # les fiches que le cloud peut prendre, et celles qu'il doit laisser au PC
sed -n 1,60p .orchestre/digest.md                                  # les questions en attente d'abord
git ls-remote --heads origin 'claude/*'                            # les fiches déjà prises par une autre session cloud
```

Puis, une fois, les vérifications de [LIMITES-DU-CLOUD.md §5](LIMITES-DU-CLOUD.md) (Node, `npm ci`, typecheck, connecteurs, accès à l'usine). Lis [memoire/MEMORY.md](memoire/MEMORY.md) (l'index de la mémoire du PC), puis au minimum : `journee-27-09-etat.md` (le journal des 27-29/09 : le plus complet), `ecosysteme-presti.md`, `usine-oracle.md`, `presti-orchestre-antigravity.md`, `migrations-je-les-applique.md`, `node24-windows-process-exit.md`. Ce sont des copies figées : la mémoire vivante est sur le PC.

## 3. L'état du jour (jamais un nombre figé)

**Le compte se demande à `.orchestre/`, il ne se recopie jamais** : `node reprise-cloud/outils/etat.mjs` donne, pour la série 026, les fiches faites, en cours, refusées, déposées en `file/`, le total de l'INDEX et, par exécutant, le total / les faites / les prêtes. Le total de l'INDEX bouge (des fiches s'ajoutent). Ce que tu vois est ce qui est **poussé** sur `origin/main` ; le disque du PC peut avoir quelques fiches de plus.

Photographie du 29/09 vers 11 h (à REVÉRIFIER par la commande) :
- Les fiches racines (bloquantes) : 026-063 (bloquait 83 fiches) est faite ; 026-006 (Next 16, bloquait 53) est en cours au PC ; 026-119 et 026-118 sont faites ; 026-141 est refusée. La ligne de conduite de Benj à 8 h 40 : **14 fiches racines seulement** (l'accélération).
- Le moteur tourne sur le PC depuis le 28/09 : jusqu'à 8 Codex, 4 sur la voie libre (Ollama Cloud, freellmapi ; jamais de données de prospects), 3 chez Gemini. Les rédactions croisées vont dans `.orchestre/a-relire/` et les questions dans `.orchestre/a-decider/` : **ces deux dossiers ne sont jamais commités, tu ne les vois pas d'ici**.
- Migrations appliquées à ma connaissance : 0096 à 0100, 0105, 0110 (à recouper par `list_migrations` du connecteur Supabase). Meta : accès à la Bibliothèque publicitaire OK depuis le 28/09.
- Ce qui reste au PC quoi qu'il arrive : les fiches `codex` et `antigravity` (l'usine), les fiches à périmètre hors du dépôt (`../orchestre`, `SaaS/`), les juges `--reel` (clé de service Supabase).

## 4. Les décisions de Benj en vigueur

- **Juges croisés (28/09)** : aucune IA ne juge son propre travail. Codex rédige les juges des fiches produites par Antigravity/Gemini ; Gemini rédige ceux des fiches produites par Codex ; Codex rédige les migrations. Claude relit CHAQUE juge, l'attaque par sabotages avant usage, fait les essais à sec et applique les migrations. Un juge rédigé par Gemini n'est jamais accepté sans cette contre-vérification (coquilles vides constatées le 27/09 : un `existsSync`, un témoin vert qui passe sur un dossier vide).
- **Délégation de ses gestes (28/09)** : le chef fait les gestes de Benj, SAUF : un envoi à un client ou un prospect, une publication, une dépense, la création d'un compte, un réglage de sécurité de son PC, et tout texte juridique nouveau (celui-là : le décrire et s'arrêter).
- **Ne PAS toucher à la page publique des artisans `/p/[slug]` (29/09, 8 h 40)** : le budget de poids est relevé à 150 Ko pour Next 16 ; aucune fiche d'allègement.
- **Next 16 : oui (29/09)**. Échéance : Next 15 n'a plus de correctifs après le 21/10/2026. Fiche 026-006 ; voir LIMITES §1 : le clone d'une session cloud est justement la « copie isolée » qu'elle exige.
- **Meta déléguée (29/09)** : la catégorie spéciale « Logement » des pubs est tranchée par le chef, sur la source officielle de Meta, « oui » en cas de doute. Benj ne refera plus la vérification d'identité.
- **Un seul chef d'orchestre, des exécutants d'abord (15/09, 24/09)** : la production va chez Codex et Antigravity ; Claude pense, écrit les juges, contre-vérifie, applique les migrations, commite. Sonnet pour le mécanique, Opus seulement pour juger ; Fable 5.1 n'économise rien (sous-limite de la même limite).
- **Hiérarchie de l'écosystème** : Benj (accords : envois, dépenses, publications, R24) > Claude Code (chef) > Matt (directeur des opérations, sur l'usine) > les agents du bus. Matt et le Vigile peuvent **poser** une pause sur un agent, jamais la lever ; R24 : rien ne part sans l'accord de Benj (le Crieur ne « publie » pas seul).
- **Périmètre (27/09, « concentre-toi sur le principal »)** : la série 026 et la station Claw3D d'abord. La production (sites de référence, 3ᵉ passe) attend. Le kit d'appel, l'étude de marché et le cadre légal sont dans `docs/`.
- **Économie de la limite (25/09, 27/09)** : tout ce qui peut tourner sur Codex, freellmapi, Ollama, Laya ou Whisper y va. Une session cloud consomme **la même limite** que le PC.
- **Refus et arrêts** : Groq refusé (ne pas le reproposer) ; CLIPFORGE arrêté ; OpenClaw oui, mais isolé sur l'usine, modèles gratuits, **jamais avec l'abonnement Claude** ; aucun achat, sauf Vercel Pro le jour du premier site vendu ; franchise en base de TVA (art. 293 B) : aucune TVA facturée.
- **À trancher par Benj (28/09, non résolu à ma connaissance)** : le cadre légal du 27/09 (`docs/Prospection-Cadre-Legal-2026-09-27.md`) dit que les formulaires de contact s'envoient à la main, un par un ; l'INDEX (026-095, 026-165) fait soumettre `formulaire_site` par l'usine, 5 à 40 par jour. Ne rien envoyer avant sa réponse.

## 5. Les règles absolues

**Git.** Jamais `git reset`, `clean`, `stash`, `checkout <fichier>`, `restore`, `revert`, ni `push --force`. Jamais supprimer ou vider un fichier hors de ton périmètre : une question, pas une action. Commiter avant de lancer une flotte. Un commit se fait **chemin par chemin** (`git commit -- <chemins>`), jamais nu : un commit nu emporte tout l'index. Sur le PC, un `.git/index.lock` orphelin (vide, plus de 90 s, aucun git en cours) est un piège connu ; ne le retire que dans ces conditions.

**Secrets.** Aucun secret affiché, écrit, ni commité. Une fausse clé de test contient « sentinelle », « temoin », « essai » ou « factice », ou s'assemble à l'exécution (`'sk-' + 'ant-…'`) : sinon `garde-commit.mjs` refuse TOUT commit du dépôt et le paquet de l'usine refuse TOUT envoi. Aucune donnée de prospect vers une IA gratuite ni vers un modèle `:cloud` (Ollama Cloud) ; les prospects ne vont qu'à Codex ou à un modèle local. Le cloud n'a de toute façon aucune donnée de prospect : ne cherche pas à en obtenir.

**Actions.** Jamais de création de compte, de saisie de mot de passe, de clé ou de jeton. Jamais de suppression définitive, d'achat, de virement. Aucun envoi réel (mail, message, formulaire) ni publication sans l'accord de Benj (par ligne ou par série). Pas de scraping contraire aux conditions d'utilisation ; pas d'aspiration des réseaux sociaux ni de la Bibliothèque publicitaire.

**Juges et preuves.** Les juges sont écrits AVANT la production. Une preuve vide est un mensonge (aucun fichier de 0 octet) ; une capture livrée par un agent ne prouve rien : c'est le juge qui lance, se connecte et capture. Une fiche finie en moins de 10 minutes est suspecte. Plusieurs juges dans un `verifier` : `node scripts/juges-en-serie.mjs "juge 1" "juge 2"`, jamais `a || r=1; … exit $r`, et pas de parenthèses nues. Un juge rouge n'est pas forcément un verdict : sur un poste saturé, ou après un changement de système (voir LIMITES §4), rejoue-le dans un clone propre avant de conclure.

**Code.** Identifiants et commentaires en français ; aucun chiffre non sourcé ; une fonctionnalité non finie n'apparaît pas (drapeau dans `lib/flags.ts`) ; une fonctionnalité livrée doit se voir dans la vitrine de la landing (`DemoSequence`). `process.exitCode = n`, jamais `process.exit(n)` en fin de script : sous Node 24 Windows, `process.exit` pendant qu'une requête se referme plante (libuv, code 3221226505) et les scripts tournent aussi sur le PC. Ne modifie jamais `scripts/orchestre.mjs` (copie d'un outil qui vit hors du dépôt, dans `../orchestre`). Codex n'écrit pas dans `lib/stripe*` ni `app/api/stripe/**` (CV-7) : Claude seul. Ne jamais `npm install` dans le dépôt partagé du PC ; ici le clone est le tien, mais `package.json` et le lock ne se modifient que dans la fiche 026-006.

**Déploiement.** Poussé n'est pas déployé : 37 déploiements Vercel sont restés en ERROR sans que personne le voie (13-14/09), puis un build cassé de 01 h à 09 h 49 le 28/09. Sur le PC : `node scripts/deploiement-etat.mjs`. Dans le cloud : le connecteur Vercel (`list_deployments`, `get_deployment`). Avant de proposer une page : `npm run build`.

## 6. Le protocole des migrations (projet Supabase `gorcdvmueakcncsmrouo`)

Benj ne colle **jamais** de SQL : le chef applique lui-même par le connecteur Supabase (`apply_migration`, `execute_sql`). Une migration rédigée par Codex n'est appliquée qu'après relecture et contre-vérification de Claude.

1. **Essai à sec** : un seul énoncé `do $essai$ … $essai$` qui `execute` le jumeau nu de la migration, insère des lignes d'essai, appelle les fonctions, teste les refus, puis `raise exception 'ESSAI_A_SEC %', r::text` : le résultat sort et tout est annulé. Vérifier ensuite par `to_regclass(...) is null`. Voir `memoire/essai-a-sec-migration.md`.
2. **Contre-vérification** : au moins 4 attaques (sabotages) que la migration doit refuser ; ne jamais appliquer sans une contre-vérification verte.
3. **Application** : `apply_migration`, nommée comme le fichier (`0098_ops_taches`), avec le corps EXACT du fichier.
4. **Corps en base = fichier** : `md5(prosrc)` de chaque fonction comparé à celui du fichier avec `node reprise-cloud/outils/md5-migration.mjs <migration.sql> '<json [{f,h}] rendu par la base>'`.
5. **Contrôle** : `supabase/controles/<n>.sql` en lecture seule, toutes les lignes à « oui ».
6. **Test réel** : le juge de la fiche en `--reel` (compte simulé ou jeu d'essai, ménage par le juge). Il exige la clé de service : **sur le PC** (voir LIMITES §2).
7. **Zéro trace** : relire les tables touchées (0 ligne d'essai, interrupteurs inchangés). Puis la preuve `.orchestre/preuves/<id>/application-<date>.md` (modèle : `.orchestre/preuves/026-013/application-2026-09-27.md`) et le commit.

**Dans le cloud** : tu peux faire les étapes 1 à 5 et 7 si le connecteur Supabase est actif dans la session ; l'étape 6 attend le PC. Une routine (session sans personne) n'applique jamais une migration. Sans connecteur : rends la migration prête avec son essai à sec et écris `PRET_A_APPLIQUER` dans la fiche.

## 7. La boucle de chantier

Le script du PC (`chantier-continu`, 28/09) est recopié et adapté dans [outils/chantier-continu.workflow.js](outils/chantier-continu.workflow.js) (chemins du dépôt, plus de Windows). Lancement : `Workflow({ scriptPath: 'reprise-cloud/outils/chantier-continu.workflow.js' })` si l'outil Workflow existe dans la session. Sinon, la même chose à la main, **une fiche à la fois** :

1. `node reprise-cloud/outils/etat.mjs --pretes` → prends la première fiche « faisable dans le cloud » dont aucune branche `claude/…<id>` n'existe sur `origin` (`git ls-remote --heads origin 'claude/*'`). Crée ta branche de travail `claude/<id>` (`git switch -c claude/<id> origin/main`) et pousse-la d'emblée (`git push -u origin HEAD`) : sa présence sur `origin` dit aux autres que la fiche est prise. **[à tester : le proxy GitHub du cloud n'autorise le push que sur « la branche courante de la session » ; s'il refuse une branche autre que celle que la session a reçue, travaille sur celle-là et mets l'id de la fiche dans le message du premier commit.]**
2. `node scripts/orchestre.mjs valider .orchestre/brouillons-ecosysteme/026/<id>.md`, copie en `.orchestre/file/<id>.md` si absente, puis `node scripts/orchestre.mjs prochaine --agent=claude-code --tache=<id>`.
3. Lis la fiche EN ENTIER, produis exactement ce qu'elle dit, dans son `perimetre`, sans toucher à `interdit`. Si elle exige un geste réservé à Benj : fais tout le reste, décris le geste précisément.
4. `node scripts/orchestre.mjs verifier <id>` jusqu'au vert ; la fiche passe en `fait/`.
5. **Contre-vérification** (l'usine, donc `revue-codex.mjs`, n'est pas joignable) : au moins 4 sabotages de ta production, chacun doit rougir le bon critère du juge, restauration exacte (sha256 avant/après), juge vert ensuite. Note-les dans `.orchestre/preuves/<id>/contre-verif-cloud.md`.
6. `bash reprise-cloud/outils/commit-fiche-cloud.sh <id> "<résumé>"` : commit chemin par chemin sur la branche de la session, garde de l'index et des imports, push de la branche. Ouvre ensuite la PR vers `main`.
7. Tour suivant ; arrêt après deux tours à vide. Écris ce qui reste bloqué (et pourquoi) dans la PR.

## 8. Travailler avec l'orchestre

- Les outils sont dans `scripts/orchestre.mjs` : `prochaine --agent=<nom> [--tache=<id>]`, `verifier <id>`, `digest`, `valider <fichier>`, `liberer <id>`, `rejouer <id>`, `repondre`, `contexte`, `budget`. Un agent, une tâche. Une question qui bloque = `.orchestre/en-cours/<id>.question.md` avec 2 ou 3 options numérotées.
- Lis `.orchestre/digest.md` et `.orchestre/contexte.md` avant d'ouvrir un fichier de code : ils répondent souvent. `CLAUDE.md` et `AGENTS.md` du dépôt sont chargés automatiquement.
- **`commit-fiche.sh` vit dans `presti-ops/usine/`, HORS du dépôt** (une copie de lecture est dans `usine/commit-fiche.sh`, elle ne tourne pas d'ici : chemins Windows, `git push origin main`). **Dans le cloud, il est remplacé par `outils/commit-fiche-cloud.sh`** (mêmes gardes, branche de la session, pas de push sur `main`, ni `digest.md` ni `verdicts.jsonl`).
- **Côté PC, pour recevoir une fiche du cloud** : `git fetch origin` puis `git merge --no-ff --no-edit origin/claude/<branche>` (jamais de rebase forcé, jamais de reset) ; si le merge refuse à cause de fichiers modifiés localement, ne pas forcer : laisser la PR ouverte. Puis `node reprise-cloud/outils/recevoir.mjs <id>` reporte la ligne de verdict dans `.orchestre/verdicts.jsonl` et régénère le digest ; le commit de ces deux fichiers reste à la session du PC. Puis `git push origin main` (ou le prochain commit du moteur le fait), et `node scripts/deploiement-etat.mjs`.
- `verifier-isole.sh` (PC) n'a pas d'équivalent à écrire : ton clone EST une copie isolée. Mais le cloud est sous Linux comme l'usine, le PC sous Windows (CRLF, chemins) : voir LIMITES §4.
- Les leçons apprises dans le cloud se rendent dans la PR (fichier `reprise-cloud/retours/<date>-<sujet>.md`) : la session du PC les intègre à la mémoire vivante. Le cloud n'a pas de mémoire qui persiste d'une session à l'autre en dehors du dépôt.

## 9. Où est quoi

| Dossier | Contenu |
| --- | --- |
| `memoire/` | la mémoire du PC (copies figées, sans secret, sans les projets arrêtés) ; commencer par `MEMORY.md` |
| `docs/` | l'écosystème : plan, rectification, interface (station Claw3D), marketing, registre des IA, kit des sites, dropshipping, organigramme, cadre légal de la prospection, étude de marché, coffre `CLAUDE-coffre-SaaS.md` |
| `usine/` | l'usine Oracle et le moteur multi-IA, copies de LECTURE de `presti-ops/usine/` (`moteur.mjs`, `juges-croises-qa.mjs`, `revue-codex.mjs`, `commit-fiche.sh`, `garde-imports.mjs`, OpenClaw, Hermes, Ollama, Laya, Codex…) ; le pont vers l'usine, `scripts/usine.mjs`, est dans le dépôt |
| `veille/` | consignes et juges des lots Codex (conformité, prospection, sites de référence, vidéos) |
| `outils/` | écrits pour le cloud : `etat.mjs`, `commit-fiche-cloud.sh`, `recevoir.mjs`, `chantier-continu.workflow.js`, `md5-migration.mjs`, `nettoyer.mjs` (caviardage et scan de secrets de `maj.sh`) |
| `LIMITES-DU-CLOUD.md` | ce que le cloud ne peut pas faire, réglage exact qui le rendrait possible, risque |

Les brouillons de la série sont dans `.orchestre/brouillons-ecosysteme/026/` (l'INDEX en tête). Le contexte du code est dans `.orchestre/contexte.md`.
