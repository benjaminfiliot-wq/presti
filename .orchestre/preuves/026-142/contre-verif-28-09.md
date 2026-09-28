# 026-142 — contre-vérification indépendante (28/09, 2026-09-28T09:29Z)

Contre-vérification de la fiche `026-142` (verdict déclaré : VERT, `node scripts/orchestre.mjs verifier 026-142` → PASS,
deux passages consécutifs). Elle ne relit pas le journal d'un autre agent : elle relance elle-même le verifier de la
fiche (`node scripts/juges-026-pont-entrant-preuve.mjs`) et sabote elle-même la production qu'il juge.

## Moyen

1. **D'abord Codex sur l'usine (économie de Claude)** :
   ```
   cd presti && node ../presti-ops/usine/revue-codex.mjs 026-142 --sabotages=4
   ```
   Résultat : **code 125 (NON JUGÉ)**. `usine executer` a refusé le paquet avant tout envoi — 8 motifs `sk-` (clé
   Anthropic/OpenAI) détectés dans des fichiers **hors périmètre de 026-142** et non liés à elle (`.orchestre/fait/026-041.md:72`,
   `scripts/agents-llm-qa.mjs:100` et `:101` — des non-commités d'une autre session, visibles dans le `git status` de
   tête de cette contre-vérification). Le contrôle du paquet est un tout-ou-rien : aucune revue Codex n'a pu partir.
   Journal : `.orchestre/travail/revue-codex/026-142/` (verdict.json, journal.json, runs/, codex.log, executer.log).
   Conformément à la consigne (125 = pas jugé), la contre-vérification est passée aux sabotages manuels.

2. **Sabotages manuels réversibles de la PRODUCTION** (jamais du juge `scripts/juges-026-pont-entrant-preuve.mjs`,
   qui EST le `verifier` de la fiche — un sabotage qui le toucherait ne compterait pas, même convention que
   `revue-codex.mjs`). Cible : les trois fichiers que 026-142 a écrits et que `juges-026-pont-entrant-preuve.mjs`
   fait tourner — `scripts/pont-orchestre-qa.mjs`, `scripts/prospects-entrant-qa.mjs`,
   `scripts/fixtures/026/pont/fixtures.mjs`. Pour chacun des 6 sabotages : édition minimale → `node
   scripts/juges-026-pont-entrant-preuve.mjs` (le verifier exact de la fiche) → lecture du rapport (le bon critère,
   et lui seul, doit rougir) → restauration à l'identique → `sha256sum` du fichier restauré comparé à l'empreinte
   d'avant sabotage → à la fin, un dernier passage du témoin doit revenir PASS et les 4 empreintes doivent toutes
   correspondre à la ligne de base.

   Empreinte de base (avant tout sabotage) :
   ```
   abda5729c5b0daac843f95799bc72d28115c37ceeea982f5ff13c03d8a1c1a91  scripts/pont-orchestre-qa.mjs
   561fbf30eda01bbdc9d0642774db08a15642e3be7ff1c4ce12121f66d4e0fcbd  scripts/prospects-entrant-qa.mjs
   dea730f65a4164932df5f782d57fc281a5511241757f09d1c068e4a6c880eaa5  scripts/fixtures/026/pont/fixtures.mjs
   f38180e43fb502903a4c2ac5569758951c6308efd9937118faedb54ab73fd598  scripts/juges-026-pont-entrant-preuve.mjs (jamais touché)
   ```
   Passage témoin juste avant sabotage (reproduit celui de la fiche) : JP-1-PO ✓, JP-1-PE ✓, JP-2-PO ✓, JP-2-PE ✓,
   JP-3 ✓, JP-4 ✓ → PASS.

## Les 6 sabotages (dépasse le minimum de 4 demandé)

| # | Fichier | Sabotage | Critère visé | Rougi ? | Seul critère touché ? | sha256 restauré |
|---|---|---|---|---|---|---|
| 1 | `pont-orchestre-qa.mjs` | `po1()` : id du marqueur `'PO-1'` → `'P0-1'` (zéro) sur l'échec attendu | JP-1-PO | ✗ (« première ligne PO-1 : «  » ») | oui (5 autres verts) | `abda57…c1a91` = base |
| 2 | `prospects-entrant-qa.mjs` | branche « route absente » : id `'PE-1'` → `'PE-l'` (L minuscule) | JP-1-PE | ✗ (« première ligne PE-1 : «  » ») | oui | `561fbf…4e0fcbd` = base |
| 3 | `pont-orchestre-qa.mjs` | `autocontrole()` : `return tout ? 0 : 1` → `return tout ? 1 : 0` (verdict inversé) | JP-2-PO | ✗ (« --temoin : code 1 ») | oui | `abda57…c1a91` = base |
| 4 | `prospects-entrant-qa.mjs` | `autocontrole()` : même inversion `tout ? 1 : 0` | JP-2-PE | ✗ (« --temoin : code 1 ») | oui | `561fbf…4e0fcbd` = base |
| 5 | `pont-orchestre-qa.mjs` | `po1()` : `await fetch('http://exemple-sabotage-jp3.invalid/026-142')` inconditionnel en tête (erreur du piège interceptée et journalisée, sans perturber PO-1) | JP-3 | ✗ (« le piège réseau s'est déclenché : un appel visait un hôte hors 127.0.0.1 ») | oui | `abda57…c1a91` = base |
| 6 | `fixtures/026/pont/fixtures.mjs` | effet de bord en tête de module : écrit `.orchestre/propositions/SABOTAGE-CONTRE-VERIF-026-142.md` à la racine réelle du dépôt (jamais dans la racine temporaire) | JP-4 | ✗ (« propositions/ +1 (SABOTAGE-CONTRE-VERIF-026-142.md) ») | oui | `dea730…880eaa5` = base |

Détail de chaque restauration : édition inverse appliquée immédiatement après lecture du rapport rougi, puis
`sha256sum` relancé sur le fichier seul — les six lignes ci-dessus sont les six sorties réelles, toutes égales à
l'empreinte de base. Pour le sabotage 6, le fichier parasite et le dossier `.orchestre/propositions/` (qui
n'existait pas avant, confirmé par `ls` avant sabotage) ont été supprimés ; `ls .orchestre/propositions` échoue de
nouveau (« No such file or directory ») après nettoyage, comme avant.

## Témoin final (après restauration complète)

```
✓ JP-1-PO code 2, première ligne PO-1 : « ✗ PO-1 scripts/pont-orchestre.mjs n'existe pas encore (026-160 pas encore écrite ni déposée). »
✓ JP-1-PE code 2, première ligne PE-1 : « ✗ PE-1 app/api/prospects/entrant/route.ts n'existe pas encore (026-145 pas encore écrite ni déposée). »
✓ JP-2-PO --temoin : code 0
✓ JP-2-PE --temoin : code 0
✓ JP-3 jamais déclenché sur les quatre passages (réseau limité à 127.0.0.1)
✓ JP-4 file/ +0 (—), propositions/ +0 (—), périmètre inchangé : true

✓ juges-026-pont-entrant-preuve : PASS   (code 0)
```

Empreintes finales (identiques à la base) :
```
abda5729c5b0daac843f95799bc72d28115c37ceeea982f5ff13c03d8a1c1a91  scripts/pont-orchestre-qa.mjs
561fbf30eda01bbdc9d0642774db08a15642e3be7ff1c4ce12121f66d4e0fcbd  scripts/prospects-entrant-qa.mjs
dea730f65a4164932df5f782d57fc281a5511241757f09d1c068e4a6c880eaa5  scripts/fixtures/026/pont/fixtures.mjs
f38180e43fb502903a4c2ac5569758951c6308efd9937118faedb54ab73fd598  scripts/juges-026-pont-entrant-preuve.mjs
```

`git status` sur les quatre fichiers de production et sur `.orchestre/propositions/`, `.orchestre/file/` après
restauration : les seuls mouvements dans `.orchestre/file/` (`026-030.md` … `026-168.md` supprimés, `026-100.md`,
`026-107.md` nouveaux) sont antérieurs à cette contre-vérification (déjà présents dans le `git status` de tête de
session, avant tout sabotage) — une autre session concurrente sur l'orchestre, hors de ce qui est jugé ici ;
`.orchestre/propositions/` est absent, comme avant le sabotage 6 ; les quatre fichiers de production restent à
l'état `??` (jamais commités), sans aucune marque de modification.

## Verdict de la contre-vérification

**VERT confirmé.** Le verifier de 026-142 (`juges-026-pont-entrant-preuve.mjs`) détecte correctement, un par un et
sans faux positif croisé, un sabotage ciblé sur chacun de ses 6 critères (JP-1-PO, JP-1-PE, JP-2-PO, JP-2-PE, JP-3,
JP-4), et revient PASS une fois la production restaurée à l'identique (empreintes sha256 égales). Codex sur l'usine
n'a pas pu juger (125, paquet refusé pour un motif étranger à 026-142) ; la contre-vérification manuelle, exigée
par la consigne dans ce cas, prend le relais et est concluante. PO-R et PE-8 (`--reel`) restent hors périmètre de
026-142, comme le dit la fiche (coquilles gardées pour la mise en service réelle de 026-160/026-145).

Aucun fichier n'a été laissé modifié hors de `.orchestre/preuves/026-142/` et `.orchestre/travail/`. Rien n'a été
commité.
