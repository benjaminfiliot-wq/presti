// Capture l'espace connecté (login + pages authentifiées) via un compte test jetable.
import { chromium } from 'playwright'
import fs from 'fs'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const url = process.argv[2] || 'http://localhost:3000'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/shots'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const stamp = Date.now()
const email = `apptest.${stamp}@example.com`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Jean Dupont', metier: 'Plombier', ton_style: 'pro', slug: `apptest-${stamp}`, plan: 'business', tva_regime: 'franchise' }) })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const shot = async (name, path, wait = 1200) => { await page.goto(url + path, { waitUntil: 'load' }); await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name) }

await shot('app-login', '/login', 800)
await shot('app-signup', '/signup', 600)
// connexion
await page.goto(url + '/login', { waitUntil: 'load' })
await page.fill('input[type=email]', email)
await page.fill('input[type=password]', pw)
await page.click('button[type="submit"], form button:not(.pw-eye)')
await codeEmailSiDemande(page, email)
await page.waitForTimeout(2800)
await shot('app-dashboard', '/dashboard', 1600)
await shot('app-abonnement', '/abonnement', 1600)
await browser.close()
await admin(`users/${u.id}`, { method: 'DELETE' })
console.log('OK — compte test nettoyé', email)
