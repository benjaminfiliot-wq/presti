// 035-003 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la session (journal du harnais, .jsonl) :
//   • les exports : dernière réponse de `get_workflow_details` (détail complet) de chaque `lib-*` → <nom>.workflow.json
//     (on n'ôte que `scopes`, les droits de l'utilisateur du MCP ; on ajoute `exporte_le` et `source`) ;
//   • les essais : chaque `test_workflow` (données épinglées, telles qu'envoyées) et la sortie du « Contrat de sortie » relue par
//     `get_workflow_execution` (ou le message d'arrêt) → essais-n8n.json ;
//   • le registre des empreintes SHA-256 des nœuds Code (R19 de scripts/n8n-specs-qa.mjs) → empreintes-code.json.
//   node .orchestre/preuves/035-003/rapatrier.mjs <journal.jsonl>
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const journal = process.argv[2]
if (!journal) { console.error('usage : rapatrier.mjs <journal.jsonl>'); process.exit(2) }
const appels = new Map(), reponses = new Map()
for (const ligne of readFileSync(journal, 'utf8').split('\n')) {
  if (!ligne.trim()) continue
  let o; try { o = JSON.parse(ligne) } catch { continue }
  for (const c of o.message?.content ?? []) {
    if (c.type === 'tool_use' && String(c.name).startsWith('mcp__n8n-oracle__')) appels.set(c.id, { nom: c.name.replace('mcp__n8n-oracle__', ''), entree: c.input, quand: o.timestamp })
    if (c.type === 'tool_result') reponses.set(c.tool_use_id, typeof c.content === 'string' ? c.content : (c.content ?? []).map((x) => x.text ?? '').join(''))
  }
}
const lus = [...appels.entries()].map(([id, a]) => { let r = null; try { r = JSON.parse(reponses.get(id) ?? 'null') } catch { r = null } return { ...a, id, r } })

// Les exports
const exports = new Map()
for (const a of lus) if (a.nom === 'get_workflow_details' && a.entree.detailLevel !== 'execution' && a.r?.workflow?.nodes && /^lib-/.test(a.r.workflow.name)) exports.set(a.r.workflow.name, a)
const ids = new Map()
const empreintes = {}
for (const [nom, a] of [...exports].sort()) {
  const w = { ...a.r.workflow }
  delete w.scopes
  w.exporte_le = a.quand
  w.source = 'MCP n8n-oracle get_workflow_details (tâche 035-003), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
  writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
  ids.set(w.id, nom)
  empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
}
writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')

// Les essais (les enfants et lib-erreur-commune ; le banc appelle des sous-workflows, que le juge hors ligne ne rejoue pas)
const TITRES = {
  363: 'lot de quatre : deux objets, un doublon dans le lot, une adresse e-mail (rejetée)',
  371: 'trois entrées (dont un coût sans source) et un lot porteur d’une adresse (rejeté)',
  372: 'dix pannes en une minute, à cheval sur deux fenêtres de 5 min, et une autre catégorie au lien porteur de jeton',
  373: 'quatre échecs de suite, une autre organisation, un succès sur un disjoncteur ouvert',
  374: 'un battement, puis un contrôle à trois parents (muet, vivant, déjà signalé)',
  375: 'hors simulation : arrêt avant tout effet',
  376: 'hors simulation : arrêt avant tout effet',
  377: 'sept erreurs fictives (une par catégorie), un message chargé à masquer, l’échec d’un déclencheur',
}
const sortiesDe = (r) => (r?.data?.resultData?.runData?.['Contrat de sortie'] ?? []).flatMap((run) => (run.data?.main?.[0] ?? []).map((i) => i.json))
const essais = []
for (const a of lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId)) {
  const nom = ids.get(a.entree.workflowId)
  if (!nom || nom === 'lib-banc-socle') continue
  const pins = Object.values(a.entree.pinData ?? {})[0] ?? []
  const lecture = lus.filter((x) => x.nom === 'get_workflow_execution' && x.entree.executionId === a.r.executionId && x.r?.execution).at(-1)
  if (!lecture) { console.error(`exécution ${a.r.executionId} jamais relue : essai écarté`); continue }
  const e = { workflow: nom, titre: TITRES[a.r.executionId] ?? 'essai', execution: a.r.executionId, statut_n8n: lecture.r.execution.status, entrees: pins.map((p) => p.json) }
  if (lecture.r.execution.status === 'error') e.erreur = lecture.r.data?.resultData?.error?.message ?? a.r.error ?? 'erreur'
  else e.sorties = sortiesDe(lecture.r)
  essais.push(e)
}
writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(essais, null, 2) + '\n')
console.log(`exports : ${[...exports.keys()].sort().join(', ')}\nessais : ${essais.map((e) => `${e.workflow}#${e.execution}(${e.statut_n8n}, ${e.entrees.length} entrée(s), ${e.sorties?.length ?? 0} sortie(s))`).join(' ; ')}`)
