### defaut-accorder -> code 1 ; ❌ GE-1 — accorder/refuser, défaut refuser, portée sécurité — défaut « accorder » (attendu refuser|
### portee-argent -> code 1 ; ❌ GE-1 — accorder/refuser, défaut refuser, portée sécurité — portée « argent » (attendu securite)|
### ouverte-acceptee -> code 1 ; ❌ GE-2 — décision ouverte ou cible différente refusée — décision ouverte acceptée | un accord pour |
### retouche-ignoree -> code 1 ; ❌ GE-3 — retouche du texte invalide l’accord — accord encore valable après retouche (true)|
restauration exacte : sha256 identique (89ed96a1c553d1e77c7e6688dda10eb488dc934e935f5bd5d68676d2909696ed)
contenu-qa --partie=geste : PASS
contenu-qa : PASS

Note : dans une première version, verdictAccord refusait toute décision sans « portee » ; le juge GE-2 n'exerçait alors pas accordValide (ses cas sont sans portee) et le sabotage « ouverte-acceptee » lui échappait. verdictAccord suit maintenant lignes.ts (portée refusée si elle est renseignée et différente de securite ; la base la pose toujours) : les 4 sabotages sont tués par le juge, et essai-etape6.mjs (26 cas) reste vert.
