# Sabotages de la correction du juge 026-170 (bac sab-170, 2026-10-04T21:05:04Z)
page.tsx avant tout sabotage : sha256 a7e88560381f5c34

## T0 formes admises (témoin vert) : ✓
- charge ajoutée après setRole : `void fetch('/api/controle/journal?limite=1'); void fetch('/controle?_rsc=abc')`
- sha256 page.tsx : a7e88560381f5c34 → 23ed4cde90349412 (sabotée) → a7e88560381f5c34 (restaurée)
- juge CL-11 (--partie=csp) : PASS, code 0, attendu PASS
```
✅ CL-11 build de production : zéro securitypolicyviolation, 53 requêtes de la page toutes dans la liste (/api/controle/station?vue=, /api/controle/tresorerie, /api/controle/station/reglages, GET /api/controle/journal?limite=1, GET /controle?_rsc=, /station/themes/<clé de la liste fermée>/…, /_next/static/…), aucune WebSocket, aucun hôte externe
station-claw3d-qa --partie=csp : PASS
```

## S1 journal avec une autre limite : ✓
- charge ajoutée après setRole : `void fetch('/api/controle/journal?limite=50')`
- sha256 page.tsx : a7e88560381f5c34 → b9ef18e112f70907 (sabotée) → a7e88560381f5c34 (restaurée)
- juge CL-11 (--partie=csp) : FAIL, code 1, attendu FAIL
```
❌ CL-11 requête(s) hors de la liste autorisée : GET /api/controle/journal?limite=50
station-claw3d-qa --partie=csp : FAIL — CL-11
```

## S2 journal en POST : ✓
- charge ajoutée après setRole : `void fetch('/api/controle/journal?limite=1', { method: 'POST' })`
- sha256 page.tsx : a7e88560381f5c34 → 72f727c242c9b690 (sabotée) → a7e88560381f5c34 (restaurée)
- juge CL-11 (--partie=csp) : FAIL, code 1, attendu FAIL
```
❌ CL-11 requête(s) hors de la liste autorisée : POST /api/controle/journal?limite=1
station-claw3d-qa --partie=csp : FAIL — CL-11
```

## S3 /controle sans ?_rsc= : ✓
- charge ajoutée après setRole : `void fetch('/controle')`
- sha256 page.tsx : a7e88560381f5c34 → b6b1667b9643c6be (sabotée) → a7e88560381f5c34 (restaurée)
- juge CL-11 (--partie=csp) : FAIL, code 1, attendu FAIL
```
❌ CL-11 requête(s) hors de la liste autorisée : GET /controle
station-claw3d-qa --partie=csp : FAIL — CL-11
```

## S4 /controle?_rsc= en POST : ✓
- charge ajoutée après setRole : `void fetch('/controle?_rsc=abc', { method: 'POST' })`
- sha256 page.tsx : a7e88560381f5c34 → 917736a876995d0e (sabotée) → a7e88560381f5c34 (restaurée)
- juge CL-11 (--partie=csp) : FAIL, code 1, attendu FAIL
```
❌ CL-11 requête(s) hors de la liste autorisée : POST /controle?_rsc=abc
station-claw3d-qa --partie=csp : FAIL — CL-11
```

## S5 /api/controle/journal/export (chemin voisin) : ✓
- charge ajoutée après setRole : `void fetch('/api/controle/journal/export')`
- sha256 page.tsx : a7e88560381f5c34 → cf53a2d9cb9dc346 (sabotée) → a7e88560381f5c34 (restaurée)
- juge CL-11 (--partie=csp) : FAIL, code 1, attendu FAIL
```
❌ CL-11 requête(s) hors de la liste autorisée : /api/controle/journal/export
station-claw3d-qa --partie=csp : FAIL — CL-11
```

page.tsx à la fin : sha256 a7e88560381f5c34 (identique)
