# 026-097 — contre-vérification du 04/10/2026 (juge APPLIQUÉ, reprise après D-0410-4)

Complète `contre-verif-29-09.md` (même production, mêmes neuf sabotages, mais jugés alors par le juge PROPOSÉ).
Ici le juge est celui du dépôt, `scripts/atelier-maquettes-qa.mjs`, tel que le chef l'a accordé (D-0410-4). Outil :
`contre-verif-04-10.mjs` (sortie brute : `contre-verif-04-10-brut.txt`). Chaque sabotage change UNE ligne de la production,
relance le juge, puis restaure le fichier dans un `finally` ; le sha256 est comparé avant / après.

## Ce que cette passe a trouvé : le juge appliqué à 21:15 était périmé

Premier essai (sortie gardée : `contre-verif-04-10-brut-juge-obsolete.txt`) : **S4 et S7 NON PRIS** (7 sabotages sur 9).
Cause : le chef avait copié `atelier-maquettes-qa.pret-a-copier.mjs` (20:35), alors que le juge proposé a été renforcé à 20:38
(`atelier-maquettes-qa.mjs`, 710 lignes) avec les deux ajouts que D-0410-4 annonce pourtant : « uniforme à structure intacte »
(capture à structure JPEG complète dont seules les données compressées sont uniformes) et « coffre complet + clé interdite »
(les deux variables permises PLUS `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` ou `ANTHROPIC_API_KEY` : code 3 attendu).
Le `.diff` et le `pret-a-copier` n'avaient pas été régénérés après 20:38.

Correction, dans le périmètre de la décision (elle ne fait qu'AJOUTER des vérifications, aucune assertion n'est retirée ni
assouplie) : `scripts/atelier-maquettes-qa.mjs` = le juge proposé de 20:38, imports `../../../../scripts/fixtures/` réécrits en
`./fixtures/` (5 lignes ; seule autre différence avec le `pret-a-copier` : les deux ajouts ci-dessus, 23 lignes de plus).
Empreintes : juge périmé (CRLF) `3c0961b25c20…` → juge complété `91c81be33be5…` (CRLF, comme l'arbre de travail).

## Résultat avec le juge complété

Production jugée (sha256 identiques à `sha256-production-finale.txt`, inchangée) : témoin avant code 0 ; témoin après les neuf sabotages code 0.

| # | Fichier | Sabotage | Critère rouge | Pris | sha256 restauré |
|---|---|---|---|---|---|
| S1 | maquette/route.ts | `enregistrerMaquettePrete` ne reçoit plus la table des objets | AM-7 | oui | identique |
| S2 | lien/route.ts | `creerLienMaquette` reçoit le jeton en clair | AM-8 | oui | identique |
| S3 | travail/route.ts | le plafond du jour des entrants (5) n'est plus appliqué | AM-6 | oui | identique |
| S4 | atelier-maquettes.mjs | capture à structure intacte mais données uniformes acceptée | AM-4 | oui | identique |
| S5 | lien/route.ts | `siteAchatPublic` n'est plus lu : le paiement part toujours | AM-12 | oui | identique |
| S6 | maquette/route.ts | la route accepte le jeton d'un autre agent | AM-5 | oui | identique |
| S7 | atelier-maquettes.mjs | coffre complet + clé interdite démarre | AM-3 | oui | identique |
| S8 | lien/route.ts | le lien se crée sans mesurer l'occupation (60 %) | AM-8 | oui | identique |
| S9 | lien/route.ts | sur Meta, l'id de la conversation pris pour destinataire | AM-11 | oui | identique |

Neuf sur neuf, six fichiers de production identiques à l'octet avant et après. `node scripts/orchestre.mjs verifier 026-097` : PASS 12/12.

## Hors périmètre, déjà consigné (D-0410-4)

La lecture `reponseOuiDe(prospect_id)` (contrat.ts, magasinSupabase.ts, migration) manque : tant qu'elle manque, `lien` d'un froid refuse
sans rien envoyer ; les entrants fonctionnent. Suite à ouvrir, non faite ici.
