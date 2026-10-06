# Le modèle maison — mesures des étapes 0 et 1 (06/10/2026)

Suite de `docs/agents/modele-maison.md`. Rien n'a été entraîné ni branché. Deux questions, des chiffres : combien d'exemples propres avons-nous, et un petit modèle NON affiné, avec un prompt court, écrit-il un plan du Chef en moins de 300 s sur l'usine ?

Outils livrés (reproductibles) :
- `scripts/modele/corpus-chef.mjs` : étape 0, le corpus et son rapport ; juge `scripts/modele-corpus-qa.mjs` (22 critères, dont 5 sabotages attrapés) ;
- `scripts/modele/prompt-chef.mjs` : le prompt court (≈ 1 300 signes) et le schéma JSON du plan, partagés par le corpus et la mesure ;
- `scripts/modele/base-chef.mjs` : étape 1, la mesure sur l'Ollama de l'usine (ssh + curl, rien d'installé là-bas) ;
- données de travail (hors dépôt, ignorées par git) : `.orchestre/travail/modele-maison/` (copie des cycles de l'usine, corpus, `mesures-base.jsonl`).

## Étape 0 — le corpus

Source : les 47 dossiers de cycle de `/home/agents/travail/chef` (du 05/10 08:00 au 06/10 12:05 UTC, soit environ 28 h) et leurs 34 rapports d'application. Un plan n'entre que s'il se lit, passe `validerPlan` **à l'instant où il a été appliqué** (l'échéance d'une décision se juge à ce moment-là), a été appliqué sans écart (rapport de code 0, toutes les clés envoyées), ne contient aucune tâche que les règles d'aujourd'hui écarteraient (`filtrerTaches`), aucune donnée sensible (e-mail, téléphone, SIREN/SIRET avec Luhn, secret, motif de `motifProspects`) et n'est pas un doublon exact.

| Étape (premier motif de refus, dans cet ordre) | Paires |
|---|---|
| Dossiers de cycle trouvés | 47 |
| Aucun plan écrit (quota, délai : 9 au début du 05/10, 4 aujourd'hui) | 13 |
| Plan invalide aujourd'hui (les 9 : « objet » manque, plans d'avant la règle de l'objet obligatoire) | 9 |
| Appliqué avec écart (code 3, quota du bus 429 en cours d'envoi) | 2 |
| Une tâche écartée par les règles d'aujourd'hui (maintenance du preneur, des disjoncteurs, de l'orchestre ; eBay) | 21 |
| **Gardées (règle stricte)** | **2** (deux plans pleins, 0 léger) |
| Gardées si l'on tolère les tâches écartées (`--tolere-ecartees`) | **17** (7 légers, 10 pleins) |

- Donnée sensible : 10 occurrences dans 6 paires, toutes **lexicales** (le mot « prospect » dans l'état de 5 cycles et le plan de 4, la formule « numéros de téléphone des artisans » dans un plan). Aucune vraie adresse e-mail, aucun vrai numéro, aucun SIREN, aucun secret n'a été trouvé. La garde est prudente exprès (un faux positif coûte une paire) : « prospect » est pourtant le vocabulaire normal du Chef.
- Longueurs (estimées à 2,8 signes par jeton, mesuré à 2,76 sur une entrée réelle) : consigne courte ≈ 560 jetons, état du cycle ≈ 4 300 (3 400 à 4 600), plan ≈ 900 jetons (léger : 816 en médiane ; plein jusqu'à 3 200). Le prompt réel du Chef (`chef.md` + schéma + instruction + état) approche 10 000 jetons : au-delà d'un contexte de 8 192.
- Diversité : 83 clés de tâche distinctes sur 88 dans le corpus tolérant ; aucun état gardé à 90 % ou plus d'un autre (similarité de la plus proche voisine : 0,73 en médiane). Pas de doublons, mais la matière est étroite : une nuit de maintenance d'agents et d'eBay.
- Cadence : 17 paires tolérantes en 28 h, soit ≈ 0,6 par heure. Pour 150 paires : ≈ 10 jours au rythme actuel ; en règle stricte (2 en 28 h) : plus de 60 jours, sauf si le Chef cesse d'écrire ce que le filtre écarte.

## Étape 1 — la base de comparaison (qwen3:4b-instruct-2507, non affiné)

Conditions : prompt court + état du cycle (≈ 4 190 jetons au total, dont 12 % de consignes), `format` = schéma JSON du plan (Ollama 0.34.4 l'accepte), `think:false`, température 0,2, contexte 8 192, 1 500 jetons de sortie au plus. L'usine est un serveur ARM de 4 cœurs sans GPU. Mesures hors des plages des cycles du Chef (H:05 à H:20 UTC).

| # | Entrée | Réglage | Résultat | Durée | Jetons/s en génération | Plan valide ? | Tâches (utiles) |
|---|---|---|---|---|---|---|---|
| 1 | cycle léger du 05/10 15:41 (4 189 jetons) | schéma, délai 330 s, charge avant 0,21 (usine au repos) | **aucune réponse** : curl a coupé à 330 s | > 330 s | — | non (hors délai) | 0 |
| 2 | même entrée | schéma, 48 jetons de sortie seulement (sonde de vitesse) | 48 jetons écrits, plan tronqué | 244 s au mur dont ≈ 230 s d'attente (voir ci-dessous) ; génération 14,1 s | **3,4** | non (tronqué, voulu) | — |
| 3 | cycle léger du 06/10 03:05 | schéma, délai 420 s, charge avant 1,94 | **aucune réponse** : curl a coupé à 420 s | > 420 s | — | non (hors délai) | 0 |

Ce que ces lignes disent, et ne disent pas :
- **Aucun plan complet n'a été obtenu en 330 s ni en 420 s**, sur 2 entrées différentes. Le taux de plans valides de la base est donc inconnu (0 plan complet, pas 0 % de validité). Les 3 autres entrées, le 8 B et le format `json` simple n'ont **pas** été mesurés : le budget de 20 minutes de calcul est parti dans ces trois appels (≈ 18 min).
- La seule vitesse mesurée est celle de la génération : **3,4 jetons/s** (48 jetons, sortie contrainte par schéma). Un plan léger fait ≈ 800 à 900 jetons : **≈ 250 s de génération pure**, avant même de lire l'état. La vitesse de lecture du prompt à froid n'a pas été isolée (la ligne 2 relisait un préfixe en cache : 0,3 s pour 4 189 jetons, non représentatif). Le temps manquant aux lignes 1 et 3 impose seulement que lecture + écriture dépassent 330 à 420 s.
- Pollution constatée : une requête Ollama non diffusée **continue de calculer après que le client a coupé** (ligne 1 : charge de 4,08 à l'appel suivant, ≈ 230 s d'attente, lecture déjà en cache). Si le relais du Chef (8 B 300 s, puis 4 B) se comporte de même, le moteur suivant partage les 4 cœurs avec le précédent encore actif : à vérifier, c'est peut-être une cause du délai de 858 s. Les lignes 2 et 3 ont été prises avec une charge résiduelle.
- Pour mémoire, en production (journal du relais du preneur, tâches libres au prompt court) le 4 B répond bien : 86 réussites, médiane 52 s, maximum 171 s, 1 délai à 300 s. Un plan du Chef n'a pas ce profil : 4 200 jetons à lire, 900 à écrire.

## Verdict honnête

1. **Un modèle de 1,5 B affiné peut-il tenir dans 300 s ?** Probablement oui sur la vitesse, mais ce n'est pas démontré ici. Estimation, non mesurée : la génération d'un modèle de 1,5 B sur ce processeur irait 2,5 à 3 fois plus vite que celle du 4 B (≈ 9 jetons/s, soit ≈ 100 s pour 900 jetons), la lecture de 4 200 jetons suivrait. Mais le gain d'un affinage est **moindre qu'annoncé** : l'état du cycle (≈ 3 700 jetons) est l'entrée, il ne disparaît pas dans les poids ; seules les consignes (≈ 560 jetons avec le prompt court, ≈ 5 900 avec `chef.md` et le schéma) s'y logent. Le levier le plus sûr n'est pas l'affinage : c'est de **réduire l'état lu** (la liste des agents est pleine de `null`) et **la longueur du plan léger** (brief, compte rendu, `pourquoi` de 300 signes), ce qui accélère n'importe quel modèle.
2. **Combien d'exemples propres ?** 2 en règle stricte, 17 en tolérant les plans dont une tâche est aujourd'hui écartée, contre 150 minimum fixés par le plan (200 à 500 dans la vidéo). Et 0 léger en règle stricte : tout ce que le Chef léger a écrit depuis hier portait de la maintenance de preneur ou du web. Entraîner maintenant, c'est enseigner au modèle ce que le filtre jette.
3. **La base non affinée avec un prompt court suffit-elle ?** Non, pas en l'état : le 4 B avec schéma n'a pas fini un plan léger en 330 ni 420 s. Elle n'est pas pour autant exclue en dessous de 4 B : le 1,5 B non affiné avec le même prompt court n'a pas été mesuré (il faut le télécharger, voir plus bas), et il est probable qu'il rende des plans valides de mauvaise qualité (tâches génériques), ce que seul `jugerSortie` + une relecture diront.

## Suite proposée (étape 2 : rien à faire tant que ceci n'est pas fait)

1. **Mesurer le 1,5 B non affiné** avec le même script : `node scripts/modele/base-chef.mjs --modele=qwen2.5:1.5b --rangs=0,2,3,5,6 --timeout=300`, hors plage de cycle, 20 min de calcul au plus. Il faut d'abord `ollama pull qwen2.5:1.5b` (≈ 1 Go) sur l'usine : un téléchargement, donc **un accord de Benj**. Même chose pour le 0,5 B si le 1,5 B ne tient pas.
2. **Raccourcir l'entrée et la sortie du Chef léger** (état réduit aux champs utiles, plan léger resserré) : tâche de code à déposer dans l'orchestre ; elle sert quel que soit le modèle.
3. **Faire grossir le corpus** : copier chaque soir les dossiers de cycle de l'usine vers un coffre local et relancer `corpus-chef.mjs` ; seuil 150 paires tolérantes (≈ 10 jours au rythme actuel). Option à décider : « réparer » les plans dont une tâche est écartée (retirer la tâche) pour gagner des paires, au prix de plans plus courts.
4. **Vérifier le relais** : faire durer un appel local après coupure du client (cause possible de contention entre le 8 B et le 4 B). Un appel `stream:true` s'annule proprement.
5. **GPU gratuit (Kaggle ou Colab)** pour le QLoRA du 1,5 B : **demande un compte de Benj** (je n'en crée pas et n'y entre aucun mot de passe). Décision de confidentialité à lui : le corpus ne contient ni e-mail, ni téléphone, ni SIREN, mais il porte l'état interne des agents ; l'envoyer à un fournisseur gratuit est un choix de Benj, pas le mien.
6. Ensuite seulement : épreuve à l'aveugle (20 contextes jamais vus) puis branchement `ollama_maison`, comme au plan.

## Reproduire

```
node scripts/modele/corpus-chef.mjs                       # corpus strict + rapport
node scripts/modele/corpus-chef.mjs --tolere-ecartees --sortie=.orchestre/travail/modele-maison/corpus-chef-large.jsonl --rapport=.orchestre/travail/modele-maison/corpus-chef-large.rapport.json
node scripts/modele-corpus-qa.mjs                         # le juge
node scripts/modele/base-chef.mjs --sonde                 # l'usine accepte-t-elle le schéma ? (aucune mesure)
node scripts/modele/base-chef.mjs --rangs=0 --timeout=420 # une mesure ; jamais pendant un cycle (H:05 à H:20 UTC)
```
Pour copier les cycles : `ssh -i ~/.ssh/presti-usine-gardien gardien@88.96.53.3 "sudo -n -u agents tar -C /home/agents/travail/chef -cf - --exclude=bilan --exclude=consignes.json --exclude=consignes-lues.json ." | tar -C .orchestre/travail/modele-maison/chef -xf -`
