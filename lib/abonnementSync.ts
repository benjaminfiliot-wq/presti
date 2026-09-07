import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PLANS, planConf, type PlanId } from '@/lib/plans'
import type Stripe from 'stripe'

// Aligner la base sur ce que Stripe facture RÉELLEMENT (revue du 07/09).
//
// Le défaut trouvé : le portail de facturation laisse l'artisan changer d'offre lui-même — c'est écrit
// noir sur blanc dans app/api/stripe/portail/route.ts — mais aucun événement `customer.subscription.updated`
// n'était écouté. Un artisan qui passait de Studio à Essentiel depuis le portail payait 29 € et gardait
// les 250 crédits et les capacités de Studio ; celui qui montait payait 99 € sans rien recevoir de plus.
// Personne ne le voyait, ni lui ni nous.
//
// Une seule fonction fait donc l'alignement, appelée par le webhook ET par les actions de direction :
// le montant facturé décide du plan, jamais une métadonnée qu'un changement d'offre laisse périmée.

/** Le plan que ce montant mensuel (en centimes) désigne dans la matrice. Aucun prix en dur. */
export function planDepuisMontant(centimes: number | null | undefined): PlanId | null {
  if (typeof centimes !== 'number') return null
  const euros = centimes / 100
  const trouve = (Object.entries(PLANS) as [PlanId, (typeof PLANS)[PlanId]][])
    .find(([id, p]) => p.prixMois > 0 && p.prixMois === euros && id !== 'business')
  return trouve?.[0] ?? null
}

export type Alignement = {
  applique: boolean
  plan: PlanId | null
  avant: { plan: string | null; credits: number | null } | null
  credits: number | null
  raison: string
}

/**
 * Écrit en base le plan que cet abonnement paie, et ajuste les crédits.
 *
 * Règle des crédits, choisie pour ne jamais spolier :
 *   • montée d'offre → les crédits passent tout de suite au moins au niveau de la nouvelle offre.
 *     Il paie plus aujourd'hui, il reçoit plus aujourd'hui ;
 *   • descente d'offre → on ne retire RIEN. Ce qui reste du mois lui appartient ; le rechargement
 *     mensuel paresseux (`consommer_credit`, 0008) le remettra au bon niveau à la prochaine échéance.
 *
 * Un abonnement qui n'est plus en cours (résilié, impayé, incomplet) ne redescend PAS le plan ici :
 * c'est `customer.subscription.deleted` qui tranche, une fois, avec le contrôle d'ancienneté.
 */
export async function alignerSurAbonnement(sub: Stripe.Subscription): Promise<Alignement> {
  const rien = (raison: string): Alignement => ({ applique: false, plan: null, avant: null, credits: null, raison })

  const item = sub.items?.data?.[0]
  const plan = planDepuisMontant(item?.price?.unit_amount) ?? (sub.metadata?.plan as PlanId | undefined) ?? null
  if (!plan || !PLANS[plan]) return rien(`montant ${item?.price?.unit_amount ?? '—'} : aucune offre ne correspond`)

  // On retrouve l'artisan par l'abonnement d'abord (le lien le plus sûr), puis par le client Stripe.
  const client = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
  const uid = (sub.metadata?.uid as string) || ''
  const par = uid
    ? await supabaseAdmin.from('artisans').select('id, plan, credits').eq('id', uid).maybeSingle()
    : await supabaseAdmin.from('artisans').select('id, plan, credits').eq('stripe_subscription_id', sub.id).maybeSingle()
  const a = par.data
    ?? (client ? (await supabaseAdmin.from('artisans').select('id, plan, credits').eq('stripe_customer_id', client).maybeSingle()).data : null)
  if (!a) return rien('aucun artisan ne porte cet abonnement')

  // Un abonnement qui ne court plus ne donne pas d'offre — et n'en retire pas non plus ici.
  if (!['active', 'trialing', 'past_due'].includes(sub.status)) return rien(`abonnement ${sub.status} : rien à appliquer`)

  const avant = { plan: a.plan as string | null, credits: a.credits as number | null }
  const conf = planConf(plan)
  const monte = conf.creditsMois > (planConf(a.plan).creditsMois ?? 0)
  const credits = monte ? Math.max(a.credits ?? 0, conf.creditsMois) : (a.credits ?? 0)

  if (avant.plan === plan && credits === avant.credits) {
    return { applique: false, plan, avant, credits, raison: 'déjà à jour' }
  }

  const { error } = await supabaseAdmin.from('artisans').update({
    plan,
    credits,
    stripe_subscription_id: sub.id,
    ...(client ? { stripe_customer_id: client } : {}),
  }).eq('id', a.id)
  if (error) { console.error('[abonnement] alignement impossible :', error.message); return rien(`écriture refusée : ${error.message}`) }

  return { applique: true, plan, avant, credits, raison: monte ? 'montée d’offre appliquée' : 'descente d’offre appliquée (crédits du mois conservés)' }
}
