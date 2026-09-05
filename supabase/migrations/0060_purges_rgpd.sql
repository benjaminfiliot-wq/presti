-- 0060 — Index des purges RGPD (audit final, auditeur B, majeur C6).
--
-- Contexte : `lib/purgesRgpd.ts` applique enfin les durées que les pages légales annoncent
-- (12 mois anti-abus, 3 ans pour une conversation sans suite). Chaque purge lit « les N plus
-- vieilles lignes » d'une table, triées par leur colonne de date. Sans index sur CETTE colonne,
-- chaque passage devient un balayage complet trié : ça tient sur une base neuve, ça tue le cron
-- quotidien le jour où `ip_abus` compte quelques centaines de milliers de lignes — et une purge
-- qui expire, c'est une durée annoncée qui redevient une promesse en l'air.
--
-- Aucune donnée n'est touchée ici : rien que des index, `if not exists`, rejouables.
-- Les index déjà posés ailleurs ne sont pas redoublés : `ip_bans_expires_idx` (0013),
-- `clients_liens_expire_idx` (0034), `messages_lead_sent_idx` (0015), `devis_lead_idx` (0033).

-- Journal d'abus : purge par horodatage global. L'index existant est (ip, at), inutilisable
-- pour un balayage trié sur `at` seul.
create index if not exists ip_abus_at_idx on public.ip_abus (at);

-- Conversations sans suite : on part des fils créés avant le seuil, les plus vieux d'abord.
-- L'index existant est (artisan_id, updated_at desc) — la purge, elle, ignore l'artisan.
create index if not exists leads_created_idx on public.leads (created_at);

-- Empreintes d'IP à effacer : index PARTIELS, donc minuscules et sans coût d'écriture une fois
-- l'IP remise à NULL — la ligne sort de l'index le jour où elle est purgée.
create index if not exists leads_ip_purge_idx on public.leads (created_at) where ip is not null;
create index if not exists devis_ip_purge_idx on public.devis (accepte_le) where accepte_ip is not null;

-- Jetons expirés.
create index if not exists password_resets_expires_idx on public.password_resets (expires_at);
create index if not exists clients_sessions_expire_idx on public.clients_sessions (expire_le);

comment on index public.leads_ip_purge_idx is
  'Purge RGPD (0060) : retrouver les leads dont l''empreinte d''IP dépasse douze mois. Partiel — vide quand tout est purgé.';
comment on index public.devis_ip_purge_idx is
  'Purge RGPD (0060) : retrouver les devis dont l''empreinte d''IP d''acceptation dépasse douze mois.';
