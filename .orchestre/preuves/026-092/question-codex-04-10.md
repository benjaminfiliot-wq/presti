# 026-092 — vérification vivante bloquée

Le juge passe les contrôles de source et les doublures, puis demande `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour créer ses comptes d’essai. Cette copie ne possède pas `.env.local` ; la consigne de l’usine interdit de contourner ce manque.

1. Exécuter `node scripts/orchestre.mjs verifier 026-092` sur le PC avec `.env.local`, puis transmettre le verdict à l’usine.
2. Fournir à cette copie des identifiants de test jetables et isolés, puis relancer la vérification ici.

> réponse automatique : option PC (option 1) — le verifier tourne sur le PC, avec ses variables locales, jamais sur l'usine (moteur, 2026-10-04T09:56).
