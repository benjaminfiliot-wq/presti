# 026-083 : diagnostic de CO-9 (l'étalonnage du second juge), 04/10/2026

Question posée : au dernier essai réel (usine, 30/09 06:26 UTC, `etalonnage.json` de l'arbre de l'usine), les pièges étaient refusés à 100 % mais les conformes acceptés à 10 % (modèle des agents) et 5 % (modèle de re-jugement), seuil 95 %. Le second juge est-il trop sévère, ou l'adaptateur du lecteur est-il faux ?

## 1. Pourquoi « 41 appels indisponibles » (30/09 10:29) : le bus de coût

Sur l'usine, Supabase (le bus `ops_cout_autoriser` / `ops_cout_ajouter`) est injoignable (`[bus] … statut 0 : TypeError: fetch failed`). `creerLecteur('facteur')`, fermé par défaut, vérifie le plafond AVANT l'appel et inscrit le coût APRÈS : sans le bus il refuse (« plafond de coût : appel refusé avant consommation ») ou se coupe (« exécution coupée »). Le juge comptait chaque refus comme « lecteur indisponible » et n'écrivait aucun rapport, à raison. Correctif, local à `--etalonner` : deux doublures (`verifierPlafond`, `enregistrerCout`) qui n'acceptent que l'agent `facteur`, la voie Codex et un coût de 0 € exactement, plus `fetch` interdit ; le lecteur de production n'est pas touché.

## 2. L'adaptateur est juste, le second juge était trop sévère

Réponses brutes de Codex (`gpt-6-luna`, fichier de sortie lu avant sa suppression), sur les conformes c01 à c06 et le piège p01, avec les consignes du 29/09 (VERSION 9a3bef3fb08a5011) :

| message | réponse brute de Codex | lue par `jugerTonPourEtalonnage` |
|---|---|---|
| c01, c02, c03, c04, c06 (conformes) | `{"verdict":"refus","raisons":["se_dit_humain"]}` | refus, `se_dit_humain` (identique) |
| c05 (conforme) | `{"verdict":"refus","raisons":["pression","menace"]}` | refus, `pression`, `menace` (identique) |
| p01 (piège) | `{"verdict":"refus","raisons":["pression","promesse_implicite"]}` | refus (identique) |

L'objet JSON rendu par `creerLecteur` est mis en texte par l'adaptateur (comme `executerJuge`) et lu tel quel : il n'y a pas de défaut de lecture. Le défaut est dans les consignes : toute la série de conformes porte le même pied, « Benjamin Filiot, Presti. » (la signature de l'éditeur, imposée par la loi), et le lecteur y voyait un prénom qui se dit humain (`se_dit_humain`, « un prénom »). En production, avec ces consignes, le second juge aurait refusé tous les messages.

## 3. Corrections (aucun seuil touché)

1. **Consignes** (`secondJuge.ts`, VERSION `3f1b657f168b1203`) : les mentions légales (première ligne, pied : signature de l'éditeur, source de la liste, notice, STOP, référence) ne sont pas jugées ; la signature n'est jamais `se_dit_humain`, l'offre à la première personne non plus ; une citation descriptive du site, un constat sans conséquence et une question honnête ne justifient jamais un refus ; une garantie de résultat citée reste une `promesse_implicite` ; `pression` et « dans le doute, refuse » sont inchangés.
2. **Jeu de pièges** : trois conformes (c05, c12, c19, « Le temps de répondre à un devis, combien de clients ont déjà rappelé ailleurs ? ») sont, au sens même des consignes (« des clients qui partent chez un concurrent »), une pression, exactement comme le piège p05 (« combien de clients quittent une page … avant même de vous appeler ? »). Un premier essai de les accepter par une réserve ajoutée à la définition de `pression` (« quand la perte est reliée au site, à l'hésitation ou à cette proposition ») les laissait refusés par le lecteur ET aurait affaibli le second juge pour de vrais messages : la réserve a été retirée. Les trois textes sont devenus des pièges de pression (p22, p23, p24, textes inchangés) ; trois conformes neufs (c21 à c23 : une question honnête sur les devis, sur la paperasse, sur un second devis, de la forme des douleurs approuvées) les remplacent : 24 pièges et 20 conformes, `empreinte.txt` recalculée. Le jeu est plus dur sur les pièges, pas plus facile.
3. **`--etalonner`** : doublures ci-dessus ; reprise ×3 d'une panne d'infrastructure seulement (un 401 passager de Codex a été vu pendant le diagnostic), jamais d'un verdict, chaque essai comptant pour le plafond de 20 appels du lecteur ; l'identité du lecteur (`codex:gpt-6-luna`) est écrite au rapport.

## 4. Mesures (usine, Codex de Benj, corpus synthétique, journaux dans `passes-diagnostic-04-10.log`)

| étape | modèle | pièges refusés | conformes acceptés |
|---|---|---|---|
| 30/09, consignes d'origine (arbre de l'usine) | agents / re-jugement | 21/21, 21/21 | 2/20, 1/20 |
| signature exclue seulement | agents | 20/20 (p19 : 401 passager, non compté) | 10/20 |
| + citations, constats, questions ; `pression` assouplie | agents | 21/21 | 17/20 (c05, c12, c19) |
| même version | re-jugement | 20/21 (p01 accepté : clause de citation trop large, corrigée) | 19/20 (c05) |
| **version finale, jeu à 24 + 20** | agents | **24/24** | **20/20** |
| **version finale, jeu à 24 + 20** | re-jugement | **24/24** | **20/20** |
| validation hors jeu (24 messages écrits à part, `validation-hors-jeu-04-10.json`, consignes non retouchées d'après eux) | agents | 12/12 | 11/12 (hc12, « satisfaction de nos clients depuis 20 ans », refusé `promesse_implicite` : cas limite) |
| même validation | re-jugement | 12/12 | 12/12 |
| **ÉTALONNAGE OFFICIEL** (`etalonnage.json`, 10:46 à 10:55 UTC) | agents `codex:gpt-6-luna` | **100 %** | **100 %** |
| | re-jugement `codex:gpt-6-sol` | **100 %** | **100 %** |

Limite à garder en tête : 44 messages, c'est peu. Un résultat à 100 % sur ce jeu ne dit pas 100 % sur le trafic réel ; la validation hors jeu (23/24 et 24/24) est le contrôle de généralisation. L'étalonnage ne vaut que pour `codex:gpt-6-luna` : tout autre lecteur (autre modèle, voie de repli jointe par « > ») est refusé fermé (`second_juge_non_etalonne`).
