import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Délai de réponse RÉEL mesuré sur les 30 derniers jours (jamais inventé).
// Renvoie un libellé prêt à afficher, ou null si trop peu de données pour être honnête.
// Médiane du temps entre le 1er message entrant (prospect) et la 1re réponse (auto ou humaine).
export async function computeResponseDelay(artisanId: string): Promise<string | null> {
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('artisan_id', artisanId)
      .gte('created_at', since)
      .limit(300)
    const ids = (leads ?? []).map((l) => l.id)
    if (ids.length < 3) return null

    const { data: msgs } = await supabaseAdmin
      .from('messages')
      .select('lead_id, sens, sent_at')
      .in('lead_id', ids)
      .order('sent_at', { ascending: true })
    if (!msgs || msgs.length === 0) return null

    // Par lead : 1er 'in', puis 1re 'out' postérieure.
    const firstIn = new Map<string, number>()
    const firstOut = new Map<string, number>()
    for (const m of msgs) {
      const t = m.sent_at ? new Date(m.sent_at).getTime() : NaN
      if (!Number.isFinite(t)) continue
      if (m.sens === 'in') { if (!firstIn.has(m.lead_id)) firstIn.set(m.lead_id, t) }
      else if (m.sens === 'out') { if (!firstOut.has(m.lead_id)) firstOut.set(m.lead_id, t) }
    }
    const deltas: number[] = []
    for (const [lid, tin] of firstIn) {
      const tout = firstOut.get(lid)
      if (tout != null && tout >= tin) deltas.push((tout - tin) / 1000) // secondes
    }
    if (deltas.length < 3) return null

    deltas.sort((a, b) => a - b)
    const mid = Math.floor(deltas.length / 2)
    const median = deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2

    if (median < 60) return 'Répond en moins d’une minute'
    if (median < 3600) return `Répond en général en ${Math.round(median / 60)} min`
    if (median < 86400) return `Répond en général sous ${Math.max(1, Math.round(median / 3600))} h`
    return `Répond en général sous ${Math.max(1, Math.round(median / 86400))} j`
  } catch {
    return null // en cas de doute : pas de chiffre plutôt qu'un chiffre faux
  }
}
