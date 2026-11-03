// 036-001 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la session (journaux du harnais, .jsonl : la session et ses
// sous-agents ; une réponse trop longue est relue dans le fichier où le harnais l'a déportée, « Output has been saved to … ») :
//   • les exports : dernière réponse complète de `get_workflow_details` de chacun des 11 workflows → <nom>.workflow.json (« scopes » ôté) ;
//   • les essais : chaque `test_workflow` (données épinglées telles qu'envoyées) et sa sortie relue par `get_workflow_execution`
//     (« Contrat de sortie » d'un enfant, « Bilan du passage » du Cerveau, « Bilan du banc »), ou son message d'arrêt → essais-n8n.json ;
//   • le registre des empreintes SHA-256 des nœuds Code (R19 de scripts/n8n-specs-qa.mjs) → empreintes-code.json.
// Il vérifie enfin que le code de chaque nœud Code exporté est égal, octet pour octet, à celui de construire.mjs (la recopie dans n8n a été
// faite par des sous-agents : une faute de copie se voit ici).
//   node .orchestre/preuves/036-001/rapatrier.mjs <dossier des journaux de la session>
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie } from '../035-003/construire.mjs'
import * as F from './construire.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const NOMS = ['presti-cerveau', ...F.DEPS.map((d) => `presti-dep-${d}`), 'lib-trier-demande', 'lib-lire-photo', 'presti-banc-cerveau']
export const TITRES = JSON.parse(existsSync(path.join(ICI, 'titres-essais.json')) ? readFileSync(path.join(ICI, 'titres-essais.json'), 'utf8') : '{}')
export function codesAttendus(nom, k = F.lireCopie()) {
  const c = (n) => `${n}@1`
  if (nom === 'presti-cerveau') return F.CERVEAU
  if (nom === 'presti-banc-cerveau') return { [F.NOEUDS_CAS.A]: F.codeBanc('A'), [F.NOEUDS_CAS.B]: F.codeBanc('B'), 'Bilan du banc': F.CODE_BILAN_BANC }
  const corps = nom === 'presti-dep-accueil' ? F.codeAccueil(k) : nom.startsWith('lib-') ? F.codeLib(nom, k) : { 'Non branché': F.codeSquelette(nom.slice(11)) }
  return { "Contrat d'entrée": codeEntree(c(nom), F.SCHEMAS[nom]), ...corps, 'Contrat de sortie': codeSortie(c(nom)) }
}
// Les SONDES : à trois étages (racine → chef → lib-*), n8n 2.45.7 refuse l'appel du petit-enfant sans créer d'exécution de l'enfant, même
// quand l'appelant direct (et la racine) sont dans ses callerIds (487 passe à deux étages ; 499 et 501 échouent à trois). Explication probable,
// non vérifiable sans publier (geste réservé à Benj) : seul l'enfant direct d'une exécution manuelle tourne en brouillon ; plus bas, n8n appelle
// la version PUBLIÉE (fiche-methode-n8n.md:20-22), qui n'existe pas. Le moteur hors ligne ne reproduit pas ce refus : ces essais ne sont pas
// comparés octet pour octet ; le juge y vérifie seulement le fail-closed (statut « erreur », aucun effet, aucune carte).
export const SONDES = { 479: 'trois étages (banc → accueil → lib-*) : appels du petit-enfant refusés par n8n (petit-enfant non publié)', 499: 'trois étages (cerveau → accueil → lib-*) : appels du petit-enfant refusés par n8n (petit-enfant non publié)', 501: 'trois étages, presti-cerveau ajouté aux callerIds du trieur : toujours refusé (la politique d’appel n’est pas en cause)' }
const FINAL = (nom) => nom === 'presti-cerveau' ? 'Bilan du passage' : nom === 'presti-banc-cerveau' ? 'Bilan du banc' : 'Contrat de sortie'
const DECLENCHEUR = (w) => w.nodes.find((n) => /scheduleTrigger|executeWorkflowTrigger/.test(n.type))?.name

if (import.meta.url === `file://${process.argv[1]}`) {
  const dossier = process.argv[2]
  if (!dossier) { console.error('usage : rapatrier.mjs <dossier des journaux de la session>'); process.exit(2) }
  const journaux = [dossier + '.jsonl', ...(existsSync(path.join(dossier, 'subagents')) ? readdirSync(path.join(dossier, 'subagents')).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dossier, 'subagents', f)) : [])].filter(existsSync)
  const appels = new Map(), reponses = new Map()
  for (const j of journaux) for (const ligne of readFileSync(j, 'utf8').split('\n')) {
    if (!ligne.trim()) continue
    let o; try { o = JSON.parse(ligne) } catch { continue }
    for (const c of o.message?.content ?? []) {
      if (c.type === 'tool_use' && String(c.name).startsWith('mcp__n8n-oracle__')) appels.set(c.id, { nom: c.name.replace('mcp__n8n-oracle__', ''), entree: c.input, quand: o.timestamp })
      if (c.type === 'tool_result') reponses.set(c.tool_use_id, typeof c.content === 'string' ? c.content : (c.content ?? []).map((x) => x.text ?? '').join(''))
    }
  }
  const lire = (t) => { if (!t) return null; const m = /Output has been saved to (\S+?\.txt)/.exec(t); if (m && existsSync(m[1])) t = readFileSync(m[1], 'utf8')
    try { const v = JSON.parse(t); return Array.isArray(v) && v[0]?.text ? JSON.parse(v.map((x) => x.text).join('')) : v } catch { return null } }
  const lus = [...appels.entries()].map(([id, a]) => ({ ...a, id, r: lire(reponses.get(id)) })).sort((x, y) => String(x.quand).localeCompare(String(y.quand)))
  const exports = new Map()
  for (const a of lus) if (a.nom === 'get_workflow_details' && a.entree.detailLevel !== 'execution' && a.r?.workflow?.nodes && NOMS.includes(a.r.workflow.name)) exports.set(a.r.workflow.name, a)
  const ids = new Map(), empreintes = {}, W = {}
  for (const [nom, a] of [...exports].sort()) {
    const w = { ...a.r.workflow }
    delete w.scopes
    w.exporte_le = a.quand
    w.source = 'MCP n8n-oracle get_workflow_details (tâche 036-001), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
    writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
    ids.set(w.id, nom); W[nom] = w
    empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
  }
  writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')
  let ecarts = 0
  const k = F.lireCopie()
  for (const nom of NOMS) {
    if (!W[nom]) { ecarts++; console.error(`ÉCART ${nom} : export absent`); continue }
    const attendu = codesAttendus(nom, k), codes = W[nom].nodes.filter((n) => n.type === 'n8n-nodes-base.code')
    if (codes.length !== Object.keys(attendu).length) { ecarts++; console.error(`ÉCART ${nom} : ${codes.length} nœuds Code au lieu de ${Object.keys(attendu).length}`) }
    for (const [noeud, js] of Object.entries(attendu)) { const n = codes.find((y) => y.name === noeud); if (!n || n.parameters.jsCode !== js) { ecarts++; const v = n ? n.parameters.jsCode : ''; let i = 0; while (i < js.length && v[i] === js[i]) i++; console.error(`ÉCART ${nom} / ${noeud} : diffère au caractère ${i} (attendu « ${js.slice(i, i + 40)} », exporté « ${String(v).slice(i, i + 40)} »)`) } }
  }
  const sortiesDe = (r, noeud) => (r?.data?.resultData?.runData?.[noeud] ?? r?.execution?.data?.resultData?.runData?.[noeud] ?? []).flatMap((run) => (run.data?.main?.[0] ?? []).map((i) => i.json))
  const essais = []
  for (const a of lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId)) {
    const nom = ids.get(a.entree.workflowId); if (!nom) continue
    const exe = Number(a.r.executionId)
    const lecture = lus.filter((x) => x.nom === 'get_workflow_execution' && String(x.entree.executionId) === String(a.r.executionId) && x.entree.includeData && (x.r?.execution || x.r?.data) && (x.r?.execution?.status === 'error' || sortiesDe(x.r, FINAL(nom)).length)).at(-1)
    if (!lecture) { console.error(`exécution ${exe} jamais relue : essai écarté`); continue }
    const pins = Object.fromEntries(Object.entries(a.entree.pinData ?? {}).map(([n, v]) => [n, v.map((p) => p.json)]))
    const dec = DECLENCHEUR(W[nom])
    const statut = lecture.r.execution?.status ?? lecture.r.status
    const e = { workflow: nom, execution: exe, titre: TITRES[exe] ?? 'essai', statut_n8n: statut, noeud: FINAL(nom), entrees: pins[dec] ?? [], epingles: Object.fromEntries(Object.entries(pins).filter(([n]) => n !== dec)) }
    const err = lecture.r.data?.resultData?.error?.message ?? lecture.r.execution?.data?.resultData?.error?.message
    if (SONDES[exe]) e.sonde = SONDES[exe]
    if (statut === 'error') e.erreur = err ?? a.r.error ?? 'erreur'
    else e.sorties = sortiesDe(lecture.r, FINAL(nom))
    essais.push(e)
  }
  essais.sort((x, y) => x.execution - y.execution)
  writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(essais, null, 1) + '\n')
  console.log(`journaux lus : ${journaux.length} ; exports : ${[...exports.keys()].sort().join(', ')}\nessais : ${essais.map((e) => `${e.workflow}#${e.execution}(${e.statut_n8n}, ${e.sorties?.length ?? 0} sortie(s))`).join(' ; ') || 'aucun'}\ncode des exports = construire.mjs : ${ecarts ? ecarts + ' écart(s)' : 'oui, octet pour octet'}`)
  process.exit(ecarts ? 1 : 0)
}
