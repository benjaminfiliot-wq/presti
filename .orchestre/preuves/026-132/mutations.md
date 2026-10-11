# ÉCHECS — la fiche n’est PAS prouvée

- témoin station rouge : la copie intacte ne passe pas (code 1 — FAIL ST-11 — app/controle/station/salles/salles.css déclare un jeton --mc- : les défauts vivent dans station.css seulement) ; ses 7 mutation(s) ne sont pas éprouvées
- témoin experience rouge : la copie intacte ne passe pas (code 1 — FAIL EX-1 — app/controle/station/salles/experience.css absent ; Experience.tsx est encore le cadre d’attente (aucun [data-experience-texte]) ; Experience.tsx ne lit pas /api/controle/station?vue=salle&salle=experience) ; ses 1 mutation(s) ne sont pas éprouvées

# 026-132 — contre-vérification du juge d'écran de la station

> Écrit par `node scripts/juges-026-station-ecran-mutations.mjs` le 05/10/2026 00:13:17 (heure de Paris). Juge : `scripts/pilotage-ecran-qa.mjs`, un banc par passage (racine = la copie, aucun serveur réel, aucun compte, aucun `.env.local`). Les mutations sont posées sur UNE copie sous `.orchestre/travail/026-132/`, rétablie après chaque passage ; le dépôt n’est jamais écrit.

Mutations prises : 9 sur 17. Témoins verts : 4 sur 6.

## MU-1 — les témoins (le juge complet sur la copie intacte)

| partie | code | durée | dernière ligne réelle | verdict |
|---|---|---|---|---|
| station | 1 | 208 s | `pilotage-ecran-qa --partie=station : FAIL — ST-11, ST-18` | ROUGE — code 1 — FAIL ST-11 — app/controle/station/salles/salles.css déclare un jeton --mc- : les défauts vivent dans station.css seulement |
| vues | 0 | 22 s | `pilotage-ecran-qa --partie=vues : PASS` | PASS |
| salles | 0 | 74 s | `pilotage-ecran-qa --partie=salles : PASS` | PASS |
| fil | 0 | 23 s | `pilotage-ecran-qa --partie=fil : PASS` | PASS |
| gestes | 0 | 33 s | `pilotage-ecran-qa --partie=gestes : PASS` | PASS |
| experience | 1 | 1 s | `pilotage-ecran-qa --partie=experience : FAIL — EX-1, EX-2, EX-3, EX-4, EX-5, EX-6, EX-7, EX-8, EX-9` | ROUGE — code 1 — FAIL EX-1 — app/controle/station/salles/experience.css absent ; Experience.tsx est encore le cadre d’attente (aucun [data-experience-texte]) ; Experience.tsx ne lit pas /api/controle/station?vue=salle&salle=experience |

## MU-2 — les mutations (une ligne par mutation)

| partie | critère | ce qui est cassé | fichier | extrait réel du verdict | durée |
|---|---|---|---|---|---|
| station | ST-4 | les trois cases d’argent de Barre.tsx écrites sans euros( | `app/controle/station/Barre.tsx` | **NON PRISE** — témoin rouge : mutation non éprouvée | — |
| station | ST-11 | une couleur #6C8CFF ajoutée dans app/globals.css | `app/globals.css` | **NON PRISE** — témoin rouge : mutation non éprouvée | — |
| station | ST-16 | une animation infinie posée sur .mc dans station.css | `app/controle/station/station.css` | **NON PRISE** — témoin rouge : mutation non éprouvée | — |
| station | ST-18 | le cadre d’attente de Carte.tsx perd sa liste [data-liste-salles] | `app/controle/station/Carte.tsx` | **NON PRISE** — témoin rouge : mutation non éprouvée | — |
| station | ST-14 | Station.tsx ne lit plus /api/controle/station/reglages au chargement | `app/controle/station/Station.tsx` | **NON PRISE** — témoin rouge : mutation non éprouvée | — |
| station | ST-3 | data-mise-en-page ne suit plus les réglages (colonnes gardées en « flottante ») | `app/controle/station/Station.tsx` | **NON PRISE** — témoin rouge : mutation non éprouvée | — |
| station | ST-11 | une surcharge de couleur posée sur :root au lieu du nœud .mc | `app/controle/station/Habillage.tsx` | **NON PRISE** — témoin rouge : mutation non éprouvée | — |
| vues | VU-4 | l’Aide recopie un gabarit de sources au lieu de la source servie de chaque compteur | `app/controle/station/vues/Aide.tsx` | `FAIL VU-4 — tirage 1 : [data-origine="agents"] « AGENTS ACTIFS registre_des_compteurs », la source servie « jauges_envois_17 » attendue ; tirage 1 : [data-origine="chef"] « CHEF DANS registre_des_compteurs », la source servie « station_reunion_85 » attendue ; tirage 1 : [data-origine="cycles"] « CYCLES AUJOURD’HUI registre_des_compteurs », la source servie …` | 10 s |
| vues | VU-3 | la vue Succès cache les succès à venir au lieu de les griser | `app/controle/station/vues/Succes.tsx` | `FAIL VU-3 — 1 [data-succes], 4 servis dans tousSucces ; ordre premier_oui ; premier_oui, premiere_vente, premier_site_en_ligne, bilan_passe servi ; succès premiere_vente absent (un succès à venir est grisé, jamais caché) ; succès premier_site_en_ligne absent (un succès à venir est grisé, jamais caché) ; succès bilan_passe absent (un succès à venir est grisé…` | 11 s |
| salles | SA-8 | un bouton « Envoyer » ajouté à la Salle des envois | `app/controle/station/salles/Envois.tsx` | `FAIL SA-8 — bouton ou lien « Envoyer »` | 7 s |
| salles | SA-15 | le Standard n’affiche plus les pastilles par classe | `app/controle/station/salles/Standard.tsx` | `FAIL SA-15 — pastille oui 3 (tirée) absente ; pastille appel 10 (tirée) absente ; pastille non 0 (tirée) absente ; pastille sensible 9 (tirée) absente ; pastille rgpd 11 (tirée) absente` | 4 s |
| fil | FL-5 | Transmettre.tsx ajoute la bulle de la consigne avant que le fil la serve | `app/controle/station/journal/Transmettre.tsx` | `FAIL FL-5 — une bulle a été ajoutée à la main avant que le fil serve la consigne` | 13 s |
| gestes | EG-4 | une décision à enjeu poste sans ouvrir la boîte de reconfirmation | `app/controle/station/Gestes.tsx` | `FAIL EG-4 — décision à enjeu : 1 POST avant la reconfirmation ; la reconfirmation porte la portée « securite », argent attendue ; après la reconfirmation : /api/controle/pilotage/decisions/d0000000-0000-4000-8000-000000000002 (sans jeton), /api/controle/pilotage/decisions/d0000000-0000-4000-8000-000000000002 (jeton-du-juge-1-6014) ; le POST de la décision a…` | 15 s |
| gestes | EG-9 | les boutons des décisions sont montrés au rôle lecture | `app/controle/station/Gestes.tsx` | `FAIL EG-9 — rôle lecture : 7 geste(s) rendu(s) (data-choix)` | 6 s |
| gestes | EG-12 | un bouton « Copier » ajouté à la feuille des appels | `app/controle/station/Gestes.tsx` | `FAIL EG-12 — feuille des appels : bouton ou lien « Copier » ; feuille des appels : bouton ou lien « Copier » ; feuille des appels : bouton ou lien « Copier »` | 8 s |
| gestes | EG-13 | GestesEnvoi poste « ouvrir_envoi_froid » sans ouvrir la boîte securite | `app/controle/station/Gestes.tsx` | `FAIL EG-13 — ouverture : la boîte securite ne s’ouvre pas après la confirmation ; ouverture : un POST avant la reconfirmation ; ouverture : portée « undefined », securite attendue ; reprendre une technologie : un POST avant la reconfirmation ; reprendre une technologie : {"geste":"reprendre_technologie","technologie":"wpforms"} ; {"geste":"reprendre_technol…` | 123 s |
| experience | EX-1 | un bouton « Lancer » ajouté à salles/Experience.tsx | `app/controle/station/salles/Experience.tsx` | **NON PRISE** — témoin rouge : mutation non éprouvée | — |

## MU-3 — rien n’a bougé

- Empreintes sha256 du juge et de 512 fichier(s) de `scripts/fixtures/026-pilotage/` : identiques avant et après.
- `git status --porcelain` du juge et de ses jeux d’essai : identique avant et après (65 ligne(s)).
- Les 13 fichier(s) visés par une mutation ont été lus dans le dépôt, jamais écrits (les mutations vivent dans la copie) ; leur empreinte est la même avant et après.
- La copie sous `.orchestre/travail/026-132/` est supprimée (jonction node_modules retirée par fs.unlinkSync) : supprimée.

## MU-4 — les commandes réellement exécutées

Aucune option de lecture réelle du juge, aucune option de constat : le juge ne reçoit que `--partie=` et `--racine=<copie>` (donc son banc, jamais le serveur réel).

- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=station --racine=<copie>  → code 1, 208 s`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=vues --racine=<copie>  → code 0, 22 s`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=vues --scenario=aide --criteres=VU-4 --racine=<copie>  → code 1, 10 s (mutée : l’Aide recopie un gabarit de sources au lieu de la source servie de chaque compteur)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=vues --scenario=succ --criteres=VU-3 --racine=<copie>  → code 1, 11 s (mutée : la vue Succès cache les succès à venir au lieu de les griser)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=salles --racine=<copie>  → code 0, 74 s`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=salles --scenario=envois --criteres=SA-8 --racine=<copie>  → code 1, 7 s (mutée : un bouton « Envoyer » ajouté à la Salle des envois)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=salles --scenario=standard --criteres=SA-15 --racine=<copie>  → code 1, 4 s (mutée : le Standard n’affiche plus les pastilles par classe)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=fil --racine=<copie>  → code 0, 23 s`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=fil --scenario=transmettre --criteres=FL-5 --racine=<copie>  → code 1, 13 s (mutée : Transmettre.tsx ajoute la bulle de la consigne avant que le fil la serve)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=gestes --racine=<copie>  → code 0, 33 s`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=gestes --scenario=cisions --criteres=EG-4 --racine=<copie>  → code 1, 15 s (mutée : une décision à enjeu poste sans ouvrir la boîte de reconfirmation)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=gestes --scenario=lecture --criteres=EG-9 --racine=<copie>  → code 1, 6 s (mutée : les boutons des décisions sont montrés au rôle lecture)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=gestes --scenario=appels --criteres=EG-12 --racine=<copie>  → code 1, 8 s (mutée : un bouton « Copier » ajouté à la feuille des appels)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=gestes --scenario=envoi --criteres=EG-13 --racine=<copie>  → code 1, 123 s (mutée : GestesEnvoi poste « ouvrir_envoi_froid » sans ouvrir la boîte securite)`
- `node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=experience --racine=<copie>  → code 1, 1 s`

## Les passages de la liste imposée

`scripts/pilotage-ecran-qa.mjs` : ST-4, ST-11, ST-16, ST-18, VU-3, VU-4, SA-8, SA-15, FL-5, EG-4, EG-9, EG-12, EG-13, EX-1, plus ST-14 et ST-3 (réglages). Critères pris par au moins une mutation : VU-4, VU-3, SA-8, SA-15, FL-5, EG-4, EG-9, EG-12, EG-13.
