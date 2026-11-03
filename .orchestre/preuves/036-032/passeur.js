import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

const entree = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: 'Appelé par un chef (outil)', parameters: { inputSource: 'passthrough' } } });

const controler = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Contrôler la cible', parameters: { mode: 'runOnceForEachItem', jsCode: `// lib-specialiste-outil (036-032) : passeur entre l'outil toolWorkflow d'un chef presti-dep-* et son lib-* spécialiste. toolWorkflow ajoute à
// l'élément les paramètres du modèle (cle) et toolCallId ; les lib-* ont un contrat strict (« champ hors contrat »). On ne garde que
// l'enveloppe du contrat, la simulation est FORCÉE à vrai, la cible est en liste blanche et doit porter le contrat de cette cible.
const PERMIS = { SrT4QJJmb6LLM1FK: 'lib-trier-demande', '8c8vkUeSkfgB5FAM': 'lib-porte-conformite', hckqX1tQjIommtTH: 'lib-decider', jGM56jxeLUVXZIiM: 'lib-relancer', F2son8oGwifPETg3: 'lib-controler-conflit', ScpXQIH54wmmuuel: 'lib-avis-lire', OW7vXn4aPzSYoSdm: 'lib-avis-repondre', '414xd7DQaRmEgoTs': 'lib-agenda-creneaux', znIxgrxNzUvGeanu: 'lib-synchroniser-outil', JtGOKOG1ssFP5z1u: 'lib-cout-ia', v2wfT9qB5e0LHtFI: 'lib-alerte-liste' };
const j = $json || {};
const cible = typeof j.cible === 'string' ? j.cible : '';
const enveloppe = { contrat: j.contrat, organisation_id: j.organisation_id, simulation: true, cle_idempotence: j.cle_idempotence, trace: j.trace, config: j.config, donnees: j.donnees };
const connue = Object.prototype.hasOwnProperty.call(PERMIS, cible);
let motif = null;
if (!connue) motif = 'cible hors liste blanche';
else if (typeof j.contrat !== 'string') motif = 'clé inconnue : aucune requête préparée sous cette clé dans ce passage';
else if (j.contrat !== PERMIS[cible] + '@1') motif = 'contrat différent de la cible (' + String(j.contrat).slice(0, 40) + ')';
return { json: { permise: motif === null, motif: motif, cible: cible, enveloppe: enveloppe } };` } } });

const permise = ifElse({ version: 2.2, config: { name: 'Cible permise ?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.permise }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }], combinator: 'and' } } } });

const enveloppeSeule = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Enveloppe seule', parameters: { mode: 'runOnceForEachItem', jsCode: `// L'élément transmis au spécialiste : l'enveloppe du contrat et rien d'autre (simulation : vrai).
return { json: $json.enveloppe };` } } });

const appeler = node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: 'Appeler le spécialiste', onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: expr("{{ $('Contrôler la cible').item.json.cible }}") }, mode: 'once', options: { waitForSubWorkflow: true } } } });

const refus = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Refus du passeur', parameters: { mode: 'runOnceForEachItem', jsCode: `// Rien n'est appelé : la réponse dit pourquoi, au format d'une sortie de contrat.
return { json: { contrat: 'lib-specialiste-outil@1', statut: 'rejete', simulation: true, resultat: null, effets_prevus: [], effets_faits: [], journal: [], erreurs: [String($json.motif || 'refus')] } };` } } });

export default workflow('lib-specialiste-outil', 'lib-specialiste-outil', { settings: { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false, saveManualExecutions: true, errorWorkflow: 'yekMM9ewk03F9y2q', callerPolicy: 'workflowsFromAList', callerIds: 'Ls0oFcQzzAk0rWcP,dNikTYPKKsivUbd3,bNAF6Xzx5On853kD,jo8eQMEwiB9wCbKN,L3GOS7euxi60jCZN,74bDhTw6cEBzPORZ,oHGOyqsZGoUooxa6' } })
  .add(entree)
  .to(controler)
  .to(permise.onTrue(enveloppeSeule.to(appeler)).onFalse(refus));
