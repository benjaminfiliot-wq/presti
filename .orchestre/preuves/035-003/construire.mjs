// 035-003 — fabrique du socle `lib-*` : le code des nœuds (gabarit « Contrat » compris) et le code SDK n8n de chaque workflow.
// Hors ligne. Écrit les programmes SDK dans un dossier temporaire (argument 1, défaut /tmp/lib-socle) ; ils sont collés tels quels
// dans le MCP `n8n-oracle` (validate_workflow, puis create_workflow_from_code). Aucun réseau, aucune base, aucune donnée réelle.
//   node .orchestre/preuves/035-003/construire.mjs [/tmp/lib-socle]
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

// ─── Le gabarit « Contrat » (PR § 5.5, première ligne du tableau ; FM § 3.3) ────────────────────────────────────────────────
// Un gabarit de NŒUD Code, et non un sous-workflow. Au-dessus du repère : deux lignes propres à l'enfant (CONTRAT, SCHEMA) ; en
// dessous, un corps identique dans chaque enfant, dont le juge scripts/lib-socle-n8n-qa.mjs tient l'empreinte.
export const REPERE_ENTREE = "// ─── Gabarit « Contrat d'entrée » 035-003 : au-dessus, CONTRAT et SCHEMA seulement ; en dessous, le corps commun (empreinte tenue par le juge) ───"
export const CORPS_ENTREE = String.raw`
const REQUIS = ['contrat', 'organisation_id', 'simulation', 'cle_idempotence', 'trace', 'config', 'donnees'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;
const COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const TELEPHONE = /(\+33|0033|\b0)\s?[1-9]([ .-]?\d{2}){4}\b/;
const typeDe = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
function valider(v, s, ch, err) {
  if (!s || err.length >= 20) return;
  if (s.type) {
    const t = typeDe(v);
    if (![].concat(s.type).some((x) => x === t || (x === 'number' && t === 'integer'))) { err.push(ch + ' : ' + [].concat(s.type).join(' ou ') + ' attendu'); return; }
  }
  if ('const' in s && v !== s.const) err.push(ch + ' : valeur imposée non respectée');
  if (s.enum && !s.enum.includes(v)) err.push(ch + ' : valeur hors liste');
  if (typeof v === 'string') {
    if (s.minLength !== undefined && v.length < s.minLength) err.push(ch + ' : moins de ' + s.minLength + ' caractère(s)');
    if (s.maxLength !== undefined && v.length > s.maxLength) err.push(ch + ' : plus de ' + s.maxLength + ' caractères');
    if (s.pattern && !new RegExp(s.pattern).test(v)) err.push(ch + ' : forme invalide');
    if (s.format === 'uuid' && !UUID.test(v)) err.push(ch + ' : uuid attendu');
    if (s.format === 'date-time' && (!DATE.test(v) || isNaN(Date.parse(v)))) err.push(ch + ' : date-heure ISO attendue');
  }
  if (typeof v === 'number') {
    if (s.minimum !== undefined && v < s.minimum) err.push(ch + ' : inférieur à ' + s.minimum);
    if (s.maximum !== undefined && v > s.maximum) err.push(ch + ' : supérieur à ' + s.maximum);
  }
  if (Array.isArray(v)) {
    if (s.maxItems !== undefined && v.length > s.maxItems) { err.push(ch + ' : plus de ' + s.maxItems + ' éléments'); return; }
    if (s.items) v.forEach((x, i) => valider(x, s.items, ch + '[' + i + ']', err));
  }
  if (typeDe(v) === 'object') {
    for (const k of s.required || []) if (!(k in v)) err.push(ch + '.' + k + ' : manquant');
    if (s.additionalProperties === false) for (const k of Object.keys(v)) if (!(s.properties || {})[k]) err.push(ch + '.' + k + ' : champ hors contrat');
    for (const [k, sk] of Object.entries(s.properties || {})) if (k in v) valider(v[k], sk, ch + '.' + k, err);
  }
}
function chaines(v, sortie) {
  if (typeof v === 'string') sortie.push(v);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) chaines(x, sortie);
  return sortie;
}
const ENVELOPPE = {
  type: 'object', additionalProperties: false, required: REQUIS,
  properties: {
    contrat: { type: 'string', const: CONTRAT },
    organisation_id: { type: 'string', format: 'uuid' },
    simulation: { type: 'boolean' },
    cle_idempotence: { type: 'string', minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9_:@.#-]+$' },
    trace: { type: 'object', required: ['execution_parent', 'declencheur', 'tentative'] },
    config: SCHEMA.config || { type: 'object' },
    donnees: SCHEMA.donnees || { type: 'object' },
  },
};
return $input.all().map((item) => {
  const e = item.json || {};
  const err = [];
  valider(e, ENVELOPPE, 'entrée', err);
  if (!err.length && SCHEMA.sans_contact === true && chaines([e.config, e.donnees], []).some((t) => COURRIEL.test(t) || TELEPHONE.test(t))) err.push('entrée : adresse e-mail ou téléphone interdits (aucune donnée personnelle dans ce gabarit)');
  if (err.length) {
    const cle = typeof e.cle_idempotence === 'string' && /^[A-Za-z0-9_:@.#-]{1,80}$/.test(e.cle_idempotence) ? e.cle_idempotence : '';
    return { json: { conforme: false, enveloppe: { contrat: CONTRAT, simulation: true, cle_idempotence: cle }, erreurs: err.slice(0, 20) } };
  }
  return { json: { conforme: true, enveloppe: e, erreurs: [] } };
});`

export const REPERE_SORTIE = '// ─── Gabarit « Contrat de sortie » 035-003 : au-dessus, CONTRAT seulement ; en dessous, le corps commun (empreinte tenue par le juge) ───'
export const CORPS_SORTIE = String.raw`
const STATUTS = ['ok', 'rien_a_faire', 'rejete', 'refuse', 'erreur'];
const liste = (x) => Array.isArray(x) ? x : [];
return $input.all().map((item) => {
  const j = item.json || {};
  const e = j.enveloppe && typeof j.enveloppe === 'object' ? j.enveloppe : {};
  const simulation = e.simulation !== false;
  const rejete = j.conforme === false;
  const statut = rejete ? 'rejete' : STATUTS.includes(j.statut) ? j.statut : 'erreur';
  const journal = liste(j.journal).slice(0, 200);
  if (rejete) journal.push({ evenement: 'contrat_rejete', agent: CONTRAT, objet_ref: null, decision: 'entrée hors contrat : aucun effet', simulation: simulation });
  return { json: {
    'contrat': CONTRAT,
    'statut': statut,
    'cle_idempotence': typeof e.cle_idempotence === 'string' ? e.cle_idempotence.slice(0, 80) : '',
    'simulation': simulation,
    'resultat': rejete || statut === 'erreur' ? null : (j.resultat && typeof j.resultat === 'object' ? j.resultat : null),
    'effets_prevus': rejete ? [] : liste(j.effets_prevus),
    'effets_faits': simulation || rejete ? [] : liste(j.effets_faits),
    'journal': journal,
    'erreurs': liste(j.erreurs).map(String).slice(0, 20),
  } };
});`

export const codeEntree = (contrat, schema) => `// Contrat d'entrée de ${contrat} (enveloppe@1, PR § 5.5). Hors contrat : statut « rejete », une ligne de journal, aucun effet.\nconst CONTRAT = '${contrat}';\nconst SCHEMA = ${JSON.stringify(schema)};\n${REPERE_ENTREE}${CORPS_ENTREE}`
export const codeSortie = (contrat) => `// Contrat de sortie de ${contrat} : le seul nœud final ; effets_faits reste vide en simulation.\nconst CONTRAT = '${contrat}';\n${REPERE_SORTIE}${CORPS_SORTIE}`

// ─── SHA-256 écrit à la main (aucun module dans un nœud Code : R19) ; le juge le compare à node:crypto ───────────────────────
const SHA256 = String.raw`function sha256(texte) {
  const o = [];
  for (const car of String(texte)) {
    const c = car.codePointAt(0);
    if (c < 0x80) o.push(c);
    else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  const K = [], H = [];
  for (let n = 2; K.length < 64; n++) {
    let premier = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { premier = false; break; }
    if (premier) { if (H.length < 8) H.push(((Math.sqrt(n) % 1) * 4294967296) | 0); K.push(((Math.cbrt(n) % 1) * 4294967296) | 0); }
  }
  const l = o.length * 8;
  o.push(0x80);
  while (o.length % 64 !== 56) o.push(0);
  for (let i = 7; i >= 0; i--) o.push(i >= 4 ? 0 : (l >>> (i * 8)) & 255);
  const r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let i = 0; i < o.length; i += 64) {
    const w = [];
    for (let t = 0; t < 64; t++) {
      if (t < 16) w[t] = (o[i + 4 * t] << 24) | (o[i + 4 * t + 1] << 16) | (o[i + 4 * t + 2] << 8) | o[i + 4 * t + 3];
      else w[t] = (w[t - 16] + (r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3)) + w[t - 7] + (r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10))) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    const v = [a, b, c, d, e, f, g, h];
    for (let k = 0; k < 8; k++) H[k] = (H[k] + v[k]) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}`

// ─── La logique de chaque gabarit (après la porte « simulation », sortie « vrai ») ──────────────────────────────────────────
const LOGIQUE = {
  'lib-dedoublonner': ['Calculer la clé', String.raw`// lib-dedoublonner (PR § 5.5) : clé (organisation, type, objet, étape), condensée au-delà de 80 caractères ; « déjà fait » si elle est connue.
// Mode A : les clés connues viennent de config.cles_connues (lues par l'appelant, épinglées) ; rien n'est lu ni écrit en base.
// La vraie garde reste la contrainte unique à l'écriture (lib-executer, table à naître au « go » de Benj).
` + SHA256 + String.raw`
const MAX = 80;
const vues = new Set();
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe, d = e.donnees;
    const brute = [e.organisation_id, d.type, d.objet_id, d.etape].join(':');
    const cle = brute.length <= MAX ? brute : 'h:' + d.type.slice(0, 24) + ':' + sha256(brute).slice(0, 48);
    const connues = new Set(Array.isArray(e.config.cles_connues) ? e.config.cles_connues : []);
    const deja = connues.has(cle) || vues.has(cle);
    vues.add(cle);
    return { json: { ...j, statut: deja ? 'rien_a_faire' : 'ok', resultat: { cle: cle, deja_fait: deja },
      effets_prevus: deja ? [] : [{ effet: 'reserver_cle', organisation_id: e.organisation_id, cle: cle }],
      journal: [{ evenement: 'dedoublonnage', agent: 'lib-dedoublonner', objet_ref: d.objet_id, decision: deja ? 'déjà fait : rien à refaire' : 'clé neuve : réservation prévue', simulation: e.simulation }] } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, erreurs: ['calcul de la clé : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`],
  'lib-journaliser': ['Préparer les lignes', String.raw`// lib-journaliser (PR § 5.5) : une ligne par décision, appel de modèle, envoi ou refus ; une clé par ligne (le rejeu ne double rien).
// Mode A : le journal est la sortie de l'exécution et l'export ; l'insertion en base reste un effet prévu (table à naître).
// Un coût sans source de tarif est remis à null : jamais une estimation déguisée.
` + SHA256 + String.raw`
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe;
    const racine = sha256(e.organisation_id + '|' + e.cle_idempotence).slice(0, 48);
    const avis = [];
    const lignes = e.donnees.entrees.map((x, i) => {
      const simulation = e.simulation === true || x.simulation === true;
      const sansSource = x.cout_eur !== undefined && x.cout_eur !== null && !x.source_tarif;
      if (sansSource) avis.push('entrée ' + i + ' : coût sans source de tarif, remis à null');
      return {
        organisation_id: e.organisation_id, cle: 'j:' + racine + ':' + i, evenement: x.evenement, agent: x.agent,
        objet_ref: x.objet_ref === undefined ? null : x.objet_ref,
        decision: (simulation ? '[simulation] aurait été fait : ' : '') + x.decision,
        modele: x.modele === undefined ? null : x.modele,
        jetons_entree: Number.isInteger(x.jetons_entree) ? x.jetons_entree : null,
        jetons_sortie: Number.isInteger(x.jetons_sortie) ? x.jetons_sortie : null,
        cout_eur: sansSource || typeof x.cout_eur !== 'number' ? null : x.cout_eur,
        source_tarif: sansSource ? null : (x.source_tarif === undefined ? null : x.source_tarif),
        simulation: simulation,
      };
    });
    return { json: { ...j, statut: lignes.length ? 'ok' : 'rien_a_faire', resultat: { ecrites: lignes.length },
      effets_prevus: lignes.length ? [{ effet: 'inserer_journal', organisation_id: e.organisation_id, lignes: lignes.length, cles: lignes.map((l) => l.cle) }] : [],
      journal: lignes, erreurs: avis } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, erreurs: ['journal : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`],
  'lib-alerter': ['Regrouper et rédiger', String.raw`// lib-alerter (PR § 5.5) : un texte minimal (catégorie, workflow, lien de l'exécution) ; une alerte par organisation, workflow et
// catégorie dans une fenêtre glissante de 5 minutes. Rien d'autre n'entre dans le texte : ni secret, ni donnée de client.
// Mode A : n'envoie rien ; l'alerte part dans effets_prevus. Les envois récents viennent de config.alertes_recentes (épinglés).
const FENETRE = 5 * 60 * 1000;
const NOM = /^(lib|ent|gabarit|presti)-[a-z0-9-]{1,60}$/;
const LIEN = /^https?:\/\/[A-Za-z0-9.-]{1,80}(:\d{2,5})?\/workflow\/[A-Za-z0-9]{6,64}\/executions\/\d{1,12}$/;
const CANAUX = { benj: ['slack:#presti-auto', 'telegram:benj'], titulaire: ['console:titulaire'], associe: ['console:associe'], administratif: ['console:administratif'] };
const LIBELLES = { workflow_en_panne: 'Workflow en panne', disjoncteur_ouvert: 'Disjoncteur ouvert', cout_qui_derive: 'Coût qui dérive', demande_qui_stagne: 'Demande qui stagne', client_qui_decroche: 'Client qui décroche', echeance_proche: 'Échéance proche', stock_bas: 'Stock bas', battement_absent: 'Battement absent' };
const items = $input.all().map((item, i) => {
  const j = item.json, e = j.enveloppe, d = e.donnees;
  const t = Date.parse(d.survenue_le || '');
  return { j: j, i: i, t: isNaN(t) ? Date.now() : t, workflow: NOM.test(d.workflow) ? d.workflow : 'workflow hors liste', n: 0, chef: null };
});
const derniers = new Map();
for (const x of [...items].sort((a, b) => a.t - b.t || a.i - b.i)) {
  const e = x.j.enveloppe, d = e.donnees;
  const k = e.organisation_id + '|' + x.workflow + '|' + d.categorie;
  if (!derniers.has(k)) {
    for (const r of Array.isArray(e.config.alertes_recentes) ? e.config.alertes_recentes : []) {
      const t = Date.parse(r.envoyee_le);
      if (r.workflow === x.workflow && r.categorie === d.categorie && !isNaN(t) && t <= x.t && (!derniers.has(k) || derniers.get(k).t < t)) derniers.set(k, { t: t, chef: null });
    }
  }
  const prec = derniers.get(k);
  if (prec && x.t - prec.t < FENETRE) { x.chef = prec.chef; if (prec.chef) prec.chef.n++; }
  else { x.chef = x; x.n = 1; derniers.set(k, { t: x.t, chef: x }); }
}
return items.map((x) => {
  const e = x.j.enveloppe, d = e.donnees;
  if (x.chef !== x) return { json: { ...x.j, statut: 'rien_a_faire', resultat: { envoyee: false, regroupees: 0 }, effets_prevus: [],
    journal: [{ evenement: 'alerte_regroupee', agent: 'lib-alerter', objet_ref: null, decision: 'même workflow et même catégorie depuis moins de 5 min : regroupée', simulation: e.simulation }] } };
  const lien = typeof d.lien_execution === 'string' && LIEN.test(d.lien_execution) ? d.lien_execution : null;
  const texte = ('[' + LIBELLES[d.categorie] + '] ' + x.workflow + (lien ? ' · exécution : ' + lien : '') + (x.n > 1 ? ' · ' + x.n + ' occurrences en 5 min' : '')).slice(0, 300);
  return { json: { ...x.j, statut: 'ok', resultat: { envoyee: false, regroupees: x.n },
    effets_prevus: [{ effet: 'envoyer_alerte', organisation_id: e.organisation_id, canaux: CANAUX[d.destinataire_role], texte: texte }],
    journal: [{ evenement: 'alerte', agent: 'lib-alerter', objet_ref: null, decision: 'alerte ' + d.categorie + ' prévue (' + x.n + ' occurrence(s))', simulation: e.simulation }] } };
});`],
  'lib-disjoncteur': ['Compter les échecs', String.raw`// lib-disjoncteur (PR § 5.5 ; FM § 3.6) : coupé seul après N échecs de suite (config.seuil, 3 par défaut chez l'appelant) ; un succès
// remet le compteur à zéro ; un disjoncteur ouvert ne se referme qu'à la main (console ou Benj), jamais ici.
// Mode A : l'état précédent vient de donnees.etat_precedent (lu par l'appelant, épinglé) ; l'état prévu part dans effets_prevus.
const etats = new Map();
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe, d = e.donnees, seuil = e.config.seuil;
    const k = e.organisation_id + '|' + d.agent;
    const p = d.etat_precedent || {};
    const avant = etats.get(k) || { etat: p.etat === 'ouvert' ? 'ouvert' : 'ferme', echecs_consecutifs: Number.isInteger(p.echecs_consecutifs) ? p.echecs_consecutifs : 0 };
    const n = d.issue === 'succes' ? 0 : avant.echecs_consecutifs + 1;
    const apres = { etat: avant.etat === 'ouvert' || (d.issue === 'echec' && n >= seuil) ? 'ouvert' : 'ferme', echecs_consecutifs: n };
    etats.set(k, apres);
    const coupe = avant.etat === 'ferme' && apres.etat === 'ouvert';
    const effets = [{ effet: 'maj_disjoncteur', organisation_id: e.organisation_id, agent: d.agent, etat: apres.etat, echecs_consecutifs: apres.echecs_consecutifs }];
    if (coupe) effets.push({ effet: 'alerter', contrat: 'lib-alerter@1', donnees: { categorie: 'disjoncteur_ouvert', workflow: d.agent, lien_execution: null, destinataire_role: 'benj' } });
    return { json: { ...j, statut: 'ok', resultat: apres, effets_prevus: effets,
      journal: [{ evenement: 'disjoncteur', agent: d.agent, objet_ref: null, decision: (coupe ? 'coupé : ' : '') + d.issue + ', ' + n + ' échec(s) de suite, état ' + apres.etat, simulation: e.simulation }] } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, erreurs: ['disjoncteur : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`],
  'lib-battement': ['Battre ou contrôler', String.raw`// lib-battement (PR § 5.5 ; p5:255) : « battre » note le passage d'un parent ; « contrôler » cherche les parents muets depuis
// config.silence_max_h (26 h par défaut) et ne lève qu'UNE alerte par silence (une alerte déjà levée après le dernier battement suffit).
// Mode A : n'écrit rien ; les battements lus viennent de donnees.battements (épinglés), le battement et l'alerte partent dans effets_prevus.
const HEURE = 3600 * 1000;
const levees = new Set();
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe, d = e.donnees;
    const maintenant = Date.parse(d.passe_le);
    const silence = (Number.isInteger(e.config.silence_max_h) ? e.config.silence_max_h : 26) * HEURE;
    if ((d.operation || 'battre') === 'battre') {
      return { json: { ...j, statut: 'ok', resultat: { ecrit: false, operation: 'battre' },
        effets_prevus: [{ effet: 'ecrire_battement', organisation_id: e.organisation_id, workflow: d.workflow, passe_le: d.passe_le }],
        journal: [{ evenement: 'battement', agent: d.workflow, objet_ref: null, decision: 'battement prévu', simulation: e.simulation }] } };
    }
    const muets = [], effets = [];
    for (const b of Array.isArray(d.battements) ? d.battements : []) {
      const dernier = b.dernier_le ? Date.parse(b.dernier_le) : NaN;
      if (!(isNaN(dernier) || maintenant - dernier >= silence)) continue;
      muets.push(b.workflow);
      const levee = b.alerte_levee_le ? Date.parse(b.alerte_levee_le) : NaN;
      const k = e.organisation_id + '|' + b.workflow;
      if ((!isNaN(levee) && (isNaN(dernier) || levee >= dernier)) || levees.has(k)) continue;
      levees.add(k);
      effets.push({ effet: 'alerter', contrat: 'lib-alerter@1', donnees: { categorie: 'battement_absent', workflow: b.workflow, lien_execution: null, destinataire_role: 'benj', survenue_le: d.passe_le } });
      effets.push({ effet: 'noter_alerte_levee', organisation_id: e.organisation_id, workflow: b.workflow, alerte_levee_le: d.passe_le });
    }
    const alertes = effets.filter((x) => x.effet === 'alerter').length;
    return { json: { ...j, statut: alertes ? 'ok' : 'rien_a_faire', resultat: { ecrit: false, operation: 'controler', muets: muets, alertes: alertes }, effets_prevus: effets,
      journal: [{ evenement: 'controle_battements', agent: d.workflow, objet_ref: null, decision: muets.length + ' muet(s), ' + alertes + ' alerte(s) prévue(s)', simulation: e.simulation }] } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, erreurs: ['battement : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`],
}

// ─── lib-erreur-commune : le workflow d'erreur (Error Trigger), son diagnostic et ses effets prévus ─────────────────────────────
export const CODE_DIAGNOSTIC = String.raw`// lib-erreur-commune (PR § 5.5 ; FM § 3.6) : diagnostic en 7 catégories et masquage. Le message brut ne sort jamais de ce nœud :
// seule sa version masquée (300 caractères au plus) est rendue, avec le nom du workflow, le nœud, le numéro et le lien de l'exécution.
// Mode A : SIMULATION vaut vrai ; elle ne passe à faux qu'au « go » de Benj, avec la table et l'identifiant Telegram dans n8n.
const SIMULATION = true;
const CONTRAT = 'lib-erreur-commune@1';
const CATEGORIES = [
  ['authentification', /\b40[13]\b|unauthori[sz]ed|forbidden|authenticat|credential|identifiant|jwt|invalid api key|permission denied/i],
  ['quota', /\b429\b|rate.?limit|quota|too many requests/i],
  ['delai', /timed? ?out|timeout|ETIMEDOUT|ESOCKETTIMEDOUT|délai dépassé|deadline/i],
  ['reseau', /ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|socket hang up|network|réseau|\b50[234]\b|bad gateway|service unavailable/i],
  ['entree_invalide', /contrat|schema|schéma|invalid input|validation|\b4(00|22)\b|bad request|hors contrat/i],
  ['expression', /ExpressionError|expression|cannot read propert|is not defined|referenced node|paired item/i],
];
const ETAPES = {
  authentification: "Vérifier l'identifiant du nœud dans n8n (geste de Benj) ; ne rien rejouer avant.",
  quota: 'Attendre la fin de la fenêtre du fournisseur, puis rejouer une seule fois.',
  delai: 'Rejouer une fois ; si le délai revient, réduire le lot ou relever le délai du nœud.',
  reseau: "Vérifier que le service joint répond, puis rejouer une fois.",
  entree_invalide: "Corriger l'appelant : l'entrée ne respecte pas le contrat ; ne pas rejouer telle quelle.",
  expression: "Corriger l'expression du nœud fautif dans une tâche, puis rejouer.",
  execution: "Lire l'exécution dans n8n (Oracle) avant de décider d'un rejeu.",
};
const NOM = /^(lib|ent|gabarit|presti)-[a-z0-9-]{1,60}$/;
const LIEN = /^https?:\/\/[A-Za-z0-9.-]{1,80}(:\d{2,5})?\/workflow\/[A-Za-z0-9]{6,64}\/executions\/\d{1,12}$/;
function masquer(t) {
  return String(t || '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, '[adresse masquée]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [masqué]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9_-]+)*/g, '[jeton masqué]')
    .replace(/\b(sk|rk|pk|sb)[-_][A-Za-z0-9_-]{8,}/g, '[clé masquée]')
    .replace(/(api[_-]?key|apikey|token|secret|password|mot de passe)\s*[:=]\s*\S+/gi, '$1=[masqué]')
    .replace(/\bhttps?:\/\/\S+/g, '[adresse web masquée]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[identifiant masqué]')
    .replace(/\b[A-Z]{2}\d{2}( ?[A-Z0-9]{4}){3,7}( ?[A-Z0-9]{1,3})?\b/g, '[compte masqué]')
    .replace(/(\+33|0033|\b0)\s?[1-9]([ .-]?\d{2}){4}\b/g, '[téléphone masqué]')
    .replace(/\d{6,}/g, '[nombre masqué]')
    .replace(/["«“][^"»”]{30,}["»”]/g, '« [texte masqué] »')
    .replace(/\s+/g, ' ').trim().slice(0, 300) || 'aucun message';
}
return $input.all().map((item) => {
  const e = item.json || {};
  const wf = e.workflow && typeof e.workflow === 'object' ? e.workflow : {};
  const ex = e.execution && typeof e.execution === 'object' ? e.execution : {};
  const er = (ex.error && typeof ex.error === 'object' ? ex.error : null) || (e.trigger && e.trigger.error && typeof e.trigger.error === 'object' ? e.trigger.error : {});
  const brut = [er.name, er.message, er.description, er.httpCode].filter((x) => x !== undefined && x !== null).join(' ');
  const categorie = (CATEGORIES.find((c) => c[1].test(brut)) || ['execution'])[0];
  const nom = NOM.test(String(wf.name || '')) ? wf.name : 'workflow hors liste';
  const idWf = /^[A-Za-z0-9]{6,64}$/.test(String(wf.id || '')) ? String(wf.id) : 'inconnu';
  const noeudBrut = typeof ex.lastNodeExecuted === 'string' ? ex.lastNodeExecuted : (e.trigger ? 'déclencheur' : '');
  const noeud = /^[\p{L}\p{N} ()'’«»#._?-]{1,60}$/u.test(noeudBrut) ? noeudBrut : 'inconnu';
  const numero = /^\d{1,12}$/.test(String(ex.id === undefined || ex.id === null ? '' : ex.id)) ? String(ex.id) : null;
  const lien = LIEN.test(String(ex.url || '')) ? ex.url : null;
  return { json: {
    enveloppe: { contrat: CONTRAT, simulation: SIMULATION, cle_idempotence: ('err:' + idWf + ':' + (numero || 'declencheur')).slice(0, 80) },
    statut: 'ok',
    resultat: { categorie: categorie, message_masque: masquer(brut), etape_suivante: ETAPES[categorie] },
    contexte: { workflow: nom, workflow_id: idWf, noeud: noeud, execution: numero, lien: lien, declencheur_en_echec: Boolean(e.trigger && !ex.error) },
  } };
});`
export const CODE_EFFETS_ERREUR = String.raw`// lib-erreur-commune, branche « simulation » : rien n'est écrit ni envoyé. Le journal, l'alerte (#presti-auto et Telegram de Benj)
// et le compteur du disjoncteur partent dans effets_prevus, sous la forme exacte des contrats de lib-journaliser, lib-alerter, lib-disjoncteur.
return $input.all().map((item) => {
  const j = item.json, c = j.contexte, r = j.resultat;
  const agent = /^(ent|lib)-[a-z0-9-]+$/.test(c.workflow);
  const effets = [
    { effet: 'journaliser', contrat: 'lib-journaliser@1', entree: { evenement: 'erreur_workflow', agent: c.workflow, objet_ref: c.execution, decision: ('[' + r.categorie + '] ' + r.message_masque).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: true } },
    { effet: 'alerter', contrat: 'lib-alerter@1', donnees: { categorie: 'workflow_en_panne', workflow: c.workflow, lien_execution: c.lien, destinataire_role: 'benj' } },
  ];
  if (agent) effets.push({ effet: 'compter_echec', contrat: 'lib-disjoncteur@1', donnees: { agent: c.workflow, issue: 'echec' }, organisation_id: null });
  return { json: { ...j, effets_prevus: effets,
    journal: [{ evenement: 'diagnostic', agent: 'lib-erreur-commune', objet_ref: c.execution, decision: 'catégorie ' + r.categorie + ' au nœud ' + c.noeud + ' ; journal, alerte' + (agent ? ' et compteur' : '') + ' prévus, rien écrit ni envoyé', simulation: true }] } };
});`

// ─── Les contrats (PR § 5.5, « Les contrats » ; extensions facultatives notées « mode A ») ─────────────────────────────────────
const DATE = { type: 'string', format: 'date-time' }
const NOM_WF = { type: 'string', maxLength: 80, pattern: '^(ent|lib|presti)-[a-z0-9-]+$' }
export const SCHEMAS = {
  'lib-dedoublonner': { sans_contact: true,
    config: { type: 'object', properties: { cles_connues: { type: 'array', maxItems: 1000, items: { type: 'string', maxLength: 80 } } } },
    donnees: { type: 'object', additionalProperties: false, required: ['type', 'objet_id', 'etape'], properties: {
      type: { type: 'string', minLength: 1, maxLength: 40, pattern: '^[a-z0-9_-]+$' }, objet_id: { type: 'string', format: 'uuid' }, etape: { type: 'string', minLength: 1, maxLength: 40, pattern: '^[A-Za-z0-9_.-]+$' } } } },
  'lib-journaliser': { sans_contact: true,
    donnees: { type: 'object', additionalProperties: false, required: ['entrees'], properties: { entrees: { type: 'array', maxItems: 200, items: {
      type: 'object', additionalProperties: false, required: ['evenement', 'agent', 'objet_ref', 'decision', 'simulation'], properties: {
        evenement: { type: 'string', maxLength: 60, pattern: '^[a-z0-9_]+$' }, agent: { type: 'string', maxLength: 80 }, objet_ref: { type: ['string', 'null'], maxLength: 80 },
        decision: { type: 'string', maxLength: 200 }, modele: { type: ['string', 'null'], maxLength: 80 }, jetons_entree: { type: ['integer', 'null'], minimum: 0 },
        jetons_sortie: { type: ['integer', 'null'], minimum: 0 }, cout_eur: { type: ['number', 'null'], minimum: 0 }, source_tarif: { type: ['string', 'null'], maxLength: 120 },
        simulation: { type: 'boolean' } } } } } } },
  'lib-alerter': { sans_contact: true,
    config: { type: 'object', properties: { alertes_recentes: { type: 'array', maxItems: 500, items: { type: 'object', required: ['workflow', 'categorie', 'envoyee_le'],
      properties: { workflow: { type: 'string', maxLength: 80 }, categorie: { type: 'string', maxLength: 40 }, envoyee_le: DATE } } } } },
    donnees: { type: 'object', additionalProperties: false, required: ['categorie', 'workflow', 'destinataire_role'], properties: {
      categorie: { enum: ['workflow_en_panne', 'disjoncteur_ouvert', 'cout_qui_derive', 'demande_qui_stagne', 'client_qui_decroche', 'echeance_proche', 'stock_bas', 'battement_absent'] },
      workflow: { type: 'string', maxLength: 80 }, lien_execution: { type: ['string', 'null'], maxLength: 200 },
      destinataire_role: { enum: ['benj', 'titulaire', 'associe', 'administratif'] }, survenue_le: DATE } } },
  'lib-disjoncteur': { sans_contact: true,
    config: { type: 'object', required: ['seuil'], properties: { seuil: { type: 'integer', minimum: 1, maximum: 20 } } },
    donnees: { type: 'object', additionalProperties: false, required: ['agent', 'issue'], properties: {
      agent: { type: 'string', maxLength: 80, pattern: '^(ent|lib)-[a-z0-9-]+$' }, issue: { enum: ['succes', 'echec'] },
      etat_precedent: { type: 'object', additionalProperties: false, required: ['etat', 'echecs_consecutifs'], properties: { etat: { enum: ['ferme', 'ouvert'] }, echecs_consecutifs: { type: 'integer', minimum: 0 } } } } } },
  'lib-battement': { sans_contact: true,
    config: { type: 'object', properties: { silence_max_h: { type: 'integer', minimum: 1, maximum: 168 } } },
    donnees: { type: 'object', additionalProperties: false, required: ['workflow', 'passe_le'], properties: {
      workflow: NOM_WF, passe_le: DATE, operation: { enum: ['battre', 'controler'] },
      battements: { type: 'array', maxItems: 200, items: { type: 'object', additionalProperties: false, required: ['workflow', 'dernier_le'], properties: {
        workflow: NOM_WF, dernier_le: { type: ['string', 'null'], format: 'date-time' }, alerte_levee_le: { type: ['string', 'null'], format: 'date-time' } } } } } } },
}
export const COUCHES = { 'lib-dedoublonner': 'decision', 'lib-journaliser': 'journal', 'lib-alerter': 'alerte', 'lib-erreur-commune': 'erreurs', 'lib-disjoncteur': 'erreurs', 'lib-battement': 'supervision' }
export const ENFANTS = Object.keys(LOGIQUE)

// ─── Le code SDK ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const IF_ = (nom, champ, notes) => `ifElse({ version: 2.2, config: { name: ${JSON.stringify(nom)}, ${notes ? `notes: ${JSON.stringify(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${JSON.stringify(champ.replace(/\W/g, '-'))}, leftValue: expr(${JSON.stringify('{{ ' + champ + ' }}')}), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const CODE_ = (nom, js, notes, pos) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${JSON.stringify(nom)}, position: ${JSON.stringify(pos)}, ${notes ? `notes: ${JSON.stringify(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${JSON.stringify(js)} } } })`
const ARRET = (pos) => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', position: ${JSON.stringify(pos)}, notes: "Mode A : l'effet réel (base, envoi) n'est pas branché. Il le sera au « go » de Benj, avec sa table, derrière cette même porte.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (mode A, tâche 035-003). Rien n'a été écrit ni envoyé." } } })`

// Les réglages (PR § 4.6 « Les réglages ») : posés dans le code SDK (lus et appliqués par n8n à la création, relus par get_workflow_details).
const REGLAGES_COMMUNS = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 60, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveManualExecutions: true }
export const reglagesEnfant = (idErreur, idsAppelants) => ({ ...REGLAGES_COMMUNS, errorWorkflow: idErreur,
  ...(idsAppelants ? { callerPolicy: 'workflowsFromAList', callerIds: idsAppelants } : { callerPolicy: 'none' }) })
export const reglagesErreur = () => ({ ...REGLAGES_COMMUNS, callerPolicy: 'none' })

export function sdkEnfant(nom, reglages = reglagesEnfant('A_POSER', null)) {
  const contrat = `${nom}@1`
  const [nomLogique, js] = LOGIQUE[nom]
  return `import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';
const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: 'Appelé par un parent', position: [0, 0], parameters: { inputSource: 'passthrough' } } });
const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, SCHEMAS[nom]), `contrat: ${contrat}`, [240, 0])};
const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};
const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', 'porte: simulation\nVrai : simulation, rien ne part. Faux : l\'effet réel, non branché en mode A.')};
const logique = ${CODE_(nomLogique, js, null, [960, -80])};
const arret = ${ARRET([960, 80])};
const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), null, [1240, 0])};
const note = sticky(${JSON.stringify(`## ${nom} (035-003)\nGabarit partagé, couche ${COUCHES[nom]}. Contrat ${contrat} (enveloppe@1).\nINACTIF, en simulation (mode A) : rien n'est lu ni écrit en base, rien n'est envoyé ; l'état prévu part dans effets_prevus.\nJuge : scripts/lib-socle-n8n-qa.mjs`)}, [appele, entree, conforme], { color: 4 });
export default workflow(${JSON.stringify(nom)}, ${JSON.stringify(nom)}, { settings: ${JSON.stringify(reglages)} })
  .add(appele)
  .to(entree)
  .to(conforme.onTrue(porte.onTrue(logique.to(sortie)).onFalse(arret)).onFalse(sortie))
  .add(note);
`
}
export function sdkErreur(reglages = reglagesErreur()) {
  const contrat = 'lib-erreur-commune@1'
  return `import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';
const echec = trigger({ type: 'n8n-nodes-base.errorTrigger', version: 1, config: { name: "Échec d'un workflow", position: [0, 0], parameters: {} } });
const diagnostic = ${CODE_('Diagnostic', CODE_DIAGNOSTIC, null, [240, 0])};
const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', 'porte: simulation\nVrai : simulation, rien ne part. Faux : journal, alerte et compteur réels, non branchés en mode A.')};
const effets = ${CODE_('Effets prévus', CODE_EFFETS_ERREUR, null, [720, -80])};
const arret = ${ARRET([720, 80])};
const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), null, [960, 0])};
const note = sticky(${JSON.stringify("## lib-erreur-commune (035-003)\nWorkflow d'erreur commun des ent-* et lib-* : diagnostic en 7 catégories, masquage, puis journal, alerte (#presti-auto, Telegram de Benj) et compteur du disjoncteur.\nINACTIF, en simulation : rien n'est écrit ni envoyé ; tout part dans effets_prevus. Ne remplace pas presti-erreurs.\nUn Error Trigger ne part que sur l'échec d'une exécution de production : il se prouve par un rejeu hors ligne (juge) et par test_workflow épinglé.")}, [echec, diagnostic], { color: 4 });
export default workflow('lib-erreur-commune', 'lib-erreur-commune', { settings: ${JSON.stringify(reglages)} })
  .add(echec)
  .to(diagnostic)
  .to(porte.onTrue(effets.to(sortie)).onFalse(arret))
  .add(note);
`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || null
  const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/lib-socle'
  mkdirSync(dossier, { recursive: true })
  for (const nom of ENFANTS) writeFileSync(path.join(dossier, `${nom}.sdk.js`), sdkEnfant(nom, reglagesEnfant(arg('erreur') || 'A_POSER', arg('appelants'))))
  writeFileSync(path.join(dossier, 'lib-erreur-commune.sdk.js'), sdkErreur())
  console.log(`SDK écrits dans ${dossier} : ${[...ENFANTS, 'lib-erreur-commune'].join(', ')}`)
}

// ─── lib-banc-socle : le banc d'essai, seul appelant des cinq enfants tant qu'aucun parent ent-* n'existe (035-007) ───────────────
// Le SDK refuse les fonctions fléchées hors des chaînes : tout est écrit en clair ici, puis rendu littéral.
const ENV_BANC = "const env = (contrat, donnees, config) => ({ contrat: contrat, organisation_id: '00000000-0000-4000-8000-000000000001', simulation: true, cle_idempotence: 'exemple:banc:' + contrat.split('@')[0].slice(4), trace: { execution_parent: 'Exemple. banc', declencheur: 'banc', tentative: 0 }, config: config || {}, donnees: donnees });\n"
export const CAS_BANC = [
  ['lib-dedoublonner', 'Cas : dédoublonner', "// Exemple. Deux objets, dont un en double dans le même lot.\n" + ENV_BANC + "return [1, 2, 1].map((i) => ({ json: env('lib-dedoublonner@1', { type: 'relance', objet_id: '00000000-0000-4000-8000-00000000010' + i, etape: 'palier-1' }) }));"],
  ['lib-journaliser', 'Cas : journaliser', "// Exemple. Deux décisions fictives.\n" + ENV_BANC + "return [{ json: env('lib-journaliser@1', { entrees: [1, 2].map((i) => ({ evenement: 'decision', agent: 'ent-exemple-relance', objet_ref: 'Exemple. devis-000' + i, decision: 'Exemple. relance ' + i, simulation: true })) }) }];"],
  ['lib-alerter', 'Cas : alerter', "// Exemple. Trois pannes du même workflow en une minute : une seule alerte.\n" + ENV_BANC + "return [0, 20, 40].map((s) => ({ json: env('lib-alerter@1', { categorie: 'workflow_en_panne', workflow: 'ent-exemple-relance', lien_execution: null, destinataire_role: 'benj', survenue_le: new Date(Date.UTC(2026, 10, 2, 12, 0, s)).toISOString() }) }));"],
  ['lib-disjoncteur', 'Cas : disjoncteur', "// Exemple. Trois échecs de suite : le troisième coupe l'agent.\n" + ENV_BANC + "return [1, 2, 3].map(() => ({ json: env('lib-disjoncteur@1', { agent: 'ent-exemple-relance', issue: 'echec' }, { seuil: 3 }) }));"],
  ['lib-battement', 'Cas : battement', "// Exemple. Un parent muet depuis 27 h.\n" + ENV_BANC + "return [{ json: env('lib-battement@1', { workflow: 'ent-exemple-controle', passe_le: '2026-11-02T11:00:00.000Z', operation: 'controler', battements: [{ workflow: 'ent-exemple-parent', dernier_le: '2026-11-01T08:00:00.000Z', alerte_levee_le: null }] }) }];"],
]
export const CODE_BILAN = "// Bilan agrégé, sans donnée : par contrat, le nombre de sorties par statut. Un effet fait en simulation, ou un appel en erreur, compte en défaut.\nconst bilan = {};\nlet defauts = 0;\nfor (const { json: s } of $input.all()) {\n  const c = typeof s.contrat === 'string' ? s.contrat : 'appel en erreur';\n  bilan[c] = bilan[c] || {};\n  const st = typeof s.statut === 'string' ? s.statut : 'erreur';\n  bilan[c][st] = (bilan[c][st] || 0) + 1;\n  if (!s.contrat || (s.simulation === true && Array.isArray(s.effets_faits) && s.effets_faits.length)) defauts++;\n}\nreturn [{ json: { bilan: bilan, defauts: defauts } }];"
export function sdkBanc(ids, idErreur) {
  const l = ['import { workflow, node, trigger, sticky } from \'@n8n/workflow-sdk\';',
    "const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Banc (jamais publié)', position: [0, 0], parameters: { rule: { interval: [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 6 }] } } } });"]
  CAS_BANC.forEach(([lib, nom, js], i) => {
    const y = (i - 2) * 160
    l.push(`const cas${i} = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${JSON.stringify(nom)}, position: [260, ${y}], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${JSON.stringify(js)} } } });`)
    l.push(`const appel${i} = node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${JSON.stringify('Appeler ' + lib)}, position: [520, ${y}], onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${JSON.stringify(ids[lib])} }, mode: 'once', options: { waitForSubWorkflow: true } } } });`)
  })
  l.push(`const bilan = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Bilan du banc', position: [800, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${JSON.stringify(CODE_BILAN)} } } });`)
  l.push(`const note = sticky(${JSON.stringify("## lib-banc-socle (035-003)\nBanc d'essai du socle : le seul appelant permis des cinq gabarits enfants tant qu'aucun parent ent-* n'existe (035-007).\nINACTIF, jamais publié. Cas fictifs « Exemple. », simulation partout. Ne lit ni n'écrit rien en base, n'envoie rien.")}, [horloge, cas2], { color: 4 });`)
  l.push(`export default workflow('lib-banc-socle', 'lib-banc-socle', { settings: ${JSON.stringify({ executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveManualExecutions: true, errorWorkflow: idErreur, callerPolicy: 'none' })} })`)
  CAS_BANC.forEach((_, i) => l.push(`  .add(horloge).to(cas${i}).to(appel${i}).to(bilan)`))
  l.push('  .add(note);')
  return l.join('\n') + '\n'
}
