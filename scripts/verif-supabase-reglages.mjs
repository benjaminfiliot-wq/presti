// Vérifie les trois réglages d'authentification demandés par l'audit (v4 §16.2).
//
// Ces réglages vivent dans le tableau de bord Supabase, pas dans le dépôt : on ne peut
// pas les lire, seulement les CONSTATER par leur effet. C'est d'ailleurs plus honnête —
// ce qui compte n'est pas qu'une case soit cochée, c'est que l'attaque ne marche plus.
//
// Usage : node scripts/verif-supabase-reglages.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ⚠️  ${n}${d ? `\n     → ${d}` : ''}`) } }

const comptes = []
try {
  const email = `verif-reglages-${Date.now()}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  comptes.push(u.user.id)
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Vérif Réglages', metier: 'Plombier', slug: `verif-reglages-${Date.now()}`, plan: 'essentiel' })

  const pub = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: motDePasse })

  console.log('\n── 1. Durée de vie du jeton d’accès')
  const charge = JSON.parse(Buffer.from(s.session.access_token.split('.')[1], 'base64').toString('utf8'))
  const duree = charge.exp - charge.iat
  console.log(`  mesurée : ${duree} s (${Math.round(duree / 60)} min)`)
  T('ramenée à 30 min ou moins', duree <= 1800, `toujours ${Math.round(duree / 60)} min · Supabase → Auth → « JWT expiry »`)

  console.log('\n── 2. Détection de rejeu des jetons de rafraîchissement')
  // On rafraîchit une fois, puis on rejoue l'ANCIEN jeton après le délai de grâce.
  // Réglage actif ⇒ refus, et révocation de toute la chaîne.
  const ancien = s.session.refresh_token
  const rafraichir = (jeton) => fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ refresh_token: jeton }),
  })
  const r1 = await rafraichir(ancien)
  T('le rafraîchissement légitime fonctionne', r1.ok, `HTTP ${r1.status}`)
  const nouveau = r1.ok ? (await r1.json()).refresh_token : null

  console.log('  (attente du délai de grâce, 15 s…)')
  await new Promise((r) => setTimeout(r, 15000))
  const r2 = await rafraichir(ancien)
  T('rejouer un ANCIEN jeton est refusé', !r2.ok,
    `HTTP ${r2.status} — un jeton volé se refabrique un accès parallèle invisible · Supabase → Auth → Sessions → « Detect and revoke potentially compromised refresh tokens »`)

  if (nouveau) {
    const r3 = await rafraichir(nouveau)
    console.log(`  ℹ️  la chaîne légitime est ${r3.ok ? 'conservée' : 'révoquée'} après cette tentative`)
  }

  console.log('\n── 3. Politique de mot de passe')
  // ⚠️ Créer un compte avec la CLÉ DE SERVICE contourne la politique : elle ne s'applique
  // qu'à l'inscription publique. Tester par la mauvaise porte fait conclure à tort que le
  // réglage n'est pas en place — c'est l'erreur que j'ai faite au premier passage.
  const faibles = ['12345678', 'password', 'azerty123']
  const acceptes = []
  for (const faible of faibles) {
    const mail = `verif-faible-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@presti-test.invalid`
    const client = createClient(URL, ANON, { auth: { persistSession: false } })
    const { data: c, error: e } = await client.auth.signUp({ email: mail, password: faible })
    if (!e && c?.user) { acceptes.push(faible); comptes.push(c.user.id) }
  }
  T('les mots de passe faibles sont refusés à l’inscription', acceptes.length === 0,
    `encore acceptés : ${acceptes.join(', ')} · Supabase → Auth → Passwords (longueur mini + déni-liste HaveIBeenPwned)`)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid).catch(() => {})
  }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} comptes de test supprimés`)
}

console.log(`\n${ko === 0 ? '✅ les trois réglages sont en place' : `⚠️  ${ko} réglage(s) encore à faire`}\n`)
// Informatif : ces réglages ne vivent pas dans le dépôt, on ne fait pas tomber la CI.
process.exit(0)
