// Vérif PDF de bout en bout via la vraie route Next (bundler = prod).
// Sème un artisan (avec logo), un devis et une facture, récupère les PDF.
import fs from 'fs'
import { chromium } from 'playwright'
import { verifierSessionTest } from './lib/connexion-test.mjs'

const BASE = process.argv[2] || 'http://localhost:3100'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/pdf'
fs.mkdirSync(OUT, { recursive: true })
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })

// logo de test
const b = await chromium.launch(); const pg = await b.newPage()
const logo = await pg.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 140; c.height = 140; const x = c.getContext('2d')
  x.fillStyle = '#C15F3C'; x.beginPath(); x.roundRect(6, 6, 128, 128, 26); x.fill()
  x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineJoin = 'round'
  x.beginPath(); x.moveTo(40, 80); x.lineTo(70, 50); x.lineTo(100, 80); x.moveTo(48, 74); x.lineTo(48, 100); x.lineTo(92, 100); x.lineTo(92, 74); x.stroke()
  return c.toDataURL('image/png')
})
await b.close()

const st = Date.now(), email = `pdf.${st}@example.com`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: 'Test123456!', email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Dupont Plomberie', metier: 'Plombier', ton_style: 'pro', slug: `pdf-${st}`,
  forme_juridique: 'Auto-entreprise', adresse: '12 rue des Lilas', code_postal: '17230', ville: 'Marans', siret: '123 456 789 00012',
  iban: 'FR76 3000 4000 0512 3456 7890 143', conditions_paiement: 'Paiement à 30 jours', tva_regime: 'franchise',
  assurance_nom: 'AXA Pro', assurance_contrat: 'BTP-2291', logo_url: logo,
}) })
const lignes = (pid, col) => [
  { [col]: pid, ordre: 0, designation: 'Dépose ancien chauffe-eau + évacuation', quantite: 1, unite: 'u', prix_unitaire_ht: 90, tva_taux: 10 },
  { [col]: pid, ordre: 1, designation: 'Fourniture chauffe-eau électrique 200 L', quantite: 1, unite: 'u', prix_unitaire_ht: 520, tva_taux: 10 },
  { [col]: pid, ordre: 2, designation: 'Pose, raccordements + groupe de sécurité', quantite: 1, unite: 'forfait', prix_unitaire_ht: 180, tva_taux: 10 },
  { [col]: pid, ordre: 3, designation: 'Main-d\'œuvre', quantite: 2, unite: 'h', prix_unitaire_ht: 45, tva_taux: 10 },
]
const cli = { client_nom: 'Marie Lefèvre', client_adresse: '8 rue du Port, 17000 La Rochelle', objet: 'Rénovation salle d\'eau' }
const devis = await (await rest('devis?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, numero: 'DEV-2026-0042', statut: 'brouillon', validite_jours: 90, acompte_pct: 30, ...cli }) })).json()
await rest('devis_lignes', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(lignes(devis[0].id, 'devis_id')) })
const fac = await (await rest('factures?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, numero: 'FAC-2026-0018', statut: 'emise', date_echeance: '2026-09-27', ...cli }) })).json()
await rest('factures_lignes', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(lignes(fac[0].id, 'facture_id')) })

const tok = (await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Test123456!' }) })).json()).access_token
await verifierSessionTest(tok)
const save = async (url, name) => {
  const r = await fetch(BASE + url, { headers: { Authorization: `Bearer ${tok}` } })
  if (!r.ok) { console.log('🔴', name, r.status, (await r.text()).slice(0, 120)); return }
  const buf = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(`${OUT}/${name}.pdf`, buf)
  console.log('✅', name, `${(buf.length / 1024).toFixed(0)} Ko`)
}
await save(`/api/devis/${devis[0].id}/pdf`, 'devis')
await save(`/api/factures/${fac[0].id}/pdf`, 'facture-emise')
await rest(`factures?id=eq.${fac[0].id}`, { method: 'PATCH', body: JSON.stringify({ statut: 'payee' }) })
await save(`/api/factures/${fac[0].id}/pdf`, 'facture-payee')

await admin(`users/${u.id}`, { method: 'DELETE' })
console.log('OUT', OUT)
