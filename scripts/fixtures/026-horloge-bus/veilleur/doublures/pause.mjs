// Doublure de lib/agents/pause (026-045) : la pause générale vient du cas du juge (J.config.pause = true | false).
import { J, noter, durer } from './commun-doublures.mjs'

export async function pauseGenerale() {
  noter('pause.pauseGenerale', null)
  const c = J().config?.pauseGenerale ?? {}
  durer(c.dureeMs ?? 0)
  if (c.erreur) throw new Error(c.erreur)
  const active = J().config?.pause === true
  return active ? { active: true, source: 'base', motif: 'pause posée par le juge' } : { active: false, source: 'base' }
}
