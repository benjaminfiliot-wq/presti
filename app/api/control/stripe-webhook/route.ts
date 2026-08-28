export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

// Fondateur uniquement : (re)crée l'endpoint webhook Stripe et renvoie son secret de signature.
// Sert à provisionner STRIPE_WEBHOOK_SECRET (le secret n'est visible qu'à la création).
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: userData } = await supabaseAdmin.auth.getUser(token)
  if (!userData?.user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
  const { data: me } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', userData.user.id).maybeSingle()
  if (!me?.is_founder) return NextResponse.json({ error: 'Réservé aux fondateurs' }, { status: 403 })
  if (!stripe) return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 })

  const url = 'https://prestiapp.fr/api/stripe/webhook'
  try {
    const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === url)
    if (existing) await stripe.webhookEndpoints.del(existing.id)
    const wh = await stripe.webhookEndpoints.create({
      url,
      enabled_events: ['checkout.session.completed', 'customer.subscription.deleted', 'customer.subscription.updated'],
    })
    return NextResponse.json({ id: wh.id, secret: wh.secret })
  } catch (e) {
    console.error('[stripe-webhook setup]', e)
    return NextResponse.json({ error: 'Création du webhook échouée' }, { status: 500 })
  }
}
