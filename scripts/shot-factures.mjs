// Capture la page /factures avec une vraie facture (compte test jetable).
import { chromium } from 'playwright'
import fs from 'fs'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/shots'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const st = Date.now(), email = `facshot.${st}@example.com`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Dupont Plomberie', metier: 'Plombier', ton_style: 'pro', slug: `facshot-${st}`, plan: 'business', tva_regime: 'franchise', forme_juridique: 'EI', siret: '55203253400646', adresse: '12 rue des Lilas', code_postal: '17230', ville: 'Marans', assurance_nom: 'AXA France IARD', assurance_contrat: 'DEC-1001' }) })
const tok = (await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()).access_token
await verifierSessionTest(tok)
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }
const dev = await (await fetch(`${APP}/api/devis`, { method: 'POST', headers: H, body: JSON.stringify({ objet: 'Rénovation salle d\'eau', client_nom: 'Marie Lefèvre', lignes: [{ designation: 'Pose chauffe-eau 200 L', quantite: 1, unite: 'u', prix_unitaire_ht: 620, tva_taux: 10 }, { designation: 'Groupe de sécurité', quantite: 1, unite: 'u', prix_unitaire_ht: 84, tva_taux: 10 }] }) })).json()
await fetch(`${APP}/api/factures`, { method: 'POST', headers: H, body: JSON.stringify({ devis_id: dev.id }) })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(APP + '/login', { waitUntil: 'load' })
await page.fill('input[type=email]', email); await page.fill('input[type=password]', pw)
await page.click('button[type="submit"], form button:not(.pw-eye)')
await page.waitForTimeout(3000)
await page.goto(APP + '/factures', { waitUntil: 'load' }); await page.waitForTimeout(1800)
await page.screenshot({ path: `${OUT}/app-factures.png` }); console.log('shot app-factures')
await browser.close()
await admin(`users/${u.id}`, { method: 'DELETE' })
console.log('OK — nettoyé')
