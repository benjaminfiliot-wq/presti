# 026-095 — refusée par le juge, pas par le code (Claude Code, 29/09) — fiche dans .orchestre/refuse/ ; « node scripts/orchestre.mjs rejouer 026-095 » une fois le juge corrigé
Le porteur est écrit et prouvé : `essai-porteur.mjs` (le vrai script dans un vrai Chromium sur l'usine + les trois routes par le banc)
rend PASS sur PF-3 à PF-15, et 7 sabotages sont tous détectés (`contre-verif-29-09.md`). Mais `node scripts/orchestre.mjs verifier 026-095`
ne peut pas rendre PASS, pour deux défauts de `scripts/facteur-qa.mjs` (interdit à la fiche) :

1. La partie `--ici` lance sur l'usine `process.execPath` (`C:\Program Files\nodejs\node.exe`) : « command not found », code 127.
2. Même avec `node`, la branche `--ici` ne juge ni PF-9 ni PF-11 (« non évalué » = FAIL) et laisse PF-5, PF-6, PF-7, PF-8, PF-10, PF-12, PF-13
   en `s.passe(...)` sans essai.

Options :
1. Corriger le juge sous une fiche 026-062 rouverte : `node` littéral pour la commande usine, PF-9/PF-11 évalués aussi en `--ici`,
   PF-5/8/10/12/13 remplacés par l'essai réel (`essai-porteur.mjs` est prêt à être repris), puis `rejouer` 026-095.
2. Commiter 026-095 sur la preuve de `essai-porteur.log` + `contre-verif-29-09.md` (décision de Benj : c'est le juge qui est en défaut).
3. Attendre : un autre chantier modifie `scripts/facteur-qa.mjs` et `scripts/usine.mjs` (non commités).

À part : les routes appellent deux lectures qu'aucune migration ne pose (`acq_porteur_verifier`, `acq_oppositions_porteur`) : SQL prêt dans
`proposition-migration-lecture-porteur.sql` (migration à passer avant 026-143 ; sans elles les routes REFUSENT, jamais l'inverse).
