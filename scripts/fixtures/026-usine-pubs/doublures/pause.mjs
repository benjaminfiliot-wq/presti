// Doublure de lib/agents/pause.ts : la pause générale est celle que le juge pose (U().pause.active) ; chaque lecture est consignée.
import { U, noter } from './etat.mjs'
export async function pauseGenerale() { noter('pause.pauseGenerale'); return { active: U().pause.active === true, source: 'variable' } }
