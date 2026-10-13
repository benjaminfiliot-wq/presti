import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { authArtisan, estEchec } from '@/lib/authArtisan'

// Portail de facturation Stripe (sprint J-1 §6 — Abonnement & usage).
//
// Historique des paiements, factures, moyen de paiement, changement et RÉSILIATION de
// l'abonnement : tout ça, Stripe le fait mieux qu'une page maison, et surtout il le fait
// juste (prorata, date de fin de période, reçus). On ne recode donc pas d'annulation :
// on ouvre le portail. `GET` donne la date de fin de période et l'état de résiliation,
// pour les afficher en clair avant d'y aller.

export const runtime = 'nodejs'

async function artisanStripe(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return { error: s.error, status: s.status }
  const { data: a } = await supabaseAdmin.from('artisans').select('stripe_customer_id, stripe_subscription_id, plan').eq('id', s.uid).maybeSingle()
  return { uid: s.uid, a }
}

export async function GET(req: Request) {
  const r = await artisanStripe(req)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  if (!stripe || !r.a?.stripe_subscription_id) return NextResponse.json({ abonnement: null })
  try {
    const sub = await stripe.subscriptions.retrieve(r.a.stripe_subscription_id)
    const item = sub.items.data[0]
    const fin = (item as { current_period_end?: number } | undefined)?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? null
    return NextResponse.json({
      abonnement: {
        statut: sub.status,
        // Essai gratuit en cours : sa date de fin (null une fois payant). Sert à l'écran du compte : « Essai gratuit jusqu'au JJ/MM ».
        essai_fin: sub.status === 'trialing' && sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        fin_periode: fin ? new Date(fin * 1000).toISOString() : null,
        resiliation_prevue: !!sub.cancel_at_period_end,
        fin_prevue: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
      },
    })
  } catch (e) {
    console.error('[stripe/portail] GET:', e)
    return NextResponse.json({ abonnement: null })
  }
}

export async function POST(req: Request) {
  const r = await artisanStripe(req)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  if (!stripe) return NextResponse.json({ error: 'Paiement non configuré' }, { status: 503 })
  if (!r.a?.stripe_customer_id) return NextResponse.json({ error: 'Aucun abonnement payant sur ce compte.' }, { status: 404 })
  try {
    const origin = req.headers.get('origin') || 'https://prestiapp.fr'
    const session = await stripe.billingPortal.sessions.create({
      customer: r.a.stripe_customer_id,
      return_url: `${origin}/parametres?onglet=abonnement`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[stripe/portail] POST:', e)
    return NextResponse.json({ error: 'Portail momentanément indisponible.' }, { status: 500 })
  }
}
