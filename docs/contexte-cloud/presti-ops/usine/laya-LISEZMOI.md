# Laya + openpave-jev sur l'usine Presti

Installé et testé le 25/09/2026 sur `usine@88.96.53.3` (Oracle ARM64, 2 vCPU, 11 Go RAM, Ubuntu 24.04).

## C'est quoi

**Laya** (`@receptron/laya`, npm) est un modèle de décision local « System 1 » : on lui donne un
état (texte ou JSON) et des questions typées, il répond en **une seule passe** avant (pas de
génération de texte, pas d'auto-régression) :

- `choice` — choisit une option parmi une liste, avec une probabilité par option
- `score` — un niveau attendu sur une échelle ordonnée (ex. faible/moyen/élevé), avec la distribution
- `noul` — un P(vrai) calibré pour une affirmation oui/non

Le moteur tourne en local via **ONNX Runtime** (pas de Python, pas de PyTorch au runtime). Les poids
(~1,7 Go, checkpoint anglais fp32) sont publiés par **Convai Innovations** sur Hugging Face
(`receptron/laya-onnx`) et téléchargés au premier usage.

**openpave-jev** est une petite CLI/skill (dépôt `cnrai/openpave-jev`, zéro dépendance npm à elle)
qui expose Laya (ou un serveur Jev-compatible, ou l'API hébergée TypeSafe) sous une interface
`jev decide / score / noul / ask / eval / calibrate` uniforme, pensée pour être appelée par des
agents de code.

## Où c'est, sur l'usine

```
~/laya/                          racine de travail (rien touché ailleurs)
├── package.json                 projet npm minimal (npm init -y)
├── node_modules/@receptron/laya install réel (npm install @receptron/laya)
├── inspection/                  traces du contrôle avant installation (tarballs extraits, scripts lus)
├── essai.mjs                    script d'essai réel (Laya direct)
├── run_essai.sh                 lance essai.mjs en échantillonnant la RSS réelle (ps -o rss=)
├── essai.out / mem.log / run.log  sorties du dernier essai
└── openpave-jev/                clone git de cnrai/openpave-jev (node_modules symlinké vers ../node_modules)
    └── exemple-requete.json     exemple de requête `jev ask`

~/.cache/receptron-laya/         cache des poids ONNX (1,6 Go réels sur disque)
└── receptron--laya-onnx/main/{laya.onnx, laya.onnx.data, laya_config.json, tokenizer/*}
```

Aucun compte, aucune clé n'a été créé. Aucune donnée personnelle réelle n'a servi aux essais
(demandes d'artisans inventées).

## Comment l'appeler

### Directement (Node)

```js
import { Laya } from "@receptron/laya";

const laya = await Laya.load();               // charge le modèle (télécharge au 1er usage)
const res = await laya.systemOne(
  { document: "Fuite sous l'évier, ça coule partout, vous pouvez passer aujourd'hui ?" },
  {
    type_demande: {
      type: "choice",
      instructions: "Quel est le type de cette demande ?",
      criteria: { devis: "demande de chiffrage", urgence: "panne/sinistre à traiter vite",
                  question_prix: "question de prix sans devis", sans_rapport: "hors sujet" },
    },
    veut_rdv: { type: "noul", instructions: "La personne demande-t-elle un RDV/rappel ?" },
    urgence_niveau: { type: "score", instructions: "Niveau d'urgence ?", criteria: ["faible", "moyen", "élevé"] },
  },
);
res.answers.type_demande.choice;          // "urgence"
res.answers.type_demande.probabilities;   // { devis: 0.02, urgence: 0.64, ... }
await laya.close();
```

Voir `~/laya/essai.mjs` pour un exemple complet et mesuré.

### Via la CLI jev (recommandé pour un agent / un script shell)

```bash
# une seule question
node ~/laya/openpave-jev/index.js decide --provider laya \
  -s "Combien coûte la pose d'un chauffe-eau de 200 L ?" \
  -c "devis: demande de devis,urgence: urgence,question_prix: question de prix,sans_rapport: hors sujet"

# les 3 types de question en une seule passe (recommandé : un seul chargement du modèle)
node ~/laya/openpave-jev/index.js ask --provider laya -f ma-requete.json   # voir exemple-requete.json
```

**Toujours passer `--provider laya`** (ou `JEV_PROVIDER=laya`) explicitement. Sans clé
`JEV_API_KEY` ni `JEV_BASE_URL` dans l'environnement, la CLI retombe déjà sur le moteur local par
défaut (vérifié : ni l'un ni l'autre n'existe sur l'usine) — mais le forcer évite qu'une variable
d'environnement ou un `~/.pave/tokens.yaml` qui apparaîtrait un jour ne bascule silencieusement les
appels vers l'API hébergée `api.typesafe.ai` (payante, données envoyées à l'extérieur).

### Comment Codex (sur l'usine) peut l'appeler

Codex n'a pas le mécanisme de skills auto-découvertes de Claude (`~/.claude/skills/*/SKILL.md`) —
`openpave-jev` est pensé pour ça mais Codex ne le lira pas tout seul. En pratique, Codex peut
simplement **exécuter la CLI comme un outil shell classique** dans son bac à sable :

```
node /home/usine/laya/openpave-jev/index.js decide --provider laya -s "<texte>" -c "a:...,b:..." --quiet
```

Points importants pour l'intégrer à une tâche Codex :
- **Aucun réseau nécessaire** pour le provider `laya` une fois les poids en cache — ça tourne même
  dans un bac à sable `workspace-write` sans `network_access=true`.
- **Aucune écriture nécessaire** en dehors de `~/.pave/jev/calibration.json` (uniquement si on
  utilise `jev calibrate`, à éviter par défaut). Un simple `decide/score/noul/ask` est en lecture
  seule + calcul, donc compatible avec un bac à sable restrictif.
- Chaque appel `node index.js ...` **recharge le modèle depuis zéro** (~5-9 s sur cette machine, voir
  mesures ci-dessous) : pas de serveur persistant. Si une tâche doit classer beaucoup de messages,
  préférer **un seul appel `ask` avec toutes les questions**, ou écrire un petit script Node qui
  garde `Laya.load()` une fois et boucle sur les éléments, plutôt que d'enchaîner des `jev decide`
  un par un.
- Il faudrait ajouter une ligne dans le prompt/contexte donné à Codex pour qu'il sache que cet
  outil existe (pas fait ici : je n'ai touché à rien hors de `~/laya/`, conformément à la consigne).

## Contrôle de sécurité effectué avant installation

### `@receptron/laya`

- `npm view` : version 0.1.2, licence MIT, mainteneurs `isamu`/`snakajima` (org `receptron`),
  dépôt `github.com/receptron/laya`, 2 dépendances directes seulement
  (`onnxruntime-node`, `@huggingface/tokenizers`). **Aucun script `preinstall/install/postinstall`
  dans le package lui-même.**
- `npm pack` + extraction : 23 fichiers, uniquement du JS compilé (`dist/*.js`) + types + README +
  LICENSE. Code lu intégralement (`index.js`, `download.js`, `laya.js`, `sequence.js`, `types.js`) :
  pure logique de tokenisation/inférence ONNX + calcul de probabilités. **Aucun `eval`, aucun
  `child_process`, aucune donnée envoyée nulle part.** Le seul accès réseau est dans `download.js` :
  un `fetch` vers `https://huggingface.co/<repo>/resolve/...` pour récupérer les 5 fichiers du
  bundle ONNX, écrits dans un fichier temporaire puis renommés (jamais de poids à moitié écrit),
  mis en cache sous `~/.cache/receptron-laya` (ou `$LAYA_CACHE`).
- Dépendances directes : `@huggingface/tokenizers` (Hugging Face officiel) n'a **aucun script
  d'installation**. `onnxruntime-node` (Microsoft officiel) a un `postinstall: node ./script/install`
  — **lu en entier** : il télécharge des binaires natifs additionnels *seulement* pour les EP CUDA
  manquants sur certaines plateformes (source : NuGet Microsoft), et seulement si la plateforme le
  demande. Sur `linux/arm64`, la table `requirements['linux/arm64']` est **vide** : le script sort
  immédiatement (`process.exit(0)`) sans rien télécharger, car le binaire CPU ARM64
  (`libonnxruntime.so.1` + `onnxruntime_binding.node`, ~25 Mo) est **déjà embarqué** dans le tarball
  npm (113 Mo, tous OS/arch confondus). **Vérifié en l'exécutant** : code de sortie 0, aucun fichier
  créé, aucun appel réseau observé.
- Scan de l'arbre complet installé (12 paquets, `adm-zip`, `global-agent`, `semver`, etc.) : **aucun
  autre script d'installation** que celui d'`onnxruntime-node`.
- **Verdict : sûr.** Installé avec `npm install @receptron/laya` (scripts non bloqués car le seul
  script existant est un no-op vérifié sur cette plateforme).

### `openpave-jev` (évaluation demandée par Benj après coup)

- Pas publié sur le registre npm (`npm view openpave-jev` → 404) : c'est un clone git
  (`github.com/cnrai/openpave-jev`, licence MIT, commit `6bb3f63`).
- `package.json` : **zéro dépendance npm** (`fs`, `path`, `os`, `http`, `https`, `child_process`
  seulement — modules Node natifs). Aucun script `preinstall/install/postinstall`.
- Code lu en entier (`index.js`, `lib/drivers.js`, `lib/laya.js`, `lib/http.js`, `lib/mock.js`,
  `lib/util.js`, `lib/calibrate.js`, `lib/eval.js`) :
  - `lib/laya.js` appelle Laya exactement comme notre essai direct (`Laya.load()` +
    `systemOne()`), rien de plus.
  - `lib/http.js` n'est utilisé **que** si le provider `http` ou `typesafe` est sélectionné, ce qui
    n'arrive que si `JEV_BASE_URL` ou `JEV_API_KEY` (env ou `~/.pave/tokens.yaml`) sont définis.
    **Sans ces variables, ce driver n'est jamais appelé** — confirmé qu'aucune des deux n'existe sur
    l'usine avant l'installation.
  - `jev setup laya` ne fait qu'un `npm install --no-save @receptron/laya` (le même paquet déjà
    audité) — je ne l'ai pas relancé, j'ai réutilisé l'installation existante en pointant
    `openpave-jev/node_modules` vers `~/laya/node_modules` par un lien symbolique (reste dans
    `~/laya/`, évite de retélécharger 113 Mo pour rien).
  - `lib/mock.js`, `lib/calibrate.js`, `lib/eval.js` : calcul pur (PRNG déterministe, scaling de
    température, métriques Brier/ECE), rien d'externe.
- Suite de tests du dépôt (`npm test`) : **64/64 passent.**
- **Verdict : sûr et bien local.** Le seul risque identifié est **structurel, pas malveillant** :
  l'ordre de sélection automatique du provider (`JEV_BASE_URL` > `JEV_API_KEY`/`tokens.yaml` >
  laya local > erreur) ferait basculer silencieusement vers l'API hébergée `api.typesafe.ai`
  (payante) si une de ces variables apparaissait un jour sur l'usine. Rien de tel n'existe
  actuellement (vérifié), et la CLI est appelée ici avec `--provider laya` explicite pour ne
  jamais en dépendre.
- Installé dans `~/laya/openpave-jev/` (clone git), rien touché ailleurs.

## Mesures réelles (essai.mjs, ce jour, sur l'usine)

| Mesure | Valeur |
|---|---|
| Chargement (1er usage, dont téléchargement des poids) | **28,75 s** |
| Taille réelle du cache sur disque | **1,69 Go** (`laya.onnx.data` = 1 685 Mo) |
| RSS pic pendant le run (chargement + 3 questions) | **1,73 Go** (mesuré par `ps -o rss=` externe, échantillonné toutes les 200 ms) |
| RSS avant chargement | ~9 Mo (process Node à vide) |
| Question 1 (fuite/urgence) | 7,10 s |
| Question 2 (prix chauffe-eau) | 7,87 s |
| Question 3 (devis salle de bain) | 10,34 s |
| Mémoire totale de la machine | 11 Go (2 vCPU seulement) |

Le README annonce ~140 ms pour 3 questions « à chaud » sur un CPU Apple Silicon : ici c'est
**~50 à 70x plus lent** (7 à 10 s), parce que l'usine n'a que **2 vCPU partagés** avec d'autres
process (serveur Presti, agents Codex tournaient en même temps), pas de threads dédiés configurés
(`sessionOptions.intraOpNumThreads` non réglé), et une architecture ARM sans optimisations
particulières. Le chargement du modèle (session ONNX + tokenizer), pas juste le téléchargement,
pèse aussi dans ces temps — **chaque appel CLI isolé recharge tout** (pas de serveur persistant).

## Réponses de l'essai — sont-elles sensées ?

**1. « Fuite sous l'évier, ça coule partout, passer aujourd'hui ? »**
`type_demande` = **urgence** (71,6 %) — correct.
`veut_rdv` = 0,11 (P faible) — discutable : le message demande implicitement une intervention le
jour même, mais le modèle ne l'assimile pas à une « demande de RDV/rappel » explicite.
`urgence_niveau` = 0,68 sur 0-2, faible 40 % / moyen 51 % / élevé 9 % — **sous-évalué** : pour une
fuite qui inonde et une demande d'intervention le jour même, on attendrait « élevé » nettement
devant, pas « moyen » qui gagne d'un cheveu.

**2. « Combien coûte la pose d'un chauffe-eau de 200 L ? »**
`type_demande` = **sans_rapport** (34 %), quasi à égalité avec devis (32 %) et question_prix
(27 %) — **faux** (on attendait `question_prix`), mais la confiance rapportée est très basse
(8,4 %), donc le modèle « sait qu'il ne sait pas » : le signal de confiance semble correctement
calibré sur ce cas raté.
`veut_rdv` = 0,0001 — correct (pas de demande de RDV).

**3. « Devis salle de bain, l'an prochain, pas pressé »**
`type_demande` = **devis** (75,8 %) — correct.
`veut_rdv` = 0,05 — correct.
`urgence_niveau` = 0,48, faible 55 % / moyen 41 % / élevé 4 % — correct, cohérent avec « pas
pressé ».

**Bilan : 2 cas sur 3 nets et sensés, 1 cas ambigu/faux mais avec une confiance basse qui
prévient du doute.** Le point faible net : la question d'urgence sur le cas 1 (fuite) est
sous-évaluée — à vérifier avec plus de cas avant de s'y fier pour trier automatiquement des
urgences réelles.

**Piste testée avec la CLI `jev`** : en reformulant les critères sans accents (« necessitant »,
« eleve » au lieu de « nécessitant », « élevé »), la même question « devis salle de bain » est
repassée de 75,8 % à **95,5 %** de confiance sur `type_demande`, mais la confiance sur
`urgence_niveau` s'est effondrée à 2,3 % (quasi uniforme). Ça confirme ce que l'auteur
d'`openpave-jev` rapporte dans son ticket amont : **le texte exact des critères (au mot près, y
compris les accents) déplace significativement les distributions.** D'où la recommandation
d'`openpave-jev` de calibrer (`jev calibrate`) sur un jeu de données étiquetées avant de faire
confiance aux probabilités brutes — pas fait ici (aucune donnée réelle disponible), mais à garder
en tête avant tout usage en prod.

Autre piste identifiée mais non exploitée : le README de Laya et la CLI `jev` mentionnent un
checkpoint `multilingual` (`Laya.load({ subfolder: "multilingual" })` / `--checkpoint
multilingual`) — **vérifié : il n'existe pas encore** sur `receptron/laya-onnx` (404 sur Hugging
Face à ce jour). Seul le checkpoint anglais est publié. Les messages testés étaient en français ;
ça peut expliquer une partie de la calibration imparfaite sur l'urgence — à retester si/quand un
checkpoint multilingue sort.

## Ce que Laya peut faire dans l'écosystème Presti

- **Qualifier une demande entrante** (devis / urgence / question de prix / hors sujet) en < 1 s de
  calcul pur, sans appel LLM, pour prioriser une file ou déclencher une réponse différente selon le
  type.
- **Détecter si un message demande un rendez-vous/rappel** (`noul`) pour déclencher une action
  précise (proposer des créneaux) plutôt qu'une réponse générique.
- **Scorer un niveau d'urgence** pour trier les tickets — sous réserve de la calibration (voir
  limites ci-dessus, ce n'est pas fiable tel quel sur le cas « fuite »).
- **Décisions de bascule à faible enjeu et haut volume** : gate de confiance (`--min-confidence`)
  pour laisser l'automatisation agir seule quand le modèle est sûr, et renvoyer vers un humain ou un
  LLM sinon — exactement le pattern que documente `openpave-jev`.
- Coût : **zéro € par appel** (poids Apache 2.0, tourne en local), contre un appel LLM à chaque
  message. Mais sur cette machine (2 vCPU), 7-10 s par décision **par process relancé** — trop
  lent pour du temps réel si chaque requête relance la CLI ; correct pour du traitement par lot
  (nightly, file d'attente) ou via un petit serveur Node qui garde le modèle chargé.

## Limites à connaître

1. **Un seul checkpoint publié (anglais)** — pas de variante multilingue malgré l'option dans
   l'API, calibration en français non garantie.
2. **Sensible à la formulation exacte des critères** (accents, mots choisis) — ne pas changer les
   critères sans retester.
3. **Lent sur cette machine** : 2 vCPU seulement, ~7-10 s par appel CLI isolé (chargement +
   inférence), contre ~140 ms « à chaud » annoncés sur Apple Silicon. Pas de serveur persistant
   fourni par défaut — chaque `jev <commande>` recharge tout.
4. **~1,7 Go de RAM minimum** pour le modèle chargé, + le cache de 1,7 Go sur disque (une fois).
5. **Confiance non calibrée par défaut** — le score de confiance affiché est utile (bas sur le cas
   raté de l'essai) mais `openpave-jev` lui-même prévient : les modèles de décision sortent
   « sur-confiants » avant `calibrate` sur un vrai jeu de données étiquetées, qu'on n'a pas ici.
6. **`openpave-jev` bascule vers une API payante externe** (`api.typesafe.ai`) si une clé
   `JEV_API_KEY`/`~/.pave/tokens.yaml` apparaît un jour sans qu'on le veuille — toujours forcer
   `--provider laya` en usage automatisé.
7. Licences : code MIT (Laya + openpave-jev), poids **Apache 2.0** (Convai Innovations) — libres
   d'usage commercial, à citer si redistribué.
