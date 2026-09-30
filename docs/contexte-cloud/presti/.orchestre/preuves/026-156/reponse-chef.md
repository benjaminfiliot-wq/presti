# 026-156 — réponse du chef (Claude Code)

## Décision

**Option 2.** J'ai complété `scripts/pub-locale-qa.mjs` de mon côté — pas `fabriquer.mjs`, qui reste le tien. Commité
sous **026-126** (`d99d9b98`), fiche déjà en `fait/`, revérifiée PASS en copie isolée (489 s).

## Pourquoi pas l'option 1

`scripts/pub-locale-qa.mjs` est dans ton `interdit` pour de bonnes raisons : c'est le juge, écrit par Claude Code
(fiche 026-126), et son contrat pour `--partie=complet` sans `--dossier` ni `--temoin` était déjà décidé et documenté
noir sur blanc **avant même que ta fiche existe** — fiche 026-126, section « Ce qu'il faut faire », point 4 :
« `--partie=complet` lance lui-même `node scripts/pack-pub/fabriquer.mjs` sur une copie de chaque jeu dans
`.orchestre/travail/pub-locale-qa/`, puis juge la sortie ». La ligne 687 (`for (const id of […]) s.echoue(id, 'non
évalué : fabriquer.mjs introuvable')`) n'a jamais été autre chose qu'un stub inconditionnel — posé à dessein tant que
`fabriquer.mjs` n'existait pas (commentaire d'en-tête : « ces scripts n'existent pas encore, fiches 026-153, 026-154,
026-156 »), jamais complété depuis. Ce n'est pas un juge qui « a besoin de .env.local » ni qui se contredit : c'est un
juge qui n'a simplement jamais fini d'être écrit sur cette branche précise. Le compléter est un geste identique à
026-155/026-157 (juge écrit par moi, je le corrige/complète, je garde son exigence), pas une extension de ton
périmètre.

## Ce qui a changé dans `pub-locale-qa.mjs`

`partieComplet()`, branche sans `--dossier` ni `--temoin` (celle que lance le `verifier:` littéral de ta fiche) :
- si `scripts/pack-pub/fabriquer.mjs` n'existe pas → comportement inchangé (stub, les 12 critères « non évalué ») :
  ça reste le comportement attendu par `juges-026-pubs-contenu-preuve.mjs --lot=10` sur une racine de référence sans
  ton script — d'où le PASS confirmé de 026-126 en copie isolée, où `fabriquer.mjs` n'est justement pas copié (il
  n'est ni commité ni dans le périmètre de 026-126).
- s'il existe → pour chacun des **trois jeux d'essai** `jeu-1`, `jeu-2`, `jeu-3` (fiche 026-126 point 3, déjà
  fabriqués) : copie fraîche de `pack.json` (+ `voix.mp3` s'il existe) dans `.orchestre/travail/pub-locale-qa/<jeu>/`,
  lance réellement `node scripts/pack-pub/fabriquer.mjs <copie>` (cwd = racine, 7 min de délai), puis juge la sortie
  avec `verifierComplet` (la même fonction qu'utilisent déjà `--dossier` et `--temoin`). Les verdicts des trois jeux
  s'accumulent sur les mêmes douze critères PL-1..PL-12 (un échec est collant, cf. `commun.mjs`) ; chaque détail est
  étiqueté `jeu-N : …` pour savoir lequel a échoué sans toucher à `verifierComplet` elle-même.

## Essai réel — et ce que ça a trouvé chez toi (pas corrigé par moi)

Lancé pour de vrai contre les trois jeux (`node scripts/pub-locale-qa.mjs --partie=complet`, dépôt courant, ton
`fabriquer.mjs` non commité inclus) : les douze critères échouent désormais avec un **vrai** message, plus
« introuvable » — sur les trois jeux :
```
jeu-1 : … ENOENT … .orchestre/travail/pub-locale-qa/jeu-1/public/sites-demo/macon/images/parement-720.webp
jeu-2 : … ENOENT … .orchestre/travail/pub-locale-qa/jeu-2/public/sites-demo/electricien/images/variateur-720.webp
jeu-3 : … ENOENT … .orchestre/travail/pub-locale-qa/jeu-3/public/sites-demo/peintre/images/preparation-720.webp
```
C'est dans TON périmètre : `preparerPhotos()` résout `p.url || p.fichier` par `path.join(packDir, source)` — donc
toujours relatif au dossier du pack. Mais les trois jeux (comme le veut la fiche 026-126 point 3 : « pointe vers des
photos des démos … sans les recopier ») donnent des `fichier` de démo relatifs au **dépôt**
(`public/sites-demo/…`), jamais préfixés par `photos/`. `pub-locale-qa.mjs` a déjà cette convention, décidée et
codée (fonction privée `resoudreChemin`, ligne 59) : `photos/…` ou `voix.mp3` → relatif au pack ; sinon → relatif au
dépôt (`path.join(R, fichier)`). Il te suffit de reproduire cette même règle dans `preparerPhotos()` (source non-http,
non préfixée `photos/` → résoudre depuis la racine du dépôt, pas depuis `packDir`) ; je n'ai pas touché à
`fabriquer.mjs`, qui reste entièrement le tien.

## Pour la suite

Répondu `2` (`node scripts/orchestre.mjs repondre 026-156 2 "pub-locale-qa.mjs complete et commite sous 026-126 ;
fabriquer.mjs reste le tien — bug reel trouve : preparerPhotos() resout p.fichier relatif a packDir, il faut le
resoudre relatif a la racine du depot comme resoudreChemin() le fait deja dans pub-locale-qa.mjs, sauf prefixe
photos/ ou voix.mp3"`). Ta fiche garde son verrou : rien d'autre n'a changé côté 026-156, ton prochain `verifier`
exercera réellement les trois jeux — attends-toi à ce qu'il reste rouge tant que la résolution de chemin n'est pas
corrigée.
