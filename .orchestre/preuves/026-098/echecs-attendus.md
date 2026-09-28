# 026-098 — échecs attendus de `test/preuve-026.mjs --preuve-echecs`

Référence : dépôt orchestre extrait à `faaef0d` (git archive, sans toucher au `.git`). Généré le 2026-09-28T09:45:22Z.

## Groupe source

Premier critère en échec attendu : `ORS-1` — obtenu : `ORS-1` (code 1).

```
✗ ORS-1 — absents de la source : bin/executant.mjs MANQUANT, bin/antigravity.mjs MANQUANT
```

## Groupe baux

Premier critère en échec attendu : `ORB-1` — obtenu : `ORB-1` (code 1).

```
✗ ORB-1 — avec verrou : code 1, champ battement: absent · sans verrou : code 1 (attendu 3)
```

## Groupe quota

Premier critère en échec attendu : `ORQ-1` — obtenu : `ORQ-1` (code 1).

```
✗ ORQ-1 — scripts/executant.mjs absent (voir groupe source)
```

## test/preuve.mjs de l'extrait

code 0 — vert.

## PX-1 (`--a-blanc` dans presti, en direct)

code 0 · sortie JSON valide : true · --add-dir C:/Users/benja/Documents/orchestre : true · workspace-write : true · rien écrit dans .orchestre/travail ni agents.jsonl : true · argv ["exec","-C","C:\\Users\\benja\\Documents\\presti","--add-dir","C:\\Users\\benja\\Documents\\SaaS","--add-dir","C:\\Users\\benja\\Documents\\orchestre","-s","workspace-write","-c","sandbox_workspace_write.network_access=true","--color","never","-o","C:\\Users\

---

✓ --preuve-echecs : tous les contrôles passent.
