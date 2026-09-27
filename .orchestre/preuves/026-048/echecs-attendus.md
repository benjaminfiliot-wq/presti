# Échecs attendus du juge du socle de l'usine (026-048)

Écrit par `node scripts/usine-socle-qa.mjs --preuve-echecs` le 2026-09-26T10:09:06Z. Chaque groupe est lancé par le juge lui-même sur l'arbre de référence `5012625` (extrait par `git archive`, ancêtre de HEAD, où aucun fichier jugé n'existe), avec `--racine`. L'extrait est la première ligne `FAIL` de la sortie, recopiée telle quelle (seul `|` est échappé).

## Autotest des jeux d'essai

| Critère | Verdict | Ce qui est vérifié |
|---|---|---|
| AT-1 | PASS | bash trouvé : C:\Program Files\Git\usr\bin\bash.exe (5.3.9(1)-release) ; flock de substitution posé (Git Bash) |
| AT-2 | PASS | le faux ssh consigne son argv et son entrée standard en fichiers séparés (octet pour octet) et rend ses trois modes (enregistrer, sortie=, injoignable) ; le ssh du PATH est une doublure |
| AT-3 | PASS | le faux bus refuse une décision à champ inconnu (400 + nom du champ), accepte la bonne (201 creee: true), rejouée → 200 creee: false ; 401 sans Bearer, 503 à la demande ; journal sans le jeton |
| AT-4 | PASS | instantanés de /proc : processeur 37.5 %, mémoire 25 %, réseau 1.2 % (et 2.4 % à 1000000000 b/s), par le calcul de référence du juge |
| AT-5 | PASS | jeux de mesures déterministes, p95 recalculés égaux à ceux écrits à côté : ok 41/18.5/2.4 ok ; approche 29.6/24.3/22.5 approche ; danger 21.4/19.8/3.1 danger ; incomplet 35.2/20.1/1.8 incomplet |
| AT-6 | PASS | 52 cas nom × valeur cohérents avec les règles de référence du juge (14 acceptés, 38 refusés), 16 noms hors liste ; quatre coffres d'essai non vides ; aucune forme de clé en clair dans les jeux d'essai ni dans le juge |
| AT-7 | PASS | l'enfant espion écrit les noms et les empreintes SHA-256 (jamais une valeur) et sort avec le code demandé |
| AT-8 | PASS | noms des unités de 6 groupes, chacun couvert par ses seuls motifs |
| AT-9 | PASS | réponses enregistrées du faux freellmapi et résumés attendus cohérents (recalculés par le juge : utilisé, plafond, état, heure de Paris), sans @ ni long numéro |

## Groupes sur l'arbre de référence

| Groupe | Fiche jugée | Critère attendu en premier | Code | Premier échec réel |
|---|---|---|---|---|
| coffre | 026-050 | CF-1 | 1 | FAIL CF-1 — scripts/usine/presti-coffre.sh absent : le fichier de la fiche 026-050 n'existe pas (encore) |
| socle | 026-050 | SO-1 | 1 | FAIL SO-1 — scripts/usine-agents.mjs absent : le fichier de la fiche 026-050 n'existe pas (encore) |
| surveillance | 026-053 | SV-1 | 1 | FAIL SV-1 — scripts/usine/surveillance.mjs absent : le fichier de la fiche 026-053 n'existe pas (encore) |

