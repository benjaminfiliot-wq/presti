// Le Cerveau branché sur les vraies données (tâche 036-030, audit 036-029 « En tête », points 2 à 4) : SOURCE UNIQUE du code des nœuds
// Code de presti-cerveau (n8n d'Oracle, 596OC5mL2aMBq6SD) et des requêtes de ses lectures. Recopié octet pour octet dans n8n ;
// scripts/branchement-reel-qa.mjs exécute ces codes (faux `$`, `$input`) et compare l'export rapatrié
// (.orchestre/preuves/036-030/presti-cerveau.workflow.json) à ce fichier.
//
// Ce qui change par rapport à 036-001 (lectures `noOp` épinglées) :
//   • trois lectures vides remplacées par six lectures HTTP réelles, identifiant « Supabase account » (la voie des workflows publiés,
//     presti-accuse-reception) : departements_reglages (« tous », puis tous les départements des comptes ouverts), artisans (offre),
//     plateforme_config (mode de réponse), la vue n8n_evenements_a_traiter (0193:425, ouverte à service_role par 0194), leads (le
//     message de la demande, pour le chef de l'accueil) ; chaque requête filtre artisan_id ;
//   • le palier « ombre » servi : le chef prépare tout, en simulation (porte d'envoi fermée), et le Cerveau écrit ses cartes dans
//     assistant_actions (« à valider », idempotent par clé) ; le palier « réel » reste NON branché (saut journalisé) ;
//   • la marque « traité » (evenements_marquer_traites) posée sur les événements servis, rejetés ou sautés, jamais sur un département en
//     échec (il sera rejoué au passage suivant).

export const SUPABASE = 'https://gorcdvmueakcncsmrouo.supabase.co'
export const IDENTIFIANT = { id: 'dTewDK98MLrNckNG', name: 'Supabase account' }
export const VIDE = '00000000-0000-0000-0000-000000000000'

/** Les six lectures : nom du nœud → { table, requete (paires clé/valeur PostgREST, une expression n8n quand elle commence par « = ») }. */
export const LECTURES = {
  'Lire les interrupteurs généraux': { table: 'departements_reglages', requete: [
    ['select', 'artisan_id,departement,palier,en_marche'], ['departement', 'eq.tous'], ['en_marche', 'is.true'], ['palier', 'in.(simulation,ombre)'],
    ['order', 'artisan_id.asc'], ['limit', '200']] },
  'Lire les réglages des départements': { table: 'departements_reglages', requete: [
    ['select', 'artisan_id,departement,palier,en_marche,plafond_jour'],
    ['artisan_id', "={{ 'in.(' + ($('Interrupteur général').first().json.comptes.join(',') || '" + VIDE + "') + ')' }}"],
    ['order', 'artisan_id.asc,departement.asc'], ['limit', '1000']] },
  'Lire les comptes et leurs offres': { table: 'artisans', requete: [
    ['select', 'id,nom,plan,est_demo,suppression_demandee_le'],
    ['id', "={{ 'in.(' + ($('Interrupteur général').first().json.comptes.join(',') || '" + VIDE + "') + ')' }}"],
    ['order', 'id.asc'], ['limit', '200']] },
  'Lire les modes de réponse': { table: 'plateforme_config', requete: [
    ['select', 'artisan_id,mode_reponse'],
    ['artisan_id', "={{ 'in.(' + ($('Interrupteur général').first().json.comptes.join(',') || '" + VIDE + "') + ')' }}"],
    ['limit', '200']] },
  'Lire les événements non traités': { table: 'n8n_evenements_a_traiter', requete: [
    ['select', 'id,artisan_id,type,objet_type,objet_id,cle,faits,survenu_le'],
    ['artisan_id', "={{ 'in.(' + ($('Composer les comptes').all().map(x => x.json.artisan_id).filter(Boolean).join(',') || '" + VIDE + "') + ')' }}"],
    ['order', 'survenu_le.asc,id.asc'], ['limit', '200']] },
  'Lire les demandes des événements': { table: 'leads', requete: [
    ['select', 'id,artisan_id,canal,created_at,message,urgence,type_chantier,photos'],
    ['id', "={{ 'in.(' + ([...new Set($('Lire les événements non traités').all().map(x => x.json).filter(e => e && e.type === 'demande_recue' && e.objet_type === 'lead' && typeof e.objet_id === 'string').map(e => e.objet_id))].join(',') || '" + VIDE + "') + ')' }}"],
    ['artisan_id', "={{ 'in.(' + ($('Composer les comptes').all().map(x => x.json.artisan_id).filter(Boolean).join(',') || '" + VIDE + "') + ')' }}"],
    ['limit', '200']] },
}

/** « Interrupteur général » : les comptes dont l'interrupteur « tous » est en marche, en simulation ou en ombre ; l'heure du passage. */
export const CODE_INTERRUPTEUR = String.raw`// Cerveau (036-030) : l'interrupteur général, lu dans departements_reglages (ligne « tous » de chaque compte, 0193:184). Ouvert si AU MOINS
// un compte a son interrupteur général en marche, en palier simulation ou ombre. Lecture en erreur (table absente, réseau) = fermé.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const lignes = $('Lire les interrupteurs généraux').all().map((x) => x.json);
const erreur = lignes.some((l) => l && l.error);
const ouverts = erreur ? [] : [...new Set(lignes.filter((l) => l && l.departement === 'tous' && l.en_marche === true && (l.palier === 'simulation' || l.palier === 'ombre') && UUID.test(String(l.artisan_id))).map((l) => l.artisan_id))].sort().slice(0, 200);
const t = Date.now();
const iso = new Date(Math.floor(t / 60000) * 60000).toISOString();
return [{ json: { interrupteur_general: !erreur && ouverts.length > 0, organisation_systeme: '00000000-0000-4000-8000-000000000000', passage: iso.slice(0, 10) + 'T' + iso.slice(11, 13) + iso.slice(14, 16), maintenant: new Date(t).toISOString(), comptes: ouverts, lecture: erreur ? 'erreur' : 'ok' } }];`

/** « Composer les comptes » : la forme `compte` de contrats/cerveau.json, depuis les vraies tables. */
export const CODE_COMPTES = String.raw`// Cerveau (036-030) : un compte par artisan ouvert, à la forme « compte » du contrat (plans/011-cadrage-01-11/p6-signature/contrats/cerveau.json),
// composé depuis les vraies tables : departements_reglages (palier, interrupteurs, plafond), artisans (offre, nom), plateforme_config (mode).
// Aucune valeur inventée pour un fait de client : les réglages absents prennent le défaut le plus prudent (département coupé, mode
// « assistée », pilote inactif : tout devient carte). Compte en suppression, de démonstration ou d'offre inconnue : écarté.
const G = $('Interrupteur général').first().json;
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const OFFRE = { studio: 'studio', signature: 'signature', business: 'signature', entreprise: 'signature', essentiel: 'essentiel', gratuit: 'essai', essai: 'essai' };
const CAPACITES = { studio: ["canaux.email","relances","factures.relances","assistant"], essentiel: ["canaux.email","relances","factures.relances"], essai: ["canaux.email"],
  signature: ["canaux.email","relances","factures.relances","assistant","plateforme.ia.auto","relances.auto","factures.relances.auto","crm","assistant.pilote"] };
const QUALIFICATION = {"grille":[{"critere":"urgence=urgent","poids":40},{"critere":"canal=formulaire","poids":25},{"critere":"canal=site","poids":25},{"critere":"canal=telephone","poids":15},{"critere":"canal=email","poids":15}],"seuils":{"haute":60,"normale":30},"delais_cibles_min":{"haute":15,"normale":60,"a_revoir":240}};
const lire = (nom) => $(nom).all().map((x) => x.json).filter((x) => x && !x.error);
const reglages = lire('Lire les réglages des départements').filter((r) => typeof r.artisan_id === 'string');
const artisans = {}; for (const a of lire('Lire les comptes et leurs offres')) if (typeof a.id === 'string') artisans[a.id] = a;
const modes = {}; for (const m of lire('Lire les modes de réponse')) if (typeof m.artisan_id === 'string') modes[m.artisan_id] = m.mode_reponse;
const s = [];
for (const id of G.comptes) {
  const a = artisans[id];
  if (!a || a.suppression_demandee_le || a.est_demo === true) continue;
  const offre = OFFRE[String(a.plan || '').toLowerCase()];
  if (!offre) continue;
  const r = (dep) => reglages.find((x) => x.artisan_id === id && x.departement === dep) || null;
  const tous = r('tous');
  const departements = {}; for (const d of DEPS) departements[d] = !!(r(d) && r(d).en_marche === true);
  const acc = r('accueil');
  const mode = ['manuelle', 'assistee', 'auto'].includes(modes[id]) ? modes[id] : 'assistee';
  s.push({ json: { artisan_id: id, palier: tous ? tous.palier : 'simulation', offre: offre,
    interrupteurs: { general: !!(tous && tous.en_marche === true), departements: departements },
    accueil: { nom_artisan: (String(a.nom || '').replace(/[\r\n<>"]/g, '').trim() || 'Votre artisan').slice(0, 70), offre: offre, mode_reponse: mode, capacites: CAPACITES[offre],
      pilote: { drapeau: true, actif: false, types: {} }, parties_depuis_24h: 0, mots_escalade_artisan: [], fournisseurs: [],
      horaires: { jours_permis: [1, 2, 3, 4, 5, 6, 7], heures_permises: { debut: '00:00', fin: '23:59' } },
      plafond_jour: Math.max(0, Math.min(20, acc && Number.isInteger(acc.plafond_jour) ? acc.plafond_jour : 20)), qualification: QUALIFICATION },
    empreintes_connues: [], cles_existantes: [] } });
}
return s.length ? s : [{ json: { vide: true } }];`

/** « Composer les pages » : une page par compte, ses événements dans l'ordre, la demande jointe à chaque `demande_recue`. */
export const CODE_PAGES = String.raw`// Cerveau (036-030) : une page par compte servi (forme « page » du contrat), ses événements lus dans n8n_evenements_a_traiter (0193:425),
// dans l'ordre (survenu_le, id). Un événement « demande_recue » reçoit sa demande (leads, MÊME compte exigé) : le message, le canal, l'heure ;
// jamais le contact. Champs hors format retirés (jamais recopiés tels quels).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const comptes = $('Composer les comptes').all().map((x) => x.json).filter((c) => c && typeof c.artisan_id === 'string');
const evs = $('Lire les événements non traités').all().map((x) => x.json).filter((e) => e && !e.error && typeof e.id === 'string');
const leads = {}; for (const l of $('Lire les demandes des événements').all().map((x) => x.json)) if (l && !l.error && typeof l.id === 'string') leads[l.id] = l;
const CANAL = { telegram: 'telegram', email: 'email' };
const demandeDe = (e) => {
  const l = e.objet_type === 'lead' ? leads[e.objet_id] : null;
  if (!l || l.artisan_id !== e.artisan_id) return null;
  const champs = {};
  if (typeof l.canal === 'string' && /^[a-z_]{1,30}$/.test(l.canal)) champs.canal = l.canal;
  if (l.urgence === 'urgent' || l.urgence === 'normal') champs.urgence = l.urgence;
  if (typeof l.type_chantier === 'string' && /^[^/@:]{1,60}$/.test(l.type_chantier)) champs.type_chantier = l.type_chantier;
  champs.photo_jointe = Array.isArray(l.photos) && l.photos.length > 0;
  return { id: l.id, canal: CANAL[l.canal] || 'page_p', recu_le: new Date(l.created_at).toISOString(), message: typeof l.message === 'string' ? l.message.slice(0, 4000) : null,
    champs: champs, empreinte_contact: null, client_existant: false, honeypot: false, photo: null, proposition: null, destinataire: { opposition: null, consentement_sms: null } };
};
const s = [];
for (const c of comptes) {
  const page = evs.filter((e) => e.artisan_id === c.artisan_id).slice(0, 50).map((e) => {
    const ev = { id: e.id, artisan_id: e.artisan_id, type: e.type, cle: e.cle, objet_type: e.objet_type || null, objet_id: UUID.test(String(e.objet_id)) ? e.objet_id : null };
    if (e.type === 'demande_recue') { const d = demandeDe(e); if (d) ev.demande = d; }
    return ev;
  });
  s.push({ json: { artisan_id: c.artisan_id, page: 0, suivante: null, evenements: page } });
}
return s.length ? s : [{ json: { artisan_id: null, page: 0, suivante: null, evenements: [] } }];`

/** « Aiguiller » (réécrit) : sert la simulation ET l'ombre ; le réel reste non branché. */
export const CODE_AIGUILLER = String.raw`// Cerveau : AIGUILLER, sans rien calculer. Pour chaque page (une par compte), chaque événement :
//   - doit appartenir au compte de sa page (artisan_id identique) : sinon rejet « autre_compte » (multi-tenant strict ; la lecture filtre déjà) ;
//   - va au département de son type (table fermée) ; un type inconnu est rejeté au journal ; une demande sans sa demande lue aussi ;
//   - n'est routé qu'une fois par passage (clé compte + clé de l'événement) : le doublon est rejeté.
// Palier du département = le plus prudent de « tous » et du sien (0193:181-183). Servis : « simulation » et « ombre » (036-030 : l'ombre
// prépare tout et n'envoie rien, la porte de simulation reste fermée ; ses cartes sont écrites plus loin). « réel » et « arrêt » : sautés.
// Interrupteurs général ET du département ouverts exigés (fail-closed : absent = fermé). Une enveloppe par (compte, département).
const G = $('Interrupteur général').first().json;
const trace = { execution_parent: 'presti-cerveau:' + G.passage, declencheur: 'presti-cerveau', tentative: 0 };
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const ROUTES = {"demande_recue":"accueil","devis_a_preparer":"devis","relance_due":"suivi","facture_a_emettre":"facturation","impaye_echu":"facturation","chantier_termine":"apres","rendez_vous_a_poser":"operations","page_du_matin":"direction"};
const OFFRES = ["studio","signature","essentiel","essai"];
const PRUDENCE = ['arret', 'simulation', 'ombre', 'reel'];
const SERVIS = ['simulation', 'ombre'];
const reglages = $('Lire les réglages des départements').all().map((x) => x.json).filter((r) => r && !r.error && typeof r.artisan_id === 'string');
const palierDe = (a, dep) => { const t = reglages.find((r) => r.artisan_id === a && r.departement === 'tous'); const d = reglages.find((r) => r.artisan_id === a && r.departement === dep);
  const i = Math.min(PRUDENCE.indexOf(t ? t.palier : 'simulation'), PRUDENCE.indexOf(d ? d.palier : 'simulation')); return i < 0 ? 'arret' : PRUDENCE[i]; };
const comptes = $('Composer les comptes').all().map((x) => x.json);
const parCompte = {}; for (const c of comptes) if (c && typeof c.artisan_id === 'string') parCompte[c.artisan_id] = c;
const lots = {}, ordre = [], vus = new Set(), rejets = [], sautes = [], routes_ids = {};
for (const { json: p } of $input.all()) { const c = parCompte[p.artisan_id];
  for (const ev of (Array.isArray(p.evenements) ? p.evenements : [])) {
    const ref = ev && typeof ev.id === 'string' ? ev.id : null;
    if (!c) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'compte_inconnu' }); continue; }
    if (!ev || ev.artisan_id !== p.artisan_id) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'autre_compte' }); continue; }
    if (typeof ev.cle !== 'string' || !ref) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'evenement_hors_forme' }); continue; }
    const dep = ROUTES[ev.type]; if (!dep) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'type_sans_departement' }); continue; }
    if (dep === 'accueil' && (!ev.demande || typeof ev.demande !== 'object')) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'demande_introuvable' }); continue; }
    const cle = p.artisan_id + ':' + ev.cle; if (vus.has(cle)) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'doublon' }); continue; } vus.add(cle);
    const k = p.artisan_id + '|' + dep; if (!lots[k]) { lots[k] = { c: c, dep: dep, evs: [] }; ordre.push(k); } lots[k].evs.push(ev); } }
const DONNEES = { accueil: (c, evs) => ({ demandes: evs.map((ev) => ev.demande), empreintes_connues: c.empreintes_connues, cles_existantes: c.cles_existantes, maintenant: G.maintenant }) };
const CONFIG = { accueil: (c) => Object.assign({}, c.accueil, { interrupteur_general: c.interrupteurs.general, interrupteur_departement: c.interrupteurs.departements.accueil }) };
const s = [];
for (const k of ordre) { const { c, dep, evs } = lots[k]; const ids = evs.map((ev) => ev.id);
  const i = c.interrupteurs && typeof c.interrupteurs === 'object' ? c.interrupteurs : {};
  const palier = palierDe(c.artisan_id, dep);
  if (!SERVIS.includes(palier)) { sautes.push({ artisan_id: c.artisan_id, departement: dep, motif: palier === 'reel' ? 'palier_reel_non_branche' : 'palier_arret', ids: ids }); continue; }
  if (i.general !== true || !i.departements || i.departements[dep] !== true || !OFFRES.includes(c.offre)) { sautes.push({ artisan_id: c.artisan_id, departement: dep, motif: 'interrupteur_coupe', ids: ids }); continue; }
  routes_ids[k] = { artisan_id: c.artisan_id, departement: dep, palier: palier, ids: ids, objets: evs.map((ev) => ({ id: ev.id, type: ev.type, objet_id: ev.objet_id || null })) };
  s.push({ json: { contrat: 'presti-dep-' + dep + '@1', organisation_id: c.artisan_id, simulation: true, cle_idempotence: 'dep:' + dep + ':' + c.artisan_id.slice(24) + ':' + G.passage, trace: trace,
    config: CONFIG[dep] ? CONFIG[dep](c) : {}, donnees: DONNEES[dep] ? DONNEES[dep](c, evs) : { evenements: evs } } }); }
s.push({ json: { contrat: 'aucun', rejets: rejets, sautes: sautes, routes_ids: routes_ids } });
return s;`

/** « Préparer les cartes de l'ombre » : une ligne assistant_actions par carte préparée par un département en palier « ombre ». */
export const CODE_CARTES = String.raw`// Cerveau (036-030) : les cartes de l'OMBRE. Pour chaque département servi en palier « ombre » qui a répondu, chaque effet prévu
// « ecrire_carte » ou « mettre_en_file_pilote » (en ombre, le pilote aussi devient une carte : rien ne part seul) devient UNE ligne
// assistant_actions (0157 + 0194) : à valider (en_attente, confirmation, échéance 7 jours), son département, son motif, la source de
// chaque fait, sa clé (celle du chef : idempotent, « on conflict do nothing »). Même compte exigé partout (multi-tenant strict). En palier
// « simulation », rien n'est écrit. Aucune carte sans clé, sans objet du compte ou sans source.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CLE = /^[A-Za-z0-9_:.-]{3,120}$/;
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const TITRES = { reponse_prospect: 'Répondre à une nouvelle demande', relance_prospect: 'Relancer une demande sans réponse', devis_brouillon: 'Préparer un devis', relance_impaye: 'Relancer une facture impayée' };
const MOTIFS = { demande_recue: 'Une nouvelle demande est arrivée sur votre page', relance_due: 'Une demande attend une relance', devis_a_preparer: 'Un devis est à préparer', facture_a_emettre: 'Une facture est à émettre', impaye_echu: 'Une facture est échue sans paiement', chantier_termine: 'Un chantier est terminé', rendez_vous_a_poser: 'Un rendez-vous est à poser', page_du_matin: 'Le point du matin' };
const aig = $('Aiguiller').all().map((x) => x.json);
const routes = (aig.find((x) => x && x.contrat === 'aucun') || {}).routes_ids || {};
const issue = (nom) => { const n = $(nom); if (!n.isExecuted) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = n.all(0).map((x) => x.json), b = n.all(1).map((x) => x.json); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const expire = new Date(Date.now() + 7 * 86400000).toISOString();
const lignes = [], vues = new Set();
for (const dep of DEPS) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
  for (const x of r.ok) {
    const lot = Object.values(routes).find((l) => l.departement === dep && typeof x.cle_idempotence === 'string' && x.cle_idempotence.startsWith('dep:' + dep + ':' + l.artisan_id.slice(24) + ':'));
    if (!lot || lot.palier !== 'ombre') continue;
    for (const e of (Array.isArray(x.effets_prevus) ? x.effets_prevus : [])) {
      if (!e || (e.effet !== 'ecrire_carte' && e.effet !== 'mettre_en_file_pilote') || !e.corps || typeof e.corps !== 'object') continue;
      const k = e.corps;
      if (k.organisation_id !== lot.artisan_id || !CLE.test(String(k.cle)) || vues.has(lot.artisan_id + ':' + k.cle)) continue;
      const objet = UUID.test(String(k.objet_id)) ? lot.objets.find((o) => o.objet_id === k.objet_id) : null;
      if (!objet) continue;
      vues.add(lot.artisan_id + ':' + k.cle);
      const outil = /^[a-z_]{2,60}$/.test(String(k.type_action)) ? k.type_action : 'action_agent';
      const brouillon = k.brouillon && typeof k.brouillon === 'object' ? { objet: typeof k.brouillon.objet === 'string' ? k.brouillon.objet.slice(0, 120) : null, texte: typeof k.brouillon.texte === 'string' ? k.brouillon.texte.slice(0, 1700) : null } : null;
      const sources = [
        { fait: 'evenement', source: 'evenements_metier:' + objet.id },
        { fait: 'objet', source: (objet.type === 'demande_recue' ? 'leads:' : 'objet:') + k.objet_id },
        { fait: 'palier', source: 'departements_reglages:' + lot.artisan_id + ':' + dep + ':ombre' },
      ];
      if (brouillon && brouillon.texte) sources.push({ fait: 'brouillon', source: 'presti-dep-' + dep + ':' + k.cle });
      lignes.push({ artisan_id: lot.artisan_id, conversation_id: objet.id, tour: 1, outil: outil, mode: 'confirmation', statut: 'en_attente',
        titre: (TITRES[outil] || 'Action préparée par le département ' + dep).slice(0, 200),
        entrees: { type_action: outil, canal: typeof k.canal === 'string' ? k.canal : null, objet_id: k.objet_id, effet: e.effet },
        apercu: { brouillon: brouillon, canal: typeof k.canal === 'string' ? k.canal : null, pilote_en_reel: e.effet === 'mettre_en_file_pilote' },
        objet_type: objet.type === 'demande_recue' ? 'conversation' : null, objet_id: objet.type === 'demande_recue' ? k.objet_id : null,
        expire_le: expire, origine: 'agent', departement: dep,
        motif: ((MOTIFS[objet.type] || 'Un événement est à traiter') + ' ; préparé en mode ombre, rien n’est parti' + (e.effet === 'mettre_en_file_pilote' ? ' (au réel, le pilote l’enverrait après 10 minutes)' : '') + '.').slice(0, 300),
        sources: sources, cle: k.cle });
    } } }
return [{ json: { lignes: lignes.slice(0, 200) } }];`

/** « Préparer les marques » : par compte, les événements servis (département qui a répondu), rejetés ou sautés. */
export const CODE_MARQUES = String.raw`// Cerveau (036-030) : la marque « traité » (evenements_marquer_traites, 0193 ; exécutable par service_role, 0194). Par compte : les
// événements routés vers un département qui a RÉPONDU, et ceux rejetés ou sautés (journalisés : rien n'est perdu en silence ; la demande
// elle-même reste dans l'app). Un département en échec n'est pas marqué : rejoué au passage suivant. 200 identifiants au plus par appel.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const aucun = $('Aiguiller').all().map((x) => x.json).find((x) => x && x.contrat === 'aucun') || { rejets: [], sautes: [], routes_ids: {} };
const issue = (nom) => { const n = $(nom); if (!n.isExecuted) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = n.all(0).map((x) => x.json), b = n.all(1).map((x) => x.json); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const enEchec = new Set(); for (const dep of DEPS) { const r = issue('Appeler presti-dep-' + dep); if (r && r.ko.length) enEchec.add(dep); }
const parCompte = {};
const ajouter = (a, id) => { if (typeof a === 'string' && UUID.test(a) && typeof id === 'string' && UUID.test(id)) (parCompte[a] = parCompte[a] || new Set()).add(id); };
for (const l of Object.values(aucun.routes_ids || {})) if (!enEchec.has(l.departement)) for (const id of l.ids) ajouter(l.artisan_id, id);
for (const x of aucun.rejets || []) if (x.motif !== 'autre_compte' && x.motif !== 'compte_inconnu') ajouter(x.artisan_id, x.id);
for (const x of aucun.sautes || []) for (const id of (x.ids || [])) ajouter(x.artisan_id, id);
const s = Object.keys(parCompte).sort().map((a) => ({ json: { p_artisan: a, p_ids: [...parCompte[a]].slice(0, 200) } }));
return s.length ? s : [{ json: { vide: true } }];`

/** « Bilan du passage » (réécrit) : où il s'est arrêté, routes, statuts, cartes écrites, marques. */
export const CODE_BILAN = String.raw`// Cerveau : le bilan agrégé du passage, sans donnée personnelle : où il s'est arrêté, ce qui a été routé où, les statuts, les effets
// prévus et faits (toujours zéro fait : la porte d'envoi reste fermée), les cartes de l'ombre écrites et les événements marqués.
const passe = (nom) => $(nom).isExecuted;
const sorties = (nom, b) => passe(nom) ? $(nom).all(b || 0).map((x) => x.json) : [];
const issue = (nom) => { if (!passe(nom)) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = sorties(nom, 0), b = sorties(nom, 1); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const G = sorties('Interrupteur général')[0] || {};
if (!passe('Composer les comptes')) return [{ json: { arret: G.lecture === 'erreur' ? 'lecture_impossible' : 'interrupteur_general_coupe', routes: {}, statuts: {}, effets_prevus: 0, effets_faits: 0, cartes_ecrites: 0, marques: 0 } }];
const routes = {}, statuts = {};
let prevus = 0, faits = 0;
for (const x of sorties('Aiguiller')) if (x.contrat !== 'aucun') { const dep = x.contrat.split('@')[0].split('-')[2]; routes[dep] = (routes[dep] || 0) + (x.donnees.demandes || x.donnees.evenements || []).length; }
for (const dep of ["accueil","devis","suivi","facturation","apres","operations","direction"]) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
  statuts[dep] = r.ko.length ? 'echec' : r.ok.map((x) => x.statut).join(',');
  for (const x of r.ok) { if (Array.isArray(x.effets_prevus)) prevus += x.effets_prevus.length; if (Array.isArray(x.effets_faits)) faits += x.effets_faits.length; } }
for (const nom of ['Appeler lib-journaliser', 'Appeler lib-battement']) for (const x of sorties(nom)) { if (x && Array.isArray(x.effets_prevus)) prevus += x.effets_prevus.length; if (x && Array.isArray(x.effets_faits)) faits += x.effets_faits.length; }
const secours = sorties('Journal : rejeté ou sauté')[0] || { rejets: [], sautes: [] };
const cartes = (sorties('Préparer les cartes de l’ombre')[0] || { lignes: [] }).lignes.length;
const ecriture = passe('Écrire les cartes (ombre)') ? (sorties('Écrire les cartes (ombre)').some((x) => x && x.error) ? 'erreur' : 'ok') : 'aucune';
const marques = sorties('Préparer les marques').filter((x) => x && x.p_artisan).reduce((n, x) => n + x.p_ids.length, 0);
return [{ json: { arret: null, simulation: true, comptes: sorties('Composer les comptes').filter((c) => c && c.artisan_id).length, routes: routes, statuts: statuts, sautes: secours.sautes.map((x) => ({ departement: x.departement, motif: x.motif })), rejets: secours.rejets.map((x) => x.motif), effets_prevus: prevus, effets_faits: faits, cartes_ecrites: ecriture === 'ok' ? cartes : 0, ecriture_cartes: ecriture, marques: marques } }];`

/** « Préparer le journal » : lit désormais « Interrupteur général » et « Composer les comptes ». */
export const CODE_JOURNAL = String.raw`// Cerveau : le journal du passage (lib-journaliser), UNE enveloppe par compte lu : chaque département appelé et son statut, chaque saut,
// chaque rejet. Des identifiants et des statuts seulement : aucun nom, aucun contact, aucun texte de client.
const G = $('Interrupteur général').first().json;
const trace = { execution_parent: 'presti-cerveau:' + G.passage, declencheur: 'presti-cerveau', tentative: 0 };
const sorties = (nom, b) => { const n = $(nom); return n.isExecuted ? n.all(b || 0).map((x) => x.json) : []; };
const issue = (nom) => { const n = $(nom); if (!n.isExecuted) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = n.all(0).map((x) => x.json), b = n.all(1).map((x) => x.json); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const comptes = $('Composer les comptes').all().map((x) => x.json).filter((c) => c && typeof c.artisan_id === 'string');
const secours = sorties('Journal : rejeté ou sauté')[0] || { rejets: [], sautes: [] };
const s = [];
for (const c of comptes) { const L = [];
  const ligne = (evenement, ref, decision) => L.push({ evenement: evenement, agent: 'presti-cerveau', objet_ref: ref, decision: String(decision).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: true });
  for (const dep of DEPS) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
    const a = r.ok.filter((x) => x.cle_idempotence.includes(c.artisan_id.slice(24))); if (a.length) ligne('departement_appele', 'presti-dep-' + dep, 'statut ' + a.map((x) => x.statut).join(', '));
    if (r.ko.length) ligne('departement_en_echec', 'presti-dep-' + dep, 'sortie d’erreur : le département n’a pas répondu'); }
  for (const x of secours.sautes) if (x.artisan_id === c.artisan_id) ligne('departement_saute', 'presti-dep-' + x.departement, x.motif);
  for (const x of secours.rejets) if (x.artisan_id === c.artisan_id) ligne('evenement_rejete', x.id, x.motif);
  if (!L.length) ligne('passage_sans_evenement', null, 'rien à router pour ce compte');
  s.push({ json: { contrat: 'lib-journaliser@1', organisation_id: c.artisan_id, simulation: true, cle_idempotence: 'jc:' + c.artisan_id.slice(24) + ':' + G.passage, trace: trace, config: {}, donnees: { entrees: L.slice(0, 200) } } }); }
return s.length ? s : [{ json: { vide: true } }];`

/** « Préparer le battement » : lit « Interrupteur général ». */
export const CODE_BATTEMENT = String.raw`// Cerveau : le battement du passage (lib-battement), que le contrôle des 26 h surveille. L'heure vient de la lecture, jamais d'un calcul.
const G = $('Interrupteur général').first().json;
const trace = { execution_parent: 'presti-cerveau:' + G.passage, declencheur: 'presti-cerveau', tentative: 0 };
return [{ json: { contrat: 'lib-battement@1', organisation_id: G.organisation_systeme, simulation: true, cle_idempotence: 'bat:cerveau:' + G.passage, trace: trace, config: {}, donnees: { workflow: 'presti-cerveau', passe_le: G.maintenant, operation: 'battre' } } }];`

/** Nœud Code → son code attendu dans l'export. */
export const CODES = {
  'Interrupteur général': CODE_INTERRUPTEUR,
  'Composer les comptes': CODE_COMPTES,
  'Composer les pages': CODE_PAGES,
  'Aiguiller': CODE_AIGUILLER,
  'Préparer les cartes de l’ombre': CODE_CARTES,
  'Préparer les marques': CODE_MARQUES,
  'Bilan du passage': CODE_BILAN,
  'Préparer le journal': CODE_JOURNAL,
  'Préparer le battement': CODE_BATTEMENT,
}

/** Les deux écritures permises (aucune n'envoie quoi que ce soit hors de la base) : la carte « à valider » et la marque « traité ». */
export const ECRITURES = {
  'Écrire les cartes (ombre)': { methode: 'POST', url: SUPABASE + '/rest/v1/assistant_actions?on_conflict=artisan_id,cle', prefer: 'resolution=ignore-duplicates,return=minimal' },
  'Marquer les événements traités': { methode: 'POST', url: SUPABASE + '/rest/v1/rpc/evenements_marquer_traites', prefer: null },
}
