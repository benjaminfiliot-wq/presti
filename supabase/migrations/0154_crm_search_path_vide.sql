-- [APPLIQUÉE en production le 13/10/2026 ~09 h 45 : essai à sec (refus 50/3, sortie 2/3, journal 3), puis contrôle 3 fonctions à search_path vide, 2 déclencheurs, navigateur sans droit, 0 ligne]
-- 0154 · [ÉCRITE le 13/10/2026, APPLIQUÉE le 13/10 (voir ligne 1) — essai à sec d'abord : bloc DO + EXECUTE + raise exception, puis les
-- contrôles du bas] CRM : les fonctions `security definer` du CRM tournent avec `search_path = ''` et des noms qualifiés.
--
-- Audit d'attaque du 12/10/2026 (point restant) : crm_sortir_materiau (0141, refaite par 0153), crm_journal_chantier et
-- crm_journal_tache (0141) sont `security definer` avec `set search_path = public`. Un objet homonyme placé plus tôt dans le
-- chemin (ou un schéma public qu'un rôle pourrait garnir) serait résolu avec les droits du propriétaire. Avec un chemin
-- VIDE, chaque table et chaque fonction est nommée par son schéma (public.…) : rien ne se résout par hasard. Les fonctions
-- de pg_catalog (now, left, trim, to_char, coalesce) restent trouvées : pg_catalog est toujours cherché en premier.
--
-- Le CORPS des trois fonctions est celui d'aujourd'hui (0153 pour la sortie, 0141 pour le journal), mot pour mot, aux noms
-- qualifiés près. Les déclencheurs ne changent pas (create or replace function garde l'oid). Droits : inchangés, reposés.
-- crm_verifier_proprietaire (0141) est `security invoker` : hors du périmètre de l'audit, elle n'est pas touchée.
-- Idempotente.

create or replace function public.crm_sortir_materiau(p_artisan uuid, p_reservation uuid)
returns numeric language plpgsql security definer set search_path = '' as $fn$
declare
  r       public.chantier_materiaux%rowtype;
  c       public.chantiers%rowtype;
  v_dispo numeric;
  v_reste numeric;
begin
  select * into r from public.chantier_materiaux where id = p_reservation and artisan_id = p_artisan for update;
  if not found then raise exception 'crm : reservation introuvable'; end if;
  if r.statut <> 'reserve' then raise exception 'crm : reservation deja traitee'; end if;
  select * into c from public.chantiers where id = r.chantier_id and artisan_id = p_artisan;
  if not found then raise exception 'crm : chantier introuvable'; end if;
  select s.quantite into v_dispo from public.stock s
   where s.materiau_id = r.materiau_id and s.lieu = r.lieu for update;
  if coalesce(v_dispo, 0) < r.quantite then
    raise exception 'crm : stock insuffisant (reste %)', trim(to_char(coalesce(v_dispo, 0), 'FM999999990.##'));
  end if;
  v_reste := public.appliquer_mouvement(p_artisan, r.materiau_id, 'sortie', r.quantite, r.lieu, c.devis_id, 'devis', null,
                                        left('Chantier : ' || c.titre, 300));
  update public.chantier_materiaux set statut = 'sorti', sorti_le = now(), maj_le = now() where id = r.id;
  insert into public.crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers, note)
  values (p_artisan, 'materiau', r.id, r.chantier_id, 'sortie', 'reserve', 'sorti', left(r.quantite::text || ' — ' || r.lieu, 300));
  return v_reste;
end $fn$;
revoke all on function public.crm_sortir_materiau(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_sortir_materiau(uuid, uuid) to service_role;

create or replace function public.crm_journal_chantier()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if tg_op = 'INSERT' then
    insert into public.crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers)
    values (new.artisan_id, 'chantier', new.id, new.id, 'creation', null, new.statut);
  elsif new.statut is distinct from old.statut then
    insert into public.crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers)
    values (new.artisan_id, 'chantier', new.id, new.id, 'statut', old.statut, new.statut);
  end if;
  return new;
end $fn$;
revoke all on function public.crm_journal_chantier() from public, anon, authenticated;

create or replace function public.crm_journal_tache()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if new.faite is distinct from old.faite then
    insert into public.crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers, note)
    values (new.artisan_id, 'tache', new.id, new.chantier_id, 'faite', old.faite::text, new.faite::text, left(new.libelle, 300));
  end if;
  return new;
end $fn$;
revoke all on function public.crm_journal_tache() from public, anon, authenticated;

-- L'empreinte client n'est plus un sha-256 à préfixe fixe (audit d'attaque du 12/10) : le commentaire le dit.
comment on column public.crm_notes.client_cle is
  'Empreinte HMAC-SHA-256 (hex) de la cle de regroupement du client, avec un secret serveur et l artisan (lib/crm/empreinte.ts) : jamais l adresse ni le nom en clair.';

-- Contrôle après application (à lancer, résultat attendu entre crochets) :
--   select proname, proconfig from pg_proc where pronamespace = 'public'::regnamespace
--    and proname in ('crm_sortir_materiau', 'crm_journal_chantier', 'crm_journal_tache') order by 1;
--     [crm_journal_chantier {search_path=""} · crm_journal_tache {search_path=""} · crm_sortir_materiau {search_path=""}]
--   select count(*) from pg_proc where pronamespace = 'public'::regnamespace
--    and proname in ('crm_sortir_materiau', 'crm_journal_chantier', 'crm_journal_tache') and prosecdef;  [3]
--   select has_function_privilege('authenticated', 'public.crm_sortir_materiau(uuid, uuid)', 'execute');  [false]
--   select count(*) from pg_trigger where tgname in ('crm_journal_chantier', 'crm_journal_tache') and not tgisinternal;  [2]
-- Test réel ANNULÉ (dans une transaction terminée par rollback) : créer un chantier → 1 ligne de journal « creation » ;
-- changer son statut → 1 ligne « statut » ; réserver 1 unité d'un matériau en stock puis la sortir → reste = stock − 1.
