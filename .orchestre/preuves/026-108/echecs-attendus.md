# Échecs attendus des juges du lot 01 (026-108) sur leur arbre de référence

Écrit par `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=01` le 2026-09-28T09:42:34Z. Chaque juge est lancé par la preuve elle-même, sans shell : `--racine=<référence>` (extraite par `git archive` de `4041ec9b4143` sous `.orchestre/travail/juges-026-pubs-contenu/reference-01`) puis `--temoin` sur l'arbre courant.

| Juge | Critère attendu en échec sur la référence | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|
| pack-pub-base-qa | PB-1 | FAIL PB-1 — 0 fichier(s) supabase/migrations/*_packs_pubs.sql, un seul attendu (trouvé(s) : aucun) | PASS, code 0 (9 s) |
| pack-pub-paiement-qa --partie=noyau | PP-1 | FAIL PP-1 — lib/packPub.ts ne s'importe pas : Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pubs-contenu\reference-01\lib\packPub.ts' imported from C:\Users\benja\Documents\presti\… | PASS, code 0 (42 s) |
| pack-pub-paiement-qa --partie=route | PP-8 | FAIL PP-8 — app/api/pubs/commander/route.ts absent ou vide | PASS, code 0 (1 s) |
| cgu-pack-pub-qa | CG-1 | FAIL CG-1 — titre exact introuvable : « <h2 id="pubs">3 ter. Le pack pubs locales</h2> » | PASS, code 0 (1 s) |
