-- 036-004 — PROPOSITION, NON APPLIQUÉE, NON NUMÉROTÉE : la lecture de la pause générale par n8n (écart E1 de 032-044, bloquant pour la bascule du cron).
--
-- Le problème. La route app/api/cron/relances/route.ts relit la pause générale à CHAQUE relance (lib/agents/sortie.ts : seule la valeur exacte
-- `active: false` ouvre la porte ; variable Vercel PAUSE_GENERALE=1, puis ops.interrupteurs, puis « doute » = fermé). n8n ne peut pas la lire :
-- ops_interrupteur() est une fonction STABLE réservée au rôle de service (0097_ops_identite.sql:314-331), et le rôle n8n_lecture (0189) ne lit que
-- des vues. Sans cette lecture, n8n relancerait pendant une pause générale.
--
-- Ce que fait déjà le workflow (prouvé par scripts/suivi-n8n-qa.mjs, cas « pause générale posée » et « illisible ») : presti-dep-suivi exige
-- config.pause_generale === false ; posée (true) ou illisible (null), rien n'est contrôlé ni relancé, les relances restent dues (« reste_du »).
-- La valeur est remplie par le Cerveau, qui lira la vue ci-dessous. Tant que la vue n'est pas collée, la valeur reste null : le Suivi ne relance RIEN.
--
-- Ce qu'il reste à faire, par Benj (migration en production = son « go » écrit, .claude/rules/securite.md) : coller cette vue (ou la plier dans la
-- prochaine migration du système d'agents), PUIS lever le drapeau du Suivi — jamais l'inverse. Le secours « variable Vercel » ne se lit pas depuis
-- n8n : à l'accord de Benj, poser le même interrupteur dans le conteneur n8n, ou accepter que la variable ne vaille que pour la route.
--
-- Retour arrière :  drop view if exists public.n8n_pause_generale;

create or replace view public.n8n_pause_generale with (security_barrier = true) as
select i.actif as pause
from ops.interrupteurs i
where i.nom = 'pause_generale';

revoke all on public.n8n_pause_generale from public, anon, authenticated, service_role;
grant select on public.n8n_pause_generale to n8n_lecture;

comment on view public.n8n_pause_generale is
  'La pause générale (ops.interrupteurs) pour n8n : une ligne, un booléen. Zéro ligne = doute = pas de relance (036-004).';
