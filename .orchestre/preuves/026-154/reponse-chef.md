# 026-154 — réponse du chef (Claude Code)

## Décision

**Option 1.** J'ai corrigé `scripts/pub-locale-qa.mjs --partie=textes` (branche sans `--dossier` ni `--temoin`) — pas
`scripts/pack-pub/textes.mjs`, qui est le tien et n'a besoin d'aucun changement.

## Pourquoi pas l'option 2

Autoriser un « autre vérificateur » aurait dupliqué ce que `pub-locale-qa.mjs` doit déjà faire (la fiche le dit : le
juge, écrit par Claude Code en 10, couvre `--partie=textes`) — et laissé le vrai bug en place pour la prochaine fiche
qui dépend de cette branche.

## Le bug, et le correctif (hors périmètre de 026-154, sous 026-126 qui a écrit ce juge)

`partieTextes()`, branche « racine réelle » (ni `--dossier` ni `--temoin` — c'est exactement ta commande `verifier`) :
le code faisait `for (const id of [...]) s.echoue(id, ... introuvable)` **sans jamais tester `fs.existsSync(script)`**.
Le commentaire au-dessus disait « n'existe pas encore (026-154) » — vrai au moment où 026-126 a écrit ce juge, mais
personne n'avait posé la condition pour que ça cesse d'être vrai une fois ton fichier écrit. Même principe qu'à
026-153 (`--partie=gabarit`, corrigé le 28/09) : un juge qui ne suit pas la réalité une fois la fiche qu'il attend
faite se corrige, sous la fiche qui l'a écrit.

Correctif : si `scripts/pack-pub/textes.mjs` n'existe pas, `PL-T1`…`PL-T7` échouent comme avant (comportement voulu
par `juges-026-pubs-contenu-preuve.mjs --lot=10` sur `--racine=<référence>`, où le script n'existe pas non plus —
testé, inchangé). S'il existe : le pack témoin (`TEMOIN_DIR/pack.json`) est recopié dans un dossier **neuf**
(`.orchestre/travail/pub-locale-qa/textes-reel/`) — jamais `TEMOIN_DIR` lui-même, dont `sortie/` est le témoin écrit
à la main par `fabriquer-temoin.mjs` que réutilise `--temoin` — puis ton script y est **vraiment exécuté** (`cwd:
racine`, donc son `--meta-logement` par défaut se résout sur le vrai `docs/pubs/meta-logement.json` de la racine
jugée), et le résultat vérifié par `verifierTextes` exactement comme `--dossier`. Code 3 (catégorie Logement non
vérifiée) reste une sortie légitime, pas un échec du juge.

## Essai avec ton patch

Appliqué dans une copie git worktree isolée (jamais dans le dépôt partagé) : `pub-locale-qa.mjs --partie=textes` →
**PASS 7/7** (PL-T1 à PL-T7), avec ton `scripts/pack-pub/textes.mjs` **inchangé**. `--partie=textes --temoin` et
`juges-026-pubs-contenu-preuve.mjs --lot=10` (gabarit + textes + complet, référence et témoin) rejoués en copie
isolée (`verifier-isole.sh 026-126`) : **PASS**, aucune régression. Commité sous **026-126** (`409f3d0e`).

## Un point que je n'ai PAS corrigé (hors sujet de ta question, à surveiller)

En testant au-delà de ton propre `verifier` (statuts `oui` et `non` du meta-logement, que ta fiche n'exerce pas
aujourd'hui puisque `docs/pubs/meta-logement.json` est encore `a_verifier`), j'ai trouvé que **PL-T4** (termes
interdits) confond le mot « RGE » avec la sous-chaîne qu'il forme dans « télécha**rge**ment » (la dernière phrase de
`fiche-10-min.md`, « le lien de téléchargement du pack expire dans 30 jours »). C'est une recherche de sous-chaîne
sans limite de mot dans `pub-locale-qa.mjs` (`bas.includes(terme.toLowerCase())`), pas un défaut de ton texte. Elle
ne bloque pas ton `verifier` aujourd'hui (`a_verifier` n'écrit pas la fiche), mais cassera le jour où Benj confirmera
`oui` ou `non` pour de vrai. Je ne l'ai pas corrigée ici (hors du périmètre de cette question, et un changement de
`termesInterdits` mérite une revue à part des autres termes courts de la liste) — à traiter avant ce jour-là.

## Pour la suite

Répondu `1` (`orchestre.mjs repondre 026-154 1`), libéré la fiche, nettoyé et relancé l'usine. À la reprise :
`resultat.patch` déjà déposé est inchangé et suffisant ; `verifier` doit passer au vert tel quel.
