-- ============================================================================================
-- 0077 · La commission d'apport est décidée, pas déduite
--
-- Le contrat (art. 5) fixe une fourchette, pas un chiffre : la commission d'un apport va de 10 %
-- à 20 %, et c'est Benjamin qui tranche, apport par apport. Jusqu'ici le code décidait à sa place
-- — 20 % en dur pour un apport prouvé, 10 % pour un apport contesté — ce qui rendait la fourchette
-- inaccessible et le contrat inapplicable.
--
-- La colonne est NULLABLE, et ce choix compte : NULL veut dire « Benjamin n'a rien décidé pour cet
-- apport, applique la règle par défaut ». Mettre 20 partout à la création aurait effacé la
-- différence entre un taux choisi et un taux subi — et le jour d'un désaccord avec Alexandre, c'est
-- exactement cette différence qu'il faut pouvoir montrer.
--
-- Le CHECK borne à la fourchette du contrat. Un taux hors contrat ne doit pas pouvoir entrer en
-- base, même par une route qu'on écrira dans six mois et qui aurait oublié de le vérifier.
-- ============================================================================================

alter table public.registre_apports add column if not exists taux_pct integer
  check (taux_pct is null or (taux_pct >= 10 and taux_pct <= 20));

comment on column public.registre_apports.taux_pct is
  'Commission décidée par Benjamin pour CET apport, en pourcentage entier, bornée à la fourchette du contrat (10 à 20). NULL = rien de décidé, la règle par défaut s''applique (20 % si l''apport compte, 10 % s''il est contesté). Un apport contesté reste plafonné à 10 % quoi qu''il y ait ici : le contrat prime sur le réglage.';
