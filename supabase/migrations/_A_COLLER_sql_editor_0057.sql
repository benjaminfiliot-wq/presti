-- 0057 — Trace des passages de cron (prompt v6 §6, alerte « un cron sans passage à l'heure prévue »).
--
-- Le problème : un cron qui ne tourne plus ne prévient personne. Les relances J+2/5/10 cessent,
-- la purge des comptes ne se fait plus, et rien ne le dit — Vercel n'envoie pas d'email quand une
-- tâche planifiée n'a pas été appelée. La seule façon de le savoir est que chaque passage laisse
-- une trace, et qu'une autre tâche vérifie que la trace est récente.
--
-- Une ligne par tâche, écrasée à chaque passage : on ne veut pas l'historique (les journaux
-- Vercel l'ont), on veut « quand est-ce que ça a tourné pour la dernière fois, et avec quel
-- résultat ». Écrit uniquement par le serveur (service_role), comme `limites` (0049).

create table if not exists public.passages_cron (
  nom              text        primary key,
  dernier_passage  timestamptz not null default now(),
  -- Ce que le passage a fait, en clair : relances envoyées, comptes purgés, alertes parties…
  detail           jsonb       not null default '{}'::jsonb,
  -- Vrai si le passage s'est terminé sans erreur. Un passage en erreur laisse quand même sa
  -- trace : « il a tourné mais a échoué » n'est pas la même alerte que « il n'a pas tourné ».
  reussi           boolean     not null default true
);

comment on table public.passages_cron is
  'Dernier passage de chaque tâche planifiée. Lu par /api/cron/alertes pour détecter une tâche qui ne tourne plus. Service_role uniquement.';

alter table public.passages_cron enable row level security;
revoke all on public.passages_cron from public, anon, authenticated;
