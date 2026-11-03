// Écrit l'export presti-accuse-reception.workflow.json à partir des MÊMES sources que le workflow créé dans n8n (noeuds/*.js et les
// gabarits de lecture de construire.mjs), avec les identifiants de nœuds rendus par n8n (get_workflow_details, 02/11/2026 22 h 24).
//   node .orchestre/preuves/032-040/exporter.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const code = (n) => readFileSync(path.join(ICI, 'noeuds', n), 'utf8')
const HOTE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const CRED = { supabaseApi: { id: 'dTewDK98MLrNckNG', name: 'Supabase account' } }
const SILENCE = 'in.(manuelle,escalade,horaire,humain,limite)'
const F = (c) => `$('Fenetre du passage').first().json.${c}`
const SURE = String.raw`/^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/`
const NUL = '00000000-0000-0000-0000-000000000000'
const PAGINATION = { pagination: { paginationMode: 'updateAParameterInEachRequest', parameters: { parameters: [{ type: 'qs', name: 'offset', value: '={{ $pageCount * 1000 }}' }] },
  paginationCompleteWhen: 'other', completeExpression: '={{ !Array.isArray($response.body) || $response.body.length < 1000 }}', limitPagesFetched: true, maxRequests: 50 } }
const fenetre = (a, b) => `={{ '(created_at.gte.' + ${F(a)} + ',created_at.lt.' + ${F(b)} + ')' }}`
const ORDRE = ['order', 'created_at.asc,id.asc'], LIMITE = ['limit', '1000']
const artisans = `={{ 'in.(' + ([...new Set($('Lire destinataires').all().map(i => i.json.artisan_id).filter(Boolean))].join(',') || '${NUL}') + ')' }}`
const adresses = `={{ '(' + ([...new Set($('Lire destinataires').all().map(i => String(i.json.contact || '').trim().toLowerCase()).filter(c => ${SURE}.test(c)))].map(c => 'contact.ilike.' + c).join(',') || 'contact.eq.-') + ')' }}`
const lecture = (id, nom, pos, table, params, notes) => ({ id, name: nom, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.5, position: pos,
  parameters: { method: 'GET', url: HOTE + table, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair',
    queryParameters: { parameters: params.map(([name, value]) => ({ name, value })) }, options: { timeout: 30000, pagination: PAGINATION } },
  ...(notes ? { notes } : {}), executeOnce: true, credentials: CRED })
const filtre = (id, nom, pos, valeur) => ({ id, name: nom, type: 'n8n-nodes-base.filter', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and', conditions: [{ leftValue: '={{ $json.courrier }}', operator: { type: 'string', operation: 'equals' }, rightValue: valeur }] } } })
const envoi = (id, nom, pos, notes, webhookId) => ({ id, name: nom, type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, position: pos,
  parameters: { operation: 'send', fromEmail: '={{ $json.de }}', toEmail: '={{ $json.a }}', subject: '={{ $json.sujet }}', emailFormat: 'text', text: '={{ $json.texte }}', options: { appendAttribution: false, replyTo: '={{ $json.repondre_a }}' } },
  disabled: true, notes, webhookId })
const nodes = [
  { id: 'fbb051a0-be5a-4876-bf30-8d8a3c24b811', name: 'Toutes les minutes', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.4, position: [0, 0], parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 * * * * *' }] } } },
  { id: 'c917efbe-a060-4776-abaa-0df4aaaeb8c8', name: 'Fenetre du passage', type: 'n8n-nodes-base.code', typeVersion: 2, position: [224, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('fenetre.js') } },
  lecture('e8851557-6c96-4dca-9cb6-e368d236dcb5', 'Lire demandes du jour', [448, 0], 'leads', [['select', 'id,artisan_id,created_at,motif_reponse'], ['and', fenetre('depuis_jour', 'fin')], ['motif_reponse', SILENCE], ORDRE, LIMITE]),
  lecture('84a58a6d-de05-477e-a7bc-fb8d73e79c29', 'Lire destinataires', [672, 0], 'leads', [['select', 'id,artisan_id,created_at,motif_reponse,nom_prospect,contact'], ['and', fenetre('debut', 'fin')], ['motif_reponse', SILENCE], ORDRE, LIMITE],
    "lecture-pour-envoi: Envoyer l accuse\nLue au moment d'envoyer seulement : le nom et l'adresse du prospect, des demandes de la dernière minute dont le chemin codé a laissé l'accusé à n8n (motif du silence). Elle sert aussi l'avis à l'artisan (Envoyer l avis)."),
  lecture('7ec59767-b53f-4bd4-bc57-47aeb8f341e4', 'Lire comptes', [896, 0], 'artisans', [['select', 'id,nom,email,notifications'], ['id', artisans], ['order', 'id'], LIMITE],
    "lecture-pour-envoi: Envoyer l avis\nLue au moment d'envoyer seulement : le nom et l'adresse de l'artisan (marque blanche et Reply-To) et ses préférences de notification (nouvelle_demande). Elle sert aussi l'accusé (Envoyer l accuse)."),
  lecture('4f2c6c48-ea8c-4f99-a0fe-9b4df69f1ebf', 'Lire doublons', [1120, 0], 'leads', [['select', 'id,contact,created_at'], ['and', fenetre('depuis_doublons', 'fin')], ['or', adresses], ORDRE, LIMITE],
    "lecture-pour-envoi: Envoyer l accuse\nLue au moment d'envoyer seulement : les demandes des dernières 24 h faites avec les mêmes adresses, pour tenir le plafond par destinataire de lib/email.ts:81 que n8n contourne en envoyant lui-même."),
  { id: '535bd480-fe39-4be3-ba49-8d56a926323c', name: 'Courriers a envoyer', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1344, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('courriers.js') } },
  filtre('35efc8be-ceaa-480d-bd24-50e84fba7268', 'Garder les accuses', [1568, 0], 'accuse'),
  envoi('1d44480f-bcea-4f79-8bc6-e8a149aadf90', 'Envoyer l accuse', [1792, 0], "pied: aucun\nSIMULATION : nœud désactivé, sans identifiant SMTP (à poser par Benj). Texte fixe de app/api/leads/route.ts:402, au nom de l'artisan, Reply-To = son adresse, sans la mention d'IA.", 'db64a447-0795-497c-b4ac-18313d12e5ea'),
  filtre('49c847e5-b171-46e7-847e-7561b3b14195', 'Garder les avis', [2016, 0], 'avis'),
  envoi('0ae935fa-f79e-49cb-bb12-546cf8e76c73', 'Envoyer l avis', [2240, 0], "pied: aucun\nSIMULATION : nœud désactivé, sans identifiant SMTP (à poser par Benj). Avis de Presti à l'artisan (app/api/leads/route.ts:386), Reply-To = le prospect.", '050a90e9-b47c-46f0-b6f4-25a5b03e67a5'),
  { id: 'a0f9fb2a-4cf6-4fb6-80d9-cea86391ab99', name: 'Sticky Note 6c7fcf6c', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [784, 192],
    parameters: { content: "## presti-accuse-reception — inactif, en simulation\nToutes les minutes : lit les demandes de la minute écoulée dont le chemin codé a laissé l'accusé à n8n, et prépare l'avis à l'artisan et l'accusé de réception au prospect (au nom de l'artisan). Les deux nœuds d'envoi sont DÉSACTIVÉS et sans identifiant : rien ne part. Brief : plans/011-cadrage-01-11/briefs/c4-n8n-accuse-reception.md", width: 760, height: 200 } },
]
const lien = (a, b) => [a, { main: [[{ node: b, type: 'main', index: 0 }]] }]
const connections = Object.fromEntries([
  lien('Toutes les minutes', 'Fenetre du passage'), lien('Fenetre du passage', 'Lire demandes du jour'), lien('Lire demandes du jour', 'Lire destinataires'), lien('Lire destinataires', 'Lire comptes'),
  lien('Lire comptes', 'Lire doublons'), lien('Lire doublons', 'Courriers a envoyer'),
  ['Courriers a envoyer', { main: [[{ node: 'Garder les accuses', type: 'main', index: 0 }, { node: 'Garder les avis', type: 'main', index: 0 }]] }],
  lien('Garder les accuses', 'Envoyer l accuse'), lien('Garder les avis', 'Envoyer l avis'),
])
const workflow = { id: 'VnU1onu9T4Z2asTu', name: 'presti-accuse-reception', active: false, isArchived: false, activeVersionId: null, triggerCount: 0, nodeCount: nodes.length,
  settings: { timezone: 'Europe/Paris', executionTimeout: 120, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', errorWorkflow: 'AQeHiC58UgbMR4Kr', availableInMCP: true, executionOrder: 'v1' },
  tags: [], parentFolderId: null,
  description: "Chantier 4, lot L18 (tâche 032-040) : accusé de réception au prospect (au nom de l'artisan) et avis à l'artisan, refaits dans n8n depuis app/api/leads/route.ts — toutes les minutes, lectures GET seulement, envois DÉSACTIVÉS. Inactif jusqu'au « go » de Ben",
  connections, nodes, nodeGroups: [], activeVersion: null, meta: { aiBuilderAssisted: true, builderVariant: 'mcp' } }
writeFileSync(path.join(ICI, 'presti-accuse-reception.workflow.json'), JSON.stringify({ workflow }, null, 2) + '\n')
console.log('export écrit :', nodes.length, 'nœuds')
