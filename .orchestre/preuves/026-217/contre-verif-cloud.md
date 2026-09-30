### defaut-accorder -> code 1 ; ❌ GE-1 — accorder/refuser, défaut refuser, portée sécurité — défaut « accorder » (attendu refuser|
### portee-argent -> code 1 ; ❌ GE-1 — accorder/refuser, défaut refuser, portée sécurité — portée « argent » (attendu securite)|
### ouverte-acceptee -> code 0 ; 
### retouche-ignoree -> code 1 ; ❌ GE-3 — retouche du texte invalide l’accord — accord encore valable après retouche (true)|
restauration exacte : sha256 identique (70c04b9b46559895eab5a92e755d7110af9ae752e88f2fe20606463ba072b389)
contenu-qa --partie=geste : PASS
contenu-qa : PASS

### ouverte-acceptee rejoué contre MON essai (essai-etape6.mjs) : il le tue
❌ décision ouverte -> refus
❌ défaut appliqué (échéance passée) -> refus
❌ défaut appliqué même si le choix est « accorder » -> refus
❌ choix refuser -> refus
❌ échéance passée portée par la décision -> refus
❌ accord de plus de 7 jours -> refus
❌ entrée qui lève (cible objet) -> refus sans exception
essai-etape6 : 7 échec(s)

Limite du juge (hors périmètre, à signaler à 026-204) : GE-2 fournit des décisions sans « portee », que verdictAccord refuse déjà pour cette raison ; le sabotage « ouverte-acceptee » (accordValide contourné) reste donc invisible du juge seul. Il est attrapé par essai-etape6.mjs (cas « décision ouverte » avec portee securite).
