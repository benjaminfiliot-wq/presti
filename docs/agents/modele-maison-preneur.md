# Le deuxième modèle maison : « presti-preneur » (06-07/10/2026)

Suite de `docs/agents/modele-maison-chef-leger.md` (même recette). Demande de Benj : un Qwen2.5-1.5B-Instruct affiné pour l'agent **preneur** de l'usine, sur ses tâches de **rédaction interne** (`redaction_interne` : annonces eBay, accroches et scripts TikTok, réponses aux acheteurs, textes Presti), à partir des passages du Savoir. Le preneur actuel tourne sur le 4 B local : lent, et il invente des chiffres (la garde `nombresNonSources` de `scripts/usine/preneur.mjs` les marque).

**Le modèle est installé sur l'usine mais PAS branché dans `preneur.mjs`** : la décision revient à Benj, sur les mesures de la section 4.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `scripts/modele/preneur-taches.mjs` | les tâches : 15 réelles du bus (06/10), 70 du Chef léger (ses CARTES, qu'il donnera au preneur), 143 gabarits (produit × livrable, question d'acheteur, métier, objection, textes Presti, 8 tâches du web) ; l'**épreuve** : 12 tâches jamais vues (4 réelles mises de côté + 8 écrites à part) |
| `scripts/modele/preneur-gardes.mjs` | la garde d'ENTRÉE (garde-prospects + motifs propres + noms des entreprises prospectées) ; le Savoir rejoué en local (mêmes `decouper` / `construireIndex` / `chercherIndex` que `lib/savoir/index.ts`, même forme que `chercher.mjs`, puis `passagesDe`) ; les gardes de SORTIE |
| `scripts/modele/donnees-preneur.mjs` | les entrées (exactement `construireConsigne` du preneur, sur un corpus FIGÉ), la distillation (freellmapi, ou le maître Kaggle), le filtre, `donnees.jsonl` |
| `scripts/modele-preneur-donnees-qa.mjs` | le juge des données (critères + 16 sabotages) |
| `scripts/modele/kaggle/preneur-maitre.py` | le maître de repli : Qwen3-32B-AWQ servi par vLLM sur les 2 T4 gratuits de Kaggle |
| `scripts/modele/kaggle/preneur-entrainement.py`, `scripts/modele/kaggle-preneur.mjs` | l'entraînement QLoRA (copie de la recette du Chef léger) et le pousseur (dataset, noyau, maître, état, rapatriement) |
| `scripts/modele/usine/preneur-fusion.sh` | sur l'usine : import du GGUF dans Ollama par l'API (ou, si Kaggle n'a pas rendu de GGUF : fusion → f16 → Q4_K_M d'abord) |
| `scripts/modele/mesure-preneur.mjs` | la mesure sur l'usine : l'appel du preneur à l'identique, une entrée à la fois, refuse H:05-H:20 |

Données de travail (hors dépôt) : `.orchestre/travail/modele-maison/preneur/` (`corpus/` figé, `donnees.jsonl` + `.meta.json`, `sorties-maitre.jsonl` = toutes les réponses du maître, `envois.jsonl` = tout ce qui est parti chez un maître, `epreuve.jsonl`, `mesures.jsonl`, `sortie-1.5b-v1/` et `sortie-1.5b/` = journaux Kaggle).

## 1. Les données

**L'entrée** est celle du preneur, à l'octet : `construireConsigne(tâche, passages)`. Les passages viennent d'une copie FIGÉE (`corpus/`, sinon d'autres sessions changent `docs/` et les entrées ne correspondent plus au cache) de `docs/ecommerce`, `docs/presti`, `docs/marketing`, `docs/produit`, découpée et classée par les fonctions du Savoir, extraits de 600 signes, 5 au plus. Une tâche sur quatre a aussi une variante **sans Savoir**. 279 entrées, 0 refusée par la garde d'entrée ; 36 passages du corpus sur 750 écartés par elle (le mot « prospect » et « SIREN » dans des analyses de vidéos, surtout).

**La sortie** est écrite par un maître fort et gratuit, avec une consigne de qualité à lui seul (`CONSIGNE_MAITRE` : résumé en première ligne, aucun nombre absent des sources — « à mesurer » —, aucune promesse non prouvée, citations [n], le livrable parle à son vrai lecteur). La paire gardée porte la consigne **du preneur**.

**Le maître, ce qui s'est vraiment passé** : freellmapi (Gemini, gpt-oss) et Ollama Cloud étaient **à bout de quota** toute la nuit du 06 au 07/10 (la station StarNet et l'écosystème les consomment ; « Free usage limit » chez Ollama). Les modèles Cloudflare de freellmapi (Nemotron 120B, Llama 3.3 70B) ont rendu 59 réponses avant leur propre plafond, dont 14 gardées (24 %). **Repli : Qwen3-32B-AWQ sur Kaggle** (vLLM, 2 × T4, gratuit) : 795 réponses (3 par entrée) en 48 min, puis un second tour de 207 avec les fautes du premier. Trois écueils réglés en route : torchaudio en CUDA 12.8 face au torch de vLLM (retiré), le `spawn` de vLLM qui réimporte le script (garde `__main__`), une session qui part en erreur sans journal juste après une nouvelle version de dataset (relancer suffit).

**Les gardes de sortie** (une seule faute rejette) : `controlerSortie` et `nombresNonSources` du preneur ; une garde stricte des nombres (tout nombre hors 0-10, hors numérotation et repères de minutage, doit se lire dans les sources) ; 13 motifs de promesse permis seulement si une source les porte ; français ; première ligne de 140 signes au plus ; 200 à 2 500 signes ; citations dans les bornes ; pas d'IMPOSSIBLE sur une tâche faisable. Seule retouche permise : couper une première ligne trop longue après sa première phrase.

**Aucune donnée de prospect chez un modèle gratuit** : chaque envoi passe `fauteEntree` sur le texte exact qui part (garde-prospects, courriel, téléphone, SIREN de Luhn, rue, code postal + ville, « prospect », et 478 noms d'entreprises prospectées lus dans `presti-secrets/prospection`, `presti-ops/prospection`, `SaaS/Prospection`, jamais écrits ni affichés). La garde a d'ailleurs refusé une phrase de MA consigne (« aucun numéro de téléphone » : motif de garde-prospects) : réécrite.

**Résultat** : **236 paires** (16 réelles, 75 du Chef, 145 gabarits ; 221 écrites par Qwen3-32B, 13 par Nemotron, 2 par Llama 3.3 ; 35 sans Savoir ; e-commerce 119, Presti 99). Les 11 réponses IMPOSSIBLE (tâches du web) sont **retirées** des données depuis la mesure de la v1 (voir 4). Rejets : promesses 6, nombres 10, citations 7, IMPOSSIBLE à tort 3, identité 2, longueur et forme 5.

**Le juge** (`node scripts/modele-preneur-donnees-qa.mjs`, VERT) : nombre (200 à 400), forme (consigne système exacte du preneur), doublons, sorties (toutes les gardes + une garde des nombres propre au juge), identité (entrées et sorties, motifs du module + motifs propres + noms), **les 405 envois relus** (rien d'identifiant, aucune tâche de l'épreuve partie chez un maître), fuite de l'épreuve, longueur, aucun IMPOSSIBLE ; couverture ; reproduction octet pour octet depuis le cache. 16 sabotages, tous attrapés : prix inventé, nombre sans unité inventé, « garanti à vie », sortie en anglais, citation [9], IMPOSSIBLE paresseux, téléphone dans une entrée, nom d'une entreprise prospectée, adresse, SIREN valide dans un envoi, tâche de l'épreuve envoyée, ligne doublée, 199 paires, autre consigne système, paire IMPOSSIBLE remise, tâche de l'épreuve glissée.

## 2. L'entraînement (Kaggle, gratuit)

Dataset privé `benjaminfiliot/presti-preneur-donnees`, noyau privé `benjaminfiliot/presti-preneur-1-5b`, T4, QLoRA r 16 α 32 sur les 7 projections, 3 époques, perte sur la réponse seule. Médiane 1 594 jetons par exemple (max 2 319, aucun écarté), réponse médiane 204 jetons.

| | Paires (entraînement / validation) | Durée d'entraînement | Perte (moyenne des pas) | Perte de validation (époques 1 → 3) | Session entière |
|---|---|---|---|---|---|
| v1 (avec 11 IMPOSSIBLE) | 247 (235 / 12) | 1 555 s | 3,00 → 1,99 (moyenne 2,38) | 2,61 → 2,47 → 2,45 | 2 423 s, GGUF Q4_K_M de 986 Mo fait SUR Kaggle |
| v2 (sans IMPOSSIBLE) | 236 (225 / 11) | 1 381 s | 3,19 → 2,15 (moyenne 2,39) | 2,93 → 2,79 → 2,78 | 2 048 s, GGUF fait sur Kaggle |

(Les deux pertes de validation ne portent pas sur les mêmes paires : elles ne se comparent pas entre versions.) La fusion et le GGUF ont réussi sur Kaggle (la correction torchao du 06/10 tient) : la voie de secours de l'usine (fusion CPU) n'a pas servi. Quota : ≈ 2,9 h de GPU pour tout ce travail (2 entraînements, 3 sessions utiles du maître) ; 4,06 h consommées sur 30 cette semaine, Chef léger compris.

## 3. L'usine

`presti-preneur:1.5b` (v1) et `presti-preneur:1.5b-v2` importés par l'API d'Ollama (`/api/blobs` puis `/api/create` avec `files`, gabarit de chat Qwen2.5, consigne du preneur sans passages, température 0,3, contexte 8 192). Espace disque : 6,4 Go libres après import (le GGUF copié est retiré une fois dans Ollama).

## 4. Les mesures (épreuve : 12 tâches jamais vues, appel du preneur à l'identique)

`node scripts/modele/mesure-preneur.mjs --modele=<nom>` : 12 entrées (4 tâches réelles du bus mises de côté, 8 écrites à part, dont une tâche du web), passages du corpus figé, `/api/chat` diffusé, `num_ctx` 8 192, température 0,3, une entrée à la fois, hors H:05-H:20. « Publiable » = `controlerSortie` du preneur passe ; « chiffres (prod) » = la garde `nombresNonSources` du preneur ; « conforme » = toutes les gardes des données.

| Modèle | Durée au mur (médiane ; min-max) | Écriture | Publiables | Sans chiffre hors sources (prod / strict) | Conformes |
|---|---|---|---|---|---|
| qwen3:4b-instruct (le preneur actuel) | **167 s** ; 60-553 s (553 s dont 346 s de chargement) | 5,4 jetons/s | 12/12 | 11/12 / 8/12 | 3/12 |
| presti-preneur:1.5b (v1, avec IMPOSSIBLE) | **25 s** ; 11-58 s | 19,0 jetons/s | **8/12** (4 IMPOSSIBLE sur des tâches faisables) | 11/12 / 10/12 | 5/12 |
| presti-preneur:1.5b-v2 (sans IMPOSSIBLE) | **27 s** ; 10-71 s | 19,8 jetons/s | 12/12 | 10/12 / 9/12 | **7/12** |

Ce que les fichiers bruts montrent (`sortie-*.md`), et que les chiffres ne disent pas :
- **Vitesse : acquise**, 6 fois plus rapide que le 4 B (lecture ≈ 100 jetons/s contre ≈ 30, écriture ≈ 19,5 contre ≈ 5,5).
- **La tâche du web** (« nombre de visites de la semaine dernière ») : le 4 B répond honnêtement « aucune donnée, à vérifier dans… » ; la v1 répond « IMPOSSIBLE : … » (juste) ; **la v2 invente « +30 % »** (la garde du preneur le marquerait « chiffre absent des sources », mais le texte part). Retirer les IMPOSSIBLE a supprimé les refus à tort de la v1… et le seul refus juste.
- **Le prix de la clé à molette** : les trois modèles inventent un prix (4 B 39,90 €, v1 19,90 €, v2 15 €) ; la garde de production les attrape tous.
- **Le sens** : le 1,5 B mélange les contextes que ses passages lui donnent. La v2 écrit une clé à molette « sans fil » « idéale pour le nettoyage », et un courriel du site à 300 € où « je contacte les fournisseurs, le site est livré quand les produits sont en stock » (des phrases du e-commerce). Les gardes mécaniques ne voient pas ces fautes : le 4 B en fait moins.
- Les réponses courtes et cadrées (réponses aux acheteurs, accroches, script de Léa, post LinkedIn) sont bonnes et sourcées.

## 5. Verdict honnête et ce qui reste

- **Données : faites et prouvées** (236 paires, juge vert, rien d'identifiant parti chez un modèle gratuit, 405 envois relus). **Entraînement : fait** deux fois sur Kaggle gratuit (≈ 25 min chacun), GGUF fait sur Kaggle. **Installés** sur l'usine : `presti-preneur:1.5b` (v1) et `presti-preneur:1.5b-v2`. **Rien n'est branché.**
- **Pour décider** : le modèle maison est 6 fois plus rapide et passe plus souvent les gardes mécaniques (7/12 contre 3/12), mais il comprend moins bien la tâche qu'un 4 B ; la v1 refuse trop, la v2 n'ose plus refuser et peut inventer. Une bascule sans relecture n'est pas défendable ; deux usages raisonnables :
  1. le brancher en tête du preneur pour les seules tâches **courtes et cadrées** (réponses aux acheteurs, accroches, légendes, scripts courts), le 4 B gardant le reste ;
  2. ou d'abord une v3 (ci-dessous), puis la même épreuve.
- **v3 proposée** (non faite) : remettre les IMPOSSIBLE des tâches du web (11) MAIS ajouter autant de paires « peu de passages utiles → le travail quand même, avec « à vérifier » » pour que le refus reste réservé au web ; écarter du corpus les passages e-commerce des tâches Presti (le mélange vient de là) ; faire relire le SENS de chaque paire par le maître (une passe de plus sur Kaggle, ≈ 30 min) ; 5 époques. Quota restant : 25,9 h de GPU jusqu'au 10/10.
- Les maîtres gratuits en ligne (freellmapi, Ollama Cloud) ne suffisent pas à distiller 250 paires en une nuit : le maître de Kaggle est la voie qui a marché.

## Reproduire
```
node scripts/modele/donnees-preneur.mjs                         # entrées (corpus figé) + paires depuis le cache
node scripts/modele/donnees-preneur.mjs --distiller             # maître freellmapi (s'arrête au quota)
node scripts/modele/donnees-preneur.mjs --exporter-maitre       # puis kaggle-preneur.mjs --maitre-dataset / --maitre-pousser / --maitre-recuperer
node scripts/modele/donnees-preneur.mjs --importer-maitre
node scripts/modele-preneur-donnees-qa.mjs                      # le juge (vert avant tout envoi à Kaggle)
node scripts/modele/kaggle-preneur.mjs --dataset && node scripts/modele/kaggle-preneur.mjs --pousser   # puis --etat, --recuperer
scp -i ~/.ssh/presti-usine-gardien .orchestre/travail/modele-maison/preneur/sortie-1.5b/presti-preneur-1.5b-q4_K_M.gguf scripts/modele/usine/preneur-fusion.sh gardien@88.96.53.3:modele-fusion-preneur/
ssh … 'cd ~/modele-fusion-preneur && mv preneur-fusion.sh fusion.sh && NOM=presti-preneur:1.5b bash fusion.sh'   # + systeme.txt déjà en place
node scripts/modele/mesure-preneur.mjs --modele=presti-preneur:1.5b
```
