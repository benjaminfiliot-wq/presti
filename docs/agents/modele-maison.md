# Le modèle maison — affiner un petit modèle pour l'écosystème (plan du 06/10/2026)

Origine : la vidéo de Benj (@ray_fu, « How to create a custom LLM with your own data », analysée par l'écosystème le 06/10, `docs/connaissance-videos/ray_fu-7692946113241959711.analyse.md`). Benj : « incroyable, on pourrait l'utiliser pour l'écosystème et plein d'autres choses ». Ma première lecture l'avait trop vite rangée : ce plan la remplace.

## Pourquoi c'est la bonne réponse à notre vrai problème
Le Chef (et les autres agents de réflexion) s'arrêtent quand les moteurs gratuits atteignent leur quota, et les modèles locaux (qwen3 8 B / 4 B sur 4 cœurs ARM, sans GPU) dépassent leur délai de 300 s : le prompt du Chef est long (consignes, contexte, règles du plan) et un 8 B lit et écrit à quelques jetons par seconde. Un petit modèle **affiné** change deux choses :
1. **Les règles passent dans les poids** : le prompt raccourcit de plus de la moitié (plus besoin de réexpliquer le format du plan, les types de tâches, les interdits).
2. **Un modèle de 0,5 à 1,5 B** tourne 5 à 8 fois plus vite qu'un 8 B sur le même processeur.
Ce qu'un petit modèle affiné fait bien : des tâches **étroites et répétitives** à format strict (classer, trier, extraire, rédiger un plan au format du Chef). Ce qu'il ne fait pas : raisonner sur un problème neuf. Le Chef ordinaire (cycle léger, tri, brèves) est dans le premier cas ; la réunion de fond et le bilan restent aux gros modèles.

## Les usages, par ordre de valeur
| # | Usage | Entrée → sortie | Corpus disponible |
|---|---|---|---|
| 1 | **Chef léger** : plan de cycle au format validé | contexte du cycle → `plan.json` | 34 plans enregistrés (`/home/agents/travail/chef/*/plan.json`), 126 tâches créées dont 76 abouties, 28 décisions |
| 2 | **Tri des tâches libres** (remplace les règles `tacheEcartee`) | tâche → gardée / écartée + motif | les 17+ tâches écartées et annulées de la nuit du 05-06/10, le registre des échecs du preneur |
| 3 | **Presti : classer les demandes entrantes** (urgence, type de chantier, devis ou question) | message client → JSON | **aucun corpus réel relu pour l'instant** : à constituer avec les vraies conversations (RGPD : jamais hors de nos serveurs) |
| 4 | **Prospection : qualifier une entreprise** (a un site ? métier ? joignable ?) | fiche → verdict | les 5 prospects « vérifiés » et les verdicts de l'orchestre |
| 5 | **E-commerce : noter un produit** sur les cinq critères | relevé de marché → note | relevés quotidiens (à partir du 07/10) |

## Les étapes (chacune se prouve avant la suivante)
0. **Corpus** : un script extrait les paires (entrée → sortie acceptée) depuis les plans enregistrés et les tâches abouties ; **seules les sorties validées par `validerPlan` et appliquées sans écart** entrent. Compter ; si moins de 150 paires propres, on enrichit (variantes, relectures) avant d'entraîner. Aucun nom, e-mail ni téléphone dans le corpus (garde `motifProspects`).
1. **Base de comparaison avant d'entraîner** : le même contexte du Chef passé à `qwen2.5:1.5b` non affiné avec un prompt court + sortie JSON contrainte (Ollama `format` = schéma du plan). Mesurer : plan valide (oui/non), durée, tâches utiles. Si la base suffit, on s'arrête là.
2. **Entraînement QLoRA** d'un adaptateur sur Qwen2.5 0,5 B puis 1,5 B. Lieu : le CPU de l'usine tient 0,5 B avec peu d'exemples mais lentement ; pour 1,5 B il faut un **GPU gratuit** (Kaggle ou Colab) — **cela demande un compte de Benj** (geste à lui, ni mot de passe ni création de compte par moi).
3. **Épreuve à l'aveugle** : 20 contextes jamais vus, le modèle affiné contre le relais actuel ; critères mesurables (plan valide du premier coup, durée < 120 s, mêmes types de tâches que le plan retenu). Pas de bascule sans victoire nette.
4. **Branchement** : nouveau moteur `ollama_maison` en tête du relais du Chef léger (`scripts/usine/relais-chef.mjs`, juge `relais-ia-qa`), repli sur la chaîne actuelle. Réentraînement chaque semaine avec les nouveaux plans validés.

## Limites honnêtes
- « Moins de 2 $ » et « 300 exemples » sont des chiffres de vidéo : à vérifier par l'étape 3, jamais à croire.
- 76 tâches abouties ne font pas 300 exemples variés : le risque est un modèle qui recopie les plans passés. D'où la base de comparaison et l'épreuve à l'aveugle.
- Les corpus contenant des données de clients ou de prospects restent sur nos machines (jamais chez un fournisseur gratuit ni dans le Savoir général).
- Rien n'est entraîné ni branché tant que les étapes 0 et 1 n'ont pas rendu leurs chiffres.

## Résultats des étapes 0 et 1 (06/10/2026)
Voir `docs/agents/modele-maison-mesures.md` : 2 paires propres en règle stricte (17 en tolérant les tâches écartées), contre 150 visées ; le 4 B non affiné n'a pas fini un plan léger en 330 ni 420 s. Rien n'est entraîné ni branché.
