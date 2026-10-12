-- 0139 — Les canaux de messagerie de l'artisan : WhatsApp (Cloud API), Messenger, Instagram (webhook app/api/canaux/meta) et
-- Le Bon Coin (e-mail de notification reconnu dans la relève de la boîte branchée). NON APPLIQUÉE à l'écriture (12/10/2026).
--
-- Ordre : appliquer, contrôler, PUIS lever canauxWhatsapp / canauxReseaux / canauxLeboncoin (lib/flags.ts). Les drapeaux baissés,
-- rien ne lit ni n'écrit ces colonnes. Idempotente, additive : aucune colonne existante n'est modifiée, aucune ligne réécrite.
--
-- 1. La liaison compte Meta → artisan vit dans `public.canaux` (0036), à côté des boîtes e-mail : même chiffrement du secret
--    (AES-256-GCM applicatif, lib/secretBox.ts, clé CANAUX_KEY), même RLS, même suppression. `externe_id` porte l'identifiant
--    que Meta met dans chaque webhook : phone_number_id (WhatsApp), id de Page (Messenger), id du compte Instagram. UNIQUE par
--    type : un numéro ou une Page ne peut être rattaché qu'à un seul artisan — sinon ses messages iraient chez l'autre.
alter table public.canaux add column if not exists externe_id text;
alter table public.canaux add column if not exists meta_waba_id text;   -- WhatsApp : le compte WhatsApp Business (abonnement aux webhooks)
alter table public.canaux add column if not exists meta_page_id text;   -- Messenger / Instagram par la Page : la Page liée
alter table public.canaux add column if not exists meta_hote text;      -- Instagram : 'graph.facebook.com' (par la Page) ou 'graph.instagram.com'
create unique index if not exists canaux_externe_unique on public.canaux (type, externe_id) where externe_id is not null;

-- Les types connus. `not valid` : la contrainte vaut pour toute ligne écrite désormais, sans relire l'existant.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'canaux_type_connu' and conrelid = 'public.canaux'::regclass) then
    alter table public.canaux add constraint canaux_type_connu check (type in ('email', 'whatsapp', 'messenger', 'instagram')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'canaux_meta_hote_connu' and conrelid = 'public.canaux'::regclass) then
    alter table public.canaux add constraint canaux_meta_hote_connu check (meta_hote is null or meta_hote in ('graph.facebook.com', 'graph.instagram.com')) not valid;
  end if;
end $$;

-- 2. La conversation sait d'où elle vient et à qui répondre.
--    canal                    : texte libre existant ; prend désormais aussi 'whatsapp', 'messenger', 'instagram', 'leboncoin'.
--    canal_id                 : la liaison (ou la boîte e-mail qui a reçu la notification Le Bon Coin).
--    canal_externe_id         : la personne chez Meta (wa_id, PSID, IGSID) ou la clé de conversation Le Bon Coin.
--    canal_dernier_entrant_le : le dernier message du CLIENT — la fenêtre de 24 h de Meta se calcule dessus.
--    canal_lien_reponse       : Le Bon Coin seulement, le lien https://…leboncoin.fr où coller la réponse.
alter table public.leads add column if not exists canal_id uuid references public.canaux(id) on delete set null;
alter table public.leads add column if not exists canal_externe_id text;
alter table public.leads add column if not exists canal_dernier_entrant_le timestamptz;
alter table public.leads add column if not exists canal_lien_reponse text;
create index if not exists leads_canal_externe_idx on public.leads (artisan_id, canal, canal_externe_id) where canal_externe_id is not null;

-- 3. L'idempotence des webhooks : Meta rejoue un événement resté sans 200, parfois deux livraisons arrivent en même temps.
--    Une ligne par (liaison, identifiant du message chez Meta), posée AVANT tout rangement ; l'insertion qui perd la course
--    ne range rien. Ni texte ni nom ici : seulement des identifiants. Lue et écrite par le service_role seul.
create table if not exists public.canaux_evenements (
  canal_id   uuid not null references public.canaux(id) on delete cascade,
  externe_id text not null,
  recu_le    timestamptz not null default now(),
  primary key (canal_id, externe_id)
);
alter table public.canaux_evenements enable row level security;
revoke all on table public.canaux_evenements from public, anon, authenticated;
create index if not exists canaux_evenements_recu_idx on public.canaux_evenements (recu_le);
comment on table public.canaux_evenements is
  '0139 — idempotence des webhooks Meta (app/api/canaux/meta). Identifiants seulement. RLS sans politique : service_role.';

-- 4. Trouver ou ouvrir LE fil d'une personne, atomiquement. WhatsApp envoie un webhook par message : « Bonjour » puis « j'ai une
--    fuite » arrivent à quelques millisecondes ; sans verrou, deux livraisons ne trouvent aucun fil et en ouvrent chacune un
--    (constaté par scripts/canaux-meta-e2e.mjs avec deux rangements simultanés). Verrou consultatif de transaction sur
--    (artisan, canal, personne) : la seconde attend la première et retrouve son fil. Appelée par le service_role seul.
create or replace function public.canaux_conversation_ouvrir(p jsonb, p_depuis timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_artisan uuid := (p->>'artisan_id')::uuid;
  v_canal   text := p->>'canal';
  v_personne text := p->>'canal_externe_id';
  v_id uuid;
  v_statut text;
begin
  if v_artisan is null or v_canal not in ('whatsapp', 'messenger', 'instagram', 'leboncoin') or coalesce(v_personne, '') = '' then
    raise exception 'canaux_conversation_ouvrir : paramètres invalides';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('canaux:' || v_artisan::text || ':' || v_canal || ':' || v_personne, 0));

  select l.id, l.statut into v_id, v_statut
    from public.leads l
   where l.artisan_id = v_artisan and l.canal = v_canal and l.canal_externe_id = v_personne and l.updated_at >= p_depuis
   order by l.updated_at desc
   limit 1;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'statut', v_statut, 'nouveau', false);
  end if;

  insert into public.leads (
    artisan_id, canal, canal_id, canal_externe_id, nom_prospect, contact, message, statut,
    urgence, type_chantier, ville, canal_dernier_entrant_le, canal_lien_reponse
  ) values (
    v_artisan, v_canal, nullif(p->>'canal_id', '')::uuid, v_personne, left(p->>'nom_prospect', 120), nullif(left(p->>'contact', 200), ''),
    left(p->>'message', 5000), 'nouveau', coalesce(p->>'urgence', 'normal'), p->>'type_chantier', p->>'ville',
    coalesce((p->>'canal_dernier_entrant_le')::timestamptz, now()), nullif(p->>'canal_lien_reponse', '')
  ) returning id into v_id;
  return jsonb_build_object('id', v_id, 'statut', 'nouveau', 'nouveau', true);
end $$;
revoke all on function public.canaux_conversation_ouvrir(jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.canaux_conversation_ouvrir(jsonb, timestamptz) to service_role;

-- Contrôle après application (à lancer, résultat attendu entre crochets) :
--   select count(*) from information_schema.columns where table_name = 'leads' and column_name like 'canal\_%' escape '\';  [4, plus canal_reponse = 5]
--   select count(*) from information_schema.columns where table_name = 'canaux' and column_name in ('externe_id','meta_waba_id','meta_page_id','meta_hote'); [4]
--   select relrowsecurity from pg_class where relname = 'canaux_evenements'; [true]
