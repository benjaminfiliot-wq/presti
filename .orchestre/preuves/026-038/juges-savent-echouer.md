# 026-038 — chaque juge sait réussir ET échouer

Relevé le 2026-09-27T08:54:31.135Z dans les sorties du verifier (`node scripts/juges-026-horloge-bus-preuve.mjs --lot=03`, dossier `sorties/`). En `--temoin`, chaque critère est jugé sur une implémentation de référence (`scripts/fixtures/026-horloge-bus/doublures/temoins/`) où il doit être VERT, puis sur chaque sabotage déclaré dans le juge (une altération d'un fichier du témoin) où il doit être ROUGE ; un sabotage accepté ou inapplicable rend le critère rouge. Sur la référence (`86ce0f3`), chaque juge sort en code 1 avec son premier critère en échec (`echecs-attendus.md`).

| Juge | Critère | Témoin | Sabotages pris (sortie réelle) |
|---|---|---|---|
| `agents-garde-qa` | AG-1 | vert | 5 : format assoupli, jeton de 30 octets, empreinte en base64, nomDuJeton laxiste, import de la base |
| `agents-garde-qa` | AG-2 | vert | 5 : jeton inconnu au corps différent, hachage avant le format, nom du jeton non comparé, disjoncteur ignoré, panne de la base en 401 |
| `agents-garde-qa` | AG-3 | vert | 4 : fail-open sur le débit, clé du débit sans la minute, fenêtre d'une heure, plafond par adresse à 31 |
| `agents-garde-qa` | AG-4 | vert | 4 : type non vérifié, jeton dans le journal, journal en panne fatal, événement mal typé |
| `agents-garde-qa` | AG-5 | vert | 5 : paramètre renommé, fonction manquante, statut oublié, quota en 500, texte Postgres qui sort |
| `agents-garde-qa` | AG-6 | vert | 7 : jeton affiché deux fois, empreinte d'autre chose, terminal accepté, tube bavard, fichier écrit, agent inconnu en code 0, clé affichée |
| `agents-garde-qa` | AG-7 | vert | 3 : moteur de modèle cité, clé Anthropic lue, lib/limites.ts touché |
| `agents-garde-qa` | AG-8 | vert | lecture de tsc éprouvée sur 5 passages synthétiques (tsc non relancé en --temoin : 8 Go) |
| `agents-garde-qa` | AG-9 | sauté | — (--reel seulement) |
| `agents-routes-qa` | AR-1 | vert | 4 : runtime edge, [id] synchrone, route manquante, dynamic oublié |
| `agents-routes-qa` | AR-2 | vert | 5 : drapeau non lu par etat, drapeau levé, autre drapeau touché, carte sans battement, ligne de carte absente |
| `agents-routes-qa` | AR-3 | vert | 2 : battement sans garde, etat lu avant la garde |
| `agents-routes-qa` | AR-4 | vert | 3 : type non exigé, table evenements non exigée, decisions gardée par taches |
| `agents-routes-qa` | AR-5 | vert | 3 : nom pris du corps, limite mal nommée, prendre deux fois |
| `agents-routes-qa` | AR-6 | vert | 4 : 413 à 64 Ko, JSON invalide rattrapé, résumé de 250 signes, resultat libre |
| `agents-routes-qa` | AR-7 | vert | 3 : erreurs du bus en 500, bail perdu en 400, texte de Postgres qui remonte du bus |
| `agents-routes-qa` | AR-8 | vert | 3 : supabaseAdmin cité, trancher cité, acquisition citée |
| `agents-routes-qa` | AR-9 | vert | 2 : état enrichi d'un e-mail, état résumé |
| `agents-routes-qa` | AR-10 | vert | lecture de tsc éprouvée sur 5 passages synthétiques (tsc non relancé en --temoin : 8 Go) |
| `agents-routes-qa` | AR-11 | sauté | — (--reel seulement) |
| `agents-routes-qa` | AR-12 | vert | 2 : taches toujours 201, decisions toujours 200 |
| `agents-routes-qa` | AR-13 | vert | 4 : depuis borné à 60 jours, agent pris de la requête, tranchees facultatif, liste enveloppée |
| `agents-routes-qa` | AR-14 | vert | 2 : vocabulaire des consignes refusé, consignes ôtées de la liste |
| `pause-qa` | PA-1 | vert | 4 : variable ignorée, variable qui interroge la base, panne = inactive, mauvais interrupteur |
| `pause-qa` | PA-2 | vert | 7 : reconfirmation oubliée, partenaire accepté, motif non borné, journal ignoré, écriture avant le journal, auteur fixe, action mal nommée |
| `pause-qa` | PA-3 | vert | 3 : GET sans garde, GET qui lit la base avant la garde, GET à l'état figé |
| `pause-qa` | PA-4 | vert | 3 : journaliser modifié, action absente, deux actions ajoutées |
| `pause-qa` | PA-5 | vert | 8 : Vercel sans redéploiement, ancien nom de variable, envoye dans ce qui est coupé, SQL qui efface, SQL hors des deux tables, secret dans la doc, voie Telegram absente, chaîne SQL non fermée |
| `pause-qa` | PA-6 | vert | lecture de tsc éprouvée sur 5 passages synthétiques (tsc non relancé en --temoin : 8 Go) |
| `pause-qa` | PA-7 | sauté | — (--reel seulement) |
| `pause-qa` | PA-8 | vert | 7 : séquenceur revenu, Crieur oublié, réception coupée, première ligne muette, Publora non dit, opposition oubliée, livraison oubliée |
| `pause-qa` | PA-9 | vert | 3 : champ sequenceur dans la réponse, appel réseau dans pause.ts, acquisition importée |
| `pause-qa` | PA-10 | vert | 4 : SQL Editor revenu, voie SQL sans Claude Code, pont qui lève la pause, motif SQL Editor |

Total : 109 sabotages, tous pris. La raison de chaque rejet est dans `sorties/<juge>-temoin.log`.
