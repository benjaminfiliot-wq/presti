# Contre-vérification par sabotage — 026-124 (28/09)

Quatre défauts réversibles introduits dans la production (jamais dans le juge lui-même), un par un, pour prouver que
`scripts/socle-pubs-qa.mjs` (lancé en clair : `node scripts/socle-pubs-qa.mjs`, hors `--racine`/`--temoin`) détecte
vraiment une régression et ne se contente pas de constater l'existence des fichiers. Chaque sabotage : sha256 du
fichier avant modification, modification d'une ligne, `node scripts/socle-pubs-qa.mjs` relancé en entier, verdict
lu, fichier restauré à l'identique, sha256 revérifié après restauration. Chaque cycle est repassé sur le disque réel
(le même que `--temoin` juge) — jamais dans une copie.

## Sabotage 1 — `scripts/video-qa.mjs` : plafond de poids du profil pub-locale trop bas

- **sha256 avant** : `572b5b0186e57055f11ab07bc6f921f86c96590c7d7efc2affb8831bfdbf56f4`
- **Modification** : `PUB_LOCALE.POIDS_MAX: 8_000_000` → `1_000_000` (le film conforme pèse 6,7 Mo : le plafond
  sabordé le refuse à tort).
- **Verdict attendu** : SP-1 seul en échec (« Poids (pub locale) »). SP-2 à SP-8 restent PASS.
- **Verdict obtenu** : conforme — `FAIL SP-1 — code 1 sur le film conforme : Poids (pub locale)`, SP-2 à SP-8 PASS.
- **sha256 après restauration** : `572b5b0186e57055f11ab07bc6f921f86c96590c7d7efc2affb8831bfdbf56f4` — identique.

## Sabotage 2 — `scripts/visages-qa.mjs` : empreinte du modèle décalée d'un caractère

- **sha256 avant** : `72b78dbf170cbb773457e54c1eafc934f8018a73cb18e6830a941f4aee443ab1`
- **Modification** : dernier caractère hex de `EMPREINTE` changé (`…52fa4` → `…52fa5`) — le vrai modèle, inchangé
  sur le disque, ne correspond plus à l'empreinte épinglée.
- **Verdict attendu** : SP-4 en échec (le vrai modèle est refusé, code 2) — et, en cascade légitime, SP-5, SP-6,
  SP-7 (qui appellent tous `visages-qa.mjs`, désormais incapable de tourner sur quoi que ce soit).
- **Verdict obtenu** : conforme — `FAIL SP-4/SP-5/SP-6/SP-7` (« empreinte du modèle différente de celle épinglée »
  sur chacun) ; SP-1, SP-2, SP-3 (qui ne dépendent pas de `visages-qa.mjs`) restent PASS ; SP-8 reste PASS aussi
  (deux refus identiques sont, à la lettre, deux passages identiques — la défense en profondeur du modèle ne casse
  pas la mesure de déterminisme, c'est attendu).
- **sha256 après restauration** : `72b78dbf170cbb773457e54c1eafc934f8018a73cb18e6830a941f4aee443ab1` — identique.

## Sabotage 3 — `scripts/visages-qa.mjs` : seuil de détection par défaut relevé à 0,99

- **sha256 avant** : `72b78dbf170cbb773457e54c1eafc934f8018a73cb18e6830a941f4aee443ab1`
- **Modification** : `seuil = 0.9` → `seuil = 0.99` (le portrait témoin score 0,939 seul et 0,917 incrusté : les
  deux tombent sous un seuil sabordé à 0,99 et ne sont plus rapportés du tout).
- **Verdict attendu** : SP-6 en échec (portrait non détecté, seul et incrusté) — et SP-7 en cascade légitime (le
  même portrait, dans le film de 4 s, tombe aussi sous 0,99 et n'est plus détecté nulle part, y compris dans la
  fenêtre correcte).
- **Verdict obtenu** : conforme — `FAIL SP-6 — … aucune détection … × 2` et `FAIL SP-7 — aucune détection sur le
  film de 4 s` ; SP-1 à SP-5 et SP-8 restent PASS.
- **sha256 après restauration** : `72b78dbf170cbb773457e54c1eafc934f8018a73cb18e6830a941f4aee443ab1` — identique.

## Sabotage 4 — `scripts/visages-qa.mjs` : horodatage des cadres vidéo décalé de 0,5 s

- **sha256 avant** : `72b78dbf170cbb773457e54c1eafc934f8018a73cb18e6830a941f4aee443ab1`
- **Modification** : `instant: i / ips` → `instant: i / ips + 0.5` dans l'extraction des cadres vidéo (chaque
  horodatage rapporté est décalé d'une demi-seconde vers l'avant).
- **Verdict attendu** : SP-7 en échec (les détections, réellement à 2,00–2,75 s dans le film, sont rapportées à
  2,50–3,25 s : la dernière sort de la fenêtre [2, 3] s). Les autres critères, qui ne lisent pas l'horodatage vidéo
  de `visages-qa.mjs` (SP-5/SP-6/SP-8 travaillent sur des images fixes, `instant: null`, jamais touché par ce
  calcul), restent intacts.
- **Verdict obtenu** : conforme — `FAIL SP-7 — détection(s) hors de [2, 3] s : 3.25 s`, seul en échec ; SP-1 à SP-6
  et SP-8 PASS.
- **sha256 après restauration** : `72b78dbf170cbb773457e54c1eafc934f8018a73cb18e6830a941f4aee443ab1` — identique.

## Bilan

Quatre sabotages, quatre critères rougis pour la bonne raison (lue dans le détail de l'échec, pas seulement le
code retour), aucun débordement sur un critère qui n'avait pas de raison de bouger, les trois fichiers de
production restaurés octet pour octet (sha256 identique avant/après pour chacun). `node scripts/socle-pubs-qa.mjs`
relancé une dernière fois après le quatrième retour en arrière : `socle-pubs-qa : PASS` (SP-1 à SP-8), comme avant
le premier sabotage.
