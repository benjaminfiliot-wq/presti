// Audit 036-028 : compte mécanique des nœuds des exports de gabarits (lecture seule).
// Usage : node .orchestre/preuves/036-028/compter-exports.mjs
import fs from 'node:fs'; import path from 'node:path';
const racine = '.orchestre/preuves';
const lots = ['036-013','036-014','036-015'];
// le plus récent export de chaque gabarit l'emporte (ordre des lots)
const dernier = new Map();
for (const lot of lots) for (const f of fs.readdirSync(path.join(racine, lot)).filter(f => f.endsWith('.workflow.json')))
  dernier.set(f, path.join(racine, lot, f));
const familles = t => {
  if (/\.code$/.test(t)) return 'code';
  if (/agentTool$/.test(t)) return 'agent-outil';
  if (/\.agent$/.test(t)) return 'agent';
  if (/lmChat|lmOpenAi|\.anthropic$/.test(t)) return 'modele';
  if (/outputParser/.test(t)) return 'parseur';
  if (/Tool$|toolWorkflow|toolCode|toolHttp/i.test(t)) return 'outil-agent';
  if (/\.(if|switch|merge|set|noOp|filter|splitInBatches|executeWorkflow|executeWorkflowTrigger|scheduleTrigger|stickyNote|aggregate|splitOut|wait|stopAndError|dateTime|limit|sort|removeDuplicates|manualTrigger|errorTrigger)$/.test(t)) return 'logique';
  if (/httpRequest$/.test(t)) return 'http';
  return 'outil-natif';
};
const total = { noeuds: 0, fam: {}, types: new Set(), outilsNatifs: new Set() };
const lignes = [];
for (const [f, p] of [...dernier].sort()) {
  const w = JSON.parse(fs.readFileSync(p, 'utf8'));
  const n = (w.nodes || []).filter(x => x.type !== 'n8n-nodes-base.stickyNote');
  const fam = {};
  for (const x of n) { const k = familles(x.type); fam[k] = (fam[k] || 0) + 1; total.types.add(x.type);
    if (k === 'outil-natif' || k === 'outil-agent') total.outilsNatifs.add(x.type.replace(/^.*\./,'').replace(/Tool$|Trigger$/,'').toLowerCase()); }
  for (const [k, v] of Object.entries(fam)) total.fam[k] = (total.fam[k] || 0) + v;
  total.noeuds += n.length;
  const creds = n.filter(x => x.credentials && Object.keys(x.credentials).length).length;
  const webhooks = n.filter(x => /webhook/i.test(x.type) || x.webhookId).length;
  const actif = w.active === true;
  lignes.push(`| ${f.replace('.workflow.json','')} | ${p.split('/')[2]} | ${n.length} | ${fam.code||0} | ${fam.agent||0} | ${fam['agent-outil']||0} | ${fam['outil-agent']||0} | ${fam['outil-natif']||0} | ${fam.http||0} | ${fam.logique||0} | ${creds} | ${webhooks} | ${actif} |`);
}
console.log('| gabarit | lot | nœuds | Code | agents | agents-outils | outils d\'agent | nœuds d\'outil natifs | HTTP | logique | avec identifiant | webhook | actif |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
console.log(lignes.join('\n'));
console.log(`\nTOTAL ${dernier.size} gabarits, ${total.noeuds} nœuds ; familles ${JSON.stringify(total.fam)} ; ${total.types.size} types distincts ; ${total.outilsNatifs.size} outils distincts`);
console.log('OUTILS', [...total.outilsNatifs].sort().join(', '));
