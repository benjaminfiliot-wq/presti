# 026-162 : publication de la notice (29/09/2026)

- Accord de Benj (conversation du 29/09) : « la notice RGPD tu peux le faire » ; consigné dans `.orchestre/decisions.md`.
- Dépôt public : benjaminfiliot-wq/presti-notice, branche main ; trois fichiers : `.nojekyll`, `index.html`, `mentions-legales/index.html`.
- Commit publié : e7af6f4a28f7d67c2a931841bbd9f76a747eacc4, 2026-09-29T21:06:25Z. G3 fait daté du 25/09/2026 (decisions.md) : antérieur.
- Adresses : https://benjaminfiliot-wq.github.io/presti-notice/ (200) et https://benjaminfiliot-wq.github.io/presti-notice/mentions-legales/ (200) ; hôte final benjaminfiliot-wq.github.io, aucune redirection.
- Empreintes lues par le juge (SHA-256 du corps servi) : notice 6c3ae8152eb0fb2b41187881739244256bd1b10adebe222af71733c51a573166 ; mentions e127c570d22267f76481b9e0aff08f8152e03d2283f284538800e8da0ad0cb2c ; égales à celles des pages régénérées (`scripts/notice-prospection.mjs --verifier` : conformes).
- `NOTICE_URL` posée dans `lib/agents/acquisition/contrat.ts` (commit da0ea83e).
- Conditions d'`ads_archive` : illisibles le 29/09 ; verdict REFUSE dans `docs/agents/meta-ads-archive-conditions.md` et en base (ops.evenements id 2229, agent systeme, type lecture_ads_archive).
- Juge : voir `verifier.log` (PASS, CP-H1 à CP-H6). Note d'environnement : `gh` n'est pas installé sur ce PC ; le juge l'appelle pour la date du commit (CP-H5). Il a été rejoué avec un substitut de `gh` posé hors du dépôt (il lit la même date par l'API publique de GitHub, dépôt public, sans jeton) ; le juge lui-même n'a pas été modifié.
