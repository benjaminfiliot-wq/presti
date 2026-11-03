// Compare, nœud par nœud, les nœuds posés par 036-032 dans n8n avec ceux du générateur (paramètres, type, version, identifiant).
import fs from 'fs';
import { DEPS, operations } from './gen.mjs';
const tri = (v) => Array.isArray(v) ? v.map(tri) : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, tri(v[k])])) : v);
let ko = 0, vus = 0;
for (const cle of Object.keys(DEPS)) {
  const w = JSON.parse(fs.readFileSync('' + (process.env.EXPORTS || new URL('./exports/', import.meta.url).pathname) + 'presti-dep-' + cle + '.workflow.json', 'utf8'));
  const attendus = operations(cle).filter((o) => o.type === 'addNode').map((o) => o.node);
  for (const a of attendus) { vus++;
    const n = w.nodes.find((x) => x.name === a.name);
    if (!n) { console.log('ABSENT', cle, a.name); ko++; continue; }
    const pa = JSON.stringify(tri(a.parameters)), pn = JSON.stringify(tri(n.parameters));
    const ok = pa === pn && n.type === a.type && n.typeVersion === a.typeVersion && JSON.stringify(n.credentials || null) === JSON.stringify(a.credentials || null);
    if (!ok) { ko++; console.log('DIFFÉRENT', cle, a.name, pa.length, pn.length); let i = 0; while (i < pa.length && pa[i] === pn[i]) i++; console.log('   attendu …' + pa.slice(Math.max(0, i - 60), i + 80)); console.log('   en ligne …' + pn.slice(Math.max(0, i - 60), i + 80)); }
  }
  const chef = w.nodes.find((x) => x.type.endsWith('.agent'));
  const c = w.connections;
  const lie = (src, cible, type = 'main') => ((c[src] || {})[type] || []).some((o) => (o || []).some((x) => x.node === cible));
  const ai = ['Claude Sonnet 5.5 (chef)', 'ai_languageModel'], pa2 = ['Sortie stricte du chef', 'ai_outputParser'];
  const liens = [[DEPS[cle].source, 'Dossier du chef'], ['Dossier du chef', 'Élément vide pour les spécialistes'], ['Élément vide pour les spécialistes', chef.name], [chef.name, 'Revalider le chef'], ['Revalider le chef', 'Contrat de sortie'], [ai[0], chef.name, ai[1]], [pa2[0], chef.name, pa2[1]], ...DEPS[cle].outils.map((o) => [o[0], chef.name, 'ai_tool'])];
  const manquants = liens.filter(([s, t, ty]) => !lie(s, t, ty));
  const direct = lie(DEPS[cle].source, 'Contrat de sortie');
  console.log((manquants.length || direct ? 'LIENS KO ' : 'liens ok ') + cle + ' : ' + liens.length + ' liens' + (manquants.length ? ' manquants ' + JSON.stringify(manquants) : '') + (direct ? ' ; lien direct source→contrat encore là' : '') + ' ; onError ' + chef.onError + ' ; délai ' + w.settings.executionTimeout + ' s');
  if (manquants.length || direct || chef.onError !== 'continueRegularOutput') ko++;
}
console.log(ko ? 'ROUGE : ' + ko + ' écart(s)' : 'VERT : ' + vus + ' nœuds identiques au générateur, liens complets, 7 chefs');
process.exit(ko ? 1 : 0);
