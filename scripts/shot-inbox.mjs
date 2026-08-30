// Capture la boîte de réception /messages avec de vraies conversations (compte test jetable).
import { chromium } from 'playwright'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'http://localhost:3400'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const st = Date.now(), email = `inbox.${st}@example.com`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Dupont Plomberie', metier: 'Plombier', ton_style: 'pro', slug: `inbox-${st}`, plan: 'business', tva_regime: 'franchise', accent: '#D97757' }) })

const iso = (min) => new Date(Date.now() - min * 60000).toISOString()
async function conv(nom, contact, besoin, statut, lu, turns, ageMin) {
  const [lead] = await (await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, nom_prospect: nom, contact, message: besoin, canal: 'formulaire', statut, lu_le: lu ? iso(ageMin - 1) : null, updated_at: iso(ageMin) }) })).json()
  let t = ageMin
  const rows = turns.map((x) => { t -= 2; return { lead_id: lead.id, sens: x[0], type: x[0] === 'in' ? 'manuel' : (x[2] || 'reponse_auto'), contenu: x[1], sent_at: iso(t) } })
  await rest('messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) })
}

await conv('Julie Martin', 'julie.martin@example.com', "Fuite sous l'évier de la cuisine qui s'aggrave, vous pouvez passer ?", 'en_discussion', false, [
  ['in', "Fuite sous l'évier de la cuisine qui s'aggrave, vous pouvez passer ?"],
  ['out', "Bonjour Julie, une fuite qui s'aggrave, c'est prioritaire. Placez une bassine dessous et coupez l'arrivée d'eau si besoin — je vous rappelle dans l'heure. Quel créneau vous conviendrait demain ?"],
  ['in', "Demain matin ce serait parfait. C'est un mitigeur récent, le joint semble abîmé."],
  ['out', "Parfait, un joint usé se répare vite et sans surprise. Je note demain matin — je vous confirme le créneau par téléphone. À très vite !"],
], 12)

await conv('Karim Benali', '06 12 34 56 78', "Remplacement d'un chauffe-eau électrique de 200 L, le mien fuit.", 'repondu', true, [
  ['in', "Remplacement d'un chauffe-eau électrique de 200 L, le mien fuit."],
  ['out', "Bonjour Karim, je remplace régulièrement ces ballons. Pour un devis précis, pouvez-vous me dire l'accès (placard, garage) et si l'ancien est à évacuer ? Je peux passer voir cette semaine."],
], 140)

await conv('Sophie Rousseau', 'sophie.rousseau@example.com', "Je voudrais un devis pour rénover entièrement ma salle de bain.", 'nouveau', false, [
  ['in', "Je voudrais un devis pour rénover entièrement ma salle de bain."],
  ['out', "Bonjour Sophie, avec plaisir. Pour cadrer le projet : quelle surface environ, et souhaitez-vous conserver l'emplacement des éléments (douche, WC, vasque) ? Une courte visite me permettra d'établir un devis juste et gratuit."],
], 400)

// Session complète via password grant, injectée dans localStorage (déterministe).
const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()
const ref = SB.replace(/^https?:\/\//, '').split('.')[0]
const storeKey = `sb-${ref}-auth-token`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } })
await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v) } catch {} }, [storeKey, JSON.stringify(sess)])
await page.goto(APP + '/messages', { waitUntil: 'load' }); await page.waitForTimeout(2600)
await page.screenshot({ path: `${OUT}/inbox-list.png` }); console.log('shot inbox-list')
// Ouvre la 1re conversation
await page.click('.inbox-item'); await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/inbox-thread.png` }); console.log('shot inbox-thread')
await browser.close()
await admin(`users/${u.id}`, { method: 'DELETE' })
console.log('OK — nettoyé (email:', email, ')')
