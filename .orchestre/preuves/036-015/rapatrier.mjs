// 036-015 — rapatrie, SANS RETOUCHE, ce que le MCP `n8n-oracle` a rendu pendant la session (journal du harnais, .jsonl), comme 036-006 à 036-008 :
//   • les exports : dernière réponse de `get_workflow_details` (détail complet) des trois gabarits → <nom>.workflow.json
//     (on n'ôte que `scopes`, les droits de l'utilisateur du MCP, et `triggerInfo` ; on ajoute `exporte_le` et `source`) ;
//   • les essais : chaque `test_workflow` réussi dont l'exécution a été relue par `get_workflow_execution` (avec données) → essais-n8n.json,
//     avec les données épinglées d'entrée, le déclencheur, et la sortie de chaque nœud relu (une liste par sortie : un « si » rend « vrai » et « faux ») ;
//   • le registre des empreintes SHA-256 des nœuds Code (R19 de scripts/n8n-specs-qa.mjs) → empreintes-code.json.
//   node .orchestre/preuves/036-015/rapatrier.mjs <journal.jsonl>
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const NOMS = ['gabarit-artisan-apres', 'gabarit-artisan-operations', 'gabarit-artisan-direction']
// Les essais joués en simulation, par numéro d'exécution n8n, avec ce qu'ils prouvent (écrit par la session qui les a lancés).
const ETIQUETTES = {
  619: 'avis de 2 étoiles, Signature, type activé : une carte, jamais une publication',
  620: 'avis de 5 étoiles, Signature, type « reponse_avis_positif » activé : réponse prévue sur la fiche',
  621: 'demandes d’avis : e-mail consenti en Signature = envoi prévu, SMS = carte, sans consentement / hors rattrapage / clé vue / opposition = rien, entretien = carte',
  622: 'avis de 5 étoiles en Studio : une carte ; un avis déjà traité est ignoré',
  638: 'aucun créneau libre dans l’agenda lu : aucun rendez-vous, une carte',
  639: 'créneau choisi par le client, proposé, libre, validé : rendez-vous prévu ; import Excel demandé : aperçu prévu',
  640: 'stock sous le seuil : commande en brouillon (quantité calculée par le code) ; rappel de la veille en Studio : carte',
  643: 'document reçu dans Drive en Studio : carte « Document à classer »',
  653: 'page du matin : chiffres du code (1 250 €, 3 devis, …), envoi prévu par Telegram',
  654: 'page du matin sans aucune lecture : « non lu », jamais un zéro',
  655: 'rapport du lundi : chiffres du code, envoi prévu par Slack et export Sheets prévu',
}
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
      const fichier = /saved to (\S+\.txt)/.exec(t)?.[1]
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
  w.source = 'MCP n8n-oracle get_workflow_details (tâche 036-015), réponse enregistrée par le harnais puis recopiée par rapatrier.mjs, sans retouche ; « scopes » ôté'
  writeFileSync(path.join(ICI, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
  ids.set(w.id, nom)
  empreintes[nom] = Object.fromEntries(w.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(String(n.parameters?.jsCode ?? ''), 'utf8').digest('hex')]))
}
writeFileSync(path.join(ICI, 'empreintes-code.json'), JSON.stringify(empreintes, null, 2) + '\n')

const tests = lus.filter((x) => x.nom === 'test_workflow' && x.r?.executionId && x.r?.status === 'success' && ids.has(x.entree.workflowId))
const relue = (exec) => lus.filter((x) => x.nom === 'get_workflow_execution' && x.entree.executionId === exec && x.r?.execution && x.r?.data).at(-1)
const essais = []
for (const t of tests) {
  const exec = Number(t.r.executionId)
  const lecture = relue(t.r.executionId)
  if (!lecture || !ETIQUETTES[exec]) continue
  const run = lecture.r.data?.resultData?.runData ?? {}
  const sorties = {}
  for (const [noeud, passages] of Object.entries(run)) sorties[noeud] = passages.map((p) => (p.data?.main ?? []).map((sortie) => (sortie ?? []).map((i) => i.json)))
  essais.push({ workflow: ids.get(t.entree.workflowId), execution: exec, etiquette: ETIQUETTES[exec], statut_n8n: lecture.r.execution.status, declencheur: t.entree.triggerNodeName ?? null,
    entrees_epinglees: Object.fromEntries(Object.entries(pins(t.entree)).map(([k, v]) => [k, v.map((x) => x.json)])), sorties })
}
essais.sort((a, b) => a.execution - b.execution)
writeFileSync(path.join(ICI, 'essais-n8n.json'), JSON.stringify(essais, null, 2) + '\n')
console.log(`exports : ${[...exports.keys()].sort().join(', ')}\nessais : ${essais.map((e) => `${e.workflow}#${e.execution}(${e.statut_n8n}, ${Object.keys(e.sorties).length} nœud(s) relus)`).join(' ; ')}`)
