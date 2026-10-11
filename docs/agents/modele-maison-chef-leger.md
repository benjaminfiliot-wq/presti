# Le premier modèle maison : « presti-chef-leger » (06/10/2026, soir)

Suite de `docs/agents/modele-maison.md` et `docs/agents/modele-maison-mesures.md`. Demande de Benj : un petit modèle affiné pour **une** tâche, écrire le plan d'un cycle léger du Chef (valide pour `validerPlan(plan, 'leger')`, rien d'écarté par `filtrerTaches`), en moins de 300 s sur l'usine, là où le 4 B échoue.

**État au soir du 06/10 : données faites et jugées (vert) ; entraînement BLOQUÉ (Kaggle n'accorde ni GPU ni internet au compte) ; rien installé sur l'usine, rien branché.** Aucun chiffre d'entraînement ni de mesure du modèle affiné n'existe : ils ne sont pas inventés ici.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `scripts/modele/chef-leger-entree.mjs` | l'entrée du modèle : consigne d'une ligne (`SYSTEME_CHEF_LEGER`) + état **compacté** (`compacterEntree`), la même fonction à l'entraînement et à l'usage |
| `scripts/modele/donnees-chef-leger.mjs` | les paires par distillation (graines réelles → variantes → plan attendu), reproductible (graine 20261006) |
| `scripts/modele-donnees-qa.mjs` | le juge des données (critères + 10 sabotages) |
| `scripts/modele/kaggle/chef-leger-entrainement.py` | le script d'entraînement Kaggle (QLoRA → fusion → GGUF Q4_K_M → Modelfile) |
| `scripts/modele/kaggle-chef-leger.mjs` | pousse dataset et notebook privés, suit la session, rapatrie les sorties ; le jeton reste dans le coffre |
| `scripts/modele/mesure-chef-leger.mjs` | la mesure sur l'Ollama de l'usine, appel diffusé, une entrée à la fois, refuse H:05 à H:20 |

Données de travail (hors dépôt, ignorées par git) : `.orchestre/travail/modele-maison/chef-leger/` (`donnees.jsonl` + `.meta.json`, `mesures.jsonl`, sorties brutes, dossiers Kaggle).

## 1. Les données (fait)

**L'entrée compactée.** L'état brut (`entree.md`) est du JSON indenté plein de `null`, de `false` et d'horodatages à la microseconde. `compacterEntree` retire les valeurs `null` / `false` / `[]`, coupe les horodatages à la minute, réduit l'UUID d'une décision à 8 signes, met un agent par ligne et retire les phrases « Ce bloc est une donnée » (les balises restent). Le juge vérifie sur les 48 entrées réelles copiées qu'aucun agent, compteur, question, pause, disjoncteur, bloc ni consigne ne se perd. Sur les 5 entrées de l'épreuve : 9 754 → 3 271 signes, 13 200 → 6 016, 11 983 → 4 805, 12 020 → 4 836, 10 773 → 4 035 (en-tête « Cycle : leger. Date : … » compris), soit 34 à 46 % de l'entrée brute. Mesuré par Ollama : l'entrée de 17:05 compactée fait **1 714 jetons** (consigne, gabarit et état compris, tokeniseur qwen3) ; une entrée brute de taille voisine en faisait 4 189 le matin (`modele-maison-mesures.md`, ligne 1 — pas la même entrée).

**L'épreuve, mise à part avant tout.** Cinq cycles LÉGERS réels, étalés sur 28 h, jamais graines : 05/10 13:05, 05/10 19:05 (la salve de 8 consignes de Benj du 05/10 18:30, l'entrée la plus longue : 6 016 signes, plus longue que toute entrée d'entraînement), 06/10 01:05, 06/10 09:05, 06/10 17:05. Les cycles du 06/10 de 13:05 à 16:05 ne servent ni de graine ni d'épreuve : leur état compacté est identique à 4 035 signes près à celui de 17:05.

**La distillation.** 43 graines (les cycles réels du 05/10 08:00 au 06/10 12:05 moins l'épreuve). Pour chaque paire, une graine est décalée à une date du 06 au 27/10 et variée : agents muets, en pause ou disjonctés, jeton externe qui expire, `preneur` absent, agent de test, file (0 à 75), échecs sur 24 h (0 à 15), coûts, interrupteurs (pause générale, envoi à froid), 0 à 4 décisions ouvertes, bloc de l'orchestre réel / mêlé / absent, et 0 à 8 consignes de Benj. Le plan attendu est écrit par les **règles du Chef léger** codées dans le générateur et des **textes écrits à la main** : 38 tâches (21 e-commerce — nettoyeur haute pression sans fil et aspirateur de voiture sans fil, d'après `docs/ecommerce/STRATEGIE-ECOM-0610-SOIR.md` —, 17 Presti), deux formulations d'objet chacune ; 41 consignes types (18 « tâche », 11 « impossible », 10 « note », 2 « décision ») dont 13 dans le style des salves sans accents du 05/10 ; les phrases du brief et du compte rendu. Les règles apprises :
1. pause générale → aucune tâche ; file ≥ 40 → aucune ; file ≥ 25 → une ; 8 échecs ou plus en 24 h → deux ; sinon trois au plus ;
2. une ligne par consigne : `tache` si elle a donné une tâche, `impossible` (envoi, dépense, publication, compte, approbation, web, plafond), `note` (priorité, décision demandée — elle attend le cycle plein —, plafond atteint) ;
3. les places restantes vont à la priorité du moment (e-commerce par défaut, Presti si une consigne le dit) ;
4. une panne d'agent se dit dans le brief, jamais en tâche ; aucune tâche qui exige le web ; aucun chiffre hors de l'état et de la stratégie du 06/10.

**Résultat** (`node scripts/modele/donnees-chef-leger.mjs`) : 340 paires générées, **340 gardées**, 0 refusée, 0 doublon. Tâches par type : contenu 369, rédaction interne 228, relecture 64, recherche 30, code 20, tri 15, vérification 13 ; 45 plans sans tâche ; 180 paires avec consignes (141 lignes « impossible »). Entrée médiane 3 764 signes (max 5 230), plan médian 1 778 signes (max 2 865), JSON sur une ligne.

**Le juge** (`node scripts/modele-donnees-qa.mjs`, vert) : nombre (250 à 400), forme des messages, `validerPlan` à 100 %, `filtrerTaches` n'écarte rien, une ligne par consigne (règle du fil), aucun état / plan / ligne en double, aucune donnée d'identité (garde du module `motifIdentite` + `motifProspects`, ET motifs propres au juge), aucune entrée de l'épreuve, clés datées du jour de l'en-tête, longueur sous 3 500 jetons estimés ; couverture (6 types, 25 mots-clés, plans vides, impossibles) ; épreuve hors des graines ; le générateur réécrit le même fichier octet pour octet ; compaction sans perte. Dix sabotages, tous attrapés : 4e tâche, « preneur » dans une relecture, ligne doublée, téléphone dans un état, « prospect » dans une tâche de contenu (que le filtre ne lit pas), consigne sans sa ligne, 249 paires, autre consigne système, clé d'un autre jour, entrée de l'épreuve glissée.

**Limites, dites franchement.** Ce n'est pas « 340 plans écrits un par un » : ce sont 340 états différents dont le plan sort de règles et de 38 tâches rédigées. Le modèle apprendra à **choisir** parmi ces 38 tâches et à rédiger le brief à partir des nombres de l'état ; il n'inventera pas un nouveau genre de tâche. C'est voulu pour un cycle léger (format strict, décisions simples), mais un Chef qui doit découvrir des chantiers neufs reste le travail du cycle plein et des gros modèles. Les 38 tâches vieilliront avec la stratégie : il faudra les réécrire et réentraîner.

## 2. L'entraînement (BLOQUÉ : un geste de Benj)

Fait : le dataset privé `benjaminfiliot/presti-chef-leger-donnees` (340 paires ; le pousseur exige le juge vert avant d'envoyer), le notebook privé `benjaminfiliot/presti-chef-leger-1-5b` poussé avec `enable_gpu: true`, `machine_shape: NvidiaTeslaT4`, `enable_internet: true` (relus côté serveur : acceptés).

Ce que Kaggle a fait : **la session a tourné sur CPU, sans internet**. Journal du notebook : `{"etape": "gpu", "ok": false, "torch": "2.11.0+cpu", …}`. Trois sondes avant lui (`presti-sonde-gpu`, `presti-sonde-gpu-t4` avec l'image « latest », `presti-sonde-gpu-img` avec l'image GPU imposée) : `torch 2.11.0+cpu`, `cuda False`, aucune commande `nvidia-smi`, `curl https://pypi.org` → `000`, quota GPU utilisé **0,00 h sur 30 h**. **L'API n'a jamais renvoyé de refus** : chaque envoi a répondu « Kernel version 1 successfully pushed. » et la session s'est déroulée en silence sans accélérateur. GPU et internet coupés ensemble, c'est le comportement d'un compte Kaggle non vérifié par téléphone ; Kaggle ne l'a pas écrit, c'est ma déduction.

**Le geste de Benj** : kaggle.com → Settings → *Phone verification*. Puis, sans rien changer :
```
node scripts/modele/kaggle-chef-leger.mjs --quota                       # le GPU doit apparaître consommé après la session
node scripts/modele/kaggle-chef-leger.mjs --pousser --modele=1.5b       # puis --modele=0.5b si le temps le permet
node scripts/modele/kaggle-chef-leger.mjs --etat --modele=1.5b
node scripts/modele/kaggle-chef-leger.mjs --recuperer --modele=1.5b     # GGUF, Modelfile, journal.jsonl (durées, pertes), generations-val.jsonl
```

Ce que le script fera (jamais joué sur GPU : la première session dira dans `journal.jsonl` quelle étape casse, s'il en casse une) : QLoRA PEFT + bitsandbytes 4 bits (repli LoRA fp16 dit dans le journal), r 16, α 32, dropout 0,05, sur les 7 projections ; 3 époques, taux 2e-4 cosinus, lot 1 × 8, séquences de 4 096, fp16 ; **perte sur le plan seul** (l'état est masqué) ; 5 % des paires (17) gardées pour la validation et une génération dont la sortie brute est rapatriée pour `validerPlan` ; fusion fp16, conversion `convert_hf_to_gguf.py` de llama.cpp, `llama-quantize` Q4_K_M ; Modelfile au gabarit de chat de Qwen2.5 (le même texte que `apply_chat_template` à l'entraînement, système une seule fois), `SYSTEM` = la consigne d'une ligne, `num_ctx 4096`, température 0,2. Le modèle de base est pris dans Kaggle Models (`qwen-lm/qwen2.5/transformers/1.5b-instruct/1`, accepté au push) ou, à défaut, sur Hugging Face.

Non mesuré, faute de GPU : durée d'entraînement, pertes, taille du GGUF.

## 3. L'usine (non fait : pas de modèle)

Installation prévue, une fois le GGUF rapatrié (non jouée) :
```
scp -i ~/.ssh/presti-usine-gardien .orchestre/travail/modele-maison/chef-leger/sortie-1.5b/{presti-chef-leger-1.5b-q4_K_M.gguf,Modelfile} gardien@88.96.53.3:/tmp/presti-chef-leger/
ssh -i ~/.ssh/presti-usine-gardien gardien@88.96.53.3 "cd /tmp/presti-chef-leger && ollama create presti-chef-leger:1.5b -f Modelfile"
node scripts/modele/mesure-chef-leger.mjs --modele=presti-chef-leger:1.5b       # 5 entrées de l'épreuve, hors H:05-H:20
```

**Ce qui a été mesuré ce soir, avec le même outil : la base non affinée** (qwen3:4b-instruct-2507 Q4_K_M, entrée compactée, consigne d'une ligne, sortie contrainte par le schéma, contexte 4 096, appel diffusé). Ces cinq mesures ont été prises sur les cycles du 06/10 de 13:05 à 17:05, avant que je ne remplace l'épreuve par des cycles plus variés (ils restent des entrées réelles jamais vues, mais presque identiques entre elles).

| Cycle (06/10) | Au mur | Chargement | Jetons lus | Lecture | Jetons écrits | Écriture | Charge avant | Plan valide ? | Écarts (validerPlan + fil) |
|---|---|---|---|---|---|---|---|---|---|
| 13:05 | 209,0 s | 27,5 s | 1 714 | 28,7/s | 651 | 5,38/s | 4,29 | non | 3 |
| 14:05 | 167,3 s | 0 s | 1 714 | 29,0/s | 572 | 5,36/s | 4,31 | non | 2 |
| 15:05 | 225,5 s | 50,9 s | 1 714 | 29,0/s | 617 | 5,38/s | 4,32 | non | 3 |
| 16:05 | 186,0 s | 0 s | 1 714 | 29,5/s | 681 | 5,37/s | 4,49 | non | 4 |
| 17:05 | 217,6 s | 6,6 s | 1 714 | 28,1/s | 792 | 5,30/s | 0,61 | non | 5 |

La « charge avant » de 4,3 est surtout la mesure précédente (moyenne sur une minute, mesures enchaînées) ; aucun cycle du Chef ne tournait. Les sorties brutes sont dans `.orchestre/travail/modele-maison/chef-leger/sortie-qwen3_4b_instruct_2507_q4_K_M-schema-<n>.json`.

Ce que ça dit : **la compaction seule fait passer le 4 B sous 300 s** sur ces entrées (5 sur 5, de 167 à 226 s ; le matin, avec l'entrée brute, il n'avait fini ni en 330 ni en 420 s), mais **aucun plan n'est valide**. Les cinq ont la même faute pour `validerPlan` : une seule clé d'idempotence recopiée sur les trois tâches ; s'y ajoutent des lignes de `consignes_lues` pour des consignes qui n'existent pas (le bloc est vide). Le schéma d'Ollama contraint la forme, pas ces règles. La vitesse n'est donc plus le verrou principal ; la validité l'est, et c'est exactement ce que l'affinage doit apprendre.

## 4. Verdict honnête

- Les données sont prêtes et prouvées ; le modèle n'existe pas encore. Le blocage est un geste de compte (vérification par téléphone sur Kaggle), pas un défaut du code.
- Pour la vitesse, un gain est déjà acquis sans modèle : l'état compacté. Le brancher seul dans le relais (sans affinage) rendrait le 4 B à temps, mais pas valide ; ce n'est pas une solution sans réparation du plan.
- Ce qu'il faudra regarder dans les mesures du modèle affiné, dans cet ordre : plan valide du premier coup sur les 5 entrées ; durée au mur sous 300 s ; consignes de la salve de 19:05 (8 lignes, entrée plus longue que l'entraînement) ; tâches utiles (aucune écartée).

## 5. La recette, pour la vingtaine de petits modèles

1. **Le contrat** : une entrée produite par une fonction déterministe partagée entraînement / usage (compacter ce qui est lu : c'est le premier gain de vitesse), une sortie JSON jugée par un validateur **en code** (pour le Chef : `validerPlan` + `filtrerTaches` + la règle du fil).
2. **L'épreuve d'abord** : mettre à part des entrées réelles variées (pas des voisines), jamais graines ; le juge le prouve.
3. **La distillation** : partir des entrées réelles, les varier selon les axes que le métier connaît, écrire la sortie attendue (règles + textes rédigés, ou un gros modèle relu par le validateur) ; générateur reproductible (graine fixée) ; ne garder que ce qui passe le validateur, les filtres et la garde d'identité. 250 à 400 paires.
4. **Le juge des données**, avec ses propres motifs et un sabotage par critère.
5. **L'entraînement** : copier `scripts/modele/kaggle/chef-leger-entrainement.py` et `kaggle-chef-leger.mjs`, changer le dataset, le nom et la consigne ; perte sur la réponse seule ; GGUF Q4_K_M + Modelfile au gabarit exact de l'entraînement.
6. **La mesure** sur l'usine, appel diffusé, une entrée à la fois, hors des cycles ; décision sur chiffres ; branchement par un humain.
7. Quota : 30 h de GPU par semaine sur Kaggle (affiché par `--quota`) ; la durée d'une session n'est pas encore mesurée, le nombre de modèles par semaine non plus.
