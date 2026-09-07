-- 0070 — Le partenaire n'est pas le propriétaire (prompt v11 §5).
--
-- Ce que la revue du 07/09 a trouvé, et qui vaut d'être écrit noir sur blanc :
--
--   Alexandre porte `is_founder = true`. La fonction `is_founder()` (0004) ne regarde que cette
--   colonne, et les policies de 0004 et 0006 lui accordent `for all` — LECTURE ET ÉCRITURE — sur les
--   devis, les lignes de devis, les demandes et les factures de TOUS les artisans. Avec son jeton de
--   navigateur, par PostgREST, sans passer par aucune de nos routes.
--
--   Le §5 du v11 dit l'inverse en toutes lettres : « Données des clients des artisans (conversations,
--   devis, photos) → 🚫 » pour Alexandre, et 🚫 pour Benjamin lui-même hors ticket support ouvert.
--   Le commentaire de 0065 l'avait d'ailleurs anticipé : « à découpler avant d'ouvrir cet accès à
--   quelqu'un d'autre que Benj ». C'est fait ici.
--
-- La correction tient en une fonction. `is_founder()` cesse de signifier « porte le drapeau
-- technique » pour signifier « est le PROPRIÉTAIRE de l'entreprise ». Un partenaire garde son
-- `is_founder` — c'est lui qui ouvre le Poste de contrôle, dont la garde lit la colonne côté serveur —
-- mais il perd le « voir tout » sur les données que les artisans confient à Presti.
--
-- Aucune policy n'est réécrite : elles appellent toutes `is_founder()`, et c'est elle qui change. Une
-- seule ligne à relire pour comprendre qui voit quoi, au lieu de huit policies dispersées.

create or replace function public.is_founder()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((
    select a.is_founder and coalesce(a.role_interne, 'fondateur') <> 'partenaire'
    from public.artisans a where a.id = auth.uid()
  ), false)
$$;

comment on function public.is_founder() is
  'Le PROPRIÉTAIRE de l''entreprise, pas seulement le porteur du drapeau technique (v11 §5). Un
   `role_interne = ''partenaire''` est exclu : il ouvre le Poste de contrôle (la garde lit la colonne
   `is_founder` côté serveur) mais ne voit AUCUNE donnée d''artisan par PostgREST — ni devis, ni
   demandes, ni factures. `role_interne` nul vaut fondateur, pour ne rien changer aux comptes
   existants qui n''ont pas encore de rôle.';

-- ── Le rôle du Poste de contrôle suit le rôle d'entreprise ────────────────────────────────────────────
--
-- Deux tables disaient le rôle : `direction_roles` (v10) et `artisans.role_interne` (v11). Deux
-- sources pour une même vérité finissent toujours par diverger — ici, Alexandre était `partenaire`
-- dans l'une et `direction` (donc écriture partout) dans l'autre. `role_interne` tranche ; on aligne
-- l'ancienne table dessus, et la garde lira les deux en donnant la priorité au rôle d'entreprise.
update public.direction_roles r set role = 'lecture'
  from public.artisans a
 where a.id = r.user_id and a.role_interne = 'partenaire' and r.role <> 'lecture';

insert into public.direction_roles (user_id, role)
  select a.id, case when a.role_interne = 'partenaire' then 'lecture' else 'direction' end
    from public.artisans a
   where a.is_founder and a.role_interne is not null
  on conflict (user_id) do nothing;
