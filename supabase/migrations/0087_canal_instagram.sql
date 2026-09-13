-- ============================================================================================
-- 0087 · Deux canaux de plus : Instagram, et les messages privés LinkedIn
--        (suite de 0086 — @prem_iumagence est devenu @prestiapp, et le démarchage LinkedIn commence)
--
-- Pourquoi « linkedindm » en plus de « linkedin » : le code 'linkedin' de 0086 est celui de la
-- PUBLICATION publique. Si le démarchage en messages privés portait le même lien, une inscription
-- venue d’un message serait indiscernable d’une inscription venue du post — et on ne saurait pas
-- lequel des deux marche. Deux codes, deux réponses.
--
-- Pourquoi un fichier de plus plutôt qu’une ligne ajoutée à 0086 : 0086 est déjà collée en
-- production (08/09 23:23). Modifier un fichier déjà passé ne change rien à la base et fait
-- croire le contraire — la seule façon d’ajouter un canal est un nouveau fichier à coller.
--
-- Ce que ça débloque : le lien de la bio Instagram, prestiapp.fr/a/instagram. Tant que ce code
-- n’existe pas, app/a/[code]/route.ts redirige vers l’accueil SANS poser d’empreinte (ligne 30,
-- « code inconnu : même redirection, sans cookie ») — le visiteur ne voit aucune différence,
-- mais l’onglet Clients du Poste de contrôle ne saura jamais qu’il venait d’Instagram. Un lien
-- de bio qui ne se compte pas est un lien qu’on ne saura pas juger dans un mois.
--
-- `canal = true`, pour la même raison qu’en 0086, et elle vaut de l’argent : sans ce drapeau,
-- chaque artisan arrivé par Instagram ouvrirait une commission de 20 % due à personne, prise sur
-- le résultat distribuable. Le piège complet est décrit dans 0086 — il n’est pas recopié ici.
--
-- La colonne est reprise en tête (`add column if not exists`) pour que ce fichier tienne debout
-- tout seul : collé sur une base où 0086 n’aurait pas passé, l’insertion échouerait sinon.
-- ============================================================================================

alter table public.apporteurs
  add column if not exists canal boolean not null default false;

-- Le code respecte la contrainte de 0067 (^[a-z0-9]{6,24}$) : neuf lettres minuscules.
insert into public.apporteurs (code, nom, canal) values
  ('instagram', 'Instagram — canal d''acquisition', true),
  ('linkedindm', 'LinkedIn — messages privés (démarchage)', true)
on conflict (code) do update set canal = true;
