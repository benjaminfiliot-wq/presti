// Fabrique l'export FICTIF `gabarit-exemple-outils` (03/11, prompt 6, outillage) : le plus petit gabarit outillé qui tienne toutes les
// règles de scripts/n8n-specs-qa.mjs (R1 à R23), avec un vrai déclencheur Gmail, un agent IA (Claude, parseur, deux outils de lecture),
// la porte « simulation » et deux effets derrière elle (brouillon Gmail, carte). Les mutants du juge partent de lui. Exemple. Données fictives.
//   node --experimental-strip-types --no-warnings scripts/fixtures/n8n-specs-qa/fabriquer-gabarit-exemple.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { mentionAssistant } from '../../../lib/mentionAssistant.ts'

const D = path.dirname(fileURLToPath(import.meta.url))
const MENTION = mentionAssistant('').replace(/\.$/, '')
const lien = (node, type = 'main') => ({ node, type, index: 0 })
const SUPA = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1'
const cred = { supabaseApi: { id: 'IdentifiantFictif01', name: 'Supabase account' } }
const code = (name, jsCode) => ({ id: name.slice(0, 8), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode } })
const nodes = [
  { id: 'gt', name: 'Nouvel e-mail', type: 'n8n-nodes-base.gmailTrigger', typeVersion: 1.2, position: [0, 0], parameters: { pollTimes: { item: [{ mode: 'everyMinute' }] }, simple: false, filters: {}, options: {} } },
  code('Préparer', [
    "// Exemple. Gabarit fictif : le compte vient de la copie du client, jamais d'une adresse.",
    'const m = $input.first().json;',
    "return [{ json: { organisation_id: 'OrganisationFictive01', message_id: String(m.id ?? ''), sujet: String(m.subject ?? '').slice(0, 200) } }];",
  ].join('\n')),
  { id: 'rc', name: 'Relire la configuration', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [0, 0], credentials: cred,
    parameters: { method: 'GET', url: `${SUPA}/configuration_organisation`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair',
      queryParameters: { parameters: [{ name: 'select', value: 'simulation,interrupteur' }, { name: 'organisation_id', value: "=eq.{{ $('Préparer').first().json.organisation_id }}" }] }, options: {} } },
  { id: 'ps', name: 'Porte simulation', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [0, 0], notes: "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel.",
    parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{ id: 'sim', leftValue: "={{ $('Relire la configuration').first().json.simulation }}", rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} } },
  code('Effets prévus', "// Branche « simulation » : rien n'est écrit ni envoyé, l'effet prévu part au journal.\nreturn [{ json: { effets_prevus: ['brouillon', 'carte'], effets_faits: [] } }];"),
  { id: 'ag', name: 'Rédacteur', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3.1, position: [0, 0],
    parameters: { promptType: 'define', text: "={{ $('Préparer').first().json.sujet }}", hasOutputParser: true,
      options: { systemMessage: 'Exemple. Rédige une réponse courte, sans prix ni délai inventé.', maxIterations: 4, passthroughBinaryImages: false } } },
  { id: 'lm', name: 'Claude', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', typeVersion: 1.3, position: [0, 0],
    parameters: { model: { __rl: true, mode: 'list', value: 'claude-haiku-5-5' }, options: { maxTokensToSample: 800, temperature: 0.2 } } },
  { id: 'sp', name: 'Schéma de la réponse', type: '@n8n/n8n-nodes-langchain.outputParserStructured', typeVersion: 1.2, position: [0, 0],
    parameters: { schemaType: 'manual', inputSchema: JSON.stringify({ type: 'object', additionalProperties: false, required: ['reponse'], properties: { reponse: { type: 'string', maxLength: 1200 } } }), autoFix: false } },
  { id: 'lf', name: 'Lire le fil', type: 'n8n-nodes-base.gmailTool', typeVersion: 2.1, position: [0, 0],
    parameters: { resource: 'thread', operation: 'get', threadId: "={{ $fromAI('fil', 'identifiant du fil', 'string') }}", options: {} } },
  { id: 'tw', name: 'Trier la demande', type: '@n8n/n8n-nodes-langchain.toolWorkflow', typeVersion: 2.2, position: [0, 0], notes: 'outil: lecture',
    parameters: { description: 'Exemple. Classe la demande (urgence, peut attendre, curieux, spam, client existant).',
      workflowId: { __rl: true, mode: 'id', value: 'LibTrierFictif01' }, workflowInputs: { mappingMode: 'defineBelow', value: {} } } },
  code('Revalider la sortie', [
    '// La sortie du modèle repasse le schéma : hors schéma, rien ne part.',
    'const r = $input.first().json.output ?? {};',
    "if (typeof r.reponse !== 'string' || !r.reponse.trim() || r.reponse.length > 1200) throw new Error('hors schéma');",
    'return [{ json: { reponse: r.reponse } }];',
  ].join('\n')),
  { id: 'bg', name: 'Brouillon Gmail', type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: [0, 0], notes: 'pied: mention',
    parameters: { resource: 'draft', operation: 'create', subject: "={{ 'Re: ' + $('Préparer').first().json.sujet }}", message: `={{ $json.reponse }}\n\n${MENTION} de Exemple. Artisan.`, options: {} } },
  { id: 'ec', name: 'Écrire la carte', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [0, 0], credentials: cred,
    parameters: { method: 'POST', url: `${SUPA}/assistant_actions`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Prefer', value: 'resolution=ignore-duplicates' }] }, sendBody: true, specifyBody: 'json',
      jsonBody: "={{ JSON.stringify({ organisation_id: $('Préparer').first().json.organisation_id, type: 'brouillon_pret', cle: $('Préparer').first().json.message_id }) }}", options: {} } },
]
const wf = {
  name: 'gabarit-exemple-outils', active: false, nodes,
  connections: {
    'Nouvel e-mail': { main: [[lien('Préparer')]] }, 'Préparer': { main: [[lien('Relire la configuration')]] }, 'Relire la configuration': { main: [[lien('Porte simulation')]] },
    'Porte simulation': { main: [[lien('Effets prévus')], [lien('Rédacteur')]] }, 'Rédacteur': { main: [[lien('Revalider la sortie')]] },
    'Claude': { ai_languageModel: [[lien('Rédacteur', 'ai_languageModel')]] }, 'Schéma de la réponse': { ai_outputParser: [[lien('Rédacteur', 'ai_outputParser')]] },
    'Lire le fil': { ai_tool: [[lien('Rédacteur', 'ai_tool')]] }, 'Trier la demande': { ai_tool: [[lien('Rédacteur', 'ai_tool')]] },
    'Revalider la sortie': { main: [[lien('Brouillon Gmail')]] }, 'Brouillon Gmail': { main: [[lien('Écrire la carte')]] },
  },
  settings: { executionOrder: 'v1', timezone: 'Europe/Paris', errorWorkflow: 'ErreurCommuneFictif01', executionTimeout: 120, saveDataErrorExecution: 'all', callerPolicy: 'none' },
}
fs.writeFileSync(path.join(D, 'gabarit-exemple-outils.workflow.json'), JSON.stringify(wf, null, 2) + '\n')
const f = path.join(D, 'empreintes-code.json')
const reg = JSON.parse(fs.readFileSync(f, 'utf8'))
reg['gabarit-exemple-outils'] = Object.fromEntries(nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(n.parameters.jsCode, 'utf8').digest('hex')]))
fs.writeFileSync(f, JSON.stringify(reg, null, 2) + '\n')
console.log(`gabarit-exemple-outils : ${nodes.length} nœuds, ${Object.keys(reg['gabarit-exemple-outils']).length} empreintes`)
