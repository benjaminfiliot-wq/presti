// Test authentifié du vrai flux facturation : login → devis → chiffrage → facture → /factures.
import fs from 'fs'
import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/fact'
fs.mkdirSync(OUT, { recursive: true })
const env = Object.fromEntries(fs.readFileSync('C:/Users/benja/Documents/presti/.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }

const st = Date.now(), email = `fact.${st}@example.com`, pass = 'Test123456!'
const u = await (await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email, password: pass, email_confirm: true }) })).json()
await fetch(`${SB}/rest/v1/artisans`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Dupont Plomberie', metier: 'Plombier', ton_style: 'pro', slug: `fact-${st}`, tva_regime: 'reel', iban: 'FR76 3000 4000 0512 3456 7890 143', siret: '123 456 789 00012', adresse: '12 rue des Lilas', code_postal: '17230', ville: 'Marans', forme_juridique: 'SARL', assurance_nom: 'AXA France IARD', assurance_contrat: 'DEC-1001' })})

const b = await chromium.launch()
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } })
const shot = async (n) => { await pg.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); console.log('shot', n) }

// login
await pg.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await pg.fill('input[type=email]', email)
await pg.fill('input[type=password]', pass)
await pg.click('button[type=submit], button:has-text("Se connecter"), button:has-text("Connexion")')
await pg.waitForTimeout(2500)
console.log('après login, url =', pg.url())

// nouveau devis
await pg.goto(`${BASE}/devis/nouveau`, { waitUntil: 'domcontentloaded' })
await pg.waitForTimeout(1500)
await shot('01-devis-editor')

// remplir client + chiffrage IA (standard)
try {
  await pg.fill('input[placeholder*="Marie"]', 'Marie Lefèvre')
  await pg.fill('textarea', 'Remplacement chauffe-eau 200L, dépose ancien, pose neuf, groupe de sécurité, 2h de main d\'oeuvre')
  await pg.click('button:has-text("Chiffrer")')
  await pg.waitForTimeout(9000)
  await shot('02-devis-chiffre')
} catch (e) { console.log('chiffrage err', e.message.slice(0, 80)) }

// enregistrer
try { await pg.click('button:has-text("Enregistrer")'); await pg.waitForTimeout(2500); await shot('03-devis-enregistre'); console.log('url après save', pg.url()) } catch (e) { console.log('save err', e.message.slice(0, 80)) }

// créer la facture
try { await pg.click('button:has-text("Créer la facture")'); await pg.waitForTimeout(2500) } catch (e) { console.log('facture err', e.message.slice(0, 80)) }
console.log('url après créer facture', pg.url())
await pg.goto(`${BASE}/factures`, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(1500)
await shot('04-factures-liste')

// mobile
await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(500)
await shot('05-factures-mobile')
await pg.goto(`${BASE}/devis/nouveau`, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(1200)
await shot('06-devis-mobile')

await b.close()
await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H })
console.log('OUT', OUT)
