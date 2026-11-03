// Cerveau : AIGUILLER, sans rien calculer. Pour chaque page (une par compte), chaque événement :
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
return s;