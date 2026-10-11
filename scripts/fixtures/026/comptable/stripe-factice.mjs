// Vingt événements fixes, sans donnée réelle. Les écritures sont des pièges.
export const evenements = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: `ch_${i}`, type: 'paiement', status: 'succeeded', amount: 10000, created: `2026-01-${String(i + 1).padStart(2, '0')}`, commande_id: `vente_${i}`, ...(i === 0 ? { card_number: '4242424242424242', secret: 'sk_test_SENTINELLE_SYNTHETIQUE' } : {}) })),
  { id: 'orphelin_1', type: 'paiement', status: 'succeeded', amount: 12000, created: '2026-01-12' },
  { id: 'orphelin_2', type: 'paiement', status: 'succeeded', amount: 13000, created: '2026-01-13' },
  ...[0, 1].map(i => ({ id: `ch_${i}`, type: 'paiement', status: 'succeeded', amount: 10000, created: `2026-01-0${i + 1}`, commande_id: `vente_${i}` })),
  { id: 're_0', type: 'remboursement', charge: 'ch_0', amount: 1000, created: '2026-01-15' },
  ...[0, 1, 2].map(i => ({ id: `echec_${i}`, type: 'abonnement', status: 'failed', amount: 3000, created: '2026-01-16' })),
  { id: 'annule', type: 'abonnement', status: 'canceled', amount: 3000, created: '2026-01-17' },
  { id: 'ecart', type: 'paiement', status: 'succeeded', amount: 10001, created: '2026-01-18', commande_id: 'vente_ecart' },
]
export function stripeFactice(events, appels) {
  const interdit = (...args) => { appels.push({ type: 'stripe-ecriture', args }); throw Error('écriture Stripe interdite') }
  const liste = data => async () => ({ data: structuredClone(data), has_more: false })
  return {
    events: { list: liste(events) },
    charges: { list: liste(events.filter(e => e.type === 'paiement')), create: interdit, update: interdit, del: interdit },
    refunds: { list: liste(events.filter(e => e.type === 'remboursement')), create: interdit },
    subscriptions: { list: liste(events.filter(e => e.type === 'abonnement')), cancel: interdit },
  }
}
