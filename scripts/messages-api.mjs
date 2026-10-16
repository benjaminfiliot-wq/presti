// Test des routes artisan /api/messages (reply + suggest) avec un compte test jetable.
import fs from 'fs'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'http://localhost:3400'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const st = Date.now(), email = `mapi.${st}@example.com`, pw = 'Test123456!Aa9'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Test Plomberie', metier: 'Plombier', ton_style: 'pro', slug: `mapi-${st}`, plan: 'business', is_founder: true }) })
const [lead] = await (await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, nom_prospect: 'Paul Durand', contact: 'paul.durand@example.com', message: 'Installation de deux radiateurs dans le séjour, possible ?', statut: 'nouveau' }) })).json()
await rest('messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: 'Installation de deux radiateurs dans le séjour, possible ?' }]) })
const tok = (await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()).access_token
await verifierSessionTest(tok)
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }

console.log('▶ suggest');
const s = await (await fetch(`${APP}/api/messages`, { method: 'POST', headers: H, body: JSON.stringify({ action: 'suggest', lead_id: lead.id }) })).json()
console.log('  reply?', s.reply ? s.reply.slice(0, 120) + '…' : 'NON', '\n')

console.log('▶ reply (envoi artisan)')
const r = await (await fetch(`${APP}/api/messages`, { method: 'POST', headers: H, body: JSON.stringify({ action: 'reply', lead_id: lead.id, message: 'Bonjour Paul, tout à fait — je peux poser vos deux radiateurs. Je vous propose une visite rapide pour le devis.' }) })).json()
console.log('  ok?', r.ok, 'emailed?', r.emailed)

// Vérifie que la conversation contient bien 1 in + 1 out (reply)
const msgs = await (await rest(`messages?lead_id=eq.${lead.id}&select=sens,type,contenu&order=sent_at.asc`)).json()
console.log('\n  messages en base:', msgs.map((m) => `${m.sens}/${m.type}`).join(', '))

const ok = !!s.reply && r.ok === true && msgs.some((m) => m.sens === 'out' && m.type === 'manuel')
console.log(`\n${ok ? '✅ ROUTES ARTISAN OK' : '❌ ÉCHEC'}`)
await admin(`users/${u.id}`, { method: 'DELETE' })
process.exit(ok ? 0 : 1)
