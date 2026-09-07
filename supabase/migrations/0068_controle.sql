-- 0068 — Le Poste de contrôle : suspensions, rôles internes, comptes de démonstration, preuve des apports.
--
-- Cette migration réunit deux choses : ce que le v10 avait préparé sans le coller (suspendre un compte,
-- offrir des crédits) et ce que le v11 demande (§4 la vérification des apports, §5 le cloisonnement
-- d'Alexandre, §2 l'exclusion des comptes de démonstration des chiffres). Un seul fichier plutôt que deux
-- portant le même numéro.
--
-- Ce qui n'y est PAS, volontairement : les tables `achats`, `obligations`, `tickets`, `reversements`
-- annoncées au §6. Elles arrivent avec le code qui les utilise (J5 et J6). Faire coller aujourd'hui des
-- tables que rien ne lit, c'est du décor — et personne ne saurait dire, dans six semaines, si elles sont
-- vides parce qu'inutilisées ou parce que cassées.

-- ══ 1. Suspendre un compte, et le réactiver ═══════════════════════════════════════════════════════════
--
-- Suspendre, ce n'est ni supprimer ni rétrograder : l'accès est coupé, les données restent intactes, et
-- la décision est réversible d'un clic. C'est ce qu'il faut pour un impayé prolongé ou un abus, sans
-- détruire le travail d'un artisan.
--
-- Pourquoi une table à côté et pas une colonne sur `artisans` : cette table-là est gelée pour tout rôle
-- autre que le serveur (`lock_artisan_privileges`, 0055), et y ajouter un champ sensible de plus revient
-- à élargir une surface déjà protégée. Une table dédiée se lit en même temps que l'artisan (PostgREST
-- imbrique la relation), donc sans requête supplémentaire sur le chemin chaud.

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

-- Offrir des crédits : borné, motivé, journalisé. Les crédits sont gelés pour le navigateur (0055) :
-- seul le serveur écrit, et seulement par ici.
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

-- ══ 2. Rôle interne, compte de démonstration, origine déclarée (v11 §2, §4.2, §5) ═════════════════════

alter table public.artisans add column if not exists role_interne      text;
alter table public.artisans add column if not exists est_demo          boolean not null default false;
alter table public.artisans add column if not exists origine_declaree  text;
alter table public.artisans add column if not exists origine_precision text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'artisans_role_interne_chk') then
    alter table public.artisans add constraint artisans_role_interne_chk
      check (role_interne is null or role_interne in ('fondateur', 'partenaire'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'artisans_origine_chk') then
    alter table public.artisans add constraint artisans_origine_chk
      check (origine_declaree is null or origine_declaree in ('google', 'reseaux', 'bouche_a_oreille', 'presente', 'autre'));
  end if;
end $$;

comment on column public.artisans.role_interne is 'Rôle DANS L''ENTREPRISE (v11 §5) : fondateur = tout ; partenaire = ses apports, son relevé, la lecture des clients, ses fils de messagerie — et rien d''autre. Distinct de is_founder, qui reste le privilège technique.';
comment on column public.artisans.est_demo is 'Compte de démonstration ou de relecture des stores : EXCLU de tous les chiffres du Poste de contrôle (v11 §2.3). Ce n''est pas un compte à cacher, c''est un compte à ne pas compter.';
comment on column public.artisans.origine_declaree is 'Réponse de l''artisan à « Comment avez-vous connu Presti ? » (v11 §4.2). Source INDÉPENDANTE de la déclaration d''un apporteur : c''est elle qui permet de dire qu''un apport déclaré ne correspond à rien.';
comment on column public.artisans.origine_precision is 'Le nom saisi quand la réponse est « on m''a présenté Presti ». Jamais une liste de noms proposée : on ne souffle pas la réponse.';

create index if not exists artisans_role_interne_idx on public.artisans (role_interne) where role_interne is not null;
create index if not exists artisans_est_demo_idx     on public.artisans (est_demo) where est_demo;

-- Le verrou des privilèges (0055) est réécrit pour couvrir les trois nouvelles colonnes.
--
--   role_interne et est_demo : des PRIVILÈGES. Un artisan qui pourrait s'attribuer `role_interne` se
--   donnerait des droits d'entreprise depuis son navigateur.
--   origine_declaree : figée UNE FOIS RÉPONDUE. L'artisan répond librement à l'onboarding ; ensuite elle
--   ne bouge plus. Sans ça, la seule source indépendante de la preuve d'apport (v11 §4.2) pourrait être
--   changée après coup — par exemple sur demande insistante de celui qui réclame la commission.
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.credits := old.credits;
    new.credits_reset_le := old.credits_reset_le;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    new.sessions_invalides_avant := old.sessions_invalides_avant;
    new.slug := old.slug;
    new.slugs_anciens := old.slugs_anciens;
    new.suppression_demandee_le := old.suppression_demandee_le;
    new.domaine := old.domaine;
    new.domaine_verifie := old.domaine_verifie;
    -- v11 : rôle d'entreprise et marqueur de démonstration — jamais depuis un navigateur.
    new.role_interne := old.role_interne;
    new.est_demo := old.est_demo;
    -- v11 §4.2 : l'artisan répond une fois, puis c'est scellé.
    if old.origine_declaree is not null then
      new.origine_declaree  := old.origine_declaree;
      new.origine_precision := old.origine_precision;
    end if;
  end if;
  return new;
end $$;

-- ══ 3. La preuve d'un apport : score et signaux (v11 §4.3) ════════════════════════════════════════════
--
-- Le score ne décide de rien : il TRIE une file de revue. Ce qui compte, ce sont les `signaux` — des
-- faits datés, chacun vérifiable, affichés en clair. Un chiffre sans ses raisons serait pire qu'aucun
-- chiffre : il donnerait l'illusion d'un verdict.

alter table public.registre_apports add column if not exists score       int;
alter table public.registre_apports add column if not exists signaux     jsonb not null default '[]'::jsonb;
alter table public.registre_apports add column if not exists revue_le    timestamptz;
alter table public.registre_apports add column if not exists revue_par   uuid references public.artisans(id) on delete set null;
alter table public.registre_apports add column if not exists score_maj_le timestamptz;

comment on column public.registre_apports.score is 'Confiance de 0 à 100 — trie la file de revue, ne décide jamais seul (v11 §4.3, §4.6). Benj tranche, et sa décision est journalisée.';
comment on column public.registre_apports.signaux is 'Les faits qui font le score : [{ cle, sens: pour|contre, poids, detail, constate_le }]. Chacun vérifiable. Un score sans ses raisons ne serait pas montrable.';
comment on column public.registre_apports.revue_le is 'Quand Benj a tranché. Une ligne non revue reste dans la file « à valider », quel que soit son score.';

create index if not exists apports_revue_idx on public.registre_apports (revue_le, score) where revue_le is null;

-- ══ 4. Amorçage ═══════════════════════════════════════════════════════════════════════════════════════
--
-- Les rôles d'entreprise, écrits explicitement plutôt que déduits d'un privilège technique. C'est la
-- leçon du 07/09 : `insert ... select where is_founder` a promu un compte de test au rang
-- d'administrateur, parce qu'il faisait confiance à l'état de la base. On nomme, on ne déduit pas.
update public.artisans set role_interne = 'fondateur' where lower(email) = 'benjaminfiliot@gmail.com';
update public.artisans set role_interne = 'partenaire' where lower(email) = 'alexandremesroua@gmail.com';

-- Le compte que les stores exigent : il existe pour de bonnes raisons, il ne doit compter dans aucun
-- chiffre (v11 §2.3).
update public.artisans set est_demo = true where email in ('relecture-stores@presti-test.invalid', 'demo-menuisier@presti-test.invalid');

-- Aucun compte hors de cette liste ne garde un rôle du Centre. Écrit ici pour que le collage de cette
-- migration referme aussi la porte du 07/09, si elle avait été rouverte entre-temps.
delete from public.direction_roles r
  where not exists (
    select 1 from public.artisans a
     where a.id = r.user_id and lower(a.email) in ('benjaminfiliot@gmail.com', 'alexandremesroua@gmail.com')
  );
