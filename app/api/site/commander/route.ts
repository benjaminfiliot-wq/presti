// /api/site/commander — l'écran 4 : la page de paiement Stripe pour le site à la demande (prompt v15 §3.1).
//
// Le Checkout (mode 'payment', 300 € nets, franchise en base, STRIPE_TAXE_AUTO, STRIPE_PRIX_SITE, facture) est bâti par
// parametresCheckoutSite (lib/siteCommandeServeur.ts), le MÊME constructeur que l'achat sans compte
// (/api/site/commander/public, fiche 026-025) : les deux paiements ne peuvent plus diverger.
// Rien n'est écrit en base ici hormis l'identifiant de session : c'est le webhook qui encaisse.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreursAvantPaiement } from '@/lib/siteCommande'
import { brouillonDe, parametresCheckoutSite, poserSessionStripe } from '@/lib/siteCommandeServeur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!actif('siteCommande')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  const corps = await req.json().catch(() => null)
  if (corps?.renonciationRetractation !== true) {
    return NextResponse.json({ error: 'Vous devez accepter le début de la réalisation et reconnaître la perte du droit de rétractation une fois le site entièrement livré.' }, { status: 400 })
  }
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

    const session = await stripe.checkout.sessions.create(parametresCheckoutSite({
      commandeId: brouillon.id,
      email: artisan?.email ?? null,
      clientStripe: artisan?.stripe_customer_id ?? null,
      uid: auth.uid,
      origin,
      public: false,
      // L'accord L221-28 vient d'être vérifié plus haut (400 sans lui) : son horodatage part dans les deux métadonnées.
      metadata: { retractation_accord: new Date().toISOString() },
    }))
    await poserSessionStripe(brouillon.id, auth.uid, session.id)
    return NextResponse.json({ url: session.url, commande: brouillon.id })
  } catch (e) {
    console.error('[site commande] paiement', e)
    return NextResponse.json({ error: 'Impossible d’ouvrir la page de paiement pour le moment.' }, { status: 503 })
  }
}
