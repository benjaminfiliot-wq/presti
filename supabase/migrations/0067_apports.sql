-- 0067 — Le Registre des apports, avec PREUVE (prompt v10 §2.2 et §2.4 ; demande de Benj du 07/09 :
-- « je veux m'assurer qu'il apporte des clients avec preuve »).
--
-- Le contrat de collaboration (art. 5) donne 20 % de commission sur les « Clients apportés », inscrits au
-- Registre avant la souscription ou dans les 30 jours qui suivent. Jusqu'ici, ce registre n'existait pas : il
-- aurait fallu croire une déclaration. Désormais chaque ligne porte comment elle a été établie :
--
--   prouve  — l'artisan est arrivé par le lien d'apport personnel ; le serveur a posé une empreinte signée
--             (cookie httpOnly, 90 jours) et l'a relue à l'inscription. Personne ne peut la fabriquer.
--   saisi   — l'artisan a saisi le code d'apport lui-même à l'inscription.
--   declare — Benj l'a ajouté à la main : une PIÈCE est obligatoire (email d'introduction, capture).
--   conteste— désaccord (art. 5 : la commission tombe à 10 %), avec son motif et sa date.
--   retire  — sorti du registre, avec son motif.
--
-- Le relevé mensuel (J4) ne comptera que `prouve`, `saisi`, et `declare` AVEC pièce — et le dira ligne par ligne.

-- ── 1. Les apporteurs ─────────────────────────────────────────────────────────────────────────────────
create table if not exists public.apporteurs (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[a-z0-9]{6,24}$'),
  nom        text not null,
  artisan_id uuid references public.artisans(id) on delete set null,
  actif      boolean not null default true,
  cree_le    timestamptz not null default now()
);
comment on table public.apporteurs is 'Les personnes qui amènent des clients (contrat art. 5). `code` est la clé du lien public prestiapp.fr/a/<code> : court, non devinable, jamais réutilisé après retrait.';
comment on column public.apporteurs.artisan_id is 'Le compte de l''apporteur quand il en a un (Alexandre est fondateur) : sert à lui montrer SON registre, jamais celui des autres.';
alter table public.apporteurs enable row level security;
revoke all on public.apporteurs from public, anon, authenticated;

-- ── 2. Le registre ────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.registre_apports (
  id                 uuid primary key default gen_random_uuid(),
  artisan_id         uuid not null unique references public.artisans(id) on delete cascade,
  apporteur_id       uuid not null references public.apporteurs(id) on delete restrict,
  statut             text not null check (statut in ('prouve', 'saisi', 'declare', 'conteste', 'retire')),
  preuve             jsonb,
  piece              text,
  premier_contact_le timestamptz,
  souscrit_le        timestamptz,
  offre_souscription text,
  motif              text,
  cree_le            timestamptz not null default now(),
  maj_le             timestamptz not null default now(),
  maj_par            uuid references public.artisans(id) on delete set null
);
comment on table public.registre_apports is 'Un artisan, un apporteur, et COMMENT on le sait (annexe B du contrat). Une ligne par artisan (contrainte d''unicité) : un client n''est apporté que par une personne.';
comment on column public.registre_apports.preuve is 'Ce que le serveur a constaté : { code, arrivee (ISO), page, inscription (ISO), source: "lien"|"code_saisi" }. Jamais rempli à la main.';
comment on column public.registre_apports.piece is 'Pour un apport DÉCLARÉ : la pièce justificative (référence d''email, lien, description). Sans elle, la ligne ne compte pas dans le relevé.';
create index if not exists registre_apports_apporteur_idx on public.registre_apports (apporteur_id, cree_le desc);
create index if not exists registre_apports_statut_idx on public.registre_apports (statut);
alter table public.registre_apports enable row level security;
revoke all on public.registre_apports from public, anon, authenticated;

-- ── 3. Le rattachement, en une transaction ────────────────────────────────────────────────────────────
-- Appelée par le serveur juste après la création du profil, avec ce qu'il a LU dans le cookie signé (ou le code
-- saisi). Elle refuse : un code inconnu ou inactif, un artisan déjà inscrit au registre, un rattachement plus de
-- 30 jours après l'inscription (art. 5), et un apporteur qui se rattacherait lui-même.
create or replace function public.rattacher_apport(
  p_artisan uuid, p_code text, p_source text, p_preuve jsonb
) returns text language plpgsql security definer set search_path = public as $$
declare v_apporteur public.apporteurs%rowtype; v_artisan public.artisans%rowtype;
begin
  select * into v_artisan from public.artisans where id = p_artisan;
  if not found then return 'artisan_inconnu'; end if;
  if v_artisan.created_at < now() - interval '30 days' then return 'trop_tard'; end if;
  select * into v_apporteur from public.apporteurs where code = p_code and actif = true;
  if not found then return 'code_inconnu'; end if;
  if v_apporteur.artisan_id = p_artisan then return 'soi_meme'; end if;
  if exists (select 1 from public.registre_apports where artisan_id = p_artisan) then return 'deja'; end if;
  insert into public.registre_apports (artisan_id, apporteur_id, statut, preuve, premier_contact_le, souscrit_le, offre_souscription)
    values (p_artisan, v_apporteur.id,
            case when p_source = 'lien' then 'prouve' else 'saisi' end,
            p_preuve,
            coalesce((p_preuve->>'arrivee')::timestamptz, v_artisan.created_at),
            v_artisan.created_at,
            v_artisan.plan);
  return 'ok';
end $$;
comment on function public.rattacher_apport(uuid, text, text, jsonb) is 'Rend : ok | artisan_inconnu | trop_tard | code_inconnu | soi_meme | deja. Jamais d''exception : le rattachement ne doit pas casser une inscription.';
revoke all on function public.rattacher_apport(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.rattacher_apport(uuid, text, text, jsonb) to service_role;

-- ── 4. Les changements de statut par un fondateur, journalisés dans la même transaction ────────────────
create or replace function public.changer_statut_apport(
  p_acteur uuid, p_acteur_email text, p_ligne uuid, p_statut text, p_motif text, p_piece text,
  p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_avant public.registre_apports%rowtype; v_journal uuid;
begin
  select * into v_avant from public.registre_apports where id = p_ligne for update;
  if not found then return jsonb_build_object('etat', 'inconnue'); end if;
  if p_statut not in ('prouve', 'saisi', 'declare', 'conteste', 'retire') then return jsonb_build_object('etat', 'statut_invalide'); end if;
  -- Un apport déclaré sans pièce ne se crée ni ne se maintient : c'est toute la demande de Benj.
  if p_statut = 'declare' and coalesce(nullif(trim(coalesce(p_piece, v_avant.piece, '')), ''), '') = '' then
    return jsonb_build_object('etat', 'piece_requise');
  end if;
  -- Une preuve établie par le serveur ne se réécrit pas à la main : on conteste ou on retire, jamais on ne
  -- transforme un « déclaré » en « prouvé ».
  if p_statut in ('prouve', 'saisi') and v_avant.statut not in ('prouve', 'saisi') then
    return jsonb_build_object('etat', 'preuve_non_falsifiable');
  end if;
  update public.registre_apports
     set statut = p_statut, motif = p_motif, piece = coalesce(p_piece, piece), maj_le = now(), maj_par = p_acteur
   where id = p_ligne;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'apport_modifie', 'apport', p_ligne::text, v_avant.artisan_id,
            jsonb_build_object('statut', v_avant.statut, 'motif', v_avant.motif, 'piece', v_avant.piece),
            jsonb_build_object('statut', p_statut, 'motif', p_motif, 'piece', coalesce(p_piece, v_avant.piece)),
            p_ip, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'journal', v_journal);
end $$;
revoke all on function public.changer_statut_apport(uuid, text, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.changer_statut_apport(uuid, text, uuid, text, text, text, text, text) to service_role;

-- ── 5. L'ajout à la main (déclaré, avec pièce obligatoire) ─────────────────────────────────────────────
create or replace function public.declarer_apport(
  p_acteur uuid, p_acteur_email text, p_artisan uuid, p_code text, p_piece text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_apporteur public.apporteurs%rowtype; v_artisan public.artisans%rowtype; v_ligne uuid; v_journal uuid;
begin
  if coalesce(trim(coalesce(p_piece, '')), '') = '' then return jsonb_build_object('etat', 'piece_requise'); end if;
  select * into v_artisan from public.artisans where id = p_artisan;
  if not found then return jsonb_build_object('etat', 'artisan_inconnu'); end if;
  select * into v_apporteur from public.apporteurs where code = p_code and actif = true;
  if not found then return jsonb_build_object('etat', 'code_inconnu'); end if;
  if exists (select 1 from public.registre_apports where artisan_id = p_artisan) then return jsonb_build_object('etat', 'deja'); end if;
  insert into public.registre_apports (artisan_id, apporteur_id, statut, piece, premier_contact_le, souscrit_le, offre_souscription, maj_par)
    values (p_artisan, v_apporteur.id, 'declare', p_piece, v_artisan.created_at, v_artisan.created_at, v_artisan.plan, p_acteur)
    returning id into v_ligne;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'apport_ajoute', 'apport', v_ligne::text, p_artisan, null,
            jsonb_build_object('statut', 'declare', 'apporteur', v_apporteur.code, 'piece', p_piece), p_ip, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'ligne', v_ligne, 'journal', v_journal);
end $$;
revoke all on function public.declarer_apport(uuid, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.declarer_apport(uuid, text, uuid, text, text, text, text) to service_role;

-- ── 6. L'apporteur du contrat ─────────────────────────────────────────────────────────────────────────
-- Le code est neutre (ni prénom, ni rien de devinable) : il vit dans une adresse publique.
insert into public.apporteurs (code, nom)
  values ('ap7k2m9x', 'Alexandre — contrat du 06/09/2026')
  on conflict (code) do nothing;
