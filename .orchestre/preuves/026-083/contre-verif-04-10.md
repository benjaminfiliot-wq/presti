# 026-083 : contre-vérification du 04/10/2026 (sabotages réversibles, rejoués sur l'usine)

Après l'étalonnage officiel du second juge (`etalonnage.json` : version 3f1b657f168b1203, lecteur de production `codex:gpt-6-luna`, 44 messages, 100 % / 100 % pour `codex:gpt-6-luna` et pour `codex:gpt-6-sol`). Chaque sabotage : sha256 avant, UNE modification, `conformite-qa` rejoué complet (CO-1 à CO-10), fichier restauré depuis une copie, sha256 relu. Tout tourne dans un bac jetable de l'usine (`node scripts/usine.mjs executer --nom=sabotages-083 --id=026-083`, état du PC) : aucun fichier du PC n'est touché. Témoin vert avant et après. L'auto-contrôle (`--auto-controle`, AC-1 et AC-2) est vert aussi : 24 pièges (7/7 codes couverts), 20 conformes, empreinte du jeu juste.

## Témoin avant les sabotages
```
conformite-qa : PASS
```

## S1 l'identité du lecteur n'est plus exigée par jugerTon
- Fichier : `lib/agents/acquisition/secondJuge.ts` ; attendu : CO-8 rouge (un lecteur d'une autre identité est accepté)
- sha256 avant : 1f86387b0a235344bd56b3815470bd3ffd47a4490e0e38f478aa1251d773e85b
- Résultat :
```
❌ CO-8 lecteur d'identité différente (un autre modèle) : refus second_juge_non_etalonne attendu, obtenu {"j2":"ok","raisons":[],"version":"3f1b657f168b1203"} ; lecteur d'identité différente (un autre modèle) : appelé 1 fois, zéro appel attendu ; lecteur d'identité différente (une autre v
conformite-qa : FAIL — CO-8
```
- restauré : oui, empreinte identique (1f86387b0a235344bd56b3815470bd3ffd47a4490e0e38f478aa1251d773e85b)

## S2 taux recopié dans ETALONNAGE faussé
- Fichier : `lib/agents/acquisition/secondJuge.ts` ; attendu : CO-9 rouge (ETALONNAGE.pieges_refuses ≠ le plus bas taux d'etalonnage.json)
- sha256 avant : 1f86387b0a235344bd56b3815470bd3ffd47a4490e0e38f478aa1251d773e85b
- Résultat :
```
❌ CO-9 ETALONNAGE.pieges_refuses (0.9) ≠ le plus bas taux d'etalonnage.json (1)
conformite-qa : FAIL — CO-9
```
- restauré : oui, empreinte identique (1f86387b0a235344bd56b3815470bd3ffd47a4490e0e38f478aa1251d773e85b)

## S3 un piège du jeu est réécrit après l'étalonnage
- Fichier : `scripts/fixtures/026-acquisition/pieges/corpus.json` ; attendu : CO-9 rouge (sha_corpus ≠ SHA-256 du jeu actuel)
- sha256 avant : 5f648d988ffef760bc989ade094dacb2864071136ad8863eeaeab48011c26e79
- Résultat :
```
❌ CO-9 sha_corpus d'etalonnage.json ≠ SHA-256 du jeu de pièges actuel
conformite-qa : FAIL — CO-9
```
- restauré : oui, empreinte identique (5f648d988ffef760bc989ade094dacb2864071136ad8863eeaeab48011c26e79)

## S4 les consignes du second juge sont retouchées sans nouvel étalonnage
- Fichier : `lib/agents/acquisition/secondJuge.ts` ; attendu : CO-9 rouge (sha_consignes et version ≠) et CO-8 (l'étalonnage ne vaut plus)
- sha256 avant : 1f86387b0a235344bd56b3815470bd3ffd47a4490e0e38f478aa1251d773e85b
- Résultat :
```
❌ CO-9 sha_consignes d'etalonnage.json ≠ SHA-256 de CONSIGNES_SECOND_JUGE actuelles
conformite-qa : FAIL — CO-9
```
- restauré : oui, empreinte identique (1f86387b0a235344bd56b3815470bd3ffd47a4490e0e38f478aa1251d773e85b)

## S5 un taux d'étalonnage sous 95 %
- Fichier : `.orchestre/preuves/026-083/etalonnage.json` ; attendu : CO-9 rouge (taux sous 95 %)
- sha256 avant : f3ce11eeedac3de0a89e2370c3bc851c434c0ae98fff0150c5b5023633b96f7b
- Résultat :
```
❌ CO-9 taux sous 95 % : {"pieges_refuses":1,"conformes_acceptes":0.9,"total":44} ; ETALONNAGE.conformes_acceptes (1) ≠ le plus bas taux d'etalonnage.json (0.9)
conformite-qa : FAIL — CO-9
```
- restauré : oui, empreinte identique (f3ce11eeedac3de0a89e2370c3bc851c434c0ae98fff0150c5b5023633b96f7b)

## S6 le nom du lecteur étalonné est retiré du rapport
- Fichier : `.orchestre/preuves/026-083/etalonnage.json` ; attendu : CO-9 rouge (lecteur absent ; ≠ ETALONNAGE.lecteur)
- sha256 avant : f3ce11eeedac3de0a89e2370c3bc851c434c0ae98fff0150c5b5023633b96f7b
- Résultat :
```
❌ CO-9 etalonnage.json : `lecteur` (le nom du lecteur qui a mesuré) absent ; etalonnage.json : mode facteur mais lecteur  (codex:<modèle> attendu : la production) ; ETALONNAGE.lecteur ("codex:gpt-6-luna") ≠ lecteur d'etalonnage.json ()
conformite-qa : FAIL — CO-9
```
- restauré : oui, empreinte identique (f3ce11eeedac3de0a89e2370c3bc851c434c0ae98fff0150c5b5023633b96f7b)

## Témoin après les sabotages
```
conformite-qa : PASS
```

