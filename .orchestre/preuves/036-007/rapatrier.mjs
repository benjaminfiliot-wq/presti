// 036-007 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la session (journal du harnais, .jsonl), comme 035-003 à 035-005 :
//   • les exports : dernière réponse de `get_workflow_details` (détail complet) des quatre workflows → <nom>.workflow.json
//     (on n'ôte que `scopes`, les droits de l'utilisateur du MCP, et `triggerInfo` ; on ajoute `exporte_le` et `source`) ;
//   • les essais : le DERNIER `test_workflow` relu par `get_workflow_execution` pour chaque workflow testé (le banc, le parent) → essais-n8n.json,
//     avec la sortie de chaque nœud relu (les « Appeler … » rendent les « Contrat de sortie » des enfants) ;
//   • le registre des empreintes SHA-256 des nœuds Code (R19 de scripts/n8n-specs-qa.mjs) → empreintes-code.json.
// Les essais plus anciens du même workflow sont écartés et dits (jouésavant une correction du code, puis rejoués).
//   node .orchestre/preuves/036-003/rapatrier.mjs <journal.jsonl>
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const NOMS = ['lib-alerte-liste', 'lib-cout-ia', 'presti-dep-direction', 'presti-banc-direction']
const journal = process.argv[2]
if (!journal) { console.error('usage : rapatrier.mjs <journal.jsonl>'); process.exit(2) }
const appels = new Map(), reponses = new Map()
for (const ligne of readFileSync(journal, 'utf8').split('\n')) {
  if (!ligne.trim()) continue
  let o; try { o = JSON.parse(ligne) } catch { continue }
  for (const c of o.message?.content ?? []) {
    if (c.type === 'tool_use' && String(c.name).startsWith('mcp__n8n-oracle__')) appels.set(c.id, { nom: c.name.replace('mcp__n8n-oracle__', ''), entree: c.input, quand: o.timestamp })
    if (c.type === 'tool_result') {
      let t = typeof c.content === 'string' ? c.content : (c.content ?? []).map((x) => x.text ?? '').join('')
      const fichier = /saved to (\S+\.txt)/.exec(t)?.[1] // réponse trop grosse : le harnais l'a rangée dans un fichier, relu tel quel
      if (fichier && /exceeds maximum allowed tokens/.test(t) && existsSync(fichier)) t = readFileSync(fichier, 'utf8')
      reponses.set(c.tool_use_id, t)
    }
  }
}
const pins = (e) => (typeof e.pinData === 'string' ? JSON.parse(e.pinData || '{}') : e.pinData ?? {})
const lus = [...appels.entries()].map(([id, a]) => { let r = null; try { r = JSON.parse(reponses.get(id) ?? 'null') } catch { r = null } return { ...a, id, r } })

const exports = new Map()
for (const a of lus) if (a.nom === 'get_workflow_details' && a.entree.detailLevel !== 'execution' && a.r?.workflow?.nodes && NOMS.includes(a.r.workflow.name)) exports.set(a.r.workflow.name, a)
const ids = new Map(), empreintes = {}
for (const [nom, a] of [...exports].sort()) {
  const w = { ...a.r.workflow }
  delete w.scopes
  w.exporte_le = a.quand
  w.source = 'MCP n8n-oracle get_workflow_details (tâche 036-007), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
  writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
  ids.set(w.id, nom)
  empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
}
writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')

// Les essais : pour chaque workflow, le dernier test_workflow dont l'exécution a été relue avec ses données.
const tests = lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId && ids.has(x.entree.workflowId))
const relue = (exec) => lus.filter((x) => x.nom === 'get_workflow_execution' && x.entree.executionId === exec && x.r?.execution && x.r?.data).at(-1)
const parWorkflow = new Map() // clé = workflow + empreinte des données épinglées : le dernier essai relu de chaque cas
for (const t of tests) if (relue(t.r.executionId)) parWorkflow.set(t.entree.workflowId + '|' + createHash('sha256').update(JSON.stringify(pins(t.entree))).digest('hex'), t)
const ecartes = tests.filter((t) => ![...parWorkflow.values()].includes(t)).map((t) => `${ids.get(t.entree.workflowId)}#${t.r.executionId}`)
const essais = []
for (const t of parWorkflow.values()) {
  const wid = t.entree.workflowId
  const lecture = relue(t.r.executionId)
  const run = lecture.r.data?.resultData?.runData ?? {}
  const sorties = {}
  for (const [noeud, passages] of Object.entries(run)) sorties[noeud] = passages.map((p) => (p.data?.main?.[0] ?? []).map((i) => i.json))
  essais.push({ workflow: ids.get(wid), execution: t.r.executionId, statut_n8n: lecture.r.execution.status, declencheur_epingle: Object.keys(pins(t.entree)),
    entrees_epinglees: Object.fromEntries(Object.entries(pins(t.entree)).map(([k, v]) => [k, v.map((x) => x.json)])), sorties })
}
writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(essais, null, 2) + '\n')
console.log(`exports : ${[...exports.keys()].sort().join(', ')}\nessais : ${essais.map((e) => `${e.workflow}#${e.execution}(${e.statut_n8n}, ${Object.keys(e.sorties).length} nœud(s) relus)`).join(' ; ')}\nécartés (joués avant correction, rejoués) : ${ecartes.join(', ') || 'aucun'}`)
