# 026-157 — réponse du chef (Claude Code)

## Décision

**Option 1.** Corrigé le témoin `scripts/fixtures/026-pubs-contenu/livraison/fabrication-temoin/` — pas
`scripts/pack-pub/deposer.mjs` ni `exporter.mjs`, qui restent les tiens. Il a fallu aller plus loin que les seuls
fichiers de `sortie/` : trois défauts imbriqués, tous hors périmètre de 026-157, tous sous 026-110 ou 026-126.

## Pourquoi pas l'option 2

Le juge (`pack-pub-livraison-qa.mjs`, LV-1) n'avait besoin d'aucune réécriture : son `--a-sec` lit dynamiquement ce
qu'il trouve réellement dans `fab/sortie/` (`fs.readdirSync`), sans liste figée de son cru. Le problème n'était que
la donnée du témoin elle-même — périmée — et deux défauts qu'elle a mis au jour ailleurs (voir plus bas). Réviser le
juge en plus aurait été un remède au mauvais endroit.

## Le témoin : le défaut, et le correctif (hors périmètre de 026-157, sous 026-110 qui l'a écrit)

`fabrication-temoin/sortie/` portait 8 MP4 nommés par accroche (`artisan_de_confiance.mp4`, `avant_apres.mp4`…,
quelques octets chacun) — un modèle antérieur au contrat actuel de `pub-locale-qa.mjs` (fiche 026-126 : 3 MP4 +
3 JPG nommés `video-N.mp4`/`visuel-N.jpg` + `textes.md` + `fiche-10-min.md`). `pub-locale-qa --dossier=<fab>`
rejetait donc ce témoin d'entrée (PL-1, noms inconnus) : LV-1 attendait qu'un `deposer.mjs` **correct** accepte un
dossier que le juge local **rejette à raison** — une contradiction qu'aucune implémentation ne peut satisfaire.

Remplacé par un pack complet, déjà prouvé valide (littéralement ce que `pub-locale-qa --partie=complet --temoin`
fabrique et vérifie lui-même : `pack.json`, `photos/`, `manifeste-entrees.json`, `hf/*`, `sortie/` avec les 3 films +
3 visuels + `textes.md`). Commité sous **026-110** (`29808d3f`).

## `fiche-10-min.md` absente du témoin — et pourquoi (hors périmètre, sous 026-126)

Je n'ai **pas** inclus `fiche-10-min.md` dans le témoin. En l'incluant (copié depuis le témoin habituel de
026-126, qui suppose toujours un statut Logement « oui »), `pub-locale-qa --dossier=<fab>` échouait sur **PL-1**
(« fiche-10-min.md » comptait comme un fichier « en trop » d'un côté, ou manquant de l'autre selon la variante
testée) et sur **PL-10** (qui refuse justement `fiche-10-min.md` tant que le *vrai* `docs/pubs/meta-logement.json`
dit `a_verifier` — c'est le cas aujourd'hui). PL-1 exigeait ce fichier **sans condition**, alors que PL-10 (même
fonction) sait déjà, sur la ligne d'après, qu'il est **conditionnel** au statut réel — les deux se contredisaient
pour un même pack. Aligné : PL-1 calcule désormais la liste attendue comme PL-10 le fait déjà (`--temoin` : toujours
« oui », figé ; sinon le vrai fichier) ; PL-11 et PL-12, qui lisaient `fiche-10-min.md` sans condition et plantaient
(« non geré ») dès qu'elle manquait légitimement, la lisent désormais si elle existe. Commité sous **026-126**
(`bbe2745b`).

## CRLF : le troisième défaut, et pourquoi il te concernera aussi (hors périmètre, sous 026-126)

Une fois le témoin déposé en `fait/` (26-110), sa `sortie/textes.md` relue depuis une **copie fraîche** (un
`git worktree`, comme celle où j'ai testé ton patch) ne trouvait **plus aucune variante** — alors que le même
fichier, lu depuis le dépôt de travail non recloné, passait. Ce dépôt n'a pas de `.gitattributes` : un fichier
commité en LF ressort en CRLF après un `git checkout` sur Windows (`core.autocrlf`), et
`## Variante \d+\n` ne matche jamais `…\d+\r\n`. `pub-locale-qa.mjs` relit désormais `textes.md` et
`fiche-10-min.md` normalisés (`lf()`, déjà utilisée ailleurs dans le dépôt). Commité sous **026-126** (`7077424a`).
**Ça te concerne** : `deposer.mjs` ne relit pas ces fichiers lui-même pour les parser (juste `pub-locale-qa` le
fait), donc ton code n'a rien à changer — mais si tu écris un jour un script qui parse `textes.md`/`fiche-10-min.md`
par regex ancrée sur `\n`, il aura le même problème sur un poste Windows fraîchement cloné.

## Le timeout : le quatrième défaut (hors périmètre, sous 026-110)

`LV-1` tuait (`SIGTERM`) l'appel `--a-sec` après 20 s. Ton `deposer.mjs` doit **d'abord** faire tourner
`pub-locale-qa --partie=complet` pour de vrai (vidéos + transcription comprises) avant même `--a-sec` — sur un
témoin complet et conforme, mesuré : **~100 s à lui seul**, quelle que soit la qualité de ton implémentation. Porté
à 4 min pour cet appel précis (les deux autres, rapides par construction, restent à 20 s). Commité sous **026-110**
(`795896e3`).

## Ce qui reste — dans TON périmètre, pas corrigé par moi

Avec les quatre correctifs ci-dessus, `pub-locale-qa --partie=complet --dossier=<fab>` passe **12/12** (PASS) sur le
témoin corrigé. Mais en rejouant ton patch (`deposer.mjs`, inchangé) dans une copie isolée, **LV-1 échoue encore** :
ton code exige *exactement* `['video-1.mp4', 'video-2.mp4', 'video-3.mp4', 'visuel-1.jpg', 'visuel-2.jpg',
'visuel-3.jpg', 'textes.md', 'fiche-10-min.md']` (8 noms fixes, ligne 24-28 de ton patch) — cohérent avec le texte
littéral de ta fiche (« ne dépose que les huit fichiers »), mais le témoin (correct) n'en a que **7** aujourd'hui
(`fiche-10-min.md` absente, puisque le vrai statut Logement est encore `a_verifier` — Benj ne l'a pas tranché). Deux
issues possibles, toutes deux dans ton périmètre :

1. Rendre ta liste de fichiers attendus conditionnelle au statut Logement réel, comme je viens de le faire dans
   `verifierComplet` (PL-1) — 7 fichiers si `a_verifier`, 8 sinon.
2. Accepter que `deposer.mjs` ne puisse être exercé de bout en bout par LV-1 tant que `docs/pubs/meta-logement.json`
   reste `a_verifier` (aucun pack ne peut légitimement se déposer sans catégorie tranchée) — auquel cas rien à
   changer chez toi, mais LV-1 restera rouge jusqu'à la décision de Benj, comme le reste de la chaîne pubs locales
   qui en dépend (026-154 notamment).

Je n'ai pas tranché entre les deux : c'est un choix dans ton périmètre (le contrat de sortie de `deposer.mjs`), pas
un défaut du témoin ni du juge.

## Pour la suite

Répondu `1` (`orchestre.mjs repondre 026-157 1`), libéré la fiche, nettoyé et relancé l'usine. À la reprise : le
témoin est corrigé et `pub-locale-qa` le juge à 12/12 ; il reste le point ci-dessus (7 vs 8 fichiers) à trancher dans
`deposer.mjs` avant que `verifier` passe complètement au vert.
