import assert from 'node:assert/strict'
import { register } from 'node:module'

// La route et les deux adaptateurs Crieur restent réels. Seuls DB, pause,
// composition et transport sont doublés ; toute sortie réseau est interdite.
const mocks = {
  'next/server': 'export const NextResponse={json:(body,options={})=>({body,status:options.status??200})}',
  '@/lib/supabaseAdmin': 'export const supabaseAdmin={from:()=>globalThis.__crieurQA.db()}',
  '@/lib/agents/sortie': 'export const sortiePermise=async()=>globalThis.__crieurQA.pause()',
  '@/lib/agents/bus': 'export const ops_battement=async()=>{globalThis.__crieurQA.events.push({op:"battement"});return{ok:true}}',
  '@/lib/alertes': 'export const enregistrerPassage=async()=>{globalThis.__crieurQA.events.push({op:"passage"})}',
  '@/lib/email': 'export const notifierEntreprise=async(...args)=>{globalThis.__crieurQA.notifications.push(args);return{ok:true}}',
  '@/lib/flags': 'export const FLAGS={}; export const actif=()=>true',
  '@/lib/crieur/composer': 'export const PHRASES_GABARIT=[];export const cleSemaine=()=>"semaine-test";export const horairesSemaine=()=>[];export const composerLot=()=>globalThis.__crieurQA.lot',
  '@/lib/crieur/faits': 'export const FAITS=[]',
  '@/lib/crieur/juge': 'export const jugerPublication=()=>globalThis.__crieurQA.verdict??({ok:true,raisons:[]})',
}
register('data:text/javascript,' + encodeURIComponent(`
 const mocks=${JSON.stringify(mocks)};
 export async function resolve(s,c,next){if(mocks[s])return{url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};return next(s,c)}
`))
const { GET } = await import('../app/api/cron/crieur/route.ts')
const vraiFetch = globalThis.fetch
process.env.CRON_SECRET = 'cron-test-sans-valeur'
process.env.PUBLORA_API_KEY = 'publora-test-sans-valeur'
const futur = new Date(Date.now() + 86400000).toISOString()
function etat(options = {}) {
  const s = { rows: [], events: [], notifications: [], pauses: 0, lot: [{ canal: 'linkedin', fait_ids: [], texte: 'texte factice', programmee_pour: futur }], ...options }
  s.pause = () => ({ permise: ++s.pauses < (s.pauseAt ?? Infinity) })
  s.db = () => {
    let op = 'read', values, id
    const q = {
      select(){return q}, gte(){return q}, in(){return q}, eq(_k,v){id=v;return q},
      insert(v){op='insert';values=v;return q}, update(v){op='update';values=v;return q},
      single(){return q}, maybeSingle(){return q},
      then(resolve,reject){
        try {
          if(op==='insert'){const row={...values,id:'reservation-test'};s.rows.push(row);return Promise.resolve({data:row,error:null}).then(resolve,reject)}
          if(op==='update'){
            s.events.push({op,values:{...values}})
            if(s.zeroIntention && values.raisons?.includes('programmation_en_cours'))return Promise.resolve({data:null,error:null}).then(resolve,reject)
            if(s.failProgramme && values.statut==='programmee')return Promise.resolve({data:null,error:new Error('DB factice')}).then(resolve,reject)
            const row=s.rows.find(r=>r.id===id);if(row)Object.assign(row,values)
            return Promise.resolve({data:row?{id:row.id}:null,error:null}).then(resolve,reject)
          }
          return Promise.resolve({data:s.rows,error:null}).then(resolve,reject)
        }catch(e){return Promise.reject(e).then(resolve,reject)}
      },
    };return q
  }
  globalThis.__crieurQA=s
  globalThis.fetch=async(url,opts)=>{
    assert.ok(String(url).startsWith('https://api.publora.com/api/v1/'), 'transport inattendu')
    const body=opts.body?JSON.parse(opts.body):null
    s.events.push({op:'api',body,url:String(url)})
    if(String(url).endsWith('/platform-connections'))return{ok:true,json:async()=>({connections:[{platformId:'linkedin-test'}]})}
    if(String(url).endsWith('/create-post'))return{ok:true,json:async()=>({success:true,postGroupId:'pub-test'})}
    if(body?.status==='scheduled'){
      assert.ok(s.rows[0].raisons.includes('programmation_en_cours'), 'intention persistée avant API')
      if(s.timeout)throw new Error('délai factice')
      return{ok:true,json:async()=>({success:true,postGroup:body})}
    }
    if(body?.status==='draft')return{ok:true,json:async()=>({success:true,postGroup:{status:s.failSuspend?'scheduled':'draft'}})}
    assert.fail('appel externe non prévu')
  }
  return s
}
async function jouer(options,cout='0',aSec=false) {
  process.env.PUBLORA_COUT_PAR_PUBLICATION_EUR=cout
  const s=etat(options)
  const r=await GET(new Request('https://test.invalid/api/cron/crieur'+(aSec?'?a_sec=1':''),{headers:{authorization:'Bearer cron-test-sans-valeur'}}))
  return{s,r,api:s.events.filter(e=>e.op==='api')}
}
try {
  const normal=await jouer({});assert.equal(normal.r.status,200);assert.equal(normal.s.rows[0].statut,'programmee')
  console.log('PASS CR-1 — route active, intention avant API et programmation confirmée')
  for(const pauseAt of [1,2,3]){
    const {r,api}=await jouer({pauseAt});assert.equal(r.status,200);assert.equal(r.body.pause,true);assert.equal(api.filter(e=>e.body?.status==='scheduled').length,0)
  }
  console.log('PASS CR-2 — pause avant route, dépôt et programmation : aucun scheduled')
  const apres=await jouer({pauseAt:4});assert.equal(apres.r.status,200);assert.equal(apres.r.body.pause,true);assert.equal(apres.s.rows[0].programmee_pour,null);assert.ok(apres.api.some(e=>e.body?.status==='draft'))
  const refus=await jouer({pauseAt:4,failSuspend:true});assert.equal(refus.r.status,503);assert.ok(refus.s.rows[0].raisons.includes('programmation_non_confirmee'))
  console.log('PASS CR-3 — pause après API : suspension confirmée, refus externe déclaré')
  const db=await jouer({failProgramme:true});assert.equal(db.r.status,503);assert.ok(db.api.some(e=>e.body?.status==='draft'))
  const timeout=await jouer({timeout:true});assert.equal(timeout.r.status,503);assert.ok(timeout.s.rows[0].raisons.includes('programmation_non_confirmee'))
  console.log('PASS CR-4 — écriture DB échouée annulée, délai API ambigu conservé')
  for(const cout of ['', '0.01', '-1']){const {r,api}=await jouer({},cout);assert.equal(r.status,503);assert.equal(api.length,0)}
  console.log('PASS CR-5 — coût inconnu/positif/négatif : zéro appel externe')
  const secret=await jouer({});assert.ok(!JSON.stringify(secret.r.body).includes('sans-valeur'));assert.ok(!JSON.stringify(secret.s.notifications).includes('sans-valeur'))
  console.log('PASS CR-6 — réponses et notifications sans clés factices')
  const stop=await jouer({pauseAt:1});assert.equal(stop.api.length,0)
  const juge=await jouer({verdict:{ok:false,raisons:['STOP ou opposition']}});assert.equal(juge.api.length,0);assert.equal(juge.r.status,503)
  const s=etat();const unauthorized=await GET(new Request('https://test.invalid/api/cron/crieur'))
  assert.equal(unauthorized.status,401);assert.equal(s.events.length,0);assert.equal(s.pauses,0)
  console.log('PASS CR-7 — refus de sortie/juge et authentification refusée : aucune API')
  const zero=await jouer({zeroIntention:true});assert.equal(zero.r.status,503);assert.equal(zero.api.filter(e=>e.body?.status==='scheduled').length,0)
  const double=await jouer({failProgramme:true,failSuspend:true});assert.equal(double.r.status,503);assert.ok(double.s.rows[0].raisons.includes('programmation_non_confirmee'))
  console.log('PASS CR-8 — intention zéro ligne interdit API, double échec reste ambigu')
  const sec=await jouer({},'0',true);assert.equal(sec.r.status,200);assert.equal(sec.api.length,0);assert.equal(sec.s.events.filter(e=>['passage','battement'].includes(e.op)).length,0)
  assert.equal(normal.s.events.filter(e=>e.op==='battement').length,1);assert.ok(normal.s.events.findIndex(e=>e.op==='passage')<normal.s.events.findIndex(e=>e.op==='battement'))
  assert.equal(timeout.s.events.filter(e=>e.op==='battement').length,0)
  console.log('PASS CR-10 — battement après passage réussi, jamais à sec ni API ambiguë')
} finally { globalThis.fetch=vraiFetch;delete globalThis.__crieurQA }
