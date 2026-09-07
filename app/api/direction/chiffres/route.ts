import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { sourcer, type Sourcee } from '@/lib/direction/fraicheur'
import { mrr, encaisseDuMois, conversionsDuJour } from '@/lib/direction/stripe'
import { coutIADuMois, estimationDepuisLesCredits } from '@/lib/alertes'
import { planConf } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/direction/chiffres — les chiffres du jour (prompt v10 §2.1), chacun `{ valeur, source, a }`.
// Jamais un nombre nu : sans source, la valeur est nulle et la raison est dite (`erreur` ou `manque`).
const HORS_CHAMP = '%@presti-test.invalid'
const PAYANTS = ['essentiel', 'studio', 'signature']

const payants = () => sourcer('chiffres:payants', 'supabase', async () => {
  const { count, error } = await supabaseAdmin.from('artisans').select('id', { count: 'exact', head: true })
    .eq('is_founder', false).not('email', 'like', HORS_CHAMP).in('plan', PAYANTS).not('stripe_subscription_id', 'is', null)
  if (error) throw new Error(error.message)
  return count ?? 0
})

const essais = () => sourcer('chiffres:essais', 'supabase', async () => {
  const { count, error } = await supabaseAdmin.from('artisans').select('id', { count: 'exact', head: true })
    .eq('is_founder', false).not('email', 'like', HORS_CHAMP).eq('plan', 'gratuit').is('suppression_demandee_le', null)
  if (error) throw new Error(error.message)
  return count ?? 0
})

const creditsConsommes = () => sourcer('chiffres:credits', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('artisans').select('plan, credits, is_founder').not('email', 'like', HORS_CHAMP)
  if (error) throw new Error(error.message)
  let consommes = 0, inclus = 0
  for (const a of data ?? []) {
    if (a.is_founder) continue
    const mois = planConf(a.plan).creditsMois
    inclus += mois
    const c = mois - (Number(a.credits) || 0)
    if (c > 0) consommes += c
  }
  return { consommes, inclus }
})

type CoutIA = { euros: number; budget: number | null; estimation: boolean; credits?: number; perimetre: 'organisation' | 'produit' }
const budgetPose = () => { const b = Number(process.env.BUDGET_IA_MENSUEL_EUR); return Number.isFinite(b) && b > 0 ? b : null }

/**
 * Le coût imputable au PRODUIT. Deux sources, dans cet ordre :
 *  1. l'espace de travail Anthropic dédié à Presti (ANTHROPIC_WORKSPACE_PRESTI) — un vrai montant facturé ;
 *  2. à défaut, l'estimation depuis les crédits consommés par les artisans, étiquetée comme telle.
 * L'espace existe depuis le 07/09 ; il ne dépense rien tant que la clé du produit n'y a pas été recréée
 * (Anthropic n'autorise pas à déplacer une clé). L'écran le dit plutôt que d'afficher un « 0 € » trompeur.
 */
const coutProduit = async (): Promise<Sourcee<CoutIA>> => {
  const espace = (process.env.ANTHROPIC_WORKSPACE_PRESTI || '').trim()
  if (espace) {
    const reel = await sourcer<CoutIA | null>('chiffres:produit-reel', 'anthropic', async () => {
      const c = await coutIADuMois()
      if (!c || c.erreur) return null
      const usd = c.parEspace?.[espace]
      if (!usd || usd <= 0) return null
      return { euros: Math.round(usd * (Number(process.env.TAUX_USD_EUR) || 0.92) * 100) / 100, budget: budgetPose(), estimation: false, perimetre: 'produit' as const }
    }, 5 * 60_000)
    if (reel.valeur) return reel as Sourcee<CoutIA>
  }
  const e = await sourcer<CoutIA>('chiffres:produit', 'estimation', async () => {
    const est = await estimationDepuisLesCredits()
    return { euros: Math.round(est.euros * 100) / 100, budget: null, estimation: true, credits: est.credits, perimetre: 'produit' as const }
  }, 5 * 60_000)
  return { ...e, manque: espace ? 'la clé du produit n’est pas encore dans l’espace de travail Presti' : 'aucun espace de travail dédié au produit' }
}

const coutIA = async (): Promise<Sourcee<CoutIA>> => {
  const reel = await sourcer<CoutIA | null>('chiffres:ia', 'anthropic', async () => {
    const c = await coutIADuMois()
    if (!c) return null
    if (c.erreur) throw new Error(c.erreur)
    return { euros: Math.round(c.usd * (Number(process.env.TAUX_USD_EUR) || 0.92) * 100) / 100, budget: budgetPose(), estimation: false, perimetre: 'organisation' as const }
  }, 5 * 60_000)
  if (reel.valeur || reel.erreur) return reel as Sourcee<CoutIA>
  // Pas de clé Admin (H2) : l'estimation depuis les crédits, ÉTIQUETÉE comme telle — jamais présentée comme la facture.
  const e = await sourcer<CoutIA>('chiffres:ia-estimation', 'estimation', async () => {
    const est = await estimationDepuisLesCredits()
    return { euros: Math.round(est.euros * 100) / 100, budget: budgetPose(), estimation: true, credits: est.credits, perimetre: 'produit' as const }
  }, 5 * 60_000)
  return { ...e, manque: 'H2 : clé Anthropic Admin absente — estimation depuis les crédits' }
}

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const [m, p, es, conv, enc, ia, produit, cr] = await Promise.all([mrr(), payants(), essais(), conversionsDuJour(), encaisseDuMois(), coutIA(), coutProduit(), creditsConsommes()])
  return NextResponse.json({ mrr: m, payants: p, essais: es, conversions: conv, encaisse: enc, coutIA: ia, coutProduit: produit, credits: cr, role: f.role, a: new Date().toISOString() })
}
