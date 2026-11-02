// 032-038 — contrôle mécanique des sept workflows tels que le n8n d'Oracle les rend AUJOURD'HUI (MCP n8n-oracle get_workflow_details,
// réponses enregistrées par le harnais : journal de session, ou fichier tool-results quand la réponse dépasse la limite).
// Lecture seule : ce script n'écrit rien, n'appelle aucun réseau. Il compare l'état en ligne aux exports reposés par 032-037, aux juges
// (empreintes sha256 des nœuds Code) et aux droits de colonnes des migrations 0189, 0190, 0191.
// Usage : node .orchestre/preuves/032-038/controle-en-ligne.mjs <journal.jsonl> <tool-results des détecteurs>
import fs from 'node:fs'
import crypto from 'node:crypto'

const [journal, ...fichiers] = process.argv.slice(2)
const ERREURS = 'AQeHiC58UgbMR4Kr'
const VERSION_ERREURS = 'feb50b6a-9cb2-48b8-8143-ca50845c06cd'
const CIBLES = {
  '2HsfV00lGSX1KGY1': { exp: '.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json', juges: ['scripts/suivi-artisan-qa.mjs'] },
  'xPIDCvkp8Gk08A2E': { exp: '.orchestre/preuves/032-013/presti-briefing-matin.workflow.json', juges: ['scripts/briefing-n8n-qa.mjs'] },
  'J8pduyxn9seR8Z9t': { exp: '.orchestre/preuves/032-019/presti-detecteurs.workflow.json', juges: ['scripts/detecteurs-n8n-qa.mjs'] },
  '16Gbnw1jg1JmFbfV': { exp: '.orchestre/preuves/032-023/presti-sauvegarde.workflow.json', juges: ['scripts/sauvegarde-n8n-qa.mjs'] },
  '2uovL6sfTnINC3ka': { exp: '.orchestre/preuves/032-023/presti-garde-sauvegarde.workflow.json', juges: ['scripts/sauvegarde-n8n-qa.mjs'] },
  '4R2wS9374GUxb63F': { exp: '.orchestre/preuves/032-026/presti-demande-demo.workflow.json', juges: ['scripts/demandes-demo-qa.mjs'] },
  [ERREURS]: { exp: '.orchestre/preuves/032-033/presti-erreurs.workflow.json', juges: [] },
}

// 1. Les réponses du MCP (la dernière l'emporte).
const vus = {}
const prendre = (texte, origine) => {
  let j; try { j = JSON.parse(texte) } catch { return }
  const w = j && j.workflow
  if (w && CIBLES[w.id] && Array.isArray(w.nodes) && w.scopes) vus[w.id] = { w, origine }
}
for (const ligne of fs.readFileSync(journal, 'utf8').split('\n')) {
  if (!ligne.includes('"workflow"')) continue
  let e; try { e = JSON.parse(ligne) } catch { continue }
  const contenu = e?.message?.content
  if (!Array.isArray(contenu)) continue
  for (const c of contenu) if (c.type === 'tool_result') {
    const parts = Array.isArray(c.content) ? c.content : [{ type: 'text', text: c.content }]
    for (const p of parts) if (p && p.type === 'text' && typeof p.text === 'string') prendre(p.text, 'journal')
  }
}
for (const f of fichiers) prendre(fs.readFileSync(f, 'utf8'), 'tool-results')

// 2. Droits de colonnes : 0189 (appliquée ? non prouvé ici), 0190 et 0191 (NON APPLIQUÉES).
const droits = {}
const ajouterDroits = (fichier, origine) => {
  const sql = fs.readFileSync(fichier, 'utf8')
  for (const m of sql.matchAll(/grant select \(([^)]+)\) on public\.(\w+) to n8n_lecture/g)) {
    droits[m[2]] ??= new Map()
    for (const c of m[1].split(',').map((s) => s.trim())) if (!droits[m[2]].has(c)) droits[m[2]].set(c, origine)
  }
}
ajouterDroits('supabase/migrations/0189_role_lecture_n8n.sql', '0189')
ajouterDroits('supabase/migrations/0190_demandes_demo.sql', '0190 (non appliquée)')
ajouterDroits('supabase/migrations/0191_suivi_artisan_envois.sql', '0191 (non appliquée)')

// 3. Types de nœuds : ce qui ne fait QUE lire ou calculer, et ce qui envoie ou écrit.
const SANS_EFFET = new Set(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.code', 'n8n-nodes-base.stickyNote', 'n8n-nodes-base.if', 'n8n-nodes-base.errorTrigger'])
const ENVOI = /slack|email|gmail|telegram|twilio|sms|discord|mattermost|webhook|respondToWebhook|whatsapp|brevo|sendInBlue|mailchimp|resend/i
const ECRITURE = /postgres|supabase|mysql|ssh|executeCommand|writeBinaryFile|readWriteFile|ftp|googleSheets|airtable|notion|s3|executeWorkflow/i
const sha = (o) => crypto.createHash('sha256').update(typeof o === 'string' ? o : JSON.stringify(o)).digest('hex')
const tousLesJuges = fs.readdirSync('scripts').filter((f) => f.endsWith('.mjs')).map((f) => ['scripts/' + f, fs.readFileSync('scripts/' + f, 'utf8')])

// Nœuds atteignables depuis un nœud (pour dire si un envoi n'est que dans la branche d'erreur interne).
const atteignables = (w, depart) => {
  const vu = new Set([depart]); const pile = [depart]
  while (pile.length) for (const sorties of w.connections[pile.pop()]?.main ?? []) for (const l of sorties ?? []) if (!vu.has(l.node)) { vu.add(l.node); pile.push(l.node) }
  return vu
}

let ko = 0
for (const [id, { exp, juges }] of Object.entries(CIBLES)) {
  const v = vus[id]
  if (!v) { console.log(`\n## ${id} : ABSENT des réponses du MCP`); ko++; continue }
  const w = v.w
  console.log(`\n## ${w.name} (${id}) — lu en ligne (${v.origine})`)
  // État et réglages.
  const s = w.settings ?? {}
  console.log(`état : active=${w.active} activeVersionId=${w.activeVersionId} triggerCount=${w.triggerCount} versionId=${w.versionId} isArchived=${w.isArchived}`)
  console.log(`réglages : ${JSON.stringify(s)}`)
  if (id === ERREURS) {
    const okE = w.active === true && w.activeVersionId === VERSION_ERREURS && w.versionId === VERSION_ERREURS && w.activeVersion?.sameAsDraft === true && s.errorWorkflow === undefined
    console.log(`${okE ? 'ok   ' : 'ÉCART'} publié en ${VERSION_ERREURS}, brouillon = version publiée, sans errorWorkflow (pas de boucle)`)
    if (!okE) ko++
  } else {
    const verifs = [
      ['inactif et jamais publié', w.active === false && w.activeVersionId === null && w.triggerCount === 0],
      [`errorWorkflow = presti-erreurs (${ERREURS})`, s.errorWorkflow === ERREURS],
      ['saveDataSuccessExecution = none', s.saveDataSuccessExecution === 'none'],
      ['saveDataErrorExecution = all (durée : purge de l\'instance, aucun réglage par workflow)', s.saveDataErrorExecution === 'all'],
      ['saveManualExecutions absent (défaut de l\'instance)', s.saveManualExecutions === undefined],
      ['fuseau Europe/Paris', s.timezone === 'Europe/Paris'],
    ]
    for (const [quoi, ok] of verifs) { console.log(`${ok ? 'ok   ' : 'ÉCART'} ${quoi}`); if (!ok) ko++ }
    console.log(`info  executionTimeout = ${s.executionTimeout ?? 'absent (défaut de l\'instance)'} ; availableInMCP = ${s.availableInMCP}`)
  }
  // En ligne = export reposé.
  let e = JSON.parse(fs.readFileSync(exp, 'utf8')); e = e.workflow || e
  const egal = [['nodes', sha(w.nodes) === sha(e.nodes)], ['connections', sha(w.connections) === sha(e.connections)], ['versionId', w.versionId === e.versionId], ['settings', sha(w.settings) === sha(e.settings)]]
  console.log(`${egal.every(([, b]) => b) ? 'ok   ' : 'ÉCART'} en ligne = export ${exp} : ${egal.map(([k, b]) => `${k} ${b ? 'identiques' : 'DIFFÉRENTS'}`).join(', ')} (sha nodes ${sha(w.nodes).slice(0, 12)})`)
  if (!egal.every(([, b]) => b)) ko++
  // Inventaire des nœuds.
  const types = {}
  for (const n of w.nodes) types[n.type.replace('n8n-nodes-base.', '')] = (types[n.type.replace('n8n-nodes-base.', '')] ?? 0) + 1
  console.log(`nœuds (${w.nodes.length}) : ${Object.entries(types).map(([t, c]) => `${t}×${c}`).join(', ')}`)
  const desactives = w.nodes.filter((n) => n.disabled)
  if (desactives.length) console.log(`info  nœuds désactivés : ${desactives.map((n) => n.name).join(', ')}`)
  const declencheurs = w.nodes.filter((n) => n.type === 'n8n-nodes-base.scheduleTrigger').map((n) => n.name)
  const principal = new Set(declencheurs.flatMap((d) => [...atteignables(w, d)]))
  const interne = new Set(w.nodes.filter((n) => n.type === 'n8n-nodes-base.errorTrigger').flatMap((n) => [...atteignables(w, n.name)]))
  for (const n of w.nodes) {
    const t = n.type.replace('n8n-nodes-base.', '')
    const p = n.parameters ?? {}
    if (n.type === 'n8n-nodes-base.httpRequest') {
      const methode = p.method ?? 'GET'
      const url = String(p.url ?? '')
      const table = url.split('/rest/v1/')[1]
      const sel = (p.queryParameters?.parameters ?? []).find((q) => q.name === 'select')?.value?.split(',') ?? ['(aucun select : toutes colonnes)']
      const d = droits[table]
      const hors = d ? sel.filter((c) => !d.has(c)) : sel
      const origines = d ? [...new Set(sel.filter((c) => d.has(c)).map((c) => d.get(c)))] : []
      const corps = p.sendBody === true || p.sendHeaders === true || p.body !== undefined
      const okH = methode === 'GET' && url.startsWith('https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/') && !corps
      console.log(`${okH ? 'lect.' : 'ÉCART'} ${n.name} : ${methode} ${table} (${sel.join(',')})${corps ? ' AVEC CORPS OU EN-TÊTES' : ''} — droits ${hors.length ? (d ? 'hors grants : ' + hors.join(',') : 'TABLE SANS GRANT n8n_lecture') : 'dans ' + origines.join(' + ')}`)
      if (!okH) ko++
    } else if (n.type === 'n8n-nodes-base.supabase') {
      const okS = p.operation === 'getAll' || p.operation === 'get'
      console.log(`${okS ? 'lect.' : 'ÉCART'} ${n.name} : nœud Supabase opération ${p.operation ?? '(défaut)'} table ${p.tableId} limit ${p.limit} returnAll ${p.returnAll ?? false}`)
      if (!okS) ko++
    } else if (!SANS_EFFET.has(n.type)) {
      const genre = ENVOI.test(t) ? 'ENVOI' : ECRITURE.test(t) ? 'ÉCRITURE/HÔTE' : 'AUTRE'
      const ou = principal.has(n.name) ? 'branche principale' : interne.has(n.name) ? 'branche d\'erreur interne seulement' : 'non atteignable'
      const cred = n.credentials ? Object.entries(n.credentials).map(([k, c]) => `${k}:${c.name}`).join(',') : 'AUCUN identifiant'
      console.log(`${genre.padEnd(5)} ${n.name} : ${t} ${p.operation ?? ''} [${ou}] [${cred}]${p.command ? ' — ' + String(p.command).slice(0, 90) : ''}`)
    }
  }
  // Empreintes des nœuds Code contre les juges.
  const codes = w.nodes.filter((n) => n.type === 'n8n-nodes-base.code')
  let trouves = 0
  const ailleurs = []
  for (const n of codes) {
    const h = sha(n.parameters.jsCode)
    if (juges.some((j) => fs.readFileSync(j, 'utf8').includes(h))) trouves++
    else {
      const autres = tousLesJuges.filter(([, txt]) => txt.includes(h)).map(([f]) => f)
      ailleurs.push(`${n.name}${autres.length ? ' (dans ' + autres.join(', ') + ')' : ' (dans AUCUN script)'}`)
    }
  }
  if (juges.length) {
    console.log(`${ailleurs.length ? 'ÉCART' : 'ok   '} empreintes des nœuds Code : ${trouves}/${codes.length} dans ${juges.join(', ')}${ailleurs.length ? ' ; absentes : ' + ailleurs.join(' ; ') : ''}`)
    if (ailleurs.length) ko++
  } else console.log(`info  empreintes des nœuds Code : ${codes.length} nœud(s) ; pas de juge de lot désigné ; ${ailleurs.join(' ; ') || '—'}`)
}
console.log(`\nÉCARTS : ${ko}`)
process.exit(ko ? 1 : 0)
