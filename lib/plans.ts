// Source de vérité des offres Presti (crédits/mois, modèles autorisés, prix).
import type { Tier } from './models'

export type PlanId = 'gratuit' | 'essentiel' | 'studio' | 'signature' | 'business'

// siteMax = niveau de site vitrine maximum inclus dans la formule (1 Essentiel, 2 Pro, 3 Signature).
export const PLANS: Record<string, { label: string; creditsMois: number; prixMois: number; tiers: Tier[]; siteMax: 1 | 2 | 3 }> = {
  gratuit: { label: 'Essai', creditsMois: 3, prixMois: 0, tiers: ['standard'], siteMax: 1 },
  essentiel: { label: 'Essentiel', creditsMois: 80, prixMois: 29, tiers: ['standard', 'pro'], siteMax: 1 },
  studio: { label: 'Studio', creditsMois: 250, prixMois: 59, tiers: ['standard', 'pro', 'expert'], siteMax: 2 },
  signature: { label: 'Signature', creditsMois: 600, prixMois: 99, tiers: ['standard', 'pro', 'expert'], siteMax: 3 },
  // Fondateurs : plan interne, illimité (jamais décompté).
  business: { label: 'Business', creditsMois: 100000, prixMois: 0, tiers: ['standard', 'pro', 'expert'], siteMax: 3 },
}

// Coût en crédits par niveau de modèle.
export const CREDIT_COST: Record<Tier, number> = { standard: 1, pro: 1, expert: 3 }

export const planConf = (plan: string | null | undefined) => PLANS[plan || 'gratuit'] || PLANS.gratuit
// Niveau de site max autorisé par la formule (défaut : Essentiel).
export const siteMaxForPlan = (plan: string | null | undefined): 1 | 2 | 3 => planConf(plan).siteMax ?? 1

// Offres payantes proposées dans le tunnel d'abonnement.
export const OFFRES: { id: PlanId; label: string; prix: number; credits: number }[] = [
  { id: 'essentiel', label: 'Essentiel', prix: 29, credits: 80 },
  { id: 'studio', label: 'Studio', prix: 59, credits: 250 },
  { id: 'signature', label: 'Signature', prix: 99, credits: 600 },
]
