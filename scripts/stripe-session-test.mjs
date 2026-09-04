// Prouve, AVANT d'activer la TVA en production, que Stripe accepte une session d'abonnement
// construite exactement comme le fait `app/api/subscribe/route.ts` avec `STRIPE_TAXE_AUTO=1`.
//
// Pourquoi ce script existe : `automatic_tax` échoue à la CRÉATION de la session quand le compte
// n'est pas prêt (pas d'adresse d'origine, pas d'immatriculation, `tax_behavior` absent). Sans
// cette vérification, on ne le découvrirait que sur le premier vrai client, au moment où il paie.
//
// Rien n'est débité : une session de paiement n'est qu'une adresse web. Elle est expirée
// immédiatement après le contrôle, pour ne rien laisser traîner.
import fs from 'node:fs'
import Stripe from 'stripe'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const cle = process.env.STRIPE_SECRET_KEY
if (!cle) { console.log('❌ STRIPE_SECRET_KEY absente de .env.local'); process.exit(1) }
const stripe = new Stripe(cle)
const OFFRE = { id: 'studio', label: 'Studio', prix: 59, credits: 250 }

async function essai(taxeAuto) {
  const params = {
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: `Presti — ${OFFRE.label}`, description: `${OFFRE.credits} crédits / mois` },
        unit_amount: Math.round(OFFRE.prix * 100),
        recurring: { interval: 'month' },
        ...(taxeAuto ? { tax_behavior: 'exclusive' } : {}),
      },
      quantity: 1,
    }],
    client_reference_id: '00000000-0000-4000-8000-000000000000',
    metadata: { uid: 'verification', plan: OFFRE.id, credits: String(OFFRE.credits) },
    subscription_data: { metadata: { uid: 'verification', plan: OFFRE.id } },
    allow_promotion_codes: true,
    success_url: 'https://prestiapp.fr/dashboard?abo=ok',
    cancel_url: 'https://prestiapp.fr/abonnement?abo=annule',
    ...(taxeAuto ? {
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
    } : {}),
  }
  try {
    const s = await stripe.checkout.sessions.create(params)
    console.log(`${taxeAuto ? 'AVEC' : 'SANS'} calcul de TVA : ✅ session acceptée`)
    console.log(`   montant annoncé : ${(s.amount_total ?? 0) / 100} € · TVA calculée à ce stade : ${(s.total_details?.amount_tax ?? 0) / 100} €`)
    if (taxeAuto) {
      console.log(`   calcul automatique : ${s.automatic_tax?.status ?? '?'} · adresse demandée : ${s.billing_address_collection} · numéro de TVA demandé : ${s.tax_id_collection?.enabled}`)
      console.log('   (la TVA vaut 0 tant que le client n’a pas donné son pays — c’est normal, elle est calculée à la saisie)')
    }
    await stripe.checkout.sessions.expire(s.id).catch(() => {})
    console.log('   session expirée, rien ne traîne')
    return true
  } catch (e) {
    console.log(`${taxeAuto ? 'AVEC' : 'SANS'} calcul de TVA : ❌ REFUSÉ — ${String(e.message).slice(0, 220)}`)
    return false
  }
}

console.log(`\nMode : ${cle.startsWith('sk_live') ? 'RÉEL' : 'test'} · offre témoin : ${OFFRE.label} à ${OFFRE.prix} € HT\n`)
const sans = await essai(false)
const avec = await essai(true)

console.log('')
if (avec) console.log('✅ STRIPE_TAXE_AUTO=1 peut être activé sans risque : le compte accepte le calcul automatique.')
else if (sans) console.log('⚠️  Laisse STRIPE_TAXE_AUTO à 0 : les paiements passeraient, mais SANS TVA. Le compte n’est pas prêt pour le calcul automatique.')
else console.log('❌ Même sans TVA la session est refusée : le paiement ne fonctionnerait pas du tout.')
process.exit(avec ? 0 : 1)
