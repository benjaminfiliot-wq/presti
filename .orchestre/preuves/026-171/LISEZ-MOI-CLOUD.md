# 026-171 — ce que cette session cloud a écrit, et ce qu'elle a laissé au PC

Écrit dans une session cloud (pas de `.env.local`, pas de compte d'essai, pas de `~/station-assets`). Aucun git, aucun `next build`.

## Partie A — les trois juges hors ligne (sans compte ni clé), écrits et éprouvés ici

- `scripts/station-themes-qa.mjs` — `--partie=modules` (TH-1 à TH-6, par un enfant sous `scripts/ts-loader.mjs`) et `--theme=station|vaisseau` (TH-7 à TH-12).
- `scripts/ecommerce-reservee-qa.mjs` — EC-1 à EC-5.
- `scripts/fixtures/026-pilotage/t/` : `outils.mjs`, `juge-modules.mjs` (l'enfant), `controles.mjs` (JA-3, JA-4, JA-6 du lot), `fabriquer-temoin.mjs`, `lot.mjs`, `CONTRAT.md` (ce que 026-173, 026-176, 026-185 et 026-190 doivent respecter), les jeux `reglages-valides.json`, `reglages-pieges.json`, `dispositions.json`, `tickets.json`, `themes-pieges/` (17 thèmes abîmés) et le témoin `temoin/` (modules d'essai, deux thèmes minimaux, drapeau, carte, LISEZMOI, migration bénigne).

## Ce que le PC (ou l'usine) doit encore faire

- **`station-reglages-qa` et `poste-extraction-qa`** exigent un compte d'essai réel (`.env.local`, absent du cloud) : ils ne sont PAS dans `t/lot.mjs`. Une autre partie du lot (`t/lot-b.mjs`, écrite par un second sous-agent, mode doublures) les couvre en cloud ; leur épreuve avec un vrai compte d'essai reste au PC.
- **TH-10 sur l'arbre réel** compare les images d'un thème aux empreintes des feuilles du lot A : il lui faut `~/station-assets` (l'usine) ou `.orchestre/travail/station-planche-qa/empreintes-lot-a.json`. Ici, sans l'un ni l'autre, sur l'arbre réel il sort en **code 2** ; en `--temoin` et sur les arbres de la preuve il n'utilise que la feuille synthétique de `themes-pieges/empreintes-feuilles.json` (dit dans sa ligne de sortie).
- `lot.mjs` prend pour référence `1c87006` (celle du lot k) : le commit du lot a (`4041ec9`) n'existe pas dans ce clone.
