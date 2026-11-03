// 036-038 : fabrique le code SDK n8n des workflows du réel depuis la SOURCE UNIQUE lib/agents/n8n/envoi-reel.mjs (aucun code recopié à la
// main). Usage : node poser-n8n.mjs <courriel|envoi|banc> [idLibEnvoyer] > code.js ; le code passe ensuite validate_workflow puis
// create_workflow_from_code (MCP n8n-oracle). Ne touche à rien d'autre.
import * as R from '../../../lib/agents/n8n/envoi-reel.mjs'
const quoi = process.argv[2], idLib = process.argv[3] || 'A_REMPLIR'
const J = (v) => JSON.stringify(v)
const SB = R.SUPABASE + '/rest/v1/'
const supa = `{ supabaseApi: { id: ${J(R.IDENTIFIANT_SUPABASE.id)}, name: ${J(R.IDENTIFIANT_SUPABASE.name)} } }`
const VIDE = '00000000-0000-0000-0000-000000000000'
const enListe = (expr) => `={{ 'in.(' + (${expr} || '${VIDE}') + ')' }}`
const IDS = "$('Comptes au réel').first().json.ids.join(',')"
const CARTES = "$('Lire les cartes à envoyer').all().map(x => x.json).filter(c => c && c.id && c.entrees)"
const lecture = (nom, table, req) => `node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: ${J(nom)}, executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput',
  credentials: ${supa}, parameters: { method: 'GET', url: ${J(SB + table)}, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair',
  queryParameters: { parameters: ${J(req.map(([name, value]) => ({ name, value })))} }, options: { timeout: 20000 } } } })`
const code = (nom, js) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, parameters: { jsCode: ${J(js)} } } })`
const si = (nom, gauche, op, droite) => `ifElse({ version: 2.2, config: { name: ${J(nom)}, parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
  conditions: [{ leftValue: ${J(gauche)}, operator: ${J(op)}, rightValue: ${J(droite)} }], combinator: 'and' } } } })`
const vrai = { type: 'boolean', operation: 'true', singleValue: true }
const patch = (nom, url, corps, prefer, toujours) => `node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: ${J(nom)}, onError: 'continueRegularOutput', ${toujours ? 'alwaysOutputData: true, ' : ''}credentials: ${supa},
  parameters: { method: 'PATCH', url: ${J(url)}, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: ${J(prefer)} }] },
  sendBody: true, specifyBody: 'json', jsonBody: ${J(corps)}, options: { timeout: 20000 } } } })`
const appel = (nom) => `node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J(nom)}, onError: 'continueRegularOutput',
  parameters: { source: 'database', workflowId: { __rl: true, value: ${J(idLib)}, mode: 'id' }, mode: 'each', options: { waitForSubWorkflow: true } } } })`
const tete = "import { workflow, node, trigger, ifElse } from '@n8n/workflow-sdk';\n"
const reglages = (extra) => `{ executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 120, saveDataErrorExecution: 'all', saveExecutionProgress: false, errorWorkflow: 'yekMM9ewk03F9y2q', ${extra} }`

if (quoi === 'courriel') {
  console.log(tete + `
const recu = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { name: 'Reçu de l’appelant', parameters: { inputSource: 'passthrough' } } });
const controler = ${code('Contrôler l’enveloppe', R.CODE_CONTROLER)};
const envoyable = ${si('Envoyable ?', '={{ $json.ok }}', vrai, '')};
const resend = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: 'Envoyer par Resend', onError: 'continueRegularOutput',
  credentials: { httpHeaderAuth: { id: ${J(R.IDENTIFIANT_RESEND.id)}, name: ${J(R.IDENTIFIANT_RESEND.name)} } },
  parameters: { method: 'POST', url: 'https://api.resend.com/emails', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
    sendHeaders: true, headerParameters: { parameters: [{ name: 'Idempotency-Key', value: '={{ $json.cle_idempotence }}' }] },
    sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.corps) }}', options: { timeout: 20000 } } } });
const rendre = ${code('Rendre le résultat', R.CODE_RENDRE)};
export default workflow('lib-envoyer-courriel', 'lib-envoyer-courriel', { settings: ${reglages("saveDataSuccessExecution: 'none', saveManualExecutions: true, callerPolicy: 'workflowsFromSameOwner'")} })
  .add(recu).to(controler).to(envoyable.onTrue(resend.to(rendre)).onFalse(rendre));`)
} else if (quoi === 'envoi' || quoi === 'banc') {
  const banc = quoi === 'banc'
  // Les nœuds de lecture : vrais dans presti-dep-envoi ; dans le banc, des Code de MÊME NOM qui rendent des lignes fictives (jamais une vraie donnée).
  const F = JSON.parse(process.env.BANC_FICTIF || '{}')
  const lect = (nom, table, req) => banc ? code(nom, 'return ' + J((F[nom] || []).map((json) => ({ json }))) + ';') : lecture(nom, table, req)
  const n = {
    depart: banc ? `trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Lancer le banc (jamais publié)', parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 24 }] } } } })`
      : `trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Toutes les minutes', parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } } } })`,
    lireDeps: banc ? code('Lire les départements au réel', 'return ' + J((F['Lire les départements au réel'] || []).map((json) => ({ json }))) + ';')
      : lecture('Lire les départements au réel', 'departements_reglages', [['select', 'artisan_id,departement,palier,en_marche'], ['palier', 'eq.reel'], ['en_marche', 'is.true'], ['order', 'artisan_id.asc'], ['limit', '1000']]),
    comptes: code('Comptes au réel', R.CODE_COMPTES_REEL),
    desComptes: si('Des comptes au réel ?', '={{ $json.ids.length > 0 }}', vrai, ''),
    pause: banc ? code('Lire la pause générale', "return [{ json: { data: 'false' } }];")
      : `node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: 'Lire la pause générale', executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput', credentials: ${supa},
  parameters: { method: 'POST', url: ${J(SB + 'rpc/ops_interrupteur')}, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: '{"p_nom":"pause_generale"}',
    options: { timeout: 20000, response: { response: { responseFormat: 'text', outputPropertyName: 'data' } } } } } })`,
    cartes: lect('Lire les cartes à envoyer', 'assistant_actions', [['select', 'id,artisan_id,outil,statut,origine,departement,entrees,apercu,cle,expire_le'], ['origine', 'eq.agent'], ['statut', 'in.(en_attente,en_cours)'],
      ['entrees->>palier', 'eq.reel'], ['artisan_id', enListe(IDS)], ['order', 'cree_le.asc'], ['limit', '50']]),
    artisans: lect('Lire les comptes', 'artisans', [['select', 'id,nom,email,plan,leads_pause,est_demo,suppression_demandee_le'], ['id', enListe(IDS)], ['limit', '100']]),
    leads: lect('Lire les destinataires', 'leads', [['select', 'id,artisan_id,contact,prise_en_main,statut'], ['id', enListe(`[...new Set(${CARTES}.filter(c => c.outil !== 'relance_impaye').map(c => c.entrees.objet_id).filter(Boolean))].join(',')`)], ['artisan_id', enListe(IDS)], ['limit', '100']]),
    factures: lect('Lire les factures', 'factures', [['select', 'id,artisan_id,client_email,statut,numero'], ['id', enListe(`[...new Set(${CARTES}.filter(c => c.outil === 'relance_impaye').map(c => c.entrees.objet_id).filter(Boolean))].join(',')`)], ['artisan_id', enListe(IDS)], ['limit', '100']]),
    reponses: lect('Lire les réponses des clients', 'messages', [['select', 'lead_id,contenu,sent_at'], ['sens', 'eq.in'], ['lead_id', enListe(`[...new Set(${CARTES}.filter(c => c.outil !== 'relance_impaye').map(c => c.entrees.objet_id).filter(Boolean))].join(',')`)], ['order', 'sent_at.desc'], ['limit', '500']]),
    opp: lect('Lire les oppositions', 'crm_apres_opposition', [['select', 'artisan_id,empreinte'], ['artisan_id', enListe(IDS)], ['limit', '1000']]),
    imp: lect('Lire les réglages d’impayés', 'relances_impayes_reglages', [['select', 'artisan_id,actif'], ['artisan_id', enListe(IDS)], ['limit', '100']]),
    jour: lect('Lire les envois du jour', 'assistant_actions', [['select', 'artisan_id'], ['origine', 'eq.agent'], ['statut', 'eq.executee'], ['entrees->>envoi', 'eq.pilote'], ['maj_le', "={{ 'gte.' + $('Comptes au réel').first().json.depuis_24h }}"], ['artisan_id', enListe(IDS)], ['limit', '1000']]),
    decider: code('Décider les envois', R.CODE_DECIDER),
    aEnvoyer: si('À envoyer ?', "={{ $json.genre === 'envoi' }}", vrai, ''),
    aNoter: si('À noter ?', "={{ $json.genre === 'noter' }}", vrai, ''),
    reclamer: banc ? code('Réclamer la carte', "// Banc : la réponse qu'aurait rendue la réclamation atomique (PATCH … statut=eq.<attendu>), une ligne par carte décidée.\nreturn $input.all().map((x) => ({ json: { id: x.json.carte_id, artisan_id: x.json.artisan_id, statut: 'executee' } }));")
      : patch('Réclamer la carte', R.ECRITURES_ENVOI['Réclamer la carte'].url, "={{ JSON.stringify({ statut: 'executee', resultat_resume: 'Envoi en cours…', maj_le: $now.toISO() }) }}", 'return=representation', true),
    garder: code('Garder les réclamées', R.CODE_RECLAMEES),
    desReclamees: si('Des envois réclamés ?', '={{ !$json.vide }}', vrai, ''),
    essai: !banc ? null : code('Marquer l’essai', "// Banc : chaque enveloppe est un ESSAI (lib-envoyer-courriel n'accepte alors que delivered@resend.dev).\nreturn $input.all().map((x) => ({ json: Object.assign({}, x.json, { essai: true }) }));"),
    envoyer: appel('Envoyer (lib-envoyer-courriel)'),
    resultats: code('Préparer les résultats', R.CODE_RESULTATS),
    noterRes: banc ? null : patch('Noter le résultat', R.ECRITURES_ENVOI['Noter le résultat'].url, '={{ JSON.stringify($json.patch) }}', 'return=minimal', false),
    aTracer: si('Une conversation à tracer ?', '={{ $json.ok === true && !!$json.lead_id }}', vrai, ''),
    tracer: banc ? null : `node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: 'Tracer dans la conversation', onError: 'continueRegularOutput', credentials: ${supa},
  parameters: { method: 'POST', url: ${J(SB + 'messages')}, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: 'return=minimal' }] },
    sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ lead_id: $json.lead_id, sens: 'out', type: $json.type_message, contenu: $json.corps }) }}", options: { timeout: 20000 } } } })`,
    noterEcart: banc ? null : patch('Noter la carte écartée', R.ECRITURES_ENVOI['Noter la carte écartée'].url, '={{ JSON.stringify($json.patch) }}', 'return=minimal', false),
    rejeu: banc ? code('Rejouer les mêmes enveloppes', "// Banc : le REJEU, mêmes enveloppes, mêmes clés d'idempotence (Resend doit rendre le même envoi, jamais un second).\nreturn $('Marquer l’essai').all().map((x) => ({ json: x.json }));") : null,
    renvoyer: banc ? appel('Rejouer (lib-envoyer-courriel)') : null,
    bilan: banc ? code('Bilan du banc', String.raw`// Banc 036-038 : ce qui est parti, ce qui a été écarté, et le rejeu. Vert seulement si exactement les cartes attendues partent, une seule fois.
const ATTENDUS = ${J(F.attendus || [])};
const decisions = $('Décider les envois').all().map((x) => x.json);
const premiers = $('Envoyer (lib-envoyer-courriel)').all().map((x) => x.json), rejeux = $('Rejouer (lib-envoyer-courriel)').all().map((x) => x.json);
const parties = premiers.filter((r) => r.ok === true).map((r) => r.carte_id).sort();
const memeEnvoi = premiers.every((r) => { const b = rejeux.find((x) => x.carte_id === r.carte_id); return r.ok === true && b && b.ok === true && b.envoi_id === r.envoi_id; });
const ecartees = decisions.filter((d) => d.genre === 'noter').map((d) => ({ carte_id: d.carte_id, motif: d.motif }));
const vert = JSON.stringify(parties) === JSON.stringify([...ATTENDUS].sort()) && memeEnvoi;
return [{ json: { verdict: vert ? 'vert' : 'rouge', parties: parties, envois: premiers.map((r) => ({ carte_id: r.carte_id, envoi_id: r.envoi_id, ok: r.ok, erreur: r.erreur })),
  rejeu: rejeux.map((r) => ({ carte_id: r.carte_id, envoi_id: r.envoi_id, ok: r.ok, erreur: r.erreur })), meme_envoi_au_rejeu: memeEnvoi, ecartees: ecartees,
  laissees: ${J(F.laissees || [])}.filter((id) => !decisions.some((d) => d.carte_id === id)) } }];`) : null,
  }
  const decl = Object.entries(n).filter(([, v]) => v).map(([k, v]) => `const ${k} = ${v};`).join('\n')
  // Chaînes imbriquées (a.to(b.to(c))) : la forme sûre du SDK dans une branche.
  const chaine = (...xs) => xs.reduceRight((suite, x) => (suite ? `${x}.to(${suite})` : x), '')
  const fin = banc
    ? `aEnvoyer.onTrue(${chaine('reclamer', 'garder', `desReclamees.onTrue(${chaine('essai', 'envoyer', 'resultats', 'rejeu', 'renvoyer', 'bilan')})`)})`
    : `aEnvoyer.onTrue(${chaine('reclamer', 'garder', `desReclamees.onTrue(${chaine('envoyer', 'resultats', 'noterRes')})`)}).onFalse(aNoter.onTrue(noterEcart))`
  const corps = `desComptes.onTrue(${chaine('pause', 'cartes', 'artisans', 'leads', 'factures', 'reponses', 'opp', 'imp', 'jour', 'decider', fin)})`
  const nom = banc ? 'presti-banc-reel' : 'presti-dep-envoi'
  const reg = reglages(`saveDataSuccessExecution: ${banc ? "'all'" : "'none'"}, saveManualExecutions: true, callerPolicy: 'none'`)
  console.log(tete + decl + `
export default workflow(${J(nom)}, ${J(nom)}, { settings: ${reg} })
  .add(depart).to(${chaine('lireDeps', 'comptes', corps)})${banc ? '' : '\n  .add(resultats).to(aTracer.onTrue(tracer))'};`)
}
