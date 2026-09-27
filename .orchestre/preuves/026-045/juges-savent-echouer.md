# 026-045 — les quatre juges savent réussir et savent échouer

Tiré le 2026-09-27T13:58:17.926Z des sorties `--temoin` que la preuve a lancées elle-même (`.orchestre/preuves/026-045/sorties/<juge>-temoin.log`, écrites par `node scripts/juges-026-horloge-bus-preuve.mjs --lot=04`). Pour chaque critère : VERT sur le témoin réel (`scripts/fixtures/026-horloge-bus/veilleur/temoins/`, dérivés de HEAD), puis chaque sabotage déclaré dans le juge a rendu le critère ROUGE. Un sabotage accepté, ou un critère sans sabotage, rend le critère rouge et le juge sort en code 1 : la preuve JP-2 l'aurait vu.

Sur la référence (`86ce0f3`, avant les fiches jugées), chaque juge échoue sur son premier critère : voir `echecs-attendus.md`.

## file-argent-qa (témoin : code 0)

| Critère | Verdict | Sabotages pris |
|---|---|---|
| AF-1 | PASS | 2 : registre ouvert ; balayage non exporté |
| AF-2 | PASS | 4 : fait malgré l'échec ; capacité fausse ; brouillon livré ; type inconnu marqué fait |
| AF-3 | PASS | 2 : budget vu entre deux lectures seulement ; budget relu trop tard |
| AF-4 | PASS | 3 : sans borne de 30 jours ; générées balayées ; clé sans préfixe |
| AF-5 | PASS | 2 : lib/email importé ; commande écrite |
| AF-6 | PASS | 2 : fait appelé deux fois ; gestionnaire rappelé de mémoire |
| AF-7 | PASS | lecture éprouvée sur des cas synthétiques (conforme vert, sabotages rouges) |
| AF-8 | SAUTE | --reel seulement |
| AF-9 | PASS | 6 : dépôt qui bloque l'argent ; second dépôt ; photo d'un autre dossier ; clé hors format ; générée déposée ; lecture de sortie |

## veilleur-qa (témoin : code 0)

| Critère | Verdict | Sabotages pris |
|---|---|---|
| VA-1 | PASS | 2 : gmail_bloque hors des urgents ; creneauDigest non exportée |
| VA-2 | PASS | 4 : muet à 3,2 périodes ; agent en pause surveillé ; panne sans envoi ; jeton à J-8 signalé |
| VA-3 | PASS | 2 : non urgents envoyés ; notification non comptée |
| VA-4 | PASS | 4 : soir dès 18 h ; heure de Paris lue en UTC ; lien de décision bavard ; section des coûts renommée |
| VA-5 | PASS | 3 : systeme mis en pause ; support non épargné ; coupe à 100 € |
| VA-6 | PASS | 2 : passage non noté ; battement oublié |
| VA-7 | PASS | 5 : tic à 2 h ; digest du lundi sans condition ; verrou de envoyer relâché ; simulation du bilan oubliée ; garderAlerte qui envoie |
| VA-8 | PASS | 2 : autre entrée ajoutée ; libellé changé |
| VA-9 | PASS | 2 : palier réévalué ; fetch vers Meta |
| VA-10 | PASS | lecture éprouvée sur des cas synthétiques (conforme vert, sabotages rouges) |
| VA-11 | PASS | 3 : usine muette pendant la pause ; agents de l'usine en double ; usine absente signalée |
| VA-12 | PASS | 2 : carte des coûts ; crédit de clé |
| VA-13 | PASS | 4 : absente = non mesurée ; une ligne par technologie ; arrêt jusqu'à Benj ignoré ; notice périmée à 5 jours |
| VA-14 | PASS | 1 : coupure Meta passée signalée |
| VA-15 | PASS | 3 : jaunes d'abord ; neuf lignes ; stockage hors de COULEURS |
| VA-16 | PASS | 2 : question dans le digest ; technologie recopiée |
| VA-17 | PASS | 2 : import statique des disjoncteurs ; absence qui lève |
| VA-18 | PASS | 2 : seuil recalculé ; jauge pleine envoyée |
| VA-19 | PASS | 4 : bilan la veille ; vercel sans décision ; jeton sans le chemin du coffre ; geste vers le SQL Editor |

## tic-qa (témoin : code 0)

| Critère | Verdict | Sabotages pris |
|---|---|---|
| TC-1 | PASS | 3 : runtime edge ; POST exportée ; maxDuration 300 |
| TC-2 | PASS | 3 : drapeau non lu ; jeton sans Bearer accepté ; ouvert sans secret |
| TC-3 | PASS | 3 : veilleur à chaque minute ; passage noté d'abord ; file sans borne de 12 s |
| TC-4 | PASS | 3 : échec non signalé ; une panne arrête tout ; texte de l'erreur rendu |
| TC-5 | PASS | 2 : réserve du veilleur ignorée ; passage oublié après une longue file |
| TC-6 | PASS | 2 : créneau non verrouillé ; fenêtre de 20 s |
| TC-7 | PASS | 2 : pause non reportée ; pause qui arrête le tic |
| TC-8 | PASS | 2 : rendus bruts ; identifiant du passage rendu |
| TC-9 | PASS | 3 : autre chemin ajouté ; tic absent de la carte ; drapeau lu autrement |
| TC-10 | PASS | lecture éprouvée sur des cas synthétiques (conforme vert, sabotages rouges) |
| TC-11 | SAUTE | --reel seulement |

## horloge-qa (témoin : code 0)

| Critère | Verdict | Sabotages pris |
|---|---|---|
| E24-0 | PASS | 3 : route du tic absente ; ops_horloge_etat hors du contrat ; ops_horloge_etat sans paramètre |
| E24-1 | PASS | 2 : un trou de 11 min ; 1 379 exécutions |
| E24-2 | PASS | 2 : 275 passages ; un écart de 20 min |
| E24-3 | PASS | 1 : le digest du soir manquant |
| E24-4 | PASS | 2 : tic vieux de 11 min ; tic en échec |
| E24-5 | PASS | 2 : un message non fait depuis 15 min ; un abandon non signalé |
| E24-6 | PASS | 1 : un agent muet non signalé |
| E24-7 | PASS | 1 : 4 notifications un jour |
| E24-8 | PASS | 2 : une mesure nulle ; une lecture échouée |

Total : 109 sabotages pris par les quatre juges.
