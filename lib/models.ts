// Niveaux de modèles IA proposés à l'artisan, mappés vers les vrais modèles.
// Le mapping vit UNIQUEMENT côté serveur — jamais exposé au client.
export type Tier = 'standard' | 'pro' | 'expert'
import { planConf } from './plans'

const MODEL_BY_TIER: Record<Tier, string> = {
  standard: 'claude-haiku-5-5',
  pro: 'claude-sonnet-5',
  expert: 'claude-opus-5',
}

// Les niveaux qu'une offre débloque viennent de la matrice (lib/plans.ts) — plus de liste
// parallèle qui dérive. `pro` = ancien identifiant d'offre, traité comme Studio.
const ALIAS_PLAN: Record<string, string> = { pro: 'studio' }
const tiersDuPlan = (plan: string | null | undefined): Tier[] => planConf(ALIAS_PLAN[plan || ''] || plan).tiers

// Métadonnées d'affichage (côté client — sans les IDs de modèles).
export const TIERS: { value: Tier; label: string; desc: string; plan: string }[] = [
  { value: 'standard', label: 'Standard', desc: 'Rapide, pour les demandes simples', plan: 'gratuit' },
  { value: 'pro', label: 'Pro', desc: 'Chiffrage fin, postes détaillés', plan: 'studio' },
  { value: 'expert', label: 'Expert', desc: 'Le plus précis, gros chantiers', plan: 'signature' },
]

export function tierAllowed(tier: Tier, plan: string | null | undefined): boolean {
  return tiersDuPlan(plan).includes(tier)
}

/**
 * Résout le niveau demandé vers un vrai modèle, en respectant le plan de l'artisan.
 * Si le niveau dépasse le plan → repli sur le meilleur niveau autorisé (jamais de premium gratuit).
 */
export function resolveModel(
  requested: string | undefined,
  plan: string | null | undefined,
): { tier: Tier; model: string; downgraded: boolean } {
  const wanted: Tier = (['standard', 'pro', 'expert'] as const).includes(requested as Tier) ? (requested as Tier) : 'standard'
  if (tierAllowed(wanted, plan)) return { tier: wanted, model: MODEL_BY_TIER[wanted], downgraded: false }
  // repli : meilleur niveau autorisé par le plan
  const autorises = tiersDuPlan(plan)
  const best: Tier = autorises.includes('expert') ? 'expert' : autorises.includes('pro') ? 'pro' : 'standard'
  return { tier: best, model: MODEL_BY_TIER[best], downgraded: true }
}
