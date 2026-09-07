export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe, concerneAbonnementCourant } from '@/lib/stripe'
import { planConf } from '@/lib/plans'
import { alignerSurAbonnement } from '@/lib/abonnementSync'
import { notifierEntreprise } from '@/lib/email'
import { alertePaiement, envoyerAlertes } from '@/lib/alertes'
import { mentionFranchise } from '@/lib/facturation'
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
        // Pied de page des factures Stripe à venir : la mention de franchise en base, tant que
        // l'entreprise n'est pas assujettie (audit final, B3). La première facture, déjà émise
        // au paiement, dépend du modèle de facture réglé dans le tableau de bord Stripe (H7).
        const clientId = typeof s.customer === 'string' ? s.customer : s.customer?.id
        if (clientId && stripe && process.env.STRIPE_TAXE_AUTO !== '1') {
          await stripe.customers.update(clientId, { invoice_settings: { footer: mentionFranchise('auto') } }).catch((e) => console.error('[stripe webhook] pied de facture', e))
        }
        // L'entreprise est prévenue (sprint J-1 §15) : un paiement, c'est un artisan qui a dit oui.
        const { data: a } = await supabaseAdmin.from('artisans').select('nom, email, metier').eq('id', uid).maybeSingle()
        await notifierEntreprise(
          `Paiement — ${a?.nom || uid} passe en ${conf.label}`,
          `Abonnement activé via Stripe.\n\nArtisan : ${a?.nom || '—'} (${a?.metier || '—'})\nEmail : ${a?.email || '—'}\nFormule : ${conf.label} — ${conf.prixMois} €/mois\nMontant encaissé : ${typeof s.amount_total === 'number' ? (s.amount_total / 100).toFixed(2) + ' ' + (s.currency || 'eur').toUpperCase() : '—'}`,
        )
      }
    } else if (event.type === 'customer.subscription.updated') {
      // Un changement d'offre venu d'AILLEURS que d'une souscription : le portail de facturation en
      // autorise un, et rien ne l'appliquait en base (revue du 07/09). L'artisan payait un montant et
      // gardait les crédits d'un autre. Le montant facturé décide, jamais une métadonnée périmée.
      const sub = event.data.object as Stripe.Subscription
      const r = await alignerSurAbonnement(sub)
      console.log('[stripe webhook] abonnement modifié —', r.raison)
      if (r.applique && r.avant?.plan !== r.plan) {
        const { data: a } = await supabaseAdmin.from('artisans').select('nom, email').eq('stripe_subscription_id', sub.id).maybeSingle()
        await notifierEntreprise(
          `Changement d’offre — ${a?.nom || sub.id}`,
          `Offre passée de ${planConf(r.avant?.plan).label} à ${planConf(r.plan).label}.\n\nArtisan : ${a?.nom || '—'}\nEmail : ${a?.email || '—'}\nCrédits : ${r.credits}\n\n${r.raison}.`,
        ).catch(() => {})
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const uid = (sub.metadata?.uid as string) || ''
      const { data: enBase } = uid ? await supabaseAdmin.from('artisans').select('stripe_subscription_id').eq('id', uid).maybeSingle() : { data: null }
      if (uid && !concerneAbonnementCourant(enBase?.stripe_subscription_id, sub.id)) {
        console.log('[stripe webhook] fin d’un ancien abonnement ignorée', uid, sub.id)
      } else if (uid) {
        await supabaseAdmin.from('artisans').update({ plan: 'gratuit', stripe_subscription_id: null }).eq('id', uid)
        const { data: a } = await supabaseAdmin.from('artisans').select('nom, email').eq('id', uid).maybeSingle()
        await notifierEntreprise(
          `Résiliation — ${a?.nom || uid}`,
          `Abonnement Stripe résilié, retour à la formule gratuite.\n\nArtisan : ${a?.nom || '—'}\nEmail : ${a?.email || '—'}`,
        )
      }
    } else if (event.type === 'invoice.payment_failed') {
      // Un prélèvement qui échoue : l'artisan est prévenu (moyen de paiement à mettre à jour),
      // l'entreprise aussi. Sans cette écoute, un impayé restait invisible (auditeur H).
      const inv = event.data.object as Stripe.Invoice
      const clientId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
      if (clientId) {
        const { data: a } = await supabaseAdmin.from('artisans').select('id, email, nom').eq('stripe_customer_id', clientId).maybeSingle()
        if (a?.email) await envoyerAlertes(alertePaiement('echec', { id: a.id, email: a.email, nom: a.nom }, inv.last_finalization_error?.message ?? ''))
      }
    }
  } catch (e) {
    console.error('[stripe webhook] traitement:', e)
    // 500 : Stripe réessaiera (jusqu'à trois jours). Un 200 sur une erreur laissait un artisan
    // payé sans son offre, sans nouvelle tentative et sans que personne ne le sache.
    await notifierEntreprise(`Webhook Stripe en erreur — ${event.type}`, `${e instanceof Error ? e.message : String(e)}

Événement ${event.id}. Stripe réessaiera ; vérifiez le tableau de bord.`).catch(() => {})
    return NextResponse.json({ error: 'traitement en erreur' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
