# 026-044 — contre-vérification du 28/09

Verifier (`node scripts/pause-qa.mjs`) rejoué en l'état, avant tout sabotage : **PASS** (13 s), PA-1 à PA-6 et PA-8 à PA-10 verts, PA-7 SAUTÉ (`--reel`, après déploiement, réservé à Claude Code — cf. fiche). Conforme au `verifier.log` déjà déposé par l'exécutant.

## Moyen

D'abord Codex sur l'usine :

```
node ../presti-ops/usine/revue-codex.mjs 026-044 --sabotages=4
```

Résultat : **NON JUGÉ (code 125)**. Le contrôle du paquet par `usine.mjs` a refusé l'envoi — 8 motifs `sk-` (clé Anthropic/OpenAI) détectés dans deux fichiers **hors périmètre de cette fiche** et non commités par ailleurs dans le dépôt : `.orchestre/en-cours/026-041.md:72` et `scripts/agents-llm-qa.mjs:100-101`. Rien n'est parti sur l'usine ; aucun verdict Codex. Détail : `.orchestre/travail/revue-codex/026-044/` (executer.log). Je n'ai touché ni à ces deux fichiers ni à quoi que ce soit hors `.orchestre/preuves/026-044/` et `.orchestre/travail/` (hors périmètre imposé).

Code 125 → attaques maison, comme prévu par la consigne : 4 sabotages réversibles de la **production** (pas du témoin interne du juge), chacun devant rougir le bon critère de `pause-qa.mjs`, puis restauration à l'octet près (sha256).

Méthode par sabotage : sha256 avant (`sha256-avant.txt`), copie de sauvegarde dans `.orchestre/travail/contre-verif-026-044/backups/`, édition du fichier de production, `node scripts/pause-qa.mjs` (verifier complet, pas un critère isolé), restauration par copie de la sauvegarde, sha256 après.

## Quatre sabotages (production, pas le témoin du juge)

| # | fichier saboté | sabotage | code | critère rougi (seul) | sha256 restauré |
| --- | --- | --- | --- | --- | --- |
| S1 | `lib/agents/pause.ts` | `PAUSE_GENERALE === '1'` → `=== 'oui'` | 1 | `FAIL PA-1 — PAUSE_GENERALE=1 : {"active":true,"source":"panne"}, { active: true, source: 'variable' } attendu ; … 1 appel(s) à la base, aucun attendu` | oui (`8e2638ce…`) |
| S2 | `app/api/controle/pause/route.ts` | retrait de `if (refus) return refus` (reconfirmation ignorée) | 1 | `FAIL PA-2 — reconfirmation absente : HTTP 200, 403 attendu ; … reconfirmation rejouée : HTTP 200, 403 attendu` | oui (`f9afdfc4…`) |
| S3 | `docs/agents/pause-generale.md` | voie Vercel : `` `PAUSE_GENERALE=1` `` → `` `PRESTI_PAUSE_AGENTS=1` `` | 1 | `FAIL PA-5 — la voie Vercel ne nomme pas PAUSE_GENERALE ; la doc nomme PRESTI_PAUSE_AGENTS` | oui (`e0f52122…`) |
| S4 | `app/api/controle/pause/route.ts` | réponse POST : ajout de `file: { sequenceur: null }` | 1 | `FAIL PA-9 — la réponse du POST (actif true) porte un champ « sequenceur » ; … (actif false) … ; app/api/controle/pause/route.ts contient sequenceur` | oui (`f9afdfc4…`) |

Sabotages rougis sur le bon critère, et **seulement** lui (PA-1..PA-10 relevés à chaque passage, aucun autre critère touché) : **4/4**.

`lib/direction/journal.ts` n'a pas été saboté séparément (PA-4 est déjà couvert dans le témoin interne du juge, `--temoin`, et le sabotage aurait dû passer par le même fichier que PA-2/PA-9 ; les 4 retenus couvrent 4 fichiers/critères distincts sans redondance : `lib/agents/pause.ts`, la route deux fois sur deux critères indépendants, et la doc).

## Restauration — preuve

- `sha256-avant.txt` / `sha256-apres.txt` (`.orchestre/travail/contre-verif-026-044/`) : **identiques** ligne à ligne (`diff` vide) pour les 4 fichiers du périmètre (`lib/agents/pause.ts`, `app/api/controle/pause/route.ts`, `lib/direction/journal.ts`, `docs/agents/pause-generale.md`).
- `git status --short` sur ces 4 fichiers après contre-vérification : identique à avant (`M lib/direction/journal.ts`, `??` pour les trois autres) — rien commité, rien perdu.
- Verifier complet rejoué après restauration : **PASS** (`05-final-verifier.log`).
- `node scripts/pause-qa.mjs --temoin` rejoué après restauration : **PASS**, 4+7+3+3+8+7+3+4 = 39 sabotages déclarés du témoin interne tous pris (`06-final-temoin.log`) — cohérent avec ce que l'exécutant avait rapporté.

Logs conservés : `.orchestre/travail/contre-verif-026-044/{00-baseline,01-sabotage-PA1,02-sabotage-PA2,03-sabotage-PA5,04-sabotage-PA9,05-final-verifier,06-final-temoin}.log`, `sha256-avant.txt`, `sha256-apres.txt`, `backups/*.orig`.

## Défauts

Aucun défaut établi sur le périmètre de la fiche (`lib/agents/pause.ts`, `app/api/controle/pause/route.ts`, `lib/direction/journal.ts`, `docs/agents/pause-generale.md`). Le code source relu correspond point par point à ce que demande la fiche (source unique de la pause à trois niveaux — variable, base, panne —, ordre garde → reconfirmation → motif → journal → écriture dans la route, type `Action` étendu du seul littéral `'pause_generale'`, quatre voies et listes coupé/passe dans la doc).

Un seul point hors périmètre, déjà connu de la fiche elle-même : le diff n'est pas commité (« Diff à faire relire et pousser par Benj (sécurité) avant tout déploiement », rappelé par le `pour_claude` de la fiche) — ce n'est pas un défaut de 026-044, c'est l'étape suivante attendue. PA-7 (`--reel`) reste SAUTÉ : il exige un déploiement en prod, non fait à ce jour.

## Verdict

**VERT confirmé.** Codex non disponible (125, cause hors périmètre : secrets détectés dans des fichiers non liés à 026-044) ; contre-vérification maison sur la production réelle : 4/4 sabotages rougissent le bon critère et rien d'autre, restauration à l'octet près prouvée par sha256, témoin complet vert avant et après.
