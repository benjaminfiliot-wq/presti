// Purge des comptes de TEST restés en base (@presti-test.invalid), y compris ceux qui ont émis une
// facture d'acompte (impossible à supprimer autrement : conservation 10 ans). S'appuie sur la
// fonction purger_compte_test (migration 0054), réservée à ces adresses.
//   node scripts/purger-comptes-test.mjs            → liste + purge
//   node scripts/purger-comptes-test.mjs --lister   → liste seulement
//   node scripts/purger-comptes-test.mjs --garder atelier-du-chene   → épargne ce slug (compte de démo)
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const LISTER = process.argv.includes('--lister')
const gi = process.argv.indexOf('--garder'); const GARDES = gi > -1 ? [process.argv[gi + 1]] : ['atelier-du-chene']

const { data: artisans } = await admin.from('artisans').select('id, email, slug, created_at').like('email', '%@presti-test.invalid')
const { data: us } = await admin.auth.admin.listUsers({ perPage: 1000 })
const orphelins = (us?.users ?? []).filter((u) => u.email?.endsWith('@presti-test.invalid') && !(artisans ?? []).some((a) => a.id === u.id))
const cibles = [...(artisans ?? []).map((a) => ({ id: a.id, email: a.email, slug: a.slug })), ...orphelins.map((u) => ({ id: u.id, email: u.email, slug: '(sans artisan)' }))]
console.log(`comptes de test en base : ${cibles.length}`)
let ok = 0, ko = 0
for (const c of cibles) {
  const garde = GARDES.includes(c.slug)
  if (LISTER || garde) { console.log(`  ${garde ? '🛡️ épargné' : '·'} ${c.email} — ${c.slug}`); continue }
  const { data, error } = await admin.rpc('purger_compte_test', { p_id: c.id })
  if (error) { ko++; console.log(`  ❌ ${c.email} — ${error.message}`) }
  else { ok++; console.log(`  🧹 ${c.email} — ${c.slug} (factures purgées : ${data?.factures ?? 0})`) }
}
if (!LISTER) console.log(`purgés : ${ok}, échecs : ${ko}`)
process.exit(ko ? 1 : 0)
