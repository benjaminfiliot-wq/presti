# 026-012 — témoin du lot a régénéré (neuf motifs), suite de rejoue-apres-durcissement-026-051-28-09.md

Suite de `rejoue-apres-durcissement-026-051-28-09.md` : ce fichier diagnostiquait JA-7/JA-9 rouges sur `--lot=a` parce que
le témoin de `pilotage-push-qa` (`scripts/fixtures/026-pilotage/a/temoin/lib/pilotage/notifications.ts.temoin`), posé le
27/09 avec les six motifs d'origine, ne suivait plus le durcissement de PF-2/PF-3/PF-8 du 28/09 (neuf motifs, commit
`98bd78c9` pour 026-051). Diagnostic confirmé : ni le juge ni la production 026-051 n'étaient en cause.

## Ce qui a changé

Seul `scripts/fixtures/026-pilotage/a/temoin/lib/pilotage/notifications.ts.temoin` est réécrit. `lib/push.ts.temoin` et
`lib/alertes.ts.temoin` n'ont pas bougé : leur logique (appel générique à `chargeFondateur`) ne dépend pas du nombre de
motifs, et rien ne les signalait rouges dans le rejeu du 28/09.

Le nouveau témoin porte les neuf motifs de `lib/pilotage/notifications.ts` de HEAD (titre, ligne, bloc et `renotify` de
chaque motif recopiés du fichier de production par un petit script, pour exclure toute faute de frappe sur les accents —
`Quelqu'un`, `Argent bloqué`, `Canal arrêté`… — que PF-2 compare mot pour mot). Seul changement structurel : l'ordre du
tableau `MOTIFS_POUSSES` place `coupe_circuit` et `digest` en dernier (l'ordre ne compte pas pour le juge, qui compare
trié), pour que le sabotage `motifs-sans-digest` de `a/lot.mjs` — qui retire littéralement le texte
`'coupe_circuit', 'digest'] as const` — continue de trouver ce texte exactement une fois. Vérifié avant le rejeu : les
quatre textes de sabotage du juge PF (`motifs-sans-digest`, `aucun-fondateur-muet`, `demo-comprise`, `push-attendu`)
figurent chacun exactement une fois dans leur fichier témoin.

## Rejeu

```
$ node scripts/juges-026-pilotage-preuve.mjs --lot=a
juges-026-pilotage-preuve --lot=a : FAIL — JA-5
```

✅ JA-1 à JA-4, ✅ JA-6 à JA-10 — en particulier :
- **JA-7** (témoin vert) : `pilotage-push-qa` → code 0, 10 critères verts, aucun rouge (PF-1 à PF-10, y compris PF-10
  `tsc --noEmit`) ; les trois autres juges du lot restent verts aussi.
- **JA-8** (sabotages) : les 4 sabotages de `pilotage-push-qa` tuent chacun leur critère attendu et rien d'autre
  d'inattendu (`motifs-sans-digest` → ❌ PF-2, `aucun-fondateur-muet` → ❌ PF-4, `demo-comprise` → ❌ PF-5,
  `push-attendu` → ❌ PF-7), témoin rétabli octet pour octet.
- **JA-9** (substance) : 10 critères verts distincts sur le témoin de `pilotage-push-qa` (≥ 10 exigé), 36066 octets de
  code (≥ 1500).

❌ **JA-5** (rien n'a bougé hors `.orchestre/travail/` et `.orchestre/preuves/`) est un faux rouge de contexte, comme
dans le rejeu du 27/09 : le rejeu dure environ 9 minutes et d'autres sessions committent en parallèle sur ce dépôt
partagé. Les chemins listés par JA-5 (`.orchestre/contexte.md`, `.orchestre/digest.md`, `.orchestre/fait/026-074.md`,
`.orchestre/verdicts.jsonl`, `app/api/controle/pilotage/*/route.ts`…) sont tous hors du périmètre de 026-012
(`scripts/pilotage-logique-qa.mjs`, `scripts/pilotage-push-qa.mjs`, `scripts/juges-026-pilotage-preuve.mjs`,
`scripts/fixtures/026-pilotage/a/**`, `.orchestre/preuves/026-012/**`) et correspondent à une fiche (`026-074`) commitée
par une autre session pendant le rejeu (`git log` : `0391a16f`, postérieur au démarrage du rejeu). Rien de ce que ce
rejeu a écrit n'y figure.

Sortie complète : `.orchestre/preuves/026-012/verifier.log` (régénéré, remplace le FAIL JA-7/JA-9 du 28/09 matin).
`echecs-attendus.md` réécrit par la preuve elle-même (section du lot a, quatre lignes « Témoin vert … PASS »).

## Diagnostic

Le témoin est de nouveau au niveau du contrat du juge (neuf motifs). JA-7/JA-9 vrais pour 026-012 ; JA-5 rouge par bruit
de sessions concurrentes, sans rapport avec ce périmètre — comme déjà noté le 28/09 matin pour ce même critère.
