import fs from 'fs'
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(Boolean).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const SB=env.NEXT_PUBLIC_SUPABASE_URL,SVC=env.SUPABASE_SERVICE_ROLE_KEY
const H={apikey:SVC,Authorization:`Bearer ${SVC}`,'Content-Type':'application/json'}
const st=Date.now(),slug=`lead-${st}`,email=`l.${st}@example.com`
const u=await(await fetch(`${SB}/auth/v1/admin/users`,{method:'POST',headers:H,body:JSON.stringify({email,password:'Test123456!Aa9',email_confirm:true})})).json()
await fetch(`${SB}/rest/v1/artisans`,{method:'POST',headers:{...H,Prefer:'return=minimal'},body:JSON.stringify({id:u.id,email,nom:'T',metier:'Plombier',ton_style:'pro',slug})})
const post=(body,ip)=>fetch('http://localhost:3200/api/leads',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':ip},body:JSON.stringify(body)})
const countLeads=async()=>(await(await fetch(`${SB}/rest/v1/leads?artisan_id=eq.${u.id}&select=id`,{headers:H})).json()).length
// 1) honeypot
const hp=await post({slug,contact:'bot@x.com',message:'spam',website:'http://spam'},'9.9.9.9')
console.log('HONEYPOT → HTTP',hp.status,'| leads insérés:',await countLeads(),(await countLeads())===0?'✅ droppé':'🔴')
// 2) rate-limit IP : 8 POST même IP
const codes=[]
for(let i=0;i<8;i++){const r=await post({slug,contact:`p${i}@x.com`,message:'bonjour'},'1.2.3.4');codes.push(r.status)}
console.log('RATE-LIMIT (8 POST même IP) → codes:',codes.join(','),'| 429 présent:',codes.includes(429)?'✅':'🔴')
// 3) IP différente passe
const other=await post({slug,contact:'ok@x.com',message:'salut'},'5.5.5.5')
console.log('IP différente → HTTP',other.status,other.status===200?'✅ passe':'🔴')
await fetch(`${SB}/auth/v1/admin/users/${u.id}`,{method:'DELETE',headers:H})
