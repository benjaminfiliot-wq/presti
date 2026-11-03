// Écrit l'export presti-reponse-seule.workflow.json à partir des MÊMES sources que le workflow créé dans n8n (noeuds/*.js et workflow-def.mjs),
// avec les identifiants de nœuds rendus par n8n (get_workflow_details, 03/11/2026 00 h 13). Copie dans plans/011-cadrage-01-11/briefs/.
//   node .orchestre/preuves/032-042/exporter.mjs
import { writeFileSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { noeuds, CHAINE, BRANCHES, REGLAGES } from './workflow-def.mjs'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const IDS = {
  'Toutes les minutes': '2769769e-0200-425f-991d-49a81fdb9c23', 'Fenetre du passage': 'fe4055a8-1b27-46af-94ed-790e2a4d4738', 'Lire demandes du jour': '8f53d233-0aa2-440a-a667-7d3a565f0007',
  'Lire demandes': '0b7951cf-a6b4-467d-9efc-3784846225ed', 'Lire comptes': '2f4d66ae-8ea7-46b8-83e4-22919145256f', 'Lire reglages': '077a352a-822e-4454-86d4-6552b1d7afdf',
  'Lire rafale': '8729bfdb-34e3-4270-971c-269ca3a602f8', 'Lire doublons': 'dbaecd5a-81da-4bd9-9800-0a31144734e5', Decider: 'b5285928-a02d-4d90-adde-f4331c9e83f4',
  'Modele epingle': '65cd8a1a-4acb-4eb4-9bb4-3dd74e8e3034', 'Courriers a envoyer': '68ebf468-f469-4c1f-88de-c55df3249df1', 'Garder les reponses': '7af43685-c575-4158-a272-65f140f2c7a0',
  'Envoyer la reponse': '2fcdfc00-5993-4981-a300-1190807ffd18', 'Garder les avis': '299f8778-4a5f-4e0c-a1e7-0806b74f6d84', 'Envoyer l avis': '40632e38-c7c5-4577-ba5e-666842f7dd0c',
}
const WEBHOOKS = { 'Envoyer la reponse': 'a386f78c-f0bc-4dd6-9107-78ed5ba4e267', 'Envoyer l avis': 'b8ff88e5-14ae-4785-9169-50af7b282179' }
const nodes = noeuds().map((n) => ({ id: IDS[n.name], ...n, ...(WEBHOOKS[n.name] ? { webhookId: WEBHOOKS[n.name] } : {}) }))
const lien = (a, b) => [a, { main: [[{ node: b, type: 'main', index: 0 }]] }]
const connections = Object.fromEntries([
  ...CHAINE.slice(0, -1).map((n, i) => lien(n, CHAINE[i + 1])),
  ['Courriers a envoyer', { main: [BRANCHES.map(([f]) => ({ node: f, type: 'main', index: 0 }))] }],
  ...BRANCHES.map(([f, e]) => lien(f, e)),
])
const workflow = { id: '5g63ItVJ41l3yP9V', name: 'presti-reponse-seule', active: false, isArchived: false, activeVersionId: null, versionId: 'f73e9bba-7058-43d8-8f75-38d585785024', triggerCount: 0, nodeCount: nodes.length,
  settings: REGLAGES, tags: [], parentFolderId: null,
  description: "Chantier 4, lot L18 (tâche 032-042) : la décision et la préparation de la réponse qui part seule, refaites dans n8n depuis app/api/leads/route.ts. Modèle épinglé, envois désactivés. Inactif jusqu'au go de Benj.",
  connections, nodes, nodeGroups: [], activeVersion: null, meta: { aiBuilderAssisted: true, builderVariant: 'mcp' } }
const json = JSON.stringify({ workflow }, null, 2) + '\n'
writeFileSync(path.join(ICI, 'presti-reponse-seule.workflow.json'), json)
writeFileSync(path.join(ICI, '../../../plans/011-cadrage-01-11/briefs/c4-n8n-reponse-seule.workflow.json'), json)
console.log('export écrit :', nodes.length, 'nœuds')
