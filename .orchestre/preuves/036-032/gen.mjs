// Générateur des opérations update_workflow de 036-032 (un chef agent par département).
import fs from 'fs';
const B = '/home/usine/Documents/presti/.orchestre/preuves/';
export const DEPS = {
  accueil: { id: 'Ls0oFcQzzAk0rWcP', exp: '036-001', nom: 'accueil', source: 'Assembler', idx: 0, outils: [
    ['Spécialiste : trieur', 'SrT4QJJmb6LLM1FK', 'lib-trier-demande', 'Préparer le tri', 'Relit une demande avec lib-trier-demande (classe, spam, escalade). Clé « tri:… ».'],
    ['Spécialiste : porte de conformité', '8c8vkUeSkfgB5FAM', 'lib-porte-conformite', 'Préparer la porte', 'Repasse une action à la porte de conformité (lib-porte-conformite) : verdict, motifs, cible carte ou pilote. Clé « p:… ».'] ] },
  devis: { id: 'dNikTYPKKsivUbd3', exp: '036-005', nom: 'devis', source: 'Assembler', idx: 0, outils: [
    ['Spécialiste : décideur', 'hckqX1tQjIommtTH', 'lib-decider', 'Préparer la décision', 'Refait la décision du code (lib-decider) : carte, pilote ou rien, niveau, motif. Le montant reste celui du code.'],
    ['Spécialiste : porte de conformité', '8c8vkUeSkfgB5FAM', 'lib-porte-conformite', 'Préparer la porte', 'Repasse une action à la porte de conformité (lib-porte-conformite) : verdict, motifs, cible carte ou pilote.'] ] },
  facturation: { id: 'bNAF6Xzx5On853kD', exp: '036-005', nom: 'facturation', source: 'Assembler', idx: 0, outils: [
    ['Spécialiste : relanceur d’impayés', 'jGM56jxeLUVXZIiM', 'lib-relancer', 'Préparer la relance', 'Recalcule le palier de relance d’une facture (lib-relancer) : palier atteint, déjà envoyé, à relancer.'],
    ['Spécialiste : porte de conformité', '8c8vkUeSkfgB5FAM', 'lib-porte-conformite', 'Préparer la porte', 'Repasse une action à la porte de conformité (lib-porte-conformite) : verdict, motifs, cible carte ou pilote.'] ] },
  suivi: { id: 'jo8eQMEwiB9wCbKN', exp: '036-004', nom: 'suivi', source: 'Assembler', idx: 0, outils: [
    ['Spécialiste : contrôleur de conflit', 'F2son8oGwifPETg3', 'lib-controler-conflit', 'Préparer le contrôle', 'Recontrôle une relance (lib-controler-conflit) : conflit, fenêtre, jour permis.'],
    ['Spécialiste : relanceur', 'jGM56jxeLUVXZIiM', 'lib-relancer', 'Préparer la relance', 'Recalcule le palier de relance (lib-relancer) : palier atteint, déjà envoyé, à relancer.'] ] },
  apres: { id: 'L3GOS7euxi60jCZN', exp: '036-006', nom: 'après-chantier', dep: 'apres', source: 'Assembler le département', idx: 0, outils: [
    ['Spécialiste : lecteur d’avis', 'ScpXQIH54wmmuuel', 'lib-avis-lire', 'Préparer la lecture des avis', 'Relit les avis du jour (lib-avis-lire) : négatif ou positif, avis suspects.'],
    ['Spécialiste : rédacteur de réponses', 'OW7vXn4aPzSYoSdm', 'lib-avis-repondre', 'Préparer les réponses aux avis', 'Refait la carte de réponse à un avis (lib-avis-repondre) : toujours à valider, jamais publiée.'] ] },
  operations: { id: '74bDhTw6cEBzPORZ', exp: '036-008', nom: 'opérations', dep: 'operations', source: 'Porte simulation', idx: 0, outils: [
    ['Spécialiste : planificateur', '414xd7DQaRmEgoTs', 'lib-agenda-creneaux', 'Préparer les créneaux', 'Relit les créneaux libres de l’agenda (lib-agenda-creneaux) : jamais inventés, agenda illisible = aucun créneau.'],
    ['Spécialiste : synchroniseur', 'znIxgrxNzUvGeanu', 'lib-synchroniser-outil', "Préparer l'import", 'Relit l’aperçu d’un import (lib-synchroniser-outil) : lignes et provenance, rien n’est écrit.'] ] },
  direction: { id: 'oHGOyqsZGoUooxa6', exp: '036-007', nom: 'direction', source: 'Porte simulation', idx: 0, outils: [
    ['Spécialiste : contrôleur du coût', 'JtGOKOG1ssFP5z1u', 'lib-cout-ia', 'Préparer le coût', 'Recalcule le coût IA du compte (lib-cout-ia) : calculé par le code, plafond, dérive.'],
    ['Spécialiste : aiguilleur d’alertes', 'v2wfT9qB5e0LHtFI', 'lib-alerte-liste', "Préparer l'alerte", 'Reclasse une alerte dans la liste fermée (lib-alerte-liste) : type et responsable.'] ] },
};
const J = (x) => JSON.stringify(x);
export function codeDossier(d, cle) {
  return `// Chef du département (036-032) : le dossier que lit le chef. Rien n'est décidé ici ; l'élément d'origine est repris par « Revalider le chef ».
// Ni coordonnées ni montant ajoutés : le dossier reprend la sortie du code (résultat, effets prévus, extrait du brouillon) et les clés des spécialistes.
const DEP = ${J(cle)};
const OUTILS = ${J(d.outils.map((o) => [o[0], o[3]]))};
const j = $json || {}; const e = j.enveloppe && typeof j.enveloppe === 'object' ? j.enveloppe : {};
const org = e.organisation_id;
const effets = (Array.isArray(j.effets_prevus) ? j.effets_prevus : []).filter((x) => x && (x.effet === 'ecrire_carte' || x.effet === 'mettre_en_file_pilote') && x.corps && typeof x.corps === 'object').slice(0, 40)
  .map((x) => ({ effet: x.effet, cle: x.corps.cle, type_action: x.corps.type_action || null, canal: x.corps.canal || null, brouillon: x.corps.brouillon && typeof x.corps.brouillon.texte === 'string' ? x.corps.brouillon.texte.slice(0, 500) : null }));
const cles = {};
for (const [outil, noeud] of OUTILS) { let l = []; try { const n = $(noeud); if (n.isExecuted) l = n.all().map((x) => x.json).filter((x) => x && x.organisation_id === org && typeof x.cle_idempotence === 'string').map((x) => x.cle_idempotence); } catch (err) { l = []; } cles[outil] = [...new Set(l)].slice(0, 40); }
const dossier = { departement: DEP, statut: j.statut || null, simulation: e.simulation !== false, resultat: j.resultat && typeof j.resultat === 'object' ? j.resultat : null, effets_prevus: effets, cles_des_specialistes: cles, erreurs: (Array.isArray(j.erreurs) ? j.erreurs : []).slice(0, 5) };
let texte = JSON.stringify(dossier);
if (texte.length > 12000) { dossier.resultat = '(résultat trop long : retiré du dossier)'; texte = JSON.stringify(dossier); }
return { json: { dossier_du_chef: texte.slice(0, 12000) } };`;
}
export function codeRevalider(d, cle) {
  return `// Chef du département (036-032) : revalider la sortie du chef (R18). Le chef ne peut qu'être PLUS prudent : une clé qu'il signale passe du
// pilote (envoi seul) à une carte « À valider ». Jamais un montant, jamais une action ajoutée. Sortie absente, en erreur ou hors schéma : rien ne change.
const DEP = ${J(cle)};
const SPECIALISTES = ${J(d.outils.map((o) => o[0]))};
const SOURCE = ${J(d.source)};
let origine;
try { origine = $(SOURCE).item.json; } catch (err) { origine = $(SOURCE).all(0)[$itemIndex].json; }
const j = Object.assign({}, origine);
const sortie = $json && $json.output && typeof $json.output === 'object' ? $json.output : null;
const MONTANT = /\\d[\\d\\s.,]*\\s?(€|eur\\b|euros?\\b)|€/i;
const effets = Array.isArray(j.effets_prevus) ? j.effets_prevus.map((x) => (x && typeof x === 'object' ? Object.assign({}, x) : x)) : [];
const cles = new Set(effets.filter((x) => x && x.corps && typeof x.corps.cle === 'string').map((x) => x.corps.cle));
const etapes = $json && Array.isArray($json.intermediateSteps) ? $json.intermediateSteps : [];
const appels = etapes.slice(0, 6).map((s) => { const a = (s && s.action) || {}; const o = typeof (s && s.observation) === 'string' ? s.observation : JSON.stringify((s && s.observation) || null);
  return { outil: typeof a.tool === 'string' ? a.tool : null, cle: a.toolInput && typeof a.toolInput.cle === 'string' ? a.toolInput.cle.slice(0, 120) : null, statut_du_retour: (String(o).match(/statut\\W{1,6}([a-z_]+)/) || [])[1] || null, erreur_du_retour: ((String(o).match(/erreurs\\W{1,6}([^\\]]{0,240})/) || [])[1] || '').replace(/\\\\"/g, '"').slice(0, 240) || null }; });
const norme = (x) => String(x).replace(/[^a-zA-Z0-9_-]+/g, '_');
const appeles = new Set(appels.map((x) => norme(x.outil)));
let raison = null;
if (!sortie) raison = $json && $json.error ? 'chef_en_erreur' : 'sortie_absente';
else if (!['rien_a_signaler', 'a_confirmer'].includes(sortie.avis)) raison = 'avis_hors_liste';
else if (typeof sortie.note !== 'string' || sortie.note.length > 400) raison = 'note_invalide';
else if (!Array.isArray(sortie.points_a_confirmer) || !Array.isArray(sortie.specialistes_consultes)) raison = 'listes_invalides';
else if (MONTANT.test(sortie.note) || sortie.points_a_confirmer.some((p) => !p || MONTANT.test(String(p.motif || '')))) raison = 'montant_ecrit';
else if (sortie.specialistes_consultes.some((s) => !SPECIALISTES.includes(s))) raison = 'specialiste_inconnu';
else if (sortie.specialistes_consultes.some((s) => !appeles.has(norme(s)))) raison = 'specialiste_cite_non_appele';
const r = j.resultat && typeof j.resultat === 'object' ? Object.assign({}, j.resultat) : null;
let note;
if (raison) note = { statut: 'indisponible', raison: raison, detail: raison === 'chef_en_erreur' ? String(($json.error && ($json.error.message || $json.error)) || '').slice(0, 300) : null, pilotes_retenus: [], appels_specialistes: appels };
else {
  const points = sortie.points_a_confirmer.filter((p) => p && typeof p.cle === 'string' && cles.has(p.cle)).slice(0, 20).map((p) => ({ cle: p.cle, motif: String(p.motif || '').slice(0, 200) }));
  const viser = new Set(points.map((p) => p.cle)); const retenus = [];
  for (let i = 0; i < effets.length; i++) { const x = effets[i];
    if (x && x.effet === 'mettre_en_file_pilote' && x.corps && viser.has(x.corps.cle)) { effets[i] = Object.assign({}, x, { effet: 'ecrire_carte', corps: Object.assign({}, x.corps, { retenu_par_le_chef: true }) }); retenus.push(x.corps.cle); } }
  if (r && Array.isArray(r.pilote) && Array.isArray(r.cartes) && retenus.length) { r.pilote = r.pilote.filter((k) => !retenus.includes(k)); r.cartes = r.cartes.concat(retenus.filter((k) => !r.cartes.includes(k))); }
  note = { statut: 'ok', avis: sortie.avis, note: sortie.note, points_a_confirmer: points, points_ecartes: sortie.points_a_confirmer.length - points.length, specialistes_consultes: sortie.specialistes_consultes, appels_specialistes: appels, pilotes_retenus: retenus };
}
if (r) r.note_du_chef = note;
const journal = Array.isArray(j.journal) ? j.journal.slice() : [];
journal.push({ evenement: 'note_du_chef', agent: 'chef-' + DEP, objet_ref: null, decision: note.statut === 'ok' ? note.avis + ' ; pilotes retenus : ' + note.pilotes_retenus.length : 'note indisponible (' + note.raison + ') : rien ne change', simulation: !(j.enveloppe && j.enveloppe.simulation === false) });
return { json: Object.assign(j, { resultat: r || j.resultat, effets_prevus: effets, journal: journal }) };`;
}
export function systeme(d) {
  const [a, b] = d.outils;
  return `Tu es le chef du département ${d.nom} d'un artisan français, dans un système en simulation : rien n'est envoyé.
Le code a déjà tout décidé : cartes, pilote (envoi seul après dix minutes), montants, porte de conformité. Tu relis son dossier et tu rends une note structurée.

Règles absolues :
1. Tu n'écris jamais un montant, un prix, un pourcentage ni une somme, et jamais le signe €. Les montants sont calculés par le code.
2. Tu n'inventes aucun fait : tu ne cites que le dossier ou la réponse d'un spécialiste. Aucune donnée personnelle dans ta note.
3. Tu ne peux qu'être plus prudent. Mettre une clé dans points_a_confirmer fait passer cette action du pilote à une carte que l'artisan valide. Tu ne peux jamais faire l'inverse, ni ajouter une action.
4. Tes deux spécialistes sont des outils :
   - « ${a[0]} » : ${a[4]}
   - « ${b[0]} » : ${b[4]}
   Dès qu'une clé existe dans cles_des_specialistes, consulte au moins un spécialiste avant de conclure (deux appels au plus), en commençant par l'action la plus sensible (le pilote d'abord) ; le paramètre cle est copié tel quel depuis cles_des_specialistes. Sans aucune clé, n'appelle personne.
5. Ta réponse :
   - avis vaut « rien_a_signaler » si tout est cohérent, « a_confirmer » sinon ;
   - chaque point_a_confirmer porte une cle prise dans effets_prevus[].cle et un motif court ;
   - note fait deux phrases au plus, en français ;
   - specialistes_consultes donne les noms exacts des outils appelés (liste vide sinon).`;
}
export const SCHEMA = (d) => J({ type: 'object', additionalProperties: false, required: ['avis', 'note', 'points_a_confirmer', 'specialistes_consultes'], properties: {
  avis: { type: 'string', enum: ['rien_a_signaler', 'a_confirmer'] },
  note: { type: 'string', maxLength: 400 },
  points_a_confirmer: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: false, required: ['cle', 'motif'], properties: { cle: { type: 'string', maxLength: 120 }, motif: { type: 'string', maxLength: 200 } } } },
  specialistes_consultes: { type: 'array', maxItems: 4, items: { type: 'string', enum: d.outils.map((o) => o[0]) } } } }, null, 2);
export function outil(o) {
  const [nom, wid, wnom, prep, desc] = o;
  const q = prep.replace(/'/g, "\\'");
  const SEL = `(($('${q}').isExecuted ? $('${q}').all() : []).map((x) => x.json).find((x) => x && x.cle_idempotence === $fromAI('cle', 'La clé à relire, copiée telle quelle depuis cles_des_specialistes du dossier', 'string')) || {})`;
  const champs = [['contrat', 'string'], ['organisation_id', 'string'], ['cle_idempotence', 'string'], ['trace', 'object'], ['config', 'object'], ['donnees', 'object']];
  const value = { cible: wid }; for (const [c] of champs) value[c] = `={{ ${SEL}.${c} }}`; value.simulation = '={{ true }}';
  const schema = [['cible', 'string']].concat(champs, [['simulation', 'boolean']]).map(([c, t]) => ({ id: c, displayName: c, required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: t }));
  return { description: desc + ' Passe par lib-specialiste-outil vers ' + wnom + ' ; simulation forcée : le spécialiste ne fait rien, il relit.', source: 'database', workflowId: { __rl: true, mode: 'id', value: 'Yicrr9T7m3jqpOXD', cachedResultName: 'lib-specialiste-outil' },
    workflowInputs: { mappingMode: 'defineBelow', value, matchingColumns: [], schema, attemptToConvertTypes: false, convertFieldsToString: false } };
}
export function operations(cle) {
  const d = DEPS[cle]; const dep = d.dep || cle;
  const w = JSON.parse(fs.readFileSync(B + d.exp + '/presti-dep-' + cle + '.workflow.json', 'utf8'));
  const cs = w.nodes.find((n) => n.name === 'Contrat de sortie').position; const [x, y] = [cs[0], cs[1] + 420];
  const ops = [
    { type: 'removeConnection', source: d.source, target: 'Contrat de sortie', sourceIndex: d.idx },
    { type: 'addNode', node: { name: 'Dossier du chef', type: 'n8n-nodes-base.code', typeVersion: 2, position: [x - 660, y], parameters: { mode: 'runOnceForEachItem', jsCode: codeDossier(d, dep) } } },
    { type: 'addNode', node: { name: 'Chef du département ' + d.nom, type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3.1, position: [x - 440, y], parameters: { promptType: 'define', text: "={{ $('Dossier du chef').item.json.dossier_du_chef }}", hasOutputParser: true, options: { systemMessage: systeme(d), maxIterations: 5, returnIntermediateSteps: true, passthroughBinaryImages: false, batching: { batchSize: 4, delayBetweenBatches: 0 } } } } },
    { type: 'addNode', node: { name: 'Élément vide pour les spécialistes', type: 'n8n-nodes-base.code', typeVersion: 2, position: [x - 550, y - 140], parameters: { mode: 'runOnceForEachItem', jsCode: "// Chef du département (036-032) : un outil toolWorkflow transmet au spécialiste l'élément d'entrée de l'agent, en plus des champs\n// mappés ; les lib-* ont un contrat strict (« champ hors contrat »). L'agent reçoit donc un élément vide et lit son dossier par expression.\nreturn { json: {} };" } } },
    { type: 'addNode', node: { name: 'Claude Sonnet 5.5 (chef)', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', typeVersion: 1.6, position: [x - 560, y + 220], credentials: { anthropicApi: { id: 'hZsu1Oq5gUfaa2jB', name: 'Anthropic account' } }, parameters: { model: { __rl: true, mode: 'id', value: 'claude-sonnet-5-5' }, options: { maxTokensToSample: 8000, thinkingMode: 'adaptive', effort: 'low' } } } },
    { type: 'addNode', node: { name: 'Sortie stricte du chef', type: '@n8n/n8n-nodes-langchain.outputParserStructured', typeVersion: 1.3, position: [x - 420, y + 220], parameters: { schemaType: 'manual', inputSchema: SCHEMA(d), autoFix: false } } },
    ...d.outils.map((o, i) => ({ type: 'addNode', node: { name: o[0], type: '@n8n/n8n-nodes-langchain.toolWorkflow', typeVersion: 2.2, position: [x - 280 + i * 140, y + 220], parameters: outil(o) } })),
    { type: 'addNode', node: { name: 'Revalider le chef', type: 'n8n-nodes-base.code', typeVersion: 2, position: [x - 200, y], parameters: { mode: 'runOnceForEachItem', jsCode: codeRevalider(d, dep) } } },
    { type: 'setNodeSettings', nodeName: 'Chef du département ' + d.nom, settings: { onError: 'continueRegularOutput', alwaysOutputData: false } },
    { type: 'addConnection', source: d.source, target: 'Dossier du chef', sourceIndex: d.idx },
    { type: 'addConnection', source: 'Dossier du chef', target: 'Élément vide pour les spécialistes' },
    { type: 'addConnection', source: 'Élément vide pour les spécialistes', target: 'Chef du département ' + d.nom },
    { type: 'addConnection', source: 'Chef du département ' + d.nom, target: 'Revalider le chef' },
    { type: 'addConnection', source: 'Revalider le chef', target: 'Contrat de sortie' },
    { type: 'addConnection', source: 'Claude Sonnet 5.5 (chef)', target: 'Chef du département ' + d.nom, connectionType: 'ai_languageModel' },
    { type: 'addConnection', source: 'Sortie stricte du chef', target: 'Chef du département ' + d.nom, connectionType: 'ai_outputParser' },
    ...d.outils.map((o) => ({ type: 'addConnection', source: o[0], target: 'Chef du département ' + d.nom, connectionType: 'ai_tool' })),
    { type: 'setWorkflowSettings', settings: { executionTimeout: 600 } },
  ];
  return ops;
}
if (process.argv[2]) { const o = operations(process.argv[2]); fs.writeFileSync('/tmp/a032/ops-' + process.argv[2] + '.json', JSON.stringify(o)); console.log(JSON.stringify(o)); }
