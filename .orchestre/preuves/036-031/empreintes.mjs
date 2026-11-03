// 036-031 · Le registre des empreintes des nœuds Code des exports corrigés : celui des lots (036-013/014/015), plus les 10 Code « composer ».
import fs from 'node:fs'; import { createHash } from 'node:crypto';
const ICI = '.orchestre/preuves/036-031';
const h = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex');
const reg = {};
for (const l of ['036-013', '036-014', '036-015']) Object.assign(reg, JSON.parse(fs.readFileSync(`.orchestre/preuves/${l}/empreintes-code.json`, 'utf8')));
for (const f of fs.readdirSync(ICI).filter((f) => /^gabarit-artisan-.*\.workflow\.json$/.test(f))) {
  const w = JSON.parse(fs.readFileSync(`${ICI}/${f}`, 'utf8')); const x = w.workflow || w;
  for (const n of x.nodes) if (n.type === 'n8n-nodes-base.code' && /^\/\/ 036-031/.test(n.parameters.jsCode || '')) (reg[x.name] = reg[x.name] || {})[n.name] = h(n.parameters.jsCode);
}
fs.writeFileSync(`${ICI}/empreintes-code.json`, JSON.stringify(reg, null, 2) + '\n');
console.log(Object.keys(reg).length, 'gabarits au registre');
