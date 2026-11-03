// 035-005 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la session (journal du harnais, .jsonl), comme 035-003 et
// 035-004 :
//   • les exports : dernière réponse de `get_workflow_details` (détail complet) des sept workflows de la tâche → <nom>.workflow.json
//     (on n'ôte que `scopes`, les droits de l'utilisateur du MCP ; on ajoute `exporte_le` et `source`) ;
//   • les essais : chaque `test_workflow` (données épinglées, telles qu'envoyées) et la sortie relue par `get_workflow_execution`
//     (« Contrat de sortie » d'un enfant, « Bilan du banc » du banc), ou le message d'arrêt → essais-n8n.json. Pour lib-rediger-message,
//     la sortie ÉPINGLÉE du nœud du modèle est gardée (`epingle_modele`) : c'est elle que le juge rejoue à la place du modèle ; pour le banc,
//     la sortie épinglée de l'appel de lib-rediger-message (`epingle_redaction`) ;
//   • le registre des empreintes SHA-256 des nœuds Code (R19 de scripts/n8n-specs-qa.mjs) → empreintes-code.json.
// Il vérifie enfin que le code de chaque nœud Code exporté est égal, octet pour octet, à celui de construire.mjs.
//   node .orchestre/preuves/035-005/rapatrier.mjs <journal.jsonl>
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as F from './construire.mjs'
import { codeEntree, codeSortie } from '../035-003/construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const NOMS = [...F.ENFANTS, 'lib-banc-relance']
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

const exports = new Map()
for (const a of lus) if (a.nom === 'get_workflow_details' && a.entree.detailLevel !== 'execution' && a.r?.workflow?.nodes && NOMS.includes(a.r.workflow.name)) exports.set(a.r.workflow.name, a)
const ids = new Map(), empreintes = {}, W = {}
for (const [nom, a] of [...exports].sort()) {
  const w = { ...a.r.workflow }
  delete w.scopes
  w.exporte_le = a.quand
  w.source = 'MCP n8n-oracle get_workflow_details (tâche 035-005), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
  writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
  ids.set(w.id, nom); W[nom] = w
  empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
}
writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')

// Le code exporté est-il celui de la fabrique ? (une faute de recopie dans le MCP se verrait ici)
const k = F.lireCode()
const attendu = (nom) => {
  const c = `${nom}@1`, x = { "Contrat d'entrée": codeEntree(c, F.SCHEMAS[nom]), 'Contrat de sortie': codeSortie(c), [F.LOGIQUES[nom]]: F.codeLogique(nom, k) }
  if (nom === 'lib-rediger-message') x['Revalider la sortie du modèle'] = F.codeRevaliderDe(k)
  return x
}
let ecarts = 0
for (const nom of F.ENFANTS) for (const [noeud, js] of Object.entries(attendu(nom))) {
  const n = W[nom]?.nodes.find((y) => y.name === noeud)
  if (!n || n.parameters.jsCode !== js) { ecarts++; console.error(`ÉCART ${nom} / ${noeud}`) }
}
const agent = W['lib-rediger-message']?.nodes.find((n) => n.type === '@n8n/n8n-nodes-langchain.agent')
if (agent?.parameters?.options?.systemMessage !== F.PROMPT_REDACTION) { ecarts++; console.error('ÉCART : prompt de lib-rediger-message') }

const sortiesDe = (r, noeud) => (r?.data?.resultData?.runData?.[noeud] ?? []).flatMap((run) => (run.data?.main?.[0] ?? []).map((i) => i.json))
const essais = []
for (const a of lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId)) {
  const nom = ids.get(a.entree.workflowId)
  if (!nom) continue
  const pins = a.entree.pinData ?? {}
  const banc = nom === 'lib-banc-relance'
  const declencheur = banc ? 'Banc (jamais publié)' : 'Appelé par un parent'
  const noeud = banc ? 'Bilan du banc' : 'Contrat de sortie'
  const lecture = lus.filter((x) => x.nom === 'get_workflow_execution' && x.entree.executionId === a.r.executionId && x.r?.execution).at(-1)
  if (!lecture) { console.error(`exécution ${a.r.executionId} jamais relue : essai écarté`); continue }
  const entrees = (pins[declencheur] ?? []).map((p) => p.json)
  const titre = banc ? 'banc : relance → rédaction → porte → exécution → téléphone ; gestes jamais automatiques ; rapport du lundi'
    : [...new Set(entrees.map((x) => String(x?.trace?.execution_parent ?? 'essai').replace(/^Exemple\. (essai : )?/, '')))].join(' ; ').slice(0, 300)
  const e = { workflow: nom, titre, execution: a.r.executionId, statut_n8n: lecture.r.execution.status, noeud, entrees }
  if (pins['Rédiger (modèle épinglé)']) e.epingle_modele = pins['Rédiger (modèle épinglé)'].map((p) => p.json.output)
  if (pins['Appeler lib-rediger-message']) e.epingle_redaction = pins['Appeler lib-rediger-message'].map((p) => p.json)
  if (lecture.r.execution.status === 'error') e.erreur = lecture.r.data?.resultData?.error?.message ?? a.r.error ?? 'erreur'
  else e.sorties = sortiesDe(lecture.r, noeud)
  essais.push(e)
}
writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(essais, null, 2) + '\n')
console.log(`exports : ${[...exports.keys()].sort().join(', ')}\nessais : ${essais.map((e) => `${e.workflow}#${e.execution}(${e.statut_n8n}, ${e.entrees.length} entrée(s), ${e.sorties?.length ?? 0} sortie(s))`).join(' ; ')}\ncode des exports = construire.mjs : ${ecarts ? ecarts + ' écart(s)' : 'identique'}`)
process.exit(ecarts ? 1 : 0)
