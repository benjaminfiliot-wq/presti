// Vient de app/api/controle/audience/route.ts : les quatre mesures de l'onglet Visiteurs (visites, inscriptions du
// jour en NOMBRE, historique sur 30 jours si demandé, plafond du jour atteint ?). Des visites, aucun compte nommé.
// La garde et le drapeau `audience` restent à la route.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sourcer } from '@/lib/direction/fraicheur'
import { seulsLesVrais } from '@/lib/direction/perimetre'
import { limiteAtteinte } from '@/lib/limites'
import { PLAFOND_JOUR_AUDIENCE, cleJourAudience, minuitParis } from '@/lib/audienceServeur'

/** @param periode 'historique' ajoute les 30 derniers jours ; 'jour' (défaut) ne les lit pas. */
export async function audience(periode: 'jour' | 'historique' = 'jour') {
  const [direct, inscriptions, historique, saturee] = await Promise.all([
    sourcer('audience:direct', 'supabase', async () => {
      const { data, error } = await supabaseAdmin.rpc('audience_direct')
      if (error) throw new Error(error.message)
      return data as Record<string, unknown>
    }),
    // Compté en base, pas sur une liste tronquée puis filtrée : les comptes de nos suites passaient devant les vrais.
    sourcer('audience:inscriptions', 'supabase', async () => {
      const { count, error } = await seulsLesVrais(supabaseAdmin.from('artisans').select('id', { count: 'exact', head: true }))
        .gte('created_at', minuitParis())
      if (error) throw new Error(error.message || 'lecture des inscriptions refusée')
      return count ?? 0
    }),
    periode === 'historique'
      ? sourcer('audience:historique', 'supabase', async () => {
          const { data, error } = await supabaseAdmin.rpc('audience_historique', { p_jours: 30 })
          if (error) throw new Error(error.message)
          return data as Record<string, unknown>
        })
      : Promise.resolve(null),
    limiteAtteinte(cleJourAudience(), PLAFOND_JOUR_AUDIENCE, 86400).catch(() => null),
  ])
  return { direct, inscriptions, historique, saturee }
}
