-- 0068 — Suspendre un compte, et le réactiver (prompt v10 §2.2, J2b).
--
-- Suspendre, ce n'est ni supprimer ni rétrograder : l'accès est coupé, les données restent intactes, et la
-- décision est réversible d'un clic. C'est ce qu'il faut pour un impayé prolongé ou un abus, sans détruire le
-- travail d'un artisan.
--
-- Pourquoi une table à côté et pas une colonne sur `artisans` : cette table est gelée pour tout rôle autre que
-- le serveur (trigger `lock_artisan_privileges`, 0055), et y ajouter un champ sensible de plus reviendrait à
-- élargir une surface déjà protégée. Une table dédiée se lit en même temps que l'artisan (PostgREST imbrique
-- la relation), donc sans requête supplémentaire sur le chemin chaud.

create table if not exists public.suspensions (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  motif       text not null,
  message     text,
  suspendu_le timestamptz not null default now(),
  suspendu_par uuid references public.artisans(id) on delete set null,
  levee_le    timestamptz,
  levee_par   uuid references public.artisans(id) on delete set null,
  levee_motif text
);
comment on table public.suspensions is 'Comptes suspendus par la direction (v10 §2.2) : accès coupé, données conservées. Une ligne SANS `levee_le` = suspension en cours. L''historique reste : on doit pouvoir dire quand et pourquoi.';
comment on column public.suspensions.message is 'Ce que l''artisan lit en tentant de se connecter — écrit pour lui, jamais un motif interne.';
create unique index if not exists suspensions_en_cours_idx on public.suspensions (artisan_id) where levee_le is null;
create index if not exists suspensions_artisan_idx on public.suspensions (artisan_id, suspendu_le desc);
alter table public.suspensions enable row level security;
revoke all on public.suspensions from public, anon, authenticated;

-- ── Suspendre : couper l'accès, fermer les sessions, journaliser — en une transaction ─────────────────
create or replace function public.suspendre_artisan(
  p_acteur uuid, p_acteur_email text, p_artisan uuid, p_motif text, p_message text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_artisan public.artisans%rowtype; v_id uuid; v_journal uuid;
begin
  if coalesce(trim(coalesce(p_motif, '')), '') = '' then return jsonb_build_object('etat', 'motif_requis'); end if;
  select * into v_artisan from public.artisans where id = p_artisan;
  if not found then return jsonb_build_object('etat', 'artisan_inconnu'); end if;
  if v_artisan.is_founder then return jsonb_build_object('etat', 'fondateur'); end if;
  if exists (select 1 from public.suspensions where artisan_id = p_artisan and levee_le is null) then
    return jsonb_build_object('etat', 'deja');
  end if;
  insert into public.suspensions (artisan_id, motif, message, suspendu_par)
    values (p_artisan, p_motif, p_message, p_acteur) returning id into v_id;
  -- Les sessions ouvertes se ferment : une suspension qui laisse l'artisan connecté ne suspend rien.
  update public.artisans set sessions_invalides_avant = now() + interval '1 second' where id = p_artisan;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'artisan_suspendu', 'artisan', p_artisan::text, p_artisan,
            jsonb_build_object('suspendu', false),
            jsonb_build_object('suspendu', true, 'motif', p_motif), p_ip, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'suspension', v_id, 'journal', v_journal);
end $$;
revoke all on function public.suspendre_artisan(uuid, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.suspendre_artisan(uuid, text, uuid, text, text, text, text) to service_role;

create or replace function public.reactiver_artisan(
  p_acteur uuid, p_acteur_email text, p_artisan uuid, p_motif text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_suspension public.suspensions%rowtype; v_journal uuid;
begin
  select * into v_suspension from public.suspensions where artisan_id = p_artisan and levee_le is null for update;
  if not found then return jsonb_build_object('etat', 'pas_suspendu'); end if;
  update public.suspensions set levee_le = now(), levee_par = p_acteur, levee_motif = p_motif where id = v_suspension.id;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'artisan_reactive', 'artisan', p_artisan::text, p_artisan,
            jsonb_build_object('suspendu', true, 'motif', v_suspension.motif),
            jsonb_build_object('suspendu', false, 'motif', p_motif), p_ip, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'journal', v_journal);
end $$;
revoke all on function public.reactiver_artisan(uuid, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.reactiver_artisan(uuid, text, uuid, text, text, text) to service_role;

-- ── Offrir des crédits : borné, motivé, journalisé ────────────────────────────────────────────────────
-- Les crédits sont gelés pour le navigateur (0055) : seul le serveur écrit, et seulement par ici.
create or replace function public.offrir_credits(
  p_acteur uuid, p_acteur_email text, p_artisan uuid, p_credits int, p_motif text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_avant int; v_apres int; v_journal uuid;
begin
  if p_credits is null or p_credits < 1 or p_credits > 500 then return jsonb_build_object('etat', 'hors_bornes'); end if;
  if coalesce(trim(coalesce(p_motif, '')), '') = '' then return jsonb_build_object('etat', 'motif_requis'); end if;
  select credits into v_avant from public.artisans where id = p_artisan for update;
  if not found then return jsonb_build_object('etat', 'artisan_inconnu'); end if;
  update public.artisans set credits = coalesce(credits, 0) + p_credits where id = p_artisan returning credits into v_apres;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'artisan_credits', 'artisan', p_artisan::text, p_artisan,
            jsonb_build_object('credits', v_avant),
            jsonb_build_object('credits', v_apres, 'offerts', p_credits, 'motif', p_motif), p_ip, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'avant', v_avant, 'apres', v_apres, 'journal', v_journal);
end $$;
revoke all on function public.offrir_credits(uuid, text, uuid, int, text, text, text) from public, anon, authenticated;
grant execute on function public.offrir_credits(uuid, text, uuid, int, text, text, text) to service_role;
