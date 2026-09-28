# 026-041 — échecs attendus de `agents-llm-qa.mjs`

Écrit par `--preuve-echecs` : `lib/agents/llm.ts` et `lib/agents/moteurs.ts` n'existent pas encore (026-043 les écrit).

## Sur l'arbre courant (sans option)
Code de sortie : 1 (attendu ≠ 0).

Extrait réel (LL-1) :
```
FAIL LL-1 — échec
  ✗ MOTEUR_DE n'est pas gelé (Object.isFrozen)
  ✗ MOTEUR_DE.standardiste n'est pas gelé
  ✗ MOTEUR_DE.facteur n'est pas gelé
  ✗ MOTEUR_DE.redacteur_site n'est pas gelé
  ✗ MOTEUR_DE.chef n'est pas gelé
  ✗ MOTEUR_DE.veille_pubs n'est pas gelé
  ✗ MOTEUR_DE.douleurs n'est pas gelé
  ✗ MOTEUR_DE.studio n'est pas gelé
```

## `--temoin`
Code de sortie : 0 (attendu 0).

Extrait réel :
```
PASS LL-10 — package.json et lib/ai.ts identiques à HEAD ; aucune dépendance nouvelle ; CODEX_LANCEUR isolé
PASS LL-11 — npm run typecheck (tsc --noEmit) vert
agents-llm-qa : PASS
```

## Verdict du témoin
PASS — LL-10 et LL-11 verts, aucun FAIL.

## Budget (026-041 en-tête : 8 fichiers, 20 minutes)
Fichiers écrits : scripts/agents-llm-qa.mjs, scripts/fixtures/026/llm/{executer.mjs,faux-lanceur.mjs,faux-jev.mjs} (4, sous 8). Durée du cycle complet ci-dessus (arbre courant + --temoin) : 222s, dominée par deux exécutions de `tsc --noEmit` (LL-11, ~40s chacune) ; la conception, l'écriture et la vérification manuelle des 18 critères (LL-1 à LL-18, mécanique deps.lancer/deps.fetch/faux serveurs) ont largement dépassé les 20 minutes déclarées. Aucun critère n'a été retiré pour tenir ce budget.