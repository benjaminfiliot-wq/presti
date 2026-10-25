import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { sourcer, type Sourcee } from '@/lib/direction/fraicheur'
import { mrr, encaisseDuMois, conversionsDuJour } from '@/lib/direction/stripe'
import { coutIADuMois, estimationDepuisLesCredits } from '@/lib/alertes'
import { planConf } from '@/lib/plans'
import { seulsLesVrais } from '@/lib/direction/perimetre'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/chiffres — les chiffres du jour (prompt v10 §2.1), chacun `{ valeur, source, a }`.
// Jamais un nombre nu : sans source, la valeur est nulle et la raison est dite (`erreur` ou `manque`).
// 'essentiel' reste compté : plus vendu depuis le 25/10, mais un abonné hérité qui y serait resté paie encore.
const PAYANTS = ['essentiel', 'studio', 'signature']

const payants = () => sourcer('chiffres:payants', 'supabase', async () => {
  const { count, error } = await seulsLesVrais(supabaseAdmin.from('artisans').select('id', { count: 'exact', head: true }))
    .in('plan', PAYANTS).not('stripe_subscription_id', 'is', null)
  if (error) throw new Error(error.message)
  return count ?? 0
})

const essais = () => sourcer('chiffres:essais', 'supabase', async () => {
  const { count, error } = await seulsLesVrais(supabaseAdmin.from('artisans').select('id', { count: 'exact', head: true }))
    .eq('plan', 'gratuit').is('suppression_demandee_le', null)
  if (error) throw new Error(error.message)
  return count ?? 0
})

const creditsConsommes = () => sourcer('chiffres:credits', 'supabase', async () => {
  const { data, error } = await seulsLesVrais(supabaseAdmin.from('artisans').select('plan, credits, is_founder'))
  if (error) throw new Error(error.message)
  // La consommation se déduit du solde : forfait moins ce qu'il reste. La méthode a une limite connue
  // — un artisan à qui la direction a offert des crédits peut avoir PLUS que son forfait, et sa
  // consommation devient alors invisible ici. On compte ces comptes à part et on le dit, plutôt que
  // d'afficher un chiffre qui se croit exact (revue du 07/09).
  let consommes = 0, inclus = 0, offerts = 0
  for (const a of data ?? []) {
    const mois = planConf(a.plan).creditsMois
    inclus += mois
    const c = mois - (Number(a.credits) || 0)
    if (c > 0) consommes += c
    else if (c < 0) offerts++
  }
  return { consommes, inclus, ...(offerts ? { comptesHorsMesure: offerts } : {}) }
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
  const perimetre = exigerDomaine(f, 'clients', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const [m, p, es, conv, enc, ia, produit, cr] = await Promise.all([mrr(), payants(), essais(), conversionsDuJour(), encaisseDuMois(), coutIA(), coutProduit(), creditsConsommes()])
  return NextResponse.json({ mrr: m, payants: p, essais: es, conversions: conv, encaisse: enc, coutIA: ia, coutProduit: produit, credits: cr, role: f.role, a: new Date().toISOString() })
}
