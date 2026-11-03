// 036-018 — le code des nœuds Code des cinq gabarits `gabarit-ent-*` de la seconde moitié (opérations, administratif, finance, après-vente, direction).
// RÈGLES (les mêmes que 036-016) : « le code calcule, n8n route ». Aucun montant, aucune date, aucun score, aucun créneau ne vient du modèle : le modèle remplit
// un schéma strict (des numéros choisis dans une liste du code, des phrases sans chiffre), un nœud Code le revalide (R18) puis calcule. Aucun module, aucun réseau,
// aucun environnement dans un nœud Code (R19). Aucune adresse e-mail écrite en dur (R8) : on l'assemble à l'exécution. Exemple. Toutes les données ci-dessous sont fictives.
import { IDENTITE, GARDE_TEXTE, DECIDER_DEBUT } from './base-codes.mjs'

// ─── Fragments communs ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Dates : tout se compte en heure de Paris (fuseau du workflow), sans dépendre de la machine.
export const DATES = String.raw`const naif = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T'); };
const minutes = (n) => Date.parse(n + 'Z') / 60000;
const jourDe = (n) => String(n).slice(0, 10);
const ajouterJours = (j, k) => new Date(Date.parse(j + 'T00:00:00Z') + k * 86400000).toISOString().slice(0, 10);
const joursEntre = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const aujourdhui = jourDe(naif(new Date().toISOString()));
const eur = (c) => (Number.isInteger(c) ? (c / 100).toFixed(2).replace('.', ',') : null);
`

// Une carte « information » : rien à exécuter (la relève ne reprend que les cartes approuvées), l'équipe est seulement informée d'un cas qu'aucun automatisme ne règle.
export const INFO = String.raw`const info = (base, type, resume) => {
  const p = coupe(config.perimetres?.[type] ?? 'direction', 40);
  plan.push({ json: { effet: 'carte', type_action: type, mode: 'information', statut_carte: 'information', pour_effet: 'aucun', organisation_id: org, entreprise, cle_idempotence: base + ':' + type + ':info:carte', perimetre: p,
    approbateurs_roles: Array.isArray(config.approbateurs?.[p]) ? config.approbateurs[p] : ['gerant'], canal_equipe: coupe(config.canaux_validation?.[p], 80), resume: coupe(resume, 300), charge: { effet: 'aucun' } } });
};
`

// Le message qui prévient l'équipe : une seule fois par passage, seulement si un canal d'équipe est configuré.
const PREVENIR = String.raw`const attentes = plan.filter((p) => p.json.effet === 'carte' && p.json.statut_carte === 'a_valider').length;
if (['slack', 'teams'].includes(config.outil_equipe) && (attentes > 0 || ALERTES.length) && PREMIERE) poser('prevenir_' + config.outil_equipe, 'prevenir_equipe', 'lot:' + PREMIERE, { texte: (attentes ? attentes + ' action(s) attendent une validation dans la plateforme. ' : '') + ALERTES.join(' ; '), canal_equipe: coupe(config.canal_alertes, 80), resume: 'Prévenir l’équipe' });
return plan;
`
const prevenir = (alertes, premiere) => PREVENIR.replace(/ALERTES/g, alertes).replace(/PREMIERE/g, premiere)

// La validation d'équipe : une demande Slack ou Teams par carte « À valider » (le bon canal du périmètre, C6).
const VALIDATIONS = String.raw`for (const c of plan.filter((p) => p.json.effet === 'carte' && p.json.statut_carte === 'a_valider')) {
  if (!['slack', 'teams'].includes(config.outil_equipe)) continue;
  plan.push({ json: { effet: 'valider_' + config.outil_equipe, type_action: 'validation_equipe', mode: 'auto', organisation_id: org, entreprise, cle_idempotence: c.json.cle_idempotence + ':equipe', carte_a_valider: c.json.cle_idempotence, texte: c.json.resume, perimetre: c.json.perimetre, canal_equipe: c.json.canal_equipe, approbateurs_roles: c.json.approbateurs_roles } });
}
`

// Le simulateur rejoue le même corps de décision que le réel, sur un enregistrement daté (jamais un appel au modèle).
const SIMULER = (corps) => String.raw`const SIM = (() => { ` + corps + String.raw` })();
return SIM.map((p) => ({ json: { ...p.json, simulation: true, effets_faits: [] } }));
`

// ═════════════════════════════════════════════ gabarit-ent-operations ═══════════════════════════════════════════════════════════
export const OPS_EXEMPLE = String.raw`// Exemple. Entrées fictives de la branche « simulation » : un chantier à planifier, un créneau déjà pris demain matin, une ligne à importer.
const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
return [
  { json: { source: 'exemple', genre: 'chantier', ref: 'exemple-chantier-001', libelle: 'Exemple. Chantier A', duree_min: 120, competence: 'general' } },
  { json: { source: 'exemple', genre: 'evenement', ref: 'exemple-evt-001', membre_ref: 'membre-1', debut: demain + 'T06:00:00Z', fin: demain + 'T08:00:00Z' } },
  { json: { source: 'exemple', genre: 'ligne_import', ref: 'exemple-ligne-001', libelle: 'Exemple. Pièce de rechange', quantite: 3 } },
];
`

export const OPS_NORMALISER = IDENTITE + DATES + String.raw`const org = $('Réglages de la copie (relève)').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const iso = (o) => (o && o.dateTime ? (o.timeZone === 'UTC' && !/Z$/.test(o.dateTime) ? o.dateTime + 'Z' : o.dateTime) : (o && o.date ? o.date + 'T00:00:00' : null));
const rendu = [];
for (const it of $input.all()) {
  const e = it.json;
  let r = null;
  switch (e.source) {
    case 'google_agenda': r = { genre: 'evenement', ref: e.id, membre_ref: 'equipe', debut: iso(e.start), fin: iso(e.end) }; break;
    case 'outlook_agenda': r = { genre: 'evenement', ref: e.id, membre_ref: 'equipe', debut: iso(e.start), fin: iso(e.end) }; break;
    case 'clickup': r = { genre: 'tache', ref: e.id, libelle: e.name }; break;
    case 'monday': r = { genre: 'tache', ref: e.id, libelle: e.name }; break;
    case 'notion': r = { genre: 'tache', ref: e.id, libelle: e.name ?? e.properties?.Name?.title?.[0]?.plain_text }; break;
    case 'sheets': case 'excel': r = { genre: 'ligne_import', ref: e.ref ?? e.Ref ?? e.Reference, libelle: e.libelle ?? e.Libelle, quantite: Number(e.quantite ?? e.Quantite) }; break;
    case 'plateforme': if (mien(e) && e.chantier_ref) r = { genre: 'chantier', ref: e.chantier_ref, libelle: e.libelle_court, duree_min: Number(e.duree_min), competence: e.competence }; break;
    case 'exemple': r = e; break;
    default: r = null;
  }
  if (!r || !r.ref) continue;
  const cle = propre(r.genre + ':' + r.ref);
  if (r.genre === 'evenement') {
    const a = r.debut ? naif(r.debut) : null, b = r.fin ? naif(r.fin) : null;
    if (!a || !b) continue;
    rendu.push({ json: { genre: 'evenement', cle_idempotence: cle, ref: String(r.ref), membre_ref: propre(r.membre_ref ?? 'equipe'), debut: a, fin: b } });
  } else if (r.genre === 'tache') {
    rendu.push({ json: { genre: 'tache', cle_idempotence: cle, ref: String(r.ref), libelle: coupe(r.libelle, 160) } });
  } else if (r.genre === 'chantier') {
    const duree = Math.floor(Number(r.duree_min));
    if (!Number.isFinite(duree) || duree < 30 || duree > 600) continue;
    rendu.push({ json: { genre: 'chantier', cle_idempotence: cle, ref: String(r.ref), libelle: coupe(r.libelle, 120), duree_min: duree - (duree % 30) + (duree % 30 ? 30 : 0), competence: propre(r.competence ?? 'general') } });
  } else if (r.genre === 'ligne_import') {
    // Le circuit contrôlé : la ligne est vérifiée ICI ; une anomalie ne s'importe jamais, elle prévient l'équipe.
    const anomalies = [];
    const q = Number(r.quantite);
    if (!r.libelle || String(r.libelle).length > 120) anomalies.push('libellé absent ou trop long');
    if (!Number.isInteger(q) || q < 0 || q > 100000) anomalies.push('quantité hors limites');
    if (String(r.ref).length > 60) anomalies.push('référence trop longue');
    rendu.push({ json: { genre: 'ligne_import', cle_idempotence: cle, ref: coupe(r.ref, 60), libelle: coupe(r.libelle, 120), quantite: Number.isInteger(q) ? q : null, anomalies } });
  }
}
return rendu;
`

// Le CODE cherche les créneaux libres (heures de travail du client, dix jours, par membre) ; le modèle ne choisira qu'un NUMÉRO dans cette liste.
export const OPS_PREPARER = IDENTITE + DATES + String.raw`const org = $('Réglages de la copie').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const config = $('Lire la configuration').all().map((i) => i.json).find(mien) ?? {};
const h = config.horaires ?? {};
const debutH = Math.min(12, Math.max(6, Math.floor(Number(h.debut ?? 8))));
const finH = Math.min(20, Math.max(13, Math.floor(Number(h.fin ?? 18))));
const equipes = $('Lire les équipes').all().map((i) => i.json).filter((r) => mien(r) && r.membre_ref);
const entrees = $('Normaliser les entrées').all().map((i) => i.json);
const occ = entrees.filter((e) => e.genre === 'evenement').map((e) => ({ membre: e.membre_ref, a: minutes(e.debut), b: minutes(e.fin) }));
const creneau = (membre, duree) => {
  for (let k = 1; k <= 10; k++) {
    const j = ajouterJours(aujourdhui, k);
    const dow = new Date(j + 'T12:00:00Z').getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (let m = debutH * 60; m + duree <= finH * 60; m += 30) {
      const a = minutes(j + 'T00:00:00') + m, b = a + duree;
      if (occ.some((o) => (o.membre === membre || o.membre === 'equipe') && o.a < b && a < o.b)) continue;
      const fmt = (x) => new Date(x * 60000).toISOString().slice(0, 19);
      return { debut: fmt(a), fin: fmt(b) };
    }
  }
  return null;
};
const rendu = [];
for (const e of entrees) {
  if (e.genre === 'evenement') continue;
  if (e.genre !== 'chantier') { rendu.push({ json: e }); continue; }
  const propositions = [];
  for (const m of equipes) {
    if (propositions.length >= 3) break;
    if (e.competence !== 'general' && m.competence !== e.competence && m.competence !== 'general') continue;
    const c = creneau(propre(m.membre_ref), e.duree_min);
    if (c) propositions.push({ index: propositions.length, membre_ref: propre(m.membre_ref), membre_libelle: coupe(m.libelle_court, 60), debut: c.debut, fin: c.fin });
  }
  rendu.push({ json: { ...e, propositions } });
}
return rendu;
`

export const OPS_REVALIDER = GARDE_TEXTE + String.raw`const entrees = $('Chantiers à répartir').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  if (!Number.isInteger(s.proposition) || s.proposition < 0 || s.proposition >= e.propositions.length) throw new Error('proposition hors de la liste du code');
  return { json: { cle_idempotence: e.cle_idempotence, proposition: s.proposition, motif: verifierTexte(s.motif, 200) } };
});
`

const OPS_CORPS = String.raw`const items = ITEMS;
const choix = CHOIX;
const taches = new Set($('Normaliser les entrées').all().map((i) => i.json).filter((e) => e.genre === 'tache').map((e) => String(e.libelle ?? '').trim().toLowerCase()));
const agenda = ['google', 'outlook'].includes(config.outil_agenda) ? config.outil_agenda : 'aucun';
const projets = ['clickup', 'monday', 'notion'].includes(config.outil_projets) ? config.outil_projets : 'aucun';
const dossiers = ['drive', 'onedrive'].includes(config.outil_dossiers) ? config.outil_dossiers : 'aucun';
const reserves = [];
const alertes = [];
for (const it of items) {
  const base = it.cle_idempotence;
  if (it.genre === 'chantier') {
    if (!it.propositions.length) { alertes.push(it.libelle + ' : aucun créneau libre dans les dix jours.'); info(base, 'planifier_chantier', 'Aucun créneau libre dans les dix jours : ' + it.libelle); continue; }
    const i = it.propositions.length === 1 ? 0 : choix.get(base)?.proposition;
    if (!Number.isInteger(i)) continue;
    const p = it.propositions[i];
    const a = minutes(p.debut), b = minutes(p.fin);
    if (reserves.some((r) => r.membre === p.membre_ref && r.a < b && a < r.b)) { info(base, 'planifier_chantier', 'Conflit de créneau avec un autre chantier du même passage : ' + it.libelle); continue; }
    reserves.push({ membre: p.membre_ref, a, b });
    const commun = { agenda_id: config.agenda_id, libelle: it.libelle, debut: p.debut, fin: p.fin, membre_ref: p.membre_ref, membre_libelle: p.membre_libelle };
    if (agenda !== 'aucun') poser('planifier_' + agenda, 'planifier_chantier', base, { ...commun, resume: 'Planifier ' + it.libelle + ' avec ' + p.membre_libelle + ' le ' + p.debut.replace('T', ' à ').slice(0, 16) });
    if (projets !== 'aucun' && !taches.has(String(it.libelle).trim().toLowerCase())) poser('tache_' + projets, 'creer_tache_projet', base, { ...commun, echeance: p.fin.slice(0, 10), resume: 'Tâche de projet : ' + it.libelle });
    if (dossiers !== 'aucun') poser('dossier_' + dossiers, 'creer_dossier', base, { dossier: coupe(it.libelle, 80), resume: 'Dossier du chantier : ' + it.libelle });
  } else if (it.genre === 'ligne_import') {
    if (it.anomalies.length) { alertes.push('Ligne ' + it.ref + ' refusée à l’import : ' + it.anomalies.join(', ') + '.'); info(base, 'import_ligne', 'Ligne refusée à l’import, motif : ' + it.anomalies.join(', ') + ' — ' + it.ref); continue; }
    poser('import_ligne', 'import_ligne', base, { ref: it.ref, libelle: it.libelle, quantite: it.quantite, resume: 'Importer la ligne ' + it.ref });
  }
}
`
const lierOps = (items, choix) => OPS_CORPS.replace('ITEMS', items).replace('CHOIX', choix) + prevenir('alertes', 'items[0]?.cle_idempotence')
const OPS_DEFAUTS = { creer_dossier: 3, prevenir_equipe: 3 }
export const OPS_DECIDER = IDENTITE + DATES + DECIDER_DEBUT(OPS_DEFAUTS) + INFO + lierOps(
  "$('Préparer le planning').all().map((i) => i.json)",
  "new Map(($('Revalider le répartiteur').isExecuted ? $('Revalider le répartiteur').all() : []).map((i) => [i.json.cle_idempotence, i.json]))")
export const OPS_PREVUS = IDENTITE + DATES + DECIDER_DEBUT(OPS_DEFAUTS) + INFO + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : le répartiteur aurait choisi la première proposition du code.
const itemsS = $('Préparer le planning').all().map((i) => i.json);
const choixS = new Map(itemsS.filter((e) => e.genre === 'chantier' && e.propositions.length > 1).map((e) => [e.cle_idempotence, { proposition: 0, motif: 'Exemple. Première proposition.' }]));
` + SIMULER(lierOps('itemsS', 'choixS'))

// ═════════════════════════════════════════════ gabarit-ent-administratif ═══════════════════════════════════════════════════════
export const ADM_EXEMPLE = String.raw`// Exemple. Entrées fictives de la branche « simulation » : une pièce attendue (jamais reçue), une attestation qui expire dans dix jours, une attestation à rédiger.
const ARO = String.fromCharCode(64);
const dans = (k) => new Date(Date.now() + k * 86400000).toISOString().slice(0, 10);
return [
  { json: { source: 'exemple', genre: 'piece', ref: 'exemple-piece-kbis', libelle: 'Exemple. Extrait d’immatriculation', tiers_courriel: 'tiers' + ARO + 'exemple.invalid' } },
  { json: { source: 'exemple', genre: 'echeance', ref: 'exemple-attestation-assurance', libelle: 'Exemple. Attestation d’assurance', type_echeance: 'attestation', date_echeance: dans(10), tiers_courriel: 'assureur' + ARO + 'exemple.invalid' } },
  { json: { source: 'exemple', genre: 'attestation', ref: 'exemple-attestation-001', libelle: 'Exemple. Attestation de présence', faits: { beneficiaire: 'Exemple. Personne A', date_debut: '2026-10-01', date_fin: '2026-10-31' } } },
];
`

export const ADM_NORMALISER = IDENTITE + DATES + String.raw`const org = $('Réglages de la copie (relève)').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const bas = (s) => String(s ?? '').toLowerCase();
const rendu = [];
for (const it of $input.all()) {
  const e = it.json;
  switch (e.source) {
    case 'plateforme_piece': if (mien(e) && e.piece_ref) rendu.push({ json: { genre: 'piece', cle_idempotence: propre('piece:' + e.piece_ref), ref: String(e.piece_ref), libelle: coupe(e.libelle_court, 120), tiers_courriel: e.tiers_courriel || null } }); break;
    case 'plateforme_echeance': if (mien(e) && e.echeance_ref && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date_echeance))) rendu.push({ json: { genre: 'echeance', cle_idempotence: propre('echeance:' + e.echeance_ref), ref: String(e.echeance_ref), libelle: coupe(e.libelle_court, 120), type_echeance: propre(e.type_echeance ?? 'autre'), date_echeance: String(e.date_echeance), tiers_courriel: e.tiers_courriel || null } }); break;
    case 'plateforme_attestation': if (mien(e) && e.attestation_ref) rendu.push({ json: { genre: 'attestation', cle_idempotence: propre('attestation:' + e.attestation_ref), ref: String(e.attestation_ref), libelle: coupe(e.libelle_court, 120), faits: e.faits_cles && typeof e.faits_cles === 'object' ? e.faits_cles : {} } }); break;
    case 'drive': case 'onedrive': rendu.push({ json: { genre: 'fichier', cle_idempotence: propre('fichier:' + (e.id ?? e.name)), texte_cle: bas(e.name) } }); break;
    case 'gmail': rendu.push({ json: { genre: 'courrier', cle_idempotence: propre('courrier:' + e.id), texte_cle: bas((e.Subject ?? e.subject ?? '') + ' ' + (e.snippet ?? '')) } }); break;
    case 'outlook': rendu.push({ json: { genre: 'courrier', cle_idempotence: propre('courrier:' + e.id), texte_cle: bas((e.subject ?? '') + ' ' + (e.bodyPreview ?? '')) } }); break;
    case 'agenda': rendu.push({ json: { genre: 'agenda', cle_idempotence: propre('agenda:' + e.id), texte_cle: bas(e.summary ?? e.subject) } }); break;
    case 'exemple': { const x = e; if (x.genre === 'attestation') rendu.push({ json: { genre: 'attestation', cle_idempotence: propre('attestation:' + x.ref), ref: x.ref, libelle: x.libelle, faits: x.faits } }); else rendu.push({ json: { genre: x.genre, cle_idempotence: propre(x.genre + ':' + x.ref), ref: x.ref, libelle: x.libelle, type_echeance: x.type_echeance, date_echeance: x.date_echeance, tiers_courriel: x.tiers_courriel || null } }); break; }
    default: break;
  }
}
return rendu;
`

// Croiser les sources : une pièce est « présente » si sa référence se lit dans un nom de fichier (Drive, OneDrive) ou dans un courrier (Gmail, Outlook).
export const ADM_CROISER = IDENTITE + DATES + String.raw`const org = $('Réglages de la copie').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const config = $('Lire la configuration').all().map((i) => i.json).find(mien) ?? {};
const entrees = $('Normaliser les entrées').all().map((i) => i.json);
const relances = $('Lire les relances faites').all().map((i) => i.json).filter((r) => mien(r) && r.objet_ref);
const fenetre = Math.max(1, Math.floor(Number(config.jours_echeance ?? 30)));
const presents = entrees.filter((e) => e.genre === 'fichier' || e.genre === 'courrier').map((e) => e.texte_cle);
const agenda = entrees.filter((e) => e.genre === 'agenda').map((e) => e.texte_cle);
const nbDe = (ref) => relances.filter((r) => r.objet_ref === ref).length;
const derniere = (ref) => relances.filter((r) => r.objet_ref === ref).map((r) => String(r.envoyee_le).slice(0, 10)).sort().pop() ?? null;
const due = (ref) => nbDe(ref) < 3 && (derniere(ref) === null || joursEntre(derniere(ref), aujourdhui) >= 3);
const rendu = [];
for (const e of entrees) {
  if (e.genre === 'piece') {
    const manquante = !presents.some((t) => t.includes(String(e.ref).toLowerCase()));
    rendu.push({ json: { ...e, manquante, nb_relances: nbDe(e.ref), palier: nbDe(e.ref) + 1, relance_due: manquante && due(e.ref) } });
  } else if (e.genre === 'echeance') {
    const jours = joursEntre(aujourdhui, e.date_echeance);
    const proche = jours <= fenetre;
    rendu.push({ json: { ...e, jours, proche, expiree: jours < 0, agenda_existe: agenda.some((t) => t.includes(String(e.ref).toLowerCase())), nb_relances: nbDe(e.ref), palier: nbDe(e.ref) + 1, relance_due: proche && due(e.ref) } });
  } else if (e.genre === 'attestation') rendu.push({ json: e });
}
return rendu;
`

export const ADM_REV_RELANCE = GARDE_TEXTE + String.raw`const entrees = $('Relances à rédiger').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  return { json: { cle_idempotence: e.cle_idempotence, objet: verifierTexte(s.objet, 120), texte: verifierTexte(s.texte, 900) } };
});
`

// Une attestation ne dit que les faits du dossier : chaque fait y figure mot pour mot, et aucun nombre n'y paraît qui ne soit pas l'un des faits.
export const ADM_REV_ATTESTATION = GARDE_TEXTE + String.raw`const entrees = $('Attestations à rédiger').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  const corps = verifierTexte(s.corps, 2500);
  const faits = Object.values(e.faits ?? {}).map((v) => String(v));
  for (const f of faits) if (!corps.includes(f)) throw new Error('un fait du dossier manque dans l’attestation : ' + f.slice(0, 40));
  const permis = faits.join(' ');
  for (const n of (corps.match(/\d+/g) ?? [])) if (!permis.includes(n)) throw new Error('nombre inventé dans l’attestation : ' + n);
  return { json: { cle_idempotence: e.cle_idempotence, titre: verifierTexte(s.titre, 120), corps } };
});
`

const ADM_CORPS = String.raw`const croises = ITEMS;
const rel = RELS;
const att = ATTS;
const boite = config.boite_client === 'outlook' ? 'outlook' : 'gmail';
const agenda = ['google', 'outlook'].includes(config.outil_agenda) ? config.outil_agenda : 'aucun';
const alertes = [];
const relancer = (e, type, base) => {
  // Une relance ne part JAMAIS sans destinataire connu : sans lui, l'équipe est informée et rien n'est écrit à personne.
  if (!e.tiers_courriel) { alertes.push(e.libelle + ' : destinataire inconnu, relance impossible.'); info(base, 'relance_piece', 'Destinataire inconnu, à renseigner avant toute relance : ' + e.libelle); return; }
  const r = rel.get(e.cle_idempotence);
  if (!r) return;
  poser('relance_' + boite, 'relance_piece', e.cle_idempotence + ':n' + e.palier, { destinataire: e.tiers_courriel, objet_ref: e.ref, type_objet: type, palier: e.palier, objet: r.objet, texte: r.texte, resume: 'Relance n° ' + e.palier + ' : ' + e.libelle });
};
for (const e of croises) {
  const base = e.cle_idempotence;
  if (e.genre === 'piece') {
    if (e.manquante && e.relance_due) relancer(e, 'piece', base);
  } else if (e.genre === 'echeance') {
    if (!e.proche) continue;
    if (!e.agenda_existe && agenda !== 'aucun') poser('echeance_agenda_' + agenda, 'echeance_agenda', base, { agenda_id: config.agenda_id, libelle: e.libelle, ref: e.ref, date: e.date_echeance, date_fin: ajouterJours(e.date_echeance, 1), resume: (e.expiree ? 'Échéance dépassée : ' : 'Échéance dans ' + e.jours + ' jour(s) : ') + e.libelle });
    if (e.relance_due) relancer(e, 'echeance', base);
  } else if (e.genre === 'attestation') {
    const a = att.get(base);
    if (a) poser('attestation_docs', 'attestation_docs', base, { titre: a.titre, corps: a.corps, resume: 'Attestation rédigée : ' + e.libelle });
  }
}
`
const lierAdm = (items, rels, atts) => ADM_CORPS.replace('ITEMS', items).replace('RELS', rels).replace('ATTS', atts) + prevenir('alertes', 'croises[0]?.cle_idempotence')
const ADM_DEFAUTS = { echeance_agenda: 3, attestation_docs: 3, prevenir_equipe: 3 }
export const ADM_DECIDER = IDENTITE + DATES + DECIDER_DEBUT(ADM_DEFAUTS) + INFO + lierAdm(
  "$('Croiser les sources').all().map((i) => i.json)",
  "new Map(($('Revalider les relances').isExecuted ? $('Revalider les relances').all() : []).map((i) => [i.json.cle_idempotence, i.json]))",
  "new Map(($('Revalider les attestations').isExecuted ? $('Revalider les attestations').all() : []).map((i) => [i.json.cle_idempotence, i.json]))")
export const ADM_PREVUS = IDENTITE + DATES + DECIDER_DEBUT(ADM_DEFAUTS) + INFO + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : ce que les deux rédacteurs auraient rendu.
const croisesS = $('Croiser les sources').all().map((i) => i.json);
const relsS = new Map(croisesS.filter((e) => e.relance_due).map((e) => [e.cle_idempotence, { objet: 'Exemple. Document attendu', texte: 'Exemple. Bonjour, pourriez-vous nous transmettre le document ?' }]));
const attsS = new Map(croisesS.filter((e) => e.genre === 'attestation').map((e) => [e.cle_idempotence, { titre: 'Exemple. Attestation', corps: 'Exemple. Attestation établie à partir des faits du dossier : ' + Object.values(e.faits ?? {}).join(', ') + '.' }]));
` + SIMULER(lierAdm('croisesS', 'relsS', 'attsS'))

// ═════════════════════════════════════════════ gabarit-ent-finance ═══════════════════════════════════════════════════════════════
export const FIN_EXEMPLE = String.raw`// Exemple. Entrées fictives de la branche « simulation » : une facture en retard, une facture déjà réglée (paiement lu), un chantier terminé à facturer.
const ARO = String.fromCharCode(64);
const dans = (k) => new Date(Date.now() + k * 86400000).toISOString().slice(0, 10);
return [
  { json: { source: 'exemple', genre: 'facture', facture_ref: 'exemple-F001', libelle: 'Exemple. Client A', total_ttc_centimes: 120000, echeance: dans(-10), statut: 'envoyee', tiers_courriel: 'client-a' + ARO + 'exemple.invalid' } },
  { json: { source: 'exemple', genre: 'facture', facture_ref: 'exemple-F002', libelle: 'Exemple. Client B', total_ttc_centimes: 60000, echeance: dans(-5), statut: 'envoyee', tiers_courriel: 'client-b' + ARO + 'exemple.invalid' } },
  { json: { source: 'exemple', genre: 'paiement', facture_ref: 'exemple-F002', montant_centimes: 60000, via: 'stripe' } },
  { json: { source: 'exemple', genre: 'chantier_termine', chantier_ref: 'exemple-chantier-9', libelle: 'Exemple. Chantier terminé', lignes: [{ ref_tarif: 'exemple-intervention', quantite: 2 }], tiers_courriel: 'client-c' + ARO + 'exemple.invalid' } },
];
`

export const FIN_NORMALISER = IDENTITE + DATES + String.raw`const org = $('Réglages de la copie (relève)').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const centimes = (v) => { const n = Math.round(Number(v) * 100); return Number.isFinite(n) ? n : null; };
const rendu = [];
const paiement = (p) => { if (Number.isInteger(p.montant_centimes) && p.montant_centimes > 0) rendu.push({ json: { genre: 'paiement', cle_idempotence: propre('paiement:' + p.via + ':' + (p.ref ?? p.facture_ref ?? p.reference_libre ?? rendu.length)), facture_ref: p.facture_ref ? String(p.facture_ref) : null, reference_libre: p.reference_libre ? String(p.reference_libre).toLowerCase() : null, montant_centimes: p.montant_centimes, via: p.via } }); };
for (const it of $input.all()) {
  const e = it.json;
  switch (e.source) {
    case 'stripe': if (e.paid === true && e.refunded !== true) paiement({ via: 'stripe', ref: e.id, facture_ref: e.metadata?.facture_ref, reference_libre: e.description, montant_centimes: Math.floor(Number(e.amount) - Number(e.amount_refunded || 0)) }); break;
    case 'quickbooks': if (Number(e.Balance) === 0 && e.DocNumber) paiement({ via: 'quickbooks', ref: e.Id, facture_ref: e.DocNumber, montant_centimes: centimes(e.TotalAmt) }); break;
    case 'xero': if (e.Status === 'PAID' && e.InvoiceNumber) paiement({ via: 'xero', ref: e.InvoiceID, facture_ref: e.InvoiceNumber, montant_centimes: centimes(e.AmountPaid) }); break;
    case 'qonto': for (const t of (e.transactions ?? [])) if (t.side === 'credit' && t.status === 'completed') paiement({ via: 'qonto', ref: t.transaction_id, reference_libre: (t.reference ?? '') + ' ' + (t.label ?? ''), montant_centimes: Math.floor(Number(t.amount_cents)) }); break;
    case 'pennylane': for (const f of (e.items ?? e.invoices ?? [])) if (f.invoice_number) rendu.push({ json: { genre: 'compta_facture', cle_idempotence: propre('compta:' + f.invoice_number), facture_ref: String(f.invoice_number) } }); break;
    case 'plateforme_facture': if (mien(e) && e.facture_ref) rendu.push({ json: { genre: 'facture', cle_idempotence: propre('facture:' + e.facture_ref), facture_ref: String(e.facture_ref), libelle: coupe(e.libelle_court, 120), total_ttc_centimes: Number.isInteger(e.total_ttc_centimes) ? e.total_ttc_centimes : null, echeance: /^\d{4}-\d{2}-\d{2}$/.test(String(e.echeance)) ? String(e.echeance) : null, statut: String(e.statut ?? ''), payee_le: e.payee_le ? String(e.payee_le).slice(0, 10) : null, tiers_courriel: e.tiers_courriel || null } }); break;
    case 'plateforme_chantier': if (mien(e) && e.chantier_ref && !e.facture_ref) rendu.push({ json: { genre: 'chantier_termine', cle_idempotence: propre('chantier:' + e.chantier_ref), chantier_ref: String(e.chantier_ref), libelle: coupe(e.libelle_court, 120), lignes: Array.isArray(e.lignes) ? e.lignes : [], tiers_courriel: e.tiers_courriel || null } }); break;
    case 'exemple': if (e.genre === 'paiement') paiement({ via: e.via, facture_ref: e.facture_ref, montant_centimes: e.montant_centimes }); else rendu.push({ json: { ...e, cle_idempotence: propre(e.genre + ':' + (e.facture_ref ?? e.chantier_ref)) } }); break;
    default: break;
  }
}
return rendu;
`

// Rapprocher : le CODE lit les paiements et dit, pour chaque facture, si elle est soldée ou en retard ; le CODE chiffre une facture à émettre avec le tarif du client.
export const FIN_RAPPROCHER = IDENTITE + DATES + String.raw`const org = $('Réglages de la copie').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const entrees = $('Normaliser les entrées').all().map((i) => i.json);
const tarif = new Map($('Lire les tarifs').all().map((i) => i.json).filter((t) => mien(t) && t.ref_tarif).map((t) => [t.ref_tarif, t]));
const relances = $('Lire les relances faites').all().map((i) => i.json).filter((r) => mien(r) && r.objet_ref);
const paiements = entrees.filter((e) => e.genre === 'paiement');
const nbDe = (ref) => relances.filter((r) => r.objet_ref === ref).length;
const derniere = (ref) => relances.filter((r) => r.objet_ref === ref).map((r) => String(r.envoyee_le).slice(0, 10)).sort().pop() ?? null;
const rendu = [];
for (const e of entrees) {
  if (e.genre === 'facture') {
    if (!['envoyee', 'relancee', 'partielle', 'payee'].includes(e.statut) || !Number.isInteger(e.total_ttc_centimes) || !e.echeance) continue;
    const ref = String(e.facture_ref).toLowerCase();
    const paye = paiements.filter((p) => (p.facture_ref && String(p.facture_ref).toLowerCase() === ref) || (p.reference_libre && p.reference_libre.includes(ref))).reduce((s, p) => s + p.montant_centimes, 0);
    const reste = e.total_ttc_centimes - paye;
    const retard = joursEntre(e.echeance, aujourdhui);
    const n = nbDe(e.facture_ref);
    const soldee = reste <= 0 || e.statut === 'payee';
    rendu.push({ json: { ...e, paye_centimes: paye, reste_centimes: Math.max(0, reste), etat: soldee ? 'soldee' : retard > 0 ? 'en_retard' : 'a_echoir', jours_retard: Math.max(0, retard), palier: retard >= 30 ? 3 : retard >= 15 ? 2 : 1, nb_relances: n, relance_due: !soldee && retard > 0 && n < 4 && (derniere(e.facture_ref) === null || joursEntre(derniere(e.facture_ref), aujourdhui) >= 7) && !!e.tiers_courriel } });
  } else if (e.genre === 'chantier_termine') {
    let ht = 0, tva = 0, estime = false;
    const lignes = (e.lignes ?? []).map((l) => {
      const t = tarif.get(l.ref_tarif);
      if (!t || !Number.isInteger(l.quantite) || l.quantite < 1 || l.quantite > 100000) { estime = true; return { ref_tarif: String(l.ref_tarif).slice(0, 40), quantite: l.quantite, ht_centimes: null }; }
      const h = Math.round(Number(t.prix_ht_centimes) * l.quantite);
      ht += h; tva += Math.round((h * Number(t.tva_pct)) / 100);
      return { ref_tarif: t.ref_tarif, quantite: l.quantite, designation: coupe(t.libelle_court, 160), ht_centimes: h };
    });
    const vide = lignes.length === 0;
    rendu.push({ json: { ...e, lignes, estime: estime || vide, total_ht_centimes: estime || vide ? null : ht, total_tva_centimes: estime || vide ? null : tva, total_ttc_centimes: estime || vide ? null : ht + tva } });
  }
}
rendu.push({ json: { genre: 'bilan', cle_idempotence: 'bilan:' + aujourdhui, encaisse_centimes: paiements.reduce((s, p) => s + p.montant_centimes, 0), nb_paiements: paiements.length, deja_en_compta: entrees.filter((e) => e.genre === 'compta_facture').map((e) => e.facture_ref), factures: entrees.filter((e) => e.genre === 'facture').map((e) => e.json ?? e) } });
return rendu;
`

// L'agent ne rend ni montant ni date : seulement l'objet et le texte d'une relance, au palier que le code a calculé.
export const FIN_REV_RELANCE = GARDE_TEXTE + String.raw`const entrees = $('Relances à rédiger').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  return { json: { cle_idempotence: e.cle_idempotence, objet: verifierTexte(s.objet, 120), texte: verifierTexte(s.texte, 900) } };
});
`

const FIN_CORPS = String.raw`const rapproches = ITEMS;
const rel = RELS;
const boite = config.boite_client === 'outlook' ? 'outlook' : 'gmail';
const alertes = [];
const bilan = rapproches.find((r) => r.genre === 'bilan');
for (const f of rapproches) {
  const base = f.cle_idempotence;
  if (f.genre === 'facture') {
    if (f.etat === 'soldee' && f.statut !== 'payee') poser('facture_payee', 'solder_facture', base, { facture_ref: f.facture_ref, paye_centimes: f.paye_centimes, resume: 'Paiement lu : la facture ' + f.facture_ref + ' est soldée, les relances sont arrêtées' });
    if (f.etat === 'en_retard' && f.relance_due) {
      const r = rel.get(base);
      if (!r) continue;
      poser('courriel_' + boite, 'relance_impaye', base + ':n' + (f.nb_relances + 1), { destinataire: f.tiers_courriel, objet_ref: f.facture_ref, type_objet: 'facture', palier: f.palier, objet: r.objet, texte: r.texte + '\n\nMontant restant dû : ' + eur(f.reste_centimes) + ' € TTC (facture ' + f.facture_ref + ').', resume: 'Relance de palier ' + f.palier + ' : facture ' + f.facture_ref + ', reste ' + eur(f.reste_centimes) + ' €' });
    }
  } else if (f.genre === 'chantier_termine') {
    // Le facturier « quand c'est fini » : un tarif inconnu rend le total « estimé » ; un prix estimé ne devient jamais une facture sans l'humain.
    if (f.estime) { alertes.push('Chantier ' + f.libelle + ' : tarif manquant, facture non chiffrée.'); info(base, 'facturer_chantier', 'Tarif manquant, facture non chiffrée par le code : ' + f.libelle); continue; }
    poser('facture_creer', 'facturer_chantier', base, { chantier_ref: f.chantier_ref, libelle: f.libelle, lignes: f.lignes, total_ht_centimes: f.total_ht_centimes, total_tva_centimes: f.total_tva_centimes, total_ttc_centimes: f.total_ttc_centimes, resume: 'Facture du chantier terminé ' + f.libelle + ' : ' + eur(f.total_ttc_centimes) + ' € TTC' });
  }
}
if (bilan) {
  poser('indicateur', 'indicateur_encaissements', bilan.cle_idempotence, { indicateur: { encaisse_jour_centimes: bilan.encaisse_centimes, nb_paiements: bilan.nb_paiements }, resume: 'Encaissements lus aujourd’hui' });
  const jour = Number(aujourdhui.slice(8, 10));
  const mois = ajouterJours(aujourdhui.slice(0, 8) + '01', -1).slice(0, 7);
  const lignes = (bilan.factures ?? []).filter((x) => x.statut === 'payee' && String(x.payee_le ?? '').startsWith(mois) && !bilan.deja_en_compta.includes(x.facture_ref));
  if (jour <= 3 && lignes.length && config.courriel_comptable) poser('export_comptable', 'export_comptable', 'export:' + mois, { mois, destinataire: config.courriel_comptable, boite, lignes: lignes.map((x) => ({ facture_ref: x.facture_ref, total_ttc_centimes: x.total_ttc_centimes, payee_le: x.payee_le })), objet: 'Export du mois ' + mois, resume: 'Export au comptable : ' + lignes.length + ' facture(s) réglée(s) en ' + mois });
}
`
const lierFin = (items, rels) => FIN_CORPS.replace('ITEMS', items).replace('RELS', rels) + prevenir('alertes', 'rapproches[0]?.cle_idempotence')
const FIN_DEFAUTS = { solder_facture: 3, indicateur_encaissements: 3, prevenir_equipe: 3 }
export const FIN_DECIDER = IDENTITE + DATES + DECIDER_DEBUT(FIN_DEFAUTS) + INFO + lierFin(
  "$('Rapprocher').all().map((i) => i.json)",
  "new Map(($('Revalider les relances').isExecuted ? $('Revalider les relances').all() : []).map((i) => [i.json.cle_idempotence, i.json]))")
export const FIN_PREVUS = IDENTITE + DATES + DECIDER_DEBUT(FIN_DEFAUTS) + INFO + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : ce que le rédacteur aurait rendu pour une relance (sans montant : le code l'ajoute).
const rapprochesS = $('Rapprocher').all().map((i) => i.json);
const relsS = new Map(rapprochesS.filter((f) => f.relance_due).map((f) => [f.cle_idempotence, { objet: 'Exemple. Facture en attente de règlement', texte: 'Exemple. Bonjour, sauf erreur de notre part, votre règlement n’est pas encore arrivé.' }]));
` + SIMULER(lierFin('rapprochesS', 'relsS'))

// Le CSV d'export au comptable : un fichier, jamais une écriture dans sa compta. Les montants sont ceux du code.
export const FIN_CSV = String.raw`const e = $('Quel effet ?').first().json;
const eur = (c) => (Number.isInteger(c) ? (c / 100).toFixed(2).replace('.', ',') : '');
const net = (s) => String(s ?? '').replace(/[;\r\n"]/g, ' ').slice(0, 60);
return (e.lignes ?? []).map((l) => ({ json: { numero: net(l.facture_ref), total_ttc: eur(l.total_ttc_centimes), date_reglement: net(l.payee_le) } }));
`

// ═════════════════════════════════════════════ gabarit-ent-apres-vente ═══════════════════════════════════════════════════════════
export const AV_EXEMPLE = String.raw`// Exemple. Entrées fictives de la branche « simulation » : un avis à 1 étoile, un avis à 5 étoiles, un ticket, un contrat d'entretien à renouveler.
const ARO = String.fromCharCode(64);
const dans = (k) => new Date(Date.now() + k * 86400000).toISOString().slice(0, 10);
return [
  { json: { source: 'exemple', genre: 'avis', canal: 'google', ref: 'exemple-avis-1', etoiles: 1, corps_avis: 'Exemple. Intervention décevante.' } },
  { json: { source: 'exemple', genre: 'avis', canal: 'google', ref: 'exemple-avis-2', etoiles: 5, corps_avis: 'Exemple. Très bon travail, merci.' } },
  { json: { source: 'exemple', genre: 'ticket', canal: 'zendesk', ref: 'exemple-ticket-1', sujet: 'Exemple. Question sur une intervention', corps_avis: 'Exemple. Bonjour, une question sur mon intervention.' } },
  { json: { source: 'exemple', genre: 'contrat', contrat_ref: 'exemple-contrat-1', libelle: 'Exemple. Entretien annuel', prochaine_visite: dans(20), tiers_courriel: 'client-d' + ARO + 'exemple.invalid' } },
];
`

export const AV_NORMALISER = IDENTITE + DATES + String.raw`const org = $('Réglages de la copie (relève)').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const ETOILES = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const rendu = [];
const avis = (canal, ref, etoiles, corps) => { const n = Number(etoiles); if (ref && Number.isInteger(n) && n >= 1 && n <= 5) rendu.push({ json: { genre: 'avis', canal, ref: String(ref), cle_idempotence: propre('avis:' + canal + ':' + ref), etoiles: n, corps_avis: coupe(corps, 1500) } }); };
for (const it of $input.all()) {
  const e = it.json;
  switch (e.source) {
    case 'google': avis('google', e.name ?? e.reviewId, ETOILES[e.starRating], e.comment); break;
    case 'trustpilot': for (const r of (e.reviews ?? [])) avis('trustpilot', r.id, r.stars, (r.title ?? '') + ' ' + (r.text ?? '')); break;
    case 'zendesk': if (e.id) rendu.push({ json: { genre: 'ticket', canal: 'zendesk', ref: String(e.id), cle_idempotence: propre('ticket:zendesk:' + e.id), sujet: coupe(e.subject, 160), corps_avis: coupe(e.description, 1500) } }); break;
    case 'plateforme': { const c = e.charge_utile ?? {}; if (mien(e) && e.canal === 'chatwoot' && e.cle_evenement) rendu.push({ json: { genre: 'ticket', canal: 'chatwoot', ref: String(e.cle_evenement), cle_idempotence: propre('ticket:chatwoot:' + e.cle_evenement), sujet: coupe(c.sujet ?? 'Conversation', 160), corps_avis: coupe(c.content ?? c.corps, 1500) } }); break; }
    case 'plateforme_contrat': if (mien(e) && e.contrat_ref && /^\d{4}-\d{2}-\d{2}$/.test(String(e.prochaine_visite))) rendu.push({ json: { genre: 'contrat', contrat_ref: String(e.contrat_ref), cle_idempotence: propre('contrat:' + e.contrat_ref + ':' + e.prochaine_visite), libelle: coupe(e.libelle_court, 120), prochaine_visite: String(e.prochaine_visite), tiers_courriel: e.tiers_courriel || null } }); break;
    case 'exemple': if (e.genre === 'contrat') rendu.push({ json: { genre: 'contrat', contrat_ref: e.contrat_ref, cle_idempotence: propre('contrat:' + e.contrat_ref + ':' + e.prochaine_visite), libelle: e.libelle, prochaine_visite: e.prochaine_visite, tiers_courriel: e.tiers_courriel || null } }); else rendu.push({ json: { genre: e.genre, canal: e.canal, ref: e.ref, cle_idempotence: propre(e.genre + ':' + e.canal + ':' + e.ref), etoiles: e.etoiles, sujet: e.sujet, corps_avis: e.corps_avis } }); break;
    default: break;
  }
}
return rendu;
`

export const AV_QUALIFIER = IDENTITE + DATES + String.raw`const org = $('Réglages de la copie').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const config = $('Lire la configuration').all().map((i) => i.json).find(mien) ?? {};
const seuil = Math.min(4, Math.max(1, Math.floor(Number(config.seuil_avis ?? 3))));
const relances = $('Lire les relances faites').all().map((i) => i.json).filter((r) => mien(r) && r.objet_ref);
const rendu = [];
for (const e of $('Normaliser les entrées').all().map((i) => i.json)) {
  if (e.genre === 'avis') rendu.push({ json: { ...e, negatif_code: e.etoiles <= seuil } });
  else if (e.genre === 'ticket') rendu.push({ json: { ...e, negatif_code: false } });
  else if (e.genre === 'contrat') {
    const jours = joursEntre(aujourdhui, e.prochaine_visite);
    const objet_ref = e.contrat_ref + ':' + e.prochaine_visite;
    rendu.push({ json: { ...e, jours, objet_ref, a_proposer: jours <= 30 && jours >= -30 && !relances.some((r) => r.objet_ref === objet_ref) } });
  }
}
return rendu;
`

export const AV_REVALIDER = GARDE_TEXTE + String.raw`const entrees = $('Retours à traiter').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
const SENTIMENTS = ['positif', 'neutre', 'negatif', 'tres_mecontent'];
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  if (!SENTIMENTS.includes(s.sentiment)) throw new Error('sentiment hors schéma');
  return { json: { cle_idempotence: e.cle_idempotence, sentiment: s.sentiment, reponse: verifierTexte(s.reponse, 900), probleme: verifierTexte(s.probleme, 200) } };
});
`

const AV_CORPS = String.raw`const retours = ITEMS;
const rev = REVS;
const boite = config.boite_client === 'outlook' ? 'outlook' : 'gmail';
const LANES = { google: 'repondre_google', trustpilot: 'reponse_plateforme', chatwoot: 'reponse_plateforme', zendesk: 'repondre_zendesk' };
const gravite = { positif: 0, neutre: 1, negatif: 2, tres_mecontent: 3 };
const alertes = [];
for (const e of retours) {
  const base = e.cle_idempotence;
  if (e.genre === 'ticket' && e.canal === 'chatwoot') poser('marquer_evenement', 'marquer_evenement', base, { ref: e.ref, resume: 'Événement de la plateforme lu' });
  if (e.genre === 'avis' || e.genre === 'ticket') {
    const r = rev.get(base);
    // Le sentiment retenu est le PIRE de celui du code (les étoiles) et de celui du modèle : le modèle ne peut qu'aggraver.
    const code = e.negatif_code ? 'negatif' : e.etoiles === 4 ? 'neutre' : 'positif';
    const sentiment = r && gravite[r.sentiment] > gravite[code] ? r.sentiment : code;
    const mecontent = gravite[sentiment] >= 2;
    if (mecontent) {
      // Un avis négatif ou un client mécontent va TOUJOURS à un humain : jamais de publication, même au niveau le plus autonome de l'annexe.
      if (r) poser(LANES[e.canal], 'repondre_avis_negatif', base, { avis_ref: e.ref, canal: e.canal, texte: r.reponse, resume: 'Brouillon de réponse à ' + (e.genre === 'avis' ? 'un avis à ' + e.etoiles + ' étoile(s)' : 'un client mécontent') + ' (' + e.canal + ')' }, true);
      alertes.push((e.genre === 'avis' ? 'Avis à ' + e.etoiles + ' étoile(s) sur ' + e.canal : 'Client mécontent sur ' + e.canal) + ' : à traiter par un humain.');
      if (!r) info(base, 'repondre_avis_negatif', 'À traiter par un humain (' + e.canal + ') : réponse non rédigée');
    } else if (r) poser(LANES[e.canal], e.genre === 'avis' ? 'repondre_avis' : 'repondre_ticket', base, { avis_ref: e.ref, canal: e.canal, texte: r.reponse, resume: 'Réponse préparée (' + e.canal + ')' });
  } else if (e.genre === 'contrat' && e.a_proposer) {
    if (!e.tiers_courriel) { info(base, 'proposer_entretien', 'Contrat sans destinataire connu, entretien non proposé : ' + e.libelle); continue; }
    poser('courriel_' + boite, 'proposer_entretien', base, { destinataire: e.tiers_courriel, objet_ref: e.objet_ref, type_objet: 'contrat', palier: 1, objet: 'Entretien : ' + e.libelle, texte: 'Bonjour,\n\nVotre entretien (' + e.libelle + ') est à prévoir autour du ' + e.prochaine_visite.split('-').reverse().join('/') + '. Répondez à ce message pour convenir d’un rendez-vous.', resume: 'Proposer l’entretien : ' + e.libelle });
  }
}
`
const lierAv = (items, revs) => AV_CORPS.replace('ITEMS', items).replace('REVS', revs) + prevenir('alertes', 'retours[0]?.cle_idempotence')
const AV_DEFAUTS = { repondre_avis_negatif: 1, prevenir_equipe: 3 }
export const AV_DECIDER = IDENTITE + DATES + DECIDER_DEBUT(AV_DEFAUTS) + INFO + lierAv(
  "$('Qualifier les retours').all().map((i) => i.json)",
  "new Map(($('Revalider le rédacteur').isExecuted ? $('Revalider le rédacteur').all() : []).map((i) => [i.json.cle_idempotence, i.json]))")
export const AV_PREVUS = IDENTITE + DATES + DECIDER_DEBUT(AV_DEFAUTS) + INFO + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : ce que le rédacteur aurait rendu (le sentiment du code prime s'il est pire).
const retoursS = $('Qualifier les retours').all().map((i) => i.json);
const revsS = new Map(retoursS.filter((e) => e.genre === 'avis' || e.genre === 'ticket').map((e) => [e.cle_idempotence, { sentiment: 'neutre', reponse: 'Exemple. Merci pour votre retour, nous revenons vers vous.', probleme: 'Exemple. Aucun problème précis.' }]));
` + SIMULER(lierAv('retoursS', 'revsS'))

// ═════════════════════════════════════════════ gabarit-ent-direction ═══════════════════════════════════════════════════════════
export const DIR_EXEMPLE = String.raw`// Exemple. Le passage d'exemple de la branche « simulation » : un seul élément, l'heure vient du déclencheur.
return [{ json: { source: 'exemple' } }];
`

export const DIR_PASSAGE = String.raw`// Quel jour, quelle heure : lus sur le déclencheur (heure de Paris), jamais sur la machine.
const t = String($('Relève à intervalle').first().json.timestamp ?? '');
if (!/^\d{4}-\d{2}-\d{2}T\d{2}/.test(t)) throw new Error('horloge absente');
const jour = t.slice(0, 10);
return [{ json: { source: 'releve', jour, heure: Number(t.slice(11, 13)), jour_semaine: new Date(jour + 'T12:00:00Z').getUTCDay(), jour_du_mois: Number(jour.slice(8, 10)), cle_idempotence: 'passage:' + jour } }];
`

export const DIR_COMPTER = IDENTITE + DATES + String.raw`// LE CODE COMPTE. Chaque chiffre vient d'une lecture de la plateforme, avec son libellé ; une lecture absente se dit « non lu », jamais un zéro.
const org = $('Réglages de la copie').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const config = $('Lire la configuration').all().map((i) => i.json).find(mien) ?? {};
const p = $('Préparer le passage').first().json;
const jourCh = $('Lire les chiffres du jour').all().map((i) => i.json).find((r) => mien(r) && r.jour === p.jour) ?? {};
const rapports = $('Lire les rapports').all().map((i) => i.json).filter(mien);
const rap = (periode) => rapports.find((r) => r.periode === periode) ?? {};
const couts = $('Lire le coût IA').all().map((i) => i.json).filter((r) => mien(r) && /^\d{4}-\d{2}-\d{2}$/.test(String(r.jour)));
const entier = (n) => (Number.isInteger(n) && n >= 0 ? n : null);
const euros = (c) => (Number.isInteger(c) && c >= 0 ? Math.round(c / 100) : null);
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const ligne = (libelle, v, unite) => libelle + ' : ' + (v === null ? 'non lu' : fmt(v) + (unite || ''));
const somme = (champ, depuis) => { const l = couts.filter((r) => joursEntre(r.jour, p.jour) >= 0 && joursEntre(r.jour, p.jour) < depuis); return l.length ? l.reduce((s, r) => s + (Number.isInteger(r[champ]) ? r[champ] : 0), 0) : null; };
const euros2 = (c) => (c === null ? 'non lu' : (c / 100).toFixed(2).replace('.', ',') + ' €');
const documents = [];
const doc = (kind, titre, lignes, candidats, validation) => documents.push({ json: { kind, titre, cle_idempotence: 'page:' + kind + ':' + p.jour, jour: p.jour, lignes, candidats, validation_equipe: validation } });
if (p.heure >= 7) {
  const imp = euros(jourCh.impayes_echus_centimes);
  const cand = [];
  if (imp !== null && imp > 0) cand.push('Relancer les impayés échus');
  if (entier(jourCh.devis_a_relancer) > 0) cand.push('Relancer les devis sans réponse');
  if (entier(jourCh.demandes_sans_reponse) > 0) cand.push('Répondre aux demandes en attente');
  if (entier(jourCh.cartes_a_valider) > 0) cand.push('Valider les cartes en attente');
  doc('matin', 'Page du matin du ' + p.jour, [ligne('Impayés échus', imp, ' €'), ligne('Devis sans réponse', entier(jourCh.devis_a_relancer)), ligne('Demandes sans réponse', entier(jourCh.demandes_sans_reponse)), ligne('Rendez-vous du jour', entier(jourCh.rendez_vous_jour)), ligne('Cartes à valider', entier(jourCh.cartes_a_valider)), 'Coût IA du jour : ' + euros2(somme('cout_centimes', 1))], cand, false);
}
if (p.jour_semaine === 1 && p.heure >= 8) {
  const r = rap('semaine');
  doc('lundi', 'Rapport du lundi ' + p.jour, [ligne('Encaissé cette semaine', euros(r.encaisse_centimes), ' €'), ligne('Signé cette semaine', euros(r.signe_centimes), ' €'), ligne('En cours', euros(r.en_cours_centimes), ' €'), ligne('Impayés', euros(r.impayes_centimes), ' €'), 'Coût IA de la semaine : ' + euros2(somme('cout_centimes', 7)), ligne('Appels à un modèle externe cette semaine', somme('appels_modele', 7))], [], false);
}
if (p.jour_du_mois === 1 && p.heure >= 8) {
  const r = rap('mois');
  doc('point_mensuel', 'Point mensuel du ' + p.jour, [ligne('Encaissé le mois dernier', euros(r.encaisse_centimes), ' €'), ligne('Signé le mois dernier', euros(r.signe_centimes), ' €'), ligne('Impayés', euros(r.impayes_centimes), ' €'), 'Coût IA du mois : ' + euros2(somme('cout_centimes', 30)), ligne('Appels à un modèle externe', somme('appels_modele', 30)), ligne('Textes rédigés en mode privé', somme('appels_prives', 30))], [], true);
}
if (config.deploye_le && /^\d{4}-\d{2}-\d{2}$/.test(String(config.deploye_le)) && joursEntre(config.deploye_le, p.jour) === 30 && p.heure >= 8) {
  const r = rap('bilan');
  doc('bilan_1_mois', 'Bilan à un mois du ' + p.jour, [ligne('Demandes traitées', entier(r.demandes_traitees)), ligne('Devis envoyés', entier(r.devis_envoyes)), ligne('Encaissé depuis le déploiement', euros(r.encaisse_centimes), ' €'), 'Coût IA depuis le déploiement : ' + euros2(somme('cout_centimes', 31))], [], true);
}
return documents;
`

// Le mode privé : aucun texte ne sort vers un modèle externe ; la phrase est celle du code, les priorités sont les premières du code.
export const DIR_SANS_MODELE = String.raw`return $input.all().map((it) => ({ json: { output: { cle_idempotence: it.json.cle_idempotence, intro: 'Voici les chiffres, lus dans la plateforme.', priorites: it.json.candidats.slice(0, 3).map((c, i) => i), via: 'code' } } }));
`

export const DIR_REVALIDER = GARDE_TEXTE + String.raw`const docs = $('Documents à rédiger').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== docs.length) throw new Error('nombre de sorties différent du nombre de documents');
return sorties.map((s, i) => {
  const d = docs[i];
  if (s.cle_idempotence !== d.cle_idempotence) throw new Error('clé inconnue : hors schéma');
  // La phrase du modèle ne porte AUCUN chiffre : les chiffres de la page sont ceux du code.
  if (typeof s.intro !== 'string' || s.intro.trim().length < 10 || s.intro.length > 240 || /\d/.test(s.intro) || /presti|€/i.test(s.intro)) throw new Error('phrase hors schéma : un chiffre ne vient jamais du modèle');
  const ix = Array.isArray(s.priorites) ? s.priorites : [];
  if (ix.length > 3 || new Set(ix).size !== ix.length || !ix.every((n) => Number.isInteger(n) && n >= 0 && n < d.candidats.length)) throw new Error('priorité hors de la liste du code');
  const faire = ix.length ? '\n\nÀ faire :\n' + ix.map((n) => '• ' + d.candidats[n]).join('\n') : '';
  return { json: { ...d, message: s.intro.trim() + '\n\n' + d.lignes.join('\n') + faire, via: s.via === 'code' ? 'code' : 'modele' } };
});
`

const DIR_CORPS = String.raw`const docs = DOCS;
const CANAUX = ['slack', 'teams', 'googlechat', 'gmail'];
const canal = CANAUX.includes(config.canal_direction) ? config.canal_direction : 'aucun';
const externes = docs.filter((d) => d.via === 'modele').length, prives = docs.filter((d) => d.via === 'code').length;
const alertes = [];
for (const d of docs) {
  const base = d.cle_idempotence;
  if (canal !== 'aucun') poser('diffuser_' + canal, d.validation_equipe ? 'diffuser_equipe' : 'diffuser_direction', base, { texte: d.message, objet: d.titre, destinataire: config.courriel_direction, canal_equipe: coupe(config.canal_alertes, 80), resume: d.titre }, d.validation_equipe);
  if (d.kind === 'lundi' || d.kind === 'point_mensuel') poser('rapport_docs', 'rapport_docs', base, { titre: d.titre, corps: d.message, resume: 'Document : ' + d.titre });
  if (d.kind === 'lundi') poser('journal_sheets', 'journal_sheets', base, { ligne: { jour: d.jour, rapport: d.titre, lignes: d.lignes.join(' | ') }, resume: 'Ligne du lundi dans le journal' });
}
if (docs.length) poser('indicateur', 'compteur_ia', 'ia:' + docs[0].jour, { indicateur: { documents_par_modele_externe: externes, documents_en_mode_prive: prives }, resume: 'Compteur : ' + externes + ' document(s) rédigé(s) par un modèle externe, ' + prives + ' en mode privé' });
const plafond = Math.floor(Number(config.plafond_ia_centimes ?? 0));
const coutJour = $('Lire le coût IA').all().map((i) => i.json).filter((r) => mien(r) && docs.length && r.jour === docs[0].jour).reduce((s, r) => s + (Number.isInteger(r.cout_centimes) ? r.cout_centimes : 0), 0);
if (plafond > 0 && coutJour >= plafond && canal !== 'aucun') poser('diffuser_' + canal, 'alerte_cout_ia', 'cout:' + docs[0].jour, { texte: 'Le coût IA du jour a atteint le plafond fixé.', objet: 'Plafond du coût IA', destinataire: config.courriel_direction, canal_equipe: coupe(config.canal_alertes, 80), resume: 'Plafond du coût IA atteint' });
` + VALIDATIONS + String.raw`return plan;
`
const lierDir = (docs) => DIR_CORPS.replace('DOCS', docs)
const DIR_DEFAUTS = { diffuser_direction: 3, rapport_docs: 3, journal_sheets: 3, compteur_ia: 3, alerte_cout_ia: 3, validation_equipe: 3 }
export const DIR_DECIDER = IDENTITE + DATES + DECIDER_DEBUT(DIR_DEFAUTS) + lierDir("$('Revalider les documents').all().map((i) => i.json)")
export const DIR_PREVUS = IDENTITE + DATES + DECIDER_DEBUT(DIR_DEFAUTS) + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : la phrase que le modèle aurait rendue (sans chiffre) ; les chiffres sont ceux du code.
const docsS = $('Compter').all().map((i) => { const d = i.json; return { ...d, message: 'Exemple. Voici les chiffres, lus dans la plateforme.\n\n' + d.lignes.join('\n'), via: 'modele' }; });
` + SIMULER(lierDir('docsS'))
