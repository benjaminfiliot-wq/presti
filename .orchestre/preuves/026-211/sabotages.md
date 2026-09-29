# Contre-vérification manuelle — 026-211 (revue-codex rendu 125 : package.json modifié hors fiche)

Racine témoin copiée puis mutée, `node scripts/contenu-qa.mjs --partie=profil-tiktok --racine=<copie>`, le 2026-09-29.

- témoin non muté : PT-1=ok, PT-2=ok (PASS)
- `lien_bio` retiré : PT-1=FAIL, PT-2=ok
- `bio` retiré : PT-1=FAIL, PT-2=ok
- `date_bascule` retiré : PT-1=FAIL, PT-2=ok
- `nouveau_nom_affichage` retiré : PT-1=FAIL, PT-2=ok
- « geste de Benj » retiré : PT-1=ok, PT-2=FAIL
- fichier absent : PT-1 et PT-2 non jugés (jamais un succès par défaut)
