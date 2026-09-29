# 026-045 — les juges du lot 04 échouent sur la référence et passent en témoin

Écrit par `node scripts/juges-026-horloge-bus-preuve.mjs --lot=04` le 2026-09-29T11:01:29.080Z. Référence : `86ce0f3be9c202d9e0bb11448642c033c5449e57` (extraite par `git archive` de `lib`, `app`, `scripts`, sans rien écrire dans `.git`). Une ligne par juge : le critère attendu en échec sur la référence, l'extrait réel de la sortie (sa ligne en échec), le verdict du témoin. Les critères propres au lot sont déclarés dans `scripts/fixtures/026-horloge-bus/preuve-04.json` ; le plancher du cahier de 026-045 est vérifié. Les sorties complètes sont dans `sorties/`.

L'extrait est LA ligne de rapport du critère attendu (« FAIL <id> — … »), jamais la ligne d'un autre critère qui le cite.

| Juge | Code sur la référence | Critère attendu | Extrait réel de la sortie | Témoin | --reel, réseau coupé, clés-canaris |
|---|---|---|---|---|---|
| `node scripts/file-argent-qa.mjs` | 1 | AF-1 | FAIL AF-1 — lib/agents/fileArgent.ts absent | code 0, PASS | non demandé |
| `node scripts/veilleur-qa.mjs` | 1 | VA-1 | FAIL VA-1 — lib/agents/veilleur.ts absent | code 0, PASS | non demandé |
| `node scripts/tic-qa.mjs` | 1 | TC-1 | FAIL TC-1 — app/api/agents/tic/route.ts absent | code 0, PASS | non demandé |
| `node scripts/horloge-qa.mjs` | 1 | E24-0 | FAIL E24-0 — scripts/fixtures/026-horloge-bus/contrat-ops.json absent de l'arbre : ops_horloge_etat n'y est pas au contrat ; app/api/agents/tic/route.ts absent | code 0, PASS | non demandé |

## Contrôles de la preuve

- JP-1 : `echec-sur-reference`
- JP-2 : `temoin`
- JP-3 : `horloge-simulee`
- JP-4 : `reseau-piege`
- JP-5 : `immobile`
- JP-6 : `motifs`, `motifs`

- **JP-1** PASS — [autotest echec-sur-reference : lecture des sorties : 6 sorties plantées refusées (dont le critère PASS à tort cité par d'autres), la conforme acceptée] ; file-argent-qa code 1, « FAIL AF-1 — lib/agents/fileArgent.ts absent » ; réécrit en PASS sur la sortie réelle (7 ligne(s) d'autres critères le citent encore) : vu ; veilleur-qa code 1, « FAIL VA-1 — lib/agents/veilleur.ts absent » ; réécrit en PASS sur la sortie réelle (18 ligne(s) d'autres critères le citent encore) : vu ; tic-qa code 1, « FAIL TC-1 — app/api/agents/tic/route.ts absent » ; réécrit en PASS sur la sortie réelle (9 ligne(s) d'autres critères le citent encore) : vu ; horloge-qa code 1, « FAIL E24-0 — scripts/fixtures/026-horloge-bus/contrat-ops.json absent de l'arbr… » ; réécrit en PASS sur la sortie réelle (0 ligne(s) d'autres critères le citent encore) : vu
- **JP-2** PASS — [autotest temoin : code ≠ 0, bilan FAIL ou absent, délai : refusés ; code 0 + bilan PASS : accepté] ; file-argent-qa --temoin code 0, bilan PASS ; veilleur-qa --temoin code 0, bilan PASS ; tic-qa --temoin code 0, bilan PASS ; horloge-qa --temoin code 0, bilan PASS
- **JP-3** PASS — [autotest horloge-simulee : témoin accepté (2026-10-24T05:30:00Z → 07:30, 2026-10-25T06:30:00Z → 07:30, 2026-10-20T16:30:00Z → 18:30) ; sabotages pris : figer, avancer, decale, fuseau] ; scripts/lib/horloge-simulee.mjs : 2026-10-24T05:30:00Z → 07:30, 2026-10-25T06:30:00Z → 07:30, 2026-10-20T16:30:00Z → 18:30 à Paris ; avancer(300000) suivi par Date.now(), new Date() et performance.now()
- **JP-4** PASS — [autotest reseau-piege : fetch, http.request et net.connect vers un hôte refusé notés et bloqués, en permis comme en interdits ; 127.0.0.1 laissé passer] ; file-argent-qa (reference) : piège chargé dans 1 processus, aucune tentative ; file-argent-qa (temoin) : piège chargé dans 26 processus, aucune tentative ; veilleur-qa (reference) : piège chargé dans 1 processus, aucune tentative ; veilleur-qa (temoin) : piège chargé dans 62 processus, aucune tentative ; tic-qa (reference) : piège chargé dans 1 processus, aucune tentative ; tic-qa (temoin) : piège chargé dans 29 processus, aucune tentative ; horloge-qa (reference) : piège chargé dans 1 processus, aucune tentative ; horloge-qa (temoin) : piège chargé dans 1 processus, aucune tentative
- **JP-5** PASS — [autotest immobile : fichier apparu, modifié ou rétabli : vu ; états égaux : acceptés] ; git status --porcelain et empreintes de 31 fichier(s) modifié(s) ou non suivi(s) identiques avant et après (tenue de l'orchestre et périmètres des autres fiches de en-cours/ écartés)
- **JP-6** PASS — [autotest motifs : motif interdit présent, compte hors bornes, fichier vide, aucun fichier : refusés ; conforme accepté] ; 25 fichier(s) sous scripts/fixtures/026-horloge-bus/veilleur : sans « boite », sans « sequenceur », sans « liste_noire », sans « arret_email » ; [autotest motifs : motif interdit présent, compte hors bornes, fichier vide, aucun fichier : refusés ; conforme accepté] ; 1 fichier(s) sous scripts/veilleur-qa.mjs : « VA-19 » 3 à ∞ fois, « decisions_vercel » 2 à ∞ fois, « presti-secrets/meta-bibliotheque-pubs\.txt » 2 à ∞ fois, « arret_froid » 1 à ∞ fois, « choisir un autre segment ou une autre offre » 1 à ∞ fois

Verdict : **PASS**
