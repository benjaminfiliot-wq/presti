-- 0062 — Une seule source de vérité pour le mode de réponse (prompt v7, bloc 1a).
--
-- Le bug : deux réglages coexistaient — l'ancien booléen `artisans.reponse_auto` (écrit par
-- /profil) et `plateforme_config.mode_reponse` (écrit par /plateforme). /api/conversation lisait
-- le booléen AVANT la config, /api/conversation/stream faisait l'inverse : le même artisan n'avait
-- pas le même mode selon la route qui servait, et « remettre auto » ne changeait rien.
--
-- Le remède : chaque compte reçoit sa ligne de config (dérivée du booléen, pour ne surprendre
-- personne), et le booléen devient une colonne morte — conservée pour ne rien casser, plus
-- jamais écrite ni lue par le code (lib/plateformeConfig.ts).
--
-- Reproduit à l'identique par l'API de service le 05/09 (données, pas schéma) : rejouer ce
-- fichier est sans effet grâce au `not exists`.

insert into public.plateforme_config (artisan_id, mode_reponse)
select a.id, case when a.reponse_auto = false then 'manuelle' else 'auto' end
from public.artisans a
where not exists (select 1 from public.plateforme_config c where c.artisan_id = a.id);

comment on column public.artisans.reponse_auto is
  'OBSOLÈTE depuis 0062 (05/09/2026) : plus jamais écrite ni lue. Le mode de réponse vit dans plateforme_config.mode_reponse.';
