-- ============================================================================================
-- 0082 · Quatre policies de 0074 qui ne peuvent rien autoriser
--
-- Une policy RLS FILTRE des lignes ; elle n'accorde pas le privilège SQL de lire la table. En
-- écrivant, dans cet ordre :
--
--     revoke all on public.tickets from public, anon, authenticated;
--     create policy "support : l'artisan lit ses tickets" on public.tickets for select …
--
-- 0074 a rendu la policy inatteignable pour toujours : le rôle `authenticated` n'a plus le droit
-- de faire SELECT, donc la policy n'est jamais évaluée. Un `GET /rest/v1/tickets` avec le jeton de
-- l'artisan reçoit un refus de privilège, pas un filtrage.
--
-- Ce n'est pas un trou de sécurité — c'est plus fermé que prévu, pas moins. Mais c'est trompeur :
-- on lit ces quatre lignes et on croit que l'artisan peut interroger ses tickets directement.
--
-- Le choix ici est de RETIRER les policies plutôt que de rendre le privilège, et il est délibéré :
-- l'architecture du produit fait passer toute lecture par une route serveur, qui journalise et qui
-- borne. L'artisan lit bien ses tickets, ses accès et ses consultations — par
-- `/api/securite/acces-support`, et ils partent aussi dans son export RGPD. La promesse tient ;
-- c'est le chemin annoncé qui était faux.
-- ============================================================================================

drop policy if exists "support : l'artisan lit ses tickets"          on public.tickets;
drop policy if exists "support : l'artisan lit son verrou"           on public.support_verrou;
drop policy if exists "support : l'artisan lit ses accès"            on public.acces_support;
drop policy if exists "support : l'artisan lit ses lectures"         on public.acces_support_lectures;

comment on table public.tickets is
  'Les demandes d''aide d''un artisan (0074). Aucun rôle client n''a de privilège SQL sur cette table (0082) : la lecture passe par /api/securite/acces-support, qui borne à l''artisan connecté. Une policy y serait inatteignable et donnerait à croire le contraire.';
