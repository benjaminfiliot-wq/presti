# Échecs attendus — scripts/next16-qa.mjs (fiche 026-004)

Relevé le 2026-09-28, avant toute migration Next 16 : next demandé "^15.5.26", proxy.ts absent, middleware.ts présent.

## `--groupe=dependances --statique` (attendu : rouge dès N16-1)

- FAIL N16-1 — next installé 15.5.26 (package.json demande "^15.5.26"), react 19.2.8, react-dom 19.2.8, @types/react "^19.0.7", @types/react-dom "^19.0.3"
- FAIL N16-2 — next.config.mjs importe @serwist/next, script build = "next build"
- FAIL N16-3 — script "lint" contient next lint
- NOTE N16-4 à N16-7 non jugés (--statique)

## `--groupe=code` (attendu : rouge sur N16-8, vert sur N16-10 et N16-11)

- FAIL N16-8 — proxy.ts absent
- FAIL N16-9 — tout-verifier.mjs : npm-build=false, diff=0 ligne(s) ; qualite.yml : npm-build=false, diff=0 ligne(s)
- PASS N16-10 — les six fichiers gardent params en promesse et await params
- PASS N16-11 — aucun accès synchrone, aucun motif interdit trouvé

## Auto-vérification `--preuve-echecs`

- PASS --groupe=dependances --statique échoue dès N16-1 — FAIL N16-1 — next installé 15.5.26 (package.json demande "^15.5.26"), react 19.2.8, react-dom 19.2.8, @types/react "^19.0.7", @types/react-dom "^19.0.3"
- PASS --groupe=code échoue sur N16-8 — FAIL N16-8 — proxy.ts absent
- PASS N16-10 est vert — PASS N16-10 — les six fichiers gardent params en promesse et await params
- PASS N16-11 est vert — PASS N16-11 — aucun accès synchrone, aucun motif interdit trouvé
- PASS domaine-perso-e2e.mjs adapté est vert sur l'arbre actuel — code 0
- PASS scripts/domaine-perso-e2e.mjs contient le repli middleware/proxy
- PASS scripts/constructeur-ferme-qa.mjs contient le repli middleware/proxy
- PASS scripts/parcours-commande-qa.mjs contient le repli middleware/proxy
- PASS scripts/site-commander-verifier.mjs contient le repli middleware/proxy
