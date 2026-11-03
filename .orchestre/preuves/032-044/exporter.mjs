// Écrit l'export presti-relances.workflow.json à partir des MÊMES sources que le workflow créé dans n8n (noeuds/*.js et workflow-def.mjs),
// avec les identifiants rendus par n8n (ids.json : écrit après get_workflow_details). Copie dans plans/011-cadrage-01-11/briefs/.
//   node .orchestre/preuves/032-044/exporter.mjs
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { noeuds, CHAINE, BRANCHES, REGLAGES } from './workflow-def.mjs'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const fichierIds = path.join(ICI, 'ids.json')
const ids = existsSync(fichierIds) ? JSON.parse(readFileSync(fichierIds, 'utf8')) : { workflowId: 'A_REMPLIR', versionId: 'A_REMPLIR', noeuds: {}, webhooks: {} }
const nodes = noeuds().map((n) => ({ id: ids.noeuds[n.name] ?? randomUUID(), ...n, ...(ids.webhooks[n.name] ? { webhookId: ids.webhooks[n.name] } : {}) }))
const lien = (a, b) => [a, { main: [[{ node: b, type: 'main', index: 0 }]] }]
const connections = Object.fromEntries([
  ...CHAINE.slice(0, -1).map((n, i) => lien(n, CHAINE[i + 1])),
  ['Courriers a envoyer', { main: [BRANCHES.map(([f]) => ({ node: f, type: 'main', index: 0 }))] }],
  ...BRANCHES.map(([f, e]) => lien(f, e)),
])
const workflow = { id: ids.workflowId, name: 'presti-relances', active: false, isArchived: false, activeVersionId: null, versionId: ids.versionId, triggerCount: 0, nodeCount: nodes.length,
  settings: REGLAGES, tags: [], parentFolderId: null,
  description: "Chantier 4, lot L18 (tâche 032-044) : la décision et la préparation des relances de conversation (J+2, J+5, J+10), refaites dans n8n depuis app/api/cron/relances/route.ts. Modèle épinglé, envois désactivés. Inactif jusqu'au go de Benj.",
  connections, nodes, nodeGroups: [], activeVersion: null, meta: { aiBuilderAssisted: true, builderVariant: 'mcp' } }
const json = JSON.stringify({ workflow }, null, 2) + '\n'
writeFileSync(path.join(ICI, 'presti-relances.workflow.json'), json)
writeFileSync(path.join(ICI, '../../../plans/011-cadrage-01-11/briefs/c4-n8n-relances.workflow.json'), json)
console.log('export écrit :', nodes.length, 'nœuds')
