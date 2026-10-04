// Purge des comptes de TEST restés en base (@presti-test.invalid), y compris ceux qui ont émis une
// facture d'acompte (impossible à supprimer autrement : conservation 10 ans). S'appuie sur la
// fonction purger_compte_test (migration 0054), réservée à ces adresses.
//   node scripts/purger-comptes-test.mjs            → liste + purge
//   node scripts/purger-comptes-test.mjs --lister   → liste seulement
//   node scripts/purger-comptes-test.mjs --garder mon-slug   → épargne AUSSI ce slug (s'ajoute à la liste ci-dessous)
//
// Toujours épargnés, quoi qu'on passe : atelier-du-chene (compte de démo, alimente les captures de la vitrine) et
// atelier-relecture (le compte que les stores Apple et Google exigent pour relire l'application) ; et tout compte créé
// depuis moins de 30 min (un juge ou une suite en cours s'en sert). Avant le 04/10, `--garder` REMPLAÇAIT la liste, et la
// liste par défaut oubliait le compte de relecture : le script l'aurait supprimé. Aucune adresse e-mail n'est affichée.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const LISTER = process.argv.includes('--lister')
const gi = process.argv.indexOf('--garder')
const GARDES = ['atelier-du-chene', 'atelier-relecture', ...(gi > -1 && process.argv[gi + 1] ? [process.argv[gi + 1]] : [])]
const AGE_MIN_MS = 30 * 60_000

const { data: artisans } = await admin.from('artisans').select('id, email, slug, created_at').like('email', '%@presti-test.invalid')
const { data: us } = await admin.auth.admin.listUsers({ perPage: 1000 })
const orphelins = (us?.users ?? []).filter((u) => u.email?.endsWith('@presti-test.invalid') && !(artisans ?? []).some((a) => a.id === u.id))
const cibles = [...(artisans ?? []).map((a) => ({ id: a.id, slug: a.slug, cree: a.created_at })), ...orphelins.map((u) => ({ id: u.id, slug: '(sans artisan)', cree: u.created_at }))]
console.log(`comptes de test en base : ${cibles.length}`)
let ok = 0, ko = 0
for (const c of cibles) {
  const nom = `${c.id.slice(0, 8)} — ${c.slug}`
  const recent = Date.now() - new Date(c.cree).getTime() < AGE_MIN_MS
  const garde = GARDES.includes(c.slug) || recent
  if (LISTER || garde) { console.log(`  ${garde ? `🛡️ épargné${recent ? ' (moins de 30 min)' : ''}` : '·'} ${nom}`); continue }
  const { data, error } = await admin.rpc('purger_compte_test', { p_id: c.id })
  if (error) { ko++; console.log(`  ❌ ${nom} — ${error.message}`) }
  else { ok++; console.log(`  🧹 ${nom} (factures purgées : ${data?.factures ?? 0})`) }
}
if (!LISTER) console.log(`purgés : ${ok}, échecs : ${ko}`)
process.exit(ko ? 1 : 0)
