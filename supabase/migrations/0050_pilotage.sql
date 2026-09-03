-- 0050 — Le poste de pilotage de la plateforme (v5 §9 G1).
--
-- Trois choses que l'interface artisan ne pouvait pas faire :
--  1. « Je prends la main » : l'assistant se tait sur CETTE conversation, et le client le voit.
--  2. Une réponse PROPOSÉE par l'assistant, qui attend la validation de l'artisan (mode assisté)
--     — avant, le mode « assistée » était un réglage sans effet dans la conversation.
--  3. Des règles d'automatisation en phrases (qualifié + photo → devis brouillon → notifier →
--     validation → envoi → acceptation → facture d'acompte), avec 4 préréglages.

-- 1. Prise de main, par conversation.
alter table public.leads add column if not exists prise_en_main boolean not null default false;
alter table public.leads add column if not exists prise_en_main_le timestamptz;
comment on column public.leads.prise_en_main is
  'true = l''artisan répond lui-même : l''assistant ne répond plus sur ce fil, le client en est informé.';

-- 2. État d'un message sortant : null = envoyé · 'proposition' = préparé par l'assistant, en attente
--    de validation · 'rejete' = écarté par l'artisan (conservé pour apprendre, jamais montré au client).
alter table public.messages add column if not exists etat text
  check (etat is null or etat in ('proposition', 'rejete'));
-- Le niveau de modèle qui a produit la réponse, pour l'afficher (« répondu avec Pro »).
alter table public.messages add column if not exists modele text;
create index if not exists messages_lead_etat_idx on public.messages (lead_id) where etat = 'proposition';

-- L'artisan valide/rejette ses propositions depuis son navigateur : UPDATE restreint aux
-- messages de SES leads, et seulement sur la colonne etat (le trigger ci-dessous fige le reste).
drop policy if exists message_update_own on public.messages;
create policy message_update_own on public.messages for update
  using (exists (select 1 from public.leads l where l.id = messages.lead_id and l.artisan_id = auth.uid()))
  with check (exists (select 1 from public.leads l where l.id = messages.lead_id and l.artisan_id = auth.uid()));

create or replace function public.messages_figer_contenu()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.lead_id := old.lead_id; new.sens := old.sens; new.type := old.type;
    new.contenu := old.contenu; new.sent_at := old.sent_at; new.canal_id := old.canal_id;
    new.externe_id := old.externe_id; new.modele := old.modele;
  end if;
  return new;
end $$;
drop trigger if exists trg_messages_figer on public.messages;
create trigger trg_messages_figer before update on public.messages
  for each row execute function public.messages_figer_contenu();

-- 3. Règles d'automatisation : une ligne par artisan, des maillons on/off + seuils.
create table if not exists public.regles_automatisation (
  artisan_id uuid primary key references public.artisans(id) on delete cascade,
  prereglage text not null default 'equilibre' check (prereglage in ('prudent', 'equilibre', 'reactif', 'tout_auto', 'perso')),
  -- { devis_auto: bool, photo_requise: bool, modele: 'standard'|'pro'|'expert', notifier: bool,
  --   validation: bool, envoyer_apres_validation: bool, acompte_pct: number|null }
  maillons jsonb not null default '{}'::jsonb,
  actif boolean not null default true,
  maj_le timestamptz default now()
);
alter table public.regles_automatisation enable row level security;
drop policy if exists regles_select_own on public.regles_automatisation;
create policy regles_select_own on public.regles_automatisation for select using (artisan_id = auth.uid());
drop policy if exists regles_upsert_own on public.regles_automatisation;
create policy regles_upsert_own on public.regles_automatisation for insert with check (artisan_id = auth.uid());
drop policy if exists regles_update_own on public.regles_automatisation;
create policy regles_update_own on public.regles_automatisation for update using (artisan_id = auth.uid()) with check (artisan_id = auth.uid());

-- D'où vient un devis : 'manuel' (l'artisan), 'outil' (l'assistant, dans la conversation), 'regle'
-- (une règle d'automatisation). Idempotence : jamais deux devis d'une même origine automatique
-- pour une même conversation — l'index unique tranche, même en rafale.
alter table public.devis add column if not exists source text
  check (source is null or source in ('manuel', 'outil', 'regle'));
create unique index if not exists devis_regle_par_lead_idx on public.devis (lead_id) where source = 'regle';
create unique index if not exists devis_outil_par_lead_idx on public.devis (lead_id) where source = 'outil';
