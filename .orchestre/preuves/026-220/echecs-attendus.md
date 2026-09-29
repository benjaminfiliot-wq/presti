# 026-220 — échecs attendus du juge de complétude (`scripts/juges-026-completude-qa.mjs --preuve-echecs`)

Produit le 2026-09-29T17:21:13.176Z ; horloge des juges figée au 2026-09-27T10:00:00.000Z ; chaque juge tourne hors réseau (fetch, http(s), http2, net, tls, dgram, dns, child_process et Worker coupés et comptés ; lecture de .env*, presti-secrets, .ssh, .claude refusée).
Les deux sens se lisent au **code de sortie** et au **rapport JSON** de chaque juge enfant, jamais au texte qu'il imprime.

## Contrôles

- Dépendances de 026-220 (026-001, 026-020, 026-065) : 026-001 PASS, 026-020 PASS, 026-065 PASS.
- Témoin (`scripts/fixtures/026-completude/temoin/`, implémentation de référence jamais déployée) : code 0, 0 critère(s) rouge(s) ; critères par partie : openclaw 14, cursor 9, firecrawl 11, fish 12, entrant 12, douleurs 10, experience 10.
- État d'avant (racine vide) : code 1 ; présence rouge 7/7 ; aucun critère vert sans implémentation : oui.
- Dépôt réel, dépendances exigées (code 1) : openclaw rouge (absent) ; cursor vert ; firecrawl vert ; fish vert ; entrant rouge (absent) ; douleurs rouge (absent) ; experience rouge (absent).
- Sabotages détectés : 90/90 (openclaw 16/16 · cursor 11/11 · firecrawl 12/12 · fish 11/11 · entrant 20/20 · douleurs 9/9 · experience 11/11).
- Faux secrets retrouvés dans 186 sorties et rapports : 0.

## Budget de fichiers (6 annoncés)

Neuf fichiers : le juge, un témoin par partie (sept : le lanceur OpenClaw porte sa configuration, le compte rendu entrant porte son journal) et la preuve brute fictive de l'étape « demande » du témoin entrant, qui exerce le chemin « prouvé ». La leçon du 26/09 exige un témoin qui sache être vert pour chaque partie jugée ; les preuves sont écrites par le juge.
**Dépassement NON couvert par la fiche** (budget 6) : à acter par la session principale, dans la fiche ou dans l'INDEX. Les témoins ne se regroupent pas sans perdre leur rôle : chacun se trouve au chemin exact que le juge charge pour sa partie.

## Règle « clés lues dans presti-secrets, jamais affichées »

- **Jamais affichées** : prouvé ici (OC-8, OC-12, OC-13, FC-9, FA-10, FA-11 ; faux secrets ESSAI- tirés à chaque passage et cherchés dans chaque sortie). CU-5 prouve que l'adaptateur Cursor ne lit aucun secret.
- **Lues dans presti-secrets** : NON jugé ici. Le juge injecte les clés (deps.cle, paramètre env) et refuse lui-même toute lecture de presti-secrets. La règle est inscrite au contrat de 026-221 à 026-224 (`--contrat`) et se juge dans ces fiches, sur le câblage appelant (critère statique ou `--reel` propre à la fiche).

## Contre-vérification du 27/09 : chaque trou a son cas et son sabotage

- H1 (OC-11) : voie ollama-local et modèle local déclaré exigés ; préférences cloud et freellmapi éprouvées ; sabotages « cloud sans suffixe », « modèle cloud étiqueté local » et « préférence suivie ». Même cause, relevée à la reprise : une donnée non classée reste fermée.
- H2 (OC-9) : toute origine absente de configuration().sorties rend false, hôtes internes compris ; sabotage « tout hôte interne en http ».
- H3 (CU-6) : sosies, sous-domaine et identifiants dans l'URL refusés ; sabotages « sous-chaîne » et « suffixe ».
- H4 (FA-4, FA-7) : solde positif inférieur au besoin → ff_siwis, aucune réservation au-delà du solde ; sabotage « solde <= 0 ».
- H5 (EX-2) : chaque condition du verrou éprouvée seule ; sabotages « confirme ignoré » et « confirme absent accepté ». Même cause, relevée à la reprise : indicateur test absent.
- H6 (EN-12) : lexique élargi (opérationnel, fonctionne, en service, livré, terminé, déployé, prêt à l'emploi) ; seule la négation qui porte sur le mot excuse.
- H7 (CU-2) : PASS d'un autre juge ou sans juge nommé → voie inactive.
- OC-12 : chaque mutation refusée par OC-2 à OC-9 repasse par lancer(), sans docker ni connexion, avec le même code de refus.

## Sabotages du témoin

| n° | critère attendu | fichier du témoin | code | rouges observés | verdict |
|---|---|---|---|---|---|
| 1 | OC-8 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-8, OC-12 | détecté |
| 2 | OC-8 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-8 | détecté |
| 3 | OC-5 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-5, OC-12 | détecté |
| 4 | OC-9 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-9 | détecté |
| 5 | OC-11 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-11 | détecté |
| 6 | OC-12 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-12 | détecté |
| 7 | OC-11 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-11 | détecté |
| 8 | OC-11 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-11 | détecté |
| 9 | OC-11 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-11 | détecté |
| 10 | OC-11 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-11 | détecté |
| 11 | OC-10 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-2, OC-3, OC-4, OC-5, OC-6, OC-7, OC-8, OC-10, OC-12, OC-13 | détecté |
| 12 | OC-9 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-9 | détecté |
| 13 | OC-12 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-12 | détecté |
| 14 | OC-7 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-7, OC-12 | détecté |
| 15 | OC-3 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-3, OC-12 | détecté |
| 16 | OC-10 | `presti/scripts/usine/openclaw/lanceur.mjs` | 1 | OC-10, OC-12 | détecté |
| 17 | CU-2 | `orchestre/bin/cursor.mjs` | 1 | CU-2 | détecté |
| 18 | CU-2 | `orchestre/bin/cursor.mjs` | 1 | CU-2 | détecté |
| 19 | CU-6 | `orchestre/bin/cursor.mjs` | 1 | CU-6 | détecté |
| 20 | CU-6 | `orchestre/bin/cursor.mjs` | 1 | CU-6 | détecté |
| 21 | CU-4 | `orchestre/bin/cursor.mjs` | 1 | CU-4 | détecté |
| 22 | CU-4 | `orchestre/bin/cursor.mjs` | 1 | CU-4 | détecté |
| 23 | CU-7 | `orchestre/bin/cursor.mjs` | 1 | CU-7 | détecté |
| 24 | CU-6 | `orchestre/bin/cursor.mjs` | 1 | CU-6 | détecté |
| 25 | CU-5 | `orchestre/bin/cursor.mjs` | 1 | CU-5 | détecté |
| 26 | CU-3 | `orchestre/bin/cursor.mjs` | 1 | CU-3 | détecté |
| 27 | CU-8 | `orchestre/bin/cursor.mjs` | 1 | CU-8 | détecté |
| 28 | FC-3 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-3 | détecté |
| 29 | FC-3 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-3 | détecté |
| 30 | FC-4 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-4 | détecté |
| 31 | FC-4 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-4 | détecté |
| 32 | FC-4 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-4 | détecté |
| 33 | FC-6 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-6 | détecté |
| 34 | FC-5 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-5 | détecté |
| 35 | FC-7 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-7 | détecté |
| 36 | FC-2 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-2 | détecté |
| 37 | FC-8 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-8 | détecté |
| 38 | FC-9 | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-9 | détecté |
| 39 | FC-R | `presti/lib/agents/lectureFirecrawl.ts` | 1 | FC-R | détecté |
| 40 | FA-2 | `presti/lib/studio/voixFish.ts` | 1 | FA-2, FA-5, FA-6 | détecté |
| 41 | FA-4 | `presti/lib/studio/voixFish.ts` | 1 | FA-4 | détecté |
| 42 | FA-4 | `presti/lib/studio/voixFish.ts` | 1 | FA-4, FA-7 | détecté |
| 43 | FA-5 | `presti/lib/studio/voixFish.ts` | 1 | FA-5 | détecté |
| 44 | FA-9 | `presti/lib/studio/voixFish.ts` | 1 | FA-2, FA-4, FA-5, FA-7, FA-9, FA-11 | détecté |
| 45 | FA-7 | `presti/lib/studio/voixFish.ts` | 1 | FA-7 | détecté |
| 46 | FA-6 | `presti/lib/studio/voixFish.ts` | 1 | FA-6 | détecté |
| 47 | FA-8 | `presti/lib/studio/voixFish.ts` | 1 | FA-8 | détecté |
| 48 | FA-3 | `presti/lib/studio/voixFish.ts` | 1 | FA-3 | détecté |
| 49 | FA-10 | `presti/lib/studio/voixFish.ts` | 1 | FA-10 | détecté |
| 50 | FA-11 | `presti/lib/studio/voixFish.ts` | 1 | FA-11 | détecté |
| 51 | EN-4 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-4 | détecté |
| 52 | EN-4 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-4 | détecté |
| 53 | EN-5 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-5 | détecté |
| 54 | EN-7 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-7 | détecté |
| 55 | EN-8 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-8 | détecté |
| 56 | EN-8 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-8 | détecté |
| 57 | EN-6 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-6 | détecté |
| 58 | EN-10 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-10 | détecté |
| 59 | EN-11 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-11, EN-12 | détecté |
| 60 | EN-11 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-11 | détecté |
| 61 | EN-9 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-9 | détecté |
| 62 | EN-11 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-6, EN-11 | détecté |
| 63 | EN-11 | `presti/.orchestre/preuves/026-225/demande-essai.txt` | 1 | EN-11 | détecté |
| 64 | EN-2 | `presti/.orchestre/preuves/026-225/demande-essai.txt` | 1 | EN-2 | détecté |
| 65 | EN-3 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-3 | détecté |
| 66 | EN-2 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-2 | détecté |
| 67 | EN-12 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-12 | détecté |
| 68 | EN-12 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-12 | détecté |
| 69 | EN-12 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-12 | détecté |
| 70 | EN-12 | `presti/docs/agents/recette-entrant-2026-09-27.md` | 1 | EN-12 | détecté |
| 71 | DO-2 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-2 | détecté |
| 72 | DO-2 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-2 | détecté |
| 73 | DO-3 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-3 | détecté |
| 74 | DO-5 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-3, DO-5, DO-6, DO-7 | détecté |
| 75 | DO-8 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-8 | détecté |
| 76 | DO-4 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-4 | détecté |
| 77 | DO-6 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-6 | détecté |
| 78 | DO-7 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-7 | détecté |
| 79 | DO-9 | `presti/scripts/chef/douleurs.mjs` | 1 | DO-3, DO-7, DO-9 | détecté |
| 80 | EX-2 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-2 | détecté |
| 81 | EX-2 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-2 | détecté |
| 82 | EX-2 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-2 | détecté |
| 83 | EX-2 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-2 | détecté |
| 84 | EX-8 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-8 | détecté |
| 85 | EX-6 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-6 | détecté |
| 86 | EX-5 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-5 | détecté |
| 87 | EX-3 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-3 | détecté |
| 88 | EX-4 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-4 | détecté |
| 89 | EX-7 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-7 | détecté |
| 90 | EX-9 | `presti/scripts/chef/lancer-experience.mjs` | 1 | EX-9 | détecté |

## Remplacements appliqués (texte exact → remplacement)

1. **OC-8** — `if (NOM_CLAUDE.test(nom)) return refus(` → `if (false && NOM_CLAUDE.test(nom)) return refus(`
2. **OC-8** — `const envConteneur = Object.fromEntries(noms.map((n) => [n, env[n]]))` → `const envConteneur = { ...env }`
3. **OC-5** — `for (const v of c.volumes || []) if (!sourceNommee(v.source))` → `for (const v of c.volumes || []) if (false && !sourceNommee(v.source))`
4. **OC-9** — `return config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)` → `return u.protocol === 'https:' || config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)`
5. **OC-11** — `if (donnees !== 'publique') {` → `if (donnees !== 'publique' && disponibles['ollama-local']) {`
6. **OC-12** — `if (p.refus) { deps.journal?.(ˋrefus ${p.refus}ˋ); return p }` → `if (p.refus) { deps.journal?.(ˋrefus ${p.refus}ˋ); await deps.docker(['run', String(config.image)], {}); return p }`
7. **OC-11** — `if (donnees !== 'publique') {` → `if (donnees !== 'publique') {⏎ if (disponibles['ollama-cloud']) return { fournisseur: 'ollama', modele: 'gpt-oss:120b', voie: 'ollama-cloud' }`
8. **OC-11** — `if (disponibles['ollama-local'] && locaux.length) return { ...locaux[0], voie: 'ollama-local' }⏎ return refus('donnees_prospect'` → `if (disponibles['ollama-cloud'] && nuages.length) return { ...nuages[0], voie: 'ollama-local' }⏎ return refus('donnees_prospect'`
9. **OC-11** — `if (donnees !== 'publique') {` → `if (prefere) return { ...prefere, voie: prefere.voie || 'ollama-cloud' }⏎ if (donnees !== 'publique') {`
10. **OC-11** — `if (donnees !== 'publique') {` → `if (donnees === 'prospect') {`
11. **OC-10** — `{ fournisseur: 'ollama', modele: 'gpt-oss:120b', voie: 'ollama-cloud' },` → `{ fournisseur: 'ollama', modele: 'gpt-oss:120b' },`
12. **OC-9** — `return config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)` → `return (u.protocol === 'http:' && interne(u.hostname)) || config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)`
13. **OC-12** — `if (p.refus) { deps.journal?.(ˋrefus ${p.refus}ˋ); return p }` → `if (p.refus) { deps.journal?.(ˋrefus ${p.refus}ˋ); if (p.refus === 'port_expose') await deps.connecter('http://127.0.0.1:18789/'); return p }`
14. **OC-7** — `for (const p of c.ports || []) if (p.hote !== '127.0.0.1')` → `for (const p of c.ports || []) if (false)`
15. **OC-3** — `if (!c.utilisateur || /^(root|0)(:|$)/.test(String(c.utilisateur))) return refus(` → `if (!c.utilisateur) return refus(`
16. **OC-10** — `const modeleAdmis = (m) => FOURNISSEURS.includes(m?.fournisseur) && !MODELE_CLAUDE.test(String(m?.modele || ''))` → `const modeleAdmis = (m) => !!m?.fournisseur`
17. **CU-2** — `const cout = typeof tarif?.cout_par_tache === 'number' ? tarif.cout_par_tache : 'non mesuré'` → `const cout = typeof tarif?.cout_par_tache === 'number' ? tarif.cout_par_tache : 0`
18. **CU-2** — `if (temoin?.juge !== '026-220' || temoin?.verdict !== 'PASS')` → `if (temoin?.verdict !== 'PASS')`
19. **CU-6** — `if (!(tache.reseau || []).includes(hote))` → `if (!(tache.reseau || []).some((h) => hote.includes(h)))`
20. **CU-6** — `if (!(tache.reseau || []).includes(hote))` → `if (!(tache.reseau || []).some((h) => hote.endsWith(h)))`
21. **CU-4** — `if (dans(c, tache.interdit)) return refus('interdit'` → `if (false && dans(c, tache.interdit)) return refus('interdit'`
22. **CU-4** — `const c = normaliser(cible)` → `const c = String(cible).replace(/\\/g, '/')`
23. **CU-7** — `{ flag: 'wx' }` → `{ flag: 'w' }`
24. **CU-6** — `/\bgit\s+(reset\s+--hard|clean\b|restore\b|stash\b|checkout\s+--|revert\b)/i,` → `/\bgit\s+(revert\b)/i,`
25. **CU-5** — `/(^|[\/\s"'])presti-secrets([\/\s"']|$)/i,` → `(supprimé)`
26. **CU-3** — `const SENSIBLES = ['argent', 'securite', 'droits', 'cerveau']` → `const SENSIBLES = ['argent']`
27. **CU-8** — `consommation: typeof consommation === 'number' ? consommation : 'non mesuré'` → `consommation: consommation ?? 0`
28. **FC-3** — `if (robotsInterdit(robots, u.pathname + u.search)) return { refus: 'robots' }` → `if (false && robotsInterdit(robots, u.pathname + u.search)) return { refus: 'robots' }`
29. **FC-3** — `if (robots === null || robots === undefined) return { refus: 'robots_inconnu' }` → `if (robots === undefined) return { refus: 'robots_inconnu' }`
30. **FC-4** — `c.plafond > PLAFOND_CAHIER` → `c.plafond > 100000`
31. **FC-4** — `if (c.consommes + cout > c.plafond) return` → `if (c.consommes + cout > PLAFOND_CAHIER) return`
32. **FC-4** — `if (typeof c.consommes !== 'number' || !c.date || !c.source) return 'mesure_absente'` → `if (typeof c.consommes !== 'number') return 'mesure_absente'`
33. **FC-6** — `if (r.statut === 429) return parRepli(url, '429', deps)` → `if (r.statut === 429) return { refus: 'quota_firecrawl' }`
34. **FC-5** — `const source = meta.sourceURL || meta.url` → `const source = meta.sourceURL || meta.url || url`
35. **FC-7** — `if (!hotePublic(source) || neutre(new URL(source).hostname) !== neutre(u.hostname)) return { refus: 'redirection' }` → `if (!/^https?:/.test(source)) return { refus: 'redirection' }`
36. **FC-2** — `if (!hotePublic(url) || COMPTE.test(new URL(url).pathname)) return { refus: 'hote' }` → `if (!/^https?:/.test(url)) return { refus: 'hote' }`
37. **FC-8** — `if (PERSONNEL.test(demande.requete)) return { refus: 'donnee_personnelle' }` → `if (false) return { refus: 'donnee_personnelle' }`
38. **FC-9** — `texte,⏎ url_finale: source,` → `texte,⏎ cle_utilisee: deps.cle,⏎ url_finale: source,`
39. **FC-R** — `r = await deps.firecrawl('scrape',` → `await fetch('https://api.firecrawl.dev/v1/scrape', { method: 'POST' }).catch(() => null)⏎ r = await deps.firecrawl('scrape',`
40. **FA-2** — `if (d.usage === 'usage_commercial') {` → `if (d.usage === 'usage_commercial' && (await deps.sonder()).statut !== 200) {`
41. **FA-4** — `const solde = typeof q?.solde === 'number' ? q.solde : null` → `const solde = typeof q?.solde === 'number' ? q.solde : 1e9`
42. **FA-4** — `if (solde < besoin) return 'quota_epuise'` → `if (solde <= 0) return 'quota_epuise'`
43. **FA-5** — `if (!r.expire_le || Date.parse(r.expire_le) <= deps.horloge.maintenant()) return 'licence_expiree'` → `if (!r.expire_le) return 'licence_expiree'`
44. **FA-9** — `fournisseur: 'local', voix: VOIX_LOCALE,` → `fournisseur: 'fish', voix: VOIX_LOCALE,`
45. **FA-7** — `await deps.credits.restituer(d.id)⏎` → `(supprimé)`
46. **FA-6** — `if (deja) return deja` → `if (false && deja) return deja`
47. **FA-8** — `if (d.voix_clonee && !(d.droit_clonage?.accorde && d.droit_clonage.source && d.droit_clonage.date)) return { refus: 'clonage' }` → `if (d.voix_clonee && d.droit_clonage === false) return { refus: 'clonage' }`
48. **FA-3** — `publiable: d.usage === 'usage_commercial', date,` → `publiable: true, date,`
49. **FA-10** — `source_texte: d.source_texte, credits: besoin }` → `source_texte: d.source_texte, credits: besoin, cle: deps.cle }`
50. **FA-11** — `if (!deps.cle) return 'cle_absente'⏎` → `(supprimé)`
51. **EN-4** — `maquette-001` → `maquette-002`
52. **EN-4** — `"id_message": "msg-essai-001",⏎ "destinataire": "artisan.essai@presti-test.invalid",⏎ "empreinte": "` → `"id_message": "msg-essai-001",⏎ "destinataire": "artisan.essai@presti-test.invalid",⏎ "empreinte": "f`
53. **EN-5** — `"expire_le": "2026-09-27T10:40:00.000Z",` → `"expire_le": "2026-09-27T10:11:00.000Z",`
54. **EN-7** — `"retiree_le": null` → `"retiree_le": "2026-09-27T10:11:00.000Z"`
55. **EN-8** — `"froid_ouvert": false,` → `"froid_ouvert": true,`
56. **EN-8** — `"id_message": "msg-essai-002",⏎ "destinataire": "artisan.essai@presti-test.invalid",` → `"id_message": "msg-essai-002",⏎ "destinataire": "voisin.essai@presti-test.invalid",`
57. **EN-6** — `"id_accord": "acc-essai-002",⏎ "id_message": "msg-essai-002"` → `"id_accord": "acc-essai-001",⏎ "id_message": "msg-essai-002"`
58. **EN-10** — `"modele": "qwen3:8b"` → `"modele": "gpt-oss:120b-cloud"`
59. **EN-11** — `"verdict": "pratiquement prêt",` → `"verdict": "démontré",`
60. **EN-11** — `"duree_s": 1080,` → `"duree_s": 60,`
61. **EN-9** — `"relances": 0` → `"relances": 1`
62. **EN-11** — `"etape": "envoi",⏎ "etat": "simulé",` → `"etape": "envoi",⏎ "etat": "prouvé",`
63. **EN-11** — `dem-essai-001` → `dem-essai-999`
64. **EN-2** — `adresse artisan.essai@presti-test.invalid` → `adresse artisan.essai@example.org`
65. **EN-3** — `"precoche": false,` → `"precoche": true,`
66. **EN-2** — `Toutes les personnes et adresses sont fictives` → `Contact : artisan.reel@example.com. Toutes les personnes et adresses sont fictives`
67. **EN-12** — `## Étapes` → `La voie entrante est prête pour les clients.⏎⏎## Étapes`
68. **EN-12** — `## Étapes` → `La voie entrante est opérationnelle pour les clients.⏎⏎## Étapes`
69. **EN-12** — `## Étapes` → `Le parcours fonctionne de bout en bout.⏎⏎## Étapes`
70. **EN-12** — `n’est pas encore opérationnelle` → `est opérationnelle`
71. **DO-2** — `if (deja) return { cle, deja: true, rapport: deja }` → `if (false && deja) return { cle, deja: true, rapport: deja }`
72. **DO-2** — `if (horloge.maintenant() < fin) return { refus: 'mois_non_ecoule' }` → `if (horloge.maintenant() < debut) return { refus: 'mois_non_ecoule' }`
73. **DO-3** — `nombre: g.nombres.includes(null) ? 'non mesuré' : g.nombres.reduce((x, y) => x + y, 0),` → `nombre: g.nombres.reduce((x, y) => x + (y || 0), 0),`
74. **DO-5** — `if (t < debut || t >= fin) {` → `if (t >= fin) {`
75. **DO-8** — `const anonymiser = (t) => String(t || '').replace(PERSONNEL, '[masqué]')` → `const anonymiser = (t) => String(t || '')`
76. **DO-4** — `tendance: new Set(g.sources).size >= 2,` → `tendance: true,`
77. **DO-6** — `statut: douleurs.length ? 'mesuré' : 'rien de mesuré',` → `statut: 'mesuré',`
78. **DO-7** — `.slice(0, 3).map((d) => ({` → `.map((d) => ({`
79. **DO-9** — `const douleurs = [...groupes.values()].map((g) => {` → `for (const a of avis || []) if (a?.probleme && !groupes.has(a.probleme)) groupes.set(a.probleme, { probleme: a.probleme, sources: [], nombres: [], gr…`
80. **EX-2** — `const vente = (ventes || []).find((v) => v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source)` → `const vente = (ventes || []).find((v) => v?.source)`
81. **EX-2** — `v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source` → `v?.statut === 'encaisse' && v.test === false && v.source`
82. **EX-2** — `v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source` → `v?.statut === 'encaisse' && v.confirme !== false && v.test === false && v.source`
83. **EX-2** — `v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source` → `v?.statut === 'encaisse' && v.confirme === true && v.test !== true && v.source`
84. **EX-8** — `const arretee = { ...e, etat: 'arrêtée', conclusion: 'non mesuré', succes: false, suspendue: true }` → `const arretee = { ...e, etat: 'conclue', conclusion: 'succès', succes: true, suspendue: false }`
85. **EX-6** — `return { deja: true, experience: existante }` → `await deps.evenements.emettre({ type: 'demarrage', id: d.id, a_sec: true })⏎ return { deja: true, experience: existante }`
86. **EX-5** — `if ((d.touche || []).includes('froid') && deps.horloge.maintenant() < OUVERTURE_FROID) return { refus: 'froid_ferme' }` → `if (false) return { refus: 'froid_ferme' }`
87. **EX-3** — `const accord = d.accord_benj && d.accord_benj.id && d.accord_benj.objectif === d.objectif ? d.accord_benj : null` → `const accord = d.accord_benj || { id: 'implicite', objectif: d.objectif }`
88. **EX-4** — `const CHAMPS = ['id', 'version', 'source', 'objectif', 'population', 'seuil_arret']` → `const CHAMPS = ['id', 'version', 'objectif']`
89. **EX-7** — `if (existante.objectif !== d.objectif || existante.version !== d.version) return { refus: 'nouvel_accord', raison: 'objectif ou version modifiés' }` → `(supprimé)`
90. **EX-9** — `decision: 'recommandation soumise à Benj ; aucun drapeau ni prix modifié',` → `decision: (await deps.drapeaux?.basculer?.(), 'drapeau basculé'),`

## Verdict : PASS

Témoin vert sur les sept parties, état d'avant rouge, chaque sabotage rouge sur son critère, aucune fuite.
