# Relais Codex vers Claude cloud — 30 septembre 2026

**Branche de travail non validée, à ne pas fusionner en l'état.** Base main : de8e9bb102bffe8dfede5df19f5c77060005fc22. Aucun nouveau PASS ni déploiement revendiqué.

## 026-092

L'implémentation courante est dans les quatre fichiers app/api/controle/station/route.ts, lib/pilotage/station.ts et les deux routes app/api/agents/reunion. scripts/fermeture-e2e.mjs ne change que la ligne pilotage. Le journal officiel a passé les 22 critères lecture, puis échoué sur RA-4 du harnais (busAgents true déjà sur main). Deux masquages financiers ont été corrigés ensuite : le journal officiel précède ces dernières modifications. Typecheck et test ciblé étaient verts sur le PC ; tout le vérificateur doit être relancé après correction du juge. Aucun PASS complet.

Voir preuves/026-092/blocage-juge.md, verifier.log, contrat-fiche.md et question.md. Test ciblé fourni : node --import ./scripts/ts-loader.mjs .orchestre/preuves/026-092/garde-paliers.mjs. Ses imports relatifs sont conservés et ciblent lib/pilotage/station.ts.

## 026-151

Runner courant : scripts/juges-026-orchestre-chef-mutations.mjs. Verdict FAIL MP-1/MP-3, 32 mutations définies, 25 exécutées, 23 détectées, 2 survivantes ORB-6/ORB-9, 7 non exécutées sur témoins rouges. Rapport complet, JSON, journal officiel, contre-mutations indépendantes, contrat et question sont dans preuves/026-151.

Le répertoire source-outil est une photographie des 28 fichiers suivis du dépôt voisin orchestre au moment du relais, pour que Claude cloud puisse lire les sources canoniques et les juges sans accéder au PC. **Ce n'est pas une synchronisation active ni une deuxième source à maintenir.** Pour reproduire en isolation, copier cette photographie vers le dépôt voisin orchestre attendu par le runner ; ne pas lancer sur les fichiers réels du PC ni pousser ces copies comme remplaçantes sans arbitrage. Les juges/fixtures n'ont pas été modifiés par Codex.

## Publication

Les commentaires des PR fusionnées #2 et #3 restent le point de relais. Les fichiers avant.txt et decisions-avant.md (instantanés globaux du PC) ainsi que les secrets, .env, .git, dépendances et verrous n'ont pas été inclus ; ils ne sont pas nécessaires pour les diagnostics et reproductions ci-dessus. Le manifeste SHA256 atteste les octets des fichiers sélectionnés copiés du PC. Les retours de fin de ligne peuvent être normalisés par Git.

Après corrections des juges par Claude cloud, Codex relance les vérificateurs officiels. Déplacement vers fait puis nouvelle vérification seulement sur PASS.
