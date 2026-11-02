-- 0186 · Les SMS aux clients de l'artisan (chantier 4, lot L7) : la file des envois, les oppositions (STOP), les expéditeurs, la source
-- du numéro de téléphone, et l'interrupteur général sms_arret. Aucun SMS commercial, jamais de SMS pour prospecter (§11 l.667-668 ;
-- §0 bis rang 18, l.91-92 ; ADR-007).
--
-- ⚠️ NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj. (tâche 032-025, sur le Oracle, par claude-code ; rien n'a touché la base)
-- Le « go » pour 0186 suit aussi le choix du fournisseur et l'accord écrit sur le prix d'un segment (§11 l.684-685). Posée seule, elle
-- n'envoie rien : aucun code ne lit ces tables, l'interrupteur sms_arret naît ACTIF (= SMS arrêtés) et le drapeau smsClients reste baissé.
-- Ordre : essai à sec (session principale), « go » écrit, application, contrôle du pied du jumeau, PUIS le drapeau.
-- ⚠️ Dépend de 0185 (fonctions automatisation_maj_le et automatisation_objet_du_compte) : 0185 se pose AVANT 0186.
--
-- Source : plans/011-cadrage-01-11/chantier-4-assistant-plan.md §8.2 (l.567-568), §11 (l.661-685 : types l.666-668, à blanc l.669-670,
-- portes l.673-681, STOP l.682-683, RLS de sms_envois testée ici l.684) ; §0 bis question 3 (l.237 : la file sms_envois lue par
-- presti-sms-envoi) ; cadrage-p3.md:288 (sms_envois : client, fournisseur, coût, statut).
--
-- Règles tenues (comme 0185) : RLS dès la création, l'artisan ne fait que LIRE ses lignes ; les quatre gardes de 0138 ; anon retiré ;
-- insert, update, delete, truncate retirés à authenticated (écriture par la clé de service seulement) ; colonnes en français ;
-- aucune colonne organization_id ; le coût en entier (millièmes d'euro), jamais en flottant.
-- Ni le numéro de téléphone ni le nom du client n'entrent dans sms_envois : la file renvoie au client (client_id) ; le numéro se lit
-- au moment d'envoyer (§0 bis « Ce que n8n lit », l.142-145). Une opposition ne garde que l'EMPREINTE SHA-256 du numéro normalisé.
--
-- Retour arrière (dans cet ordre) :
--   drop table if exists public.sms_envois;
--   drop table if exists public.sms_oppositions;
--   drop table if exists public.sms_expediteurs;
--   drop trigger if exists clients_tel_source_garde on public.clients;
--   drop function if exists public.clients_tel_source_garde();
--   drop function if exists public.sms_envois_gardes();
--   drop function if exists public.sms_oppositions_figees();
--   drop function if exists public.sms_expediteurs_garde();
--   drop function if exists public.sms_segments(text);
--   drop function if exists public.sms_texte_conforme(text);
--   alter table public.clients drop constraint if exists clients_tel_source;
--   alter table public.clients drop column if exists tel_source_le;
--   alter table public.clients drop column if exists tel_source;
--   delete from ops.interrupteurs where nom = 'sms_arret';
--   alter table ops.interrupteurs drop constraint if exists interrupteurs_nom;
--   alter table ops.interrupteurs add constraint interrupteurs_nom check (nom in ('pause_generale', 'envoi_froid'));
-- Idempotente : rejouée, elle repose les mêmes objets.

-- Un verrou qui tarde (clients, ops.interrupteurs) fait échouer la migration proprement, au lieu de bloquer la production.
set local lock_timeout = '5s';

-- ══ 0. Le texte d'un SMS : STOP obligatoire, ni lien, ni montant, ni menace, ni « Presti » (§11 portes 4 et 5, l.678-679 ; rang 18) ═══
-- Miroir en base de controlerTexte (lib/sms/encodage.ts:63-72) : STOP en mot entier, casse indifférente (l.46-47) ; lien (l.49-51) ;
-- montant (l.53-54) ; menace (l.56-58) ; GSM-7 « pur », alphabet de base seul, sans l'extension (l.8-10, l.32-33) ; deux segments au
-- plus, soit 306 septets (§11 porte 5). Un SMS qui échoue est refusé AVANT l'envoi, en base, clé de service comprise.
create or replace function public.sms_texte_conforme(t text) returns boolean
language sql immutable set search_path = '' as $fn$
  select t is not null
    and char_length(t) between 1 and 306
    and btrim(t) <> ''
    and t ~* '(^|[^a-z0-9])stop([^a-z0-9]|$)'
    and t !~* '(https?://|www[.]|\m[a-z0-9-]+[.](fr|com|net|org|io|app|me|ly|co|eu|info|biz)\M|\mbit[.]ly\M)'
    and t !~* '([0-9]\s*(eur|euros?)\M|€)'
    and t !~* '(huissier|contentieux|poursuite|mise en demeure|recouvrement|tribunal|justice|saisie|p[ée]nalit[ée]|majoration|derni[eè]re chance|sans r[ée]ponse de votre part|urgent|sous 24|avocat|plainte)'
    and t ~ '^[A-Za-z0-9 \n\r@£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&''()*+,./:;<=>?¡ÄÖÑÜ§¿äöñüà-]*$'
    and t !~* 'presti'
$fn$;

-- Segments d'un texte GSM-7 pur (un septet par caractère) : 1 jusqu'à 160, puis 153 par segment chaîné (lib/sms/encodage.ts:23-25).
create or replace function public.sms_segments(t text) returns integer
language sql immutable set search_path = '' as $fn$
  select case when char_length(t) <= 160 then 1 else ceil(char_length(t) / 153.0)::integer end
$fn$;

-- ══ 1. sms_expediteurs : le nom de l'artisan, validé ; jamais « Presti », jamais le numéro court du fournisseur (§11 porte 4) ══════════
create table if not exists public.sms_expediteurs (
  artisan_id  uuid primary key references public.artisans(id) on delete cascade,
  nom         text not null check (nom ~ '^[A-Za-z0-9 ]{3,11}$' and nom ~ '[A-Za-z]' and nom !~* 'presti'),
  statut      text not null default 'a_valider' check (statut in ('a_valider', 'valide', 'refuse')),
  valide_le   timestamptz,
  acteur_id   uuid,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now(),
  constraint sms_expediteurs_validation check ((statut = 'valide') = (valide_le is not null))
);
alter table public.sms_expediteurs enable row level security;
drop policy if exists sms_expediteurs_lecture on public.sms_expediteurs;
create policy sms_expediteurs_lecture on public.sms_expediteurs for select to authenticated
  using ((select auth.uid()) = artisan_id);
-- Un nom changé redevient « a_valider » : un expéditeur validé ne se renomme pas en douce.
create or replace function public.sms_expediteurs_garde() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.nom is distinct from old.nom then
    new.statut := 'a_valider';
    new.valide_le := null;
  end if;
  new.maj_le := now();
  return new;
end
$fn$;
drop trigger if exists sms_expediteurs_maj_le on public.sms_expediteurs;
drop trigger if exists sms_expediteurs_garde on public.sms_expediteurs;
create trigger sms_expediteurs_garde before update on public.sms_expediteurs
  for each row execute function public.sms_expediteurs_garde();

-- ══ 2. sms_oppositions : un STOP reçu ferme la porte 3, pour cet artisan (§11 l.682-683) ════════════════════════════════════════
-- numero_empreinte : HMAC-SHA-256 du numéro normalisé, sous une clé serveur (jamais un SHA-256 nu : un numéro français se retrouve
-- par force brute en 10^8 essais). Une opposition ne se modifie pas ; elle ne s'efface que par la suppression du compte ou du client.
create table if not exists public.sms_oppositions (
  id                uuid primary key default gen_random_uuid(),
  artisan_id        uuid not null references public.artisans(id) on delete cascade,
  numero_empreinte  text not null check (numero_empreinte ~ '^[0-9a-f]{64}$'),
  client_id         uuid references public.clients(id) on delete set null,
  source            text not null check (source in ('stop_sms', 'client', 'artisan')),
  recue_le          timestamptz not null default now(),
  cree_le           timestamptz not null default now(),
  constraint sms_oppositions_unique unique (artisan_id, numero_empreinte)
);
alter table public.sms_oppositions enable row level security;
drop policy if exists sms_oppositions_lecture on public.sms_oppositions;
create policy sms_oppositions_lecture on public.sms_oppositions for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists sms_oppositions_client on public.sms_oppositions (client_id) where client_id is not null;

create or replace function public.sms_oppositions_figees() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  -- Seule la mise à null du client (on delete set null) passe : le numéro, le compte et la date restent.
  if new.artisan_id is distinct from old.artisan_id or new.numero_empreinte is distinct from old.numero_empreinte
     or new.source is distinct from old.source or new.recue_le is distinct from old.recue_le
     or (new.client_id is not null and new.client_id is distinct from old.client_id) then
    raise exception 'sms_oppositions : une opposition ne se modifie pas';
  end if;
  return new;
end
$fn$;
drop trigger if exists sms_oppositions_figees on public.sms_oppositions;
create trigger sms_oppositions_figees before update on public.sms_oppositions
  for each row execute function public.sms_oppositions_figees();

-- ══ 3. sms_envois : la file et le journal, une ligne par clé (§8.2 l.567 ; §11 porte 6, l.680-681) ═══════════════════════════════
-- mode « blanc » : la ligne est une estimation (etat « simule »), rien ne sort. Un envoi « incertain » n'est JAMAIS renvoyé.
create table if not exists public.sms_envois (
  id                   uuid primary key default gen_random_uuid(),
  artisan_id           uuid not null references public.artisans(id) on delete cascade,
  cle                  text not null check (char_length(cle) between 3 and 120 and cle ~ '^[A-Za-z0-9_:.-]+$'),
  type                 text not null check (type in ('rappel_rdv', 'devis_pret', 'rappel_paiement')),
  client_id            uuid references public.clients(id) on delete set null,
  mode                 text not null default 'blanc' check (mode in ('blanc', 'reel')),
  etat                 text not null default 'simule' check (etat in ('simule', 'en_file', 'envoye', 'delivre', 'incertain', 'echec', 'refuse')),
  texte                text not null,
  segments             smallint not null check (segments between 1 and 2),
  fournisseur          text not null default 'factice' check (fournisseur in ('factice', 'sweego')),
  fournisseur_ref      text check (fournisseur_ref is null or (char_length(fournisseur_ref) <= 100 and fournisseur_ref ~ '^[A-Za-z0-9_:.-]+$')),
  -- Le coût hors taxes en millièmes d'euro (0,045 € = 45), entier, calculé par le code à partir d'un tarif sourcé et daté.
  cout_ht_milliemes    integer not null default 0 check (cout_ht_milliemes between 0 and 10000),
  tarif_source         text check (tarif_source is null or char_length(tarif_source) between 3 and 200),
  tarif_date           date,
  motif                text check (motif is null or motif ~ '^[a-z][a-z0-9_]{1,59}$'),
  cree_le              timestamptz not null default now(),
  maj_le               timestamptz not null default now(),
  envoye_le            timestamptz,
  constraint sms_envois_cle_unique unique (artisan_id, cle),
  constraint sms_envois_texte check (public.sms_texte_conforme(texte)),
  constraint sms_envois_segments check (segments = public.sms_segments(texte)),
  constraint sms_envois_blanc check ((mode = 'blanc') = (etat = 'simule')),
  constraint sms_envois_reel_tarif check (mode = 'blanc' or etat = 'refuse' or (tarif_source is not null and tarif_date is not null and fournisseur <> 'factice')),
  constraint sms_envois_refus_motif check (etat <> 'refuse' or motif is not null)
);
alter table public.sms_envois enable row level security;
drop policy if exists sms_envois_lecture on public.sms_envois;
create policy sms_envois_lecture on public.sms_envois for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists sms_envois_compte_date on public.sms_envois (artisan_id, cree_le desc);
create index if not exists sms_envois_en_file on public.sms_envois (cree_le) where etat = 'en_file';
create index if not exists sms_envois_client on public.sms_envois (client_id) where client_id is not null;

-- Les gardes de la file, clé de service comprise :
--   • une ligne vise un client du même artisan ; le compte, la clé, le type, le mode et le texte ne changent plus ;
--   • une ligne naît « simule » (à blanc), « en_file » ou « refuse » ; l'état suit en_file → envoye | incertain | echec | refuse,
--     envoye → delivre | echec, incertain → delivre | echec ; « simule », « delivre », « echec » et « refuse » sont terminaux ;
--   • en réel, plafonds de §11 porte 6 (l.680) : 10 par artisan et 100 en tout par jour (heure de Paris), refusés en base au-delà.
create or replace function public.sms_envois_gardes() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
declare
  v_jour timestamptz;
  v_compte integer;
  v_total integer;
begin
  if tg_op = 'INSERT' then
    if new.etat not in ('simule', 'en_file', 'refuse') then
      raise exception 'sms_envois : une ligne naît simule, en_file ou refuse (reçu : %)', new.etat;
    end if;
    -- La date de création fait le compte des plafonds : elle n'est jamais fournie par l'appelant.
    new.cree_le := now();
    new.maj_le := now();
    if new.client_id is not null and not public.automatisation_objet_du_compte(new.artisan_id, 'client', new.client_id) then
      raise exception 'sms_envois : le client n''appartient pas à cet artisan';
    end if;
    if new.mode = 'reel' and new.etat = 'en_file' then
      -- L'interrupteur général, lu en base (0097:314-333) : actif = SMS arrêtés ; absent = refus (ops_interrupteur lève).
      if public.ops_interrupteur('sms_arret') then
        raise exception 'sms_envois : l''interrupteur sms_arret est actif, aucun SMS réel ne part';
      end if;
      perform pg_advisory_xact_lock(hashtext('sms_envois_plafonds'));
      v_jour := (date_trunc('day', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
      select count(*) filter (where e.artisan_id = new.artisan_id), count(*) into v_compte, v_total
        from public.sms_envois e
       where e.mode = 'reel' and e.etat <> 'refuse' and e.cree_le >= v_jour;
      if v_compte >= 10 then
        raise exception 'sms_envois : plafond de 10 SMS réels par artisan et par jour atteint';
      end if;
      if v_total >= 100 then
        raise exception 'sms_envois : plafond de 100 SMS réels par jour atteint';
      end if;
    end if;
    return new;
  end if;
  if new.artisan_id is distinct from old.artisan_id or new.cle is distinct from old.cle or new.type is distinct from old.type
     or new.mode is distinct from old.mode or new.texte is distinct from old.texte or new.cree_le is distinct from old.cree_le then
    raise exception 'sms_envois : le compte, la clé, le type, le mode et le texte ne changent pas';
  end if;
  if new.client_id is not null and new.client_id is distinct from old.client_id then
    raise exception 'sms_envois : le destinataire ne change pas';
  end if;
  if new.etat is distinct from old.etat
     and (old.etat || '>' || new.etat) <> all (array['en_file>envoye', 'en_file>incertain', 'en_file>echec', 'en_file>refuse',
                                                     'envoye>delivre', 'envoye>echec', 'incertain>delivre', 'incertain>echec']) then
    raise exception 'sms_envois : passage interdit de % à % (un envoi incertain n''est jamais renvoyé)', old.etat, new.etat;
  end if;
  if new.etat = 'envoye' and new.envoye_le is null then
    new.envoye_le := now();
  end if;
  new.maj_le := now();
  return new;
end
$fn$;
drop trigger if exists sms_envois_gardes on public.sms_envois;
create trigger sms_envois_gardes before insert or update on public.sms_envois
  for each row execute function public.sms_envois_gardes();

-- ══ 4. clients.tel_source : un numéro donné pour ce chantier (§11 porte 3, l.677) ══════════════════════════════════════════════
-- Nullables, sans défaut : aucune ligne existante n'est réécrite. Null = source inconnue = la porte 3 reste fermée.
alter table public.clients add column if not exists tel_source text;
alter table public.clients add column if not exists tel_source_le timestamptz;
alter table public.clients drop constraint if exists clients_tel_source;
alter table public.clients add constraint clients_tel_source
  check ((tel_source is null or tel_source in ('demande', 'artisan', 'import')) and (tel_source is null) = (tel_source_le is null));

-- La politique client_all_own (0002:31-33) laisse le navigateur écrire dans clients : la source du numéro, elle, ne s'écrit que par la
-- clé de service (une route de l'app). Depuis le navigateur (anon, authenticated), elle est ignorée à la création et gardée à la mise
-- à jour. Un numéro changé sans nouvelle source perd la sienne, quel que soit le rôle : la porte 3 se referme (fail-closed).
create or replace function public.clients_tel_source_garde() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.tel_source := null;
      new.tel_source_le := null;
    else
      new.tel_source := old.tel_source;
      new.tel_source_le := old.tel_source_le;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.tel is distinct from old.tel and new.tel_source is not distinct from old.tel_source then
    new.tel_source := null;
    new.tel_source_le := null;
  end if;
  return new;
end
$fn$;
drop trigger if exists clients_tel_source_garde on public.clients;
create trigger clients_tel_source_garde before insert or update on public.clients
  for each row execute function public.clients_tel_source_garde();

-- ══ 5. L'interrupteur général sms_arret (§8.2 l.568 ; §11 porte 1, l.674), dans ops.interrupteurs (0096:237-243) ══════════════════
-- Actif = SMS ARRÊTÉS. Il naît actif : rien ne part tant qu'un fondateur ne l'a pas coupé par ops_interrupteur_poser (0097:336-357).
-- La contrainte de nom de 0096 est anonyme : on retire celle qui parle du nom, puis on pose la nôtre, nommée (comme 0181:24-33).
do $nom$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'ops.interrupteurs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%pause_generale%'
  loop
    execute format('alter table ops.interrupteurs drop constraint %I', c.conname);
  end loop;
end
$nom$;
alter table ops.interrupteurs add constraint interrupteurs_nom check (nom in ('pause_generale', 'envoi_froid', 'sms_arret'));
insert into ops.interrupteurs (nom, actif, motif)
values ('sms_arret', true, 'semé ACTIF par 0186 : aucun SMS réel tant que le coût n''est pas approuvé par Benj')
on conflict (nom) do nothing;

-- ══ 6. Les gardes de 0138, les droits retirés (comme 0159:93-107) ══════════════════════════════════════════════════════════════
do $gardes$
declare t text;
begin
  foreach t in array array['sms_envois', 'sms_oppositions', 'sms_expediteurs'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
    execute format('drop policy if exists garde_session on public.%I', t);
    execute format('create policy garde_session on public.%I as restrictive for all to authenticated using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))', t);
    execute format('drop policy if exists garde_suspension_ins on public.%I', t);
    execute format('create policy garde_suspension_ins on public.%I as restrictive for insert to authenticated with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_maj on public.%I', t);
    execute format('create policy garde_suspension_maj on public.%I as restrictive for update to authenticated using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_sup on public.%I', t);
    execute format('create policy garde_suspension_sup on public.%I as restrictive for delete to authenticated using ((select public.compte_non_suspendu()))', t);
  end loop;
end
$gardes$;

comment on table public.sms_envois is 'File et journal des SMS aux clients (0186) : unique par (artisan_id, cle), à blanc par défaut, STOP obligatoire, plafonds en base. Clé de service seulement.';
comment on table public.sms_oppositions is 'Oppositions aux SMS (STOP) par artisan, sur l empreinte SHA-256 du numéro normalisé (0186).';
comment on table public.sms_expediteurs is 'Nom d expéditeur SMS de l artisan, validé ; jamais Presti (0186).';
comment on column public.clients.tel_source is 'D où vient le numéro (0186) : demande (donné par le client pour ce chantier), artisan, import ; null = inconnu, aucun SMS.';
