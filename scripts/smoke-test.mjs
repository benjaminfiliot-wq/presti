// Suite de tests bout-en-bout de Presti (production).
// Crée un compte fondateur temporaire, teste routes + endpoints + flux devis, nettoie tout.
// Usage : node scripts/smoke-test.mjs
import fs from 'fs'

const PROD = process.env.PRESTI_URL || 'https://presti-ashen.vercel.app'
const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter(Boolean)
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const admin = (p, o = {}) => fetch(`${SB_URL}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB_URL}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

let pass = 0, fail = 0
const check = (name, ok, info = '') => { console.log(`${ok ? '✅' : '❌'} ${name}${info ? ` — ${info}` : ''}`); ok ? pass++ : fail++ }

async function main() {
  // 0) nettoyage d'anciens comptes de test
  const list = await (await admin('users?per_page=200')).json()
  for (const u of list.users || []) if ((u.email || '').includes('smoke.test')) await admin(`users/${u.id}`, { method: 'DELETE' })

  // 1) Routes publiques → 200
  for (const r of ['/', '/login', '/signup', '/faq', '/cgu', '/confidentialite', '/mentions-legales']) {
    const res = await fetch(`${PROD}${r}`)
    check(`route ${r}`, res.status === 200, `HTTP ${res.status}`)
  }

  // 2) Données structurées (SEO / rich results)
  const faqHtml = await (await fetch(`${PROD}/faq`)).text()
  check('schema FAQPage sur /faq', faqHtml.includes('FAQPage'))
  const home = await (await fetch(`${PROD}/`)).text()
  check('schema SoftwareApplication sur /', home.includes('SoftwareApplication'))

  // 3) Compte fondateur temporaire
  const rnd = Math.floor(Math.random() * 1e6)
  const email = `smoke.test.${rnd}@example.com`, pw = 'Smoke123456!'
  const created = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
  const uid = created.id
  await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: uid, email, nom: 'Smoke Test', metier: 'Plombier', ton_style: 'pro', slug: `smoke-${rnd}`, plan: 'business', is_founder: true, tva_regime: 'franchise' }) })
  const tok = await (await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok.access_token}` }
  check('login fondateur', !!tok.access_token)

  // 4) Endpoints du poste de contrôle (fondateur)
  const stats = await (await fetch(`${PROD}/api/control/stats`, { headers: H })).json()
  check('/api/control/stats', typeof stats.revenus === 'object' && typeof stats.leads === 'object')
  const stripe = await (await fetch(`${PROD}/api/control/stripe`, { headers: H })).json()
  check('/api/control/stripe (Stripe branché)', stripe.configured === true, stripe.error || '')
  const inbox = await (await fetch(`${PROD}/api/control/inbox`, { headers: H })).json()
  check('/api/control/inbox (Gmail branché)', inbox.configured === true, inbox.error || '')

  // 5) Sécurité : sans token → refusé
  const noAuth = await fetch(`${PROD}/api/control/stats`)
  check('control/stats refuse sans token', noAuth.status === 401)

  // 6) Flux devis : créer → PDF → paiement Stripe → nettoyer
  const dev = await (await fetch(`${PROD}/api/devis`, { method: 'POST', headers: H, body: JSON.stringify({ objet: 'Smoke', client_nom: 'Test', lignes: [{ designation: 'Test', quantite: 1, unite: 'u', prix_unitaire_ht: 100, tva_taux: 10 }] }) })).json()
  check('création devis', !!dev.id, dev.numero || dev.error || '')
  if (dev.id) {
    const pdf = await fetch(`${PROD}/api/devis/${dev.id}/pdf`, { headers: { Authorization: `Bearer ${tok.access_token}` } })
    const sig = Buffer.from(await pdf.arrayBuffer()).slice(0, 5).toString('latin1')
    check('PDF devis', pdf.status === 200 && sig === '%PDF-', `HTTP ${pdf.status}`)
    const pay = await (await fetch(`${PROD}/api/devis/${dev.id}/payer`, { method: 'POST', headers: H })).json()
    check('lien de paiement Stripe', typeof pay.url === 'string' && pay.url.includes('checkout.stripe.com'), pay.error || '')
    await rest(`devis?id=eq.${dev.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
  }

  // nettoyage
  await admin(`users/${uid}`, { method: 'DELETE' })

  console.log(`\n=== ${pass} réussis, ${fail} échoués ===`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error('Erreur suite de tests:', e); process.exit(1) })
