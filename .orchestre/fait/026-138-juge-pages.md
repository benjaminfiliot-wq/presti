---
id: 026-138-juge-pages
type: test
objectif: Faire lire à scripts/horloge-qa.mjs tout le journal ops par pages (la base en rend 200 au plus quelle que soit la taille demandée) au lieu de la seule première page, et prouver en --temoin, sur un journal de plus de 200 événements servi par une base plafonnée, que la lecture va jusqu'au bout et qu'une lecture tronquée est rejetée
perimetre: [scripts/horloge-qa.mjs, .orchestre/preuves/026-138-juge-pages/**]
interdit: [scripts/lib/**, scripts/fixtures/**, scripts/juges-026-*.mjs, scripts/orchestre.mjs, app/**, lib/**, public/**, supabase/**, docs/**, middleware.ts, proxy.ts, vercel.json, package.json, package-lock.json, .orchestre/decisions.md, .orchestre/preuves/026-138/**]
verifier: node scripts/horloge-qa.mjs --temoin
budget: { fichiers: 1, minutes: 10 }
preuve: sortie de verifier dans .orchestre/preuves/026-138-juge-pages/verifier.log et .orchestre/preuves/026-138-juge-pages/contre-verif.md (le sabotage de la lecture tronquée, rejoué sur une copie : le juge rougit avec le critère nommé ; sha256 de scripts/horloge-qa.mjs avant et après)
executant: claude-code
---

# 026-138-juge-pages — le juge de l'épreuve des 24 h ne lit qu'une page du journal

## Contexte

La fiche 026-138 (l'épreuve des 24 h) est bloquée par le juge, pas par la production. Relevé du 04/10 (`.orchestre/preuves/026-138/releve.md`) : `node scripts/horloge-qa.mjs --reel --fenetre=24` sort FAIL sur E24-2 (« 0 passage de a0, 276 au moins attendus ») alors que la lecture directe de `ops.evenements` donne 288 passages de a0 sur 24 h, plus grand écart 5 min.

Cause exacte : `scripts/horloge-qa.mjs` (fonction `mesurer`, boucle de lecture) demande `ops_evenements_lire(p_limite: 500)` et sort de la boucle sur `if (l.length < 500) break`. Or la fonction plafonne à 200 lignes (`limit least(greatest(coalesce(p_limite, 200), 1), 200)`, migration 0097) : chaque page fait au plus 200 lignes, donc « moins de 500 » est toujours vrai et le juge s'arrête après la première page, soit les 200 événements les plus anciens du journal (ids croissants). Le journal en compte plus de 1 700 : la fenêtre des 24 h n'est jamais lue. E24-7 (notifications) lit la même page tronquée : son « aucune notification » n'a aucune valeur de preuve.

Le juge n'est pas testé sur cette lecture : ses `--temoin` ne couvrent que les lectures pures (`LECTURES`) sur une journée synthétique, jamais la pagination.

## Ce qu'il faut faire (dans `scripts/horloge-qa.mjs` seulement)

1. Extraire la lecture du journal dans une fonction exportée `lireJournal(lirePage, { demande = 500, pagesMax = 500 })` : `lirePage(apres, demande)` rend `{ data }` ou `{ error }` ; la lecture s'arrête sur une page VIDE, jamais sur une page plus courte que demandée ; elle rend `{ evts, echec? }`, avec un échec si la base répond en erreur, si le curseur (id maximal de la page) n'avance pas, ou si `pagesMax` est atteint sans page vide (une lecture tronquée n'est pas un journal complet).
2. Dans `mesurer`, appeler `lireJournal` avec `ops_evenements_lire` et noter l'échec éventuel par `echec(...)` (donc E24-8 rouge) ; ne rien changer d'autre à la mesure.
3. Éprouver la pagination en `--temoin` (critère E24-2) : un journal synthétique de 450 événements (les passages de a0 de la journée conforme en dernier, de l'ancien bruit avant), servi par une fausse base qui plafonne chaque page à 200 lignes quelle que soit la taille demandée. Attendu : tous les événements lus, E24-2 vert sur ce que la lecture rend ; puis trois sabotages pris : `pagesMax: 1` (lecture tronquée), une base en erreur, un curseur qui n'avance pas.
4. Dans le chemin `--reel`, finir par `process.exitCode = s.fin()` au lieu de `process.exit(s.fin())` (Node 24 sous Windows plante sur `process.exit` après un fetch).
5. Ne pas toucher aux autres critères, aux seuils, ni à `--reel` côté préalables.

## C'est fini quand

- `verifier` (`node scripts/horloge-qa.mjs --temoin`) est vert depuis `fait/`, avec les neuf critères.
- `contre-verif.md` montre le sabotage rejoué sur une copie (remettre `if (l.length < demande) break` dans `lireJournal` : le témoin doit rougir sur E24-2), et le fichier restauré (sha256 identique).
- Rien n'a bougé hors `perimetre`.

## Suite

026-138 est ensuite rejouée (`node scripts/orchestre.mjs rejouer 026-138 --forcer`) : le relevé du 04/10 fait foi sur la cause ; la mesure réelle est refaite avec le juge corrigé.
