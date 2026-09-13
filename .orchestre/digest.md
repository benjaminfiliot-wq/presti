# Digest — 2026-09-13T23:38:47Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (Antigravity) : 9 tâche(s) PASS, 5950 ligne(s) · faites par Claude Code : 0 tâche(s) PASS, 0 ligne(s).
**État** — file : 5 · en cours : 6 · faites : 9 · refusées : 1

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 014-03 | boucle-qa | en-cours | ag-03-g38 | — | depuis 2026-09-13T23:37:26Z · Le site de démonstration « Électricien » — un dossier statique complet dans public/sites-demo/electricien, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-04 | boucle-qa | en-cours | ag-04c | — | depuis 2026-09-13T20:04:32Z · Le site de démonstration « Chauffagiste » — un dossier statique complet dans public/sites-demo/chauffagiste, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-02 | boucle-qa | en-cours | ag-02-g38 | — | depuis 2026-09-13T23:37:21Z · Le site de démonstration « Plombier » — un dossier statique complet dans public/sites-demo/plombier, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-05 | boucle-qa | en-cours | ag-05c | — | depuis 2026-09-13T20:04:35Z · Le site de démonstration « Maçon » — un dossier statique complet dans public/sites-demo/macon, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-09 | boucle-qa | en-cours | ag-09-g37 | — | depuis 2026-09-13T23:27:08Z · Le site de démonstration « Couvreur » — un dossier statique complet dans public/sites-demo/couvreur, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-17 | test | en-cours | test-claude-opus | — | depuis 2026-09-13T20:02:09Z · La suite scripts/suspension-e2e.mjs — suspendre un compte depuis le Poste de contrôle a un effet partout (connexion refusée, page de conversation neutre, nouveau lead refusé, moteur muet, relances sautées), et réactiver ramène tout |
| 014-13 | test | file | ag-1413 | — | La suite scripts/controle-sites-e2e.mjs — la validation humaine d'un site généré depuis le Poste de contrôle, prouvée de bout en bout (lecture, valider, régénérer avec consigne, refus sans consigne, rôle lecture, journal) |
| 014-20 | contenu | file | antigravity | — | Réécrire les 544 cas synthétiques du cerveau « urgence » (lib/ai/cerveaux/urgence/cas.jsonl) dans le français que les clients écrivent vraiment — accents, SMS avec fautes, longs messages oraux — et ajouter les pièges qui manquent (cinq normaux avec un mot d'urgence et cinq urgents sans aucun mot de la liste, par métier) |
| 014-10 | boucle-qa | file | antigravity | — | Le site de démonstration « Serrurier » — un dossier statique complet dans public/sites-demo/serrurier, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-18 | feature | file | antigravity | — | Dans l'onglet « Sites » du Poste de contrôle — le lien d'aperçu privé d'une commande générée, le bouton « Mettre en ligne » d'une commande validée, et les enregistrements DNS rendus à l'artisan |
| 014-19 | test | file | antigravity | — | La suite scripts/site-hebergement-e2e.mjs — un site déposé n'est lisible qu'avec son jeton tant qu'il n'est pas en ligne, se sert avec les bons types une fois en ligne, et « mettre en ligne » exige un dépôt et journalise |
| 014-08 | boucle-qa | fait | antigravity | PASS | 2026-09-13T23:38:47Z · 65s · 0 l. |
| 014-07 | boucle-qa | fait | ag-07-g38 | PASS | 2026-09-13T23:37:23Z · 156s · 3038 l. |
| 014-06 | boucle-qa | fait | ag-06-g38 | PASS | 2026-09-13T23:36:21Z · 129s · 2221 l. |
| 014-14 | feature | fait | claude-code | PASS | 2026-09-13T18:41:34Z · 64s · 0 l. |
| 014-01 | feature | fait | antigravity | PASS | 2026-09-13T17:11:39Z · 20s · 0 l. |
| 014-16 | feature | fait | claude-code | PASS | 2026-09-13T16:58:40Z · 30s · 140 l. |
| 014-12 | contenu | fait | antigravity | PASS | 2026-09-13T16:23:08Z · 10s · 0 l. |
| 014-15 | contenu | fait | ag-1415 | PASS | 2026-09-13T16:22:08Z · 1s · 550 l. |
| 001-test-echec | test | refuse | ag-2 | FAIL | ÉCHEC voulu : cette ligne doit apparaître telle quelle dans digest.md |
| 000-test | test | fait | ag-1 | PASS | 2026-09-13T13:21:30Z · 0s · 1 l. |
