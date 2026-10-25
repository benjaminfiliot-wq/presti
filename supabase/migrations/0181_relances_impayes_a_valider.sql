-- 0181 · Relances d'impayés « à valider » (offre Studio). Décision de Benj du 25/10/2026 : deux offres. STUDIO = tout est préparé
-- automatiquement mais RIEN ne part sans la validation de l'artisan (capacité `factures.relances`) ; SIGNATURE = tout part seul
-- (`factures.relances.auto`, lib/plans.ts).
-- Écrite le 25/10/2026, APPLIQUÉE le 25/10/2026 (connecteur Supabase, essai à blanc puis contrôle 6/6 et test réel annulé).
--
-- Ordre : l'une ou l'autre marche d'abord sans danger, mais seule « 0181 puis le code » sert l'offre Studio dès le déploiement.
--  • Code déployé SANS 0181 : en Studio, le passage quotidien prend la relance, ne peut pas l'écrire « a_valider » (contrainte de
--    0159), rend la prise et note l'erreur — RIEN ne part (fail-closed) ; la liste « À valider » de l'écran reste vide. Signature
--    n'est pas touchée.
--  • 0181 SANS le code : rien ne change (les statuts et colonnes ajoutés ne sont écrits par personne).
--
-- Ce que fait 0181, sur public.relances_impayes (0159) — additive et idempotente, aucune ligne existante n'est modifiée :
--  1. deux colonnes NULLABLES : sujet et texte — le message préparé, tel que l'artisan le relit (et le retouche) avant de l'envoyer ;
--  2. la contrainte de statut est élargie : 'prise', 'envoyee' (0159), plus 'a_valider' (préparée, attend l'artisan) et 'rejetee'
--     (écartée par l'artisan : elle n'est jamais partie, et son rang n'est pas reproposé) ;
--  3. une relance 'a_valider' porte toujours son sujet et son texte ; le sujet tient sur une ligne ;
--  4. un index partiel pour lister vite les relances à valider d'un artisan.
--
-- RLS inchangée : l'artisan ne fait que LIRE ses lignes (relances_impayes_lecture, 0159) ; écrire reste au service (la route
-- app/api/factures/relances-auto/a-valider et le passage quotidien), insert/update/delete restent retirés à authenticated (0159).

alter table public.relances_impayes add column if not exists sujet text;
alter table public.relances_impayes add column if not exists texte text;

-- La contrainte de statut de 0159 est anonyme (nommée par Postgres) : on retire toute contrainte CHECK de la table qui parle du
-- statut, puis on pose les nôtres, nommées. Rejouée, la migration retire et repose les mêmes.
do $statut$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.relances_impayes'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%statut%'
  loop
    execute format('alter table public.relances_impayes drop constraint %I', c.conname);
  end loop;
end $statut$;

alter table public.relances_impayes drop constraint if exists relances_impayes_statut;
alter table public.relances_impayes add constraint relances_impayes_statut
  check (statut in ('prise', 'envoyee', 'a_valider', 'rejetee'));

alter table public.relances_impayes drop constraint if exists relances_impayes_contenu;
alter table public.relances_impayes add constraint relances_impayes_contenu check (
  (sujet is null or (char_length(sujet) between 1 and 150 and position(chr(10) in sujet) = 0 and position(chr(13) in sujet) = 0))
  and (texte is null or char_length(texte) between 1 and 4000)
);

alter table public.relances_impayes drop constraint if exists relances_impayes_a_valider_contenu;
alter table public.relances_impayes add constraint relances_impayes_a_valider_contenu
  check (statut <> 'a_valider' or (sujet is not null and texte is not null));

create index if not exists relances_impayes_a_valider on public.relances_impayes (artisan_id) where statut = 'a_valider';

comment on column public.relances_impayes.sujet is
  'Offre Studio (0181) : le sujet de la relance preparee, relu et eventuellement retouche par l artisan avant envoi.';
comment on column public.relances_impayes.texte is
  'Offre Studio (0181) : le message complet de la relance preparee (pied compris), tel que le client le recevra une fois valide.';
