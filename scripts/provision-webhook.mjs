// Provisionne STRIPE_WEBHOOK_SECRET : crée un fondateur temp, appelle l'endpoint de setup
// (qui a la clé Stripe au runtime), récupère le secret, et le pose dans Vercel. Nettoie tout.
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, VT = env.VERCEL_TOKEN
const PROJECT = 'prj_ysYhXsHolWZFCm9wTy0tSUTwer1I'
const APP = 'https://prestiapp.fr'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const vapi = (path, o = {}) => fetch(`https://api.vercel.com${path}`, { ...o, headers: { Authorization: `Bearer ${VT}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const st = Date.now(), email = `whsetup.${st}@example.com`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'WH Setup', metier: 'Plombier', ton_style: 'pro', slug: `whsetup-${st}`, plan: 'business', is_founder: true }) })
const tok = (await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()).access_token

const r = await fetch(`${APP}/api/control/stripe-webhook`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } })
const d = await r.json().catch(() => ({}))
if (!d.secret) { console.error('❌ pas de secret :', r.status, JSON.stringify(d).slice(0, 200)); await admin(`users/${u.id}`, { method: 'DELETE' }); process.exit(1) }
console.log('✅ webhook Stripe créé', d.id)

const list = await (await vapi(`/v10/projects/${PROJECT}/env`)).json()
const old = (list.envs || []).find((e) => e.key === 'STRIPE_WEBHOOK_SECRET')
if (old) await vapi(`/v10/projects/${PROJECT}/env/${old.id}`, { method: 'DELETE' })
const add = await vapi(`/v10/projects/${PROJECT}/env`, { method: 'POST', body: JSON.stringify({ key: 'STRIPE_WEBHOOK_SECRET', value: d.secret, type: 'encrypted', target: ['production', 'preview', 'development'] }) })
console.log(add.ok ? `✅ STRIPE_WEBHOOK_SECRET posé dans Vercel (${d.secret.slice(0, 10)}…) — redeploy requis` : '❌ ajout Vercel échoué ' + add.status)
await admin(`users/${u.id}`, { method: 'DELETE' })
