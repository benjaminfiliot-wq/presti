// 035-007 — fabrique de la démonstration du mode A : le parent `ent-exemple-parent` (il route, il ne calcule rien) et les cinq chaînes
// d'agents `ent-exemple-qualification`, `-relance`, `-redaction`, `-alerte`, `-reporting` (premiere-reponse.md § 4.3 à 4.6, § 5.3, § 5.5),
// sur la configuration fictive « Exemple. Bâti-Démo » (035-006). Hors ligne : aucun réseau, aucune base, aucun modèle, aucune donnée réelle.
// Les chaînes APPELLENT les `lib-*` de 035-003, 035-004 et 035-005 (Execute Sub-workflow, source database, identifiant fixe) ; elles ne
// les réécrivent pas. Le gabarit « Contrat » (codeEntree, codeSortie) est celui du socle 035-003, tel quel.
//   node .orchestre/preuves/035-007/construire.mjs [/tmp/ent-exemple] [--ids=<json des ent-exemple-*>]
//   → écrit les programmes SDK (collés tels quels dans validate_workflow puis create_workflow_from_code) et les cas épinglés.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie } from '../035-003/construire.mjs'
import * as F4 from '../035-004/construire.mjs'
import * as F5 from '../035-005/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const ORG = F5.ORG
export const MAINTENANT = F5.MAINTENANT // mardi 3 novembre 2026, 9 h 30, heure de Paris
export const PASSAGE = '2026-11-03T0930'
export const ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
// Les `lib-*` appelés (ids relevés par search_workflows le 03/11/2026 ; ils sont aussi dans les exports de 035-003, 035-004, 035-005).
export const LIBS = {
  'lib-capturer-lead': 'yj7KzcEjf04iTAcm', 'lib-qualifier-lead': 'uvGWZR8fHnXURRV6', 'lib-decider': 'hckqX1tQjIommtTH',
  'lib-dedoublonner': 'MnNHht0kG7S6ehDV', 'lib-journaliser': 'NQg0KDXIa5hhzAvq', 'lib-alerter': 'meYNTqcDsMzcFjdr',
  'lib-disjoncteur': 'zmmR9U9S0gc3X6tC', 'lib-battement': 'XwjyA6PFjzlI2vpd', 'lib-relancer': 'jGM56jxeLUVXZIiM',
  'lib-rediger-message': 'xfRUnkwOKSwQezVb', 'lib-porte-conformite': '8c8vkUeSkfgB5FAM', 'lib-executer': 'ADX5mPWqIvq1LGs6',
  'lib-rapport-hebdo': '1BFHQyfhuNpTmlrj',
}
export const AGENTS = ['qualification', 'relance', 'redaction', 'alerte', 'reporting']
export const CHAINES = AGENTS.map((a) => `ent-exemple-${a}`)

// ─── Les contrats des chaînes (enveloppe@1 ; config et donnees propres à chaque chaîne, fermés) ─────────────────────────────────
const S = (o) => o
const uuid = { type: 'string', format: 'uuid' }
const cles = { type: 'array', maxItems: 1000, items: { type: 'string', maxLength: 80 } }
const objet = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props })
const libre = { type: 'object' }
export const SCHEMAS = {
  'ent-exemple-qualification': S({ sans_contact: true,
    config: objet({ grille: { type: 'array', maxItems: 30 }, seuils: libre, delais_cibles_min: libre, autonomie: libre, plan: { type: ['string', 'null'], maxLength: 20 }, pilote: libre, parties_depuis_24h: { type: ['integer', 'null'], minimum: 0 } }),
    donnees: objet({ evenements: { type: 'array', maxItems: 200, items: { type: 'object', required: ['id', 'type', 'recu_le', 'champs'], properties: { id: uuid, type: { const: 'demande_recue' } } } },
      empreintes_connues: { type: 'array', maxItems: 1000 }, cles_connues: cles, escalade: { type: 'array', maxItems: 1000, items: uuid } }) }),
  'ent-exemple-relance': S({ sans_contact: true,
    config: objet({ regles: libre, canal: objet({ facture: { enum: ['email', 'sms'] }, devis: { enum: ['email', 'sms'] }, conversation: { enum: ['email', 'sms'] } }), cible: { const: 'carte' } }),
    donnees: objet({ objets: { type: 'array', maxItems: 200, items: objet({ objet_type: { enum: ['devis', 'facture', 'conversation'] }, objet_id: uuid, depuis_le: { type: 'string', format: 'date-time' },
      historique: libre, paliers_envoyes: { type: 'array', maxItems: 10 }, stop: { type: ['boolean', 'null'] }, escalade: { type: ['boolean', 'null'] }, faits: libre,
      destinataire: objet({ opposition: { type: ['boolean', 'null'] }, consentement_sms: { type: ['boolean', 'null'] }, escalade: { type: ['boolean', 'null'] } }) }) },
      maintenant: { type: 'string', format: 'date-time' }, cles_connues: cles }) }),
  'ent-exemple-redaction': S({ sans_contact: true,
    config: objet({ redaction: libre, porte: libre, niveau_max: { type: 'integer', minimum: 1, maximum: 2 } }),
    donnees: objet({ demandes: { type: 'array', maxItems: 200, items: objet({ action_cle: { type: 'string', minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9_:@.#-]+$' },
      objet_type: { enum: ['demande', 'devis', 'facture', 'conversation', 'chantier'] }, objet_id: uuid, palier: { type: ['integer', 'null'], minimum: 1, maximum: 10 },
      canal: { enum: ['email', 'sms'] }, type_action: { type: 'string', pattern: '^[a-z_]{2,60}$' }, outil: { type: 'string', pattern: '^[a-z_]{2,60}$' }, cible: { enum: ['carte', 'pilote'] },
      faits: libre, destinataire: libre }) },
      interrupteurs: { type: ['object', 'null'] }, cles_existantes: { type: ['array', 'null'], maxItems: 1000 }, compteurs: libre, maintenant: { type: 'string', format: 'date-time' } }) }),
  'ent-exemple-alerte': S({ sans_contact: true,
    config: objet({ seuils: objet({ demande_qui_stagne_min: { type: 'integer', minimum: 1 }, echeance_proche_jours: { type: 'integer', minimum: 1 } }), destinataires: libre, alertes_recentes: { type: 'array', maxItems: 500 } }),
    donnees: objet({ balayages: { type: 'array', maxItems: 24, items: objet({ survenue_le: { type: 'string', format: 'date-time' }, agregats: objet({
      demande_la_plus_ancienne_min: { type: ['integer', 'null'], minimum: 0 }, factures_a_echeance_proche: { type: ['integer', 'null'], minimum: 0 },
      disjoncteurs_ouverts: { type: ['array', 'null'], maxItems: 20, items: { type: 'string', pattern: '^(ent|lib)-[a-z0-9-]+$' } },
      battements_absents: { type: ['array', 'null'], maxItems: 20, items: { type: 'string', pattern: '^(ent|lib|presti)-[a-z0-9-]+$' } } }) }) } }) }),
  'ent-exemple-reporting': S({ sans_contact: true,
    config: objet({ periode: { enum: ['semaine', 'mois'] }, kpis: { type: 'array', minItems: 1, maxItems: 20 }, bases_de_depart: libre }),
    donnees: objet({ rapports: { type: 'array', maxItems: 4, items: objet({ du: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, au: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, actions: { type: 'array', maxItems: 5000 } }) }, cles_connues: cles }) }),
}

// ─── Le code des nœuds des chaînes ───────────────────────────────────────────────────────────────────────────────────────────────
// Le commun : l'enveloppe reçue, la fabrique des enveloppes vers les lib-*, la lecture des sorties d'un appel (rien s'il n'a pas tourné).
const COMMUN = (agent) => String.raw`const AGENT = '${agent}';
const E = $("Contrat d'entrée").first().json.enveloppe;
const C = E.config, D = E.donnees;
const env = (contrat, cle, config, donnees) => ({ contrat: contrat, organisation_id: E.organisation_id, simulation: E.simulation, cle_idempotence: String(cle).slice(0, 80), trace: { execution_parent: String(E.trace.execution_parent), declencheur: AGENT, tentative: E.trace.tentative }, config: config, donnees: donnees });
const sorties = (nom) => { const n = $(nom); return n.isExecuted ? n.all().map((x) => x.json) : []; };
const neuf = (s) => !!(s && s.contrat === 'lib-dedoublonner@1' && s.resultat && s.resultat.deja_fait === false);
const VIDE = [{ json: { vide: true } }];
`
// Le journal de la chaîne : une ligne par décision rendue par les lib-*, au contrat de lib-journaliser@1 ; jamais un nom ni un contact.
const JOURNAL = (lignes) => String.raw`const L = [];
const ligne = (evenement, objet_ref, decision) => L.push({ evenement: evenement, agent: AGENT, objet_ref: objet_ref === null || objet_ref === undefined ? null : String(objet_ref).slice(0, 80), decision: String(decision).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: E.simulation });
const echec = (nom, s) => !s || typeof s.contrat !== 'string' || s.statut === 'erreur' || s.statut === 'rejete';
` + lignes + String.raw`
if (!L.length) ligne('passage_sans_evenement', null, 'rien à traiter dans ce lot');
return [{ json: env('lib-journaliser@1', 'j:' + E.cle_idempotence, {}, { entrees: L.slice(0, 200) }) }];`
// L'assemblage : la sortie de la chaîne, au format attendu par le Contrat de sortie (enveloppe, statut, resultat, effets, journal, erreurs).
const ASSEMBLER = (appels, resultat, rien) => String.raw`const APPELS = ${JSON.stringify(appels)};
const erreurs = [], effets = [];
for (const nom of APPELS) for (const s of sorties(nom)) {
  if (!s || typeof s.contrat !== 'string') { erreurs.push(nom + ' : appel en échec'); continue; }
  if (s.statut === 'erreur' || s.statut === 'rejete') erreurs.push(nom + ' : ' + s.statut + (Array.isArray(s.erreurs) && s.erreurs[0] ? ' (' + String(s.erreurs[0]).slice(0, 120) + ')' : ''));
  if (Array.isArray(s.effets_prevus)) for (const e of s.effets_prevus) effets.push(e);
  if (Array.isArray(s.effets_faits) && s.effets_faits.length) erreurs.push(nom + ' : effet fait en simulation');
}
const jr = sorties('Appeler lib-journaliser')[0];
const journal = jr && Array.isArray(jr.journal) ? jr.journal : [];
` + resultat + String.raw`
const statut = erreurs.length ? 'erreur' : (${rien}) ? 'rien_a_faire' : 'ok';
return [{ json: { enveloppe: E, statut: statut, resultat: resultat, effets_prevus: effets.slice(0, 1000), effets_faits: [], journal: journal, erreurs: erreurs.slice(0, 20) } }];`

// ── ent-exemple-qualification (Exemple. I1) : dédoublonner → qualifier → décider → journaliser. Aucun modèle (fiche § 5.3).
const QUALIF = {
  'Préparer le dédoublonnage': String.raw`// Qualification (I1) : chaque demande reçue reçoit sa clé (organisation, qualification, demande, première réponse). Une clé déjà réservée
// par un passage précédent (lecture prévue des clés, épinglée en mode A : D.cles_connues) donne « déjà fait » : le rejeu ne refait rien.
` + COMMUN('ent-exemple-qualification') + String.raw`const s = D.evenements.map((ev) => ({ json: env('lib-dedoublonner@1', 'q:' + ev.id, { cles_connues: D.cles_connues }, { type: 'qualification', objet_id: ev.id, etape: 'premiere-reponse' }) }));
return s.length ? s : VIDE;`,
  'Préparer la qualification': String.raw`// Qualification : seules les demandes neuves sont notées, selon la grille écrite avec le client (lib-qualifier-lead, sans modèle) ; le
// doublon se lit sur l'empreinte du contact, jamais sur le contact (question 27).
` + COMMUN('ent-exemple-qualification') + String.raw`const envs = $('Préparer le dédoublonnage').all().map((x) => x.json);
const parId = {}; for (const ev of D.evenements) parId[ev.id] = ev;
const s = [];
$input.all().forEach((x, i) => { if (!neuf(x.json) || !envs[i]) return; const ev = parId[envs[i].donnees.objet_id]; if (!ev) return;
  s.push({ json: env('lib-qualifier-lead@1', 'q:' + ev.id, { grille: C.grille, seuils: C.seuils, delais_cibles_min: C.delais_cibles_min, empreintes_connues: D.empreintes_connues }, { lead_id: ev.id, evenement_id: ev.id, empreinte_contact: ev.empreinte_contact === undefined ? null : ev.empreinte_contact, champs: ev.champs }) }); });
return s.length ? s : VIDE;`,
  'Préparer la décision': String.raw`// Qualification : chaque demande notée devient une décision « valider la réponse proposée » (lib-decider). L'escalade est ce que relira le
// pilote au départ (lecture prévue, épinglée : D.escalade). Mode A : niveau 2 au plus, la décision reste une carte (question 1).
` + COMMUN('ent-exemple-qualification') + String.raw`const s = [];
for (const { json: q } of $input.all()) { const r = q && q.contrat === 'lib-qualifier-lead@1' && q.statut === 'ok' ? q.resultat : null; if (!r) continue;
  s.push({ json: env('lib-decider@1', 'd:' + r.lead_id, { autonomie: C.autonomie, plan: C.plan, pilote: C.pilote, parties_depuis_24h: C.parties_depuis_24h }, { objet_type: 'demande', objet_id: r.lead_id, constat: { outil: 'valider_reponse_proposee', etape: 'premiere-reponse', escalade: D.escalade.includes(r.lead_id) } }) }); }
return s.length ? s : VIDE;`,
  'Préparer le journal': `// Qualification : une ligne de journal par décision des lib-* (sans nom, sans contact, sans texte de client).\n` + COMMUN('ent-exemple-qualification') + JOURNAL(String.raw`for (const s of sorties('Appeler lib-dedoublonner')) { if (echec('dd', s)) ligne('appel_en_echec', null, 'lib-dedoublonner'); else if (s.resultat.deja_fait) ligne('deja_traite', s.cle_idempotence.slice(2), 'clé déjà réservée : rien de refait'); }
for (const s of sorties('Appeler lib-qualifier-lead')) { if (echec('q', s)) ligne('appel_en_echec', null, 'lib-qualifier-lead'); else if (s.statut === 'refuse') ligne('qualification_refusee', null, 'grille refusée : ' + (s.erreurs || []).join(' ; ')); else if (s.resultat) ligne('qualification', s.resultat.lead_id, 'note ' + s.resultat.note + ', priorité ' + s.resultat.priorite + (s.resultat.doublon ? ', doublon' : '')); }
for (const s of sorties('Appeler lib-decider')) { if (echec('d', s)) ligne('appel_en_echec', null, 'lib-decider'); else if (s.resultat) ligne('decision', s.resultat.objet_id, s.resultat.action + ', niveau ' + s.resultat.niveau + ' (' + s.resultat.motif + ')'); }`),
  'Assembler': `// Qualification : la sortie de la chaîne. Aucune demande de rédaction : lib-rediger-message@1 ne rédige que des relances (écart écrit dans\n// la preuve) ; la carte « valider la réponse proposée » suffit en mode A.\n` + COMMUN('ent-exemple-qualification') + ASSEMBLER(['Appeler lib-dedoublonner', 'Appeler lib-qualifier-lead', 'Appeler lib-decider', 'Appeler lib-journaliser'], String.raw`const dd = sorties('Appeler lib-dedoublonner');
const resultat = {
  evenements_recus: D.evenements.length, deja_faits: dd.filter((s) => s && s.resultat && s.resultat.deja_fait === true).length,
  qualifies: sorties('Appeler lib-qualifier-lead').filter((s) => s && s.resultat).map((s) => ({ lead_id: s.resultat.lead_id, note: s.resultat.note, priorite: s.resultat.priorite, categorie: s.resultat.categorie, delai_cible_min: s.resultat.delai_cible_min, doublon: s.resultat.doublon })),
  decisions: sorties('Appeler lib-decider').filter((s) => s && s.resultat).map((s) => ({ objet_id: s.resultat.objet_id, action: s.resultat.action, niveau: s.resultat.niveau, motif: s.resultat.motif, cle_idempotence: s.resultat.cle_idempotence })),
  demandes_redaction: [],
};`, 'resultat.evenements_recus === 0 || resultat.deja_faits === resultat.evenements_recus'),
}
// ── ent-exemple-relance (Exemple. I2, I3) : relancer → dédoublonner → journaliser ; rend des demandes de rédaction, que le parent route.
const RELANCE = {
  'Préparer les relances': String.raw`// Relance (I2, I3) : chaque objet sans réponse (devis envoyé, facture échue, conversation) passe la règle « palier atteint et non envoyé »,
// le registre de 3 jours, le stop, le litige ou l'escalade et les horaires (lib-relancer, des règles, aucun modèle).
` + COMMUN('ent-exemple-relance') + String.raw`const s = D.objets.map((o) => ({ json: env('lib-relancer@1', 'r:' + o.objet_id, C.regles, { objet_type: o.objet_type, objet_id: o.objet_id, depuis_le: o.depuis_le, maintenant: D.maintenant, historique: o.historique, paliers_envoyes: o.paliers_envoyes, stop: o.stop, escalade: o.escalade }) }));
return s.length ? s : VIDE;`,
  'Préparer le dédoublonnage': String.raw`// Relance : un palier à relancer reçoit sa clé (organisation, relance, objet, palier) ; déjà réservée, il ne repart pas (rejeu sans doublon).
` + COMMUN('ent-exemple-relance') + String.raw`const s = [];
for (const { json: x } of $input.all()) { const r = x && x.contrat === 'lib-relancer@1' && x.statut === 'ok' ? x.resultat : null; if (!r || r.a_relancer !== true) continue;
  s.push({ json: env('lib-dedoublonner@1', r.cle_idempotence, { cles_connues: D.cles_connues }, { type: 'relance', objet_id: r.objet_id, etape: 'palier-' + r.palier }) }); }
return s.length ? s : VIDE;`,
  'Préparer le journal': `// Relance : une ligne par décision de lib-relancer et par clé déjà réservée.\n` + COMMUN('ent-exemple-relance') + JOURNAL(String.raw`for (const s of sorties('Appeler lib-relancer')) { if (echec('r', s)) ligne('appel_en_echec', null, 'lib-relancer'); else if (s.resultat) ligne(s.resultat.a_relancer ? 'relance_a_preparer' : 'relance_ecartee', s.resultat.objet_id, (s.resultat.a_relancer ? 'palier ' + s.resultat.palier : 'écartée') + ' (' + s.resultat.motif + ')'); }
for (const s of sorties('Appeler lib-dedoublonner')) { if (echec('dd', s)) ligne('appel_en_echec', null, 'lib-dedoublonner'); else if (s.resultat.deja_fait) ligne('deja_traite', null, 'palier déjà préparé : rien de refait'); }`),
  'Assembler': `// Relance : la sortie. Chaque palier neuf devient une DEMANDE DE RÉDACTION (faits calculés par le code, jamais un nom ni une adresse),\n// que le parent route vers ent-exemple-redaction : la relance n'appelle pas la rédaction elle-même (trois étages au plus, § 4.6).\n` + COMMUN('ent-exemple-relance') + ASSEMBLER(['Appeler lib-relancer', 'Appeler lib-dedoublonner', 'Appeler lib-journaliser'], String.raw`const parId = {}; for (const o of D.objets) parId[o.objet_id] = o;
const decisions = sorties('Appeler lib-relancer').filter((s) => s && s.resultat).map((s) => ({ objet_type: s.resultat.objet_type, objet_id: s.resultat.objet_id, a_relancer: s.resultat.a_relancer, palier: s.resultat.palier, motif: s.resultat.motif, cle_idempotence: s.resultat.cle_idempotence }));
const neufs = new Set(sorties('Appeler lib-dedoublonner').filter(neuf).map((s) => s.cle_idempotence));
const demandes_redaction = decisions.filter((d) => d.a_relancer && neufs.has(d.cle_idempotence)).map((d) => { const o = parId[d.objet_id];
  return { action_cle: d.cle_idempotence, objet_type: d.objet_type, objet_id: d.objet_id, palier: d.palier, canal: C.canal[d.objet_type], type_action: 'relance_' + d.objet_type, outil: 'relancer_' + d.objet_type, cible: C.cible, faits: Object.assign({}, o.faits, { palier: d.palier }), destinataire: o.destinataire }; });
const resultat = { objets_recus: D.objets.length, decisions: decisions, deja_faits: decisions.filter((d) => d.a_relancer).length - demandes_redaction.length, demandes_redaction: demandes_redaction };`, 'resultat.demandes_redaction.length === 0'),
}
// ── ent-exemple-redaction (Exemple. I1 à I3) : rédiger (modèle épinglé) → porte de conformité → exécuter (carte prévue) → journaliser.
const REDACTION = {
  'Préparer la rédaction': String.raw`// Rédaction : chaque demande d'un agent devient un brouillon (lib-rediger-message : les seuls faits, montants mis en forme par le code,
// jamais le nom ni l'adresse du destinataire). Le modèle reste épinglé en mode A (question 5) : aucun appel réel.
` + COMMUN('ent-exemple-redaction') + String.raw`const s = D.demandes.map((d) => ({ json: env('lib-rediger-message@1', d.action_cle, Object.assign({ canal: d.canal }, C.redaction), { action_cle: d.action_cle, faits: d.faits }) }));
return s.length ? s : VIDE;`,
  'Préparer la porte': String.raw`// Rédaction : AUCUN brouillon ne va à l'exécution sans passer la porte de conformité (lib-porte-conformite, veto ; rang 1). La cible vient
// de la demande (carte en mode A) ; un brouillon hors schéma n'existe pas (statut « erreur » de la rédaction) et s'arrête ici.
` + COMMUN('ent-exemple-redaction') + String.raw`const parCle = {}; for (const d of D.demandes) parCle[d.action_cle] = d;
const s = [];
for (const { json: b } of $input.all()) { const r = b && b.contrat === 'lib-rediger-message@1' && b.statut === 'ok' ? b.resultat : null; if (!r) continue; const d = parCle[r.action_cle]; if (!d) continue;
  s.push({ json: env('lib-porte-conformite@1', d.action_cle, C.porte, { action: { type_action: d.type_action, outil: d.outil, prix_sources: true, cible: d.cible, sans_relecture: d.cible === 'pilote' }, message: { canal: r.canal, objet: r.objet, texte: r.texte }, destinataire: d.destinataire, faits: d.faits, maintenant: D.maintenant, compteurs: D.compteurs }) }); }
return s.length ? s : VIDE;`,
  "Préparer l'exécution": String.raw`// Rédaction : SEUL ce que la porte laisse passer va à lib-executer, qui relit les interrupteurs juste avant l'effet (épinglés en mode A) et
// ne PRÉVOIT qu'une carte (niveau 2 au plus). Un refus s'arrête ici, au journal : un geste « jamais en automatique » n'atteint pas l'exécution.
` + COMMUN('ent-exemple-redaction') + String.raw`const parCle = {}; for (const d of D.demandes) parCle[d.action_cle] = d;
const brouillons = {}; for (const b of sorties('Appeler lib-rediger-message')) if (b && b.resultat) brouillons[b.resultat.action_cle] = b.resultat;
const s = [];
for (const { json: p } of $input.all()) { if (!p || p.contrat !== 'lib-porte-conformite@1' || !p.resultat || p.resultat.verdict !== 'passe') continue;
  const d = parCle[p.cle_idempotence], b = brouillons[p.cle_idempotence]; if (!d || !b) continue;
  const charge = { type_action: d.type_action, objet_type: d.objet_type, objet_id: d.objet_id, canal: d.canal, brouillon: { objet: b.objet, texte: b.texte } }; if (d.palier) charge.palier = d.palier;
  s.push({ json: env('lib-executer@1', d.action_cle, { niveau_max: C.niveau_max }, { verdict: 'passe', cible: p.resultat.cible, cle_idempotence: d.action_cle, charge: charge, interrupteurs: D.interrupteurs, cles_existantes: D.cles_existantes }) }); }
return s.length ? s : VIDE;`,
  'Préparer le journal': `// Rédaction : une ligne par brouillon, par verdict de la porte et par carte prévue. Les jetons et le coût restent null : rien n'est mesuré.\n` + COMMUN('ent-exemple-redaction') + JOURNAL(String.raw`for (const s of sorties('Appeler lib-rediger-message')) { if (echec('red', s)) ligne('redaction_en_echec', s && s.cle_idempotence, 'aucun brouillon (hors schéma ou appel en échec)'); else ligne('brouillon', s.resultat.action_cle, 'brouillon ' + s.resultat.canal + ' prêt, modèle épinglé'); }
for (const s of sorties('Appeler lib-porte-conformite')) { if (echec('p', s)) ligne('porte_en_echec', null, 'lecture en erreur : refus'); else ligne(s.resultat.verdict === 'passe' ? 'porte_passe' : 'porte_refuse', s.cle_idempotence, s.resultat.verdict + (s.resultat.motifs.length ? ' (' + s.resultat.motifs.join(', ') + ')' : '')); }
for (const s of sorties('Appeler lib-executer')) { if (echec('x', s)) ligne('execution_en_echec', null, 'lib-executer'); else ligne(s.resultat.deja_fait ? 'deja_traite' : 'carte_prevue', s.cle_idempotence, s.resultat.deja_fait ? 'déjà fait : rien de refait' : (s.resultat.motif || 'carte prévue (simulation)')); }`),
  'Assembler': `// Rédaction : la sortie. Ce qui est « sur le bureau » du gérant (cartes prévues), ce que la porte a arrêté, et pourquoi.\n` + COMMUN('ent-exemple-redaction') + ASSEMBLER(['Appeler lib-rediger-message', 'Appeler lib-porte-conformite', 'Appeler lib-executer', 'Appeler lib-journaliser'], String.raw`const porte = sorties('Appeler lib-porte-conformite').filter((s) => s && s.resultat);
const exe = sorties('Appeler lib-executer').filter((s) => s && s.resultat);
const resultat = { demandes_recues: D.demandes.length, brouillons: sorties('Appeler lib-rediger-message').filter((s) => s && s.resultat).length,
  refus_porte: porte.filter((s) => s.resultat.verdict !== 'passe').map((s) => ({ action_cle: s.cle_idempotence, motifs: s.resultat.motifs })),
  cartes_prevues: exe.filter((s) => s.statut === 'ok' && s.resultat.deja_fait === false && s.resultat.prevu).map((s) => s.cle_idempotence),
  deja_faits: exe.filter((s) => s.resultat.deja_fait === true).map((s) => s.cle_idempotence),
  bloques: exe.filter((s) => s.statut !== 'ok' && s.resultat.deja_fait !== true).map((s) => ({ action_cle: s.cle_idempotence, motif: s.resultat.motif || s.statut })) };`, 'resultat.demandes_recues === 0'),
}
// ── ent-exemple-alerte : constater (liste fermée, seuils du client) → lib-alerter (n'envoie rien en simulation) → journaliser.
const ALERTE = {
  'Constater les anomalies': String.raw`// Alerte : les anomalies d'une liste fermée, constatées sur des agrégats (lecture prévue, épinglée en mode A ; aucun nom, aucun texte).
// Une source illisible (null) n'est jamais lue comme « tout est à jour » (C4:99-100) : elle donne une alerte « workflow en panne ».
` + COMMUN('ent-exemple-alerte') + String.raw`const s = [];
const alerte = (b, categorie, workflow) => s.push({ json: env('lib-alerter@1', 'a:' + categorie + ':' + workflow, { alertes_recentes: C.alertes_recentes }, { categorie: categorie, workflow: workflow, lien_execution: null, destinataire_role: C.destinataires[categorie] || 'benj', survenue_le: b.survenue_le }) });
for (const b of D.balayages) { const a = b.agregats;
  if (a.demande_la_plus_ancienne_min === null) alerte(b, 'workflow_en_panne', 'ent-exemple-qualification');
  else if (a.demande_la_plus_ancienne_min >= C.seuils.demande_qui_stagne_min) alerte(b, 'demande_qui_stagne', 'ent-exemple-qualification');
  if (a.factures_a_echeance_proche === null) alerte(b, 'workflow_en_panne', 'ent-exemple-relance');
  else if (a.factures_a_echeance_proche > 0) alerte(b, 'echeance_proche', 'ent-exemple-relance');
  if (a.disjoncteurs_ouverts === null) alerte(b, 'workflow_en_panne', 'ent-exemple-parent'); else for (const w of a.disjoncteurs_ouverts) alerte(b, 'disjoncteur_ouvert', w);
  if (a.battements_absents === null) alerte(b, 'workflow_en_panne', 'ent-exemple-parent'); else for (const w of a.battements_absents) alerte(b, 'battement_absent', w); }
return s.length ? s : VIDE;`,
  'Préparer le journal': `// Alerte : une ligne par alerte prévue ou regroupée. L'alerte ne contacte jamais le client final.\n` + COMMUN('ent-exemple-alerte') + JOURNAL(String.raw`for (const s of sorties('Appeler lib-alerter')) { if (echec('a', s)) ligne('appel_en_echec', null, 'lib-alerter'); else ligne(s.statut === 'ok' ? 'alerte_prevue' : 'alerte_regroupee', s.cle_idempotence, s.statut === 'ok' ? 'alerte prévue, non envoyée (simulation)' : 'déjà signalée dans la fenêtre'); }`),
  'Assembler': `// Alerte : la sortie, des comptes par catégorie (aucune donnée de client).\n` + COMMUN('ent-exemple-alerte') + ASSEMBLER(['Appeler lib-alerter', 'Appeler lib-journaliser'], String.raw`const al = sorties('Appeler lib-alerter').filter((s) => s && s.contrat);
const resultat = { balayages: D.balayages.length, alertes_prevues: al.filter((s) => s.statut === 'ok').map((s) => s.cle_idempotence), regroupees: al.filter((s) => s.statut === 'rien_a_faire').length };`, 'resultat.alertes_prevues.length === 0'),
}
// ── ent-exemple-reporting (Exemple. I4) : dédoublonner (une fois par période) → lib-rapport-hebdo → journaliser.
const REPORTING = {
  'Préparer le dédoublonnage': String.raw`// Reporting (I4) : un rapport par période (clé organisation, rapport, période) ; déjà produit, il ne repart pas.
` + COMMUN('ent-exemple-reporting') + String.raw`const s = D.rapports.map((r) => ({ json: env('lib-dedoublonner@1', 'rap:' + C.periode + ':' + r.du, { cles_connues: D.cles_connues }, { type: 'rapport', objet_id: E.organisation_id, etape: C.periode + '-' + r.du }) }));
return s.length ? s : VIDE;`,
  'Préparer le rapport': String.raw`// Reporting : chaque période neuve donne son rapport (lib-rapport-hebdo) : des comptes sourcés, « Exemple. » en simulation, aucun chiffre de
// gain ; en mode A, toute base de départ est « inconnue, à mesurer » (§ 7.3) : aucune n'est donnée.
` + COMMUN('ent-exemple-reporting') + String.raw`const envs = $('Préparer le dédoublonnage').all().map((x) => x.json);
const s = [];
$input.all().forEach((x, i) => { if (!neuf(x.json) || !envs[i]) return; const r = D.rapports[i];
  s.push({ json: env('lib-rapport-hebdo@1', 'rap:' + C.periode + ':' + r.du, { periode: C.periode, kpis: C.kpis, bases_de_depart: C.bases_de_depart }, { du: r.du, au: r.au, actions: r.actions }) }); });
return s.length ? s : VIDE;`,
  'Préparer le journal': `// Reporting : une ligne par rapport produit, refusé ou déjà fait.\n` + COMMUN('ent-exemple-reporting') + JOURNAL(String.raw`for (const s of sorties('Appeler lib-dedoublonner')) { if (echec('dd', s)) ligne('appel_en_echec', null, 'lib-dedoublonner'); else if (s.resultat.deja_fait) ligne('deja_traite', null, 'rapport déjà produit pour cette période'); }
for (const s of sorties('Appeler lib-rapport-hebdo')) { if (echec('rap', s)) ligne('rapport_en_echec', null, 'lib-rapport-hebdo'); else ligne(s.statut === 'ok' ? 'rapport_produit' : 'rapport_refuse', null, s.statut === 'ok' ? 'rapport de la ' + s.resultat.periode.type + ' du ' + s.resultat.periode.du + ' prêt, chaque chiffre sourcé' : 'refusé : ' + (s.erreurs || []).join(' ; ')); }`),
  'Assembler': `// Reporting : la sortie, le rapport tel quel (indicateurs sourcés, lignes « Exemple. »).\n` + COMMUN('ent-exemple-reporting') + ASSEMBLER(['Appeler lib-dedoublonner', 'Appeler lib-rapport-hebdo', 'Appeler lib-journaliser'], String.raw`const rapports = sorties('Appeler lib-rapport-hebdo').filter((s) => s && s.statut === 'ok' && s.resultat).map((s) => s.resultat);
const resultat = { periodes: D.rapports.length, rapports: rapports, deja_faits: sorties('Appeler lib-dedoublonner').filter((s) => s && s.resultat && s.resultat.deja_fait === true).length };`, 'resultat.rapports.length === 0'),
}
export const CODES = { 'ent-exemple-qualification': QUALIF, 'ent-exemple-relance': RELANCE, 'ent-exemple-redaction': REDACTION, 'ent-exemple-alerte': ALERTE, 'ent-exemple-reporting': REPORTING }
// L'ordre des étapes de chaque chaîne : [nœud Code qui prépare, nœud If « rien à … ? » (ou null), lib appelée].
export const ETAPES = {
  'ent-exemple-qualification': [['Préparer le dédoublonnage', 'Rien à dédoublonner ?', 'lib-dedoublonner'], ['Préparer la qualification', 'Rien à qualifier ?', 'lib-qualifier-lead'], ['Préparer la décision', 'Rien à décider ?', 'lib-decider']],
  'ent-exemple-relance': [['Préparer les relances', 'Rien à relancer ?', 'lib-relancer'], ['Préparer le dédoublonnage', 'Rien à dédoublonner ?', 'lib-dedoublonner']],
  'ent-exemple-redaction': [['Préparer la rédaction', 'Rien à rédiger ?', 'lib-rediger-message'], ['Préparer la porte', 'Rien à contrôler ?', 'lib-porte-conformite'], ["Préparer l'exécution", 'Rien à exécuter ?', 'lib-executer']],
  'ent-exemple-alerte': [['Constater les anomalies', 'Rien à signaler ?', 'lib-alerter']],
  'ent-exemple-reporting': [['Préparer le dédoublonnage', null, 'lib-dedoublonner'], ['Préparer le rapport', 'Rien à rapporter ?', 'lib-rapport-hebdo']],
}
export const FICHES = {
  'ent-exemple-qualification': 'Agent Qualification (rang 2, analyse), irritant Exemple. I1. Note et catégorise chaque demande selon la grille écrite avec le client ; aucun modèle ; n\'envoie jamais.',
  'ent-exemple-relance': 'Agent Relance (rang 2, action), irritants Exemple. I2 et I3. Décide qui relancer et quand (paliers J+1, J+3, J+7) ; registre de 3 jours ; n\'envoie jamais lui-même.',
  'ent-exemple-redaction': 'Agent Rédaction (rang 2, action) et porte de Conformité (rang 1, veto). Brouillon à partir des seuls faits, modèle épinglé ; rien ne va à l\'exécution sans la porte ; carte prévue seulement.',
  'ent-exemple-alerte': 'Agent Alerte (rang 2, analyse). Anomalies d\'une liste fermée ; alertes internes seulement, jamais au client final ; une source illisible n\'est jamais « tout est à jour ».',
  'ent-exemple-reporting': 'Agent Reporting (rang 2, analyse), irritant Exemple. I4. Le rapport du gérant : des comptes sourcés, aucun chiffre de gain, toute base « inconnue, à mesurer » en mode A.',
}

// ─── Le code des nœuds du parent : il LIT (épinglé en mode A), il ROUTE, il JOURNALISE ; il ne calcule rien, n'appelle aucun modèle ─────
const LECTURES = String.raw`const C = $('Lire la configuration (mode A : épinglée)').first().json;
const V = $('Lire les événements échus (mode A : épinglés)').first().json;
const trace = { execution_parent: 'ent-exemple-parent:' + V.passage, declencheur: 'ent-exemple-parent', tentative: 0 };
const env = (contrat, cle, config, donnees) => ({ contrat: contrat, organisation_id: C.organisation_id, simulation: C.simulation, cle_idempotence: cle, trace: trace, config: config, donnees: donnees });
const sorties = (nom, branche) => { const n = $(nom); return n.isExecuted ? n.all(branche || 0).map((x) => x.json) : []; };
`
const ISSUE = String.raw`// L'issue d'un appel de chaîne : une sortie qui porte un contrat est une réponse ; un élément sans contrat (sortie d'erreur) est un échec.
// On ne se fie pas à la seule branche 1 : avec des données épinglées, n8n la remplit aussi (essai 460, défaut trouvé le 03/11).
const issue = (nom) => { const n = $(nom); if (!n.isExecuted) return null; const a = n.all(0).map((x) => x.json), b = n.all(1).map((x) => x.json); const sans = (x) => !x || typeof x.contrat !== 'string';
  return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
`
export const PARENT = {
  'Préparer la capture': `// Parent : réclamer les demandes neuves (lib-capturer-lead : colonnes permises, empreinte du contact, jamais le contact). Il ne calcule rien.\n` + LECTURES + String.raw`return [{ json: env('lib-capturer-lead@1', 'cap:' + V.passage, C.capture, { lignes: V.lignes_demandes }) }];`,
  'Aiguiller': String.raw`// Parent : AIGUILLER, sans rien calculer. Chaque événement va à l'agent de son type (table fermée) ; un type inconnu va à la sortie de
// secours (journal). Un agent dont l'interrupteur n'est pas ouvert, ou dont le disjoncteur n'est pas fermé, est SAUTÉ (fail-closed) et le
// saut est journalisé. Une enveloppe par agent, son lot d'événements tel quel, sa configuration telle que lue.
` + LECTURES + String.raw`const DJ = $('Lire les disjoncteurs (mode A : épinglés)').first().json.disjoncteurs || {};
const ROUTES = { demande_recue: 'qualification', relance_due: 'relance', balayage: 'alerte', rapport_du: 'reporting' };
const cap = $input.first().json;
const capOk = !!(cap && cap.contrat === 'lib-capturer-lead@1' && cap.resultat && Array.isArray(cap.resultat.evenements));
const evenements = (capOk ? cap.resultat.evenements : []).concat(V.evenements);
const lots = {}, nonRoutes = [], sautes = [];
for (const ev of evenements) { const a = ROUTES[ev.type]; if (!a) { nonRoutes.push(ev.id === undefined ? null : ev.id); continue; } if (!lots[a]) lots[a] = []; lots[a].push(ev); }
const ouvert = (a) => C.interrupteurs_agents[a] === true && !!DJ['ent-exemple-' + a] && DJ['ent-exemple-' + a].etat === 'ferme';
const DONNEES = {
  qualification: (l) => ({ evenements: l, empreintes_connues: V.empreintes_connues, cles_connues: V.cles_connues, escalade: V.escalade }),
  relance: (l) => ({ objets: l.map((ev) => ev.objet), maintenant: V.maintenant, cles_connues: V.cles_connues }),
  alerte: (l) => ({ balayages: l.map((ev) => ev.balayage) }),
  reporting: (l) => ({ rapports: l.map((ev) => ev.rapport), cles_connues: V.cles_connues }),
};
const s = [];
for (const a of ['qualification', 'relance', 'alerte', 'reporting']) { if (!lots[a]) continue; if (!ouvert(a)) { sautes.push(a); continue; }
  s.push({ json: env('ent-exemple-' + a + '@1', 'ent:' + a + ':' + V.passage, C.agents[a], DONNEES[a](lots[a])) }); }
if (nonRoutes.length || sautes.length || !capOk || !s.length) s.push({ json: { contrat: 'aucun', non_routes: nonRoutes, sautes: sautes, capture_en_echec: !capOk } });
return s;`,
  'Journal : non routé ou sauté': `// Parent : la sortie de secours du routage. Rien n'est perdu en silence : l'événement non routé ou l'agent sauté part au journal du passage.\nreturn $input.all().map((x) => ({ json: { contrat: 'aucun', non_routes: x.json.non_routes, sautes: x.json.sautes, capture_en_echec: x.json.capture_en_echec } }));`,
  'Préparer les rédactions': String.raw`// Parent : deuxième aiguillage. Les demandes de rédaction rendues par la Relance vont à l'agent Rédaction (s'il est ouvert), telles quelles.
` + LECTURES + String.raw`const DJ = $('Lire les disjoncteurs (mode A : épinglés)').first().json.disjoncteurs || {};
const demandes = [];
for (const s of sorties('Appeler ent-exemple-relance')) if (s && s.resultat && Array.isArray(s.resultat.demandes_redaction)) for (const d of s.resultat.demandes_redaction) demandes.push(d);
const ouvert = C.interrupteurs_agents.redaction === true && !!DJ['ent-exemple-redaction'] && DJ['ent-exemple-redaction'].etat === 'ferme';
if (!demandes.length || !ouvert) return [{ json: { vide: true, saute: demandes.length > 0 } }];
return [{ json: env('ent-exemple-redaction@1', 'ent:redaction:' + V.passage, C.agents.redaction, { demandes: demandes, interrupteurs: { general: C.interrupteur_general, agent: C.interrupteurs_agents.redaction }, cles_existantes: V.cles_connues, compteurs: V.compteurs, maintenant: V.maintenant }) }];`,
  'Préparer les disjoncteurs': String.raw`// Parent : l'issue de chaque chaîne appelée (succès, ou échec : sortie d'erreur, statut « erreur » ou « rejete ») va à son disjoncteur
// (lib-disjoncteur : coupé après N échecs de suite). Le parent ne compte rien lui-même.
` + LECTURES + ISSUE + String.raw`const DJ = $('Lire les disjoncteurs (mode A : épinglés)').first().json.disjoncteurs || {};
const s = [];
for (const a of ['qualification', 'relance', 'alerte', 'reporting', 'redaction']) { const r = issue('Appeler ent-exemple-' + a); if (!r) continue;
  const echec = r.ko.length > 0 || !r.ok.length || r.ok.some((x) => x.statut === 'erreur' || x.statut === 'rejete');
  s.push({ json: env('lib-disjoncteur@1', 'dj:' + a + ':' + V.passage, { seuil: C.disjoncteur_seuil }, { agent: 'ent-exemple-' + a, issue: echec ? 'echec' : 'succes', etat_precedent: DJ['ent-exemple-' + a] }) }); }
return s.length ? s : [{ json: { vide: true } }];`,
  'Préparer le journal': String.raw`// Parent : le journal du passage (lib-journaliser) : chaque chaîne appelée et son statut, chaque agent sauté, chaque événement non routé,
// chaque disjoncteur. Des identifiants et des statuts seulement : aucun nom, aucun contact, aucun texte de client.
` + LECTURES + ISSUE + String.raw`const L = [];
const ligne = (evenement, objet_ref, decision) => L.push({ evenement: evenement, agent: 'ent-exemple-parent', objet_ref: objet_ref === null || objet_ref === undefined ? null : String(objet_ref).slice(0, 80), decision: String(decision).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: C.simulation });
for (const a of ['qualification', 'relance', 'alerte', 'reporting', 'redaction']) { const r = issue('Appeler ent-exemple-' + a); if (!r) continue;
  ligne('chaine_appelee', 'ent-exemple-' + a, r.ko.length ? 'sortie d\'erreur : ' + String((r.ko[0] && r.ko[0].error && (r.ko[0].error.message || r.ko[0].error)) || 'échec').slice(0, 150) : 'statut ' + r.ok.map((x) => x.statut).join(', ')); }
for (const x of sorties('Journal : non routé ou sauté')) { for (const a of x.sautes) ligne('agent_saute', 'ent-exemple-' + a, 'interrupteur coupé ou disjoncteur non fermé : chaîne non appelée');
  for (const id of x.non_routes) ligne('evenement_non_route', id, 'type d\'événement sans agent : rien n\'est fait');
  if (x.capture_en_echec) ligne('capture_en_echec', null, 'lib-capturer-lead : aucune demande réclamée à ce passage'); }
for (const x of sorties('Préparer les rédactions')) if (x.saute) ligne('agent_saute', 'ent-exemple-redaction', 'interrupteur coupé ou disjoncteur non fermé : rédaction non appelée');
for (const x of sorties('Appeler lib-disjoncteur')) if (x && x.resultat) ligne('disjoncteur', x.cle_idempotence.split(':')[1], 'état ' + x.resultat.etat);
if (!L.length) ligne('passage_sans_evenement', null, 'rien à router');
return [{ json: env('lib-journaliser@1', 'jp:' + V.passage, {}, { entrees: L.slice(0, 200) }) }];`,
  'Préparer le battement': `// Parent : le battement du passage (lib-battement), que le contrôle des 26 h surveille (p5:255).\n` + LECTURES + String.raw`return [{ json: env('lib-battement@1', 'bat:' + V.passage, {}, { workflow: 'ent-exemple-parent', passe_le: V.maintenant, operation: 'battre' }) }];`,
  'Bilan du passage': String.raw`// Parent : le bilan agrégé du passage, sans donnée personnelle : où il s'est arrêté, ce qui a été routé où, les statuts, les effets prévus
// et faits (toujours zéro fait en simulation), et le verrou à lever. Des comptes, aucun calcul métier.
const C = $('Lire la configuration (mode A : épinglée)').first().json;
const passe = (nom) => $(nom).isExecuted;
const sorties = (nom, b) => passe(nom) ? $(nom).all(b || 0).map((x) => x.json) : [];
const issue = (nom) => { if (!passe(nom)) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = sorties(nom, 0), b = sorties(nom, 1); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
if (!passe('Poser le verrou (mode A : épinglé)')) return [{ json: { arret: 'interrupteur_general_coupe', routes: {}, statuts: {}, effets_prevus: 0, effets_faits: 0, verrou: 'non_pose' } }];
if (!passe('Lire les disjoncteurs (mode A : épinglés)')) return [{ json: { arret: 'verrou_deja_pris', routes: {}, statuts: {}, effets_prevus: 0, effets_faits: 0, verrou: 'laisse_a_son_porteur' } }];
const routes = {}, statuts = {};
let prevus = 0, faits = 0;
for (const x of sorties('Aiguiller')) if (x.contrat !== 'aucun') { const a = x.contrat.split('@')[0].slice(12); routes[a] = (x.donnees.evenements || x.donnees.objets || x.donnees.balayages || x.donnees.rapports || []).length; }
for (const a of ['qualification', 'relance', 'alerte', 'reporting', 'redaction']) { const r = issue('Appeler ent-exemple-' + a); if (!r) continue;
  statuts[a] = r.ko.length ? 'echec' : r.ok.map((x) => x.statut).join(',');
  for (const x of r.ok) { if (x && Array.isArray(x.effets_prevus)) prevus += x.effets_prevus.length; if (x && Array.isArray(x.effets_faits)) faits += x.effets_faits.length; } }
if (passe('Préparer les rédactions') && !passe('Appeler ent-exemple-redaction')) routes.redaction = 0;
for (const nom of ['Appeler lib-capturer-lead', 'Appeler lib-disjoncteur', 'Appeler lib-journaliser', 'Appeler lib-battement']) for (const x of sorties(nom)) { if (x && Array.isArray(x.effets_prevus)) prevus += x.effets_prevus.length; if (x && Array.isArray(x.effets_faits)) faits += x.effets_faits.length; }
const secours = sorties('Journal : non routé ou sauté')[0] || { non_routes: [], sautes: [], capture_en_echec: false };
const disjoncteurs = {}; for (const x of sorties('Appeler lib-disjoncteur')) if (x && x.resultat) disjoncteurs[x.cle_idempotence.split(':')[1]] = x.resultat.etat;
return [{ json: { arret: null, simulation: C.simulation, routes: routes, statuts: statuts, sautes: secours.sautes, non_routes: secours.non_routes.length, capture_en_echec: secours.capture_en_echec, disjoncteurs: disjoncteurs, effets_prevus: prevus, effets_faits: faits, verrou: 'a_lever' } }];`,
}

// ─── Le code SDK ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const J = JSON.stringify
const IF_ = (nom, gauche, pos, notes) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, position: ${J(pos)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${J(nom.replace(/[^A-Za-z]/g, '').toLowerCase().slice(0, 30))}, leftValue: ${J('={{ ' + gauche + ' }}')}, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const CODE_ = (nom, js, pos, notes) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, position: ${J(pos)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
const ARRET = (pos) => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', position: ${J(pos)}, notes: "Mode A : aucun effet réel n'est branché. Hors simulation, la chaîne s'arrête ici, avant tout appel.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (mode A, tâche 035-007). Rien n'a été écrit ni envoyé." } } })`
const APPEL = (nom, id, pos, notes, onError = 'continueRegularOutput') => `node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J(nom)}, position: ${J(pos)}, ${notes ? `notes: ${J(notes)}, ` : ''}onError: ${J(onError)}, parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(id)} }, mode: 'once', options: { waitForSubWorkflow: true } } } })`
const NOOP = (nom, pos, notes) => `node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: ${J(nom)}, position: ${J(pos)}, notes: ${J(notes)}, parameters: {} } })`
const REGLAGES = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false, saveManualExecutions: true, errorWorkflow: ERREUR }
export const reglagesChaine = (idParent) => ({ ...REGLAGES, callerPolicy: 'workflowsFromAList', callerIds: idParent })
export const reglagesParent = () => ({ ...REGLAGES, executionTimeout: 300, callerPolicy: 'none' })
export const codeAppels = (nom) => Object.fromEntries(ETAPES[nom].map(([, , lib]) => [`Appeler ${lib}`, lib]).concat([['Appeler lib-journaliser', 'lib-journaliser']]))
// Tout le code des nœuds Code d'une chaîne (pour le rapatriement : comparaison octet pour octet à l'export).
export const codeChaine = (nom) => ({ "Contrat d'entrée": codeEntree(`${nom}@1`, SCHEMAS[nom]), 'Contrat de sortie': codeSortie(`${nom}@1`), ...CODES[nom] })

export function sdkChaine(nom, idParent) {
  const c = CODES[nom], etapes = ETAPES[nom], contrat = `${nom}@1`
  const l = [`import { workflow, node, trigger, ifElse, sticky } from '@n8n/workflow-sdk';`,
    `const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: 'Appelé par un parent', position: [0, 0], parameters: { inputSource: 'passthrough' } } });`,
    `const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, SCHEMAS[nom]), [240, 0], `contrat: ${contrat}`)};`,
    `const conforme = ${IF_('Entrée conforme ?', '$json.conforme', [480, 0])};`,
    `const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', [720, -120], "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché en mode A.")};`,
    `const arret = ${ARRET([960, 120])};`]
  let x = 960
  etapes.forEach(([prep, si, lib], i) => {
    l.push(`const prep${i} = ${CODE_(prep, c[prep], [x, -120])};`); x += 240
    if (si) { l.push(`const si${i} = ${IF_(si, '$json.vide === true', [x, -120], 'Vrai : rien à faire à cette étape, on passe au journal. Faux : on appelle le gabarit.')};`); x += 240 }
    l.push(`const appel${i} = ${APPEL(`Appeler ${lib}`, LIBS[lib], [x, -120], `Appelle ${lib} (bibliothèque partagée, 035-003 à 035-005), sans la réécrire. En mode A, sa sortie est épinglée dans l'essai de la chaîne tant que ${lib} n'a pas ${nom} dans ses callerIds (preuve 035-007).`)};`); x += 240
  })
  l.push(`const journal = ${CODE_('Préparer le journal', c['Préparer le journal'], [x, -120])};`); x += 240
  l.push(`const appelJournal = ${APPEL('Appeler lib-journaliser', LIBS['lib-journaliser'], [x, -120], 'Appelle lib-journaliser (035-003) : une ligne par décision, en simulation.')};`); x += 240
  l.push(`const assembler = ${CODE_('Assembler', c.Assembler, [x, -120])};`); x += 240
  l.push(`const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat), [x, 0])};`)
  // La chaîne des étapes, de la dernière à la première : chaque « rien à … ? » vrai saute au journal.
  let suite = 'journal'
  for (let i = etapes.length - 1; i >= 0; i--) {
    const appel = `appel${i}.to(${suite})`
    suite = etapes[i][1] ? `prep${i}.to(si${i}.onTrue(journal).onFalse(${appel}))` : `prep${i}.to(${appel})`
  }
  l.push(`const note = sticky(${J(`## ${nom} (035-007)\n${FICHES[nom]}\nContrat ${contrat} (enveloppe@1). Appelée par ent-exemple-parent seulement.\nINACTIF, jamais publié, en simulation (mode A) : rien n'est lu ni écrit en base, rien n'est envoyé, aucun modèle n'est appelé.\nJuge : scripts/demo-entreprise-qa.mjs`)}, [appele, entree, conforme], { color: 4 });`)
  l.push(`export default workflow(${J(nom)}, ${J(nom)}, { settings: ${J(reglagesChaine(idParent))} })
  .add(appele).to(entree).to(conforme.onTrue(porte.onTrue(${suite}).onFalse(arret)).onFalse(sortie))
  .add(journal).to(appelJournal).to(assembler).to(sortie)
  .add(note);`)
  return l.join('\n') + '\n'
}

const NOTE_LECTURE = (quoi, b) => `lecture: ${quoi}\nMode A : un emplacement, sa sortie est ÉPINGLÉE dans chaque essai (données fictives « Exemple. Bâti-Démo »). Non épinglé, il ne rend rien d'utile et le passage s'arrête sans effet (fail-closed). Mode B : ${b}`
export function sdkParent(ids) {
  const P = PARENT
  const l = [`import { workflow, node, trigger, ifElse, switchCase, merge, sticky } from '@n8n/workflow-sdk';`,
    `const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Toutes les 5 minutes', position: [0, 0], parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } } } });`,
    `const config = ${NOOP('Lire la configuration (mode A : épinglée)', [240, 0], NOTE_LECTURE('configuration du client, une fois par passage (interrupteur général, simulation, interrupteurs par agent, réglages des agents)', 'GET de la configuration par organisation (table à naître au « go » de Benj, p5:424), select= limité, organisation_id=eq.'))};`,
    `const siInter = ${IF_('Interrupteur général ouvert ?', '$json.interrupteur_general === true', [480, 0], "Faux (coupé, absent ou illisible) : le passage s'arrête, rien n'est appelé (p5:263).")};`,
    `const verrou = ${NOOP('Poser le verrou (mode A : épinglé)', [720, -80], NOTE_LECTURE('pose du verrou du client (une ligne avec échéance)', 'PATCH conditionnel du verrou par organisation, derrière une porte « simulation »'))};`,
    `const siVerrou = ${IF_('Verrou posé ?', '$json.verrou_pose === true', [960, -80], "Faux : un autre passage tient le verrou ; celui-ci s'arrête sans rien faire.")};`,
    `const disj = ${NOOP('Lire les disjoncteurs (mode A : épinglés)', [1200, -160], NOTE_LECTURE('état du disjoncteur de chaque agent', 'GET des disjoncteurs par organisation'))};`,
    `const evts = ${NOOP('Lire les événements échus (mode A : épinglés)', [1440, -160], NOTE_LECTURE('événements échus (relances dues, balayage, rapport dû), lignes de demandes à réclamer, clés déjà réservées, agrégats', 'GET des événements échus (0185, au « go »), 200 au plus'))};`,
    `const prepCap = ${CODE_('Préparer la capture', P['Préparer la capture'], [1680, -160])};`,
    `const capture = ${APPEL('Appeler lib-capturer-lead', LIBS['lib-capturer-lead'], [1920, -160], 'Réclame les demandes neuves (035-004).')};`,
    `const aiguiller = ${CODE_('Aiguiller', P.Aiguiller, [2160, -160])};`,
    `const routeur = switchCase({ version: 3.2, config: { name: 'Router par agent', position: [2400, -160], notes: 'Switch par type d\\'événement (via le contrat de l\\'enveloppe), avec une sortie de secours vers le journal.', parameters: { rules: { values: ${J(AGENTS.filter((a) => a !== 'redaction').map((a) => ({ outputKey: a, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.contrat }}', operator: { type: 'string', operation: 'equals' }, rightValue: `ent-exemple-${a}@1` }], combinator: 'and' } })))} }, options: { fallbackOutput: 'extra', renameFallbackOutput: 'secours' } } } });`]
  const ordre = ['qualification', 'relance', 'alerte', 'reporting']
  ordre.forEach((a, i) => l.push(`const appel_${a} = ${APPEL(`Appeler ent-exemple-${a}`, ids[`ent-exemple-${a}`], [2640, -460 + i * 160], `Chaîne de l'agent ${a}. « Continue (using error output) » : une chaîne en panne ne fait pas échouer le parent.`, 'continueErrorOutput')};`))
  l.push(`const secours = ${CODE_('Journal : non routé ou sauté', P['Journal : non routé ou sauté'], [2640, 180])};`)
  l.push(`const reunir = merge({ version: 3.2, config: { name: 'Réunir les sorties', position: [2900, -160], parameters: { mode: 'append', numberInputs: 5 } } });`)
  l.push(`const prepRed = ${CODE_('Préparer les rédactions', P['Préparer les rédactions'], [3140, -160])};`)
  l.push(`const siRed = ${IF_('Rien à rédiger ?', '$json.vide === true', [3380, -160])};`)
  l.push(`const appel_redaction = ${APPEL('Appeler ent-exemple-redaction', ids['ent-exemple-redaction'], [3620, -240], "Chaîne de l'agent Rédaction (et de la porte). En mode A, sa sortie est épinglée dans l'essai de bout en bout : le modèle de lib-rediger-message reste épinglé (question 5) et un sous-workflow n'est pas couvert par les données épinglées (fiches-depots.md:433).", 'continueErrorOutput')};`)
  l.push(`const prepDisj = ${CODE_('Préparer les disjoncteurs', P['Préparer les disjoncteurs'], [3860, -160])};`)
  l.push(`const siDisj = ${IF_('Aucune chaîne appelée ?', '$json.vide === true', [4100, -160])};`)
  l.push(`const appelDisj = ${APPEL('Appeler lib-disjoncteur', LIBS['lib-disjoncteur'], [4340, -240], 'Disjoncteur de chaque agent appelé (035-003).')};`)
  l.push(`const prepJournal = ${CODE_('Préparer le journal', P['Préparer le journal'], [4580, -160])};`)
  l.push(`const appelJournal = ${APPEL('Appeler lib-journaliser', LIBS['lib-journaliser'], [4820, -160], 'Journal du passage (035-003).')};`)
  l.push(`const prepBatt = ${CODE_('Préparer le battement', P['Préparer le battement'], [5060, -160])};`)
  l.push(`const appelBatt = ${APPEL('Appeler lib-battement', LIBS['lib-battement'], [5300, -160], 'Battement du parent (035-003).')};`)
  l.push(`const bilan = ${CODE_('Bilan du passage', P['Bilan du passage'], [5540, 0])};`)
  l.push(`const note = sticky(${J("## ent-exemple-parent (035-007)\nOrchestrateur du mode A sur « Exemple. Bâti-Démo » : il LIT (épinglé), il ROUTE, il journalise. Il ne calcule rien et n'appelle aucun modèle (p5:156, p5:176).\nToutes les 5 min : interrupteur général → verrou → disjoncteurs → événements échus → capture → aiguillage par agent (sortie de secours) → rédaction des relances → disjoncteurs → journal → battement → bilan.\nINACTIF, jamais publié. Simulation partout. Juge : scripts/demo-entreprise-qa.mjs ; runbook : plans/011-cadrage-01-11/p5-entreprise/demo/runbook.md")}, [horloge, config, siInter], { color: 4 });`)
  l.push(`export default workflow('ent-exemple-parent', 'ent-exemple-parent', { settings: ${J(reglagesParent())} })
  .add(horloge).to(config).to(siInter.onTrue(verrou.to(siVerrou.onTrue(disj.to(evts).to(prepCap).to(capture).to(aiguiller).to(routeur
    .onCase(0, appel_qualification.to(reunir.input(0)))
    .onCase(1, appel_relance.to(reunir.input(1)))
    .onCase(2, appel_alerte.to(reunir.input(2)))
    .onCase(3, appel_reporting.to(reunir.input(3)))
    .onCase(4, secours.to(reunir.input(4))))).onFalse(bilan))).onFalse(bilan))
  .add(appel_qualification.onError(reunir.input(0)))
  .add(appel_relance.onError(reunir.input(1)))
  .add(appel_alerte.onError(reunir.input(2)))
  .add(appel_reporting.onError(reunir.input(3)))
  .add(reunir).to(prepRed).to(siRed.onTrue(prepDisj).onFalse(appel_redaction.to(prepDisj)))
  .add(appel_redaction.onError(prepDisj))
  .add(prepDisj).to(siDisj.onTrue(prepJournal).onFalse(appelDisj.to(prepJournal)))
  .add(prepJournal).to(appelJournal).to(prepBatt).to(appelBatt).to(bilan)
  .add(note);`)
  return l.join('\n') + '\n'
}

// ─── La configuration fictive « Exemple. Bâti-Démo » et les données épinglées ──────────────────────────────────────────────────────
const ex = (f) => JSON.parse(readFileSync(path.join(ICI, '../035-006/exemple', f), 'utf8'))
export const KPIS = ['actions_preparees', 'relances_preparees', 'en_attente', 'echecs', 'refus_porte']
export function configuration(k) {
  return {
    organisation_id: ORG, nom: 'Exemple. Bâti-Démo', simulation: true, interrupteur_general: true,
    interrupteurs_agents: Object.fromEntries(AGENTS.map((a) => [a, true])), disjoncteur_seuil: 3,
    capture: { source: 'leads', lot_max: 200 },
    agents: {
      qualification: { grille: F4.GRILLE_EXEMPLE, seuils: { haute: 60, normale: 30 }, delais_cibles_min: { haute: 15, normale: 60, a_revoir: 240 },
        autonomie: { niveau_max: 2, niveau_defaut: 2, niveaux: {} }, plan: 'entreprise', pilote: { drapeau: true, actif: true, types: { reponse_prospect: true } }, parties_depuis_24h: 0 },
      relance: { regles: F5.REGLES_RELANCE, canal: F5.CANAL, cible: 'carte' },
      redaction: { redaction: { ton: 'Exemple. cordial et simple, vouvoiement', signature: 'Exemple. L’équipe Bâti-Démo', nom_artisan: 'Exemple. Bâti-Démo', mention_ia: false }, porte: F5.CONFIG_PORTE(k), niveau_max: 2 },
      alerte: { seuils: { demande_qui_stagne_min: 60, echeance_proche_jours: 3 }, destinataires: { demande_qui_stagne: 'associe', echeance_proche: 'administratif', disjoncteur_ouvert: 'benj', workflow_en_panne: 'benj', battement_absent: 'benj' }, alertes_recentes: [] },
      reporting: { periode: 'semaine', kpis: KPIS, bases_de_depart: {} },
    },
  }
}
export const disjoncteurs = (plus = {}) => ({ disjoncteurs: { ...Object.fromEntries(CHAINES.map((c) => [c, { etat: 'ferme', echecs_consecutifs: 0 }])), ...plus } })
// Les relances dues : chaque objet sans réponse du jeu fictif, avec l'historique des quatre chemins du registre et les paliers déjà
// envoyés (les cas du banc 035-005), plus le destinataire tel que le lirait la porte (opposition = stop ; aucun contact).
export function relancesDues() {
  return F5.casRelances().map(({ _faits, ...o }) => ({ ...o, faits: _faits, destinataire: { opposition: o.stop === true, consentement_sms: true, escalade: o.escalade } }))
}
// Les actions à blanc de la semaine du 26 octobre (Exemple.) : en mode A rien n'est « fait seul » ; seulement préparé, refusé, en échec.
export function actionsSemaine() {
  const A = (type_action, etat, le) => ({ type_action, etat, le })
  return [A('relance_facture', 'en_attente', '2026-10-27T09:00:00.000+01:00'), A('relance_facture', 'en_attente', '2026-10-27T09:05:00.000+01:00'), A('valider_reponse_proposee', 'en_attente', '2026-10-28T10:00:00.000+01:00'),
    A('relance_devis', 'refuse_porte', '2026-10-29T11:00:00.000+01:00'), A('relance_conversation', 'en_attente', '2026-10-30T15:00:00.000+01:00'), A('relance_facture', 'echec', '2026-10-31T10:00:00.000+01:00'),
    A('relance_facture', 'deja_traite', '2026-11-01T09:00:00.000+01:00')]
}
export function evenementsEchus(k, plus = {}) {
  const banc = F4.casBanc(F4.lireCodePilote ? F4.lireCodePilote() : undefined)
  const lignes = JSON.parse(/const LIGNES = (\[.*\]);/.exec(banc.capture)[1])
  const connues = JSON.parse(/const CONNUES = (\[.*\]);/.exec(banc.versQualif)[1])
  const escalade = JSON.parse(/const ESCALADE = (\[.*\]);/.exec(banc.versDecision)[1])
  const maintenant = Date.parse(MAINTENANT)
  const aTraiter = lignes.filter((x) => x.etat_capture === 'a_traiter').map((x) => Date.parse(x.created_at))
  const echeanceProche = ex('factures.json').filter((f) => f.statut === 'emise' && Date.parse(f.date_echeance + 'T00:00:00+01:00') - maintenant <= 3 * 86400000 && Date.parse(f.date_echeance + 'T00:00:00+01:00') >= maintenant).length
  const ID = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
  const evenements = [
    ...relancesDues().map((o, i) => ({ id: ID(900 + i), type: 'relance_due', objet: o })),
    { id: ID(950), type: 'balayage', balayage: { survenue_le: MAINTENANT, agregats: { demande_la_plus_ancienne_min: aTraiter.length ? Math.floor((maintenant - Math.min(...aTraiter)) / 60000) : 0, factures_a_echeance_proche: echeanceProche, disjoncteurs_ouverts: [], battements_absents: [] } } },
    { id: ID(960), type: 'rapport_du', rapport: { du: '2026-10-26', au: '2026-11-01', actions: actionsSemaine() } },
    { id: ID(970), type: 'stock_bas', note: 'Exemple. agent « stock » hors de la démo (I5) : aucun agent, sortie de secours' },
  ]
  return { passage: PASSAGE, maintenant: MAINTENANT, lignes_demandes: lignes, empreintes_connues: connues, escalade, cles_connues: [], compteurs: { envoyes_aujourdhui: 0 }, evenements, ...plus }
}
export const lireCode = F5.lireCode
export const sortieModele = F5.sortieModele

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (x) => (process.argv.find((a) => a.startsWith(`--${x}=`)) || '').slice(x.length + 3) || null
  const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/ent-exemple'
  mkdirSync(dossier, { recursive: true })
  const ids = arg('ids') ? JSON.parse(arg('ids')) : {}
  for (const nom of CHAINES) writeFileSync(path.join(dossier, `${nom}.sdk.js`), sdkChaine(nom, ids['ent-exemple-parent'] || 'AposerParent01'))
  writeFileSync(path.join(dossier, 'ent-exemple-parent.sdk.js'), sdkParent({ ...Object.fromEntries(CHAINES.map((c) => [c, 'AposerChaine01'])), ...ids }))
  console.log(`SDK écrits dans ${dossier} : ${[...CHAINES, 'ent-exemple-parent'].join(', ')}`)
}

// ─── Le rapport d'exemple du gérant (HTML statique), fabriqué à partir des sorties RÉELLES des essais n8n ─────────────────────────
// Sombre et corail (skill presti-design : socle app/base.css), « Exemple. » partout, des comptes seulement : aucun montant, aucun chiffre
// de gain, toute base de départ « Inconnue, à mesurer » (PR § 7.3 ; p5:42). Le juge scripts/demo-entreprise-qa.mjs le relit.
const ech = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const court = (id) => '…' + String(id).slice(-4)
export const KPI_DEMO = [
  ['K1', 'Délai de première réponse', 'hebdomadaire'], ['K2', 'Qualification et transformation', 'hebdomadaire'],
  ['K3', 'Devis relancés puis signés', 'mensuelle'], ['K4', 'Délai de paiement, impayés récupérés', 'mensuelle'],
  ['K5', 'Temps administratif (toujours déclaré)', 'mensuelle'], ['K6', 'Qualité des agents', 'hebdomadaire'],
  ['K7', 'Incidents (doublons, gestes interdits, disjoncteurs)', 'hebdomadaire'], ['K8', 'Coût mensuel réel', 'mensuelle'],
]
const MOTIFS = { stop: 'le client a répondu STOP', litige_ou_escalade: 'litige ou sujet sensible : à traiter à la main', relance_recente_moins_3_jours: 'relancé il y a moins de 3 jours par un autre canal', aucun_palier_atteint: 'pas encore d’échéance', palier_deja_envoye: 'palier déjà envoyé', hors_horaires: 'hors des horaires permis', prix_sans_source: 'un prix cité n’est pas dans la base', niveau_max: 'à valider (mode à blanc : rien ne part seul)', escalade: 'sujet sensible : à traiter à la main' }
export function rapportGerant(essais) {
  const s = (exe) => { const e = essais.find((x) => x.execution === exe); if (!e || !e.sorties) throw new Error(`essai ${exe} absent`); return e.sorties[0] }
  const bilan = s(461), qualif = s(451).resultat, relance = s(450).resultat, red = s(452).resultat, alerte = s(447).resultat, rapport = s(448).resultat.rapports[0]
  const parCle = Object.fromEntries(relance.demandes_redaction.map((d) => [d.action_cle, d]))
  const libRel = (d) => d.objet_type === 'facture' ? `Exemple. Relance de la facture ${d.faits.numero}, palier ${d.palier}` : d.objet_type === 'devis' ? `Exemple. Relance du devis ${d.faits.numero}, palier ${d.palier}` : `Exemple. Relance de la conversation ${court(d.objet_id)} par SMS, palier ${d.palier}`
  const cartesRel = red.cartes_prevues.map((c) => parCle[c]).filter(Boolean)
  const cartesQual = qualif.decisions.filter((d) => d.action === 'carte')
  const nbBureau = cartesRel.length + cartesQual.length
  const q = Object.fromEntries(qualif.qualifies.map((x) => [x.lead_id, x]))
  const refus = red.refus_porte.map((r) => ({ d: parCle[r.action_cle], motifs: r.motifs }))
  const ecartees = relance.decisions.filter((d) => !d.a_relancer)
  const li = (t, note) => `<li><span class="t">${ech(t)}</span>${note ? `<span class="n">${ech(note)}</span>` : ''}</li>`
  const ALERTES = { 'a:demande_qui_stagne:ent-exemple-qualification': ['Exemple. Des demandes attendent depuis plus d’une heure', 'prévenu : l’associé'], 'a:echeance_proche:ent-exemple-relance': ['Exemple. Une facture arrive à échéance sous 3 jours', 'prévenu : l’administratif'] }
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Exemple. Bâti-Démo — rapport du gérant (démonstration à blanc)</title>
<style>
  /* Jetons du socle app/base.css (skill presti-design) : fond sombre froid, accent corail, gris froid. Aucune police chargée du réseau. */
  :root{--paper:#0A0C11;--surface:#13161F;--surface-2:#1A1E29;--ink:#EDEFF4;--ink-soft:#C3C8D4;--muted:#8B93A2;--line:rgba(255,255,255,.09);
    --accent:#D97757;--accent-2:#E8946F;--accent-tint:rgba(217,119,87,.14);--ok:#38CD8C;--warn:#E4B45A;--crit:#F0776A;--radius:14px}
  *{box-sizing:border-box}
  html{background:var(--paper);color:var(--ink)}
  body{margin:0;font:16px/1.55 "Hanken Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  main{max-width:880px;margin:0 auto;padding:40px 22px 64px}
  h1,h2{font-family:"Bricolage Grotesque",system-ui,sans-serif;letter-spacing:-.01em;line-height:1.15;margin:0}
  h1{font-size:clamp(26px,4vw,36px)}
  h2{font-size:20px;margin-bottom:12px}
  .sur{color:var(--accent-2);font:600 13px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px}
  .bandeau{margin:18px 0 28px;padding:12px 14px;border:1px solid var(--accent);background:var(--accent-tint);border-radius:var(--radius);color:var(--ink-soft)}
  .trois{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}
  .case{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px}
  .case b{display:block;font:700 34px/1 "JetBrains Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums;margin:6px 0 4px}
  .case span{color:var(--muted);font-size:14px}
  .case.bureau b{color:var(--accent-2)}
  section{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:20px;margin-bottom:16px}
  ul{list-style:none;margin:0;padding:0}
  li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;padding:9px 0;border-top:1px solid var(--line)}
  li:first-child{border-top:0}
  li .n{color:var(--muted);font-size:14px}
  .ligne{color:var(--ink-soft);margin:6px 0}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:9px 8px;border-top:1px solid var(--line);vertical-align:top}
  th{color:var(--muted);font-weight:600}
  td.base{color:var(--warn)}
  .tableau{overflow-x:auto}
  footer{color:var(--muted);font-size:13px;margin-top:24px}
  code{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;color:var(--ink-soft)}
  @media (max-width:640px){.trois{grid-template-columns:1fr}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<main>
  <header>
    <p class="sur">Exemple. Rapport du gérant</p>
    <h1>Exemple. Bâti-Démo : où en est-on ce mardi 3 novembre 2026, 9 h 30</h1>
    <p class="bandeau" role="note">Exemple. Démonstration à blanc (mode A) sur une entreprise fictive : rien n’a été envoyé, rien n’a été écrit, aucun modèle n’a été appelé. Chaque nom, numéro et texte est fabriqué et porte « Exemple. ». Ce rapport ne contient aucun chiffre de gain : seulement des comptes du passage.</p>
  </header>

  <div class="trois" aria-label="Exemple. Le passage en trois chiffres">
    <div class="case"><span>Exemple. Déjà traité seul</span><b data-compte="fait_seul">0</b><span>en mode à blanc, rien ne part seul</span></div>
    <div class="case bureau"><span>Exemple. Sur votre bureau, solution prête</span><b data-compte="bureau">${nbBureau}</b><span>cartes à valider d’un clic</span></div>
    <div class="case"><span>Exemple. À reprendre</span><b data-compte="reprendre">${refus.length}</b><span>arrêté par la porte de conformité</span></div>
  </div>

  <section aria-labelledby="bureau">
    <h2 id="bureau">Exemple. Sur votre bureau, solution prête</h2>
    <ul>
${cartesRel.map((d) => '      ' + li(libRel(d), 'brouillon prêt, à relire et valider')).join('\n')}
${cartesQual.map((d) => '      ' + li(`Exemple. Réponse à la demande ${court(d.objet_id)} (${(q[d.objet_id] || {}).categorie || 'non renseignée'})`, (q[d.objet_id] || {}).doublon ? 'même contact qu’une demande déjà reçue : à vérifier' : MOTIFS[d.motif] || d.motif)).join('\n')}
    </ul>
  </section>

  <section aria-labelledby="reprendre">
    <h2 id="reprendre">Exemple. À reprendre</h2>
    <ul>
${refus.map((r) => '      ' + li(r.d ? libRel(r.d) : 'Exemple. Relance', 'arrêté : ' + r.motifs.map((m) => MOTIFS[m] || m).join(', '))).join('\n')}
    </ul>
  </section>

  <section aria-labelledby="ecartees">
    <h2 id="ecartees">Exemple. Volontairement laissé de côté</h2>
    <ul>
${ecartees.map((d) => '      ' + li(`Exemple. ${d.objet_type === 'facture' ? 'Facture' : d.objet_type === 'devis' ? 'Devis' : 'Conversation'} ${court(d.objet_id)}`, MOTIFS[d.motif] || d.motif)).join('\n')}
    </ul>
  </section>

  <section aria-labelledby="alertes">
    <h2 id="alertes">Exemple. Alertes internes</h2>
    <ul>
${alerte.alertes_prevues.map((c) => '      ' + li(...(ALERTES[c] || ['Exemple. Alerte', '']))).join('\n')}
    </ul>
  </section>

  <section aria-labelledby="semaine">
    <h2 id="semaine">Exemple. La semaine passée, du 26 octobre au 1er novembre 2026</h2>
    <p class="ligne">Exemple. Le rapport du lundi, tel que l’agent Reporting l’a rendu : il compte les passages à blanc de la semaine passée, pas ceux de ce matin.</p>
${rapport.lignes.map((l) => `    <p class="ligne">${ech(l)}</p>`).join('\n')}
  </section>

  <section aria-labelledby="kpi">
    <h2 id="kpi">Exemple. Les indicateurs suivis</h2>
    <div class="tableau">
    <table>
      <thead><tr><th scope="col">Indicateur</th><th scope="col">Base de départ</th><th scope="col">Fréquence</th></tr></thead>
      <tbody>
${KPI_DEMO.map(([id, lib, f]) => `        <tr data-kpi="${id}"><td>Exemple. ${id} · ${ech(lib)}</td><td class="base" data-base>Inconnue, à mesurer</td><td>${f}</td></tr>`).join('\n')}
      </tbody>
    </table>
    </div>
    <p class="ligne">Exemple. Aucune cible n’est proposée avant d’avoir mesuré la base de départ chez vous, pendant quatre semaines.</p>
  </section>

  <footer>
    <p>Exemple. Fabriqué à partir des passages à blanc dans n8n : bout en bout <code>#461</code> (${bilan.effets_prevus} effets prévus, ${bilan.effets_faits} fait), chaînes <code>#451</code> <code>#450</code> <code>#452</code> <code>#447</code> <code>#448</code>. Tâche 035-007.</p>
  </footer>
</main>
</body>
</html>
`
}
if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes('--rapport')) {
  const essais = JSON.parse(readFileSync(path.join(ICI, 'essais-n8n.json'), 'utf8'))
  const dest = path.join(ICI, '../../../plans/011-cadrage-01-11/p5-entreprise/demo/rapport-gerant-exemple.html')
  mkdirSync(path.dirname(dest), { recursive: true })
  writeFileSync(dest, rapportGerant(essais))
  console.log('rapport écrit : ' + dest)
}
