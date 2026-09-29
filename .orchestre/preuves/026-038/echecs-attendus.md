# 026-038 — les juges du lot 03 échouent sur la référence et passent en témoin

Écrit par `node scripts/juges-026-horloge-bus-preuve.mjs --lot=03` le 2026-09-29T14:19:43.343Z. Référence : `86ce0f3be9c202d9e0bb11448642c033c5449e57` (extraite par `git archive` de `lib`, `app`, `scripts`, `docs`, sans rien écrire dans `.git`). Une ligne par juge : le critère attendu en échec sur la référence, l'extrait réel de la sortie (sa ligne en échec), le verdict du témoin. Les critères propres au lot sont déclarés dans `scripts/fixtures/026-horloge-bus/preuve-03.json` ; le plancher du cahier de 026-038 est vérifié. Les sorties complètes sont dans `sorties/`.

L'extrait est LA ligne de rapport du critère attendu (« FAIL <id> — … »), jamais la ligne d'un autre critère qui le cite.

| Juge | Code sur la référence | Critère attendu | Extrait réel de la sortie | Témoin | --reel, réseau coupé, clés-canaris |
|---|---|---|---|---|---|
| `node scripts/agents-garde-qa.mjs` | 1 | AG-1 | FAIL AG-1 — lib/agents/jetons.ts absent | code 0, PASS | non demandé |
| `node scripts/agents-routes-qa.mjs` | 1 | AR-1 | FAIL AR-1 — 7 fichier(s) de route absent(s) : app/api/agents/taches/route.ts, app/api/agents/taches/prendre/route.ts, app/api/agents/taches/[id]/rendre/route.ts, app/api/agents/evenements/route.ts, app/api/agents/decisions/route.ts, app/api/agents/battement/route.ts, app/api/agents/etat/route.ts | code 0, PASS | non demandé |
| `node scripts/pause-qa.mjs` | 1 | PA-1 | FAIL PA-1 — lib/agents/pause.ts absent ; lib/agents/bus.ts absent | code 0, PASS | non demandé |

## Contrôles de la preuve

- JP-1 : `echec-sur-reference`
- JP-2 : `temoin`
- JP-3 : `faux-postgrest`
- JP-4 : `reseau-piege`
- JP-5 : `immobile`

- **JP-1** PASS — [autotest echec-sur-reference : lecture des sorties : 6 sorties plantées refusées (dont le critère PASS à tort cité par d'autres), la conforme acceptée] ; agents-garde-qa code 1, « FAIL AG-1 — lib/agents/jetons.ts absent » ; réécrit en PASS sur la sortie réelle (6 ligne(s) d'autres critères le citent encore) : vu ; agents-routes-qa code 1, « FAIL AR-1 — 7 fichier(s) de route absent(s) : app/api/agents/taches/route.ts, a… » ; réécrit en PASS sur la sortie réelle (11 ligne(s) d'autres critères le citent encore) : vu ; pause-qa code 1, « FAIL PA-1 — lib/agents/pause.ts absent ; lib/agents/bus.ts absent » ; réécrit en PASS sur la sortie réelle (7 ligne(s) d'autres critères le citent encore) : vu
- **JP-2** PASS — [autotest temoin : code ≠ 0, bilan FAIL ou absent, délai : refusés ; code 0 + bilan PASS : accepté] ; agents-garde-qa --temoin code 0, bilan PASS ; agents-routes-qa --temoin code 0, bilan PASS ; pause-qa --temoin code 0, bilan PASS
- **JP-3** PASS — [autotest faux-postgrest : témoin accepté (ops_tache_creer conforme → 200, p_agent → agent → 400) ; sabotages pris : laxiste, ferme, muet, immortel] ; scripts/lib/faux-postgrest.mjs, démarré par la preuve : ops_tache_creer conforme au contrat → HTTP 200 ; p_agent renommé agent → HTTP 400 ; appels consignés 0 → 1 → 2 ; arreter() ferme
- **JP-4** PASS — [autotest reseau-piege : fetch, http.request et net.connect vers un hôte refusé notés et bloqués, en permis comme en interdits ; 127.0.0.1 laissé passer] ; agents-garde-qa (reference) : piège chargé dans 1 processus, aucune tentative ; agents-garde-qa (temoin) : piège chargé dans 61 processus, aucune tentative ; agents-routes-qa (reference) : piège chargé dans 1 processus, aucune tentative ; agents-routes-qa (temoin) : piège chargé dans 43 processus, aucune tentative ; pause-qa (reference) : piège chargé dans 1 processus, aucune tentative ; pause-qa (temoin) : piège chargé dans 27 processus, aucune tentative
- **JP-5** PASS — [autotest immobile : fichier apparu, modifié ou rétabli : vu ; états égaux : acceptés] ; git status --porcelain et empreintes de 1387 fichier(s) modifié(s) ou non suivi(s) identiques avant et après (tenue de l'orchestre et périmètres des autres fiches de en-cours/ écartés)

Verdict : **PASS**
