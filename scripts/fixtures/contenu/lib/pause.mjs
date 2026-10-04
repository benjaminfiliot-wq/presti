import { register } from 'node:module'

// Seule la lecture de l'interrupteur est doublée. La porte fail-closed
// sortiePermise et les appels Laya réels du juge restent exécutés.
export function installerPause(cfg) {
  const scenario=cfg.pauseScenario??'inactive'
  if(!['inactive','active','doute','throw','apres-premier-modele'].includes(scenario))throw new Error('scenario pause inconnu')
  const etat={scenario,lectures:0,active:false}
  globalThis.__contenuPause=etat
  register('data:text/javascript,'+encodeURIComponent(`
    export async function resolve(s,c,n){
      if(s==='@/lib/agents/pause')return{url:'data:text/javascript,'+encodeURIComponent(
        'export const pauseGenerale=async()=>{const s=globalThis.__contenuPause;s.lectures++;if(s.scenario==="throw")throw new Error("lecture pause factice");if(s.scenario==="doute")return {};return {active:s.active||s.scenario==="active",source:"base"}}'
      ),shortCircuit:true};return n(s,c)
    }
  `))
  return etat
}
