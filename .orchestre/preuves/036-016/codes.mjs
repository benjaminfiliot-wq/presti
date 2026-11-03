// 036-016 — le code des nœuds Code des quatre gabarits `gabarit-ent-*` (fabrique : le juge ne la lit jamais, il lit les exports).
// RÈGLES : « le code calcule, n8n route ». Aucun montant, aucun score, aucune date limite ne vient du modèle : le modèle remplit un schéma strict,
// un nœud Code le revalide (R18) puis calcule. Aucun module, aucun réseau, aucun environnement dans un nœud Code (R19) : les empreintes SHA-256
// sont tenues par `empreintes-code.json`. Pas de « @ » écrit en dur (R8 : aucune adresse e-mail dans l'export) : on l'assemble à l'exécution.
// Exemple. Toutes les données ci-dessous sont fictives.

// ─── Fragments communs, collés en tête de chaque nœud (un nœud Code n'importe rien) ────────────────────────────────────────────
export const IDENTITE = String.raw`const ARO = String.fromCharCode(64);
const minuscule = (s) => String(s ?? '').trim().toLowerCase();
const chiffres = (s) => String(s ?? '').replace(/\D/g, '');
const fnv = (s, graine) => { let h = graine >>> 0; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
const empreinteDe = (s) => fnv(s, 2166136261) + fnv('~' + s, 40503);
const clesIdentite = (courriel, tel) => { const k = []; const c = minuscule(courriel); if (c.includes(ARO)) k.push('c' + empreinteDe(c)); const t = chiffres(tel); if (t.length >= 9) k.push('t' + empreinteDe(t.slice(-9))); return k; };
const MOTIF_COURRIEL = new RegExp('[^\\s' + ARO + ']+' + ARO + '[^\\s' + ARO + ']+\\.[a-z]{2,}', 'i');
const MOTIF_TEL = /\+?\d[\d .-]{7,}\d/;
const coupe = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const propre = (s) => String(s).replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 120);
const aplatir = (v, acc = []) => { if (typeof v === 'string' || typeof v === 'number') acc.push(String(v)); else if (v && typeof v === 'object') for (const x of Object.values(v)) aplatir(x, acc); return acc; };
`

// Les garde-fous du texte écrit par le modèle, communs aux revalidations (anti-fabrication, marque blanche).
export const GARDE_TEXTE = String.raw`const verifierTexte = (t, max) => {
  if (typeof t !== 'string' || !t.trim() || t.length > max) throw new Error('texte absent ou trop long');
  if (/presti/i.test(t)) throw new Error('nom de la plateforme dans un texte pour un tiers (marque blanche)');
  if (/\d\s?(€|eur\b|euros?\b)/i.test(t) || /(€|\beur\b)\s?\d/i.test(t)) throw new Error('prix écrit par le modèle : un prix vient des données du client');
  return t.trim();
};
`

// L'autonomie par type d'action, lue en configuration (annexe d'autonomie du contrat, p6:440) : 1 = préparer (carte « brouillon »), 2 = carte
// « À valider », 3 = part seul, dans le plafond du jour. Ce qui n'est pas dans l'annexe vaut 2 (« par défaut, tout commence en carte à valider », kit/annexe-autonomie.md) ; l'interne (dépôt dans la plateforme) vaut 3. Un effet automatique qui sort de la plateforme attend DELAI minutes (10 par défaut, comme le pilote automatique) : une carte « annulable » que la relève exécute. Jamais en automatique : la demande de signature, et toute réponse sur un litige.
export const DECIDER_DEBUT = (defauts) => String.raw`const org = $('Réglages de la copie').first().json.organisation_id;
const mien = (r) => !!r && r.organisation_id === org;
const config = $('Lire la configuration').all().map((i) => i.json).find(mien) ?? {};
const annexe = {};
for (const r of $('Lire l’annexe d’autonomie').all()) if (mien(r.json) && r.json.type_action) annexe[r.json.type_action] = r.json;
const faits = {};
for (const r of $('Lire les actions du jour').all()) if (mien(r.json) && r.json.type_action && r.json.statut === 'faite' && r.json.effet !== 'carte') faits[r.json.type_action] = (faits[r.json.type_action] || 0) + 1;
const DEFAUTS = ${JSON.stringify(defauts)};
const niveau = (t) => Math.min(3, Math.max(1, Number(annexe[t]?.niveau ?? DEFAUTS[t] ?? 2)));
const delai = Math.max(0, Math.floor(Number(config.delai_annulation_min ?? 10)));
const INTERNES = ['deposer_conversation', 'prevenir_equipe', 'indicateur_ads', 'note_interet', 'validation_equipe', 'marquer_evenement'];
const JAMAIS_AUTO = ['demande_signature'];
const restes = {};
const modeDe = (t) => {
  const n = niveau(t);
  if (n === 1) return 'prepare';
  if (n === 2) return 'carte';
  if (INTERNES.includes(t)) return 'auto';
  if (restes[t] === undefined) restes[t] = Math.max(0, Number(annexe[t]?.plafond_jour ?? 20) - (faits[t] || 0));
  if (restes[t] <= 0) return 'carte';
  restes[t] -= 1;
  return 'auto';
};
const entreprise = coupe(config.raison_affichee, 70);
const plan = [];
const poser = (lane, type, base, donnees, forcerCarte) => {
  const m0 = modeDe(type);
  const forcer = !!forcerCarte || JAMAIS_AUTO.includes(type);
  const m = forcer && m0 === 'auto' ? 'carte' : m0;
  if (forcer && m0 === 'auto' && restes[type] !== undefined) restes[type] += 1;
  const effet = { effet: lane, type_action: type, organisation_id: org, entreprise, cle_idempotence: base + ':' + type, ...donnees };
  const perim = config.perimetres?.[type] ?? 'direction';
  if (m === 'auto' && delai > 0 && !INTERNES.includes(type)) plan.push({ json: { effet: 'carte', type_action: type, mode: 'auto_differe', statut_carte: 'annulable', pour_effet: lane, organisation_id: org, entreprise, cle_idempotence: base + ':' + type + ':carte', perimetre: coupe(perim, 40), approbateurs_roles: [], canal_equipe: '', execute_apres: new Date(Date.now() + delai * 60000).toISOString(), resume: coupe(donnees.resume, 300), charge: { ...effet, mode: 'auto' } } });
  else if (m === 'auto') plan.push({ json: { ...effet, mode: 'auto' } });
  else plan.push({ json: { effet: 'carte', type_action: type, mode: m, statut_carte: m === 'prepare' ? 'brouillon' : 'a_valider', pour_effet: lane, organisation_id: org, entreprise,
    cle_idempotence: base + ':' + type + ':carte', perimetre: coupe(config.perimetres?.[type] ?? 'direction', 40), approbateurs_roles: Array.isArray(config.approbateurs?.[config.perimetres?.[type] ?? 'direction']) ? config.approbateurs[config.perimetres?.[type] ?? 'direction'] : ['gerant'], canal_equipe: coupe(config.canaux_validation?.[config.perimetres?.[type] ?? 'direction'], 80), resume: coupe(donnees.resume, 300), charge: { ...effet, mode: 'auto' } } });
};
`

// Les cartes approuvées par le bon membre (C6), ou arrivées à l'échéance de la file du lendemain, redeviennent des effets (la porte est devant).
export const CARTES_EFFETS = String.raw`const org = $('Réglages de la copie (relève)').first().json.organisation_id;
const lues = $('Relève des cartes').all().map((i) => i.json).filter((c) => c && c.organisation_id === org && c.charge && c.cle_idempotence);
const rendu = [];
for (const c of lues) {
  const differee = c.statut === 'annulable' && Date.parse(c.execute_apres) <= Date.now();
  const approuvee = c.statut === 'approuvee' && Array.isArray(c.approbateurs_roles) && !!c.approuvee_par_role && c.approbateurs_roles.includes(c.approuvee_par_role);
  const enFile = c.statut === 'file_demain';
  if (!approuvee && !enFile && !differee) continue;
  if (c.charge.organisation_id !== undefined && c.charge.organisation_id !== org) continue;
  if (c.charge.a_corriger === true) continue;
  rendu.push({ json: { ...c.charge, organisation_id: org, mode: 'auto', cle_idempotence: String(c.cle_idempotence).replace(/:carte$/, '') + (enFile ? ':file' : differee ? ':differee' : ':approuvee'), carte_cle: c.cle_idempotence } });
}
return rendu;
`

// On ne garde que les actions que la base vient de réserver (une seule fois par clé) : un rejeu ne crée aucun doublon.
export const GARDER = String.raw`const reservees = new Set($input.all().map((i) => i.json.cle_idempotence).filter(Boolean));
const rendu = [];
for (const nom of ['Décider les effets', 'Cartes en effets']) {
  const n = $(nom);
  if (!n.isExecuted) continue;
  for (const i of n.all()) if (reservees.has(i.json.cle_idempotence)) rendu.push(i);
}
return rendu;
`

// Écarte les événements déjà traités et sépare le nouveau lead de celui que la plateforme connaît par une de ses clés d'identité.
export const ECARTER = (nomNorm) => String.raw`const org = $('Réglages de la copie').first().json.organisation_id;
const entrees = $('${nomNorm}').all().map((i) => i.json);
const traites = new Set($('Lire les événements traités').all().map((i) => i.json).filter((r) => r.organisation_id === org).map((r) => r.cle_idempotence).filter(Boolean));
const parCle = new Map();
for (const r of $('Lire les identités connues').all().map((i) => i.json).filter((x) => x.organisation_id === org)) for (const k of (r.cles_identite ?? [])) parCle.set(k, r);
const dansLot = new Map();
const rendu = [];
for (const e of entrees) {
  if (traites.has(e.cle_idempotence)) continue;
  const connu = (e.cles_identite ?? []).map((k) => parCle.get(k)).find(Boolean);
  const pareil = (e.cles_identite ?? []).map((k) => dansLot.get(k)).find((x) => x !== undefined);
  const idx = rendu.length;
  if (pareil !== undefined) {
    for (const k of e.cles_identite) dansLot.set(k, pareil);
    rendu[pareil].json.cles_identite = [...new Set([...rendu[pareil].json.cles_identite, ...e.cles_identite])];
  } else for (const k of (e.cles_identite ?? [])) dansLot.set(k, idx);
  const racine = pareil !== undefined ? rendu[pareil].json.cle_conversation : connu ? connu.cle_conversation : e.cle_idempotence;
  rendu.push({ json: { ...e, cle_conversation: racine, nouveau_lead: !connu && pareil === undefined, crm_deja: !!(connu && connu.crm_ref) } });
}
return rendu;
`

// La note d'une qualification : le MODÈLE rapporte ce qu'il voit (oui, non, inconnu), le CODE calcule le score sur la grille écrite avec le client.
export const NOTER = String.raw`const noter = (grille, reponses, seuil) => {
  const ids = new Set(grille.map((g) => g.critere_id));
  for (const r of reponses) { if (!ids.has(r.critere_id)) throw new Error('critère inconnu : ' + r.critere_id); if (!['oui', 'non', 'inconnu'].includes(r.valeur)) throw new Error('valeur de critère hors schéma'); }
  let pts = 0, total = 0, elimine = false;
  for (const g of grille) {
    const r = reponses.find((x) => x.critere_id === g.critere_id);
    const poids = Math.max(0, Math.floor(Number(g.poids) || 0));
    total += poids;
    if (r && r.valeur === 'oui') pts += poids;
    if (r && r.valeur === 'non' && g.eliminatoire === true) elimine = true;
  }
  const score = total > 0 ? Math.floor((pts * 100) / total) : 0;
  return { score, qualification: elimine ? 'hors_cible' : score >= seuil ? 'qualifie' : 'a_confirmer' };
};
`

// ═════════════════════════════════════════════ gabarit-ent-accueil ═════════════════════════════════════════════════════════════
export const ACC_EXEMPLE = String.raw`// Exemple. Entrée fictive de la branche « simulation » : jamais une donnée réelle.
const ARO = String.fromCharCode(64);
return [{ json: { source: 'exemple', canal: 'courriel', ref: 'exemple-accueil-001', courriel: 'prospect' + ARO + 'exemple.invalid', telephone: '0600000000', libelle: 'Exemple. Prospect', sujet: 'Exemple. Demande de renseignements', corps: 'Exemple. Bonjour, je cherche des renseignements pour un projet, sous un mois si possible.' } }];
`

export const ACC_NORMALISER = IDENTITE + String.raw`const rendu = [];
const lus = [];
for (const it of $input.all()) { const liste = it.json.items ?? it.json.content ?? it.json.submissions ?? it.json.responses; if (Array.isArray(liste)) for (const x of liste) lus.push({ ...x, source: it.json.source }); else lus.push(it.json); }
for (const e of lus) {
  let r = null;
  switch (e.source) {
    case 'gmail': r = { canal: 'courriel', ref: e.id, courriel: e.from?.value?.[0]?.address, libelle: e.from?.value?.[0]?.name, sujet: e.subject, corps: e.text ?? e.snippet }; break;
    case 'outlook': r = { canal: 'courriel', ref: e.id, courriel: e.from?.emailAddress?.address, libelle: e.from?.emailAddress?.name, sujet: e.subject, corps: e.bodyPreview }; break;
    case 'imap': r = { canal: 'courriel', ref: e.uid ?? e.messageId, courriel: e.from?.value?.[0]?.address ?? e.from, libelle: e.from?.value?.[0]?.name, sujet: e.subject, corps: e.textPlain ?? e.text }; break;
    case 'plateforme': { const c = e.charge_utile ?? {}; r = { canal: e.canal, ref: e.cle_evenement, courriel: c.courriel, telephone: c.telephone, libelle: c.libelle, sujet: c.sujet, corps: c.corps }; break; }
    case 'typeform': case 'jotform': case 'tally': {
      const t = aplatir(e.answers ?? e.fields ?? e);
      r = { canal: 'formulaire_' + e.source, ref: e.response_id ?? e.token ?? e.submission_id ?? e.id, courriel: t.find((x) => MOTIF_COURRIEL.test(x)), telephone: t.find((x) => MOTIF_TEL.test(x) && !MOTIF_COURRIEL.test(x)), sujet: 'Formulaire', corps: t.join(' | ') };
      break;
    }
    case 'exemple': r = e; break;
    default: r = null;
  }
  if (!r || !r.ref) continue;
  const corps = coupe(r.corps, 4000), sujet = coupe(r.sujet, 200);
  if (!corps && !sujet) continue;
  rendu.push({ json: { source: String(e.source), canal: String(r.canal), ref: String(r.ref), cle_idempotence: propre(String(r.canal) + ':' + String(r.ref)), cles_identite: clesIdentite(r.courriel, r.telephone),
    courriel: r.courriel ?? null, telephone: r.telephone ?? null, libelle: coupe(r.libelle, 120), sujet, corps } });
}
return rendu;
`

export const ACC_REV_TRI = String.raw`const entrees = $('Écarter les doublons').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
const CLASSES = ['a_traiter', 'a_surveiller', 'a_ecarter'];
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  if (!CLASSES.includes(s.classe)) throw new Error('classe hors schéma');
  if (typeof s.motif !== 'string' || s.motif.length > 200) throw new Error('motif hors schéma');
  return { json: { ...e, classe: s.classe, motif_tri: s.motif } };
});
`

export const ACC_REV_QUAL = IDENTITE + NOTER + GARDE_TEXTE + String.raw`const entrees = $('Revalider le tri').all().map((i) => i.json).filter((t) => t.classe === 'a_traiter');
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
const org = $('Réglages de la copie').first().json.organisation_id;
const grille = $('Lire la grille').all().map((i) => i.json).filter((g) => g && g.organisation_id === org && g.critere_id);
const seuil = Number($('Lire la configuration').all().map((i) => i.json).find((c) => c.organisation_id === org)?.seuil_qualifie ?? 60);
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  if (typeof s.rendez_vous_souhaite !== 'boolean') throw new Error('rendez_vous_souhaite hors schéma');
  const n = noter(grille, Array.isArray(s.reponses_grille) ? s.reponses_grille : [], seuil);
  return { json: { cle_idempotence: e.cle_idempotence, qualification: n.qualification, score: n.score, besoin: coupe(s.besoin, 300), reponse_proposee: verifierTexte(s.reponse_proposee, 1200), rendez_vous_souhaite: s.rendez_vous_souhaite } };
});
`

const ACC_CORPS = String.raw`const tries = TRIES;
const quals = QUALS;
const boite = config.boite_client === 'outlook' ? 'outlook' : 'gmail';
const CRMS = ['hubspot', 'pipedrive', 'salesforce', 'zoho', 'odoo', 'airtable', 'notion', 'monday'];
const crm = CRMS.includes(config.crm_choisi) ? config.crm_choisi : 'aucun';
for (const t of tries) {
  if (t.source === 'plateforme') poser('marquer_evenement', 'marquer_evenement', t.cle_idempotence, { ref: t.ref, resume: 'Événement de la plateforme lu' });
  if (t.classe === 'a_ecarter') continue;
  const base = t.cle_idempotence;
  poser('deposer', 'deposer_conversation', base, { canal: t.canal, cle_conversation: t.cle_conversation, cles_identite: t.cles_identite, libelle: t.libelle, sujet: t.sujet, corps: t.corps, classe: t.classe, resume: 'Message déposé dans la conversation' });
  const ql = quals.get(base);
  if (t.classe !== 'a_traiter' || !ql) continue;
  if (t.nouveau_lead && ql.qualification !== 'hors_cible' && crm !== 'aucun') {
    poser('crm_fiche', 'fiche_crm', base, { crm, cle_conversation: t.cle_conversation, cles_identite: t.cles_identite, libelle: t.libelle, courriel: t.courriel, telephone: t.telephone, source: t.canal, qualification: ql.qualification, score: ql.score, besoin: ql.besoin, resume: 'Fiche ' + crm + ' pour un nouveau contact' });
  }
  if (ql.reponse_proposee) {
    const lane = t.canal === 'courriel' ? 'repondre_' + boite : t.canal === 'whatsapp' ? 'repondre_whatsapp' : 'repondre_plateforme';
    const reponse = { destinataire: t.courriel ?? t.telephone ?? null, canal: t.canal, cle_conversation: t.cle_conversation, objet: 'Re: ' + (t.sujet || 'votre demande'), texte: ql.reponse_proposee, resume: 'Réponse préparée (' + t.canal + ')' };
    const ESCALADE = /litige|sinistre|menace|avocat|assureur|huissier|plainte|mise en demeure/i;
    poser(lane, 'reponse_prospect', base, reponse, ESCALADE.test(t.sujet + ' ' + t.corps));
    if (t.canal === 'courriel' && niveau('reponse_prospect') < 3) poser('brouillon_' + boite, 'brouillon_boite', base, reponse);
  }
}
const cartes = plan.filter((p) => p.json.effet === 'carte').length;
if (cartes > 0 && ['slack', 'teams'].includes(config.outil_equipe) && tries.length) poser('prevenir_' + config.outil_equipe, 'prevenir_equipe', 'lot:' + tries[0].cle_idempotence, { texte: cartes + ' action(s) attendent une validation dans la plateforme.', canal_equipe: coupe(config.canal_alertes, 80), resume: 'Prévenir l’équipe' });
return plan;
`
const lierAcc = (tries, quals) => ACC_CORPS.replace('TRIES', tries).replace('QUALS', quals)
export const ACC_DECIDER = IDENTITE + DECIDER_DEBUT({ deposer_conversation: 3, brouillon_boite: 3, prevenir_equipe: 3, marquer_evenement: 3 }) + lierAcc(
  "$('Revalider le tri').all().map((i) => i.json)",
  "new Map(($('Revalider la qualification').isExecuted ? $('Revalider la qualification').all() : []).map((i) => [i.json.cle_idempotence, i.json]))")

// En simulation, la sortie du modèle vient d'un enregistrement daté (jamais d'un appel) ; le plan est calculé par le MÊME code.
export const ACC_PREVUS = IDENTITE + NOTER + DECIDER_DEBUT({ deposer_conversation: 3, brouillon_boite: 3, prevenir_equipe: 3, marquer_evenement: 3 }) + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : ce que le modèle aurait rendu pour l'entrée d'exemple.
const ENREGISTREMENT = { classe: 'a_traiter', reponses_grille: [{ critere_id: 'zone', valeur: 'oui' }, { critere_id: 'delai', valeur: 'oui' }], rendez_vous_souhaite: true, besoin: 'Exemple. Renseignements pour un projet.', reponse_proposee: 'Exemple. Bonjour, merci pour votre message. Nous revenons vers vous avec des créneaux.' };
const grille = $('Lire la grille').all().map((i) => i.json).filter((g) => mien(g) && g.critere_id);
const n = noter(grille, ENREGISTREMENT.reponses_grille, Number(config.seuil_qualifie ?? 60));
const triesS = $('Écarter les doublons').all().map((i) => ({ ...i.json, classe: ENREGISTREMENT.classe }));
const qualsS = new Map(triesS.map((t) => [t.cle_idempotence, { qualification: n.qualification, score: n.score, besoin: ENREGISTREMENT.besoin, reponse_proposee: ENREGISTREMENT.reponse_proposee, rendez_vous_souhaite: true }]));
` + String.raw`const SIM = (() => { ` + lierAcc('triesS', 'qualsS').replace(/^const plan = \[\];/m, '').split('\n').join('\n') + String.raw` })();
return SIM.map((p) => ({ json: { ...p.json, simulation: true, effets_faits: [] } }));
`

// ═════════════════════════════════════════════ gabarit-ent-leads ═══════════════════════════════════════════════════════════════
export const LEADS_EXEMPLE = String.raw`// Exemple. Lead Facebook fictif de la branche « simulation » : jamais une donnée réelle.
const ARO = String.fromCharCode(64);
return [{ json: { source: 'facebook', id: 'exemple-lead-001', created_time: '2026-11-03T09:00:00+0000', form_id: 'exemple-formulaire', field_data: [
  { name: 'full_name', values: ['Exemple. Prospect'] }, { name: 'email', values: ['prospect' + ARO + 'exemple.invalid'] }, { name: 'phone_number', values: ['+33600000000'] }, { name: 'urgence', values: ['sous_un_mois'] }, { name: 'budget_declare', values: ['moyen'] }] } }];
`

export const LEADS_NORMALISER = IDENTITE + String.raw`const champ = (d, noms) => { for (const n of noms) { const f = (d ?? []).find((x) => x.name === n); if (f && Array.isArray(f.values) && f.values.length) return String(f.values[0]); } return ''; };
const rendu = [];
const lus = [];
for (const it of $input.all()) { const liste = it.json.data ?? it.json.collection ?? it.json.bookings; if (Array.isArray(liste)) for (const x of liste) lus.push({ ...x, source: it.json.source }); else lus.push(it.json); }
for (const e of lus) {
  let r = null;
  switch (e.source) {
    case 'facebook': r = { canal: 'facebook_lead_ads', ref: e.id, courriel: champ(e.field_data, ['email']), telephone: champ(e.field_data, ['phone_number', 'phone']), libelle: champ(e.field_data, ['full_name', 'first_name']), urgence: champ(e.field_data, ['urgence']), budget: champ(e.field_data, ['budget_declare']), corps: aplatir(e.field_data).join(' | ') }; break;
    case 'calendly': if (!e.email) break; r = { canal: 'calendly', ref: e.uri, courriel: e.email, libelle: e.name, urgence: 'rendez_vous_pris', budget: '', corps: 'Rendez-vous pris : ' + coupe(e.event, 120) }; break;
    case 'calcom': r = { canal: 'calcom', ref: e.uid, courriel: e.attendees?.[0]?.email, libelle: e.attendees?.[0]?.name, urgence: 'rendez_vous_pris', budget: '', corps: 'Réservation : ' + coupe(e.title, 120) }; break;
    case 'plateforme': { const c = e.charge_utile ?? {}; r = { canal: e.canal, ref: e.cle_evenement, courriel: c.courriel, telephone: c.telephone, libelle: c.libelle, urgence: c.urgence ?? '', budget: c.budget ?? '', corps: c.corps }; break; }
    case 'rapport_ads': r = { canal: 'rapport_ads', ref: e.campaign?.id ?? e.id, indicateur: { campagne: coupe(e.campaign?.id ?? e.id, 40), cout_micros: Math.floor(Number(e.metrics?.cost_micros ?? 0)), clics: Math.floor(Number(e.metrics?.clicks ?? 0)) } }; break;
    case 'aimant': r = { canal: 'aimant', ref: e.cle_idempotence, corps: e.corps_valide }; break;
    case 'exemple': r = null; break;
    default: r = null;
  }
  if (e.source === 'exemple') r = e;
  if (!r || !r.ref) continue;
  if (r.canal === 'rapport_ads') { rendu.push({ json: { source: 'rapport_ads', canal: 'rapport_ads', ref: String(r.ref), cle_idempotence: propre('rapport_ads:' + r.ref + ':' + new Date().toISOString().slice(0, 10)), cles_identite: [], indicateur: r.indicateur } }); continue; }
  if (r.canal === 'aimant') { rendu.push({ json: { source: 'aimant', canal: 'aimant', ref: String(r.ref), cle_idempotence: propre('aimant:' + r.ref), cles_identite: [], texte: coupe(r.corps, 2000) } }); continue; }
  rendu.push({ json: { source: String(e.source), canal: String(r.canal), ref: String(r.ref), cle_idempotence: propre(String(r.canal) + ':' + String(r.ref)), cles_identite: clesIdentite(r.courriel, r.telephone),
    courriel: r.courriel || null, telephone: r.telephone || null, libelle: coupe(r.libelle, 120), urgence: coupe(r.urgence, 40), budget: coupe(r.budget, 40), sujet: 'Nouveau lead', corps: coupe(r.corps, 2000) } });
}
return rendu;
`

// Le score d'un lead : le CODE le calcule sur la grille de la configuration (urgence, budget déclaré) ; jamais le modèle.
export const LEADS_NOTER = String.raw`const noterLead = (l, regles) => {
  const u = regles.urgence ?? {}, b = regles.budget ?? {};
  const lire = (t, k) => (Object.prototype.hasOwnProperty.call(t, k) ? Math.floor(Number(t[k]) || 0) : 0);
  const pu = lire(u, l.urgence), pb = lire(b, l.budget);
  const score = Math.max(0, Math.min(100, pu + pb));
  return { score, chaleur: score >= Number(regles.seuil_chaud ?? 60) ? 'chaud' : score >= Number(regles.seuil_tiede ?? 30) ? 'tiede' : 'froid' };
};
`

export const LEADS_REV_REDACTEUR = NOTER.slice(0, 0) + GARDE_TEXTE + LEADS_NOTER + String.raw`const entrees = $('Écarter les doublons').all().map((i) => i.json).filter((l) => !['rapport_ads', 'aimant'].includes(l.canal));
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
const org = $('Réglages de la copie').first().json.organisation_id;
const regles = $('Lire la configuration').all().map((i) => i.json).find((c) => c.organisation_id === org)?.regles_score ?? {};
const CANAUX = ['courriel', 'manychat', 'aucun'];
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  if (!CANAUX.includes(s.canal_conseille)) throw new Error('canal hors schéma');
  const n = noterLead(e, regles);
  return { json: { cle_idempotence: e.cle_idempotence, score: n.score, chaleur: n.chaleur, canal_conseille: s.canal_conseille, objet: verifierTexte(s.objet, 120), texte: verifierTexte(s.texte, 900) } };
});
`

const LEADS_CORPS = String.raw`const leads = LEADS;
const redac = REDAC;
const CRMS = ['hubspot', 'pipedrive', 'salesforce', 'zoho', 'odoo', 'airtable', 'notion', 'monday'];
const crm = CRMS.includes(config.crm_choisi) ? config.crm_choisi : 'aucun';
const OUTILS = ['brevo', 'mailchimp', 'activecampaign', 'lemlist'];
const outil = OUTILS.includes(config.sequence_outil) ? config.sequence_outil : 'aucun';
for (const l of leads) {
  if (l.canal === 'rapport_ads') { poser('indicateur', 'indicateur_ads', l.cle_idempotence, { indicateur: l.indicateur, resume: 'Rapport publicitaire du jour' }); continue; }
  if (l.canal === 'aimant') { poser('publier_linkedin', 'publier_linkedin', l.cle_idempotence, { reseau: 'linkedin', texte: l.texte, resume: 'Publication LinkedIn de l’aimant à leads (publication seulement)' }); continue; }
  const base = l.cle_idempotence;
  if (l.source === 'plateforme') poser('marquer_evenement', 'marquer_evenement', base, { ref: l.ref, resume: 'Événement de la plateforme lu' });
  poser('deposer', 'deposer_conversation', base, { canal: l.canal, cle_conversation: l.cle_conversation, cles_identite: l.cles_identite, libelle: l.libelle, sujet: l.sujet, corps: l.corps, classe: 'a_traiter', resume: 'Lead déposé dans la conversation' });
  const r = redac.get(base);
  if (l.nouveau_lead && crm !== 'aucun') poser('crm_fiche', 'fiche_crm', base, { crm, cle_conversation: l.cle_conversation, cles_identite: l.cles_identite, libelle: l.libelle, courriel: l.courriel, telephone: l.telephone, source: l.canal, qualification: r ? r.chaleur : 'a_confirmer', score: r ? r.score : 0, besoin: l.corps, resume: 'Fiche ' + crm + ' pour un nouveau lead' });
  if (!r || r.canal_conseille === 'aucun') continue;
  if (r.canal_conseille === 'manychat') poser('manychat', 'message_manychat', base, { cle_conversation: l.cle_conversation, destinataire: l.courriel, flux: config.flux_manychat, texte: r.texte, resume: 'Flux ManyChat préparé' });
  if (r.canal_conseille === 'courriel' && outil !== 'aucun' && l.courriel) poser('sequence_' + outil, 'inscrire_sequence', base, { liste_id: config.liste_id, expediteur: config.expediteur_courriel, cles_identite: l.cles_identite, destinataire: l.courriel, libelle: l.libelle, objet: r.objet, texte: r.texte, chaleur: r.chaleur, resume: 'Inscription à la séquence ' + outil });
}
const cartes = plan.filter((p) => p.json.effet === 'carte').length;
if (cartes > 0 && ['slack', 'teams'].includes(config.outil_equipe) && leads.length) poser('prevenir_' + config.outil_equipe, 'prevenir_equipe', 'lot:' + leads[0].cle_idempotence, { texte: cartes + ' action(s) attendent une validation dans la plateforme.', canal_equipe: coupe(config.canal_alertes, 80), resume: 'Prévenir l’équipe' });
return plan;
`
const lierLeads = (leads, redac) => LEADS_CORPS.replace('LEADS', leads).replace('REDAC', redac)
export const LEADS_DECIDER = IDENTITE + DECIDER_DEBUT({ deposer_conversation: 3, indicateur_ads: 3, prevenir_equipe: 3, marquer_evenement: 3 }) + lierLeads(
  "$('Écarter les doublons').all().map((i) => i.json)", "new Map(($('Revalider le rédacteur').isExecuted ? $('Revalider le rédacteur').all() : []).map((i) => [i.json.cle_idempotence, i.json]))")
export const LEADS_PREVUS = IDENTITE + LEADS_NOTER + DECIDER_DEBUT({ deposer_conversation: 3, indicateur_ads: 3, prevenir_equipe: 3, marquer_evenement: 3 }) + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : ce que le modèle aurait rendu pour le lead d'exemple.
const ENREGISTREMENT = { canal_conseille: 'courriel', objet: 'Exemple. Merci pour votre demande', texte: 'Exemple. Bonjour, merci pour votre demande. Voici la suite proposée.' };
const regles = config.regles_score ?? {};
const leadsS = $('Écarter les doublons').all().map((i) => i.json);
const redacS = new Map(leadsS.filter((l) => !['rapport_ads', 'aimant'].includes(l.canal)).map((l) => { const n = noterLead(l, regles); return [l.cle_idempotence, { score: n.score, chaleur: n.chaleur, canal_conseille: ENREGISTREMENT.canal_conseille, objet: ENREGISTREMENT.objet, texte: ENREGISTREMENT.texte }]; }));
` + String.raw`const SIM = (() => { ` + lierLeads('leadsS', 'redacS') + String.raw` })();
return SIM.map((p) => ({ json: { ...p.json, simulation: true, effets_faits: [] } }));
`

// Désinscription et quota lus AVANT chaque envoi (email-brevo.md : quota vérifié, file du lendemain, jamais perdu).
export const CONTROLER_ENVOIS = String.raw`const plan = $('Garder les actions réservées').all().map((i) => i.json);
const org = plan[0]?.organisation_id;
const desinscrits = new Set();
for (const r of $('Lire les désinscrits').all().map((i) => i.json).filter((x) => x.organisation_id === org)) for (const k of (r.cles_identite ?? [])) desinscrits.add(k);
const regles = $('Lire les règles d’envoi').all().map((i) => i.json).find((x) => x.organisation_id === org) ?? {};
// Deux plafonds distincts : la prospection froide (séquences) et les relances de devis ne se partagent pas le quota (email-brevo.md).
const faits = {};
for (const i of $('Lire les envois du jour').all()) if (i.json && i.json.organisation_id === org && i.json.statut === 'faite') faits[i.json.type_action] = (faits[i.json.type_action] || 0) + 1;
const compte = $('Lire le quota du compte').first()?.json ?? {};
const credits = Number((compte.plan ?? []).find((p) => p && (p.creditsType === 'sendLimit' || p.type === 'sendLimit'))?.credits);
const plafondClient = Math.max(0, Math.floor(Number(regles.quota_jour ?? 0)));
const plafonds = { inscrire_sequence: Number.isFinite(credits) ? Math.min(plafondClient, Math.max(0, Math.floor(credits))) : plafondClient, relance_vente: Math.max(0, Math.floor(Number(regles.quota_relances_jour ?? 50))) };
const restes = {};
for (const t of Object.keys(plafonds)) restes[t] = Math.max(0, plafonds[t] - (faits[t] || 0));
const rendu = [];
for (const p of plan) {
  if (!p.type_action || !/^(sequence_|relance_|manychat)/.test(String(p.effet))) { rendu.push({ json: p }); continue; }
  if ((p.cles_identite ?? []).some((k) => desinscrits.has(k))) { rendu.push({ json: { ...p, effet: 'exclu', motif_exclusion: 'desinscrit' } }); continue; }
  if (restes[p.type_action] === undefined) { rendu.push({ json: p }); continue; }
  if (restes[p.type_action] <= 0) { rendu.push({ json: { ...p, effet: 'file_demain', pour_effet: p.effet, charge_demain: { ...p } } }); continue; }
  restes[p.type_action] -= 1;
  rendu.push({ json: p });
}
return rendu;
`

// ═════════════════════════════════════════════ gabarit-ent-ventes ══════════════════════════════════════════════════════════════
export const VENTES_EXEMPLE = String.raw`// Exemple. Deux opportunités fictives de la branche « simulation » : jamais une donnée réelle.
const ARO = String.fromCharCode(64);
return [
  { json: { source: 'exemple', ref: 'exemple-opp-001', etape: 'proposition_a_faire', libelle: 'Exemple. Client A', courriel: 'client-a' + ARO + 'exemple.invalid', telephone: '0600000001', besoin: 'Exemple. Deux interventions et une fourniture.', jours_sans_reponse: 0 } },
  { json: { source: 'exemple', ref: 'exemple-opp-002', etape: 'proposition_envoyee', libelle: 'Exemple. Client B', courriel: 'client-b' + ARO + 'exemple.invalid', telephone: '0600000002', besoin: 'Exemple. Proposition envoyée.', jours_sans_reponse: 6, montant_ttc_centimes: 120000 } },
];
`

export const VENTES_NORMALISER = IDENTITE + String.raw`const rendu = [];
const CRM_LUS = ['hubspot', 'pipedrive', 'salesforce', 'zoho', 'odoo', 'airtable', 'notion', 'monday'];
for (const it of $input.all()) {
  const e = it.json;
  let o = null;
  if (e.source === 'exemple') o = e;
  else if (CRM_LUS.includes(e.source)) {
    // Chaque CRM rend ses champs : le mapping (nom du champ de chaque CRM) est lu en configuration de la copie, jamais deviné ici.
    const m = $('Lire la configuration').first()?.json?.mapping_crm?.[e.source] ?? {};
    o = { ref: e[m.ref ?? 'id'], etape: (m.etapes ?? {})[e[m.etape ?? 'etape']] ?? e[m.etape ?? 'etape'], libelle: e[m.libelle ?? 'libelle'], courriel: e[m.courriel ?? 'courriel'], telephone: e[m.telephone ?? 'telephone'], besoin: e[m.besoin ?? 'besoin'], jours_sans_reponse: Number(e[m.jours ?? 'jours_sans_reponse'] ?? 0), montant_ttc_centimes: e[m.montant ?? 'montant_ttc_centimes'] };
  }
  if (!o || !o.ref) continue;
  rendu.push({ json: { source: String(e.source), ref: String(o.ref), cle_idempotence: propre('opp:' + o.ref), etape: String(o.etape ?? ''), libelle: coupe(o.libelle, 120), courriel: o.courriel ?? null, telephone: o.telephone ?? null,
    cles_identite: clesIdentite(o.courriel, o.telephone), besoin: coupe(o.besoin, 1500), jours_sans_reponse: Math.max(0, Math.floor(Number(o.jours_sans_reponse) || 0)), montant_ttc_centimes: Number.isInteger(o.montant_ttc_centimes) ? o.montant_ttc_centimes : null } });
}
return rendu;
`

export const VENTES_ROUTER = String.raw`const org = $('Réglages de la copie').first().json.organisation_id;
const mode = $('Lire la configuration').all().map((i) => i.json).find((c) => c.organisation_id === org) ?? {};
const joursRelance = Math.max(1, Math.floor(Number(mode.jours_avant_relance ?? 5)));
// Ce qui a déjà une action réservée (proposition ou relance de ce rang) ne repart pas au modèle : pas d'appel inutile, pas de doublon.
const vus = new Set($('Lire les clés déjà réservées').all().map((i) => i.json).filter((r) => r.organisation_id === org).map((r) => r.cle_idempotence));
const pris = (k) => vus.has(k) || vus.has(k + ':carte');
return $('Normaliser les opportunités').all().map((i) => {
  const o = i.json;
  const rang = Math.floor(o.jours_sans_reponse / joursRelance);
  return { json: { ...o, rang, a_proposer: o.etape === 'proposition_a_faire' && !pris(o.cle_idempotence + ':proposition_crm'), a_relancer: o.etape === 'proposition_envoyee' && rang >= 1 && rang <= 3 && !pris(o.cle_idempotence + ':r' + rang + ':relance_vente') } };
});
`

// Les montants viennent du CODE et du tarif du client : le modèle ne rend que des références de tarif et des quantités entières.
export const VENTES_MONTANTS = IDENTITE + GARDE_TEXTE + String.raw`const entrees = $('Entrées à proposer').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
const org = $('Réglages de la copie').first().json.organisation_id;
const TVA = [0, 2.1, 5.5, 10, 20];
const valide = (t) => Number.isSafeInteger(t.prix_ht_centimes) && t.prix_ht_centimes > 0 && t.tva_pct !== null && t.tva_pct !== '' && TVA.includes(Number(t.tva_pct));
const tarif = new Map($('Lire les tarifs').all().map((i) => i.json).filter((t) => t && t.organisation_id === org && t.ref_tarif && valide(t)).map((t) => [t.ref_tarif, t]));
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  const lignes = Array.isArray(s.lignes) ? s.lignes : [];
  if (lignes.length < 1 || lignes.length > 40) throw new Error('nombre de lignes hors schéma');
  let ht = 0, tva = 0, estime = false;
  const calculees = lignes.map((l) => {
    if (!Number.isInteger(l.quantite) || l.quantite < 1 || l.quantite > 100000) throw new Error('quantité hors schéma');
    const t = tarif.get(l.ref_tarif);
    if (!t) { estime = true; return { ref_tarif: String(l.ref_tarif).slice(0, 40), quantite: l.quantite, designation: coupe(l.designation, 160), ht_centimes: null }; }
    const ligneHt = Math.round(Number(t.prix_ht_centimes) * l.quantite);
    ht += ligneHt; tva += Math.round((ligneHt * Number(t.tva_pct)) / 100);
    return { ref_tarif: t.ref_tarif, quantite: l.quantite, designation: coupe(t.libelle_court, 160), ht_centimes: ligneHt };
  });
  return { json: { cle_idempotence: e.cle_idempotence, lignes: calculees, estime, total_ht_centimes: estime ? null : ht, total_tva_centimes: estime ? null : tva, total_ttc_centimes: estime ? null : ht + tva, introduction: verifierTexte(s.introduction, 900) } };
});
`

export const VENTES_REV_RELANCEUR = GARDE_TEXTE + String.raw`const entrees = $('Entrées à relancer').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
if (sorties.length !== entrees.length) throw new Error('nombre de sorties différent du nombre d’entrées');
const NOTES = ['froid', 'tiede', 'chaud'];
return sorties.map((s, i) => {
  const e = entrees[i];
  if (s.cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');
  if (!NOTES.includes(s.interet)) throw new Error('note d’intérêt hors schéma');
  if (typeof s.motif_interet !== 'string' || s.motif_interet.length > 200) throw new Error('motif hors schéma');
  return { json: { cle_idempotence: e.cle_idempotence, interet: s.interet, motif_interet: s.motif_interet, objet: verifierTexte(s.objet, 120), texte: verifierTexte(s.texte, 900) } };
});
`

const VENTES_CORPS = String.raw`const opps = OPPS;
const props = PROPS;
const rels = RELS;
const CRMS = ['hubspot', 'pipedrive', 'salesforce', 'zoho', 'odoo', 'airtable', 'notion', 'monday'];
const crm = CRMS.includes(config.crm_choisi) ? config.crm_choisi : 'aucun';
const signature = ['yousign', 'docusign'].includes(config.signature_outil) ? config.signature_outil : 'aucune';
const boite = config.boite_client === 'outlook' ? 'outlook' : 'gmail';
for (const o of opps) {
  const base = o.cle_idempotence;
  const p = props.get(base);
  if (p && crm !== 'aucun') {
    // Jamais un prix estimé sans l'humain : une proposition dont un tarif manque ne part que par une carte.
    poser('crm_proposition', 'proposition_crm', base, { crm, kind: 'proposition', ref_opportunite: o.ref, libelle: o.libelle, total_ttc_centimes: p.total_ttc_centimes, lignes: p.lignes, introduction: p.introduction, resume: 'Proposition dans ' + crm + (p.estime ? ' (prix estimé : validation obligatoire)' : '') }, p.estime);
    if (signature !== 'aucune') poser('signature_' + signature, 'demande_signature', base, { ref_opportunite: o.ref, libelle: o.libelle, destinataire: o.courriel, total_ttc_centimes: p.total_ttc_centimes, lignes: p.lignes, resume: 'Demande de signature ' + signature + (p.estime ? ' (prix estimé : validation obligatoire)' : '') }, p.estime);
  }
  const r = rels.get(base);
  if (r) {
    if (o.courriel) poser('relance_' + boite, 'relance_vente', base + ':r' + o.rang, { destinataire: o.courriel, cles_identite: o.cles_identite, objet: r.objet, texte: r.texte, resume: 'Relance de proposition' });
    if (crm !== 'aucun') poser('note_plateforme', 'note_interet', base, { ref_opportunite: o.ref, interet: r.interet, motif_interet: r.motif_interet, resume: 'Intérêt noté : ' + r.interet });
  }
}
const cartes = plan.filter((p) => p.json.effet === 'carte').length;
if (cartes > 0 && ['slack', 'teams'].includes(config.outil_equipe) && opps.length) poser('prevenir_' + config.outil_equipe, 'prevenir_equipe', 'lot:' + opps[0].cle_idempotence, { texte: cartes + ' action(s) attendent une validation dans la plateforme.', canal_equipe: coupe(config.canal_alertes, 80), resume: 'Prévenir l’équipe' });
return plan;
`
const lierVentes = (opps, props, rels) => VENTES_CORPS.replace('OPPS', opps).replace('PROPS', props).replace('RELS', rels)
export const VENTES_DECIDER = IDENTITE + DECIDER_DEBUT({ prevenir_equipe: 3, note_interet: 3 }) + lierVentes(
  "$('Router les opportunités').all().map((i) => i.json)",
  "new Map(($('Calculer les montants').isExecuted ? $('Calculer les montants').all() : []).map((i) => [i.json.cle_idempotence, i.json]))",
  "new Map(($('Revalider le relanceur').isExecuted ? $('Revalider le relanceur').all() : []).map((i) => [i.json.cle_idempotence, i.json]))")
export const VENTES_PREVUS = IDENTITE + DECIDER_DEBUT({ prevenir_equipe: 3, note_interet: 3 }) + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : ce que le modèle aurait rendu ; les montants sont calculés par le même code que le vrai.
const ENREGISTREMENT = { lignes: [{ ref_tarif: 'exemple-intervention', quantite: 2 }, { ref_tarif: 'exemple-fourniture', quantite: 1 }], introduction: 'Exemple. Voici notre proposition.', relance: { interet: 'tiede', motif_interet: 'Exemple. Une relance suffit.', objet: 'Exemple. Votre proposition', texte: 'Exemple. Bonjour, avez-vous pu regarder notre proposition ?' } };
const TVA = [0, 2.1, 5.5, 10, 20];
const valide = (t) => Number.isSafeInteger(t.prix_ht_centimes) && t.prix_ht_centimes > 0 && t.tva_pct !== null && t.tva_pct !== '' && TVA.includes(Number(t.tva_pct));
const tarif = new Map($('Lire les tarifs').all().map((i) => i.json).filter((t) => mien(t) && t.ref_tarif && valide(t)).map((t) => [t.ref_tarif, t]));
const oppsS = $('Router les opportunités').all().map((i) => i.json);
const propsS = new Map(oppsS.filter((o) => o.a_proposer).map((o) => {
  let ht = 0, tva = 0, estime = false;
  const lignes = ENREGISTREMENT.lignes.map((l) => { const t = tarif.get(l.ref_tarif); if (!t) { estime = true; return { ref_tarif: l.ref_tarif, quantite: l.quantite, designation: '', ht_centimes: null }; } const h = Math.round(Number(t.prix_ht_centimes) * l.quantite); ht += h; tva += Math.round((h * Number(t.tva_pct)) / 100); return { ref_tarif: l.ref_tarif, quantite: l.quantite, designation: coupe(t.libelle_court, 160), ht_centimes: h }; });
  return [o.cle_idempotence, { estime, lignes, introduction: ENREGISTREMENT.introduction, total_ttc_centimes: estime ? null : ht + tva }];
}));
const relsS = new Map(oppsS.filter((o) => o.a_relancer).map((o) => [o.cle_idempotence, ENREGISTREMENT.relance]));
` + String.raw`const SIM = (() => { ` + lierVentes('oppsS', 'propsS', 'relsS') + String.raw` })();
return SIM.map((p) => ({ json: { ...p.json, simulation: true, effets_faits: [] } }));
`

// ═════════════════════════════════════════════ gabarit-ent-marketing ═══════════════════════════════════════════════════════════
export const MKT_EXEMPLE = String.raw`// Exemple. Brief fictif de la branche « simulation » : jamais un contenu réel.
return [{ json: { source: 'brief', ref: 'exemple-brief-001', format: 'post_image', reseaux: ['instagram', 'facebook', 'linkedin'], sujet: 'Exemple. Présenter le savoir-faire de l’équipe', image_url: 'https://exemple.invalid/image.jpg' } }];
`

export const MKT_NORMALISER = String.raw`const rendu = [];
const FORMATS = ['post_image', 'carrousel', 'video_courte', 'texte'];
const RESEAUX = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x'];
const sur = (s) => String(s).replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 120);
const lus = [];
const compteurs = {};
for (const it of $input.all()) { const e = it.json; const liste = (e.source === 'facebook' || e.source === 'instagram') && Array.isArray(e.data) ? e.data : null; if (liste) for (const x of liste) lus.push({ ...x, source: e.source }); else lus.push(e); }
for (const e of lus) {
  if (e.source === 'brief' || e.source === 'exemple') {
    if (!e.ref || !FORMATS.includes(e.format)) continue;
    rendu.push({ json: { genre: 'brief', cle_idempotence: sur('brief:' + e.ref), format: e.format, reseaux: (Array.isArray(e.reseaux) ? e.reseaux : []).filter((r) => RESEAUX.includes(r)), sujet: String(e.sujet ?? '').slice(0, 300), image_url: e.image_url ?? null, video_id: e.video_id ?? null } });
  } else if (e.source === 'facebook' || e.source === 'instagram') {
    for (const c of (e.comments?.data ?? [])) {
      if (!c.id) continue;
      rendu.push({ json: { genre: 'commentaire', cle_idempotence: sur('commentaire:' + e.source + ':' + c.id), reseau: e.source, commentaire_id: String(c.id), texte_recu: String(c.text ?? c.message ?? '').replace(/\s+/g, ' ').trim().slice(0, 600) } });
    }
  } else if (e.source === 'youtube' || e.source === 'x') {
    compteurs[e.source] = (compteurs[e.source] || 0) + 1;
  } else if (['googleads', 'tiktok'].includes(e.source)) {
    // Des comptes seulement, jamais un profil ni un nom : le rapport du jour ne garde que des nombres.
    const nombre = (v) => Math.max(0, Math.floor(Number(v) || 0));
    const indicateur = e.source === 'googleads' ? { cout_micros: nombre(e.metrics?.cost_micros), clics: nombre(e.metrics?.clicks) } : { abonnes: nombre(e.data?.user?.follower_count) };
    rendu.push({ json: { genre: 'rapport', cle_idempotence: sur('rapport:' + e.source + ':' + (e.id ?? e.campaign?.id ?? 'jour') + ':' + new Date().toISOString().slice(0, 10)), reseau: e.source, indicateur } });
  }
}
// YouTube et X : un seul rapport par jour, un nombre d'éléments vus (jamais un profil ni un nom).
for (const [reseau, n] of Object.entries(compteurs)) rendu.push({ json: { genre: 'rapport', cle_idempotence: sur('rapport:' + reseau + ':jour:' + new Date().toISOString().slice(0, 10)), reseau, indicateur: { elements: n } } });
return rendu;
`

export const MKT_ECARTER = String.raw`const org = $('Réglages de la copie').first().json.organisation_id;
const vus = $('Lire les clés déjà réservées').all().map((i) => i.json).filter((r) => r.organisation_id === org && r.cle_idempotence).map((r) => r.cle_idempotence);
const traite = (k) => vus.some((v) => v.startsWith(k + ':'));
// Un brief ou un commentaire qui a déjà une action réservée ne repart pas au modèle ; un rapport est daté du jour.
return $('Normaliser les entrées').all().filter((i) => i.json.genre === 'rapport' || !traite(i.json.cle_idempotence));
`

// Contrôle qualité d'un contenu avant tout : longueur par réseau, nom de la plateforme, prix, lien étranger, hashtags. Une anomalie impose la validation.
export const MKT_REV_REDACTEUR = GARDE_TEXTE.replace('const verifierTexte', 'const verifierTexteStrict') + String.raw`const LIMITES = { instagram: 2200, facebook: 5000, linkedin: 3000, tiktok: 2200, youtube: 5000, x: 280 };
const entrees = $('Entrées à rédiger').all().map((i) => i.json);
const sorties = $input.all().map((i) => i.json.output ?? {});
// Jamais d'exception ici : une sortie manquante ou hors ordre devient une anomalie, donc une carte (sinon l'élément reviendrait à chaque relève).
return entrees.map((e, i) => {
  const s = sorties[i] && sorties[i].cle_idempotence === e.cle_idempotence ? sorties[i] : null;
  const anomalies = [];
  const textes = {};
  if (!s) anomalies.push('sortie du modèle absente ou hors ordre');
  if (e.genre === 'brief') {
    for (const r of e.reseaux) {
      const t = s?.textes?.[r];
      try { textes[r] = verifierTexteStrict(t, LIMITES[r]); } catch (err) { anomalies.push(r + ' : ' + err.message); textes[r] = ''; }
      if (typeof t === 'string' && /https?:\/\//i.test(t)) anomalies.push(r + ' : lien dans le texte');
      if (typeof t === 'string' && (t.match(/#\w+/g) ?? []).length > 10) anomalies.push(r + ' : trop de hashtags');
    }
  } else {
    try { textes[e.reseau] = verifierTexteStrict(s?.reponse, e.reseau === 'instagram' ? 2200 : 8000); } catch (err) { anomalies.push(e.reseau + ' : ' + err.message); textes[e.reseau] = ''; }
  }
  return { json: { cle_idempotence: e.cle_idempotence, genre: e.genre, textes, anomalies, qa_ok: anomalies.length === 0 } };
});
`

const MKT_CORPS = String.raw`const lignes = ENTREES;
const redac = REDAC;
const formats = new Map($('Lire les formats validés').all().map((i) => i.json).filter((f) => mien(f) && f.format).map((f) => [f.format, f]));
const requises = Math.min(3, Math.max(2, Math.floor(Number(config.validations_requises ?? 3))));
const VALIDES = (format) => { const f = formats.get(format); return !!f && Number(f.validations_positives) >= requises && f.ecart_qa !== true; };
const LANES = { instagram: 'publier_instagram', facebook: 'publier_facebook', linkedin: 'publier_linkedin', tiktok: 'publier_tiktok', youtube: 'publier_youtube', x: 'publier_x' };
const ESCALADE = /litige|sinistre|menace|avocat|assureur|huissier|plainte|mise en demeure|arnaque/i;
// Ce que chaque voie automatique sait publier : tout autre format part en carte (« format non géré »), jamais en publication bancale.
const FORMATS_AUTO = { instagram: ['post_image'], facebook: ['post_image', 'texte'], linkedin: ['post_image', 'texte'], tiktok: ['post_image'], youtube: ['video_courte'], x: ['texte', 'post_image'] };
for (const e of lignes) {
  if (e.genre === 'rapport') { poser('indicateur', 'indicateur_ads', e.cle_idempotence, { indicateur: e.indicateur, reseau: e.reseau, resume: 'Rapport ' + e.reseau }); continue; }
  const r = redac.get(e.cle_idempotence);
  if (!r) continue;
  const anomalie = r.anomalies && r.anomalies.length ? ' — ANOMALIE : ' + r.anomalies.join(' ; ') : '';
  if (e.genre === 'brief') {
    for (const reseau of e.reseaux) {
      // Tout ce qui se publie passe par la validation d'équipe tant que les 2-3 premiers contenus du format ne sont pas validés, ou si la QA voit une anomalie.
      const sansImage = ['instagram', 'tiktok'].includes(reseau) && !e.image_url;
      const sansVideo = reseau === 'youtube' && !e.video_id;
      const formatNonGere = !(FORMATS_AUTO[reseau] ?? []).includes(e.format) || sansImage || sansVideo;
      const exigeHumain = !VALIDES(e.format) || !r.qa_ok || formatNonGere;
      const texte = r.textes[reseau] ?? '';
      poser(LANES[reseau], 'publier_' + reseau, e.cle_idempotence, { reseau, format: e.format, texte, image_url: e.image_url, video_id: e.video_id, a_corriger: !texte || !r.qa_ok, resume: 'Publication ' + reseau + ' (' + e.format + ')' + (formatNonGere ? ' — format non géré par la voie automatique' : '') + anomalie + (exigeHumain ? ' : validation d’équipe' : '') }, exigeHumain);
    }
  } else if (e.genre === 'commentaire') {
    const texte = r.textes[e.reseau] ?? '';
    poser('repondre_commentaire_' + e.reseau, 'repondre_commentaire', e.cle_idempotence, { reseau: e.reseau, commentaire_id: e.commentaire_id, texte, a_corriger: !texte || !r.qa_ok, resume: 'Réponse à un commentaire ' + e.reseau + anomalie }, !r.qa_ok || !texte || ESCALADE.test(e.texte_recu ?? ''));
  }
}
const cartes = plan.filter((p) => p.json.effet === 'carte');
for (const c of cartes) {
  if (c.json.statut_carte !== 'a_valider' || !['slack', 'teams'].includes(config.outil_equipe)) continue;
  plan.push({ json: { effet: 'valider_' + config.outil_equipe, type_action: 'validation_equipe', mode: 'auto', organisation_id: org, entreprise, cle_idempotence: c.json.cle_idempotence + ':equipe', carte_a_valider: c.json.cle_idempotence, texte: c.json.resume + (c.json.charge && c.json.charge.texte ? '\n\n' + c.json.charge.texte : ''), perimetre: c.json.perimetre, canal_equipe: c.json.canal_equipe, approbateurs_roles: c.json.approbateurs_roles } });
}
return plan;
`
const lierMkt = (entrees, redac) => MKT_CORPS.replace('ENTREES', entrees).replace('REDAC', redac)
export const MKT_DECIDER = IDENTITE + DECIDER_DEBUT({ indicateur_ads: 3, validation_equipe: 3 }).replace("const org = $('Réglages de la copie').first().json.organisation_id;", "const org = $('Réglages de la copie').first().json.organisation_id;") + lierMkt(
  "$('Écarter ce qui est déjà traité').all().map((i) => i.json)", "new Map(($('Revalider le rédacteur').isExecuted ? $('Revalider le rédacteur').all() : []).map((i) => [i.json.cle_idempotence, i.json]))")
export const MKT_PREVUS = IDENTITE + DECIDER_DEBUT({ indicateur_ads: 3, validation_equipe: 3 }) + String.raw`// Enregistrement du 03/11/2026 (Exemple.) : ce que le modèle aurait rendu pour le brief d'exemple.
const ENREGISTREMENT = { instagram: 'Exemple. Une journée avec l’équipe sur un chantier.', facebook: 'Exemple. Une journée avec l’équipe sur un chantier.', linkedin: 'Exemple. Retour sur un projet mené avec l’équipe.' };
const lignesS = $('Écarter ce qui est déjà traité').all().map((i) => i.json);
const redacS = new Map(lignesS.filter((e) => e.genre === 'brief').map((e) => [e.cle_idempotence, { textes: Object.fromEntries(e.reseaux.map((r) => [r, ENREGISTREMENT[r]])), qa_ok: true }]));
` + String.raw`const SIM = (() => { ` + lierMkt('lignesS', 'redacS') + String.raw` })();
return SIM.map((p) => ({ json: { ...p.json, simulation: true, effets_faits: [] } }));
`
