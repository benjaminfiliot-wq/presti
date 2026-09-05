// Reproduit le bug facture sur la PROD : accès à /factures + annulation. Capture erreurs console.
import fs from 'fs'
import { chromium } from 'playwright'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const BASE = 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/prodfact'
fs.mkdirSync(OUT, { recursive: true })
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })

const st = Date.now(), email = `pf.${st}@example.com`, pass = 'Test123456!'
const u = await (await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email, password: pass, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Dupont Plomberie', metier: 'Plombier', ton_style: 'pro', slug: `pf-${st}`, tva_regime: 'franchise' }) })
const fac = (await (await rest('factures?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, numero: 'FAC-2026-0099', objet: 'Test annulation', client_nom: 'Marie Lefèvre', statut: 'emise', total_ttc: 968, date_echeance: '2026-09-27' }) })).json())[0]
const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) })).json()
await verifierSessionTest(sess.access_token)
const ref = SB.match(/https:\/\/([^.]+)\./)[1]

const b = await chromium.launch()
const pg = await b.newPage({ viewport: { width: 1280, height: 860 } })
const errs = []
pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
pg.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 200)))

await pg.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await pg.evaluate(([k, v]) => localStorage.setItem(k, v), [`sb-${ref}-auth-token`, JSON.stringify(sess)])
await pg.goto(`${BASE}/factures`, { waitUntil: 'domcontentloaded' })
await pg.waitForTimeout(3500)
console.log('url =', pg.url())
await pg.screenshot({ path: `${OUT}/factures.png`, fullPage: true })
const bodyLen = (await pg.evaluate(() => document.body.innerText || '')).length
console.log('texte visible (longueur):', bodyLen)
// tenter l'annulation
let annulResult = 'bouton Annuler introuvable'
try {
  pg.on('dialog', (d) => d.accept()) // accepte le confirm()
  const btn = pg.locator('button:has-text("Annuler")').first()
  if (await btn.count()) { await btn.click(); await pg.waitForTimeout(3000); annulResult = 'cliqué' }
} catch (e) { annulResult = 'err: ' + e.message.slice(0, 80) }
const after = (await (await rest(`factures?id=eq.${fac.id}&select=statut`)).json())[0]
console.log('annulation:', annulResult, '| statut en base après:', after?.statut)
console.log('ERREURS CONSOLE:', errs.length ? JSON.stringify(errs, null, 1) : 'aucune')

await b.close()
await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H })
console.log('OUT', OUT)
