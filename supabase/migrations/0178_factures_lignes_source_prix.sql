-- 0178 · FACTURES : la provenance du prix suit la ligne du devis jusqu'à la facture.
-- Écrite et appliquée le 21/10/2026 (vérification en production du 21/10 : défaut GRAVE).
--
-- Le défaut : lib/lignes.ts recopie `source_prix` (« vos tarifs · … », « estimation »…) sur chaque ligne, et
-- lib/factureDepuisDevis.ts insère ces lignes dans factures_lignes. Or seule devis_lignes avait la colonne (0038, l.42) :
-- Postgres refusait TOUT l'insert des lignes, et la facture faite depuis un devis chiffré par l'IA restait émise, numérotée,
-- scellée… et VIDE (0 ligne). Aucune facture d'un vrai compte touchée au 21/10 (10 factures en base, toutes sur des comptes
-- de démonstration).
--
-- Le correctif : la même colonne, texte libre facultatif, sur factures_lignes. Additive et idempotente : rien d'existant ne
-- change, les déclencheurs d'immuabilité des lignes (factures_lignes_immuables) s'appliquent à elle comme aux autres.
-- Garder la provenance sur la facture est voulu : l'artisan voit d'où sort chaque prix facturé, comme sur son devis.

alter table public.factures_lignes add column if not exists source_prix text;
comment on column public.factures_lignes.source_prix is
  'D''où vient ce prix, recopié de la ligne du devis : "vos tarifs · <fournisseur> · <date>", "ordre de grandeur du marché" ou "estimation" (0178, 21/10/2026).';
