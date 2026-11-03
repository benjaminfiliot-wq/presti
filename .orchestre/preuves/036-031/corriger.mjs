// 036-031 · Fait parler les 10 gabarits artisans au VRAI schéma. Lit les exports des lots (036-013/014/015, ceux qui sont dans n8n),
// applique les rattachements (schema-gabarits.md), écrit les exports corrigés ici, et les opérations update_workflow (ops-<gabarit>.json).
// Aucun réseau. Les nœuds Code existants ne sont pas touchés ; seuls les nœuds HTTP vers Supabase changent, et la lecture de configuration
// (vue inexistante) devient une chaîne de lectures réelles suivie d'un Code « composer » qui garde le NOM du nœud lu par la suite.
import fs from 'node:fs'; import path from 'node:path';
const ICI = '.orchestre/preuves/036-031';
const BASE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/';
const LOTS = { '036-013': ['accueil-boite', 'accueil-envoi', 'accueil-leads', 'accueil-reponse'], '036-014': ['devis', 'facturation', 'suivi'], '036-015': ['apres', 'direction', 'operations'] };
const DEP = { 'accueil-boite': 'accueil', 'accueil-envoi': 'accueil', 'accueil-leads': 'accueil', 'accueil-reponse': 'accueil', devis: 'devis', facturation: 'facturation', suivi: 'suivi', apres: 'apres', direction: 'direction', operations: 'operations' };
const OFFRE = { studio: 'studio', signature: 'signature', business: 'signature', entreprise: 'signature', essentiel: 'essentiel', gratuit: 'essai', essai: 'essai' };
const CAPACITES = { studio: ['canaux.email', 'relances', 'factures.relances', 'assistant'], essentiel: ['canaux.email', 'relances', 'factures.relances'], essai: ['canaux.email'],
  signature: ['canaux.email', 'relances', 'factures.relances', 'assistant', 'plateforme.ia.auto', 'relances.auto', 'factures.relances.auto', 'crm', 'assistant.pilote'] };
const QUALIF = { grille: [{ critere: 'urgence=urgent', poids: 40 }, { critere: 'canal=formulaire', poids: 25 }, { critere: 'canal=site', poids: 25 }, { critere: 'canal=telephone', poids: 15 }, { critere: 'canal=email', poids: 15 }], seuils: { haute: 60, normale: 30 }, delais_cibles_min: { haute: 15, normale: 60, a_revoir: 240 } };

const q = (pairs) => ({ parameters: pairs.map(([name, value]) => ({ name, value })) });
const filtre = (C) => ['artisan_id', `=eq.${C}`];
const compteDe = (n) => { const p = (n.parameters.queryParameters?.parameters || []).find((x) => x.name === 'organisation_id'); return p ? String(p.value).replace(/^=eq\./, '') : null; };
const enTete = (v) => ({ parameters: [{ name: 'Prefer', value: v }] });

// Une carte d'agent (0157 + 0194:72-85) : à confirmer, en attente, échéance 7 jours, département, motif sans donnée de client, sources, clé.
const carte = (dep, S, { outil, titre, objetType, objetId, apercu, motif }) => `={{ JSON.stringify({ artisan_id: ${S}.organisation_id, conversation_id: ${objetId}, tour: 1, outil: String(${outil}).replace(/[^a-z0-9_]/g, '_').slice(0, 60), mode: 'confirmation', statut: 'en_attente', titre: String(${titre}).slice(0, 200), entrees: { cle: ${S}.cle, objet_id: ${objetId} }, apercu: ${apercu}, objet_type: ${objetType}, objet_id: ${objetId}, expire_le: $now.plus({ days: 7 }).toISO(), origine: 'agent', departement: '${dep}', motif: ${JSON.stringify(motif)}, sources: [{ fait: 'decision', source: 'gabarit-artisan-${dep}:'.concat(${S}.cle) }], cle: String(${S}.cle).replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 120) }) }}`;
// Un fait daté (0185:125), clé « fait:… » : relu par le composer comme clé déjà faite.
const fait = (S, type, objetType, objetId, cle) => `={{ JSON.stringify({ artisan_id: ${S}.organisation_id, type: ${type}, objet_type: ${objetType}, objet_id: ${objetId}, cle: String(${cle}).replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 120), faits: {} }) }}`;
const VD = "$('Décider de la voie').first().json";

// Rattachement de chaque nœud HTTP : { url, query, headers, body } ; « composer » remplace une lecture de configuration.
const R = {
  'accueil-boite': {
    'Lire les réglages': { composer: true },
    'Déposer dans la plateforme': { url: 'rpc/deposer_message', body: "={{ JSON.stringify({ p: { artisan_id: $json.organisation_id, cle: $json.cle, conversation_cle: $json.conversation_cle, canal_origine: $json.canal_origine, ref_externe: $json.ref_externe, id_boite: $json.id_boite, fil_externe: $json.fil_externe, sujet: $json.sujet, texte: $json.texte, de_nom: $json.de_nom, de_adresse: $json.de_adresse, recu_le: $json.recu_le, a_photo: $json.a_photo, repondre_au_client: $json.repondre_au_client } }) }}" },
    'Journaliser le dépôt': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Dédoublonner et classer').item.json", "'message_depose'", 'null', 'null', "'fait:depot:'.concat($('Dédoublonner et classer').item.json.cle)") },
  },
  'accueil-leads': {
    'Lire les réglages': { composer: true },
    'Déposer dans la plateforme': { url: 'rpc/deposer_message', body: "={{ JSON.stringify({ p: { artisan_id: $json.organisation_id, cle: $json.cle, conversation_cle: $json.conversation_cle, canal_origine: $json.canal_origine, ref_externe: $json.ref_externe, sujet: $json.sujet, texte: $json.texte, de_nom: $json.de_nom, de_adresse: $json.de_adresse, telephone: $json.telephone, recu_le: $json.recu_le, a_photo: $json.a_photo, repondre_au_client: $json.repondre_au_client } }) }}" },
    'Journaliser le dépôt': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Normaliser les leads').item.json", "'lead_depose'", 'null', 'null', "'fait:depot:'.concat($('Normaliser les leads').item.json.cle)") },
  },
  'accueil-reponse': {
    'Lire les réglages': { composer: true },
    'Lire les événements non traités': { url: 'n8n_evenements_a_traiter', query: (C) => [['select', 'id,type,cle,objet_type,objet_id,conversation_cle:objet_id,canal_origine:faits->>canal,donnees:faits,survenu_le'], filtre(C), ['order', 'survenu_le.asc,id.asc'], ['limit', '50']] },
    'Écrire la carte': { url: 'assistant_actions?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=representation', body: carte('accueil', '$json', { outil: '$json.corps.type_action', titre: "'Répondre à une nouvelle demande'", objetType: "'conversation'", objetId: '$json.corps.objet_id', apercu: '{ brouillon: $json.corps.brouillon || null, canal: $json.corps.canal || null, pilote_en_reel: false }', motif: 'Une nouvelle demande est arrivée ; réponse préparée, rien n’est parti.' }).replace('${S}.cle', '$json.corps.cle').replaceAll('$json.cle', '$json.corps.cle') },
    'Mettre en file du pilote': { url: 'assistant_actions?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=representation', body: carte('accueil', '$json', { outil: '$json.corps.type_action', titre: "'Répondre à une nouvelle demande'", objetType: "'conversation'", objetId: '$json.corps.objet_id', apercu: '{ brouillon: $json.corps.brouillon || null, canal: $json.envoi_par || null, pilote_en_reel: true }', motif: 'Réponse préparée pour le pilote : l’application la met en file après 10 minutes d’annulation possible.' }).replaceAll('$json.cle', '$json.corps.cle') },
    'Écrire le journal': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: "={{ JSON.stringify($json.lignes.map((l) => ({ artisan_id: $json.organisation_id, type: /^[a-z][a-z0-9_]{1,39}$/.test(String(l.evenement)) ? l.evenement : 'journal_accueil', objet_type: null, objet_id: null, cle: 'fait:'.concat(String(l.cle)).replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 120), faits: {} }))) }}" },
    'Lire le destinataire': { url: 'leads', query: (C) => [['select', 'conversation_cle:id,adresse_client:contact'], filtre(C), ['id', '=eq.{{ $json.conversation_cle }}'], ['limit', '1']] },
  },
  'accueil-envoi': {
    'Lire les réglages': { composer: true },
    'Lire les envois dus': { url: 'actions_auto', query: (C) => [['select', 'id,type,cle,statut,ref_id,lead_id,libelle,prete_le,part_le'], filtre(C), ['statut', 'eq.a_partir'], ['part_le', '=lte.{{ $now.toISO() }}'], ['order', 'prete_le.asc'], ['limit', '20']] },
    'Repasser en carte': { url: 'actions_auto', query: (C) => [['artisan_id', '=eq.{{ $json.organisation_id }}'], ['id', '=eq.{{ $json.id }}'], ['statut', 'eq.a_partir']], body: '={{ JSON.stringify({ statut: "manuel", motif: String($json.motif || "canal_non_branche").slice(0, 300), traite_le: $now.toISO() }) }}' },
    'Marquer l’action partie': { url: 'actions_auto', query: (C) => [['artisan_id', '=eq.{{ $("Contrôle avant envoi").item.json.organisation_id }}'], ['id', '=eq.{{ $("Contrôle avant envoi").item.json.id }}'], ['statut', 'in.(a_partir,en_cours)']], body: '={{ JSON.stringify({ statut: "partie", traite_le: $now.toISO() }) }}' },
  },
  devis: {
    'Relire la configuration': { composer: true },
    'Lire les demandes à chiffrer': { url: 'n8n_evenements_a_traiter', query: (C) => [['select', 'cle,lead_id:objet_id,devis_id:faits->>devis_id,qualifiee:faits->qualifiee,escalade:faits->escalade,delai_annulation_ecoule:faits->delai_annulation_ecoule'], filtre(C), ['type', 'eq.devis_a_preparer'], ['objet_type', 'eq.lead'], ['order', 'survenu_le.asc,id.asc'], ['limit', '200']] },
    'Lire les tarifs': { url: 'prix_artisan', query: (C) => [['select', 'reference,designation,unite,prix_ht,tva_taux,source_prix:source,date_prix'], filtre(C), ['actif', 'is.true'], ['limit', '200']] },
    'Lire les devis prêts': { url: 'devis', query: (C) => [['select', 'artisan_id,devis_id:id,lead_id,numero,statut,total_ht,total_ttc'], filtre(C), ['statut', 'eq.brouillon'], ['limit', '200']] },
    'Lire les lignes des devis': { url: 'devis_lignes', query: (C) => [['select', 'devis_id,rang:ordre,designation,quantite,unite,prix_unitaire_ht,tva_taux,source_prix,devis!inner(artisan_id)'], ['devis.artisan_id', `=eq.${C}`], ['limit', '200']] },
    'Lire le destinataire': { url: 'leads', query: (C) => [['select', 'objet_id:id,client_contact:contact'], filtre(C), ['id', `=eq.{{ ${VD}.lead_id }}`], ['limit', '1']] },
    'Inscrire au registre': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait(VD, `${VD}.voie === 'envoi' ? 'devis_envoye' : 'devis_brouillon'`, "'devis'", `${VD}.devis_id`, `'fait:'.concat(${VD}.cle)`) },
    'Lire les repères de prix': { url: 'prix_artisan', query: (C) => [['select', 'reference,designation,prix_ht,repere_chantier_le:date_prix'], filtre(C), ['source', 'eq.devis_valide'], ['limit', '200']] },
  },
  facturation: {
    'Relire la configuration': { composer: true },
    'Lire les factures': { url: 'factures', query: (C) => [['select', 'facture_id:id,devis_id,numero,statut,emise_le,envoyee_le,total_ht,total_ttc,date_echeance,payee_le'], filtre(C), ['limit', '200']] },
    'Lire les chantiers terminés': { url: 'n8n_evenements_a_traiter', query: (C) => [['select', 'cle,devis_id:faits->>devis_id,chantier_termine:faits->chantier_termine,deja_facturee:faits->deja_facturee,apercu_ok:faits->apercu_ok,apercu_type:faits->>apercu_type'], filtre(C), ['type', 'eq.facture_a_emettre'], ['order', 'survenu_le.asc,id.asc'], ['limit', '200']] },
    'Déposer la carte': { url: 'assistant_actions?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: carte('facturation', VD, { outil: `${VD}.kind`, titre: `${VD}.kind === 'relance_impaye' ? 'Relancer une facture impayée' : 'Envoyer une facture'`, objetType: "'facture'", objetId: `(${VD}.facture_id || ${VD}.devis_id)`, apercu: `{ texte: ${VD}.texte || null, kind: ${VD}.kind || null }`, motif: 'Une facture est à envoyer ou à relancer ; préparée, rien n’est parti.' }).replace("objet_type: 'facture', objet_id: (", `objet_type: ${VD}.facture_id ? 'facture' : 'devis', objet_id: (`) },
    'Lire le destinataire': { url: 'factures', query: (C) => [['select', 'objet_id:id,...clients(client_email:email,client_telephone:tel)'], filtre(C), ['id', `=eq.{{ ${VD}.facture_id }}`], ['limit', '1']] },
    'Inscrire au registre': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait(VD, `${VD}.kind === 'envoi_facture' ? 'facture_envoyee' : 'facture_relancee'`, "'facture'", `${VD}.facture_id`, `'fait:'.concat(${VD}.cle)`) },
    'Inscrire le palier': { url: 'relances_impayes?on_conflict=facture_id,rang', headers: 'resolution=ignore-duplicates,return=minimal', body: `={{ JSON.stringify({ artisan_id: ${VD}.organisation_id, facture_id: ${VD}.facture_id, rang: ${VD}.rang, jour: $now.setZone('Europe/Paris').toISODate(), destinataire: String($('Lire le destinataire').first().json.client_email || '').toLowerCase(), statut: 'envoyee', envoyee_le: $now.toISO() }) }}` },
  },
  suivi: {
    'Relire la configuration': { composer: true },
    'Lire les relances dues': { url: 'n8n_evenements_a_traiter', query: (C) => [['select', 'cle,objet_type,objet_id,dossier_id:faits->>lead_id,paliers_envoyes:faits->paliers_envoyes,jours_depuis_dernier:faits->jours_depuis_dernier,main_prise:faits->main_prise,exclu:faits->exclu,stop:faits->stop,opposition:faits->opposition,sensible:faits->sensible,delai_annulation_ecoule:faits->delai_annulation_ecoule'], filtre(C), ['type', 'eq.relance_due'], ['order', 'survenu_le.asc,id.asc'], ['limit', '200']] },
    'Déposer la carte': { url: 'assistant_actions?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: carte('suivi', VD, { outil: `${VD}.objet_type === 'devis' ? 'relance_devis' : 'relance_conversation'`, titre: `${VD}.objet_type === 'devis' ? 'Relancer un devis sans réponse' : 'Relancer une demande sans réponse'`, objetType: `(${VD}.objet_type === 'devis' ? 'devis' : 'conversation')`, objetId: `${VD}.objet_id`, apercu: `{ texte: ${VD}.texte || null, canal: ${VD}.route || null }`, motif: 'Une relance est due ; préparée, rien n’est parti.' }) },
    'Lire le destinataire': { url: 'devis', query: (C) => [['select', 'objet_id:id,...clients(client_email:email,client_telephone:tel)'], filtre(C), ['id', `=eq.{{ ${VD}.objet_id }}`], ['limit', '1']] },
    'Inscrire au registre': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait(VD, `${VD}.objet_type === 'devis' ? 'devis_relance' : 'conversation_relancee'`, `(${VD}.objet_type === 'devis' ? 'devis' : 'lead')`, `${VD}.objet_id`, `'fait:'.concat(${VD}.cle)`) },
    'Déposer dans la conversation': { url: 'messages', headers: 'return=minimal', body: `={{ JSON.stringify({ lead_id: ${VD}.dossier_id, sens: 'out', type: 'relance', contenu: ${VD}.texte, externe_id: 'n8n:'.concat(${VD}.cle), etat: 'envoye' }) }}`, garde: `organisation_id` },
  },
  apres: {
    'Lire la configuration': { composer: true },
    'Lire les clés déjà traitées': { url: 'evenements_metier', query: (C) => [['select', 'cle'], filtre(C), ['type', 'in.(avis_traite,demande_avis,entretien)'], ['limit', '1000']] },
    'Lire les chantiers finis': { url: 'chantiers', query: (C) => [['select', 'id,devis_id,fini_le:date_fin_reelle,...devis(client_id)'], filtre(C), ['statut', 'eq.termine'], ['limit', '200']] },
    'Journaliser la réponse': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Revalider la réponse').item.json", "'avis_traite'", 'null', 'null', "$('Revalider la réponse').item.json.cle") },
    'Lire le destinataire consenti': { url: 'clients', query: (C) => [['select', 'id,email,telephone:tel'], filtre(C), ['id', '=eq.{{ $json.client_id }}'], ['limit', '1']] },
    'Journaliser la demande': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Assembler la demande').item.json", "'demande_avis'", 'null', 'null', "$('Assembler la demande').item.json.cle") },
    'Déposer la carte': { url: 'assistant_actions?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: carte('apres', '$json', { outil: '$json.outil', titre: '$json.titre', objetType: 'null', objetId: 'null', apercu: '{ texte: $json.apercu || null }', motif: 'Après un chantier : action préparée, rien n’est parti.' }).replace('conversation_id: null', "conversation_id: $('Compte et mode').first().json.organisation_id") },
  },
  direction: {
    'Lire la configuration': { composer: true },
    'Lire les chiffres du jour': { url: 'n8n_evenements_a_traiter', query: (C) => [['select', 'cle,impayes_echus_centimes:faits->impayes_echus_centimes,devis_a_relancer:faits->devis_a_relancer,demandes_sans_reponse:faits->demandes_sans_reponse,rendez_vous_jour:faits->rendez_vous_jour,cartes_a_valider:faits->cartes_a_valider,lu_le:survenu_le'], filtre(C), ['type', 'eq.page_du_matin'], ['order', 'survenu_le.desc'], ['limit', '1']] },
    'Lire le rapport de la semaine': { url: 'n8n_evenements_a_traiter', query: (C) => [['select', 'cle,semaine:faits->>semaine,encaisse_centimes:faits->encaisse_centimes,signe_centimes:faits->signe_centimes,en_cours_centimes:faits->en_cours_centimes,relances_creditees:faits->relances_creditees'], filtre(C), ['type', 'eq.rapport_semaine'], ['order', 'survenu_le.desc'], ['limit', '1']] },
    'Lire le coût IA': { url: 'couts_ia_jour', query: (C) => [['select', 'jour,departement,modele,externe,cout_centimes'], filtre(C), ['order', 'jour.desc'], ['limit', '70']] },
    'Journaliser la page': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Compter').first().json", "'page_direction'", 'null', 'null', "$('Compter').first().json.cle.concat(':fait')") },
  },
  operations: {
    'Lire la configuration': { composer: true },
    'Lire les demandes': { url: 'evenements_metier', query: (C) => [['select', 'cle,type,faits,survenu_le'], filtre(C), ['type', 'in.(rdv_a_proposer,creneau_choisi,import_demande,rappel_veille,commande_stock,document_classe)'], ['traite_le', 'is.null'], ['order', 'survenu_le.desc'], ['limit', '200']] },
    'Lire les rendez-vous de demain': { url: 'crm_rappels', query: (C) => [['select', 'id,type,echeance,heure,lead_id,devis_id,chantier_id'], filtre(C), ['echeance', "=eq.{{ String($('Compte et mode').first().json.demain_debut).slice(0, 10) }}"], ['fait_le', 'is.null'], ['limit', '200']] },
    'Lire le stock sous le seuil': { url: 'n8n_evenements_a_traiter', query: (C) => [['select', 'cle,materiau_id:objet_id,quantite:faits->quantite,seuil:faits->seuil,commande_ouverte:faits->commande_ouverte'], filtre(C), ['type', 'eq.stock_sous_seuil'], ['objet_type', 'eq.materiau'], ['limit', '200']] },
    'Lire les chantiers': { url: 'chantiers', query: (C) => [['select', 'id,reference:id,client_ref:devis_id,statut'], filtre(C), ['statut', 'in.(en_cours,termine)'], ['limit', '200']] },
    'Journaliser le rendez-vous': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Pose permise ?').item.json", "'rdv_pose'", 'null', 'null', "$('Pose permise ?').item.json.cle.concat(':fait')") },
    'Lire le contact du rappel': { url: 'clients', query: (C) => [['select', 'id,telephone:tel'], filtre(C), ['id', '=eq.{{ $json.client_id }}'], ['limit', '1']] },
    'Journaliser le rappel': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Assembler le rappel').item.json", "'rappel_veille'", 'null', 'null', "$('Assembler le rappel').item.json.cle.concat(':fait')") },
    'Journaliser la commande': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Revalider la commande').item.json", "'commande_stock'", 'null', 'null', "$('Revalider la commande').item.json.cle.concat(':fait')") },
    'Journaliser le classement': { url: 'evenements_metier?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: fait("$('Revalider le classement').item.json", "'document_classe'", 'null', 'null', "$('Revalider le classement').item.json.cle.concat(':fait')") },
    'Déposer la carte': { url: 'assistant_actions?on_conflict=artisan_id,cle', headers: 'resolution=ignore-duplicates,return=minimal', body: carte('operations', '$json', { outil: '$json.outil', titre: '$json.titre', objetType: 'null', objetId: 'null', apercu: '{ texte: $json.apercu || null }', motif: 'Opérations : action préparée, rien n’est parti.' }).replace('conversation_id: null', "conversation_id: $('Compte et mode').first().json.organisation_id") },
  },
};

const composerCode = (dep) => `// 036-031 · La configuration de ce gabarit, COMPOSÉE depuis les vraies tables (aucune vue inventée) :
//   departements_reglages (0193:184 : palier, interrupteur, plafond) · artisans (offre = plan, nom, horaires) · pilote_reglages (0174:20)
//   plateforme_config (0032:4 : mode de réponse, ton, mots d'escalade) · actions_auto (0174:28 : départs du pilote sur 24 h)
//   evenements_metier (0185:125 : faits « fait:… » déjà écrits) · assistant_actions (0157 + 0194 : cartes déjà posées) · connexions (0193:99, sans secret).
// Lecture absente ou en erreur : interrupteurs fermés et simulation (côté sûr). Capacités : copie figée de lib/plans.ts, comme « Composer les
// comptes » de presti-cerveau (036-030). Ce que la base ne porte pas reste vide (null ou []), jamais deviné.
const DEP = '${dep}';
const lire = (nom) => { try { return $(nom).all().map((x) => x.json).filter((j) => j && typeof j === 'object' && !j.error && Object.keys(j).length > 0); } catch (e) { return []; } };
const OFFRE = ${JSON.stringify(OFFRE)};
const CAPACITES = ${JSON.stringify(CAPACITES)};
const QUALIFICATION = ${JSON.stringify(QUALIF)};
const reg = lire('Lire les départements (base)');
const tous = reg.find((r) => r.departement === 'tous');
const dep = reg.find((r) => r.departement === DEP);
const art = lire('Lire le compte (base)')[0] || {};
const pil = lire('Lire le pilote (base)')[0] || {};
const pc = lire('Lire le mode de réponse (base)')[0] || {};
const offre = OFFRE[String(art.plan || '')] || null;
const marche = (r) => Boolean(r) && r.en_marche === true && r.palier !== 'arret';
const reel = Boolean(tous) && Boolean(dep) && tous.palier === 'reel' && dep.palier === 'reel';
const cles = [].concat(lire('Lire les faits déjà écrits (base)').map((x) => String(x.cle || '').replace(/^fait:/, '')), lire('Lire les cartes déjà posées (base)').map((x) => String(x.cle || ''))).filter(Boolean);
const actives = lire('Lire les connexions (base)').map((x) => x.fournisseur);
const premier = (liste) => liste.find((f) => actives.includes(f)) || null;
const types = pil.types && typeof pil.types === 'object' ? pil.types : {};
return [{ json: {
  organisation_id: art.id || null, artisan_id: art.id || null, departement: DEP, offre, capacites: offre ? CAPACITES[offre] : [],
  simulation: !reel, palier: dep ? dep.palier : 'simulation', interrupteur_general: marche(tous), interrupteur_departement: marche(dep),
  plafond_jour: dep && Number.isInteger(dep.plafond_jour) ? dep.plafond_jour : 20,
  pilote: { actif: pil.actif === true, types }, actif: pil.actif === true, types,
  parties_depuis_24h: lire('Compter les départs du pilote (base)').length,
  mode_reponse: ['auto', 'assistee', 'manuelle'].includes(pc.mode_reponse) ? pc.mode_reponse : 'assistee',
  ton: typeof pc.ton === 'string' ? pc.ton : null, mots_escalade_artisan: Array.isArray(pc.escalade_mots) ? pc.escalade_mots : [],
  enseigne: art.nom || null, marque_artisan: art.nom || null, signature: art.nom || null, horaires: art.horaires || null,
  cles_existantes: [...new Set(cles)], empreintes_connues: [], fournisseurs: [], qualification: QUALIFICATION,
  boite: premier(['gmail', 'outlook', 'imap']), stockage: premier(['google_drive', 'onedrive']),
  outil_agenda: premier(['google_agenda', 'outlook_agenda']), outil_courrier: premier(['gmail', 'outlook', 'imap']), outil_fichiers: premier(['google_drive', 'onedrive']), outil_tableur: null,
  canal_direction: null, destination_direction: null, signature_electronique: null, comptable: null, relances_impayes: null, sms_api: null, expediteur: null,
  paliers_conversation_jours: null, paliers_devis_jours: null, formulaire_leads_id: null, maintenant: $now.toISO(),
} }];`;

const lectures = (dep, C) => [
  ['Lire les départements (base)', 'departements_reglages', [['select', 'artisan_id,departement,palier,en_marche,plafond_jour'], filtre(C), ['departement', `in.(tous,${dep})`]]],
  ['Lire le compte (base)', 'artisans', [['select', 'id,plan,horaires'], ['id', `=eq.${C}`], ['suppression_demandee_le', 'is.null'], ['limit', '1']]],
  ['Lire le pilote (base)', 'pilote_reglages', [['select', 'actif,types'], filtre(C), ['limit', '1']]],
  ['Lire le mode de réponse (base)', 'plateforme_config', [['select', 'mode_reponse,ton,escalade_mots'], filtre(C), ['limit', '1']]],
  ['Compter les départs du pilote (base)', 'actions_auto', [['select', 'id'], filtre(C), ['statut', 'eq.partie'], ['traite_le', '=gte.{{ $now.minus({ hours: 24 }).toISO() }}'], ['limit', '500']]],
  ['Lire les faits déjà écrits (base)', 'evenements_metier', [['select', 'cle'], filtre(C), ['cle', 'like.fait:*'], ['survenu_le', '=gte.{{ $now.minus({ days: 60 }).toISO() }}'], ['limit', '1000']]],
  ['Lire les cartes déjà posées (base)', 'assistant_actions', [['select', 'cle'], filtre(C), ['origine', 'eq.agent'], ['departement', `eq.${dep}`], ['limit', '1000']]],
  ['Lire les connexions (base)', 'connexions', [['select', 'fournisseur,etat'], filtre(C), ['etat', 'eq.active'], ['limit', '40']]],
];

const bilan = [];
for (const [lot, gs] of Object.entries(LOTS)) for (const g of gs) {
  const nom = `gabarit-artisan-${g}`;
  const avant = JSON.parse(fs.readFileSync(`.orchestre/preuves/${lot}/${nom}.workflow.json`, 'utf8'));
  const w = JSON.parse(JSON.stringify(avant));
  const ops = [];
  for (const [noeud, r] of Object.entries(R[g])) {
    const n = w.nodes.find((x) => x.name === noeud);
    if (!n) throw new Error(`${nom} : nœud absent ${noeud}`);
    const C = compteDe(n);
    if (r.composer) {
      const dep = DEP[g];
      const chaine = lectures(dep, C);
      const [x, y] = n.position;
      const nouveaux = chaine.map(([nm, table, pairs], i) => ({ id: `036031-${g}-${i}`, name: nm, type: 'n8n-nodes-base.httpRequest', typeVersion: n.typeVersion, position: [x, y + 160 * (i + 1)],
        parameters: { ...JSON.parse(JSON.stringify(n.parameters)), method: 'GET', url: BASE + table, sendQuery: true, specifyQuery: 'keypair', queryParameters: q(pairs), sendBody: false, jsonBody: undefined, sendHeaders: false, headerParameters: undefined },
        executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput',
        notes: `036-031 : lecture réelle (${table}), filtrée sur le compte ; composée par « ${noeud} ».` }));
      for (const z of nouveaux) for (const k of Object.keys(z.parameters)) if (z.parameters[k] === undefined) delete z.parameters[k];
      const code = { id: n.id, name: noeud, type: 'n8n-nodes-base.code', typeVersion: 2, position: [x, y + 160 * (chaine.length + 1)], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: composerCode(dep) }, notes: '036-031 : configuration composée depuis les vraies tables (schema-gabarits.md).' };
      // connexions : prédécesseurs → première lecture ; lectures en chaîne ; composer → successeurs d'origine
      const preds = [];
      for (const [src, c] of Object.entries(w.connections)) (c.main || []).forEach((sorties, oi) => (sorties || []).forEach((e) => { if (e.node === noeud) preds.push([src, oi, e.index]); }));
      const succs = ((w.connections[noeud] || {}).main || []).map((s) => (s || []).map((e) => ({ ...e })));
      w.nodes = w.nodes.filter((x) => x.name !== noeud).concat(nouveaux, [code]);
      for (const [src, oi] of preds) { w.connections[src].main[oi] = w.connections[src].main[oi].filter((e) => e.node !== noeud).concat([{ node: nouveaux[0].name, type: 'main', index: 0 }]); }
      nouveaux.forEach((z, i) => { w.connections[z.name] = { main: [[{ node: i < nouveaux.length - 1 ? nouveaux[i + 1].name : noeud, type: 'main', index: 0 }]] }; });
      w.connections[noeud] = { main: succs };
      ops.push({ type: 'removeNode', nodeName: noeud });
      for (const z of [code, ...nouveaux]) ops.push({ type: 'addNode', node: { name: z.name, type: z.type, typeVersion: z.typeVersion, position: z.position, parameters: z.parameters, notes: z.notes } });
      for (const z of nouveaux) ops.push({ type: 'setNodeSettings', nodeName: z.name, settings: { executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput' } });
      for (const [src, oi] of preds) ops.push({ type: 'addConnection', source: src, target: nouveaux[0].name, sourceIndex: oi, targetIndex: 0 });
      nouveaux.forEach((z, i) => ops.push({ type: 'addConnection', source: z.name, target: i < nouveaux.length - 1 ? nouveaux[i + 1].name : noeud, sourceIndex: 0, targetIndex: 0 }));
      succs.forEach((s, oi) => s.forEach((e) => ops.push({ type: 'addConnection', source: noeud, target: e.node, sourceIndex: oi, targetIndex: e.index })));
      bilan.push(`${nom} | ${noeud} | composé (${chaine.length} lectures réelles)`);
      continue;
    }
    const p = n.parameters;
    const [chemin, qs] = r.url.split('?');
    p.url = BASE + chemin + (qs ? '?' + qs : '');
    if (r.query) { p.sendQuery = true; p.specifyQuery = 'keypair'; p.queryParameters = q(r.query(C)); }
    if (r.headers) { p.sendHeaders = true; p.headerParameters = enTete(r.headers); }
    if (r.body) p.jsonBody = r.body;
    const garde = { url: p.url, sendQuery: p.sendQuery, specifyQuery: p.specifyQuery, queryParameters: p.queryParameters, sendHeaders: p.sendHeaders, headerParameters: p.headerParameters, jsonBody: p.jsonBody };
    for (const k of Object.keys(garde)) if (garde[k] === undefined) delete garde[k];
    ops.push({ type: 'updateNodeParameters', nodeName: noeud, parameters: garde });
    bilan.push(`${nom} | ${noeud} | ${p.method || 'GET'} ${chemin}`);
  }
  fs.writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2));
  fs.writeFileSync(path.join(ICI, `ops-${g}.json`), JSON.stringify(ops));
  console.error(`${nom} : ${ops.length} opérations`);
}
fs.writeFileSync(path.join(ICI, 'corrections.txt'), bilan.join('\n') + '\n');
