-- 0171 — L'OPPOSITION du client aux messages d'après-chantier (audit de conformité du 20/10, réserve A1 ; drapeau crmApresChantier).
--
-- Chaque message d'après-chantier (demande d'avis, proposition d'entretien) dit au client qu'il peut refuser les suivants en
-- répondant. Jusqu'ici ce refus n'était noté nulle part : l'artisan pouvait renvoyer. Cette table le garde, par artisan, sous la
-- forme de l'EMPREINTE de l'adresse (sha256 de l'adresse en minuscules, 32 premiers caractères hexadécimaux, la même que la clé de
-- débit de app/api/crm/apres-chantier/message) : jamais l'adresse en clair. L'envoi la lit et refuse (lib/apresChantier.ts,
-- decisionEnvoiApres) ; l'artisan la pose depuis le message préparé (« Le client ne veut plus de messages »,
-- app/api/crm/apres-chantier/opposition). Une opposition ne s'efface pas d'elle-même (RGPD art. 21.3 : elle doit tenir) ; elle part
-- avec le compte de l'artisan (cascade).
--
-- Fermée à tous les rôles du navigateur : RLS active SANS politique, aucun droit pour `anon` ni `authenticated` ; seules les routes
-- serveur (clé de service, après la garde du CRM) la lisent et l'écrivent. Rejouable (if not exists).

create table if not exists public.crm_apres_opposition (
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  empreinte   text not null check (empreinte ~ '^[0-9a-f]{32}$'),
  cree_le     timestamptz not null default now(),
  primary key (artisan_id, empreinte)
);

alter table public.crm_apres_opposition enable row level security;
revoke all on public.crm_apres_opposition from anon;
revoke all on public.crm_apres_opposition from authenticated;

comment on table public.crm_apres_opposition is
  'Clients qui ont refusé les messages d''après-chantier d''un artisan (empreinte sha256 de l''adresse, 32 hex ; jamais l''adresse). Lue avant chaque envoi (refus 409). RLS sans politique : service_role seul.';
