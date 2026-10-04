# Mutations des juges de la station qui lisent la base (026-192)

Tous les juges tournent sans --reel : doublures, aucun compte, aucune clé, aucun .env.local, aucune écriture en production.

## ÉCHECS (3)
- TÉMOIN extraction  rouge : code 1 ; critères en échec : XT-5 ; poste-extraction-qa : FAIL — XT-5
- FAIL SR-5 — station_reglages_ecrire n’exige plus la version courante ; supabase/migrations/0113_station_reglages.sql ; code 1 : SR-5 rapporté PASS : « PASS SR-5 — version périmée → ops:version_perimee ; clé hors de la liste fermée → ops:cle_inconnue ; plus de 64 Ko → op… »
- TÉMOIN ecran --partie=salles-suite rouge : code 1 ; critères en échec : SB-2, SB-8 ; pilotage-ecran-qa --partie=salles-suite : FAIL — SB-2, SB-8

## Témoins (copie intacte)
- reglages  : témoin vert en 7 s
- extraction  : témoin rouge (code 1 ; XT-5) en 15 s
- route --partie=salles2 : témoin vert en 1 s
- sql --migration=reglages : témoin vert en 1 s
- ecran --partie=salles-suite : témoin rouge (code 1 ; SB-2, SB-8) en 315 s

## Mutations
- PASS RX-1 — le test du drapeau pilotage passe après l’identité dans le PUT ; app/api/controle/station/reglages/route.ts ; FAIL RX-1 — PUT : première instruction « const f = await estDirection(req) », « if (!actif('pilotage')) … » attendu
- PASS RX-2 — le PUT exige estFondateur au lieu d’estDirection ; app/api/controle/station/reglages/route.ts ; FAIL RX-2 — PUT : estDirection( absent ; PUT : estFondateur( : la lecture ne doit pas suffire pour écrire ; PUT n’appelle pas estDirection (le rôle lecture doit être refusé) ; PUT appelle estFondateur : seul estDirection ferme l’écriture au rôle lecture ; PUT fondateur en lecture → 200, 403 attendu ; PUT fondateur en lecture : écriture malgré le refus
- PASS RX-4 — plus de journal AVANT l’écriture (seul le journal du résultat reste) ; app/api/controle/station/reglages/route.ts ; FAIL RX-4 — PUT : journaliser( vient APRÈS station_reglages_ecrire : le journal se pose avant d’écrire ; PUT : 1 appel(s) de journaliser(, 2 attendus (avant, puis le résultat) ; ordre des appels : ecriture → journal1, journal1 → ecriture → journal2 attendu (le journal AVANT l’écriture, puis le résultat) ; journal avant : action « station_reglages », avant undefined ; station_reglages et { version: 3 } attendus ; journaliser → false : la base est écrite quand même ; journaliser → false → 200, 503 (refusJournal) attendu
- PASS XT-2 — un champ de la réponse de /api/controle/barre renommé (messages → courriers) ; app/api/controle/barre/route.ts ; FAIL XT-2 — « barre · fondateur » : $.compteurs.valeur.messages : présent dans la référence, absent de l'état jugé ; $.compteurs.valeur.courriers : ajouté par l'état jugé ; « barre · fondateur, service dégradé » : $.compteurs.valeur.messages : présent dans la référence, absent de l'état jugé ; $.compteurs.valeur.courriers : ajouté par l'état jugé ; « barre · fondateur, état 500 » : $.compteurs.valeur.messages : présent dans la référence, absent de l'état jugé ; $.compteurs.valeur.courriers : ajouté par l'état jugé ; « barre · fondateur, Stripe et Anthropic en panne » : $.compteurs.valeur.messages : présent dans la référence, absent de l'état jugé ; $.compteurs.valeur.courriers : ajouté par l'état jugé ; « barre · fondateur, budget et espace posés » : $.compteurs.valeur.messages : présent dans la référence, absent de l'état jugé ; $.compteurs.valeur.courriers : ajouté par l'état jugé ; « barre · fondateur, messagerie fermée, alertes en panne » : $.compteurs.valeur.messages : présent dans la référence, absent de l'état jugé ; $.compteurs.valeur.courriers : ajouté par l'état jugé ; … (8 défauts)
- PASS XT-3 — ticketsOuverts sélectionne la colonne message ; lib/controle/lectures/tickets.ts ; FAIL XT-3 — lib/controle/lectures/tickets.ts nomme une colonne de contenu dans une chaîne (« message ») : ni message, ni corps, ni sujet, ni contenu ; la requête sur tickets sélectionne « id, message » : une colonne de contenu
- PASS SL-2 — le lecteur de l’Audience est rangé sous le domaine sante ; lib/pilotage/station.ts ; FAIL SL-2 — salle=audience sans le domaine audience : {"vue":"salle","role":"direction","valeur":{"en_ligne":2,"visiteurs_jour":31,"v…, « hors périmètre » attendu
- PASS SL-6 — la salle Presti rend la liste des tickets en plus de leur nombre ; lib/pilotage/salles/presti.ts ; FAIL SL-6 — salle=presti : tickets {"valeur":{"nombre":3,"liste":{"nombre":3,"dernier":{"sujet":"Mon mot de passe T, { nombre: 3 } seul attendu ; salle=presti porte le contenu d’un ticket (« Mon mot de passe Témoin ne marche plus ») ; salle=presti porte le contenu d’un ticket (« ticket-temoin@exemple.invalid »)
- FAIL SR-5 — station_reglages_ecrire n’exige plus la version courante ; supabase/migrations/0113_station_reglages.sql ; code 1 : SR-5 rapporté PASS : « PASS SR-5 — version périmée → ops:version_perimee ; clé hors de la liste fermée → ops:cle_inconnue ; plus de 64 Ko → op… »
- PASS SR-7 — pilotage_prospects_departements rend une colonne entreprise ; supabase/migrations/0113_station_reglages.sql ; FAIL SR-7 — rend une colonne nominative
- PASS SB-3 — le compteur OUI du Radar recalculé à l’écran (la moitié des réponses) au lieu du chiffre servi ; app/controle/station/salles/Radar.tsx ; FAIL SB-3 — Radar : j7.oui = 2 (tiré) absent ; Radar : j30.oui = 4 (tiré) absent ; Radar : nombre(s) non servi(s) affiché(s) : 33
- PASS SB-6 — un bouton « Publier » ajouté au panneau du Crieur ; app/controle/station/salles/Crieur.tsx ; FAIL SB-6 — Crieur : bouton ou lien « Publier »

Bilan : 10/11 mutations prises sur leur critère nommé, en 15.4 min (budget 19 min).
