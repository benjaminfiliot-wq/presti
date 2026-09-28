# Contre-vérification 026-041 — 28/09/2026

Fiche relue : `.orchestre/fait/026-041.md` (statut annoncé VERT par un autre agent, `verifier.log` du 28/09 à 08:39:37Z). Verdict de cette contre-vérification : **VERT confirmé**, par sabotages manuels (Codex sur l'usine non jugé, code 125, voir ci-dessous).

## Ce que 026-041 livre réellement (pourquoi les sabotages portent sur LL-10/LL-11)

026-041 livre le **juge** de `lib/agents/llm.ts` et `lib/agents/moteurs.ts` (026-043, pas encore écrits) : `scripts/agents-llm-qa.mjs` (18 critères LL-1 à LL-18) + ses fixtures. Sur l'arbre courant, LL-1 à LL-9 et LL-12 à LL-18 échouent nécessairement à l'import (les deux modules jugés n'existent pas — c'est voulu, `interdit` de la fiche empêche justement de les écrire ici). Seuls **LL-10** (`package.json` et `lib/ai.ts` identiques à `HEAD`, aucune dépendance nouvelle, `CODEX_LANCEUR` isolé dans `lib/agents/llm.ts` seul, `ANTHROPIC_AGENTS_KEY` absent de `app/**`/`lib/**`) et **LL-11** (`tsc --noEmit`) tournent contre du code de **production réel et déjà présent** dans le dépôt. Le témoin de la fiche (`--temoin`) n'exécute que LL-10 et LL-11. C'est donc là, et seulement là, qu'un sabotage réversible de production a un sens exécutable aujourd'hui : sur LL-1…LL-9/LL-12…LL-18, la seule façon de les faire rougir serait de saboter le juge lui-même (exclu par la consigne) ou d'écrire `lib/agents/llm.ts` (hors périmètre de 026-041, réservé à 026-043).

## Moyen

1. **Codex sur l'usine d'abord** (économie de Claude), comme demandé :
   `cd presti && node ../presti-ops/usine/revue-codex.mjs 026-041 --sabotages=4`
   → **code 125 (pas jugé)**, avant tout envoi : `usine executer` refuse le paquet (8 problèmes détectés dans le bac). Les 8 sont des faux positifs sur les **sentinelles de test elles-mêmes** : `.orchestre/fait/026-041.md:72` et `scripts/agents-llm-qa.mjs:100,101,102,104` (motif `sk-` / « nom sensible : valeur »). J'ai relu les deux emplacements à la main : ce sont les constantes `ANTHROPIC_API_KEY = 'sk-ant-PRODUIT-026-sentinelle'`, `ANTHROPIC_AGENTS_KEY = 'sk-ant-AGENTS-026-sentinelle'`, `OPENAI_API_KEY = 'sk-OPENAI-026-sentinelle'` etc., explicitement décrites dans le corps de la fiche comme des sentinelles jamais réelles, et le script a même dû scinder `const SK_ANT = 'sk-' + 'ant-'` pour passer un autre garde (garde-commit, 28/09) — sans effet ici puisque ce scanner-là cherche toute sous-chaîne `sk-`, fût-elle reconstituée par concaténation. Aucune vraie clé. Détail : `.orchestre/travail/revue-codex/026-041/executer.log`. Rien n'est parti sur l'usine, donc aucun verdict Codex.
   Fait notable : ce blocage n'est pas propre à 026-041 — `.orchestre/preuves/026-004/contre-verif-28-09.md` (même jour, autre agent) documente déjà que ces deux mêmes fichiers de 026-041, tant qu'ils restent non commités, **bloquent `revue-codex.mjs` pour toute fiche du dépôt**, pas seulement pour 026-041 elle-même (voir « Défaut établi » plus bas).
2. Code 125 → bascule prévue : **5 sabotages réversibles moi-même** (le minimum demandé était 4), chacun sur un fichier de **production** réellement lu par LL-10/LL-11 (jamais sur `scripts/agents-llm-qa.mjs` lui-même, jamais sur ses fixtures), chacun rougissant le bon critère du témoin exact de la fiche (`node scripts/agents-llm-qa.mjs --temoin`), avec à chaque fois : sha256 avant sabotage → sabotage seul (les autres cibles intactes) → `--temoin` pendant le sabotage (capture de la ligne FAIL exacte) → restauration depuis la copie de sauvegarde → re-sha256 (comparaison identique) → `git status` sur le fichier (aucune trace).
3. Témoin de référence, avant tout sabotage, rejoué indépendamment le 28/09 : **PASS, code 0**, LL-10 et LL-11 verts — reproduit le PASS de `.orchestre/preuves/026-041/verifier.log` (produit par l'agent à 08:39:37Z), donc pas un artefact d'un seul run.
4. Témoin final, après restauration complète des 5 sabotages : **PASS, code 0**, identique au témoin de référence. Puis `node scripts/agents-llm-qa.mjs --preuve-echecs` (le `verifier` exact de la fiche, pas seulement `--temoin`) rejoué en entier : **PASS, code 0** — le cycle complet (arbre courant code≠0 avec LL-1 rouge, puis `--temoin` entièrement vert) tient toujours après le passage des sabotages.

## Les 5 sabotages

| # | Fichier (production, hors périmètre du juge) | Édition | Critère rougi (`--temoin`, ligne FAIL exacte) | Reste inchangé |
|---|---|---|---|---|
| S1 | `lib/ai.ts` | ajout d'une ligne de commentaire en fin de fichier | `FAIL LL-10 — échec` / `✗ lib/ai.ts diffère de HEAD` | LL-11 (voir dérive non provoquée ci-dessous, sans rapport avec ce sabotage) |
| S2 | `package.json` | ajout d'une entrée fictive dans `devDependencies` (`"sabotage-reversible-028-041": "0.0.0"`) | `FAIL LL-10 — échec` / `✗ package.json diffère de HEAD` / `✗ devDependencies diffère de HEAD (nouvelle dépendance ?)` | LL-11 PASS |
| S3 | `lib/agents/bus.ts` (026-040, réel) | ajout d'un commentaire contenant `CODEX_LANCEUR` en fin de fichier | `FAIL LL-10 — échec` / `✗ lib\agents\bus.ts cite CODEX_LANCEUR (attendu : lib/agents/llm.ts seul)` | LL-11 PASS |
| S4 | `app/AppShell.tsx` (réel) | ajout d'un commentaire contenant `ANTHROPIC_AGENTS_KEY` en fin de fichier | `FAIL LL-10 — échec` / `✗ app\AppShell.tsx cite ANTHROPIC_AGENTS_KEY` | LL-11 PASS |
| S5 | `lib/ai.ts` (après restauration de S1) | ajout d'une ligne réelle en erreur de type : `const __sabotageReversible028TypeError: number = "texte-pas-un-nombre"` | `FAIL LL-10` (diffère de HEAD) **et** `FAIL LL-11 — npm run typecheck : code 2` / `✗ lib/ai.ts(1192,7): error TS2322: Type 'string' is not assignable to type 'number'.` | ligne et code d'erreur exacts, pas de faux négatif croisé |

Chaque sabotage a été testé **seul** (les autres cibles dans leur état d'origine), puis restauré avant le suivant. Dans les 5 cas, `--temoin` est ressorti en **code 1** avec exactement le ou les critères attendus en `FAIL` — jamais un critère non concerné qui rougit par accident (S1 excepté, voir ci-dessous, et cette exception n'est pas de mon fait).

## Une dérive non provoquée, observée en cours de route (transparence)

Entre le témoin de référence (PASS complet, LL-10 et LL-11 verts) et le témoin du sabotage S1 (une minute plus tard), **LL-11 est tombé en FAIL pour deux fichiers que je n'ai pas touchés** : `app/p/[slug]/icon.tsx` (`TS2339: Property 'slug' does not exist on type 'Promise<{ slug: string; }>'`) et `lib/siteRedacteur.ts` (`TS2322: Type 'string' is not assignable to type 'number'`). Un `tsc --noEmit` direct, rejoué immédiatement après la restauration de S1 (sha256 de `lib/ai.ts` revérifié identique), est revenu **propre (code 0)** sans que j'intervienne sur ces deux fichiers — et LL-11 est resté vert sur tous les sabotages suivants (S2 à S5).

Ce n'est ni un défaut de 026-041 ni un effet de mon sabotage : LL-11 lance le vrai `tsc --noEmit` et rapporte fidèlement ce qu'il trouve à l'instant où il tourne. C'est la preuve concrète, datée de ce 28/09 vers 10h55 locale, du risque déjà noté en mémoire (« Presti — sessions concurrentes » : plusieurs sessions écrivent dans presti en parallèle, se relire juste avant de remplacer un bloc) : **un `--temoin` PASS n'est garanti que pour l'instant précis où il tourne**, pas pour la seconde suivante, tant qu'une autre session édite `app/p/[slug]/icon.tsx` ou `lib/siteRedacteur.ts` en parallèle. Je n'ai touché ni corrigé ces deux fichiers (hors mandat : je ne modifie que mes propres sabotages, réversibles, sur des cibles que je choisis et restaure moi-même).

## Restauration — sha256 avant sabotages vs après restauration complète (identiques)

```
lib/ai.ts               50868867e730363d56dcf2629d31047f41b4d0a6a5b443382214cef1905bbba5
package.json             113841bbb357a91b5ab55f2f45a6c9bd78562cc4058ea0374e04035e275dc334
lib/agents/bus.ts       0c49010f84288e0b27a1497e218962bdd5eba8f33541933fa465feefaf1d7294
app/AppShell.tsx        83d4c17cf1f101fc2b53cef5e8191e5d44064f570fae3dbf2442a48c4d23bd42
scripts/agents-llm-qa.mjs                          (le juge — jamais sabotable, jamais touché ; non modifié pendant toute la session)
scripts/fixtures/026/llm/{executer,faux-lanceur,faux-jev}.mjs  (fixtures du juge — jamais touchées)
```

Chaque sha256 « après restauration » recalculé est identique à celui relevé avant le sabotage correspondant (comparaison montrée en direct pour chacun des 5, ci-dessus dans le déroulé des commandes). `git status --short` sur les 4 fichiers cibles, avant la session et après restauration complète : **vide dans les deux cas** — aucune trace résiduelle.

## Ce que ça établit

- Le PASS de 026-041 n'est pas un vert de façade : LL-10 (les 4 sous-vérifications : `package.json`, `lib/ai.ts`, `devDependencies`, fuite `CODEX_LANCEUR`/`ANTHROPIC_AGENTS_KEY` hors de `lib/agents/llm.ts`) et LL-11 (`tsc --noEmit` réel) détectent chacun, individuellement et sans faux négatif, un vrai défaut introduit dans la production réelle qu'ils sont censés couvrir. Le juge lit vraiment l'état vivant des fichiers (`fs.readFileSync` / `git show HEAD:` / un vrai process `tsc`), pas un texte figé ni un journal auto-déclaré.
- La conception de la fiche (18 critères mécaniques par faux lanceur/faux serveurs/faux Jev, `deps` injectées plutôt que `process.env`) correspond à ce que documente `echecs-attendus.md` : LL-1 est bien rouge sur l'arbre courant, `--temoin` bien vert, reproductible à deux reprises indépendantes (08:39 par l'agent, puis par moi).
- Rien n'est resté modifié hors `.orchestre/preuves/026-041/` et `.orchestre/travail/` : sha256 et `git status` identiques à l'état de début de session sur les 4 fichiers sabotés. Rien n'a été commité.

## Défaut établi (mineur, hors verdict, mais confirmé deux fois le même jour)

`revue-codex.mjs` (l'outil de contre-vérification lui-même) refuse tout paquet dès qu'un motif `sk-` / « nom sensible » traîne n'importe où dans l'arbre non commité — **y compris dans les sentinelles de test de 026-041 elle-même** (`.orchestre/fait/026-041.md:72`, `scripts/agents-llm-qa.mjs:100-104`), qui sont exactement les fichiers que 026-041 vient de livrer. Tant que ces deux fichiers restent non commités, **la revue Codex sur l'usine est impossible pour 026-041 elle-même ET pour toute autre fiche du dépôt** (confirmé indépendamment par `.orchestre/preuves/026-004/contre-verif-28-09.md`, même jour, avant mon passage). Non corrigé ici : hors périmètre de mon mandat (ne toucher que `.orchestre/preuves/026-041/` et `.orchestre/travail/`) et hors périmètre de 026-041 elle-même (`interdit` exclut `scripts/ts-loader.mjs`, `.orchestre/decisions.md`, etc., mais pas ce point précis — de toute façon commiter ou changer les sentinelles n'est pas dans son objectif). Signalé pour action côté file d'orchestre : soit committer 026-041 (fait/ + preuves + script) pour que `revue-codex.mjs` la traite comme `HEAD` et cesse de la bloquer, soit casser plus fort la sous-chaîne littérale `sk-` dans les 5 sentinelles (au-delà du `'sk-' + 'ant-'` déjà fait pour le garde-commit, qui ne suffit pas ici).
