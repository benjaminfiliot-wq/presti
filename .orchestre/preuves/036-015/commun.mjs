// 036-015 — pièces communes des trois gabarits outillés (Après-chantier, Opérations, Direction). Hors ligne : aucun réseau, aucune base, aucun modèle.
// Elles fabriquent des PROGRAMMES SDK (collés tels quels dans create_workflow_from_code), comme 036-006 à 036-008.
//   node --experimental-strip-types --no-warnings .orchestre/preuves/036-015/construire.mjs <apres|operations|direction> > /tmp/x.sdk.js
import { mentionAssistant } from '../../../lib/mentionAssistant.ts'
import { PIED_APRES } from '../../../lib/apresChantier.ts'

export const J = JSON.stringify
export const SUPA = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1'
export const ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
export const MENTION = mentionAssistant('').replace(/\.$/, '') // « Message rédigé et envoyé automatiquement par l’assistant »
export { PIED_APRES }
export const ORG = '00000000-0000-4000-8000-000000000901' // l'organisation FICTIVE des bancs d'essai (comme 036-006 à 036-008)
export const LIB = { 'lib-avis-lire': 'ScpXQIH54wmmuuel', 'lib-avis-repondre': 'OW7vXn4aPzSYoSdm', 'lib-agenda-creneaux': '414xd7DQaRmEgoTs', 'lib-synchroniser-outil': 'znIxgrxNzUvGeanu',
  'lib-alerte-liste': 'v2wfT9qB5e0LHtFI', 'lib-cout-ia': 'JtGOKOG1ssFP5z1u', 'lib-controler-conflit': 'F2son8oGwifPETg3' }

export const IMPORTS = "import { workflow, node, trigger, ifElse, sticky, expr, languageModel, outputParser, tool } from '@n8n/workflow-sdk';"
export const REGLAGES = { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 300, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false,
  saveManualExecutions: true, errorWorkflow: ERREUR, callerPolicy: 'none' }

// ─── Les fabricants de nœuds (texte SDK) ─────────────────────────────────────────────────────────────────────────────────────
// La fiche Google d'un client : compte et lieu à remplacer par la copie (n8n les exige pour tester le nœud).
export const FICHE = { account: { __rl: true, mode: 'name', value: 'accounts/000000000000' }, location: { __rl: true, mode: 'name', value: 'locations/000000000000' } }
export const E = (s) => `expr(${J(s)})`
export const code = (nom, js, notes) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
export const si = (nom, champ, notes) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: ${J(champ.replace(/\W/g, '-').slice(0, 40))}, leftValue: expr(${J('{{ ' + champ + ' }}')}), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} } } })`
export const porte = () => si('Porte simulation', '$json.simulation', "porte: simulation\nVrai : simulation, rien ne part, rien ne s'écrit. Faux : l'effet réel (jamais atteint tant que la copie du client n'a pas le « go » de Benj).")
export const horloge = (nom, regle) => `trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: ${J(nom)}, parameters: { rule: { interval: [${J(regle)}] } } } })`
// Une lecture de la plateforme (HTTP GET, hôte en dur, un seul select=, filtre du compte). Aucun identifiant : la copie du client branche le sien.
export const lire = (nom, table, select, extra = [], notes, vide = true) => `node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: ${J(nom)}, ${vide ? 'alwaysOutputData: true, ' : ''}${notes ? `notes: ${J(notes)}, ` : ''}parameters: { method: 'GET', url: ${J(SUPA + '/' + table)}, sendQuery: true, specifyQuery: 'keypair', queryParameters: { parameters: [{ name: 'select', value: ${J(select)} }, { name: 'organisation_id', value: expr(${J("eq.{{ $('Compte et mode').first().json.organisation_id }}")}) }${extra.map((x) => `, { name: ${J(x[0])}, value: ${x[1].startsWith('=') ? `expr(${J(x[1].slice(1))})` : J(x[1])} }`).join('')}] }, options: {} } } })`
// Un dépôt dans la plateforme (HTTP POST, organisation_id dans le corps, doublon ignoré : idempotence par clé).
export const deposer = (nom, table, corps, notes) => `node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: ${J(nom)}, ${notes ? `notes: ${J(notes)}, ` : ''}parameters: { method: 'POST', url: ${J(SUPA + '/' + table)}, sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: 'resolution=ignore-duplicates' }] }, sendBody: true, specifyBody: 'json', jsonBody: expr(${J('{{ JSON.stringify(' + corps + ') }}')}), options: {} } } })`
// Un outil de lecture branché sur un agent (R23) : sa fiche dit ce qu'il lit.
export const outil = (type, version, nom, params, notes) => `tool({ type: ${J(type)}, version: ${version}, config: { name: ${J(nom)}, notes: ${J(notes)}, parameters: ${J(params)} } })`
export const outilWorkflow = (nom, id, description) => `tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.2, config: { name: ${J(nom)}, notes: ${J('outil: lecture\nAppelle ' + nom.replace(/^.*: /, '') + ' par son identifiant (aucune écriture). La liste des appelants de ce sous-workflow se complète à l’intégration (036-012).')}, parameters: { description: ${J(description)}, workflowId: { __rl: true, mode: 'id', value: ${J(id)} }, workflowInputs: { mappingMode: 'defineBelow', value: {} } } } })`
// Un spécialiste : Claude + parseur à schéma strict + outils de lecture (R18, R23). Rend [déclarations, nom du nœud agent].
export function specialiste(cle, nom, systeme, schema, outils, texte = '{{ $json.consigne }}') {
  const l = []
  l.push(`const lm${cle} = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3, config: { name: ${J('Claude · ' + nom)}, notes: ${J('Modèle du spécialiste « ' + nom + ' » : Claude Haiku 5.5, température basse, sans identifiant dans le gabarit (la copie du client branche sa clé).')}, parameters: { model: { __rl: true, mode: 'list', value: 'claude-haiku-5-5' }, options: { maxTokensToSample: 900, temperature: 0.2 } } } });`)
  l.push(`const sp${cle} = outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { name: ${J('Schéma · ' + nom)}, notes: ${J('Schéma strict (JSON Schema saisi, autoFix faux) : hors schéma = rejet, la sortie repasse un Code qui la revalide.')}, parameters: { schemaType: 'manual', inputSchema: ${J(J(schema))}, autoFix: false } } });`)
  outils.forEach((o, i) => l.push(`const ou${cle}${i} = ${o};`))
  l.push(`const ag${cle} = node({ type: '@n8n/n8n-nodes-langchain.agent', version: 3.1, config: { name: ${J(nom)}, notes: ${J('Agent IA « ' + nom + ' » : le modèle rédige, il ne compte rien et ne décide de rien ; ses outils lisent seulement.')}, parameters: { promptType: 'define', text: expr(${J(texte)}), hasOutputParser: true, options: { systemMessage: ${J(systeme)}, maxIterations: 4, passthroughBinaryImages: false } }, subnodes: { model: lm${cle}, outputParser: sp${cle}, tools: [${outils.map((_, i) => `ou${cle}${i}`).join(', ')}] } } });`)
  return l.join('\n')
}
export const note = (contenu) => `const note = sticky(${J(contenu)});`
export const programme = (nom, descriptionCourte, corps, chaine) => [IMPORTS, ...corps, `export default workflow(${J(nom)}, ${J(nom)}, { settings: ${J(REGLAGES)} })`, ...chaine].join('\n') + '\n'
