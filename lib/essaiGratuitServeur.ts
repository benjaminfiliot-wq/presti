// lib/essaiGratuitServeur.ts — la part de l'essai gratuit qui touche la base et Stripe (règles pures : lib/essaiGratuit.ts).
// Serveur seulement : service_role et clé Stripe secrète. Jugé par scripts/essais-gratuits-qa.mjs (avec des doublures).
import { createHash } from 'node:crypto'
import type Stripe from 'stripe'
import { supabaseAdmin } from './supabaseAdmin'
import { stripe } from './stripe'
import type { Alerte } from './alertes'
import { PLANS } from './plans'
import { decisionEssai, normaliserEmail, type DecisionEssai, type FaitsEssai } from './essaiGratuit'

/** L'empreinte stockée à la place de l'adresse (migration 0156) : on retient qu'un e-mail a eu son essai, pas lequel. */
export const empreinteEmail = (email: unknown): string => createHash('sha256').update(`presti-essai:${normaliserEmail(email)}`).digest('hex')

/** Le registre n'existe pas encore (migration 0156 pas appliquée) : on continue avec la seule vérification Stripe. */
const registreAbsent = (e: { message?: string; code?: string } | null | undefined) =>
  !!e && /essais_gratuits|PGRST205|42P01|schema cache|does not exist/i.test(`${e.code ?? ''} ${e.message ?? ''}`)

async function abonnementDejaEu(client: Stripe, clients: string[]): Promise<boolean> {
  for (const customer of clients) {
    const l = await client.subscriptions.list({ customer, status: 'all', limit: 1 })
    if (l.data.length > 0) return true
  }
  return false
}

/**
 * Cet artisan a-t-il droit à l'essai gratuit ? Quatre sources, la plus sûre gagne :
 *   1. artisans.stripe_subscription_id (un abonnement court déjà) ;
 *   2. le registre essais_gratuits (par compte ET par empreinte d'e-mail normalisé : un compte recréé avec la même boîte, ou
 *      avec un « +étiquette » / des points Gmail, y retombe) ;
 *   3. Stripe : le client du compte, et tout client Stripe de même e-mail, qui a déjà eu un abonnement (même résilié) ;
 *   4. Stripe injoignable → pas d'essai (un abus coûte, un Checkout normal ne coûte rien).
 * Les trois lectures ne créent rien.
 */
export async function evaluerEssai(o: { uid: string; email: string | null | undefined; stripeCustomerId?: string | null; stripeSubscriptionId?: string | null }): Promise<DecisionEssai> {
  const faits: FaitsEssai = { abonnementEnCours: !!o.stripeSubscriptionId, essaiDejaPris: false, abonnementDejaEu: false }
  if (faits.abonnementEnCours) return decisionEssai(faits)
  try {
    const h = empreinteEmail(o.email)
    const parCompte = await supabaseAdmin.from('essais_gratuits').select('email_hash').eq('artisan_id', o.uid).limit(1)
    if (parCompte.error && !registreAbsent(parCompte.error)) throw new Error(parCompte.error.message)
    const parEmail = o.email ? await supabaseAdmin.from('essais_gratuits').select('email_hash').eq('email_hash', h).limit(1) : { data: [], error: null }
    if (parEmail.error && !registreAbsent(parEmail.error)) throw new Error(parEmail.error.message)
    faits.essaiDejaPris = (parCompte.data?.length ?? 0) > 0 || (parEmail.data?.length ?? 0) > 0
    if (faits.essaiDejaPris) return decisionEssai(faits)

    if (stripe) {
      const ids = new Set<string>()
      if (o.stripeCustomerId) ids.add(o.stripeCustomerId)
      const adresses = new Set<string>()
      if (o.email) { adresses.add(o.email); adresses.add(String(o.email).trim().toLowerCase()); adresses.add(normaliserEmail(o.email)) }
      for (const email of adresses) {
        const l = await stripe.customers.list({ email, limit: 5 })
        for (const c of l.data) ids.add(c.id)
      }
      faits.abonnementDejaEu = await abonnementDejaEu(stripe, [...ids].slice(0, 12))
    }
  } catch (e) {
    console.error('[essai gratuit] vérification impossible :', e instanceof Error ? e.message : e)
    faits.verificationImpossible = true
  }
  return decisionEssai(faits)
}

/** Inscrit l'essai au registre (une ligne par e-mail normalisé). Registre absent → faux, sans bruit : Stripe reste la mémoire. */
export async function marquerEssai(o: { uid: string; email: string | null | undefined; plan: string; jours: number; customerId?: string | null; subscriptionId?: string | null }): Promise<boolean> {
  if (!o.email) return false
  const debut = new Date()
  const { error } = await supabaseAdmin.from('essais_gratuits').upsert({
    email_hash: empreinteEmail(o.email),
    artisan_id: o.uid,
    plan: o.plan,
    jours: o.jours,
    stripe_customer_id: o.customerId ?? null,
    stripe_subscription_id: o.subscriptionId ?? null,
    debut: debut.toISOString(),
    fin: new Date(debut.getTime() + o.jours * 86_400_000).toISOString(),
  }, { onConflict: 'email_hash' })
  if (error) {
    if (!registreAbsent(error)) console.error('[essai gratuit] registre illisible :', error.message)
    return false
  }
  return true
}

/** « L'essai se termine bientôt » (customer.subscription.trial_will_end, envoyé par Stripe 3 jours avant) : le seul message qui dit quoi faire. */
export function alerteFinEssai(artisan: { id: string; email: string; nom?: string | null }, plan: string, finEssaiISO: string, origine = 'https://prestiapp.fr'): Alerte[] {
  const jour = new Date(finEssaiISO).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })
  const label = PLANS[plan as keyof typeof PLANS]?.label ?? plan
  return [{
    motif: 'paiement',
    a: { email: artisan.email, artisanId: artisan.id },
    cle: `${artisan.id}:essai_fin:${finEssaiISO.slice(0, 10)}`,
    sujet: `Votre essai gratuit ${label} se termine le ${jour}`,
    corps: `Votre essai gratuit ${label} se termine le ${jour}.\n\nPour continuer, ajoutez une carte depuis votre portail de facturation : ${origine}/parametres?onglet=abonnement\nSans carte, rien n'est prélevé : votre compte repasse simplement à l'offre d'Essai (3 crédits), et vos données restent en place.`,
  }]
}
