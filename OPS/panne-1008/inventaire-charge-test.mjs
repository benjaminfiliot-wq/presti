import fs from 'node:fs';
import assert from 'node:assert/strict';
const src = fs.readFileSync('app/inventaire/page.tsx', 'utf8');
const body = src.match(/const charger = useCallback\(async \(recherche = ''\) => \{([\s\S]*?)\n  \}, \[\]\)/)[1];
for (const s of [{name:'401',status:401,error:'Session fermée'}, {name:'403',status:403,error:'Offre requise'}, {name:'500',status:500,error:'Lecture impossible.'}, {name:'500 HTML',status:500,invalid:true}, {name:'network',network:true}, {name:'200',status:200}]) {
  let blocked = null, materials = ['existant'], alerts = ['existante'];
  const fetch = async () => {
    if (s.network) throw Error('network');
    return {ok:s.status===200,status:s.status,json:async()=> {
      if(s.invalid) throw Error('html');
      return s.status===200 ? {materiaux:['retour'],alertes:[]} : {error:s.error};
    }};
  };
  const run = new Function('jeton','fetch','setBloque','setMateriaux','setAlertes','return async function(recherche=""){'+body+'}');
  await run(async()=> 'fictif', fetch, v=>blocked=v, v=>materials=v, v=>alerts=v)();
  if(s.status===200) { assert.equal(blocked,null); assert.deepEqual(materials,['retour']); }
  else { assert.ok(blocked); assert.deepEqual(materials,['existant']); assert.deepEqual(alerts,['existante']); }
  console.log('PASS '+s.name);
}
