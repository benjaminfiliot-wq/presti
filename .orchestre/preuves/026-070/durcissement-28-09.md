# 026-070 — durcissement du 28/09 (mission « juges à durcir »)

Suite de `.orchestre/preuves/026-070/contre-verif-28-09.md`. **Contrairement aux autres fiches de cette mission, le
défaut trouvé ici ne visait pas le juge** (`scripts/station-logique-qa.mjs`, critère EQ-1) : le juge fonctionnait déjà
correctement et rendait **rouge, à raison**, sur l'état réel du dépôt. Le défaut visait la **production**
(`lib/pilotage/equipage.ts`), incomplète après sa livraison. Correction faite ici, sur la production uniquement — le
juge n'a pas été modifié.

## 1. Constat de la contre-vérification

`lib/pilotage/equipage.ts` (`descriptifs`) ne portait que **24 identités** : il manquait la 25ᵉ, `usine` → Surveillant
→ salle `machines`, explicitement nommée dans `.orchestre/fait/026-070.md` (« `machines` | `a0` → Veilleur ;
`systeme` → Système ; **`usine` → Surveillant** ») et dans `EQUIPAGE_ATTENDU` de
`scripts/fixtures/026-pilotage/s/commun.mjs` (`usine: 'machines'`, ligne 51). Le critère EQ-1 le réclamait déjà et
rendait rouge :

```
❌ EQ-1 EQUIPAGE : chef, vigie_meta, …, douleurs ; les vingt-cinq noms de 026-070 (décision du chef d'entreprise
   du 27/09) attendus
station-logique-qa --partie=modules : FAIL — EQ-1
```

sha256 de `lib/pilotage/equipage.ts` à l'état trouvé (incomplet, celui que la contre-vérification a laissé intact) :
`43cc0c0eeda4c086f807c401801b2e01a7a00a18fc243ab8315dabc5ff9d3931`.

## 2. Correction

Ajout de l'entrée manquante dans `descriptifs` (`lib/pilotage/equipage.ts`) :

```ts
usine: ['Surveillant', 'Surveillance', 'machines'],
```

Libellé « Surveillant » repris mot pour mot de la fiche (§ « Homonymie usine » : « le libellé « Surveillant » lève la
confusion à l'écran »). Le champ `role` (« Surveillance ») suit le même schéma que `a0` (« Veilleur » / « Surveillance »
/ `machines`) ; le juge (EQ-1, `scripts/station-logique-qa.mjs:214`) ne contrôle que la présence d'un `libelle` et d'un
`role` non vides et la `salle` exacte (`EQUIPAGE_ATTENDU`), jamais le texte précis de `role` — aucune ambiguïté sur ce
point. Aucun autre fichier touché.

## 3. Rejeu du verifier — PASS confirmé

```
$ node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules
✅ EQ-1 vingt salles et leurs genres, ecommerce réservée hors SALLES, CLES_SALLE = 20 + ecommerce ; vingt-cinq
   titulaires (décision du 27/09), avatar = nom technique, aucun sprite ; 15 cartes = les agents reçus, dans l'ordre
   des salles ; inconnu → machines, avatar defaut
… (26 autres critères + SM-2/tsc)
station-logique-qa --partie=modules : PASS

$ node scripts/orchestre.mjs verifier 026-070
✓ 026-070 : PASS · 16s
```

Sortie complète (celle qui fait foi) : `.orchestre/preuves/026-070/verifier.log`.

## 4. Le juge n'a pas eu besoin d'être durci

`scripts/station-logique-qa.mjs` (EQ-1) détectait déjà correctement l'absence de la 25ᵉ identité — c'est lui qui a
donné le signal exploité par la contre-vérification. Aucun sabotage ni preuve supplémentaire sur le juge n'est donc
nécessaire pour cette fiche : la seule action requise était de compléter la production, ce qui est fait.

## 5. Ce qui reste hors de ce durcissement

- Les deux autres points de `ndef` de la contre-vérification (le quota Codex épuisé, un SM-2 transitoire dû à une
  session concurrente sur `lib/crieur/juge.ts`) ne sont pas des défauts de 026-070 : rien à corriger.
