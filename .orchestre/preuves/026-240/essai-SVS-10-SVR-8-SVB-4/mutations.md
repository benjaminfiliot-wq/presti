# Mutations des juges Savoir

Chaque remplacement est appliqué seul à une copie du dépôt, puis restauré.

## Témoins (copie intacte)

- socle : code 1 ; critères rouges notés (hors mutations) : SVS-2
- recherche : code 0
- reflexion : code 1 ; critères rouges notés (hors mutations) : SVB-9

## Mutations

- 7. range l’index des prospects sous general — SVS-10, code 1, 3.4 s : FAIL SVS-10 — index/general/etat.json : compartiment prospects
- 8. envoie aussi les passages des prospects au modèle d’embeddings — SVS-10, code 1, 5.2 s : FAIL SVS-10 — sémantique allumée : la sentinelle des prospects est partie vers le modèle d’embeddings
- 9. ouvre les vecteurs hors boucle locale — SVS-10, code 1, 5.2 s : FAIL SVS-10 — url-distante : etat general.semantique "active" (attendu "refusee")
- 16. recopie un extrait dans le résumé de l’événement — SVR-8, code 1, 17.0 s : FAIL SVR-8 — s2_fort_chef : le résumé contient un extrait
- 29. ajoute une décision au plan — SVB-4, code 1, 10.7 s : FAIL SVB-4 — plan du bilan « ok » : refusé par docs/agents/chef-plan.schema.json ($.decisions[0] : « cle_idempotence » manque ; $.decisions[0] : « nature » manque ; $.decisions[0] : « question » manque) (0 s)
- 30. rend une tâche sortante — SVB-4, code 1, 10.2 s : FAIL SVB-4 — plan du bilan « ok » : refusé par docs/agents/chef-plan.schema.json ($.taches[0].sortante : const ; $.taches[1].sortante : const ; $.taches[2].sortante : const) (0 s)
