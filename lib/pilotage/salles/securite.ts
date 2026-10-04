// 026-178 — la Sécurité : bans() de lib/controle/lectures (026-174) en NOMBRES (bans actifs, adresses signalées sur 24 h : jamais
// une adresse), les disjoncteurs ouverts (pilotage_agents), la pause générale (pauseGenerale, 026-044) et le compte des erreurs des
// 24 h (app_errors, colonne `id` seule). L'historique de la pause et les reconfirmations du jour n'ont aucune fonction de lecture
// permise ici : ils ne sont pas servis (voir .orchestre/preuves/026-178). Sous `securite`.
import { pauseGenerale } from '@/lib/agents/pause'
import type { Contexte } from '../station'
import { lignes } from './outils'

export async function lire(c: Contexte) {
  const b = await c.deps.lectures.bans()
  if (!b) throw new Error('table des bans illisible')
  const agents = await c.agents()
  const pause = await pauseGenerale()
  const e = await c.deps.db.from('app_errors').select('id', { count: 'exact', head: true }).gte('created_at', new Date(c.maintenant.getTime() - 24 * 3_600_000).toISOString())
  if (e.error) throw new Error(`app_errors : ${e.error.message}`)
  return {
    bans: lignes(b.bans).filter((x) => x.actif === true).length,
    abus_24h: lignes(b.abus24h).length,
    disjoncteurs: agents.filter((a) => a.disjoncteur_ouvert_le).map((a) => ({ nom: a.nom, depuis: a.disjoncteur_ouvert_le })),
    pause: { active: pause.active, source: pause.source },
    erreurs: e.count ?? 0,
  }
}
