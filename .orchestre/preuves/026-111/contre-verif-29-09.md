# 026-111 — contre-vérification : 4 sabotages réversibles de la production de la station

Écrit le 04/10/2026 par claude-code (le nom du fichier, `contre-verif-29-09.md`, est celui de la consigne).

## Méthode

- **Juge** : `node scripts/pilotage-ecran-qa.mjs --partie=station` au **banc** (`--racine=<copie de la racine>`, sans `.env.local`, sans compte, sans réseau), joué sur l'usine par `usine.mjs executer` ; mêmes critères ST-1 à ST-19 que le verdict officiel, sauf ce que le banc ne juge pas par construction (le typecheck de la racine réelle ; ST-17 se limite au diff de `app/controle/page.tsx`).
- **Où l'on sabote** : jamais dans l'arbre principal de `presti` (ses fichiers `Barre.tsx`, `Attention.tsx`, `Equipage.tsx`, `Journal.tsx`, `Panneaux.tsx` et `Vues.tsx` portent des travaux non commités d'autres fiches : y écrire aurait pu les écraser), mais dans quatre copies propres `git worktree`, détachées à HEAD `4102dd2f`, une par sabotage. La production sabotée est donc exactement celle de HEAD (station commitée en 16be91f5).
- **Réversibilité** : sha256 du fichier avant ; une seule occurrence du texte remplacé exigée ; sabotage écrit ; juge joué ; octets d'origine réécrits (aucun `git restore`) ; sha256 relu : égal à l'origine dans les quatre cas.
- **Témoin** : sans sabotage, le même juge rend PASS (19 critères sur 19) et `npm run typecheck` rend 0 sur la même racine : `verifier-banc-04-10.txt`.

## Résultat : 4 sabotages sur 4 pris, chacun par le critère attendu et par lui seul

| # | Fichier | Sabotage | Critère attendu | Verdict du juge | Pris ? | sha256 restaurée |
|---|---|---|---|---|---|---|
| 1 | `app/controle/station/Barre.tsx` | la panne de la trésorerie écrit « 0 EUR » au lieu de « — » | ST-4 | FAIL — ST-4 | oui, seul | égale à l'origine |
| 2 | `app/controle/station/Attention.tsx` | les cartes d'Attention sont rendues à l'envers (`.reverse()`) | ST-6 | FAIL — ST-6 | oui, seul | égale à l'origine |
| 3 | `app/controle/station/Station.tsx` | `visible = () => true` : le direct est relu page cachée | ST-14 | FAIL — ST-14 | oui, seul | égale à l'origine |
| 4 | `app/controle/station/Equipage.tsx` | un nom de modèle (`gpt-6-luna`) est écrit dans le composant | ST-19 | FAIL — ST-19 | oui, seul | égale à l'origine |

## Détail

### Sabotage 1 — Barre.tsx (ST-4)

- remplacé : `valeur: '—', note: 'Trésorerie ne répond pas'`
- par : `valeur: '0 EUR', note: 'Trésorerie ne répond pas'`
- sha256 d'origine : `577567ab42a7d1f3ececdeb6f3454e725c16911d9beb40b96893559604ac5860`
- sha256 sabotée : `f5e4c0ffc3512e7a6795cdd7d984292ae88a7dfaa80219ccd25a2682a1de95f0`
- sha256 après restauration : `577567ab42a7d1f3ececdeb6f3454e725c16911d9beb40b96893559604ac5860` (égale à l'origine)
- le juge : `pilotage-ecran-qa --partie=station : FAIL — ST-4`
- cause relevée : « trésorerie en panne : encaisse_mois affiche « ENCAISSÉ · MOIS 0 EUR Trésorerie ne répond pas », « — » et « Trésorerie ne répond pas » attendus, jamais 0 € » (puis depense_mois et marge_mois, de même)

### Sabotage 2 — Attention.tsx (ST-6)

- remplacé : `l.valeur.cartes.map((c) => {`
- par : `[...l.valeur.cartes].reverse().map((c) => {`
- sha256 d'origine : `133e11e4736f0e680a4ef573cb036e0d45a47eb508dedeb2a33c170b3b3393ba`
- sha256 sabotée : `9608e74433bee11037f1c888ef762f15220b5702b6ccedc7a3fd9722f86bde3f`
- sha256 après restauration : `133e11e4736f0e680a4ef573cb036e0d45a47eb508dedeb2a33c170b3b3393ba` (égale à l'origine)
- le juge : `pilotage-ecran-qa --partie=station : FAIL — ST-6`
- cause relevée : cartes rendues `orchestre:bleu, crieur_muet:jaune, jauge_pleine:jaune, canal_arrete:orange, appels:orange, usine_injoignable:rouge, decisions:rouge` au lieu de l'ordre servi `decisions:rouge, usine_injoignable:rouge, appels:orange, canal_arrete:orange, jauge_pleine:jaune, crieur_muet:jaune, orchestre:bleu`

### Sabotage 3 — Station.tsx (ST-14)

- remplacé : `const visible = () => document.visibilityState !== 'hidden'`
- par : `const visible = () => true`
- sha256 d'origine : `18144ab5d3a187b1bd68234c2e56cbc6eec46d9d7d80c86f784ac1ce3bb779a4`
- sha256 sabotée : `5741c1061591557ceafb9ddc7f17e206853574f8d6b52576ffa17c6b7367566c`
- sha256 après restauration : `18144ab5d3a187b1bd68234c2e56cbc6eec46d9d7d80c86f784ac1ce3bb779a4` (égale à l'origine)
- le juge : `pilotage-ecran-qa --partie=station : FAIL — ST-14`
- cause relevée : « page cachée : 15 requête(s) en 60 s (/api/controle/station?vue=direct) » (la règle : aucune requête page cachée)

### Sabotage 4 — Equipage.tsx (ST-19)

- remplacé : `data-modele>{a.modele.texte}</div>`
- par : `data-modele>{a.modele.texte || 'gpt-6-luna'}</div>`
- sha256 d'origine : `6323bd2bf9ab324697d6f053313b998a8d228fe8fca2aa75d16a2701b0076409`
- sha256 sabotée : `6b34b410787c739020210c2b06fac59172a663afbfb9a4886261cb74f8945522`
- sha256 après restauration : `6323bd2bf9ab324697d6f053313b998a8d228fe8fca2aa75d16a2701b0076409` (égale à l'origine)
- le juge : `pilotage-ecran-qa --partie=station : FAIL — ST-19`
- cause relevée : « Equipage.tsx écrit « gpt- » : le modèle est le texte servi »

## Limite

Ces sabotages sont jugés **au banc**. Le mode « racine réelle » du juge (compte fondateur d'essai créé en production) n'a pas été joué : il attend l'accord écrit de Benj (`.orchestre/preuves/026-104/mode-reel.md`), voir `.orchestre/en-cours/026-111.question.md`.
