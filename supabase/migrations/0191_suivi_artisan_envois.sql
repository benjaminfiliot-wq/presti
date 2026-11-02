-- 0191 — Le registre des envois du suivi des artisans (chantier 4, lot L17 ; workflow n8n presti-suivi-artisan ; tâche 032-033).
--
-- NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj (.claude/rules/securite.md, .claude/rules/migration-production.md).
-- Ordre : cette migration collée et contrôlée, PUIS une lecture réelle qui prouve que le registre répond, PUIS seulement la publication
-- de presti-suivi-artisan (audit 032-029, S-2) — jamais l'inverse : sans la table, le passage échoue chaque matin.
--
-- Pourquoi : le workflow presti-suivi-artisan (inactif, n8n d'Oracle, id 2HsfV00lGSX1KGY1) lit ce registre au nœud « Lire registre du
-- suivi » (select=cle,artisan_id,etape,envoye_le) pour qu'une clé déjà envoyée ne revienne jamais et qu'aucun artisan ne reçoive deux
-- e-mails du suivi à moins de 5 jours. Forme : question 1 de .orchestre/preuves/032-014/resume.md et tableau des colonnes du brief
-- plans/011-cadrage-01-11/briefs/c4-n8n-suivi-artisan.md (l.61-64) : cle, artisan_id, etape, envoye_le — rien d'autre, aucune donnée
-- personnelle (ni nom, ni adresse, ni e-mail, ni texte).
--
-- Forme :
--   • RLS dès la création, AUCUNE politique pour anon ni authenticated : un jeton de navigateur ne lit ni n'écrit rien ;
--   • droits de public, anon et authenticated retirés ; seule la clé de service écrit (le lot d'envoi, à venir) ;
--   • les gardes de session de 0138 (garde_session, garde_suspension_*) posées sur la table, comme sur toute table à RLS ;
--   • la clé est exactement « suivi:<artisan_id>:<étape> » (contrainte) : une ligne ne peut pas mentir sur son compte ni son étape ;
--   • lecture du rôle n8n_lecture (0189) sur les quatre colonnes que le workflow lit, et sur artisans.notifications, que « Lire comptes »
--     lit déjà pour l'opposition au suivi (audit 032-029, S-M2 ; un jsonb de booléens, lib/notificationsTypes.ts). Si 0189 n'est pas
--     appliquée, ce bloc est sauté sans erreur (avis) et devra être rejoué après elle.
--
-- Hors de cette migration (audit 032-029, S-M3, au lot d'envoi) : réserver la clé AVANT l'envoi et marquer l'envoi après demanderait une
-- colonne de réservation que le brief ne prévoit pas ; à trancher par Benj avec le lot d'envoi, par une migration à part.
--
-- Retour arrière (la table est neuve ; le droit sur artisans.notifications se retire à part) :
--   drop table if exists public.suivi_artisan_envois cascade;
--   do $$ begin if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
--     revoke select (notifications) on public.artisans from n8n_lecture; end if; end $$;

create table if not exists public.suivi_artisan_envois (
  cle         text primary key,
  artisan_id  uuid not null references public.artisans (id) on delete cascade,
  etape       text not null check (etape in ('premiers_pas', 'bilan_j14', 'bilan_j30')),
  envoye_le   timestamptz not null default now(),
  constraint suivi_artisan_envois_cle_forme check (cle = 'suivi:' || artisan_id::text || ':' || etape)
);

comment on table public.suivi_artisan_envois is
  'Registre des e-mails du suivi des artisans (0191, chantier 4 L17). Une ligne par envoi réussi, clé suivi:<artisan_id>:<étape>. Lu par le workflow n8n presti-suivi-artisan (garde : clé déjà envoyée, 5 jours d''écart). Écrit par la clé de service seulement. Aucune donnée personnelle.';
comment on column public.suivi_artisan_envois.etape is 'premiers_pas | bilan_j14 | bilan_j30 — les étapes du brief c4-n8n-suivi-artisan.md.';

-- La lecture du workflow : artisan_id=in.(…), puis la garde des 5 jours par artisan.
create index if not exists suivi_artisan_envois_artisan_idx on public.suivi_artisan_envois (artisan_id, envoye_le desc);

alter table public.suivi_artisan_envois enable row level security;
revoke all on table public.suivi_artisan_envois from public, anon, authenticated;

-- Les gardes de session de 0138, posées ici aussi (la boucle de 0138 n'a vu que les tables de son jour).
drop policy if exists garde_session on public.suivi_artisan_envois;
create policy garde_session on public.suivi_artisan_envois as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.suivi_artisan_envois;
create policy garde_suspension_ins on public.suivi_artisan_envois as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.suivi_artisan_envois;
create policy garde_suspension_maj on public.suivi_artisan_envois as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.suivi_artisan_envois;
create policy garde_suspension_sup on public.suivi_artisan_envois as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));

-- La lecture de n8n (rôle de 0189, s'il existe) : les seules colonnes que presti-suivi-artisan lit.
do $lecture$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    execute 'grant select (cle, artisan_id, etape, envoye_le) on public.suivi_artisan_envois to n8n_lecture';
    execute 'drop policy if exists n8n_lecture_select on public.suivi_artisan_envois';
    execute 'create policy n8n_lecture_select on public.suivi_artisan_envois for select to n8n_lecture using (true)';
    execute 'grant select (notifications) on public.artisans to n8n_lecture';
  else
    raise notice '0191 : rôle n8n_lecture absent (0189 non appliquée) — droits de lecture de n8n à rejouer après 0189';
  end if;
end
$lecture$;
