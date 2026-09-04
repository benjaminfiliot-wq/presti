import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { OFFRES } from '@/lib/plans'
import { getUserRevocable } from '@/lib/authArtisan'

// Crée une session Stripe Checkout d'abonnement mensuel pour le plan demandé.
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

    const { data: artisan } = await supabaseAdmin.from('artisans').select('email, stripe_customer_id').eq('id', uid).maybeSingle()
    const origin = req.headers.get('origin') || 'https://prestiapp.fr'

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
          // Le prix affiché est HORS TAXES : nos clients sont des entreprises, elles récupèrent la
          // TVA. « inclusive » ferait payer la TVA sur notre marge au lieu de l'ajouter.
          ...(taxeAuto ? { tax_behavior: 'exclusive' as const } : {}),
        },
        quantity: 1,
      }],
      ...(taxeAuto
        ? {
            automatic_tax: { enabled: true },
            // Stripe a besoin du pays pour connaître le taux ; sans adresse, pas de calcul.
            billing_address_collection: 'required' as const,
            // Le numéro de TVA de l'artisan : il apparaît sur la facture, et pour un client
            // européen hors de France il déclenche l'autoliquidation.
            tax_id_collection: { enabled: true },
            // Obligatoire dès qu'on réutilise un client existant avec le calcul automatique,
            // sinon Stripe refuse la session.
            ...(artisan?.stripe_customer_id ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
          }
        : {}),
      ...(artisan?.stripe_customer_id ? { customer: artisan.stripe_customer_id } : artisan?.email ? { customer_email: artisan.email } : {}),
      client_reference_id: uid,
      metadata: { uid, plan: offre.id, credits: String(offre.credits) },
      subscription_data: { metadata: { uid, plan: offre.id } },
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
