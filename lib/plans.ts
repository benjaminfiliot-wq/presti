// Source de vérité des offres Presti (crédits/mois, modèles autorisés, prix).
import type { Tier } from './models'

export type PlanId = 'gratuit' | 'essentiel' | 'studio' | 'signature' | 'business'

export const PLANS: Record<string, { label: string; creditsMois: number; prixMois: number; tiers: Tier[] }> = {
  gratuit: { label: 'Essai', creditsMois: 3, prixMois: 0, tiers: ['standard'] },
  essentiel: { label: 'Essentiel', creditsMois: 80, prixMois: 29, tiers: ['standard', 'pro'] },
  studio: { label: 'Studio', creditsMois: 250, prixMois: 59, tiers: ['standard', 'pro', 'expert'] },
  signature: { label: 'Signature', creditsMois: 600, prixMois: 99, tiers: ['standard', 'pro', 'expert'] },
  // Fondateurs : plan interne, illimité (jamais décompté).
  business: { label: 'Business', creditsMois: 100000, prixMois: 0, tiers: ['standard', 'pro', 'expert'] },
}

// Coût en crédits par niveau de modèle.
export const CREDIT_COST: Record<Tier, number> = { standard: 1, pro: 1, expert: 3 }

export const planConf = (plan: string | null | undefined) => PLANS[plan || 'gratuit'] || PLANS.gratuit

// Offres payantes proposées dans le tunnel d'abonnement.
export const OFFRES: { id: PlanId; label: string; prix: number; credits: number }[] = [
  { id: 'essentiel', label: 'Essentiel', prix: 29, credits: 80 },
  { id: 'studio', label: 'Studio', prix: 59, credits: 250 },
  { id: 'signature', label: 'Signature', prix: 99, credits: 600 },
]
