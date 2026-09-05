import fs from 'fs'
import { chromium } from 'playwright'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const BASE='http://localhost:3200'
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const SB=env.NEXT_PUBLIC_SUPABASE_URL,SVC=env.SUPABASE_SERVICE_ROLE_KEY,ANON=env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const H={apikey:SVC,Authorization:`Bearer ${SVC}`,'Content-Type':'application/json'}
const st=Date.now(),email=`csp.${st}@example.com`
const u=await(await fetch(`${SB}/auth/v1/admin/users`,{method:'POST',headers:H,body:JSON.stringify({email,password:'Test123456!',email_confirm:true})})).json()
await fetch(`${SB}/rest/v1/artisans`,{method:'POST',headers:{...H,Prefer:'return=minimal'},body:JSON.stringify({id:u.id,email,nom:'CSP',metier:'Plombier',ton_style:'pro',slug:`csp-${st}`})})
const sess=await(await fetch(`${SB}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:ANON,'Content-Type':'application/json'},body:JSON.stringify({email,password:'Test123456!'})})).json()
await verifierSessionTest(sess.access_token)
const ref=SB.match(/https:\/\/([^.]+)\./)[1]
const b=await chromium.launch();const pg=await b.newPage()
const csp=[]
pg.on('console',m=>{const t=m.text();if(/content security policy|violates the following|refused to/i.test(t))csp.push(t.slice(0,160))})
async function visit(path,auth){
  if(auth){await pg.goto(`${BASE}/login`,{waitUntil:'domcontentloaded'});await pg.evaluate(([k,v])=>localStorage.setItem(k,v),[`sb-${ref}-auth-token`,JSON.stringify(sess)])}
  await pg.goto(`${BASE}${path}`,{waitUntil:'networkidle',timeout:30000}).catch(()=>{})
  await pg.waitForTimeout(2000)
  const txtLen=(await pg.evaluate(()=>document.body.innerText||'')).length
  console.log(`${path} → contenu:${txtLen} chars${auth?' (authed)':''}`)
}
await visit('/',false)
await visit('/login',false)
await visit('/dashboard',true)
await visit('/devis/nouveau',true)
console.log('\n=== VIOLATIONS CSP:',csp.length,'===')
csp.slice(0,15).forEach(c=>console.log(' •',c))
await b.close()
await fetch(`${SB}/auth/v1/admin/users/${u.id}`,{method:'DELETE',headers:H})
