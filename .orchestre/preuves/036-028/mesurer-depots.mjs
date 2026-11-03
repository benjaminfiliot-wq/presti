// Audit 036-028 : taille des workflows des dépôts clonés (~/agents/depots), pour comparer « très gros » à une mesure.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const racine = process.argv[2] || path.join(os.homedir(), 'agents/depots');
const tailles = []; let code = 0, total = 0, agents = 0, avecAgent = 0;
const parcourir = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name);
  if (e.isDirectory()) { if (e.name !== '.git' && e.name !== 'node_modules') parcourir(p); }
  else if (e.name.endsWith('.json')) { try { const w = JSON.parse(fs.readFileSync(p, 'utf8')); if (!Array.isArray(w.nodes)) continue;
    const n = w.nodes.filter(x => x.type !== 'n8n-nodes-base.stickyNote'); tailles.push(n.length); total += n.length;
    code += n.filter(x => x.type === 'n8n-nodes-base.code' || x.type === 'n8n-nodes-base.function' || x.type === 'n8n-nodes-base.functionItem').length;
    const a = n.filter(x => /langchain\.agent$/.test(x.type)).length; agents += a; if (a) avecAgent++; } catch {} } } };
parcourir(racine);
tailles.sort((a, b) => a - b);
const q = (f) => tailles[Math.floor(f * (tailles.length - 1))];
console.log(`workflows ${tailles.length} ; nœuds ${total} ; médiane ${q(0.5)} ; 90e centile ${q(0.9)} ; 99e centile ${q(0.99)} ; max ${tailles.at(-1)} ; part Code/Function ${(100*code/total).toFixed(1)} % ; workflows avec agent ${avecAgent} ; plus de 40 nœuds ${tailles.filter(t=>t>40).length} ; plus de 70 ${tailles.filter(t=>t>70).length}`);
