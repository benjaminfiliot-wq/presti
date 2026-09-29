# 026-215 — contre-vérification du 29/09 (Claude Code, revue-codex indisponible : quota)

Produit par Claude Code (fiche prospection, interdite aux IA gratuites). Quatre sabotages réversibles de la production,
jugés par `node scripts/contenu-qa.mjs --partie=veille` ; chaque fichier est restauré et son sha256 relu.

- 1 chercher accepté : code 1, ❌ VE-1 — Firecrawl en lecture seule — « chercher » accepté ; sha256 avant=7c77b643acdf9423 après restauration=7c77b643acdf9423 IDENTIQUE ; critère attendu VE-1 ROUGE comme prévu
- 2 URL téléphone/e-mail acceptée : code 1, ❌ VE-2 — URL nominative refusée — URL portant un téléphone acceptée ; sha256 avant=7c77b643acdf9423 après restauration=7c77b643acdf9423 IDENTIQUE ; critère attendu VE-2 ROUGE comme prévu
- 3 envoi IA sans garde (prospect vers :cloud accepté) : code 1, ❌ VE-3 — prospect jamais vers une IA gratuite ou :cloud — donnée de prospect envoyée à un moteur :cloud ; sha256 avant=7c77b643acdf9423 après restauration=7c77b643acdf9423 IDENTIQUE ; critère attendu VE-3 ROUGE comme prévu
- 4 score qui publie : code 1, ❌ VE-4 — jev decide/score ne rédigent ni ne publient — scoreIdee a rendu {"texte":"idée test","source":"source.md","recence":"jour","publicationAutomatique":tru ; sha256 avant=e39f48f5f846549b après restauration=e39f48f5f846549b IDENTIQUE ; critère attendu VE-4 ROUGE comme prévu

Essais complémentaires (`essais-veille.mjs`, sortie dans `essais-veille.log`, PASS) : cas de la correction du 27/09 et de la
décision du chef que le juge ne couvre pas encore — `chercher` refusé, URL piégée (e-mail clair et codé, téléphone,
pseudo, nom de prospect) refusée avec ZÉRO appel Firecrawl, quota épuisé -> repli 026-020 avec source conservée, clé absente
-> repli, robots refusés (avec et sans quota épuisé) -> zéro appel, Perplexity (coût inconnu, plan inconnu, budget absent,
donnée personnelle, masse : zéro appel), Groq refusé partout, Ollama seulement après le « oui » de Benj, Business Discovery
fermée sans R6, vidéos d'autrui jamais téléchargées ni transcrites, TikTok Studio/Creative Center refusés au robot,
prospect caché dans un titre élagué, métadonnées nominatives effacées à 30 jours, idée sans source / Laya en panne = « non mesuré ».

Limite à signaler : `contenu-qa.mjs` (026-204, hors périmètre de cette fiche) n'exerce pas encore ces cas de la décision du 27/09
(appel `chercher`/e-mail piégé avec doublure comptant les appels Firecrawl). Ils ne sont prouvés que par `essais-veille.mjs`.
Extension du juge à faire en 026-204.
