# Contre-vérification du 29/09 — 026-144

Quatre sabotages réversibles de la production ; le juge `node scripts/pack-pub-dossier-qa.mjs --partie=page` doit les voir. Fichiers restaurés octet pour octet, sha256 comparés.

- S1 prix 149 en dur : code 1 ; attendu PD-5 en échec
    FAIL PD-5 — « 149 » écrit en dur : le prix doit venir de PRIX_PACK_PUB_TEXTE
    pack-pub-dossier-qa : FAIL — PD-5
- S2 case accord sans condition : code 1 ; attendu PD-6 en échec
    FAIL PD-6 — la case « accord » ne semble pas conditionnée par la case « personnes » (aucun rendu conditionnel trouvé à proximité)
    pack-pub-dossier-qa : FAIL — PD-6
- S3 dashboard : ligne étrangère ajoutée : code 1 ; attendu PD-7 en échec
    FAIL PD-7 — 1 ligne(s) ajoutée(s) hors de l'import et de la ligne rendue : <p>promo</p>
    pack-pub-dossier-qa : FAIL — PD-7
- S4 erreur de type : code 1 ; attendu PD-8 en échec
    FAIL PD-8 — npm run typecheck en code 2 : app/pubs/commander/page.tsx(40,7): error TS2322: Type 'string' is not assignable to type 'number'.
    pack-pub-dossier-qa : FAIL — PD-8

## sha256 avant / après
- app/pubs/commander/page.tsx : 9b04e83e732a452bcd8101f0512cff63da95cb32baa6bbae1a13f9b28a43655e → 9b04e83e732a452bcd8101f0512cff63da95cb32baa6bbae1a13f9b28a43655e (identique)
- app/pubs/CartePackPub.tsx : 0ff4e2686d368b07f6f13273e1836eef5fd16dd64a45129d7eeb4c2f165aeb21 → 0ff4e2686d368b07f6f13273e1836eef5fd16dd64a45129d7eeb4c2f165aeb21 (identique)
- app/dashboard/page.tsx : 1fa42b796fd10d6bec478571d81e82650083f252beaf9807122995f419379df0 → 1fa42b796fd10d6bec478571d81e82650083f252beaf9807122995f419379df0 (identique)
