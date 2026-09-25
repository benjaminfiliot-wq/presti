// /api/site/commander — l'écran 4 : la page de paiement Stripe pour le site à la demande (prompt v15 §3.1).
//
// Stripe Checkout en mode 'payment' (un paiement, pas un abonnement), 300 € nets — franchise en base,
// art. 293 B : l'interrupteur STRIPE_TAXE_AUTO gouverne ici comme dans /api/subscribe, sinon le site
// dirait une chose et la facture une autre. Le prix vient de STRIPE_PRIX_SITE (le produit créé par Benj
// dans Stripe, H1) quand la variable existe ; sinon d'un prix en ligne, ce qui suffit en mode test.
// Rien n'est écrit en base ici hormis l'identifiant de session : c'est le webhook qui encaisse.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { mentionFranchise } from '@/lib/facturation'
import { PRIX_SITE_CENTS, DELAI_TEXTE, erreursAvantPaiement } from '@/lib/siteCommande'
import { brouillonDe, poserSessionStripe } from '@/lib/siteCommandeServeur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!actif('siteCommande')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  if (!stripe) return NextResponse.json({ error: 'Paiement indisponible pour le moment.' }, { status: 503 })
  try {
    const brouillon = await brouillonDe(auth.uid)
    if (!brouillon) return NextResponse.json({ error: 'Aucun dossier en cours : remplissez d’abord les quatre premiers écrans.' }, { status: 400 })
    const erreurs = erreursAvantPaiement(brouillon)
    if (erreurs.length) return NextResponse.json({ error: 'Le dossier est incomplet.', erreurs }, { status: 400 })

    const { data: artisan } = await supabaseAdmin.from('artisans').select('email, stripe_customer_id, is_founder').eq('id', auth.uid).maybeSingle()
    // Un fondateur n'est jamais facturé (lib/credits.ts) : lui vendre un site serait un débit pour rien.
    if (artisan?.is_founder) return NextResponse.json({ error: 'Compte fondateur : le site se commande depuis un compte de test, pas depuis le vôtre.' }, { status: 403 })
    const origin = req.headers.get('origin') || 'https://prestiapp.fr'
    const taxeAuto = process.env.STRIPE_TAXE_AUTO === '1'
    const prixStripe = process.env.STRIPE_PRIX_SITE

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [prixStripe
        ? { price: prixStripe, quantity: 1 }
        : {
          price_data: {
            currency: 'eur',
            product_data: { name: 'Presti — votre site, à la demande', description: `Site professionnel avec référencement local. ${DELAI_TEXTE} Une fois, sans abonnement.` },
            unit_amount: PRIX_SITE_CENTS,
            ...(taxeAuto ? { tax_behavior: 'exclusive' as const } : {}),
          },
          quantity: 1,
        }],
      // La facture Stripe est la facture de Presti à l'artisan (art. 242 nonies A, ann. II CGI) : identité
      // complète du client professionnel, et une vraie facture même pour un paiement unique.
      billing_address_collection: 'required' as const,
      tax_id_collection: { enabled: true },
      invoice_creation: { enabled: true, invoice_data: { description: 'Site à la demande — Presti', ...(taxeAuto ? {} : { footer: mentionFranchise('auto') }) } },
      ...(artisan?.stripe_customer_id ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
      ...(taxeAuto ? { automatic_tax: { enabled: true } } : {}),
      ...(artisan?.stripe_customer_id ? { customer: artisan.stripe_customer_id } : artisan?.email ? { customer_email: artisan.email } : {}),
      client_reference_id: auth.uid,
      metadata: { uid: auth.uid, type: 'commande_site', commande_id: brouillon.id },
      payment_intent_data: { metadata: { uid: auth.uid, type: 'commande_site', commande_id: brouillon.id } },
      success_url: `${origin}/site/commander?paiement=ok&commande=${brouillon.id}`,
      cancel_url: `${origin}/site/commander?paiement=annule`,
    })
    await poserSessionStripe(brouillon.id, auth.uid, session.id)
    return NextResponse.json({ url: session.url, commande: brouillon.id })
  } catch (e) {
    console.error('[site commande] paiement', e)
    return NextResponse.json({ error: 'Impossible d’ouvrir la page de paiement pour le moment.' }, { status: 503 })
  }
}
