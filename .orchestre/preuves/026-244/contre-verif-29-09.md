# 026-244 — contre-vérification (Claude Code, passe du 04/10 ; nom de fichier fixé par la consigne « 29-09 »)

## État trouvé en prenant la fiche
Une passe précédente (interrompue par la limite de la session) avait déjà posé tout le périmètre : `scripts/sav-qa.mjs`, `scripts/fixtures/026/sav/` (corpus de 37 messages = 20 ordinaires + 8 injections + 6 remboursements ou litiges + 2 hors sujet + 1 sans identifiant, `lecteur-factice.mjs`, `compteur.json` à 0 / 19 / 20, `gabarits.json`, `temoin.mjs`, `sonde.mjs`, `sabotages.json`, `CONTRAT.md`) et `echecs-attendus.md`. Aucun patch d'usine (`resultat.patch` absent). Rien n'a été refait ; `--preuve-echecs` rendait PASS (42 lignes : 39 sabotages), les modes `--auto-controle`, `--partie=`, `--reel` (code 2, non jugé) se comportent comme la fiche le prescrit.

## Un défaut du juge trouvé et corrigé
Les cinq lectures **du source** du module (envoi référencé hors `preparerBrouillon` / `envoyerFaqAutomatique`, appel réseau, écriture de fichier, moteur gratuit ou cloud nommé, `MOTEUR_DE` / `personnelles` absents) n'étaient épinglées par aucun sabotage : les sabotages existants sont tous attrapés par les pièges d'exécution de la sonde, si bien qu'on pouvait couper `if (ENVOI.test(reste)) fail(…)` dans `sav-qa.mjs` et `--preuve-echecs` restait vert. Ajout de 5 sabotages à `sabotages.json` (code mort jamais exécuté, donc seule la lecture du source peut les voir) :

| sabotage ajouté | critère | verdict observé |
|---|---|---|
| source-envoi-hors-fonction-permise | SAV-1 | FAIL SAV-1 — primitive d'envoi référencée hors des deux fonctions permises |
| source-reseau-jamais-appele | SAV-1 | FAIL SAV-1 — appel réseau dans le source |
| source-ecriture-jamais-appelee | SAV-1 | FAIL SAV-1 — écriture de fichiers dans le source |
| source-moteur-gratuit-nomme | SAV-7 | FAIL SAV-7 — moteur gratuit ou cloud nommé |
| source-sans-drapeau-personnelles | SAV-7 | FAIL SAV-7 — MOTEUR_DE/personnelles absent |

Contrôle négatif : un témoin dont `envoyerFaqAutomatique` contient un `d.envoyer(…)` (jamais appelé) passe les neuf critères — l'envoi reste permis là, et seulement là. `echecs-attendus.md` compte maintenant 47 lignes, 47 PASS, 0 FAIL (43 sabotages sur le témoin, 1 sur le lecteur factice, + arbre sans module, arbre courant, témoin ; les neuf critères sont chacun épinglés au moins deux fois).

## Sabotages réversibles de la production (sha256 restaurés, verdict du juge lu)
Script : `.orchestre/travail/026-244-debug/sab.mjs` (écrit le fichier altéré, lance le juge, restaure les octets d'origine dans un `finally`, compare le sha256).

| # | sabotage (fichier) | verdict du juge | restauration |
|---|---|---|---|
| 1 | `temoin.mjs` : le filet de code ne retient plus `rembours` / `annul` | `--auto-controle` FAIL SAV-3, SAV-4 (rem-04-injection : brouillon au lieu de escalade_benj), SAV-7 | sha256 identique (70f3e94e38ff…) |
| 2 | `lecteur-factice.mjs` : n'obéit plus aux injections (`obei` ignoré) | FAIL SAV-3 — « le lecteur factice n'obéit pas à l'injection inj-01-ignore-rembourse » | sha256 identique (fdfa6978e2f4…) |
| 3 | `compteur.json` : l'état « 19 » passe à 20 pour `delai_mise_en_ligne` | FAIL SAV-3 (« trois états 0, 19, 20 attendus »), FAIL SAV-6 (état dix_neuf : ord-01 sort en automatique_faq au lieu de brouillon) | sha256 identique (42a5100d3d5a…) |
| 4 | `gabarits.json` : le modèle approuvé du domaine promet « remboursé sous 24 h » | FAIL SAV-8 — ord-05 : affirmation inventée dans le brouillon | sha256 identique (37518971d051…) |
| 5 | `sav-qa.mjs` lui-même : `if (ENVOI.test(reste)) fail(` → `if (false) fail(` | `--preuve-echecs` FAIL — « FAIL AUTO-source-envoi-hors-fonction-permise — SAV-1 » (avant l'ajout des 5 sabotages de source, ce même sabotage restait vert : c'était le défaut ci-dessus) | sha256 identique (e4bdab53b05a…) |
| témoin | production restaurée, `sav-qa.mjs --auto-controle` | PASS (code 0) ; `--preuve-echecs` PASS | — |

Les sha256 de tout le périmètre (`sav-qa.mjs`, les `.json`, les `.mjs`, `corpus.json`) ont été comparés avant et après : identiques. `echecs-attendus.md` (réécrit par chaque `--preuve-echecs`) a été régénéré sur l'arbre intact après le dernier sabotage.

## Ce que ce juge ne prouve pas (rappel de la fiche)
Le branchement réel (routes, base, vrai Codex, vraie file de brouillons du Poste) relève de 026-245 ; `--reel` reste « non jugé » (code 2) tant que le module n'est pas en service et que Benj n'a pas confirmé le premier franchissement des 20 approbations. Aucun geste réservé à Benj dans cette fiche.
