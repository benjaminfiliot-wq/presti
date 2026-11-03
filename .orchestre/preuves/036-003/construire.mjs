// 036-003 — fabrique de la boîte mail de l'artisan dans la plateforme (plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-003
// du § 4) : presti-boite (toutes les 5 minutes), lib-boite-lire (IMAP), lib-boite-brouillon (Studio : APPEND dans le dossier Brouillons),
// lib-boite-envoyer (Signature : SMTP, nœud désactivé) et le banc presti-banc-boite.
// Hors ligne : aucun réseau, aucune base, aucun modèle, aucune donnée réelle (adresses en « .invalid », noms précédés de « Exemple. »).
// Mode A (comme 035-003 à 035-005 et 036-001) : tout est INACTIF, en simulation, sans identifiant ; les lectures sont ÉPINGLÉES (la boîte, la
// base) et les écritures partent dans `effets_prevus`, jamais faites. Le gabarit « Contrat » (codeEntree, codeSortie) est celui de 035-003.
// Le vrai nœud IMAP/SMTP (imapflow, nodemailer) n'est PAS dans les exports : la garde n8n-specs-qa (R19) refuse tout module dans un nœud Code.
// Il est préparé par écrit dans plans/011-cadrage-01-11/p6-signature/connecteurs/imap.md, pour Benj.
//   node .orchestre/preuves/036-003/construire.mjs <dossier> [--erreur=<id>] [--ids=<json>]   → les programmes SDK (collés tels quels dans n8n)
//   node .orchestre/preuves/036-003/construire.mjs --contrats                                   → plans/011-cadrage-01-11/p6-signature/contrats/boite.json
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie, CODE_BILAN } from '../035-003/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const J = JSON.stringify
export const ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
export const ENFANTS = ['lib-boite-lire', 'lib-boite-brouillon', 'lib-boite-envoyer']
export const VERSION_CONTRATS = '1.0.0'

// ─── Le SHA-256 écrit à la main (aucun module dans un nœud Code : R19) — copie de 035-003/construire.mjs, comparée à node:crypto par le juge ─────
export const SHA256 = String.raw`function sha256(texte) {
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

// ─── Les contrats (JSON Schema, versionnés ; hors contrat = rejet, journal, rien ne part) ────────────────────────────────────────
const UUID = { type: 'string', format: 'uuid' }
const DATE = { type: 'string', format: 'date-time' }
const DATE_N = { type: ['string', 'null'], format: 'date-time' }
const BOOL = { type: 'boolean' }
const BOOL_LU = { type: ['boolean', 'null'] }
const COURRIEL = { type: 'string', minLength: 3, maxLength: 254, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$' }
const objet = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props })
export const OFFRES = ['studio', 'signature', 'essentiel', 'essai']
export const ETATS = ['a_verifier', 'active', 'expiree', 'retiree', 'erreur']
export const ISSUES = ['ok', 'identifiants_refuses', 'jeton_expire', 'serveur_refuse', 'injoignable']
export const TYPES_ACTION = ['reponse_prospect', 'relance_devis', 'relance_impaye', 'envoi_devis', 'envoi_facture', 'assistant_client']
const CAPACITES = { type: 'array', maxItems: 60, items: { type: 'string', pattern: '^[a-z_.]{2,40}$' } }
const ARTISAN = objet({ nom: { type: 'string', maxLength: 70 }, adresse: COURRIEL })
const CONNEXION = objet({ id: UUID, artisan_id: UUID, fournisseur: { enum: ['imap'] }, etat: { enum: ETATS }, secret_n8n: { type: ['string', 'null'], maxLength: 16384 }, verifiee_le: DATE_N })
const MESSAGE = objet({ uid: { type: 'integer', minimum: 0 }, message_id: { type: ['string', 'null'], maxLength: 250 }, de_email: { type: ['string', 'null'], maxLength: 254 },
  de_nom: { type: ['string', 'null'], maxLength: 120 }, sujet: { type: 'string', maxLength: 300 }, texte: { type: 'string', maxLength: 8000 }, date: DATE_N })
const PROPOSITION = objet({ id: UUID, conversation_id: UUID, canal: { enum: ['email'] }, objet: { type: ['string', 'null'], maxLength: 120 },
  texte: { type: 'string', minLength: 1, maxLength: 1700 }, outil: { type: 'string', pattern: '^[a-z_]{2,60}$' } })
const DESTINATAIRE = objet({ email: COURRIEL, opposition: BOOL_LU })
const ORIGINE = objet({ message_id: { type: 'string', minLength: 1, maxLength: 250 }, references: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 250 } }, sujet: { type: 'string', maxLength: 300 } })
const CONFORMITE = objet({ verdict: { enum: ['accepte', 'refuse', 'illisible'] } })
export const SCHEMAS = {
  'lib-boite-lire': { sans_contact: false,
    config: objet({ lot_max: { type: 'integer', minimum: 1, maximum: 40 }, fenetre_jours: { type: 'integer', minimum: 1, maximum: 7 },
      reseaux: objet({ actifs: BOOL, domaines: { type: 'array', maxItems: 60, items: { type: 'string', maxLength: 60 } } }) }),
    donnees: objet({
      canal: objet({ id: UUID, artisan_id: UUID, adresse: COURRIEL, derniere_releve: DATE_N }),
      connexion: CONNEXION,
      boite: objet({ issue: { enum: ISSUES }, messages: { type: 'array', maxItems: 200, items: MESSAGE } }),
      deja_importes: { type: 'array', maxItems: 5000, items: objet({ artisan_id: UUID, message_id: { type: 'string', minLength: 1, maxLength: 250 } }) },
      conversations: { type: 'array', maxItems: 2000, items: objet({ lead_id: UUID, artisan_id: UUID, contact: COURRIEL, created_at: DATE }) },
      maintenant: DATE }) },
  'lib-boite-brouillon': { sans_contact: false,
    config: objet({ offre: { enum: OFFRES }, interrupteur_general: BOOL, interrupteur_departement: BOOL, artisan: ARTISAN }),
    donnees: objet({ proposition: PROPOSITION, destinataire: DESTINATAIRE, origine: ORIGINE, conformite: CONFORMITE, connexion: CONNEXION,
      deja_ecrits: { type: 'array', maxItems: 2000, items: { type: 'string', maxLength: 80 } }, maintenant: DATE }) },
  'lib-boite-envoyer': { sans_contact: false,
    config: objet({ offre: { enum: OFFRES }, capacites: CAPACITES, mode_reponse: { enum: ['manuelle', 'assistee', 'auto'] },
      pilote: objet({ drapeau: BOOL, actif: BOOL, types: { type: 'object' } }), parties_depuis_24h: { type: 'integer', minimum: 0 },
      plafond_jour: { type: 'integer', minimum: 0, maximum: 20 }, interrupteur_general: BOOL, interrupteur_departement: BOOL, artisan: ARTISAN }),
    donnees: objet({ action: objet({ id: UUID, type: { enum: TYPES_ACTION }, statut: { enum: ['a_partir', 'en_cours', 'annulee', 'partie', 'echec', 'manuel'] },
        prete_le: DATE, part_le: DATE, lead_id: { type: ['string', 'null'], format: 'uuid' } }),
      proposition: PROPOSITION, destinataire: DESTINATAIRE, origine: ORIGINE, conformite: CONFORMITE, connexion: CONNEXION, maintenant: DATE }) },
}
// Ce que le parent lit (en simulation : épinglé) à chaque passage de 5 minutes : un travail dû par ligne.
const TRAVAIL_COMMUN = { genre: { enum: ['boite', 'brouillon', 'envoi'] }, artisan_id: UUID, maintenant: DATE }
export const TRAVAIL = {
  interrupteur: objet({ interrupteur_general: BOOL }),
  boite: objet({ ...TRAVAIL_COMMUN, canal: SCHEMAS['lib-boite-lire'].donnees.properties.canal, connexion: CONNEXION, boite: SCHEMAS['lib-boite-lire'].donnees.properties.boite,
    deja_importes: SCHEMAS['lib-boite-lire'].donnees.properties.deja_importes, conversations: SCHEMAS['lib-boite-lire'].donnees.properties.conversations,
    reseaux: SCHEMAS['lib-boite-lire'].config.properties.reseaux }),
  brouillon: objet({ ...TRAVAIL_COMMUN, config: SCHEMAS['lib-boite-brouillon'].config, donnees: SCHEMAS['lib-boite-brouillon'].donnees }),
  envoi: objet({ ...TRAVAIL_COMMUN, config: SCHEMAS['lib-boite-envoyer'].config, donnees: SCHEMAS['lib-boite-envoyer'].donnees }),
}
export const EFFETS = {
  'lib-boite-lire': ['creer_conversation', 'deposer_message', 'noter_evenement', 'maj_canal', 'maj_connexion', 'alerter', 'compter_echec'],
  'lib-boite-brouillon': ['ajouter_brouillon_imap', 'noter_evenement'],
  'lib-boite-envoyer': ['reclamer_action', 'envoyer_smtp', 'marquer_action', 'noter_evenement'],
}
export function contrats() {
  const base = { $schema: 'https://json-schema.org/draft/2020-12/schema', version: VERSION_CONTRATS, tache: '036-003',
    source: 'plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-003 du § 4 ; lib/releveCanal.ts ; lib/pilote/regles.ts',
    regle: 'Hors contrat = rejet (statut « rejete »), une ligne de journal, rien ne part. Toute ligne lue porte artisan_id et doit être celle du compte (« Supabase account » passe outre la RLS). Les écritures ne sont jamais faites ici : elles partent dans effets_prevus.' }
  return { 'boite.json': { ...base, titre: 'presti-boite@1 — la boîte mail de l’artisan dans la plateforme (toutes les 5 minutes)',
    parent: { workflow: 'presti-boite', cadence: 'toutes les 5 minutes', lit: TRAVAIL, appelle: ENFANTS.map((n) => `${n}@1`), sauts: { interrupteur_general_coupe: 'rien n’est appelé', hors_contrat: 'rejet par le Contrat d’entrée de l’enfant, compté au bilan' } },
    enfants: Object.fromEntries(ENFANTS.map((n) => [`${n}@1`, { config: SCHEMAS[n].config, donnees: SCHEMAS[n].donnees, effets_prevus: EFFETS[n] }])),
    echecs_de_connexion: { identifiants_illisibles: 'durable', identifiants_refuses: 'durable', jeton_expire: 'durable (motif autorisation_expiree)', serveur_refuse: 'durable', injoignable: 'passager (disjoncteur, aucune alerte)' },
    studio_signature: { studio: 'lib-boite-brouillon seul : APPEND dans Brouillons, drapeau \\Draft, jamais envoyé', signature: 'lib-boite-envoyer seulement si toutes les conditions du pilote sont tenues ; sinon l’action repasse en carte (manuel)' } } }
}

// ─── Les nœuds Code ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const MARQUES = {
  // Les lignes que le juge mute (un mutant = une ligne retirée ou changée) : elles doivent exister à l'identique, sinon le juge le dit.
  doublon: "if (dejaVus.has(m.message_id)) { ignores.doublon++; continue; }",
  conversation: "let conv = existantes.get(contact) || nouvelles.get(contact) || null;",
  plafond: "if (c.parties_depuis_24h + (prevus.get(org) || 0) >= c.plafond_jour) return manuel('plafond');",
  etat_partage: "const dejaVus = etat.vus;",
  isolation: "if (canal.artisan_id !== org || cx.artisan_id !== org || d.conversations.some((x) => x.artisan_id !== org) || d.deja_importes.some((x) => x.artisan_id !== org)) {",
  echec: "if (issue !== 'ok') {",
  journal_releve: "journal.unshift(ligne('releve_boite',",
  brouillon: "effet: 'ajouter_brouillon_imap'",
  nom: "const nom = nomAffiche(c.artisan.nom);",
}
export const CODE_LIRE = String.raw`// lib-boite-lire (036-003 ; p6:279-285 « tout message arrive d'abord dans la plateforme ») : refait dans n8n le comportement de releverCanal
// (lib/releveCanal.ts:68), sans le modifier. Mode A : la boîte, les messages déjà importés et les conversations ouvertes sont ÉPINGLÉS par
// l'appelant ; le vrai nœud IMAP (imapflow) est préparé dans connecteurs/imap.md, pas ici (R19 : aucun module dans un nœud Code).
// Chaque message entre UNE fois (clé de compte + Message-ID), dans la conversation du client QUEL QUE SOIT le canal (même adresse, 30 jours),
// avec son canal d'origine. Le secret n'est jamais lu ni recopié : seule la forme du chiffré est contrôlée. Écritures : effets_prevus seulement.
` + SHA256 + String.raw`
// Copie figée de lib/releveCanal.ts:29-30 et :59-66 (comparée au code par scripts/boite-n8n-qa.mjs, qui exécute aussi le vrai estUneVraieDemande).
const AUTOMATIQUE = /^(no-?reply|ne-?pas-?repondre|donotreply|mailer-daemon|postmaster|notifications?|newsletter|bounce|noreply)[@.-]/i;
const INDESIRABLE = /(facture[s]? ?orange|newsletter|se désinscrire|unsubscribe|linkedin|no-reply)/i;
function motifIgnore(deEmail, sujet, texte, adresseCanal) {
  if (!deEmail) return 'sans_expediteur';
  if (deEmail.toLowerCase() === adresseCanal.toLowerCase()) return 'soi_meme';
  if (AUTOMATIQUE.test(deEmail)) return 'automatique';
  if (texte.trim().length < 12) return 'trop_court';
  if (INDESIRABLE.test(sujet) && texte.length < 400) return 'indesirable';
  return null;
}
const JOUR = 86400000;
const FORMAT_SECRET = /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/;
// Les textes sont ceux de releverCanal (l.71, l.82, l.215-216) ; l'autorisation expirée est neuve (connexions.etat « expiree », 0193).
const ECHECS = {
  identifiants_illisibles: { permanent: true, motif: 'identifiants_illisibles', texte: 'Identifiants illisibles — reconnectez la boîte.' },
  identifiants_refuses: { permanent: true, motif: 'identifiants_refuses', texte: 'Identifiants refusés — le mot de passe de la boîte a peut-être changé.' },
  jeton_expire: { permanent: true, motif: 'autorisation_expiree', texte: 'Autorisation expirée — reconnectez la boîte.' },
  serveur_refuse: { permanent: true, motif: 'serveur_refuse', texte: 'Connexion impossible à ce serveur de messagerie.' },
  injoignable: { permanent: false, motif: 'serveur_injoignable', texte: 'Connexion à la boîte impossible pour l’instant.' },
};
const domaineDe = (email) => { const m = /@([^@]+)$/.exec(String(email || '')); return m ? m[1].toLowerCase() : ''; };
const surDomaine = (d, liste) => liste.some((x) => d === x || d.endsWith('.' + x));
const etats = new Map(); // un état par compte, partagé par les lignes d'une même exécution : deux boîtes du même passage ne déposent pas deux fois le même message
function refus(j, e, raison) {
  return { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: [raison],
    journal: [{ evenement: 'releve_refusee', agent: 'lib-boite-lire', objet_ref: null, decision: raison, simulation: e.simulation }] };
}
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const canal = d.canal, cx = d.connexion, maintenant = Date.parse(d.maintenant);
    const journal = [];
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: 'lib-boite-lire', objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    if (canal.artisan_id !== org || cx.artisan_id !== org || d.conversations.some((x) => x.artisan_id !== org) || d.deja_importes.some((x) => x.artisan_id !== org)) {
      return refus(j, e, 'autre_compte : la boîte, la connexion ou les lignes lues ne sont pas celles de ce compte');
    }
    if (cx.etat === 'erreur' || cx.etat === 'expiree' || cx.etat === 'retiree') {
      journal.push(ligne('releve_silencieuse', canal.id, 'connexion ' + cx.etat + ' : le département se tait, rien n’est lu'));
      return { ...j, statut: 'rien_a_faire', resultat: { canal_id: canal.id, importes: 0, silence: true, etat_connexion: cx.etat, erreur: null, motif_erreur: null }, effets_prevus: [], journal: journal };
    }
    const secretLisible = typeof cx.secret_n8n === 'string' && FORMAT_SECRET.test(cx.secret_n8n);
    const issue = secretLisible ? d.boite.issue : 'identifiants_illisibles';
    if (issue !== 'ok') {
      const f = ECHECS[issue];
      const effets = [{ effet: 'maj_canal', organisation_id: org, canal_id: canal.id, derniere_erreur: f.texte }];
      if (f.permanent) {
        effets.push({ effet: 'maj_connexion', organisation_id: org, connexion_id: cx.id, etat: 'erreur', motif_erreur: f.motif });
        effets.push({ effet: 'alerter', contrat: 'lib-alerter@1', donnees: { categorie: 'workflow_en_panne', workflow: 'lib-boite-lire', lien_execution: null, destinataire_role: 'titulaire', survenue_le: d.maintenant } });
      } else {
        effets.push({ effet: 'compter_echec', contrat: 'lib-disjoncteur@1', donnees: { agent: 'lib-boite-lire', issue: 'echec' }, organisation_id: org });
      }
      journal.push(ligne('releve_echec', canal.id, (f.permanent ? 'échec durable (' : 'échec passager (') + f.motif + ') : ' + (f.permanent ? 'état « erreur » prévu pour Connexions, alerte prévue, le département se tait' : 'compté au disjoncteur, aucune alerte')));
      return { ...j, statut: f.permanent ? 'ok' : 'rien_a_faire', resultat: { canal_id: canal.id, importes: 0, silence: false, etat_connexion: f.permanent ? 'erreur' : cx.etat, erreur: f.texte, motif_erreur: f.motif }, effets_prevus: effets, journal: journal };
    }
    const depuis = Math.max(canal.derniere_releve ? Date.parse(canal.derniere_releve) : 0, maintenant - c.fenetre_jours * JOUR);
    const jourDepuis = Math.floor(depuis / JOUR);
    const limite = maintenant - 30 * JOUR;
    if (!etats.has(org)) etats.set(org, { vus: new Set(), existantes: new Map(), nouvelles: new Map() });
    const etat = etats.get(org);
    const dejaVus = etat.vus;
    for (const x of d.deja_importes) dejaVus.add(x.message_id);
    const existantes = etat.existantes;
    for (const l of d.conversations) {
      const t = Date.parse(l.created_at);
      const k = l.contact.toLowerCase();
      const p = existantes.get(k);
      if (t >= limite && (!p || t > p.t)) existantes.set(k, { lead_id: l.lead_id, t: t });
    }
    const nouvelles = etat.nouvelles;
    const ignores = { sans_expediteur: 0, soi_meme: 0, automatique: 0, trop_court: 0, indesirable: 0, doublon: 0, hors_fenetre: 0, sans_message_id: 0, laisse_au_code: 0 };
    const effets = [], rangs = [];
    let importes = 0, restants = 0;
    const msgs = d.boite.messages.slice().sort((a, b) => a.uid - b.uid);
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (importes >= c.lot_max) { restants = msgs.length - i; break; }
      if (m.date && Math.floor(Date.parse(m.date) / JOUR) < jourDepuis) { ignores.hors_fenetre++; continue; }
      if (!m.message_id) { ignores.sans_message_id++; continue; }
      const contact = m.de_email ? m.de_email.toLowerCase() : null;
      if (c.reseaux.actifs && contact && surDomaine(domaineDe(contact), c.reseaux.domaines)) { ignores.laisse_au_code++; continue; }
      const motif = motifIgnore(contact, m.sujet, m.texte, canal.adresse);
      if (motif) { ignores[motif]++; continue; }
      if (dejaVus.has(m.message_id)) { ignores.doublon++; continue; }
      dejaVus.add(m.message_id);
      const texteComplet = (m.sujet ? m.sujet + '\n\n' : '') + m.texte;
      const cle = 'bm:' + sha256(org + '|' + m.message_id).slice(0, 48);
      let conv = existantes.get(contact) || nouvelles.get(contact) || null;
      const nouvelle = !conv;
      if (nouvelle) {
        conv = { lead_id: null, cle_conversation: 'cv:' + sha256(org + '|' + contact).slice(0, 48) };
        nouvelles.set(contact, conv);
        effets.push({ effet: 'creer_conversation', organisation_id: org, cle_conversation: conv.cle_conversation, canal: 'email', nom_prospect: m.de_nom || contact.split('@')[0],
          contact: contact, message: texteComplet, statut: 'nouveau', a_calculer_par_le_code: ['type_chantier', 'ville'] });
      }
      effets.push({ effet: 'deposer_message', organisation_id: org, cle: cle, canal_id: canal.id, canal_origine: 'email', conversation: conv.lead_id ? { lead_id: conv.lead_id } : { cle_conversation: conv.cle_conversation },
        sens: 'in', type: 'email', externe_id: m.message_id, contenu: texteComplet, sent_at: m.date || d.maintenant });
      effets.push({ effet: 'noter_evenement', organisation_id: org, type: 'demande_recue', cle: cle, faits: { canal: 'email', client_existant: !nouvelle, lead_id: conv.lead_id } });
      rangs.push({ cle: cle, conversation: nouvelle ? 'nouvelle' : 'existante' });
      journal.push(ligne('message_range', cle, nouvelle ? 'nouvelle conversation prévue' : 'rangé dans la conversation ouverte'));
      importes++;
    }
    effets.push({ effet: 'maj_canal', organisation_id: org, canal_id: canal.id, derniere_releve: d.maintenant, derniere_erreur: null });
    effets.push(cx.etat === 'a_verifier'
      ? { effet: 'maj_connexion', organisation_id: org, connexion_id: cx.id, etat: 'active', verifiee_le: d.maintenant, derniere_synchro: d.maintenant }
      : { effet: 'maj_connexion', organisation_id: org, connexion_id: cx.id, derniere_synchro: d.maintenant });
    const ignoresTotal = Object.values(ignores).reduce((a, b) => a + b, 0);
    journal.unshift(ligne('releve_boite', canal.id, importes + ' importé(s), ' + ignoresTotal + ' ignoré(s), ' + restants + ' reporté(s) au passage suivant'));
    return { ...j, statut: importes > 0 ? 'ok' : 'rien_a_faire', resultat: { canal_id: canal.id, importes: importes, ignores: ignores, restants: restants, silence: false,
      etat_connexion: cx.etat === 'a_verifier' ? 'active' : cx.etat, erreur: null, motif_erreur: null, rangs: rangs }, effets_prevus: effets, journal: journal.slice(0, 200) };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, erreurs: ['relève : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

// Le codage du brouillon et de l'envoi partage les mêmes aides (UTF-8 → base64 à la main, date RFC 2822, en-têtes sans retour à la ligne).
const AIDES_MAIL = String.raw`const sansRetour = (t) => String(t == null ? '' : t).replace(/[\r\n]+/g, ' ').trim();
const nomAffiche = (n) => sansRetour(n).replace(/["<>]/g, '').slice(0, 70);
function octets(texte) {
  const o = [];
  for (const car of String(texte)) {
    const c = car.codePointAt(0);
    if (c < 0x80) o.push(c);
    else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return o;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(o) {
  let s = '';
  for (let i = 0; i < o.length; i += 3) {
    const a = o[i], b = o[i + 1], c = o[i + 2];
    s += B64[a >> 2] + B64[((a & 3) << 4) | ((b || 0) >> 4)] + (i + 1 < o.length ? B64[((b & 15) << 2) | ((c || 0) >> 6)] : '=') + (i + 2 < o.length ? B64[c & 63] : '=');
  }
  return s;
}
const mot2047 = (t) => (/^[\x20-\x7e]*$/.test(t) ? t : '=?UTF-8?B?' + base64(octets(t)) + '?=');
const crochets = (id) => { const s = sansRetour(id); return s.startsWith('<') ? s : '<' + s + '>'; };
const JOURS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MOIS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const deux = (n) => String(n).padStart(2, '0');
function dateMail(iso) { const t = new Date(Date.parse(iso)); return JOURS[t.getUTCDay()] + ', ' + deux(t.getUTCDate()) + ' ' + MOIS[t.getUTCMonth()] + ' ' + t.getUTCFullYear() + ' ' + deux(t.getUTCHours()) + ':' + deux(t.getUTCMinutes()) + ':' + deux(t.getUTCSeconds()) + ' +0000'; }
function objetReponse(origine, proposition) { const base = sansRetour(origine.sujet || proposition.objet || 'Votre demande').replace(/^(re\s*:\s*)+/i, ''); return ('Re: ' + base).slice(0, 200); }
function corpsBase64(texte) { const b = base64(octets(String(texte).replace(/\r?\n/g, '\r\n'))); return b.replace(/(.{76})/g, '$1\r\n'); }
function expediteurDe(artisan) { const nom = nomAffiche(artisan.nom); return nom ? mot2047(nom) + ' <' + artisan.adresse + '>' : artisan.adresse; }
function messageBrut(artisan, destinataire, origine, proposition, maintenant) {
  const refs = origine.references.map(crochets).concat([crochets(origine.message_id)]).slice(-10);
  const entetes = ['From: ' + expediteurDe(artisan), 'To: ' + destinataire.email, 'Subject: ' + mot2047(objetReponse(origine, proposition)), 'Date: ' + dateMail(maintenant),
    'In-Reply-To: ' + crochets(origine.message_id), 'References: ' + refs.join(' '), 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64'];
  return entetes.join('\r\n') + '\r\n\r\n' + corpsBase64(proposition.texte);
}`

export const CODE_BROUILLON = String.raw`// lib-boite-brouillon (036-003 ; Studio : « tout est automatisé, mais il faut valider, sinon ça ne s'envoie pas », lib/plans.ts:11) : la
// réponse préparée devient un BROUILLON dans le dossier Brouillons de l'artisan (IMAP APPEND, drapeau \Draft). Il n'est JAMAIS envoyé :
// ce workflow n'a aucun effet d'envoi, quelle que soit l'offre. L'artisan relit et envoie depuis sa propre boîte.
// Le brouillon est écrit au nom de l'artisan (lib/email.ts:6-11) : jamais « Presti », même sans nom (le nom vide ne retombe pas sur la marque).
// Mode A : l'APPEND part dans effets_prevus ; le vrai nœud IMAP est préparé dans connecteurs/imap.md.
` + SHA256 + '\n' + AIDES_MAIL + String.raw`
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: 'lib-boite-brouillon', objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const cx = d.connexion, p = d.proposition;
    const cle = 'br:' + sha256(org + '|' + p.id).slice(0, 48);
    if (cx.artisan_id !== org) return { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: ['autre_compte : la connexion n’est pas celle de ce compte'], journal: [ligne('brouillon_refuse', p.id, 'autre_compte')] };
    if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) return { ...j, statut: 'rien_a_faire', resultat: { ecrit: false, envoye: false, motif: 'interrupteur' }, effets_prevus: [], journal: [ligne('brouillon_saute', p.id, 'interrupteur coupé : rien n’est écrit')] };
    if (d.conformite.verdict !== 'accepte') return { ...j, statut: 'refuse', resultat: { ecrit: false, envoye: false, motif: 'conformite' }, effets_prevus: [], erreurs: ['conformite : la porte n’a pas accepté (' + d.conformite.verdict + ')'], journal: [ligne('brouillon_refuse', p.id, 'la porte de conformité n’a pas accepté : lecture illisible ou refus valent refus')] };
    if (d.destinataire.opposition === true) return { ...j, statut: 'refuse', resultat: { ecrit: false, envoye: false, motif: 'opposition' }, effets_prevus: [], erreurs: ['opposition : le destinataire s’est opposé'], journal: [ligne('brouillon_refuse', p.id, 'opposition du destinataire')] };
    if (cx.etat !== 'active') return { ...j, statut: 'rien_a_faire', resultat: { ecrit: false, envoye: false, motif: 'connexion_' + cx.etat }, effets_prevus: [], journal: [ligne('brouillon_saute', p.id, 'connexion ' + cx.etat + ' : le département se tait')] };
    if (d.deja_ecrits.includes(cle)) return { ...j, statut: 'rien_a_faire', resultat: { ecrit: false, envoye: false, motif: 'deja_ecrit' }, effets_prevus: [], journal: [ligne('brouillon_saute', cle, 'déjà écrit : rien à refaire')] };
    const nom = nomAffiche(c.artisan.nom);
    const brut = messageBrut(c.artisan, d.destinataire, d.origine, p, d.maintenant);
    return { ...j, statut: 'ok', resultat: { ecrit: false, envoye: false, mode: 'brouillon', offre: c.offre, cle: cle, dossier: 'Brouillons' },
      effets_prevus: [
        { effet: 'ajouter_brouillon_imap', organisation_id: org, connexion_id: cx.id, cle: cle, dossier: { usage_special: '\\Drafts', repli: ['Brouillons', 'Drafts', '[Gmail]/Brouillons', '[Gmail]/Drafts', 'INBOX.Drafts'] }, drapeaux: ['\\Draft'], conversation_id: p.conversation_id, message_brut: brut },
        { effet: 'noter_evenement', organisation_id: org, type: 'brouillon_ecrit', cle: cle, objet_type: 'lead', objet_id: p.conversation_id, faits: { canal: 'email', proposition_id: p.id } },
      ],
      journal: [ligne('brouillon_prepare', cle, 'brouillon prévu dans le dossier Brouillons de l’artisan' + (nom ? '' : ' (sans nom affiché)') + ' : jamais envoyé')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, erreurs: ['brouillon : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

export const CODE_ENVOYER = String.raw`// lib-boite-envoyer (036-003 ; Signature : « Signature envoie seul », lib/plans.ts:12) : prépare l'envoi SMTP d'une réponse PARTIE du pilote
// (lib/pilote/regles.ts:257-275). Le nœud d'envoi du workflow est DÉSACTIVÉ et n'est atteignable que par la sortie « faux » de la porte
// « simulation ». Rien ne part sans TOUTES les conditions du pilote, relues juste avant l'effet (lib/pilote/regles.ts:21-22) :
// offre (plateforme.ia.auto et assistant.pilote), mode « auto », pilote actif, type activé, file à l'heure (10 min d'annulation écoulées,
// moins de 24 h), plafond du jour, interrupteurs, porte de conformité, pas d'opposition, connexion active. Une condition manquante renvoie
// l'action en carte (statut « manuel »). Au nom de l'artisan, son adresse en réponse (lib/email.ts:6-11), mention d'IA en pied (R4).
` + SHA256 + '\n' + AIDES_MAIL + String.raw`
const expediteurSimple = (artisan) => { const nom = nomAffiche(artisan.nom); return nom ? nom + ' <' + artisan.adresse + '>' : artisan.adresse; };
const DELAI_MS = 10 * 60000;
const ATTENTE_MAX_MS = 24 * 3600000;
const prevus = new Map(); // envois déjà prévus dans cette exécution, par compte : le plafond du jour vaut pour tout le passage
function avecMention(texte, nom) {
  const corps = String(texte).trimEnd();
  const n = sansRetour(nom).slice(0, 70);
  const mention = 'Message rédigé et envoyé automatiquement par l’assistant' + (n ? ' de ' + n : '') + '.';
  return corps.endsWith(mention) ? corps : corps + '\n\n—\n' + mention;
}
function traiter(j) {
  try {
    const e = j.enveloppe, d = e.donnees, c = e.config, org = e.organisation_id, sim = e.simulation === true;
    const a = d.action, p = d.proposition, cx = d.connexion;
    const ligne = (evenement, ref, decision) => ({ evenement: evenement, agent: 'lib-boite-envoyer', objet_ref: ref, decision: String(decision).slice(0, 200), simulation: sim });
    const maintenant = Date.parse(d.maintenant);
    const cle = 'sm:' + sha256(org + '|' + a.id).slice(0, 48);
    const manuel = (motif) => ({ ...j, statut: 'refuse', resultat: { envoye: false, motif: motif }, erreurs: ['refus : ' + motif],
      effets_prevus: [{ effet: 'marquer_action', organisation_id: org, action_id: a.id, statut: 'manuel', motif: motif }],
      journal: [ligne('envoi_refuse', a.id, 'refus (' + motif + ') : l’action repasse en carte, rien ne part')] });
    const attendre = (motif) => ({ ...j, statut: 'rien_a_faire', resultat: { envoye: false, motif: motif }, effets_prevus: [], journal: [ligne('envoi_attendu', a.id, motif + ' : rien ne part maintenant')] });
    if (cx.artisan_id !== org) return { ...j, statut: 'refuse', resultat: null, effets_prevus: [], erreurs: ['autre_compte : la connexion n’est pas celle de ce compte'], journal: [ligne('envoi_refuse', a.id, 'autre_compte')] };
    if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) return attendre('interrupteur_coupe');
    if (a.type !== 'reponse_prospect') return manuel('type_hors_lot');
    if (!(c.capacites.includes('plateforme.ia.auto') && c.capacites.includes('assistant.pilote'))) return manuel('offre');
    if (c.mode_reponse !== 'auto') return manuel('mode_non_auto');
    if (!(c.pilote.drapeau === true && c.pilote.actif === true)) return manuel('pilote_inactif');
    if (c.pilote.types[a.type] !== true) return manuel('type_inactif');
    if (a.statut !== 'a_partir') return manuel('statut_' + a.statut);
    if (Date.parse(a.part_le) - Date.parse(a.prete_le) < DELAI_MS) return manuel('delai_trop_court');
    if (maintenant < Date.parse(a.part_le)) return attendre('delai_non_ecoule');
    if (maintenant - Date.parse(a.part_le) > ATTENTE_MAX_MS) return manuel('trop_ancienne');
    if (c.parties_depuis_24h + (prevus.get(org) || 0) >= c.plafond_jour) return manuel('plafond');
    if (d.conformite.verdict !== 'accepte') return manuel('conformite');
    if (d.destinataire.opposition === true) return manuel('opposition');
    if (cx.etat !== 'active') return manuel('connexion_' + cx.etat);
    prevus.set(org, (prevus.get(org) || 0) + 1);
    const corps = String(p.texte).trimEnd();
    const texte = avecMention(corps, c.artisan.nom);
    const envoi = { expediteur: expediteurSimple(c.artisan), reply_to: c.artisan.adresse, destinataire: d.destinataire.email, objet: objetReponse(d.origine, p), corps: corps,
      nom_artisan: sansRetour(c.artisan.nom).slice(0, 70), in_reply_to: crochets(d.origine.message_id), references: d.origine.references.map(crochets).concat([crochets(d.origine.message_id)]).slice(-10).join(' ') };
    return { ...j, envoi: envoi, statut: 'ok', resultat: { envoye: false, mode: 'envoi', offre: c.offre, cle: cle },
      effets_prevus: [
        { effet: 'reclamer_action', organisation_id: org, action_id: a.id, de: 'a_partir', vers: 'en_cours' },
        { effet: 'envoyer_smtp', organisation_id: org, connexion_id: cx.id, cle: cle, expediteur: envoi.expediteur, reply_to: envoi.reply_to, destinataire: envoi.destinataire, objet: envoi.objet,
          texte: texte, pied: 'mention', in_reply_to: envoi.in_reply_to, references: envoi.references },
        { effet: 'marquer_action', organisation_id: org, action_id: a.id, statut: 'partie', traite_le: d.maintenant },
        { effet: 'noter_evenement', organisation_id: org, type: 'reponse_envoyee', cle: cle, objet_type: 'lead', objet_id: a.lead_id, faits: { canal: 'email', action_id: a.id } },
      ],
      journal: [ligne('envoi_prepare', cle, 'envoi SMTP prévu au nom de l’artisan (mention d’IA en pied) : le nœud d’envoi reste désactivé')] };
  } catch (err) {
    return { ...j, statut: 'erreur', resultat: null, erreurs: ['envoi : ' + String((err && err.message) || err).slice(0, 120)] };
  }
}
return $input.all().map((item) => ({ json: traiter(item.json) }));`

// ─── Le parent presti-boite ──────────────────────────────────────────────────────────────────────────────────────────────────
const TETE_PASSAGE = "const passage = (iso) => new Date(Math.floor(Date.parse(iso) / 300000) * 300000).toISOString().slice(0, 16).replace(':', '');\n"
export const PARENT = {
  'Classer le travail dû': String.raw`// presti-boite : le travail dû de ce passage de 5 minutes (lu en base ; épinglé en simulation). Une ligne par boîte à relever, par brouillon à
// écrire (Studio) ou par envoi dû (Signature). Un genre inconnu est traité comme un envoi : son enfant le rejette au Contrat, sans effet.
const GENRES = ['boite', 'brouillon', 'envoi'];
return $input.all().map((item) => {
  const x = item.json || {};
  const genre = GENRES.includes(x.genre) ? x.genre : 'envoi';
  return { json: { ...x, genre: genre, est_boite: genre === 'boite', est_brouillon: genre === 'brouillon' } };
});`,
  'Préparer la relève': TETE_PASSAGE + String.raw`// presti-boite → lib-boite-lire@1 : une enveloppe par boîte. Simulation : vrai, toujours (elle ne passera à faux qu'au « go » de Benj).
return $input.all().map((item) => {
  const x = item.json;
  return { json: { contrat: 'lib-boite-lire@1', organisation_id: x.artisan_id, simulation: true, cle_idempotence: 'relever:' + x.canal.id + ':' + passage(x.maintenant),
    trace: { execution_parent: 'presti-boite:' + passage(x.maintenant), declencheur: 'presti-boite', tentative: 0 },
    config: { lot_max: 40, fenetre_jours: 7, reseaux: x.reseaux },
    donnees: { canal: x.canal, connexion: x.connexion, boite: x.boite, deja_importes: x.deja_importes, conversations: x.conversations, maintenant: x.maintenant } } };
});`,
  'Préparer le brouillon': TETE_PASSAGE + String.raw`// presti-boite → lib-boite-brouillon@1 : Studio. Le brouillon n'est jamais envoyé (l'enfant n'a aucun effet d'envoi).
return $input.all().map((item) => {
  const x = item.json;
  return { json: { contrat: 'lib-boite-brouillon@1', organisation_id: x.artisan_id, simulation: true, cle_idempotence: ('brouillon:' + x.donnees.proposition.id).slice(0, 80),
    trace: { execution_parent: 'presti-boite:' + passage(x.maintenant), declencheur: 'presti-boite', tentative: 0 }, config: x.config, donnees: x.donnees } };
});`,
  "Préparer l'envoi": TETE_PASSAGE + String.raw`// presti-boite → lib-boite-envoyer@1 : Signature, une réponse partie du pilote. L'enfant relit toutes les conditions avant l'effet.
return $input.all().map((item) => {
  const x = item.json;
  return { json: { contrat: 'lib-boite-envoyer@1', organisation_id: x.artisan_id, simulation: true, cle_idempotence: ('envoyer:' + (x.donnees && x.donnees.action ? x.donnees.action.id : 'inconnu')).slice(0, 80),
    trace: { execution_parent: 'presti-boite:' + passage(x.maintenant || '2026-01-01T00:00:00.000Z'), declencheur: 'presti-boite', tentative: 0 }, config: x.config, donnees: x.donnees } };
});`,
  'Bilan du passage': String.raw`// Bilan agrégé du passage, sans donnée de client : par contrat, le nombre de sorties par statut ; ce qui est prévu (messages déposés, brouillons,
// envois). Un effet FAIT en simulation, une sortie hors simulation ou un appel en erreur comptent en défaut.
const bilan = {};
let importes = 0, deposes = 0, brouillons = 0, envois_prevus = 0, defauts = 0, arret = null;
for (const { json: s } of $input.all()) {
  if (s && s.interrupteur_general === false) { arret = 'interrupteur_general_coupe'; continue; }
  const c = s && typeof s.contrat === 'string' ? s.contrat : 'appel en erreur';
  bilan[c] = bilan[c] || {};
  const st = s && typeof s.statut === 'string' ? s.statut : 'erreur';
  bilan[c][st] = (bilan[c][st] || 0) + 1;
  if (!s || !s.contrat || s.simulation !== true || (Array.isArray(s.effets_faits) && s.effets_faits.length)) defauts++;
  if (s && s.resultat && Number.isInteger(s.resultat.importes)) importes += s.resultat.importes;
  for (const f of s && Array.isArray(s.effets_prevus) ? s.effets_prevus : []) {
    if (f.effet === 'deposer_message') deposes++;
    if (f.effet === 'ajouter_brouillon_imap') brouillons++;
    if (f.effet === 'envoyer_smtp') envois_prevus++;
  }
}
return [{ json: { simulation: true, arret: arret, bilan: bilan, importes: importes, deposes: deposes, brouillons: brouillons, envois_prevus: envois_prevus, effets_faits: 0, defauts: defauts } }];`,
}

// ─── Les fixtures (fictives : « Exemple. » devant tout nom, adresses en .invalid) — la source des essais, du banc et du juge ─────────────────
export const ORG = '00000000-0000-4000-8000-000000000701'
export const ORG2 = '00000000-0000-4000-8000-000000000702'
export const CANAL = '00000000-0000-4000-8000-000000000711'
export const CANAL_B = '00000000-0000-4000-8000-000000000712'
export const CX = '00000000-0000-4000-8000-000000000721'
export const CX_B = '00000000-0000-4000-8000-000000000722'
export const SECRET = 'v1.' + 'a'.repeat(16) + '.' + 'b'.repeat(22) + '.' + 'c'.repeat(48) // chiffré FICTIF (aucun vrai secret), au format de lib/secretBox.ts
export const MAINTENANT = '2026-11-03T10:05:00.000Z'
export const ARTISAN_FICTIF = { nom: 'Exemple. Bâti-Démo', adresse: 'atelier@boite-exemple.invalid' }
export const REGLE_RESEAUX = { actifs: true, domaines: ['leboncoin.fr', 'linkedin.com'] }
export const msg = (uid, id, de, sujet, texte, date = '2026-11-03T09:58:00.000Z', nom = null) => ({ uid, message_id: id, de_email: de, de_nom: nom, sujet, texte, date })
export const enveloppe = (contrat, donnees, config, org = ORG, cle = 'exemple:essai:boite') => ({ contrat, organisation_id: org, simulation: true, cle_idempotence: cle,
  trace: { execution_parent: 'Exemple. essai : boîte', declencheur: 'essai', tentative: 0 }, config, donnees })
export const canalFictif = (id = CANAL, org = ORG) => ({ id, artisan_id: org, adresse: ARTISAN_FICTIF.adresse, derniere_releve: null })
export const connexionFictive = (over = {}) => ({ id: CX, artisan_id: ORG, fournisseur: 'imap', etat: 'active', secret_n8n: SECRET, verifiee_le: '2026-11-01T08:00:00.000Z', ...over })
export const lire = (messages, over = {}) => enveloppe('lib-boite-lire@1', {
  canal: canalFictif(), connexion: connexionFictive(), boite: { issue: 'ok', messages }, deja_importes: [], conversations: [], maintenant: MAINTENANT, ...(over.donnees || {}) },
  { lot_max: 40, fenetre_jours: 7, reseaux: REGLE_RESEAUX, ...(over.config || {}) }, over.org || ORG, over.cle || 'exemple:essai:lire')
export const CAS_LIRE_MELES = [
  msg(1, '<m1@client-a.invalid>', 'marie.exemple@client-a.invalid', 'Fuite sous l’évier', 'Bonjour, j’ai une fuite sous mon évier depuis ce matin, pouvez-vous passer ?', undefined, 'Exemple. Marie'),
  msg(2, '<m2@client-a.invalid>', 'marie.exemple@client-a.invalid', 'Re: Fuite sous l’évier', 'J’ajoute que le robinet goutte aussi, merci de me rappeler.', undefined, 'Exemple. Marie'),
  msg(3, '<m3@robot.invalid>', 'noreply@robot.invalid', 'Votre facture', 'Ceci est un message automatique envoyé par un robot, ne pas répondre.'),
  msg(4, '<m4@boite.invalid>', ARTISAN_FICTIF.adresse, 'Note pour moi', 'Penser à commander les joints pour la semaine prochaine.'),
  msg(5, '<m5@client-b.invalid>', 'paul.exemple@client-b.invalid', 'Salut', 'ok merci'),
  msg(6, '<m6@promo.invalid>', 'promo@boutique.invalid', 'Newsletter de novembre', 'Découvrez nos offres du mois, se désinscrire en bas de page.'),
  msg(7, '<m7@client-c.invalid>', 'luc.exemple@client-c.invalid', 'Devis salle de bains', 'Bonjour, je voudrais un devis pour refaire ma salle de bains complète.', undefined, 'Exemple. Luc'),
  msg(8, '<m8@leboncoin.fr>', 'alerte@leboncoin.fr', 'Nouveau message', 'Vous avez reçu un nouveau message sur votre annonce, répondez depuis l’application.'),
]
export const brouillonFictif = (over = {}) => enveloppe('lib-boite-brouillon@1', {
  proposition: { id: '00000000-0000-4000-8000-000000000731', conversation_id: '00000000-0000-4000-8000-000000000741', canal: 'email', objet: null, texte: 'Bonjour,\nMerci pour votre message, je passe jeudi matin voir la fuite. À très vite.', outil: 'repondre_client' },
  destinataire: { email: 'marie.exemple@client-a.invalid', opposition: null }, origine: { message_id: '<m1@client-a.invalid>', references: [], sujet: 'Fuite sous l’évier' },
  conformite: { verdict: 'accepte' }, connexion: connexionFictive(), deja_ecrits: [], maintenant: MAINTENANT, ...(over.donnees || {}) },
  { offre: 'studio', interrupteur_general: true, interrupteur_departement: true, artisan: ARTISAN_FICTIF, ...(over.config || {}) }, over.org || ORG, 'exemple:essai:brouillon')
export const envoiFictif = (over = {}) => enveloppe('lib-boite-envoyer@1', {
  action: { id: '00000000-0000-4000-8000-000000000751', type: 'reponse_prospect', statut: 'a_partir', prete_le: '2026-11-03T09:50:00.000Z', part_le: '2026-11-03T10:00:00.000Z', lead_id: '00000000-0000-4000-8000-000000000741' },
  proposition: { id: '00000000-0000-4000-8000-000000000731', conversation_id: '00000000-0000-4000-8000-000000000741', canal: 'email', objet: null, texte: 'Bonjour,\nMerci pour votre message, je passe jeudi matin voir la fuite. À très vite.', outil: 'repondre_client' },
  destinataire: { email: 'marie.exemple@client-a.invalid', opposition: null }, origine: { message_id: '<m1@client-a.invalid>', references: [], sujet: 'Fuite sous l’évier' },
  conformite: { verdict: 'accepte' }, connexion: connexionFictive(), maintenant: MAINTENANT, ...(over.donnees || {}) },
  { offre: 'signature', capacites: ['plateforme.ia.auto', 'assistant.pilote', 'relances.auto'], mode_reponse: 'auto', pilote: { drapeau: true, actif: true, types: { reponse_prospect: true } },
    parties_depuis_24h: 3, plafond_jour: 20, interrupteur_general: true, interrupteur_departement: true, artisan: ARTISAN_FICTIF, ...(over.config || {}) }, over.org || ORG, 'exemple:essai:envoyer')

// Le travail dû d'un passage de 5 minutes (essai de presti-boite) : deux boîtes du MÊME compte qui reçoivent le même message, un brouillon, un envoi, une ligne hors forme.
export const ADRESSE_B = 'bureau@boite-exemple.invalid'
export const MSG_M9 = msg(2, '<m9@client-a.invalid>', 'marie.exemple@client-a.invalid', 'Re: Fuite sous l’évier', 'Je viens d’écrire sur l’autre adresse : la fuite continue, merci de passer vite.', undefined, 'Exemple. Marie')
export const travailEssai = () => {
  const commun = { artisan_id: ORG, maintenant: MAINTENANT }
  const a = lire([CAS_LIRE_MELES[0], CAS_LIRE_MELES[6]]).donnees
  const b = lire([msg(1, '<m1@client-a.invalid>', 'marie.exemple@client-a.invalid', 'Fuite sous l’évier', CAS_LIRE_MELES[0].texte, undefined, 'Exemple. Marie'), MSG_M9], { donnees: { canal: { ...canalFictif(CANAL_B), adresse: ADRESSE_B }, connexion: connexionFictive({ id: CX_B }) } }).donnees
  const br = brouillonFictif(), ev = envoiFictif()
  return {
    'Toutes les 5 minutes': [{ json: {} }],
    "Lire l'interrupteur général (simulation : épinglé)": [{ json: { interrupteur_general: true } }],
    'Lire le travail dû (simulation : épinglé)': [
      { json: { genre: 'boite', ...commun, canal: a.canal, connexion: a.connexion, boite: a.boite, deja_importes: [], conversations: [], reseaux: REGLE_RESEAUX } },
      { json: { genre: 'boite', ...commun, canal: b.canal, connexion: b.connexion, boite: b.boite, deja_importes: [], conversations: [], reseaux: REGLE_RESEAUX } },
      { json: { genre: 'brouillon', ...commun, config: br.config, donnees: br.donnees } },
      { json: { genre: 'envoi', ...commun, config: ev.config, donnees: ev.donnees } },
      { json: { genre: 'envoi', ...commun, config: {}, donnees: {} } },
    ],
  }
}

// ─── Le code SDK ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IF_ = (nom, champ, notes) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${J(champ.replace(/\W/g, '-'))}, leftValue: expr(${J('{{ ' + champ + ' }}')}), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const CODE_ = (nom, js, notes, pos) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, ${pos ? `position: ${J(pos)}, ` : ''}${notes ? `notes: ${J(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
const ARRET = (pos) => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', position: ${J(pos)}, notes: "Mode A : l'effet réel (IMAP, SMTP, base) n'est pas branché. Il le sera au « go » de Benj, derrière cette même porte.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (mode A, tâche 036-003). Rien n'a été écrit ni envoyé." } } })`
const APPEL = (nom, id, notes) => `node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J(nom)}, notes: ${J(notes)}, onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(id)} }, mode: 'once', options: { waitForSubWorkflow: true } } } })`
const NOOP = (nom, notes) => `node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: ${J(nom)}, notes: ${J(notes)}, parameters: {} } })`
const REGLAGES = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false, saveManualExecutions: true }
export const reglagesEnfant = (idErreur, appelants) => ({ ...REGLAGES, errorWorkflow: idErreur, ...(appelants ? { callerPolicy: 'workflowsFromAList', callerIds: appelants } : { callerPolicy: 'none' }) })
export const reglagesParent = (idErreur, t = 240) => ({ ...REGLAGES, executionTimeout: t, errorWorkflow: idErreur, callerPolicy: 'none' })

const FICHES = {
  'lib-boite-lire': "Lecteur de boîte (A11) : refait releverCanal (lib/releveCanal.ts:68) dans n8n. Chaque message entre UNE fois (compte + Message-ID), dans la conversation du client quel que soit le canal, avec son canal d'origine. Jeton refusé ou expiré : le département se tait, l'état « erreur » est prévu pour Connexions, l'alerte part par lib-alerter.",
  'lib-boite-brouillon': "Écrivain de brouillon (Studio) : la réponse préparée devient un brouillon dans le dossier Brouillons de l'artisan (IMAP APPEND, drapeau \\Draft). JAMAIS envoyé : ce workflow n'a aucun effet d'envoi.",
  'lib-boite-envoyer': "Envoi SMTP (Signature) après le délai du pilote. Le nœud d'envoi est DÉSACTIVÉ, derrière la sortie « faux » de la porte « simulation ». Toutes les conditions du pilote sont relues avant l'effet ; au nom de l'artisan, son adresse en réponse, mention d'IA en pied.",
}
const NOTE_ENFANT = (nom) => `const note = sticky(${J(`## ${nom} (036-003)\n${FICHES[nom]}\nContrat ${nom}@1 (enveloppe@1, gabarit « Contrat » de 035-003). Appelé par presti-boite et par presti-banc-boite.\nINACTIF, jamais publié, en simulation (mode A) : la boîte et la base sont épinglées, les écritures partent dans effets_prevus. Aucun identifiant.\nJuge : scripts/boite-n8n-qa.mjs`)}, [appele, entree, conforme], { color: 4 });`
const TETE = (contrat, schema, declencheur = 'Appelé par presti-boite') => [
  `const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: ${J(declencheur)}, position: [0, 0], parameters: { inputSource: 'passthrough' } } });`,
  `const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, schema), `contrat: ${contrat}`, [240, 0])};`,
  `const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};`,
  `const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), null, [1480, 0])};`]
const PORTE = `const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché en mode A.")};`
const IMPORTS = "import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';"
const NOMS_LOGIQUE = { 'lib-boite-lire': 'Lire la boîte épinglée et la ranger', 'lib-boite-brouillon': 'Préparer le brouillon', 'lib-boite-envoyer': "Préparer l'envoi" }
const CODES = { 'lib-boite-lire': CODE_LIRE, 'lib-boite-brouillon': CODE_BROUILLON, 'lib-boite-envoyer': CODE_ENVOYER }
const MENTION_NOEUD = '\n\n—\nMessage rédigé et envoyé automatiquement par l’assistant de '
export function sdkEnfant(nom, reglages = reglagesEnfant(ERREUR, null), codes = CODES) {
  const contrat = `${nom}@1`
  const l = [IMPORTS, ...TETE(contrat, SCHEMAS[nom]), PORTE, `const logique = ${CODE_(NOMS_LOGIQUE[nom], codes[nom], null, [480, 0])};`, NOTE_ENFANT(nom)]
  if (nom === 'lib-boite-envoyer') {
    // Le nœud d'envoi SMTP : DÉSACTIVÉ, sans identifiant, atteignable seulement par la sortie « faux » de la porte (R15). Pied déclaré : mention d'IA (R4).
    l.push(`const arret = ${ARRET([1240, 120])};`)
    l.push(`const envoi = node({ type: 'n8n-nodes-base.emailSend', version: 2.1, config: { name: 'Envoyer la réponse (SMTP, désactivé)', position: [1000, 120], disabled: true, notes: ${J("pied: mention\nDÉSACTIVÉ. Gabarit de la forme de l'envoi : au nom de l'artisan, son adresse en réponse. Pour un artisan, l'identifiant SMTP vient de sa connexion chiffrée (décision 1), pas d'un identifiant n8n : le vrai nœud (Code, nodemailer) est préparé dans connecteurs/imap.md et remplacera celui-ci au « go » de Benj.")}, parameters: { operation: 'send', fromEmail: expr('{{ $json.envoi.expediteur }}'), toEmail: expr('{{ $json.envoi.destinataire }}'), subject: expr('{{ $json.envoi.objet }}'), emailFormat: 'text', text: expr(${J('{{ $json.envoi.corps }}' + MENTION_NOEUD + '{{ $json.envoi.nom_artisan }}.')}), options: { appendAttribution: false, replyTo: expr('{{ $json.envoi.reply_to }}') } } } });`)
    l.push(`export default workflow(${J(nom)}, ${J(nom)}, { settings: ${J(reglages)} })\n  .add(appele).to(entree).to(conforme.onTrue(logique.to(porte.onTrue(sortie).onFalse(envoi.to(arret)))).onFalse(sortie))\n  .add(note);`)
  } else {
    l.push(`const arret = ${ARRET([1240, 120])};`)
    l.push(`export default workflow(${J(nom)}, ${J(nom)}, { settings: ${J(reglages)} })\n  .add(appele).to(entree).to(conforme.onTrue(porte.onTrue(logique.to(sortie)).onFalse(arret)).onFalse(sortie))\n  .add(note);`)
  }
  return l.join('\n') + '\n'
}

export function sdkParent(ids, idErreur = ERREUR) {
  const l = [IMPORTS.replace('trigger, ifElse', 'trigger, ifElse, merge'),
    `const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Toutes les 5 minutes', notes: "Cadence de la relève : un e-mail reçu à 7 h 05 n'attend plus le lendemain (le cron Vercel de 7 h, app/api/canaux/relever/route.ts:9-25, reste en place jusqu'au pas 4 de la migration).", parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } } } });`,
    `const inter = ${NOOP("Lire l'interrupteur général (simulation : épinglé)", "requete : GET systeme_reglages?select=interrupteur_general&artisan_id=is.null&limit=1\nSimulation : emplacement épinglé (données fictives). Réel : cette lecture, select= limité. Non épinglé, il ne rend rien d'utile et le passage s'arrête sans effet (fail-closed).")};`,
    `const siInter = ${IF_('Interrupteur général ouvert ?', '$json.interrupteur_general === true', "Faux (coupé, absent ou illisible) : le passage s'arrête, rien n'est appelé.")};`,
    `const travail = ${NOOP('Lire le travail dû (simulation : épinglé)', "Une ligne par boîte à relever (canaux actifs, connexions, Message-ID déjà importés, conversations ouvertes de 30 jours), par brouillon à écrire (Studio) et par envoi dû (Signature, 10 minutes écoulées).\nSimulation : emplacement épinglé. Réel : lectures HTTP, select= limité, filtre artisan_id (vue étroite à naître). Contrats : plans/011-cadrage-01-11/p6-signature/contrats/boite.json.")};`,
    `const classer = ${CODE_('Classer le travail dû', PARENT['Classer le travail dû'])};`,
    `const siBoite = ${IF_('Une boîte à relever ?', '$json.est_boite')};`,
    `const siBrouillon = ${IF_('Un brouillon à écrire ?', '$json.est_brouillon', 'Faux : un envoi dû (Signature) ou une ligne hors forme, rejetée au Contrat par l\'enfant.')};`,
    `const prepLire = ${CODE_('Préparer la relève', PARENT['Préparer la relève'])};`,
    `const prepBrouillon = ${CODE_('Préparer le brouillon', PARENT['Préparer le brouillon'])};`,
    `const prepEnvoi = ${CODE_("Préparer l'envoi", PARENT["Préparer l'envoi"])};`,
    `const appelLire = ${APPEL('Appeler lib-boite-lire', ids['lib-boite-lire'], 'Lecteur de boîte (036-003). Une enveloppe par boîte ; un échec ne fait pas échouer le passage.')};`,
    `const appelBrouillon = ${APPEL('Appeler lib-boite-brouillon', ids['lib-boite-brouillon'], 'Brouillon de Studio (036-003) : écrit, jamais envoyé.')};`,
    `const appelEnvoi = ${APPEL('Appeler lib-boite-envoyer', ids['lib-boite-envoyer'], 'Envoi de Signature (036-003) : nœud SMTP désactivé, toutes les conditions du pilote relues.')};`,
    `const reunir = merge({ version: 3.2, config: { name: 'Réunir les sorties', parameters: { mode: 'append', numberInputs: 3 } } });`,
    `const bilan = ${CODE_('Bilan du passage', PARENT['Bilan du passage'])};`,
    `const note = sticky(${J("## presti-boite (036-003)\nLa boîte mail de l'artisan DANS la plateforme (p6:279-285, A11) : toutes les 5 minutes, chaque message est relevé, déposé UNE fois dans la conversation du client, puis la réponse préparée devient un brouillon (Studio) ou part (Signature, après le délai du pilote).\nINACTIF, jamais publié, en simulation (mode A) : les lectures sont épinglées, aucune écriture n'est faite (effets_prevus). Aucun identifiant.\nCe workflow ne relève QUE la boîte ; la qualification et la rédaction restent à presti-dep-accueil.\nPas 1 à 3 de .claude/rules/migration-production.md pour la relève quotidienne ; les pas 4 et 5 restent à Benj.\nJuge : scripts/boite-n8n-qa.mjs")}, [horloge, inter], { color: 4 });`,
    `export default workflow('presti-boite', 'presti-boite', { settings: ${J(reglagesParent(idErreur))} })
  .add(horloge).to(inter).to(siInter.onTrue(travail.to(classer).to(siBoite.onTrue(prepLire.to(appelLire.to(reunir.input(0)))).onFalse(siBrouillon.onTrue(prepBrouillon.to(appelBrouillon.to(reunir.input(1)))).onFalse(prepEnvoi.to(appelEnvoi.to(reunir.input(2))))))).onFalse(bilan))
  .add(reunir).to(bilan)
  .add(note);`]
  return l.join('\n') + '\n'
}

// ─── Le banc presti-banc-boite : cinq cas fictifs, seul appelant des trois enfants avec presti-boite ───────────────────────────────────────────
// Dans le banc, les adresses fictives sont écrites avec « ¤ » à la place de l'arobase, que le nœud Code remet à l'exécution : aucune adresse e-mail n'est écrite telle quelle dans l'export (R8 de scripts/n8n-specs-qa.mjs).
const ARO = (o) => J(o).replace(/@(?=[A-Za-z0-9-]+\.[A-Za-z])/g, '¤')
const CAS = (commentaire, o) => commentaire + '\nconst cas = ' + ARO(o) + ';\nreturn [JSON.parse(JSON.stringify(cas).split("¤").join(String.fromCharCode(64)))].map((j) => ({ json: j }));'
export const CAS_BANC = [
  ['lib-boite-lire', 'Cas : relève mêlée', CAS('// Exemple. Huit messages fictifs : deux du même client, un robot, un envoi à soi-même, un trop court, une newsletter, un client sûr, un réseau.', lire(CAS_LIRE_MELES, { cle: 'exemple:banc:lire-meles' }))],
  ['lib-boite-lire', 'Cas : autorisation expirée', CAS("// Exemple. Le jeton est refusé : le département se tait, l'état « erreur » est prévu, l'alerte part par lib-alerter (épinglé).", lire([], { donnees: { boite: { issue: 'jeton_expire', messages: [] } }, cle: 'exemple:banc:lire-expire' }))],
  ['lib-boite-brouillon', 'Cas : brouillon de Studio', CAS('// Exemple. Studio : la réponse préparée devient un brouillon, jamais envoyée.', brouillonFictif())],
  ['lib-boite-envoyer', 'Cas : envoi de Signature', CAS("// Exemple. Signature, tout est réuni, 10 minutes écoulées : l'envoi est prévu (nœud désactivé).", envoiFictif())],
  ['lib-boite-envoyer', 'Cas : envoi refusé en Studio', CAS("// Exemple. Studio : jamais d'envoi ; l'action repasse en carte.", envoiFictif({ config: { offre: 'studio', capacites: ['plateforme.conversation'] } }))],
]
export function sdkBanc(ids, idErreur = ERREUR) {
  const l = [IMPORTS.replace(', ifElse', '').replace(', expr', ''),
    "const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Banc (jamais publié)', position: [0, 0], parameters: { rule: { interval: [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 6 }] } } } });"]
  CAS_BANC.forEach(([lib, nom, js], i) => {
    const y = (i - 2) * 160
    l.push(`const cas${i} = ${CODE_(nom, js, null, [260, y])};`)
    l.push(`const appel${i} = node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J('Appeler ' + lib + ' (' + (i + 1) + ')')}, position: [520, ${y}], onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(ids[lib])} }, mode: 'once', options: { waitForSubWorkflow: true } } } });`)
  })
  l.push(`const bilan = ${CODE_('Bilan du banc', CODE_BILAN, null, [800, 0])};`)
  l.push(`const note = sticky(${J("## presti-banc-boite (036-003)\nBanc d'essai de la boîte : cinq cas fictifs (« Exemple. »), le seul appelant permis des trois enfants avec presti-boite.\nINACTIF, jamais publié, jamais planifié (son déclencheur ne se déclenche que si quelqu'un l'active). Ne lit ni n'écrit rien en base, n'envoie rien.\nJuge : scripts/boite-n8n-qa.mjs")}, [horloge, cas2], { color: 4 });`)
  l.push(`export default workflow('presti-banc-boite', 'presti-banc-boite', { settings: ${J({ ...REGLAGES, executionTimeout: 120, errorWorkflow: idErreur, callerPolicy: 'none' })} })`)
  CAS_BANC.forEach((_, i) => l.push(`  .add(horloge).to(cas${i}).to(appel${i}).to(bilan)`))
  l.push('  .add(note);')
  return l.join('\n') + '\n'
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || null
  if (process.argv.includes('--contrats')) {
    const dossier = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats')
    mkdirSync(dossier, { recursive: true })
    for (const [nom, c] of Object.entries(contrats())) writeFileSync(path.join(dossier, nom), JSON.stringify(c, null, 2) + '\n')
    console.log('contrats écrits dans ' + dossier)
  } else {
    const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/boite'
    mkdirSync(dossier, { recursive: true })
    const ids = JSON.parse(arg('ids') || '{}')
    for (const nom of ENFANTS) writeFileSync(path.join(dossier, `${nom}.sdk.js`), sdkEnfant(nom, reglagesEnfant(arg('erreur') || ERREUR, null)))
    writeFileSync(path.join(dossier, 'presti-boite.sdk.js'), sdkParent(ids, arg('erreur') || ERREUR))
    writeFileSync(path.join(dossier, 'presti-banc-boite.sdk.js'), sdkBanc(ids, arg('erreur') || ERREUR))
    console.log(`SDK écrits dans ${dossier} : ${[...ENFANTS, 'presti-boite', 'presti-banc-boite'].join(', ')}`)
  }
}
