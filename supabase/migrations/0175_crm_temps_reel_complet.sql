-- 0175 · CRM « connecté à tout, en temps réel » (décision du fondateur du 21/10/2026, scripts/crm-connecte-qa.mjs).
-- Écrite le 21/10/2026. ✅ APPLIQUÉE le 21/10/2026 (contrôle vert). Ordre suivi : essai à sec d'abord, puis application, puis les contrôles de
-- supabase/controles/0175_crm_temps_reel_complet.sql, PUIS le drapeau `crmTempsReelComplet` (lib/flags.ts) — jamais l'inverse :
-- l'écran s'abonnerait à deux tables absentes de la publication et son canal temps réel entier tomberait.
-- Idempotente et additive : deux tables existantes rejoignent la publication, rien d'autre ne change (ni colonne, ni politique).
--
-- Les deux trous trouvés en comparant ce que GET /api/crm/vue LIT à ce que l'écran ÉCOUTE (lib/crm/tempsReel.ts) :
-- 1 ─ public.clients : le carnet (nom, e-mail, téléphone, adresse d'un client) — modifié depuis un autre écran ou un autre appareil,
--     la fiche et le pipeline ne le voyaient qu'à la relecture de la minute. Porte artisan_id ; RLS « client_all_own » (0002) :
--     chaque compte ne reçoit que SES lignes.
-- 2 ─ public.crm_journal : un dossier déplacé à la main dans le pipeline (champ 'etape') depuis un autre appareil. Porte artisan_id ;
--     RLS « crm_journal_lecture » (0141) : lecture de SES lignes seulement, aucune écriture par le navigateur.
-- Les DELETE ne sont pas filtrés par Supabase (voir 0158) : l'écran ne s'y fie pas, il relit chaque minute.

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['clients', 'crm_journal'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Contrôles (résultats attendus entre crochets) :
-- select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('clients', 'crm_journal');   -- [2]
-- select relrowsecurity from pg_class where oid = 'public.clients'::regclass;   -- [true]
-- select relrowsecurity from pg_class where oid = 'public.crm_journal'::regclass;   -- [true]
-- select has_table_privilege('anon', 'public.crm_journal', 'select');   -- [false]
