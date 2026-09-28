# Contre-vérification de 026-110 — 28/09/2026

Fiche : `.orchestre/fait/026-110.md` (VERT, `copie_isolee:true`, PASS le 2026-09-28T11:39:06Z, 364 s).
Verifier de la fiche : `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=06`.

## Verdict

**CONFIRMÉ.** Le PASS de 026-110 tient : les deux seuls critères que le témoin de la fiche exerce réellement sur du
code de production existant (PD-9 et LV-15, non-régression — voir § « Moyen ») rougissent à chaque fois sur le
bon critère quand je casse le fichier modèle correspondant, et redeviennent verts, sha256 identique à l'original,
dès que je restaure. Aucun faux-vert trouvé. Un relancement complet du verifier littéral de la fiche, après
restauration totale, confirme : REF et les 6 juges PASS (bon `FAIL <critère>` sur la référence, `code 0` en
témoin) ; seule la ligne IMMOBILE rougit, et uniquement à cause de fichiers d'AUTRES fiches créés/modifiés par des
sessions concurrentes pendant le passage — pas par mon travail ni par un défaut de 026-110. C'est exactement le
phénomène que `fait/026-110.md` (champ `verifier`) documente déjà pour les tentatives en direct.

## 1. Codex sur l'usine (moyen demandé en premier) — NON JUGÉ, raison notée

Commande exacte lancée : `cd /c/Users/benja/Documents/presti && node ../presti-ops/usine/revue-codex.mjs 026-110 --sabotages=4`
(fond de tâche, ~90 min de délai autorisé). Résultat : **code 125**, NON JUGÉ.

Raison exacte, `.orchestre/travail/revue-codex/026-110/executer.log` :
```
✗ usine executer : contrôle du paquet, 3 problème(s) — rien n'est envoyé
    .orchestre/fait/026-069.md:42 : motif nom sensible : valeur (JSON, YAML, minuscules)
    lib/agents/llm.ts:82 : motif nom sensible : valeur (JSON, YAML, minuscules)
    scripts/vigile-qa.mjs:651 : motif URL avec identifiants (schéma://utilisateur:mot de passe@hôte)
```
Les trois chemins signalés sont **hors périmètre de 026-110** (`.orchestre/fait/026-069.md`, `lib/agents/llm.ts`,
`scripts/vigile-qa.mjs`) : ce sont des faux positifs du contrôle anti-secret de `usine.mjs` sur l'état courant
(non commité) du dépôt entier, provoqués par le travail d'autres sessions en cours dans le même arbre. Aucun
`verdict.json` ni `journal.json` n'a été produit (« rien n'est envoyé ») : la voie Codex est réellement non jugée,
ce n'est pas un verdict caché ou dégradé. → bascule vers la contre-vérification manuelle, comme demandé.

## 2. Moyen retenu pour la contre-vérification manuelle

Lecture complète de `scripts/pack-pub-dossier-qa.mjs`, `scripts/pack-pub-livraison-qa.mjs`,
`scripts/juges-026-pubs-contenu-preuve.mjs` et `scripts/lib/sql-essai.mjs` (mécanisme `creerRapport` : « Un
critère sauté n'est pas un échec », `sql-essai.mjs:440`).

Constat clé : en mode `--temoin` (celui que le verifier de la fiche lance sur l'arbre courant, après le passage
« référence »), **tous** les critères des deux juges sont `SAUTE` (skip, pas un échec — la fabrication qu'ils
jugeront n'existe pas encore, fiches 07/08/14-16/24 à venir), **sauf deux** :
- **PD-9** (`--partie=api`) : non-régression sur `app/api/media/route.ts` et `lib/siteCommande.ts` (comparaison
  octet-pour-octet avec `HEAD:<fichier>`) ;
- **LV-15** (`--partie=route`) : non-régression sur `app/controle/Sites.tsx`,
  `app/api/controle/sites/[id]/route.ts`, `lib/direction/garde.ts`, `lib/direction/reconfirmation.ts` (identiques
  à `HEAD`), et `lib/direction/journal.ts` (identique à `HEAD` **hors** des deux libellés admis `'pack_livre'` /
  `'pack_refaire'`).

Ce sont donc les **seuls** critères du verifier de la fiche qui portent, aujourd'hui, sur du code de PRODUCTION
réellement existant. Ce sont mes cibles : 7 fichiers, tous dans `app/` ou `lib/`, aucun n'est le juge (je n'ai
touché ni `scripts/pack-pub-dossier-qa.mjs`, ni `scripts/pack-pub-livraison-qa.mjs`, ni
`scripts/juges-026-pubs-contenu-preuve.mjs`, ni leurs fixtures — tous interdits par la fiche).

Protocole, identique pour chacun des 7 : `sha256sum` du fichier (avant) → copie de sauvegarde hors dépôt
(scratchpad) → sabotage réversible (une ligne de commentaire ajoutée en fin de fichier — suffisant : PD-9/LV-15
comparent le texte octet pour octet, donc n'importe quel octet différent doit rougir le critère) → juge concerné
lancé en `--temoin` (rapide : pas de `typecheck` sur cette branche du code) → `cp` de restauration →
`sha256sum` (après) comparé à l'avant → juge relancé en `--temoin`.

## 3. Les 7 sabotages (≥ 4 exigés)

| # | Fichier (production, hors juge) | Critère visé | sha256 avant = après (restauré) | Juge --temoin AVANT sabotage | APRÈS sabotage | APRÈS restauration |
|---|---|---|---|---|---|---|
| 1 | `app/api/media/route.ts` | PD-9 | `b7894afe304cdc373b2e22f21ca3389dfab9068cda24e1909d3e4008df8fb028` | PASS PD-9 | **FAIL PD-9** — « app/api/media/route.ts modifié par rapport à HEAD » | PASS PD-9 |
| 2 | `lib/siteCommande.ts` | PD-9 | `82744728e624b9e700e1bfabfb8cf2c3ab713083d296d37a7ade5d8b4e6e5493` | PASS PD-9 | **FAIL PD-9** — « lib/siteCommande.ts modifié par rapport à HEAD » | PASS PD-9 |
| 3 | `app/controle/Sites.tsx` | LV-15 | `32fe91edbccda02c65c9a7527918334e00877684319873b3059db58de280951f` | PASS LV-15 | **FAIL LV-15** — « app/controle/Sites.tsx modifié par rapport à HEAD » | PASS LV-15 |
| 4 | `app/api/controle/sites/[id]/route.ts` | LV-15 | `67ed0e554fcc68e537e199fa7146e8508de049142315f02bfddee01e2e1b1522` | PASS LV-15 | **FAIL LV-15** — « app/api/controle/sites/[id]/route.ts modifié par rapport à HEAD » | PASS LV-15 |
| 5 | `lib/direction/garde.ts` | LV-15 | `a646bf9df3d1c240a23952b1959f68997377ae01eac6291f58195db4e6365928` | PASS LV-15 | **FAIL LV-15** — « lib/direction/garde.ts modifié par rapport à HEAD » | PASS LV-15 |
| 6 | `lib/direction/reconfirmation.ts` | LV-15 | `89c0f6917295a5d5a377f0711e2129a5e2060ae0078ab59a76666f33ee39bc53` | PASS LV-15 | **FAIL LV-15** — « lib/direction/reconfirmation.ts modifié par rapport à HEAD » | PASS LV-15 |
| 7 | `lib/direction/journal.ts` (ligne hors des libellés admis) | LV-15 | `835f5d650211671397cf121b4c7c0ba05320a0de6f202a06384d0d9282a39aca` | PASS LV-15 | **FAIL LV-15** — « lib/direction/journal.ts modifié par rapport à HEAD hors des deux libellés admis (pack_livre, pack_refaire) » | PASS LV-15 |

Chaque ligne a été vérifiée en direct (commande, sortie complète, sha256 avant/après) dans cette session ; le
sabotage n°7 montre en plus que le juge distingue bien une modification « admise » (ajout de `'pack_livre'` /
`'pack_refaire'`) d'une modification ailleurs dans le fichier — son message le nomme explicitement.

Après les 7 restaurations : `git status --porcelain` sur les 7 fichiers ne rend plus rien (aucune différence avec
`HEAD`), et `git diff --stat HEAD -- <fichier>` est vide pour chacun.

## 4. Témoin complet de la fiche, après restauration totale

`node scripts/juges-026-pubs-contenu-preuve.mjs --lot=06` relancé en entier (le verifier littéral de la fiche,
pas seulement les parties visées) :

```
PASS REF — 4041ec9 extrait (2421 fichiers), sans lib/packPubDossier.ts, lib/packPubLivraison.ts,
           lib/packPubPurge.ts, scripts/pack-pub, app/pubs
PASS pack-pub-dossier-qa --partie=api    — référence : FAIL PD-1  ; témoin : code 0
PASS pack-pub-dossier-qa --partie=page   — référence : FAIL PD-5  ; témoin : code 0
PASS pack-pub-livraison-qa --partie=depot  — référence : FAIL LV-1  ; témoin : code 0
PASS pack-pub-livraison-qa --partie=route  — référence : FAIL LV-3  ; témoin : code 0
PASS pack-pub-livraison-qa --partie=poste  — référence : FAIL LV-7  ; témoin : code 0
PASS pack-pub-livraison-qa --partie=purge  — référence : FAIL LV-12 ; témoin : code 0
FAIL IMMOBILE — git status a bougé hors de .orchestre/travail/ et .orchestre/preuves/ :
   .orchestre/en-cours/026-077.avant.txt apparu (??) ; .orchestre/en-cours/026-077.lock apparu (??) ;
   .orchestre/en-cours/026-077.md apparu (??) ; scripts/usine.mjs revenu à l'état suivi ou disparu ;
   .orchestre/en-cours/026-248.avant.txt revenu à l'état suivi ou disparu ;
   .orchestre/en-cours/026-248.lock revenu à l'état suivi ou disparu …
PASS EA — .orchestre/preuves/026-110/echecs-attendus.md : 1887 octets, 6 ligne(s)
juges-026-pubs-contenu-preuve : FAIL — IMMOBILE
```

Les 6 juges et REF sont au vert, avec le bon `FAIL <critère>` attendu sur la référence dans chaque cas — **rien
lié à mes 7 sabotages** (tous restaurés avant ce lancement, et sha256 vérifiés identiques). Le seul rouge,
IMMOBILE, porte sur `.orchestre/en-cours/026-077.*`, `.orchestre/en-cours/026-248.*` et `scripts/usine.mjs` :
des fichiers d'AUTRES fiches, créés/effacés par des sessions concurrentes pendant les ~6 min du passage — hors du
périmètre de 026-110, jamais touchés par moi. C'est le même symptôme que documente `fait/026-110.md` pour les
essais en direct (« rougissaient que sur IMMOBILE, à cause d'autres sessions actives ») ; la voie officielle pour
l'éviter est `verifier-isole.sh` (copie de travail isolée), que je n'ai **pas** lancée ici car elle déplace la
fiche et écrit dans `.orchestre/verdicts.jsonl`, hors du périmètre que `pour_claude` m'autorise
(`.orchestre/preuves/026-110/**` et `.orchestre/travail/**` seulement).

Effet de bord attendu et sans conséquence : ce relancement réécrit lui-même
`.orchestre/preuves/026-110/echecs-attendus.md` (le script l'écrit à chaque exécution) — même contenu, même
taille (1887 octets), seul l'horodatage change (11:39:06Z → 11:54:26Z). `.orchestre/preuves/026-110/verifier.log`,
lui, n'a pas été touché (je n'y ai rien redirigé) et porte toujours la trace originale du PASS du 28/09 11:39:06Z.

## 5. Défauts trouvés

Aucun défaut bloquant ni majeur. Une **remarque de portée** (pas un défaut) : à ce stade, le témoin de la fiche ne
prouve la justesse des juges que sur PD-9/LV-15 (non-régression) ; les autres critères (PD-1 à PD-8 hors PD-9,
LV-1 à LV-14 hors LV-15) ne sont exercés, pour l'instant, que par le passage « référence » (le juge sait dire
FAIL quand la fabrication est ABSENTE) — pas encore par un passage où la fabrication est PRÉSENTE mais fausse
(figée, vide, condition inversée), puisque cette fabrication n'existe pas avant les fiches 07/08/14-16/24. C'est
volontaire (026-110 écrit les juges avant l'implémentation, `CLAUDE.md:23`) et déjà anticipé par le `pour_claude`
de ces futures fiches, pas une faille de 026-110.

## Sabotages relevés (résumé)

7 sabotages réversibles, tous sur des fichiers de PRODUCTION hors du juge, tous relevés (rougissent le bon
critère PD-9 ou LV-15 avec le bon message), tous restaurés octet pour octet (sha256 identique avant/après),
témoin repassé au vert à chaque fois — individuellement (rapide) et collectivement (verifier complet de la fiche,
seul IMMOBILE rouge, pour une cause hors périmètre et déjà documentée).
