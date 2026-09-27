# Autotest du méta-juge des mutations

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --autotest` le 2026-09-27T11:49:46.233Z. Chaque cas tourne sur une copie du mini-dépôt `scripts/fixtures/026/mutations-preuve/` sous `.orchestre/travail/juges-026-mutations-preuve/autotest/`, jamais dans le dépôt.

| cas | script de mutations | critère attendu | code | critère(s) en échec | verdict | ligne qui l’a attrapé |
|---|---|---|---|---|---|---|
| lecture | `(lecture des sorties, sans script)` | aucun (doit passer) | — | — | PASS | FAIL OS-1 — migration absente |
| honnete | `scripts/mutations-honnete.mjs` | aucun (doit passer) | 0 | — | PASS | PASS MP-3 — 3 contre-mutation(s) tirée(s) (graine 1298246166) : 3 attrapée(s) par leur critère |
| sans-rapport | `scripts/mutations-sans-rapport.mjs` | MP-1 | 1 | MP-1 | PASS | FAIL MP-1 — 1 défaut(s) : rapport absent (.orchestre/preuves/026-900/mutations.json) |
| critere-omis | `scripts/mutations-critere-omis.mjs` | MP-2 | 1 | MP-2 | PASS | FAIL MP-2 — 1 défaut(s) : scripts/x-qa.mjs : aucune entrée pour XQ-2 \| XQ-3 (vus : XQ-1) |
| mutation-fausse | `scripts/mutations-fausse.mjs` (graine 2) | MP-3 | 1 | MP-3 | PASS | FAIL MP-3 — 1 défaut(s) : entrée 5 (scripts/x-qa.mjs, XQ-2, lib/module.mjs : « /** le signe d'un nombre, 1 pour zéro */ » → « /** le signe d'un nombre */ ») non prise : copie mutée en code 0 : la mutation n’est pas attr… |
| depot-laisse-modifie | `scripts/mutations-sale.mjs` | MP-4 | 1 | MP-4 | PASS | FAIL MP-4 — 3 défaut(s) : presti : lib/module.mjs modifié |
