# Contre-vérification 026-109 — 28/09/2026

**Verdict : VERT confirmé.**

## Moyen

Codex/usine écarté d'emblée, avant même un essai réel (pas seulement par principe d'efficacité comme
pour 026-107 le même jour, mais avec une preuve technique précise de l'inutilité de l'essai) :

- La fiche elle-même porte la note : « 28/09 : codex → claude-code. Le périmètre touche `../orchestre`
  (dépôt séparé, absent de l'usine) : le moteur ne pouvait que le refuser. »
- Lecture de `scripts/usine.mjs` (commande `executer`, utilisée par `revue-codex.mjs`) : sur l'usine, la
  commande tourne dans un worktree jetable créé à partir de `origin/main` **de presti** + le paquet
  (patch git construit depuis le dépôt presti uniquement, jamais en parcourant le disque). Il n'existe
  aucun mécanisme qui fasse exister `../orchestre` (dépôt frère, hors de presti) dans ce worktree.
- Essai à sec pour le vérifier concrètement, sans rien envoyer à l'usine ni consommer de Codex :
  ```
  node ../presti-ops/usine/revue-codex.mjs 026-109 --sabotages=4 --a-sec
  ```
  → `✓ à sec 026-109 : … verifier « node ../orchestre/test/preuve-026.mjs --groupe=baux », périmètre 3
  motif(s), juge ../orchestre/test/preuve-026.mjs ; coureur … → … écrits dans
  .orchestre/travail/revue-codex/026-109/` (fichiers laissés : `consigne.md`, `coureur.cjs`). Le `-a-sec`
  ne construit que le coureur/la consigne (contrôle de syntaxe), il ne teste pas l'empaquetage réel — mais
  le `verifier` qu'il aurait fait lancer sur l'usine (`node ../orchestre/test/preuve-026.mjs …`) appellerait
  un chemin qui n'existe pas dans le worktree de l'usine : échec immédiat au tout premier passage (témoin,
  passage n°0), donc un `125` (« pas jugé ») après avoir consommé jusqu'à 40 minutes et du Codex pour rien —
  exactement la cause déjà consignée dans la fiche.

Conclusion du moyen : lancer réellement `revue-codex.mjs` n'aurait rien pu apprendre de plus que ce que la
fiche dit déjà, pour un coût de ~40 min. Passage direct aux sabotages réversibles de la PRODUCTION
(`../orchestre`, jamais le juge `test/preuve-026.mjs`), avec le verifier exact de la fiche entre chaque coup :

```
node ../orchestre/test/preuve-026.mjs --groupe=baux
```

Avant tout sabotage : rejoué le verifier tel quel → PASS reproduit à l'identique (ORB-1 à ORB-9, ORB-NR
verts, « tous les groupes passent »), même sortie que `.orchestre/preuves/026-109/verifier.log`.

**Juge corrigé ?** Non — vérifié avant de sabotage : `git log --oneline -- test/preuve-026.mjs` dans
`../orchestre` ne montre qu'un seul commit (`a0235ef`, la création du juge pour la fiche 026-098, déjà
contre-vérifiée à l'époque avec 4 sabotages) ; `git status --porcelain` ne montre aucune modification de
`test/preuve-026.mjs` dans l'arbre de travail. Le juge du groupe `baux` n'a pas bougé depuis 026-098 : pas
de sabotages supplémentaires visant une correction du juge (la consigne n'en demande que si un juge a été
corrigé).

4 sabotages, chacun : (a) une seule modification ciblée dans `../orchestre/bin/orchestre.mjs`, (b) relance
du verifier exact, (c) lecture de la ligne ORB qui rougit, (d) restauration à l'octet (copie de sauvegarde
prise avant le premier sabotage, écrite hors du dépôt), (e) sha256 avant/après comparé, (f) relance du
verifier → vert entier retrouvé avant le sabotage suivant.

## Sabotages, critères rougis, restauration

| # | Fichier touché | Modification | Verifier | Restauré (sha256 identique) |
|---|---|---|---|---|
| 1 | `../orchestre/bin/orchestre.mjs:119` | `seuilBailMinutes()` : `CONFIG.maxMinutes * 2` → `* 200` (seuil 60 min → 6000 min) | **ORB-3** rouge (`reprise par ag-c : false`, verrou vieilli de 3h non repris) ; effet de bord attendu en cascade sur **ORB-5, ORB-6, ORB-7, ORB-9** (le scénario est séquentiel : sans reprise en ORB-3, les étapes suivantes n'ont plus l'état qu'elles attendent) | oui — `d06eaab2…90bfdc7` avant = après |
| 2 | `../orchestre/bin/orchestre.mjs:535` | dans `battement(id)` : `lock.battement = maintenant()` → `lock.dernier_battement = maintenant()` (mauvais nom de champ écrit dans le verrou) | **ORB-1** rouge (`champ battement: absent`), rien d'autre touché (ORB-2 à ORB-9 restent verts) | oui — même sha256 |
| 3 | `../orchestre/bin/orchestre.mjs:310` | dans `verifierDisjoncteurs()` : `failsFait.length >= 2` → `>= 20` (le volet « deux FAIL identiques » du disjoncteur n'y arrive plus jamais dans le scénario) | **ORB-6** rouge (`verdict DISJONCTÉE : false`) et **ORB-7** rouge en effet de bord (rien à rejouer, `001-test-echec` jamais disjonctée) | oui — même sha256 |
| 4 | `../orchestre/bin/orchestre.mjs:574` | candidat Attention pour une tâche DISJONCTÉE : retrait des deux accents graves autour de la commande (`corrige, puis \`${CMD} rejouer ${id} --forcer\`` → `corrige, puis ${CMD} rejouer ${id} --forcer`) | **ORB-8** rouge (`chaque ligne finit par une commande entre accents graves : false`) | oui — même sha256 |

Un 5ᵉ essai (non compté ci-dessus, documenté séparément) a d'abord ciblé la branche « rien à décider »
elle-même : `if (!attention.length) L.push(...)` → `if (attention.length > 999) L.push(...)` (ligne 639).
**Ce sabotage-là est resté vert** — rien n'a rougi. Restauré immédiatement (sha256 identique), puis
remplacé par le sabotage n°4 ci-dessus, qui lui rougit bien ORB-8. Voir « Défaut trouvé » plus bas :
ce n'est pas un défaut de 026-109, c'est un angle mort du juge.

Après le 4ᵉ sabotage (le bon) et sa restauration : `bin/orchestre.mjs`, `README.md`, `bin/executant.mjs`
et `bin/antigravity.mjs` ont un sha256 identique à celui relevé avant le premier sabotage :

```
d06eaab2138583cc6247c10ae91ea94abdccff7a0d072d5933b7e263a90bfdc7 *bin/orchestre.mjs
369bca331841631009f96fa5d2e35b7b63b6ce0062ca9b6ca1894c728fc263e3 *README.md
12b2736ea57c93a3eb6a5d26f2f7d1c9680e5ce99183ec4593fb965766b44e35 *bin/executant.mjs
abad84aac5c4ca94c1a153453035455775e2200783ad8eabb85311968b932141 *bin/antigravity.mjs
```

Relance finale du verifier exact : **PASS entier** (ORB-1 à ORB-9 + ORB-NR verts, « tous les groupes
passent »).

`git status --porcelain` dans `../orchestre` avant/après identique (`README.md` et `bin/orchestre.mjs`
modifiés, `bin/executant.mjs`/`bin/antigravity.mjs` non suivis — l'état laissé par l'exécutant d'origine,
jamais commité par moi) : aucune trace supplémentaire de mes sabotages, aucun fichier créé hors de
`.orchestre/preuves/026-109/`, `.orchestre/travail/revue-codex/026-109/` (consigne.md + coureur.cjs de
l'essai `--a-sec`) et d'un dossier de sauvegarde dans le scratchpad ; `../orchestre/test/**` jamais touché ;
aucune commande git exécutée par moi hormis `status`/`log` en lecture. Aucun dossier temporaire résiduel
créé par mes propres passages du verifier (`orchestre-026-baux-*` présents dans le TEMP viennent tous
d'avant le début de cette contre-vérification, horodatés entre 08:23 et 17:25 locales — mes 6 passages,
entre 17:39 et 17:45, n'en ont laissé aucun).

## Défaut trouvé — hors périmètre de 026-109, à signaler

Le 5ᵉ essai (ci-dessus) montre un angle mort du juge `test/preuve-026.mjs`, groupe `baux` : la vérification
du cas « n=0 → rien à décider » (ORB-8, ligne 311 du juge : `const rienADecider = n !== 0 ||
/rien à décider/.test(mAtt[2])`) est **vacuement vraie** dès que `n !== 0` — et dans le scénario du groupe
`baux`, au moment où `digest()` est appelé pour ORB-8, il existe toujours déjà une tâche DISJONCTÉE
(fabriquée par ORB-6 juste avant), donc `n` vaut 1 et cette branche du juge ne s'exécute jamais vraiment
pour de vrai. Une implémentation qui casserait spécifiquement le cas `n=0` (comme mon sabotage retiré)
passerait inaperçue du groupe `baux`. Ce n'est pas un défaut de 026-109 : `test/**` est explicitement dans
son `interdit`, et la lecture directe de `bin/orchestre.mjs:639` (`if (!attention.length) L.push(...)`)
montre une implémentation correcte et directe du cas `n=0`, jamais mise en doute par ailleurs. À signaler à
qui retouchera `test/preuve-026.mjs` : ORB-8 mériterait un passage à vide (aucune tâche DISJONCTÉE, aucun
verrou expiré, aucune question, aucune proposition en quarantaine, pas de sauvegarde vieille) pour
réellement éprouver `n=0`.

## Conclusion

VERT confirmé pour le verdict de `node ../orchestre/test/preuve-026.mjs --groupe=baux` sur 026-109 :
4 sabotages réversibles de la production ont chacun rougi le bon critère (ORB-3 en cascade, ORB-1, ORB-6/7,
ORB-8), chacun a été restauré à l'octet (sha256 identiques), et le témoin repasse entièrement au vert.
Codex/usine a été écarté avec une preuve technique (pas seulement un choix d'efficacité) : le worktree de
l'usine ne contient que le dépôt presti, jamais `../orchestre`, donc le verifier de la fiche y échoue par
construction — confirmé par un essai `--a-sec` qui ne coûte rien. Le juge `test/preuve-026.mjs` n'a pas été
corrigé depuis 026-098, donc pas de sabotages supplémentaires ciblant une correction. Un défaut réel mais
hors périmètre a été trouvé et signalé (angle mort du cas `n=0` dans ORB-8), sans remettre en cause le vert
de 026-109 lui-même.
