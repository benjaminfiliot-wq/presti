# 026-103 — décision sur le juge `scripts/station-reunion-qa.mjs` (04/10/2026, Claude Code, chef d'exécution)

## Constat

Le juge fait échouer RU-9 contre le schéma RÉEL de 026-102 (`docs/agents/chef-reunion.schema.json`, déjà dans le dépôt depuis
04781c40), alors que le script `scripts/chef/reunion.mjs` est conforme. Reproduit sur l'usine (bac `reunion-qa-1`, avant
correctif) : `RU-1` à `RU-8` et `RU-10` verts ; `RU-9` en échec, trois écarts :

- `signes = undefined, 140 attendu`
- `cle = undefined, "^chef:\d{4}-\d{2}-\d{2}:idee-[a-z0-9-]{3,75}$" attendu`
- `options = "[]", "[\"lancer\",\"reporter\"]" attendu`

## Cause : un juge périmé, pas un script fautif

RU-9 lisait des chemins DIRECTS (`properties.lignes.items.maxLength`,
`properties.idees.items.properties.cle_idempotence.pattern`,
`properties.idees.items.properties.options.items.properties.cle.enum`), valables seulement dans le schéma d'essai du juge
(`scripts/fixtures/026-pilotage/s/chef-reunion.schema.json`, borné en ligne). Le schéma écrit ensuite par 026-102 range les mêmes
bornes derrière des `$ref` (`#/$defs/ligne`, `#/$defs/idee`, `#/$defs/cle_idee`, `#/$defs/options_idee`) et dit « lancer ou
reporter » par deux ordres de `prefixItems` à `const` sous un `anyOf`, pas par un `enum`. Le juge lisait donc `undefined` : il ne
pouvait JAMAIS passer contre le schéma réel, quel que soit le script. Le schéma est `interdit` à 026-103 et propriété de 026-102
(son juge `chef-qa` compare ses définitions à celles de `chef-plan.schema.json`) : le bon endroit du correctif est le juge.

## Correction (décision du chef : corriger un juge défectueux, jamais l'affaiblir)

Dans RU-9 seulement : la fonction qui lit les cinq bornes suit désormais les `$ref` locaux (`#/…`) et les `allOf` avant de lire une
clé, chaque schéma se résolvant contre sa propre racine, et lit les options permises sous les DEUX formes (`enum` du schéma d'essai ;
`const` des `prefixItems` sous `anyOf` du schéma du dépôt). Rien d'autre n'a bougé : mêmes cinq bornes comparées (5 lignes, 140
signes, 3 idées, format de clé, `lancer` et `reporter`), même comparaison stricte `!==`, mêmes trois préalables (code 3, aucun
appel, aucun modèle).

Ce n'est pas un assouplissement : une borne introuvable reste `undefined` (ou `"[]"` pour les options) et fait toujours échouer
RU-9 ; et trois sabotages du schéma du dépôt, qui ne font échouer RU-9 QUE parce que les références sont suivies, sont pris
(voir `contre-verif-04-10.md`, S5 à S7 : 140 → 141, `lancer` → `lancerx`, `{3,75}` → `{3,76}`).

## Effet de bord utile

Le mode `--temoin` pose le témoin du lot s sur `scripts/chef` et `docs/agents` du commit de base : une fois le schéma réel
committé, RU-9 y lisait aussi `undefined`. Le même correctif le répare.

## Empreintes (sha256) du juge

Avant correctif (`git show HEAD:scripts/station-reunion-qa.mjs`) : `7fd22a0f7d3641ceb8009dce98bd92eae1e3151063f96511ccc9b9bab3f793a0`.
Après : `6a301f799b610d30f4e9669fe79759b7d4a8fd832def0409bab20a5b57d8999f` (diff : 31 lignes ajoutées, 4 retirées, toutes dans RU-9).

## Rien d'autre

`.orchestre/decisions.md` n'a pas été touché. Aucun fichier de `scripts/fixtures/**`, aucun schéma, aucune route.
