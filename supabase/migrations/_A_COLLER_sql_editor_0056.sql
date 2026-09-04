-- 0056 — Cache MUTUALISÉ des prix vus chez les fournisseurs (recherche §8 F3).
--
-- Le problème, mesuré le 04/09/2026 : une recherche à froid coûte 0,17 € en Standard, 0,21 € en
-- Pro et 0,27 € en Expert (tokens Anthropic, outils web_search et web_fetch compris), alors qu'un
-- crédit rapporte 0,236 € en Studio et 0,165 € en Signature. C'était la seule fonction du produit
-- à marge négative, et la seule dont le coût augmente avec le nombre de clients au lieu de
-- diminuer. Une réponse de conversation coûte 0,005 € : le problème est propre à la recherche.
--
-- Le remède : ce que l'assistant a vu chez Castorama pour « plaque de plâtre BA13 » est une
-- information PUBLIQUE, identique pour tout le monde. La relire pour chaque artisan est un gâchis.
-- On la garde 72 heures et on la sert à tous. Le coût est payé une fois, la marge monte avec le
-- nombre de clients, et l'artisan reçoit son résultat en une fraction de seconde au lieu de
-- vingt-cinq secondes. La fonction devient meilleure ET rentable, au lieu de l'un contre l'autre.
--
-- Trois choix méritent leur explication :
--
-- 1. La clé est (requête normalisée, DOMAINE, version), jamais l'identifiant du fournisseur.
--    Chaque artisan possède ses propres lignes dans `fournisseurs` : le « Castorama » de l'un
--    n'a pas l'identifiant du « Castorama » de l'autre. Indexer là-dessus donnerait un cache
--    avec exactement un lecteur par entrée — un taux de réussite nul, sans le moindre message
--    d'erreur pour le signaler. Le domaine, lui, est commun.
--
-- 2. Ni le niveau ni le modèle n'entrent dans la clé. La navigation qui ouvre les pages tourne
--    en Haiku dans les trois niveaux : l'entrée est strictement la même. Les y mettre diviserait
--    le taux de réussite par trois, en silence.
--
-- 3. `resultats` est un tableau JSON, pas une ligne par prix. L'écriture devient un seul
--    `on conflict do update` atomique, dans l'esprit de `consommer_limite` (0049) ; une ligne par
--    prix imposerait un delete puis insert, non atomique, avec une fenêtre où le cache est vide.
--
-- Ce que cette table ne contient JAMAIS : aucun identifiant d'artisan, aucun nom de fournisseur
-- tel que l'artisan l'a saisi (« Casto du 12 » lui appartient), aucun prix négocié. Uniquement ce
-- qu'un visiteur anonyme voit sur une page publique. C'est cette frontière qui rend le partage
-- légitime, et c'est pour cela que l'écriture est réservée à une liste blanche de domaines
-- vérifiés à la main (voir `lib/inventaire/liste-depart.ts`, contrôlé côté serveur).

create table if not exists public.recherche_cache (
  -- La requête réduite à sa forme comparable (minuscules, sans accents, ponctuation en espaces,
  -- espaces repliés). Normalisée en TypeScript, jamais en SQL : la même fonction doit servir à
  -- l'écriture et à la lecture, et elle est testée avec le reste du moteur.
  requete_norm   text        not null,
  -- L'hôte sans « www. » : castorama.fr. C'est ce que le moteur passe déjà en allowed_domains.
  domaine        text        not null,
  -- Change quand le moteur change de façon à rendre les entrées anciennes incomparables
  -- (nouveaux champs, nouvelle validation). Incrémenter cette valeur retire tout l'ancien cache
  -- du service sans rien supprimer, et sans migration.
  version        smallint    not null default 1,
  -- Les résultats tels que le moteur les a validés, SANS le sceau : celui-ci est lié à l'artisan
  -- qui lit, il est donc recalculé à chaque lecture. Le stocker n'aurait aucun sens et créerait
  -- un piège (un sceau d'un autre artisan est refusé à l'enregistrement, en silence).
  resultats      jsonb       not null default '[]'::jsonb,
  -- Le fournisseur a bien été consulté, mais rien n'a été trouvé : cette absence a de la valeur,
  -- elle évite de repayer la même recherche infructueuse pendant 72 heures.
  raison_non_vu  text,
  -- La VRAIE date de lecture sur le site. Elle est servie telle quelle et affichée à l'artisan :
  -- c'est elle qui rend le cache honnête. Ne jamais la remplacer par la date du jour.
  vu_le          timestamptz not null default now(),
  expire_le      timestamptz not null,
  -- Le niveau qui a produit l'entrée, pour la mesure seulement (jamais pour la clé).
  tier_source    text        not null default 'standard',
  -- Combien de fois cette entrée a évité un appel payant : c'est la mesure de ce que le cache
  -- rapporte, et le seul moyen de régler la durée de validité sur des faits.
  hits           int         not null default 0,
  dernier_hit_le timestamptz,
  primary key (requete_norm, domaine, version),
  -- Une clé mal normalisée ne casse rien visiblement : elle rate simplement, toujours. Ces
  -- contraintes transforment un bogue silencieux en erreur immédiate.
  -- Bornée court À DESSEIN : cette table est lue pour d'AUTRES comptes, et la requête est un
  -- champ libre. « ba13 chantier mme dupont 12 rue des lilas » n'y entre jamais. Le code applique
  -- la même règle (clePartageable) ; la contrainte est le filet.
  constraint recherche_cache_requete_propre check (
    length(requete_norm) between 2 and 80
    and coalesce(array_length(string_to_array(requete_norm, ' '), 1), 1) <= 8
    and requete_norm = lower(requete_norm)
    and requete_norm not like '  %'
    and btrim(requete_norm) = requete_norm
  ),
  constraint recherche_cache_domaine_propre check (
    length(domaine) between 3 and 253
    and domaine = lower(domaine)
    and domaine not like 'www.%'
    and domaine not like '%/%'
    and position('.' in domaine) > 0
  ),
  constraint recherche_cache_duree check (expire_le > vu_le)
);

comment on table public.recherche_cache is
  'Prix PUBLICS vus chez un fournisseur, partagés entre tous les artisans pendant 72 h. Aucune donnée personnelle, aucun identifiant d''artisan, aucun prix négocié. Écrit uniquement par le serveur (service_role) et uniquement pour des domaines d''une liste blanche vérifiée à la main.';

-- Un seul index en plus de la clé primaire : celui de la purge. La lecture est toujours
-- « une requête, plusieurs domaines », donc elle parcourt la clé primaire.
create index if not exists recherche_cache_expire_idx on public.recherche_cache(expire_le);

-- Jamais lue ni écrite par le navigateur : RLS activée SANS policy, et privilèges retirés.
-- Même modèle que `limites` (0049). L'artisan voit les prix à travers la route, re-scellés
-- pour lui ; il n'a aucune raison d'atteindre la table, et beaucoup de raisons de ne pas pouvoir.
alter table public.recherche_cache enable row level security;
revoke all on public.recherche_cache from public, anon, authenticated;

-- Purge des entrées périmées. Vercel n'autorise que deux tâches planifiées sur cette formule
-- (vercel.json), toutes deux déjà prises : cette fonction est appelée depuis la tâche de
-- relances, comme la purge des comptes. Elle garde une marge d'un jour après l'expiration —
-- une entrée périmée ne sert plus, mais son compteur `hits` reste lisible un jour de plus pour
-- mesurer ce que le cache rapporte.
create or replace function public.purger_cache_recherche()
returns int language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  delete from public.recherche_cache where expire_le < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.purger_cache_recherche() from public, anon, authenticated;
grant execute on function public.purger_cache_recherche() to service_role;

-- Compteur d'usage du cache. Une seule requête, pas de lecture préalable : c'est une mesure,
-- elle ne doit jamais ralentir ni faire échouer la recherche qui l'a déclenchée.
create or replace function public.incrementer_hits_cache(p_requete text, p_domaines text[], p_version smallint default 1)
returns void language sql security definer set search_path = public as $$
  update public.recherche_cache
     set hits = hits + 1, dernier_hit_le = now()
   where requete_norm = p_requete and version = p_version and domaine = any(p_domaines);
$$;

revoke all on function public.incrementer_hits_cache(text, text[], smallint) from public, anon, authenticated;
grant execute on function public.incrementer_hits_cache(text, text[], smallint) to service_role;
