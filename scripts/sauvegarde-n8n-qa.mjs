// Juge HORS LIGNE des deux workflows n8n de la sauvegarde (chantier 4, lot L8 ; tâche 032-023) :
//   · presti-sauvegarde        3 h 40 (Europe/Paris) : lance scripts/sauvegarde.mjs (032-020) par SSH, relit l'archive, écrit un battement,
//                              purge au-delà de 14 jours ; alerte Slack #presti-auto en cas d'échec SEULEMENT ;
//   · presti-garde-sauvegarde  4 h : une archive DU JOUR existe, elle se relit, son manifeste compte au moins autant de tables que la
//                              précédente, le battement de la sauvegarde a moins de 26 h ; un battement par passage ; alerte en cas d'écart.
//
// Il relit les exports (.orchestre/preuves/032-023/*.workflow.json, tirés du n8n d'Oracle par le MCP) et :
//   1. vérifie la STRUCTURE contre une spécification écrite ICI : inactif et jamais publié, aucun secret, AUCUN identifiant SSH créé,
//      l'identifiant Slack existant seul, horaires et fuseau exacts, commandes SSH exactes (et leur dossier de travail), délai borné,
//      branche d'erreur câblée, graphe exact (l'alerte n'est atteignable que par l'échec ou par l'Error Trigger, jamais par la réussite) ;
//   2. épingle l'empreinte SHA-256 du code de chaque nœud Code ;
//   3. REJOUE ce code dans un processus enfant `node --permission` (ni disque, ni processus, ni réseau), dans un contexte vm sans objet de
//      l'hôte, sur des cas FICTIFS : sauvegarde réussie, en échec, verrou, délai ; relecture rouge ; archive absente ; tables en baisse ;
//      battement trop vieux… ;
//   4. prouve qu'il sait rougir : des MUTANTS (activé, mauvais fuseau, mauvaise heure, alerte retirée, alerte sur la réussite, commande
//      changée, identifiant créé, secret, délai ôté, code changé…) doivent tous faire échouer la suite, pour la bonne raison.
//
// Aucun réseau, aucune base, aucun modèle, aucune exécution réelle de la sauvegarde. Lancement :
//   node scripts/sauvegarde-n8n-qa.mjs [--sauvegarde=<export>] [--garde=<export>] [--empreintes]
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3)
const EXPORT_SAUV = arg('sauvegarde') ? path.resolve(arg('sauvegarde')) : path.join(RACINE, '.orchestre/preuves/032-023/presti-sauvegarde.workflow.json')
const EXPORT_GARDE = arg('garde') ? path.resolve(arg('garde')) : path.join(RACINE, '.orchestre/preuves/032-023/presti-garde-sauvegarde.workflow.json')
const lire = (f) => JSON.parse(readFileSync(f, 'utf8'))
const copie = (x) => JSON.parse(JSON.stringify(x))
const sha = (t) => createHash('sha256').update(t).digest('hex')

// ─── La spécification ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const DOSSIER = '/home/usine/sauvegardes-presti'
const DEPOT = '/home/usine/Documents/presti'
const BRIEF = 'plans/011-cadrage-01-11/briefs/c4-n8n-sauvegarde.md'
const SLACK = { slackApi: { id: 'lR0GZ7FGXI3FCAF8', name: 'Slack account 2' } } // « Slack account 2 » existe déjà (list_credentials, 02/11) ; aucun identifiant créé
const REGLAGES = { executionOrder: 'v1', availableInMCP: true, timezone: 'Europe/Paris', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all' }
const TYPES_PERMIS = new Set(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.errorTrigger', 'n8n-nodes-base.ssh', 'n8n-nodes-base.code', 'n8n-nodes-base.if', 'n8n-nodes-base.slack', 'n8n-nodes-base.stickyNote'])
const SECRETS = [
  /sk_live_[A-Za-z0-9]{8,}/, /rk_live_[A-Za-z0-9]{8,}/, /sk-ant-[A-Za-z0-9_-]{12,}/, /sb_secret_[A-Za-z0-9_-]{12,}/, /xox[bap]-[A-Za-z0-9-]{10,}/,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/, /\bBearer\s+[A-Za-z0-9._-]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S{12,}/,
]
const CODE_INTERDIT = /fetch\s*\(|httpRequest|\$http|require\s*\(|\bimport\s|axios|this\.helpers|helpers\.|getWorkflowStaticData|\$execution\.|XMLHttpRequest|WebSocket|process\.|child_process|\beval\s*\(|Function\s*\(/

const ssh = (commande, cwd, extra = {}) => ({ type: 'n8n-nodes-base.ssh', typeVersion: 1, parameters: { resource: 'command', operation: 'execute', authentication: 'privateKey', command: commande, cwd }, executeOnce: true, ...extra })
const CONTINUER = { onError: 'continueRegularOutput' }
const bat = (qui, bilan) => `=mkdir -p ${DOSSIER} && printf '%s %s\\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "{{ $('${bilan}').first().json.ok ? 'ok' : 'echec' }}" > ${DOSSIER}/battement-${qui}.txt`
const RELIRE = `timeout -k 10 120 node scripts/sauvegarde.mjs --verifier --dernier --dossier ${DOSSIER}`

const SPEC = {
  sauvegarde: {
    id: '16Gbnw1jg1JmFbfV', nom: 'presti-sauvegarde', heure: 3, minute: 40, declencheur: 'Déclencheur 3 h 40', delaiMax: 1200,
    ssh: {
      'Lancer la sauvegarde': ssh(`flock -n -E 75 /tmp/presti-sauvegarde.verrou timeout -k 30 900 node scripts/sauvegarde.mjs --dossier ${DOSSIER}`, DEPOT, CONTINUER),
      'Relire la dernière archive': ssh(RELIRE, DEPOT, CONTINUER),
      'Écrire le battement': ssh(bat('sauvegarde', 'Bilan de la sauvegarde'), DEPOT),
      'Purger les archives de plus de 14 jours': ssh(`find ${DOSSIER} -maxdepth 1 -type f -name '*.presti' -mtime +14 -delete`, DEPOT),
    },
    codes: ['Réglages de la sauvegarde', 'Lire la sauvegarde', 'Bilan de la sauvegarde'],
    ifs: { 'Sauvegarde réussie ?': "={{ $json.ok }}", 'Sauvegarde et relecture réussies ?': "={{ $('Bilan de la sauvegarde').first().json.ok }}" },
    slacks: { 'Alerte Slack (échec)': ['jour', 'etape_en_echec', 'raison'], 'Alerte Slack (erreur du workflow)': ['lastNodeExecuted', 'execution.id'] },
    // Le graphe EXACT : « source → sortie 0 | sortie 1 ».
    graphe: {
      'Déclencheur 3 h 40': [['Réglages de la sauvegarde']], 'Réglages de la sauvegarde': [['Lancer la sauvegarde']], 'Lancer la sauvegarde': [['Lire la sauvegarde']],
      'Lire la sauvegarde': [['Sauvegarde réussie ?']], 'Sauvegarde réussie ?': [['Relire la dernière archive'], ['Bilan de la sauvegarde']],
      'Relire la dernière archive': [['Bilan de la sauvegarde']], 'Bilan de la sauvegarde': [['Écrire le battement']], 'Écrire le battement': [['Sauvegarde et relecture réussies ?']],
      'Sauvegarde et relecture réussies ?': [['Purger les archives de plus de 14 jours'], ['Alerte Slack (échec)']], 'Échec du workflow': [['Alerte Slack (erreur du workflow)']],
    },
    alerteSurEchec: { si: 'Sauvegarde et relecture réussies ?', sortie: 1, slack: 'Alerte Slack (échec)' },
    battement: 'Écrire le battement',
  },
  garde: {
    id: '2uovL6sfTnINC3ka', nom: 'presti-garde-sauvegarde', heure: 4, minute: 0, declencheur: 'Déclencheur 4 h', delaiMax: 600,
    ssh: {
      'Lire les manifestes récents': ssh('for f in $(ls -1 *.presti | sort | tail -n 3); do echo "== $f"; head -n 1 "$f"; done', DOSSIER, CONTINUER),
      'Relire la dernière archive': ssh(RELIRE, DEPOT, CONTINUER),
      'Lire le battement de la sauvegarde': ssh(`cat ${DOSSIER}/battement-sauvegarde.txt`, DOSSIER, CONTINUER),
      'Écrire le battement de la garde': ssh(bat('garde', 'Bilan de la garde'), DEPOT),
    },
    codes: ['Réglages de la garde', 'Bilan de la garde'],
    ifs: { 'Garde satisfaite ?': "={{ $('Bilan de la garde').first().json.ok }}" },
    slacks: { 'Alerte Slack (garde)': ['jour', 'alertes'], 'Alerte Slack (erreur du workflow)': ['lastNodeExecuted', 'execution.id'] },
    graphe: {
      'Déclencheur 4 h': [['Réglages de la garde']], 'Réglages de la garde': [['Lire les manifestes récents']], 'Lire les manifestes récents': [['Relire la dernière archive']],
      'Relire la dernière archive': [['Lire le battement de la sauvegarde']], 'Lire le battement de la sauvegarde': [['Bilan de la garde']], 'Bilan de la garde': [['Écrire le battement de la garde']],
      'Écrire le battement de la garde': [['Garde satisfaite ?']], 'Garde satisfaite ?': [[], ['Alerte Slack (garde)']], 'Échec du workflow': [['Alerte Slack (erreur du workflow)']],
    },
    alerteSurEchec: { si: 'Garde satisfaite ?', sortie: 1, slack: 'Alerte Slack (garde)' },
    battement: 'Écrire le battement de la garde',
  },
}

// Empreintes SHA-256 du code de chaque nœud Code (`--empreintes` les imprime). Un code changé : « nouvel audit requis ».
const EMPREINTES = {
  sauvegarde: {
    'Réglages de la sauvegarde': '155e19265d20c37e8603584a5ae1cd64edb58c465f7d3fd9c67940af1bfcda39',
    'Lire la sauvegarde': 'e60c372a8b4d1c00e4f33639fbaea2cc9babebe63381ce52154f7c959299c784',
    'Bilan de la sauvegarde': '71bcd53124106d13d0cee066a278364bb84272151dd4b421967ad43e7125299e',
  },
  garde: {
    'Réglages de la garde': 'ebdc982d30854e9d0974e58b12af7aaff6805b4c2e8e7236bcff01189fd6f818',
    'Bilan de la garde': '593703467cbc4aff65eed7f37671d3433d0c9af08c0a2bd4ece927498fd84e65',
  },
}

// ─── 1. La structure ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const sortieDe = (wf, nom) => (wf.connections?.[nom]?.main ?? []).map((l) => (l ?? []).map((c) => c.node))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function atteignables(wf, depart) {
  const vus = new Set()
  const pile = [...depart]
  while (pile.length) {
    const n = pile.pop()
    if (vus.has(n)) continue
    vus.add(n)
    for (const sortie of sortieDe(wf, n)) for (const s of sortie) pile.push(s)
  }
  return vus
}

export function jugerStructure(wf, spec) {
  const ko = []
  const e = (regle, msg) => ko.push(`${regle} ${msg}`)
  const noeuds = new Map((wf.nodes ?? []).map((n) => [n.name, n]))
  // R1 inactif, jamais publié
  if (wf.active !== false) e('R1', 'active doit valoir false')
  if (wf.activeVersionId != null || wf.activeVersion != null) e('R1', 'une version publiée existe (activeVersion)')
  if (wf.isArchived !== false) e('R1', 'isArchived doit valoir false')
  if (wf.triggerCount !== 0) e('R1', `triggerCount doit valoir 0 (${wf.triggerCount})`)
  if (wf.id !== spec.id || wf.name !== spec.nom) e('R1', `identité inattendue (${wf.id} / ${wf.name})`)
  if (!/Inactif/.test(wf.description ?? '')) e('R1', 'la description doit dire « Inactif »')
  // R2 aucun secret, aucun identifiant créé
  const texte = JSON.stringify(wf)
  for (const re of SECRETS) if (re.test(texte)) e('R2', `secret probable dans l'export (${re})`)
  if (/"data"\s*:\s*\{[^}]*(password|token|key|secret)/i.test(texte)) e('R2', 'champ `data` d\'un identifiant')
  for (const n of wf.nodes ?? []) {
    if (n.type === 'n8n-nodes-base.ssh' && n.credentials) e('R2', `${n.name} : un identifiant SSH est posé (à créer par Benj, pas par un agent)`)
    if (n.type === 'n8n-nodes-base.slack' && !egal(n.credentials, SLACK)) e('R2', `${n.name} : seul l'identifiant Slack existant est permis (${JSON.stringify(n.credentials)})`)
    if (n.type !== 'n8n-nodes-base.ssh' && n.type !== 'n8n-nodes-base.slack' && n.credentials) e('R2', `${n.name} : identifiant inattendu`)
  }
  // R3 types, noms, déclencheurs
  for (const n of wf.nodes ?? []) if (!TYPES_PERMIS.has(n.type)) e('R3', `type de nœud hors liste blanche : ${n.type} (${n.name})`)
  const attendus = new Set([spec.declencheur, 'Échec du workflow', ...Object.keys(spec.ssh), ...spec.codes, ...Object.keys(spec.ifs), ...Object.keys(spec.slacks)])
  for (const nom of attendus) if (!noeuds.has(nom)) e('R3', `nœud absent : ${nom}`)
  for (const n of wf.nodes ?? []) if (!attendus.has(n.name) && n.type !== 'n8n-nodes-base.stickyNote') e('R3', `nœud inattendu : ${n.name}`)
  const declencheurs = (wf.nodes ?? []).filter((n) => /Trigger$/.test(n.type))
  if (declencheurs.length !== 2) e('R3', `deux déclencheurs attendus (horaire + Error Trigger), ${declencheurs.length} trouvés`)
  // R4 horaire et fuseau
  const horaire = noeuds.get(spec.declencheur)
  const regle = horaire?.parameters?.rule?.interval
  if (!horaire || horaire.type !== 'n8n-nodes-base.scheduleTrigger' || horaire.typeVersion !== 1.4) e('R4', 'le déclencheur horaire est absent ou n\'est pas un Schedule Trigger 1.4')
  else if (!egal(regle, [{ field: 'days', daysInterval: 1, triggerAtHour: spec.heure, triggerAtMinute: spec.minute }]) || Object.keys(horaire.parameters).length !== 1) e('R4', `horaire attendu : tous les jours à ${spec.heure} h ${String(spec.minute).padStart(2, '0')} (reçu ${JSON.stringify(horaire.parameters)})`)
  if (wf.settings?.timezone !== 'Europe/Paris') e('R4', `fuseau attendu Europe/Paris (reçu ${wf.settings?.timezone})`)
  // R5 réglages : liste blanche, délai borné
  const { executionTimeout, ...autres } = wf.settings ?? {}
  if (!egal(autres, REGLAGES)) e('R5', `réglages inattendus : ${JSON.stringify(autres)} (attendu ${JSON.stringify(REGLAGES)}) — pas d'errorWorkflow : un workflow d'erreur doit être publié`)
  if (!Number.isInteger(executionTimeout) || executionTimeout < 60 || executionTimeout > spec.delaiMax) e('R5', `executionTimeout borné attendu (60 à ${spec.delaiMax} s) : ${executionTimeout}`)
  // R6 commandes SSH exactes
  for (const [nom, att] of Object.entries(spec.ssh)) {
    const n = noeuds.get(nom)
    if (!n) continue
    if (n.type !== att.type || n.typeVersion !== att.typeVersion) e('R6', `${nom} : type attendu ${att.type} ${att.typeVersion}`)
    if (!egal(n.parameters, att.parameters)) e('R6', `${nom} : commande ou paramètres inattendus — reçu ${JSON.stringify(n.parameters)}`)
    if (n.executeOnce !== true) e('R6', `${nom} : executeOnce doit valoir true`)
    if ((n.onError ?? null) !== (att.onError ?? null)) e('R6', `${nom} : onError attendu ${att.onError ?? 'absent'}, reçu ${n.onError ?? 'absent'}`)
    const clesNoeud = Object.keys(n).filter((k) => !['id', 'name', 'type', 'typeVersion', 'position', 'parameters', 'executeOnce', 'onError'].includes(k))
    if (clesNoeud.length) e('R6', `${nom} : clés de nœud inattendues (${clesNoeud.join(', ')})`)
  }
  // R7 Slack : canal, texte, rien d'autre
  for (const [nom, champs] of Object.entries(spec.slacks)) {
    const n = noeuds.get(nom)
    if (!n) continue
    const p = n.parameters ?? {}
    if (p.resource !== 'message' || p.operation !== 'post' || p.select !== 'channel' || p.channelId?.value !== 'presti-auto' || p.channelId?.mode !== 'name') e('R7', `${nom} : doit poster dans #presti-auto`)
    if (typeof p.text !== 'string' || !p.text.startsWith('=')) e('R7', `${nom} : le texte doit être une expression`)
    else for (const c of champs) if (!p.text.includes(c)) e('R7', `${nom} : le texte doit citer « ${c} »`)
    if (!/presti-sauvegarde|presti-garde-sauvegarde/.test(p.text ?? '') || !(p.text ?? '').includes(BRIEF)) e('R7', `${nom} : le texte doit nommer le workflow et le brief`)
    if (/password|token|clé de service|service_role/i.test(p.text ?? '')) e('R7', `${nom} : le texte ne doit rien laisser fuir`)
  }
  // R8 conditions
  for (const [nom, gauche] of Object.entries(spec.ifs)) {
    const n = noeuds.get(nom)
    const c = n?.parameters?.conditions?.conditions
    if (!n || c?.length !== 1 || c[0].leftValue !== gauche || c[0].operator?.type !== 'boolean' || c[0].operator?.operation !== 'true') e('R8', `${nom} : la condition doit être « ${gauche} est vrai »`)
  }
  // R9 graphe exact
  for (const n of wf.nodes ?? []) {
    if (n.type === 'n8n-nodes-base.stickyNote') continue
    if (!egal(sortieDe(wf, n.name), spec.graphe[n.name] ?? [])) e('R9', `${n.name} : connexions attendues ${JSON.stringify(spec.graphe[n.name] ?? [])}, reçues ${JSON.stringify(sortieDe(wf, n.name))}`)
  }
  for (const source of Object.keys(wf.connections ?? {})) if (!noeuds.has(source)) e('R9', `connexion depuis un nœud inconnu : ${source}`)
  // R10 l'alerte n'est atteignable que par l'échec ou par l'Error Trigger
  const { si, sortie, slack } = spec.alerteSurEchec
  const sortiesSi = sortieDe(wf, si)
  if (!(sortiesSi[sortie] ?? []).includes(slack)) e('R10', `l'alerte « ${slack} » doit partir de la sortie « échec » (${sortie}) de « ${si} »`)
  const surReussite = atteignables(wf, sortiesSi[0] ?? [])
  for (const s of Object.keys(spec.slacks)) if (surReussite.has(s)) e('R10', `${s} est atteignable depuis la réussite : l'alerte ne doit partir qu'en cas d'échec`)
  const depuisHoraire = atteignables(wf, [spec.declencheur])
  const alertesDeLEchec = Object.keys(spec.slacks).filter((s) => s !== 'Alerte Slack (erreur du workflow)')
  for (const s of alertesDeLEchec) if (!depuisHoraire.has(s)) e('R10', `${s} n'est pas atteignable depuis le déclencheur horaire`)
  const erreurs = noeuds.get('Échec du workflow')
  if (!erreurs || erreurs.type !== 'n8n-nodes-base.errorTrigger' || !(sortieDe(wf, 'Échec du workflow')[0] ?? []).includes('Alerte Slack (erreur du workflow)')) e('R10', 'la branche d\'erreur (Error Trigger → Slack) est absente ou coupée')
  // R11 le battement précède la décision (un battement par passage, réussite ou échec)
  if (!atteignables(wf, [spec.declencheur]).has(spec.battement)) e('R11', 'le battement est inatteignable')
  const avantSi = [...wf.nodes].filter((n) => n.name !== si).some((n) => (sortieDe(wf, n.name)[0] ?? []).includes(si) && n.name === spec.battement)
  if (!avantSi) e('R11', `« ${spec.battement} » doit précéder « ${si} » : un battement à chaque passage, réussi ou non`)
  // R12 le code des nœuds Code : aucun accès réseau, disque, processus
  for (const nom of spec.codes) {
    const code = noeuds.get(nom)?.parameters?.jsCode
    if (typeof code !== 'string') { e('R12', `${nom} : pas de code`); continue }
    const m = code.match(CODE_INTERDIT)
    if (m) e('R12', `${nom} : motif interdit dans le code (${m[0]})`)
    const n = noeuds.get(nom)
    if (n.parameters.mode !== 'runOnceForAllItems' || n.parameters.language !== 'javaScript' || n.type !== 'n8n-nodes-base.code' || n.typeVersion !== 2) e('R12', `${nom} : Code 2, JavaScript, une fois pour tous les éléments`)
  }
  // R13 la note renvoie au brief
  const note = (wf.nodes ?? []).find((n) => n.type === 'n8n-nodes-base.stickyNote')
  if (!note || !String(note.parameters?.content ?? '').includes(BRIEF)) e('R13', 'la note du workflow doit renvoyer au brief')
  return ko
}

// ─── 2. Les empreintes ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export function jugerEmpreintes(wf, kind) {
  const ko = []
  for (const [nom, att] of Object.entries(EMPREINTES[kind])) {
    const code = (wf.nodes ?? []).find((n) => n.name === nom)?.parameters?.jsCode
    if (typeof code !== 'string' || sha(code) !== att) ko.push(`E1 ${nom} : empreinte différente (${typeof code === 'string' ? sha(code).slice(0, 12) : 'absent'}) — nouvel audit requis`)
  }
  return ko
}

// ─── 3. Le rejeu du code, en bac à sable ──────────────────────────────────────────────────────────────────────────────────────────
// Un processus enfant `node --permission` (ni lecture, ni écriture, ni processus, ni worker), un contexte vm vide (aucun objet de l'hôte),
// génération de code à partir de chaînes coupée. Les données entrent par JSON, sortent par JSON.
const RUNNER = `
let d = ''
process.stdin.on('data', (c) => { d += c }).on('end', () => {
  const vm = require('node:vm')
  const cas = JSON.parse(d)
  const sortie = cas.map((c) => {
    try {
      const ctx = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } })
      vm.runInContext('globalThis.__NOW = ' + Number(c.now) + '; globalThis.__ENTREE = ' + JSON.stringify(c.entree ?? {}) + '; globalThis.__NOEUDS = ' + JSON.stringify(c.noeuds ?? {}) + ';' +
        'const RD = Date; globalThis.Date = class extends RD { constructor(...a) { if (a.length === 0) super(__NOW); else super(...a) } static now() { return __NOW } };' +
        'globalThis.$input = { first: () => ({ json: __ENTREE }) };' +
        'globalThis.$ = (n) => { if (!Object.prototype.hasOwnProperty.call(__NOEUDS, n) || __NOEUDS[n] === null) throw new Error("Node \\'" + n + "\\' hasn\\'t been executed"); return { first: () => ({ json: __NOEUDS[n] }) } };', ctx, { timeout: 2000 })
      const r = vm.runInContext('JSON.stringify((function () {\\n' + c.code + '\\n})())', ctx, { timeout: 2000 })
      return { ok: true, valeur: JSON.parse(r) }
    } catch (e) { return { ok: false, erreur: String(e && e.message) } }
  })
  process.stdout.write(JSON.stringify(sortie))
})`
function rejouer(cas) {
  const r = spawnSync(process.execPath, ['--permission', '-e', RUNNER], { input: JSON.stringify(cas), encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`le bac à sable a échoué (code ${r.status}) : ${r.stderr.slice(0, 300)}`)
  return JSON.parse(r.stdout)
}

// Les cas FICTIFS.
const NOW = Date.parse('2026-11-02T19:00:00Z')
const A_HIER = '2026-11-01T02-40-11-456Z.presti'
const A_JOUR = '2026-11-02T02-40-13-123Z.presti'
const sshSortie = (code, stdout = '', stderr = '') => ({ code, signal: null, stdout, stderr })
const ligneBilan = (nom, t = 90) => `▶ Sauvegarde (essai fictif)\n\n✅ ${DOSSIER}/${nom} — ${t} tables, 123456 lignes, 12 comptes, 4096 Ko, 61 s\n   Chiffrée : cette machine ne peut pas la relire.\n`
const relOk = (nom, t = 90) => sshSortie(0, `▶ Vérification de ${DOSSIER}/${nom}\n  manifeste version 2, fait le 2026-11-02T02:40:13.000Z : ${t} tables, 123456 lignes, 12 comptes\n  niveau structurel\n\n✅ archive relue, comptes égaux\n`)
const man = (n) => JSON.stringify({ version: 2, lignes: Object.fromEntries(Array.from({ length: n }, (_, i) => [`table_${i}`, i])) })
const manifs = (...paires) => sshSortie(0, paires.map(([nom, n]) => `== ${nom}\n${typeof n === 'string' ? n : man(n)}\n`).join(''))
const bat26 = (iso, etat = 'ok') => sshSortie(0, `${iso} ${etat}\n`)
const REG_GARDE = { jour: '2026-11-02', maintenant_ms: NOW, dossier: DOSSIER, battement_max_h: 26 }
const garde = (noeuds, now = NOW) => ({ now, noeuds: { 'Réglages de la garde': REG_GARDE, ...noeuds } })
const gardeVerte = { 'Lire les manifestes récents': manifs([A_HIER, 3], [A_JOUR, 3]), 'Relire la dernière archive': relOk(A_JOUR, 3), 'Lire le battement de la sauvegarde': bat26('2026-11-02T02:41:00Z') }
const REG_SAUV = { jour: '2026-11-02', debut_ms: NOW - 75000, dossier: DOSSIER, conservation_jours: 14 }
const sauvOk = { etape: 'sauvegarde', ok: true, code: 0, archive: A_JOUR, tables: 90, lignes: 123456, comptes: 12, ko: 4096, secondes: 61, raison: '' }
const aucun = (v) => v === undefined || v === null

// Chaque cas : { noeud (nom du nœud Code), titre, now, entree, noeuds, verifie(valeur) → message d'erreur | null }
const sortieUnique = (v) => (Array.isArray(v) && v.length === 1 ? v[0].json : null)
const CAS = {
  sauvegarde: [
    { noeud: 'Réglages de la sauvegarde', titre: 'le jour est celui de Paris (02h40 UTC)', now: Date.parse('2026-11-02T02:40:00Z'), verifie: (j) => (j.jour === '2026-11-02' && j.dossier === DOSSIER && j.conservation_jours === 14 && j.debut_ms === Date.parse('2026-11-02T02:40:00Z') ? null : `réglages inattendus ${JSON.stringify(j)}`) },
    { noeud: 'Réglages de la sauvegarde', titre: 'minuit passé à Paris, il est encore la veille en UTC', now: Date.parse('2026-11-01T23:30:00Z'), verifie: (j) => (j.jour === '2026-11-02' ? null : `jour ${j.jour}, attendu 2026-11-02`) },
    { noeud: 'Réglages de la sauvegarde', titre: 'heure d\'été : 22h30 UTC est déjà le lendemain à Paris', now: Date.parse('2026-07-01T22:30:00Z'), verifie: (j) => (j.jour === '2026-07-02' ? null : `jour ${j.jour}, attendu 2026-07-02`) },
    { noeud: 'Lire la sauvegarde', titre: 'sauvegarde réussie : bilan lu', entree: sshSortie(0, ligneBilan(A_JOUR)), verifie: (j) => (j.ok === true && j.code === 0 && j.archive === A_JOUR && j.tables === 90 && j.lignes === 123456 && j.comptes === 12 && j.ko === 4096 && j.secondes === 61 && j.raison === '' ? null : `bilan inattendu ${JSON.stringify(j)}`) },
    { noeud: 'Lire la sauvegarde', titre: 'échec (code 1) : refus, raison et détail', entree: sshSortie(1, '', '❌ OpenAPI illisible : la sauvegarde refuse et n\'écrit rien'), verifie: (j) => (j.ok === false && j.archive === null && /code 1/.test(j.raison) && /OpenAPI illisible/.test(j.raison) ? null : `raison ${j.raison}`) },
    { noeud: 'Lire la sauvegarde', titre: 'verrou (code 75) : une autre sauvegarde tournait', entree: sshSortie(75), verifie: (j) => (j.ok === false && /verrou/.test(j.raison) ? null : `raison ${j.raison}`) },
    { noeud: 'Lire la sauvegarde', titre: 'délai dépassé (code 124)', entree: sshSortie(124), verifie: (j) => (j.ok === false && /délai/.test(j.raison) ? null : `raison ${j.raison}`) },
    { noeud: 'Lire la sauvegarde', titre: 'tuée (code 137)', entree: sshSortie(137), verifie: (j) => (j.ok === false && /délai/.test(j.raison) ? null : `raison ${j.raison}`) },
    { noeud: 'Lire la sauvegarde', titre: 'préconditions absentes (code 2)', entree: sshSortie(2, '', 'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires.'), verifie: (j) => (j.ok === false && /préconditions/.test(j.raison) ? null : `raison ${j.raison}`) },
    { noeud: 'Lire la sauvegarde', titre: 'code 0 sans la ligne de bilan : jamais une réussite', entree: sshSortie(0, 'rien d\'utile\n'), verifie: (j) => (j.ok === false ? null : 'une sortie sans bilan passe pour une réussite') },
    { noeud: 'Lire la sauvegarde', titre: 'ligne de bilan mais code 1 : jamais une réussite', entree: sshSortie(1, ligneBilan(A_JOUR)), verifie: (j) => (j.ok === false ? null : 'un code 1 passe pour une réussite') },
    { noeud: 'Lire la sauvegarde', titre: 'connexion SSH refusée (sortie en erreur, sans code)', entree: { error: 'connect ECONNREFUSED 127.0.0.1:22' }, verifie: (j) => (j.ok === false && j.code === null && /SSH/.test(j.raison) ? null : `raison ${j.raison}`) },
    { noeud: 'Lire la sauvegarde', titre: 'un secret long dans la sortie n\'est jamais recopié', entree: sshSortie(1, '', 'échec avec eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdefghijklmnop dans le message'), verifie: (j) => (j.ok === false && !/eyJhbGciOi/.test(j.raison) ? null : `la raison laisse fuir : ${j.raison}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'sauvegarde et relecture vertes : bilan complet', noeuds: { 'Lire la sauvegarde': sauvOk, 'Relire la dernière archive': relOk(A_JOUR) }, verifie: (j) => (j.ok === true && j.etape_en_echec === null && j.tables === 90 && j.lignes === 123456 && j.comptes === 12 && j.ko === 4096 && j.secondes_sauvegarde === 61 && j.duree_totale_s === 75 && j.jour === '2026-11-02' && j.archive === A_JOUR ? null : `bilan inattendu ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'sauvegarde en échec : étape « sauvegarde », la relecture n\'a pas tourné', noeuds: { 'Lire la sauvegarde': { ...sauvOk, ok: false, code: 1, archive: null, tables: null, raison: 'la sauvegarde a refusé ou échoué (code 1)' }, 'Relire la dernière archive': null }, verifie: (j) => (j.ok === false && j.etape_en_echec === 'sauvegarde' && /code 1/.test(j.raison) ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'relecture absente alors que la sauvegarde est verte : échec', noeuds: { 'Lire la sauvegarde': sauvOk, 'Relire la dernière archive': null }, verifie: (j) => (j.ok === false && j.etape_en_echec === 'relecture' ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'relecture rouge (code 1) : échec', noeuds: { 'Lire la sauvegarde': sauvOk, 'Relire la dernière archive': sshSortie(1, `▶ Vérification de ${DOSSIER}/${A_JOUR}\n  ❌ table_fictive : 10 dans l'archive, 9 recomptées\n\n❌ 1 écart(s) : archive à ne pas croire\n`) }, verifie: (j) => (j.ok === false && j.etape_en_echec === 'relecture' && /rouge \(code 1\)/.test(j.raison) && /table_fictive/.test(j.raison) ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'relecture contradictoire (code 1 mais texte vert) : échec', noeuds: { 'Lire la sauvegarde': sauvOk, 'Relire la dernière archive': { ...relOk(A_JOUR), code: 1 } }, verifie: (j) => (j.ok === false && j.etape_en_echec === 'relecture' ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'relecture verte sans le texte de réussite : échec', noeuds: { 'Lire la sauvegarde': sauvOk, 'Relire la dernière archive': sshSortie(0, `▶ Vérification de ${DOSSIER}/${A_JOUR}\n`) }, verifie: (j) => (j.ok === false && j.etape_en_echec === 'relecture' ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'relecture au bon fichier et aux bons comptes, mais sans le texte de réussite : échec', noeuds: { 'Lire la sauvegarde': sauvOk, 'Relire la dernière archive': sshSortie(0, relOk(A_JOUR).stdout.replace('✅ archive relue, comptes égaux', 'fin')) }, verifie: (j) => (j.ok === false && j.etape_en_echec === 'relecture' ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'relecture d\'une AUTRE archive que celle du passage : échec', noeuds: { 'Lire la sauvegarde': sauvOk, 'Relire la dernière archive': relOk(A_HIER) }, verifie: (j) => (j.ok === false && j.etape_en_echec === 'relecture' && /pas porté/.test(j.raison) ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la sauvegarde', titre: 'le manifeste relu compte d\'autres tables : échec', noeuds: { 'Lire la sauvegarde': sauvOk, 'Relire la dernière archive': relOk(A_JOUR, 89) }, verifie: (j) => (j.ok === false && j.etape_en_echec === 'relecture' && /pas les mêmes tables/.test(j.raison) ? null : `bilan ${JSON.stringify(j)}`) },
  ],
  garde: [
    { noeud: 'Réglages de la garde', titre: 'le jour est celui de Paris', now: Date.parse('2026-11-01T23:30:00Z'), verifie: (j) => (j.jour === '2026-11-02' && j.battement_max_h === 26 && j.dossier === DOSSIER && j.maintenant_ms === Date.parse('2026-11-01T23:30:00Z') ? null : `réglages ${JSON.stringify(j)}`) },
    { noeud: 'Réglages de la garde', titre: 'jour de Paris, 02h00 UTC', now: Date.parse('2026-11-02T02:00:00Z'), verifie: (j) => (j.jour === '2026-11-02' ? null : `jour ${j.jour}`) },
    { noeud: 'Bilan de la garde', titre: 'archive du jour, relue, tables égales, battement récent : verte', ...garde(gardeVerte), verifie: (j) => (j.ok === true && j.alertes.length === 0 && j.archive_du_jour === A_JOUR && j.tables === 3 && j.tables_precedente === 3 && j.archive_precedente === A_HIER && j.battement_sauvegarde === 'ok' && j.battement_age_h === 16.3 ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la garde', titre: 'plus de tables qu\'hier : verte', ...garde({ ...gardeVerte, 'Lire les manifestes récents': manifs([A_HIER, 3], [A_JOUR, 4]), 'Relire la dernière archive': relOk(A_JOUR, 4) }), verifie: (j) => (j.ok === true ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'première archive, rien à comparer : verte', ...garde({ ...gardeVerte, 'Lire les manifestes récents': manifs([A_JOUR, 3]) }), verifie: (j) => (j.ok === true && j.archive_precedente === null ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la garde', titre: 'archive d\'hier sans comptes par table (v1) : pas de baisse inventée', ...garde({ ...gardeVerte, 'Lire les manifestes récents': manifs([A_HIER, '{"version":1}'], [A_JOUR, 3]) }), verifie: (j) => (j.ok === true ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'une archive de 23h30 UTC la veille est du jour à Paris', ...garde({ ...gardeVerte, 'Lire les manifestes récents': manifs([A_HIER, 3], ['2026-11-01T23-30-00-000Z.presti', 3]), 'Relire la dernière archive': relOk('2026-11-01T23-30-00-000Z.presti', 3) }), verifie: (j) => (j.ok === true && j.archive_du_jour === '2026-11-01T23-30-00-000Z.presti' ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la garde', titre: 'dossier vide : alerte « aucune archive »', ...garde({ ...gardeVerte, 'Lire les manifestes récents': sshSortie(0, '', 'ls: cannot access \'*.presti\'') }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /aucune archive/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'SSH en panne : alerte « n\'a pas pu être lu »', ...garde({ ...gardeVerte, 'Lire les manifestes récents': { error: 'connect ECONNREFUSED' } }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /pas pu être lu/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'pas d\'archive du jour : alerte', ...garde({ ...gardeVerte, 'Lire les manifestes récents': manifs(['2026-10-31T02-40-11-456Z.presti', 3], [A_HIER, 3]), 'Relire la dernière archive': relOk(A_HIER, 3) }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /pas d'archive du jour 2026-11-02/.test(a)) && j.archive_du_jour === null ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la garde', titre: 'relecture rouge de l\'archive du jour : alerte', ...garde({ ...gardeVerte, 'Relire la dernière archive': sshSortie(1, `▶ Vérification de ${DOSSIER}/${A_JOUR}\n  ❌ table_b : 2 dans l'archive, 1 recomptées\n\n❌ 1 écart(s)\n`) }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /relecture.*rouge \(code 1\)/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'relecture contradictoire (code 1, texte vert) : alerte', ...garde({ ...gardeVerte, 'Relire la dernière archive': { ...relOk(A_JOUR, 3), code: 1 } }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /rouge/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'relecture verte mais sans le texte de réussite : alerte', ...garde({ ...gardeVerte, 'Relire la dernière archive': sshSortie(0, `▶ Vérification de ${DOSSIER}/${A_JOUR}\n`) }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /rouge/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'relecture qui n\'a pas porté sur l\'archive du jour : alerte', ...garde({ ...gardeVerte, 'Relire la dernière archive': relOk(A_HIER, 3) }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /pas porté/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'relecture qui n\'a pas tourné : alerte', ...garde({ ...gardeVerte, 'Relire la dernière archive': null }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /rouge \(code inconnu\)/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'tables en baisse (2 contre 3) : alerte', ...garde({ ...gardeVerte, 'Lire les manifestes récents': manifs([A_HIER, 3], [A_JOUR, 2]), 'Relire la dernière archive': relOk(A_JOUR, 2) }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /baisse : 2 aujourd'hui, 3/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'une seule table en moins suffit : alerte (90 contre 91)', ...garde({ ...gardeVerte, 'Lire les manifestes récents': manifs([A_HIER, 91], [A_JOUR, 90]), 'Relire la dernière archive': relOk(A_JOUR, 90) }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /baisse/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'manifeste du jour illisible : alerte', ...garde({ ...gardeVerte, 'Lire les manifestes récents': manifs([A_HIER, 3], [A_JOUR, 'ceci n\'est pas du JSON']) }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /illisible/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'battement absent : alerte', ...garde({ ...gardeVerte, 'Lire le battement de la sauvegarde': sshSortie(1, '', 'cat: ...: No such file or directory') }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /battement.*manque/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'battement illisible : alerte', ...garde({ ...gardeVerte, 'Lire le battement de la sauvegarde': sshSortie(0, 'n\'importe quoi\n') }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /battement.*illisible/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'battement de 30 h : alerte', ...garde({ ...gardeVerte, 'Lire le battement de la sauvegarde': bat26('2026-11-01T13:00:00Z') }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /plus de 26 h \(30 h\)/.test(a)) ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'battement d\'exactement 26 h : tient (≤ 26 h)', ...garde({ ...gardeVerte, 'Lire le battement de la sauvegarde': bat26('2026-11-01T17:00:00Z') }), verifie: (j) => (j.ok === true && j.battement_age_h === 26 ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la garde', titre: 'battement de 26,1 h : alerte', ...garde({ ...gardeVerte, 'Lire le battement de la sauvegarde': bat26('2026-11-01T16:54:00Z') }), verifie: (j) => (j.ok === false && j.alertes.some((a) => /plus de 26 h/.test(a)) ? null : `bilan ${JSON.stringify(j)}`) },
    { noeud: 'Bilan de la garde', titre: 'plusieurs écarts : toutes les alertes sont rendues', ...garde({ 'Lire les manifestes récents': manifs([A_HIER, 3], [A_JOUR, 2]), 'Relire la dernière archive': sshSortie(1, `▶ Vérification de ${DOSSIER}/${A_JOUR}\n`), 'Lire le battement de la sauvegarde': sshSortie(1) }), verifie: (j) => (j.ok === false && j.alertes.length === 3 ? null : `alertes ${JSON.stringify(j.alertes)}`) },
    { noeud: 'Bilan de la garde', titre: 'le battement en échec de la sauvegarde est rapporté sans alerte propre', ...garde({ ...gardeVerte, 'Lire le battement de la sauvegarde': bat26('2026-11-02T02:41:00Z', 'echec') }), verifie: (j) => (j.battement_sauvegarde === 'echec' && j.alertes.length === 0 ? null : `bilan ${JSON.stringify(j)}`) },
  ],
}

export function jugerCode(wf, kind) {
  const ko = []
  const cas = CAS[kind]
  const entrees = cas.map((c) => {
    const code = (wf.nodes ?? []).find((n) => n.name === c.noeud)?.parameters?.jsCode
    return { code: typeof code === 'string' ? code : 'throw new Error("code absent")', now: c.now ?? NOW, entree: c.entree ?? {}, noeuds: { ...(kind === 'sauvegarde' ? { 'Réglages de la sauvegarde': REG_SAUV } : {}), ...(c.noeuds ?? {}) } }
  })
  const sorties = rejouer(entrees)
  cas.forEach((c, i) => {
    const s = sorties[i]
    if (!s.ok) { ko.push(`C1 [${c.noeud}] ${c.titre} : le code a échoué (${s.erreur})`); return }
    const j = sortieUnique(s.valeur)
    if (j === null) { ko.push(`C1 [${c.noeud}] ${c.titre} : la sortie doit être un seul élément { json }`); return }
    const m = c.verifie(j)
    if (m) ko.push(`C2 [${c.noeud}] ${c.titre} : ${m}`)
  })
  return ko
}

// ─── La suite complète d'un export ───────────────────────────────────────────────────────────────────────────────────────────────
function suite(wf, kind, { empreintes = true } = {}) {
  return [...jugerStructure(wf, SPEC[kind]), ...(empreintes ? jugerEmpreintes(wf, kind) : []), ...jugerCode(wf, kind)]
}

// ─── Les mutants ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const retirer = (wf, nom) => { wf.nodes = wf.nodes.filter((n) => n.name !== nom); delete wf.connections[nom]; for (const s of Object.keys(wf.connections)) wf.connections[s].main = wf.connections[s].main.map((l) => l.filter((c) => c.node !== nom)) }
const relier = (wf, de, vers, sortie = 0) => { wf.connections[de] ??= { main: [] }; while (wf.connections[de].main.length <= sortie) wf.connections[de].main.push([]); wf.connections[de].main[sortie].push({ node: vers, type: 'main', index: 0 }) }
const remplacer = (wf, nom, champ, de, vers) => { const n = noeud(wf, nom); const t = champ === 'jsCode' ? n.parameters.jsCode : n.parameters[champ]; if (!t.includes(de)) throw new Error(`mutant : « ${de} » introuvable dans ${nom}.${champ}`); if (champ === 'jsCode') n.parameters.jsCode = t.replace(de, vers); else n.parameters[champ] = t.replace(de, vers) }

function mutants(kind) {
  const S = kind === 'sauvegarde'
  const T = S ? 'Déclencheur 3 h 40' : 'Déclencheur 4 h'
  const ALERTE = S ? 'Alerte Slack (échec)' : 'Alerte Slack (garde)'
  const SI = S ? 'Sauvegarde et relecture réussies ?' : 'Garde satisfaite ?'
  const BAT = S ? 'Écrire le battement' : 'Écrire le battement de la garde'
  const BILAN = S ? 'Bilan de la sauvegarde' : 'Bilan de la garde'
  const RELIRE_N = 'Relire la dernière archive'
  const structure = [
    ['activé (active: true)', (w) => { w.active = true }, /^R1 active/],
    ['version publiée', (w) => { w.activeVersionId = 'abc'; w.activeVersion = { id: 'abc' } }, /^R1 une version publiée/],
    ['mauvais fuseau (UTC)', (w) => { w.settings.timezone = 'UTC' }, /^R4 fuseau/],
    ['mauvais fuseau (America/New_York)', (w) => { w.settings.timezone = 'America/New_York' }, /^R4 fuseau/],
    ['mauvaise heure', (w) => { noeud(w, T).parameters.rule.interval[0].triggerAtHour += 1 }, /^R4 horaire/],
    ['mauvaise minute', (w) => { noeud(w, T).parameters.rule.interval[0].triggerAtMinute += 1 }, /^R4 horaire/],
    ['un second horaire', (w) => { noeud(w, T).parameters.rule.interval.push({ field: 'hours', hoursInterval: 1 }) }, /^R4 horaire/],
    ['alerte retirée (nœud Slack ôté)', (w) => { retirer(w, ALERTE) }, /^R3 nœud absent|^R10/],
    ['alerte débranchée de la sortie d\'échec', (w) => { w.connections[SI].main[1] = [] }, /^R9|^R10/],
    ['alerte câblée sur la réussite', (w) => { relier(w, SI, ALERTE, 0) }, /^R9|^R10 .*atteignable depuis la réussite/],
    ['alerte à chaque passage (battement → Slack)', (w) => { relier(w, BAT, ALERTE, 0) }, /^R9|^R10/],
    ['branche d\'erreur coupée', (w) => { w.connections['Échec du workflow'].main = [[]] }, /^R9|^R10 la branche d'erreur/],
    ['Error Trigger retiré', (w) => { retirer(w, 'Échec du workflow') }, /^R3 nœud absent|^R10/],
    ['battement retiré', (w) => { retirer(w, BAT) }, /^R3 nœud absent|^R11/],
    ['battement après la décision', (w) => { w.connections[BILAN].main[0] = [{ node: SI, type: 'main', index: 0 }]; w.connections[BAT] = { main: [[{ node: ALERTE, type: 'main', index: 0 }]] }; w.connections[SI].main = [[]]; if (S) w.connections[SI].main = [[], []] }, /^R9|^R11|^R10/],
    ['canal Slack changé', (w) => { noeud(w, ALERTE).parameters.channelId.value = 'general' }, /^R7/],
    ['texte Slack sans la raison', (w) => { const n = noeud(w, ALERTE); n.parameters.text = n.parameters.text.replace(S ? 'raison' : 'alertes', 'x') }, /^R7/],
    ['identifiant Slack changé', (w) => { noeud(w, ALERTE).credentials = { slackApi: { id: 'AutreIdentifiant01', name: 'Slack account' } } }, /^R2 .*identifiant Slack existant/],
    ['identifiant SSH créé', (w) => { noeud(w, RELIRE_N).credentials = { sshPrivateKey: { id: 'IdentifiantCree01', name: 'Hôte Oracle' } } }, /^R2 .*identifiant SSH/],
    // Fausse clé assemblée à l'exécution : écrite d'un bloc, sa forme de vraie clé fait refuser le commit (scripts/garde-commit.mjs).
    ['secret dans une note', (w) => { w.nodes.find((n) => n.type === 'n8n-nodes-base.stickyNote').parameters.content += ' sb_' + 'secret_AbCdEfGhIjKlMnOpQrSt' }, /^R2 secret/],
    ['clé privée dans une commande', (w) => { noeud(w, RELIRE_N).parameters.command += ' # -----BEGIN OPENSSH PRIVATE KEY-----' }, /^R2 secret|^R6/],
    ['délai d\'exécution ôté', (w) => { delete w.settings.executionTimeout }, /^R5 executionTimeout/],
    ['délai d\'exécution démesuré', (w) => { w.settings.executionTimeout = 86400 }, /^R5 executionTimeout/],
    ['workflow d\'erreur branché (errorWorkflow)', (w) => { w.settings.errorWorkflow = 'AutreWorkflow01' }, /^R5 réglages/],
    ['données de succès non gardées', (w) => { w.settings.saveDataSuccessExecution = 'none' }, /^R5 réglages/],
    ['un nœud HTTP ajouté', (w) => { w.nodes.push({ id: 'h', name: 'Appel', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.5, position: [0, 0], parameters: {} }) }, /^R3/],
    ['un nœud Execute Command ajouté', (w) => { w.nodes.push({ id: 'x', name: 'Commande locale', type: 'n8n-nodes-base.executeCommand', typeVersion: 1, position: [0, 0], parameters: {} }) }, /^R3/],
    ['onError ôté du premier SSH', (w) => { delete noeud(w, S ? 'Lancer la sauvegarde' : 'Lire les manifestes récents').onError }, /^R6 .*onError/],
    ['executeOnce ôté', (w) => { delete noeud(w, RELIRE_N).executeOnce }, /^R6 .*executeOnce/],
    ['commande de relecture sans --dernier', (w) => { remplacer(w, RELIRE_N, 'command', ' --dernier', '') }, /^R6/],
    ['commande de relecture sans --verifier', (w) => { remplacer(w, RELIRE_N, 'command', '--verifier ', '') }, /^R6/],
    ['dossier de relecture changé', (w) => { remplacer(w, RELIRE_N, 'command', DOSSIER, '/tmp/ailleurs') }, /^R6/],
    ['dossier de travail changé', (w) => { noeud(w, RELIRE_N).parameters.cwd = '/' }, /^R6/],
    ['délai de relecture ôté', (w) => { remplacer(w, RELIRE_N, 'command', 'timeout -k 10 120 ', '') }, /^R6/],
    ['relecture vers un autre script', (w) => { remplacer(w, RELIRE_N, 'command', 'scripts/sauvegarde.mjs', 'scripts/restaurer.mjs') }, /^R6/],
    ['battement vers un autre fichier', (w) => { remplacer(w, BAT, 'command', 'battement-', 'autre-') }, /^R6/],
    ['battement toujours « ok »', (w) => { const n = noeud(w, BAT); n.parameters.command = n.parameters.command.replace(/\{\{[^}]*\}\}/, 'ok') }, /^R6/],
    ['condition inversée', (w) => { const c = noeud(w, SI).parameters.conditions.conditions[0]; c.operator.operation = 'false' }, /^R8/],
    ['condition toujours vraie', (w) => { const c = noeud(w, SI).parameters.conditions.conditions[0]; c.leftValue = '={{ true }}' }, /^R8/],
    ['code qui lit le réseau', (w) => { noeud(w, BILAN).parameters.jsCode += "\nconst r = fetch('https://exemple.test')" }, /^R12|^E1/],
    ['note sans le brief', (w) => { w.nodes.find((n) => n.type === 'n8n-nodes-base.stickyNote').parameters.content = 'rien' }, /^R13/],
  ]
  if (S) {
    structure.push(
      ['commande de sauvegarde sans le verrou', (w) => { remplacer(w, 'Lancer la sauvegarde', 'command', 'flock -n -E 75 /tmp/presti-sauvegarde.verrou ', '') }, /^R6/],
      ['commande de sauvegarde sans délai', (w) => { remplacer(w, 'Lancer la sauvegarde', 'command', 'timeout -k 30 900 ', '') }, /^R6/],
      ['commande de sauvegarde en clair (--sans-chiffrer)', (w) => { noeud(w, 'Lancer la sauvegarde').parameters.command += ' --sans-chiffrer' }, /^R6/],
      ['sauvegarde avec les fichiers (--fichiers)', (w) => { noeud(w, 'Lancer la sauvegarde').parameters.command += ' --fichiers' }, /^R6/],
      ['purge à 0 jour', (w) => { remplacer(w, 'Purger les archives de plus de 14 jours', 'command', '-mtime +14', '-mtime +0') }, /^R6/],
      ['purge hors du dossier', (w) => { remplacer(w, 'Purger les archives de plus de 14 jours', 'command', DOSSIER, '/home/usine') }, /^R6/],
      ['purge de tout le dossier', (w) => { remplacer(w, 'Purger les archives de plus de 14 jours', 'command', " -name '*.presti'", '') }, /^R6/],
      ['purge avant la relecture', (w) => { relier(w, 'Lancer la sauvegarde', 'Purger les archives de plus de 14 jours', 0) }, /^R9/],
    )
  } else {
    structure.push(
      ['lecture du manifeste d\'un autre dossier', (w) => { noeud(w, 'Lire les manifestes récents').parameters.cwd = '/tmp' }, /^R6/],
      ['trois manifestes réduits à un', (w) => { remplacer(w, 'Lire les manifestes récents', 'command', 'tail -n 3', 'tail -n 1') }, /^R6/],
      ['battement de la sauvegarde lu ailleurs', (w) => { remplacer(w, 'Lire le battement de la sauvegarde', 'command', 'battement-sauvegarde', 'battement-garde') }, /^R6/],
      ['garde sans la lecture du battement', (w) => { retirer(w, 'Lire le battement de la sauvegarde') }, /^R3/],
    )
  }
  // Les mutants du CODE : jugés SANS les empreintes, pour prouver que le rejeu les voit (l'empreinte seule les verrait toujours).
  const code = S ? [
    ['bilan : relecture non exigée verte', 'Bilan de la sauvegarde', 'r.code === 0 && ', ''],
    ['bilan : archive relue non comparée', 'Bilan de la sauvegarde', "verif[1].split('/').pop() !== s.archive", 'false'],
    ['bilan : tables non comparées', 'Bilan de la sauvegarde', 'Number(man[3]) !== s.tables', 'false'],
    ['bilan : texte de réussite non exigé', 'Bilan de la sauvegarde', " && sortie.includes('archive relue, comptes égaux')", ''],
    ['bilan : échec de la sauvegarde ignoré', 'Bilan de la sauvegarde', 'if (!s.ok) {', 'if (false) {'],
    ['bilan : durée fausse', 'Bilan de la sauvegarde', 'Date.now() - reg.debut_ms', 'Date.now() + reg.debut_ms'],
    ['lecture : code non exigé', 'Lire la sauvegarde', 'code === 0 && m !== null', 'm !== null'],
    ['lecture : verrou confondu', 'Lire la sauvegarde', 'if (code === 75)', 'if (code === 76)'],
    ['lecture : tables fausses', 'Lire la sauvegarde', 'Number(m[2])', 'Number(m[3])'],
    ['lecture : secret recopié', 'Lire la sauvegarde', '{32,}', '{3200,}'],
    ['réglages : jour en UTC', 'Réglages de la sauvegarde', "timeZone: 'Europe/Paris'", "timeZone: 'UTC'"],
    ['réglages : conservation 7 jours', 'Réglages de la sauvegarde', 'conservation_jours: 14', 'conservation_jours: 7'],
  ] : [
    ['garde : baisse non vue', 'Bilan de la garde', 'duJour.tables < precedente.tables', 'false'],
    ['garde : égalité prise pour une baisse', 'Bilan de la garde', 'duJour.tables < precedente.tables', 'duJour.tables <= precedente.tables'],
    ['garde : n\'importe quelle archive vaut celle du jour', 'Bilan de la garde', 'a.jour === reg.jour', 'a.jour !== null'],
    ['garde : jour des archives en UTC', 'Bilan de la garde', "timeZone: 'Europe/Paris'", "timeZone: 'UTC'"],
    ['garde : relecture non exigée', 'Bilan de la garde', 'relecture === null || relecture.code !== 0 || ', 'relecture === null || '],
    ['garde : texte de réussite non exigé', 'Bilan de la garde', " || !sortie.includes('archive relue, comptes égaux')", ''],
    ['garde : archive relue non comparée', 'Bilan de la garde', 'relecturePortee !== duJour.nom', 'false'],
    ['garde : battement trop vieux accepté', 'Bilan de la garde', 'if (!(ageH <= reg.battement_max_h))', 'if (false)'],
    ['garde : limite de 26 h exclue', 'Bilan de la garde', 'ageH <= reg.battement_max_h', 'ageH < reg.battement_max_h'],
    ['garde : battement absent toléré', 'Bilan de la garde', 'if (battement === null || battement.code !== 0 || !bm)', 'if (false)'],
    ['garde : dossier vide toléré', 'Bilan de la garde', 'archives.length === 0', 'false'],
    ['garde : aucune archive du jour tolérée', 'Bilan de la garde', 'archives.length > 0 && duJour === null', 'false'],
    ['garde : SSH en panne toléré', 'Bilan de la garde', "if (manifestes === null || typeof manifestes.code !== 'number') {", 'if (false) {'],
    ['garde : manifeste illisible toléré', 'Bilan de la garde', 'if (duJour.tables === null) {', 'if (false) {'],
    ['réglages : jour en UTC', 'Réglages de la garde', "timeZone: 'Europe/Paris'", "timeZone: 'UTC'"],
    ['réglages : limite de 48 h', 'Réglages de la garde', 'battement_max_h: 26', 'battement_max_h: 48'],
  ]
  return { structure, code }
}

// ─── Exécution ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const exports_ = { sauvegarde: lire(EXPORT_SAUV), garde: lire(EXPORT_GARDE) }

if (process.argv.includes('--empreintes')) {
  for (const [kind, wf] of Object.entries(exports_)) for (const nom of SPEC[kind].codes) console.log(`${kind} | ${nom} | ${sha(noeud(wf, nom).parameters.jsCode)}`)
  process.exit(0)
}

let echecs = 0
const verifies = []
const ok = (t) => { console.log(`  ✅ ${t}`) }
const ko = (t, d) => { echecs++; console.log(`  ❌ ${t}${d ? ` — ${d}` : ''}`) }

for (const [kind, wf] of Object.entries(exports_)) {
  console.log(`\n▶ ${SPEC[kind].nom} — l'export réel (${kind === 'sauvegarde' ? EXPORT_SAUV : EXPORT_GARDE}) contre la spécification`)
  const r = suite(wf, kind)
  if (r.length === 0) ok(`structure, empreintes et ${CAS[kind].length} cas rejoués : rien à redire`)
  else for (const m of r) ko(m)
  const n = CAS[kind].length
  verifies.push(`${SPEC[kind].nom} : ${n} cas rejoués`)
}

console.log('\n▶ mutants — chacun doit faire rougir la suite, pour sa raison')
for (const [kind, wf] of Object.entries(exports_)) {
  const { structure, code } = mutants(kind)
  for (const [titre, fn, attendu] of structure) {
    const m = copie(wf)
    try { fn(m) } catch (e) { ko(`mutant « ${titre} » (${kind}) : ${e.message}`); continue }
    const r = [...jugerStructure(m, SPEC[kind]), ...jugerEmpreintes(m, kind)]
    if (r.length === 0) ko(`mutant « ${titre} » (${kind}) SURVIT`)
    else if (!r.some((x) => attendu.test(x))) ko(`mutant « ${titre} » (${kind}) rougit pour une autre raison`, r[0].slice(0, 140))
    else ok(`mutant « ${titre} » (${kind}) tué — ${r.length} vérification(s) rougissent`)
  }
  for (const [titre, nom, de, vers] of code) {
    const m = copie(wf)
    try { remplacer(m, nom, 'jsCode', de, vers) } catch (e) { ko(`mutant « ${titre} » (${kind}) : ${e.message}`); continue }
    // Jugé SANS les empreintes : c'est le rejeu qui doit le voir.
    const r = jugerCode(m, kind)
    if (r.length === 0) ko(`mutant de code « ${titre} » (${kind}) SURVIT au rejeu`)
    else ok(`mutant de code « ${titre} » (${kind}) tué par le rejeu — ${r.length} cas rougissent`)
    // Et l'empreinte seule le voit aussi.
    if (jugerEmpreintes(m, kind).length === 0) ko(`mutant de code « ${titre} » (${kind}) : l'empreinte ne bouge pas`)
  }
}

console.log(`\n${verifies.join(' ; ')}`)
console.log(echecs ? `\n❌ sauvegarde-n8n-qa : ${echecs} échec(s)` : '\n✅ sauvegarde-n8n-qa VERTE')
process.exit(echecs ? 1 : 0)
