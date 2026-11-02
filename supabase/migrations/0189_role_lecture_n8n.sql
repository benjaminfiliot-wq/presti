-- 0189 — Un rôle Postgres en LECTURE SEULE pour le n8n d'Oracle (02/11/2026).
--
-- Pourquoi : règle n8n-first de Benj du 02/11 (.claude/rules/architecture-outils.md). Les détecteurs du chantier 4 tournent dans n8n
-- (plans/011-cadrage-01-11/chantier-4-assistant-plan.md §0, tâche .orchestre/file/032-003.md) et lisent la base. n8n n'écrit JAMAIS ici.
--
-- Moindre privilège :
--   • SELECT seulement, colonne par colonne, sur les seules tables des détecteurs (relevé des colonnes du 02/11 par information_schema) :
--     ni nom, ni e-mail, ni téléphone, ni adresse, ni texte libre (message, note, contenu, objet, titre), ni IBAN, ni identifiant Stripe ;
--   • transactions en lecture seule par défaut, 3 connexions au plus, requêtes coupées à 30 s ;
--   • pas de BYPASSRLS : une politique SELECT par table, ouverte à ce seul rôle (les politiques de Presti filtrent par auth.uid(), vide ici).
--
-- Le mot de passe n'est JAMAIS dans ce fichier, ni saisi par un agent (.claude/rules/securite.md). Benj le pose lui-même, d'une ligne,
-- dans le SQL Editor, après cette migration :  alter role n8n_lecture with password '…';
-- Le rôle naît sans mot de passe : il ne peut pas se connecter tant que Benj ne l'a pas posé.
-- Transaction : celle de scripts/appliquer-migration.mjs (ou du SQL Editor), comme les autres migrations du dépôt.
--
-- Réversible :
--   do $$ declare t text; begin foreach t in array array['artisans','factures','devis','leads','messages','chantiers','chantier_materiaux',
--     'materiaux','stock','mouvements_stock','commandes_fournisseur','relances_impayes','crm_rappels','crm_journal','crm_apres_chantier',
--     'crm_reglages','assistant_actions','actions_auto','plateforme_config','regles_automatisation'] loop
--     execute format('drop policy if exists n8n_lecture_select on public.%I', t); end loop; end $$;
--   drop owned by n8n_lecture; drop role n8n_lecture;

do $role$
begin
  if not exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    create role n8n_lecture with login nosuperuser nocreatedb nocreaterole noinherit nobypassrls noreplication connection limit 3;
  end if;
end
$role$;

alter role n8n_lecture set default_transaction_read_only = on;
alter role n8n_lecture set statement_timeout = '30s';
alter role n8n_lecture set idle_in_transaction_session_timeout = '60s';

grant usage on schema public to n8n_lecture;

grant select (id, plan, is_founder, est_demo, leads_pause, plateforme_active, created_at, suppression_demandee_le) on public.artisans to n8n_lecture;
grant select (id, artisan_id, devis_id, numero, statut, date_emission, date_echeance, total_ht, total_ttc, acompte_pct, emise_le, verrouillee, avoir_de, payee_le, type_facture, situation_numero, avancement_pct, created_at, updated_at) on public.factures to n8n_lecture;
grant select (id, artisan_id, numero, statut, date_emission, validite_jours, acompte_pct, total_ht, total_ttc, lead_id, accepte_le, envoye_le, source, type_devis, created_at, updated_at) on public.devis to n8n_lecture;
grant select (id, artisan_id, statut, canal, origine, urgence, type_chantier, prise_en_main, prise_en_main_le, lu_le, created_at, updated_at) on public.leads to n8n_lecture;
grant select (lead_id, sens, type, etat, sent_at) on public.messages to n8n_lecture;
grant select (id, artisan_id, devis_id, statut, type_batiment, date_debut, date_fin_prevue, date_fin_reelle, cree_le, maj_le) on public.chantiers to n8n_lecture;
grant select (id, artisan_id, chantier_id, materiau_id, quantite, statut, sorti_le, cree_le, maj_le) on public.chantier_materiaux to n8n_lecture;
grant select (id, artisan_id, categorie, unite, seuil_alerte, fournisseur_id, cree_le, maj_le) on public.materiaux to n8n_lecture;
grant select (id, materiau_id, lieu, quantite, maj_le) on public.stock to n8n_lecture;
grant select (id, artisan_id, materiau_id, type, quantite, devis_id, source, cree_le) on public.mouvements_stock to n8n_lecture;
grant select (id, artisan_id, statut, commandee_le, livraison_prevue, recue_le, chantier_id, lignes, relances, relance_le, cree_le, maj_le) on public.commandes_fournisseur to n8n_lecture;
grant select (id, artisan_id, facture_id, rang, jour, statut, prise_le, envoyee_le) on public.relances_impayes to n8n_lecture;
grant select (id, artisan_id, lead_id, devis_id, chantier_id, type, echeance, fait_le, envoye_le, origine, cle, cree_le, maj_le) on public.crm_rappels to n8n_lecture;
grant select (id, artisan_id, objet, objet_id, chantier_id, champ, origine, etape_derivee, cree_le) on public.crm_journal to n8n_lecture;
grant select (artisan_id, avis, entretien, actif_depuis, maj_le) on public.crm_apres_chantier to n8n_lecture;
grant select (artisan_id, validation_auto, maj_le) on public.crm_reglages to n8n_lecture;
grant select (id, artisan_id, outil, mode, statut, objet_type, objet_id, cree_le, maj_le, expire_le) on public.assistant_actions to n8n_lecture;
grant select (id, artisan_id, type, source, ref_id, lead_id, prete_le, part_le, statut, motif, traite_le, cle) on public.actions_auto to n8n_lecture;
grant select (artisan_id, mode_reponse, auto_24_7, auto_debut, auto_fin, devis_auto, facture_auto, maj_le) on public.plateforme_config to n8n_lecture;
grant select (artisan_id, prereglage, maillons, actif, maj_le) on public.regles_automatisation to n8n_lecture;

-- Une politique SELECT par table, pour ce seul rôle (la RLS reste active ; les droits par colonne bornent ce qu'il lit).
do $politiques$
declare t text;
begin
  foreach t in array array['artisans','factures','devis','leads','messages','chantiers','chantier_materiaux','materiaux','stock',
    'mouvements_stock','commandes_fournisseur','relances_impayes','crm_rappels','crm_journal','crm_apres_chantier','crm_reglages',
    'assistant_actions','actions_auto','plateforme_config','regles_automatisation']
  loop
    execute format('drop policy if exists n8n_lecture_select on public.%I', t);
    execute format('create policy n8n_lecture_select on public.%I for select to n8n_lecture using (true)', t);
  end loop;
end
$politiques$;
