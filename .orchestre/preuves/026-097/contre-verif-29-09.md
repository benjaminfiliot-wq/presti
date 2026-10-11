# 026-097 — contre-vérification de la production (04/10/2026)

Méthode : chaque sabotage modifie UNE ligne de la production, relance le juge, puis restaure le fichier dans un `finally` ; le sha256 du
fichier est comparé à celui d'avant. Outil : `juge-propose/contre-verif-sabotages.mjs` (sortie brute : `contre-verif-brut.txt`).

**Le juge utilisé est le juge PROPOSÉ** (`juge-propose/atelier-maquettes-qa.mjs`), pas `scripts/atelier-maquettes-qa.mjs` : celui du dépôt
ne peut pas rendre PASS (voir `.orchestre/en-cours/026-097.question.md` : AM-6, AM-7, AM-8, AM-11 et AM-12 y sont figés en « route absente »,
AM-5 ne donne pas d'URL à `new Request`, AM-2 compare à la lettre « JJ/MM/AAAA »). Il est à appliquer par le chef avant le verdict officiel.

Production jugée (sha256 dans `sha256-production-finale.txt`) :

| Fichier | sha256 |
|---|---|
| app/api/usine/atelier/depot/route.ts | b1c3ebb21b63e34887ff629fd4464eac0f1a27843d31878d518c6e1d3bfafa90 |
| app/api/usine/atelier/lien/route.ts | 7804fd5ae031825a359727abc180d6e2126b4f5128df8bd31f1a52ae2647965b |
| app/api/usine/atelier/maquette/route.ts | 7b5c22d8c3538e7ce661472a89b525c8f1f779025ed0e65d3e99019e785e56dd |
| app/api/usine/atelier/travail/route.ts | f6d26b4e6fc1d54d7df26fd710b5e50d98820c91d80988a3c590f3d90f18e37a |
| lib/agents/acquisition/magasinUsine.ts | 992f735f0cf4e5a9537296c07bfa2c2c5e9e3f590002077845602df035cb8bb9 |
| scripts/agents/atelier-maquettes.mjs | 5d80ef938771e420892daf21a5145f2b3c1aac3976ec3b2cc98e1959a8ba7685 |

Témoin avant : code 0, aucun critère rouge. Témoin après les neuf sabotages : code 0, aucun critère rouge.

| # | Fichier | Sabotage | Critère rouge | Pris | sha256 restauré |
|---|---|---|---|---|---|
| S1 | maquette/route.ts | `enregistrerMaquettePrete` ne reçoit plus la table des objets : la page privée ne retrouverait aucun fichier, le lien envoyé serait mort | AM-7 | oui | identique |
| S2 | lien/route.ts | `creerLienMaquette` reçoit le jeton en clair au lieu de son SHA-256 | AM-8 | oui | identique |
| S3 | travail/route.ts | le plafond du jour des entrants (5) n'est plus appliqué | AM-6 | oui | identique |
| S4 | atelier-maquettes.mjs | une capture à structure JPEG intacte mais aux données compressées uniformes est acceptée | AM-4 | oui | identique |
| S5 | lien/route.ts | `siteAchatPublic` n'est plus lu : le lien de paiement part toujours | AM-12 | oui | identique |
| S6 | maquette/route.ts | la route accepte le jeton d'un autre agent (pas de 403) | AM-5 | oui | identique |
| S7 | atelier-maquettes.mjs | un coffre complet qui porte en plus une clé interdite (service Supabase, Stripe) démarre | AM-3 | oui | identique |
| S8 | lien/route.ts | le lien se crée sans mesurer l'occupation du stockage (60 %) | AM-8 | oui | identique |
| S9 | lien/route.ts | sur Meta, l'identifiant de la conversation est pris pour destinataire à la place de l'identifiant Meta | AM-11 | oui | identique |

Neuf sabotages sur neuf pris, les six fichiers de la production identiques à l'octet avant et après.

## Ce que le juge du dépôt laissait passer (corrigé dans le juge proposé, avec son auto-contrôle)

- **S4 n'était pas pris** avec l'échantillon « capture uniforme » du jeu d'essai (`scripts/fixtures/026-acquisition/maquettes/executeur-factice.mjs`) :
  il écrase aussi l'en-tête, le segment SOF disparaît, et l'image est refusée pour cette seule raison. Le contrôle d'uniformité de `jpegValide`
  (Codex) comptait en plus les octets des tables de l'en-tête (plus de 16 valeurs distinctes sans que les données le soient) : une capture
  blanche à structure intacte passait. Corrigé dans `atelier-maquettes.mjs` (le contrôle porte sur les seules données du scan : au moins 64 valeurs,
  aucune au-dessus de 50 %, les captures réelles ont 256 valeurs et au plus 16 %) et le juge proposé ajoute l'échantillon « structure intacte ».
- **S7 n'était pas pris** avec le coffre d'essai (`SUPABASE_SERVICE_ROLE_KEY=x` seul) : un coffre incomplet est refusé de toute façon. Le juge proposé
  essaie un coffre complet (les deux variables permises) plus une clé interdite, avec `PRESTI_URL` vers un port fermé.

## Défauts réels de la production reçue de Codex, vus par le juge proposé et corrigés

Le juge proposé, lancé sur la production telle que Codex l'a rendue (copie dans le scratchpad), est rouge sur AM-7, AM-8, AM-11 et AM-12 :

1. `maquette` n'enregistrait que `{ chemin, empreinte, variante }` : la base lit `objets` (`acq_maquette_prete`, 0106) et la page privée
   (`maquettesLien.ts`, `acq_maquette_par_jeton`) retrouve les fichiers par cette table : lien envoyé = page introuvable.
2. `lien` refusait tout (`409 etat`) : il attendait un champ `etat` que la ligne rendue par `acq_maquette_de` (`to_jsonb(ops.maquettes)`) n'a pas.
3. `lien` ignorait le résultat de `preparerEnvoi` (réponse `{ ok: true }` même si l'envoi était refusé).
4. `lien`, froid qui a dit « oui » sur Meta : `destinataire` = identifiant de la conversation au lieu de l'identifiant Meta de la personne.
5. `depot` et `maquette` ne voyaient pas les prospects de la variante A (candidats `prospectsPourMaquette(…, true)`) ; `maquette` ne vérifiait pas
   l'état du prospect et construisait une expression régulière avec un `prospect_id` non validé.
6. Le script jugeait le poids du dossier APRÈS les dépôts (fichiers orphelins dans le stockage), ne repartait pas d'un dossier vide, n'avait ni verrou
   (deux passes pouvaient fabriquer la même maquette) ni ménage des dossiers anciens, et n'ôtait pas les guillemets d'une valeur du coffre.
