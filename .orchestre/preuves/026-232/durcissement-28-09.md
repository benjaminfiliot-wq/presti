# 026-232 — durcissement du 28/09 (mission « juges à durcir »)

Suite de `.orchestre/preuves/026-232/contre-verif-28-09.md` (verdict : « ROUGE, sur le juge, pour un défaut majeur
mais latent »). Comme pour 026-051, le défaut vise le **juge** (`scripts/savoir-recherche-qa.mjs`) — permis, il est
écrit par Claude Code, l'exécutant (026-233) ne l'a jamais touché et n'y touchera jamais. `lib/savoir/` et
`scripts/savoir/` n'existent toujours pas (026-233 pas encore livrée) : rien de production n'a été touché.

## 1. Le défaut (majeur, latent)

« La partie `cli` ne juge ni les compteurs du jour ni la réserve de crédits. Elle ne juge d'ailleurs aucun passage
web de la ligne de commande. » Concrètement, deux sabotages de la contre-vérification (B4, B5), appliqués à la
référence (témoin), restaient VERTS :

- **B4** : `const compteurs = {}` — les compteurs du jour déjà écrits sont ignorés, chaque appel de la ligne de
  commande (un processus par appel, sur l'usine) repart de zéro.
- **B5** : la réserve `credits-firecrawl.json` n'est plus jamais écrite (`if (false) ecrireAtomique(pCredits, …)`).

Sans plafonds persistants, les deux règles de Benj (« Perplexity jamais en boucle », plafond 5/jour ; « Firecrawl
sous la réserve de départ ») ne tiendraient plus d'un appel à l'autre en production, sans qu'aucun critère ne le
voie — latent aujourd'hui seulement parce que `recherche_web` et `perplexity` sont éteints.

## 2. Correction dans le juge (`scripts/savoir-recherche-qa.mjs`, critère SVR-10, partie `cli`)

Deux nouveaux blocs, dans `svr10(ctx)`, après le cas `chef` existant :

1. **Persistance des compteurs.** `compteursDuJour(rt)` (nouvelle fonction, lit `compteurs-<jour>.json`) est comparé
   au nombre d'appels réussis de l'agent `chef` parmi `SUCCES_CLI` (`chef`, `cadre`, `retire`, `modifie`, `nom_web`
   — 5 appels, chacun un **processus séparé**) : `compteurs['savoir:chef']` doit valoir exactement ce compte. Un
   outil qui repart de zéro (B4) le laisserait à 1 quel que soit le nombre d'appels — directement détecté.
2. **Écriture de la réserve.** Après le cas `nom_web` (qui utilise `--web`, refusé pour donnée personnelle mais
   APRÈS que la ligne de commande a pris le verrou de crédits et calculé `credits.restant`, donc `credits-firecrawl.json`
   doit être écrit même sur un refus), on vérifie que le fichier existe, `consommes === 0` (rien n'a été transporté)
   et `reserve_credits === 1000` (celle des réglages d'essai, `reglagesDe({}).firecrawl.reserve_credits`). Un outil
   qui n'écrit jamais ce fichier (B5) est directement détecté.

Deux nouvelles entrées dans `scripts/fixtures/026/savoir/recherche/sabotages.json` (**S21**, **S22**, critère
SVR-10, partie `cli`), qui appliquent EXACTEMENT B4 et B5 sur le témoin, pour que `--preuve-echecs` (le `verifier`
officiel de la fiche) les rejoue à chaque passage, sans intervention manuelle :

- **S21** : `const compteurs = lireJSONSi(pCompteurs) || {}` → `const compteurs = {}`.
- **S22** : `if (o.web) ecrireAtomique(pCredits, …)` → `if (false) ecrireAtomique(pCredits, …)`.

## 3. Preuve — témoin vert, sabotages rouges, restauration

### a) Témoin (référence) : `--temoin` complet, PASS

```
$ node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir-recherche-qa.mjs --temoin
PASS SVR-1 — ok
… (12 lignes)
PASS SVR-10 — ok
PASS SVR-12 — ok
savoir-recherche-qa : PASS — tout vert
```

### b) S21 et S22, isolés (copie jetable du témoin, jamais le fichier réel) : SVR-10 rouge, exactement le bon message

```
$ node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir-recherche-qa.mjs \
    --racine=.orchestre/travail/durcissement-026-232-manuel/sab-s21 --partie=cli
FAIL SVR-10 — compteurs-<jour>.json : savoir:chef = 1 après 5 appel(s) chef réussis (chef, cadre, retire, modifie,
  nom_web) — chacun un processus séparé, attendu 5 : le compteur doit être relu et incrémenté, pas repartir de zéro
  à chaque appel

$ node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir-recherche-qa.mjs \
    --racine=.orchestre/travail/durcissement-026-232-manuel/sab-s22 --partie=cli
FAIL SVR-10 — credits-firecrawl.json absent après un appel --web (nom_web) : la réserve du jour n'est jamais écrite
```

Ces deux passes ont été jouées sur des **copies jetables** du témoin (`.orchestre/travail/durcissement-026-232-manuel/`,
construites comme `preparerTemoin()` : témoin + `index.ts`/`indexer.mjs` du socle + `lectureFirecrawl.ts`/`moteurs.ts`
du dépôt), jamais sur `scripts/fixtures/026/savoir/recherche/temoin/` lui-même. sha256 du témoin réel, avant et après
toute cette campagne, identiques à ceux relevés par la contre-vérification :

```
scripts/fixtures/026/savoir/recherche/temoin/scripts/savoir/chercher.mjs   10055b44a1a2c5e7a6c7aeba10bee80e8d75dc4200e1946c7d344430b1f0e2bc
scripts/fixtures/026/savoir/recherche/temoin/lib/savoir/recherche.ts       857bb7a095ef4cce40f6a2e36c0870f692e81614688eabb5e48fa5d09abf6b09
```

### c) `--preuve-echecs` complet (le `verifier` officiel de la fiche) : les 22 sabotages, dont S21/S22, tous attrapés

```
--preuve-echecs : (a)=true (b)=true (c)=true → PASS
```

Extrait de `.orchestre/preuves/026-232/echecs-attendus.md`, partie (c) :

```
S21 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-10 en échec : pris — … (aussi : SVR-3)
S22 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-10 en échec : pris — credits-firecrawl.json absent
  après un appel --web (nom_web) : la réserve du jour n'est jamais écrite
```

Le message affiché pour S21 dans cette passe (« journal du chef… ») diffère de celui de la passe isolée (b) — les
deux runs partagent la machine avec d'autres sabotages (22 passes complètes à la suite) et d'autres sessions actives
(mémoire « Presti — sessions concurrentes ») ; le juge lui-même documente ce risque connu du faux bus local sous
charge (`jouer()`, commentaire « rouge de charge, pas un défaut »). **Ce qui compte : SVR-10 est bien le critère pris
(`pris` non nul) dans les deux cas**, et la passe isolée (b), sans contention, confirme que mon nouveau contrôle des
compteurs est bien le premier échec déterministe. Aucune autre passe (S1–S20) n'a régressé : `(c)=true`.

### d) Rejeu du verifier officiel

```
$ node scripts/orchestre.mjs verifier 026-232
```

Sortie complète (celle qui fait foi) : `.orchestre/preuves/026-232/verifier.log`.

## 4. sha256 des fichiers modifiés (le durcissement lui-même — pas une restauration, ce sont les fichiers livrés)

```
scripts/savoir-recherche-qa.mjs                          86a0e94557ff739008abf87ac8be40ef6d82863bfe1c911b6b8feffcbba219be
scripts/fixtures/026/savoir/recherche/sabotages.json      212048daf544178be53c5cdf2531f24ad29edc708987745cd03a20f05e9d41d5
```

Aucun fichier de production (`lib/savoir/**`, `scripts/savoir/**`) n'existe encore : rien à restaurer de ce côté.

## 5. Ce qui reste hors de ce durcissement (mineur, hors scope de cette mission)

- Angle mort du contrat sur `:cloud` (`classesPour` du témoin ne teste que `moteur`, jamais `modele`) : divergence
  entre `echecs-attendus.md` et le témoin, risque faible aujourd'hui (contraintes de `llm.ts`/`MOTEUR_DE`) — non
  traité.
- Absence de fixture Claude `personnelles: true` (B2) et de réglage Perplexity daté du futur (B3) : deux angles morts
  mineurs signalés par la contre-vérification, non traités ici (hors scope MAJEUR/BLOQUANT de cette mission).
- Le quota Codex épuisé (pas de second avis indépendant) n'est pas un défaut : à relancer plus tard,
  indépendamment de ce durcissement.
