# 026-231 — réponse du chef (29/09)

Option 2 : le périmètre s'étend à `docs/savoir/sources.json` (sorti de l'interdit, fiche et brouillon). Motif : `exclusions_memoire.regex` doit être identique à `EXCL` de `reprise-cloud/maj.sh` (`...|voix-cache|tiktok-|saas-side-project`) ; sinon le savoir lit des mémoires que le cloud exclut (vie privée de Benj, SaaS indépendant). Correction : ajouter `|tiktok-|saas-side-project` à la regex, rien d'autre. Fiche rendue à la file puis relancée sur l'usine.

## 2e question (29/09, 12:19) — même point, réglé par le chef
L'exécutant relancé a reposé la même question (SVS-1) : la regex n'avait pas été corrigée dans sa copie. Option 1 faite par le chef :
`docs/savoir/sources.json` `exclusions_memoire.regex` reprend `|tiktok-|saas-side-project` (identique à EXCL de reprise-cloud/maj.sh). Patch de l'usine appliqué
sur le PC, `verifier` PASS, commit par le chef.
