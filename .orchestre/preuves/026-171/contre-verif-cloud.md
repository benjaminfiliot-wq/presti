# 026-171 — contre-vérification (session cloud, 30/09)

Deux sous-agents distincts ont écrit : (A) `station-themes-qa` et `ecommerce-reservee-qa` ; (B) `station-reglages-qa` et `poste-extraction-qa`. Claude Code a fusionné les deux lots (un seul fichier `t/lot.mjs`, JA-6 le copie seul), récupéré l'historique complet (le commit `4041ec9` manquait dans le clone peu profond : JA-10 rougissait) et rejoué la preuve.

| Juge | Sabotages du témoin | Résultat |
|---|---|---|
| `station-themes-qa --partie=modules` (TH-1 à TH-6) | 38 | 38 sur 38 |
| `station-themes-qa --theme=station` / `--theme=vaisseau` (TH-7 à TH-12) | 17 + 17 | 34 sur 34 |
| `ecommerce-reservee-qa` (EC-1 à EC-5) | 17 | 17 sur 17 |
| `station-reglages-qa` (RX-1 à RX-8) | 21 | 21 sur 21 |
| `poste-extraction-qa` (XT-1 à XT-5) | 15 | 15 sur 15 |

Passages de Claude Code : `--lot=t` complet (code 0, JA-1 à JA-10 verts), puis `verifier 026-171` depuis `en-cours/` (PASS), puis depuis `fait/` (PASS, 283 s). Le lot tb de B se joue aussi seul (`--lot=tb`).

## Ce qui n'est pas prouvé
- **`--reel`** de `station-reglages-qa` et `poste-extraction-qa` (compte d'essai réel, vrais 401/403, vrai 404 de l'arbre) : écrit, non testé dans le cloud, non exigé par `verifier`. À jouer sur le PC (décision du 30/09 : la fiche est jouable sans compte, en doublures). En doublures on prouve que la route appelle les bonnes gardes (domaine et verbe exacts) et réagit à leurs refus, pas que les gardes réelles refusent.
- **TH-11** n'a aucun sabotage du témoin (les pièges sont des fichiers du jeu d'essai) ; couvert par JA-3 et les 17 pièges.
- **TH-10 sur l'arbre réel** : sort en code 2 sans `~/station-assets` (l'usine) ; en `--temoin` seule la feuille brute synthétique est testée.
- **EC-3** accepte deux formulations (« trois vidéos sources », fiche 171 ; « six vidéos sources », correction du 27/09 de 026-176) : à trancher avant de figer.
- **026-177** : `lib/direction/journal.ts` n'a pas `'station_reglages'` dans l'union `Action` et la fiche interdit `lib/**` : le `PUT` ne typera pas tant que ce n'est pas ajouté par une fiche amont ou que le périmètre n'est pas élargi.
- **026-174** : « ouvert » pour un ticket = `ferme_le` nul (la table n'a pas de colonne statut, migration 0074) ; `t/tickets.json` suppose un statut : seule sa sentinelle sert.
- Références : `1c87006` (celle du lot k) et non `4041ec9` (celle du lot a).
