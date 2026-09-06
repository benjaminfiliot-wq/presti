import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { sourcer, type Sourcee } from './fraicheur'

// Stripe vu par la direction (prompt v10 §2.1-2.2) — J1 : LECTURE SEULE, et la prod est en clé réelle.
// Aucune création d'objet ici. Chaque lecture est `Sourcee` : datée, cachée 60 s, et une panne se voit.
// Les montants sont rendus en EUROS (Stripe compte en centimes).
const eur = (centimes: number | null | undefined) => Math.round((centimes ?? 0)) / 100
const debutDuMois = () => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) }
const minuit = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) }
const client = (): Stripe => { if (!stripe) throw new Error('STRIPE_SECRET_KEY absente : Stripe n’est pas configuré.'); return stripe }

/** Stripe répond ? (balance.retrieve : la lecture la plus simple, sans effet). Rend le solde disponible en €. */
export const joignable = () => sourcer('stripe:joignable', 'stripe', async () => {
  const b = await client().balance.retrieve()
  const disponible = (b.available ?? []).reduce((s, x) => s + (x.currency === 'eur' ? x.amount : 0), 0)
  const enAttente = (b.pending ?? []).reduce((s, x) => s + (x.currency === 'eur' ? x.amount : 0), 0)
  return { disponible: eur(disponible), enAttente: eur(enAttente), livemode: b.livemode }
})

export type Mrr = { mrr: number; abonnements: number; parPlan: Record<string, { n: number; mrr: number }> }
/** MRR = somme mensualisée des abonnements actifs (annuel ÷ 12), par plan (metadata.plan posée au checkout). */
export const mrr = (): Promise<Sourcee<Mrr>> => sourcer('stripe:mrr', 'stripe', async () => {
  const parPlan: Mrr['parPlan'] = {}
  let total = 0, n = 0
  for await (const s of client().subscriptions.list({ status: 'active', limit: 100 })) {
    n++
    const plan = String(s.metadata?.plan || 'inconnu')
    let m = 0
    for (const it of s.items.data) {
      const p = it.price
      const brut = (p.unit_amount ?? 0) * (it.quantity ?? 1)
      m += p.recurring?.interval === 'year' ? brut / 12 : p.recurring?.interval === 'week' ? brut * 4.33 : brut
    }
    total += m
    const e = (parPlan[plan] ||= { n: 0, mrr: 0 }); e.n++; e.mrr += eur(m)
  }
  return { mrr: eur(total), abonnements: n, parPlan }
})

export type Encaisse = { brut: number; frais: number; net: number; paiements: number; rembourse: number }
/** Encaissé depuis le 1er du mois (transactions de solde : montant, frais Stripe, net) + remboursements. */
export const encaisseDuMois = (): Promise<Sourcee<Encaisse>> => sourcer('stripe:encaisse', 'stripe', async () => {
  const r: Encaisse = { brut: 0, frais: 0, net: 0, paiements: 0, rembourse: 0 }
  for await (const t of client().balanceTransactions.list({ created: { gte: debutDuMois() }, limit: 100 })) {
    if (t.currency !== 'eur') continue
    if (t.type === 'charge' || t.type === 'payment') { r.brut += t.amount; r.frais += t.fee; r.net += t.net; r.paiements++ }
    else if (t.type === 'refund' || t.type === 'payment_refund') r.rembourse += -t.amount
  }
  return { brut: eur(r.brut), frais: eur(r.frais), net: eur(r.net), paiements: r.paiements, rembourse: eur(r.rembourse) }
})

/** Abonnements créés depuis minuit UTC (les « conversions du jour »). */
export const conversionsDuJour = (): Promise<Sourcee<number>> => sourcer('stripe:conversions', 'stripe', async () => {
  let n = 0
  for await (const _ of client().subscriptions.list({ created: { gte: minuit() }, limit: 100 })) n++
  return n
})

export type Echec = { id: string; client: string | null; montant: number; depuis: string; tentatives: number; motif: string | null; lien: string | null }
/** Factures ouvertes ou en retard : les paiements à relancer. Le nom du client Stripe, jamais son email. */
export const echecsRecents = (): Promise<Sourcee<Echec[]>> => sourcer('stripe:echecs', 'stripe', async () => {
  const out: Echec[] = []
  for (const status of ['open', 'uncollectible'] as const) {
    const l = await client().invoices.list({ status, limit: 25, expand: ['data.customer'] })
    for (const f of l.data) {
      if (status === 'open' && f.attempt_count === 0 && !f.due_date) continue // envoyée, pas encore due : pas un échec
      const c = f.customer && typeof f.customer === 'object' && !('deleted' in f.customer) ? f.customer : null
      out.push({ id: f.id, client: c?.name ?? null, montant: eur(f.amount_due), depuis: new Date((f.created ?? 0) * 1000).toISOString(), tentatives: f.attempt_count ?? 0, motif: null, lien: f.hosted_invoice_url ?? null })
    }
  }
  return out
})

export type Evenement = { id: string; type: string; a: string; libelle: string; objet: string | null }
const LIBELLES: Record<string, string> = {
  'checkout.session.completed': 'Paiement : nouvel abonnement',
  'customer.subscription.created': 'Abonnement créé',
  'customer.subscription.updated': 'Abonnement modifié',
  'customer.subscription.deleted': 'Résiliation',
  'invoice.paid': 'Facture payée',
  'invoice.payment_failed': 'Paiement échoué',
  'charge.refunded': 'Remboursement',
  'charge.dispute.created': 'Litige ouvert',
}
/** Les derniers événements Stripe (pour le Fil) — libellés en français, identifiant de l'objet, rien de personnel. */
export const evenementsRecents = (): Promise<Sourcee<Evenement[]>> => sourcer('stripe:evenements', 'stripe', async () => {
  const l = await client().events.list({ limit: 20, types: Object.keys(LIBELLES) })
  return l.data.map((e) => ({ id: e.id, type: e.type, a: new Date(e.created * 1000).toISOString(), libelle: LIBELLES[e.type] ?? e.type, objet: (e.data?.object as { id?: string })?.id ?? null }))
})
