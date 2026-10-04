# 026-132 — contre-vérification de la production (4 sabotages réversibles)

Faite le 04/10/2026 (la fiche la nomme « 29-09 », date de sa rédaction) par claude-code. Production = `scripts/juges-026-station-ecran-mutations.mjs`.
Empreinte sha256 avant tout sabotage : `9203731F64BFA0FA97518574E283321C554AF5238BCDFFAF78136DCA730873B2` (37 236 octets). Elle a été relue après CHAQUE
sabotage et après chaque rétablissement : identique les quatre fois. Chaque sabotage est lancé par `node scripts/juges-026-station-ecran-mutations.mjs --seul=VU-3`
(témoin complet de `vues`, puis la mutation VU-3) ; le script doit sortir en code 1.

| # | sabotage de la production | ce que le script a vu (extrait réel) | code |
|---|---|---|---|
| 1 | mutation VU-3 neutralisée (`apres` = `avant`) | `✗ VU-3 — copie mutée en code 0 : la mutation PASSE, le juge ne l’attrape pas` | 1 |
| 2 | relais qui inverse ✅ et ❌ (`signe === '❌'`) | `FAIL témoin vues — code 1 en 67 s · pilotage-ecran-qa --partie=vues : FAIL — VU-1, VU-2, … VU-9` (le témoin devient rouge) | 1 |
| 3 | relais qui sort toujours en code 0 | `✗ VU-3 — copie mutée en code 0 : la mutation PASSE, le juge ne l’attrape pas` | 1 |
| 4 | texte muté non rétabli dans la copie (écriture de retour supprimée) | `FAIL 026-132 — exception : Error: app/controle/station/vues/Succes.tsx non rétabli dans la copie` ; la copie est ensuite supprimée | 1 |

Les quatre sabotages sont refusés par le script lui-même. Le méta-juge (MP-1 à MP-5) est lancé ensuite sur le script rétabli : voir `verifier.log`.
Après les sabotages, une seule modification a été ajoutée à la production : les fichiers `*.tmp.<pid>` d'une autre session sont ignorés par l'empreinte MU-3
(un `e/captures.mjs.tmp.15228…` d'une autre session a fait échouer MU-3 pendant le sabotage 2).

## Épreuve des mutations avant la fiche (mise au point, `--seul`, rien n'est PASS)

Les sept mutations de la partie station, sur un export de HEAD en fins de ligne LF (l'export `git archive` avec `core.autocrlf=true` met les fichiers en CRLF et fait
dire au juge « globals.css a bougé depuis la base » : artefact, pas une faute) :

| partie | témoin (juge complet) | mutations prises |
|---|---|---|
| station (HEAD) | PASS en 88 s | ST-4 (50 s), ST-11 globals.css (52 s), ST-16 (54 s : « animation en cours : mc-derive sur mc mc-bureau »), ST-18 (83 s), ST-14 (54 s), ST-3 (50 s), ST-11 sur :root (45 s) : 7 sur 7, chacune par SON critère |
| vues (arbre) | PASS en 23 s | VU-4 (15 s), VU-3 (11 s) : 2 sur 2 |
| fil (arbre) | PASS en 32 s | FL-5 (22 s : « une bulle a été ajoutée à la main avant que le fil serve la consigne ») : 1 sur 1 |
| gestes (arbre, témoin non joué) | rouge sur l'arbre (EG-13) | EG-4 (22 s), EG-9 (17 s), EG-12 (17 s) prises, la tranche intacte étant verte ; EG-13 : tranche intacte rouge, non éprouvée |
| salles | rouge (15 critères SA) | non éprouvées (SA-8, SA-15) |
| experience | rouge (EX-1 à EX-9, Experience.tsx est le cadre d'attente) | non éprouvée (EX-1) |

## Le méta-juge réel (`verifier.log`, 04/10 23 h 15, 34 min en tout)

`FAIL — MP-1, MP-2, MP-4` ; `PASS MP-3` (3 contre-mutations tirées, graine 672148581 : EG-4, SA-8 et SA-15 prises sur SA copie, chacune par sa ligne `FAIL <critère> — …`) ; `PASS MP-5`.
Le script a rendu : témoins verts vues (36 s), salles (107 s), fil (30 s), gestes (34 s) ; 9 mutations prises sur 17 (VU-3, VU-4, SA-8, SA-15, FL-5, EG-4, EG-9, EG-12, EG-13).
Les 8 autres : station (témoin non rendu en 9 min sur l'arbre, PC chargé ; juge relancé ensuite à la main : rouge ST-11, ST-14, ST-18 sur l'arbre) et experience (026-125 pas faite).
MP-4 : 109 fichiers d'autres sessions ont bougé pendant le passage (rien de la fiche : le script n'écrit que sous `.orchestre/travail/026-132/` et `.orchestre/preuves/026-132/`).
Empreinte sha256 finale de la production : `B2974C84B9DAAB08919AE3808D606A4C229ABBA178426027BF57AE86ED80EC38` (les sabotages ont été faits sur `9203731F…`, rétablie à l'octet ; seules deux lignes ont été ajoutées depuis : l'ignorance des `*.tmp.<pid>` et la cause détaillée d'un témoin rouge). Le juge `pilotage-ecran-qa.mjs`, le méta-juge et les jeux d'essai n'ont pas été modifiés par cette fiche.
