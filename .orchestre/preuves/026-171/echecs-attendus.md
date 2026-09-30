# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:t:debut -->
## Lot t — fiche 026-171 — référence `1c87006`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=t` le 2026-09-30T16:42:34Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-t`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| station-themes-qa --partie=modules | TH-1 | 1 | ❌ TH-1 lib/pilotage/theme.ts n'existe pas (ou est vide) ; lib/pilotage/disposition.ts n'existe pas (ou est vide) ; lib/pilotage/reglages.ts n'existe pas (ou est vide) | PASS, code 0 (TH-1, TH-2, TH-3, TH-4, TH-5, TH-6) | PASS, code 0, 6 critères verts | 38/38 (import-supabase → ❌ TH-1, date-now → ❌ TH-1, math-random → ❌ TH-1, fetch-dans-le-theme → ❌ TH-1, disposition-retiree → ❌ TH-1, couleur-libre-dans-le-theme → ❌ TH-2, reservee-avec-un-poste-toleree → ❌ TH-2, champ-inconnu-tolere → ❌ TH-2, portrait-ignore → ❌ TH-2, liste-des-themes-ouverte → ❌ TH-2, tapis-qui-saute-tolere → ❌ TH-2, reservee-deplacable → ❌ TH-3, reservee-renommable → ❌ TH-3, deux-salles-dans-un-emplacement-tolere → ❌ TH-3, salle-sans-emplacement-toleree → ❌ TH-3, portrait-non-verifie → ❌ TH-3, salle-debranchee-toleree → ❌ TH-3, tapis-rompu-tolere → ❌ TH-3, etape-hors-du-tapis-toleree → ❌ TH-3, emplacement-inconnu-tolere → ❌ TH-3, taille-non-bornee → ❌ TH-4, nom-de-17-signes → ❌ TH-4, plaque-de-25-signes → ❌ TH-4, titre-de-33-signes → ❌ TH-4, couleur-libre-dans-les-reglages → ❌ TH-4, cles-permises-non-rendues → ❌ TH-4, avatar-hors-liste-tolere → ❌ TH-4, surcharge-de-root-permise → ❌ TH-4, heure-de-nuit-24 → ❌ TH-4, disposition-oubliee → ❌ TH-4, fusion-superficielle → ❌ TH-5, fusion-qui-modifie-les-defauts → ❌ TH-5, fusion-qui-pollue-les-prototypes → ❌ TH-5, pose-sur-le-document → ❌ TH-6, titre-pose-en-html → ❌ TH-6, jeton-libre-pose → ❌ TH-6, mise-en-page-oubliee → ❌ TH-6, couleur-invalide-sans-repli → ❌ TH-6) |
| station-themes-qa --theme=station | TH-7 | 1 | ❌ TH-7 theme.json absent de .orchestre/travail/juges-026-pilotage/reference/public/station/themes/station | PASS, code 0 (TH-7, TH-8, TH-9, TH-10, TH-12, TH-11) | PASS, code 0, 6 critères verts | 17/17 (cle-du-theme-changee → ❌ TH-7, reservee-avec-un-poste → ❌ TH-7, portrait-retire → ❌ TH-7, coursive-coupee-au-bureau → ❌ TH-8, coursive-coupee-en-portrait → ❌ TH-8, trace-du-tapis-rompu → ❌ TH-8, fond-retire → ❌ TH-9, atlas-retire → ❌ TH-9, pack-hors-du-lot-a → ❌ TH-10, licence-cc-by → ❌ TH-10, pack-sans-auteur → ❌ TH-10, licence-retiree → ❌ TH-10, starnet-dans-le-nom → ❌ TH-12, starnet-dans-la-licence → ❌ TH-12, adresse-dans-une-plaque → ❌ TH-12, champ-de-code → ❌ TH-12, theme-trop-lourd → ❌ TH-9) |
| station-themes-qa --theme=vaisseau | TH-7 | 1 | ❌ TH-7 theme.json absent de .orchestre/travail/juges-026-pilotage/reference/public/station/themes/vaisseau | PASS, code 0 (TH-7, TH-8, TH-9, TH-10, TH-12, TH-11) | PASS, code 0, 6 critères verts | 17/17 (cle-du-theme-changee → ❌ TH-7, reservee-avec-un-poste → ❌ TH-7, portrait-retire → ❌ TH-7, coursive-coupee-au-bureau → ❌ TH-8, coursive-coupee-en-portrait → ❌ TH-8, trace-du-tapis-rompu → ❌ TH-8, fond-retire → ❌ TH-9, atlas-retire → ❌ TH-9, pack-hors-du-lot-a → ❌ TH-10, licence-cc-by → ❌ TH-10, pack-sans-auteur → ❌ TH-10, licence-retiree → ❌ TH-10, starnet-dans-le-nom → ❌ TH-12, starnet-dans-la-licence → ❌ TH-12, adresse-dans-une-plaque → ❌ TH-12, champ-de-code → ❌ TH-12, deux-themes-trop-lourds → ❌ TH-9) |
| ecommerce-reservee-qa --base=1c87006aa35a152cb918ab368225e1976a1328da | EC-1 | 1 | ❌ EC-1 0 déclaration(s) de « ecommerce » dans FLAGS, une seule attendue ; FLAGS.ecommerce vaut undefined et actif('ecommerce') undefined : false et false attendus | PASS, code 0 (EC-1, EC-2, EC-3, EC-4, EC-5) | PASS, code 0, 5 critères verts | 17/17 (drapeau-leve → ❌ EC-1, commentaire-retire → ❌ EC-1, commentaire-sans-les-videos → ❌ EC-1, drapeau-declare-deux-fois → ❌ EC-1, carte-en-lu → ❌ EC-2, carte-sans-la-ligne → ❌ EC-2, note-sans-reservee → ❌ EC-2, lisez-moi-sans-rien-construit → ❌ EC-3, lisez-moi-sans-les-videos → ❌ EC-3, lisez-moi-sans-le-drapeau → ❌ EC-3, lisez-moi-retire → ❌ EC-3, table-ecommerce → ❌ EC-4, table-ecommerce-entre-guillemets → ❌ EC-4, autre-drapeau-ajoute → ❌ EC-5, autre-drapeau-leve → ❌ EC-5, ligne-de-carte-retiree → ❌ EC-5, ligne-de-carte-ajoutee → ❌ EC-5) |
<!-- lot:t:fin -->

<!-- t-hors-ligne:debut -->
## Lot t (partie hors ligne) — sabotages du témoin et critère qui rougit

Écrit à la main par la session cloud du 30/09 (les sections « lot t » ci-dessus sont réécrites par la preuve). Chaque sabotage remplace UN texte du témoin `scripts/fixtures/026-pilotage/t/temoin/` (ou retire un fichier) ; le juge, lancé sur l'arbre témoin ainsi saboté, doit sortir en code 1 avec `❌ <critère>`. « Premier resté vert » : le premier critère du juge (TH-1, TH-7, EC-1) est encore vert, donc le sabotage est de CONTENU (un juge qui ne regarde que la présence des fichiers le laisserait passer). Éprouvés deux fois : hors preuve (pilote de sabotages, mêmes textes) puis par `juges-026-pilotage-preuve --lot=t` (JA-8 : 38 + 17 + 17 + 17 = 89 sabotages vus).

### station-themes-qa.mjs --partie=modules

| Sabotage | Fichier du témoin | Critère qui rougit | Critères rouges observés | Premier critère resté vert |
|---|---|---|---|---|
| import-supabase | `lib/pilotage/reglages.ts` | TH-1 | TH-1,TH-2,TH-3,TH-4,TH-5,TH-6 | non |
| date-now | `lib/pilotage/disposition.ts` | TH-1 | TH-1,TH-2,TH-3,TH-4,TH-5,TH-6 | non |
| math-random | `lib/pilotage/reglages.ts` | TH-1 | TH-1,TH-2,TH-3,TH-4,TH-5,TH-6 | non |
| fetch-dans-le-theme | `lib/pilotage/theme.ts` | TH-1 | TH-1,TH-2,TH-3,TH-4,TH-5,TH-6 | non |
| disposition-retiree | `lib/pilotage/disposition.ts` (retiré) | TH-1 | TH-1,TH-2,TH-3,TH-4,TH-5,TH-6 | non |
| couleur-libre-dans-le-theme | `lib/pilotage/theme.ts` | TH-2 | TH-2 | oui (contenu) |
| reservee-avec-un-poste-toleree | `lib/pilotage/theme.ts` | TH-2 | TH-2 | oui (contenu) |
| champ-inconnu-tolere | `lib/pilotage/theme.ts` | TH-2 | TH-2 | oui (contenu) |
| portrait-ignore | `lib/pilotage/theme.ts` | TH-2 | TH-2 | oui (contenu) |
| liste-des-themes-ouverte | `lib/pilotage/theme.ts` | TH-2 | TH-2 | oui (contenu) |
| tapis-qui-saute-tolere | `lib/pilotage/theme.ts` | TH-2 | TH-2 | oui (contenu) |
| reservee-deplacable | `lib/pilotage/disposition.ts` | TH-3 | TH-3,TH-4 | oui (contenu) |
| reservee-renommable | `lib/pilotage/disposition.ts` | TH-3 | TH-3,TH-4 | oui (contenu) |
| deux-salles-dans-un-emplacement-tolere | `lib/pilotage/disposition.ts` | TH-3 | TH-3,TH-4 | oui (contenu) |
| salle-sans-emplacement-toleree | `lib/pilotage/disposition.ts` | TH-3 | TH-3 | oui (contenu) |
| portrait-non-verifie | `lib/pilotage/disposition.ts` | TH-3 | TH-3 | oui (contenu) |
| salle-debranchee-toleree | `lib/pilotage/disposition.ts` | TH-3 | TH-3 | oui (contenu) |
| tapis-rompu-tolere | `lib/pilotage/disposition.ts` | TH-3 | TH-3 | oui (contenu) |
| etape-hors-du-tapis-toleree | `lib/pilotage/disposition.ts` | TH-3 | TH-3 | oui (contenu) |
| emplacement-inconnu-tolere | `lib/pilotage/disposition.ts` | TH-3 | TH-3 | oui (contenu) |
| taille-non-bornee | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| nom-de-17-signes | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| plaque-de-25-signes | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| titre-de-33-signes | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| couleur-libre-dans-les-reglages | `lib/pilotage/reglages.ts` | TH-4 | TH-4,TH-6 | oui (contenu) |
| cles-permises-non-rendues | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| avatar-hors-liste-tolere | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| surcharge-de-root-permise | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| heure-de-nuit-24 | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| disposition-oubliee | `lib/pilotage/reglages.ts` | TH-4 | TH-4 | oui (contenu) |
| fusion-superficielle | `lib/pilotage/reglages.ts` | TH-5 | TH-5 | oui (contenu) |
| fusion-qui-modifie-les-defauts | `lib/pilotage/reglages.ts` | TH-5 | TH-5 | oui (contenu) |
| fusion-qui-pollue-les-prototypes | `lib/pilotage/reglages.ts` | TH-5 | TH-5 | oui (contenu) |
| pose-sur-le-document | `lib/pilotage/reglages.ts` | TH-6 | TH-6 | oui (contenu) |
| titre-pose-en-html | `lib/pilotage/reglages.ts` | TH-6 | TH-6 | oui (contenu) |
| jeton-libre-pose | `lib/pilotage/reglages.ts` | TH-6 | TH-6 | oui (contenu) |
| mise-en-page-oubliee | `lib/pilotage/reglages.ts` | TH-6 | TH-6 | oui (contenu) |
| couleur-invalide-sans-repli | `lib/pilotage/reglages.ts` | TH-6 | TH-6 | oui (contenu) |

### station-themes-qa.mjs --theme=station

| Sabotage | Fichier du témoin | Critère qui rougit | Critères rouges observés | Premier critère resté vert |
|---|---|---|---|---|
| cle-du-theme-changee | `public/station/themes/station/theme.json` | TH-7 | TH-7 | non |
| reservee-avec-un-poste | `public/station/themes/station/theme.json` | TH-7 | TH-7 | non |
| portrait-retire | `public/station/themes/station/theme.json` | TH-7 | TH-7 | non |
| coursive-coupee-au-bureau | `public/station/themes/station/theme.json` | TH-8 | TH-8 | oui (contenu) |
| coursive-coupee-en-portrait | `public/station/themes/station/theme.json` | TH-8 | TH-8 | oui (contenu) |
| trace-du-tapis-rompu | `public/station/themes/station/theme.json` | TH-8 | TH-7,TH-8 | non |
| fond-retire | `public/station/themes/station/fond.webp` (retiré) | TH-9 | TH-9 | oui (contenu) |
| atlas-retire | `public/station/themes/station/atlas.png` (retiré) | TH-9 | TH-9 | oui (contenu) |
| pack-hors-du-lot-a | `public/station/themes/station/licence.json` | TH-10 | TH-10 | oui (contenu) |
| licence-cc-by | `public/station/themes/station/licence.json` | TH-10 | TH-10 | oui (contenu) |
| pack-sans-auteur | `public/station/themes/station/licence.json` | TH-10 | TH-10 | oui (contenu) |
| licence-retiree | `public/station/themes/station/licence.json` (retiré) | TH-10 | TH-10 | oui (contenu) |
| starnet-dans-le-nom | `public/station/themes/station/theme.json` | TH-12 | TH-12 | oui (contenu) |
| starnet-dans-la-licence | `public/station/themes/station/licence.json` | TH-12 | TH-12 | oui (contenu) |
| adresse-dans-une-plaque | `public/station/themes/station/theme.json` | TH-12 | TH-7,TH-12 | non |
| champ-de-code | `public/station/themes/station/theme.json` | TH-12 | TH-7,TH-12 | non |
| theme-trop-lourd | `public/station/themes/station/licence.json` | TH-9 | TH-9 | oui (contenu) |

### station-themes-qa.mjs --theme=vaisseau

| Sabotage | Fichier du témoin | Critère qui rougit | Critères rouges observés | Premier critère resté vert |
|---|---|---|---|---|
| cle-du-theme-changee | `public/station/themes/vaisseau/theme.json` | TH-7 | TH-7 | non |
| reservee-avec-un-poste | `public/station/themes/vaisseau/theme.json` | TH-7 | TH-7 | non |
| portrait-retire | `public/station/themes/vaisseau/theme.json` | TH-7 | TH-7 | non |
| coursive-coupee-au-bureau | `public/station/themes/vaisseau/theme.json` | TH-8 | TH-8 | oui (contenu) |
| coursive-coupee-en-portrait | `public/station/themes/vaisseau/theme.json` | TH-8 | TH-8 | oui (contenu) |
| trace-du-tapis-rompu | `public/station/themes/vaisseau/theme.json` | TH-8 | TH-7,TH-8 | non |
| fond-retire | `public/station/themes/vaisseau/fond.webp` (retiré) | TH-9 | TH-9 | oui (contenu) |
| atlas-retire | `public/station/themes/vaisseau/atlas.png` (retiré) | TH-9 | TH-9 | oui (contenu) |
| pack-hors-du-lot-a | `public/station/themes/vaisseau/licence.json` | TH-10 | TH-10 | oui (contenu) |
| licence-cc-by | `public/station/themes/vaisseau/licence.json` | TH-10 | TH-10 | oui (contenu) |
| pack-sans-auteur | `public/station/themes/vaisseau/licence.json` | TH-10 | TH-10 | oui (contenu) |
| licence-retiree | `public/station/themes/vaisseau/licence.json` (retiré) | TH-10 | TH-10 | oui (contenu) |
| starnet-dans-le-nom | `public/station/themes/vaisseau/theme.json` | TH-12 | TH-12 | oui (contenu) |
| starnet-dans-la-licence | `public/station/themes/vaisseau/licence.json` | TH-12 | TH-12 | oui (contenu) |
| adresse-dans-une-plaque | `public/station/themes/vaisseau/theme.json` | TH-12 | TH-7,TH-12 | non |
| champ-de-code | `public/station/themes/vaisseau/theme.json` | TH-12 | TH-7,TH-12 | non |
| deux-themes-trop-lourds | `public/station/themes/station/licence.json` | TH-9 | TH-9 | oui (contenu) |

### ecommerce-reservee-qa.mjs --base=<référence>

| Sabotage | Fichier du témoin | Critère qui rougit | Critères rouges observés | Premier critère resté vert |
|---|---|---|---|---|
| drapeau-leve | `lib/flags.ts` | EC-1 | EC-1,EC-5 | non |
| commentaire-retire | `lib/flags.ts` | EC-1 | EC-1 | non |
| commentaire-sans-les-videos | `lib/flags.ts` | EC-1 | EC-1 | non |
| drapeau-declare-deux-fois | `lib/flags.ts` | EC-1 | EC-1,EC-5 | non |
| carte-en-lu | `scripts/fermeture-e2e.mjs` | EC-2 | EC-2,EC-5 | oui (contenu) |
| carte-sans-la-ligne | `scripts/fermeture-e2e.mjs` | EC-2 | EC-2 | oui (contenu) |
| note-sans-reservee | `scripts/fermeture-e2e.mjs` | EC-2 | EC-2 | oui (contenu) |
| lisez-moi-sans-rien-construit | `docs/ecommerce/LISEZMOI.md` | EC-3 | EC-3 | oui (contenu) |
| lisez-moi-sans-les-videos | `docs/ecommerce/LISEZMOI.md` | EC-3 | EC-3 | oui (contenu) |
| lisez-moi-sans-le-drapeau | `docs/ecommerce/LISEZMOI.md` | EC-3 | EC-3 | oui (contenu) |
| lisez-moi-retire | `docs/ecommerce/LISEZMOI.md` (retiré) | EC-3 | EC-3 | oui (contenu) |
| table-ecommerce | `supabase/migrations/0998_reservee_note.sql` | EC-4 | EC-4 | oui (contenu) |
| table-ecommerce-entre-guillemets | `supabase/migrations/0998_reservee_note.sql` | EC-4 | EC-4 | oui (contenu) |
| autre-drapeau-ajoute | `lib/flags.ts` | EC-5 | EC-5 | oui (contenu) |
| autre-drapeau-leve | `lib/flags.ts` | EC-5 | EC-5 | oui (contenu) |
| ligne-de-carte-retiree | `scripts/fermeture-e2e.mjs` | EC-5 | EC-5 | oui (contenu) |
| ligne-de-carte-ajoutee | `scripts/fermeture-e2e.mjs` | EC-5 | EC-5 | oui (contenu) |

Non testé par un sabotage du témoin (aucun fichier de l'arbre ne peut le fausser) : **TH-11**, qui juge les pièges du jeu d'essai `t/themes-pieges/` (17 thèmes abîmés) ; il est éprouvé par le contrôle JA-3 du lot (le témoin dérivé est refabriqué et comparé) et par les 17 pièges eux-mêmes (chacun doit être refusé avec sa raison, sinon `❌ TH-11`). Sabotage écarté après essai : « adresses-non-vues » (theme.ts) — un mutant équivalent : `texte()` et les motifs de chaque champ refusent déjà toute adresse.

<!-- t-hors-ligne:fin -->

<!-- lot:tb:debut -->
## Lot tb — fiche 026-171 — référence `1c87006`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=tb` le 2026-09-30T16:42:36Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-tb`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| station-reglages-qa --base=1c87006aa35a152cb918ab368225e1976a1328da | RX-1 | 1 | ❌ RX-1 app/api/controle/station/reglages/route.ts absent | PASS, code 0 (RX-HARNAIS, RX-1, RX-2, RX-3, RX-4, RX-5, RX-6, RX-7, RX-8) | PASS, code 0, 8 critères verts | 21/21 (put-drapeau-apres-la-garde → ❌ RX-1, get-sans-drapeau → ❌ RX-1, put-estfondateur → ❌ RX-2, put-domaine-sante → ❌ RX-2, get-verbe-ecrire → ❌ RX-2, get-panne-en-500 → ❌ RX-2, get-sans-date → ❌ RX-2, verdict-ignore → ❌ RX-3, liste-des-cles-retiree → ❌ RX-3, journal-false-ignore → ❌ RX-4, journal-apres-l-ecriture → ❌ RX-4, perimee-en-503 → ❌ RX-4, journal-sans-version → ❌ RX-4, plafond-31 → ❌ RX-5, compteur-par-appel → ❌ RX-5, carte-sans-la-route → ❌ RX-6, carte-ligne-en-trop → ❌ RX-6, ecriture-directe → ❌ RX-7, type-faux-dans-la-route → ❌ RX-8, action-absente-de-l-union → ❌ RX-8, route-retiree → ❌ RX-1) |
| poste-extraction-qa --base=1c87006aa35a152cb918ab368225e1976a1328da | XT-1 | 1 | ❌ XT-1 lib/controle/lectures/ absent ; app/api/controle/barre/route.ts n'importe pas santeService ; app/api/controle/barre/route.ts calcule encore lui-même (\bfetch\s*\() au lieu d'appeler santeService() ; app/api/controle/barre/route.ts calcule encore lui-même (api\/controle\/etat) au lieu d'appele | PASS, code 0 (XT-HARNAIS, XT-1, XT-2, XT-3, XT-4, XT-5) | PASS, code 0, 5 critères verts | 15/15 (index-des-lectures-retire → ❌ XT-1, route-recalcule-les-crons → ❌ XT-1, barre-ordre-des-cles → ❌ XT-2, clients-un-credit-de-plus → ❌ XT-2, audience-historique-inversee → ❌ XT-2, bans-quatre-cents-abus → ❌ XT-2, cerveaux-premiere-entree → ❌ XT-2, crons-seuil-cent-fois → ❌ XT-2, sante-sans-accent → ❌ XT-2, tickets-le-sujet → ❌ XT-3, tickets-les-fermes → ❌ XT-3, tickets-toutes-les-colonnes → ❌ XT-3, audience-sans-drapeau → ❌ XT-4, clients-ne-lit-plus-apports → ❌ XT-4, type-faux-dans-une-lecture → ❌ XT-5) |
<!-- lot:tb:fin -->
