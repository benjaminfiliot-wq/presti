# Digest — 2026-09-13T14:19:37Z

> Généré par `node scripts/orchestre.mjs digest`. Une ligne par tâche, 100 au plus. C'est le seul fichier à lire pour savoir où en est le chantier.

**Mesure** — déléguées (Antigravity) : 1 tâche(s) PASS, 1 ligne(s) · faites par Claude Code : 0 tâche(s) PASS, 0 ligne(s).
**État** — file : 12 · en cours : 0 · faites : 1 · refusées : 1

| id | type | où | exécutant | verdict | détail |
|---|---|---|---|---|---|
| 014-01 | feature | file | antigravity | — | Les quatre écrans de commande du site à la demande sur /site/commander (domaine → métier et zone → matière → paiement), branchés sur l'API existante et testée |
| 014-02 | boucle-qa | file | antigravity | — | Le site de démonstration « Plombier » — un dossier statique complet dans public/sites-demo/plombier, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-03 | boucle-qa | file | antigravity | — | Le site de démonstration « Électricien » — un dossier statique complet dans public/sites-demo/electricien, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-04 | boucle-qa | file | antigravity | — | Le site de démonstration « Chauffagiste » — un dossier statique complet dans public/sites-demo/chauffagiste, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-05 | boucle-qa | file | antigravity | — | Le site de démonstration « Maçon » — un dossier statique complet dans public/sites-demo/macon, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-06 | boucle-qa | file | antigravity | — | Le site de démonstration « Menuisier » — un dossier statique complet dans public/sites-demo/menuisier, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-07 | boucle-qa | file | antigravity | — | Le site de démonstration « Peintre en bâtiment » — un dossier statique complet dans public/sites-demo/peintre, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-08 | boucle-qa | file | antigravity | — | Le site de démonstration « Carreleur » — un dossier statique complet dans public/sites-demo/carreleur, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-09 | boucle-qa | file | antigravity | — | Le site de démonstration « Couvreur » — un dossier statique complet dans public/sites-demo/couvreur, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-10 | boucle-qa | file | antigravity | — | Le site de démonstration « Serrurier » — un dossier statique complet dans public/sites-demo/serrurier, généré d'après plans/cerveau-site.md, vert au juge scripts/site-qa.mjs |
| 014-12 | contenu | file | antigravity | — | Le site vitrine n'est plus inclus dans aucune formule — l'interface et tous les textes le disent (landing, /abonnement, aide, éditeur de site, publications, guide de démarchage), et le bloc de vente « Le site, à la demande » existe derrière le drapeau siteCommandeVente |
| 014-13 | test | file | antigravity | — | La suite scripts/controle-sites-e2e.mjs — la validation humaine d'un site généré depuis le Poste de contrôle, prouvée de bout en bout (lecture, valider, régénérer avec consigne, refus sans consigne, rôle lecture, journal) |
| 001-test-echec | test | refuse | ag-2 | FAIL | ÉCHEC voulu : cette ligne doit apparaître telle quelle dans digest.md |
| 000-test | test | fait | ag-1 | PASS | 2026-09-13T13:21:30Z · 0s · 1 l. |
