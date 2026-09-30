// lib/agents/sortie.ts — la porte de TOUTE sortie automatique : « ai-je le droit de faire partir quelque chose ? ».
//
// Une seule lecture, celle de la pause générale (lib/agents/pause.ts), avec une règle de plus : FAIL-CLOSED à la forme. Seule
// la valeur exacte `active: false` ouvre la porte ; une lecture qui lève, qui rend autre chose qu'un objet, ou un `active`
// absent, null, « false » ou 0 la ferme. Quand on ne sait pas, rien ne part — jamais « au mieux ».
// Les messages critiques de l'entreprise (alerte au fondateur, code de connexion) ne passent pas par ici : lib/email.ts les
// laisse partir, sans quoi personne ne saurait que la pause est posée.
import { pauseGenerale } from '@/lib/agents/pause'

export type SortiePermise = { permise: true } | { permise: false; raison: 'pause' | 'doute' }

export async function sortiePermise(): Promise<SortiePermise> {
  try {
    const p = (await pauseGenerale()) as { active?: unknown } | null | undefined
    if (!p || typeof p !== 'object') return { permise: false, raison: 'doute' }
    return p.active === false ? { permise: true } : { permise: false, raison: p.active === true ? 'pause' : 'doute' }
  } catch {
    return { permise: false, raison: 'doute' }
  }
}
