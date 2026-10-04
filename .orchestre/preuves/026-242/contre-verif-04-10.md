# Contre-vérification 026-242 — 04/10

Juge : `scripts/comptable-qa.mjs` (CPT-1 à CPT-8), jeux d'essai `scripts/fixtures/026/comptable/**`. Écrit par la reprise (Codex), intégré et corrigé par Claude Code le 04/10 (ligne dans `.orchestre/decisions.md`). Rien touché hors du périmètre de la fiche ; aucun secret ni réseau (tout est synthétique, le juge ne lit ni clé ni .env.local).

## Ce que la preuve établit avant les sabotages

- `--preuve-echecs` sur l'usine (bac gelé `cpt-242`, 16 s de commande) : arbre sans module → code 1, premier échec CPT-2 ; arbre courant idem ; témoin → code 0 (CPT-1 à CPT-8 verts) ; **21 sabotages**, chacun rouge avec SON critère nommé (ligne FAIL et bilan). Détail : `echecs-attendus.md`.
- Essai sur un vrai module : le module de production que la reprise a écrit pour 026-243 (`lib/direction/comptable.ts` de `presti-ops/reprise-locale-1001`, TypeScript, imports `@/`) posé HORS de l'arbre dans un bac jetable de l'usine (`--racine`) → CPT-1 à CPT-8 verts, code 0. Ce module n'est pas dans le dépôt : lib/direction/** est hors du périmètre de 026-242.

## Quatre sabotages réversibles (un à la fois, le vrai `verifier` de la fiche : `node scripts/comptable-qa.mjs --preuve-echecs`, bac gelé de l'usine, sha256 recontrôlé après chaque restauration)

### Sabotage 1 — scripts/comptable-qa.mjs
vise : CPT-5 : l'empreinte des gabarits légaux (la liste des gabarits protégés vidée)
remplacement : `const PROTEGES = JSON.parse(fs.readFileSync(path.join(F, 'mentions.json'), 'utf8')).proteges` → `const PROTEGES = []`
code du verifier : 1
FAIL AUTO-temoin — comptable-qa : FAIL — CPT-5
comptable-qa --preuve-echecs : FAIL
· usine executer : commande finie en 9 s sur l’usine, code 1 (seule)
· usine executer : code 1 · paquet 34,0 s · envoi et bac 5,1 s · commande 8,9 s · total 48,0 s
restauré : sha256 avant 974039966a02e49b6127b629008a7d7bf2b0db3be629224267df95f0451d3f2a — après 974039966a02e49b6127b629008a7d7bf2b0db3be629224267df95f0451d3f2a — identique

### Sabotage 2 — scripts/fixtures/026/comptable/sonde.mjs
vise : CPT-4 : la preuve de pureté des fonctions declarer*/payer* (sonde aveugle)
remplacement : `/declarer|payer/i.test(n)` → `/zzz-jamais/i.test(n)`
code du verifier : 1
FAIL AUTO-payer-impur — CPT-4
comptable-qa --preuve-echecs : FAIL
· usine executer : commande finie en 8 s sur l’usine, code 1 (seule)
· usine executer : code 1 · paquet 27,0 s · envoi et bac 6,3 s · commande 8,3 s · total 41,6 s
restauré : sha256 avant 2d88c2ededc8dce942dfd56380fd051baca19511d69d14cc660b2ab81d696fd3 — après 2d88c2ededc8dce942dfd56380fd051baca19511d69d14cc660b2ab81d696fd3 — identique

### Sabotage 3 — scripts/fixtures/026/comptable/temoin.mjs
vise : le témoin (référence verte) : une TVA non nulle
remplacement : `tva: 0, source: 'rapprochement'` → `tva: 1, source: 'rapprochement'`
code du verifier : 1
FAIL AUTO-temoin — comptable-qa : FAIL — CPT-4
FAIL AUTO-declaration-reseau — CPT-4
FAIL AUTO-preparation-impure — CPT-4
FAIL AUTO-tva-non-nulle — CPT-4
comptable-qa --preuve-echecs : FAIL
· usine executer : commande finie en 7 s sur l’usine, code 1 (seule)
· usine executer : code 1 · paquet 28,6 s · envoi et bac 4,5 s · commande 7,0 s · total 40,1 s
restauré : sha256 avant 9237ba248a35542d9ba07cf99d76c964789f0feb94fc245837c2dc6f0c48b4bd — après 9237ba248a35542d9ba07cf99d76c964789f0feb94fc245837c2dc6f0c48b4bd — identique

### Sabotage 4 — scripts/fixtures/026/comptable/seuil.json
vise : CPT-3 : le scénario d'alerte à 92 % (la donnée attendue ne dit plus d'alerter)
remplacement : `{ "cumul": 92000, "alerte": "approche_seuil" }` → `{ "cumul": 92000, "alerte": null }`
code du verifier : 1
FAIL AUTO-temoin — comptable-qa : FAIL — CPT-3
comptable-qa --preuve-echecs : FAIL
· usine executer : commande finie en 9 s sur l’usine, code 1 (seule)
· usine executer : code 1 · paquet 22,1 s · envoi et bac 5,7 s · commande 10,2 s · total 38,0 s
restauré : sha256 avant cd38960d9a6fbfbddef3c4ba251e0cdbd8b329f432b8e255d23b922655484d0f — après cd38960d9a6fbfbddef3c4ba251e0cdbd8b329f432b8e255d23b922655484d0f — identique


## Vérification officielle (verifier-final, usine, depuis fait/)

- 04/10 11:31Z : un premier passage depuis fait/ a rendu **FAIL « decisions.md modifié hors de la quarantaine depuis la prise de la tâche »** : une autre session a ajouté sa ligne à `.orchestre/decisions.md` pendant les 7 minutes entre la prise (11:24) et la vérification ; le juge, lui, était vert (PASS en en-cours/ à 94 s). La fiche est repartie en file par `rejouer` (non forcé), reprise et vérifiée dans la foulée.
- Verdict retenu : **026-242 : PASS** depuis fait/, `machine : usine`, 58 s (`verdicts.jsonl`, dernière ligne 026-242). `verifier.log` et `echecs-attendus.md` de ce passage sont dans ce dossier.
- Les quatre sabotages ci-dessus ont été joués AVANT la prise de la fiche, sur des bacs jetables de l'usine ; aucun n'est resté en place (sha256 identiques, tableau plus haut).
