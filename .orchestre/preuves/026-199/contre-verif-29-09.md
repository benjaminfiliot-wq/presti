# 026-199 — contre-vérification du 04/10/2026 (quatre sabotages réversibles de la production)

Chaque sabotage aveugle ou casse UN élément de la production (un juge ou le témoin d'un juge), pose le `verifier` sur sa partie, constate qu'il rend du rouge sur la faute que l'élément aurait dû attraper, puis restaure le fichier à l'octet (empreinte SHA-256 avant et après). Les sabotages sont dans le fichier du dépôt, le temps d'un passage, jamais commités.

## S1 — juge des routes aveuglé sur « le drapeau lu avant l'identité » (UP-2)

- fichier : `scripts/fixtures/026-usine-pubs/parties/routes.mjs`
- sha256 avant sabotage : `8ab4d69a4b628225020c50609d25adfb533826dbb8b887822bc3a3797811f818`
- sha256 pendant le sabotage : `76a644255281c6c93c88647228ab1afd5d1c0439cbf31fa0af272a6610f608fa`
- verifier : code 1, ROUGE comme attendu — « FAIL AUTO-le drapeau lu après la garde — UP-2 UP-2 reste vert : la faute n'est pas vue » ; usine-pubs-qa --preuve-echecs : FAIL
- sha256 après restauration : `8ab4d69a4b628225020c50609d25adfb533826dbb8b887822bc3a3797811f818` (identique)

## S2 — juge des unités aveuglé sur Nice= (UP-10)

- fichier : `scripts/fixtures/026-usine-pubs/parties/unites.mjs`
- sha256 avant sabotage : `c9f0911c0279415283a1588bcb5317a0ccf12d29ebe913d5335361c4fd81bce2`
- sha256 pendant le sabotage : `d2773536481dd5119c9259f0884171ea80c13f9263dbaaba85585cf4433a612a`
- verifier : code 1, ROUGE comme attendu — « FAIL AUTO-Nice=5 — UP-10 UP-10 reste vert : la faute n'est pas vue » ; usine-pubs-qa --preuve-echecs : FAIL
- sha256 après restauration : `c9f0911c0279415283a1588bcb5317a0ccf12d29ebe913d5335361c4fd81bce2` (identique)

## S3 — le tourneur témoin cesse d'attendre le juge vert d'un pack (UP-6)

- fichier : `scripts/fixtures/026-usine-pubs/temoin/scripts/usine/pubs.mjs`
- sha256 avant sabotage : `422e54300560700e497cc1ac891d542cf5a2afb6b26fbe71f0bda919b5e744b7`
- sha256 pendant le sabotage : `d95da7487f06eba1047e5b8c56b09bea371f4968ae4756acd6c12633b80d1ded`
- verifier : code 1, ROUGE comme attendu — « FAIL AUTO-témoin du tourneur UP-6 — UP-6 juge rouge : 1 demande(s) de dépôt, 6 envoi(s) (aucun attendu) ; juge rouge : rendus [{"travail":"11111111-1111-4111-8111-111111111111","ok":true,"fichiers":[{ » ; usine-pubs-qa --preuve-echecs --partie=tourneur : FAIL
- sha256 après restauration : `422e54300560700e497cc1ac891d542cf5a2afb6b26fbe71f0bda919b5e744b7` (identique)

## S4 — juge Search Console aveuglé sur « une seule écriture dans le bucket » (SC-4)

- fichier : `scripts/fixtures/026-search-console/sonde-module.mjs`
- sha256 avant sabotage : `ba0bbefec68c47d99a71363ac09d591332f987b6f35ff0b8b3b2b3c1b0d18275`
- sha256 pendant le sabotage : `d04b89454ca9ababb5eadd8b310cee38669c50242d5d7790a3fa33600ed343f7`
- verifier : code 1, ROUGE comme attendu — « FAIL AUTO-bucket supplémentaire — SC-4 non observé » ; search-console-qa --preuve-echecs : FAIL
- sha256 après restauration : `ba0bbefec68c47d99a71363ac09d591332f987b6f35ff0b8b3b2b3c1b0d18275` (identique)

**Verdict : les quatre sabotages sont vus, les quatre fichiers sont restaurés à l'identique.**
