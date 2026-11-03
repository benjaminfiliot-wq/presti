// Cerveau : AIGUILLER, sans rien calculer. Pour chaque page (une par compte), chaque événement :
//   - doit appartenir au compte de sa page (artisan_id identique) : sinon rejet « autre_compte » (multi-tenant strict ; la lecture filtre déjà) ;
//   - va au département de son type (table fermée) ; un type inconnu est rejeté au journal ; une demande sans sa demande lue aussi ;
//   - n'est routé qu'une fois par passage (clé compte + clé de l'événement) : le doublon est rejeté.
// Palier du département = le plus prudent de « tous » et du sien (0193:181-183). Servis : « simulation » et « ombre » (036-030 : l'ombre
// prépare tout et n'envoie rien, la porte de simulation reste fermée ; ses cartes sont écrites plus loin). « réel » et « arrêt » : sautés.
// Interrupteurs général ET du département ouverts exigés (fail-closed : absent = fermé). Une enveloppe par (compte, département).
// 036-036 : les six autres départements reçoivent l'entrée de LEUR contrat (contrats/<dep>.json), composée des faits de l'événement (rangés par
// le code de l'app, sans texte) et des lectures réelles de « Lire les tables des départements » (filtrées par compte). Rien n'est inventé : une
// lecture absente ou en erreur donne la valeur la plus prudente (vide, nul, coupé), et le chef le dit. Aucun montant n'est calculé ici.
const G = $('Interrupteur général').first().json;
const trace = { execution_parent: 'presti-cerveau:' + G.passage, declencheur: 'presti-cerveau', tentative: 0 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const ROUTES = {"demande_recue":"accueil","devis_a_preparer":"devis","relance_due":"suivi","facture_a_emettre":"facturation","impaye_echu":"facturation","chantier_termine":"apres","rendez_vous_a_poser":"operations","stock_sous_le_seuil":"operations","page_du_matin":"direction"};
const OFFRES = ["studio","signature","essentiel","essai"];
const PRUDENCE = ['arret', 'simulation', 'ombre', 'reel'];
const SERVIS = ['simulation', 'ombre'];
const reglages = $('Lire les réglages des départements').all().map((x) => x.json).filter((r) => r && !r.error && typeof r.artisan_id === 'string');
const palierDe = (a, dep) => { const t = reglages.find((r) => r.artisan_id === a && r.departement === 'tous'); const d = reglages.find((r) => r.artisan_id === a && r.departement === dep);
  const i = Math.min(PRUDENCE.indexOf(t ? t.palier : 'simulation'), PRUDENCE.indexOf(d ? d.palier : 'simulation')); return i < 0 ? 'arret' : PRUDENCE[i]; };
const comptes = $('Composer les comptes').all().map((x) => x.json);
const parCompte = {}; for (const c of comptes) if (c && typeof c.artisan_id === 'string') parCompte[c.artisan_id] = c;
// ── Les lectures réelles (036-036) : un élément de « Préparer les lectures » = une réponse de « Lire les tables » (même rang). Réponse en erreur,
// statut ≠ 200 ou corps hors forme : la table est « non lue » (jamais devinée). Chaque ligne doit porter un compte servi.
const LU = {}, NON_LUES = [];
const qs = $('Préparer les lectures des départements'), lt = $('Lire les tables des départements');
if (qs.isExecuted && lt.isExecuted) { const q = qs.all(), r = lt.all();
  q.forEach((x, i) => { const nom = x.json && x.json.nom; if (!nom) return; const rep = r[i] && r[i].json;
    const ok = rep && !rep.error && (rep.statusCode === undefined || rep.statusCode === 200) && Array.isArray(rep.body !== undefined ? rep.body : rep);
    if (!ok) { NON_LUES.push(nom); return; }
    LU[nom] = (rep.body !== undefined ? rep.body : rep).filter((l) => l && typeof l === 'object' && (l.artisan_id === undefined || parCompte[l.artisan_id])); }); }
const lu = (nom) => Array.isArray(LU[nom]) ? LU[nom] : null;
// ── Les jours fériés (calendrier.api.gouv.fr, 036-036) : un objet { "AAAA-MM-JJ": "nom" } ; illisible = inconnu (null), jamais « ouvré ».
const jf = $('Lire les jours fériés (calendrier.api.gouv.fr)');
const feries = jf.isExecuted ? (() => { const x = jf.first().json; return x && !x.error && typeof x === 'object' && Object.keys(x).some((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)) ? x : null; })() : null;
const jourParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(G.maintenant));
const ferie = feries ? (Object.prototype.hasOwnProperty.call(feries, jourParis) ? { jour: jourParis, nom: String(feries[jourParis]).slice(0, 40) } : false) : null;
const lots = {}, ordre = [], vus = new Set(), rejets = [], sautes = [], routes_ids = {};
for (const { json: p } of $('Composer les pages').all()) { const c = parCompte[p.artisan_id];
  for (const ev of (Array.isArray(p.evenements) ? p.evenements : [])) {
    const ref = ev && typeof ev.id === 'string' ? ev.id : null;
    if (!c) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'compte_inconnu' }); continue; }
    if (!ev || ev.artisan_id !== p.artisan_id) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'autre_compte' }); continue; }
    if (typeof ev.cle !== 'string' || !ref) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'evenement_hors_forme' }); continue; }
    const dep = ROUTES[ev.type]; if (!dep) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'type_sans_departement' }); continue; }
    if (dep === 'accueil' && (!ev.demande || typeof ev.demande !== 'object')) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'demande_introuvable' }); continue; }
    const cle = p.artisan_id + ':' + ev.cle; if (vus.has(cle)) { rejets.push({ artisan_id: p.artisan_id, id: ref, motif: 'doublon' }); continue; } vus.add(cle);
    const k = p.artisan_id + '|' + dep; if (!lots[k]) { lots[k] = { c: c, dep: dep, evs: [] }; ordre.push(k); } lots[k].evs.push(ev); } }
// ── La configuration commune d'un compte, depuis « Composer les comptes » (défauts prudents de 036-030 : pilote inactif, rien ne part seul).
const ACC = (c) => c.accueil || {};
const inter = (c, dep) => ({ interrupteur_general: c.interrupteurs.general === true, interrupteur_departement: !!(c.interrupteurs.departements && c.interrupteurs.departements[dep] === true) });
// La signature d'un message est le nom de l'artisan, comme l'app (fromName : artisans.nom) ; jamais un nom inventé.
const configuration = (c, dep, plus) => Object.assign({ artisan_id: c.artisan_id, nom_artisan: ACC(c).nom_artisan || 'Votre artisan', ton: '', signature: ACC(c).nom_artisan || 'Votre artisan', offre: c.offre, capacites: ACC(c).capacites || [],
  pilote: ACC(c).pilote || { drapeau: true, actif: false, types: {} }, parties_depuis_24h: 0, mots_escalade_artisan: [], horaires: ACC(c).horaires || { jours_permis: [1, 2, 3, 4, 5, 6], heures_permises: { debut: '08:00', fin: '20:00' } },
  plafond_jour: Number.isInteger(ACC(c).plafond_jour) ? ACC(c).plafond_jour : 20, relances_impayes: { actif: false, jours: [] }, cles_existantes: [], maintenant: G.maintenant }, inter(c, dep), plus || {});
const brut = (evs) => evs.map((ev) => ({ id: ev.id, artisan_id: ev.artisan_id, type: ev.type, cle: ev.cle, objet_type: ev.objet_type, objet_id: ev.objet_id, donnees: ev.donnees || {} }));
const duCompte = (nom, a) => (lu(nom) || []).filter((l) => l.artisan_id === a);
const entier = (v) => (Number.isInteger(v) ? v : null);
const DONNEES = {
  accueil: (c, evs) => ({ demandes: evs.map((ev) => ev.demande), empreintes_connues: c.empreintes_connues, cles_existantes: c.cles_existantes, maintenant: G.maintenant }),
  devis: (c, evs) => ({ evenements: brut(evs) }),
  facturation: (c, evs) => ({ evenements: brut(evs) }),
  suivi: (c, evs) => { const leads = {}; for (const l of duCompte('leads_relances', c.artisan_id)) leads[l.id] = l;
    return { maintenant: G.maintenant, cles_existantes: [], evenements: evs.map((ev) => { const f = ev.donnees || {}, l = leads[f.lead_id] || null, rang = Number.isInteger(f.rang) ? f.rang : 1;
      return { id: ev.id, artisan_id: ev.artisan_id, type: 'relance_due', cle: String(ev.cle).slice(0, 60), donnees: { objet_type: 'conversation', objet_id: f.lead_id, dossier_id: f.lead_id,
        // Lecture absente : la demande n'est pas affirmée « repondu » ; « nouveau » ne se relance pas (le côté sûr).
        statut: l && ['repondu', 'nouveau', 'en_discussion', 'gagne', 'perdu'].includes(l.statut) ? l.statut : 'nouveau',
        depuis_le: typeof f.depuis_le === 'string' && f.depuis_le.length > 10 ? f.depuis_le : (l && l.created_at ? new Date(l.created_at).toISOString() : G.maintenant),
        paliers_envoyes: Array.from({ length: Math.max(0, Math.min(rang - 1, 10)) }, (_, i) => i + 1), main_prise: l ? l.prise_en_main === true : null, exclu: false, carte: 'aucune',
        ecartee_le: null, stop: typeof f.stop === 'boolean' ? f.stop : null, historique: { ok: f.registre_lu === true, traces: [] }, messages_entrants: [], canal: ['email', 'sms', 'aucun'].includes(f.canal) ? f.canal : 'aucun',
        destinataire: { opposition: null, consentement_sms: null }, faits: { numero: null, objet: null, client: null, montant_ttc_centimes: null, emis_le: null },
        signaux: { consulte: null, question_posee: false, expire_dans_jours: null, relances_sans_reponse: Math.max(0, Math.min(rang - 1, 10)) } } }; }) }; },
  apres: (c, evs) => { const ch = {}; for (const x of duCompte('chantiers', c.artisan_id)) ch[x.id] = x;
    return { evenements: brut(evs), jour: jourParis, maintenant: G.maintenant, cles_existantes: [], deja_demandes_aujourdhui: 0,
      chantiers: evs.map((ev) => { const f = ev.donnees || {}, x = ch[f.chantier_id]; if (!x) return null;
        return { id: x.id, artisan_id: x.artisan_id, titre: typeof x.titre === 'string' ? x.titre.slice(0, 120) : null, statut: String(x.statut).slice(0, 20), date_fin_reelle: x.date_fin_reelle || null, client_nom: null, textes: [],
          // L'opposition est lue par le code de l'app (crm_apres_opposition, 0171) ; c'est aussi le STOP de l'après-chantier. Nulle : le chef s'abstient.
          contact: { email_connu: f.email_connu === true, sms_consenti: null, opposition: typeof f.opposition === 'boolean' ? f.opposition : null, stop: typeof f.opposition === 'boolean' ? f.opposition : null, litige_en_cours: typeof f.litige === 'boolean' ? f.litige : null, a_ecrit_depuis_fin: false, ecrit_aujourdhui: false } }; }).filter(Boolean) }; },
  operations: (c, evs) => { const m = {}; for (const x of duCompte('materiaux', c.artisan_id)) m[x.id] = x; const st = evs.filter((ev) => ev.type === 'stock_sous_le_seuil');
    const lue = lu('materiaux') !== null;
    return { evenements: brut(evs), genre: st.length ? 'stock' : undefined, maintenant: G.maintenant,
      stock: st.length ? { source: { lue: lue, le: jourParis }, fournisseurs: [], prix: [], commandes_ouvertes: [], cles_existantes: [],
        articles: st.map((ev) => { const f = ev.donnees || {}, x = m[f.materiau_id]; if (!x || typeof f.quantite !== 'number' || typeof f.seuil !== 'number') return null;
          return { artisan_id: x.artisan_id, id: x.id, nom: String(x.nom || '').slice(0, 80), quantite: Math.max(0, f.quantite), seuil: f.seuil, unite: String(x.unite || 'u').slice(0, 20), fournisseur_id: null, qte_reappro: null }; }).filter(Boolean) } : undefined }; },
  direction: (c, evs) => { const a = c.artisan_id, src = (nom) => ({ lue: lu(nom) !== null, le: jourParis });
    return { evenements: brut(evs), genre: 'matin', maintenant: G.maintenant, matin: { sources: { impayes: src('matin_impayes'), devis: src('matin_devis'), demandes: src('matin_demandes'), cartes: src('matin_cartes') },
      impayes: duCompte('matin_impayes', a).map((x) => ({ artisan_id: a, id: x.id, numero: x.numero ? String(x.numero).slice(0, 40) : null, total_ttc: Number(x.total_ttc) || 0, date_echeance: x.date_echeance || null })),
      devis: duCompte('matin_devis', a).map((x) => ({ artisan_id: a, id: x.id, numero: x.numero ? String(x.numero).slice(0, 40) : null, total_ttc: Number(x.total_ttc) || 0, envoye_le: x.envoye_le ? new Date(x.envoye_le).toISOString() : null })),
      demandes: duCompte('matin_demandes', a).map((x) => ({ artisan_id: a, id: x.id, urgent: x.urgence === 'urgent' })),
      stock: [], exclus: [], cles_existantes: [],
      cartes: duCompte('matin_cartes', a).filter((x) => typeof x.cle === 'string' && x.cle).slice(0, 50).map((x) => ({ artisan_id: a, cle: String(x.cle).slice(0, 80), type_action: /^[a-z_]{2,60}$/.test(String(x.outil)) ? x.outil : 'action',
        objet: String(x.outil || '').slice(0, 60), titre: String(x.titre || '').slice(0, 120), apercu: '', montant_centimes: null, preparee_le: new Date(x.created_at || G.maintenant).toISOString() })) } }; },
};
const CONFIG = {
  accueil: (c) => Object.assign({}, c.accueil, { interrupteur_general: c.interrupteurs.general, interrupteur_departement: c.interrupteurs.departements.accueil }),
  devis: (c, evs) => { const devis = duCompte('devis', c.artisan_id), ids = new Set(devis.map((d) => d.id));
    return { lectures_simulees: { configuration: [configuration(c, 'devis')],
      // Les montants ne sont PAS recopiés : la base les tient en euros, et n8n ne convertit rien (contrats/devis.json, regle). Prix nuls : chaque
      // ligne s'affiche « estimé », jamais « sourcé » à tort ; la carte renvoie à l'app pour les montants.
      devis: devis.map((d) => ({ artisan_id: d.artisan_id, devis_id: d.id, lead_id: d.lead_id || null, numero: d.numero || null, statut: d.statut, total_ttc_centimes: null, total_ttc_affiche: null })),
      lignes: (lu('devis_lignes') || []).filter((l) => ids.has(l.devis_id)).map((l) => ({ artisan_id: c.artisan_id, devis_id: l.devis_id, rang: Number.isInteger(l.ordre) ? l.ordre : 0,
        designation: String(l.designation || '').slice(0, 200), quantite: Number(l.quantite) || 0, prix_unitaire_ht_centimes: null, prix_affiche: null, source_prix: typeof l.source_prix === 'string' ? l.source_prix : null, repere_affiche: null, repere_chantier_le: null })) } }; },
  facturation: (c, evs) => { const reg = duCompte('relances_impayes_reglages', c.artisan_id)[0] || null, montants = {}, contestations = {};
    for (const ev of evs) { const f = ev.donnees || {}; if (UUID.test(String(f.facture_id))) { montants[f.facture_id] = entier(f.montant_ttc_centimes); contestations[f.facture_id] = typeof f.contestation === 'boolean' ? f.contestation : null; } }
    return { lectures_simulees: { configuration: [configuration(c, 'facturation', { relances_impayes: reg ? { actif: reg.actif === true, jours: Array.isArray(reg.jours) && reg.jours.length ? reg.jours : [3, 10, 21] } : { actif: false, jours: [] } })],
      apercus: [], arrets: duCompte('relances_impayes_arrets', c.artisan_id).map((x) => ({ artisan_id: x.artisan_id, facture_id: x.facture_id, motif: x.motif || null, le: x.le || null, reprise_le: x.reprise_le || null })),
      // Le montant est celui que le CODE de l'app a calculé et rangé dans l'événement (centimes entiers), jamais converti ici.
      factures: duCompte('factures', c.artisan_id).map((x) => ({ artisan_id: x.artisan_id, facture_id: x.id, numero: x.numero || null, objet: null, statut: x.statut, avoir_de: x.avoir_de || null,
        regime_tva: x.tva_regime === 'franchise' ? 'franchise' : 'tva', date_echeance: x.date_echeance || null, total_ttc_centimes: montants[x.id] === undefined ? null : montants[x.id], total_ttc_affiche: null,
        // La contestation est celle que le code des impayés a lue (booléen) ; nulle = inconnue, et lib-relancer refuse (fail-closed).
        contestation: contestations[x.id] === undefined ? null : contestations[x.id], paliers_envoyes: [], historique: { ok: true, traces: [] } })) } }; },
  suivi: (c, evs) => Object.assign({ nom_artisan: ACC(c).nom_artisan || 'Votre artisan', offre: c.offre, capacites: ACC(c).capacites || [], pilote: ACC(c).pilote || { drapeau: true, actif: false, types: {} },
    // La pause générale : « levée » (false) seulement si TOUS les faits du lot l'ont lue levée (le cron la lit avant d'écrire) ; sinon nulle (le chef s'abstient).
    parties_depuis_24h: 0, plafond_jour: Number.isInteger(ACC(c).plafond_jour) ? ACC(c).plafond_jour : 20, pause_generale: evs.length && evs.every((ev) => (ev.donnees || {}).pause_generale === false) ? false : null, mots_escalade_artisan: [], fournisseurs: [],
    horaires: ACC(c).horaires || { jours_permis: [1, 2, 3, 4, 5, 6], heures_permises: { debut: '08:00', fin: '20:00' } }, paliers_conversation_jours: [2, 5, 10], paliers_devis_jours: [7], jour_du_lot: 1, ton: '', signature: ACC(c).nom_artisan || 'Votre artisan',
    interet: { poids: { consulte: 40, question_posee: 30, expire_bientot: 10, relance_sans_reponse: -10 }, seuils: { chaud: 60, tiede: 30 } } }, inter(c, 'suivi')),
  apres: (c) => { const r = duCompte('crm_apres_chantier', c.artisan_id)[0] || null;
    return Object.assign({ offre: c.offre, capacites: ACC(c).capacites || [], artisan: { nom: ACC(c).nom_artisan || 'Votre artisan' }, mots_escalade_artisan: [],
      reglages: { avis: !!(r && r.avis === true), entretien: !!(r && r.entretien === true), actif_depuis: r && /^\d{4}-\d{2}-\d{2}$/.test(String(r.actif_depuis || '').slice(0, 10)) ? String(r.actif_depuis).slice(0, 10) : null, texte_avis: null, texte_entretien: null } }, inter(c, 'apres')); },
  operations: (c) => Object.assign({ offre: c.offre, nom_artisan: ACC(c).nom_artisan || 'Votre artisan', horaires: ACC(c).horaires || { jours_permis: [1, 2, 3, 4, 5, 6], heures_permises: { debut: '08:00', fin: '20:00' } },
    pilote: ACC(c).pilote || { drapeau: true, actif: false, types: {} } }, inter(c, 'operations')),
  direction: (c) => Object.assign({ offre: c.offre }, inter(c, 'direction')),
};
const s = [];
for (const k of ordre) { const { c, dep, evs } = lots[k]; const ids = evs.map((ev) => ev.id);
  const i = c.interrupteurs && typeof c.interrupteurs === 'object' ? c.interrupteurs : {};
  const palier = palierDe(c.artisan_id, dep);
  if (!SERVIS.includes(palier)) { sautes.push({ artisan_id: c.artisan_id, departement: dep, motif: palier === 'reel' ? 'palier_reel_non_branche' : 'palier_arret', ids: ids }); continue; }
  if (i.general !== true || !i.departements || i.departements[dep] !== true || !OFFRES.includes(c.offre)) { sautes.push({ artisan_id: c.artisan_id, departement: dep, motif: 'interrupteur_coupe', ids: ids }); continue; }
  routes_ids[k] = { artisan_id: c.artisan_id, departement: dep, palier: palier, ids: ids, objets: evs.map((ev) => ({ id: ev.id, type: ev.type, objet_id: ev.objet_id || null })) };
  const donnees = JSON.parse(JSON.stringify(DONNEES[dep] ? DONNEES[dep](c, evs) : { evenements: evs }));
  s.push({ json: { contrat: 'presti-dep-' + dep + '@1', organisation_id: c.artisan_id, simulation: true, cle_idempotence: 'dep:' + dep + ':' + c.artisan_id.slice(24) + ':' + G.passage, trace: trace,
    config: CONFIG[dep] ? CONFIG[dep](c, evs) : {}, donnees: donnees } }); }
s.push({ json: { contrat: 'aucun', rejets: rejets, sautes: sautes, routes_ids: routes_ids, lectures: { lues: Object.keys(LU).sort(), non_lues: NON_LUES.sort() }, jour_ferie: ferie } });
return s;
