# 026-142 — échecs attendus sur l'arbre actuel (jugé par 026-161)

Cette preuve lance les deux juges elle-même, aujourd'hui, avant que 026-160 (`scripts/pont-orchestre.mjs`) et
026-145 (`app/api/prospects/entrant/route.ts`) n'existent : chacun doit échouer sur son PREMIER critère, et
son autocontrôle `--temoin` (indépendant du script qu'il juge) doit passer.

## pont-orchestre-qa.mjs

- Critère attendu en échec : **PO-1** (`scripts/pont-orchestre.mjs` absent).
- Code de sortie : 2 (attendu : ≠ 0, ici 2 — préalable manquant).
- Extrait réel de la sortie (recopié depuis ce passage) :
  ```
  ✗ PO-1 scripts/pont-orchestre.mjs n'existe pas encore (026-160 pas encore écrite ni déposée).
  ```
- Autocontrôle `--temoin` : PASS (code 0).

## prospects-entrant-qa.mjs

- Critère attendu en échec : **PE-1** (`app/api/prospects/entrant/route.ts` absent).
- Code de sortie : 2 (attendu : ≠ 0, ici 2 — préalable manquant).
- Extrait réel de la sortie (recopié depuis ce passage) :
  ```
  ✗ PE-1 app/api/prospects/entrant/route.ts n'existe pas encore (026-145 pas encore écrite ni déposée).
  ```
- Autocontrôle `--temoin` : PASS (code 0).

## Garde-fous (JP-3, JP-4)

- JP-3 (réseau limité à 127.0.0.1) : jamais déclenché sur les quatre passages.
- JP-4 (rien hors .orchestre/travail/ et .orchestre/preuves/) : `.orchestre/file/` +0, `.orchestre/propositions/` +0, périmètre de 026-142 inchangé : true.

Verdict d'ensemble : **PASS**.
