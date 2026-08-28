export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { planConf } from '@/lib/plans'
import type Stripe from 'stripe'

// Webhook Stripe : active/désactive l'abonnement de l'artisan (plan + crédits).
export async function POST(req: Request) {
  if (!stripe) return new Response('stripe non configuré', { status: 503 })
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get('stripe-signature')
  const raw = await req.text()

  // Fail-closed : sans secret ni signature valides, on refuse (évite tout appel forgé).
  if (!secret || !sig) return new Response('webhook non configuré', { status: 503 })
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (e) {
    console.error('[stripe webhook] signature invalide:', e instanceof Error ? e.message : e)
    return new Response('signature invalide', { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session
      const uid = (s.metadata?.uid as string) || (s.client_reference_id as string) || ''
      const plan = (s.metadata?.plan as string) || ''
      if (uid && plan) {
        const conf = planConf(plan)
        const next = new Date(); next.setMonth(next.getMonth() + 1)
        await supabaseAdmin.from('artisans').update({
          plan,
          credits: conf.creditsMois,
          credits_reset_le: next.toISOString().slice(0, 10),
          stripe_customer_id: typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null,
          stripe_subscription_id: typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null,
        }).eq('id', uid)
        console.log('[stripe webhook] abonnement activé', uid, plan)
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const uid = (sub.metadata?.uid as string) || ''
      if (uid) await supabaseAdmin.from('artisans').update({ plan: 'gratuit', stripe_subscription_id: null }).eq('id', uid)
    }
  } catch (e) {
    console.error('[stripe webhook] traitement:', e)
    // On renvoie 200 quand même pour éviter les retries en boucle sur une erreur applicative.
  }

  return NextResponse.json({ received: true })
}
