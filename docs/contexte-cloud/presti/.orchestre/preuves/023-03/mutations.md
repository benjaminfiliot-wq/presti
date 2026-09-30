# Contre-vérification 023-03

## Témoins

- TF — PASS — ✓ suite du socle : PASS — rien ne change sans famille, feuille de bureau non bloquante au téléphone, crédits de vidéo avec lien de licence, Lighthouse tenu, socle intact
- TS — FAIL — ✗ signature au repos : FAIL — démo gelée modifiée : kit ; barre retenue : ✗ barre retenue : FAIL — démo gelée modifiée : kit (1 fichier(s))

## Mutations

| Mutation | Ce qui est cassé | Critère attendu en échec | Extrait réel du verdict |
|---|---|---|---|
| M1 REFUSÉE | bureau.css est ecrit dans une sortie sans famille | SS-1 ou SS-5 refuse bureau.css sans famille | SS-1 : sans famille, la sortie diffère de celle de 021-01 (bureau.css) ; SS-1 : bureau.css ou son lien présent sans famille ; SS-5 : familles-socle-qa.mjs en échec |
| M2 REFUSÉE | le lien bureau.css perd media="(min-width: 1024px)" | SS-2 refuse le lien bureau.css non conditionne | SS-2 : 7 page(s) sur 7 sans le lien bureau.css juste après styles.css (confidentialite/index.html, index.html, mentions-legales/index.html) ; SS-2 : au téléphone, bureau.css est demandée en priorité VeryHigh (bloquante) |
| M3 REFUSÉE | signature-saut, animation non autorisee, joue au telephone | telephone 390x844 signale animation inattendue signature-saut | téléphone 390×844 : animation inattendue signature-saut ; barre retenue : ✗ barre retenue : FAIL — démo gelée modifiée : kit (1 fichier(s)) |
| M4 REFUSÉE | signature-tourne-2 anime la propriete interdite top | le juge signale que signature-tourne-2 anime top | signature-tourne-2 anime top (seuls rotate, scale, translate, transform, opacity) ; téléphone 390×844 : signature-tourne-2 anime top (seuls rotate, scale, translate, transform, opacity) ; barre retenue : ✗ barre retenue : FAIL — démo gelée modifiée : kit (1 fichier(s)) |
| M5 REFUSÉE | signature-tourne-2 joue au telephone en mouvement reduit | le telephone en mouvement reduit refuse signature-tourne-2 actif | téléphone mouvement réduit 390×844 : signature-tourne-2 actif (aucune signature attendue) ; barre retenue : ✗ barre retenue : FAIL — démo gelée modifiée : kit (1 fichier(s)) |

Verdict : FAIL.
