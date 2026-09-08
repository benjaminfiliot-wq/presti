-- ============================================================================================
-- 0079 · La sixième policy fondateur, oubliée par 0074
--
-- 0074 a supprimé cinq policies `founders_all_*` (devis, devis_lignes, leads, factures,
-- factures_lignes) en écrivant, en tête, qu'ouvrir la porte étroite du mode support tout en les
-- laissant reviendrait à « poser une serrure sur une porte ouverte ».
--
-- Il en restait une sixième, et personne ne l'a vue : `founders_read_artisans` (0004). Elle donne
-- à tout compte pour lequel `is_founder()` rend vrai le droit de lire TOUTES les lignes de
-- `public.artisans` — donc l'IBAN, le BIC, le SIRET, le téléphone, l'adresse et l'email de chaque
-- artisan de la plateforme — depuis un simple navigateur, avec la clé publique.
--
-- Ce qui rend ce trou différent des cinq autres : `is_founder()` est une fonction SQL. Elle ne
-- connaît ni le second facteur, ni les sessions vérifiées, ni le journal — 0065 le dit mot pour mot
-- pour justifier de ne PAS garder le Poste de contrôle avec elle. Une session au mot de passe seul
-- suffisait donc à aspirer les coordonnées bancaires de tous les artisans, sans laisser une trace.
--
-- Rien ne dépend d'elle : toutes les lectures navigateur de `artisans` sont bornées à `eq('id',
-- soi-même)` et passent par `artisan_select_own` (0001) ; le Poste de contrôle, lui, lit avec la
-- clé de service, qui ne regarde aucune policy.
-- ============================================================================================

drop policy if exists founders_read_artisans on public.artisans;

-- Ce qui reste sur la table, et qui suffit : chacun lit, crée et modifie SA ligne (0001).
comment on table public.artisans is
  'Le profil d''un artisan. Depuis 0079, aucun rôle ne lit les lignes des autres via la RLS : le Poste de contrôle passe par la clé de service (journalisée), et le mode support par la fenêtre que l''artisan ouvre lui-même. La table porte l''IBAN et le BIC — c''est pour eux que cette policy a été retirée.';
