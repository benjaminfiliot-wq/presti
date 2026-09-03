export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { getUserRevocable } from '@/lib/authArtisan'

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Non authentifié' }, 401)
  const { data: userData } = await getUserRevocable(token)
  if (!userData?.user) return json({ error: 'Session expirée' }, 401)
  const { data: me } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', userData.user.id).maybeSingle()
  if (!me?.is_founder) return json({ error: 'Réservé aux fondateurs' }, 403)

  if (!stripe) return json({ configured: false })

  try {
    const [bal, pis] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.paymentIntents.list({ limit: 15 }),
    ])
    const sum = (arr: { amount: number }[]) => arr.reduce((s, b) => s + b.amount, 0)
    const solde = (sum(bal.available) + sum(bal.pending)) / 100
    const reussis = pis.data.filter((p) => p.status === 'succeeded')
    const transactions = reussis.map((p) => ({
      id: p.id,
      montant: p.amount / 100,
      devise: p.currency,
      desc: p.description || '',
      at: new Date(p.created * 1000).toISOString(),
    }))
    const totalEncaisse = transactions.reduce((s, t) => s + t.montant, 0)
    return json({ configured: true, solde, totalEncaisse, nbPaiements: transactions.length, transactions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Stripe'
    return json({ configured: true, error: msg })
  }
}
