-- v4 §10 — Correctifs de l'audit métier du 2026-09-03. Deux défauts fiscaux graves.
--
-- ① Aucune facture n'était SCELLÉE. `/api/factures` crée la facture directement en
--    `statut = 'emise'`, mais le scellement (verrouillee/empreinte/emise_le) n'existait
--    que dans la branche PATCH, jamais empruntée. Les déclencheurs de la migration 0041
--    testent `if old.verrouillee` : ils ne se déclenchaient donc jamais. État constaté en
--    production : 10 factures, 0 verrouillée, 0 empreinte.
--    Conséquence mesurée par l'auditeur : avec le seul jeton du navigateur, un artisan
--    pouvait modifier le montant, le numéro, ou SUPPRIMER une facture émise. La chaîne
--    de factures n'était pas inaltérable (art. 286-I-3° bis CGI) et la conservation
--    10 ans (art. L. 102 B LPF) n'était pas garantie.
--
-- ② La policy RLS `factures_all_own` autorisait UPDATE et DELETE depuis le navigateur.
--    Le verrou applicatif (403 dans la route) ne servait à rien : PostgREST est joignable
--    directement. On retire ces deux droits — les modifications légitimes (passage à
--    « payée ») passent par la route serveur, qui a la clé de service.

-- ── ① Rattrapage : sceller les factures déjà émises.
update public.factures
set verrouillee = true,
    emise_le = coalesce(emise_le, created_at, now()),
    empreinte = coalesce(empreinte, encode(sha256(
      (coalesce(numero, '') || '|' || coalesce(client_nom, '') || '|' ||
       coalesce(total_ht::text, '') || '|' || coalesce(total_tva::text, '') || '|' ||
       coalesce(total_ttc::text, ''))::bytea), 'hex'))
where statut in ('emise', 'payee') and verrouillee = false;

-- ── ② Le navigateur peut lire et créer, plus modifier ni supprimer.
drop policy if exists factures_all_own on public.factures;
create policy factures_select_own on public.factures for select
  using (auth.uid() = artisan_id);
create policy factures_insert_own on public.factures for insert
  with check (auth.uid() = artisan_id);

-- Les lignes d'une facture suivent la même règle : elles font partie de la pièce.
drop policy if exists factures_lignes_all_own on public.factures_lignes;
create policy factures_lignes_select_own on public.factures_lignes for select
  using (exists (select 1 from public.factures f where f.id = factures_lignes.facture_id and f.artisan_id = auth.uid()));
create policy factures_lignes_insert_own on public.factures_lignes for insert
  with check (exists (select 1 from public.factures f where f.id = factures_lignes.facture_id and f.artisan_id = auth.uid() and f.verrouillee = false));

comment on policy factures_select_own on public.factures is
  'Lecture seule depuis le navigateur. Une facture émise ne se modifie ni ne se supprime : la correction passe par un avoir (v4 §10.7).';
