# Journal v16 — le système universel et LA démo (depuis le 2026-09-14)

Protocole : trois lignes par bloc, l'heure en tête. Ce que le code fait vit dans `.orchestre/contexte.md` ; ce journal dit ce qui a été décidé et prouvé.

## Bloc 0 — 12 h 02 : `orchestre/` autonome (§1)
- Départ : l'orchestre v15 (`scripts/orchestre.mjs`, 469 l.) est lié à Presti (chemins `app/`, `lib/flags.ts`, `supabase/migrations`, vault `../SaaS`) ; aucun `budget`, aucun hook. Deux prémisses du v16 ont bougé aujourd'hui : `site-qa.mjs` existe déjà (bloc « Le geste ») et neuf démos v2 sont vertes — on les réutilise.
- Construction : dépôt `C:\Users\benja\Documents\orchestre\` (bin générique piloté par `.orchestre/orchestre.json`, `init`, `maj`, `budget` lu dans les transcripts Claude Code, hooks Read/Edit, gabarits, juges dont `code-qa.mjs`), par agents en parallèle, vérifié par un `init` sur un projet factice avec les deux tâches PASS/FAIL.
