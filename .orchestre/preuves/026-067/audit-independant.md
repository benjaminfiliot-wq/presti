# Audit indépendant de la fiche 026-067 (juge externe, n'a pas écrit ces juges)

Fait le 2026-09-27, en plus de `verifier.log` et `echecs-attendus.md` (produits par `juges-026-pilotage-preuve.mjs`
lui-même). Objectif : ne pas se contenter du témoin vert auto-déclaré par la preuve — le reconstruire à la main, dans le
scratchpad de la session (jamais dans le dépôt), et sabotage-tester les trois juges avec des défauts choisis par le juge
externe, distincts de ceux déclarés dans `s/lot.mjs`.

## 1. Relance exacte du verifier

`node scripts/juges-026-pilotage-preuve.mjs --lot=s` relancé intégralement (762 s). Résultat identique en substance aux
sessions précédentes : **JA-1 à JA-4 et JA-6 à JA-10 verts**, y compris JA-8 (les 39 sabotages déclarés du lot, sur les 5
juges, tous vus avec le bon identifiant). Seul **JA-5 est rouge** : `git status --porcelain` a changé pendant les ~13 min
d'exécution (58 fichiers, tous hors du périmètre de 026-067 — `.orchestre/contexte.md`, `.orchestre/digest.md`,
`.orchestre/verdicts.jsonl`, `scripts/instantane-quotidien*.mjs`, `scripts/station-planche-qa.mjs`, etc.). Ce n'est pas un
défaut des juges de la station : d'autres chantiers écrivaient dans le dépôt partagé pendant la mesure (`git status` avant
et après ne peut être identique que si le dépôt est calme). Une exécution antérieure de ce même verifier sur une copie
isolée du dépôt (`.orchestre/preuves/026-067/verifier-copie-isolee.log`, 554 s) était PASS intégral, JA-5 compris —
confirmant que la cause est la concurrence, pas l'implémentation.

## 2. Témoin vert reconstruit à la main (hors du mécanisme interne de la preuve)

Dans le scratchpad de la session (jamais sous `.orchestre/`) : `git archive` du commit de référence `4041ec9` (2421
fichiers), puis pose des 33 fichiers de `scripts/fixtures/026-pilotage/s/temoin/` par-dessus (suffixe `.temoin` retiré),
sans passer par `juges-026-pilotage-preuve.mjs` ni par `arbreTemoinS`. Lancés directement sur cet arbre :

- `station-logique-qa --partie=modules --racine=<copie>` → **PASS, 27 critères verts** (SM-1 … SM-2), identique à JA-7.
- `station-route-qa --partie=lecture --racine=<copie> --base=4041ec9…` → **PASS, 22 critères verts** (SV-1 … SV-22).
- `station-route-qa --partie=reunion --racine=<copie> --base=4041ec9…` → **PASS, 5 critères verts** (RA-1 … RA-5).
- `station-route-qa --partie=salles2 --racine=<copie> --base=4041ec9…` → **PASS, 9 critères verts** (SL-1 … SL-9).

Le témoin vert n'est donc pas une fiction de la preuve : une reconstruction indépendante, byte pour byte à partir des
mêmes fichiers du dépôt, donne exactement les mêmes verts. (`station-reunion-qa` non rejoué isolément : son harnais
`--temoin` lance de vrais sous-processus (faux bus, faux modèle) ; RU-1 a en revanche été sabotage-testé, voir §3.)

## 3. Sabotages choisis par le juge externe (aucun n'est dans `s/lot.mjs`)

Trois défauts inédits, injectés un par un dans la copie du témoin, jamais dans le dépôt :

1. **`lib/pilotage/equipage.ts`**, fonction `point()` : `panne`/`disjoncteur` → `'rouge'` changé en `'orange'`.
   → `station-logique-qa --partie=modules` : **❌ EQ-2 seul** rouge (« point(panne) = orange, rouge attendu »), les 26
   autres critères restent verts. EQ-2 n'a aucun sabotage déclaré dans le lot : preuve neuve.
2. **`scripts/chef/reunion.mjs`** : ajout d'une constante inutilisée `'.env.local'` (aucun sabotage comportemental,
   juste le nom d'un fichier de secrets qui traîne dans le source).
   → `station-reunion-qa` : **❌ RU-1** (« nomme un fichier de secrets ») détecté immédiatement, sans lancer le banc de
   17 scénarios (comportement de garde attendu : script fautif → rien d'autre n'est jugé).
3. **`lib/pilotage/station.ts`** : ajout d'une fonction morte qui appelle `.from('ops').insert(...)`.
   → `station-route-qa --partie=lecture` : **❌ SV-9** (« .insert( ») et, en ricochet correct, **❌ SV-6** (`.from('ops')`
   sans `.select()` explicite) ; les 20 autres critères restent verts. Double détection cohérente, pas un faux positif :
   le code ajouté viole réellement les deux règles à la fois.

Chaque sabotage a été retiré aussitôt après (fichier `.original` comparé octet pour octet avant suppression) ; rien de
tout cela n'a touché le dépôt réel.

## Verdict de l'audit

- **Substance des juges** : confirmée par lecture directe d'environ 1300 lignes de code des trois juges (assertions sur
  des textes exacts, des graines aléatoires à 200 tirages, des changements d'heure d'hiver/été, des arbres de processus
  tués et revérifiés par battement de fichier) et par les trois sabotages indépendants ci-dessus, tous détectés avec le
  bon identifiant et sans collatéral inattendu.
- **Témoin vert** : réel, reconstruit indépendamment avec le même résultat.
- **Point non prouvé par cet audit** : le verifier officiel, relancé maintenant sur le dépôt partagé, ne rend pas un
  code 0 — uniquement à cause de JA-5 (écritures concurrentes d'autres chantiers pendant la mesure), un problème de
  calendrier d'exécution, pas de qualité de 026-067. La preuve n'a donc pas pu être rejugée PASS « depuis `fait/` » à
  cet instant précis ; elle l'a été sur une copie isolée quelques heures plus tôt.
