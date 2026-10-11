# Juges qui ne suivent plus le code — lot « balayages » (audit C §5.4, §5.5, §5.8, R4), 04/10/2026

Règle tenue : un juge périmé se corrige, il ne s'affaiblit pas — témoin vert, sabotages toujours pris. Rien n'est écrit dans
`.orchestre/decisions.md`. Rejeux sur l'usine, en bac, sur un arbre PROPRE (HEAD + les seuls fichiers corrigés, sans le travail en cours
des autres sessions) et en dépôt COMPLET (voir « Piège de l'usine »).

## Piège de l'usine (à savoir avant de rejouer un balayage)

Le clone de l'usine est en sparse-checkout (`!/docs/contexte-cloud/`) : `docs/contexte-cloud/` (2 014 fichiers suivis, 126 Mo) n'y existe
pas sur disque. Un juge à balayage global y est donc VERT sans aucune correction (le rejeu de l'audit n'a pu le rougir que sur le PC).
Une preuve « le juge ne voit plus les copies » faite sans déplier ce dossier ne prouve rien. `scripts/juges-balayage-sabotages.mjs`
le déplie dans son bac (`git sparse-checkout disable`, propre au worktree : `extensions.worktreeConfig`) et commence par un contrôle
NÉGATIF (correction neutralisée → le juge est rouge).

## Corrections

| fiche | juge | critère | défaut | correction | preuve |
|---|---|---|---|---|---|
| 026-166, 026-258 | `studio-offre-qa` | SO-1 | rouge sur le PC : « 490 » dans les copies de documents de `docs/contexte-cloud/` (2 729 fichiers de contexte pour Claude cloud, 30/09) | `COPIES_DE_DOCUMENTATION` (`scripts/fixtures/025/commun.mjs`) écartée d'office par `gitGrepFichiers` : `docs/contexte-cloud/`, `docs/relais-fiches-claude/`, `reprise-cloud/`, `.orchestre/preuves/` | négatif FAIL ; témoin PASS ; « 490 » écrit dans `lib/urls.ts`, `app/layout.tsx`, `components/controle/contenu/Couts.tsx`, `scripts/usine.mjs` : FAIL ×4 ; dans les 4 copies : PASS ×4 |
| 026-155 | `studio-garde-qa` | SG-5 | idem avec la marque d'essai du Studio ; en plus `.orchestre/verdicts.jsonl` la cite dans un verdict | même constante ; l'exclusion `.orchestre/preuves/026-128/` devient `.orchestre/` (même écart que SO-1 et MQ-9 : fiches, journal, preuves, jamais déployés) | négatif FAIL ; témoin PASS ; code FAIL ×4 ; copies PASS ×4 |
| 025-02/11/14/21/23 | `maquette-qa` | MQ-9 | le nom fictif de la maquette est cité dans les mêmes copies | `EXCLUS_MQ9` reprend `COPIES_DE_DOCUMENTATION` | négatif FAIL ; témoin PASS ; code (`lib/urls.ts`, `app/layout.tsx`) FAIL ×2 ; copies PASS ×2 |
| 025-12, 025-13 | `verrou-insertion-qa` | VI-5 | « aucun fichier de `app/` ou `lib/` changé » (barrière de la fiche 025-12) rouge dès qu'une fiche suivante y touche (29 fichiers de `app/controle/station/` non committés) | VI-5 ne regarde que son vrai périmètre : `supabase/migrations/`, `supabase/controles/` et `app/onboarding/page.tsx` (le seul chemin d'insertion d'un navigateur, que VI-3 juge sur le fond) | `--mutations` : MUT-T vert ; MUT-OUBLI, SLUG, SERVICE, AVEUGLE, DECLENCHEUR rouges comme avant ; MUT-ANCIENNE (migration existante retouchée) et MUT-INSCRIPTION (`onboarding`) rouges en VI-5 SEUL ; MUT-AUTRE-FICHE (un fichier de `app/` ajouté, un de `app/` et un de `lib/` retouchés) : VI-5 vert, 5 critères PASS |
| 025-13 | `verrou-maj-qa` | VM-5 | même barrière, même défaut | même périmètre (`lib/urls.ts` et `lib/purgeComptes.ts` restent permis, jugés par VM-7) | `--mutations` : 12 sabotages d'origine pris ; MUT-ANCIENNE, MUT-INSCRIPTION rouges en VM-5 SEUL ; MUT-AUTRE-FICHE : 7 critères PASS |
| 025-02/11/14/21/23 | `maquette-qa` | MQ-3 | le juge exigeait « Maquette privée préparée **par Presti** pour … » ; depuis la marque blanche du 30/09 (`300bcbff`, GB-1) le générateur écrit « préparée pour … » et le juge `026-garde/blanc` classe « par Presti » en faute | phrase du juge mise à jour (3 lignes) + refus explicite de « par Presti » dans le pied ; le générateur TÉMOIN du juge (`scripts/fixtures/025/temoins/maquette-qa/public/sites-demo/generer.mjs`) suit | réel PASS ; `--temoin` PASS ; sabotage « par Presti » rétabli dans le pied : MQ-3 FAIL ; sabotage « Rien n'est publié » retiré : MQ-3 FAIL |
| 000-modeles-metiers | `modeles-metiers-qa` (+ 6 modèles) | photos | `maquette-qa` MQ-10 rouge sur HEAD : « Maquette : modèle : photos invalides » pour maçon, carreleur, peintre, chauffagiste, isolation, paysagiste. Le générateur veut des noms sans dossier (`/^[a-z0-9.-]+\.(webp\|avif\|jpe?g\|png)$/`, cherchés sous `<démo>/images/`) ; les six `contenu.json` portaient `images/<nom>` ; `modeles-metiers-qa` l'acceptait (`existsSync(<démo>/<x>)`) : aucune maquette générable pour six métiers | données : `"images/` retiré des six `photos.fichiers` ; juge : exige le contrat du générateur (nom sans dossier, fichier sous `images/`) | HEAD seul : MQ-10 FAIL ; avec la correction : `maquette-qa --metier=menuisier` PASS complet (MQ-1 à MQ-12, T1, T2) ; `modeles-metiers-qa` : témoin PASS, préfixe `images/` rétabli FAIL, photo inexistante FAIL |

## Déjà réglé avant ce lot (vérifié)

- `next dev --webpack` : `package.json` `dev` (`c1a991f6`), `scripts/lib/capture.mjs` (`f7e82186`), copies `achat-ecrans-qa`, `026-pilotage/b` et `k` : tous passent `--webpack`. L'usine est « node_modules à jour » sur le dernier `package-lock.json` (`usine.mjs etat`) : aucun `preparer` nécessaire.
- `garde-pause-qa` GP-2 : rouge sur `771d765d` (ma première lecture : `lib/direction/comptable.ts` appelait `creerLecteur` sans lire la pause : vraie voie non gardée, pas un juge périmé, introduite par 026-243) ; corrigé dans le code par `98d7f642` (`sortiePermise()` avant `creerLecteur`). Rejeu sur arbre propre `9ab71ce1` : GP-1 à GP-7 PASS.

## Balayages qui n'avaient rien à corriger (rejoués, sur l'usine)

`instantane-quotidien-qa` (IQ-1 à IQ-14 PASS sur arbre propre ; l'IQ-14 « non concluant » de l'audit tenait à la charge), `livrer-site-qa` (PASS), `station-planche-qa --partie=planche` (PASS), `usine-routes-qa` (UR-1 à UR-10 PASS, typecheck code 0 sur arbre propre : l'UR-10 rouge d'un rejeu vient du travail en cours d'une autre fiche), `verrou-site-qa` (PASS).
`eclate-rendu-qa`, `lenis-film-qa`, `ouverture-film-qa`, `rushes-atelier-qa` : leur `git ls-files --others` ne regarde que `public/` et `scripts/` (fichiers NON suivis) : `docs/contexte-cloud/` ne les touche pas. Sur l'usine ils échouent faute des films et rendus (non suivis, absents du bac) ; sur le PC `rushes-atelier-qa` et `eclate-rendu-qa` sont PASS, `lenis-film-qa` (rafP95Ms 83 ms) et `ouverture-film-qa` (film de 41 s au lieu de 3 à 5 s) sont rouges sous la charge de la machine : mesures de temps, pas un défaut du balayage.
`chef-qa` CH-R6 et `prospects-hors-depot` (juges de SÉCURITÉ : clés, données de prospects) ne passent PAS par `gitGrepFichiers` et ne sont pas touchés : ils doivent voir ces copies.

## Ce qui reste (hors de ce lot)

1. `verrou-maj-qa` VM-2 : ROUGE sur main depuis le 28/09 (`a876a4ce`, 026-035 a ajouté `acheter` et `commander` à `SLUGS_RESERVES` de `lib/urls.ts` pour les pages `/site/acheter` et `/site/commander`) ; la fonction `lock_artisan_privileges_ins` appliquée par 0095 ne les refuse pas : un navigateur peut s'inscrire avec ces adresses. Vrai défaut produit : il faut une migration (liste de 0095 + `acheter`, `commander`, appliquée par le connecteur) ET un VM-2 qui lit la DERNIÈRE définition de la fonction (aujourd'hui il lit 0095).
2. `studio-garde-qa` SG-5 passera au rouge dès que le travail en cours de 026-159 (`scripts/juges-026-pubs-contenu-mutations.mjs`, non committé le 04/10 à 22 h : il écrit la marque d'essai du Studio) sera committé ; l'exclure comme `scripts/pub-qa.mjs` ou ne pas écrire la marque en clair.
3. Le crochet husky `pre-commit` typecheck l'arbre de TRAVAIL (R1 de l'audit C) : le travail inachevé d'une session (ex. `app/api/usine/atelier/lien/route.ts`, TS18048) bloque les commits de toutes les autres, et chaque commit tient `.git/index.lock` pendant toute la vérification (plusieurs minutes sur le PC chargé) : le 04/10 entre 21 h 58 et 22 h 40 aucun commit n'est passé.
