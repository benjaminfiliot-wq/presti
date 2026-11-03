// 036-030 — le scénario FICTIF de l'essai du palier « ombre » (données « Exemple. », aucun vrai compte) : épinglé dans test_workflow de
// presti-cerveau, rejoué hors ligne par scripts/branchement-reel-qa.mjs. Les deux écritures (cartes, marques) sont ÉPINGLÉES : rien n'atteint la base.
export const A = '00000000-0000-4000-8000-0000000000a1' // compte Studio, accueil en OMBRE
export const B = '00000000-0000-4000-8000-0000000000b2' // compte Signature, accueil en SIMULATION
export const L1 = '00000000-0000-4000-8000-a00000000001', L3 = '00000000-0000-4000-8000-a00000000003', L5 = '00000000-0000-4000-8000-b00000000005'
export const E1 = '00000000-0000-4000-8000-e00000000001', E2 = '00000000-0000-4000-8000-e00000000002', E3 = '00000000-0000-4000-8000-e00000000003', E5 = '00000000-0000-4000-8000-e00000000005'
const j = (xs) => xs.map((json) => ({ json }))
const effetCarte = (org, cle, lead, effet = 'ecrire_carte') => ({ effet, table: 'opportunites', requete: 'POST /rest/v1/opportunites?on_conflict=organisation_id,cle',
  corps: { organisation_id: org, cle, type_action: 'reponse_prospect', objet_type: 'demande', objet_id: lead, canal: 'email', brouillon: { objet: 'Exemple. Votre demande', texte: 'Exemple. Bonjour, merci pour votre message. Nous revenons vers vous pour convenir d’une visite.' } } })
export const PINS = {
  'Toutes les minutes': j([{ timestamp: '2026-11-03T18:40:00.000+01:00' }]),
  'Lire les interrupteurs généraux': j([{ artisan_id: A, departement: 'tous', palier: 'ombre', en_marche: true }, { artisan_id: B, departement: 'tous', palier: 'simulation', en_marche: true }]),
  'Lire les réglages des départements': j([
    { artisan_id: A, departement: 'accueil', palier: 'ombre', en_marche: true, plafond_jour: 10 }, { artisan_id: A, departement: 'tous', palier: 'ombre', en_marche: true, plafond_jour: null },
    { artisan_id: B, departement: 'accueil', palier: 'ombre', en_marche: true, plafond_jour: null }, { artisan_id: B, departement: 'tous', palier: 'simulation', en_marche: true, plafond_jour: null }]),
  'Lire les comptes et leurs offres': j([{ id: A, nom: 'Exemple. Plomberie Arnal-Démo', plan: 'studio', est_demo: false, suppression_demandee_le: null }, { id: B, nom: 'Exemple. Menuiserie Berthier-Démo', plan: 'signature', est_demo: false, suppression_demandee_le: null }]),
  'Lire les modes de réponse': j([{ artisan_id: A, mode_reponse: 'assistee' }, { artisan_id: B, mode_reponse: 'auto' }]),
  'Lire les événements non traités': j([
    { id: E1, artisan_id: A, type: 'demande_recue', objet_type: 'lead', objet_id: L1, cle: 'demande_recue:' + L1, faits: { lead_id: L1, canal: 'formulaire' }, survenu_le: '2026-11-03T17:38:00.000Z' },
    { id: E2, artisan_id: A, type: 'type_inconnu', objet_type: null, objet_id: null, cle: 'type_inconnu:1', faits: {}, survenu_le: '2026-11-03T17:38:10.000Z' },
    { id: E3, artisan_id: B, type: 'demande_recue', objet_type: 'lead', objet_id: L3, cle: 'demande_recue:' + L3, faits: {}, survenu_le: '2026-11-03T17:38:20.000Z' },
    { id: E5, artisan_id: B, type: 'demande_recue', objet_type: 'lead', objet_id: L5, cle: 'demande_recue:' + L5, faits: {}, survenu_le: '2026-11-03T17:38:30.000Z' }]),
  'Lire les demandes des événements': j([
    { id: L1, artisan_id: A, canal: 'formulaire', created_at: '2026-11-03T17:37:58.000Z', message: 'Exemple. Bonjour, je voudrais refaire ma salle de bain.', urgence: 'normal', type_chantier: 'Salle de bain', photos: null },
    { id: L3, artisan_id: A, canal: 'formulaire', created_at: '2026-11-03T17:38:18.000Z', message: 'Exemple. Une demande du compte A, lue sous un événement du compte B.', urgence: 'normal', type_chantier: null, photos: null },
    { id: L5, artisan_id: B, canal: 'formulaire', created_at: '2026-11-03T17:38:28.000Z', message: 'Exemple. Un placard sur mesure.', urgence: 'normal', type_chantier: 'Placard', photos: [] }]),
  'Appeler presti-dep-accueil': j([
    { contrat: 'presti-dep-accueil@1', cle_idempotence: 'dep:accueil:' + A.slice(24) + ':2026-11-03T1740', statut: 'ok', resultat: { cartes: ['h:decision:exemple-a1', 'h:decision:exemple-a1-pilote'] },
      effets_prevus: [effetCarte(A, 'h:decision:exemple-a1', L1), effetCarte(A, 'h:decision:exemple-a1-pilote', L1, 'mettre_en_file_pilote'), effetCarte(B, 'h:decision:exemple-autre-compte', L1), effetCarte(A, 'h:decision:exemple-a1', L1), { effet: 'ecrire_note', organisation_id: A, lead_id: L1, cle: 'h:qualification:exemple' }], effets_faits: [] },
    { contrat: 'presti-dep-accueil@1', cle_idempotence: 'dep:accueil:' + B.slice(24) + ':2026-11-03T1740', statut: 'ok', resultat: { cartes: ['h:decision:exemple-b2'] }, effets_prevus: [effetCarte(B, 'h:decision:exemple-b2', L5)], effets_faits: [] }]),
  'Appeler lib-journaliser': j([{ contrat: 'lib-journaliser@1', statut: 'ok', effets_prevus: [], effets_faits: [] }]),
  'Appeler lib-battement': j([{ contrat: 'lib-battement@1', statut: 'ok', effets_prevus: [], effets_faits: [] }]),
  'Écrire les cartes (ombre)': j([{ epingle: 'aucune écriture : essai' }]),
  'Marquer les événements traités': j([{ epingle: 'aucune écriture : essai' }]),
}
/** Ce que l'essai doit rendre (le juge le relit sur l'exécution n8n rapatriée ET le rejoue hors ligne). */
export const ATTENDU = {
  cartes: [{ artisan_id: A, cle: 'h:decision:exemple-a1', effet: 'ecrire_carte' }, { artisan_id: A, cle: 'h:decision:exemple-a1-pilote', effet: 'mettre_en_file_pilote' }],
  marques: { [A]: [E1, E2], [B]: [E3, E5] },
  rejets: ['type_sans_departement', 'demande_introuvable'],
}
if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(JSON.stringify(PINS))
