// lib/agents/pause.ts — l'arrêt d'urgence ops.pause_generale (fiche 026-044).
//
// La seule lecture commune de la pause : chaque agent qui fait sortir quelque chose (le Facteur, le
// Répondeur, le porteur du formulaire de l'usine, les routes de l'acquisition, le tic) l'appelle avant
// d'agir, et aucune autre variable. Trois sources, dans cet ordre :
//   1. la variable Vercel `PAUSE_GENERALE=1` : active, sans même interroger la base (le secours qui marche
//      quand la base elle-même est en cause) ;
//   2. sinon l'interrupteur `ops.pause_generale` en base, par `ops_interrupteur` (lib/agents/bus.ts) ;
//   3. une erreur ou la base injoignable : ACTIVE. Quand on ne sait pas, rien ne sort — jamais « au mieux ».
import { ops_interrupteur } from '@/lib/agents/bus'

export type EtatPause = { active: boolean; source: 'variable' | 'base' | 'panne'; motif?: string }

export async function pauseGenerale(): Promise<EtatPause> {
  if (process.env.PAUSE_GENERALE === '1') return { active: true, source: 'variable', motif: 'variable PAUSE_GENERALE' }
  try {
    const r = await ops_interrupteur({ p_nom: 'pause_generale' })
    if (!r.ok) return { active: true, source: 'panne' }
    if (r.data === true) return { active: true, source: 'base' }
    if (r.data === false) return { active: false, source: 'base' }
    return { active: true, source: 'panne' }
  } catch {
    return { active: true, source: 'panne' }
  }
}
