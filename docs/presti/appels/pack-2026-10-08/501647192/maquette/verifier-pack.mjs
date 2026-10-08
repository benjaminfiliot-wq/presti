import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium} from 'playwright';import AxeBuilder from '@axe-core/playwright';
const root=process.cwd(),pack=path.join(root,'docs/presti/appels/pack-2026-10-08'), publicRoot=path.join(root,'public'), list=JSON.parse(fs.readFileSync(path.join(pack,'501647192/maquette/liste-maquettes.json')));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.resolve(publicRoot,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(publicRoot+path.sep)){res.writeHead(403);res.end();return}try{res.setHeader('Content-Type',types[path.extname(p)]||'text/plain');res.end(fs.readFileSync(p))}catch{res.writeHead(404);res.end('introuvable')}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});const all=[];
try{for(const row of list){const proof=path.join(pack,row.id,'maquette'),out=path.join(publicRoot,'sites-demo',row.slug),results=[];
 for(const [mode,viewport] of [['bureau',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();const errors=[],bad=[],posts=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)bad.push({url:response.url(),status:response.status()})});page.on('request',request=>{if(request.method()==='POST')posts.push(request.url())});
  await page.goto(base+'/sites-demo/'+row.slug+'/index.html',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>document.querySelectorAll('img[loading="lazy"]').forEach(image=>image.loading='eager'));
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
  const state=await page.evaluate(()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth+1,photos:[...document.images].every(image=>image.complete&&image.naturalWidth>0),noindex:document.querySelector('meta[name=robots]')?.content.includes('noindex'),tel:[...document.querySelectorAll('a[href^="tel:"]')].every(a=>/^tel:\+33\d{9}$/.test(a.getAttribute('href'))),targets:[...document.querySelectorAll('a[href^="#"]')].every(a=>document.querySelector(a.getAttribute('href')))}));
  const screenshot=path.join(proof,mode+'.png');await page.screenshot({path:screenshot,fullPage:true});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const invalidBefore=await page.locator('#recap').isHidden();await page.locator('form button[type=submit]').click();const invalidBlocked=await page.locator('#recap').isHidden();
  await page.locator('select[name=projet]').selectOption({index:1});await page.locator('[name=commune]').fill('Commune fictive');await page.locator('[name=contact]').fill('test@example.invalid');await page.locator('[name=message]').fill('<script>test fictif</script>');await page.locator('form button[type=submit]').click();
  const recap=await page.locator('#recap').innerText(),success=await page.locator('#recap').isVisible();const noInjection=await page.locator('#recap script').count()===0;
  await page.locator('#modifier').click();const edit=await page.locator('#recap').isHidden();
  const valid=state.h1===1&&!state.overflow&&state.photos&&state.noindex&&state.tel&&state.targets&&invalidBefore&&invalidBlocked&&success&&recap.includes('test@example.invalid')&&noInjection&&edit&&posts.length===0&&errors.length===0&&bad.length===0&&axe.violations.length===0&&fs.statSync(screenshot).size>20000;
  results.push({mode,viewport,state,form:{invalidBlocked,success,noInjection,edit,networkPosts:posts.length},errors,bad,axeViolations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),screenshotBytes:fs.statSync(screenshot).size,valid});await context.close();
 }
 const assets=JSON.parse(fs.readFileSync(path.join(out,'attributions.json'))).map(a=>({...a,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,a.fichier))).digest('hex')}));
 const result={artisan:row.name,slug:row.slug,date:new Date().toISOString(),checks:results,assets,valid:results.every(r=>r.valid)};fs.writeFileSync(path.join(proof,'qa.json'),JSON.stringify(result,null,2));all.push({id:row.id,slug:row.slug,artisan:row.name,valid:result.valid,violations:results.flatMap(r=>r.axeViolations)});console.log(row.name,result.valid?'PASS':'FAIL',JSON.stringify(results.map(r=>({mode:r.mode,state:r.state,axe:r.axeViolations,errors:r.errors,bad:r.bad}))));
 }}finally{await browser.close();server.close()}
fs.writeFileSync(path.join(pack,'501647192/maquette/coverage.json'),JSON.stringify({date:new Date().toISOString(),generated:list.length,verified:all.filter(r=>r.valid).length,results:all},null,2));if(all.some(r=>!r.valid))process.exitCode=1;
