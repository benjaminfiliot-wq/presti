# Contre-vérification de 026-131 — 2026-09-28

Fiche : `.orchestre/fait/026-131.md` (statut annoncé : PRET_A_APPLIQUER, verifier PASS CG-1 à CG-5).
Contre-vérificateur : Claude (agent séparé de celui qui a produit la fiche).

## Moyen

1. Témoin n°0 : rejoué moi-même `node scripts/cgu-pack-pub-qa.mjs` avant tout sabotage → PASS sur les 5 critères (confirme `verifier.log` de la fiche, indépendamment).
2. D'abord Codex sur l'usine, comme demandé : `node ../presti-ops/usine/revue-codex.mjs 026-131 --sabotages=4` → **code 3 (QUOTA)** : « quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM. » Pas de `verdict.json` (pas jugé). Avant la coupure, le coureur avait déjà relevé 2 passages de sabotage faits par Codex (`.orchestre/travail/revue-codex/026-131/runs/2.log`, `runs/3.log`, `journal.json`), tous deux restés PASS.
3. Faute de verdict, sabotages faits moi-même : au moins 4 exigés, 7 faits (5 sur les critères du cahier du juge CG-1 à CG-5, + 2 en confirmation indépendante des 2 sabotages que Codex avait relevés avant sa coupure). Un seul à la fois : édition ciblée (outil Edit), `node scripts/cgu-pack-pub-qa.mjs` rejoué, sortie capturée, édition inverse exacte, `sha256sum app/cgu/page.tsx` comparé au témoin avant de passer au suivant. `git checkout`/`git restore` refusés par la permission de l'outil dans cette session : restauration par édition inverse uniquement, jamais par git.
4. Témoin final rejoué après la dernière restauration → PASS sur les 5 critères, sha256 identique au témoin de départ, `git status --short` ne montre que les fichiers du périmètre de 026-131.

Empreinte de référence, avant tout sabotage et après CHAQUE restauration (identique à chaque fois) :
`cb1356036f9e10211a1f0e600788bfbec6d9a648412335743880d582865d0756  app/cgu/page.tsx`

## Sabotages et critères rougis

| # | Cible | Modification (réversible) | Attendu | Obtenu | Restauré (sha256 identique) |
|---|---|---|---|---|---|
| 1 | CG-1 | titre « 3 ter. Le pack pubs locales » → « 3 ter. Le pack pub locale » (id="pubs" inchangé) | FAIL CG-1 seul | **FAIL CG-1** ; CG-2/3/4 PASS. CG-5 a aussi rougi ce passage-là, mais sur `node_modules/@types/trusted-types/index.d.ts` — flake d'environnement sans rapport avec le sabotage (voir plus bas) | oui |
| 2 | CG-2 | dans le bloc 3 bis (id="site") : « 48 h ouvrées » → « 24 h ouvrées » | FAIL CG-2 seul | **FAIL CG-2** seul ; CG-1/3/4/5 PASS | oui |
| 3 | CG-3 | suppression de la phrase « voix de synthèse […] Voix générée par IA » | FAIL CG-3 seul | **FAIL CG-3** seul (« Voix générée par IA » signalée manquante) ; CG-1/2/4/5 PASS | oui |
| 4 | CG-4 | ajout de « Presti est le meilleur choix pour les artisans. » | FAIL CG-4 seul | **FAIL CG-4** seul (mot « meilleur ») ; CG-1/2/3/5 PASS | oui |
| 5 | CG-5 | ligne `const _sabotageContreVerif0928: number = 'texte-pas-un-nombre'` (erreur TS réelle) | FAIL CG-5 seul | **FAIL CG-5** ; CG-1/2/3/4 PASS. `npm run typecheck` rejoué seul confirme l'erreur exacte : `app/cgu/page.tsx(14,7): error TS2322: Type 'string' is not assignable to type 'number'.` | oui |
| 6 (confirmation Codex n°2) | angle mort | « trois vidéos verticales de 15 secondes, trois visuels carrés » → « une vidéo verticale de 15 secondes, un visuel carré » | devrait rougir (le contenu du pack livré change) | **resté PASS sur les 5 critères** | oui |
| 7 (confirmation Codex n°3) | angle mort | « Aucune fabrication ne commence avant le paiement. » → « La fabrication peut commencer avant le paiement. » | devrait rougir (promesse inversée) | **resté PASS sur les 5 critères** | oui |

Chaque critère CG-1 à CG-5 a été rougi une fois, et une seule fois, par le sabotage qui le vise ; aucun n'est resté vert à tort sur son propre sabotage.

## Angle mort environnemental (à part — pas un défaut de 026-131)

Au sabotage 1 et lors d'une vérification intermédiaire, CG-5 a échoué avec `TS6053 : .next/types/app/api/controle/pilotage/route.ts introuvable`, sans rapport avec `app/cgu/page.tsx`. Cause : un autre processus régénère `.next/` en concurrence sur ce même poste partagé (16 tâches « en cours » dans `.orchestre/digest.md` au moment des essais — plusieurs sessions Claude Code, Codex et l'usine travaillent en parallèle sur ce dépôt). `npm run typecheck` rejoué seul, au calme, donne à chaque fois le bon résultat (vert au témoin, l'erreur exacte au sabotage 5). Rien à corriger dans 026-131.

## Défauts trouvés

1. **Mineur, hors périmètre de 026-131** — angle mort du juge `cgu-pack-pub-qa.mjs` (CG-3) : il ne vérifie que la présence de phrases fixes, pas les quantités livrées ni la négation exacte des engagements. Sabotages 6 et 7 le prouvent : changer « trois vidéos, trois visuels » en un seul de chaque, ou inverser « aucune fabrication avant le paiement » en son contraire, reste PASS. Le texte actuellement livré par 026-131 est correct sur ces deux points — ce n'est donc pas une erreur du contenu produit, mais un trou du filet de sécurité pour une régression future. Codex avait indépendamment trouvé le même trou avant sa coupure de quota (`runs/2.log`, `runs/3.log`).
2. **Mineur, hors périmètre de 026-131** — robustesse : CG-5 (`npm run typecheck`) peut rendre un faux résultat (erreur sur un fichier `.next/types/...` sans rapport) quand un autre processus régénère `.next/` au même moment sur le poste partagé. Pas un défaut de 026-131 ; à isoler si ce juge doit rester fiable pendant que plusieurs agents tournent en parallèle.
3. **Confirmé, déjà connu** — collision de titre : `app/cgu/page.tsx` contient bien deux `<h2>` intitulés « 3 ter » (id="retractation" et id="pubs"), déjà signalée par l'agent producteur dans `article-3-ter.txt`. Aucun juge ne l'interdit. Pas bloquant pour le vert de la fiche (le titre exact est imposé par `scripts/fixtures/026-pubs-contenu/contrat-pack.json`, hors périmètre de 026-131) ; reste un geste de Benj à trancher avant le push.

Aucun défaut bloquant ni majeur sur le périmètre strict de 026-131 (le texte livré et les critères CG-1 à CG-5 qui le jugent). Les points 1 et 2 sont des trous du filet de sécurité pour l'avenir, pas des erreurs dans ce qui a été livré aujourd'hui.

## sha256 restaurés

- Avant tout sabotage : `cb1356036f9e10211a1f0e600788bfbec6d9a648412335743880d582865d0756`
- Après restauration de CHACUN des 7 sabotages, vérifié avant de passer au suivant : `cb1356036f9e10211a1f0e600788bfbec6d9a648412335743880d582865d0756` (identique à chaque fois)
- Après le témoin final : `cb1356036f9e10211a1f0e600788bfbec6d9a648412335743880d582865d0756` ; `git status --short app/cgu/page.tsx .orchestre/preuves/026-131/ .orchestre/fait/026-131.md` ne montre que `M app/cgu/page.tsx` (le +11 lignes d'origine de la fiche, inchangé) et les fichiers de preuve déjà présents — rien hors périmètre.

## Conclusion

Le verdict PASS de 026-131 (CG-1 à CG-5) est confirmé de façon indépendante : chaque critère détecte bien la faute qui le concerne, une seule fois, sans effet de bord. Le texte livré correspond à la fiche. Les deux gestes de Benj restent entiers (choisir N jours, approuver le texte) ; rien de ce que j'ai trouvé ne les remplace ni ne change le texte proposé.
