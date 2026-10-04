# 026-203 — mutations de usine-pubs-qa et search-console-qa

Écrit par `node scripts/juges-026-pubs-usine-mutations.mjs` le 2026-10-04T23:32:10.145Z (124 s). Copies sous .orchestre/travail/026-203/, effacées à la fin ; aucun --reel.

## MUTATIONS NON ATTRAPÉES (lacunes des juges : à rouvrir chez Claude Code, jamais corrigées ici)

- **UP-2** — travail accepte aussi le jeton de chef (scripts/usine-pubs-qa.mjs, imposée par la fiche) : code 0, UP-2 : « PASS UP-2 — travail : busAgents baissé → 404 avant toute identité (aucun appel … » ; bilan PASS ; critères en échec : aucun.

## Témoins (copie intacte : code 0 attendu)

| Juge | Partie | Code | Dernière ligne | Durée |
|---|---|---|---|---|
| usine-pubs | routes,tourneur,unites | 0 | usine-pubs-qa : PASS | 14 s |
| usine-pubs | routes | 0 | usine-pubs-qa : PASS | 1.5 s |
| usine-pubs | tourneur | 0 | usine-pubs-qa : PASS | 10.6 s |
| search-console | (aucune option) | 0 | search-console-qa : PASS | 29.7 s |

## Mutations (un remplacement de texte exact par copie)

| Juge | Critère | Faute | Fichier | Verdict | Extrait réel | Commande |
|---|---|---|---|---|---|---|
| usine-pubs-qa | UP-2 | travail accepte aussi le jeton de chef | app/api/usine/pubs/travail/route.ts | **SURVIT** | code 0 : UP-2 : « PASS UP-2 — travail : busAgents baissé → 404 avant toute identité (aucun appel … » ; bilan PASS | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:routes --racine={racine}` |
| usine-pubs-qa | UP-2 | travail accepte aussi le jeton de livreur_usine (variante) | app/api/usine/pubs/travail/route.ts | attrapée | FAIL UP-2 — travail : le jeton de livreur_usine donne 200 et un battement est posé (403 attendu : seule l'identité studio est admise) ; travail : un refus (livreur) a écrit dans la base ou signé une adresse | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:routes --racine={racine}` |
| usine-pubs-qa | UP-3 | travail renvoie le courriel du pack | app/api/usine/pubs/travail/route.ts | attrapée | FAIL UP-3 — pack ≠ pack.json de exporter.mjs (reçu {"courriel":"client.sentinelle@exemple.invalid","matiere":{"accroche":"artisan_de_confiance","communes":["Rennes"],"cta… ; attendu {"matiere":{"accroche":"artisan_de_confiance","communes":["Rennes"],"cta":"devis","decennale":true,"duree_travaux":"3 j…) ; la réponse porte courriel_client : ni courriel ni téléphone attendus | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:routes --racine={racine}` |
| usine-pubs-qa | UP-4 | depot accepte un chemin hors de livraison/ | lib/pubs/usinePubs.ts | attrapée | FAIL UP-4 — échantillon sous une autre marque : statut 200, 1 adresse(s) signée(s) (400 sans adresse attendu) ; adresse signée hors des chemins permis : packs-pubs/studio/marque-opposee/echantillon-1.mp4 | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:routes --racine={racine}` |
| usine-pubs-qa | UP-5 | rendu passe le pack à fabriquee sans relire les fichiers | app/api/usine/pubs/rendu/route.ts | attrapée | FAIL UP-5 — fichiers relus : aucun ; les six du pack attendus ; un fichier absent du stockage : statut 200, corps {"ok":true}, état fabriquee, la route a modifié autre chose que le compteur d'échecs ({ ok: false, raison } et payee attendus) ; une empreinte SHA-256 fausse : statut 200, corps {"ok":true}, état fabriquee, la route a modifié autre chose que le compteur d'échecs ({ ok: false, raison } et payee attendus) (+4) | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:routes --racine={racine}` |
| usine-pubs-qa | UP-5 | rendu tranche le premier échantillon en depose sans la décision de Benj | app/api/usine/pubs/rendu/route.ts | attrapée | FAIL UP-5 — premier échantillon : statut 200, corps {"ok":true}, décision tranchee (ouverte attendue : Benj regarde d'abord) ; décision pour Benj : 0 décision(s) à options envoyer/refaire (une seule, créée par studio, attendue) ; aperçu : aucun lien signé, absent de la décision (10 min au plus, dans la décision, attendu) (+1) | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:routes --racine={racine}` |
| usine-pubs-qa | UP-6 | le tourneur dépose même si pub-locale-qa est rouge | scripts/usine/pubs.mjs | attrapée | FAIL UP-6 — juge rouge : 1 demande(s) de dépôt, 6 envoi(s) (aucun attendu) ; juge rouge : rendus [{"travail":"11111111-1111-4111-8111-111111111111","ok":true,"fichiers":[{"chemin":"packs-pubs/11111111-1111-4111-8111-… (ok: false et une raison attendus, jamais ok: true) | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:tourneur --racine={racine}` |
| usine-pubs-qa | UP-7 | le tourneur passe la réponse d'accord au lecteur studio | scripts/usine/pubs.mjs | attrapée | FAIL UP-7 — lecteur : 1 appel(s) du lanceur, ses données portent le Message-ID de la marque, la réponse d'accord | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:tourneur --racine={racine}` |
| usine-pubs-qa | UP-8 | le jeton d'agent écrit dans une ligne de journal | scripts/usine/pubs.mjs | attrapée | FAIL UP-8 — le jeton d'agent apparaît : pack : la sortie du tourneur ; pack-juge-rouge : la sortie du tourneur ; pack-fabriquer-echec : la sortie du tourneur | `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=usine-pubs:tourneur --racine={racine}` |
| search-console-qa | SC-7 | le jeton d'accès écrit dans le journal | lib/sites/searchConsole.ts | attrapée | FAIL SC-7 — secret en console/erreur rendue | `node scripts/search-console-qa.mjs --racine={racine}` |
| search-console-qa | SC-3 | search_console_le posé avant la soumission du plan | lib/sites/searchConsole.ts | attrapée | FAIL SC-3 — ordre/date incorrect | `node scripts/search-console-qa.mjs --racine={racine}` |
| search-console-qa | SC-4 | le fichier de vérification écrit à la racine du bucket | lib/sites/searchConsole.ts | attrapée | FAIL SC-4 — écriture bucket supplémentaire/incorrecte | `node scripts/search-console-qa.mjs --racine={racine}` |
| search-console-qa | SC-6 | plus de limite d'essais (un 4e essai après trois échecs) | lib/siteLivraison.ts | attrapée | FAIL SC-6 — quatrième essai après trois échecs | `node scripts/search-console-qa.mjs --racine={racine}` |

