import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),F=path.join(R,'scripts/fixtures/026-search-console'),P=path.join(R,'.orchestre/preuves/026-199')
const options={};for(const a of process.argv.slice(2)){const m=a.match(/^--(racine|temoin|preuve-echecs)(?:=(.*))?$/);if(!m || (m[1]!=='racine'&&m[2]!==undefined)){console.error('option invalide');process.exit(2)}options[m[1]]=m[2]??true}
const racine=path.resolve(options.racine||R),cible=path.join(racine,'lib/sites/searchConsole.ts'),tour=path.join(racine,'lib/siteLivraison.ts')
const ligne=(id,ok,d)=>console.log(`${ok?'PASS':'FAIL'} ${id} — ${d}`)
const normalise=s=>s.replace(/\r\n/g,'\n')
function sc1(module=cible,t=tour){try{const a=fs.readFileSync(module,'utf8'),b=fs.readFileSync(t,'utf8');return /export\s+(?:async\s+)?function\s+jetonCompteService\b/.test(a)&&/export\s+(?:async\s+)?function\s+soumettreSiteSearchConsole\b/.test(a)&&/soumettreSiteSearchConsole\s*\(/.test(b)}catch{return false}}
function sonde(module,t){const r=spawnSync(process.execPath,['--no-warnings','--import',pathToFileURL(path.join(R,'scripts/ts-loader.mjs')).href,path.join(F,'sonde-module.mjs'),module,t],{cwd:racine,windowsHide:true,encoding:'utf8',timeout:90000,maxBuffer:2e6});let j;try{j=JSON.parse(r.stdout.trim().split(/\r?\n/).at(-1))}catch{}return {code:r.status,brut:r.stdout+r.stderr,resultats:r.status===0?j?.resultats:null}}
function nonRegression(){
 const h=spawnSync('git',['show','HEAD:package.json'],{cwd:R,encoding:'utf8',windowsHide:true})
 if(h.status!==0||normalise(h.stdout)!==normalise(fs.readFileSync(path.join(racine,'package.json'),'utf8')))return {ok:false,detail:'package.json diffère du HEAD authentique'}
 const r=spawnSync('npm',['run','typecheck'],{cwd:racine,shell:process.platform==='win32',encoding:'utf8',windowsHide:true,timeout:1200000,maxBuffer:4e6})
 return {ok:r.status===0,detail:r.status===0?'package identique ; typecheck réel vert':`typecheck réel en échec (code ${r.status})`,brut:r.stdout+r.stderr}
}
function sourcePermise(f){const s=fs.readFileSync(f,'utf8');const imports=[...s.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);return imports.every(i=>i.startsWith('node:')||i.startsWith('.')||i.startsWith('@/'))&&[...s.matchAll(/https:\/\/([^/\s'"`]+)/g)].every(m=>m[1].startsWith('${')||['oauth2.googleapis.com','www.googleapis.com'].includes(m[1]))}
if(options.temoin&&options['preuve-echecs']){console.error('options incompatibles');process.exit(2)}
if(options.temoin){const n=nonRegression();ligne('SC-8',n.ok,n.detail);console.log(`search-console-qa : ${n.ok?'PASS':'FAIL — SC-8'}`);process.exit(n.ok?0:1)}
if(!options['preuve-echecs']){
 if(!sc1()){ligne('SC-1',false,'module/exports/appel du tour absent');console.log('search-console-qa : FAIL — SC-1');process.exit(1)}
 const rr=sonde(cible,tour),n=nonRegression(),rouges=[];ligne('SC-1',true,'exports et appel présents')
 for(const id of ['SC-2','SC-3','SC-4','SC-5','SC-6','SC-7']){const v=rr.resultats?.[id];ligne(id,Boolean(v?.ok),v?.ok?'observation réelle loopback':v?.detail||'sonde non jugée');if(!v?.ok)rouges.push(id)}
 const ok8=n.ok&&sourcePermise(cible);ligne('SC-8',ok8,ok8?n.detail:'source/imports/hôtes ou non-régression refusés');if(!ok8)rouges.push('SC-8')
 console.log(`search-console-qa : ${rouges.length?'FAIL — '+rouges.join(', '):'PASS'}`);process.exit(rouges.length?1:0)
}
// Les mutations sont physiques dans des copies ; aucun fichier métier modifié.
const W=fs.mkdtempSync(path.join(os.tmpdir(),'presti-SC-')),essais=[],journaux=[]
try{
 const absent=!sc1();essais.push({nom:'courant avant201',ok:absent,id:'SC-1'});journaux.push(`courant : ${absent?'FAIL SC-1 — module/exports/appel absent':'NON VALIDÉ — livré, scénario avant201 à revoir'}`)
 const module=path.join(F,'temoin-module.mjs'),t=path.join(F,'temoin-tour.mjs'),a=fs.readFileSync(module,'utf8'),b=fs.readFileSync(t,'utf8')
 const positif=sonde(module,t);journaux.push('=== témoin ===\n'+positif.brut);essais.push({nom:'témoin causal',ok:sc1(module,t)&&positif.code===0&&['SC-2','SC-3','SC-4','SC-5','SC-6','SC-7'].every(id=>positif.resultats?.[id]?.ok)})
 const fautes=[
 ['scope','SC-2','module',"scope: 'https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters'","scope: 'portee-fautive'"],
 ['date avant refus','SC-3','module',"etape = 'sitemap'","await d.mettreAJour(c.id, { search_console_le: d.maintenant().toISOString() }); etape = 'sitemap'"],
 ['bucket supplémentaire','SC-4','module',"etape = 'verification'","await d.stockage.ecrire('sites', `${c.id}/autre.html`, 'interdit'); etape = 'verification'"],
 ['sans objet ignoré','SC-5','module',"if (c.domaine_mode === 'aucun' || c.search_console_le)","if (false)"],
 ['jeton journalisé','SC-7','module',"const headers = { Authorization:","console.log(t.jeton); const headers = { Authorization:"],
 ['quatre commandes','SC-6','tour','eligibles.slice(0, 3)','eligibles.slice(0, 4)'],
 ['quatrième essai','SC-6','tour',"Number(c.verifications?.search_console_essais || 0) < 3","Number(c.verifications?.search_console_essais || 0) < 4"],
 ['pause ignorée','SC-6','tour','if (await d.enPause()) return','d = { ...d, enPause: async () => false }; if (await d.enPause()) return'],
 ['compteur perdu','SC-6','tour','search_console_essais: Number(c.verifications?.search_console_essais || 0) + 1','search_console_essais: 0'],
 ]
 for(let k=0;k<fautes.length;k++){
  const [nom,id,kind,avant,apres]=fautes[k],original=kind==='module'?a:b
  if(original.split(avant).length!==2){essais.push({nom,id,ok:false,detail:'ancre non unique'});continue}
  const copie=path.join(W,`faute-${k}.mjs`);fs.writeFileSync(copie,original.replace(avant,apres))
  const r=sonde(kind==='module'?copie:module,kind==='tour'?copie:t),v=r.resultats?.[id]
  const infra=r.code!==0||!r.resultats||r.resultats['SC-2']?.detail?.startsWith('module non importable')
  essais.push({nom,id,ok:!infra&&v?.ok===false,detail:v?.detail||'non observé'});journaux.push(`=== ${nom} ===\n${r.brut}`)
 }
 const n=nonRegression();essais.push({nom:'non-régression réelle',id:'SC-8',ok:n.ok,detail:n.detail});journaux.push('=== non-régression ===\n'+(n.brut||n.detail))
 fs.mkdirSync(P,{recursive:true});fs.writeFileSync(path.join(P,'SC-contrepreuves-brutes.log'),journaux.join('\n'))
 fs.writeFileSync(path.join(P,'SC-resultats.json'),JSON.stringify(essais,null,2)+'\n')
 fs.writeFileSync(path.join(P,'SC-echecs-attendus.md'),'# SearchConsole — contrepreuves causales\n\n'+essais.map(e=>`- ${e.ok?'PASS':'FAIL'} ${e.nom} ${e.id||''} : ${e.detail||''}`).join('\n')+'\n\nFaux Google loopback, clé factice mémoire, aucun appel public. UP199 reste hors de ce juge.\n')
 for(const e of essais)console.log(`${e.ok?'PASS':'FAIL'} AUTO-${e.nom} — ${e.id||''} ${e.detail||''}`)
 const ok=essais.every(e=>e.ok);console.log(`search-console-qa --preuve-echecs : ${ok?'PASS':'FAIL'}`);process.exitCode=ok?0:1
}finally{fs.rmSync(W,{recursive:true,force:true})}
