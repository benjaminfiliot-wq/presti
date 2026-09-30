Tu travailles sur l'usine de Presti, dans ~/veille. Écris et réponds en français.

MISSION : brancher sur l'usine les nouveaux outils que Benj vient de fournir, pour que les agents de l'écosystème s'en servent. Pour chaque outil : **l'examiner avant de l'installer** (d'où il vient, qui le publie, ce que fait son code d'installation, quels appels réseau il fait), l'installer SANS sudo dans l'espace de l'utilisateur, le tester pour de vrai, et documenter.

JUGE : `node juges/juge-outils-web-voix.mjs` (déjà écrit, NE PAS le modifier). Lis-le d'abord et boucle jusqu'au PASS.

CLÉS (fournies par Benj, déjà posées) :
- `~/.config/presti/firecrawl.key` (Firecrawl) ;
- `~/.config/presti/fishaudio.key` (Fish Audio).
Lis-les dans une variable, ne les affiche JAMAIS, ne les écris dans aucun fichier, aucun journal ni aucune ligne de commande visible dans `ps`. Passe-les par variable d'environnement.

1. **Firecrawl.**
   - Examine le paquet npm `firecrawl-cli` : `npm view firecrawl-cli repository maintainers`. Il doit venir de github.com/firecrawl.
   - Installe-le dans `~/.npm-global`.
   - Écris `outils/firecrawl.sh`, une enveloppe qui exporte `FIRECRAWL_API_KEY` depuis le fichier puis appelle la CLI.
   - Fais trois appels réels :
     - `search` « artisan couvreur Marans », résultat dans `essais/firecrawl-search.json` ;
     - `scrape` de https://prestiapp.fr, résultat dans `essais/firecrawl-scrape.md` ;
     - `map` de https://prestiapp.fr, résultat dans `essais/firecrawl-map.json`.
   - Note le nombre de crédits restants : le plan gratuit a peu de crédits, donc les agents doivent être économes. S'il y a un moyen, note aussi comment les connaître par commande.
   - Liste les compétences Firecrawl (CLI et workflows) utiles aux agents.
2. **Fish Audio**, la voix de synthèse (API https://api.fish.audio).
   - Liste les voix françaises disponibles (modèles publics, langue fr) dans `essais/fish-voix-fr.json` : nom, id, nombre d'utilisations.
   - Écris `outils/fish-tts.mjs <texte> <sortie.mp3> [--voix=<id>]`.
   - Génère un vrai MP3 français, `essais/fish-essai-presti.mp3` : « Bonjour, ici Presti. Votre demande de devis a bien été reçue, un artisan vous rappelle aujourd'hui. »
   - Note la licence et le coût : usage commercial permis ou non, crédits consommés.
3. **uv et GEO.**
   - Installe uv avec l'installeur officiel d'Astral (https://astral.sh/uv/install.sh), après l'avoir LU, en espace utilisateur.
   - Examine le paquet PyPI `geo-optimizer-skill` (dépôt github.com/Auriti-Labs/geo-optimizer-skill : son code, ses appels réseau).
   - Lance `uvx --from geo-optimizer-skill geo audit --url https://prestiapp.fr`, sortie dans `essais/geo-audit-prestiapp.txt`, et résume les 8 catégories.
4. **open-seo** (github.com/every-app/open-seo, compétence `simple-issue-description`).
   - Examine-le et récupère la compétence dans `~/veille/competences/open-seo/`.
   - Dis ce qu'il sait faire pour le SEO de prestiapp.fr et des sites vendus aux artisans.
5. **mcp-gsc** (github.com/AminForou/mcp-gsc, Google Search Console).
   - Examine-le seulement, et clone-le dans `~/veille/competences/mcp-gsc/`.
   - Il exige une connexion Google : écris les gestes exacts que Benj devra faire (identifiants OAuth ou compte de service), SANS rien configurer.
6. **Rapport** `outils/INTEGRATION-2026-09-26.md`, avec les sections exactes :
   - « ## Firecrawl » ;
   - « ## Fish Audio » ;
   - « ## uv et GEO » ;
   - « ## open-seo » ;
   - « ## mcp-gsc » ;
   - « ## Règles pour les agents » : quand utiliser quel outil, économie de crédits, aucune donnée personnelle de prospect envoyée à un service tiers au-delà de ce que l'outil lit publiquement ;
   - « ## Coûts et quotas ».
   Chaque section d'outil dit : ce que tu as examiné et trouvé, où c'est installé, la commande de test et son résultat.

INTERDITS :
- sudo, ufw, toute modification de /etc ;
- afficher ou écrire une clé ;
- publier quoi que ce soit ;
- un achat ;
- modifier le juge ;
- écrire hors de ~/veille, ~/.npm-global, ~/.local et ~/.cargo ;
- installer quelque chose dont l'examen trouve un code suspect (exfiltration, obfuscation, post-install qui télécharge un binaire inconnu). Dans ce cas, n'installe pas, et explique pourquoi dans le rapport.
