import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PLANS, planConf, type PlanId } from '@/lib/plans'
import { actif } from '@/lib/flags'
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
  /** Vrai quand l'écriture a ÉCHOUÉ — à distinguer de « rien à appliquer », qui est un succès.
   *  L'appelant doit alors refuser bruyamment : dans le webhook, un 500 fait rejouer Stripe. */
  echec?: boolean
  plan: PlanId | null
  avant: { plan: string | null; credits: number | null } | null
  credits: number | null
  raison: string
}

/**
 * Écrit en base le plan que cet abonnement paie, et ajuste les crédits.
 *
 * Règle des crédits, choisie pour ne spolier personne sans pour autant se faire avoir :
 *   • montée d'offre → on sert la DIFFÉRENCE avec le plus haut forfait déjà servi dans cette période
 *     de facturation. Il paie plus aujourd'hui, il reçoit plus aujourd'hui — mais une seule fois ;
 *   • descente d'offre → on ne retire RIEN. Ce qui reste du mois lui appartient ; le rechargement
 *     mensuel paresseux (`consommer_credit`, 0008) le remettra au bon niveau à la prochaine échéance.
 *
 * Un abonnement qui n'est plus en cours (résilié, impayé, incomplet) ne redescend PAS le plan ici :
 * c'est `customer.subscription.deleted` qui tranche, une fois, avec le contrôle d'ancienneté.
 */
export async function alignerSurAbonnement(sub: Stripe.Subscription, relire?: (id: string) => Promise<Stripe.Subscription>): Promise<Alignement> {
  const rien = (raison: string, echec = false): Alignement => ({ applique: false, echec, plan: null, avant: null, credits: null, raison })

  // Un événement Stripe transporte l'état de l'abonnement AU MOMENT DE SON ÉMISSION. Livré en retard,
  // ou après un `deleted`, il ferait ressusciter une offre résiliée (revue du 07/09). Quand on peut,
  // on relit l'abonnement avant d'écrire : c'est l'état d'aujourd'hui qui décide, pas celui d'hier.
  if (relire) {
    try { sub = await relire(sub.id) } catch { /* Stripe injoignable : on garde la charge utile, et le
      contrôle de statut ci-dessous s'applique quand même */ }
  }

  const item = sub.items?.data?.[0]
  const plan = planDepuisMontant(item?.price?.unit_amount) ?? (sub.metadata?.plan as PlanId | undefined) ?? null
  if (!plan || !PLANS[plan]) return rien(`montant ${item?.price?.unit_amount ?? '—'} : aucune offre ne correspond`)

  // On retrouve l'artisan par l'abonnement d'abord (le lien le plus sûr), puis par le client Stripe.
  const client = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
  const uid = (sub.metadata?.uid as string) || ''
  // La lecture se replie si la mémoire du forfait n'existe pas encore en base.
  //
  // Cette fonction est appelée par le WEBHOOK, qui n'est derrière aucun drapeau : elle doit continuer
  // à faire son travail entre le déploiement du code et le collage de la migration 0068. Sans ce
  // repli, demander `credits_forfait_servi` à une base qui ne l'a pas faisait échouer toute la
  // requête — et le webhook répondait « aucun artisan ne porte cet abonnement » sur un paiement réel.
  // Trouvé par la suite en mode test, ce qui est exactement son travail.
  const AVEC = 'id, plan, credits, credits_forfait_servi, credits_periode'
  const SANS = 'id, plan, credits'
  type Fiche = { id: string; plan: string | null; credits: number | null; credits_forfait_servi?: number | null; credits_periode?: string | null }
  let memoire = true
  const lire = async (colonne: string, valeur: string): Promise<Fiche | null> => {
    const r = await supabaseAdmin.from('artisans').select(memoire ? AVEC : SANS).eq(colonne, valeur).maybeSingle()
    if (r.error && memoire && /credits_forfait_servi|credits_periode/.test(r.error.message)) {
      memoire = false
      return (await supabaseAdmin.from('artisans').select(SANS).eq(colonne, valeur).maybeSingle()).data as Fiche | null
    }
    return r.data as Fiche | null
  }
  const a = (uid ? await lire('id', uid) : await lire('stripe_subscription_id', sub.id))
    ?? (client ? await lire('stripe_customer_id', client) : null)
  if (!a) return rien('aucun artisan ne porte cet abonnement')

  // Un abonnement qui ne court plus ne donne pas d'offre — et n'en retire pas non plus ici.
  if (!['active', 'trialing', 'past_due'].includes(sub.status)) return rien(`abonnement ${sub.status} : rien à appliquer`)

  const avant = { plan: a.plan as string | null, credits: a.credits as number | null }
  const conf = planConf(plan)

  // Le forfait ne se sert qu'UNE FOIS par période de facturation.
  //
  // Sans cette mémoire, un aller-retour d'offre donnait des crédits sans fin : monter en Signature
  // créditait 600, redescendre en Essentiel n'en retirait aucun (à raison), remonter en recréditait 600.
  // Stripe facturait un prorata net proche de zéro, et l'artisan repartait avec le double. On ne sert
  // donc que la DIFFÉRENCE avec le plus haut forfait déjà servi dans cette même période.
  const debut = (sub.items?.data?.[0] as { current_period_start?: number } | undefined)?.current_period_start
    ?? (sub as unknown as { current_period_start?: number }).current_period_start
  const periode = debut ? new Date(debut * 1000).toISOString().slice(0, 10) : null
  const memePeriode = !!periode && a.credits_periode === periode
  // Mémoire absente ou d'une autre période : l'offre en cours a forcément servi son forfait pour la
  // période en cours (c'est le checkout qui le fait). Partir de zéro offrirait le forfait entier
  // par-dessus ce qui reste — 612 crédits pour quelqu'un qui devrait en avoir 532.
  const dejaServi = memePeriode ? (a.credits_forfait_servi ?? planConf(a.plan).creditsMois) : planConf(a.plan).creditsMois
  // Une montée ajoute la DIFFÉRENCE, une descente n'ajoute rien — et ne retire rien.
  const aServir = Math.max(0, conf.creditsMois - dejaServi)
  const credits = (a.credits ?? 0) + aServir
  const forfaitServi = Math.max(dejaServi, conf.creditsMois)

  if (avant.plan === plan && aServir === 0) {
    return { applique: false, plan, avant, credits: avant.credits, raison: 'déjà à jour' }
  }

  const { error } = await supabaseAdmin.from('artisans').update({
    plan,
    credits,
    ...(memoire && periode ? { credits_periode: periode, credits_forfait_servi: forfaitServi } : {}),
    stripe_subscription_id: sub.id,
    ...(client ? { stripe_customer_id: client } : {}),
  }).eq('id', a.id)
  if (error) { console.error('[abonnement] alignement impossible :', error.message); return rien(`écriture refusée : ${error.message}`, true) }

  const raison = aServir > 0
    ? `offre passée à ${conf.label} — ${aServir} crédit${aServir > 1 ? 's' : ''} ajouté${aServir > 1 ? 's' : ''}${dejaServi ? ` (${dejaServi} déjà servis cette période)` : ''}`
    : `offre passée à ${conf.label} — aucun crédit ajouté : le forfait de cette période est déjà servi`
  // Pilote automatique (audit du 21/10, F1) : une offre sans la capacité annule la file du compte (chargé à la demande, drapeau levé).
  if (actif('piloteAutomatique')) await (await import('@/lib/pilote/serveur')).apresChangementOffre(a.id, plan)
  return { applique: true, plan, avant, credits, raison }
}
