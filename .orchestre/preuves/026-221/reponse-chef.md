# 026-221 — réponse du chef (délégué : lot ménage de l'orchestre, 04/10/2026)

## Décision

**Option 1** : livrer 026-194 en PASS, puis relancer 026-221 sur une usine dotée du coffre `presti-secrets` pour la recette réelle. Pas l'option 2
(limiter 221 à une recette simulée) : le juge de complétude exige le PASS journalisé de 194 (DO-0 / OC-0, `verdictDe`), pas un contournement.

## État vrai

- Le préalable est levé : **026-194 est PASS dans le journal local** (`verdicts.jsonl`, 04/10 11:09:44Z, 138 s, `machine: usine`, rejeu depuis `fait/` ;
  le PASS du 30/09 15:24:53Z de la session cloud n'était pas une preuve locale). La copie périmée `file/026-194.md` est rangée dans
  `archive/doublons-0410/file/`.
- Reste à lever avant le rejeu : le coffre sur l'usine (non vérifié par ce lot : il se lit au moment du rejeu, `usine-coffre.mjs` en noms seulement)
  et les voies Ollama/freellmapi pour la recette réelle. Jamais d'abonnement Claude, jamais de donnée de prospect vers un modèle `:cloud`.
- La fiche reste en `refuse/`, DISJONCTÉE : `node scripts/orchestre.mjs rejouer 026-221 --forcer` au moment où le coffre est confirmé. Pas fait par ce lot :
  une remise en file ferait partir le moteur sur une mise en service (installation sur l'usine) sans que le coffre soit vérifié.

## Ménage fait

- cette note `a-decider/026-221.md` rangée dans `a-decider/traitees/`.
