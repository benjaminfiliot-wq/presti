// lib/suspension.ts — UNE lecture de vérité pour « ce compte est-il suspendu ? » (v15 §5).
//
// La suspension (v10 §2.2, migration 0068) vit dans la table `suspensions` : une ligne sans `levee_le` = en cours.
// La garde de connexion (lib/authArtisan.ts) la lisait déjà ; mais la page de conversation publique, la création d'un
// lead, le moteur de conversation et les relances ne la lisaient PAS — un compte suspendu continuait de recevoir des
// clients et d'écrire à ses prospects. C'est ce que Benj a constaté (« Suspendre un compte n'a pas d'effet ») : l'accès
// de l'artisan était coupé, mais son activité continuait sans lui. Chacun de ces chemins passe désormais par ici.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type SuspensionEnCours = { id: string; message: string | null; depuis: string }

/** La suspension en cours de l'artisan, ou `null`. Une erreur de lecture vaut « suspendu » : fail-closed, comme la garde. */
export async function suspensionEnCours(artisanId: string | null | undefined): Promise<SuspensionEnCours | null> {
  if (!artisanId) return null
  const { data, error } = await supabaseAdmin
    .from('suspensions')
    .select('id, message, suspendu_le')
    .eq('artisan_id', artisanId)
    .is('levee_le', null)
    .order('suspendu_le', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { id: 'indisponible', message: null, depuis: new Date().toISOString() }
  return data ? { id: data.id, message: data.message ?? null, depuis: data.suspendu_le } : null
}

/** Le message neutre montré au public : ni « suspendu », ni motif — le client d'un artisan n'a pas à savoir. */
export const MESSAGE_PUBLIC_INDISPONIBLE = 'Ce lien de contact n’est plus actif pour le moment.'
