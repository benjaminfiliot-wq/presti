-- À jouer sur une base qui a reçu 0096..0122 (monter-base-essai.sh), AVANT 0123 pour le rattrapage, puis APRÈS pour le reste.
-- Avant : select public.acq_reponse_recue('{"id_externe":"old-1","texte":"STOP","source":"courriel","canal":"email_sollicite","expediteur":"x@exemple.invalid"}'::jsonb);
-- Après :
select public.acq_reponse_recue('{"id_externe":"n-1","texte":"Stop merci","source":"courriel","canal":"email_sollicite"}'::jsonb, 'Jean <jean@dom.invalid>');
select public.acq_reponse_recue('{"id_externe":"n-2","texte":"Stop","source":"courriel","canal":"email_sollicite","expediteur":"k@dom2.invalid"}'::jsonb);
select 'classe nulle et expéditeur gardé' as controle, id_externe, classe is null as classe_nulle, expediteur from ops.reponses where id_externe like 'n-%' order by 2;
select 'une seule signature' as controle, count(*) = 1 as ok from pg_proc where proname = 'acq_reponse_recue';
select public.acq_reponse_classer((select id from ops.reponses where id_externe='n-1'), '{"classe":"stop","source":"regle"}');
update ops.reponses set actes_le = now() where id_externe = 'n-1';
select 'STOP hors fil non rendu au Répondeur' as controle, jsonb_array_length(public.acq_reponses_a_repondre(50)) = 0 as ok;
update ops.reponses set classe_par = 'benj' where id_externe = 'n-1';
select 'rendu si Benj l''a décidé' as controle, jsonb_array_length(public.acq_reponses_a_repondre(50)) = 1 as ok;
