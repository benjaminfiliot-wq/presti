// Audit 036-028 : pour chaque gabarit, les agents (chefs et spécialistes) sont-ils atteints depuis un déclencheur ?
// Suit les liens « main » depuis les déclencheurs, puis rattache les sous-nœuds (ai_*) à leur parent.
import fs from 'node:fs'; import path from 'node:path';
const fichiers = process.argv.slice(2);
for (const p of fichiers) {
  const w = JSON.parse(fs.readFileSync(p, 'utf8'));
  const C = w.connections || {};
  const sortiesMain = new Map(), parentsAi = new Map();
  for (const [src, typ] of Object.entries(C)) for (const [k, groupes] of Object.entries(typ)) for (const g of groupes || []) for (const c of g || []) {
    if (k === 'main') { (sortiesMain.get(src) || sortiesMain.set(src, []).get(src)).push(c.node); }
    else { (parentsAi.get(src) || parentsAi.set(src, []).get(src)).push(c.node); }
  }
  const decl = w.nodes.filter(n => /Trigger$|trigger/i.test(n.type)).map(n => n.name);
  const vus = new Set(decl); const pile = [...decl];
  while (pile.length) { const x = pile.pop(); for (const y of sortiesMain.get(x) || []) if (!vus.has(y)) { vus.add(y); pile.push(y); } }
  // sous-nœuds : atteints si un de leurs parents l'est (itératif, pour agentTool -> outils)
  let change = true; while (change) { change = false; for (const [s, ps] of parentsAi) if (!vus.has(s) && ps.some(q => vus.has(q))) { vus.add(s); change = true; } }
  const agents = w.nodes.filter(n => /\.agent$|agentTool$/.test(n.type));
  const orph = w.nodes.filter(n => n.type !== 'n8n-nodes-base.stickyNote' && !vus.has(n.name));
  console.log(`${path.basename(p)} : ${agents.length} agents, dont non atteints : ${agents.filter(a => !vus.has(a.name)).map(a => a.name).join(' ; ') || 'aucun'} | nœuds non atteints : ${orph.length}`);
}
