// ⚠️ DANGER — ce script SUPPRIME et recrée le webhook Stripe de PRODUCTION et écrit dans Vercel.
// Il n'a plus d'usage courant (stripe-verifier.mjs contrôle l'existant). Il refuse de tourner sans
// l'argument --je-sais-ce-que-je-fais (audit final, auditeur H).
if (!process.argv.includes('--je-sais-ce-que-je-fais')) { console.error('Refus : ce script détruit le webhook de prod. Relancez avec --je-sais-ce-que-je-fais si c’est voulu.'); process.exit(2) }
// Crée l'endpoint webhook Stripe et pose STRIPE_WEBHOOK_SECRET dans Vercel — tout via API.
// Lit VERCEL_TOKEN depuis .env.local ; récupère STRIPE_SECRET_KEY depuis Vercel.
import fs from 'fs'
import Stripe from 'stripe'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const TOKEN = env.VERCEL_TOKEN
const PROJECT = 'prj_ysYhXsHolWZFCm9wTy0tSUTwer1I'
const HOOK_URL = 'https://prestiapp.fr/api/stripe/webhook'
if (!TOKEN) { console.error('VERCEL_TOKEN manquant'); process.exit(1) }

const vapi = (path, opts = {}) => fetch(`https://api.vercel.com${path}`, { ...opts, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } })

// 1) récupérer STRIPE_SECRET_KEY (déchiffrée) depuis Vercel
const list = await (await vapi(`/v10/projects/${PROJECT}/env`)).json()
const envs = list.envs || []
console.log('variables Vercel :', envs.map((e) => e.key).join(', '))
const skEnv = envs.find((e) => e.key === 'STRIPE_SECRET_KEY')
if (!skEnv) { console.error('❌ STRIPE_SECRET_KEY absente du projet Vercel.'); process.exit(1) }
const skDetail = await (await vapi(`/v9/projects/${PROJECT}/env/${skEnv.id}`)).json()
const sk = skDetail.value || skEnv.value
if (!sk) { console.error('❌ valeur STRIPE_SECRET_KEY non déchiffrable via le token.'); process.exit(1) }
console.log('clé Stripe récupérée depuis Vercel (', sk.slice(0, 7), '…)')

// 2) créer l'endpoint webhook (recrée si déjà présent — le secret n'est visible qu'à la création)
const stripe = new Stripe(sk)
const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === HOOK_URL)
if (existing) { await stripe.webhookEndpoints.del(existing.id); console.log('ancien endpoint supprimé', existing.id) }
const wh = await stripe.webhookEndpoints.create({ url: HOOK_URL, enabled_events: ['checkout.session.completed', 'customer.subscription.deleted', 'customer.subscription.updated'] })
console.log('✅ webhook Stripe créé', wh.id)

// 3) poser STRIPE_WEBHOOK_SECRET dans Vercel
const old = envs.find((e) => e.key === 'STRIPE_WEBHOOK_SECRET')
if (old) { await vapi(`/v10/projects/${PROJECT}/env/${old.id}`, { method: 'DELETE' }); console.log('ancien STRIPE_WEBHOOK_SECRET retiré') }
const add = await vapi(`/v10/projects/${PROJECT}/env`, { method: 'POST', body: JSON.stringify({ key: 'STRIPE_WEBHOOK_SECRET', value: wh.secret, type: 'encrypted', target: ['production', 'preview', 'development'] }) })
if (!add.ok) { console.error('❌ ajout Vercel échoué', add.status, (await add.text()).slice(0, 200)); process.exit(1) }
console.log('✅ STRIPE_WEBHOOK_SECRET ajouté dans Vercel (', wh.secret.slice(0, 10), '…) — redeploy requis.')
