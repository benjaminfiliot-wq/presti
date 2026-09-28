026-076 : SQ-9 (essai à sec) reste rouge sur 2 clés/19 — code_ok_relu et agents_dernier_evenement. Preuve complète, y
compris une reproduction isolée sans rapport avec 0107, dans .orchestre/preuves/026-076/essai-a-sec.md : les deux
sont un défaut du scénario scripts/fixtures/026-pilotage/b/scenarios-sql.mjs (interdit à mon périmètre 026-076), pas
de la migration. Migration 0107_pilotage_lecture.sql : SQ-1 à SQ-8 et SQ-10 verts, essai APRES rien_ne_reste=true.

1. Faire corriger scripts/fixtures/026-pilotage/b/scenarios-sql.mjs (hors de mon périmètre) : déplacer l'assertion
   agents_dernier_evenement avant la boucle des 7 ops_decision_creer, et scinder code_ok_relu en deux instructions
   PL/pgSQL séparées (publier, puis lire) au lieu d'une expression combinée — puis rejouer l'essai.
2. Considérer 0107_pilotage_lecture.sql prête malgré les 2 clés (défaut prouvé du scénario, pas de la migration) et
   l'appliquer quand même, avec ce compte rendu comme justification écrite.
3. Autre chose — à préciser.
