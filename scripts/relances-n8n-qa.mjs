// Juge HORS LIGNE du workflow n8n `presti-relances` (chantier 4, lot L18 ; tâche 032-044) — pas 1 à 3 de la règle de remplacement
// (.claude/rules/migration-production.md) : le workflow refait-il la DÉCISION et la PRÉPARATION des relances de conversation (J+2, J+5, J+10)
// du cron de 8 h (app/api/cron/relances/route.ts:58-241, lib/relances.ts, lib/relancesRegistre.ts) ?
//
// Il relit l'export (.orchestre/preuves/032-044/presti-relances.workflow.json, tiré du n8n d'Oracle), le brief
// (plans/011-cadrage-01-11/briefs/c4-n8n-relances.md), l'essai n8n (essai-n8n.json, essai-pin.json) et :
//   1. STRUCTURE : inactif, sans version publiée ; fuseau Europe/Paris ; une exécution par jour à 8 h ; chaîne exacte ; chaque lecture HTTP en GET,
//      sans corps, au gabarit exact (adresse, select=, filtres, pagination) ; ce qui est lu au moment d'envoyer le DÉCLARE (`lecture-pour-envoi`) ;
//      le nœud du modèle est ÉPINGLÉ (un nœud Code sans réseau, sans module : aucun appel) ; les deux nœuds d'envoi DÉSACTIVÉS, sans identifiant, sans la
//      ligne « envoyé avec n8n » ; la relance au prospect déclare le pied « mention » et le porte, l'avis déclare « aucun » ; branche d'erreur ;
//   2. COPIE FIGÉE : les listes de mots d'escalade et les expressions égales à celles de lib/pilote/regles.ts, les offres égales à lib/plans.ts
//      (`peut`), les réglages par défaut égaux à CONFIG_DEFAUT, les plafonds de la route et de lib/email.ts, le délai du registre, la mention d'IA
//      et le texte de repli égaux à ceux du code ;
//   3. COMPARAISON, cas par cas : la VRAIE route app/api/cron/relances/route.ts est jouée sur des données fictives (doublures : base en mémoire,
//      modèle, pause, suspensions, limites ; la vraie lib/email.ts avec un fetch qui note ce que Resend recevrait, la vraie lib/notifications.ts, le
//      vrai registre commun, le vrai sujetDuFil) ; ce qu'elle fait de chaque relance (annulée, laissée due, préparée « à valider », partie seule) et
//      les courriers qu'elle envoie sont comparés à ceux des nœuds de l'export, REJOUÉS sur les lectures que ses propres requêtes rendraient (le juge
//      lit les paramètres de chaque nœud, jamais un tableau écrit à côté), aux ÉCARTS ÉCRITS près (brief, « Comparaison ») ;
//   4. ESSAI : la pin data de l'essai n8n, rejouée hors ligne, rend exactement la sortie de n8n ;
//   5. MUTANTS : chacun doit faire rougir le juge pour sa raison (un client exclu relancé, le registre de 3 jours ignoré, Studio qui part seul,
//      mention ôtée, envoi hors simulation, etc.).
//
// Aucun réseau, aucune base, aucun modèle, aucun envoi, aucune écriture (hors /tmp pour la garde commune). Lancement :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/relances-n8n-qa.mjs
//   … scripts/relances-n8n-qa.mjs --pin   (imprime la pin data de l'essai, sans rien juger)
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { register } from 'node:module'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import vm from 'node:vm'
import path from 'node:path'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHEMINS = {
  export: '.orchestre/preuves/032-044/presti-relances.workflow.json',
  essai: '.orchestre/preuves/032-044/essai-n8n.json',
  pin: '.orchestre/preuves/032-044/essai-pin.json',
  brief: 'plans/011-cadrage-01-11/briefs/c4-n8n-relances.md',
  email: 'lib/email.ts', config: 'lib/plateformeConfig.ts', regles: 'lib/pilote/regles.ts', route: 'app/api/cron/relances/route.ts',
  registre: 'lib/relancesRegistre.ts', ai: 'lib/ai.ts',
}
const lireTexte = (c) => readFileSync(path.join(RACINE, c), 'utf8')
const copie = (o) => JSON.parse(JSON.stringify(o))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const FICHIER = (c) => pathToFileURL(path.join(RACINE, c)).href

// ─── Ce que le workflow doit être (le brief le recopie) ───────────────────────────────────────────────────────────────────────
const HOTE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const CRED = { id: 'dTewDK98MLrNckNG', name: 'Supabase account' }
const ERREUR_COMMUNE = 'AQeHiC58UgbMR4Kr' // presti-erreurs (032-033) : alerte courte, aucune donnée
const NUL = '00000000-0000-0000-0000-000000000000'
const UUID = String.raw`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
const col = (noeud, champ) => `$('${noeud}').all().map(i => i.json.${champ})`
const DANS = (...s) => `={{ 'in.(' + ([...new Set([${s.map((x) => `...${x}`).join(', ')}].filter(v => ${UUID}.test(String(v))))].join(',') || '${NUL}') + ')' }}`
const PAGINATION = { pagination: { paginationMode: 'updateAParameterInEachRequest', parameters: { parameters: [{ type: 'qs', name: 'offset', value: '={{ $pageCount * 1000 }}' }] },
  paginationCompleteWhen: 'other', completeExpression: '={{ !Array.isArray($response.body) || $response.body.length < 1000 }}', limitPagesFetched: true, maxRequests: 50 } }
const L = (nom, table, params, envoi, pagine = true, vide = true) => ({ nom, table, params, envoi, pagine, vide })
const LECTURES = [
  L('Lire relances dues', 'relances', [['select', 'id,lead_id,rang,planifiee_le'], ['envoyee', 'eq.false'], ['planifiee_le', "={{ 'lte.' + $('Passage').first().json.passage }}"], ['order', 'planifiee_le.asc,id.asc'], ['limit', '100']], null, false, false),
  L('Lire demandes', 'leads', [['select', 'id,nom_prospect,contact,message,statut,artisan_id,prise_en_main'], ['id', DANS(col('Lire relances dues', 'lead_id'))], ['order', 'id'], ['limit', '1000']], 'Envoyer la relance'),
  L('Lire comptes', 'artisans', [['select', 'id,nom,email,plan,is_founder,leads_pause,notifications'], ['id', DANS(col('Lire demandes', 'artisan_id'))], ['order', 'id'], ['limit', '1000']], 'Envoyer l avis'),
  L('Lire reglages', 'plateforme_config', [['select', 'artisan_id,escalade_mots'], ['artisan_id', DANS(col('Lire demandes', 'artisan_id'))], ['order', 'artisan_id'], ['limit', '1000']], null),
  L('Lire suspensions', 'suspensions', [['select', 'id,artisan_id'], ['levee_le', 'is.null'], ['artisan_id', DANS(col('Lire demandes', 'artisan_id'))], ['order', 'artisan_id.asc,id.asc'], ['limit', '1000']], null),
  L('Lire messages entrants', 'messages', [['select', 'id,lead_id,contenu,sent_at'], ['sens', 'eq.in'], ['lead_id', DANS(col('Lire relances dues', 'lead_id'))], ['order', 'sent_at.desc,id.desc'], ['limit', '1000']], 'Envoyer la relance'),
  L('Lire devis', 'devis', [['select', 'id,lead_id,client_id,artisan_id'], ['lead_id', DANS(col('Lire relances dues', 'lead_id'))], ['order', 'id'], ['limit', '1000']], null),
  L('Lire factures', 'factures', [['select', 'id,devis_id,artisan_id'], ['devis_id', DANS(col('Lire devis', 'id'))], ['order', 'id'], ['limit', '1000']], null),
  L('Lire actions assistant', 'assistant_actions', [['select', 'id,objet_id,maj_le'], ['outil', 'in.(relancer_devis,relancer_facture)'], ['statut', 'eq.executee'], ['objet_id', DANS(col('Lire devis', 'id'), col('Lire factures', 'id'))], ['order', 'maj_le.desc,id.desc'], ['limit', '1000']], null),
  L('Lire rappels CRM', 'crm_rappels', [['select', 'id,devis_id,envoye_le'], ['envoye_le', 'not.is.null'], ['devis_id', DANS(col('Lire devis', 'id'))], ['order', 'id'], ['limit', '1000']], null),
  L('Lire relances impayes', 'relances_impayes', [['select', 'id,facture_id,envoyee_le'], ['envoyee_le', 'not.is.null'], ['facture_id', DANS(col('Lire factures', 'id'))], ['order', 'id'], ['limit', '1000']], null),
  L('Lire exclusions', 'relances_exclusions', [['select', 'id,artisan_id,client_id,lead_id'], ['levee_le', 'is.null'], ['artisan_id', DANS(col('Lire demandes', 'artisan_id'))], ['order', 'id'], ['limit', '1000']], null),
]
const CHAINE = ['Chaque matin', 'Passage', ...LECTURES.map((l) => l.nom), 'Decider', 'Modele epingle', 'Courriers a envoyer']
const BRANCHES = [['Garder les relances', 'Envoyer la relance'], ['Garder les avis', 'Envoyer l avis']]
const TYPES = {
  'Chaque matin': 'n8n-nodes-base.scheduleTrigger', Passage: 'n8n-nodes-base.code', Decider: 'n8n-nodes-base.code', 'Modele epingle': 'n8n-nodes-base.code', 'Courriers a envoyer': 'n8n-nodes-base.code',
  'Garder les relances': 'n8n-nodes-base.filter', 'Garder les avis': 'n8n-nodes-base.filter', 'Envoyer la relance': 'n8n-nodes-base.emailSend', 'Envoyer l avis': 'n8n-nodes-base.emailSend',
  ...Object.fromEntries(LECTURES.map((l) => [l.nom, 'n8n-nodes-base.httpRequest'])),
}
const REGLAGES = { timezone: 'Europe/Paris', executionTimeout: 120, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', errorWorkflow: ERREUR_COMMUNE, availableInMCP: true, executionOrder: 'v1' }
const MODULE_OU_RESEAU = /\brequire\s*\(|\bimport\s*\(|^\s*import\s|\bhelpers\s*\.\s*(?:httpRequest|request)|\bfetch\s*\(|\bprocess\s*\.|\$env\b|\bXMLHttpRequest\b|\bWebSocket\b|\$http\b|\bfetch\b/m
const MENTION = 'Message rédigé et envoyé automatiquement par l’assistant'
const CRON = '0 0 8 * * *'

// ─── Rejouer un nœud Code (contexte vm neuf : aucun objet de l'hôte hormis $, $input ; Date figée à l'instant donné) ───────────────
const enItems = (l) => l.map((j) => ({ json: copie(j) }))
function contexte(instant, sorties, entree = [{}]) {
  const $ = (nom) => { if (!(nom in sorties)) throw new Error(`nœud inconnu ou pas encore exécuté : ${nom}`); const it = enItems(sorties[nom]); return { all: () => it, first: () => it[0] } }
  const ent = enItems(entree)
  const $input = { all: () => ent, first: () => ent[0] }
  const ctx = vm.createContext({ $, $input }, { codeGeneration: { strings: false, wasm: false } })
  vm.runInContext(`globalThis.Date = (function (R) { class D extends R { constructor(...a) { if (a.length === 0) super(${Number(instant)}); else super(...a) } static now() { return ${Number(instant)} } } return D })(Date)`, ctx)
  return ctx
}
function executer(jsCode, { instant, sorties = {}, entree = [{}] }) {
  const ctx = contexte(instant, sorties, entree)
  const r = vm.runInContext('(function () {\n' + jsCode + '\n})()', ctx, { timeout: 5000, filename: 'noeud-code.js' })
  if (!Array.isArray(r)) throw new Error("le code doit rendre une liste d'éléments")
  return JSON.parse(JSON.stringify(r)).map((i) => i.json)
}
const evaluer = (expr, instant, sorties) => JSON.parse(JSON.stringify(vm.runInContext('(' + expr + ')', contexte(instant, sorties), { timeout: 5000 })))
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const codeDe = (wf, nom) => { const n = noeud(wf, nom); if (!n || typeof n.parameters?.jsCode !== 'string') throw new Error(`nœud Code absent : ${nom}`); return n.parameters.jsCode }
const chargerExport = () => { const brut = JSON.parse(lireTexte(CHEMINS.export)); return brut.workflow ?? brut }
const gabarit = (modele, item) => String(modele ?? '').replace(/^=/, '').replace(/\{\{\s*\$json\.(\w+)\s*\}\}/g, (_, k) => String(item[k] ?? ''))
const courrierEnvoye = (wf, nomEnvoi, item) => {
  const p = noeud(wf, nomEnvoi).parameters
  return { from: gabarit(p.fromEmail, item), to: gabarit(p.toEmail, item), subject: gabarit(p.subject, item), text: gabarit(p.text, item), reply_to: gabarit(p.options?.replyTo, item) }
}

// ─── Une base en mémoire, interrogée comme PostgREST (la route et les nœuds HTTP de l'export lisent les MÊMES tables) ───────────────
const estDate = (s) => typeof s === 'string' && /^\d{4}-\d\d-\d\dT/.test(s)
const comparer2 = (a, b) => { if (estDate(a) && estDate(b)) return Date.parse(a) - Date.parse(b); const x = String(a), y = String(b); return x < y ? -1 : x > y ? 1 : 0 }
const teste = (r, f) => {
  const v = r[f.k]
  switch (f.op) {
    case 'eq': return v !== null && v !== undefined && String(v) === String(f.v)
    case 'in': return v !== null && v !== undefined && f.v.map(String).includes(String(v))
    case 'is': return f.v === null ? v === null || v === undefined : String(v) === String(f.v)
    case 'notnull': return v !== null && v !== undefined
    case 'lte': return v !== null && v !== undefined && comparer2(v, f.v) <= 0
    case 'gte': return v !== null && v !== undefined && comparer2(v, f.v) >= 0
    default: throw new Error(`opérateur ${f.op}`)
  }
}
const trier = (rows, ordre) => ordre.length ? rows.slice().sort((a, b) => { for (const [k, asc] of ordre) { const c = comparer2(a[k] ?? '', b[k] ?? ''); if (c) return asc ? c : -c } return 0 }) : rows.slice()
const projeter = (rows, cols) => (cols.includes('*') ? rows.map((r) => ({ ...r })) : rows.map((r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]]))))
function filtreDeParam(k, valeur) {
  const v = String(valeur)
  let m
  if (v === 'is.null') return { k, op: 'is', v: null }
  if (v === 'not.is.null') return { k, op: 'notnull' }
  if ((m = /^in\.\((.*)\)$/.exec(v))) return { k, op: 'in', v: m[1] === '' ? [] : m[1].split(',') }
  if ((m = /^(eq|lte|gte)\.(.*)$/.exec(v))) return { k, op: m[1], v: m[2] }
  throw new Error(`filtre non pris en charge : ${k}=${v}`)
}
function lireRest(tables, table, params) {
  let select = ['*'], ordre = [], limite = Infinity, decalage = 0
  const filtres = []
  for (const [k, v] of params) {
    if (k === 'select') select = String(v).split(',').map((c) => c.trim()).filter(Boolean)
    else if (k === 'order') ordre = String(v).split(',').map((o) => { const [c, sens] = o.split('.'); return [c, sens !== 'desc'] })
    else if (k === 'limit') limite = Number(v)
    else if (k === 'offset') decalage = Number(v)
    else filtres.push(filtreDeParam(k, v))
  }
  const lignes = trier((tables[table] ?? []).filter((r) => filtres.every((f) => teste(r, f))), ordre)
  return projeter(lignes.slice(decalage, decalage + limite), select)
}
// La route interroge la base par l'API de supabase-js : on la ramène aux mêmes filtres.
function fabriquerBase(Q) {
  const exec = (s) => {
    const E = globalThis.__QA.etat
    const T = E.tables
    const rows = T[s.table] ?? (T[s.table] = [])
    if (s.op === 'insert') {
      const lignes = [].concat(s.values).map((v) => ({ id: `0e550000-0000-4000-8000-${String(rows.length + 1).padStart(12, '0')}`, ...v, sent_at: new Date(E.horloge).toISOString(), _nouveau: true }))
      rows.push(...lignes)
      return { data: s.retSelect ? lignes : null, error: null }
    }
    const touchees = rows.filter((r) => s.filt.every((f) => teste(r, f)))
    if (s.op === 'update') { touchees.forEach((r) => Object.assign(r, s.values)); return { data: s.retSelect ? projeter(touchees, ['id']) : null, error: null } }
    let r = trier(touchees, s.ordre)
    if (s.limite !== null) r = r.slice(0, s.limite)
    r = projeter(r, s.cols)
    return { data: s.single ? (r[0] ?? null) : r, error: null }
  }
  const q = (table) => {
    const s = { table, op: 'select', filt: [], ordre: [], limite: null, single: false, values: null, cols: ['*'], retSelect: false }
    const b = {
      select(c) { if (s.op === 'select') s.cols = String(c ?? '*').split(',').map((x) => x.trim()); else s.retSelect = true; return b },
      insert(v) { s.op = 'insert'; s.values = v; return b }, update(v) { s.op = 'update'; s.values = v; return b },
      eq(k, v) { s.filt.push({ k, op: 'eq', v }); return b }, in(k, v) { s.filt.push({ k, op: 'in', v }); return b },
      is(k, v) { s.filt.push({ k, op: 'is', v }); return b }, lte(k, v) { s.filt.push({ k, op: 'lte', v }); return b },
      not(k, op, v) { if (op === 'is' && v === null) s.filt.push({ k, op: 'notnull' }); else throw new Error(`not.${op}`); return b },
      order(k, o) { s.ordre.push([k, !o || o.ascending !== false]); return b }, limit(n) { s.limite = n; return b },
      maybeSingle() { s.single = true; return b }, single() { s.single = true; return b },
      then(res, rej) { try { return Promise.resolve(exec(s)).then(res, rej) } catch (e) { return Promise.reject(e).then(res, rej) } },
    }
    return b
  }
  return { from: q, rpc: async () => ({ data: 0, error: null }) }
}

// ─── Les données fictives ──────────────────────────────────────────────────────────────────────────────────────────────────────
const INSTANT = Date.parse('2026-11-02T07:00:00.500Z') // lundi, 8 h à Paris : le passage du matin (le nœud tourne à la seconde pile, un peu après)
const H = 3600000, J = 86400000
const iso = (t) => new Date(t).toISOString()
const idDe = (pref, n) => `${pref}-0000-4000-8000-${String(n).padStart(12, '0')}`
const A = (n) => idDe('aaaaaaaa', n), LD = (n) => idDe('1ead0000', n), RL = (n) => idDe('2e1a0000', n), DV = (n) => idDe('de510000', n), FA = (n) => idDe('fac70000', n), CL = (n) => idDe('c11e0000', n)
const artisan = (n, extra = {}) => ({ id: A(n), nom: 'Atelier Exemple.', metier: 'plombier', ton_style: null, email: `atelier${n}@exemple.test`, is_founder: false, leads_pause: false, plan: 'signature', notifications: null, slug: `artisan-${n}`, ...extra })
const lead = (n, a, extra = {}) => ({ id: LD(n), artisan_id: A(a), nom_prospect: `Exemple ${String(n).padStart(3, '0')}.`, contact: `prospect${n}@exemple.test`, message: 'Bonjour, je voudrais un devis pour refaire ma salle de bain.', statut: 'repondu', prise_en_main: false, canal: null, ...extra })
const relance = (n, l, rang, extra = {}) => ({ id: RL(n), lead_id: LD(l), rang, planifiee_le: iso(INSTANT - H), envoyee: false, ...extra })
const SIG = (n = 1, extra = {}) => artisan(n, { plan: 'signature', ...extra })
const STU = (n = 1, extra = {}) => artisan(n, { plan: 'studio', ...extra })
const OK = (extra = {}) => ({ effet: 'prise', decision: 'part_seul', motif: 'signature', envoi: 'a_envoyer', ...extra })
const FIN = (motif, extra = {}) => ({ effet: 'annulee', decision: 'annulee', motif, ...extra })
const DUE = (motif, extra = {}) => ({ effet: 'reste_due', decision: 'reste_due', motif, ...extra })
const PREP = (avis, extra = {}) => ({ effet: 'prise', decision: 'prepare', motif: 'studio', avis, ...extra })
// Chaque cas : les tables, puis pour chaque relance ce que le workflow doit décider (`attendu`, null = ni lue ni touchée) et ce que la route
// fait, quand les deux diffèrent (`ecart` : E1 pause générale non lue, E2 adresse atypique, V1 « Ne plus relancer » lu, V2 sujet sur une ligne,
// V3 ordre des relances dues). `ancien` : les courriers que la route envoie (relance, avis), s'ils diffèrent de ceux de n8n.
const CAS = []
const cas = (c) => CAS.push({ instant: INSTANT, config: {}, messages: [], devis: [], factures: [], actions: [], rappels: [], impayes: [], suspensions: [], exclusions: [], modele: 'normal', permise: true, ...c })
cas({ nom: 'J+2, J+5, J+10 : trois conversations Signature, trois relances parties',
  artisans: [SIG()], leads: [lead(1, 1), lead(2, 1), lead(3, 1)], relances: [relance(1, 1, 1), relance(2, 2, 2), relance(3, 3, 3)],
  attendu: { 1: OK(), 2: OK(), 3: OK() } })
cas({ nom: 'une relance pas encore due, une déjà partie : ni lues ni touchées',
  artisans: [SIG()], leads: [lead(1, 1), lead(2, 1), lead(3, 1)],
  relances: [relance(1, 1, 1), relance(2, 2, 1, { planifiee_le: iso(INSTANT + H) }), relance(3, 3, 1, { envoyee: true })],
  attendu: { 1: OK(), 2: null, 3: null } })
cas({ nom: 'le client a répondu (en_discussion), gagné, perdu, nouveau ; demande ou compte disparus : relance annulée',
  artisans: [SIG()], leads: [lead(1, 1, { statut: 'en_discussion' }), lead(2, 1, { statut: 'gagne' }), lead(3, 1, { statut: 'perdu' }), lead(4, 1, { statut: 'nouveau' }), lead(5, 9)],
  relances: [relance(1, 1, 1), relance(2, 2, 1), relance(3, 3, 2), relance(4, 4, 3), relance(5, 99, 1), relance(6, 5, 1)],
  attendu: { 1: FIN('lead_clos'), 2: FIN('lead_clos'), 3: FIN('lead_clos'), 4: FIN('lead_clos'), 5: FIN('lead_absent'), 6: FIN('compte_absent') } })
cas({ nom: 'STOP et sujets d’escalade : un mot de l’artisan, un message du client, la demande d’origine ; le onzième message n’est pas relu',
  artisans: [SIG(1), SIG(2)], config: { 1: { escalade_mots: ['stop'] }, 2: { escalade_mots: null } },
  leads: [lead(1, 1), lead(2, 1, { message: 'Une fuite sous mon évier' }), lead(3, 1), lead(4, 1), lead(5, 1), lead(6, 1), lead(7, 2, { message: 'stop' })],
  relances: [1, 2, 3, 4, 5, 6, 7].map((n) => relance(n, n, 1)),
  messages: [
    { id: idDe('0e550000', 1), lead_id: LD(1), sens: 'in', contenu: 'Merci pour votre réponse', sent_at: iso(INSTANT - 3 * H) }, { id: idDe('0e550000', 2), lead_id: LD(1), sens: 'in', contenu: 'STOP', sent_at: iso(INSTANT - 2 * H) },
    { id: idDe('0e550000', 3), lead_id: LD(3), sens: 'in', contenu: 'Mon avocat va vous écrire', sent_at: iso(INSTANT - 2 * H) },
    { id: idDe('0e550000', 4), lead_id: LD(4), sens: 'in', contenu: 'D’accord, je réfléchis', sent_at: iso(INSTANT - 2 * H) }, { id: idDe('0e550000', 5), lead_id: LD(4), sens: 'out', contenu: 'Il y a une urgence ?', sent_at: iso(INSTANT - H) },
    ...Array.from({ length: 12 }, (_, i) => ({ id: idDe('0e550000', 100 + i), lead_id: LD(5), sens: 'in', contenu: i === 6 ? 'C’est une urgence' : `Message ${i}`, sent_at: iso(INSTANT - (20 - i) * H) })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: idDe('0e550000', 200 + i), lead_id: LD(6), sens: 'in', contenu: i === 0 ? 'Il y a une fuite' : `Message ${i}`, sent_at: iso(INSTANT - (20 - i) * H) })),
  ],
  attendu: { 1: FIN('escalade', { mot: 'stop' }), 2: FIN('escalade', { mot: 'fuite' }), 3: FIN('escalade', { mot: 'avocat' }), 4: OK(), 5: FIN('escalade', { mot: 'urgence' }), 6: OK(), 7: OK() } })
cas({ nom: '« Ne plus relancer » : une exclusion en cours sur la conversation ou sur un client de ses devis, une exclusion levée',
  artisans: [SIG()], leads: [lead(1, 1), lead(2, 1), lead(3, 1)], relances: [relance(1, 1, 1), relance(2, 2, 1), relance(3, 3, 1)],
  devis: [{ id: DV(3), lead_id: LD(3), client_id: CL(1), artisan_id: A(1) }],
  exclusions: [{ id: idDe('e0c10000', 1), artisan_id: A(1), lead_id: LD(1), client_id: null, levee_le: null }, { id: idDe('e0c10000', 2), artisan_id: A(1), lead_id: LD(2), client_id: null, levee_le: iso(INSTANT - J) },
    { id: idDe('e0c10000', 3), artisan_id: A(1), lead_id: null, client_id: CL(1), levee_le: null }],
  attendu: { 1: FIN('exclu', { ecart: 'V1', route: OK() }), 2: OK(), 3: FIN('exclu', { ecart: 'V1', route: OK() }) } })
const RECENT = (h) => iso(INSTANT - h * H)
cas({ nom: 'registre commun de 3 jours : l’assistant, le CRM, les impayés (seuls ou avec l’assistant), la conversation, une date illisible, à la minute près',
  artisans: [SIG()], leads: Array.from({ length: 12 }, (_, i) => lead(i + 1, 1)), relances: Array.from({ length: 12 }, (_, i) => relance(i + 1, i + 1, 1)),
  devis: Array.from({ length: 12 }, (_, i) => ({ id: DV(i + 1), lead_id: LD(i + 1), client_id: null, artisan_id: A(1) })),
  factures: [{ id: FA(4), devis_id: DV(4), artisan_id: A(1) }, { id: FA(12), devis_id: DV(12), artisan_id: A(1) }],
  actions: [
    { id: idDe('a0000000', 1), artisan_id: A(1), outil: 'relancer_devis', statut: 'executee', objet_id: DV(1), maj_le: RECENT(24) },
    { id: idDe('a0000000', 2), artisan_id: A(1), outil: 'relancer_devis', statut: 'executee', objet_id: DV(2), maj_le: RECENT(96) },
    { id: idDe('a0000000', 3), artisan_id: A(1), outil: 'relancer_facture', statut: 'executee', objet_id: FA(4), maj_le: RECENT(10) },
    { id: idDe('a0000000', 4), artisan_id: A(1), outil: 'creer_devis', statut: 'executee', objet_id: DV(7), maj_le: RECENT(1) },
    { id: idDe('a0000000', 5), artisan_id: A(1), outil: 'relancer_devis', statut: 'en_attente', objet_id: DV(7), maj_le: RECENT(1) },
    { id: idDe('a0000000', 6), artisan_id: A(1), outil: 'relancer_devis', statut: 'executee', objet_id: DV(8), maj_le: 'pas une date' },
    { id: idDe('a0000000', 7), artisan_id: A(1), outil: 'relancer_devis', statut: 'executee', objet_id: DV(9), maj_le: RECENT(72 - 1 / 60) },
    { id: idDe('a0000000', 8), artisan_id: A(1), outil: 'relancer_devis', statut: 'executee', objet_id: DV(10), maj_le: RECENT(72 + 1 / 60) },
  ],
  rappels: [{ id: idDe('c0000000', 1), artisan_id: A(1), devis_id: DV(3), envoye_le: RECENT(48) }, { id: idDe('c0000000', 2), artisan_id: A(1), devis_id: DV(11), envoye_le: null }],
  impayes: [{ id: idDe('b0000000', 1), artisan_id: A(1), facture_id: FA(4), envoyee_le: RECENT(24) }, { id: idDe('b0000000', 2), artisan_id: A(1), facture_id: FA(12), envoyee_le: RECENT(30) }, { id: idDe('b0000000', 3), artisan_id: A(1), facture_id: FA(4), envoyee_le: null }],
  messages: [{ id: idDe('0e550000', 1), lead_id: LD(5), sens: 'out', type: 'relance', etat: null, contenu: 'Relance J+2', sent_at: RECENT(24) }],
  attendu: { 1: DUE('registre_recent'), 2: OK(), 3: DUE('registre_recent'), 4: DUE('registre_recent'), 5: OK(), 6: OK(), 7: OK(), 8: DUE('registre_recent'), 9: DUE('registre_recent'), 10: OK(), 11: OK(), 12: DUE('registre_recent') } })
cas({ nom: 'Studio prépare, l’artisan valide : la relance est « à valider », l’artisan est prévenu ; une seule par conversation et par passage',
  artisans: [STU(1), STU(2, { notifications: { proposition: false } }), STU(3, { email: null }), STU(4, { email: 'atelier4@exemple.invalid' })],
  leads: [lead(1, 1), lead(2, 2), lead(3, 3), lead(4, 1, { contact: '0612345678' }), lead(5, 4)],
  relances: [relance(1, 1, 1), relance(2, 1, 2), relance(3, 2, 1), relance(4, 3, 1), relance(5, 4, 1), relance(6, 5, 1)],
  attendu: { 1: PREP('proposition'), 2: DUE('un_seul_par_passage'), 3: PREP('desactive'), 4: PREP('sans_email'), 5: PREP('proposition'), 6: PREP('adresse_de_test') } })
cas({ nom: 'Signature sans adresse e-mail : un téléphone (deux relances), rien du tout — la relance est tracée sans courrier, comme l’ancien code',
  artisans: [SIG()], leads: [lead(1, 1, { contact: '0612345678' }), lead(2, 1, { contact: '' }), lead(3, 1, { contact: null })],
  relances: [relance(1, 1, 1), relance(2, 1, 2), relance(3, 2, 1), relance(4, 3, 1)],
  attendu: { 1: OK({ envoi: 'pas_un_courriel' }), 2: OK({ envoi: 'pas_un_courriel' }), 3: OK({ envoi: 'sans_coordonnees' }), 4: OK({ envoi: 'sans_coordonnees' }) } })
cas({ nom: 'offres sans plateforme (Essai, Essentiel, inconnue) : annulée ; compte de démonstration : annulée ; Business et Entreprise : partent',
  artisans: [artisan(1, { plan: 'gratuit' }), artisan(2, { plan: 'essentiel' }), artisan(3, { plan: 'offre_inconnue' }), artisan(4, { plan: 'signature', is_founder: true }), artisan(5, { plan: 'gratuit', is_founder: true }), artisan(6, { plan: 'business' }), artisan(7, { plan: 'entreprise' })],
  leads: [1, 2, 3, 4, 5, 6, 7].map((n) => lead(n, n)), relances: [1, 2, 3, 4, 5, 6, 7].map((n) => relance(n, n, 1)),
  attendu: { 1: FIN('sans_plateforme'), 2: FIN('sans_plateforme'), 3: FIN('sans_plateforme'), 4: FIN('fondateur'), 5: FIN('fondateur'), 6: OK(), 7: OK() } })
cas({ nom: 'compte suspendu (laissée due), suspension levée, artisan en pause (laissée due), main prise (annulée)',
  artisans: [SIG(1), SIG(2), SIG(3, { leads_pause: true }), SIG(4)], leads: [lead(1, 1), lead(2, 2), lead(3, 3), lead(4, 4, { prise_en_main: true }), lead(5, 4, { prise_en_main: false })],
  suspensions: [{ id: idDe('5e500000', 1), artisan_id: A(1), levee_le: null }, { id: idDe('5e500000', 2), artisan_id: A(2), levee_le: iso(INSTANT - J) }],
  relances: [1, 2, 3, 4, 5].map((n) => relance(n, n, 1)),
  attendu: { 1: DUE('suspendu'), 2: OK(), 3: DUE('pause_artisan'), 4: FIN('prise_en_main'), 5: OK() } })
cas({ nom: 'adresses : .invalid (considérée partie, sans courrier), atypique (la route l’envoie, n8n la laisse due), casse mélangée',
  artisans: [SIG()], leads: [lead(1, 1, { contact: 'essai@exemple.invalid' }), lead(2, 1, { contact: 'a"b@exemple.test' }), lead(3, 1, { contact: 'CAMILLE@Exemple.TEST' })],
  relances: [relance(1, 1, 1), relance(2, 2, 1), relance(3, 3, 1)],
  attendu: { 1: OK({ envoi: 'adresse_de_test' }), 2: DUE('adresse_atypique', { ecart: 'E2', route: OK() }), 3: OK() } })
cas({ nom: 'pause générale posée : la route ne lit rien et rien ne part ; n8n ne sait pas la lire (écart E1)',
  artisans: [SIG()], leads: [lead(1, 1), lead(2, 1)], relances: [relance(1, 1, 1), relance(2, 2, 2)], permise: false,
  attendu: { 1: OK({ ecart: 'E1', route: DUE('pause') }), 2: OK({ ecart: 'E1', route: DUE('pause') }) } })
cas({ nom: 'plafond de 80 envois du produit : à la quatre-vingt-unième la route s’arrête, le reste reste dû (même une conversation close, qu’elle ne regarde plus)',
  artisans: [SIG()], leads: [...Array.from({ length: 85 }, (_, i) => lead(i + 1, 1)), lead(86, 1, { statut: 'en_discussion' })], relances: Array.from({ length: 86 }, (_, i) => relance(i + 1, i + 1, 1, { planifiee_le: iso(INSTANT - 2 * H + i * 1000) })),
  attendu: Object.fromEntries(Array.from({ length: 86 }, (_, i) => [i + 1, i < 80 ? OK() : DUE('plafond')])) })
cas({ nom: 'cent relances par passage : 105 Studio dues, les 100 premières lues, 80 avis puis plus d’avis (la proposition reste préparée)',
  artisans: [STU()], leads: Array.from({ length: 105 }, (_, i) => lead(i + 1, 1)), relances: Array.from({ length: 105 }, (_, i) => relance(i + 1, i + 1, 1, { planifiee_le: iso(INSTANT - 3 * H + i * 1000) })),
  attendu: Object.fromEntries(Array.from({ length: 105 }, (_, i) => [i + 1, i < 80 ? PREP('proposition') : i < 100 ? PREP('plafond') : null])) })
cas({ nom: 'samedi, 8 h : une relance due la nuit part, une due à 8 h 00 min 30 attend lundi',
  instant: Date.parse('2026-10-31T07:00:00.500Z'), artisans: [SIG()], leads: [lead(1, 1), lead(2, 1)],
  relances: [relance(1, 1, 1, { planifiee_le: '2026-10-31T01:00:00.000Z' }), relance(2, 2, 1, { planifiee_le: '2026-10-31T07:00:30.000Z' })],
  attendu: { 1: OK(), 2: null } })
cas({ nom: 'dimanche, 3 h 30 (nuit) : mêmes décisions, aucune plage horaire',
  instant: Date.parse('2026-11-01T02:30:00.500Z'), artisans: [SIG(1), STU(2)], leads: [lead(1, 1), lead(2, 2)],
  relances: [relance(1, 1, 2, { planifiee_le: '2026-11-01T00:30:00.000Z' }), relance(2, 2, 1, { planifiee_le: '2026-11-01T00:30:00.000Z' })],
  attendu: { 1: OK(), 2: PREP('proposition') } })
cas({ nom: 'le modèle est en panne : repli sur le texte de secours (J+2, J+5, J+10, rang absent)',
  modele: 'panne', artisans: [SIG(1), SIG(2, { nom: null }), SIG(3, { nom: '  ' })], leads: [lead(1, 1), lead(2, 1), lead(3, 1, { nom_prospect: null }), lead(4, 1, { nom_prospect: '  Camille ' }), lead(5, 2), lead(6, 3)],
  relances: [relance(1, 1, 1), relance(2, 2, 2), relance(3, 3, 3), relance(4, 4, null), relance(5, 5, 2), relance(6, 6, 1)],
  attendu: { 1: OK(), 2: OK(), 3: OK(), 4: OK(), 5: OK(), 6: OK() } })
cas({ nom: 'le modèle répond vide : même repli, en Studio comme en Signature',
  modele: 'vide', artisans: [SIG(1), STU(2)], leads: [lead(1, 1), lead(2, 2)], relances: [relance(1, 1, 2), relance(2, 2, 3)], attendu: { 1: OK(), 2: PREP('proposition') } })
cas({ nom: 'le texte du modèle finit déjà par la mention d’IA : elle n’est pas ajoutée deux fois',
  modele: 'mention', artisans: [SIG(1)], leads: [lead(1, 1)], relances: [relance(1, 1, 1)], attendu: { 1: OK() } })
cas({ nom: 'noms chargés (&, guillemets, chevrons), nom d’artisan absent, adresse d’artisan absente, nom sur deux lignes',
  artisans: [SIG(1, { nom: 'Dupont & Fils "Plomberie" <SARL>' }), SIG(2, { nom: null, email: '' }), SIG(3, { nom: 'Atelier\nExemple.' })],
  leads: [lead(1, 1, { nom_prospect: 'Zoé & "Co" <x>' }), lead(2, 2), lead(3, 3)], relances: [relance(1, 1, 1), relance(2, 2, 1), relance(3, 3, 2)],
  attendu: { 1: OK(), 2: OK(), 3: OK({ ecart: 'V2', route: OK() }) } })
cas({ nom: 'deux relances dues d’une même conversation, rangées à l’envers : n8n envoie la plus ancienne d’abord',
  artisans: [SIG()], leads: [lead(1, 1)], relances: [relance(1, 1, 2, { planifiee_le: iso(INSTANT - H) }), relance(2, 1, 1, { planifiee_le: iso(INSTANT - 2 * J) })],
  attendu: { 1: DUE('un_seul_par_passage', { ecart: 'V3', route: OK() }), 2: OK({ ecart: 'V3', route: DUE('un_seul_par_passage') }) } })
const ECARTS = ['E1', 'E2', 'V1', 'V2', 'V3']

// ─── Jouer la VRAIE route sur ces cas ───────────────────────────────────────────────────────────────────────────────────────────
const Q = 'globalThis.__QA'
const sourceTemplate = () => {
  const m = /export function relanceTemplate\(([^)]*)\): string \{([\s\S]*?)\n\}\n/.exec(lireTexte(CHEMINS.ai).replace(/\r\n/g, '\n'))
  if (!m) throw new Error('relanceTemplate absente de lib/ai.ts')
  return `export function relanceTemplate(${m[1].replace(/: [^,)]+/g, '')}) {${m[2]}\n}`
}
const MOCKS = {
  '@/lib/supabaseAdmin': `export const supabaseAdmin = ${Q}.db`,
  '@/lib/suspension': `export const suspensionEnCours = async (id) => ((${Q}.etat.tables.suspensions || []).some((s) => s.artisan_id === id && s.levee_le == null) ? { id: 's', message: null, depuis: 'x' } : null)`,
  '@/lib/alerteService': `export const signalerPanneIA = async () => { ${Q}.etat.pannes++ }`,
  '@/lib/alertes': `export const enregistrerPassage = async () => {}; export const ronde = async () => ({ envoyees: [], ignorees: [] })`,
  '@/lib/purgeComptes': `export const purgerComptes = async () => ({ purges: 0, en_attente: 0 })`,
  '@/lib/purgesRgpd': `export const purgerRgpd = async () => ({ erreurs: [] })`,
  '@/lib/packPubPurge': `export const purgerPacksExpires = async () => ({ erreurs: [] })`,
  '@/lib/devisExpiration': `export const expirerDevisDepasses = async () => ({ erreurs: [] })`,
  '@/lib/agents/sortie': `export const sortiePermise = async () => ({ permise: ${Q}.etat.permise })`,
  '@/lib/direction/courriers': `export const relever = async () => ({ ok: true, nouveaux: 0, lus: 0 })`,
  '@/lib/flags': `export const actif = () => false`,
  '@/lib/siteLivraison': `export const tourLivraison = async () => {}`,
  '@/lib/comptaAutomatisationsTour': `export const tourCompta = async () => ({ erreurs: [] })`,
  '@/lib/relancesImpayesTour': `export const tourRelancesImpayes = async () => ({ erreurs: [] })`,
  '@/lib/relancesImpayesMagasin': `export const magasinSupabase = {}`,
  '@/lib/crm/rappelsTour': `export const tourRappels = async () => ({ installe: false, erreurs: [] })`,
  '@/lib/apresChantierTour': `export const tourApresChantier = async () => ({ installe: false, erreurs: [] })`,
  '@/lib/push': `export const envoyerPushArtisan = async () => {}`,
  '@/lib/limites': `export const cleEmail = (p, e) => p + ':' + String(e).trim().toLowerCase()
    export const consommerLimite = async (cle, max) => { const c = ${Q}.etat.compteurs; c[cle] = (c[cle] || 0) + 1; return c[cle] <= max }`,
}
function figerHorloge() {
  const R = VRAIE_DATE
  globalThis.Date = class extends R {
    constructor(...a) { if (a.length === 0) super(globalThis.__QA?.etat?.horloge ?? R.now()); else super(...a) }
    static now() { return globalThis.__QA?.etat?.horloge ?? R.now() }
  }
}
let VRAIE_DATE = Date
const TEXTE_MENTION_MODELE = (nom) => `Texte du modèle.\n\n—\n${MENTION} de ${nom}.`
async function jouerLaRoute() {
  globalThis.__QA = { db: null, etat: null }
  globalThis.__QA.db = fabriquerBase(Q)
  process.env.RESEND_API_KEY = 'cle-fictive-du-juge'
  process.env.CRON_SECRET = 'secret-fictif-du-juge'
  delete process.env.EMAIL_EXPEDITEUR_ARTISAN; delete process.env.EMAILS_PRODUIT_PAR_JOUR; delete process.env.PAUSE_GENERALE
  const ai = `export const generateRelanceReply = async (a, l, rang) => { const E = ${Q}.etat; E.dernier = { nom: l.nom_prospect, rang }; E.appels.push(E.dernier)
      if (E.modele === 'panne') throw new Error('panne simulée'); if (E.modele === 'vide') return ''; if (E.modele === 'mention') return 'Texte du modèle.\\n\\n—\\n${MENTION} de ' + a.nom + '.'; return 'Relance exemple.' }
    ${sourceTemplate()}`
  const mocks = { ...MOCKS, '@/lib/ai': ai }
  register('data:text/javascript,' + encodeURIComponent(`
    const mocks = ${JSON.stringify(mocks)};
    export async function resolve(s, c, next) { if (s === 'next/server') return next('next/server.js', c); if (mocks[s]) return { url: 'data:text/javascript,' + encodeURIComponent(mocks[s]), shortCircuit: true }; return next(s, c) }`))
  const vraiFetch = globalThis.fetch
  const vraisJournaux = [console.error, console.warn, console.log]
  console.error = console.warn = console.log = () => {} // la route journalise ses refus : le juge les lit dans ses résultats
  globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api.resend.com/emails') throw new Error(`appel réseau inattendu : ${url}`)
    const b = JSON.parse(init.body)
    globalThis.__QA.etat.resend.push({ from: b.from, to: b.to[0], subject: b.subject, text: b.text, reply_to: b.reply_to ?? '', appel: globalThis.__QA.etat.dernier })
    return { ok: true, json: async () => ({ id: 'resend-fictif' }) }
  }
  const { GET } = await import('../app/api/cron/relances/route.ts')
  const sorties = []
  figerHorloge()
  try {
    for (const c of CAS) {
      const tables = { relances: copie(c.relances), leads: copie(c.leads), artisans: copie(c.artisans), plateforme_config: Object.entries(c.config).map(([n, v]) => ({ artisan_id: A(Number(n)), ...v })),
        messages: copie(c.messages), devis: copie(c.devis), factures: copie(c.factures), assistant_actions: copie(c.actions), crm_rappels: copie(c.rappels), relances_impayes: copie(c.impayes),
        suspensions: copie(c.suspensions), relances_exclusions: copie(c.exclusions) }
      globalThis.__QA.etat = { tables, resend: [], appels: [], dernier: null, pannes: 0, compteurs: {}, horloge: c.instant, permise: c.permise, modele: c.modele }
      const E = globalThis.__QA.etat
      const rep = await GET(new Request('http://localhost/api/cron/relances', { headers: { authorization: 'Bearer secret-fictif-du-juge' } }))
      const json = await rep.json()
      if (rep.status !== 200) throw new Error(`la route répond ${rep.status} sur « ${c.nom} »`)
      const obs = {}
      for (const r of c.relances) {
        const apres = tables.relances.find((x) => x.id === r.id)
        const due = !r.envoyee && Date.parse(r.planifiee_le) <= c.instant
        if (!due) { obs[r.id] = { ignoree: true, intacte: apres.envoyee === r.envoyee }; continue }
        if (apres.envoyee === false) { obs[r.id] = { effet: 'reste_due', decision: 'reste_due' }; continue }
        const nouveaux = tables.messages.filter((m) => m._nouveau && m.lead_id === r.lead_id && m.type === 'relance')
        obs[r.id] = !nouveaux.length ? { effet: 'annulee', decision: 'annulee' } : { effet: 'prise', decision: nouveaux.some((m) => m.etat === 'proposition') ? 'prepare' : 'part_seul' }
      }
      sorties.push({ cas: c, tables, obs, resend: E.resend, route: json, pannes: E.pannes })
    }
  } finally { globalThis.Date = VRAIE_DATE; globalThis.fetch = vraiFetch; [console.error, console.warn, console.log] = vraisJournaux }
  return sorties
}

// ─── Rejouer le workflow : les nœuds HTTP lisent les mêmes tables, selon LEURS paramètres ───────────────────────────────────────
function chaineDe(wf) {
  const ordre = []
  let nom = wf.nodes.find((n) => n.type === 'n8n-nodes-base.scheduleTrigger')?.name
  while (nom && !ordre.includes(nom)) {
    ordre.push(nom)
    const suivants = (wf.connections?.[nom]?.main?.[0] ?? []).map((l) => l.node)
    nom = suivants.length === 1 ? suivants[0] : null
  }
  return ordre
}
function jouerN8n(wf, tables, instant, { modele = 'normal' } = {}) {
  const sorties = {}
  for (const nom of chaineDe(wf)) {
    const n = noeud(wf, nom)
    let lignes
    if (n.type === 'n8n-nodes-base.scheduleTrigger') lignes = [{}]
    else if (n.type === 'n8n-nodes-base.code') {
      const entree = nom === 'Modele epingle' ? sorties.Decider : [{}]
      lignes = executer(n.parameters.jsCode, { instant, sorties, entree })
      if (nom === 'Modele epingle' && modele !== 'normal') {
        lignes = lignes.map((x) => (x.texte_modele === null ? x : { ...x, texte_modele: modele === 'mention' ? TEXTE_MENTION_MODELE('Atelier Exemple.') : null }))
      }
    } else if (n.type === 'n8n-nodes-base.httpRequest') {
      const table = n.parameters.url.slice(HOTE.length)
      const params = (n.parameters.queryParameters?.parameters ?? []).map((q) => [q.name, typeof q.value === 'string' && q.value.startsWith('=') ? evaluer(/^=\{\{([\s\S]*)\}\}$/.exec(q.value)[1], instant, sorties) : q.value])
      const pagine = !!n.parameters.options?.pagination
      lignes = []
      for (let page = 0; page < (pagine ? 50 : 1); page++) {
        const lot = lireRest(tables, table, pagine && page ? [...params, ['offset', page * 1000]] : params)
        lignes.push(...lot)
        if (!pagine || lot.length < 1000) break
      }
    } else continue
    if (!lignes.length) { if (n.alwaysOutputData) lignes = [{}]; else return { sorties, arrete: nom } }
    sorties[nom] = lignes
  }
  return { sorties, arrete: null }
}
const sortieFinale = (r) => r.sorties['Courriers a envoyer'] ?? []

// ─── La comparaison ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const genreRoute = (r) => (r.from.startsWith('Presti <') ? 'avis' : 'relance')
function comparerRoute(wf, mondes) {
  const erreurs = []
  const ko = (m) => erreurs.push(`COMPARE ${m}`)
  const vus = new Set()
  let nDecisions = 0, nRelances = 0, nAvis = 0
  for (const monde of mondes) {
    const { cas: c, tables, obs, resend } = monde
    let jeu
    try { jeu = jouerN8n(wf, tables0(c), c.instant, { modele: c.modele === 'normal' ? 'normal' : c.modele === 'mention' ? 'mention' : 'vide' }) } catch (e) { ko(`${c.nom} : le code du workflow plante (${e.message})`); continue }
    const sortie = sortieFinale(jeu)
    if (jeu.arrete && Object.keys(c.attendu).some((k) => c.attendu[k])) { ko(`${c.nom} : la chaîne s’arrête à « ${jeu.arrete} » (lecture vide sans alwaysOutputData) : aucune décision`); continue }
    const decisions = Object.fromEntries(sortie.filter((x) => x.courrier === 'decision').map((x) => [x.relance_id, x]))
    // Les courriers de la route, rangés par relance (par le modèle appelé juste avant l'envoi : nom du prospect et rang).
    const parRelance = {}
    for (const e of resend) {
      const rl = c.relances.find((r) => { const l = c.leads.find((x) => x.id === r.lead_id); return l && e.appel && (l.nom_prospect ?? undefined) === (e.appel.nom ?? undefined) && (r.rang ?? 1) === (e.appel.rang ?? 1) })
      if (!rl) { ko(`${c.nom} : un courrier de la route ne se rattache à aucune relance (${e.subject.slice(0, 40)})`); continue }
      ;(parRelance[rl.id] = parRelance[rl.id] || []).push(e)
    }
    for (const r of c.relances) {
      const quoi = `${c.nom} [relance ${Number(r.id.slice(-12))}]`
      const att = c.attendu[Number(r.id.slice(-12))]
      const o = obs[r.id]
      const d = decisions[r.id]
      if (att === null || att === undefined) {
        if (d) ko(`${quoi} : n8n décide d’une relance qui n’est pas due (${d.decision})`)
        if (o.ignoree ? !o.intacte : o.effet !== 'reste_due') ko(`${quoi} : la route touche une relance que n8n ne lit pas (hors échéance ou au-delà des 100 du passage)`)
        continue
      }
      nDecisions++
      if (!d) { ko(`${quoi} : aucune décision de n8n`); continue }
      for (const k of ['effet', 'decision', 'motif']) if (d[k] !== att[k]) ko(`${quoi} : ${k} « ${d[k]} », attendu « ${att[k]} »`)
      for (const k of ['mot', 'envoi', 'avis']) if ((d[k] ?? null) !== (att[k] ?? null)) ko(`${quoi} : ${k} « ${d[k] ?? null} », attendu « ${att[k] ?? null} »`)
      const routeAtt = att.ecart ? att.route : att
      if (att.ecart) vus.add(att.ecart)
      if (o.effet !== routeAtt.effet || o.decision !== routeAtt.decision) ko(`${quoi} : la route fait « ${o.effet}/${o.decision} », attendu « ${routeAtt.effet}/${routeAtt.decision} »`)
      if (att.ecart) continue // l'écart écrit : la route et n8n diffèrent exprès (brief, « Comparaison »)
      if (o.effet !== d.effet || o.decision !== d.decision) ko(`${quoi} : la route fait « ${o.effet}/${o.decision} », n8n « ${d.effet}/${d.decision} »`)
      // Les courriers : ceux de la route, au caractère près.
      const duRoute = parRelance[r.id] ?? []
      const deN8n = sortie.filter((x) => (x.courrier === 'relance' || x.courrier === 'avis') && x.relance_id === r.id)
      if (duRoute.length !== deN8n.length) { ko(`${quoi} : ${duRoute.length} courrier(s) pour la route, ${deN8n.length} pour n8n`); continue }
      for (const x of deN8n) {
        const vrai = duRoute.find((e) => genreRoute(e) === x.courrier)
        if (!vrai) { ko(`${quoi} : n8n prépare un courrier « ${x.courrier} » que la route n’envoie pas`); continue }
        const envoye = courrierEnvoye(wf, x.courrier === 'relance' ? 'Envoyer la relance' : 'Envoyer l avis', x)
        const { appel, ...payload } = vrai
        for (const k of ['from', 'to', 'subject', 'text', 'reply_to']) if (envoye[k] !== payload[k]) ko(`${quoi} (${x.courrier}) : ${k} « ${String(envoye[k]).slice(0, 90)} », la route envoie « ${String(payload[k]).slice(0, 90)} »`)
        if (x.courrier === 'relance') nRelances++; else nAvis++
      }
    }
    // Les décisions que la route ne connaît pas : aucune relance en trop.
    for (const id of Object.keys(decisions)) if (!c.relances.some((r) => r.id === id)) ko(`${c.nom} : décision pour une relance inconnue`)
  }
  for (const e of ECARTS) if (!vus.has(e)) ko(`l’écart écrit ${e} n’est observé par aucun cas : retirez-le du brief ou ajoutez le cas`)
  return { erreurs, nDecisions, nRelances, nAvis }
}
// Les tables, telles que la route les voit AU DÉPART (la route modifie les siennes).
const tables0 = (c) => ({ relances: copie(c.relances), leads: copie(c.leads), artisans: copie(c.artisans), plateforme_config: Object.entries(c.config).map(([n, v]) => ({ artisan_id: A(Number(n)), ...v })),
  messages: copie(c.messages), devis: copie(c.devis), factures: copie(c.factures), assistant_actions: copie(c.actions), crm_rappels: copie(c.rappels), relances_impayes: copie(c.impayes),
  suspensions: copie(c.suspensions), relances_exclusions: copie(c.exclusions) })

// ─── La structure ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function structure(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`STRUCT ${m}`)
  if (wf.name !== 'presti-relances') ko(`nom « ${wf.name} », attendu « presti-relances »`)
  if (wf.active !== false) ko('le workflow doit être inactif (active: false)')
  if (wf.activeVersionId) ko('le workflow ne doit avoir aucune version publiée')
  if (!egal(wf.settings, REGLAGES)) ko(`réglages ${JSON.stringify(wf.settings)} ≠ ${JSON.stringify(REGLAGES)} (fuseau Europe/Paris, exécutions réussies non gardées, branche d'erreur, délai maximal)`)
  if (wf.settings?.saveDataSuccessExecution !== 'none') ko('exécutions réussies gardées : saveDataSuccessExecution doit valoir none (adresses et messages de prospects)')
  const noms = wf.nodes.map((n) => n.name).sort()
  const attendus = Object.keys(TYPES).sort()
  if (!egal(noms, attendus)) ko(`nœuds ${JSON.stringify(noms)} ≠ ${JSON.stringify(attendus)}`)
  for (const [nom, type] of Object.entries(TYPES)) if (noeud(wf, nom) && noeud(wf, nom).type !== type) ko(`${nom} : type ${noeud(wf, nom).type}, attendu ${type}`)
  const declencheur = noeud(wf, 'Chaque matin')
  if (declencheur && declencheur.parameters?.rule?.interval?.[0]?.expression !== CRON) ko(`déclencheur « ${declencheur.parameters?.rule?.interval?.[0]?.expression} » ≠ ${CRON} (une fois par jour à 8 h, fuseau Europe/Paris : le cron de l'ancien passage)`)
  const lien = new Set([...CHAINE.slice(0, -1).map((n, i) => `${n}>${CHAINE[i + 1]}`), ...BRANCHES.flatMap(([f, e]) => [`Courriers a envoyer>${f}`, `${f}>${e}`])])
  const reel = new Set()
  for (const [de, sorties] of Object.entries(wf.connections ?? {})) for (const liste of sorties.main ?? []) for (const l of liste ?? []) reel.add(`${de}>${l.node}`)
  for (const l of lien) if (!reel.has(l)) ko(`connexion manquante : ${l.replace('>', ' → ')}`)
  for (const l of reel) if (!lien.has(l)) ko(`connexion inattendue : ${l.replace('>', ' → ')}`)
  for (const l of LECTURES) {
    const n = noeud(wf, l.nom)
    if (!n) continue
    const p = n.parameters ?? {}
    if (p.method !== 'GET') ko(`${l.nom} : méthode ${p.method} (GET seulement)`)
    if (p.sendBody) ko(`${l.nom} : corps de requête interdit`)
    if (p.url !== HOTE + l.table) ko(`${l.nom} : adresse ${p.url}, attendue ${HOTE + l.table}`)
    if (!egal(n.credentials, { supabaseApi: CRED })) ko(`${l.nom} : identifiant attendu « Supabase account » (${CRED.id}), exactement { id, name }`)
    if (n.executeOnce !== true) ko(`${l.nom} : executeOnce attendu`)
    if (l.vide && n.alwaysOutputData !== true) ko(`${l.nom} : alwaysOutputData attendu (une lecture vide, la suspension par exemple, arrêterait toute la chaîne : plus aucune décision)`)
    if (!l.vide && n.alwaysOutputData) ko(`${l.nom} : pas de alwaysOutputData (sans relance due, il n'y a rien à décider)`)
    if (p.options?.timeout !== 30000) ko(`${l.nom} : délai de la requête 30 s attendu`)
    if (l.pagine && !egal(p.options?.pagination, PAGINATION.pagination)) ko(`${l.nom} : pagination par 1 000 attendue (sans elle, une lecture longue est tronquée sans le dire)`)
    if (!l.pagine && p.options?.pagination) ko(`${l.nom} : pas de pagination (au plus 100 relances par passage, comme la route)`)
    const reelP = (p.queryParameters?.parameters ?? []).map((q) => [q.name, q.value])
    if (reelP.length !== l.params.length) ko(`${l.nom} : ${reelP.length} paramètres, attendu ${l.params.length}`)
    l.params.forEach(([k, v], i) => {
      if (reelP[i]?.[0] !== k) ko(`${l.nom} : paramètre ${i + 1} « ${reelP[i]?.[0]} », attendu « ${k} »`)
      else if (reelP[i][1] !== v) ko(`${l.nom} : paramètre « ${k} » = ${String(reelP[i][1]).slice(0, 120)}, attendu ${String(v).slice(0, 120)}`)
    })
    const decl = /^\s*lecture-pour-envoi\s*:\s*(.+?)\s*$/m.exec(String(n.notes ?? ''))
    if ((decl ? decl[1] : null) !== l.envoi) ko(`${l.nom} : « lecture-pour-envoi » ${decl ? decl[1] : 'absent'}, attendu ${l.envoi ?? 'rien (lecture sans donnée personnelle)'}`)
    const select = reelP.find(([k]) => k === 'select')?.[1] ?? ''
    if (l.envoi === null && /nom|e-?mail|contact|adresse|message|contenu|texte/i.test(select)) ko(`${l.nom} : une lecture qui n'est pas « pour envoi » ne lit ni nom, ni adresse, ni message (${select})`)
    if (/\*|photos|\bip\b|apparence|persona|formule|solde|montant|total|siret/i.test(select)) ko(`${l.nom} : colonne que n8n ne lit pas (${select})`)
  }
  const modele = noeud(wf, 'Modele epingle')
  if (modele) {
    if (modele.type !== 'n8n-nodes-base.code') ko(`Modele epingle : un nœud Code épinglé attendu, pas ${modele.type} (aucun appel)`)
    if (MODULE_OU_RESEAU.test(String(modele.parameters?.jsCode ?? ''))) ko('Modele epingle : aucun réseau, aucun module, aucun appel de modèle')
    if (modele.credentials && Object.keys(modele.credentials).length) ko('Modele epingle : aucun identifiant')
    if (!/\bEPINGLE\b/.test(String(modele.notes ?? ''))) ko('Modele epingle : doit se déclarer « EPINGLE » dans ses notes')
  }
  for (const n of wf.nodes) if (n.type === 'n8n-nodes-base.code' && MODULE_OU_RESEAU.test(String(n.parameters?.jsCode ?? '').replace(/\/\/[^\n]*/g, ''))) ko(`${n.name} : un nœud Code n'appelle ni réseau ni module`)
  const PIEDS = { 'Envoyer la relance': 'mention', 'Envoyer l avis': 'aucun' }
  for (const nom of Object.keys(PIEDS)) {
    const n = noeud(wf, nom)
    if (!n) continue
    if (n.disabled !== true) ko(`${nom} : doit être DÉSACTIVÉ (simulation : rien ne part avant le « go » de Benj)`)
    if (n.credentials && Object.keys(n.credentials).length) ko(`${nom} : aucun identifiant ne doit être posé par cette tâche`)
    if (n.parameters?.options?.appendAttribution !== false) ko(`${nom} : la ligne « envoyé automatiquement avec n8n » doit être coupée (marque blanche)`)
    if (n.parameters?.emailFormat !== 'text') ko(`${nom} : texte brut attendu (comme la route)`)
    const pied = (/^\s*pied\s*:\s*(\S+)\s*$/m.exec(String(n.notes ?? '')) ?? [])[1]
    if (pied !== PIEDS[nom]) ko(`${nom} : pied « ${pied} » déclaré, « ${PIEDS[nom]} » attendu`)
    for (const [k, v] of Object.entries({ fromEmail: '={{ $json.de }}', toEmail: '={{ $json.a }}', subject: '={{ $json.sujet }}' })) if (n.parameters?.[k] !== v) ko(`${nom} : ${k} = ${n.parameters?.[k]}, attendu ${v}`)
    if (n.parameters?.options?.replyTo !== '={{ $json.repondre_a }}') ko(`${nom} : Reply-To attendu depuis le courrier préparé`)
    const texte = String(n.parameters?.text ?? '')
    if (nom === 'Envoyer la relance') {
      if (!texte.includes(MENTION)) ko(`${nom} : la mention d'IA « ${MENTION} » doit figurer dans le texte (la relance part sans relecture)`)
      if (!texte.startsWith('={{ $json.corps }}')) ko(`${nom} : le texte doit commencer par la relance du modèle (corps)`)
      if (/presti/i.test(JSON.stringify(n.parameters))) ko(`${nom} : « Presti » écrit dans un message au nom de l'artisan (marque blanche)`)
    } else if (texte !== '={{ $json.texte }}') ko(`${nom} : texte attendu « ={{ $json.texte }} »`)
  }
  for (const [nom, voulu] of [['Garder les relances', 'relance'], ['Garder les avis', 'avis']]) {
    const c = noeud(wf, nom)?.parameters?.conditions?.conditions?.[0]
    if (!c || c.leftValue !== '={{ $json.courrier }}' || c.rightValue !== voulu || c.operator?.operation !== 'equals') ko(`${nom} : le filtre doit garder les courriers « ${voulu} »`)
  }
  return erreurs
}

// ─── La copie figée ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function figee(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`FIGEE ${m}`)
  const decider = codeDe(wf, 'Decider'), courriers = codeDe(wf, 'Courriers a envoyer'), passage = codeDe(wf, 'Passage')
  const email = lireTexte(CHEMINS.email), config = lireTexte(CHEMINS.config), regles = lireTexte(CHEMINS.regles), route = lireTexte(CHEMINS.route)
  const nombre = (re, t) => { const m = re.exec(t); return m ? Number(m[1].replace(/_/g, '')) : null }
  const c = (nom) => nombre(new RegExp(`const ${nom} = (\\d+);`), decider)
  const R = await import(FICHIER(CHEMINS.regles))
  const REG = await import(FICHIER(CHEMINS.registre))
  const P = await import(FICHIER('lib/plans.ts'))
  const R2 = await import(FICHIER(CHEMINS.config))
  if (c('MAX_PAR_PASSAGE') === null || c('MAX_PAR_PASSAGE') !== nombre(/const MAX_PAR_PASSAGE = (\d+)/, route)) ko(`plafond par passage ${c('MAX_PAR_PASSAGE')} ≠ la route (${nombre(/const MAX_PAR_PASSAGE = (\d+)/, route)})`)
  const produit = nombre(/EMAILS_PRODUIT_PAR_JOUR\) \|\| (\d+)/, email)
  if (produit === null || c('MAX_ENVOIS') !== produit) ko(`plafond des envois du produit ${c('MAX_ENVOIS')} ≠ lib/email.ts (${produit})`)
  if (c('MESSAGES_RELUS') !== R.MESSAGES_ESCALADE_RELUS) ko(`messages relus ${c('MESSAGES_RELUS')} ≠ MESSAGES_ESCALADE_RELUS (${R.MESSAGES_ESCALADE_RELUS})`)
  if (nombre(/const DELAI_REGISTRE_MS = (\d+) \* 86400000;/, decider) !== REG.RELANCE_DELAI_JOURS) ko(`délai du registre ≠ RELANCE_DELAI_JOURS (${REG.RELANCE_DELAI_JOURS} jours)`)
  if (!/relanceRecente\(await historiqueRelances\(lead\.artisan_id, \{ type: 'lead', id: lead\.id \}\), new Date\(\), \{ sauf: 'conversation' \}\)/.test(route)) ko('la route ne demande plus le registre « sauf conversation » de la même façon : le registre de n8n est à revoir')
  const liste = (nom) => { const m = new RegExp(`const ${nom} = (\\[.*\\]);`).exec(decider); return m ? JSON.parse(m[1]) : null }
  if (!egal(liste('MOTS_TOUJOURS'), R.MOTS_ESCALADE_TOUJOURS)) ko('MOTS_TOUJOURS ≠ MOTS_ESCALADE_TOUJOURS de lib/pilote/regles.ts')
  if (!egal(liste('MOTS_ENTIERS'), R.MOTS_ESCALADE_ENTIERS)) ko('MOTS_ENTIERS ≠ MOTS_ESCALADE_ENTIERS de lib/pilote/regles.ts')
  if (!egal(liste('ESCALADE_DEFAUT'), R2.CONFIG_DEFAUT.escalade_mots)) ko('ESCALADE_DEFAUT ≠ CONFIG_DEFAUT.escalade_mots')
  for (const nom of ['FAUSSE_URGENCE', 'PERTE_D_EAU', 'APPAREIL_PERD', 'NOMS_NEUTRES']) {
    const a = new RegExp(`^const ${nom} = (/.*/[a-z]*);$`, 'm').exec(decider), b = new RegExp(`^const ${nom} = (/.*/[a-z]*)$`, 'm').exec(regles)
    if (!a || !b || a[1] !== b[1]) ko(`expression ${nom} ≠ lib/pilote/regles.ts`)
  }
  // Les offres : `peut` pour chaque offre connue et pour une offre inconnue.
  const offres = (() => { const m = /const OFFRES = (\{.*\});/.exec(decider); return m ? JSON.parse(m[1]) : null })()
  const vraies = Object.fromEntries([...Object.keys(P.PLANS), '*'].map((p) => { const id = p === '*' ? '__offre_inconnue__' : p; return [p, { plateforme: P.peut(id, 'plateforme.conversation'), relances_auto: P.peut(id, 'relances.auto') }] }))
  if (!egal(offres, vraies)) ko(`offres ${JSON.stringify(offres)} ≠ lib/plans.ts (${JSON.stringify(vraies)})`)
  if (offres?.studio?.relances_auto) ko('Studio prépare, l’artisan valide : « studio » ne peut pas avoir relances.auto')
  // La route : les morceaux de texte que n8n reproduit.
  for (const morceau of ["subject: artisan?.nom ? `Suite à votre demande — ${artisan.nom}` : 'Suite à votre demande'", 'text: avecMentionAssistant(text, artisan?.nom)', "fromName: artisan?.nom?.trim() || 'Votre artisan'", 'replyTo: artisan?.email ?? undefined',
    'transactionnel: true', "subject: `Relance prête à valider — ${lead.nom_prospect || 'votre client'}`", "text: `${lead.nom_prospect || 'Votre client'} n'a pas encore répondu. Une relance est prête dans votre espace (Messages) : relisez-la et validez-la d'un clic pour qu'elle parte.`",
    "if (!peut(artisan.plan, 'relances.auto')) {", "if (!lead || lead.statut !== 'repondu') {", 'if (lead.prise_en_main === true) {', 'if (!artisan || !plateformeOuverte(artisan)) {', 'if (await suspensionEnCours(lead.artisan_id)) { skipped++; continue }',
    'if (artisan?.leads_pause === true) { skipped++; continue }', 'if (contactes.has(lead.id)) { skipped++; continue }', 'if (artisan?.is_founder) {', "typeof lead.contact === 'string' && lead.contact.includes('@')", ".lte('planifiee_le', nowIso)", ".eq('envoyee', false)"]) {
    if (!route.includes(morceau)) ko(`la route ne contient plus « ${morceau.slice(0, 70)}… » : le texte ou la règle de n8n est à revoir`)
  }
  // La mention d'IA : celle de lib/mentionAssistant.ts, dans le texte préparé et dans le nœud d'envoi.
  const M = await import(FICHIER('lib/mentionAssistant.ts'))
  if (M.mentionAssistant('') !== MENTION + '.') ko(`la mention d'IA de lib/mentionAssistant.ts n’est plus « ${MENTION}. »`)
  const monde = (nom, texte) => { const t = tables0({ relances: [relance(1, 1, 1)], leads: [lead(1, 1)], artisans: [SIG(1, { nom })], config: {}, messages: [], devis: [], factures: [], actions: [], rappels: [], impayes: [], suspensions: [], exclusions: [] }); return t }
  for (const nom of ['', 'Atelier Exemple.', 'X'.repeat(90), 'Deux\nlignes']) {
    const jeu = jouerN8n(wf, monde(nom), INSTANT)
    const [rel] = sortieFinale(jeu).filter((i) => i.courrier === 'relance')
    if (!rel) { ko(`pas de relance préparée pour le nom « ${nom.slice(0, 20)} »`); continue }
    const vrai = M.avecMentionAssistant('Relance exemple.', nom)
    if (gabarit(noeud(wf, 'Envoyer la relance').parameters.text, rel) !== vrai) ko(`la mention d'IA du nœud d'envoi ≠ avecMentionAssistant pour le nom « ${nom.slice(0, 20)} »`)
    if (rel.texte !== vrai) ko(`le texte préparé ≠ avecMentionAssistant pour le nom « ${nom.slice(0, 20)} »`)
  }
  // Le texte de repli : celui de lib/ai.ts (relanceTemplate), pour tous les rangs.
  const gabaritRepli = new Function(`${sourceTemplate().replace(/^export /, '')}; return relanceTemplate`)()
  for (const rang of [0, 1, 2, 3, 4]) for (const [nomA, nomP] of [['Atelier Exemple.', 'Camille'], [null, null], ['  ', '  '], [' Dupont ', ' Zoé ']]) {
    const t = tables0({ relances: [relance(1, 1, rang)], leads: [lead(1, 1, { nom_prospect: nomP })], artisans: [SIG(1, { nom: nomA })], config: {}, messages: [], devis: [], factures: [], actions: [], rappels: [], impayes: [], suspensions: [], exclusions: [] })
    const [d] = sortieFinale(jouerN8n(wf, t, INSTANT, { modele: 'vide' })).filter((i) => i.courrier === 'decision')
    if (d?.texte_relance !== gabaritRepli(nomA, nomP, rang)) { ko(`le texte de repli (rang ${rang}, artisan « ${nomA} ») ≠ relanceTemplate de lib/ai.ts`); break }
  }
  if (!/Date\.now\(\)/.test(passage)) ko('Passage : l’instant doit venir de Date.now()')
  return erreurs
}

// ─── L'essai n8n ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const LOIN = '2099-01-01T00:00:00.000Z', JADIS = '2020-01-01T00:00:00.000Z'
function mondeEssai() {
  const t = tables0({
    artisans: [SIG(1), STU(2), artisan(3, { plan: 'gratuit' })], config: { 1: { escalade_mots: ['stop'] } },
    leads: [lead(1, 1), lead(2, 1), lead(3, 1, { statut: 'en_discussion' }), lead(4, 2), lead(5, 1), lead(6, 1), lead(7, 3), lead(8, 1, { contact: '0612345678' }), lead(9, 1)],
    relances: [relance(1, 1, 1, { planifiee_le: '2026-10-30T09:00:00.000Z' }), relance(2, 2, 2, { planifiee_le: '2026-10-30T09:00:00.000Z' }), relance(3, 3, 1, { planifiee_le: '2026-10-30T09:00:00.000Z' }), relance(4, 4, 3, { planifiee_le: '2026-10-30T09:00:00.000Z' }),
      relance(5, 5, 1, { planifiee_le: '2026-10-30T09:00:00.000Z' }), relance(6, 6, 2, { planifiee_le: '2026-10-30T09:00:00.000Z' }), relance(7, 7, 1, { planifiee_le: '2026-10-30T09:00:00.000Z' }), relance(8, 8, 1, { planifiee_le: '2026-10-30T09:00:00.000Z' }),
      relance(9, 9, 1, { planifiee_le: '2099-01-01T09:00:00.000Z' }), relance(10, 1, 2, { planifiee_le: '2026-10-31T09:00:00.000Z' })],
    messages: [{ id: idDe('0e550000', 1), lead_id: LD(5), sens: 'in', contenu: 'STOP', sent_at: '2026-10-29T09:00:00.000Z' }],
    devis: [{ id: DV(6), lead_id: LD(6), client_id: null, artisan_id: A(1) }], actions: [{ id: idDe('a0000000', 1), artisan_id: A(1), outil: 'relancer_devis', statut: 'executee', objet_id: DV(6), maj_le: LOIN }],
    rappels: [], impayes: [], factures: [], suspensions: [], exclusions: [], modele: 'normal',
  })
  return t
}
const ESSAI_INSTANT = Date.parse('2026-11-03T07:00:00.500Z')
function donneesEssai() {
  const jeu = jouerN8n(chargerExport(), mondeEssai(), ESSAI_INSTANT)
  return Object.fromEntries(LECTURES.map((l) => [l.nom, (jeu.sorties[l.nom] ?? []).map((json) => ({ json }))]).concat([['Chaque matin', [{ json: {} }]]]))
}
function essai(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`ESSAI ${m}`)
  if (!existsSync(path.join(RACINE, CHEMINS.essai)) || !existsSync(path.join(RACINE, CHEMINS.pin))) return ['ESSAI essai-n8n.json ou essai-pin.json absent']
  const pin = JSON.parse(lireTexte(CHEMINS.pin)), n8n = JSON.parse(lireTexte(CHEMINS.essai))
  if (!egal(pin, donneesEssai())) ko("essai-pin.json n'est pas la pin data que le juge régénère (--pin)")
  if (n8n.statut !== 'success') ko(`l'essai n8n n'est pas en succès (${n8n.statut})`)
  const instant = Date.parse(n8n.passage)
  const sorties = Object.fromEntries(Object.entries(pin).map(([k, v]) => [k, v.map((i) => i.json)]))
  const [passage] = executer(codeDe(wf, 'Passage'), { instant })
  if (passage.passage !== n8n.passage) ko('le nœud « Passage » rejoué ne rend pas l’instant relevé dans n8n')
  sorties.Passage = [passage]
  const decisions = executer(codeDe(wf, 'Decider'), { instant, sorties })
  if (!egal(decisions, n8n.decisions)) ko(`le rejeu hors ligne du nœud « Decider » ne rend pas la sortie de n8n (exécution ${n8n.execution}) : le code de l'export n'est pas celui qu'a essayé n8n`)
  const modele = executer(codeDe(wf, 'Modele epingle'), { instant, sorties: { ...sorties, Decider: decisions }, entree: decisions })
  if (!egal(modele, n8n.modele)) ko("le rejeu hors ligne du nœud « Modele epingle » ne rend pas la sortie de n8n : le modèle épinglé n'est pas celui qu'a essayé n8n")
  const rejeu = executer(codeDe(wf, 'Courriers a envoyer'), { instant, sorties: { ...sorties, Decider: decisions, 'Modele epingle': modele } })
  if (!egal(rejeu, n8n.courriers)) ko(`le rejeu hors ligne du nœud « Courriers a envoyer » ne rend pas la sortie de n8n (exécution ${n8n.execution}) : le code de l'export n'est pas celui qu'a essayé n8n`)
  const genres = rejeu.map((i) => (i.courrier === 'decision' ? i.decision : i.courrier))
  const compte = (g) => genres.filter((x) => x === g).length
  if (compte('part_seul') < 3 || compte('prepare') !== 1 || compte('annulee') < 3 || compte('reste_due') < 1) ko(`l'essai doit couvrir la relance qui part, la relance préparée, les annulées et celles laissées dues (reçu ${JSON.stringify(Object.fromEntries(['part_seul', 'prepare', 'annulee', 'reste_due'].map((g) => [g, compte(g)])))})`)
  if (compte('relance') < 2 || compte('avis') !== 1) ko(`l'essai doit couvrir les relances au prospect et l'avis Studio (reçu ${compte('relance')} relances, ${compte('avis')} avis)`)
  return erreurs
}

// ─── La garde commune, sur un export ─────────────────────────────────────────────────────────────────────────────────────────────
function garde(wf) {
  const dossier = mkdtempSync(path.join(tmpdir(), 'relances-garde-'))
  try {
    const f = path.join(dossier, 'presti-relances.workflow.json')
    writeFileSync(f, JSON.stringify({ workflow: wf }))
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/n8n-specs-qa.mjs', f], { cwd: RACINE, encoding: 'utf8', timeout: 120000 })
    const ligne = (r.stdout + r.stderr).split('\n').filter((x) => /^\s*(✗|R\d+ |R\d+:)/.test(x) || x.includes('manquement')).slice(0, 4).join(' | ')
    return r.status === 0 ? [] : [`GARDE n8n-specs-qa rouge sur l'export : ${ligne || (r.stdout + r.stderr).slice(-300)}`]
  } finally { rmSync(dossier, { recursive: true, force: true }) }
}

// ─── Les mutants ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const muter = (f) => (wf) => { const m = copie(wf); f(m); return m }
const surCode = (nom, de, vers) => muter((m) => { const n = noeud(m, nom); if (!n.parameters.jsCode.includes(de)) throw new Error(`mutant mal écrit : « ${de.slice(0, 50)} » absent de ${nom}`); n.parameters.jsCode = n.parameters.jsCode.replace(de, vers) })
const surParam = (nom, cle, f) => muter((m) => { const p = noeud(m, nom).parameters.queryParameters.parameters; const q = p.find((x) => x.name === cle); if (!q) throw new Error(`mutant mal écrit : ${cle} absent de ${nom}`); f(q, p) })
const COMPARE = /^(COMPARE|FIGEE)/
const MUTANTS = [
  // Qui est relancé.
  ['un client exclu est relancé (« Ne plus relancer » ignoré)', surCode('Decider', "if (exclu(lead)) { rendre(r, 'annulee', 'annulee', 'exclu'); continue; }", ''), COMPARE, false],
  ['exclusion d’un client des devis ignorée (seule la conversation compte)', surCode('Decider', "(typeof e.client_id === 'string' && clients.has(e.client_id))", 'false'), COMPARE, false],
  ['exclusion levée toujours appliquée (levee_le non filtré)', surParam('Lire exclusions', 'levee_le', (q, p) => p.splice(p.indexOf(q), 1)), COMPARE, true],
  ['registre commun de 3 jours ignoré', surCode('Decider', "if (registreRecent(lead)) { rendre(r, 'reste_due', 'reste_due', 'registre_recent'); continue; }", ''), COMPARE, false],
  ['registre : délai de 1 jour au lieu de 3', surCode('Decider', 'const DELAI_REGISTRE_MS = 3 * 86400000;', 'const DELAI_REGISTRE_MS = 1 * 86400000;'), COMPARE, false],
  ['registre : traces de l’assistant ignorées', surCode('Decider', '...[...devisIds, ...factureIds].flatMap((id) => (actionsDe[id] || []).map((a) => a.maj_le)),', ''), COMPARE, false],
  ['registre : rappels du CRM ignorés', surCode('Decider', '...devisIds.flatMap((id) => (rappelsDe[id] || []).map((r) => r.envoye_le)),', ''), COMPARE, false],
  ['registre : relances d’impayés ignorées', surCode('Decider', '...factureIds.flatMap((id) => (impayesDe[id] || []).map((r) => r.envoyee_le)),', ''), COMPARE, false],
  ['registre : une date illisible compte comme ancienne', surCode('Decider', 'return !Number.isFinite(t) || maintenant - t < DELAI_REGISTRE_MS;', 'return Number.isFinite(t) && maintenant - t < DELAI_REGISTRE_MS;'), COMPARE, false],
  ['registre : les factures du devis ne sont pas lues', surParam('Lire actions assistant', 'objet_id', (q) => { q.value = DANS(col('Lire devis', 'id')) }), /^STRUCT/, false],
  ['registre : actions non exécutées comptées', surParam('Lire actions assistant', 'statut', (q, p) => p.splice(p.indexOf(q), 1)), COMPARE, false],
  ['registre : trace de la conversation comptée (pas de « sauf conversation »)', surCode('Decider', 'const traces = [', 'const traces = [...(entrants[lead.id] || []).map((m) => m.sent_at),'), COMPARE, false],
  ['client qui a répondu relancé (statut non vérifié)', surCode('Decider', "if (lead.statut !== 'repondu') { rendre(r, 'annulee', 'annulee', 'lead_clos'); continue; }", ''), COMPARE, false],
  ['main prise ignorée', surCode('Decider', "if (lead.prise_en_main === true) { rendre(r, 'annulee', 'annulee', 'prise_en_main'); continue; }", ''), COMPARE, false],
  ['offre sans plateforme relancée', surCode('Decider', "if (!offre(artisan.is_founder ? 'business' : artisan.plan).plateforme) { rendre(r, 'annulee', 'annulee', 'sans_plateforme'); continue; }", ''), COMPARE, false],
  ['compte de démonstration relancé', surCode('Decider', "if (artisan.is_founder) { rendre(r, 'annulee', 'annulee', 'fondateur'); continue; }", ''), COMPARE, false],
  ['compte suspendu relancé', surCode('Decider', "if (suspendus.has(lead.artisan_id)) { rendre(r, 'reste_due', 'reste_due', 'suspendu'); continue; }", ''), COMPARE, false],
  ['suspension levée comptée (levee_le non filtré)', surParam('Lire suspensions', 'levee_le', (q, p) => p.splice(p.indexOf(q), 1)), COMPARE, true],
  ['artisan en pause relancé', surCode('Decider', "if (artisan.leads_pause === true) { rendre(r, 'reste_due', 'reste_due', 'pause_artisan'); continue; }", ''), COMPARE, false],
  ['deux relances d’une conversation le même jour', surCode('Decider', "if (contactes.has(lead.id)) { rendre(r, 'reste_due', 'reste_due', 'un_seul_par_passage'); continue; }", ''), COMPARE, false],
  ['Studio : le contact n’est pas noté (deux propositions par conversation)', surCode('Decider', "    contactes.add(lead.id);\n    let avis;", '    let avis;'), COMPARE, false],
  ['Signature téléphone : le contact est noté (la 2ᵉ relance attend)', surCode('Decider', "if (!contact.includes('@')) envoi = contact ? 'pas_un_courriel' : 'sans_coordonnees';", "if (!contact.includes('@')) { envoi = contact ? 'pas_un_courriel' : 'sans_coordonnees'; contactes.add(lead.id); }"), COMPARE, false],
  ['sujet d’escalade ignoré (le client menace)', surCode('Decider', "if (sujet) { rendre(r, 'annulee', 'annulee', 'escalade', { mot: sujet }); continue; }", ''), COMPARE, false],
  ['mots de l’artisan ignorés (STOP)', surCode('Decider', 'return sujetEscalade([...derniers, lead.message ?? null], mots);', 'return sujetEscalade([...derniers, lead.message ?? null], []);'), COMPARE, false],
  ['demande d’origine non relue pour l’escalade', surCode('Decider', 'return sujetEscalade([...derniers, lead.message ?? null], mots);', 'return sujetEscalade([...derniers], mots);'), COMPARE, false],
  ['un seul message du client relu', surCode('Decider', 'const MESSAGES_RELUS = 10;', 'const MESSAGES_RELUS = 1;'), COMPARE, false],
  ['vingt messages du client relus', surCode('Decider', 'const MESSAGES_RELUS = 10;', 'const MESSAGES_RELUS = 20;'), COMPARE, false],
  ['liste de mots d’escalade amputée', surCode('Decider', '"avocat",', ''), COMPARE, false],
  ['réglages de l’artisan sans mots : les mots par défaut s’appliquent', surCode('Decider', "const mots = reg && Object.prototype.hasOwnProperty.call(reg, 'escalade_mots') ? reg.escalade_mots : ESCALADE_DEFAUT;", 'const mots = ESCALADE_DEFAUT;'), COMPARE, false],
  // Ce qui part, et à qui.
  ['Studio qui part seul (offre « studio » avec relances.auto)', surCode('Decider', '"studio":{"plateforme":true,"relances_auto":false}', '"studio":{"plateforme":true,"relances_auto":true}'), COMPARE, false],
  ['Studio qui part seul (condition inversée)', surCode('Decider', 'if (!offre(artisan.plan).relances_auto) {', 'if (offre(artisan.plan).relances_auto === "jamais") {'), COMPARE, false],
  ['Signature qui ne part plus seule', surCode('Decider', 'if (!offre(artisan.plan).relances_auto) {', 'if (true) {'), COMPARE, false],
  ['mention d’IA ôtée du nœud d’envoi', muter((m) => { noeud(m, 'Envoyer la relance').parameters.text = '={{ $json.corps }}' }), /^(STRUCT|COMPARE|FIGEE)/, true],
  ['mention d’IA ôtée du texte préparé', surCode('Courriers a envoyer', "texte: corps + '\\n\\n—\\n' + mention }", 'texte: corps }'), COMPARE, false],
  ['mention d’IA ajoutée deux fois', surCode('Courriers a envoyer', "const corps = sec.endsWith(mention) ? sec.slice(0, sec.length - mention.length).replace(/\\s*—\\s*$/, '') : sec;", 'const corps = sec;'), COMPARE, false],
  ['« Presti » dans la relance au prospect', muter((m) => { noeud(m, 'Envoyer la relance').parameters.text += '\nPresti' }), /^(STRUCT|COMPARE)/, true],
  ['expéditeur « Presti » pour la relance', surCode('Courriers a envoyer', "de: nettoyer(nom.trim() || 'Votre artisan') + ' <'", "de: 'Presti' + ' <'"), COMPARE, false],
  ['Reply-To de la relance retiré', surCode('Courriers a envoyer', 'repondre_a: texte(artisan.email).trim(),\n      sujet: uneLigne(nom ?', "repondre_a: '',\n      sujet: uneLigne(nom ?"), COMPARE, false],
  ['sujet de la relance changé', surCode('Courriers a envoyer', "'Suite à votre demande — ' + nom : 'Suite à votre demande'", "'Relance — ' + nom : 'Relance'"), COMPARE, false],
  ['sujet sans nom d’artisan : « — Presti »', surCode('Courriers a envoyer', ": 'Suite à votre demande'", ": 'Suite à votre demande — Presti'"), COMPARE, false],
  ['texte de repli changé', surCode('Courriers a envoyer', "Je reviens vers vous suite à votre demande.", "Je reviens vers vous."), COMPARE, false],
  ['repli : le rang est ignoré (toujours J+2)', surCode('Courriers a envoyer', 'if (rang <= 1) return', 'if (true) return'), COMPARE, false],
  ['avis Studio : envoyé malgré la préférence « proposition »', surCode('Decider', 'else if (!actif(artisan.notifications)) avis = \'desactive\';', ''), COMPARE, false],
  ['avis Studio : sujet changé', surCode('Courriers a envoyer', "'Relance prête à valider — '", "'Relance — '"), COMPARE, false],
  ['avis Studio : envoyé au prospect', surCode('Courriers a envoyer', "a: texte(artisan.email).trim(), de: 'Presti <'", "a: texte(lead.contact).trim(), de: 'Presti <'"), COMPARE, false],
  ['adresse .invalid visée', surCode('Decider', "else if (/\\.invalid$/i.test(contact.trim())) { envoi = 'adresse_de_test'; contactes.add(lead.id); }", ''), COMPARE, false],
  ['adresse atypique acceptée', surCode('Decider', "else if (!ADRESSE_SURE.test(contact.trim())) { rendre(r, 'reste_due', 'reste_due', 'adresse_atypique'); continue; }", ''), COMPARE, false],
  ['plafond des envois retiré', surCode('Decider', 'const MAX_ENVOIS = 80;', 'const MAX_ENVOIS = 100000;'), COMPARE, false],
  ['plafond des envois : le reste du lot n’est pas laissé dû', surCode('Decider', "if (plafond) { rendre(r, 'reste_due', 'reste_due', 'plafond'); continue; }", ''), COMPARE, false],
  ['plus de cent relances par passage', surCode('Decider', 'const MAX_PAR_PASSAGE = 100;', 'const MAX_PAR_PASSAGE = 1000;'), COMPARE, false],
  ['lecture des relances dues sans limite de cent', surParam('Lire relances dues', 'limit', (q) => { q.value = '1000' }), /^STRUCT/, false],
  ['relances futures prises (échéance non filtrée dans la requête ni dans le code)', (wf) => surCode('Decider', ' && Date.parse(r.planifiee_le) <= maintenant)', ')')(surParam('Lire relances dues', 'planifiee_le', (q, p) => p.splice(p.indexOf(q), 1))(wf)), COMPARE, true],
  ['relances futures prises (échéance non filtrée dans la requête : filet du code seul, rougit la structure)', surParam('Lire relances dues', 'planifiee_le', (q, p) => p.splice(p.indexOf(q), 1)), /^STRUCT/, false],
  ['relances déjà parties reprises (envoyee non filtré)', surParam('Lire relances dues', 'envoyee', (q, p) => p.splice(p.indexOf(q), 1)), COMPARE, true],
  ['relances dues lues à l’envers (la plus récente d’abord)', surParam('Lire relances dues', 'order', (q) => { q.value = 'planifiee_le.desc,id.desc' }), /^(STRUCT|COMPARE)/, false],
  ['colonne « statut » non lue', surParam('Lire demandes', 'select', (q) => { q.value = q.value.replace('statut,', '') }), /^(STRUCT|COMPARE)/, true],
  ['lecture des messages du client sans filtre « entrants »', surParam('Lire messages entrants', 'sens', (q, p) => p.splice(p.indexOf(q), 1)), COMPARE, true],
  ['lecture vide qui arrête la chaîne (alwaysOutputData ôté)', muter((m) => { delete noeud(m, 'Lire suspensions').alwaysOutputData }), /^(STRUCT|COMPARE)/, false],
  ['lecture sans pagination', muter((m) => { delete noeud(m, 'Lire messages entrants').parameters.options.pagination }), /^STRUCT/, false],
  // Le modèle, les envois, le calendrier.
  ['modèle épinglé qui répond autre chose', surCode('Modele epingle', "'Relance exemple.'", "'Autre relance.'"), COMPARE, false],
  ['modèle épinglé qui appelle le réseau', muter((m) => { noeud(m, 'Modele epingle').parameters.jsCode = "const r = await fetch('https://api.anthropic.com/v1/messages');\n" + noeud(m, 'Modele epingle').parameters.jsCode }), /^STRUCT/, false],
  ['modèle remplacé par un nœud de requête POST', muter((m) => { const n = noeud(m, 'Modele epingle'); n.type = 'n8n-nodes-base.httpRequest'; n.parameters = { method: 'POST', url: 'https://api.anthropic.com/v1/messages' } }), /^STRUCT/, false],
  ['modèle non déclaré « EPINGLE »', muter((m) => { delete noeud(m, 'Modele epingle').notes }), /^STRUCT .*EPINGLE/, false],
  ['envoi hors simulation : « Envoyer la relance » activé', muter((m) => { delete noeud(m, 'Envoyer la relance').disabled }), /^STRUCT .*DÉSACTIVÉ/, false],
  ['envoi hors simulation : « Envoyer l avis » activé', muter((m) => { delete noeud(m, 'Envoyer l avis').disabled }), /^STRUCT .*DÉSACTIVÉ/, false],
  ['identifiant SMTP posé sur la relance', muter((m) => { noeud(m, 'Envoyer la relance').credentials = { smtp: { id: 'IdentifiantFictif01', name: 'SMTP essai' } } }), /^STRUCT .*identifiant/, false],
  ['ligne « envoyé avec n8n » rétablie', muter((m) => { noeud(m, 'Envoyer la relance').parameters.options.appendAttribution = true }), /^STRUCT .*envoyé automatiquement/, false],
  ['pied de la relance déclaré « aucun »', muter((m) => { noeud(m, 'Envoyer la relance').notes = noeud(m, 'Envoyer la relance').notes.replace('pied: mention', 'pied: aucun') }), /^STRUCT .*pied/, true],
  ['lecture devenue POST', muter((m) => { noeud(m, 'Lire comptes').parameters.method = 'POST' }), /^(STRUCT|GARDE)/, true],
  ['lecture sans déclaration « lecture-pour-envoi »', muter((m) => { delete noeud(m, 'Lire demandes').notes }), /^(STRUCT|GARDE)/, true],
  ['colonne « photos » lue', surParam('Lire demandes', 'select', (q) => { q.value += ',photos' }), /^(STRUCT|GARDE)/, true],
  ['workflow actif', muter((m) => { m.active = true }), /^(STRUCT|GARDE)/, true],
  ['workflow d’erreur retiré', muter((m) => { delete m.settings.errorWorkflow }), /^(STRUCT|GARDE)/, true],
  ['exécutions réussies gardées', muter((m) => { m.settings.saveDataSuccessExecution = 'all' }), /^STRUCT .*exécutions réussies/, false],
  ['déclencheur à la minute', muter((m) => { noeud(m, 'Chaque matin').parameters.rule.interval[0].expression = '0 * * * * *' }), /^STRUCT .*déclencheur/, false],
  ['fuseau changé', muter((m) => { m.settings.timezone = 'UTC' }), /^STRUCT/, false],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv.includes('--pin')) { console.log(JSON.stringify(donneesEssai())); process.exit(0) }

const mondes = await jouerLaRoute()
const wf = chargerExport()
const bilan = []
const cmp = comparerRoute(wf, mondes)
bilan.push(['structure', structure(wf)])
bilan.push(['copie figée', await figee(wf)])
bilan.push(['comparaison à la route', cmp.erreurs])
bilan.push(['essai n8n', essai(wf)])
bilan.push(['garde commune (n8n-specs-qa)', garde(wf)])
let rouge = 0
for (const [titre, erreurs] of bilan) {
  if (erreurs.length) { rouge += erreurs.length; console.log(`✗ ${titre} : ${erreurs.length} écart(s)`); for (const e of erreurs.slice(0, 14)) console.log('   ' + e) } else console.log(`✓ ${titre}`)
}
console.log(`  comparé : ${cmp.nDecisions} décisions en ${mondes.length} cas ; ${cmp.nRelances} relances au prospect et ${cmp.nAvis} avis « à valider » identiques à ceux de la route (aux écarts écrits près : ${ECARTS.join(', ')})`)

let survivants = 0
for (const [nom, mutation, attendu, avecGarde] of MUTANTS) {
  let m
  try { m = mutation(wf) } catch (e) { console.log(`✗ mutant « ${nom} » : ${e.message}`); survivants++; continue }
  const sur = async (f) => { try { return await f() } catch (e) { return [`COMPARE plantage : ${e.message}`] } }
  const erreurs = [...await sur(() => structure(m)), ...await sur(() => figee(m)), ...await sur(() => comparerRoute(m, mondes).erreurs), ...await sur(() => essai(m)), ...(avecGarde ? await sur(() => garde(m)) : [])]
  if (!erreurs.some((e) => attendu.test(e))) { survivants++; console.log(`✗ mutant « ${nom} » SURVIT${erreurs.length ? ` (rouge pour une autre raison : ${erreurs[0].slice(0, 100)})` : ' (le juge reste vert)'}`) }
}
console.log(`  mutants : ${MUTANTS.length - survivants}/${MUTANTS.length} font rougir le juge`)
if (rouge || survivants) { console.log('✗ relances-n8n-qa : ROUGE'); process.exit(1) }
console.log('✓ relances-n8n-qa : OK')
