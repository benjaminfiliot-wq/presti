// Suite de tests bout-en-bout de Presti (production).
// Crée un compte fondateur temporaire, teste routes + endpoints + flux devis, nettoie tout.
// Usage : node scripts/smoke-test.mjs
import fs from 'fs'
import { verifierSessionTest } from './lib/connexion-test.mjs'

// L'ancien poste de contrôle (`/api/control/*`) a été SUPPRIMÉ le 07/09 : sa garde lisait la
// colonne `is_founder` au lieu de la fonction, et un partenaire y lisait les prospects de tous les
// artisans. Ce que ce script vérifiait ici se vérifie désormais sur `/api/controle/*`.
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
  globalThis.__smokeUid = uid // le ménage du `finally` doit le connaître même si la suite s'arrête ici
  await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: uid, email, nom: 'Smoke Test', metier: 'Plombier', ton_style: 'pro', slug: `smoke-${rnd}`, plan: 'business', is_founder: true, tva_regime: 'franchise' }) })
  const tok = await (await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()
  await verifierSessionTest(tok.access_token)
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok.access_token}` }
  check('login fondateur', !!tok.access_token)

  // 4) Endpoints du poste de contrôle (fondateur)

  // 5) Sécurité : sans token → refusé
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

  // 7) White-label (M10) : aucune mention « presti » dans le HTML servi de /site et /l,
  //    hors les URLs d'hébergement (prestiapp.fr / *.vercel.app) qui sont techniques et
  //    disparaîtront avec le domaine perso (G2).
  await rest(`artisans?id=eq.${uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ site_active: true, site_seo: true }) })
  await new Promise((r) => setTimeout(r, 800))
  for (const path of [`/site/smoke-${rnd}`, `/p/smoke-${rnd}`]) {
    const html = await (await fetch(`${PROD}${path}`)).text()
    const leaked = (html.replace(/prestiapp\.fr/gi, '').replace(/presti-[a-z0-9-]+\.vercel\.app/gi, '').match(/presti/gi) || []).length
    check(`white-label ${path} (0 « presti » hors URL)`, leaked === 0, leaked ? `${leaked} occurrence(s)` : 'propre')
  }

  // nettoyage
  await admin(`users/${uid}`, { method: 'DELETE' })

  console.log(`\n=== ${pass} réussis, ${fail} échoués ===`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error('Erreur suite de tests:', e); process.exit(1) })
