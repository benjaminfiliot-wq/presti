# 026-221 — contre-vérification : 4 sabotages réversibles de la production

Date : 2026-10-04 (le nom du fichier suit la consigne du lot). Production sabotée : `scripts/usine/openclaw/lanceur.mjs`. Chaque sabotage est appliqué à la copie vivante, l'outil de contrôle est lancé, son CODE DE SORTIE et la ligne FAIL qui nomme le critère sont lus, puis le fichier est restauré depuis la sauvegarde et son sha256 comparé à celui d'avant.

- sha256 avant tout sabotage : `ea914c262f1e5ce7c53cbd0a6c579a039b2a49fe2163b00025581833d506c979`
- sha256 après le dernier rétablissement : `ea914c262f1e5ce7c53cbd0a6c579a039b2a49fe2163b00025581833d506c979` — IDENTIQUE

| # | sabotage | outil | code | critère rouge | sha256 du fichier saboté | restauré |
|---|---|---|---|---|---|---|
| S1 | mode privilégié et capacités ajoutées acceptés | `juges-026-completude-qa.mjs --partie=openclaw` | 1 | FAIL OC-4 mode privilégié refusé (capacités, réseau hôte) — privilegie: true : accepté (refus attendu avant lancement) | `27b0c321b8a8fb9a…` | oui (sha256 identique) |
| S2 | donnée de classe inconnue ou absente envoyée au cloud (seul « prospect » reste fermé) | `juges-026-completude-qa.mjs --partie=openclaw` | 1 | FAIL OC-11 données de prospect ou non classées : Ollama local seulement — donnée non classée (absente), sans Ollama local : {"fournisseur":"ollama","modele":"gpt-oss:120b-cloud","voie":"ollama-cloud"} (refus attendu : ni cloud ni freellmapi) | `caa7b38e04862efc…` | oui (sha256 identique) |
| S3 | identifiants d'URL acceptés sur une origine déclarée (durcissement trouvé par l'essai local) | `usine/openclaw/essai-local.mjs` | 1 | FAIL 5 · sortie refusée — http://***@127.0.0.1:11434/ | `00a5b9e99cead1f3…` | oui (sha256 identique) |
| S4 | le contrôle de l'installation ne vérifie plus no-new-privileges | `usine/openclaw/controler-qa.mjs` | 1 | FAIL mutation « no-new-privileges retiré » prise — accepté (écart attendu) | `b4ad279a3d349137…` | oui (sha256 identique) |

Témoin après restauration : juge 0, essai local 0, banc de contrôle 0 (0 attendu partout).

Lecture honnête :
- S1 et S2 sont pris par le juge de 026-220 (OC-4, OC-11) : le témoin vert et les fautes rouges viennent de l'outil indépendant, pas de notre sortie.
- S3 n'est PAS pris par le juge (il ne teste pas les identifiants d'URL sur une origine admise) : il l'est par l'essai local, qui l'a d'ailleurs révélé avant correction. Le durcissement est donc couvert par un outil de la fiche, pas par le juge.
- S4 est pris par le banc de contrôle de l'installation, que le juge ne voit pas (il juge des fonctions pures, pas `docker inspect`).
- Verdict de la contre-vérification : PASS.

## Second passage (claude-code, 2026-10-04 18:20 environ) : cinq sabotages rejoués de zéro

Même production (`scripts/usine/openclaw/lanceur.mjs`), sauvegarde hors dépôt, sha256 comparé avant et après. Témoin avant et après : juge 0, essai local 0, banc de contrôle 0.

- sha256 avant : `ea914c262f1e5ce7c53cbd0a6c579a039b2a49fe2163b00025581833d506c979`
- sha256 après le dernier rétablissement : `ea914c262f1e5ce7c53cbd0a6c579a039b2a49fe2163b00025581833d506c979` — IDENTIQUE

| # | sabotage | outil | code | critère rouge (premier FAIL) | restauré |
|---|---|---|---|---|---|
| T1 | refus du mode privilégié et des capacités retiré | juge `--partie=openclaw` | 1 | FAIL OC-4 (et OC-12) | oui |
| T2 | seule la classe « prospect » exacte reste fermée : une donnée non classée part au cloud | juge `--partie=openclaw` | 1 | FAIL OC-11 | oui |
| T3 | identifiants d'URL acceptés sur une origine déclarée | `essai-local.mjs` | 1 | FAIL 5 · sortie refusée — http://***@127.0.0.1:11434/ | oui |
| T4 | filtre des noms de variables Claude neutralisé | juge `--partie=openclaw` | 1 | FAIL OC-8 (et OC-12) | oui |
| T5 | empreinte sha256 de l'image non exigée | juge `--partie=openclaw` | 1 | FAIL OC-2 (et OC-12) | oui |

Aucun sabotage n'a lancé docker, ouvert une connexion ni appelé un modèle (le juge et l'essai travaillent sur des doublures). T2 et T3 reprennent S2 et S3 du premier passage ; T1, T4, T5 sont pris par le juge de 026-220, pas par un contrôle écrit pour l'occasion. Verdict du second passage : PASS.
