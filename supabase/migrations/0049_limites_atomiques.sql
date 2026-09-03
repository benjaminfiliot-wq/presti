-- 0049 — Compteurs de limitation ATOMIQUES (audit v4 §3 : « course sur les compteurs »).
--
-- Le défaut : chaque garde-fou faisait `select count(*)` PUIS `insert`. Douze requêtes
-- lancées en parallèle lisaient toutes « 5 » avant qu'aucune n'ait écrit, et passaient
-- toutes : 11 réponses IA + 11 emails là où 6 étaient permis. Ça coûte de l'argent, et
-- ça relaie des emails. Le correctif est le même que `consume_credit` (0008) : une seule
-- fonction SQL, un seul aller-retour, et c'est le verrou de ligne de Postgres qui
-- sérialise les concurrents — pas le code applicatif.
--
-- Principe : une clé (« leads:ip:1.2.3.4 »), une fenêtre FIXE (le début du créneau de
-- p_fenetre_s secondes qui contient `now()`), un compteur. `insert … on conflict do update
-- … returning` incrémente atomiquement et renvoie le rang de l'appel : il passe si ce
-- rang est ≤ p_max. Exactement p_max appels passent par fenêtre, quel que soit le
-- parallélisme. Fenêtre fixe plutôt que glissante : c'est ce qui rend l'opération
-- atomique en une ligne, et pour un anti-abus c'est équivalent.

create table if not exists public.limites (
  cle        text        not null,
  fenetre    timestamptz not null,           -- début du créneau
  fenetre_s  int         not null default 60, -- longueur du créneau (sert à la purge)
  compteur   int         not null default 0,
  primary key (cle, fenetre)
);
comment on table public.limites is
  'Compteurs anti-abus par clé et par créneau. Écrits uniquement par consommer_limite() (service_role). Aucune donnée personnelle en clair : les emails y entrent hachés.';

-- Jamais lu ni écrit par le navigateur : RLS activée SANS policy, et privilèges retirés.
alter table public.limites enable row level security;
revoke all on public.limites from public, anon, authenticated;

create or replace function public.consommer_limite(p_cle text, p_max int, p_fenetre_s int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int; f timestamptz;
begin
  if p_cle is null or length(p_cle) = 0 or length(p_cle) > 200 then
    raise exception 'consommer_limite : clé invalide';       -- erreur de programmation, pas un cas métier
  end if;
  if p_max is null or p_max < 0 then p_max := 0; end if;
  if p_fenetre_s is null or p_fenetre_s < 1 then p_fenetre_s := 60; end if;

  f := to_timestamp(floor(extract(epoch from now()) / p_fenetre_s) * p_fenetre_s);

  insert into public.limites (cle, fenetre, fenetre_s, compteur)
    values (p_cle, f, p_fenetre_s, 1)
    on conflict (cle, fenetre) do update set compteur = public.limites.compteur + 1
    returning compteur into n;

  -- Purge opportuniste (≈ 1 appel sur 200) : les créneaux terminés depuis plus de 2 jours
  -- ne servent plus à rien. Pas de pg_cron à configurer, pas de table qui enfle.
  if random() < 0.005 then
    delete from public.limites
      where fenetre + make_interval(secs => fenetre_s) < now() - interval '2 days';
  end if;

  return n <= p_max;
end $$;

-- Même règle que consume_credit (0008) : réservée au serveur.
revoke execute on function public.consommer_limite(text, int, int) from public, anon, authenticated;
grant execute on function public.consommer_limite(text, int, int) to service_role;
