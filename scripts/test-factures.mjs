// Test bout-en-bout de la facturation : devis -> facture -> PDF -> payée. Nettoie tout.
import fs from 'fs'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v // verifierSessionTest lit process.env
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'http://localhost:3000'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
let ok = 0, ko = 0
const check = (n, c, i = '') => { console.log(`${c ? '✅' : '❌'} ${n}${i ? ' — ' + i : ''}`); c ? ok++ : ko++ }

const stamp = Date.now()
const email = `factest.${stamp}@example.com`, pw = 'Test123456!Aa9'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Test Facture', metier: 'Plombier', ton_style: 'pro', slug: `factest-${stamp}`, plan: 'business', tva_regime: 'franchise', forme_juridique: 'EI', siret: '55203253400646', adresse: '12 rue des Lilas', code_postal: '17230', ville: 'Marans', assurance_nom: 'AXA France IARD', assurance_contrat: 'DEC-1001' }) })
const tok = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()
await verifierSessionTest(tok.access_token)
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok.access_token}` }

const dev = await (await fetch(`${APP}/api/devis`, { method: 'POST', headers: H, body: JSON.stringify({ objet: 'Test facture', client_nom: 'Client X', lignes: [{ designation: 'Pose chauffe-eau', quantite: 1, unite: 'u', prix_unitaire_ht: 620, tva_taux: 10 }] }) })).json()
check('devis créé', !!dev.id, dev.numero || dev.error)
// On ne facture qu'un devis SIGNÉ (audit de cohérence du 18/10, C6) : refus d'abord, puis signature et facture.
const refus = await fetch(`${APP}/api/factures`, { method: 'POST', headers: H, body: JSON.stringify({ devis_id: dev.id }) })
check('facture d’un devis non signé refusée (409)', refus.status === 409, `HTTP ${refus.status}`)
await rest(`devis?id=eq.${dev.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'accepte' }) })

const fac = await (await fetch(`${APP}/api/factures`, { method: 'POST', headers: H, body: JSON.stringify({ devis_id: dev.id }) })).json()
check('facture créée depuis le devis', !!fac.id, fac.numero || fac.error)

if (fac.id) {
  const pdf = await fetch(`${APP}/api/factures/${fac.id}/pdf`, { headers: { Authorization: `Bearer ${tok.access_token}` } })
  const sig = Buffer.from(await pdf.arrayBuffer()).slice(0, 5).toString('latin1')
  check('PDF facture', pdf.status === 200 && sig === '%PDF-', `HTTP ${pdf.status}`)
  const pay = await fetch(`${APP}/api/factures/${fac.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ statut: 'payee' }) })
  check('marquer payée', pay.ok)
  const got = await (await fetch(`${APP}/api/factures/${fac.id}`, { headers: H })).json()
  check('statut = payee', got.facture?.statut === 'payee', got.facture?.statut)
}

await admin(`users/${u.id}`, { method: 'DELETE' })
console.log(`\n=== ${ok} réussis, ${ko} échoués ===`)
process.exit(ko === 0 ? 0 : 1)
