# 026-238 — contre-vérification du 29/09

`node ../presti-ops/usine/revue-codex.mjs 026-238 --sabotages=4` : non jugée. Premier essai : code 127 (le coureur n'a pas pu lancer
Codex sur l'usine après le témoin, code 0 en 161 s). Second essai : code 3, quota de l'abonnement ChatGPT épuisé jusqu'au 3 octobre
2026 à 18 h 01. Aucun verdict de Codex, donc aucun faux vert.

Repli, comme pour 026-023 et 026-026 : la contre-vérification est celle du juge lui-même, dans `echecs-attendus.md` (d) : 32 sabotages
du témoin, chacun vu par le critère qu'il vise (les dix critères SVB en ont au moins un), le témoin vert sur les dix critères, le dépôt
rouge sur SVB-1 en premier. Un sabotage (S11, le délai qui ne tue pas le modèle) n'était pas vu au premier passage : sous ce poste
Windows, tuer le seul parent tue aussi son petit-enfant, donc le relevé des pid ne distinguait rien ; SVB-3 mesure maintenant aussi
le temps que bilan.mjs met à rendre la main (30 s au plus pour un modèle qui dort 40 s, `--minutes=0.05`), et S11 supprime le kill.
Mise au point d'un sabotage seul : `node scripts/savoir-reflexion-qa.mjs --sabotage=S11`.

Écart de charge vu : sous quatre sabotages en parallèle, un `taches refusée (HTTP TimeoutError)` du faux bus a une fois fait rougir
S12 et S13 pour une autre raison que la leur (ils restaient bien rouges sur SVB-3) ; le témoin seul, lui, est vert à chaque passage.
