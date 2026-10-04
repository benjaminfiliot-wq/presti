// scripts/fixtures/026/comptable/stripe-factice.mjs — Stripe FACTICE, lecture seule, pour scripts/comptable-qa.mjs (fiche 026-242).
// Aucune donnée réelle, aucun réseau, aucune clé : les identifiants sont inventés, les montants en centimes entiers.
//
// 20 événements fixes :
//   10 paiements réussis liés à une vente (dont 1 avec un écart d'un centime, ch_08)       -> évt 01 à 08, 18 à 20
//    2 paiements réussis SANS vente correspondante (orphelins : ch_09, ch_10)               -> évt 09, 10
//    2 paiements DUPLIQUÉS (même évènement renvoyé : ch_03, ch_07)                          -> évt 03 et 07 rejoués
//    1 remboursement                                                                        -> évt 13
//    3 échecs d'abonnement                                                                  -> évt 14, 15, 16
//    1 abonnement annulé                                                                    -> évt 17
//
// Le client expose UNE lecture (`evenements.lister()`) et des méthodes d'écriture PIÉGÉES : chacune consigne la tentative dans
// `etat.tentativesEcriture` puis lève. La « clé d'écriture » est un getter piégé : le simple fait de la lire est une tentative.
// Le numéro de carte (`carte.numero`, le numéro d'essai public de Stripe) est un appât : il ne doit JAMAIS ressortir dans un journal.

const carte = { numero: '4242424242424242', marque: 'visa' }
const e = (n, type, id_stripe, date, montant, ref_externe) => ({ id: `evt_${String(n).padStart(2, '0')}`, type, id_stripe, date, montant, ref_externe, carte })

export const EVENEMENTS = Object.freeze([
  e(1, 'charge.succeeded', 'ch_01', '2026-01-12', 15000, 'cmd_001'),
  e(2, 'charge.succeeded', 'ch_02', '2026-02-03', 24000, 'cmd_002'),
  e(3, 'charge.succeeded', 'ch_03', '2026-03-15', 9000, 'cmd_003'),
  e(4, 'charge.succeeded', 'ch_04', '2026-04-20', 31000, 'cmd_004'),
  e(5, 'charge.succeeded', 'ch_05', '2026-05-02', 2900, 'abo_001'),
  e(6, 'charge.succeeded', 'ch_06', '2026-05-03', 2900, 'abo_002'),
  e(7, 'charge.succeeded', 'ch_07', '2026-06-10', 18000, 'cmd_005'),
  e(8, 'charge.succeeded', 'ch_08', '2026-06-18', 12001, 'cmd_006'), // la commande dit 12000 : écart d'un centime
  e(9, 'charge.succeeded', 'ch_09', '2026-07-01', 5000, 'cmd_inconnue_1'), // orphelin : aucune vente de ce nom
  e(10, 'charge.succeeded', 'ch_10', '2026-07-02', 7000, null), // orphelin : aucune référence
  e(3, 'charge.succeeded', 'ch_03', '2026-03-15', 9000, 'cmd_003'), // doublon exact de l'évt 03 (même id Stripe)
  e(7, 'charge.succeeded', 'ch_07', '2026-06-10', 18000, 'cmd_005'), // doublon exact de l'évt 07
  e(13, 'charge.refunded', 're_01', '2026-07-15', 5000, 'cmd_004'),
  e(14, 'invoice.payment_failed', 'in_f1', '2026-07-20', 2900, 'abo_001'),
  e(15, 'invoice.payment_failed', 'in_f2', '2026-07-20', 2900, 'abo_002'),
  e(16, 'invoice.payment_failed', 'in_f3', '2026-07-21', 2900, 'abo_003'),
  e(17, 'customer.subscription.deleted', 'sub_03', '2026-07-25', 0, 'abo_003'),
  e(18, 'charge.succeeded', 'ch_18', '2026-08-05', 22000, 'cmd_007'),
  e(19, 'charge.succeeded', 'ch_19', '2026-09-09', 6000, 'cmd_008'),
  e(20, 'charge.succeeded', 'ch_20', '2026-09-02', 2900, 'abo_001'),
])

/** Ce que le jeu d'essai doit donner (centimes) — relu par le juge, jamais par le module jugé. */
export const ATTENDU = Object.freeze({
  rapproches: ['ch_01', 'ch_02', 'ch_03', 'ch_04', 'ch_05', 'ch_06', 'ch_07', 'ch_18', 'ch_19', 'ch_20'],
  orphelins: ['ch_09', 'ch_10'],
  ecarts: ['ch_08'],
  doublons: 2,
  recettes_2026: 133700,
  recettes_2026_T1: 48000,
  recettes_2026_T2: 54800,
})

export function fabriquerStripeFactice() {
  const etat = { tentativesEcriture: [], lectures: 0 }
  const piege = (nom) => () => { etat.tentativesEcriture.push(nom); throw new Error(`ECRITURE_STRIPE_INTERDITE : ${nom}`) }
  const stripe = {
    evenements: { lister: async () => { etat.lectures++; return structuredClone(EVENEMENTS) } },
    charges: { create: piege('charges.create'), update: piege('charges.update'), capture: piege('charges.capture') },
    refunds: { create: piege('refunds.create'), update: piege('refunds.update'), cancel: piege('refunds.cancel') },
    subscriptions: { create: piege('subscriptions.create'), update: piege('subscriptions.update'), cancel: piege('subscriptions.cancel'), del: piege('subscriptions.del') },
    customers: { create: piege('customers.create'), update: piege('customers.update'), del: piege('customers.del') },
    paymentIntents: { create: piege('paymentIntents.create'), confirm: piege('paymentIntents.confirm'), cancel: piege('paymentIntents.cancel') },
    payouts: { create: piege('payouts.create') },
    transfers: { create: piege('transfers.create') },
    get cleEcriture() { piege('cleEcriture')() },
  }
  Object.defineProperty(stripe, 'etat', { value: etat, enumerable: false })
  return stripe
}

/** Faux journal : `lire()` rend les lignes déjà écrites, `ecrire(ligne)` en ajoute une (aucune déduplication : c'est au module). */
export function fabriquerJournalFactice() {
  const lignes = []
  return { lignes, lire: () => structuredClone(lignes), ecrire: (l) => { lignes.push(structuredClone(l)) } }
}
