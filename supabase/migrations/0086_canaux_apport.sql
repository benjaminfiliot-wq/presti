-- ============================================================================================
-- 0086 · Un CANAL d’acquisition n’est pas un apporteur
--        (prompt v12 §4 — le suivi par canal, et le piège qu’il tend au relevé du partenaire)
--
-- Ce qu’on veut : savoir par où arrive chaque artisan. Facebook et LinkedIn reçoivent leur propre
-- lien — prestiapp.fr/a/facebook, prestiapp.fr/a/linkedin — et l’onglet Clients du Poste de
-- contrôle affiche déjà, pour chaque artisan, la colonne « Arrivé par ».
--
-- ── Le piège, suivi dans le code avant d’écrire une ligne de SQL ─────────────────────────────
--
--   1. app/a/[code]/route.ts pose une empreinte signée dès que le code existe et qu’il est actif ;
--   2. app/api/account/inscription/route.ts la relit et appelle rattacher_apport(…, 'lien', …) ;
--   3. cette fonction (0067, ligne 74) écrit alors statut = 'prouve' — c’est le statut le plus fort ;
--   4. lib/direction/apports.ts → verdict() rend { compte: true, tauxPct: 20 } pour 'prouve' ;
--   5. app/api/controle/releve/route.ts (ligne 131) recopie ce taux dans la ligne du relevé ;
--   6. lib/controle/releve.ts en déduit 20 % du chiffre d’affaires encaissé de ce client, et retire
--      cette commission du résultat distribuable.
--
-- Autrement dit : créer bêtement un apporteur « facebook » aurait ouvert, sur CHAQUE artisan venu
-- de Facebook, une commission de 20 % due à personne. Le relevé mensuel serait devenu faux — dans
-- le sens qui appauvrit l’entreprise, et sans que rien ne le signale.
--
-- ── Ce que la colonne fait, et ce qu’elle ne fait pas ────────────────────────────────────────
--
-- Elle dit ce que la ligne EST (un canal, pas une personne), elle ne dit pas ce qu’il faut en
-- faire : la règle vit dans lib/direction/apports.ts, à un seul endroit, réutilisée telle quelle
-- par le relevé, par les écrans et par la suite scripts/controle-canaux-e2e.mjs. Un canal ne
-- compte jamais pour la commission et n’entre jamais dans la file de revue des apports.
--
-- Ce qu’on ne change PAS : le rattachement lui-même. Une arrivée par /a/facebook entre bien au
-- registre, avec sa preuve et sa date — c’est tout l’intérêt du suivi par canal. Seul l’argent
-- est neutralisé.
--
-- ── Pourquoi la colonne et les deux lignes voyagent ENSEMBLE ─────────────────────────────────
--
-- Le code sait lire une base où la colonne n’existe pas encore (il traite alors tout le monde
-- comme un apporteur, exactement comme avant ce fichier). Ce repli n’est sans danger que parce
-- que les codes 'facebook' et 'linkedin' sont créés ICI, dans la même instruction collée : tant
-- que la colonne manque, ces deux codes n’existent pas non plus, donc aucune arrivée ne peut être
-- comptée à tort. Ne coller que la moitié de ce fichier casserait cet accord — il se colle entier.
--
-- Pas de bloc « do », pas de mot-clé CONSTANT : les deux ont fait refuser un collage le 08/09
-- (voir 0084 et scripts/migrations-jumelles-e2e.mjs). Tout ce qui suit est du SQL ordinaire.
-- ============================================================================================

-- ── 1. La colonne ────────────────────────────────────────────────────────────────────────────
-- `not null default false` : tout apporteur déjà au registre reste un apporteur rémunéré. Un
-- défaut à `true` aurait effacé d’un coup les commissions dues — l’erreur inverse, aussi grave.
alter table public.apporteurs
  add column if not exists canal boolean not null default false;

comment on column public.apporteurs.canal is 'true = CANAL d’acquisition (Facebook, LinkedIn) : un lien /a/<code> qui sert à savoir par où l’artisan est arrivé, derrière lequel il n’y a PERSONNE à rémunérer. Le relevé du partenaire lui applique un taux de 0 % et il n’entre pas dans la file de revue. false = apporteur au sens de l’article 5 du contrat : commission due. Voir verdict() dans lib/direction/apports.ts, qui teste cette colonne avant tout le reste.';

-- ── 2. Les deux canaux du §4 ─────────────────────────────────────────────────────────────────
-- Les codes respectent la contrainte de 0067 (^[a-z0-9]{6,24}$) et celle de lib/apports.ts : huit
-- lettres minuscules chacun. Ils sont lisibles exprès — contrairement au code d’un apporteur, un
-- canal n’a rien à cacher : le lien s’affiche dans une publication publique.
--
-- `do update set canal = true` plutôt que `do nothing` : si l’un de ces codes existait déjà en
-- base, le laisser à `false` rendrait le fichier inutile là où il sert. Recoller ce fichier ne
-- fait donc rien de plus que confirmer le drapeau.
insert into public.apporteurs (code, nom, canal) values
  ('facebook', 'Facebook — canal d''acquisition', true),
  ('linkedin', 'LinkedIn — canal d''acquisition', true)
on conflict (code) do update set canal = true;
