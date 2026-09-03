// Test permanent — force des mots de passe et messages d'erreur (v4 §11).
//
// L'audit a montré que `12345678`, `password` et `azerty123` étaient acceptés à
// l'inscription. Ce test couvre le parcours réel — celui que prennent 100 % des artisans.
//
// ⚠️ Honnêteté sur la portée : cette barrière est côté produit. Un appel direct à l'API
// d'authentification la contourne, et seul le réglage du tableau de bord Supabase la rend
// inviolable. Le test le VÉRIFIE plutôt que de le supposer, et le dit s'il n'est pas posé.
//
// Usage : node scripts/motdepasse-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { evaluerMotDePasse, messageAuth } from '../lib/motDePasse.ts'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

console.log('\n── 1. Ce que l’audit avait réussi à faire passer est maintenant refusé')
for (const faible of ['12345678', 'password', 'azerty123', 'motdepasse', '987321', 'presti123']) {
  const r = evaluerMotDePasse(faible, 'jean@exemple.fr')
  T(`« ${faible} » refusé`, !r.ok, JSON.stringify(r))
}

console.log('\n── 2. Les autres formes faibles')
T('trop court refusé', !evaluerMotDePasse('court12', '').ok)
T('que des chiffres refusé', !evaluerMotDePasse('04071985123', '').ok)
T('répétition refusée', !evaluerMotDePasse('aaaaaaaaaaaa', '').ok)
T('suite du clavier refusée', !evaluerMotDePasse('azertyuiop123', '').ok)
T('proche de l’email refusé', !evaluerMotDePasse('jeanmartin2026', 'jeanmartin@exemple.fr').ok)

console.log('\n── 3. Un vrai mot de passe passe, et on encourage mieux')
const bons = ['tuile-caramel-vendredi', 'Chantier!Nantes2026', 'perceuse bleue 17 escalier']
for (const bon of bons) {
  const r = evaluerMotDePasse(bon, 'jean@exemple.fr')
  T(`« ${bon} » accepté`, r.ok, JSON.stringify(r))
}
T('le score monte avec la longueur',
  evaluerMotDePasse('perceuse bleue 17 escalier', '').score > evaluerMotDePasse('Chantier12345', '').score)
T('un mot de passe accepté n’affiche pas de problème', evaluerMotDePasse(bons[0], '').probleme === null)

console.log('\n── 4. Les erreurs sont en français')
T('identifiants invalides', messageAuth('Invalid login credentials') === 'Email ou mot de passe incorrect.')
T('email non confirmé', /confirm/i.test(messageAuth('Email not confirmed')))
T('compte déjà existant', /existe déjà/.test(messageAuth('User already registered')))
T('trop de tentatives', /Patientez/.test(messageAuth('Request rate limit reached')))
T('message inconnu ⇒ repli neutre, jamais l’anglais brut',
  messageAuth('Some internal GoTrue explosion') === 'Quelque chose n’a pas fonctionné. Réessayez dans un instant.')

console.log('\n── 5. Dans le navigateur, sur la page réelle')
const comptes = []
try {
  const nav = await chromium.launch()
  const page = await (await nav.newContext({ viewport: { width: 1100, height: 900 } })).newPage()
  await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', `verif-mdp-${Date.now()}@presti-test.invalid`)
  await page.fill('#mdp-inscription', '12345678')
  await page.waitForTimeout(250)
  const bouton = page.getByRole('button', { name: /Créer/i })
  T('le bouton est bloqué sur un mot de passe faible', await bouton.isDisabled())
  const dit = await page.locator('.mdp-txt').innerText()
  T('et l’écran explique pourquoi', /caractères|listes d’attaque|chiffres/i.test(dit), dit)

  await page.fill('#mdp-inscription', 'tuile-caramel-vendredi')
  await page.waitForTimeout(250)
  T('le bouton se débloque sur un bon mot de passe', await bouton.isEnabled())
  T('la jauge est au maximum', await page.locator('.mdp-force').getAttribute('data-niveau') === '3')

  console.log('\n── 6. Et le réglage Supabase, qui seul rend la barrière inviolable')
  const pub = createClient(URL, ANON, { auth: { persistSession: false } })
  const mail = `verif-mdp-direct-${Date.now()}@presti-test.invalid`
  const { data, error } = await pub.auth.signUp({ email: mail, password: '12345678' })
  if (data?.user) comptes.push(data.user.id)
  T('l’API refuse aussi les mots de passe faibles', !!error,
    'la barrière produit tient, mais un appel DIRECT à l’API passe encore : Supabase → Auth → Passwords')

  await nav.close()
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) await admin.auth.admin.deleteUser(uid).catch(() => {})
  if (comptes.length) console.log(`\n🧹 ${comptes.length} compte(s) de test supprimé(s)`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
