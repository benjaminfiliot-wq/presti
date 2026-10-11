// 026-178 — la Sécurité : bans() de lib/controle/lectures (026-174) en NOMBRES (bans actifs, adresses signalées sur 24 h : jamais
// une adresse), les disjoncteurs ouverts (pilotage_agents), la pause générale (pauseGenerale, 026-044) et le compte des erreurs des
// 24 h (app_errors, colonne `id` seule). L'historique de la pause et les reconfirmations du jour n'ont aucune fonction de lecture
// permise ici : ils ne sont pas servis (voir .orchestre/preuves/026-178). Sous `securite`.
import { pauseGenerale } from '@/lib/agents/pause'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Base, Contexte } from '../station'
import { lignes } from './outils'

/** 026-249 (décision D-0410-8) — le compte des erreurs des 24 h, la requête de `lire` sortie telle quelle pour que le Vigile lise le MÊME chiffre que la salle.
 *  Sans argument (le Vigile) : la base est celle de la station (`supabaseAdmin`, ce que la route de la station passe en `deps.db`) et l'heure est maintenant ;
 *  `lire` passe sa base et son horloge. Rend un nombre ; une panne de lecture lève. */
export async function erreurs24h(db: Base = supabaseAdmin as unknown as Base, maintenant: Date = new Date()): Promise<number> {
  const e = await db.from('app_errors').select('id', { count: 'exact', head: true }).gte('created_at', new Date(maintenant.getTime() - 24 * 3_600_000).toISOString())
  if (e.error) throw new Error(`app_errors : ${e.error.message}`)
  return e.count ?? 0
}

export async function lire(c: Contexte) {
  const b = await c.deps.lectures.bans()
  if (!b) throw new Error('table des bans illisible')
  const agents = await c.agents()
  const pause = await pauseGenerale()
  const erreurs = await erreurs24h(c.deps.db, c.maintenant)
  return {
    bans: lignes(b.bans).filter((x) => x.actif === true).length,
    abus_24h: lignes(b.abus24h).length,
    disjoncteurs: agents.filter((a) => a.disjoncteur_ouvert_le).map((a) => ({ nom: a.nom, depuis: a.disjoncteur_ouvert_le })),
    pause: { active: pause.active, source: pause.source },
    erreurs,
  }
}
