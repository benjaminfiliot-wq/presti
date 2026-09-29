---
name: node24-windows-process-exit
description: "Sous Windows, Node 24 plante (libuv async.c:94, code 3221226505) si un script appelle process.exit() pendant qu'une requête fetch/Supabase se referme — poser process.exitCode à la place"
metadata:
  node_type: memory
  type: reference
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-28T11:35:52.596Z
---

Symptôme : `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94`, code de sortie
3221226505, APRÈS que le travail est fait (un jeton déjà posé en base, un juge qui a déjà écrit PASS). Aléatoire au début,
puis systématique sous charge. Vu le 28/09 sur `scripts/agents-jeton.mjs` (empreinte posée, jeton perdu) et
`scripts/usine-socle-qa.mjs` (verdict PASS lu comme un plantage par l'orchestre).

**Why:** Node 24.16 sous Windows ; le client HTTP (undici, supabase-js) ferme ses poignées pendant l'appel à process.exit().

**How to apply:** en fin de script, `process.exitCode = code` au lieu de `process.exit(code)` ; si une poignée peut rester
ouverte, un filet `setTimeout(() => process.exit(process.exitCode), 30_000).unref()`. Quand un script du dépôt « plante »
avec ce code après avoir affiché son résultat, c'est ce piège, pas un échec du travail. Voir [[presti-orchestre-antigravity]].
