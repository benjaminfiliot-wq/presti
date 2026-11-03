// 036-030 — rapatrie, SANS RETOUCHE, ce que le MCP n8n-oracle a rendu pendant la session (journal du harnais, .jsonl ; une réponse trop
// longue est relue dans le fichier où le harnais l'a déportée) :
//   • presti-cerveau.workflow.json : la DERNIÈRE réponse complète de get_workflow_details du Cerveau (« scopes » ôté) ;
//   • essais-n8n.json : les exécutions relues par get_workflow_execution (lectures réelles 996, ombre 999, banc-cerveau 1007, banc-argent 1016).
//   node .orchestre/preuves/036-030/rapatrier.mjs <journal .jsonl de la session>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const journal = process.argv[2]
if (!journal) { console.error('usage : rapatrier.mjs <journal.jsonl>'); process.exit(2) }
const appels = new Map(), reponses = []
for (const l of fs.readFileSync(journal, 'utf8').split('\n')) {
  if (!l.trim()) continue
  let m; try { m = JSON.parse(l) } catch { continue }
  const c = m.message?.content
  if (!Array.isArray(c)) continue
  for (const b of c) {
    if (b.type === 'tool_use' && String(b.name).startsWith('mcp__n8n-oracle__')) appels.set(b.id, { nom: b.name.slice(17), entree: b.input })
    if (b.type === 'tool_result' && appels.has(b.tool_use_id)) {
      let t = Array.isArray(b.content) ? b.content.map((x) => x.text || '').join('') : String(b.content || '')
      const dep = t.match(/Full output saved to: (\S+\.txt)/)
      if (dep && fs.existsSync(dep[1])) t = fs.readFileSync(dep[1], 'utf8')
      reponses.push({ ...appels.get(b.tool_use_id), texte: t })
    }
  }
}
const details = reponses.filter((r) => r.nom === 'get_workflow_details' && r.entree.workflowId === '596OC5mL2aMBq6SD' && !r.entree.detailLevel)
const dernier = JSON.parse(details.at(-1).texte)
delete dernier.workflow.scopes
fs.writeFileSync(path.join(ICI, 'presti-cerveau.workflow.json'), JSON.stringify(dernier, null, 1))
const NOMS = { 996: 'lectures-reelles', 999: 'ombre', 1007: 'banc-cerveau', 1016: 'banc-argent' }
const essais = []
for (const [id, nom] of Object.entries(NOMS)) {
  const r = reponses.filter((x) => x.nom === 'get_workflow_execution' && x.entree.executionId === id && x.entree.includeData).at(-1)
  if (!r) { essais.push({ nom, execution: id, statut: 'absent' }); continue }
  const x = JSON.parse(r.texte)
  const run = x.data?.resultData?.runData || {}
  const noeuds = Object.fromEntries(Object.entries(run).map(([n, v]) => [n, (v[0]?.data?.main?.[0] || []).map((i) => i.json)]))
  essais.push({ nom, execution: id, workflowId: x.execution.workflowId, mode: x.execution.mode, statut: x.execution.status, debut: x.execution.startedAt, noeuds })
}
fs.writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify({ tache: '036-030', source: 'MCP n8n-oracle, get_workflow_execution, relu sans retouche', essais }, null, 1))
console.log('export :', dernier.workflow.nodes.length, 'nœuds ; essais :', essais.map((e) => e.nom + '=' + e.statut).join(', '))
