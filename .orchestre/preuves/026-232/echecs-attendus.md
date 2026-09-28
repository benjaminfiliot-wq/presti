# 026-232 — preuve d'échecs (savoir-recherche-qa)

Généré le 2026-09-28T17:02:07.818Z par `node scripts/savoir-recherche-qa.mjs --preuve-echecs`.

28/09 : relecture de 026-229 appliquée au contrat — la classe `interne` ne va jamais vers un moteur gratuit : `classesPour` rend `["public"]` pour un agent sur freellmapi, ollama_cloud, un modèle `:cloud` ou groq (douleurs compris) ; Perplexity et Firecrawl ne reçoivent que du public (la question telle quelle, jamais un extrait). Critères SVR-6, SVR-7, SVR-9 ; sabotages S10, S11.

## (a) Arbre courant du dépôt — attendu : échec, SVR-1 en premier

```
FAIL SVR-1 — lib/savoir/recherche.ts absent de la racine jugée — le module n'existe pas encore (026-233)
FAIL SVR-2 — lib/savoir/recherche.ts absent de la racine jugée — l'outil de recherche n'est pas encore écrit
FAIL SVR-3 — scripts/savoir/chercher.mjs absent de la racine jugée — la ligne de commande n'est pas encore écrite
FAIL SVR-4 — lib/savoir/recherche.ts absent de la racine jugée — l'outil de recherche n'est pas encore écrit
FAIL SVR-5 — lib/savoir/recherche.ts absent de la racine jugée — l'outil de recherche n'est pas encore écrit
FAIL SVR-6 — lib/savoir/recherche.ts absent de la racine jugée — l'outil de recherche n'est pas encore écrit
  ✗ scripts/savoir/chercher.mjs absent de la racine jugée — la ligne de commande n'est pas encore écrite
FAIL SVR-7 — lib/savoir/recherche.ts absent de la racine jugée — l'outil de recherche n'est pas encore écrit
  ✗ scripts/savoir/chercher.mjs absent de la racine jugée — la ligne de commande n'est pas encore écrite
FAIL SVR-8 — lib/savoir/recherche.ts absent de la racine jugée — l'outil de recherche n'est pas encore écrit
FAIL SVR-9 — lib/savoir/recherche.ts absent de la racine jugée — l'outil de recherche n'est pas encore écrit
FAIL SVR-10 — scripts/savoir/chercher.mjs absent de la racine jugée — la ligne de commande n'est pas encore écrite
FAIL SVR-11 — lib/savoir/recherche.ts absent de la racine jugée — l'outil de recherche n'est pas encore écrit
  ✗ scripts/savoir/chercher.mjs absent de la racine jugée — la ligne de commande n'est pas encore écrite
PASS SVR-12 — ok
savoir-recherche-qa : FAIL — SVR-1, SVR-2, SVR-3, SVR-4, SVR-5, SVR-6, SVR-7, SVR-8, SVR-9, SVR-10, SVR-11
```

Verdict (a) : CONFORME — premier échec réel : SVR-1

## (b) Témoin (scripts/fixtures/026/savoir/recherche/temoin/) — attendu : vert

```
PASS SVR-1 — ok
PASS SVR-2 — ok
PASS SVR-3 — ok
PASS SVR-4 — ok
PASS SVR-5 — ok
PASS SVR-6 — ok
PASS SVR-7 — ok
PASS SVR-8 — ok
PASS SVR-9 — ok
PASS SVR-10 — ok
PASS SVR-11 — ok
PASS SVR-12 — ok
savoir-recherche-qa : PASS — tout vert
```

Verdict (b) : CONFORME

## (c) Sabotages (scripts/fixtures/026/savoir/recherche/sabotages.json) — attendu : chaque sabotage fait échouer son critère

```
S1 (lib/savoir/recherche.ts, partie outil) → attendu SVR-1 en échec : pris — RECHERCHE_WEB_DE n’est pas gelé
S2 (lib/savoir/recherche.ts, partie outil) → attendu SVR-2 en échec : pris — savoir bien servi, web: true : 1 recherche(s) Firecrawl, 0 lecture(s), 0 appel(s) Perplexity reçus (attendu aucun : le savoir d'abord)
S3 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-3 en échec : pris — retire : l'extrait cité en presti:docs/fichier-modifie-essai.md lignes 1–3 ne s'y retrouve pas mot pour mot (fichier relu par le juge)
S4 (lib/savoir/recherche.ts, partie outil) → attendu SVR-4 en échec : pris — réserve 998 après une recherche et trois lectures (attendu 995 : 5 crédits consommés)
S5 (lib/savoir/recherche.ts, partie outil) → attendu SVR-5 en échec : pris — Perplexity, coût inconnu : 1 appel(s) reçu(s) (attendu zéro)
S6 (lib/savoir/recherche.ts, partie outil) → attendu SVR-6 en échec : pris — refusDonneePersonnelle(« Rappeler le 06 12 34 56 78 demain matin pour le devis ? ») = null (attendu "numero")
S7 (lib/savoir/recherche.ts, partie outil) → attendu SVR-7 en échec : pris — douleurs (freellmapi) : 4 résultat(s) de classe prospects, interne (seul public est permis) (aussi : SVR-9)
S8 (lib/savoir/recherche.ts, partie outil) → attendu SVR-8 en échec : pris — s2_fort_chef : le résumé contient un extrait
S9 (lib/savoir/recherche.ts, partie outil) → attendu SVR-9 en échec : pris — recherches faites : ["Quelles relances pour un devis dormant ?","Comment présenter un acompte de chantier ?","Quel ton pour une facture en retard ?","Comment rédiger la page d'acc… (aussi : SVR-6)
S10 (lib/savoir/recherche.ts, partie outil+cli) → attendu SVR-7 en échec : pris — classesPour(douleurs) = ["public","interne"] (attendu ["public"] — 28/09 : interne jamais vers un moteur gratuit) (aussi : SVR-9)
S11 (lib/savoir/recherche.ts, partie outil) → attendu SVR-6 en échec : pris — cas permis : la requête reçue par le faux Firecrawl n'est pas exactement la question ("Quelles obligations légales pour démarcher un artisan par courriel en 2026 ? Note publique f… (aussi : SVR-4, SVR-9)
S12 (lib/savoir/recherche.ts, partie outil) → attendu SVR-9 en échec : pris — chef (RECHERCHE_WEB_DE), savoir faible : recherches web [] (attendu les 2 besoins, web demandé)
S13 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-10 en échec : pris — chef : Authorization ≠ « Bearer $PRESTI_JETON_CHEF »
S14 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-10 en échec : pris — --base en http:// hors boucle locale : code 3 (attendu 2)
S15 (lib/savoir/recherche.ts, partie outil) → attendu SVR-11 en échec : pris — sonde : aucune sortie (code 0) — (node:18952) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/benja/Documents/presti/.orchestre/travail/savoir-recherche-qa… (aussi : SVR-1, SVR-2, SVR-4, SVR-5, SVR-6, SVR-7, SVR-8, SVR-9)
S16 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-11 en échec : pris — FIRECRAWL-026-sentinelle dans fichier du travail travail/savoir/compteurs-2026-09-28.json
S17 (lib/savoir/recherche.ts, partie outil) → attendu SVR-12 en échec : pris — lib/savoir/recherche.ts appelle fetch( (toutes les E/S passent par deps)
S18 (scripts/savoir/chercher.mjs, partie outil) → attendu SVR-12 en échec : pris — scripts/savoir/chercher.mjs nomme l'hôte collecte.exemple-tiers.io (permis : 127.0.0.1, localhost, [::1], prestiapp.fr, api.firecrawl.dev, api.perplexity.ai)
S19 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-3 en échec : pris — chef : sha256 de presti:docs/relances-essai.md ≠ empreinte du fichier relu
S20 (lib/savoir/recherche.ts, partie outil) → attendu SVR-4 en échec : pris — agent facteur (hors RECHERCHE_WEB_DE) : 4 requête(s) web reçue(s) (attendu aucune)
S21 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-10 en échec : pris — compteurs-<jour>.json : savoir:chef = 1 après 5 appel(s) chef réussis (chef, cadre, retire, modifie, nom_web) — chacun un processus séparé, attendu 5 : le compteur doit être relu …
S22 (scripts/savoir/chercher.mjs, partie cli) → attendu SVR-10 en échec : pris — credits-firecrawl.json absent après un appel --web (nom_web) : la réserve du jour n’est jamais écrite
```

Verdict (c) : CONFORME

## Bilan

(a) ok · (b) ok · (c) ok · 498 s

**026-232 : PASS**
