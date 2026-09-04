// Vérifie la configuration Stripe de Presti, sans rien casser.
//
// Par défaut ce script ne fait que LIRE : il dit ce qui est en place, ce qui manque, et ce qui
// empêcherait un paiement d'aboutir. Rien n'est créé sans le demander explicitement.
//
//   node scripts/stripe-verifier.mjs                 → état des lieux
//   node scripts/stripe-verifier.mjs --creer-webhook → crée le point de terminaison manquant
//
// La clé est lue dans .env.local (STRIPE_SECRET_KEY) et n'est jamais affichée. Le secret de
// signature du webhook, lui, est écrit dans .stripe-webhook.local (ignoré par git) et jamais
// montré à l'écran : il sert à poser STRIPE_WEBHOOK_SECRET dans Vercel.
import fs from 'node:fs'
import Stripe from 'stripe'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const cle = process.env.STRIPE_SECRET_KEY
if (!cle) {
  console.log('❌ Aucune clé Stripe. Ajoute STRIPE_SECRET_KEY dans .env.local (commence par une clé de TEST : sk_test_…).')
  process.exit(1)
}
const mode = cle.startsWith('sk_live') ? 'RÉEL' : cle.startsWith('sk_test') ? 'test' : 'inconnu'
const stripe = new Stripe(cle)
const CREER = process.argv.includes('--creer-webhook')
const URL_WEBHOOK = 'https://prestiapp.fr/api/stripe/webhook'
// Les deux seuls événements que le code traite (app/api/stripe/webhook/route.ts).
const EVENEMENTS = ['checkout.session.completed', 'customer.subscription.deleted']

const aFaire = []
console.log(`\nMode : ${mode}${mode === 'RÉEL' ? '  ⚠️  les opérations engagent de vrais paiements' : ''}`)

// ── Le compte
try {
  const c = await stripe.accounts.retrieve()
  console.log(`Compte : ${c.business_profile?.name || c.settings?.dashboard?.display_name || c.id} · pays ${c.country || '?'}`)
  if (!c.charges_enabled) aFaire.push('Le compte ne peut pas encore encaisser : termine la vérification d’identité dans le tableau de bord Stripe.')
  if (!c.payouts_enabled) aFaire.push('Les virements ne sont pas activés : ajoute ton compte bancaire dans Stripe.')
} catch (e) {
  console.log('❌ Clé refusée :', String(e.message).slice(0, 120))
  process.exit(1)
}

// ── La TVA
try {
  const t = await stripe.tax.settings.retrieve()
  const statut = t.status
  const codeDefaut = t.defaults?.tax_code || null
  const comportement = t.defaults?.tax_behavior || null
  const siege = t.head_office?.address?.country || null
  console.log(`Stripe Tax : ${statut}${siege ? ` · siège ${siege}` : ''}${codeDefaut ? ` · code produit par défaut ${codeDefaut}` : ''}${comportement ? ` · ${comportement}` : ''}`)
  if (statut !== 'active') aFaire.push('Stripe Tax n’est pas actif : renseigne l’adresse d’origine dans Tableau de bord → Paramètres → Taxes, sinon le calcul automatique fera ÉCHOUER les paiements.')
  if (!siege) aFaire.push('Aucune adresse de siège dans Stripe Tax : sans elle, aucun taux ne peut être déterminé.')
  if (!codeDefaut) aFaire.push('Aucun code produit par défaut : choisis la catégorie « logiciel en abonnement » (SaaS) dans les paramètres de taxe.')

  const regs = await stripe.tax.registrations.list({ status: 'active', limit: 20 })
  if (!regs.data.length) {
    aFaire.push('Aucune immatriculation à la TVA active. C’est une DÉCLARATION LÉGALE sur ton activité : à faire toi-même dans Stripe (Taxes → Immatriculations). Sans elle, aucune TVA n’est collectée.')
  } else {
    console.log(`Immatriculations actives : ${regs.data.map((r) => `${r.country}${r.country_options ? '' : ''}`).join(', ')}`)
  }
} catch (e) {
  console.log('Stripe Tax : illisible —', String(e.message).slice(0, 100))
  aFaire.push('Stripe Tax semble indisponible sur ce compte : vérifie qu’il est activé.')
}

// ── Le webhook
try {
  const eps = await stripe.webhookEndpoints.list({ limit: 100 })
  const mien = eps.data.find((e) => e.url === URL_WEBHOOK)
  if (!mien) {
    console.log(`Webhook ${URL_WEBHOOK} : ABSENT`)
    if (CREER) {
      const cree = await stripe.webhookEndpoints.create({
        url: URL_WEBHOOK, enabled_events: EVENEMENTS,
        description: 'Presti — abonnements (créé par scripts/stripe-verifier.mjs)',
      })
      fs.writeFileSync('.stripe-webhook.local', `# Secret de signature — à poser dans Vercel sous STRIPE_WEBHOOK_SECRET\nSTRIPE_WEBHOOK_SECRET=${cree.secret}\n`)
      console.log('✅ Point de terminaison créé. Le secret est dans .stripe-webhook.local (ignoré par git) — recopie-le dans Vercel.')
    } else {
      aFaire.push(`Point de terminaison webhook absent. Relance avec --creer-webhook, ou crée-le à la main sur ${URL_WEBHOOK} avec les événements : ${EVENEMENTS.join(', ')}.`)
    }
  } else {
    const manquants = EVENEMENTS.filter((e) => !mien.enabled_events.includes(e) && !mien.enabled_events.includes('*'))
    console.log(`Webhook ${URL_WEBHOOK} : présent (${mien.status})${manquants.length ? ` — événements manquants : ${manquants.join(', ')}` : ' — événements complets'}`)
    if (mien.status !== 'enabled') aFaire.push('Le point de terminaison webhook existe mais il est désactivé.')
    if (manquants.length) aFaire.push(`Ajoute ces événements au webhook : ${manquants.join(', ')} — sans eux, un abonnement payé ne débloque pas le compte.`)
  }
} catch (e) {
  console.log('Webhook : illisible —', String(e.message).slice(0, 100))
}

// ── Ce que le code attend
if (!process.env.STRIPE_WEBHOOK_SECRET) aFaire.push('STRIPE_WEBHOOK_SECRET absent de l’environnement : le webhook sera refusé (signature invérifiable).')
if (process.env.STRIPE_TAXE_AUTO === '1') console.log('Calcul automatique de la TVA : DEMANDÉ par le code (STRIPE_TAXE_AUTO=1)')
else aFaire.push('STRIPE_TAXE_AUTO n’est pas à 1 : les paiements passeront SANS TVA. À lever une fois Stripe Tax actif et immatriculé — pas avant, sinon les paiements échouent.')

console.log(aFaire.length ? `\n${aFaire.length} chose(s) à régler :` : '\n✅ Rien à signaler : la configuration est complète.')
aFaire.forEach((x, i) => console.log(`  ${i + 1}. ${x}`))
process.exit(0)
