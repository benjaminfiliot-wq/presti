import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { erreursAvantPaiementPack, parametresCheckoutPack } from '@/lib/packPub'
import { brouillonPackDe, poserSessionStripePack } from '@/lib/packPubServeur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!actif('packPub')) return new NextResponse(null, { status: 404 })
  const auth = await authArtisan(req)
  if (estEchec(auth)) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
  if (!stripe) return NextResponse.json({ error: 'Paiement indisponible pour le moment.' }, { status: 503 })

  try {
    const brouillon = await brouillonPackDe(auth.uid)
    if (!brouillon) return NextResponse.json({ error: 'Aucun dossier de pack en cours.' }, { status: 400 })
    const messageFondateur = 'Compte fondateur : le site se commande depuis un compte de test, pas depuis le vôtre.'
    const { data: artisan, error: erreurArtisan } = await supabaseAdmin.from('artisans').select('is_founder, email, stripe_customer_id').eq('id', auth.uid).maybeSingle()
    if (artisan?.is_founder) return NextResponse.json({ error: messageFondateur }, { status: 403 })
    if (erreurArtisan) throw erreurArtisan
    const erreurs = erreursAvantPaiementPack(brouillon.matiere)
    if (erreurs.length) return NextResponse.json({ error: 'Le dossier est incomplet.', erreurs }, { status: 400 })

    const origin = req.headers.get('origin') || 'https://prestiapp.fr'
    const session = await stripe.checkout.sessions.create(parametresCheckoutPack({
      uid: auth.uid,
      packId: brouillon.id,
      email: artisan?.email ?? null,
      clientStripe: artisan?.stripe_customer_id ?? null,
      prixStripe: process.env.STRIPE_PRIX_PACK_PUB,
      taxeAuto: process.env.STRIPE_TAXE_AUTO === '1',
      origin,
    }))
    await poserSessionStripePack(brouillon.id, auth.uid, session.id)
    return NextResponse.json({ url: session.url, pack: brouillon.id })
  } catch (erreur) {
    console.error('[pack pubs] paiement', erreur)
    return NextResponse.json({ error: 'Impossible d’ouvrir la page de paiement pour le moment.' }, { status: 503 })
  }
}
