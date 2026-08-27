export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!stripe) return json({ error: 'Paiement non configuré (STRIPE_SECRET_KEY manquante dans Vercel).' }, 500)
  const { id } = await params
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Non authentifié' }, 401)
  const { data: userData } = await supabaseAdmin.auth.getUser(token)
  if (!userData?.user) return json({ error: 'Session expirée' }, 401)
  const uid = userData.user.id

  const { data: devis } = await supabaseAdmin.from('devis').select('*').eq('id', id).maybeSingle()
  if (!devis) return json({ error: 'Devis introuvable' }, 404)
  const { data: me } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', uid).maybeSingle()
  if (devis.artisan_id !== uid && !me?.is_founder) return json({ error: 'Accès refusé' }, 403)

  const montant = Math.round((Number(devis.total_ttc) || 0) * 100)
  if (montant < 50) return json({ error: 'Montant trop faible pour un paiement (min 0,50 €). Ajoute des lignes au devis.' }, 400)

  const origin = new URL(req.url).origin
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Devis ${devis.numero || ''} — ${devis.objet || 'Prestation'}`.trim() },
          unit_amount: montant,
        },
        quantity: 1,
      }],
      success_url: `${origin}/devis/${id}?paid=1`,
      cancel_url: `${origin}/devis/${id}?canceled=1`,
      metadata: { devis_id: id, numero: devis.numero || '', client: devis.client_nom || '' },
    })
    return json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Stripe'
    return json({ error: `Stripe : ${msg}` }, 502)
  }
}
