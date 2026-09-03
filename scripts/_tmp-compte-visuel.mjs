import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z_0-9]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const [action, uid] = process.argv.slice(2)
if (action === 'creer') {
  const email = `verif-inv2-visuel-${Date.now()}@presti-test.invalid`
  const password = crypto.randomBytes(12).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Visuel Inv2', metier: 'Plombier', slug: `verif-inv2-visuel-${Date.now()}`, plan: 'studio' })
  fs.writeFileSync(process.env.SORTIE, JSON.stringify({ uid: u.user.id, email, password }))
  console.log('cree', u.user.id)
} else {
  await admin.from('materiaux').delete().eq('artisan_id', uid)
  await admin.from('artisans').delete().eq('id', uid)
  await admin.auth.admin.deleteUser(uid)
  console.log('supprime', uid)
}
