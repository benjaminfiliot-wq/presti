<!-- budget:debut -->
🔴 Claude Code lit trop au lieu de faire lire (part lue 89 % > 60 %) — **Budget jetons** (tous les projets, 2026-09-14T11:07:51Z, `node scripts/orchestre.mjs budget --tous`)
- session courante (`fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d`) : lu (nouveau) 131 423 888 · relu depuis le cache 4 488 050 479 · produit 15 744 941 · part lue 89 % · 18 593 réponse(s)
- aujourd'hui : lu (nouveau) 25 256 332 · relu depuis le cache 853 791 579 · produit 3 149 505 · part lue 89 % · 2 025 réponse(s)
- sept derniers jours : lu (nouveau) 175 353 239 · relu depuis le cache 7 656 446 637 · produit 24 771 227 · part lue 88 % · 28 623 réponse(s)
- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.
<!-- budget:fin -->

# Digest — 2026-09-15T11:10:10Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (antigravity, codex, gemini-cli, qwen) : 39 tâche(s) PASS, 164523 ligne(s) · faites par Claude Code : 2 tâche(s) PASS, 279 ligne(s).
**État** — file : 0 · en cours : 1 · faites : 41 · refusées : 1

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 020-13 | contenu | en-cours | ag-28-flash | — | depuis 2026-09-15T10:47:26Z · Moment signature, candidat RL « la cage tourne et la lumière » — composer R et la meilleure lumière (L1 ou L2), la lumière décalée d'un quart de période, et livrer bloc.css, films, instants, planche, mesures au contrat et rapport, pour le choix de Benj |
| 020-11 | contenu | fait | ag-26-flash | PASS | 2026-09-15T11:10:10Z · 1s · 10430 l. |
| 020-12 | contenu | fait | ag-27-flash | PASS | 2026-09-15T10:50:01Z · 1s · 36858 l. |
| 020-14 | feature | fait | codex-12 | PASS | 2026-09-15T10:40:33Z · 48s · 0 l. |
| 020-10 | contenu | fait | codex-11 | PASS | 2026-09-15T10:34:33Z · 1s · 0 l. |
| 019-03 | contenu | fait | codex-10 | PASS | 2026-09-15T07:48:53Z · 2s · 0 l. |
| 019-02 | feature | fait | codex-9 | PASS | 2026-09-15T07:29:47Z · 40s · 0 l. |
| 019-01 | feature | fait | codex-8 | PASS | 2026-09-15T07:12:46Z · 22s · 0 l. |
| 018-10 | contenu | fait | codex-6 | PASS | 2026-09-15T02:12:56Z · 16s · 0 l. |
| 018-09 | feature | fait | ag-25-flash | PASS | 2026-09-15T02:12:55Z · 10s · 14826 l. |
| 018-08 | contenu | fait | ag-24-flash | PASS | 2026-09-14T20:25:41Z · 8s · 2720 l. |
| 018-07 | feature | fait | ag-23-flash | PASS | 2026-09-14T20:22:47Z · 79s · 6359 l. |
| 018-05 | feature | fait | ag-22-flash | PASS | 2026-09-14T20:01:01Z · 85s · 6210 l. |
| 018-06 | contenu | fait | codex-4 | PASS | 2026-09-14T20:00:45Z · 10s · 0 l. |
| 018-04 | contenu | fait | codex-3 | PASS | 2026-09-14T19:42:39Z · 2s · 0 l. |
| 018-03 | feature | fait | ag-21-flash | PASS | 2026-09-14T19:36:11Z · 9s · 18721 l. |
| 018-02 | feature | fait | codex-2 | PASS | 2026-09-14T19:34:53Z · 64s · 0 l. |
| 018-01 | feature | fait | codex-1 | PASS | 2026-09-14T19:27:44Z · 12s · 0 l. |
| 016-03 | feature | fait | claude-code | PASS | 2026-09-14T12:12:18Z · 29s · 0 l. |
| 016-02 | feature | fait | claude-code | PASS | 2026-09-14T11:53:45Z · 67s · 279 l. |
| 016-01 | contenu | fait | antigravity | PASS | 2026-09-14T11:05:42Z · 1s · 0 l. |
| 014-11 | test | fait | ag-11-g37 | PASS | 2026-09-14T09:35:02Z · 29s · 98 l. |
| 014-17 | test | fait | ag-17-g38 | PASS | 2026-09-14T09:34:14Z · 80s · 446 l. |
| 014-20 | contenu | fait | ag-20-g38 | PASS | 2026-09-14T07:53:22Z · 3s · 1198 l. |
| 014-04 | boucle-qa | fait | ag-04-g38b | PASS | 2026-09-14T05:45:11Z · 61s · 2913 l. |
| 014-19 | test | fait | ag-19-g37 | PASS | 2026-09-14T05:40:18Z · 521s · 24 l. |
| 014-18 | feature | fait | ag-18-g38 | PASS | 2026-09-14T04:51:14Z · 40s · 108 l. |
| 014-10 | boucle-qa | fait | ag-10-g38 | PASS | 2026-09-14T04:41:54Z · 174s · 4839 l. |
| 014-05 | boucle-qa | fait | ag-05-g38 | PASS | 2026-09-14T04:41:05Z · 90s · 2578 l. |
| 014-08 | boucle-qa | fait | ag-08-g38 | PASS | 2026-09-14T04:40:18Z · 131s · 3842 l. |
| 014-13 | test | fait | ag-13-gemini37flas | PASS | 2026-09-14T04:39:56Z · 22s · 293 l. |
| 014-03 | boucle-qa | fait | ag-03-g38 | PASS | 2026-09-14T04:34:21Z · 79s · 15466 l. |
| 014-02 | boucle-qa | fait | duo-02 | PASS | 2026-09-14T04:31:39Z · 87s · 13612 l. |
| 014-09 | boucle-qa | fait | claude-code | PASS | 2026-09-13T23:44:23Z · 53s · 17032 l. |
| 014-07 | boucle-qa | fait | ag-07-g38 | PASS | 2026-09-13T23:37:23Z · 156s · 3038 l. |
| 014-06 | boucle-qa | fait | ag-06-g38 | PASS | 2026-09-13T23:36:21Z · 129s · 2221 l. |
| 014-14 | feature | fait | claude-code | PASS | 2026-09-13T18:41:34Z · 64s · 0 l. |
| 014-01 | feature | fait | antigravity | PASS | 2026-09-13T17:11:39Z · 20s · 0 l. |
| 014-16 | feature | fait | claude-code | PASS | 2026-09-13T16:58:40Z · 30s · 140 l. |
| 014-12 | contenu | fait | antigravity | PASS | 2026-09-13T16:23:08Z · 10s · 0 l. |
| 014-15 | contenu | fait | ag-1415 | PASS | 2026-09-13T16:22:08Z · 1s · 550 l. |
| 001-test-echec | test | refuse | ag-2 | FAIL | ÉCHEC voulu : cette ligne doit apparaître telle quelle dans digest.md |
| 000-test | test | fait | ag-1 | PASS | 2026-09-13T13:21:30Z · 0s · 1 l. |
