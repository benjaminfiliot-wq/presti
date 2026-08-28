// Niveaux de modèles IA proposés à l'artisan, mappés vers les vrais modèles.
// Le mapping vit UNIQUEMENT côté serveur — jamais exposé au client.
export type Tier = 'standard' | 'pro' | 'expert'

const MODEL_BY_TIER: Record<Tier, string> = {
  standard: 'claude-haiku-4-5',
  pro: 'claude-sonnet-5',
  expert: 'claude-opus-5',
}

// Plans qui débloquent chaque niveau. (business = fondateurs ; pro = ancien plan legacy)
const TIER_PLANS: Record<Tier, string[]> = {
  standard: ['gratuit', 'essentiel', 'studio', 'signature', 'pro', 'business'],
  pro: ['essentiel', 'studio', 'signature', 'pro', 'business'],
  expert: ['studio', 'signature', 'business'],
}

// Métadonnées d'affichage (côté client — sans les IDs de modèles).
export const TIERS: { value: Tier; label: string; desc: string; plan: string }[] = [
  { value: 'standard', label: 'Standard', desc: 'Rapide, pour les demandes simples', plan: 'gratuit' },
  { value: 'pro', label: 'Pro', desc: 'Chiffrage fin, postes détaillés', plan: 'essentiel' },
  { value: 'expert', label: 'Expert', desc: 'Le plus précis, gros chantiers', plan: 'studio' },
]

const PLAN_RANK: Record<string, number> = { gratuit: 0, essentiel: 1, pro: 1, studio: 2, signature: 3, business: 4 }

export function tierAllowed(tier: Tier, plan: string | null | undefined): boolean {
  return TIER_PLANS[tier].includes(plan || 'gratuit')
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
  const rank = PLAN_RANK[plan || 'gratuit'] ?? 0
  const best: Tier = rank >= 2 ? 'expert' : rank >= 1 ? 'pro' : 'standard'
  return { tier: best, model: MODEL_BY_TIER[best], downgraded: true }
}
