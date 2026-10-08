import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('docs/presti/appels/pack-2026-10-08/501647192/maquette/liste-maquettes.json'));
for(const r of rows){const p='public/sites-demo/'+r.slug;for(const n of ['hero','detail'])if(fs.existsSync(p+'/'+n+'.webp'))fs.renameSync(p+'/'+n+'.webp',p+'/'+n+'-1600.webp');const attrs=JSON.parse(fs.readFileSync(p+'/attributions.json'));for(const a of attrs)if(!a.fichier.includes('-1600'))a.fichier=a.fichier.replace('.webp','-1600.webp');fs.writeFileSync(p+'/attributions.json',JSON.stringify(attrs,null,2));fs.writeFileSync(p+'/index.html',fs.readFileSync(p+'/index.html','utf8').replaceAll('hero.webp','hero-1600.webp').replaceAll('detail.webp','detail-1600.webp'))}
const p='docs/presti/appels/pack-2026-10-08/501647192/maquette/produire-pack.mjs';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('src="hero.webp"','src="hero-1600.webp"').replaceAll('src="detail.webp"','src="detail-1600.webp"'));
console.log('Photos alignées');
