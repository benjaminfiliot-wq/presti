# Digest — 2026-09-13T18:43:53Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (Antigravity) : 8 tâche(s) PASS, 20025 ligne(s) · faites par Claude Code : 0 tâche(s) PASS, 0 ligne(s).
**État** — file : 11 · en cours : 1 · faites : 8 · refusées : 1

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 014-02 | boucle-qa | en-cours | ag-1402 | — | depuis 2026-09-13T18:25:19Z · Le site de démonstration « Plombier » — un dossier statique complet dans public/sites-demo/plombier, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-20 | contenu | file | antigravity | — | Réécrire les 544 cas synthétiques du cerveau « urgence » (lib/ai/cerveaux/urgence/cas.jsonl) dans le français que les clients écrivent vraiment — accents, SMS avec fautes, longs messages oraux — et ajouter les pièges qui manquent (cinq normaux avec un mot d'urgence et cinq urgents sans aucun mot de la liste, par métier) |
| 014-06 | boucle-qa | file | ag-1406 | — | Le site de démonstration « Menuisier » — un dossier statique complet dans public/sites-demo/menuisier, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-07 | boucle-qa | file | antigravity | — | Le site de démonstration « Peintre en bâtiment » — un dossier statique complet dans public/sites-demo/peintre, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-08 | boucle-qa | file | antigravity | — | Le site de démonstration « Carreleur » — un dossier statique complet dans public/sites-demo/carreleur, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-05 | boucle-qa | file | antigravity | — | Le site de démonstration « Maçon » — un dossier statique complet dans public/sites-demo/macon, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-09 | boucle-qa | file | antigravity | — | Le site de démonstration « Couvreur » — un dossier statique complet dans public/sites-demo/couvreur, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-10 | boucle-qa | file | antigravity | — | Le site de démonstration « Serrurier » — un dossier statique complet dans public/sites-demo/serrurier, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-13 | test | file | antigravity | — | La suite scripts/controle-sites-e2e.mjs — la validation humaine d'un site généré depuis le Poste de contrôle, prouvée de bout en bout (lecture, valider, régénérer avec consigne, refus sans consigne, rôle lecture, journal) |
| 014-17 | test | file | antigravity | — | La suite scripts/suspension-e2e.mjs — suspendre un compte depuis le Poste de contrôle a un effet partout (connexion refusée, page de conversation neutre, nouveau lead refusé, moteur muet, relances sautées), et réactiver ramène tout |
| 014-18 | feature | file | antigravity | — | Dans l'onglet « Sites » du Poste de contrôle — le lien d'aperçu privé d'une commande générée, le bouton « Mettre en ligne » d'une commande validée, et les enregistrements DNS rendus à l'artisan |
| 014-19 | test | file | antigravity | — | La suite scripts/site-hebergement-e2e.mjs — un site déposé n'est lisible qu'avec son jeton tant qu'il n'est pas en ligne, se sert avec les bons types une fois en ligne, et « mettre en ligne » exige un dépôt et journalise |
| 014-04 | boucle-qa | fait | ag-1404 | PASS | 2026-09-13T18:43:53Z · 154s · 2553 l. |
| 014-14 | feature | fait | claude-code | PASS | 2026-09-13T18:41:34Z · 64s · 0 l. |
| 014-03 | boucle-qa | fait | ag-1403 | PASS | 2026-09-13T18:31:34Z · 50s · 16781 l. |
| 014-01 | feature | fait | antigravity | PASS | 2026-09-13T17:11:39Z · 20s · 0 l. |
| 014-16 | feature | fait | claude-code | PASS | 2026-09-13T16:58:40Z · 30s · 140 l. |
| 014-12 | contenu | fait | antigravity | PASS | 2026-09-13T16:23:08Z · 10s · 0 l. |
| 014-15 | contenu | fait | ag-1415 | PASS | 2026-09-13T16:22:08Z · 1s · 550 l. |
| 001-test-echec | test | refuse | ag-2 | FAIL | ÉCHEC voulu : cette ligne doit apparaître telle quelle dans digest.md |
| 000-test | test | fait | ag-1 | PASS | 2026-09-13T13:21:30Z · 0s · 1 l. |
