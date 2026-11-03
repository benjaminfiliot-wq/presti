// 036-005 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la tâche (traces .jsonl du harnais : la session et les sous-agents qui ont
// recopié les lots dans n8n), comme 035-003 à 036-003 :
//   • les exports : dernière réponse de `get_workflow_details` (détail complet) des trois workflows → <nom>.workflow.json
//     (on n'ôte que `scopes`, les droits de l'utilisateur du MCP ; on ajoute `exporte_le` et `source`) ;
//   • les essais : le DERNIER `test_workflow` relu par `get_workflow_execution` pour chaque workflow testé → essais-n8n.json
//     (entrees = l'élément épinglé du déclencheur ; epingles = les autres nœuds épinglés ; sorties = ce que « Contrat de sortie » a rendu dans n8n) ;
//   • le registre des empreintes SHA-256 des nœuds Code → empreintes-code.json ;
//   • la comparaison avec la fabrique : le code de chaque nœud de n8n doit être, OCTET POUR OCTET, celui de construire.mjs (rien n'a été retouché à la copie).
//   node .orchestre/preuves/036-005/rapatrier.mjs <trace1.jsonl> [<trace2.jsonl> …]
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as C from './construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const NOMS = ['presti-dep-devis', 'presti-dep-facturation', 'presti-banc-argent']
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
// Une réponse trop grande est enregistrée par le harnais dans un fichier (« saved to <chemin> ») : on lit ce fichier, tel quel.
const texteDe = (id) => { const t = reponses.get(id) ?? 'null'; const m = /saved to (\/\S+?\.txt)/.exec(t); return m ? readFileSync(m[1], 'utf8') : t }
const lus = [...appels.entries()].map(([id, a]) => { let r = null; try { r = JSON.parse(texteDe(id)) } catch { r = null } return { ...a, id, r } }).sort((a, b) => a.ordre - b.ordre)

const exports = new Map()
for (const a of lus) if (a.nom === 'get_workflow_details' && a.entree.detailLevel !== 'execution' && a.r?.workflow?.nodes && NOMS.includes(a.r.workflow.name)) exports.set(a.r.workflow.name, a)
const ids = new Map(), empreintes = {}
for (const [nom, a] of [...exports].sort()) {
  const w = { ...a.r.workflow }
  delete w.scopes
  w.exporte_le = a.quand
  w.source = 'MCP n8n-oracle get_workflow_details (tâche 036-005), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
  writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
  ids.set(w.id, nom)
  empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
}
writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')

// La fidélité de la copie : chaque nœud Code de n8n = celui de la fabrique, octet pour octet ; mêmes nœuds, mêmes liens.
const attendus = C.exports_()
let ecarts = 0
for (const [nom, att] of Object.entries(attendus)) {
  const w = [...exports].find(([n]) => n === nom)?.[1]?.r?.workflow
  if (!w) { console.log(`COPIE ${nom} : export absent`); ecarts++; continue }
  const noms = (x) => x.nodes.map((n) => n.name).sort().join('|')
  if (noms(w) !== noms(att)) { console.log(`COPIE ${nom} : nœuds différents\n  n8n : ${noms(w)}\n  fabrique : ${noms(att)}`); ecarts++ }
  for (const n of att.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) {
    const v = w.nodes.find((x) => x.name === n.name)
    if (!v) continue
    if (v.parameters.jsCode !== n.parameters.jsCode) { let i = 0; while (i < n.parameters.jsCode.length && n.parameters.jsCode[i] === v.parameters.jsCode[i]) i++; console.log(`COPIE ${nom} / ${n.name} : code différent dès l'octet ${i} (« ${n.parameters.jsCode.slice(Math.max(0, i - 20), i + 30).replace(/\n/g, '⏎')} » attendu, « ${String(v.parameters.jsCode).slice(Math.max(0, i - 20), i + 30).replace(/\n/g, '⏎')} » reçu)`); ecarts++ }
  }
  const liens = (x) => Object.entries(x.connections).flatMap(([de, o]) => o.main.flatMap((l, i) => l.map((y) => `${de}[${i}]>${y.node}`))).sort().join('\n')
  if (liens(w) !== liens(att)) { console.log(`COPIE ${nom} : liens différents`); ecarts++ }
  const refN = (x) => x.nodes.filter((n) => !['n8n-nodes-base.code'].includes(n.type)).map((n) => JSON.stringify({ n: n.name, t: n.type, p: n.parameters, notes: n.notes ?? null })).sort().join('\n')
  if (refN(w) !== refN(att)) { console.log(`COPIE ${nom} : paramètres ou notes d'un nœud (hors Code) différents`); ecarts++ }
}
console.log(ecarts ? `COPIE : ${ecarts} écart(s)` : 'COPIE : les nœuds Code, les autres nœuds et les liens de n8n sont ceux de la fabrique, octet pour octet')

// Les essais : pour chaque workflow, le dernier test_workflow dont l'exécution a été relue avec ses données.
const tests = lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId && ids.has(x.entree.workflowId))
const relue = (exec) => lus.filter((x) => x.nom === 'get_workflow_execution' && String(x.entree.executionId) === String(exec) && x.r?.execution && x.r?.data).at(-1)
const parWorkflow = new Map()
for (const t of tests) if (relue(t.r.executionId)) parWorkflow.set(t.entree.workflowId, t)
const essais = []
for (const [wid, t] of parWorkflow) {
  const lecture = relue(t.r.executionId)
  const run = lecture.r.data?.resultData?.runData ?? {}
  const sorties = {}
  for (const [noeud, passages] of Object.entries(run)) sorties[noeud] = passages.map((p) => (p.data?.main?.[0] ?? []).map((i) => i.json))
  const nom = ids.get(wid), w = [...exports].find(([n]) => n === nom)[1].r.workflow
  const declencheur = w.nodes.find((n) => ['n8n-nodes-base.executeWorkflowTrigger', 'n8n-nodes-base.scheduleTrigger'].includes(n.type)).name
  const pins = Object.fromEntries(Object.entries(t.entree.pinData ?? {}).map(([k, v]) => [k, v.map((x) => x.json)]))
  const { [declencheur]: entrees, ...epingles } = pins
  const final = nom === 'presti-banc-argent' ? sorties['Bilan du banc']?.[0] : sorties['Contrat de sortie']?.[0]
  essais.push({ workflow: nom, execution: t.r.executionId, statut_n8n: lecture.r.execution.status, sonde: nom === 'presti-banc-argent' || undefined, entrees, epingles, sorties: final, sorties_noeuds: Object.keys(sorties) })
}
writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(essais, null, 2) + '\n')
console.log(`exports : ${[...exports.keys()].sort().join(', ')}\nessais : ${essais.map((e) => `${e.workflow}#${e.execution}(${e.statut_n8n}, ${e.sorties_noeuds.length} nœud(s) relus)`).join(' ; ')}`)
if (ecarts) process.exit(1)
