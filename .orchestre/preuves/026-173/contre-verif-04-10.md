# Contre-vérification du 04/10 — 026-173

Écrite par `contre-verif-04-10.mjs`, lancé SUR l'usine dans un bac gelé (HEAD `6518a8f0`) le 2026-10-04T09:58:51Z. Les trois modules purs de la personnalisation (lib/pilotage/theme.ts, disposition.ts, reglages.ts) sont jugés par station-themes-qa --partie=modules (TH-1 à TH-6), dont le témoin est vert sur l'arbre HEAD.

Chaque sabotage remplace UN texte exact du code dans un arbre jetable (extrait de HEAD par `git archive`, `node_modules` en liens physiques), relance le juge, puis REMET le texte d'origine : rien n'est écrit dans le dépôt, tout est réversible. Pour rejouer : `node scripts/usine.mjs executer --nom=cv --delai=30 --id=026-173 --rapatrier=.orchestre/preuves/026-173 -- node .orchestre/preuves/026-173/contre-verif-04-10.mjs`.

Juge : `node --import ./scripts/ts-loader.mjs scripts/station-themes-qa.mjs --partie=modules --racine=<arbre jetable>`

| Sabotage | Fichier | Critère attendu | Verdict du juge | Ce qui est cassé | Pris ? |
|---|---|---|---|---|---|
| (témoin) l'arbre HEAD tel quel | — | — | PASS, code 0 | 6 critère(s) vert(s) | oui |
| date-now-dans-un-module-pur | `lib/pilotage/disposition.ts` | TH-1 | FAIL code 1, rouges : TH-1, TH-2, TH-3, TH-4, TH-5, TH-6 · « ❌ TH-1 lib/pilotage/disposition.ts contient Date.now( » | un module pur lit l'horloge (Date.now) | oui |
| reservee-deplacable | `lib/pilotage/disposition.ts` | TH-3 | FAIL code 1, rouges : TH-3, TH-4 · « ❌ TH-3 « reservee-deplacee » refusée pour une autre raison : « L'emplacement réservé (ecommerce) n'accueille aucune autre salle : Radar ne peut pas y si… » (attendu : /réservée.*ne se déplace pas/ne se déplace pas/) ; « reservee-d » | la salle réservée E-commerce peut être déplacée | oui |
| schema-des-reglages-ouvert | `lib/pilotage/reglages.ts` | TH-4 | FAIL code 1, rouges : TH-4 · « ❌ TH-4 le piège « cle-inconnue » est accepté (ou sans raison) ; le piège « cle-inconnue-a-cote-d-une-valide » est accepté (ou sans raison) ; le piège « cle-proto » est accepté (ou sans raison) ; le piège « surcharge-de-root-a-la-r » | une clé inconnue des réglages n'est plus refusée | oui |
| nom-de-17-signes-accepte | `lib/pilotage/reglages.ts` | TH-4 | FAIL code 1, rouges : TH-4 · « ❌ TH-4 le piège « nom-de-17-signes » est accepté (ou sans raison) » | la borne des noms passe de 16 à 40 signes | oui |
| defauts-plus-forts-que-les-reglages | `lib/pilotage/reglages.ts` | TH-5 | FAIL code 1, rouges : TH-5 · « ❌ TH-5 fusionner rend {"couleurs":{"--mc-fond":"#111111","--mc-sol":"#222222"},"equipage":{"chef":{"nom":"Chef","avatar":"chef"},"redacteur":{"nom":"Plume","avatar":"defaut"}},"nuit…, {"mise_en_page":"colonnes","couleurs":{"--mc-f » | la fusion donne le dessus au défaut du thème | oui |
| css-libre-pose-sur-le-noeud | `lib/pilotage/reglages.ts` | TH-6 | FAIL code 1, rouges : TH-6 · « ❌ TH-6 « réglages posés » : des propriétés hors des jetons de la palette posées (background-image) ; « réglages posés » : background-image = « url(x) », une couleur #RRGGBB attendue ; « aucun réglage » : des propriétés hors des je » | appliquerReglages pose une propriété CSS hors des jetons --mc-* | oui |
| couleur-libre-dans-le-theme | `lib/pilotage/theme.ts` | TH-2 | FAIL code 1, rouges : TH-2 · « ❌ TH-2 validerTheme accepte 65 thème(s) que le schéma refuse : motif de palette.--mc-fond («  ») ; motif de palette.--mc-fond (« x ») ; motif de palette.--mc-fond (« #GGGGGG ») ; motif de palette.--mc-fond (« a b ») ; … » | validerTheme accepte une couleur qui n'est pas #RRGGBB | oui |
| champ-inconnu-tolere-dans-le-theme | `lib/pilotage/theme.ts` | TH-2 | FAIL code 1, rouges : TH-2 · « ❌ TH-2 validerTheme accepte 28 thème(s) que le schéma refuse : champ inconnu dans racine ; champ inconnu dans grille ; champ inconnu dans palette ; champ inconnu dans emplacements.0 ; … » | validerTheme tolère un champ inconnu | oui |
| (retour) l'arbre remis après les sabotages | — | — | PASS, code 0 | témoin revenu au vert | oui |

**Bilan : les 8 sabotages sont pris, le témoin est vert avant et après.**
