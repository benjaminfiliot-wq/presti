// 036-014 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la tâche (traces .jsonl du harnais : les sous-agents qui ont recopié les trois gabarits
// dans n8n, et la session principale qui a rejoué les essais), comme 035-003 à 036-005 :
//   • les exports : dernière réponse de `get_workflow_details` (détail complet) de chaque gabarit → <nom>.workflow.json (on n'ôte que `scopes`, ajoute `exporte_le` et `source`) ;
//   • le registre des empreintes SHA-256 des nœuds Code → empreintes-code.json ;
//   • la fidélité de la copie : nœuds Code de n8n = ceux de la fabrique, OCTET POUR OCTET ; mêmes nœuds, mêmes liens, paramètres de la fabrique tous présents ;
//   • les essais : le DERNIER `test_workflow` relu par `get_workflow_execution` pour chaque essai → essais-n8n.json, comparé à ce que le rejeu hors ligne rend.
//   node .orchestre/preuves/036-014/rapatrier.mjs <trace1.jsonl> [<trace2.jsonl> …]
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as C from './construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url)), RACINE = path.resolve(ICI, '../../..')
const NOMS = ['gabarit-artisan-devis', 'gabarit-artisan-suivi', 'gabarit-artisan-facturation']
const traces = process.argv.slice(2)
if (!traces.length) { console.error('usage : rapatrier.mjs <trace.jsonl> […]'); process.exit(2) }
const appels = new Map(), reponses = new Map()
let ordre = 0
for (const trace of traces) for (const ligne of readFileSync(trace, 'utf8').split('\n')) {
  if (!ligne.trim()) continue
  let o; try { o = JSON.parse(ligne) } catch { continue }
  for (const c of o.message?.content ?? []) {
    if (c.type === 'tool_use' && String(c.name).startsWith('mcp__n8n-oracle__')) appels.set(c.id, { nom: c.name.replace('mcp__n8n-oracle__', ''), entree: c.input, quand: o.timestamp, ordre: ordre++ })
    if (c.type === 'tool_result') reponses.set(c.tool_use_id, typeof c.content === 'string' ? c.content : (c.content ?? []).map((x) => x.text ?? '').join(''))
  }
}
const texteDe = (id) => { const t = reponses.get(id) ?? 'null'; const m = /saved to (\/\S+?\.(?:txt|json))/.exec(t); return m ? readFileSync(m[1], 'utf8') : t }
const lus = [...appels.entries()].map(([id, a]) => { let r = null; try { r = JSON.parse(texteDe(id)) } catch { r = null } return { ...a, id, r } }).sort((a, b) => a.ordre - b.ordre)

const exports = new Map()
for (const a of lus) if (a.nom === 'get_workflow_details' && a.entree.detailLevel !== 'execution' && a.r?.workflow?.nodes && NOMS.includes(a.r.workflow.name)) exports.set(a.r.workflow.name, a)
const ids = new Map(), empreintes = {}
for (const [nom, a] of [...exports].sort()) {
  const w = { ...a.r.workflow }
  delete w.scopes
  w.exporte_le = a.quand
  w.source = 'MCP n8n-oracle get_workflow_details (tâche 036-014), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
  writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
  ids.set(w.id, nom)
  empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
}
if (exports.size !== NOMS.length) { console.log(`exports manquants : ${NOMS.filter((n) => !exports.has(n)).join(', ')}`); process.exit(1) }
writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')

// La fidélité de la copie.
const attendus = C.exports_()
let ecarts = 0
const inclus = (att, vu) => (att && typeof att === 'object' ? Object.entries(att).every(([k, v]) => inclus(v, vu?.[k])) : att === vu)
for (const [nom, att] of Object.entries(attendus)) {
  const w = exports.get(nom).r.workflow
  const noms = (x) => x.nodes.map((n) => n.name).sort().join('|')
  if (noms(w) !== noms(att)) { console.log(`COPIE ${nom} : nœuds différents\n  n8n : ${noms(w)}\n  fabrique : ${noms(att)}`); ecarts++ }
  for (const n of att.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) {
    const v = w.nodes.find((x) => x.name === n.name)
    if (v && v.parameters.jsCode !== n.parameters.jsCode) { let i = 0; while (i < n.parameters.jsCode.length && n.parameters.jsCode[i] === v.parameters.jsCode[i]) i++; console.log(`COPIE ${nom} / ${n.name} : code différent dès l'octet ${i}`); ecarts++ }
  }
  const liens = (x) => Object.entries(x.connections).flatMap(([de, o]) => Object.entries(o).flatMap(([g, l]) => l.flatMap((s, i) => s.map((y) => `${de}[${g}${i}]>${y.node}`)))).sort().join('\n')
  if (liens(w) !== liens(att)) { console.log(`COPIE ${nom} : liens différents`); ecarts++ }
  for (const n of att.nodes) {
    const v = w.nodes.find((x) => x.name === n.name)
    if (!v) continue
    if (v.type !== n.type || v.typeVersion !== n.typeVersion) { console.log(`COPIE ${nom} / ${n.name} : type ${v.type}@${v.typeVersion} au lieu de ${n.type}@${n.typeVersion}`); ecarts++ }
    if (n.type !== 'n8n-nodes-base.code' && !inclus(n.parameters, v.parameters)) { console.log(`COPIE ${nom} / ${n.name} : paramètres différents`); ecarts++ }
    if ((n.notes ?? '') !== (v.notes ?? '')) { console.log(`COPIE ${nom} / ${n.name} : notes différentes`); ecarts++ }
    if (Object.keys(v.credentials ?? {}).length) { console.log(`COPIE ${nom} / ${n.name} : IDENTIFIANT présent`); ecarts++ }
  }
  if (w.active !== false) { console.log(`COPIE ${nom} : actif`); ecarts++ }
  for (const k of ['executionTimeout', 'timezone', 'errorWorkflow', 'callerPolicy']) if (w.settings?.[k] !== att.settings[k]) { console.log(`COPIE ${nom} : réglage ${k} = ${w.settings?.[k]} au lieu de ${att.settings[k]}`); ecarts++ }
}
console.log(ecarts ? `COPIE : ${ecarts} écart(s)` : 'COPIE : les nœuds Code sont ceux de la fabrique octet pour octet ; mêmes nœuds, mêmes types, mêmes liens, paramètres de la fabrique tous présents, aucun identifiant, tout inactif')

// Les essais, comparés au rejeu hors ligne.
const attendusHL = JSON.parse(execFileSync('node', [path.join(RACINE, 'scripts/gabarits-argent-qa.mjs'), '--essais-n8n', ICI], { encoding: 'utf8', maxBuffer: 1 << 26 }))
const relue = (exec) => lus.filter((x) => x.nom === 'get_workflow_execution' && String(x.entree.executionId) === String(exec) && x.r?.execution && x.r?.data).at(-1)
const essais = []
for (const t of lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId && ids.has(x.entree.workflowId))) {
  const lecture = relue(t.r.executionId)
  if (!lecture) continue
  const run = lecture.r.data?.resultData?.runData ?? {}
  const sorties = {}
  for (const [noeud, passages] of Object.entries(run)) sorties[noeud] = passages.map((p) => (p.data?.main ?? []).map((s) => (s ?? []).map((i) => i.json)))
  const nom = ids.get(t.entree.workflowId)
  const pins = Object.fromEntries(Object.entries(t.entree.pinData ?? {}).map(([k, v]) => [k, v.map((x) => x.json)]))
  const hl = attendusHL.find((x) => x.gabarit === nom && JSON.stringify(Object.entries(x.pinData).sort()) === JSON.stringify(Object.entries(t.entree.pinData ?? {}).sort()))
  const final = hl ? sorties[hl.attendu.noeud]?.[0]?.[0]?.[0] ?? null : null
  const memeNoeuds = hl ? JSON.stringify([...hl.noeuds_executes_hors_ligne].filter((n) => !/^(Claude|Schéma|Tarifs|Lire le|Pièces|Prix|Contrôleur|Registre|Lire un)/.test(n) || true).sort()) === JSON.stringify(Object.keys(run).sort()) : null
  essais.push({ gabarit: nom, titre: hl?.titre ?? '(essai hors liste)', execution: t.r.executionId, statut_n8n: lecture.r.execution.status, noeud_final: hl?.attendu.noeud, sortie_n8n: final, sortie_hors_ligne: hl?.attendu.json ?? null,
    identique_au_rejeu: hl ? JSON.stringify(final) === JSON.stringify(hl.attendu.json) : null, memes_noeuds_executes: memeNoeuds, noeuds_executes_n8n: Object.keys(run), entrees: pins })
}
// Un seul essai par titre : le dernier.
const derniers = [...new Map(essais.filter((e) => e.titre !== '(essai hors liste)').map((e) => [`${e.gabarit}|${e.titre}`, e])).values()]
writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(derniers, null, 2) + '\n')
console.log(`exports : ${[...exports.keys()].sort().join(', ')}\nessais : ${derniers.map((e) => `${e.gabarit.replace('gabarit-artisan-', '')} « ${e.titre.slice(0, 40)} » #${e.execution} (${e.statut_n8n}, ${e.identique_au_rejeu ? 'identique au rejeu' : e.identique_au_rejeu === false ? 'DIFFÈRE' : '?'}, nœuds ${e.memes_noeuds_executes ? 'mêmes' : 'différents'})`).join('\n        ')}`)
if (ecarts) process.exit(1)
