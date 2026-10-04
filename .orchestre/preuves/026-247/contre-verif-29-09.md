# Contre-vérification 026-247 — 29/09 (jeu du 04/10)

Quatre sabotages réversibles de la production, juge `node --import ./scripts/ts-loader.mjs scripts/qualite-sites-qa.mjs` relancé après chacun, fichier restauré octet pour octet (sha256 comparé).

## S1 budget de poids relevé à 3 000 Mio
- fichier : scripts/agents/controleur-qualite.mjs
- critère visé : QSI-3
- juge : ROUGE comme attendu — code 1 · qualite-sites-qa : FAIL — QSI-3 · FAIL QSI-3 — poids : {"octets":1168,"budget_octets":3145728000,"pannes":[]} pour 1168 octets servis, budget 3145728 ; pannes [] pour 3145729 octets (budget 3145728) ; pannes [] pour 3146428 octets (bu
- sha256 avant : 4f2f20ab21c8f85208df38ee3a59809deffda202ff99e40ddea536d203ef7e05
- sha256 après restauration : 4f2f20ab21c8f85208df38ee3a59809deffda202ff99e40ddea536d203ef7e05 (identique)

## S2 lien en 404 tenu pour vivant (seuil 400 -> 500)
- fichier : scripts/agents/controleur-qualite.mjs
- critère visé : QSI-5
- juge : ROUGE comme attendu — code 1 · qualite-sites-qa : FAIL — QSI-2, QSI-5, QSI-7, QSI-9 · FAIL QSI-5 — pannes [], ["lien_mort"] attendues
- sha256 avant : 4f2f20ab21c8f85208df38ee3a59809deffda202ff99e40ddea536d203ef7e05
- sha256 après restauration : 4f2f20ab21c8f85208df38ee3a59809deffda202ff99e40ddea536d203ef7e05 (identique)

## S3 tentative de soumission du formulaire (clic sur Envoyer)
- fichier : scripts/agents/controleur-qualite.mjs
- critère visé : QSI-7
- juge : ROUGE comme attendu — code 1 · qualite-sites-qa : FAIL — QSI-7 · FAIL QSI-7 — interaction de page (clic, saisie, envoi) dans le source : un formulaire ne se soumet jamais, même pour essayer
- sha256 avant : 4f2f20ab21c8f85208df38ee3a59809deffda202ff99e40ddea536d203ef7e05
- sha256 après restauration : 4f2f20ab21c8f85208df38ee3a59809deffda202ff99e40ddea536d203ef7e05 (identique)

## S4 idempotence au jour au lieu du mois (une décision par jour)
- fichier : scripts/agents/controleur-qualite.mjs
- critère visé : QSI-9
- juge : ROUGE comme attendu — code 1 · qualite-sites-qa : FAIL — QSI-9 · FAIL QSI-9 — rapport sain : periode 2026-10-04, 0 décision(s) créée(s) ; clés d'idempotence : ["qualite_site:cmd-martin:contraste_insuffisant:2026-10-04","qualite_site:cmd-martin:lien_mort:2026-10-04"
- sha256 avant : 4f2f20ab21c8f85208df38ee3a59809deffda202ff99e40ddea536d203ef7e05
- sha256 après restauration : 4f2f20ab21c8f85208df38ee3a59809deffda202ff99e40ddea536d203ef7e05 (identique)

## Production restaurée
- juge relancé : code 0 · qualite-sites-qa : PASS

## Verdict
Les quatre sabotages ont fait virer le juge au rouge sur le critère visé ; la production restaurée repasse au vert.
