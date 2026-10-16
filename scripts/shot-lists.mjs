// Sème 2 devis + 1 facture, se connecte, capture les listes (cartes) desktop+mobile + éditeur mobile.
import fs from 'fs'
import { chromium } from 'playwright'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const BASE = 'http://localhost:3100'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/lists'
fs.mkdirSync(OUT, { recursive: true })
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })

const st = Date.now(), email = `list.${st}@example.com`, pass = 'Test123456!Aa9'
const u = await (await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email, password: pass, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Dupont Plomberie', metier: 'Plombier', ton_style: 'pro', slug: `list-${st}`, tva_regime: 'franchise' }) })
const mkDevis = async (num, objet, cli, ttc, statut) => (await (await rest('devis?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, numero: num, objet, client_nom: cli, statut, total_ttc: ttc }) })).json())[0]
await mkDevis('DEV-2026-0042', 'Rénovation salle d\'eau complète', 'Marie Lefèvre', 968, 'brouillon')
await mkDevis('DEV-2026-0043', 'Remplacement tableau électrique', 'Karim Benali', 1240, 'envoye')
await rest('factures?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, numero: 'FAC-2026-0018', objet: 'Rénovation salle d\'eau', client_nom: 'Marie Lefèvre', statut: 'emise', total_ttc: 968, date_echeance: '2026-09-27' }) })

// session via API + injection dans localStorage (fiable)
const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) })).json()
await verifierSessionTest(sess.access_token)
const ref = SB.match(/https:\/\/([^.]+)\./)[1]
const b = await chromium.launch()
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } })
await pg.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await pg.evaluate(([k, v]) => localStorage.setItem(k, v), [`sb-${ref}-auth-token`, JSON.stringify(sess)])
const cap = async (path, name, mobile) => {
  await pg.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
  await pg.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(2000)
  await pg.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); console.log('shot', name)
}
await cap('/devis', 'devis-desktop', false)
await cap('/factures', 'factures-desktop', false)
await cap('/devis', 'devis-mobile', true)
await cap('/factures', 'factures-mobile', true)
await cap('/devis/nouveau', 'editor-mobile', true)
await b.close()
await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H })
console.log('OUT', OUT)
