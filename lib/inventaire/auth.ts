import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserRevocable } from '@/lib/authArtisan'
import { messageVerrou, peut } from '@/lib/plans'
import { consommerLimite } from '@/lib/limites'

// Garde commune des routes de l'inventaire (matériaux, observations, fournisseurs).
//
// Extraite de app/api/inventaire/route.ts (qui garde sa copie, inchangée) : même jeton,
// même révocation réelle (v4 §11), même verrou d'offre `inventaire.stock` — SERVEUR.
// Masquer l'entrée de menu ne protège rien, l'URL de l'API reste appelable.

export type AuthInventaire = { uid: string; plan: string; isFounder: boolean } | { error: string; status: 401 | 403 | 429 }

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
  // Débit (audit du 20/10) : l'atelier du CRM écrit aussi ici ; même plafond que les routes du CRM (lib/crm/serveur.ts).
  if (!(await consommerLimite(`inv:${data.user.id}`, 120, 60))) return { error: 'Trop de requêtes, réessayez dans une minute.', status: 429 }
  // Le plan et le statut fondateur remontent avec l'identité : F3 (recherche) en a besoin
  // pour le verrou `inventaire.recherche_ia`, le niveau de modèle et le décompte de crédits.
  return { uid: data.user.id, plan, isFounder: !!art?.is_founder }
}

export const estRefus = (a: AuthInventaire): a is { error: string; status: 401 | 403 | 429 } => 'error' in a
