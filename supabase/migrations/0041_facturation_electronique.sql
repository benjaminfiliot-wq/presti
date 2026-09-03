-- v4 §10 — Facturation électronique : les données que la réforme rend obligatoires.
--
-- Échéance de l'artisan : 01/09/2027 (émission + e-reporting pour les TPE). On collecte
-- dès maintenant ce qui sera exigé, parce qu'une donnée manquante se rattrape mal
-- rétroactivement : personne ne rappellera 300 clients pour leur demander leur SIREN.

alter table public.factures
  add column if not exists client_siren       text,
  add column if not exists client_pays        text not null default 'FR',
  add column if not exists adresse_chantier   text,
  add column if not exists categorie_operation text not null default 'mixte'
    check (categorie_operation in ('biens', 'services', 'mixte')),
  add column if not exists devise             text not null default 'EUR',
  add column if not exists exoneration_code   text,
  add column if not exists tva_sur_debits     boolean not null default false,
  -- Piste d'audit (§10.7) : une facture émise ne se modifie plus, un avoir est obligatoire.
  add column if not exists emise_le           timestamptz,
  add column if not exists verrouillee        boolean not null default false,
  add column if not exists empreinte          text,
  add column if not exists avoir_de           uuid references public.factures(id) on delete set null;

comment on column public.factures.client_siren is
  'SIREN du client professionnel (9 chiffres, clé de Luhn vérifiée). Obligatoire en B2B à partir du 01/09/2027.';
comment on column public.factures.adresse_chantier is
  'Adresse du chantier, DISTINCTE de l''adresse de facturation — un artisan facture souvent à un siège pour un chantier ailleurs.';
comment on column public.factures.exoneration_code is
  'Motif d''exonération codifié (liste VATEX, EN 16931). Voir lib/facturation.ts.';
comment on column public.factures.empreinte is
  'SHA-256 du contenu au moment de l''émission : prouve que la pièce n''a pas été modifiée depuis (§10.6).';

-- L'artisan choisit la référence légale de sa mention de franchise. Le CGI reste admis
-- jusqu'au 31/12/2027 (tolérance BOFiP) ; « auto » suit la date.
alter table public.artisans
  add column if not exists mention_tva_base text not null default 'auto'
    check (mention_tva_base in ('auto', 'cgi', 'cibs')),
  add column if not exists tva_sur_debits boolean not null default false;

-- Verrou en base, pas seulement dans le code : une facture émise ne peut plus voir ses
-- montants, son numéro, son client ni sa date changer. C'est la règle qui rend la
-- comptabilité opposable — et §C3 en découle (une facture émise n'est jamais supprimable).
create or replace function public.facture_immuable() returns trigger
language plpgsql as $fn$
begin
  if old.verrouillee then
    if new.numero is distinct from old.numero
       or new.total_ht is distinct from old.total_ht
       or new.total_tva is distinct from old.total_tva
       or new.total_ttc is distinct from old.total_ttc
       or new.date_emission is distinct from old.date_emission
       or new.client_nom is distinct from old.client_nom
       or new.client_siren is distinct from old.client_siren
       or new.empreinte is distinct from old.empreinte then
      raise exception 'Facture emise : elle ne peut plus etre modifiee. Emettez un avoir.';
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists factures_immuables on public.factures;
create trigger factures_immuables before update on public.factures
  for each row execute function public.facture_immuable();

-- Une facture émise ne se supprime pas non plus.
create or replace function public.facture_non_supprimable() returns trigger
language plpgsql as $fn$
begin
  if old.verrouillee then
    raise exception 'Facture emise : conservation obligatoire (10 ans, art. L. 102 B du LPF).';
  end if;
  return old;
end $fn$;

drop trigger if exists factures_conservees on public.factures;
create trigger factures_conservees before delete on public.factures
  for each row execute function public.facture_non_supprimable();
