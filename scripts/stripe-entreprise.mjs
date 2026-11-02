// scripts/stripe-entreprise.mjs — l'offre « Presti pour l'entreprise » chez Stripe (02/11/2026, contre-audit 032-004 D4 ; Benj : « il n'y a
// pas de prix dédié, le prix est modifié avec le temps… c'est un sur mesure, je te laisse gérer »).
//
// Ce que le script pose, une fois (idempotent, retrouvé par sa métadonnée) :
//  • le PRODUIT « Presti pour l'entreprise », metadata plan = entreprise, SANS prix fixe : chaque contrat a son prix, sur devis ;
//  • un PORTAIL de facturation propre aux contrats Entreprise : moyen de paiement, factures et coordonnées, mais ni changement d'offre ni
//    résiliation en libre-service (un contrat se modifie avec Benj). Son identifiant va dans STRIPE_PORTAIL_ENTREPRISE (.env.local et
//    Vercel), lu par app/api/stripe/portail/route.ts pour un compte en offre Entreprise.
// lib/abonnementSync.ts reconnaît l'Entreprise par ce produit (ou par la métadonnée du prix) : un prix neuf sur ce produit, à n'importe quel
// montant, reste l'Entreprise ; un changement vers Studio ou Signature change de produit, donc d'offre.
//
// Usage :
//   node scripts/stripe-entreprise.mjs --voir                               lecture seule : produit, prix, portails
//   node scripts/stripe-entreprise.mjs                                      pose le produit et le portail, écrit la variable
//   node scripts/stripe-entreprise.mjs --prix=249 --client="Nom du client"  crée un prix mensuel de 249 € HT sur le produit (aucun prélèvement)
//   node scripts/stripe-entreprise.mjs --changer=sub_… --prix=299           À BLANC : dit ce qui changerait sur ce contrat
//   node scripts/stripe-entreprise.mjs --changer=sub_… --prix=299 --oui     change le prix du contrat, sans prorata (au prochain cycle)
// Créer ou changer l'abonnement d'un client touche à son argent : seulement sur le « go » écrit de Benj, contrat par contrat.
// La clé lue est STRIPE_SECRET_KEY (.env.local) : en live, tout est réel. Jamais une valeur de clé affichée.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import Stripe from 'stripe'

for (const l of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const cle = process.env.STRIPE_SECRET_KEY
if (!cle) { console.error('✗ STRIPE_SECRET_KEY absente de .env.local'); process.exit(2) }
const stripe = new Stripe(cle)
const mode = cle.startsWith('sk_live') || cle.startsWith('rk_live') ? 'LIVE' : 'test'
const arg = (nom) => { const a = process.argv.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : null }
const VOIR = process.argv.includes('--voir')
const OUI = process.argv.includes('--oui')
const BASE = 'https://prestiapp.fr'

const euros = (s) => { const n = Number(String(s ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 && n < 100_000 ? Math.round(n * 100) : null }

// La LISTE des produits, pas la recherche : l'index de recherche de Stripe a jusqu'à une minute de retard, et un second passage juste
// après la création aurait créé un doublon (vu le 02/11).
async function produitEntreprise() {
  for await (const p of stripe.products.list({ active: true, limit: 100 })) if (p.metadata?.presti === 'entreprise') return p
  return null
}
async function portailEntreprise() {
  for await (const c of stripe.billingPortal.configurations.list({ limit: 100 })) if (c.metadata?.presti === 'portail_entreprise' && c.active) return c
  return null
}

let produit = await produitEntreprise()
let portail = await portailEntreprise()
console.log(`Stripe (${mode}) — produit Entreprise : ${produit ? `${produit.id} « ${produit.name} »` : 'absent'} ; portail Entreprise : ${portail ? portail.id : 'absent'}`)
if (produit) {
  const prix = await stripe.prices.list({ product: produit.id, active: true, limit: 20 })
  for (const p of prix.data) console.log(`  · prix ${p.id} : ${(p.unit_amount ?? 0) / 100} € / ${p.recurring?.interval ?? 'une fois'}${p.nickname ? ` — ${p.nickname}` : ''}`)
  if (!prix.data.length) console.log('  · aucun prix : chaque contrat a le sien (--prix=…)')
}
if (VOIR) {
  for await (const c of stripe.billingPortal.configurations.list({ limit: 100 })) {
    const u = c.features?.subscription_update
    console.log(`  portail ${c.id}${c.is_default ? ' (par défaut)' : ''}${c.active ? '' : ' (inactif)'} : changement d'offre ${u?.enabled ? `ouvert (${(u.products ?? []).map((x) => x.product).join(', ') || 'aucun produit'})` : 'fermé'}, résiliation ${c.features?.subscription_cancel?.enabled ? 'ouverte' : 'fermée'}`)
  }
  process.exit(0)
}

// ── Changer le prix d'un contrat (à blanc sans --oui) ──
const changer = arg('changer')
if (changer) {
  const montant = euros(arg('prix'))
  if (!montant) { console.error('✗ --prix=<euros> attendu (par mois, HT)'); process.exit(2) }
  if (!produit) { console.error('✗ le produit Entreprise n’existe pas encore : lancer d’abord le script sans option'); process.exit(2) }
  const sub = await stripe.subscriptions.retrieve(changer)
  const item = sub.items.data[0]
  const actuel = item?.price
  const produitActuel = typeof actuel?.product === 'string' ? actuel.product : actuel?.product?.id
  if (produitActuel !== produit.id) { console.error(`✗ ${changer} n’est pas un contrat Entreprise (produit ${produitActuel}) : rien n’est touché`); process.exit(2) }
  console.log(`contrat ${sub.id} (${sub.status}) : ${(actuel?.unit_amount ?? 0) / 100} € → ${montant / 100} € par mois, sans prorata (au prochain cycle)`)
  if (!OUI) { console.log('À BLANC : rien n’a changé. Ajouter --oui, sur le « go » écrit de Benj.'); process.exit(0) }
  const neuf = await stripe.prices.create({ product: produit.id, currency: 'eur', unit_amount: montant, recurring: { interval: 'month' }, nickname: `Entreprise — ${sub.id} — ${montant / 100} €/mois`, metadata: { presti: 'entreprise', plan: 'entreprise' } })
  await stripe.subscriptions.update(sub.id, { items: [{ id: item.id, price: neuf.id }], proration_behavior: 'none' })
  console.log(`✓ contrat ${sub.id} : prix ${neuf.id} (${montant / 100} €/mois) au prochain cycle`)
  process.exit(0)
}

// ── Le produit et le portail (une fois) ──
if (!produit) {
  produit = await stripe.products.create({
    name: 'Presti pour l’entreprise',
    description: 'Offre sur mesure : votre équipe, vos outils, vos automatisations. Prix sur devis, propre à chaque contrat. TVA non applicable, art. 293 B du CGI.',
    metadata: { presti: 'entreprise', plan: 'entreprise' },
    statement_descriptor: 'PRESTI ENTREPRISE',
  })
  console.log(`✓ produit créé (${mode}) : ${produit.id}`)
}
if (!portail) {
  portail = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Presti pour l’entreprise — votre contrat', privacy_policy_url: `${BASE}/confidentialite`, terms_of_service_url: `${BASE}/cgu` },
    features: {
      customer_update: { enabled: true, allowed_updates: ['email', 'address', 'name', 'tax_id'] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    },
    default_return_url: `${BASE}/parametres?onglet=abonnement`,
    metadata: { presti: 'portail_entreprise' },
  })
  console.log(`✓ portail Entreprise créé (${mode}) : ${portail.id} — ni changement d’offre ni résiliation en libre-service`)
}

// ── Un prix de contrat (aucun prélèvement : le prix existe, l'abonnement se crée sur le « go » de Benj) ──
const montant = euros(arg('prix'))
if (montant) {
  const client = (arg('client') ?? '').slice(0, 60)
  const p = await stripe.prices.create({ product: produit.id, currency: 'eur', unit_amount: montant, recurring: { interval: 'month' }, nickname: `Entreprise${client ? ` — ${client}` : ''} — ${montant / 100} €/mois`, metadata: { presti: 'entreprise', plan: 'entreprise' } })
  console.log(`✓ prix de contrat créé : ${p.id} (${montant / 100} € HT par mois) — à mettre sur l’abonnement du client, sur le « go » de Benj`)
}

// .env.local : la seule ligne STRIPE_PORTAIL_ENTREPRISE est posée ou remplacée.
const env = fs.readFileSync('.env.local', 'utf8')
const ligne = `STRIPE_PORTAIL_ENTREPRISE=${portail.id}`
if (!env.includes(ligne)) {
  fs.writeFileSync('.env.local', /^STRIPE_PORTAIL_ENTREPRISE=.*$/m.test(env) ? env.replace(/^STRIPE_PORTAIL_ENTREPRISE=.*$/m, ligne) : env.replace(/\s*$/, '\n') + ligne + '\n')
  console.log('✓ .env.local : STRIPE_PORTAIL_ENTREPRISE posée')
  try { execFileSync(process.execPath, ['scripts/vercel-variables.mjs', 'STRIPE_PORTAIL_ENTREPRISE'], { stdio: 'inherit' }) } catch (e) { console.error(`✗ Vercel : ${e.message} — poser STRIPE_PORTAIL_ENTREPRISE à la main`) }
} else console.log('· .env.local : STRIPE_PORTAIL_ENTREPRISE déjà à jour')
console.log(`\nProduit ${produit.id} · portail ${portail.id} (${mode}). Un déploiement est nécessaire pour que Vercel lise la variable.`)
