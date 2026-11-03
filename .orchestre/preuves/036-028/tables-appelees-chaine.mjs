// Audit 036-028 : chaque table ou vue Supabase appelée par les gabarits existe-t-elle dans une migration ?
import fs from 'node:fs'; import path from 'node:path';
const dirs = ['036-001','036-002','036-003','036-004','036-005','036-006','036-007','036-008'].filter(d=>fs.existsSync('.orchestre/preuves/'+d)).map(d => '.orchestre/preuves/'+d);
const dernier = new Map();
for (const d of dirs) for (const f of fs.readdirSync(d).filter(f => f.endsWith('.workflow.json'))) dernier.set(f, path.join(d, f));
const sql = fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql') && !f.startsWith('_A_COLLER'))
  .map(f => fs.readFileSync('supabase/migrations/'+f, 'utf8')).join('\n').toLowerCase();
const appels = new Map();
for (const [f, p] of dernier) {
  const w = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const n of w.nodes) { const u = String(n.parameters?.url || ''); const m = u.match(/\/rest\/v1\/(?:rpc\/)?([a-z0-9_]+)/i);
    if (m) { const k = (u.includes('/rpc/') ? 'rpc/' : '') + m[1]; (appels.get(k) || appels.set(k, new Set()).get(k)).add(f.replace('.workflow.json','').replace('gabarit-','')); } }
}
let manquants = 0;
for (const [t, fs_] of [...appels].sort()) {
  const nom = t.replace('rpc/','');
  const re = new RegExp(`(create|replace)\\s+(or\\s+replace\\s+)?(table|view|function|materialized view)\\s+(if\\s+not\\s+exists\\s+)?(public\\.)?"?${nom}"?\\b`);
  const ok = re.test(sql);
  if (!ok) manquants++;
  console.log(`| ${t} | ${ok ? 'oui' : 'NON'} | ${[...fs_].join(', ')} |`);
}
console.log(`\n${appels.size} tables/vues/fonctions appelées ; ${manquants} absentes de toute migration`);
