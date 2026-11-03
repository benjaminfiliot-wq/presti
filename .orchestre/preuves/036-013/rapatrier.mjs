// 036-013 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la session (journal du harnais, .jsonl), comme 036-001 et 036-003 :
//   • les exports : dernière réponse de `get_workflow_details` (détail complet) des quatre gabarits → <nom>.workflow.json
//     (on n'ôte que `scopes`, les droits de l'utilisateur du MCP, et `triggerInfo` ; on ajoute `exporte_le` et `source`) ;
//   • les essais : CHAQUE `test_workflow` dont l'exécution a été relue par `get_workflow_execution` avec ses données → essais-n8n.json
//     (les données épinglées envoyées + la sortie de chaque nœud relu) ; le titre vient de titres-essais.json ;
//   • le registre des empreintes SHA-256 des nœuds Code (R19 de scripts/n8n-specs-qa.mjs) → empreintes-code.json.
// Une réponse trop grande est rangée par le harnais dans un fichier : on suit le renvoi.
//   node .orchestre/preuves/036-013/rapatrier.mjs <journal.jsonl>
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const NOMS = ['gabarit-artisan-accueil-boite', 'gabarit-artisan-accueil-leads', 'gabarit-artisan-accueil-reponse', 'gabarit-artisan-accueil-envoi']
const journal = process.argv[2]
if (!journal) { console.error('usage : rapatrier.mjs <journal.jsonl>'); process.exit(2) }

const texteDe = (c) => (typeof c === 'string' ? c : (c ?? []).map((x) => x.text ?? '').join(''))
function suivreRenvoi(t) {
  const m = /Full output saved to:\s*(\S+)/.exec(t)
  if (!m || !existsSync(m[1])) return t
  const brut = readFileSync(m[1], 'utf8')
  return brut
}
const appels = new Map(), reponses = new Map()
for (const ligne of readFileSync(journal, 'utf8').split('\n')) {
  if (!ligne.trim()) continue
  let o; try { o = JSON.parse(ligne) } catch { continue }
  for (const c of o.message?.content ?? []) {
    if (c.type === 'tool_use' && String(c.name).startsWith('mcp__n8n-oracle__')) appels.set(c.id, { nom: c.name.replace('mcp__n8n-oracle__', ''), entree: c.input, quand: o.timestamp })
    if (c.type === 'tool_result') reponses.set(c.tool_use_id, texteDe(c.content))
  }
}
const lus = [...appels.entries()].map(([id, a]) => { let r = null; try { r = JSON.parse(suivreRenvoi(reponses.get(id) ?? 'null')) } catch { r = null } return { ...a, id, r } })

const exports = new Map()
for (const a of lus) if (a.nom === 'get_workflow_details' && a.entree.detailLevel !== 'execution' && a.r?.workflow?.nodes && NOMS.includes(a.r.workflow.name) && !a.r.workflow.isArchived) exports.set(a.r.workflow.name, a)
const ids = new Map(), empreintes = {}
for (const [nom, a] of [...exports].sort()) {
  const w = { ...a.r.workflow }
  delete w.scopes
  w.exporte_le = a.quand
  w.source = 'MCP n8n-oracle get_workflow_details (tâche 036-013), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
  writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
  ids.set(w.id, nom)
  empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
}
writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')

// Les essais : tous les test_workflow relus avec données, du plus ancien au plus récent ; une exécution relue plusieurs fois garde la dernière lecture.
const titres = existsSync(path.join(ICI, 'titres-essais.json')) ? JSON.parse(readFileSync(path.join(ICI, 'titres-essais.json'), 'utf8')) : {}
const tests = lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId && ids.has(x.entree.workflowId))
const essais = []
for (const t of tests) {
  const lectures = lus.filter((x) => x.nom === 'get_workflow_execution' && String(x.entree.executionId) === String(t.r.executionId) && x.r?.execution && x.r?.data)
  if (!lectures.length) continue
  const sorties = {}
  for (const l of lectures) {
    const run = l.r.data?.resultData?.runData ?? {}
    for (const [noeud, passages] of Object.entries(run)) sorties[noeud] = passages.map((p) => (p.data?.main ?? []).map((sortie) => (sortie ?? []).map((i) => i.json)))
  }
  essais.push({ workflow: ids.get(t.entree.workflowId), execution: Number(t.r.executionId), titre: titres[t.r.executionId] ?? null, statut_n8n: lectures.at(-1).r.execution.status,
    declencheur_epingle: Object.keys(t.entree.pinData ?? {}),
    entrees_epinglees: Object.fromEntries(Object.entries(t.entree.pinData ?? {}).map(([k, v]) => [k, v.map((x) => x.json)])), sorties })
}
writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(essais, null, 2) + '\n')
const manquants = NOMS.filter((n) => !exports.has(n))
console.log(`exports : ${[...exports.keys()].sort().join(', ')}${manquants.length ? ` — MANQUANTS : ${manquants.join(', ')}` : ''}\nessais : ${essais.map((e) => `${e.workflow.replace('gabarit-artisan-accueil-', '')}#${e.execution}(${e.statut_n8n}, ${Object.keys(e.sorties).length} nœud(s))`).join(' ; ')}`)
