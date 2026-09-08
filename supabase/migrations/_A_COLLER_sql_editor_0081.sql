-- ============================================================================================
-- 0081 · Une facture émise garde le régime de TVA qu'elle avait le jour de son émission
--
-- Défaut trouvé par l'audit du 08/09. Le PDF d'une facture n'est jamais stocké : il est régénéré
-- à la demande depuis les lignes, et le régime de TVA vient de `artisans.tva_regime` lu EN DIRECT.
--
-- Un artisan qui franchit le seuil de la franchise en base, puis repasse dessous l'année suivante
-- — les deux sens arrivent, et l'écran de comptabilité surveille précisément ce seuil — voit
-- toutes ses anciennes factures se réimprimer avec le régime d'aujourd'hui. Une facture émise à
-- 20 % ressort à 0 %, Total TTC = Total HT, et la mention de franchise s'ajoute en bas d'une pièce
-- qui a bel et bien facturé de la TVA. Le client, lui, en a une autre version dans ses archives.
--
-- C'est le contraire de ce qu'une facture est censée être : le PDF doit rendre la pièce telle
-- qu'elle a été émise, pas telle qu'on la ferait aujourd'hui.
--
-- La colonne est NULLABLE : les factures d'avant cette migration n'ont pas de régime figé, et on
-- ne peut pas le deviner rétroactivement sans risquer d'inventer. Pour celles-là, le code garde
-- l'ancien comportement (le régime courant) — c'est le moins mauvais, et c'est explicite.
-- ============================================================================================

alter table public.factures add column if not exists tva_regime text
  check (tva_regime is null or tva_regime in ('franchise', 'reel'));

comment on column public.factures.tva_regime is
  'Le régime de TVA de l''artisan AU MOMENT DE L''ÉMISSION (0081). Le PDF est régénéré à la demande : sans cette colonne, une facture émise à 20 % se réimprimait à 0 % le jour où l''artisan repassait en franchise. NULL = facture antérieure à 0081, le régime courant s''applique faute de mieux.';

-- Les factures déjà scellées portent la vérité dans leurs totaux : si elles ont de la TVA, elles
-- ont été émises au réel. C'est une déduction sûre — pas une supposition — et elle évite de laisser
-- en NULL des pièces dont on connaît le régime avec certitude.
update public.factures
   set tva_regime = case when coalesce(total_tva, 0) > 0 then 'reel' else null end
 where tva_regime is null and verrouillee = true and coalesce(total_tva, 0) > 0;
