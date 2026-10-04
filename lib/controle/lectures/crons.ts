// Vient de app/api/controle/etat/route.ts (const `crons`) : le dernier passage de chaque tâche planifiée attendue.
// Aucune route ne les liste seule : le bandeau d'état les juge, la station les montre.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sourcer } from '@/lib/direction/fraicheur'
import { CRONS_ATTENDUS } from '@/lib/alertes'

export const cronsDuService = () => sourcer('etat:crons', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('passages_cron').select('nom, dernier_passage, reussi')
  if (error) throw new Error(error.message)
  return CRONS_ATTENDUS.map((c) => {
    const p = (data ?? []).find((x) => x.nom === c.nom)
    const age = p ? (Date.now() - new Date(p.dernier_passage).getTime()) / 3_600_000 : null
    return { nom: c.nom, dernier: p?.dernier_passage ?? null, reussi: p?.reussi ?? null, enRetard: age === null || age > c.maxHeures }
  })
})
