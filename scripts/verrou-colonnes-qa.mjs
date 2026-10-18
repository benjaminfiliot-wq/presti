// node scripts/verrou-colonnes-qa.mjs — prouve le 2e verrou (0160) : l'inscription (upsert client) marche, le profil se modifie,
// mais un artisan connecté ne peut PAS changer son offre, ses crédits, ni se mettre fondateur via l'API publique. Compte de test
// supprimé dans un finally.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_0-9]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '') }
const URL = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = `verrou-${Date.now()}@presti-test.invalid`, mdp = 'Verrou-' + Math.random().toString(36).slice(2) + '!A1'
let uid = null, ok = 0, ko = 0
const v = (nom, cond, info = '') => { if (cond) { ok++; console.log('  ✅', nom) } else { ko++; console.log('  ❌', nom, info) } }
try {
  const { data: u, error: eu } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true }); if (eu) throw eu
  uid = u.user.id
  const db = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error: el } = await db.auth.signInWithPassword({ email, password: mdp }); if (el) throw el
  const { error: eIns } = await db.from('artisans').upsert({ id: uid, email, nom: 'Test Verrou', metier: 'Plombier', tel: null, ton_style: 'chaleureux', slug: `test-verrou-${Date.now()}`, origine_declaree: null, origine_precision: null })
  v('inscription (upsert client comme app/onboarding)', !eIns, eIns?.message)
  const { error: eNom } = await db.from('artisans').update({ nom: 'Test Verrou 2', bio: 'ok' }).eq('id', uid)
  v('modifier son profil (nom, bio)', !eNom, eNom?.message)
  for (const [col, val] of [['plan', 'signature'], ['credits', 999999], ['is_founder', true], ['role_interne', 'fondateur'], ['stripe_customer_id', 'cus_x']]) {
    const { error } = await db.from('artisans').update({ [col]: val }).eq('id', uid)
    const { data: r } = await admin.from('artisans').select(col).eq('id', uid).single()
    v(`refusé : se donner ${col}=${val}`, !!error && r[col] !== val, `erreur=${error?.message} valeur=${r?.[col]}`)
  }
} catch (e) { ko++; console.log('  ❌ erreur', e.message) }
finally {
  if (uid) { await admin.from('artisans').delete().eq('id', uid); await admin.auth.admin.deleteUser(uid); console.log('🧹 compte de test supprimé') }
}
console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exitCode = ko ? 1 : 0
