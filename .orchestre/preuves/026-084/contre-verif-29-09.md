# 026-084 — contre-vérification du 29/09 (claude-code)

Patch de l'usine (resultat.patch, Codex) appliqué tel quel ; les blocages signalés par Codex (LienRdv metier/commune/statut, motif `appel`, juge) étaient déjà levés en amont (026-016, 026-047, 026-081). Juge `rendez-vous-qa` : PASS sur le PC puis PASS sur l'usine (verifier-final).

Quatre sabotages réversibles de la production, le juge lancé à chaque fois, fichier restauré ensuite (sha256 identique vérifié) :

| # | Sabotage | Résultat du juge | sha256 restauré |
|---|----------|------------------|-----------------|
| S1 | route.ts : `X-Robots-Tag: noindex…` remplacé par `index` | FAIL — RV-4 | oui (38008ad7da4d…) |
| S2 | rendezVous.ts : `${echapper(metier)}` remplacé par `${metier}` (HTML non échappé) | FAIL — RV-4 | oui (cf1415156b29…) |
| S3 | route.ts : le numéro `valide.telephone` glissé dans le corps de l'alerte | FAIL — RV-6 | oui (38008ad7da4d…) |
| S4 | route.ts : contrôle de l'en-tête `Origin` retiré du POST | FAIL — RV-5, RV-7 | oui (38008ad7da4d…) |

sha256 finaux de la production : rendezVous.ts = cf1415156b294c17…, route.ts = 38008ad7da4d769b… (inchangés).

## Reste (hors périmètre de cette fiche, prévu par « C'est fini quand »)
`npm run build`, push, `deploiement-etat.mjs` à READY, puis `rendez-vous-qa --reel --confirmer-reel` en production (crée un lien d'essai, réserve un créneau fictif, ménage en finally) ; et Benj fixe ses vraies disponibilités (`DISPONIBILITES`, commit à part).
