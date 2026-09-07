import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { sourcer, type Sourcee } from './fraicheur'

// Stripe vu par la direction (prompt v10 §2.1-2.2) — J1 : LECTURE SEULE, et la prod est en clé réelle.
// Aucune création d'objet ici. Chaque lecture est `Sourcee` : datée, cachée 90 s, et une panne se voit.
// Les montants sont rendus en EUROS (Stripe compte en centimes).
//
// Chaque appel porte SON délai et ne retente pas (revue du 07/09) : le client Stripe partagé attend 80 secondes
// par défaut, de quoi faire expirer la fonction Vercel et laisser l'écran blanc au lieu d'afficher « Stripe
// injoignable ». Le client du webhook, lui, n'est pas touché : les options sont passées par requête.
const OPTIONS: Stripe.RequestOptions = { timeout: 6000, maxNetworkRetries: 0 }
const TTL = 90_000

const eur = (centimes: number | null | undefined) => Math.round(centimes ?? 0) / 100
const debutDuMois = () => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) }
const minuit = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) }
const client = (): Stripe => { if (!stripe) throw new Error('Stripe n’est pas configuré (clé absente).'); return stripe }

/** Stripe répond ? (balance.retrieve : la lecture la plus simple, sans effet). Rend le solde disponible en €. */
export const joignable = () => sourcer('stripe:joignable', 'stripe', async () => {
  const b = await client().balance.retrieve({}, OPTIONS)
  const disponible = (b.available ?? []).reduce((s, x) => s + (x.currency === 'eur' ? x.amount : 0), 0)
  const enAttente = (b.pending ?? []).reduce((s, x) => s + (x.currency === 'eur' ? x.amount : 0), 0)
  return { disponible: eur(disponible), enAttente: eur(enAttente), livemode: b.livemode }
}, TTL)

export type Mrr = { mrr: number; abonnements: number; parPlan: Record<string, { n: number; mrr: number }> }
/** MRR = somme mensualisée des abonnements actifs (annuel ÷ 12), par plan (metadata.plan posée au checkout). */
export const mrr = (): Promise<Sourcee<Mrr>> => sourcer('stripe:mrr', 'stripe', async () => {
  const parPlan: Mrr['parPlan'] = {}
  let total = 0, n = 0
  // Deux pages au plus : au-delà de 200 abonnements, ce chiffre passera par un agrégat en base (J2).
  const l = await client().subscriptions.list({ status: 'active', limit: 100 }, OPTIONS)
  const abonnements = l.has_more ? [...l.data, ...(await client().subscriptions.list({ status: 'active', limit: 100, starting_after: l.data[l.data.length - 1]?.id }, OPTIONS)).data] : l.data
  for (const s of abonnements) {
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
}, TTL)

export type Encaisse = { brut: number; frais: number; net: number; paiements: number; rembourse: number }
/** Encaissé depuis le 1er du mois (transactions de solde : montant, frais Stripe, net) + remboursements. */
export const encaisseDuMois = (): Promise<Sourcee<Encaisse>> => sourcer('stripe:encaisse', 'stripe', async () => {
  const r: Encaisse = { brut: 0, frais: 0, net: 0, paiements: 0, rembourse: 0 }
  const l = await client().balanceTransactions.list({ created: { gte: debutDuMois() }, limit: 100 }, OPTIONS)
  for (const t of l.data) {
    if (t.currency !== 'eur') continue
    if (t.type === 'charge' || t.type === 'payment') { r.brut += t.amount; r.frais += t.fee; r.net += t.net; r.paiements++ }
    else if (t.type === 'refund' || t.type === 'payment_refund') r.rembourse += -t.amount
  }
  return { brut: eur(r.brut), frais: eur(r.frais), net: eur(r.net), paiements: r.paiements, rembourse: eur(r.rembourse), partiel: l.has_more }
}, TTL)

/** Abonnements ACTIVÉS depuis minuit UTC : un checkout abandonné (incomplete) n'est pas une conversion. */
export const conversionsDuJour = (): Promise<Sourcee<number>> => sourcer('stripe:conversions', 'stripe', async () => {
  const l = await client().subscriptions.list({ created: { gte: minuit() }, limit: 100 }, OPTIONS)
  return l.data.filter((s) => ['active', 'trialing', 'past_due'].includes(s.status)).length
}, TTL)

export type Echec = { id: string; client: string | null; montant: number; depuis: string; tentatives: number; lien: string | null }
/** Factures ouvertes ou en retard : les paiements à relancer. Le nom de facturation, jamais l'email du client. */
export const echecsRecents = (): Promise<Sourcee<Echec[]>> => sourcer('stripe:echecs', 'stripe', async () => {
  const out: Echec[] = []
  for (const status of ['open', 'uncollectible'] as const) {
    const l = await client().invoices.list({ status, limit: 25 }, OPTIONS)
    for (const f of l.data) {
      if (status === 'open' && (f.attempt_count ?? 0) === 0 && !f.due_date) continue // envoyée, pas encore due : pas un échec
      out.push({ id: f.id ?? '', client: (f as unknown as { customer_name?: string | null }).customer_name ?? null, montant: eur(f.amount_due), depuis: new Date((f.created ?? 0) * 1000).toISOString(), tentatives: f.attempt_count ?? 0, lien: f.hosted_invoice_url ?? null })
    }
  }
  return out
}, TTL)

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
  const l = await client().events.list({ limit: 20, types: Object.keys(LIBELLES) }, OPTIONS)
  return l.data.map((e) => ({ id: e.id, type: e.type, a: new Date(e.created * 1000).toISOString(), libelle: LIBELLES[e.type] ?? e.type, objet: (e.data?.object as { id?: string })?.id ?? null }))
}, TTL)
