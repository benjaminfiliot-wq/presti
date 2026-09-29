# Contre-vérification 026-224 (29/09/2026, Claude ; revue Codex indisponible : quota épuisé jusqu'au 3/10)

Production faite par Claude (le patch Codex n'existe pas : l'usine a rendu QUOTA en 3 s). Fichier contrôlé : `lib/studio/voixFish.ts`, sha256 `087d3a76f943616337b74f9ba40db05cdc85333dc8dc330c725101d4aeed64fa`.

Quatre sabotages réversibles, chacun appliqué seul, le juge `--partie=fish` relancé, puis le fichier restauré (sha256 identique vérifié) :

| # | Faute injectée | Résultat du juge |
| --- | --- | --- |
| 1 | forfait commercial plus exigé (`if (false && usage_commercial …)`) | code 1 ; rouges FA-2, FA-5, FA-6 |
| 2 | solde inconnu ignoré (`: 1e9` au lieu de `: null`) | code 1 ; rouge FA-4 |
| 3 | pas de restitution du crédit à l'échec de la synthèse | code 1 ; rouge FA-7 |
| 4 | la voix locale annonce Fish (`fournisseur: 'fish'` dans le repli) | code 1 ; rouges FA-2, FA-4, FA-5, FA-7, FA-9, FA-11 |

Aucun sabotage n'est passé inaperçu. Restauration : sha256 avant = après (`087d3a76…64fa`). Juge sur le fichier restauré : PASS 13/13, code 0.

Limites : la logique est jugée hors réseau sur des doublures ; aucun appel Fish réel, aucun plan ni quota réel mesuré (« non mesuré »). Le forfait commercial reste une décision d'argent de Benj.
