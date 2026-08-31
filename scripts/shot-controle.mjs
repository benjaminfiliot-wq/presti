// Capture le poste de contrôle /controle (coentreprise d'agents) avec un fondateur test.
import { chromium } from 'playwright'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'http://localhost:3400'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const st = Date.now(), email = `ctlshot.${st}@example.com`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Fondateur', metier: 'Plombier', slug: `ctlshot-${st}`, plan: 'business', is_founder: true }) })
const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()
const ref = SB.replace(/^https?:\/\//, '').split('.')[0]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } })
await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v) } catch {} }, [`sb-${ref}-auth-token`, JSON.stringify(sess)])
await page.goto(APP + '/controle', { waitUntil: 'load' }); await page.waitForTimeout(2600)
// Lance l'agent Données pour montrer un bilan en direct
try { await page.click('text=Données >> xpath=following::button[1]', { timeout: 2000 }) } catch {}
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/controle-agents.png`, fullPage: true }); console.log('shot controle-agents')
await browser.close()
await admin(`users/${u.id}`, { method: 'DELETE' })
console.log('OK — nettoyé')
