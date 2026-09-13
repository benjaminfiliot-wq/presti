-- ============================================================================================
-- 0089 · Le bucket « sites » : où vivent les sites générés à la demande (v15 §3.2, validee → en_ligne)
--        (suite de 0088 — la commande existe, il faut un endroit pour le site livré)
--
-- Pourquoi un bucket de stockage et pas des colonnes : un site généré est un dossier statique
-- (HTML, CSS, images WebP/AVIF, sitemap) de quelques mégaoctets, jugé hors de l'application par
-- scripts/site-qa.mjs. Il se dépose tel quel (scripts/site-deposer.mjs), se sert tel quel (route
-- app/site-genere/[commande]), et se rend tel quel à l'artisan s'il s'en va (H3 : l'export, c'est le site).
--
-- Pourquoi PRIVÉ : tant que la direction n'a pas validé, l'aperçu est privé, sur un jeton — un bucket
-- public aurait rendu chaque fichier lisible à qui devine le chemin. Rien n'est lisible sans passer par
-- la route de diffusion, qui vérifie l'état de la commande et le jeton. Aucune politique pour anon ni
-- authenticated : seul le service_role écrit et lit.
--
-- Pourquoi une limite par fichier (5 Mo) : le juge refuse déjà une image de plus de 250 Ko ; la limite
-- du bucket est le garde-fou contre une erreur de dépôt, pas la règle.
--
-- Ce que ça débloque : le dépôt d'un site jugé (scripts/site-deposer.mjs), l'aperçu privé, la mise en
-- ligne depuis le Poste de contrôle. Le stockage est partagé avec les photos des artisans (1 Go) : on
-- surveille la place (scripts/promo-heberger.mjs garde 400 Mo de marge — même règle ici).
-- ============================================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('sites', 'sites', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;

-- Aucune politique : ni lecture ni écriture pour anon/authenticated. Le service_role contourne la RLS.
drop policy if exists "sites_public_read" on storage.objects;
