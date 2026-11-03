// 036-004 — fabrique du département Suivi et relances (plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-004 du § 4) :
//   presti-dep-suivi (relances de conversation et de devis, carte de lot du lundi, note d'intérêt calculée par le code), lib-controler-conflit
//   (A20 : déjà en cours ? déjà relancé ? client sensible ? proposition écartée ? dossier clos ?) et le banc presti-banc-suivi.
// Hors ligne : aucun réseau, aucune base, aucun modèle, aucune donnée réelle (« Exemple. » devant tout nom, aucune adresse). Mode A comme
// 035-003 à 036-003 : tout est INACTIF, en simulation, sans identifiant ; les lectures sont épinglées, les écritures partent dans `effets_prevus`.
// Le gabarit « Contrat » (codeEntree, codeSortie) est celui de 035-003 ; les lib-* de 035-004 et 035-005 sont APPELÉS, jamais réécrits.
//   node .orchestre/preuves/036-004/construire.mjs <dossier> [--ids=<json>]   → les programmes SDK / opérations (collés tels quels dans n8n)
//   node .orchestre/preuves/036-004/construire.mjs --contrats                 → plans/011-cadrage-01-11/p6-signature/contrats/suivi.json
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie } from '../035-003/construire.mjs'
import * as F5 from '../035-005/construire.mjs'
import { lireCopie } from '../036-001/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const J = JSON.stringify
export const ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
export const IDS = { // relevés par search_workflows le 03/11/2026
  'lib-relancer': 'jGM56jxeLUVXZIiM', 'lib-rediger-message': 'xfRUnkwOKSwQezVb', 'lib-porte-conformite': '8c8vkUeSkfgB5FAM', 'lib-decider': 'hckqX1tQjIommtTH',
  'lib-executer': 'ADX5mPWqIvq1LGs6', 'lib-journaliser': 'NQg0KDXIa5hhzAvq', 'presti-cerveau': '596OC5mL2aMBq6SD', 'presti-dep-suivi': 'jo8eQMEwiB9wCbKN',
}
export const VERSION_CONTRATS = '1.0.0'

// ─── Ce que le code de l'application dit (constantes figées ensuite dans les nœuds, comparées par le juge) ───────────────────────────────────
export function lireConstantes() {
  const k = lireCopie(), r = F5.lireCode()
  const src = (f) => readFileSync(path.join(RACINE, f), 'utf8').replace(/\r\n/g, '\n')
  const num = (f, nom) => { const m = new RegExp(`export const ${nom} = (\\d+)`).exec(src(f)); if (!m) throw new Error(`${nom} introuvable`); return Number(m[1]) }
  return { ...k, RELANCE_DELAI_JOURS: r.RELANCE_DELAI_JOURS, CHEMINS: r.CHEMINS, OUTILS_JAMAIS_AUTO: r.OUTILS_JAMAIS_AUTO,
    REFUS_RETENUS_JOURS: num('lib/assistant/cartes.ts', 'REFUS_RETENUS_JOURS'), LOT_RELANCES_MAX: num('lib/assistant/outils-actions.ts', 'LOT_RELANCES_MAX'),
    CADENCE_RELANCES: [...(/CADENCE_RELANCES = \[([^\]]+)\]/.exec(src('lib/relances.ts'))[1].matchAll(/\d+/g))].map((x) => Number(x[0])) }
}

// ─── Les contrats (JSON Schema, versionnés ; hors contrat = rejet, journal, rien ne part) ───────────────────────────────────────────────────
const UUID = { type: 'string', format: 'uuid' }
const DATE = { type: 'string', format: 'date-time' }
const BOOL = { type: 'boolean' }
const BOOL_LU = { type: ['boolean', 'null'] }
const HHMM = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }
const TEXTE_SUR = (n) => ({ type: 'string', maxLength: n, pattern: '^[^@]*$' })
const objet = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props })
const mots = { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 60 } }
export const OFFRES = ['studio', 'signature', 'essentiel', 'essai']
export const STATUTS_DEVIS = ['envoye', 'brouillon', 'accepte', 'refuse', 'expire']
export const STATUTS_CONVERSATION = ['repondu', 'nouveau', 'en_discussion', 'gagne', 'perdu']
export const MOTIFS_CONFLIT = ['lecture_manquante', 'dossier_conclu', 'client_en_discussion', 'main_prise', 'exclu', 'client_sensible', 'deja_en_cours', 'ecartee_recemment', 'deja_relance', 'doublon_dossier']
export const MOTIFS_ANNULE = ['dossier_conclu', 'client_en_discussion', 'main_prise', 'exclu', 'client_sensible']
const HISTORIQUE = objet({ ok: BOOL, erreur: { type: 'string', maxLength: 200 }, ignorees: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 40 } },
  traces: { type: 'array', maxItems: 100, items: objet({ chemin: { enum: ['assistant', 'crm', 'impayes', 'conversation'] }, le: { type: 'string', maxLength: 40 } }) } }, ['ok'])
const INTERET = objet({ poids: objet({ consulte: { type: 'integer', minimum: 0, maximum: 100 }, question_posee: { type: 'integer', minimum: 0, maximum: 100 },
  expire_bientot: { type: 'integer', minimum: 0, maximum: 100 }, relance_sans_reponse: { type: 'integer', minimum: -100, maximum: 0 } }),
  seuils: objet({ chaud: { type: 'integer', minimum: 1, maximum: 100 }, tiede: { type: 'integer', minimum: 0, maximum: 99 } }) })
export const INTERET_DEFAUT = { poids: { consulte: 40, question_posee: 30, expire_bientot: 10, relance_sans_reponse: -10 }, seuils: { chaud: 60, tiede: 30 } }
export const CONFIG_SUIVI = objet({
  nom_artisan: { type: 'string', minLength: 1, maxLength: 70, pattern: '^[^@]*$' }, offre: { enum: OFFRES },
  capacites: { type: 'array', maxItems: 60, items: { type: 'string', pattern: '^[a-z_.]{2,40}$' } },
  pilote: objet({ drapeau: BOOL, actif: BOOL, types: { type: 'object' } }), parties_depuis_24h: { type: 'integer', minimum: 0 }, plafond_jour: { type: 'integer', minimum: 0, maximum: 20 },
  interrupteur_general: BOOL, interrupteur_departement: BOOL, pause_generale: BOOL_LU, mots_escalade_artisan: mots, fournisseurs: mots,
  horaires: objet({ jours_permis: { type: 'array', maxItems: 7, items: { type: 'integer', minimum: 1, maximum: 7 } }, heures_permises: objet({ debut: HHMM, fin: HHMM }) }),
  paliers_conversation_jours: { type: 'array', maxItems: 5, items: { type: 'integer', minimum: 1, maximum: 365 } },
  paliers_devis_jours: { type: 'array', maxItems: 5, items: { type: 'integer', minimum: 1, maximum: 365 } },
  jour_du_lot: { type: 'integer', minimum: 1, maximum: 7 }, ton: TEXTE_SUR(300), signature: TEXTE_SUR(120), interet: INTERET,
})
const OBJET_SUIVI = objet({
  objet_type: { enum: ['devis', 'conversation'] }, objet_id: UUID, dossier_id: UUID, statut: { enum: [...STATUTS_DEVIS, ...STATUTS_CONVERSATION] }, depuis_le: DATE,
  paliers_envoyes: { type: 'array', maxItems: 10, items: { type: 'integer', minimum: 1, maximum: 10 } },
  main_prise: BOOL_LU, exclu: BOOL_LU, carte: { enum: ['aucune', 'en_attente', 'en_cours', null] }, ecartee_le: { type: ['string', 'null'], maxLength: 40 },
  stop: BOOL_LU, historique: HISTORIQUE, messages_entrants: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 600 } },
  canal: { enum: ['email', 'sms', 'aucun'] }, destinataire: objet({ opposition: BOOL_LU, consentement_sms: BOOL_LU }),
  faits: objet({ numero: { type: ['string', 'null'], maxLength: 30, pattern: '^[A-Z0-9-]+$' }, objet: { type: ['string', 'null'], maxLength: 120, pattern: '^[^@{}]*$' },
    client: { type: ['string', 'null'], maxLength: 70, pattern: '^[^@]*$' }, montant_ttc_centimes: { type: ['integer', 'null'], minimum: 0 }, emis_le: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' } }),
  signaux: objet({ consulte: BOOL_LU, question_posee: BOOL, expire_dans_jours: { type: ['integer', 'null'], minimum: -3650, maximum: 3650 }, relances_sans_reponse: { type: 'integer', minimum: 0, maximum: 10 } }),
})
const EVENEMENT_SUIVI = objet({ id: UUID, artisan_id: UUID, type: { enum: ['relance_due'] }, cle: { type: 'string', minLength: 1, maxLength: 60, pattern: '^[A-Za-z0-9_:.-]+$' }, donnees: OBJET_SUIVI })
export const SCHEMAS = {
  'presti-dep-suivi': { sans_contact: false, config: CONFIG_SUIVI,
    donnees: objet({ evenements: { type: 'array', maxItems: 200, items: EVENEMENT_SUIVI }, maintenant: DATE, cles_existantes: { type: 'array', maxItems: 1000, items: { type: 'string', maxLength: 80 } } }) },
  'lib-controler-conflit': { sans_contact: true, config: objet({ mots_escalade_artisan: mots }),
    donnees: objet({ objet_type: { enum: ['devis', 'conversation'] }, objet_id: UUID, dossier_id: UUID, statut: OBJET_SUIVI.properties.statut, main_prise: BOOL_LU, exclu: BOOL_LU,
      carte: OBJET_SUIVI.properties.carte, ecartee_le: OBJET_SUIVI.properties.ecartee_le, historique: HISTORIQUE, stop: BOOL_LU,
      messages_entrants: OBJET_SUIVI.properties.messages_entrants, maintenant: DATE }) },
}
// Les lectures du chef (au réel : GET, select= limité, TOUJOURS filtrées sur le compte : « Supabase account » passe outre la RLS).
export const LECTURES = [
  ['relances dues (devis envoyés, conversations répondues)', 'GET devis?select=id,numero,objet,client_nom,total_ttc,statut,envoye_le,validite_jours,lead_id&artisan_id=eq.<compte>&statut=eq.envoye&limit=200'],
  ['conversations répondues', 'GET leads?select=id,statut,prise_en_main&artisan_id=eq.<compte>&statut=eq.repondu&limit=200'],
  ['relances planifiées', 'GET relances?select=id,lead_id,rang,planifiee_le,envoyee&envoyee=eq.false&lead_id=in.(<conversations du compte>)&limit=200'],
  ['registre : actions de l’assistant', 'GET assistant_actions?select=objet_id,maj_le&artisan_id=eq.<compte>&outil=in.(relancer_devis,relancer_facture)&statut=eq.executee&objet_id=in.(<devis du dossier>)&limit=100'],
  ['registre : rappels du CRM', 'GET crm_rappels?select=devis_id,envoye_le&artisan_id=eq.<compte>&devis_id=in.(<devis du dossier>)&envoye_le=not.is.null&limit=100'],
  ['registre : relances d’impayés', 'GET relances_impayes?select=facture_id,envoyee_le&artisan_id=eq.<compte>&facture_id=in.(<factures du dossier>)&envoyee_le=not.is.null&limit=100'],
  ['registre : relances de conversation', 'GET messages?select=lead_id,sent_at,etat&lead_id=in.(<conversations du compte>)&type=eq.relance&sens=eq.out&limit=100'],
  ['cartes ouvertes et refus récents', 'GET assistant_actions?select=outil,objet_id,statut,maj_le&artisan_id=eq.<compte>&outil=eq.relancer_devis&statut=in.(en_attente,en_cours,refusee)&limit=200'],
  ['« Ne plus relancer »', 'GET relances_exclusions?select=cible_id&artisan_id=eq.<compte>&limit=500'],
  ['derniers messages du client (une conversation)', 'GET messages?select=contenu&lead_id=eq.<conversation du compte>&sens=eq.in&order=sent_at.desc&limit=5'],
]
// L'écriture d'une relance partie, lue ensuite par lib/relancesRegistre.ts (historiqueRelances) : table et colonnes, par chemin.
export const REGISTRE = {
  devis: { table: 'assistant_actions', lu_par: "historiqueRelances : assistant_actions.select('maj_le').eq('artisan_id').in('outil', ['relancer_devis','relancer_facture']).eq('statut','executee').in('objet_id', devis du dossier)",
    colonnes: ['artisan_id', 'conversation_id', 'tour', 'outil', 'mode', 'statut', 'titre', 'entrees', 'apercu', 'objet_type', 'objet_id'], maj_le: 'défaut now() à l’écriture' },
  conversation: { table: 'messages', lu_par: "historiqueRelances : messages.select('sent_at, etat').eq('lead_id').eq('type','relance').eq('sens','out') (hors etat proposition ou rejete)",
    colonnes: ['lead_id', 'sens', 'type', 'contenu'], sent_at: 'défaut now() à l’écriture' },
}
export function contrats() {
  const c = lireConstantes()
  return { 'suivi.json': { $schema: 'https://json-schema.org/draft/2020-12/schema', version: VERSION_CONTRATS, tache: '036-004', source: 'plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-004 et § 3.3',
    titre: 'presti-dep-suivi@1 — le département Suivi et relances, et lib-controler-conflit@1',
    regle: 'Hors contrat = rejet (statut « rejete »), une ligne de journal, rien ne part. Toute requête filtre sur artisan_id (« Supabase account » passe outre la RLS).',
    entree: { config: SCHEMAS['presti-dep-suivi'].config, donnees: SCHEMAS['presti-dep-suivi'].donnees },
    specialistes: { 'lib-controler-conflit@1': { config: SCHEMAS['lib-controler-conflit'].config, donnees: SCHEMAS['lib-controler-conflit'].donnees, motifs: MOTIFS_CONFLIT, motifs_qui_annulent: MOTIFS_ANNULE,
      constantes: { delai_registre_jours: c.RELANCE_DELAI_JOURS, refus_recent_jours: c.REFUS_RETENUS_JOURS, chemins: c.CHEMINS } } },
    cadences: { conversation_jours: c.CADENCE_RELANCES, devis_jours: [7], source_devis: 'lib/crm/assistants.ts:108 (« devis envoyé sans réponse depuis plus de 7 jours »)' },
    interet: { defaut: INTERET_DEFAUT, regle: "note = somme des poids des signaux présents (consulté, question posée, expire dans 7 jours ou moins) + (poids négatif × relances sans réponse), bornée de 0 à 100 ; tranche chaud / tiède / froid par seuils. Calculée par le CODE, jamais par un modèle ; sert à ORDONNER la carte de lot, jamais à décider d'un envoi." },
    lectures: Object.fromEntries(LECTURES), registre: REGISTRE,
    carte_de_lot: { format: 'lib/assistant/cartes.ts:366 (apercuLotRelances : retenus {numero, client, montant_ttc, envoye_le, message}, exclus {numero, client, motif}, critère de l’ordre)', maximum: c.LOT_RELANCES_MAX, jour: 'lundi (config.jour_du_lot, Europe/Paris)' },
    sortie: { statut: ['ok', 'rien_a_faire', 'rejete', 'erreur'], issues: ['prepare', 'part_seul', 'attente_lot', 'reste_du', 'annule', 'rien'] },
    studio_signature: { studio: 'tout en carte : une carte par conversation, UNE carte de lot le lundi pour les devis ; jamais une ligne du pilote ni un envoi',
      signature: 'conversation : part seul si relances.auto ; devis : file du pilote si assistant.pilote, drapeau, pilote actif, type relance_devis activé, plafond ; sinon carte de lot du lundi' } } }
}

// ─── Les gabarits de nœuds et de réglages (36-001/36-003) ──────────────────────────────────────────────────────────────────────────────────
const CODE_ = (nom, js, notes, pos) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, ${pos ? `position: ${J(pos)}, ` : ''}${notes ? `notes: ${J(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
const IF_ = (nom, gauche, notes) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${J(nom.replace(/[^A-Za-z]/g, '').toLowerCase().slice(0, 30) || 'si')}, leftValue: ${J('={{ ' + gauche + ' }}')}, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
const ARRET = () => `node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { name: 'Hors simulation : non branché', notes: "Simulation : aucun effet réel n'est branché. Hors simulation, le travail s'arrête ici, avant tout appel.", parameters: { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (tâche 036-004). Rien n'a été lu, écrit ni envoyé." } } })`
const REGLAGES = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false, saveManualExecutions: true, errorWorkflow: ERREUR }
export const reglagesEnfant = (appelants) => ({ ...REGLAGES, callerPolicy: 'workflowsFromAList', callerIds: appelants })
export const reglagesRacine = (t = 300) => ({ ...REGLAGES, executionTimeout: t, callerPolicy: 'none' })
const IMPORTS = "import { workflow, node, trigger, ifElse, sticky } from '@n8n/workflow-sdk';"

// ─── La copie figée de l'escalade du pilote (même texte que lib-trier-demande, 036-001) et du registre (lib/relancesRegistre.ts) ────────────
const REPERE = '// ─── Copie figée de lib/pilote/regles.ts (escalade), de lib/relancesRegistre.ts (3 jours, chemins) et de lib/assistant/cartes.ts (refus de 7 jours), comparée au code par scripts/suivi-n8n-qa.mjs ───'
export const codeConflit = (c) => String.raw`// lib-controler-conflit (036-004 ; A20, p6 § 2.1) : AVANT tout geste de relance, cinq questions, dans cet ordre de gravité. Le dossier est-il déjà
// clos (signé, refusé, expiré, gagné, perdu) ou le client en discussion ? l'artisan a-t-il repris la main, ou demandé « Ne plus relancer » ? le client
// est-il sensible (« stop », sujet d'escalade lu comme le pilote le lit) ? une carte ou une relance est-elle déjà en cours ? une proposition a-t-elle été
// ÉCARTÉE il y a moins de 7 jours (B11) ? le dossier a-t-il déjà été relancé, par n'importe quel chemin, il y a moins de 3 jours (registre commun) ?
// Un seul dossier par passage : le devis passe avant la conversation du même dossier. Une lecture manquante vaut « rien » (côté sûr).
// Aucun modèle, rien n'est écrit ni envoyé. Rend : continuer (booléen), issue (annule | reste_du | continue), motifs.
` + REPERE + `
const COPIE = ${J({ MOTS_ESCALADE_TOUJOURS: c.MOTS_ESCALADE_TOUJOURS, MOTS_ESCALADE_ENTIERS: c.MOTS_ESCALADE_ENTIERS, FAUSSE_URGENCE: c.FAUSSE_URGENCE, PERTE_D_EAU: c.PERTE_D_EAU, APPAREIL_PERD: c.APPAREIL_PERD, NOMS_NEUTRES: c.NOMS_NEUTRES, RELANCE_DELAI_JOURS: c.RELANCE_DELAI_JOURS, CHEMINS: c.CHEMINS, REFUS_RETENUS_JOURS: c.REFUS_RETENUS_JOURS })};
// ─── fin de la copie figée ───
` + String.raw`const sansAccents = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const enMots = (s) => ' ' + sansAccents(s).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const R = (n) => new RegExp(COPIE[n].source, COPIE[n].flags);
const FAUSSE_URGENCE = R('FAUSSE_URGENCE'), PERTE_D_EAU = R('PERTE_D_EAU'), APPAREIL_PERD = R('APPAREIL_PERD'), NOMS_NEUTRES = R('NOMS_NEUTRES');
const TOUJOURS = COPIE.MOTS_ESCALADE_TOUJOURS.map((m) => [m, enMots(m).trim()]);
const ENTIERS = COPIE.MOTS_ESCALADE_ENTIERS.map((m) => [m, enMots(m).trim()]);
function sujetEscalade(messages, motsArtisan) {
  const artisan = (Array.isArray(motsArtisan) ? motsArtisan : []).filter((m) => typeof m === 'string').map((m) => [m, sansAccents(m).trim()]).filter((x) => x[1] !== '');
  for (const brut of messages) {
    if (typeof brut !== 'string' || !brut.trim()) continue;
    const mots = enMots(brut).replace(NOMS_NEUTRES, ' ').replace(FAUSSE_URGENCE, ' ').replace(/ {2,}/g, ' ');
    for (const [m, k] of TOUJOURS) if (k && mots.includes(' ' + k)) return m;
    for (const [m, k] of ENTIERS) if (k && mots.includes(' ' + k + ' ')) return m;
    if (PERTE_D_EAU.test(mots)) return 'perte d’eau';
    if (APPAREIL_PERD.test(mots)) return 'perte d’eau';
    if (mots.includes(' ca sent ')) return 'ça sent';
    const texte = sansAccents(brut).replace(NOMS_NEUTRES, ' ');
    for (const [m, k] of artisan) if (texte.includes(k)) return m;
  }
  return null;
}
function relanceRecente(h, maintenant, sauf) {
  if (!h || h.ok !== true) return { refus: true, raison: 'illisible' };
  const delai = COPIE.RELANCE_DELAI_JOURS * 86400000;
  const t = maintenant.getTime();
  const recentes = h.traces
    .filter((x) => x.chemin !== sauf)
    .filter((x) => { const le = Date.parse(x.le); return !Number.isFinite(le) || t - le < delai; })
    .sort((a, b) => b.le.localeCompare(a.le));
  return recentes.length ? { refus: true, raison: 'recente', derniere: recentes[0] } : { refus: false };
}
const CLOS = { devis: ['brouillon', 'accepte', 'refuse', 'expire'], conversation: ['gagne', 'perdu'] };
const DISCUSSION = ['nouveau', 'en_discussion'];
const OUVERT = { devis: 'envoye', conversation: 'repondu' };
const ANNULENT = ['dossier_conclu', 'client_en_discussion', 'main_prise', 'exclu', 'client_sensible'];
const retenus = new Set();
return $input.all().map((item) => {
  const j = item.json;
  try {
    const e = j.enveloppe, c = e.config, d = e.donnees, maintenant = new Date(Date.parse(d.maintenant));
    const m = [];
    const forme = CLOS[d.objet_type] && (CLOS[d.objet_type].includes(d.statut) || d.statut === OUVERT[d.objet_type] || (d.objet_type === 'conversation' && DISCUSSION.includes(d.statut)));
    const registre = relanceRecente(d.historique, maintenant, d.objet_type === 'conversation' ? 'conversation' : undefined);
    if (!forme || registre.raison === 'illisible' || d.carte === null || d.stop === null || d.exclu === null || d.main_prise === null) m.push('lecture_manquante');
    if (forme && CLOS[d.objet_type].includes(d.statut)) m.push('dossier_conclu');
    if (forme && d.objet_type === 'conversation' && DISCUSSION.includes(d.statut)) m.push('client_en_discussion');
    if (d.main_prise === true) m.push('main_prise');
    if (d.exclu === true) m.push('exclu');
    const mot = sujetEscalade(d.messages_entrants, c.mots_escalade_artisan);
    if (d.stop === true || mot !== null) m.push('client_sensible');
    if (d.carte === 'en_attente' || d.carte === 'en_cours') m.push('deja_en_cours');
    if (typeof d.ecartee_le === 'string' && d.ecartee_le) { const le = Date.parse(d.ecartee_le); if (!Number.isFinite(le) || maintenant.getTime() - le < COPIE.REFUS_RETENUS_JOURS * 86400000) m.push('ecartee_recemment'); }
    if (registre.refus && registre.raison === 'recente') m.push('deja_relance');
    if (!m.length) { if (retenus.has(d.dossier_id)) m.push('doublon_dossier'); else retenus.add(d.dossier_id); }
    const issue = !m.length ? 'continue' : m.some((x) => ANNULENT.includes(x)) ? 'annule' : 'reste_du';
    const derniere = registre.refus && registre.raison === 'recente' ? { chemin: registre.derniere.chemin, le: String(registre.derniere.le).slice(0, 40) } : null;
    const resultat = { objet_type: d.objet_type, objet_id: d.objet_id, dossier_id: d.dossier_id, statut: d.statut, continuer: m.length === 0, issue: issue, motifs: m, sensible: d.stop === true || mot !== null, mot: mot, derniere: derniere };
    return { json: { ...j, statut: m.length ? 'rien_a_faire' : 'ok', resultat: resultat, effets_prevus: [],
      journal: [{ evenement: 'conflit', agent: 'lib-controler-conflit', objet_ref: d.objet_id, decision: (m.length ? 'conflit : ' + m.join(', ') : 'aucun conflit').slice(0, 200), simulation: e.simulation }] } };
  } catch (err) {
    return { json: { ...j, statut: 'erreur', resultat: null, effets_prevus: [], erreurs: ['conflit : ' + String((err && err.message) || err).slice(0, 120)] } };
  }
});`

// ─── presti-dep-suivi : le code de chaque nœud ────────────────────────────────────────────────────────────────────────────────────────────
const COMMUN = String.raw`const ENVS = $("Contrat d'entrée").all().map((x) => x.json).filter((x) => x.conforme === true).map((x) => x.enveloppe);
const OBJ = []; const PAR_ID = {}; const AUTRES = [];
for (const e of ENVS) for (const ev of e.donnees.evenements) {
  if (ev.artisan_id !== e.organisation_id) { AUTRES.push({ id: ev.id, org: e.organisation_id }); continue; }
  if (ev.type !== 'relance_due' || PAR_ID[ev.id]) continue;
  PAR_ID[ev.id] = { e: e, ev: ev, o: ev.donnees }; OBJ.push(PAR_ID[ev.id]);
}
OBJ.sort((a, b) => (a.o.objet_type === b.o.objet_type ? 0 : a.o.objet_type === 'devis' ? -1 : 1));
const env = (e, contrat, cle, config, donnees) => ({ contrat: contrat, organisation_id: e.organisation_id, simulation: e.simulation, cle_idempotence: String(cle).slice(0, 80), trace: { execution_parent: String(e.trace.execution_parent), declencheur: 'presti-dep-suivi', tentative: e.trace.tentative }, config: config, donnees: donnees });
const sorties = (nom) => { const n = $(nom); return n.isExecuted ? n.all().map((x) => x.json) : []; };
const parCle = (nom, contrat) => { const m = {}; for (const s of sorties(nom)) if (s && s.contrat === contrat && typeof s.cle_idempotence === 'string') m[s.cle_idempotence] = s; return m; };
const bon = (s) => !!(s && s.statut === 'ok' && s.resultat);
const VIDE = [{ json: { vide: true } }];
const FMT_PARIS = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
const JOURS_ISO = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
function paris(date) { const p = {}; for (const x of FMT_PARIS.formatToParts(date)) p[x.type] = x.value; return { jour: JOURS_ISO[p.weekday], date: p.year + '-' + p.month + '-' + p.day }; }
const jourDuLot = (e) => paris(new Date(Date.parse(e.donnees.maintenant))).jour === e.config.jour_du_lot;
const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const TEL = /(\+33|0033|\b0)\s?[1-9]([ .-]?\d{2}){4}\b/g;
`
export const SUIVI = {
  'Préparer le contrôle': String.raw`// Suivi, étape 1 (A20) : AVANT tout geste, le contrôleur de conflit. Une offre sans la capacité « relances » (Essentiel, essai) n'a rien à contrôler : annulée, comme le cron. La PAUSE GÉNÉRALE (lib/agents/sortie.ts : seule la valeur exacte false ouvre la porte) est lue par le Cerveau et passée dans config.pause_generale : posée ou illisible (null), rien n'est contrôlé ni relancé, les relances restent dues. Les coordonnées des messages du client sont MASQUÉES avant de sortir du chef.
` + COMMUN + String.raw`const s = OBJ.filter(({ e }) => e.config.capacites.includes('relances') && e.config.pause_generale === false).map(({ e, ev, o }) => ({ json: env(e, 'lib-controler-conflit@1', 'rc:' + ev.id, { mots_escalade_artisan: e.config.mots_escalade_artisan },
  { objet_type: o.objet_type, objet_id: o.objet_id, dossier_id: o.dossier_id, statut: o.statut, main_prise: o.main_prise, exclu: o.exclu, carte: o.carte, ecartee_le: o.ecartee_le,
    historique: o.historique, stop: o.stop, messages_entrants: o.messages_entrants.map((t) => t.replace(MAIL, '[coordonnée]').replace(TEL, '[coordonnée]')), maintenant: e.donnees.maintenant }) }));
return s.length ? s : VIDE;`,
  'Préparer la relance': String.raw`// Suivi, étape 2 : le palier atteint et non envoyé, le registre de 3 jours, le stop, les horaires (lib-relancer, 035-005). Seulement pour ce que le contrôleur laisse passer.
` + COMMUN + String.raw`const conf = parCle('Appeler lib-controler-conflit', 'lib-controler-conflit@1');
const s = [];
for (const { e, ev, o } of OBJ) { const r = conf['rc:' + ev.id]; if (!bon(r) || r.resultat.continuer !== true) continue;
  const config = { paliers_jours: o.objet_type === 'devis' ? e.config.paliers_devis_jours : e.config.paliers_conversation_jours, jours_permis: e.config.horaires.jours_permis, heures_permises: e.config.horaires.heures_permises };
  if (o.objet_type === 'conversation') config.sauf = 'conversation';
  s.push({ json: env(e, 'lib-relancer@1', 'rl:' + ev.id, config, { objet_type: o.objet_type, objet_id: o.objet_id, depuis_le: o.depuis_le, historique: o.historique, paliers_envoyes: o.paliers_envoyes, stop: o.stop, escalade: r.resultat.sensible === true, maintenant: e.donnees.maintenant }) }); }
return s.length ? s : VIDE;`,
  'Préparer la décision': String.raw`// Suivi, étape 3 : la décision d'un DEVIS (lib-decider) : carte ou pilote. Le niveau 3 n'existe que si l'offre a le pilote (assistant.pilote, lu en base,
// jamais un nom d'offre). Une relance de CONVERSATION ne passe pas ici : son seul interrupteur est relances.auto (lib/plans.ts, comme le cron).
` + COMMUN + String.raw`const rel = parCle('Appeler lib-relancer', 'lib-relancer@1');
const s = [];
for (const { e, ev, o } of OBJ) { const r = rel['rl:' + ev.id]; if (o.objet_type !== 'devis' || !bon(r) || r.resultat.a_relancer !== true) continue;
  s.push({ json: env(e, 'lib-decider@1', 'd:' + ev.id, { autonomie: { niveau_max: e.config.capacites.includes('assistant.pilote') ? 3 : 2, niveau_defaut: 2, niveaux: {} }, plan: e.config.offre, pilote: e.config.pilote, parties_depuis_24h: e.config.parties_depuis_24h },
    { objet_type: 'devis', objet_id: o.objet_id, constat: { outil: 'relancer_devis', etape: 'palier' + r.resultat.palier, escalade: false } }) }); }
return s.length ? s : VIDE;`,
  'Préparer la rédaction': String.raw`// Suivi, étape 4 : le texte (lib-rediger-message, modèle ÉPINGLÉ), à partir des seuls faits. La cible est fixée ICI :
//   conversation : part seul SEULEMENT avec relances.auto (Signature), sinon carte ; devis : lib-decider (pilote ou carte) ;
//   un devis dont la cible est une carte attend le LOT du lundi (config.jour_du_lot) : aucun texte n'est rédigé les autres jours.
` + COMMUN + String.raw`const rel = parCle('Appeler lib-relancer', 'lib-relancer@1'), dec = parCle('Appeler lib-decider', 'lib-decider@1');
const s = [];
for (const { e, ev, o } of OBJ) { const r = rel['rl:' + ev.id]; if (!bon(r) || r.resultat.a_relancer !== true) continue;
  let cible;
  if (o.objet_type === 'conversation') cible = e.config.capacites.includes('relances.auto') ? 'pilote' : 'carte';
  else { const d = dec['d:' + ev.id]; if (!bon(d) || d.resultat.action === 'rien') continue; cible = d.resultat.action === 'pilote' ? 'pilote' : 'carte'; if (cible === 'carte' && !jourDuLot(e)) continue; }
  if (o.canal === 'aucun') continue;
  const f = o.faits, faits = { type_relance: o.objet_type === 'devis' ? 'relance_devis' : 'relance_conversation', palier: r.resultat.palier };
  if (o.objet_type === 'devis') { faits.numero = f.numero; faits.objet = f.objet; faits.montant_ttc_centimes = f.montant_ttc_centimes; faits.emis_le = f.emis_le; }
  s.push({ json: env(e, 'lib-rediger-message@1', 'rm:' + ev.id, { canal: o.canal === 'sms' ? 'sms' : 'email', ton: e.config.ton, signature: e.config.signature, nom_artisan: e.config.nom_artisan, mention_ia: cible === 'pilote' },
    { action_cle: r.resultat.cle_idempotence, faits: faits }) }); }
return s.length ? s : VIDE;`,
  'Préparer la porte': String.raw`// Suivi, étape 5 : la porte de conformité (lib-porte-conformite, veto) avant TOUT effet : aucun prix, date, créneau ou fournisseur inventé ; une lecture illisible vaut refus.
` + COMMUN + String.raw`const rel = parCle('Appeler lib-relancer', 'lib-relancer@1'), red = parCle('Appeler lib-rediger-message', 'lib-rediger-message@1'), dec = parCle('Appeler lib-decider', 'lib-decider@1');
const s = [];
for (const { e, ev, o } of OBJ) { const b = red['rm:' + ev.id], r = rel['rl:' + ev.id]; if (!bon(b) || !bon(r)) continue;
  const devis = o.objet_type === 'devis', cible = devis ? (bon(dec['d:' + ev.id]) && dec['d:' + ev.id].resultat.action === 'pilote' ? 'pilote' : 'carte') : (e.config.capacites.includes('relances.auto') ? 'pilote' : 'carte');
  const f = o.faits, faits = { type_relance: devis ? 'relance_devis' : 'relance_conversation', palier: r.resultat.palier };
  if (devis) { faits.numero = f.numero; faits.objet = f.objet; faits.montant_ttc_centimes = f.montant_ttc_centimes; faits.emis_le = f.emis_le; }
  s.push({ json: env(e, 'lib-porte-conformite@1', 'p:' + ev.id, { jamais_auto: [], regles_metier: { fournisseurs: e.config.fournisseurs, mots_escalade_artisan: e.config.mots_escalade_artisan, jours_permis: e.config.horaires.jours_permis, heures_permises: e.config.horaires.heures_permises }, plafond_jour: e.config.plafond_jour },
    { action: { type_action: faits.type_relance, outil: devis ? 'relancer_devis' : 'relancer_conversation', prix_sources: true, cible: cible, sans_relecture: cible === 'pilote' },
      message: { canal: b.resultat.canal, objet: b.resultat.objet, texte: b.resultat.texte }, destinataire: { opposition: o.destinataire.opposition, consentement_sms: o.destinataire.consentement_sms, escalade: false },
      faits: faits, maintenant: e.donnees.maintenant, compteurs: { envoyes_aujourdhui: e.config.parties_depuis_24h } }) }); }
return s.length ? s : VIDE;`,
  "Préparer l'exécution": String.raw`// Suivi, étape 6 : SEUL ce que la porte laisse passer va à lib-executer (relit les interrupteurs juste avant l'effet et les clés déjà en base). Un devis dont la cible est
// une carte NE passe PAS ici : il entre dans la carte de lot du lundi (étape 7), qui a sa propre clé.
` + COMMUN + String.raw`const rel = parCle('Appeler lib-relancer', 'lib-relancer@1'), red = parCle('Appeler lib-rediger-message', 'lib-rediger-message@1'), dec = parCle('Appeler lib-decider', 'lib-decider@1'), porte = parCle('Appeler lib-porte-conformite', 'lib-porte-conformite@1');
const s = [];
for (const { e, ev, o } of OBJ) { const p = porte['p:' + ev.id], r = rel['rl:' + ev.id], b = red['rm:' + ev.id]; if (!p || !p.resultat || p.resultat.verdict !== 'passe' || !bon(r) || !bon(b)) continue;
  const devis = o.objet_type === 'devis', cible = p.resultat.cible;
  if (devis && cible === 'carte') continue;
  s.push({ json: env(e, 'lib-executer@1', r.resultat.cle_idempotence, { niveau_max: cible === 'pilote' ? 3 : 2 }, { verdict: 'passe', cible: cible, cle_idempotence: r.resultat.cle_idempotence,
    charge: { type_action: devis ? 'relance_devis' : 'relance_conversation', objet_type: o.objet_type, objet_id: o.objet_id, palier: r.resultat.palier, canal: b.resultat.canal, brouillon: { objet: b.resultat.objet, texte: b.resultat.texte } },
    interrupteurs: { general: e.config.interrupteur_general, agent: e.config.interrupteur_departement }, cles_existantes: e.donnees.cles_existantes }) }); }
return s.length ? s : VIDE;`,
}
// L'étape 7 : la note d'intérêt, la carte de lot du lundi, le registre. Un seul nœud, pur : rien n'est lu, écrit ni envoyé.
export const codeComposer = (c) => String.raw`// Suivi, étape 7 (A12, A19, C9) : trois choses calculées par le CODE, jamais par un modèle.
//   1. la NOTE D'INTÉRÊT de chaque relance (somme des poids de config.interet, bornée de 0 à 100) : elle ORDONNE la carte de lot, elle ne décide d'aucun envoi ;
//   2. la CARTE DE LOT du lundi (devis, au format de lib/assistant/cartes.ts apercuLotRelances) : retenus triés par note, exclus avec leur motif ; Studio : tout en carte ;
//   3. le REGISTRE COMMUN : chaque relance qui PART SEULE (Signature) écrit sa trace là où lib/relancesRegistre.ts la lira (assistant_actions pour un devis, messages pour
//      une conversation), APRÈS l'envoi réussi ; en Studio, c'est le clic de l'artisan qui l'écrit (le code de l'app).
// Constantes figées, comparées au code par scripts/suivi-n8n-qa.mjs : le maximum d'un lot.
const LOT_MAX = ${c.LOT_RELANCES_MAX};
const STATUT_LOT = { brouillon: 'brouillon', accepte: 'signé', refuse: 'refusé', expire: 'expiré' };
` + COMMUN + String.raw`const conf = parCle('Appeler lib-controler-conflit', 'lib-controler-conflit@1'), rel = parCle('Appeler lib-relancer', 'lib-relancer@1'), red = parCle('Appeler lib-rediger-message', 'lib-rediger-message@1');
const dec = parCle('Appeler lib-decider', 'lib-decider@1'), porte = parCle('Appeler lib-porte-conformite', 'lib-porte-conformite@1'), ex = parCle('Appeler lib-executer', 'lib-executer@1');
const fr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
function note(sig, I) {
  let n = 0;
  if (sig.consulte === true) n += I.poids.consulte;
  if (sig.question_posee === true) n += I.poids.question_posee;
  if (Number.isInteger(sig.expire_dans_jours) && sig.expire_dans_jours >= 0 && sig.expire_dans_jours <= 7) n += I.poids.expire_bientot;
  n += I.poids.relance_sans_reponse * sig.relances_sans_reponse;
  n = Math.max(0, Math.min(100, n));
  return { note: n, tranche: n >= I.seuils.chaud ? 'chaud' : n >= I.seuils.tiede ? 'tiede' : 'froid' };
}
const MOTIFS_FR = { dossier_conclu: (o) => 'pas en attente de réponse (statut : ' + (STATUT_LOT[o.statut] || o.statut) + ')', client_en_discussion: () => 'le client a répondu : la discussion est en cours',
  main_prise: () => 'vous avez repris la main sur ce dossier', exclu: () => 'vous avez demandé de ne plus le relancer', client_sensible: () => 'sujet sensible dans le fil : à traiter à la main',
  deja_en_cours: () => 'une relance de ce dossier attend déjà votre clic', ecartee_recemment: (o) => 'relance écartée par vous le ' + fr(o.ecartee_le) + ' : pas reproposée (nommez le devis pour la relancer quand même)',
  deja_relance: (o, r) => 'déjà relancé' + (r && r.derniere ? ' le ' + fr(r.derniere.le) : '') + ' : pas avant ' + ${c.RELANCE_DELAI_JOURS} + ' jours', doublon_dossier: () => 'ce dossier est déjà relancé dans ce passage', lecture_manquante: () => 'dossier illisible : rien ne part sans le savoir' };
return ENVS.map((e) => {
  const decisions = [], effets = [], retenus = [], exclus = [];
  const lundi = jourDuLot(e), jour = paris(new Date(Date.parse(e.donnees.maintenant))).date;
  for (const { ev, o } of OBJ.filter((x) => x.e === e)) {
    const id = ev.id, c = conf['rc:' + id], r = rel['rl:' + id], b = red['rm:' + id], d = dec['d:' + id], p = porte['p:' + id], x = ex[r && r.resultat && r.resultat.cle_idempotence];
    const base = { objet_id: o.objet_id, objet_type: o.objet_type, palier: null, issue: 'reste_du', motifs: [], note: null, tranche: null };
    const ligne = Object.assign(base, bon(r) || (r && r.resultat) ? { palier: r.resultat.palier } : {});
    if (e.config.pause_generale !== false) { ligne.motifs = ['pause_generale']; decisions.push(ligne); continue; }
    if (!e.config.capacites.includes('relances')) { ligne.issue = 'annule'; ligne.motifs = ['offre_sans_relances']; decisions.push(ligne); continue; }
    if (!bon(c) && !(c && c.resultat)) { ligne.motifs = ['conflit_illisible']; decisions.push(ligne); continue; }
    if (c.resultat.continuer !== true) { ligne.issue = c.resultat.issue; ligne.motifs = c.resultat.motifs.slice(); decisions.push(ligne);
      if (o.objet_type === 'devis') exclus.push({ numero: o.faits.numero, client: o.faits.client, motif: (MOTIFS_FR[c.resultat.motifs[0]] || (() => 'à revoir'))(o, c.resultat) });
      continue; }
    if (!r || !r.resultat) { ligne.motifs = ['relance_illisible']; decisions.push(ligne); continue; }
    if (r.resultat.a_relancer !== true) { ligne.issue = ['stop', 'litige_ou_escalade'].includes(r.resultat.motif) ? 'annule' : (['palier_deja_envoye', 'aucun_palier_atteint'].includes(r.resultat.motif) ? 'rien' : 'reste_du'); ligne.motifs = [r.resultat.motif]; decisions.push(ligne); continue; }
    const n = note(o.signaux, e.config.interet); ligne.note = n.note; ligne.tranche = n.tranche;
    if (o.objet_type === 'devis' && bon(d) && d.resultat.action === 'rien') { ligne.motifs = ['niveau_1_propose']; decisions.push(ligne); continue; }
    if (o.objet_type === 'devis' && bon(d) && d.resultat.action === 'carte' && !lundi) { ligne.issue = 'attente_lot'; ligne.motifs = ['lot_du_lundi']; decisions.push(ligne); continue; }
    if (o.canal === 'aucun') { ligne.motifs = ['sans_courriel']; decisions.push(ligne); continue; }
    if (!p || !p.resultat || p.resultat.verdict !== 'passe') { ligne.motifs = p && p.resultat ? ['refus_porte'].concat(p.resultat.motifs || []) : ['porte_absente']; decisions.push(ligne); continue; }
    if (o.objet_type === 'devis' && p.resultat.cible === 'carte') {
      retenus.push({ id: o.objet_id, note: n.note, numero: o.faits.numero, client: o.faits.client, montant_ttc: o.faits.montant_ttc_centimes === null ? null : o.faits.montant_ttc_centimes / 100, envoye_le: o.faits.emis_le,
        message: { a: 'adresse lue au moment d’écrire la carte', objet: b.resultat.objet, texte: b.resultat.texte }, ligne: ligne, ordre_envoi: o.faits.emis_le || '' });
      ligne.issue = 'prepare'; ligne.motifs = ['carte_de_lot']; decisions.push(ligne); continue; }
    if (!x || !x.resultat) { ligne.motifs = ['execution_absente']; decisions.push(ligne); continue; }
    if (x.statut !== 'ok') { ligne.issue = x.statut === 'rien_a_faire' ? 'rien' : 'reste_du'; ligne.motifs = [x.resultat.motif]; decisions.push(ligne); continue; }
    ligne.issue = p.resultat.cible === 'pilote' ? 'part_seul' : 'prepare'; ligne.motifs = [p.resultat.cible === 'pilote' ? 'pilote' : 'carte'];
    decisions.push(ligne);
    if (p.resultat.cible === 'pilote') {
      const cle = r.resultat.cle_idempotence;
      effets.push(o.objet_type === 'devis'
        ? { effet: 'ecrire_registre_relance', quand: 'apres_envoi_reussi', organisation_id: e.organisation_id, cle: 'reg:' + cle, table: 'assistant_actions', requete: 'POST /rest/v1/assistant_actions',
            corps: { artisan_id: e.organisation_id, conversation_id: o.dossier_id, tour: 1, outil: 'relancer_devis', mode: 'direct', statut: 'executee', titre: 'Relance de devis envoyée par n8n (palier ' + r.resultat.palier + ')', entrees: { source: 'n8n', cle: cle }, apercu: {}, objet_type: 'devis', objet_id: o.objet_id } }
        : { effet: 'ecrire_registre_relance', quand: 'apres_envoi_reussi', organisation_id: e.organisation_id, cle: 'reg:' + cle, table: 'messages', requete: 'POST /rest/v1/messages',
            corps: { lead_id: o.objet_id, sens: 'out', type: 'relance', contenu: b.resultat.texte } });
    }
  }
  retenus.sort((a, b) => b.note - a.note || String(a.ordre_envoi).localeCompare(String(b.ordre_envoi)) || String(a.numero).localeCompare(String(b.numero)));
  const gardes = retenus.slice(0, LOT_MAX), enPlus = retenus.slice(LOT_MAX);
  for (const t of enPlus) { t.ligne.issue = 'reste_du'; t.ligne.motifs = ['lot_complet']; exclus.push({ numero: t.numero, client: t.client, motif: 'au-delà des ' + LOT_MAX + ' premiers : second lot, une fois celui-ci traité' }); }
  let lot = null;
  if (gardes.length) {
    const cleLot = 'lot:' + e.organisation_id.slice(0, 8) + ':' + jour, existe = e.donnees.cles_existantes.includes(cleLot);
    lot = { cle: cleLot, titre: 'Relancer ' + gardes.length + ' devis' + (exclus.length ? ' · ' + exclus.length + ' exclu' + (exclus.length > 1 ? 's' : '') : ''), critere: 'note d’intérêt décroissante, puis devis le plus ancien d’abord',
      retenus: gardes.map((t) => ({ numero: t.numero, client: t.client, montant_ttc: t.montant_ttc, envoye_le: t.envoye_le, message: t.message, note: t.note })), exclus: exclus.slice(), deja_fait: existe };
    if (!existe) effets.push({ effet: 'ecrire_carte_lot', organisation_id: e.organisation_id, cle: cleLot, objet_type: 'devis', type_action: 'relance_devis_lot', outil: 'relancer_devis_lot', apercu: { titre: lot.titre, critere: lot.critere, retenus: lot.retenus, exclus: lot.exclus }, irreversible: true });
  }
  return { json: { enveloppe: e, composition: { decisions: decisions, lot: lot, effets: effets, exclus: exclus } } };
});`
const JOURNAL = String.raw`// Suivi, étape 8 : le journal (lib-journaliser), une enveloppe par compte : des identifiants et des décisions, jamais un nom, un contact ni un texte.
` + COMMUN + String.raw`const comp = $('Composer la note, le lot et le registre').all().map((x) => x.json);
const s = comp.map((k) => { const e = k.enveloppe, L = [];
  const ligne = (evenement, ref, decision) => L.push({ evenement: evenement, agent: 'presti-dep-suivi', objet_ref: ref, decision: String(decision).slice(0, 200), modele: null, jetons_entree: null, jetons_sortie: null, cout_eur: null, source_tarif: null, simulation: e.simulation });
  for (const dcs of k.composition.decisions) ligne('suivi_decision', dcs.objet_id, dcs.issue + ' (' + dcs.motifs.join(', ') + ')' + (dcs.note !== null ? ', intérêt ' + dcs.tranche : ''));
  if (k.composition.lot) ligne('carte_de_lot', null, 'lot de ' + k.composition.lot.retenus.length + ' devis, ' + k.composition.lot.exclus.length + ' exclu(s)');
  for (const a of AUTRES.filter((x) => x.org === e.organisation_id)) ligne('evenement_autre_compte', a.id, 'rejeté : événement d’un autre compte');
  return { json: env(e, 'lib-journaliser@1', 'j:' + e.cle_idempotence, {}, { entrees: L.slice(0, 200) }) }; });
return s.length ? s : VIDE;`
const ASSEMBLER = String.raw`// Suivi : la sortie, une par compte. Les effets prévus viennent de lib-executer (la carte ou la ligne du pilote), de la carte de lot et du registre. Rien n'est fait.
` + COMMUN + String.raw`const comp = $('Composer la note, le lot et le registre').all().map((x) => x.json);
const APPELS = ['Appeler lib-controler-conflit', 'Appeler lib-relancer', 'Appeler lib-decider', 'Appeler lib-rediger-message', 'Appeler lib-porte-conformite', 'Appeler lib-executer', 'Appeler lib-journaliser'];
const communes = [];
for (const nom of APPELS) for (const s of sorties(nom)) if (s && s.vide === true) continue; else if (!s || typeof s.contrat !== 'string') communes.push(nom + ' : appel en échec');
return comp.map((k) => {
  const e = k.enveloppe, c = k.composition, erreurs = communes.slice(), effets = [];
  for (const nom of APPELS.slice(0, 6)) for (const s of sorties(nom)) if (s && (s.statut === 'erreur' || s.statut === 'rejete')) erreurs.push(s.contrat + ' : ' + s.statut);
  for (const s of sorties('Appeler lib-executer')) for (const f of (s && s.effets_prevus) || []) if ((f.organisation_id || (f.corps && f.corps.organisation_id)) === e.organisation_id) effets.push(f);
  for (const f of c.effets) effets.push(f);
  const compte = (issue) => c.decisions.filter((x) => x.issue === issue).length;
  const refus = c.decisions.filter((x) => x.motifs.includes('refus_porte')).map((x) => x.objet_id);
  const resultat = { objets_recus: c.decisions.length, decisions: c.decisions, prepare: compte('prepare'), part_seul: compte('part_seul'), attente_lot: compte('attente_lot'), reste_du: compte('reste_du'), annule: compte('annule'), rien: compte('rien'),
    lot: c.lot ? { titre: c.lot.titre, retenus: c.lot.retenus.length, exclus: c.lot.exclus.length, deja_fait: c.lot.deja_fait } : null, refus_porte: refus, rejets: { autre_compte: AUTRES.filter((x) => x.org === e.organisation_id).length } };
  return { json: { enveloppe: e, statut: erreurs.length ? 'erreur' : (effets.length || c.decisions.length ? 'ok' : 'rien_a_faire'), resultat: resultat, effets_prevus: effets, erreurs: erreurs.slice(0, 20),
    journal: [{ evenement: 'suivi', agent: 'presti-dep-suivi', objet_ref: null, decision: ('suivi : ' + resultat.prepare + ' préparée(s), ' + resultat.part_seul + ' parties seules, ' + resultat.attente_lot + ' en attente du lot, ' + resultat.annule + ' annulée(s)').slice(0, 200), simulation: e.simulation }] } };
});`
export const ETAPES = [ // [préparation, « rien ? », sous-workflow]
  ['Préparer le contrôle', 'Rien à contrôler ?', 'lib-controler-conflit'], ['Préparer la relance', 'Rien à relancer ?', 'lib-relancer'], ['Préparer la décision', 'Aucun devis à décider ?', 'lib-decider'],
  ['Préparer la rédaction', 'Rien à rédiger ?', 'lib-rediger-message'], ['Préparer la porte', 'Rien à passer à la porte ?', 'lib-porte-conformite'], ["Préparer l'exécution", 'Rien à exécuter ?', 'lib-executer'],
]
export const NOM_COMPOSER = 'Composer la note, le lot et le registre'
export const NOM_LECTURE = "Lire le dossier de chaque relance (simulation : dans l'enveloppe)"
export const codesChef = (c) => ({ ...SUITE_CODES(), [NOM_COMPOSER]: codeComposer(c) })
function SUITE_CODES() { return { ...SUIVI, 'Préparer le journal': JOURNAL, Assembler: ASSEMBLER } }
export const NOTE_LECTURE = 'Simulation : un emplacement, les objets sont dans l’enveloppe (événement relance_due). Réel : ces lectures, GET, select= limité, TOUJOURS filtrées sur le compte (« Supabase account » passe outre la RLS) :\n'
  + LECTURES.map(([n, r]) => `requete: ${r}`).join('\n')

// ─── Le graphe de presti-dep-suivi : une seule description, d'où sortent l'export local (rejeu hors ligne) et les opérations n8n ───────────────────
const uuidDe = (i) => `00000000-0000-4000-8000-${String(100000 + i).padStart(12, '0')}`
const IF_PARAMS = (nom, gauche) => ({ conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: nom.replace(/[^A-Za-z]/g, '').toLowerCase().slice(0, 30) || 'si', leftValue: '={{ ' + gauche + ' }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} })
export const NOTE_CHEF = "## presti-dep-suivi (036-004)\nDépartement 3, Suivi et relances (A12, A19, A20) : relances de CONVERSATION (J+2, J+5, J+10) et de DEVIS, carte de lot du lundi, note d'intérêt calculée par le code.\nContrôleur de conflit (lib-controler-conflit) → palier (lib-relancer, registre de 3 jours) → décision d'un devis (lib-decider) → texte (lib-rediger-message, modèle ÉPINGLÉ) → porte de conformité → exécution (lib-executer) → note, carte de lot, registre → journal.\nStudio : tout en carte (une par conversation, UNE carte de lot le lundi pour les devis), jamais un envoi. Signature : la conversation part seule avec relances.auto ; le devis par le pilote si tout le permet, sinon carte de lot.\nCe que n8n envoie est écrit dans le registre commun (assistant_actions, messages) APRÈS l'envoi : jamais deux relances en 3 jours, tous chemins confondus.\nContrat presti-dep-suivi@1 (plans/011-cadrage-01-11/p6-signature/contrats/suivi.json). INACTIF, jamais publié, en simulation. Juge : scripts/suivi-n8n-qa.mjs"
export function specChef(ids, c) {
  const codes = codesChef(c), nodes = [], lien = {}, ops = { onError: [] }
  let x = 0
  const pos = (i, y = 0) => [224 * i, y]
  const ajout = (nom, type, typeVersion, parameters, i, y = 0, extra = {}) => { nodes.push({ id: uuidDe(nodes.length + 1), name: nom, type, typeVersion, position: pos(i, y), parameters, ...extra }); return nom }
  const relie = (a, b, sortie = 0) => { lien[a] = lien[a] || { main: [] }; (lien[a].main[sortie] = lien[a].main[sortie] || []).push({ node: b, type: 'main', index: 0 }) }
  const code = (nom, js, i, y = 0, notes) => ajout(nom, 'n8n-nodes-base.code', 2, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: js }, i, y, notes ? { notes } : {})
  const si = (nom, gauche, i, y, notes) => ajout(nom, 'n8n-nodes-base.if', 2.2, IF_PARAMS(nom, gauche), i, y, notes ? { notes } : {})
  const appel = (lib, i, y, notes) => { const n = ajout(`Appeler ${lib}`, 'n8n-nodes-base.executeWorkflow', 1.2, { source: 'database', workflowId: { __rl: true, mode: 'id', value: ids[lib] }, mode: 'once', options: { waitForSubWorkflow: true } }, i, y, { notes }); ops.onError.push(n); return n }
  const declencheur = ajout('Appelé par le Cerveau', 'n8n-nodes-base.executeWorkflowTrigger', 1.3, { inputSource: 'passthrough' }, 0, 80)
  const contrat = code("Contrat d'entrée", codeEntree('presti-dep-suivi@1', SCHEMAS['presti-dep-suivi']), 1, 80, 'contrat: presti-dep-suivi@1')
  const conforme = si('Entrée conforme ?', '$json.conforme', 2, 80)
  const porte = si('Porte simulation', '$json.enveloppe.simulation', 3, 80, "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché dans ce lot.")
  const arret = ajout('Hors simulation : non branché', 'n8n-nodes-base.stopAndError', 1, { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (tâche 036-004). Rien n'a été lu, écrit ni envoyé." }, 4, 240, { notes: "Simulation : aucun effet réel n'est branché. Hors simulation, le travail s'arrête ici, avant tout appel." })
  const lecture = ajout(NOM_LECTURE, 'n8n-nodes-base.noOp', 1, {}, 4, 80, { notes: NOTE_LECTURE })
  const sortie = 'Contrat de sortie'
  relie(declencheur, contrat); relie(contrat, conforme); relie(conforme, porte, 0); relie(conforme, sortie, 1); relie(porte, lecture, 0); relie(porte, arret, 1)
  let prec = lecture
  const NOTES = { 'lib-controler-conflit': 'Le contrôleur de conflit (036-004).', 'lib-relancer': 'Palier et registre de 3 jours (035-005), appelé tel quel.', 'lib-decider': 'Carte, pilote ou rien (035-004), appelé tel quel.',
    'lib-rediger-message': 'Le texte, à partir des seuls faits ; modèle ÉPINGLÉ (035-005), appelé tel quel.', 'lib-porte-conformite': 'Le veto (035-005), appelé tel quel.', 'lib-executer': "Relit les interrupteurs et les clés juste avant l'effet (035-005), appelé tel quel." }
  const SUITE = 'En simulation, sa sortie est épinglée dans l\'essai du chef tant que presti-dep-suivi n\'est pas dans ses callerIds (session principale).'
  const apps = []
  ETAPES.forEach(([prep, vide, lib], i) => {
    const p = code(prep, codes[prep], 5 + i * 3, 80), s = si(vide, '$json.vide === true', 6 + i * 3, 80, 'Vrai : rien à faire à cette étape. Faux : on appelle le spécialiste.'), a = appel(lib, 7 + i * 3, 160, `${NOTES[lib]} ${SUITE}`)
    if (i === 0) relie(prec, p); relie(p, s); relie(s, a, 1); apps.push([s, a]); prec = a
  })
  const composer = code(NOM_COMPOSER, codes[NOM_COMPOSER], 5 + ETAPES.length * 3, 80)
  const prepJ = code('Préparer le journal', codes['Préparer le journal'], 6 + ETAPES.length * 3, 80)
  const siJ = si('Rien à journaliser ?', '$json.vide === true', 7 + ETAPES.length * 3, 80, 'Vrai : aucun compte à journaliser.')
  const appJ = appel('lib-journaliser', 8 + ETAPES.length * 3, 160, 'Le journal (035-003), une enveloppe par compte. ' + SUITE)
  const assembler = code('Assembler', codes.Assembler, 9 + ETAPES.length * 3, 80)
  // La chaîne : chaque « rien ? » vrai saute son appel ; l'appel rejoint l'étape suivante.
  ETAPES.forEach(([prep], i) => { const suivant = i + 1 < ETAPES.length ? ETAPES[i + 1][0] : composer; relie(apps[i][0], suivant, 0); relie(apps[i][1], suivant) })
  relie(composer, prepJ); relie(prepJ, siJ); relie(siJ, assembler, 0); relie(siJ, appJ, 1); relie(appJ, assembler); relie(assembler, sortie)
  const fin = ajout(sortie, 'n8n-nodes-base.code', 2, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: codeSortie('presti-dep-suivi@1') }, 10 + ETAPES.length * 3, 80)
  ops.onError.push(appJ)
  return { nodes, connections: lien, onError: ops.onError, sortie: fin }
}
export const exportLocal = (id, nom, spec, reglages) => ({ id, name: nom, active: false, activeVersionId: null, nodes: spec.nodes, connections: spec.connections, settings: reglages })

// Les opérations de update_workflow qui font du squelette de 036-001 le département Suivi (trigger, « Contrat d'entrée », « Entrée conforme ? » et « Contrat de sortie » restent).
export function opsChef(spec, reglages) {
  const garde = new Set(['Appelé par le Cerveau', "Contrat d'entrée", 'Entrée conforme ?', 'Contrat de sortie'])
  const ops = [{ type: 'updateNodeParameters', nodeName: "Contrat d'entrée", parameters: { jsCode: spec.nodes.find((n) => n.name === "Contrat d'entrée").parameters.jsCode } },
    { type: 'removeNode', nodeName: 'Non branché' }]
  for (const n of spec.nodes) if (!garde.has(n.name)) ops.push({ type: 'addNode', node: { name: n.name, type: n.type, typeVersion: n.typeVersion, position: n.position, parameters: n.parameters, ...(n.notes ? { notes: n.notes } : {}) } })
  for (const nom of spec.onError) ops.push({ type: 'setNodeSettings', nodeName: nom, settings: { onError: 'continueRegularOutput' } })
  for (const [source, v] of Object.entries(spec.connections)) v.main.forEach((cibles, i) => (cibles || []).forEach((l) => {
    if (source === 'Entrée conforme ?' && l.node === 'Contrat de sortie') return // déjà là (squelette)
    if (['Appelé par le Cerveau', "Contrat d'entrée"].includes(source)) return
    ops.push({ type: 'addConnection', source, target: l.node, sourceIndex: i })
  }))
  ops.push({ type: 'updateNodeParameters', nodeName: 'Sticky Note f356f473', parameters: { content: NOTE_CHEF } })
  ops.push({ type: 'setWorkflowSettings', settings: { callerPolicy: reglages.callerPolicy, callerIds: reglages.callerIds } })
  return ops
}

// ─── Les enfants et le banc en programmes SDK (collés tels quels dans create_workflow_from_code) ──────────────────────────────────────────────
const TETE = (contrat, schema, declencheur) => [
  `const appele = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: ${J(declencheur)}, parameters: { inputSource: 'passthrough' } } });`,
  `const entree = ${CODE_("Contrat d'entrée", codeEntree(contrat, schema), `contrat: ${contrat}`)};`,
  `const conforme = ${IF_('Entrée conforme ?', '$json.conforme')};`,
  `const sortie = ${CODE_('Contrat de sortie', codeSortie(contrat))};`]
const PORTE = `const porte = ${IF_('Porte simulation', '$json.enveloppe.simulation', "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché dans ce lot.")};\nconst arret = ${ARRET()};`
export function sdkConflit(c, appelants) {
  const l = [IMPORTS, ...TETE('lib-controler-conflit@1', SCHEMAS['lib-controler-conflit'], 'Appelé par un chef'), PORTE, `const logique = ${CODE_('Contrôler le conflit', codeConflit(c))};`,
    `const note = sticky(${J("## lib-controler-conflit (036-004)\nContrôleur de conflit du Suivi (A20) : AVANT tout geste, le dossier est-il clos, le client en discussion, l'artisan intervenu, le client sensible (escalade lue comme le pilote), une relance déjà en cours, une proposition écartée il y a moins de 7 jours, un envoi de moins de 3 jours (registre commun, tous chemins) ? Une lecture manquante vaut « rien ». Aucun modèle.\nContrat lib-controler-conflit@1 (enveloppe@1, gabarit « Contrat » de 035-003). Appelé par presti-dep-suivi.\nINACTIF, jamais publié, en simulation. Juge : scripts/suivi-n8n-qa.mjs")}, [appele, entree, conforme], { color: 4 });`,
    `export default workflow('lib-controler-conflit', 'lib-controler-conflit', { settings: ${J(reglagesEnfant(appelants))} })\n  .add(appele).to(entree).to(conforme.onTrue(porte.onTrue(logique.to(sortie)).onFalse(arret)).onFalse(sortie))\n  .add(note);`]
  return l.join('\n') + '\n'
}
export const codeBanc = (compte) => String.raw`// presti-banc-suivi (036-004) : un lot de relances FICTIVES du compte ${compte === 'A' ? 'Studio' : 'Signature'} (« Exemple. » devant tout nom), un lundi matin. Aucun envoi, aucune base.
const env = ${J('__ENV_' + compte + '__')};
return $input.all().concat([{ json: env }]);`
export const CODE_BILAN_BANC = String.raw`// Banc : le bilan agrégé, sans donnée de client : par compte, le statut et les comptes de décisions, de cartes, de lignes du pilote, de lot et de relances partantes.
const sortie = [];
for (const { json: s } of $input.all()) {
  const r = s && s.resultat ? s.resultat : null, e = s && s.effets_prevus ? s.effets_prevus : [];
  sortie.push({ json: { organisation_id: s && s.organisation_id ? 'présent' : 'absent', contrat: s && s.contrat, statut: s && s.statut, simulation: s && s.simulation === true,
    prepare: r ? r.prepare : null, part_seul: r ? r.part_seul : null, attente_lot: r ? r.attente_lot : null, annule: r ? r.annule : null, reste_du: r ? r.reste_du : null,
    cartes: e.filter((x) => x.effet === 'ecrire_carte').length, lot: e.filter((x) => x.effet === 'ecrire_carte_lot').length, pilote: e.filter((x) => x.effet === 'mettre_en_file_pilote').length, registre: e.filter((x) => x.effet === 'ecrire_registre_relance').length,
    effets_faits: s && Array.isArray(s.effets_faits) ? s.effets_faits.length : -1 } });
}
return sortie;`
export const NOMS_CAS_BANC = { A: 'Cas fictifs : compte Studio (13 dossiers)', B: 'Cas fictifs : compte Signature (13 dossiers)' }
export function sdkBanc(idSuivi, envs) {
  const cas = (c) => (envs ? codeBanc(c).replace(J('__ENV_' + c + '__'), () => J(envs[c])) : '// Cas fictifs du banc : posés à l’étape suivante (mise à jour du nœud).\nreturn $input.all();')
  return [IMPORTS.replace(', ifElse', ''),
    "const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Banc (jamais publié)', parameters: { rule: { interval: [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 6 }] } } } });",
    `const casA = ${CODE_(NOMS_CAS_BANC.A, cas('A'))};`, `const casB = ${CODE_(NOMS_CAS_BANC.B, cas('B'))};`,
    `const appel = node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: 'Appeler presti-dep-suivi', onError: 'continueRegularOutput', notes: "Le chef du Suivi (036-004), une exécution pour les deux comptes. Le banc est son seul appelant avec le Cerveau.", parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(idSuivi)} }, mode: 'once', options: { waitForSubWorkflow: true } } } });`,
    `const bilan = ${CODE_('Bilan du banc', CODE_BILAN_BANC)};`,
    `const note = sticky(${J("## presti-banc-suivi (036-004)\nBanc du département Suivi : deux comptes fictifs (Studio, Signature), 13 dossiers chacun, un lundi matin. Jamais planifié, jamais publié, aucun appelant (callerPolicy none).\nINACTIF, simulation. Juge : scripts/suivi-n8n-qa.mjs")}, [horloge, casA, casB], { color: 4 });`,
    `export default workflow('presti-banc-suivi', 'presti-banc-suivi', { settings: ${J(reglagesRacine(300))} })\n  .add(horloge).to(casA).to(casB).to(appel).to(bilan)\n  .add(note);`].join('\n') + '\n'
}

