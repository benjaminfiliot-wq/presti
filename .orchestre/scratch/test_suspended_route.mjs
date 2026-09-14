import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { verifierSessionTest } from '../../scripts/lib/connexion-test.mjs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')]
    })
)

process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const authClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// 1. Create a test artisan
const email = `test-susp-${Date.now()}@presti-test.invalid`
const pwd = 'TestPassword123!'
const { data: u, error: uErr } = await admin.auth.admin.createUser({ email, password: pwd, email_confirm: true })
if (uErr) { console.error('uErr:', uErr); process.exit(1) }
const uid = u.user.id

await admin.from('artisans').insert({
  id: uid,
  nom: 'Test Susp Route',
  metier: 'Plombier',
  email,
  slug: `test-susp-${Date.now()}`
})

// Login
const { data: sign, error: sErr } = await authClient.auth.signInWithPassword({ email, password: pwd })
const token = sign.session.access_token
await verifierSessionTest(token)

// Test config before suspension
const res1 = await fetch('https://prestiapp.fr/api/plateforme/config', {
  headers: { Authorization: `Bearer ${token}` }
})
console.log('Avant suspension status:', res1.status)

// Insert suspension in DB
await admin.from('suspensions').insert({
  artisan_id: uid,
  motif: 'Test direct',
  message: 'Compte suspendu test'
})

// Test config after suspension
const res2 = await fetch('https://prestiapp.fr/api/plateforme/config', {
  headers: { Authorization: `Bearer ${token}` }
})
console.log('Apres suspension status:', res2.status)
const json2 = await res2.json().catch(() => null)
console.log('Apres suspension body:', json2)

// Cleanup
await admin.from('suspensions').delete().eq('artisan_id', uid)
await admin.from('artisans').delete().eq('id', uid)
await admin.auth.admin.deleteUser(uid)
