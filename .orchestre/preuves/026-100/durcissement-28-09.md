# 026-100 — durcissement du 28/09 (mission « juges à durcir »)

Suite de `.orchestre/preuves/026-100/contre-verif-28-09.md` (verdict : « le résultat n'est pas celui attendu : la
fiche ne rejoue plus PASS en ce moment »). **Comme pour 026-070, le défaut trouvé ici ne visait pas le juge**
(`scripts/livrer-site-qa.mjs`, critère CH-6) : le juge fonctionnait déjà correctement et rendait rouge, à raison, sur
l'état réel du dépôt. Le défaut visait la **production** (`scripts/livrer-site.mjs`, ligne 134), régressée après la
preuve PASS enregistrée. Correction faite ici, sur la production uniquement — le juge n'a pas été modifié.

## 1. Constat de la contre-vérification

`scripts/livrer-site.mjs:134` :

```js
if (exporte.code) { issue = exporte.code === 4 ? 3 : 1; throw new Error('Export échoué') }
```

`scripts/commande-exporter.mjs` ne rend jamais le code 4 (seulement 0, 2 ou 3 — chaque `refuser(code, …)` du fichier
vérifié : lignes 115, 117, 119, 165, toutes en 2 ou 3). Le cas « dossier incomplet » (code 3, exactement celui que
CH-6 exerce) retombait donc toujours sur `issue = 1` au lieu du `3` promis par la fiche et attendu par CH-6 :

```
❌ CH-6 code 1, 3 attendu — export : code 3 | Export échoué
livrer-site-qa : FAIL — CH-6
```

Diagnostic temporel (mtime) de la contre-vérification : la preuve PASS date de `13:58:10Z`, mais
`scripts/livrer-site.mjs` avait un mtime de `14:35:30Z` (~37 min plus tard) — une régression est survenue après la
preuve, par une autre session (« la fiche a été déplacée en `fait/` par une session manuelle, hors moteur »). Le
juge (`scripts/livrer-site-qa.mjs`), lui, n'a pas bougé depuis le 27/09 (`git status --porcelain` vide, aucun commit
depuis) : **ce n'est pas un défaut du juge**.

sha256 de `scripts/livrer-site.mjs` à l'état trouvé (bogué, celui que la contre-vérification a laissé intact) :
`139b4c0e00b1801f1372d1bb935fee6a1db290f1cc8bd90d0716e6a7ab46398a`.

## 2. Correction

```diff
- if (exporte.code) { issue = exporte.code === 4 ? 3 : 1; throw new Error('Export échoué') }
+ if (exporte.code) { issue = exporte.code === 3 ? 3 : 1; throw new Error('Export échoué') } // commande-exporter.mjs ne rend jamais 4 (0/2/3), CH-6 attend 3 pour « dossier incomplet »
```

Le motif `redige.code === 3 ? 3 : 1` (ligne 139, juste en dessous, pour l'étape de rédaction) suit déjà exactement ce
schéma pour son propre sous-processus — la ligne 134 avait manifestement le mauvais chiffre (4 au lieu de 3), une
faute de frappe entre les deux codes de sortie possibles de l'exporteur (2 = usage, 3 = dossier incomplet).

## 3. Rejeu du verifier — PASS confirmé

```
$ node --import ./scripts/ts-loader.mjs scripts/livrer-site-qa.mjs --seulement=CH-6
✅ CH-6 dossier sans prestation → code 3 venu de l'exporteur, le journal s'arrête à l'export, aucun site généré
✅ CH-PV 3 fichier(s) dans .orchestre/preuves/026-100, aucun de 0 octet
livrer-site-qa : PASS

$ node scripts/orchestre.mjs verifier 026-100
✓ 026-100 : PASS · 169s
```

Sortie complète (celle qui fait foi) : `.orchestre/preuves/026-100/verifier.log`.

## 4. Le juge n'a pas eu besoin d'être durci

`scripts/livrer-site-qa.mjs` (CH-6) détectait déjà correctement la régression — c'est lui qui a donné le signal
exploité par la contre-vérification, sur le PC ET sur l'usine (deux environnements indépendants, même verdict).
Aucun sabotage ni preuve supplémentaire sur le juge n'est donc nécessaire pour cette fiche.

## 5. Ce qui reste hors de ce durcissement

La campagne de sabotage de la contre-vérification (11 critères encore verts, protocole imposé pour un code 3 Codex)
n'a soulevé aucun autre défaut nécessitant correction : c'est un rapport de conformité du reste du fichier, pas une
liste de défauts supplémentaires.
