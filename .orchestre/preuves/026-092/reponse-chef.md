# 026-092 — réponse du chef (délégué : lot ménage de l'orchestre, 04/10/2026)

## Décision

**Option 1 : le verifier tourne sur le PC avec ses variables locales, jamais sur l'usine** (c'était déjà la réponse automatique du moteur,
`question-codex-04-10.md`, 04/10 09:56Z : « option PC »). La question d'origine (a-decider du 29/09 : patch de l'usine inapplicable parce que
`decisions-avant.md` existait déjà) est périmée : le patch n'a jamais été appliqué, la fiche est reprise sur le PC.

## État vrai (04/10, 14 h Paris)

- 026-092 est en `file/` (`rejouer --forcer` du 04/10 11:08:34Z) ; `a-decider/026-092.md` était donc un doublon d'état (a-decider + file).
- Les deux défauts de JUGE qui l'empêchaient de passer sont corrigés : SV-16 (le palier financier non nul doit rendre HORS) et le démarrage du
  serveur de l'arbre réel en webpack (commit f7e82186, `scripts/lib/capture.mjs`). Les corrections de juge se notent sous la fiche, pas dans
  `decisions.md` (D-0410-2).
- Le verdict officiel reste à rendre (`station-route-qa --partie=lecture` puis `--partie=reunion`) : lot « juges 092 », pas ce lot.

## Ménage fait

- cette note `a-decider/026-092.md` rangée dans `a-decider/traitees/` ; la fiche reste en `file/` (rien d'autre à déplacer).
