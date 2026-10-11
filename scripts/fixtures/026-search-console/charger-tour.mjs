import fs from 'node:fs'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

export function baseFactice(lignes) {
  return { from(table) {
    if (table !== 'sites_commandes') throw Error('table non autorisée')
    const filtres = []; let maximum = Infinity, patch, colonnes = '*'
    const champ = (c, k) => k.includes('->>') ? c[k.split('->>')[0]]?.[k.split('->>')[1]] : c[k]
    const q = {
      select(c = '*') { colonnes = c; return q }, eq(k,v) { filtres.push(c=>champ(c,k)===v); return q },
      is(k,v) { filtres.push(c=>champ(c,k)===v); return q }, lt(k,v) { filtres.push(c=>Number(champ(c,k))<v); return q },
      in(k,v) { filtres.push(c=>v.includes(champ(c,k))); return q }, order() { return q }, limit(n) { maximum=n;return q },
      update(p) { patch=p;return q },
      then(a,b) {
        let rows=lignes.filter(c=>filtres.every(f=>f(c))).slice(0,maximum)
        if(patch)for(const c of rows)Object.assign(c,structuredClone(patch))
        if(colonnes!=='*')rows=rows.map(c=>Object.fromEntries(colonnes.split(',').map(k=>[k.trim(),c[k.trim()]])))
        return Promise.resolve({data:structuredClone(rows),error:null}).then(a,b)
      },
    }; return q
  } }
}
export async function chargerTour(fichier, moduleCible, base) {
  const source = fs.readFileSync(fichier, 'utf8'), modules = {}
  globalThis.__SC_MOCKS = new Proxy({ supabaseAdmin:base, DELAI_TEXTE:'synthétique', PRIX_SITE_TEXTE:'synthétique', erreursAvantPaiement:()=>[], sendEmail:async()=>({id:'factice'}), getStatus:async()=>({verified:false}) }, { get:(o,k)=>k in o?o[k]:async()=>[] })
  for(const m of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    if(!m[2].startsWith('@/lib/') || m[2]==='@/lib/sites/searchConsole')continue
    const noms=m[1].split(',').map(x=>x.trim()).filter(x=>!x.startsWith('type ')).map(x=>x.split(/\s+as\s+/)[0])
    modules[m[2]]=noms.map(n=>`export const ${n}=globalThis.__SC_MOCKS[${JSON.stringify(n)}];`).join('\n')
  }
  register('data:text/javascript,'+encodeURIComponent(`
    let d;export function initialize(data){d=data}
    export async function resolve(s,c,next){
      if(s==='@/lib/sites/searchConsole')return {url:d.cible,shortCircuit:true};
      if(Object.hasOwn(d.modules,s))return {url:'data:text/javascript,'+encodeURIComponent(d.modules[s]),shortCircuit:true};
      return next(s,c);
    }`), { parentURL:import.meta.url, data:{cible:pathToFileURL(moduleCible).href,modules} })
  return import(pathToFileURL(fichier).href)
}
