## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (tâche : « fiches de lecture de vidéos TikTok, sources, offre entreprise sur mesure ») : a rendu les règles de Benj sur les comptes réseaux non Presti (aucune interaction avec le compte @restructureai, lecture seule de fichiers déjà sur le serveur), sur les vidéos (lire les synthèses automatiques sans les croire) et sur la voix des publications. Effet : travail limité à la lecture, aucun envoi, aucun téléchargement.
- **MCP `cerveau`, `chercher`** (« restructureai vidéos offre entreprise sur mesure ») : a retrouvé la note de référence `source-restructureai-depots-n8n-0211` (sources de savoir, jamais importées à l'aveugle), le prompt 5, le brief 032-022 et `fiches-videos.md`. Effet : le format des fiches et l'ordre par date ont été repris du prompt et du brief.
- **Prompt 5** (`plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`) et **brief** (`plans/011-cadrage-01-11/briefs/fiches-videos-restructureai.md`) : format imposé de huit champs ; décision de n'écrire « Presti » que dans la ligne « à remplir par Claude Code ».
- **`plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md`** (forme des fiches déjà faites) et **`docs/ecommerce/sources/restructureai-7690784360898874645.analyse.md`** : le premier m'a appris que l'audio de la vidéo du 29/09 manquait et qu'aucune légende ne nommait n8n ; la seconde, lue en tête seulement, a permis de recouper les blocs du schéma (« Command Center », « Market Research ») avec les images 010, 022, 080 de la vidéo 1. Effet : la fiche 1 comble le manque d'audio et le signale dans « Vidéos manquantes ou sans son ».
- **Transcriptions Whisper et images** (`/home/usine/agents/videos/restructureai/<id>.transcription.json`, `<id>.info.json`, `<id>-images/`) : source unique des faits. ffmpeg a servi à assembler 6 images par vidéo en une planche de lecture (dans `/tmp/planches`, non versionnée).
- Skills non chargés : aucune compétence de design, de vidéo, de n8n ou d'audit ne sert à une tâche de lecture ; le MCP n8n n'a pas été appelé (aucun workflow à construire, tout reste inactif).

## Lecture vidéo par vidéo

Les 11 transcriptions ont été lues en entier (20 à 43 segments chacune, afficheur horodaté `[mm:ss]`). Six images par vidéo ont été regardées (66 en tout), aux changements de module ; les numéros sont cités dans chaque fiche.

| N° | Date | Id | Transcription lue en entier | Images regardées | Chiffres d'auteur relevés |
|---|---|---|---|---|---|
| 1 | 29/09 | 7690784360898874645 | oui (20 segments, 89,3 s) | 010, 022, 036, 055, 070, 080 | 25 000 $, 12 modules, 3 h du matin |
| 2 | 21/10 | 7698948033576275220 | oui (31, 84,7 s) | 010, 018, 033, 044, 052, 066 | 32 bots, 4 équipes, « Manager + 7 » |
| 3 | 22/10 | 7699324388650323201 | oui (18, 89,6 s) | 008, 018, 038, 055, 072, 085 | 200 heures, 6 départements, 30 agents, 48 h |
| 4 | 23/10 | 7699692280952720692 | oui (40, 85,7 s) | 008, 025, 040, 055, 070, 080 | 41 agents, 8 départements, 1+8+32, 60 s |
| 5 | 26/10 | 7700803999376755989 | oui (22, 119,5 s) | 008, 020, 045, 062, 080, 100 | 5 000 → 45 000 $, ~125 pistes, ~40 $ la piste |
| 6 | 27/10 | 7701176337448357172 | oui (38, 93,3 s) | 010, 028, 045, 062, 075, 088 | 124 pistes, 5 000 $, 6 conclus (maquette) |
| 7 | 28/10 | 7701546969398873352 | oui (18, 96,6 s) | 006, 022, 042, 066, 080, 090 | 33 agents, 8 départements, 10 retenues |
| 8 | 29/10 | 7701924045775801601 | oui (18, 101,8 s) | 008, 028, 050, 068, 085, 095 | 26 agents, 0 octet vers le nuage (maquette) |
| 9 | 30/10 | 7702288090131418374 | oui (28, 112,9 s) | 010, 030, 052, 072, 092, 105 | 10 000 $/mois, devis < 1 min |
| 10 | 31/10 | 7702667600089632007 | oui (43, 114,5 s) | 010, 038, 062, 085, 100, 110 | 25 000 $/an, 41 agents, 10 min/lundi |
| 11 | 02/11 | 7703401774446562581 | oui (27, 100,4 s) | 008, 026, 052, 072, 088, 095 | 25 000 $, +1 étoile = 5 à 9 % de revenu |

Tous les chiffres sont marqués « annoncé par l'auteur, non vérifié » (ou « lu sur une maquette, non vérifié ») dans le fichier.

## Points à savoir

- L'outil que Whisper entend « Jeff » ou « Jev » n'est identifié par aucune image : les fiches l'écrivent « l'outil entendu "Jeff" ».
- Seule la vidéo 9 nomme n8n à l'audio ([01:29]) ; la vidéo 8 le montre à l'image (068, 085) et nomme Hermes à l'audio ([01:21]).
- Limite de lecture : 66 images regardées sur environ 1 000 ; le texte très petit des schémas d'ensemble n'est pas lisible à 720 px et n'est pas rapporté.
- La colonne « Ce qui s'applique à Presti / à ce client » reste « à remplir par Claude Code » dans les 11 fiches, comme demandé.
- Le fichier d'une fiche est dans `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` ; aucun autre fichier du dépôt n'a été touché.
