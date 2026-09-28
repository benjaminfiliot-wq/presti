# Contre-vérification 026-107 — 28/09/2026

**Verdict : VERT confirmé.**

## Moyen

Codex/usine écarté d'emblée (le paquet aurait exigé ~40 min pour un résultat que la méthode directe
donne en quelques minutes, avec une preuve plus forte : sha256 avant/après au lieu d'un verdict texte
de Codex) : sabotages réversibles faits moi-même, directement sur la PRODUCTION (le dépôt `../orchestre`,
jamais le juge `test/preuve-026.mjs`), avec le verifier exact de la fiche entre chaque coup :

```
node ../orchestre/test/preuve-026.mjs --groupe=source
```

Avant tout sabotage : rejoué le verifier tel quel → PASS reproduit à l'identique (ORS-1→8, ORS-NR verts).
Puis relu le code produit (pas seulement re-exécuté le juge) : diff `bin/orchestre.mjs` et `README.md`
dans `../orchestre` contre HEAD, contenu de `bin/executant.mjs`/`bin/antigravity.mjs`, comparaison
octet à octet avec les copies de presti (`scripts/*.mjs`) — tout identique avant même le premier sabotage,
ce qui confirme indépendamment ORS-2/ORS-8 (« identique ») sans dépendre du juge.

4 sabotages, chacun : (a) une seule modification ciblée dans `../orchestre/bin/`, (b) relance du verifier
exact, (c) lecture de la ligne ORS qui rougit, (d) restauration à l'octet (Edit inverse), (e) sha256 avant/
après comparé, (f) relance du verifier → vert entier retrouvé.

## Sabotages, critères rougis, restauration

| # | Fichier touché | Modification | Verifier | Restauré (sha256 identique) |
|---|---|---|---|---|
| 1 | `../orchestre/bin/executant.mjs` | `modele: 'gpt-6-sol'` → `'gpt-6-nova'` (ligne 46) | **ORS-5** rouge (`défaut gpt-6-sol dans l'argv : false`) ; effet de bord attendu sur ORS-8 (`executant.mjs identique : false`, non synchronisé côté presti) | oui — `12b2736e…6b44e35` avant = après |
| 2 | `../orchestre/bin/orchestre.mjs` | `DEFAUTS.executants` : réintroduction de `'gemini-cli'` (ligne 51) | **ORS-8** rouge (`défaut […,"gemini-cli"] (attendu […])`, `orchestre.mjs identique : false`) | oui — `534769…c67aaf` avant = après |
| 3 | `../orchestre/bin/antigravity.mjs` | ajout du mot interdit `presti` dans le commentaire d'en-tête (ligne 1) | **ORS-3** rouge (`contenu sans presti/'SaaS'/Documents : false`) ; effet de bord attendu sur ORS-8 (`antigravity.mjs identique : false`) | oui — `abad84a…b932141` avant = après |
| 4 | `../orchestre/bin/antigravity.mjs` | `process.exit(1)` → `process.exit(0)` dans le refus « sans git » de `lancer()` (ligne 219) | **ORS-6** rouge (`sans-git : code 0, « instantané impossible » non`) ; effet de bord attendu sur ORS-8 (`antigravity.mjs identique : false`) | oui — même sha256 qu'au sabotage 3 (fichier revenu à l'état d'origine) |

Après le 4ᵉ sabotage et sa restauration : les 4 fichiers touchés (`bin/executant.mjs`, `bin/antigravity.mjs`,
`bin/orchestre.mjs`, `README.md` — ce dernier jamais modifié par moi) ont un sha256 identique à celui
relevé avant le premier sabotage. Relance finale du verifier exact : **PASS entier** (ORS-1 à ORS-8 + ORS-NR
verts, « tous les groupes passent »), donc le témoin est bien revenu au vert après restauration.

`git status` dans `../orchestre` avant/après : inchangé (`README.md` et `bin/orchestre.mjs` modifiés,
`bin/executant.mjs`/`bin/antigravity.mjs` non suivis — c'est l'état laissé par l'exécutant d'origine,
« jamais commité par moi » ; aucune trace supplémentaire de mes 4 sabotages, aucun fichier créé hors
`.orchestre/preuves/026-107/`, `../orchestre/test/**` jamais touché, aucune commande git exécutée par moi
hormis `status`/`diff`/`log` en lecture.

## Ce que je confirme en plus du verifier

- Contenu réellement conforme au périmètre demandé, pas seulement au juge : `MOTEURS` de `executant.mjs`
  ne contient que la clé `codex` (plus de `qwen`/`gemini`) ; `DEFAUTS.executants` = `['antigravity','codex','claude-code']`
  dans la source **et** dans `.orchestre/orchestre.json` de presti (`gemini`/`qwen` absents des deux) ;
  `maj()` de `bin/orchestre.mjs` a bien les deux nouvelles paires `bin/executant.mjs`→`scripts/executant.mjs`
  et `bin/antigravity.mjs`→`scripts/antigravity.mjs` ; `init()` copie aussi les deux pilotes quand ils
  existent dans `bin/` ; `README.md` décrit les deux pilotes et la ligne `maj` mise à jour (fait, §7 de la fiche).
- `nomProjet()` alimente le préfixe de l'index temporaire d'`instantane()` (`${nomProjet()}-instantane-…`)
  et le `PROMPT`/`PROMPT_DUO` : plus de référence à `plans/cerveau-site.md`.
- Aucun répertoire temporaire `orchestre-026-src-*` résiduel après mes 6 passages du verifier (0 trouvé).

## Défaut trouvé — hors verdict du verifier, à signaler

Le point 8 de « C'est fini quand » (« Claude Code relit le diff … puis il commite dans le dépôt orchestre »)
n'est **pas fait** : `../orchestre` a toujours `README.md`/`bin/orchestre.mjs` modifiés et `bin/executant.mjs`/
`bin/antigravity.mjs` non suivis, non commités. Le verifier de 026-107 ne teste pas l'état git (il compare
des octets sur disque), donc ça ne rend pas le PASS faux — mais la fiche n'est pas intégralement terminée
au sens de son propre « C'est fini quand ». Je n'ai pas commité à sa place : ce n'était pas dans le périmètre
de la contre-vérification demandée, et un commit est un geste qui mérite sa propre relecture de diff, pas
un sous-produit d'un contrôle de sabotages.

## Conclusion

VERT confirmé pour le verdict de `node ../orchestre/test/preuve-026.mjs --groupe=source` sur 026-107 :
4 sabotages réversibles de la production ont chacun rougi le bon critère (ORS-5, ORS-8, ORS-3, ORS-6),
chacun a été restauré à l'octet (sha256 identiques), et le témoin repasse entièrement au vert. Le contenu
produit correspond au périmètre demandé (généralisation sans `presti`/`'SaaS'`/`Documents`, exécutants
fantômes retirés partout, deux pilotes recopiés par `maj`). Seul point ouvert, hors verdict : le commit
dans `../orchestre` reste à faire.

## Additif — deuxième passe indépendante, même jour, après 13:32

Rejoué à nouveau, à froid, dans une session distincte : `node ../orchestre/test/preuve-026.mjs --groupe=source`.

**Résultat : ✗ ORS-8 rouge** — `orchestre.mjs identique : false` (tout le reste, ORS-1 à ORS-7 et ORS-NR,
toujours vert). Avant de conclure à une régression de 026-107, vérifié la cause :

- `sha256sum` de `../orchestre/bin/orchestre.mjs` : `7f44973b…d2b427`, mtime 15:07 — différent du sha256
  `534769…c67aaf` relevé dans le tableau ci-dessus (qui était la valeur *avant* comme *après* le sabotage 2).
- `sha256sum` de `presti/scripts/orchestre.mjs` : toujours `534769…c67aaf`, mtime 12:56 — **inchangé** depuis
  avant 13:32, donc pas touché par moi ni par personne côté presti.
- `diff` entre les deux : une seule ligne ajoutée côté source, `bailMinutes: null,` dans `DEFAUTS`.
- Origine trouvée : `.orchestre/en-cours/026-109.md` (encore en-cours, pas dans `fait/`) a explicitement
  `../orchestre/bin/orchestre.mjs` dans son **périmètre** (« baux qui expirent … la clé `bailMinutes` ») et
  026-107 l'a explicitement dans son **interdit** implicite de contexte (« pas d'expiration des verrous
  (fiche 07) »). `git log -3 -- bin/orchestre.mjs` ne montre aucun commit après `faaef0d` : c'est du travail
  non commité de 026-109, en cours, sur le même fichier source partagé.

**Conclusion de l'additif : ce n'est pas un défaut de 026-107.** C'est un exécutant concurrent (026-109,
toujours en-cours) qui modifie `../orchestre/bin/orchestre.mjs` sans avoir encore relancé `maj` côté presti —
cohérent avec la fiche mémoire « sessions concurrentes ». Le verdict VERT de 026-107 lui-même reste valide :
tous les fichiers que 026-107 a effectivement produits/modifiés (`bin/executant.mjs`, `bin/antigravity.mjs`)
ont un sha256 **inchangé** par rapport aux valeurs « restaurées » du tableau ci-dessus, recalculé indépendamment
dans cette deuxième passe (`12b2736e…b44e35` et `abad84a…b932141`) — confirmation, sans rejouer les sabotages,
qu'aucune trace résiduelle ne subsiste.

**Défaut à signaler, réel mais hors périmètre de 026-107** : le `verifier` de 026-107, tel quel, n'est pas
stable dans le temps une fois la fiche passée en `fait/` — il recompare toujours `bin/orchestre.mjs` à
`scripts/orchestre.mjs`, donc tout exécutant qui touche `bin/orchestre.mjs` pour une autre fiche (ex. 026-109)
fait rougir 026-107 tant que `maj` n'a pas été relancé côté presti, sans que 026-107 soit en cause. Personne
ne le remarque sauf à relancer le verifier par hasard, comme ici. À signaler à qui termine 026-109 : relancer
`node scripts/orchestre.mjs maj` dans presti avant de considérer un « fait » qui dépend de `bin/orchestre.mjs`
comme fiable.
