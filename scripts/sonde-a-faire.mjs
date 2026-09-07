// Sonde : quelle ligne de « À faire » n'a pas d'action ?
//
// `controle-e2e` échoue sur « a-faire → 200, chaque ligne a une action (route, méthode) » sans dire
// LAQUELLE. Une suite qui rend un booléen pour vingt lignes oblige à tout relire pour trouver la
// seule qui cloche. On liste, et on montre la coupable.
//
// Usage : node scripts/sonde-a-faire.mjs [https://prestiapp.fr]

import crypto from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

const BASE = process.argv[2] || 'https://prestiapp.fr'
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const marque = `afaire-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const comptes = []

async function fondateur() {
  const email = `${marque}@presti-test.invalid`
  const password = `Af-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (!u?.user?.id) throw new Error('création impossible')
  comptes.push(u.user.id)
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Sonde à faire', metier: 'Test', slug: marque, plan: 'gratuit', is_founder: true })
  const pub = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  if (!s?.session?.access_token) throw new Error('session impossible')
  await verifierSessionTest(s.session.access_token)
  return s.session.access_token
}

async function menage() {
  for (const id of comptes) {
    await admin.from('direction_roles').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.from('artisans').update({ is_founder: false }).eq('id', id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: id }).then(() => {}, () => {})
    await admin.from('artisans').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
}

try {
  const jeton = await fondateur()
  const r = await fetch(`${BASE}/api/controle/a-faire`, { headers: { Authorization: `Bearer ${jeton}` } })
  const b = await r.json().catch(() => null)
  console.log(`\n══ /api/controle/a-faire — HTTP ${r.status} ══\n`)
  const lignes = b?.lignes ?? []
  console.log(`${lignes.length} ligne(s)\n`)
  for (const l of lignes) {
    const ok = !!(l.action?.route && l.action?.methode)
    console.log(`  ${ok ? '✅' : '❌'} ${(l.titre ?? l.libelle ?? l.type ?? '(sans titre)').slice(0, 64)}`)
    if (!ok) console.log(`       ligne complète : ${JSON.stringify(l).slice(0, 300)}`)
  }
  const sans = lignes.filter((l) => !(l.action?.route && l.action?.methode))
  console.log(`\n${sans.length ? `⛔ ${sans.length} ligne(s) sans action` : '✅ toutes les lignes ont une action'}\n`)
} catch (e) {
  console.error('\n💥', e?.message ?? e)
} finally {
  await menage()
}
