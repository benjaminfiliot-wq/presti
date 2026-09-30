# Échecs attendus — partie B du lot t (026-171) : station-reglages-qa et poste-extraction-qa

Sabotage du témoin (t/temoin/) -> critère qui rougit (toujours vu : tableau issu de la preuve `--lot=tb`, 36 sabotages, 36 vus ; critères rouges
relevés par un second passage local). Le témoin n'est jamais laissé saboté : sha256 de t/temoin/** identique avant et après (SHA-IDENTIQUE) ;
JA-8 relit le témoin octet pour octet après chaque sabotage.

Sur la référence 1c87006, sans serveur : `RX-1 app/api/controle/station/reglages/route.ts absent` ; `XT-1 lib/controle/lectures/ absent ; …`.


## station-reglages-qa

| sabotage | tue | critères rouges |
|---|---|---|
| put-drapeau-apres-la-garde | RX-1 | RX-1,RX-2,RX-3,RX-4,RX-5,RX-6,RX-7,RX-8 |
| get-sans-drapeau | RX-1 | RX-1,RX-2,RX-3,RX-4,RX-5,RX-6,RX-7,RX-8 |
| put-estfondateur | RX-2 | RX-2 |
| put-domaine-sante | RX-2 | RX-2 |
| get-verbe-ecrire | RX-2 | RX-2 |
| get-panne-en-500 | RX-2 | RX-2 |
| get-sans-date | RX-2 | RX-2 |
| verdict-ignore | RX-3 | RX-3,RX-5 |
| liste-des-cles-retiree | RX-3 | RX-3 |
| journal-false-ignore | RX-4 | RX-4 |
| journal-apres-l-ecriture | RX-4 | RX-4 |
| perimee-en-503 | RX-4 | RX-4 |
| journal-sans-version | RX-4 | RX-4 |
| plafond-31 | RX-5 | RX-5 |
| compteur-par-appel | RX-5 | RX-5 |
| carte-sans-la-route | RX-6 | RX-6 |
| carte-ligne-en-trop | RX-6 | RX-6 |
| ecriture-directe | RX-7 | RX-2,RX-3,RX-4,RX-5,RX-7 |
| type-faux-dans-la-route | RX-8 | RX-8 |
| action-absente-de-l-union | RX-8 | RX-8 |
| route-retiree | RX-1 | RX-1,RX-2,RX-3,RX-4,RX-5,RX-6,RX-7,RX-8 |

## poste-extraction-qa

| sabotage | tue | critères rouges |
|---|---|---|
| index-des-lectures-retire | XT-1 | XT-1,XT-2,XT-3,XT-4,XT-5 |
| route-recalcule-les-crons | XT-1 | XT-1,XT-2,XT-3,XT-4,XT-5 |
| barre-ordre-des-cles | XT-2 | XT-2 |
| clients-un-credit-de-plus | XT-2 | XT-2 |
| audience-historique-inversee | XT-2 | XT-2 |
| bans-quatre-cents-abus | XT-2 | XT-2 |
| cerveaux-premiere-entree | XT-2 | XT-2 |
| crons-seuil-cent-fois | XT-2 | XT-2 |
| sante-sans-accent | XT-2 | XT-2 |
| tickets-le-sujet | XT-3 | XT-3 |
| tickets-les-fermes | XT-3 | XT-3 |
| tickets-toutes-les-colonnes | XT-3 | XT-3 |
| audience-sans-drapeau | XT-4 | XT-2,XT-4 |
| clients-ne-lit-plus-apports | XT-4 | XT-4 |
| type-faux-dans-une-lecture | XT-5 | XT-5 |
