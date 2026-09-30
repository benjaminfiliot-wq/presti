# 026-170 — contre-vérification (session cloud, 30/09)

Écrit par trois agents distincts : le témoin Claw3D et ses fixtures (un sous-agent), le juge `station-claw3d-qa` et le lot k (un autre), relus et rejoués par Claude Code. Le témoin est un moteur MINIMAL (environ 700 lignes, 14 fichiers de code) : il prouve que le juge sait rougir et passer, il n'est pas le moteur de 026-179 à 026-186.

| Entrée du lot k | Premier critère | Sabotages du témoin | Résultat |
|---|---|---|---|
| `provenance` | CL-1 | 6 (notice absente, classe Tailwind, import three, deux `fetch(`, Phaser chargé partout, `Carte` qui charge autre chose) | 6 sur 6 vus par JA-8 |
| `verite,grille` | CL-6 | 6 (between caché, réservée prise pour destination ou ouverte à la marche, acteur inactif au repos, chiffre peint dans le décor, hasard de la page) | 6 sur 6 |
| `repos,garde,pixel,contexte` | CL-9 | 4 (pont appelé à chaque lecture, carte avant le 200, k non entier, contexte perdu sans reconstruction) | 4 sur 4 |
| `hygiene,csp,poids` | CL-16 | 3 (proxy sans `station`, `fetch` externe, Phaser chargé partout) | 3 sur 3 |

Les 19 sabotages sont rejoués par la preuve elle-même (JA-8, témoin rétabli octet pour octet après chacun), dans trois passages indépendants de Claude Code : `--lot=k` complet (code 0, JA-1 à JA-10), puis `verifier 026-170` depuis `en-cours/` (PASS, 1375 s), puis depuis `fait/` (code 0).

## Ce qui n'est pas prouvé
- **Le moteur réel** (026-179 à 026-186) n'existe pas : le juge n'a tourné que sur le témoin. Premier vrai passage à la livraison de 026-179.
- **CL-14 (perte de contexte WebGL)** : sous Chromium un moteur qui ne fait que `preventDefault` survit à `loseContext()` ; le juge ne peut pas le sanctionner (NOTES-JUGE.md).
- **CL-12 (poids)** : la référence « avant 026-179 » n'existe pas dans le clone, c'est la même copie avec `Carte.tsx` vidé.
- **Durée** : 21 à 31 minutes selon le cache de builds (coupe annoncée : 30). Le cache pèse jusqu'à 3,2 Go sous `.orchestre/travail/` (ignoré par git).
- **Rendu** : WebGL logiciel (SwiftShader) ; Chromium 1194 à la place du 1243 attendu par le Playwright du dépôt.
- **Contrats fixés par le juge** (à respecter par Codex) : `moteur/grille/grille.ts` exporte `construireGrille`, `astar2D`, `destinations`, `tapisContinu` ; le moteur doit construire par `new Phaser.Game(config)` sur une ligne ; le juge instrumente sa copie par `((globalThis as any).__stationGame = …)` (`next build` refuse la forme sans `as any`).
