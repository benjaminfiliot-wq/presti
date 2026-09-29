# Contre-vérification 026-236 (29/09)

Juge : `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir-lecons-qa.mjs --partie=selection`. Chaque sabotage est appliqué à la production, jugé, puis annulé (sha256 vérifié).

sha256 avant : lib/agents/lecons.ts f9fe1471f7d7ed34acd31532b6b3438ec6642edf8de2a76dbbcbf175deb11136 ; scripts/savoir/lecons-entree.mjs 8475257cbcead8d3efc62c55083e4a17351b96613374a51929de58919356770a

- Sabotage 1 LECONS_DE sans studio → code 1
    FAIL SVL-7 — LECONS_DE.studio : undefined (["publication","redaction","general"] attendu) (2 s)
    PASS SVL-8 — ok (15 s)
    PASS SVL-10 — ok (0 s)
    PASS SVL-11 — ok (80 s)
    savoir-lecons-qa : FAIL — SVL-7
    restauré : sha256 identique
- Sabotage 2 plafond de 8 leçons porté à 9 → code 1
    FAIL SVL-7 — leconsPour, cas « huit » : ["L-2026-09-12-llllllllllll","L-2026-09-11-kkkkkkkkkkkk","L-2026-09-10-jjjjjjjjjjjj","L-2026-09-09-iiiiiiiiiiii","L-2026-09-08-hhhhhhhhhhhh","L-2026-09-07-gggggggggggg","L-2026-09-
    PASS SVL-8 — ok (8 s)
    PASS SVL-10 — ok (0 s)
    PASS SVL-11 — ok (93 s)
    savoir-lecons-qa : FAIL — SVL-7
    restauré : sha256 identique
- Sabotage 3 balise fermante non neutralisée (les balises passent telles quelles) → code 1
    FAIL SVL-7 — consigneAvecLecons (leçon piégée) : 1 ouverture(s) et 2 fermeture(s) de <lecons_validees> (1 et 1 : la balise venue d'une règle doit être neutralisée) (2 s)
    FAIL SVL-8 — entrée du chef : 1 ouverture(s) et 2 fermeture(s) de <lecons_validees> (1 et 1 : la balise venue d'une règle doit être neutralisée) (11 s)
    PASS SVL-10 — ok (0 s)
    PASS SVL-11 — ok (80 s)
    savoir-lecons-qa : FAIL — SVL-7, SVL-8
    restauré : sha256 identique (f9fe1471f7d7ed34acd31532b6b3438ec6642edf8de2a76dbbcbf175deb11136)
- Sabotage 4 interrupteur ignoré (toujours allumé) → code 1
    PASS SVL-7 — ok (1 s)
    FAIL SVL-8 — interrupteur éteint : entree.md modifié (inchangé à l’octet près attendu) (9 s)
    PASS SVL-10 — ok (0 s)
    PASS SVL-11 — ok (88 s)
    savoir-lecons-qa : FAIL — SVL-8
    restauré : sha256 identique

sha256 après : lib/agents/lecons.ts f9fe1471f7d7ed34acd31532b6b3438ec6642edf8de2a76dbbcbf175deb11136 ; scripts/savoir/lecons-entree.mjs 8475257cbcead8d3efc62c55083e4a17351b96613374a51929de58919356770a
