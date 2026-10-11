-- 0127_ops_preneur.sql — l'agent `preneur` : le preneur des tâches « libres » du bus (05/10/2026).
-- Le chef (Matt) écrit des tâches de veille, de recherche, de tri, de relecture, de vérification et de rédaction interne ;
-- les seules capacités déclarées sur ces types étaient celles de `pont`, qui ne bat pas (aucun jeton, aucun minuteur) : 20 tâches
-- attendaient sans preneur. `preneur` en prend UNE à la fois (ops_tache_prendre : bail de 30 min, tentatives, disjoncteur) sur l'usine
-- (scripts/usine/preneur.mjs, presti-preneur.timer), l'exécute sur des données publiques seulement et la clôt avec une preuve.
-- Jamais `code` ni `contenu` : le code reste à Claude Code et à Codex, le contenu au Studio.
-- Droits : ces six capacités, aucun type créé (il ne crée aucune tâche), les tables taches et evenements, aucun euro (plafond 0).
-- Aucun jeton ici : ce que le protocole 026-040 réserve à `node scripts/agents-jeton.mjs` (empreinte seule en base).
-- Idempotent (ops_agent_enregistrer insère ou met à jour ; il ne touche jamais jeton_hash, battement_le, en_pause ni le disjoncteur).
select public.ops_agent_enregistrer('preneur', 'Preneur des tâches libres du bus (veille, recherche, tri, relecture)',
  array['recherche', 'tri', 'veille', 'verification', 'relecture', 'redaction_interne']::text[], '{}'::text[], array['taches', 'evenements']::text[], 10, 30, 0, 0);
