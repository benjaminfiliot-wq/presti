-- 0192 — Le motif de la réponse, la vue étroite des accusés dus et la marque « accusé envoyé » pour n8n (chantier 4, lot L18 ; workflow
-- n8n presti-accuse-reception, Oracle, id VnU1onu9T4Z2asTu ; tâche 032-047).
--
-- ÉTAT : NON APPLIQUÉE. Préparée le 03/11/2026 sur la demande de Benj (« Oui, prépare-la », 03/11, 10 h 45) ; attend son « go » écrit
-- (.claude/rules/securite.md, .claude/rules/migration-production.md). Essai à sec : AUCUN (ni PGlite ni Postgres sur l'hôte des agents) ;
-- le juge scripts/accuse-bascule-qa.mjs ne la contrôle que par lecture du texte. À faire avant de la coller : l'essai à sec de la session
-- principale (bloc DO qui exécute le jumeau puis RAISE EXCEPTION, rien ne reste).
--
-- Ordre, jamais un autre (on colle PUIS on lève) :
--   1. cette migration collée, puis les contrôles du pied du jumeau (_A_COLLER_sql_editor_0192_NU.sql) : tous au vert ;
--   2. la route écrit déjà le motif (app/api/leads/route.ts, écriture avalée tant que la colonne manque) : une demande d'essai (compte
--      de test) doit montrer son motif en base ;
--   3. le workflow repointé sur la vue (décision 3 de plans/011-cadrage-01-11/briefs/c4-n8n-accuse-reception-decisions.md), publié
--      envois DÉSACTIVÉS, passage d'ombre (scripts/ombre-accuse-reception.mjs) ;
--   4. envois réactivés, un passage constaté, PUIS le drapeau accuseParN8n levé dans la minute (lib/flags.ts).
--
-- Ce qu'elle pose (brief plans/011-cadrage-01-11/briefs/c4-n8n-accuse-reception.md, « Avant la bascule », points 2, 3 et 7) :
--   • leads.motif_reponse : le motif que la route écrit une fois, juste après sa décision ; contrainte : les onze valeurs de la route
--     (type MotifReponse de app/api/leads/route.ts = MotifDecision de lib/plateformeConfig.ts + auto, pause, throttle, credits) ;
--     index partiel sur created_at (les lectures de n8n filtrent par fenêtre de temps) ;
--   • leads.accuse_n8n_le : la marque « accusé et avis envoyés par n8n », écrite SEULEMENT par leads_marquer_accuse ;
--   • une garde : un jeton de navigateur (anon, authenticated) ne peut ni poser ni changer ces deux colonnes (sa valeur est ignorée,
--     sans erreur : un enregistrement de l'interface qui renvoie toute la ligne ne casse pas) ;
--   • la vue n8n_accuses_dus : les SEULES demandes dues — motif du silence (manuelle, escalade, horaire, humain, limite), créées dans
--     l'heure, pas encore marquées — avec ce que l'envoi exige et rien d'autre : nom et coordonnée du prospect (l'accusé lui est adressé ;
--     l'avis les recopie), nom, adresse et préférences de l'artisan (l'expéditeur, le Reply-To, la notification coupée), et le nombre de
--     demandes de la même adresse dans les 24 h d'avant (le plafond de 3 par destinataire : n8n n'a plus à lire les adresses des autres
--     demandes). Jamais : le message, les photos, l'adresse IP, l'adresse postale, le téléphone de l'artisan. Lue par n8n_lecture seul ;
--   • la fonction leads_marquer_accuse(ids) : security definer, n'écrit QUE accuse_n8n_le, QUE sur des demandes dues de l'heure, une fois,
--     200 identifiants au plus par appel ; exécutable par n8n_lecture seul (exception écrite à 0189, décision 7). n8n_lecture ouvre ses
--     transactions en lecture seule (0189) : l'appel se fait dans « start transaction read write; select …; commit; ».
--   • n8n_lecture lit aussi leads.motif_reponse et leads.accuse_n8n_le (aucune donnée personnelle) : le rang de la demande dans la
--     journée (plafonds du jour du workflow). Si 0189 n'est pas appliquée (rôle absent), les droits sont sautés sans erreur (avis) et
--     devront être rejoués après elle.
--
-- La vue s'exécute avec les droits de son propriétaire (pas security_invoker) : c'est ce qui permet à n8n_lecture de lire ces lignes-là
-- sans aucun droit sur leads.nom_prospect, leads.contact, artisans.nom ni artisans.email. L'avis « security definer view » du conseiller
-- Supabase est donc attendu ; il est borné par les droits retirés à public, anon, authenticated et service_role (security_barrier posé).
--
-- Contrôles à lancer après coup : le pied du jumeau (ne fait que LIRE) — colonnes, contrainte, index, garde, vue et ses colonnes exactes,
-- droits de la vue et de la fonction, fonction security definer à search_path vide.
--
-- Retour arrière (la route continue sans erreur : son écriture du motif est avalée) :
--   drop view if exists public.n8n_accuses_dus;
--   drop function if exists public.leads_marquer_accuse(uuid[]);
--   drop trigger if exists leads_motif_garde on public.leads;
--   drop function if exists public.leads_motif_garde();
--   do $$ begin if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
--     revoke select (motif_reponse, accuse_n8n_le) on public.leads from n8n_lecture; end if; end $$;
--   drop index if exists public.leads_motif_reponse_cree;
--   alter table public.leads drop constraint if exists leads_motif_reponse_borne;
--   alter table public.leads drop column if exists accuse_n8n_le, drop column if exists motif_reponse;
-- Transaction : celle de scripts/appliquer-migration.mjs (ou du SQL Editor), comme les autres migrations du dépôt.

alter table public.leads add column if not exists motif_reponse text;
alter table public.leads add column if not exists accuse_n8n_le timestamptz;

do $contrainte$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_motif_reponse_borne' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_motif_reponse_borne check (motif_reponse is null or motif_reponse in
      ('auto','assistee','verrou_offre','manuelle','escalade','horaire','humain','limite','pause','throttle','credits'));
  end if;
end
$contrainte$;

create index if not exists leads_motif_reponse_cree on public.leads (created_at) where motif_reponse is not null;

comment on column public.leads.motif_reponse is
  'Motif de la réponse décidé par /api/leads (0192) : auto, assistee, verrou_offre, manuelle, escalade, horaire, humain, limite, pause, throttle, credits ; vide pour un formulaire de site sans plateforme. Lu par n8n (presti-accuse-reception).';
comment on column public.leads.accuse_n8n_le is
  'Accusé de réception et avis envoyés par n8n (0192) ; écrit seulement par leads_marquer_accuse.';

-- La garde : seul le serveur (clé de service) et la fonction de marque posent ces colonnes.
create or replace function public.leads_motif_garde()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.motif_reponse := null;
      new.accuse_n8n_le := null;
    else
      new.motif_reponse := old.motif_reponse;
      new.accuse_n8n_le := old.accuse_n8n_le;
    end if;
  end if;
  return new;
end
$fn$;

drop trigger if exists leads_motif_garde on public.leads;
create trigger leads_motif_garde
  before insert or update of motif_reponse, accuse_n8n_le on public.leads
  for each row execute function public.leads_motif_garde();

revoke all on function public.leads_motif_garde() from public, anon, authenticated;

-- La vue étroite des accusés dus.
create or replace view public.n8n_accuses_dus with (security_barrier = true) as
select
  l.id,
  l.artisan_id,
  l.created_at,
  l.motif_reponse,
  l.nom_prospect,
  l.contact,
  (select count(*) from public.leads d
     where d.contact is not null
       and lower(btrim(d.contact)) = lower(btrim(l.contact))
       and d.created_at >= l.created_at - interval '24 hours'
       and (d.created_at, d.id) < (l.created_at, l.id))::integer as doublons_24h,
  a.nom as artisan_nom,
  a.email as artisan_email,
  a.notifications as artisan_notifications
from public.leads l
join public.artisans a on a.id = l.artisan_id
where l.motif_reponse in ('manuelle','escalade','horaire','humain','limite')
  and l.created_at >= now() - interval '1 hour'
  and l.accuse_n8n_le is null;

comment on view public.n8n_accuses_dus is
  'Les seules demandes dont n8n doit envoyer l''accusé et l''avis (0192) : silence, dernière heure, non marquées ; ce que l''envoi exige, rien d''autre. Lue par n8n_lecture seul.';

revoke all on public.n8n_accuses_dus from public, anon, authenticated, service_role;

-- La marque « accusé envoyé », bornée.
create or replace function public.leads_marquer_accuse(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $fn$
declare
  n integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 200 then
    raise exception 'leads_marquer_accuse : 200 identifiants au plus par appel (% reçus)', cardinality(p_ids);
  end if;
  update public.leads
     set accuse_n8n_le = now()
   where id = any(p_ids)
     and accuse_n8n_le is null
     and motif_reponse in ('manuelle','escalade','horaire','humain','limite')
     and created_at >= now() - interval '1 hour';
  get diagnostics n = row_count;
  return n;
end
$fn$;

revoke all on function public.leads_marquer_accuse(uuid[]) from public, anon, authenticated, service_role;

do $droits$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    grant select on public.n8n_accuses_dus to n8n_lecture;
    grant select (motif_reponse, accuse_n8n_le) on public.leads to n8n_lecture;
    grant execute on function public.leads_marquer_accuse(uuid[]) to n8n_lecture;
  else
    raise notice '0192 : rôle n8n_lecture absent (0189 non appliquée) — droits sautés, à rejouer après 0189';
  end if;
end
$droits$;
