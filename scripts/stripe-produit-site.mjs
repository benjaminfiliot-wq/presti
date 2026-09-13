// scripts/stripe-produit-site.mjs — crée UNE fois le produit Stripe « Presti — Site à la demande » et son prix unique
// (300 €, TVA non applicable — franchise en base, art. 293 B), pose STRIPE_PRIX_SITE dans .env.local et sur Vercel
// (v15 §6, H1 — décision de Benj du 13/09 : « je te laisse la main »).
//
// Idempotent : si un produit portant metadata presti=site_a_la_demande existe déjà, on réutilise son prix actif.
// La clé lue est STRIPE_SECRET_KEY (.env.local) : en live, le produit est réel. Jamais de valeur affichée.
//
// Usage : node scripts/stripe-produit-site.mjs           (crée ou retrouve, écrit .env.local, pousse sur Vercel)
//         node scripts/stripe-produit-site.mjs --voir     (lecture seule : ce qui existe)
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import Stripe from 'stripe'

for (const l of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const cle = process.env.STRIPE_SECRET_KEY
if (!cle) { console.error('✗ STRIPE_SECRET_KEY absente de .env.local'); process.exit(2) }
const VOIR = process.argv.includes('--voir')
const stripe = new Stripe(cle)
const mode = cle.startsWith('sk_live') || cle.startsWith('rk_live') ? 'LIVE' : 'test'
const PRIX_CENTS = 30000

const existants = await stripe.products.search({ query: "metadata['presti']:'site_a_la_demande'", limit: 3 })
let produit = existants.data.find((p) => p.active) ?? null
let prix = null
if (produit) {
  const prixListe = await stripe.prices.list({ product: produit.id, active: true, limit: 5 })
  prix = prixListe.data.find((p) => p.type === 'one_time' && p.unit_amount === PRIX_CENTS && p.currency === 'eur') ?? null
  console.log(`produit existant (${mode}) : ${produit.id} — ${produit.name}${prix ? ` · prix ${prix.id} (${prix.unit_amount / 100} €)` : ' · aucun prix unique à 300 € actif'}`)
} else console.log(`aucun produit « site à la demande » (${mode})`)
if (VOIR) process.exit(0)

if (!produit) {
  produit = await stripe.products.create({
    name: 'Presti — Site à la demande',
    description: 'Site professionnel avec référencement local, livré après validation. Une fois, sans abonnement. TVA non applicable, art. 293 B du CGI.',
    metadata: { presti: 'site_a_la_demande', version: 'v15' },
    statement_descriptor: 'PRESTI SITE',
  })
  console.log(`✓ produit créé (${mode}) : ${produit.id}`)
}
if (!prix) {
  prix = await stripe.prices.create({ product: produit.id, currency: 'eur', unit_amount: PRIX_CENTS, nickname: 'Site à la demande — 300 € une fois', metadata: { presti: 'site_a_la_demande' } })
  console.log(`✓ prix créé : ${prix.id} (${PRIX_CENTS / 100} €, une fois)`)
}

// .env.local : la ligne STRIPE_PRIX_SITE est posée ou remplacée — jamais une autre ligne touchée.
const env = fs.readFileSync('.env.local', 'utf8')
const ligne = `STRIPE_PRIX_SITE=${prix.id}`
const nouveau = /^STRIPE_PRIX_SITE=.*$/m.test(env) ? env.replace(/^STRIPE_PRIX_SITE=.*$/m, ligne) : env.replace(/\s*$/, '\n') + ligne + '\n'
fs.writeFileSync('.env.local', nouveau)
console.log('✓ .env.local : STRIPE_PRIX_SITE posée')
try {
  execFileSync(process.execPath, ['scripts/vercel-variables.mjs', 'STRIPE_PRIX_SITE'], { stdio: 'inherit' })
} catch (e) { console.error(`✗ Vercel : ${e.message} — poser STRIPE_PRIX_SITE à la main dans le projet`) }
console.log(`\nProduit ${produit.id} · prix ${prix.id} · ${PRIX_CENTS / 100} € une fois (${mode}). Un déploiement est nécessaire pour que Vercel lise la variable.`)
