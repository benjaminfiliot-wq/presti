export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe, concerneAbonnementCourant } from '@/lib/stripe'
import { planConf } from '@/lib/plans'
import { actif } from '@/lib/flags'
import { joursEssaiDeSession, creditsEssai, finEssai, finDEssaiSansPaiement, creditsApresEssaiPerdu, abonnementFerme, essaiDevenuPayant } from '@/lib/essaiGratuit'
import { marquerEssai, alerteFinEssai } from '@/lib/essaiGratuitServeur'
import { alignerSurAbonnement } from '@/lib/abonnementSync'
import { notifierEntreprise } from '@/lib/email'
import { alertePaiement, envoyerAlertes } from '@/lib/alertes'
import { mentionFranchise } from '@/lib/facturation'
import { encaisserCommandeSite } from '@/lib/siteCommandeServeur'
import { encaisserPackPub } from '@/lib/packPubServeur'
import { encaisserPackStudio } from '@/lib/studio/commandeServeur'
import { ouvrirCompteAcheteur } from '@/lib/siteAchatPublic'
import { envoyerCourrielsDus } from '@/lib/siteLivraison'
import { aiguiller, champsAbonnement } from '@/lib/stripeAiguillage'
import type Stripe from 'stripe'

// Un paiement que Presti ne sait pas servir (fiche 025-07) : l'entreprise est prévenue avec de quoi le retrouver dans
// le tableau de bord Stripe. Clé par événement : un rejeu du même événement dans les 24 h ne renvoie pas l'alerte
// (verrou quotidien de lib/alertes.ts), deux paiements orphelins le même jour en envoient deux.
function alerteOrphelin(idEvenement: string, s: Stripe.Checkout.Session) {
  const montant = typeof s.amount_total === 'number' ? `${(s.amount_total / 100).toFixed(2)} ${(s.currency || '?').toUpperCase()}` : 'montant inconnu'
  const clientId = typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null
  const client = [clientId, s.customer_details?.name, s.customer_details?.email].filter(Boolean).join(' · ') || '—'
  return {
    motif: 'paiement' as const,
    a: 'entreprise' as const,
    cle: `orphelin:${idEvenement}`,
    sujet: `Paiement Stripe sans suite — ${montant}`,
    corps: `Un paiement Stripe n'est ni une commande de site (mode payment + metadata.type = commande_site), ni un abonnement (uid + plan) : rien n'a été servi ni écrit.
À traiter à la main depuis le tableau de bord Stripe (servir le client ou le rembourser).

Montant : ${montant}
Client : ${client}
Session : ${s.id}
Mode : ${s.mode ?? '—'} · statut du paiement : ${s.payment_status ?? '—'}
Métadonnées : ${JSON.stringify(s.metadata ?? {}).slice(0, 300)}
Événement : ${idEvenement}`,
  }
}

// Fin d'un abonnement (customer.subscription.deleted, ou un statut qui ferme : canceled, incomplete_expired) : l'artisan retombe
// sur l'offre d'Essai, sans rien perdre d'autre que les capacités payantes. Le contrôle d'ancienneté (concerneAbonnementCourant)
// évite qu'un ancien abonnement rejoué rétrograde un abonné actif. Un essai gratuit qui finit SANS carte (Stripe l'annule
// lui-même, essai gratuit du 13/10) ramène aussi les crédits au plus à ceux de l'offre d'Essai : les crédits de l'essai
// ne survivent pas à l'essai.
async function retourAGratuit(sub: Stripe.Subscription): Promise<void> {
  const uid = (sub.metadata?.uid as string) || ''
  if (!uid) return
  const { data: enBase } = await supabaseAdmin.from('artisans').select('stripe_subscription_id, credits').eq('id', uid).maybeSingle()
  if (!concerneAbonnementCourant(enBase?.stripe_subscription_id, sub.id)) {
    console.log('[stripe webhook] fin d’un ancien abonnement ignorée', uid, sub.id)
    return
  }
  const essaiPerdu = finDEssaiSansPaiement(sub)
  const { error: eFin } = await supabaseAdmin.from('artisans').update({
    plan: 'gratuit',
    stripe_subscription_id: null,
    ...(essaiPerdu ? { credits: creditsApresEssaiPerdu(enBase?.credits) } : {}),
  }).eq('id', uid)
  if (eFin) throw new Error(`retour à l'offre gratuite impossible : ${eFin.message}`)
  // Pilote automatique (audit du 21/10, F1) : plus de Signature, plus rien ne part seul — la file est annulée.
  if (actif('piloteAutomatique')) await (await import('@/lib/pilote/serveur')).apresChangementOffre(uid, 'gratuit')
  const { data: a } = await supabaseAdmin.from('artisans').select('nom, email').eq('id', uid).maybeSingle()
  await notifierEntreprise(
    essaiPerdu ? `Fin d’essai sans carte — ${a?.nom || uid}` : `Résiliation — ${a?.nom || uid}`,
    essaiPerdu
      ? `L’essai gratuit s’est terminé sans carte : l’abonnement est annulé, retour à la formule d’Essai (aucun prélèvement).\n\nArtisan : ${a?.nom || '—'}\nEmail : ${a?.email || '—'}`
      : `Abonnement Stripe résilié, retour à la formule gratuite.\n\nArtisan : ${a?.nom || '—'}\nEmail : ${a?.email || '—'}`,
  )
}

// L'essai devient un abonnement payé (carte ajoutée, premier prélèvement réussi) : le forfait du mois est servi en entier tout de
// suite (sinon il n'arriverait qu'au premier rechargement paresseux), et un mois de crédits commence.
async function essaiDevenuAbonnement(sub: Stripe.Subscription): Promise<void> {
  const uid = (sub.metadata?.uid as string) || ''
  if (!uid) return
  const plan = (sub.metadata?.plan as string) || ''
  const next = new Date(); next.setMonth(next.getMonth() + 1)
  const { data: a } = await supabaseAdmin.from('artisans').select('credits, nom, email').eq('id', uid).maybeSingle()
  const { error } = await supabaseAdmin.from('artisans').update({
    credits: Math.max(a?.credits ?? 0, planConf(plan).creditsMois),
    credits_reset_le: next.toISOString().slice(0, 10),
  }).eq('id', uid)
  if (error) throw new Error(`passage de l'essai à l'abonnement impossible : ${error.message}`)
  await notifierEntreprise(`Conversion — ${a?.nom || uid} : l’essai ${planConf(plan).label} devient payant`, `Une carte a été ajoutée, l’abonnement court.\n\nArtisan : ${a?.nom || '—'}\nEmail : ${a?.email || '—'}\nFormule : ${planConf(plan).label} — ${planConf(plan).prixMois} €/mois`).catch(() => {})
}

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
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data.object as Stripe.Checkout.Session
      const { uid, plan } = champsAbonnement(s)
      // La voie vient de lib/stripeAiguillage.ts (fonction pure, jugée par scripts/webhook-muet-qa.mjs) : commande de
      // site, abonnement, ou orphelin. Un nouveau produit payant y reçoit sa voie AVANT d'être vendu.
      const voie = aiguiller(s)
      // Paiement UNIQUE — le site à la demande (v15 §3.1). Une session en mode 'payment' n'a pas de plan :
      // sans cette branche, l'événement tombait dans le vide et l'artisan avait payé pour rien. On encaisse
      // (brouillon → payee) ; 'introuvable' remonte en erreur pour que Stripe rejoue et qu'un humain voie.
      if (voie === 'commande_site') {
        const r = await encaisserCommandeSite(s)
        if (r === 'introuvable') throw new Error(`paiement de site sans dossier : session ${s.id}`)
        console.log('[stripe webhook] commande de site', r, s.metadata?.commande_id)
        // L'achat sans compte (fiche 026-025) : le compte naît APRÈS le paiement, et son lien part une fois. Relu après
        // l'encaissement, qu'il soit neuf ou rejoué : un lien qui n'est pas parti (Resend en panne) repart au rejeu suivant.
        // Une erreur remonte (500) et Stripe rejoue ; l'encaissement, lui, est idempotent.
        const commandeId = String(s.metadata?.commande_id || '')
        const { data: apres, error: eRelue } = await supabaseAdmin.from('sites_commandes').select('achat_public, artisan_id, lien_envoye_le').eq('id', commandeId).maybeSingle()
        if (eRelue) throw new Error(`relecture de la commande ${commandeId} impossible : ${eRelue.message}`)
        if (apres?.achat_public === true && !apres.artisan_id && !apres.lien_envoye_le) await ouvrirCompteAcheteur(commandeId)
        // Les courriels de livraison dus (« commande payée ») : jamais bloquants, la tournée quotidienne les rattrape.
        await envoyerCourrielsDus(commandeId).catch((e) => console.error('[stripe webhook] courriels de livraison', commandeId, e))
      } else if (voie === 'abonnement') {
        const conf = planConf(plan)
        // Essai gratuit sans carte : la session le dit (essai_jours, posé par /api/subscribe) et la durée doit être celle de l'offre.
        const joursEssai = joursEssaiDeSession(s.metadata as Record<string, string> | null, plan)
        const next = new Date(); next.setMonth(next.getMonth() + 1)
        const abo = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null
        // Les crédits ne s'ÉCRASENT pas : un artisan à qui la direction vient d'offrir 200 crédits ne
        // doit pas les perdre à l'instant où il paie (revue du 07/09). On garde le plus favorable.
        const { data: avant } = await supabaseAdmin.from('artisans').select('credits, stripe_subscription_id, email').eq('id', uid).maybeSingle()
        // Un seul essai par compte : un DEUXIÈME abonnement d'essai (deux onglets de Checkout ouverts en même temps) est annulé
        // chez Stripe au lieu d'écraser le premier. L'événement de sa fin (deleted) est ignoré : ce n'est pas l'abonnement courant.
        if (joursEssai && abo && avant?.stripe_subscription_id && avant.stripe_subscription_id !== abo) {
          console.warn('[stripe webhook] deuxième essai pour un compte déjà abonné — annulé', uid, abo)
          await stripe.subscriptions.cancel(abo).catch((e) => console.error('[stripe webhook] annulation du doublon d’essai', e))
          await notifierEntreprise('Essai en double annulé', `Le compte ${uid} a ouvert un second abonnement d’essai (${abo}) alors qu’un abonnement court déjà (${avant.stripe_subscription_id}). Le second est annulé chez Stripe.`).catch(() => {})
          return NextResponse.json({ received: true })
        }
        // Rejeu du même événement : Stripe le fait, et il ne doit pas recharger un forfait déjà servi.
        const dejaServi = !!abo && avant?.stripe_subscription_id === abo
        const { error: eMaj } = await supabaseAdmin.from('artisans').update({
          plan,
          // Essai : crédits au prorata des jours (creditsEssai), remis à zéro le jour de la fin d'essai (rechargement paresseux).
          ...(dejaServi ? {} : joursEssai
            ? { credits: Math.max(avant?.credits ?? 0, creditsEssai(plan)), credits_reset_le: finEssai(new Date(), joursEssai) }
            : { credits: Math.max(avant?.credits ?? 0, conf.creditsMois), credits_reset_le: next.toISOString().slice(0, 10) }),
          stripe_customer_id: typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null,
          stripe_subscription_id: abo,
        }).eq('id', uid)
        // ⚠️ Sans ce contrôle, une panne d'écriture passait inaperçue : la route rendait 200, Stripe
        // considérait l'événement traité et ne le rejouait JAMAIS. L'artisan était prélevé et restait
        // sur l'offre d'essai, la fiche affichait « aucun abonnement », et il pouvait même payer une
        // seconde fois (le garde-fou de /api/subscribe lit stripe_subscription_id, resté vide).
        if (eMaj) throw new Error(`écriture de l'abonnement impossible : ${eMaj.message}`)
        console.log(joursEssai ? '[stripe webhook] essai gratuit démarré' : '[stripe webhook] abonnement activé', uid, plan, joursEssai || '')
        if (joursEssai && !dejaServi) await marquerEssai({ uid, email: avant?.email, plan, jours: joursEssai, customerId: typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null, subscriptionId: abo })
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
          joursEssai ? `Essai gratuit — ${a?.nom || uid} démarre ${conf.label} (${joursEssai} jours)` : `Paiement — ${a?.nom || uid} passe en ${conf.label}`,
          `${joursEssai ? `Essai gratuit SANS carte de ${joursEssai} jours (${creditsEssai(plan)} crédits). Sans carte à la fin, l’abonnement est annulé et le compte revient à l’Essai.` : 'Abonnement activé via Stripe.'}\n\nArtisan : ${a?.nom || '—'} (${a?.metier || '—'})\nEmail : ${a?.email || '—'}\nFormule : ${conf.label} — ${conf.prixMois} €/mois\nMontant encaissé : ${typeof s.amount_total === 'number' ? (s.amount_total / 100).toFixed(2) + ' ' + (s.currency || 'eur').toUpperCase() : '—'}`,
        )
      } else if (voie === 'pack_pub') {
        // Paiement UNIQUE — le pack pubs locales (fiche 026-112). Même logique que commande_site : 'introuvable'
        // remonte en erreur pour que Stripe rejoue et qu'un humain voie ; encaisserPackPub ne crée jamais de ligne.
        const r = await encaisserPackPub(s)
        if (r === 'introuvable') throw new Error(`paiement de pack pubs sans dossier : session ${s.id}`)
        console.log('[stripe webhook] pack pubs', r, s.metadata?.pack_id)
      } else if (voie === 'pack_studio') {
        // Paiement UNIQUE — le pack vidéos du Studio (fiche 026-166). 'introuvable' remonte en erreur : Stripe rejoue, le catch prévient.
        const r = await encaisserPackStudio(s)
        if (r === 'introuvable') throw new Error(`paiement de pack Studio sans dossier : session ${s.id}`)
        console.log('[stripe webhook] pack Studio', r, s.metadata?.pack_id)
      } else if (voie === 'en_attente') {
        console.log('[stripe webhook] paiement en attente', s.id)
      } else {
        // Orphelin (fiche 025-07) : encaissé par Stripe, servi par personne — lien de paiement créé à la main, pack
        // sans branche. Avant, aucune trace. On alerte puis on répond 200 : une erreur ferait rejouer Stripe trois
        // jours pour un paiement qu'aucun rejeu ne saura servir ; c'est un humain qui tranche.
        console.warn('[stripe webhook] paiement orphelin', s.id, event.id)
        await envoyerAlertes([alerteOrphelin(event.id, s)])
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const s = event.data.object as Stripe.Checkout.Session
      await envoyerAlertes([{
        motif: 'paiement',
        a: 'entreprise',
        cle: `paiement-echoue:${event.id}`,
        sujet: 'Paiement différé Stripe échoué',
        corps: `Le paiement différé de la session ${s.id} a échoué. Aucun site ni abonnement n'a été servi. Événement : ${event.id}`,
      }])
    } else if (event.type === 'customer.subscription.updated') {
      // Un changement d'offre venu d'AILLEURS que d'une souscription : le portail de facturation en
      // autorise un, et rien ne l'appliquait en base (revue du 07/09). L'artisan payait un montant et
      // gardait les crédits d'un autre. Le montant facturé décide, jamais une métadonnée périmée.
      const sub = event.data.object as Stripe.Subscription
      const statutAvant = (event.data as { previous_attributes?: { status?: string } }).previous_attributes?.status
      // Un abonnement fermé (canceled, incomplete_expired) : retour à l'Essai, comme à customer.subscription.deleted.
      if (abonnementFerme(sub.status)) {
        await retourAGratuit(sub)
        return NextResponse.json({ received: true })
      }
      // Pendant l'essai gratuit, l'offre et ses capacités sont celles posées au Checkout (comme un abonnement actif) ; on n'aligne
      // PAS les crédits sur le montant (alignerSurAbonnement servirait le forfait entier pendant l'essai).
      if (sub.status === 'trialing') {
        console.log('[stripe webhook] essai gratuit en cours — rien à aligner', sub.id)
        return NextResponse.json({ received: true })
      }
      // L'essai devient payant : le forfait du mois est servi en entier, tout de suite.
      if (essaiDevenuPayant(statutAvant, sub.status)) await essaiDevenuAbonnement(sub)
      const client = stripe
      const r = await alignerSurAbonnement(sub, (id) => client.subscriptions.retrieve(id, {}, { timeout: 6000, maxNetworkRetries: 0 }))
      console.log('[stripe webhook] abonnement modifié —', r.raison)
      // Une écriture refusée n'est pas « rien à appliquer » : on tombe dans le `catch`, qui alerte et
      // rend 500 — Stripe rejouera pendant trois jours plutôt que d'oublier le changement d'offre.
      if (r.echec) throw new Error(`alignement impossible : ${r.raison}`)
      if (r.applique && r.avant?.plan !== r.plan) {
        const { data: a } = await supabaseAdmin.from('artisans').select('nom, email').eq('stripe_subscription_id', sub.id).maybeSingle()
        await notifierEntreprise(
          `Changement d’offre — ${a?.nom || sub.id}`,
          `Offre passée de ${planConf(r.avant?.plan).label} à ${planConf(r.plan).label}.\n\nArtisan : ${a?.nom || '—'}\nEmail : ${a?.email || '—'}\nCrédits : ${r.credits}\n\n${r.raison}.`,
        ).catch(() => {})
      }
    } else if (event.type === 'customer.subscription.deleted') {
      await retourAGratuit(event.data.object as Stripe.Subscription)
    } else if (event.type === 'customer.subscription.trial_will_end') {
      // Stripe prévient 3 jours avant la fin de l'essai. Pas de carte → l'artisan est prévenu de ce qu'il peut faire (une carte pour continuer) ;
      // déjà une carte → rien à dire. Le message ne promet que ce qui est vrai : sans carte, retour à l'Essai, sans prélèvement.
      const sub = event.data.object as Stripe.Subscription
      const uid = (sub.metadata?.uid as string) || ''
      if (uid && sub.trial_end) {
        const { data: a } = await supabaseAdmin.from('artisans').select('id, email, nom, plan, stripe_subscription_id').eq('id', uid).maybeSingle()
        if (a?.email && concerneAbonnementCourant(a.stripe_subscription_id, sub.id)) {
          let aUneCarte = !!sub.default_payment_method
          if (!aUneCarte && stripe) {
            const clientId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
            const c = clientId ? await stripe.customers.retrieve(clientId).catch(() => null) : null
            aUneCarte = !!(c && !('deleted' in c && c.deleted) && c.invoice_settings?.default_payment_method)
          }
          if (!aUneCarte) await envoyerAlertes(alerteFinEssai({ id: a.id, email: a.email, nom: a.nom }, a.plan || (sub.metadata?.plan as string) || '', new Date(sub.trial_end * 1000).toISOString()))
        }
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
