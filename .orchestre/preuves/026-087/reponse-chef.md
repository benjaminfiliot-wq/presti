# 026-087 — réponse du chef (délégué : lot ménage de l'orchestre, 04/10/2026)

## Décision

**Option 1** : recaler `scripts/redacteur-qa.mjs` et ses fixtures sur les modèles et douleurs réellement approuvés, corriger RD-11 (péremption),
puis relancer 026-087. Sans rien assouplir (décision du chef du 04/10 : un juge défectueux se corrige, jamais ne s'affaiblit).

## État vrai

- Option 1 est **exécutée par le lot juges** : `preuves/026-087/decisions-juges-04-10.md` (04/10 14:23) détaille RD-3, RD-4, RD-5 à RD-11, RD-13,
  RD-14/15 ; AC-3 passe de 28 à 64 échantillons fautifs repérés, témoin vert sur l'usine.
- La fiche reste en `refuse/`, DISJONCTÉE (trois baux expirés le 30/09). Elle ne se rejoue qu'après le PASS de 026-083 (sa dépendance, étalonnage du
  second juge) : `node scripts/orchestre.mjs rejouer 026-087 --forcer`, puis la file. Pas rejouée par ce lot : 083 n'est pas PASS à l'heure de cette note.

## Ménage fait

- cette note `a-decider/026-087.md` rangée dans `a-decider/traitees/`.
