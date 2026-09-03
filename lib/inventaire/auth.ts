import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserRevocable } from '@/lib/authArtisan'
import { messageVerrou, peut } from '@/lib/plans'

// Garde commune des routes de l'inventaire (matériaux, observations, fournisseurs).
//
// Extraite de app/api/inventaire/route.ts (qui garde sa copie, inchangée) : même jeton,
// même révocation réelle (v4 §11), même verrou d'offre `inventaire.stock` — SERVEUR.
// Masquer l'entrée de menu ne protège rien, l'URL de l'API reste appelable.

export type AuthInventaire = { uid: string } | { error: string; status: 401 | 403 }

export async function authInventaire(req: Request): Promise<AuthInventaire> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Non authentifié', status: 401 }
  const { data, error } = await getUserRevocable(token)
  if (error || !data?.user) return { error: 'Session expirée, reconnecte-toi.', status: 401 }
  const { data: art } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', data.user.id).maybeSingle()
  const plan = (art?.plan as string) || 'gratuit'
  if (!art?.is_founder && !peut(plan, 'inventaire.stock')) {
    return { error: `L’inventaire n’est pas dans votre offre. ${messageVerrou('inventaire.stock')}`, status: 403 }
  }
  return { uid: data.user.id }
}

export const estRefus = (a: AuthInventaire): a is { error: string; status: 401 | 403 } => 'error' in a
