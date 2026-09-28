# Contre-vérification 026-071 — 28/09

Vérifie la fiche PASS de 026-071 (`verdicts.jsonl` : ligne 492, `PASS`, `2026-09-28T13:56:08Z`, `75s`, dossier `fait` ; une première tentative avait échoué à 13:07:29 — JP-2, JP-3, JP-5 tous rouges — avant d'être corrigée et rejugée verte à 13:56:08 dans la **même** session de rédaction, avant toute clôture. Ce n'est pas une correction post-clôture au sens de 026-037 (Codex avait trouvé un défaut sur une fiche déjà `fait` ; ici la fiche n'a jamais été déclarée `fait` avant d'être verte) : aucun `.orchestre/travail/revue-codex/026-071/` ni aucune autre contre-vérification n'existait avant ce passage-ci, donc aucun juge n'a été « corrigé » après coup — les 2 sabotages supplémentaires prévus pour ce cas ne s'appliquent pas ; 4 sabotages suffisent). Rien touché hors `.orchestre/preuves/026-071/` et `.orchestre/travail/` ; aucun commit.

## Moyen

**1. Revue Codex sur l'usine** — `cd presti && node ../presti-ops/usine/revue-codex.mjs 026-071 --sabotages=4` (journal complet : `.orchestre/travail/revue-codex/026-071/executer.log`).

→ **code 3, NON JUGÉ.** Le paquet est parti sans problème (460 fichiers, 6,5 Mo sur `35fd1c7d`, contrôle du paquet ✓ aucun secret), le bac a démarré sur l'usine, le témoin (passage n°0) est passé vert en 5 s. Mais Codex n'a pas pu répondre :

```
[revue-codex 14:05:23] témoin : code 0 en 5 s
[revue-codex 14:05:26] codex : code 1 en 3 s ; quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM.
· usine executer : commande finie en 9 s sur l'usine, code 3 (seule)
```

Raison exacte : **quota de l'abonnement ChatGPT épuisé** (« try again at 3:48 PM »), pas un défaut du paquet ni de la fiche — le témoin (le verifier exact de 026-071, hors bac à sable) était vert avant que Codex ne soit sollicité. Aucun `verdict.json` n'a été produit : **aucune revue Codex n'a eu lieu**, conforme au protocole (jamais un faux vert quand Codex est muet). 4 fichiers rapatriés (`codex.log`, `consigne.md`, `journal.json`, `runs/0.log`), aucun `verdict.json` parmi eux.

Code 3 → bascule sur le repli imposé par la fiche : au moins 4 sabotages faits moi-même sur la PRODUCTION (jamais sur `scripts/juges-026-acquisition-preuve.mjs`, qui EST le verifier de la fiche — vérifié non touché tout du long, `git status` en fin de campagne : toujours ` M`, identique à avant, jamais une seconde modification).

**2. Quatre sabotages réversibles de la production**, chacun choisi pour rougir précisément l'un des trois critères que `verifier` (`node scripts/juges-026-acquisition-preuve.mjs --lot=7`) évalue réellement pour le lot 7 (JP-2 : sur la référence, chaque juge — `maquette-video-qa`, `douleurs-qa` — sort en code 1/2 avec son premier critère en échec, `MV-1`/`DL-1` ; JP-3 : chacun sort en code 0 en `--auto-controle` ; JP-5 : `echecs-attendus.md` porte, pour chaque juge, un extrait réel ≥ 20 signes, retrouvé dans la sortie). Protocole identique ×4 : copie + sha256 avant modification → modification d'un seul point de code ou d'une seule valeur de fixture → `node scripts/juges-026-acquisition-preuve.mjs --lot=7` rejoué en entier (le vrai verifier de la fiche, jamais une commande approchante) → constat du rouge exact → restauration depuis la copie → sha256 recontrôlé identique → `verifier` rejoué, revenu PASS, avant de passer au sabotage suivant (jamais deux sabotages actifs en même temps).

## Sabotages et critères rougis

| # | Fichier | Point sabotage | Critère visé | Sabotage actif (`verifier --lot=7`) | Après restauration | sha256 (avant = après) |
|---|---|---|---|---|---|---|
| 1 | `scripts/maquette-video-qa.mjs` (l. 255) | `s.juger('MV-1', e1, …)` → `s.juger('MV-1X', e1, …)` (l'id du critère « module absent » ne correspond plus à celui attendu par le registre) | **JP-2** (et, en cascade, JP-5 : sans extrait valide côté JP-2, la ligne du tableau tombe dans la branche « aucun », détectée aussi par JP-5) | `❌ JP-2 maquette-video-qa sur la référence : premier critère « ❌ MV-1X module absent : … », « ❌ MV-1 … » attendu` ; `❌ JP-5 maquette-video-qa : l'extrait « (aucun : ❌ MV-1X module absent : …) » ne se retrouve pas dans la sortie » — `FAIL — JP-2, JP-5` (JP-3 resté vert) | `PASS` (JP-2, JP-3, JP-5 verts) | `c9f83e5c2045c112e449cb07426402fdc17bb944dbd8ba2df1904fdfbef91a8a` |
| 2 | `scripts/fixtures/026-acquisition/video/site-temoin/index.html` (l. 16) | `section { height: 640px; … }` → `height: 400px;` (5 sections × 400 px = 2000 px, sous le seuil de 3000 px exigé par AC-1) | **JP-3** (`maquette-video-qa --auto-controle`, AC-1) | `❌ JP-3 maquette-video-qa --auto-controle : code 1, ❌ AC-1 site-temoin : hauteur totale estimée 2000px (5 section(s) × 400px), 3000 au moins attendus` — `FAIL — JP-3` (JP-2 et JP-5 restés verts) | `PASS` | `738843d31b569ddffdba5fbdb41a75941fb9c7b40f86d34f1e427be6f36157ba` |
| 3 | `scripts/fixtures/026-acquisition/douleurs/pages/plombier-devis-soir.html` (l. 16) | `répond avant le lendemain matin.` → `répond avant le surlendemain matin.` (le texte servi par la page ne correspond plus mot pour mot à `CITATION_PLOMBIER` d'`entrees.mjs`) | **JP-3** (`douleurs-qa --auto-controle`, AC-4 — mécanisme différent du sabotage 2 : contenu d'une page servie, pas une valeur CSS ; juge différent, fichier différent) | `❌ JP-3 douleurs-qa --auto-controle : code 1, ❌ AC-4 plombier-devis-soir : citation non retrouvée sur /plombier-devis-soir.html (page lue)` — `FAIL — JP-3` (JP-2 et JP-5 restés verts) | `PASS` | `1304de9c0ff5ebb7b72751444a214a136ac9d53aa7f34eef70fb8046d456eef0` |
| 4 | `scripts/douleurs-qa.mjs` (l. 254) | `e1.push(\`module absent : ${rel(f)}\`)` → `e1.push('absent')` (message du critère DL-1 réduit à 14 signes, sous le seuil de 20 exigé par JP-5, sans changer l'id ni casser le préfixe que JP-2 vérifie) | **JP-5** (isolé — la fiche prouve ici que le seuil de 20 signes de JP-5 est réellement vérifié, indépendamment de JP-2) | `❌ JP-5 douleurs-qa : extrait de 13 signes (20 au moins)` — `FAIL — JP-5` (JP-2 resté vert : « ❌ DL-1 absent » commence toujours par « ❌ DL-1 », donc conforme au format que JP-2 contrôle, seule sa longueur y échoue) | `PASS` | `817dea9408a13af0d0c906db857f21b8d0da1495897c22e08ac76e52bd622d22` |

Chaque sabotage a rougi **exactement** le(s) critère(s) visé(s), sans faux rouge ailleurs : les trois lignes de `verifier --lot=7` (JP-2, JP-3, JP-5) réagissent chacune à un défaut réel introduit dans la production livrée par 026-071, ce qui exclut un juge muet ou un faux vert permanent. Les deux sabotages JP-3 (2 et 3) touchent délibérément deux mécanismes différents (une mesure géométrique déduite du CSS, un contenu textuel relu mot pour mot) sur les deux juges différents du lot, pour ne pas ne tester qu'une seule voie du critère.

## Vérification finale (verifier officiel de la fiche, après les 4 restaurations)

`node scripts/juges-026-acquisition-preuve.mjs --lot=7` :

```
juges-026-acquisition-preuve --lot=7 — fiche 026-071, 2 juge(s) au registre du lot
✅ JP-2 référence 86ce0f3 (reference.txt) réutilisée, identique blob pour blob sous .orchestre/travail/026-acquisition/reference (2648 fichiers), ancêtre de HEAD ; maquette-video-qa → code 1, « ❌ MV-1 module absent : .orchestre/travail/026-acquisition/r… » ; douleurs-qa → code 1, « ❌ DL-1 module absent : .orchestre/travail/026-acquisition/r… »
✅ JP-3 maquette-video-qa --auto-controle : code 0 (AC-1, AC-2, AC-3, AC-4) ; douleurs-qa --auto-controle : code 0 (AC-1, AC-2, AC-3, AC-4)
✅ JP-5 2 ligne(s) écrites dans .orchestre/preuves/026-071/echecs-attendus.md (section du lot 7), chaque extrait de 20 signes au moins relu et retrouvé dans la sortie produite ; sorties complètes sous .orchestre/travail/026-acquisition/sorties-lot-7
juges-026-acquisition-preuve --lot=7 : PASS
```

Identique au verdict d'origine (`verifier.log` : PASS, JP-2/JP-3/JP-5 verts, mêmes messages « module absent » sur la référence, mêmes ids MV-1/DL-1). `verifier.log` (la preuve d'origine, horodatée 13:56:07) n'a pas été réécrit par mes passages — seul `echecs-attendus.md` l'a été (comportement normal du script : il réécrit sa propre section « lot 7 » à chaque exécution, avec un nouvel horodatage mais le même contenu de fond, mêmes extraits, même verdict).

## Restauration bit à bit (sha256 des 9 fichiers du périmètre, avant campagne de sabotage vs après les 4 restaurations)

```
avant  c9f83e5c2045c112e449cb07426402fdc17bb944dbd8ba2df1904fdfbef91a8a *scripts/maquette-video-qa.mjs
après  c9f83e5c2045c112e449cb07426402fdc17bb944dbd8ba2df1904fdfbef91a8a *scripts/maquette-video-qa.mjs
avant  817dea9408a13af0d0c906db857f21b8d0da1495897c22e08ac76e52bd622d22 *scripts/douleurs-qa.mjs
après  817dea9408a13af0d0c906db857f21b8d0da1495897c22e08ac76e52bd622d22 *scripts/douleurs-qa.mjs
avant  38bd91da54dad132acfd7211a17056d0d793f38fbe301f1de69f6879584e5350 *scripts/juges-026-acquisition-preuve.mjs
après  38bd91da54dad132acfd7211a17056d0d793f38fbe301f1de69f6879584e5350 *scripts/juges-026-acquisition-preuve.mjs
avant  68b49e8f33f563f5ca68e79d1f7854560d471d5a1fed4e3b48867e795b8e799a *scripts/fixtures/026-acquisition/douleurs/entrees.mjs
après  68b49e8f33f563f5ca68e79d1f7854560d471d5a1fed4e3b48867e795b8e799a *scripts/fixtures/026-acquisition/douleurs/entrees.mjs
avant  0784f8942ea932e4b940d5fe3f5ebbd4310b7223190d54dc8dd91ea636a56aff *scripts/fixtures/026-acquisition/douleurs/pages/menuisier-visibilite.html
après  0784f8942ea932e4b940d5fe3f5ebbd4310b7223190d54dc8dd91ea636a56aff *scripts/fixtures/026-acquisition/douleurs/pages/menuisier-visibilite.html
avant  1304de9c0ff5ebb7b72751444a214a136ac9d53aa7f34eef70fb8046d456eef0 *scripts/fixtures/026-acquisition/douleurs/pages/plombier-devis-soir.html
après  1304de9c0ff5ebb7b72751444a214a136ac9d53aa7f34eef70fb8046d456eef0 *scripts/fixtures/026-acquisition/douleurs/pages/plombier-devis-soir.html
avant  21893c07f58e0d43b027a5105b900203f239dbcc6205e82b4360d10f998f376d *scripts/fixtures/026-acquisition/video/page-blanche/index.html
après  21893c07f58e0d43b027a5105b900203f239dbcc6205e82b4360d10f998f376d *scripts/fixtures/026-acquisition/video/page-blanche/index.html
avant  b3d93aea5f48f6df037d9704b9c75bb30ae1bad7d6fea10c740c5253c77809ce *scripts/fixtures/026-acquisition/video/page-courte/index.html
après  b3d93aea5f48f6df037d9704b9c75bb30ae1bad7d6fea10c740c5253c77809ce *scripts/fixtures/026-acquisition/video/page-courte/index.html
avant  738843d31b569ddffdba5fbdb41a75941fb9c7b40f86d34f1e427be6f36157ba *scripts/fixtures/026-acquisition/video/site-temoin/index.html
après  738843d31b569ddffdba5fbdb41a75941fb9c7b40f86d34f1e427be6f36157ba *scripts/fixtures/026-acquisition/video/site-temoin/index.html
```

`diff` entre le relevé d'avant campagne et le relevé d'après les 4 restaurations est **vide** : aucune des 9 lignes n'a changé — restauration confirmée pour les 4 fichiers touchés (sabotages 1 à 4) ET pour les 5 fichiers jamais touchés (`entrees.mjs`, `menuisier-visibilite.html`, `page-blanche/index.html`, `page-courte/index.html`, et le verifier lui-même `juges-026-acquisition-preuve.mjs`, jamais modifié — sha256 identique avant/après, confirmant aussi qu'aucun sabotage ne l'a touché par erreur).

`git status --short` sur le périmètre après la campagne : toujours exactement les 4 mêmes entrées `??` (fichiers non suivis, déposés par l'exécutant d'origine avant cette contre-vérification) et le même ` M` sur `scripts/juges-026-acquisition-preuve.mjs` (préexistant, jamais touché par moi) — rien de nouveau, rien en trop.

## Verdict de la contre-vérification

**VERT, confirmé.** La revue Codex n'a pas pu juger (code 3, quota de l'abonnement ChatGPT épuisé côté usine — sans rapport avec le contenu de 026-071 ; le témoin, lui, était vert) ; le repli par sabotage montre que les 3 critères réellement évalués par `verifier` (JP-2, JP-3, JP-5) sont tous chargés et discriminants : un id de critère qui ne correspond plus au registre, une mesure géométrique de fixture faussée, un contenu de page qui ne colle plus à la citation attendue, ou un extrait de preuve trop court font chacun rougir la bonne ligne, jamais une autre. Aucun juge n'ayant été corrigé après une clôture ou une revue externe (la seule itération FAIL→PASS a eu lieu avant toute clôture, dans la même séance de rédaction), les 2 sabotages supplémentaires prévus pour ce cas ne s'appliquent pas. Restauration octet pour octet vérifiée par sha256 sur les 9 fichiers du périmètre, aux 4 étapes, avec un témoin PASS entre chaque sabotage.
