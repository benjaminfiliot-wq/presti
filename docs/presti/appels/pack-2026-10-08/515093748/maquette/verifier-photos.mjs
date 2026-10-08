import fs from 'node:fs';import sharp from 'sharp';
const all=JSON.parse(fs.readFileSync('docs/presti/appels/pack-2026-10-08/501647192/maquette/pages-publiques.json','utf8').replace(/^\uFEFF/,''));
const urls=all.sites.find(s=>s.id==='515093748').pages.find(p=>p.url.includes('mes-realisations')).image_urls.filter(u=>u.includes('images_'));
const results=await Promise.allSettled(urls.map(async(url,i)=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});const data=Buffer.from(await r.arrayBuffer());fs.writeFileSync(`docs/presti/appels/pack-2026-10-08/515093748/maquette/candidate-${i}.webp`,data);return {input:await sharp(data).resize(240,160,{fit:'contain',background:'white'}).png().toBuffer(),left:(i%5)*240,top:Math.floor(i/5)*160}}));
await sharp({create:{width:1200,height:480,channels:3,background:'white'}}).composite(results.filter(r=>r.status==='fulfilled').map(r=>r.value)).png().toFile('docs/presti/appels/pack-2026-10-08/515093748/maquette/planche-candidates.png');
fs.writeFileSync('docs/presti/appels/pack-2026-10-08/515093748/maquette/candidates.json',JSON.stringify(urls,null,2));
