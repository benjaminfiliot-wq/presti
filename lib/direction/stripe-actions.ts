import type Stripe from 'stripe'
import { PLANS, planConf, type PlanId, type PlanPayant } from '@/lib/plans'

// Les trois actions du Centre qui ÉCRIVENT chez Stripe (prompt v10 §2.2) : changer d'offre, rembourser,
// mettre en pause. Elles vivent ici, et pas dans la route, pour une raison de preuve : une fonction qui
// reçoit son client Stripe en paramètre s'éprouve en mode TEST contre de vrais objets Stripe, sans qu'un
// centime réel ne bouge. La route, elle, ne peut s'éprouver qu'en production, où la clé est réelle.
//
// Trois garde-fous communs, écrits ici une fois pour toutes :
//   • une clé d'idempotence sur chaque écriture — un réseau qui bafouille ne rembourse pas deux fois ;
//   • des bornes dans le code, jamais dans l'écran : on ne rembourse que ce qui a été payé, on ne
//     dépasse pas la dernière facture, on ne met pas en pause au-delà de trois mois ;
//   • un délai de 6 s sans retente, comme partout ailleurs dans le Centre (une facture Anthropic à
//     465 € nous a appris ce que coûte un appel distant sans laisse).

export const OPTIONS = { timeout: 8000, maxNetworkRetries: 0 } as const
const idem = (parties: (string | number)[]) => parties.join(':').slice(0, 200)

export type Resultat<T> = { ok: true; valeur: T; message: string } | { ok: false; message: string; code?: string }
const echec = (message: string, code?: string): Resultat<never> => ({ ok: false, message, code })

// ── Changer d'offre ───────────────────────────────────────────────────────────────────────────────────
// Stripe remplace l'article de l'abonnement et facture la différence au prorata. On lui laisse le calcul :
// il le fait juste, nous non. Le plan en base est ensuite aligné par `alignerSurAbonnement`, appelée par
// l'appelant — jamais deux endroits qui écrivent la même vérité.
export async function changerOffre(
  s: Stripe, abonnement: string, vers: PlanPayant, clefIdem: string,
): Promise<Resultat<{ sub: Stripe.Subscription; depuis: PlanId | null; prorata: number | null }>> {
  const conf = PLANS[vers]
  if (!conf || conf.prixMois <= 0) return echec('Offre inconnue.')
  const sub = await s.subscriptions.retrieve(abonnement, {}, OPTIONS)
  if (!['active', 'trialing', 'past_due'].includes(sub.status)) return echec(`Abonnement ${sub.status} : on ne change pas d’offre dessus.`, 'statut')
  const item = sub.items.data[0]
  if (!item) return echec('Cet abonnement n’a aucun article.')
  const depuis = (sub.metadata?.plan as PlanId) ?? null
  if (item.price?.unit_amount === Math.round(conf.prixMois * 100)) return echec(`Cet artisan est déjà sur ${conf.label}.`, 'deja')

  const nouveauPrix = await prixOffre(s, vers)

  // Ce que ça coûtera (ou rendra) à l'artisan, AVANT d'écrire : la direction doit pouvoir le dire.
  let prorata: number | null = null
  try {
    const apercu = await s.invoices.createPreview({
      customer: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      subscription: sub.id,
      subscription_details: { items: [{ id: item.id, price: nouveauPrix }], proration_behavior: 'create_prorations' },
    } as Stripe.InvoiceCreatePreviewParams, OPTIONS)
    prorata = typeof apercu.amount_due === 'number' ? apercu.amount_due / 100 : null
  } catch { /* l'aperçu est un confort, pas une condition : son échec ne bloque pas le changement */ }

  const modifie = await s.subscriptions.update(sub.id, {
    items: [{ id: item.id, price: nouveauPrix }],
    proration_behavior: 'create_prorations',
    metadata: { ...(sub.metadata ?? {}), plan: vers },
  }, { ...OPTIONS, idempotencyKey: idem(['offre', clefIdem, sub.id, vers]) })
  return { ok: true, valeur: { sub: modifie, depuis, prorata }, message: `Offre passée à ${conf.label}${prorata != null ? ` — Stripe facture ${prorata.toFixed(2)} € au prorata` : ''}.` }
}

// Un abonnement ne se met pas à jour avec un prix improvisé : `price_data` n'y accepte pas de
// `product_data` (contrairement au checkout). On passe donc par un prix NOMMÉ, retrouvé par sa clé de
// recherche et créé une seule fois. Effet de bord heureux : le catalogue Stripe devient lisible — un
// produit et un prix par offre, au lieu d'un produit jetable par paiement.
export async function prixOffre(s: Stripe, plan: PlanPayant): Promise<string> {
  const conf = PLANS[plan]
  const clef = `presti_${plan}_mensuel`
  const connus = await s.prices.list({ lookup_keys: [clef], active: true, limit: 1 }, OPTIONS)
  const existant = connus.data[0]
  if (existant && existant.unit_amount === Math.round(conf.prixMois * 100) && existant.currency === 'eur') return existant.id
  // Le tarif de la matrice a changé depuis : l'ancien prix perd la clé, le nouveau la prend. Les
  // abonnements en cours dessus ne bougent pas — changer un tarif n'est pas reprendre les contrats signés.
  if (existant) await s.prices.update(existant.id, { lookup_key: `${clef}_ancien_${existant.unit_amount ?? 0}` }, OPTIONS).catch(() => {})
  const cree = await s.prices.create({
    currency: 'eur',
    unit_amount: Math.round(conf.prixMois * 100),
    recurring: { interval: 'month' },
    lookup_key: clef,
    transfer_lookup_key: true,
    product_data: { name: `Presti — ${conf.label}` },
    metadata: { plan },
  }, OPTIONS)
  return cree.id
}

// ── Rembourser ────────────────────────────────────────────────────────────────────────────────────────
// Le geste le plus lourd du Centre : de l'argent quitte le compte. Trois bornes, et pas une de moins.
export async function rembourser(
  s: Stripe, client: string, montantEuros: number | null, motif: string, clefIdem: string,
): Promise<Resultat<{ refund: Stripe.Refund; facture: string | null }>> {
  if (!motif.trim()) return echec('Un motif est obligatoire.')
  // `payments` n'est PAS étendu par défaut : sans cette demande explicite, la facture revient sans son
  // paiement et le remboursement échouait avec « Stripe ne rattache aucun paiement » (suite du 07/09).
  const factures = await s.invoices.list({ customer: client, status: 'paid', limit: 1, expand: ['data.payments'] }, OPTIONS)
  const f = factures.data[0]
  if (!f) return echec('Cet artisan n’a aucune facture payée : il n’y a rien à rembourser.', 'rien')

  const paiement = typeof f.payments?.data?.[0]?.payment?.payment_intent === 'string'
    ? f.payments.data[0].payment.payment_intent
    : (f as unknown as { payment_intent?: string | { id: string } }).payment_intent
  const intention = typeof paiement === 'string' ? paiement : paiement?.id
  if (!intention) return echec('Stripe ne rattache aucun paiement à la dernière facture.', 'rien')

  const paye = (f.amount_paid ?? 0) / 100
  const dejaRendu = ((f as unknown as { post_payment_credit_notes_amount?: number }).post_payment_credit_notes_amount ?? 0) / 100
  const plafond = Math.max(0, paye - dejaRendu)
  if (plafond <= 0) return echec('Cette facture a déjà été remboursée en totalité.', 'deja')

  const montant = montantEuros == null ? plafond : montantEuros
  if (!(montant > 0)) return echec('Le montant doit être positif.')
  // Borne dure : on ne rend jamais plus que ce qui a été encaissé sur la dernière facture.
  if (montant > plafond + 0.005) return echec(`Au maximum ${plafond.toFixed(2)} € : c'est ce qui reste encaissé sur la dernière facture.`, 'plafond')

  const refund = await s.refunds.create({
    payment_intent: intention,
    amount: Math.round(montant * 100),
    reason: 'requested_by_customer',
    metadata: { motif: motif.slice(0, 400), origine: 'direction' },
  }, { ...OPTIONS, idempotencyKey: idem(['remb', clefIdem, intention, Math.round(montant * 100)]) })
  return { ok: true, valeur: { refund, facture: f.id ?? null }, message: `${montant.toFixed(2)} € remboursés sur la facture du ${f.created ? new Date(f.created * 1000).toLocaleDateString('fr-FR') : '—'}.` }
}

// ── Mettre en pause, et reprendre ─────────────────────────────────────────────────────────────────────
// Une pause de facturation, c'est un geste commercial : on ne prélève plus, l'accès continue. Le plan
// n'est donc PAS retiré — sinon la pause punirait celui à qui on fait une fleur.
export async function mettreEnPause(
  s: Stripe, abonnement: string, jusquAu: Date | null, clefIdem: string,
): Promise<Resultat<Stripe.Subscription>> {
  const sub = await s.subscriptions.retrieve(abonnement, {}, OPTIONS)
  if (sub.pause_collection) return echec('Cet abonnement est déjà en pause.', 'deja')
  if (!['active', 'trialing', 'past_due'].includes(sub.status)) return echec(`Abonnement ${sub.status} : rien à mettre en pause.`, 'statut')
  if (jusquAu) {
    const jours = (jusquAu.getTime() - Date.now()) / 86_400_000
    if (jours < 1) return echec('La reprise doit être au moins demain.')
    if (jours > 92) return echec('Trois mois au maximum : au-delà, c’est une résiliation, pas une pause.', 'plafond')
  }
  const modifie = await s.subscriptions.update(sub.id, {
    pause_collection: { behavior: 'void', ...(jusquAu ? { resumes_at: Math.floor(jusquAu.getTime() / 1000) } : {}) },
  }, { ...OPTIONS, idempotencyKey: idem(['pause', clefIdem, sub.id, jusquAu?.toISOString() ?? 'sans-fin']) })
  return { ok: true, valeur: modifie, message: jusquAu ? `Facturation en pause jusqu’au ${jusquAu.toLocaleDateString('fr-FR')} — l’accès continue.` : 'Facturation en pause — l’accès continue.' }
}

export async function reprendre(s: Stripe, abonnement: string, clefIdem: string): Promise<Resultat<Stripe.Subscription>> {
  const sub = await s.subscriptions.retrieve(abonnement, {}, OPTIONS)
  if (!sub.pause_collection) return echec('Cet abonnement n’est pas en pause.', 'deja')
  const modifie = await s.subscriptions.update(sub.id, { pause_collection: null }, { ...OPTIONS, idempotencyKey: idem(['reprise', clefIdem, sub.id]) })
  return { ok: true, valeur: modifie, message: 'Facturation reprise : le prochain prélèvement aura lieu normalement.' }
}

/** Ce qu'on affiche d'un abonnement en pause, en clair. */
export const pauseLisible = (sub: Pick<Stripe.Subscription, 'pause_collection'>): string | null => {
  const p = sub.pause_collection
  if (!p) return null
  return p.resumes_at ? `en pause jusqu’au ${new Date(p.resumes_at * 1000).toLocaleDateString('fr-FR')}` : 'en pause, sans date de reprise'
}

export const libelleOffre = (p: string | null | undefined) => planConf(p).label
