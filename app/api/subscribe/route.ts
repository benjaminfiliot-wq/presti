import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { OFFRES, ESSAI_JOURS } from '@/lib/plans'
import { champsCheckoutEssai } from '@/lib/essaiGratuit'
import { evaluerEssai } from '@/lib/essaiGratuitServeur'
import { getUserRevocable } from '@/lib/authArtisan'

// GET : cet artisan a-t-il droit à l'essai gratuit sans carte ? (7 / 14 / 21 jours, lib/plans.ts ESSAI_JOURS.) Sert aux écrans
// d'offres pour n'écrire « jours gratuits, sans carte » QUE là où c'est vrai. Ne crée rien chez Stripe : il lit.
export async function GET(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData } = await getUserRevocable(token)
    if (!userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    const uid = userData.user.id
    const { data: artisan } = await supabaseAdmin.from('artisans').select('email, stripe_customer_id, stripe_subscription_id, is_founder').eq('id', uid).maybeSingle()
    if (artisan?.is_founder) return NextResponse.json({ essai: { disponible: false, jours: ESSAI_JOURS } })
    const d = await evaluerEssai({ uid, email: artisan?.email ?? userData.user.email, stripeCustomerId: artisan?.stripe_customer_id, stripeSubscriptionId: artisan?.stripe_subscription_id })
    return NextResponse.json({ essai: { disponible: d.essai, jours: ESSAI_JOURS } })
  } catch (e) {
    console.error('[subscribe] GET', e)
    return NextResponse.json({ essai: { disponible: false, jours: ESSAI_JOURS } })
  }
}

// Crée une session Stripe Checkout d'abonnement mensuel pour le plan demandé — avec l'ESSAI GRATUIT SANS CARTE (décision de
// Benj, 13/10/2026) quand le compte y a droit : une semaine d'Essentiel, deux de Studio, trois de Signature. Un seul essai par
// compte (lib/essaiGratuitServeur.ts evaluerEssai) ; sinon, le Checkout d'avant, carte demandée tout de suite.
export async function POST(req: Request) {
  try {
    if (!stripe) return NextResponse.json({ error: 'Paiement non configuré' }, { status: 503 })
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData } = await getUserRevocable(token)
    if (!userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    const uid = userData.user.id

    const b = await req.json().catch(() => ({}))
    const offre = OFFRES.find((o) => o.id === b?.plan)
    if (!offre) return NextResponse.json({ error: 'Offre inconnue' }, { status: 400 })

    const { data: artisan } = await supabaseAdmin.from('artisans').select('email, stripe_customer_id, stripe_subscription_id, is_founder').eq('id', uid).maybeSingle()
    // Un fondateur n'est jamais facturé (lib/credits.ts) : lui vendre une offre serait un débit pour rien.
    if (artisan?.is_founder) return NextResponse.json({ error: 'Compte fondateur : toutes les fonctions sont déjà ouvertes, sans abonnement.' }, { status: 403 })
    // Déjà abonné : un second paiement créerait un DEUXIÈME abonnement (29 + 59 €/mois), le webhook
    // écraserait l'ancien identifiant et personne ne le verrait (audit final, auditeur H). Un
    // changement d'offre ou une résiliation passent par le portail Stripe.
    if (artisan?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Vous êtes déjà abonné : changez d’offre ou résiliez depuis votre portail de facturation.', portail: true }, { status: 409 })
    }
    const origin = req.headers.get('origin') || 'https://prestiapp.fr'
    const decision = await evaluerEssai({ uid, email: artisan?.email ?? userData.user.email, stripeCustomerId: artisan?.stripe_customer_id, stripeSubscriptionId: artisan?.stripe_subscription_id })
    const essai = champsCheckoutEssai(offre.id, decision.essai)

    // La TVA n'est calculée que si Stripe Tax est configuré côté compte (adresse d'origine et
    // immatriculations renseignées). Tant que ce n'est pas fait, demander le calcul automatique
    // ferait ÉCHOUER la création de la session : d'où l'interrupteur, à lever une fois le
    // tableau de bord Stripe prêt.
    const taxeAuto = process.env.STRIPE_TAXE_AUTO === '1'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Presti — ${offre.label}`, description: `${offre.credits} crédits / mois` },
          unit_amount: Math.round(offre.prix * 100),
          recurring: { interval: 'month' },
          // Le comportement n'a de sens que si la TVA est collectée. L'entreprise est aujourd'hui
          // en franchise en base (art. 293 B du CGI) : l'interrupteur est baissé, ce bloc dort, et
          // le montant annoncé est celui qui est payé. Le jour où l'immatriculation existe, lever
          // l'interrupteur suffit — mais il faudra AUSSI reprendre les prix affichés et les
          // mentions légales, sans quoi le site dirait une chose et la facture une autre.
          ...(taxeAuto ? { tax_behavior: 'exclusive' as const } : {}),
        },
        quantity: 1,
      }],
      // La facture Stripe EST la facture de Presti à l'artisan (art. 242 nonies A, ann. II CGI) :
      // elle doit porter l'identité complète du client professionnel — nom, adresse, et son
      // numéro de TVA s'il en a un. Collectés à chaque paiement, TVA calculée ou non.
      billing_address_collection: 'required' as const,
      tax_id_collection: { enabled: true },
      // Obligatoire dès qu'on réutilise un client existant avec ces collectes, sinon Stripe refuse.
      ...(artisan?.stripe_customer_id ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
      ...(taxeAuto ? { automatic_tax: { enabled: true } } : {}),
      ...(artisan?.stripe_customer_id ? { customer: artisan.stripe_customer_id } : artisan?.email ? { customer_email: artisan.email } : {}),
      client_reference_id: uid,
      // Essai sans carte : aucune carte demandée ; sans carte à la fin, Stripe annule (customer.subscription.deleted → retour à l'Essai).
      ...(essai.payment_method_collection ? { payment_method_collection: essai.payment_method_collection } : {}),
      metadata: { uid, plan: offre.id, credits: String(offre.credits), ...(essai.jours ? { essai_jours: String(essai.jours) } : {}) },
      subscription_data: { metadata: { uid, plan: offre.id, ...(essai.jours ? { essai_jours: String(essai.jours) } : {}) }, ...(essai.subscription_data ?? {}) },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?abo=ok`,
      cancel_url: `${origin}/abonnement?abo=annule`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[subscribe]', e)
    return NextResponse.json({ error: 'Abonnement momentanément indisponible' }, { status: 500 })
  }
}
