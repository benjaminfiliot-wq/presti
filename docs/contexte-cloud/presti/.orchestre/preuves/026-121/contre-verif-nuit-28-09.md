# 026-121 — contre-vérification de la nuit du 28/09

Verifier (`node scripts/orchestre.mjs verifier 026-121`) : **PASS** (152 s), sans rejeu isolé.

Trace préexistante : `echecs-attendus.md` (12 sabotages du témoin revue-qa + 15 de chantier-qa, tous attrapés).

## Quatre sabotages nouveaux (production et fixtures, pas le témoin)

Chaque sabotage : copie dans le scratchpad, `sed`, `node scripts/juges-026-revue-chantier-preuve.mjs`, restauration par `cp -p`, sha256 identique à l'avant.
Les fichiers de preuve (`verifier.log`, `echecs-attendus.md`, `avant.txt`) ont été sauvegardés puis restaurés à l'octet près (`cmp`).

| # | fichier saboté | sabotage | code | critère rougi | restauré |
| --- | --- | --- | --- | --- | --- |
| S1 | docs/agents/chantier.md | `**Aucun connecteur**` → `**Un connecteur**` | 1 | P-2 `FAIL CT-5 — chantier.md ne dit pas « aucun connecteur »` (+ P-4 chantier-qa rouge, mais par une trace de pile) | oui (sha256) |
| S2 | docs/revues/GABARIT.md | `## Échecs` → `## Incidents` | 1 | P-2 et P-4 `FAIL RV-6 — GABARIT.md : section « ## Échecs » absente` | oui |
| S3 | scripts/fixtures/026/chantier/juges/rouge.mjs | `process.exit(0)` inconditionnel | 1 | P-3 `FAIL le juge proposé de la fiche conforme échoue sur un critère identifié` ; P-4 `fixtures : le juge « rouge » : code 0` ; CT-1 « juge vert avant la fabrication » | oui |
| S4 | scripts/fixtures/026/revue/attendu.json | codex `minutes_mediane_par_reussite` 270 → 271 | 1 | P-4 témoin `FAIL RV-1 — … attendu 271, obtenu 270` ; RV-4 `nombre absent des données : 270` | oui |

Sabotages rougis sur le bon critère : **4/4**. Le juge compare des valeurs, rejoue des juges proposés et lit le texte : pas de simple test de présence.

## Défauts

1. **Commit concurrent pendant S1** : le commit `1fe376ae` (autre session) a été pris pendant les deux minutes du sabotage S1 et contient donc `**Un connecteur**` dans `docs/agents/chantier.md`. La copie de travail est restaurée (`git diff` = cette seule ligne, retour à `**Aucun connecteur**`). **Il faut committer cette ligne** : sinon, au commit, CT-5 est rouge et la consigne dit l'inverse de la règle. Je n'ai pas commité (consigne).
2. Mineur : quand `chantier.md` perd « aucun connecteur », `chantier-qa --preuve-echecs` plante avec une trace de pile (`preuveEchecs`, ligne 549, dans le `pool` des sabotages) au lieu de sortir une ligne d'échec propre. Le résultat reste rouge.
