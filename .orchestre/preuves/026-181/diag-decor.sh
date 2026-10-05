set -u
mkdir -p .orchestre/travail/diag-decor
node -e "
const fs=require('fs');const f='scripts/fixtures/026-pilotage/k/juge-rendu.mjs';let s=fs.readFileSync(f,'utf8');
s=s.replace('async function critereDecor(','export async function critereDecor(');
const a='      const em = await empreinteRepos(P.page)\n      // La texture du décor';
if(!s.includes(a)) throw new Error('motif absent');
s=s.replace(a,'      const em = await empreinteRepos(P.page)\n      try { (await import(\"node:fs\")).writeFileSync(\".orchestre/travail/diag-decor/\" + nom + \".png\", await lireImage(P.page)); (await import(\"node:fs\")).writeFileSync(\".orchestre/travail/diag-decor/\" + nom + \".txt\", JSON.stringify(ecrans) + \" \" + em.hash) } catch (e) { console.error(\"dump\", e.message) }\n      // La texture du décor');
fs.writeFileSync(f,s)"
uptime
node .orchestre/preuves/026-181/diag-decor.mjs 2>&1 | head -12 | cut -c1-400
ls -la .orchestre/travail/diag-decor
