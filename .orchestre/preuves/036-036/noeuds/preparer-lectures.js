// Cerveau (036-036) : PRÉPARER les lectures réelles des six départements. Une requête GET par table utile, construite ici, jouée par
// « Lire les tables des départements » (un élément = une requête, réponse entière). Chaque requête filtre par compte (artisan_id=in.(comptes
// servis)) ET par les objets des événements de la page ; select= limité aux colonnes qu'un chef lit ; jamais de contact (ni e-mail, ni téléphone,
// ni adresse). Aucune lecture si aucun événement ne la demande : un passage sans événement ne coûte rien.
const BASE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const G = $('Interrupteur général').first().json;
const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(G.maintenant));
const comptes = $('Composer les comptes').all().map((x) => x.json).filter((c) => c && UUID.test(String(c.artisan_id))).map((c) => c.artisan_id);
const evs = [];
for (const { json: p } of $('Composer les pages').all()) for (const ev of (p && Array.isArray(p.evenements) ? p.evenements : [])) if (ev && comptes.includes(ev.artisan_id)) evs.push(ev);
const ids = (type, champ) => [...new Set(evs.filter((e) => e.type === type).map((e) => (champ ? (e.donnees || {})[champ] : e.objet_id)).filter((x) => UUID.test(String(x))))].slice(0, 200);
const cpt = (types) => [...new Set(evs.filter((e) => types.includes(e.type)).map((e) => e.artisan_id))];
const dans = (l) => 'in.(' + l.join(',') + ')';
const s = [];
const lire = (nom, table, q) => s.push({ json: { nom: nom, url: BASE + table + '?' + Object.entries(q).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&') } });
// Devis : le devis et ses lignes (prix NON recopiés : le contrat interdit à n8n de convertir un montant ; la carte dit « prix à revoir »).
const devis = ids('devis_a_preparer', 'devis_id'), cDevis = cpt(['devis_a_preparer']);
if (devis.length) {
  lire('devis', 'devis', { select: 'id,artisan_id,lead_id,numero,statut', id: dans(devis), artisan_id: dans(cDevis), limit: '200' });
  lire('devis_lignes', 'devis_lignes', { select: 'devis_id,ordre,designation,quantite,source_prix', devis_id: dans(devis), order: 'ordre.asc', limit: '2000' });
}
// Facturation : les factures des impayés, leurs réglages (opt-in) et leurs arrêts motivés.
const factures = ids('impaye_echu', 'facture_id'), cFac = cpt(['impaye_echu']);
if (factures.length) {
  lire('factures', 'factures', { select: 'id,artisan_id,numero,statut,avoir_de,tva_regime,date_echeance', id: dans(factures), artisan_id: dans(cFac), limit: '200' });
  lire('relances_impayes_reglages', 'relances_impayes_reglages', { select: 'artisan_id,actif,jours', artisan_id: dans(cFac), limit: '200' });
  lire('relances_impayes_arrets', 'relances_impayes_arrets', { select: 'artisan_id,facture_id,motif,le,reprise_le', facture_id: dans(factures), artisan_id: dans(cFac), limit: '500' });
}
// Suivi : l'état de la demande à relancer (statut, main prise), jamais son contact.
const relances = ids('relance_due', 'lead_id'), cRel = cpt(['relance_due']);
if (relances.length) lire('leads_relances', 'leads', { select: 'id,artisan_id,statut,prise_en_main,created_at', id: dans(relances), artisan_id: dans(cRel), limit: '200' });
// Après-chantier : le chantier (titre, fin) et les réglages d'avis et d'entretien du compte.
const chantiers = ids('chantier_termine', 'chantier_id'), cCh = cpt(['chantier_termine']);
if (chantiers.length) {
  lire('chantiers', 'chantiers', { select: 'id,artisan_id,titre,statut,date_fin_reelle', id: dans(chantiers), artisan_id: dans(cCh), limit: '200' });
  lire('crm_apres_chantier', 'crm_apres_chantier', { select: 'artisan_id,avis,entretien,actif_depuis', artisan_id: dans(cCh), limit: '200' });
}
// Opérations : l'article sous le seuil (nom, unité) ; quantité et seuil viennent de l'événement (calculés par le code de l'app).
const materiaux = ids('stock_sous_le_seuil', 'materiau_id'), cSt = cpt(['stock_sous_le_seuil']);
if (materiaux.length) lire('materiaux', 'materiaux', { select: 'id,artisan_id,nom,unite', id: dans(materiaux), artisan_id: dans(cSt), limit: '200' });
// Direction : le point du matin lit l'argent (impayés échus, devis envoyés), les demandes nouvelles et les cartes à valider.
const cMat = cpt(['page_du_matin']);
if (cMat.length) {
  lire('matin_impayes', 'factures', { select: 'id,artisan_id,numero,total_ttc,date_echeance', artisan_id: dans(cMat), statut: 'eq.emise', avoir_de: 'is.null', date_echeance: 'lt.' + jour, limit: '200' });
  lire('matin_devis', 'devis', { select: 'id,artisan_id,numero,total_ttc,envoye_le', artisan_id: dans(cMat), statut: 'eq.envoye', limit: '200' });
  lire('matin_demandes', 'leads', { select: 'id,artisan_id,urgence', artisan_id: dans(cMat), statut: 'eq.nouveau', limit: '200' });
  lire('matin_cartes', 'assistant_actions', { select: 'artisan_id,cle,outil,titre,created_at', artisan_id: dans(cMat), statut: 'eq.en_attente', limit: '50' });
}
// Les jours fériés (calendrier.api.gouv.fr, gratuit, sans clé) ne servent qu'aux relances et aux opérations : lus seulement s'il y en a.
const ferie = evs.some((e) => ['relance_due', 'impaye_echu', 'stock_sous_le_seuil', 'rendez_vous_a_poser'].includes(e.type));
return s.length ? s.map((x) => ({ json: Object.assign(x.json, { feries: ferie, jour: jour }) })) : [{ json: { vide: true, feries: false, jour: jour } }];
