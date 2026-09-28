# Échecs attendus des juges du lot 20 (026-116) sur leur arbre de référence

Écrit par `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=20` le 2026-09-28T13:22:02Z. Chaque juge est lancé par la preuve elle-même, sans shell : `--racine=<référence>` (extraite par `git archive` de `22b3864739a4` sous `.orchestre/travail/juges-026-pubs-contenu/reference-20`) puis `--temoin` sur l'arbre courant.

| Juge | Critère attendu en échec sur la référence | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|
| crieur-qa --partie=composer | CR-1 | FAIL CR-1 — lib/crieur/faits.ts ne s'importe pas : Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pubs-contenu\reference-20\lib\crieur\faits.ts' imported from C:\Users\benja\Documents\pr… | FAIL, code 1 (3 s) |
| crieur-qa --partie=route | CR-5 | FAIL CR-5 — app/api/cron/crieur/route.ts absent ou vide | FAIL, code 1 (4 s) |
| crieur-qa --partie=horloge | CR-10 | FAIL CR-10 — 0 fichier(s) supabase/migrations/*_crieur.sql, un seul attendu (trouvé(s) : aucun) | FAIL, code 1 (2 s) |
| crieur-qa --partie=juge | CR-14 | FAIL CR-14 — lib/crieur/juge.ts absent ou vide | FAIL, code 1 (3 s) |
