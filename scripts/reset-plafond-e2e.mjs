// Test permanent — plafond PAR EMAIL sur la réinitialisation de mot de passe
// (audit v4 §3 : « 13 emails envoyables à une cible ; le plafond était global »).
//
// Ce qu'on prouve :
//   1. 6 demandes (dont 4 en parallèle) pour un même compte → EXACTEMENT 3 jetons créés,
//      donc 3 emails, pas plus ;
//   2. la réponse est IDENTIQUE à chaque fois, et identique pour un email inconnu
//      (aucune énumération possible, ni par le corps ni par le code HTTP) ;
//   3. un autre compte n'est pas pénalisé par le plafond du premier.
//
// Prérequis : migration 0049 appliquée. Les emails partent vers le puits Resend
// (delivered@resend.dev) : livrés, jamais de bounce.
// Usage : node scripts/reset-plafond-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const comptes = []
async function artisan(tag) {
  const email = `delivered+reset-${tag}-${Date.now()}@resend.dev`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: crypto.randomBytes(18).toString('base64url'), email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Vérif Plafond', metier: 'Plombier', slug: `verif-reset-${tag}-${Date.now()}` })
  comptes.push(u.user.id)
  return { uid: u.user.id, email }
}
const demander = (email) => fetch(`${BASE}/api/auth/reset-request`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
}).then(async (r) => ({ status: r.status, body: await r.text() }))

try {
  console.log('\n── 1. Six demandes pour la même cible → trois jetons, pas un de plus')
  const A = await artisan('a')
  const seq = [await demander(A.email), await demander(A.email)]
  const par = await Promise.all([demander(A.email), demander(A.email), demander(A.email), demander(A.email)])
  const toutes = [...seq, ...par]
  const { count } = await admin.from('password_resets').select('id', { count: 'exact', head: true }).eq('uid', A.uid)
  T(`exactement 3 jetons créés pour 6 demandes (obtenu : ${count})`, count === 3)
  T('toutes les réponses sont en 200', toutes.every((r) => r.status === 200), toutes.map((r) => r.status).join(','))
  T('toutes les réponses ont le même corps (anti-énumération)', new Set(toutes.map((r) => r.body)).size === 1, toutes.map((r) => r.body).join(' | '))

  console.log('\n── 2. Un email inconnu reçoit la même réponse')
  const inconnu = await demander(`personne-${Date.now()}@presti-test.invalid`)
  T('même code et même corps qu’un compte existant', inconnu.status === 200 && inconnu.body === toutes[0].body, `${inconnu.status} ${inconnu.body}`)

  console.log('\n── 3. Une autre cible n’est pas pénalisée')
  const B = await artisan('b')
  await demander(B.email)
  const { count: cB } = await admin.from('password_resets').select('id', { count: 'exact', head: true }).eq('uid', B.uid)
  T('le second compte obtient bien son jeton', cB === 1, String(cB))
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('password_resets').delete().eq('uid', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`🧹 ${comptes.length} artisans de test supprimés`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
