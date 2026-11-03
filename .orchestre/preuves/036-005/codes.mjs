// 036-005 — le code des nœuds de presti-dep-devis et de presti-dep-facturation (fabrique : le juge ne la lit jamais, il lit les exports de n8n).
// RÈGLE DE CE LOT : « le code calcule, n8n route ». Aucun nœud ci-dessous ne calcule, ne convertit ni ne somme un montant : les montants
// (centimes entiers et texte affiché) sont produits par le code de l'application ou par la base, lus tels quels, recopiés tels quels.
// Ce qu'un chef décide, ce sont des CARTES, des lignes du pilote et des arrêts : jamais un chiffre. Aucun modèle n'est appelé.
// Une lecture est un emplacement (noOp) dont la note porte la requête, filtrée sur le compte ; en simulation, ses lignes viennent de
// l'essai (épinglées) ou du banc (`config.lectures_simulees`, honoré seulement quand `simulation` est vrai).
const J = JSON.stringify

export const LECTURES_DEVIS = {
  config: 'Lire la configuration du compte (simulation : épinglé)',
  devis: 'Lire les devis préparés par l’application (simulation : épinglé)',
  lignes: 'Lire les lignes de ces devis (simulation : épinglé)',
}
export const LECTURES_FACT = {
  config: 'Lire la configuration du compte (simulation : épinglé)',
  apercus: 'Lire les aperçus de facture de l’application (simulation : épinglé)',
  factures: 'Lire les factures (simulation : épinglé)',
  arrets: 'Lire les arrêts de relance (simulation : épinglé)',
}

// Ce que chaque lecture demande (note `requete:` du nœud), chacune filtrée sur le compte : « Supabase account » passe outre la RLS.
// Vues étroites à écrire plus tard (migration non écrite ici : supabase/** n'est pas dans le périmètre) ; les montants y sont calculés par la base.
const COMPTE = '&artisan_id=eq.<compte>'
export const REQUETES = {
  [LECTURES_DEVIS.config]: 'GET n8n_config_agents?select=artisan_id,nom_artisan,ton,signature,offre,capacites,pilote,parties_depuis_24h,interrupteur_general,interrupteur_departement,mots_escalade_artisan,horaires,plafond_jour,relances_impayes,cles_existantes,maintenant' + COMPTE + '&departement=eq.<devis|facturation>&limit=1',
  [LECTURES_DEVIS.devis]: 'GET n8n_devis_prets?select=artisan_id,devis_id,lead_id,numero,statut,total_ttc_centimes,total_ttc_affiche' + COMPTE + '&devis_id=in.(<devis des événements>)&limit=200',
  [LECTURES_DEVIS.lignes]: 'GET n8n_devis_lignes?select=artisan_id,devis_id,rang,designation,quantite,prix_unitaire_ht_centimes,prix_affiche,source_prix,repere_affiche,repere_chantier_le' + COMPTE + '&devis_id=in.(<devis des événements>)&order=rang.asc&limit=2000',
  [LECTURES_FACT.config]: 'GET n8n_config_agents?select=artisan_id,nom_artisan,ton,signature,offre,capacites,pilote,parties_depuis_24h,interrupteur_general,interrupteur_departement,mots_escalade_artisan,horaires,plafond_jour,relances_impayes,cles_existantes,maintenant' + COMPTE + '&departement=eq.facturation&limit=1',
  [LECTURES_FACT.apercus]: 'GET n8n_apercus_facture?select=artisan_id,devis_id,chantier_termine,deja_facturee,apercu_ok,apercu_erreur,apercu_type,apercu_total_ttc_centimes,apercu_total_ttc_affiche,apercu_nb_deduites,apercu_le' + COMPTE + '&devis_id=in.(<devis des événements>)&limit=200',
  [LECTURES_FACT.factures]: 'GET n8n_factures_argent?select=artisan_id,facture_id,numero,objet,statut,avoir_de,regime_tva,date_echeance,total_ttc_centimes,total_ttc_affiche,contestation,paliers_envoyes,historique' + COMPTE + '&facture_id=in.(<factures des événements>)&limit=200',
  [LECTURES_FACT.arrets]: 'GET relances_impayes_arrets?select=artisan_id,facture_id,raison,le,reprise_le,motif' + COMPTE + '&facture_id=in.(<factures des événements>)&limit=200',
}

// ─── Fragments communs (colés en tête de chaque nœud « Préparer… » : un nœud Code n'importe rien) ─────────────────────────────────────
const SORTIES = String.raw`const sorties = (nom) => { const n = $(nom); return n.isExecuted ? n.all().map((x) => x.json) : []; };
const parCle = (nom, contrat) => { const m = {}; for (const s of sorties(nom)) if (s && s.contrat === contrat && typeof s.cle_idempotence === 'string') m[s.cle_idempotence] = s; return m; };
const bon = (s) => !!(s && s.statut === 'ok' && s.resultat);
const VIDE = [{ json: { vide: true } }];
`
const LU = String.raw`const LU = (nom, cle) => {
  const n = $(nom);
  const lues = n.isExecuted ? n.all().map((x) => x.json).filter((x) => x && typeof x.artisan_id === 'string') : [];
  for (const e of ENVS) { const s = e.simulation === true && e.config && e.config.lectures_simulees ? e.config.lectures_simulees[cle] : null; if (Array.isArray(s)) for (const r of s) lues.push(r); }
  return lues;
};
`
const ENV = (dep) => String.raw`const env = (e, contrat, cle, config, donnees) => ({ contrat: contrat, organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: String(cle).slice(0, 80), trace: { execution_parent: String(e.trace.execution_parent), declencheur: 'presti-dep-${dep}', tentative: e.trace.tentative }, config: config, donnees: donnees });
`
const ENVS = String.raw`const ENVS = $("Contrat d'entrée").all().map((x) => x.json).filter((x) => x.conforme === true).map((x) => x.enveloppe);
`

// ═════════════════════════════════════════════════ presti-dep-devis ═════════════════════════════════════════════════════
export const constituerDevis = (k) => ENVS + LU + String.raw`const SOURCE = new RegExp(${J(k.SOURCE_PRIX)}, 'i');
const CONFIGS = {}; for (const r of LU(${J(LECTURES_DEVIS.config)}, 'configuration')) CONFIGS[r.artisan_id] = r;
const DEVIS = {}; for (const r of LU(${J(LECTURES_DEVIS.devis)}, 'devis')) if (typeof r.devis_id === 'string') DEVIS[r.artisan_id + '|' + r.devis_id] = r;
const LIGNES = {}; for (const r of LU(${J(LECTURES_DEVIS.lignes)}, 'lignes')) if (typeof r.devis_id === 'string') { const q = r.artisan_id + '|' + r.devis_id; if (!LIGNES[q]) LIGNES[q] = []; LIGNES[q].push(r); }
const DOSSIERS = [], REJETS = [], vus = new Set();
for (const e of ENVS) for (const ev of e.donnees.evenements) {
  const org = e.organisation_id;
  if (ev.artisan_id !== org) { REJETS.push({ org: org, id: ev.id, motif: 'autre_compte' }); continue; }
  if (ev.type !== 'devis_a_preparer') { REJETS.push({ org: org, id: ev.id, motif: 'type_hors_departement' }); continue; }
  const cle = org + ':' + ev.cle; if (vus.has(cle)) { REJETS.push({ org: org, id: ev.id, motif: 'doublon' }); continue; } vus.add(cle);
  const f = ev.donnees && typeof ev.donnees === 'object' ? ev.donnees : {}, c = CONFIGS[org];
  const d = { org: org, ev: ev, f: f, c: c, devis: null, lignes: [], etat: null };
  if (!c) d.etat = 'configuration_non_lue';
  else if (f.qualifiee !== true) d.etat = 'non_qualifiee';
  else if (!f.devis_id) d.etat = 'a_preparer';
  else { d.devis = DEVIS[org + '|' + f.devis_id] || null; d.lignes = (LIGNES[org + '|' + f.devis_id] || []).slice().sort((a, b) => (a.rang > b.rang ? 1 : -1));
    d.etat = !d.devis ? 'devis_introuvable' : d.devis.statut !== 'brouillon' ? 'deja_parti' : 'pret'; }
  DOSSIERS.push(d);
}
return [{ json: { envs: ENVS.map((e) => ({ organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: e.cle_idempotence, trace: e.trace, nb: e.donnees.evenements.length })), dossiers: DOSSIERS, rejets: REJETS } }];`

// En-tête commun des nœuds qui relisent les dossiers (le nœud « Constituer les dossiers » les a faits une seule fois).
export const communDevis = (k) => String.raw`const D = $('Constituer les dossiers').first().json, ENVS = D.envs, DOSSIERS = D.dossiers, REJETS = D.rejets;
const ENVB = {}; for (const e of ENVS) ENVB[e.organisation_id] = e;
` + SORTIES + ENV('devis') + String.raw`const SOURCE = new RegExp(${J(k.SOURCE_PRIX)}, 'i');
const niveauMax = (c) => (c.capacites.includes('assistant.pilote') ? 3 : 2);
// Une ligne dont le prix est SOURCÉ : copie figée de ligneSourcee (lib/pilote/regles.ts). Un repère tiré d'un ancien chantier n'est JAMAIS une source (B9).
const sourcee = (l) => Number.isInteger(l.prix_unitaire_ht_centimes) && l.prix_unitaire_ht_centimes > 0 && typeof l.source_prix === 'string' && l.source_prix.trim() !== '' && SOURCE.test(l.source_prix.trim());
const PAR_EV = {}; for (const d of DOSSIERS) PAR_EV[d.ev.id] = d;
const pret = (d) => d.etat === 'pret', actif = (d) => d.etat === 'pret' || d.etat === 'a_preparer';
const tousSources = (d) => d.lignes.length > 0 && d.lignes.every(sourcee);
`

export const DEVIS = (k) => ({
  'Préparer la décision': String.raw`// Devis (A13, B9) : une demande qualifiée devient une carte « préparer le devis » ; un devis préparé PAR L'APPLICATION devient une carte
// « devis prêt », où chaque prix porte sa source ou s'affiche « estimé ». Le chiffrage reste le code de l'application (lib/devisAuto.ts), lancé au
// clic de l'artisan : ce chef ne chiffre rien, et il ne passe AUCUN prix à lib-decider (rien à additionner). Un prix pratiqué sur un ancien chantier est
// un repère cité, jamais une source. L'ENVOI d'un devis (envoyer_devis) n'est pas porté ici : lib-decider@1 et la porte le réservent à l'artisan (p5:226),
// le pilote de l'application garde sa règle (toutes les lignes sourcées, lib/pilote/regles.ts:272). Une escalade non lue vaut escalade (côté sûr).
` + communDevis(k) + String.raw`const s = [];
for (const d of DOSSIERS) { if (!actif(d)) continue;
  const c = d.c;
  const constat = { outil: pret(d) ? 'devis_pret' : 'creer_devis', etape: pret(d) ? 'devis-pret' : 'preparer', escalade: d.f.escalade === false ? false : true };
  s.push({ json: env(ENVB[d.org], 'lib-decider@1', 'd:' + d.ev.id, { autonomie: { niveau_max: niveauMax(c), niveau_defaut: 2, niveaux: {} }, plan: c.offre, pilote: c.pilote, parties_depuis_24h: c.parties_depuis_24h },
    { objet_type: pret(d) ? 'devis' : 'demande', objet_id: pret(d) ? d.f.devis_id : d.f.lead_id, constat: constat }) }); }
return s.length ? s : VIDE;`,
  'Préparer la porte': String.raw`// Devis : la porte de conformité (lib-porte-conformite, veto) avant TOUT effet. Ce chef n'écrit aucun texte : message nul (une carte, pas un envoi).
` + communDevis(k) + String.raw`const dec = parCle('Appeler lib-decider', 'lib-decider@1');
const s = [];
for (const d of DOSSIERS) { const r = dec['d:' + d.ev.id]; if (!actif(d) || !bon(r) || r.resultat.action === 'rien') continue;
  const c = d.c, cible = r.resultat.action === 'pilote' ? 'pilote' : 'carte';
  s.push({ json: env(ENVB[d.org], 'lib-porte-conformite@1', 'p:' + d.ev.id, { jamais_auto: [], regles_metier: { fournisseurs: [], mots_escalade_artisan: c.mots_escalade_artisan, jours_permis: c.horaires.jours_permis, heures_permises: c.horaires.heures_permises }, plafond_jour: c.plafond_jour },
    { action: { type_action: r.resultat.type_action, outil: pret(d) ? 'devis_pret' : 'creer_devis', prix_sources: true, cible: cible, sans_relecture: cible === 'pilote' }, message: null,
      destinataire: { opposition: false, consentement_sms: null, escalade: false }, maintenant: c.maintenant, compteurs: { envoyes_aujourdhui: c.parties_depuis_24h } }) }); }
return s.length ? s : VIDE;`,
  "Préparer l'exécution": String.raw`// Devis : SEUL ce que la porte laisse passer va à lib-executer, qui relit les interrupteurs juste avant l'effet et les clés déjà en base. Un devis, une clé.
` + communDevis(k) + String.raw`const dec = parCle('Appeler lib-decider', 'lib-decider@1');
const s = [];
for (const p of sorties('Appeler lib-porte-conformite')) { if (!p || p.contrat !== 'lib-porte-conformite@1' || !p.resultat || p.resultat.verdict !== 'passe') continue;
  const id = p.cle_idempotence.slice(2), d = PAR_EV[id], r = dec['d:' + id]; if (!d || !bon(r)) continue;
  const c = d.c;
  s.push({ json: env(ENVB[d.org], 'lib-executer@1', r.resultat.cle_idempotence, { niveau_max: niveauMax(c) }, { verdict: 'passe', cible: p.resultat.cible, cle_idempotence: r.resultat.cle_idempotence,
    charge: { type_action: r.resultat.type_action, objet_type: pret(d) ? 'devis' : 'demande', objet_id: pret(d) ? d.f.devis_id : d.f.lead_id },
    interrupteurs: { general: c.interrupteur_general, agent: c.interrupteur_departement }, cles_existantes: c.cles_existantes }) }); }
return s.length ? s : VIDE;`,
  'Préparer le journal': String.raw`// Devis : le journal (lib-journaliser), une enveloppe par compte : des identifiants et des décisions, jamais un nom, un contact, un texte ni un montant.
` + communDevis(k) + String.raw`const dec = parCle('Appeler lib-decider', 'lib-decider@1'), po = parCle('Appeler lib-porte-conformite', 'lib-porte-conformite@1'), ex = parCle('Appeler lib-executer', 'lib-executer@1');
const s = [];
for (const e of ENVS) { const L = [];
  const ligne = (evenement, ref, decision) => L.push({ evenement: evenement, agent: 'presti-dep-devis', objet_ref: ref, decision: String(decision).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: e.simulation });
  for (const x of REJETS) if (x.org === e.organisation_id) ligne('evenement_rejete', x.id, x.motif);
  for (const d of DOSSIERS) { if (d.org !== e.organisation_id) continue;
    if (!actif(d)) { ligne('devis_non_traite', d.ev.id, d.etat); continue; }
    const r = dec['d:' + d.ev.id]; if (!bon(r)) { ligne('decision_en_echec', d.ev.id, 'lib-decider n a pas répondu'); continue; }
    ligne('decision', d.ev.id, r.resultat.action + ' (' + r.resultat.motif + ')' + (pret(d) ? (tousSources(d) ? ', tous les prix sourcés' : ', au moins un prix estimé') : ''));
    const p = po['p:' + d.ev.id]; if (p && p.resultat) ligne(p.resultat.verdict === 'passe' ? 'porte_passe' : 'porte_refuse', d.ev.id, p.resultat.verdict + (p.resultat.motifs.length ? ' (' + p.resultat.motifs.join(', ') + ')' : ''));
    const x = ex[r.resultat.cle_idempotence]; if (x && x.resultat) ligne(x.resultat.deja_fait ? 'deja_traite' : 'action_prevue', d.ev.id, x.resultat.deja_fait ? 'déjà fait : rien de refait' : (x.resultat.motif || 'prévue (simulation)')); }
  s.push({ json: env(e, 'lib-journaliser@1', 'j:' + e.cle_idempotence, {}, { entrees: L.slice(0, 200) }) }); }
return s.length ? s : VIDE;`,
  Assembler: String.raw`// Devis : la sortie, une par compte. Chaque carte « devis prêt » porte, ligne par ligne, son prix tel que l'application l'affiche, SA SOURCE ou
// « estimé », et le repère cité s'il y en a un : tout vient des lectures, rien n'est calculé. Les effets prévus viennent de lib-executer : rien n'est fait.
` + communDevis(k) + String.raw`const dec = parCle('Appeler lib-decider', 'lib-decider@1'), po = parCle('Appeler lib-porte-conformite', 'lib-porte-conformite@1'), ex = parCle('Appeler lib-executer', 'lib-executer@1'), jr = parCle('Appeler lib-journaliser', 'lib-journaliser@1');
const communes = [];
for (const nom of ['Appeler lib-decider', 'Appeler lib-porte-conformite', 'Appeler lib-executer', 'Appeler lib-journaliser']) for (const x of sorties(nom)) if (!x || typeof x.contrat !== 'string') communes.push(nom + ' : appel en échec');
return ENVS.map((e) => {
  const erreurs = communes.slice(), effets = [];
  const r0 = { evenements_recus: e.nb, rejets: [], non_traites: [], a_preparer: [], devis_prets: [], cartes: [], pilote: [], refus_porte: [], deja_faits: [], sorties_vers_un_modele: 0 };
  for (const x of REJETS) if (x.org === e.organisation_id) r0.rejets.push({ id: x.id, motif: x.motif });
  for (const d of DOSSIERS) { if (d.org !== e.organisation_id) continue;
    if (!actif(d)) { r0.non_traites.push({ ref: d.ev.id, raison: d.etat }); continue; }
    const r = dec['d:' + d.ev.id], p = po['p:' + d.ev.id];
    if (!bon(r)) { erreurs.push('lib-decider : ' + (r ? r.statut : 'absent')); continue; }
    if (r.resultat.action === 'rien') { r0.non_traites.push({ ref: d.ev.id, raison: r.resultat.motif }); continue; }
    if (p && p.resultat && p.resultat.verdict !== 'passe') r0.refus_porte.push({ ref: d.ev.id, motifs: p.resultat.motifs, repli: p.resultat.repli });
    const x = ex[r.resultat.cle_idempotence]; let cible = null;
    if (x && x.resultat) { if (Array.isArray(x.effets_prevus)) for (const y of x.effets_prevus) effets.push(y);
      if (x.resultat.deja_fait) r0.deja_faits.push(r.resultat.cle_idempotence);
      else if (x.statut === 'ok' && x.resultat.prevu && p && p.resultat) { cible = p.resultat.cible; (cible === 'pilote' ? r0.pilote : r0.cartes).push(r.resultat.cle_idempotence); }
      if (x.statut !== 'ok' && !x.resultat.deja_fait) erreurs.push('lib-executer : ' + (x.resultat.motif || x.statut)); }
    if (!cible) continue;
    if (cible === 'pilote') { erreurs.push('devis : aucune ligne du pilote n est permise ici'); continue; }
    if (!pret(d)) { r0.a_preparer.push({ cle: r.resultat.cle_idempotence, lead_id: d.f.lead_id, cible: cible, geste: 'creer_devis au clic de l artisan (lib/devisAuto.ts)' }); continue; }
    r0.devis_prets.push({ cle: r.resultat.cle_idempotence, devis_id: d.f.devis_id, numero: d.devis.numero, total_ttc_affiche: d.devis.total_ttc_affiche, cible: cible,
      motif_carte: r.resultat.motif, tous_prix_sources: tousSources(d), a_estimer: d.lignes.filter((l) => !sourcee(l)).length, envoi: 'au clic de l artisan',
      lignes: d.lignes.map((l) => ({ rang: l.rang, designation: l.designation, prix_affiche: l.prix_affiche, statut_prix: sourcee(l) ? 'source' : 'estime', source: sourcee(l) ? l.source_prix : null,
        repere: l.repere_affiche ? { affiche: l.repere_affiche, chantier_le: l.repere_chantier_le || null } : null })) }); }
  const j = jr['j:' + e.cle_idempotence]; if (j && Array.isArray(j.effets_prevus)) for (const y of j.effets_prevus) effets.push(y);
  const statut = erreurs.length ? 'erreur' : e.nb ? 'ok' : 'rien_a_faire';
  return { json: { enveloppe: e, statut: statut, resultat: r0, effets_prevus: effets.slice(0, 1000), effets_faits: [], journal: j && Array.isArray(j.journal) ? j.journal : [], erreurs: erreurs.slice(0, 20) } };
});`,
})
export const ETAPES_DEVIS = [
  ['Préparer la décision', 'Rien à décider ?', 'lib-decider'],
  ['Préparer la porte', 'Rien à contrôler ?', 'lib-porte-conformite'],
  ["Préparer l'exécution", 'Rien à exécuter ?', 'lib-executer'],
]

// ═══════════════════════════════════════════ presti-dep-facturation ═══════════════════════════════════════════════════
export const MOTIFS = { a_ranger: 'ranger_motif_impaye', dit_avoir_paye: 'verifier_paiement', litige: 'escalader_litige', autre: 'traiter_impaye_a_la_main' }
export const constituerFact = (k) => ENVS + LU + String.raw`const CONFIGS = {}; for (const r of LU(${J(LECTURES_FACT.config)}, 'configuration')) CONFIGS[r.artisan_id] = r;
const APERCUS = {}; for (const r of LU(${J(LECTURES_FACT.apercus)}, 'apercus')) if (typeof r.devis_id === 'string') APERCUS[r.artisan_id + '|' + r.devis_id] = r;
const FACTURES = {}; for (const r of LU(${J(LECTURES_FACT.factures)}, 'factures')) if (typeof r.facture_id === 'string') FACTURES[r.artisan_id + '|' + r.facture_id] = r;
const ARRETS = {}; for (const r of LU(${J(LECTURES_FACT.arrets)}, 'arrets')) if (typeof r.facture_id === 'string') { const q = r.artisan_id + '|' + r.facture_id; if (!ARRETS[q] || String(r.le) > String(ARRETS[q].le)) ARRETS[q] = r; }
const DOSSIERS = [], REJETS = [], vus = new Set();
for (const e of ENVS) for (const ev of e.donnees.evenements) {
  const org = e.organisation_id;
  if (ev.artisan_id !== org) { REJETS.push({ org: org, id: ev.id, motif: 'autre_compte' }); continue; }
  if (ev.type !== 'facture_a_emettre' && ev.type !== 'impaye_echu') { REJETS.push({ org: org, id: ev.id, motif: 'type_hors_departement' }); continue; }
  const cle = org + ':' + ev.cle; if (vus.has(cle)) { REJETS.push({ org: org, id: ev.id, motif: 'doublon' }); continue; } vus.add(cle);
  const f = ev.donnees && typeof ev.donnees === 'object' ? ev.donnees : {}, c = CONFIGS[org];
  const d = { org: org, ev: ev, f: f, c: c, kind: ev.type === 'impaye_echu' ? 'relancer' : 'emettre', row: null, arret: null, etat: null };
  if (d.kind === 'relancer') { d.row = f.facture_id ? FACTURES[org + '|' + f.facture_id] || null : null; d.arret = f.facture_id ? ARRETS[org + '|' + f.facture_id] || null : null; }
  else d.row = f.devis_id ? APERCUS[org + '|' + f.devis_id] || null : null;
  const r = d.row;
  if (!c) d.etat = 'configuration_non_lue';
  else if (!r) d.etat = d.kind === 'emettre' ? 'apercu_introuvable' : 'facture_introuvable';
  else if (d.kind === 'emettre') d.etat = r.chantier_termine !== true ? 'chantier_non_termine' : r.deja_facturee !== false ? 'deja_facturee' : r.apercu_ok !== true ? 'apercu_refuse' : 'a_emettre';
  else if (r.statut === 'payee') d.etat = 'payee';
  else if (r.statut !== 'emise' || r.avoir_de) d.etat = 'pas_relancable';
  else if (!c.relances_impayes || c.relances_impayes.actif !== true) d.etat = 'relances_non_activees';
  else if (d.arret && !d.arret.reprise_le && d.arret.motif !== 'oubli') d.etat = 'motif_' + (d.arret.motif || 'a_ranger');
  else d.etat = 'a_relancer';
  DOSSIERS.push(d);
}
return [{ json: { envs: ENVS.map((e) => ({ organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: e.cle_idempotence, trace: e.trace, nb: e.donnees.evenements.length })), dossiers: DOSSIERS, rejets: REJETS } }];`

// En-tête commun des nœuds qui relisent les dossiers (le nœud « Constituer les dossiers » les a faits une seule fois).
export const communFact = (k) => String.raw`const D = $('Constituer les dossiers').first().json, ENVS = D.envs, DOSSIERS = D.dossiers, REJETS = D.rejets;
const ENVB = {}; for (const e of ENVS) ENVB[e.organisation_id] = e;
` + SORTIES + ENV('facturation') + String.raw`const JAMAIS = ${J(k.OUTILS_JAMAIS_AUTO)};
const MOTIFS = ${J(MOTIFS)};
const niveauMax = (c, outil) => (c.capacites.includes('assistant.pilote') && (outil !== 'relancer_facture' || c.capacites.includes('factures.relances.auto')) ? 3 : 2);
const PAR_EV = {}; for (const d of DOSSIERS) PAR_EV[d.ev.id] = d;
const estMotif = (d) => d.etat.slice(0, 6) === 'motif_';
const motifDe = (d) => d.etat.slice(6);
const rel = parCle('Appeler lib-relancer', 'lib-relancer@1');
// La décision à prendre pour un dossier : { outil, etape, escalade, objet_type, objet_id, type_action, palier, relire } ou null.
const plan = (d) => {
  if (d.etat === 'a_emettre') return { outil: 'creer_facture', etape: 'facture-prete', escalade: false, objet_type: 'devis', objet_id: d.f.devis_id, type_action: 'creer_facture' };
  if (estMotif(d)) { const m = motifDe(d); return { outil: MOTIFS[m], etape: 'motif-' + m.split('_').join('-'), escalade: m === 'litige', objet_type: 'facture', objet_id: d.f.facture_id, type_action: MOTIFS[m] }; }
  if (d.etat === 'a_relancer') { const r = rel['r:' + d.ev.id];
    if (!r || !r.resultat || !r.resultat.palier) return null;
    const relire = r.resultat.motif === 'litige_ou_escalade';
    if (!relire && r.resultat.a_relancer !== true) return null;
    return { outil: 'relancer_facture', etape: 'relance-p' + r.resultat.palier + (relire ? '-a-relire' : ''), escalade: relire, objet_type: 'facture', objet_id: d.f.facture_id, type_action: 'relance_impaye', palier: r.resultat.palier, relire: relire }; }
  return null;
};
// Les faits d'une relance, tels que la base les a rendus : la rédaction et la porte les relisent, rien n'est recalculé.
const faitsDe = (d, p) => ({ type_relance: 'relance_facture', palier: p.palier, numero: d.row.numero, objet: typeof d.row.objet === 'string' ? d.row.objet : null, montant_ttc_centimes: d.row.total_ttc_centimes, montant_ht_centimes: null, echeance_le: d.row.date_echeance, emis_le: null, regime_tva: d.row.regime_tva });
`

export const FACT = (k) => ({
  'Préparer la relance': String.raw`// Facturation (B7) : la relance d'impayé suit son calendrier (J+3, J+10, J+21, opt-in) JUSQU'AU PAIEMENT OU AU MOTIF rangé d'un geste, jamais jusqu'au
// silence. Seule une facture ÉMISE, non payée, non annulée, sans avoir, aux relances activées et SANS arrêt motivé arrive à lib-relancer. Un paiement
// (statut payée) ou un arrêt avec motif ne passe pas : il devient un arrêt journalisé ou une carte de motif. Aucune date n'est calculée ici.
` + communFact(k) + String.raw`const s = [];
for (const d of DOSSIERS) { if (d.etat !== 'a_relancer') continue;
  const c = d.c, r = d.row;
  s.push({ json: env(ENVB[d.org], 'lib-relancer@1', 'r:' + d.ev.id, { paliers_jours: c.relances_impayes.jours, jours_permis: c.horaires.jours_permis, heures_permises: c.horaires.heures_permises, sauf: 'impayes' },
    { objet_type: 'facture', objet_id: d.f.facture_id, depuis_le: r.date_echeance + 'T00:00:00.000Z', historique: r.historique, paliers_envoyes: Array.isArray(r.paliers_envoyes) ? r.paliers_envoyes : [], stop: false, escalade: typeof r.contestation === 'boolean' ? r.contestation : null, maintenant: c.maintenant }) }); }
return s.length ? s : VIDE;`,
  'Préparer la décision': String.raw`// Facturation (A14) : chantier terminé → « facture prête » (aperçu rendu par le code de l'application, simulerFacture) ; l'ÉMISSION reste un clic de l'artisan
// (creer_facture est dans OUTILS_JAMAIS_AUTO : une carte, en Studio comme en Signature) = l'étape « Ask you » ; relance due → relance_impaye ; arrêt motivé →
// carte de motif. lib-decider décide : carte ou ligne du pilote (relance seulement), jamais l'émission ni l'encaissement. L'envoi d'une facture déjà émise
// n'est pas porté ici : la porte exige un texte et lib-rediger-message@1 ne rédige que des relances (écart écrit dans la preuve).
` + communFact(k) + String.raw`const s = [];
for (const d of DOSSIERS) { const p = plan(d); if (!p) continue;
  const c = d.c;
  s.push({ json: env(ENVB[d.org], 'lib-decider@1', 'd:' + d.ev.id, { autonomie: { niveau_max: niveauMax(c, p.outil), niveau_defaut: 2, niveaux: {} }, plan: c.offre, pilote: c.pilote, parties_depuis_24h: c.parties_depuis_24h },
    { objet_type: p.objet_type, objet_id: p.objet_id, constat: { outil: p.outil, etape: p.etape, escalade: p.escalade } }) }); }
return s.length ? s : VIDE;`,
  'Préparer la rédaction': String.raw`// Facturation : le texte d'une relance est écrit par lib-rediger-message (modèle ÉPINGLÉ en simulation, jamais appelé), à partir des seuls faits rendus par la base :
// le montant est un fait (centimes entiers produits par le code), le modèle le recopie, et la porte refuse tout montant qui n'est pas ce fait. La mention d'IA
// n'est demandée que si la relance partirait sans relecture (ligne du pilote).
` + communFact(k) + String.raw`const dec = parCle('Appeler lib-decider', 'lib-decider@1');
const s = [];
for (const d of DOSSIERS) { const p = plan(d), r = dec['d:' + d.ev.id]; if (!p || p.type_action !== 'relance_impaye' || !bon(r) || r.resultat.action === 'rien') continue;
  const c = d.c;
  s.push({ json: env(ENVB[d.org], 'lib-rediger-message@1', 'm:' + d.ev.id, { canal: 'email', ton: c.ton, signature: c.signature, nom_artisan: c.nom_artisan, mention_ia: r.resultat.action === 'pilote' }, { action_cle: r.resultat.cle_idempotence, faits: faitsDe(d, p) }) }); }
return s.length ? s : VIDE;`,
  'Préparer la porte': String.raw`// Facturation : la porte de conformité (veto) avant TOUT effet. Une carte ou un arrêt n'a pas de texte (message nul) ; une relance porte le brouillon rendu par la
// rédaction, avec les mêmes faits : tout montant ou date du texte doit y être, sinon la porte refuse.
` + communFact(k) + String.raw`const dec = parCle('Appeler lib-decider', 'lib-decider@1'), red = {};
for (const b of sorties('Appeler lib-rediger-message')) if (b && b.statut === 'ok' && b.resultat) red[b.resultat.action_cle] = b.resultat;
const s = [];
for (const d of DOSSIERS) { const p = plan(d), r = dec['d:' + d.ev.id]; if (!p || !bon(r) || r.resultat.action === 'rien') continue;
  const c = d.c, cible = r.resultat.action === 'pilote' ? 'pilote' : 'carte', b = red[r.resultat.cle_idempotence];
  if (p.type_action === 'relance_impaye' && !b) continue;
  const donnees = { action: { type_action: r.resultat.type_action, outil: p.outil, prix_sources: true, cible: cible, sans_relecture: cible === 'pilote' }, message: p.type_action === 'relance_impaye' ? { canal: b.canal, objet: b.objet, texte: b.texte } : null,
    destinataire: { opposition: false, consentement_sms: null, escalade: false }, maintenant: c.maintenant, compteurs: { envoyes_aujourdhui: c.parties_depuis_24h } };
  if (p.type_action === 'relance_impaye') donnees.faits = faitsDe(d, p);
  s.push({ json: env(ENVB[d.org], 'lib-porte-conformite@1', 'p:' + d.ev.id, { jamais_auto: [], regles_metier: { fournisseurs: [], mots_escalade_artisan: c.mots_escalade_artisan, jours_permis: c.horaires.jours_permis, heures_permises: c.horaires.heures_permises }, plafond_jour: c.plafond_jour }, donnees) }); }
return s.length ? s : VIDE;`,
  "Préparer l'exécution": String.raw`// Facturation : SEUL ce que la porte laisse passer va à lib-executer (interrupteurs relus juste avant l'effet, clés déjà en base). Une facture, une étape, une clé.
` + communFact(k) + String.raw`const dec = parCle('Appeler lib-decider', 'lib-decider@1'), pin = parCle('Préparer la porte', 'lib-porte-conformite@1');
const s = [];
for (const q of sorties('Appeler lib-porte-conformite')) { if (!q || q.contrat !== 'lib-porte-conformite@1' || !q.resultat || q.resultat.verdict !== 'passe') continue;
  const id = q.cle_idempotence.slice(2), d = PAR_EV[id], r = dec['d:' + id], p = d ? plan(d) : null; if (!d || !p || !bon(r)) continue;
  const c = d.c, charge = { type_action: r.resultat.type_action, objet_type: p.objet_type, objet_id: p.objet_id }; if (p.palier) charge.palier = p.palier;
  const m = pin['p:' + id] ? pin['p:' + id].donnees.message : null; if (m) { charge.canal = m.canal; charge.brouillon = { objet: m.objet, texte: m.texte }; }
  s.push({ json: env(ENVB[d.org], 'lib-executer@1', r.resultat.cle_idempotence, { niveau_max: niveauMax(c, p.outil) }, { verdict: 'passe', cible: q.resultat.cible, cle_idempotence: r.resultat.cle_idempotence, charge: charge,
    interrupteurs: { general: c.interrupteur_general, agent: c.interrupteur_departement }, cles_existantes: c.cles_existantes }) }); }
return s.length ? s : VIDE;`,
  'Préparer le journal': String.raw`// Facturation : le journal (lib-journaliser), une enveloppe par compte : des identifiants, des états et des décisions, jamais un nom, un contact, un texte ni un montant.
` + communFact(k) + String.raw`const dec = parCle('Appeler lib-decider', 'lib-decider@1'), po = parCle('Appeler lib-porte-conformite', 'lib-porte-conformite@1'), ex = parCle('Appeler lib-executer', 'lib-executer@1');
const s = [];
for (const e of ENVS) { const L = [];
  const ligne = (evenement, ref, decision) => L.push({ evenement: evenement, agent: 'presti-dep-facturation', objet_ref: ref, decision: String(decision).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: e.simulation });
  for (const x of REJETS) if (x.org === e.organisation_id) ligne('evenement_rejete', x.id, x.motif);
  for (const d of DOSSIERS) { if (d.org !== e.organisation_id) continue;
    if (d.etat === 'payee') { ligne('relance_arretee_paiement', d.ev.id, 'facture payée : plus aucune relance'); continue; }
    if (estMotif(d)) ligne('relance_arretee_motif', d.ev.id, 'arrêt motivé (' + motifDe(d) + ') : plus de relance, une carte pour l artisan');
    const p = plan(d); if (!p) { if (!estMotif(d)) ligne('facturation_non_traitee', d.ev.id, d.etat === 'a_relancer' ? 'aucune relance due' : d.etat); continue; }
    const r = dec['d:' + d.ev.id]; if (!bon(r)) { ligne('decision_en_echec', d.ev.id, 'lib-decider n a pas répondu'); continue; }
    ligne('decision', d.ev.id, p.type_action + ' : ' + r.resultat.action + ' (' + r.resultat.motif + ')');
    const q = po['p:' + d.ev.id]; if (q && q.resultat) ligne(q.resultat.verdict === 'passe' ? 'porte_passe' : 'porte_refuse', d.ev.id, q.resultat.verdict + (q.resultat.motifs.length ? ' (' + q.resultat.motifs.join(', ') + ')' : ''));
    const x = ex[r.resultat.cle_idempotence]; if (x && x.resultat) ligne(x.resultat.deja_fait ? 'deja_traite' : 'action_prevue', d.ev.id, x.resultat.deja_fait ? 'déjà fait : rien de refait' : (x.resultat.motif || 'prévue (simulation)')); }
  s.push({ json: env(e, 'lib-journaliser@1', 'j:' + e.cle_idempotence, {}, { entrees: L.slice(0, 200) }) }); }
return s.length ? s : VIDE;`,
  Assembler: String.raw`// Facturation : la sortie, une par compte. « Facture prête » = l'aperçu tel que l'application l'a rendu (type, total affiché, factures déduites) et la question à
// l'artisan : rien n'est émis ici, n8n n'émet aucune facture, ne marque aucun paiement, ne calcule aucun montant. Les montants sont recopiés des lectures.
// Les effets prévus viennent de lib-executer. Contrôle final : aucun geste de OUTILS_JAMAIS_AUTO ne peut être une ligne du pilote.
` + communFact(k) + String.raw`const po = parCle('Appeler lib-porte-conformite', 'lib-porte-conformite@1'), dec = parCle('Appeler lib-decider', 'lib-decider@1'), ex = parCle('Appeler lib-executer', 'lib-executer@1'), jr = parCle('Appeler lib-journaliser', 'lib-journaliser@1'), red = {};
for (const b of sorties('Appeler lib-rediger-message')) if (b && b.statut === 'ok' && b.resultat) red[b.resultat.action_cle] = b.resultat;
const communes = [];
for (const nom of ['Appeler lib-relancer', 'Appeler lib-decider', 'Appeler lib-rediger-message', 'Appeler lib-porte-conformite', 'Appeler lib-executer', 'Appeler lib-journaliser']) for (const x of sorties(nom)) if (!x || typeof x.contrat !== 'string') communes.push(nom + ' : appel en échec');
return ENVS.map((e) => {
  const erreurs = communes.slice(), effets = [];
  const r0 = { evenements_recus: e.nb, rejets: [], non_traites: [], factures_a_emettre: [], relances: [], relances_arretees: [], cartes_motif: [], cartes: [], pilote: [], refus_porte: [], deja_faits: [], sorties_vers_un_modele: 0 };
  for (const x of REJETS) if (x.org === e.organisation_id) r0.rejets.push({ id: x.id, motif: x.motif });
  for (const d of DOSSIERS) { if (d.org !== e.organisation_id) continue;
    if (d.etat === 'payee') { r0.relances_arretees.push({ facture_id: d.f.facture_id, raison: 'paiement' }); continue; }
    const p = plan(d);
    if (!p) { r0.non_traites.push({ ref: d.ev.id, raison: d.etat === 'a_relancer' ? 'aucune_relance_due' : d.etat }); continue; }
    if (estMotif(d)) r0.relances_arretees.push({ facture_id: d.f.facture_id, raison: 'motif_' + motifDe(d) });
    const r = dec['d:' + d.ev.id], q = po['p:' + d.ev.id];
    if (!bon(r)) { erreurs.push('lib-decider : ' + (r ? r.statut : 'absent')); continue; }
    if (r.resultat.action === 'rien') { r0.non_traites.push({ ref: d.ev.id, raison: r.resultat.motif }); continue; }
    if (q && q.resultat && q.resultat.verdict !== 'passe') r0.refus_porte.push({ ref: d.ev.id, motifs: q.resultat.motifs, repli: q.resultat.repli });
    const x = ex[r.resultat.cle_idempotence]; let cible = null;
    if (x && x.resultat) { if (Array.isArray(x.effets_prevus)) for (const y of x.effets_prevus) effets.push(y);
      if (x.resultat.deja_fait) r0.deja_faits.push(r.resultat.cle_idempotence);
      else if (x.statut === 'ok' && x.resultat.prevu && q && q.resultat) { cible = q.resultat.cible; (cible === 'pilote' ? r0.pilote : r0.cartes).push(r.resultat.cle_idempotence); }
      if (x.statut !== 'ok' && !x.resultat.deja_fait) erreurs.push('lib-executer : ' + (x.resultat.motif || x.statut)); }
    if (!cible) continue;
    if (cible === 'pilote' && (JAMAIS.includes(p.outil) || p.type_action !== 'relance_impaye')) { erreurs.push('geste non permis dans le pilote : ' + p.outil); continue; }
    const cle = r.resultat.cle_idempotence;
    if (d.kind === 'emettre') r0.factures_a_emettre.push({ cle: cle, devis_id: d.f.devis_id, question: 'Émettre cette facture ?', type: d.row.apercu_type, total_ttc_affiche: d.row.apercu_total_ttc_affiche, nb_deduites: d.row.apercu_nb_deduites, apercu_le: d.row.apercu_le, cible: cible, emission: 'au clic de l artisan' });
    else if (estMotif(d)) r0.cartes_motif.push({ cle: cle, facture_id: d.f.facture_id, motif: motifDe(d), geste: p.outil });
    else { const b = red[cle]; r0.relances.push({ cle: cle, facture_id: d.f.facture_id, numero: d.row.numero, palier: p.palier, total_ttc_affiche: d.row.total_ttc_affiche, cible: cible, part_seul: cible === 'pilote', a_relire: p.relire === true, brouillon: b ? { objet: b.objet, texte: b.texte } : null }); } }
  const j = jr['j:' + e.cle_idempotence]; if (j && Array.isArray(j.effets_prevus)) for (const y of j.effets_prevus) effets.push(y);
  const statut = erreurs.length ? 'erreur' : e.nb ? 'ok' : 'rien_a_faire';
  return { json: { enveloppe: e, statut: statut, resultat: r0, effets_prevus: effets.slice(0, 1000), effets_faits: [], journal: j && Array.isArray(j.journal) ? j.journal : [], erreurs: erreurs.slice(0, 20) } };
});`,
})
export const ETAPES_FACT = [
  ['Préparer la relance', 'Aucune relance à décider ?', 'lib-relancer'],
  ['Préparer la décision', 'Rien à décider ?', 'lib-decider'],
  ['Préparer la rédaction', 'Rien à rédiger ?', 'lib-rediger-message'],
  ['Préparer la porte', 'Rien à contrôler ?', 'lib-porte-conformite'],
  ["Préparer l'exécution", 'Rien à exécuter ?', 'lib-executer'],
]
