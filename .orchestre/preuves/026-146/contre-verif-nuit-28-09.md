# 026-146 — contre-vérification, nuit du 28/09

## Verdict

- La fiche était dans `refuse/` (et non dans `fait/`) après le FAIL de 05:43Z (CT-1/CT-3, « juge déjà vert avant fabrication »), antérieur à la validation du juge.
- Juges lancés directement : revue-qa 6/6, chantier-qa 7/7.
- `verifier-isole.sh` : deux FAIL, **tous deux des artefacts de la copie isolée**, pas de la production :
  1. RV-4 plante : `git worktree add` avec `core.autocrlf=true` extrait `document-ok.md` en CRLF, or `revue-qa.mjs` (`rempl`) cherche des chaînes contenant `\n` → « introuvable ». Le juge est sensible à la fin de ligne (hors périmètre, à signaler).
  2. Rejoué avec `core.autocrlf=false` (par variable d'environnement) : CT-5 échoue, car HEAD contient `docs/agents/chantier.md` avec « **Un connecteur** » (sabotage de 026-121 resté dans un commit ?) ; la copie de travail, non commitée, dit « **Aucun connecteur** ». À commiter par la ligne qui possède `docs/`.
- La fiche a été déplacée de `refuse/` vers `fait/`, puis `node scripts/orchestre.mjs verifier 026-146` a donné **PASS** (05:50:01Z, 14 s, code 0).

## Sabotages (production seulement, sauvegarde dans le scratchpad, restauration octet pour octet contrôlée par sha256)

| # | Sabotage | Fichier | Critère rougi | Restauration |
|---|---|---|---|---|
| S1 | fuseau `UTC` au lieu de `Europe/Paris` | revue-donnees.mjs | RV-1 (+ RV-2, RV-3, RV-5) : antigravity.pass attendu 3, obtenu 4 | identique |
| S2b | `argent` absent → `{}` au lieu de « non mesuré » | revue-donnees.mjs | RV-2 : argent vaut {}, attendu « non mesuré » | identique |
| S6 | lignes illisibles de agents.jsonl oubliées | revue-donnees.mjs | RV-3 : lignes_illisibles vaut 2, attendu 3 | identique |
| S3b | juge proposé vert accepté (les deux branches) | chantier.mjs | CT-1 (juge-vert : code 0, attendu 1) + CT-3 (requête au serveur avant la vérification) | identique |
| S4 | e2e *modifié* permis à la fusion (statut `A` retiré) | chantier.mjs | CT-2 : un test e2e existant modifié, code 0, attendu 1 | identique |
| S5 | zone protégée ignorée pour un exécutant non claude-code | chantier.mjs | CT-1 : executant-antigravity, code 0, attendu 1 | identique |

**6 sabotages rougis sur le bon critère.**

Deux essais restés verts, sans faille du juge :
- S2 (la réponse 401 lue comme un état) : le corps du 401 du faux serveur n'a ni `argent` ni `entonnoir` ni `genere_le`, donc la sortie est la même (« non mesuré ») — sabotage équivalent. Le juge ne distinguerait pas un 401 dont le corps porterait ces clés (mineur).
- S3 (seule la première branche neutralisée) : la branche `else if (!echecIdentifie)` refuse encore — sabotage absorbé ; S3b le corrige.

Après tout : `sha256sum -c` OK sur scripts/chef/*.mjs ; `git status --short` et `git diff HEAD --stat` identiques à avant.

## Défauts à signaler (hors périmètre de 026-146)

- `scripts/revue-qa.mjs` RV-4 dépend de la fin de ligne de `document-ok.md` (plante en CRLF).
- `docs/agents/chantier.md` : HEAD dit « Un connecteur » ; le correctif « Aucun connecteur » n'est pas commité → CT-5 rouge dans toute copie propre.
