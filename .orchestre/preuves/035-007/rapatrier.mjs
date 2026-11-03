// 035-007 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la session (journal du harnais, .jsonl), comme 035-003 à 035-005 :
//   • les exports : dernière réponse de `get_workflow_details` (détail complet) des six `ent-exemple-*` → <nom>.workflow.json
//     (on n'ôte que `scopes`, les droits de l'utilisateur du MCP ; on ajoute `exporte_le` et `source`) ;
//   • les essais : chaque `test_workflow` (données épinglées, telles qu'envoyées) et la sortie relue par `get_workflow_execution`
//     (« Contrat de sortie » d'une chaîne, « Bilan du passage » du parent), ou le message d'arrêt → essais-n8n.json ;
//   • le registre des empreintes SHA-256 des nœuds Code (R19 de scripts/n8n-specs-qa.mjs) → empreintes-code.json.
// Il vérifie enfin que le code de chaque nœud Code exporté est égal, octet pour octet, à celui de construire.mjs.
//   node .orchestre/preuves/035-007/rapatrier.mjs <journal.jsonl>
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as F from './construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const NOMS = [...F.CHAINES, 'ent-exemple-parent']
// Ce que chaque essai prouve (numéro d'exécution n8n → titre) ; 460 a tourné sur la version précédente du parent (défaut trouvé, corrigé).
export const TITRES = {
  443: 'sonde : un lib-* refuse un appelant absent de ses callerIds, même en manuel ; la chaîne finit en « erreur », sans effet',
  447: 'Alerte : balayage de Bâti-Démo, deux alertes internes prévues',
  448: 'Reporting : le rapport de la semaine du 26 octobre, comptes sourcés, aucune base',
  450: 'Relance : 10 objets sans réponse, 5 paliers à préparer, 5 écartés (stop, litige, escalade, registre de 3 jours, aucun palier)',
  451: 'Qualification : 7 demandes notées, 7 cartes (2 pour escalade)',
  452: 'Rédaction : 5 brouillons (modèle épinglé), la porte en refuse 1 (prix sans source), 4 cartes prévues',
  453: 'Reporting, rejeu du même lot : la période est déjà faite, aucun nouveau rapport',
  454: 'Relance hors simulation : arrêt avant tout appel',
  455: 'Parent, interrupteur général coupé : rien n’est appelé',
  456: 'Parent, agents en panne : chaînes réelles, leurs appels aux lib-* refusés par la politique d’appel ; chaque chaîne finit en « erreur » sans effet, le parent journalise et compte un échec par disjoncteur',
  460: 'Parent de bout en bout — version précédente : défaut trouvé (la sortie d’erreur lue sur la branche 1 que n8n remplit aussi avec des données épinglées)',
  461: 'Parent de bout en bout : 5 chaînes « ok », 48 effets prévus, 0 fait, 1 événement en sortie de secours',
}
const VERSION_PRECEDENTE = new Set([460])

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
  w.source = 'MCP n8n-oracle get_workflow_details (tâche 035-007), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
  writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
  ids.set(w.id, nom); W[nom] = w
  empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
}
writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')

// Le code exporté est-il celui de la fabrique ? (une faute de recopie dans le MCP se verrait ici)
let ecarts = 0
for (const nom of NOMS) {
  const attendu = nom === 'ent-exemple-parent' ? F.PARENT : F.codeChaine(nom)
  const codes = (W[nom]?.nodes ?? []).filter((n) => n.type === 'n8n-nodes-base.code')
  if (codes.length !== Object.keys(attendu).length) { ecarts++; console.error(`ÉCART ${nom} : ${codes.length} nœuds Code au lieu de ${Object.keys(attendu).length}`) }
  for (const [noeud, js] of Object.entries(attendu)) { const n = codes.find((y) => y.name === noeud); if (!n || n.parameters.jsCode !== js) { ecarts++; console.error(`ÉCART ${nom} / ${noeud}`) } }
}

const FINAL = (nom) => nom === 'ent-exemple-parent' ? 'Bilan du passage' : 'Contrat de sortie'
const sortiesDe = (r, noeud) => (r?.data?.resultData?.runData?.[noeud] ?? []).flatMap((run) => (run.data?.main?.[0] ?? []).map((i) => i.json))
const essais = []
for (const a of lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId)) {
  const nom = ids.get(a.entree.workflowId)
  if (!nom) continue
  const exe = Number(a.r.executionId)
  const lecture = lus.filter((x) => x.nom === 'get_workflow_execution' && x.entree.executionId === a.r.executionId && x.r?.execution).at(-1)
  if (!lecture) { console.error(`exécution ${exe} jamais relue : essai écarté`); continue }
  const pins = Object.fromEntries(Object.entries(a.entree.pinData ?? {}).map(([n, v]) => [n, v.map((p) => p.json)]))
  const declencheur = nom === 'ent-exemple-parent' ? 'Toutes les 5 minutes' : 'Appelé par un parent'
  const e = { workflow: nom, execution: exe, titre: TITRES[exe] ?? 'essai', statut_n8n: lecture.r.execution.status, noeud: FINAL(nom),
    entrees: pins[declencheur] ?? [], epingles: Object.fromEntries(Object.entries(pins).filter(([n]) => n !== declencheur)) }
  if (VERSION_PRECEDENTE.has(exe)) e.version_precedente = true
  if (lecture.r.execution.status === 'error') e.erreur = lecture.r.data?.resultData?.error?.message ?? a.r.error ?? 'erreur'
  else e.sorties = sortiesDe(lecture.r, FINAL(nom))
  essais.push(e)
}
essais.sort((x, y) => x.execution - y.execution)
writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(essais, null, 1) + '\n')
console.log(`exports : ${[...exports.keys()].sort().join(', ')}\nessais : ${essais.map((e) => `${e.workflow}#${e.execution}(${e.statut_n8n}${e.version_precedente ? ', version précédente' : ''}, ${e.sorties?.length ?? 0} sortie(s))`).join(' ; ')}\ncode des exports = construire.mjs : ${ecarts ? ecarts + ' écart(s)' : 'identique'}`)
process.exit(ecarts ? 1 : 0)
