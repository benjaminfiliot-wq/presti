# 026-241 — mise en service de la couche Savoir : gestes de Benj (05/10/2026)

Livré (docs seulement) : section 12 « Le savoir des agents » du registre des traitements (en vigueur à la mise en service), les trois
services et le dépôt dans `docs/agents/usine.md` (marqués « écrits, pas installés »). `docs/savoir/reglages.json` n'est PAS touché :
allumer `envoi`, `lecons_dans_consignes` ou `bilan_quotidien` sans les gestes ci-dessous mentirait (un interrupteur « accordé » sans accord).

Le « oui » de Benj au compte gardien (D-0410-15) ne couvre pas ces gestes : il faut un « oui » par geste, daté, dans `mise-en-service.md` :
1. dépôt `/srv/presti-savoir/depot` (par gardien) ; 2. unités `presti-chef-savoir-recevoir`, `presti-chef-savoir-index`, `presti-chef-bilan` ;
3. tâche Windows `Presti savoir` (toutes les 2 h) ; 4. premier envoi, compartiment `prospects` compris ; 5. allumage des leçons dans les
consignes et du bilan de 7 h 35 (commit de Claude Code sur `reglages.json`).
Ensuite : `savoir-socle-qa`, `savoir-recherche-qa`, `savoir-reflexion-qa` en `--reel`, puis le premier `bilan_quotidien` le lendemain à 7 h 35.
Reste éteint : `semantique` (pas de modèle d'embeddings), `recherche_web` (clé Firecrawl hors liste du coffre), `perplexity` (plan et coût non constatés).
