// Vérification VISUELLE de l'écran Messages → Canaux (v4 §B2).
// Un test d'API ne voit pas un bouton qui s'étale sur toute la largeur ni un fond orange
// hérité du style global — d'où ce passage par un vrai navigateur, avec un compte de test
// créé puis supprimé dans la foulée. Aucune donnée de démo ne reste en base.
// Usage : node scripts/canaux-visuel.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const SORTIE = process.env.SORTIE || '.'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const email = `verif-canaux-${Date.now()}@presti-test.invalid`
const motDePasse = crypto.randomBytes(18).toString('base64url') // jamais affiché, jamais écrit sur disque
let uid = null
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

try {
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error('création du compte de test : ' + error.message)
  uid = u.user.id
  await sb.from('artisans').insert({ id: uid, email, nom: 'Vérif Canaux', metier: 'plombier', slug: `verif-canaux-${Date.now()}`, plan: 'business' })

  const nav = await chromium.launch()
  const page = await (await nav.newContext({ viewport: { width: 1280, height: 900 } })).newPage()

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', motDePasse)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await codeEmailSiDemande(page, email)
  // 60 s et non 30 : sous la charge de l’audit — soixante-dix suites d’affilée contre la production —
  // une connexion dépasse parfois trente secondes. Cette suite passait seule et échouait dans le
  // lanceur ; un faux rouge finit par masquer les vrais, et personne ne lit plus le rapport.
  await page.waitForURL(/outils|dashboard|onboarding|messages/, { timeout: 60000 })

  await page.goto(`${BASE}/messages/canaux`, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Connecter une boîte email', { timeout: 20000 })
  await page.screenshot({ path: `${SORTIE}/canaux.png`, fullPage: true })

  console.log('\n── Rendu')
  T('la page s’affiche (pas de redirection vers /login)', !page.url().includes('/login'), page.url())
  T('le titre est là', await page.locator('h1, .app-title').filter({ hasText: /Canaux/i }).count() > 0)
  // Il n'y a rien à vérifier ici : c'est la console de l'artisan, la marque Presti y est normale.
  // L'ancienne version écrivait `T(…, true)` — une vérification comptée sans rien vérifier, dans
  // une suite que le lanceur joue chaque nuit. Ne rien dire vaut mieux que dire un faux vert.

  // Le piège maison : button { width:100%; background:var(--green) } dans globals.css.
  const b = page.locator('button', { hasText: 'Connecter ma boîte' })
  const boite = await b.boundingBox()
  T('le bouton principal ne s’étale pas sur toute la largeur', boite && boite.width < 400, boite ? `${Math.round(boite.width)} px` : 'introuvable')

  const lien = page.locator('button.canal-avance')
  const styleLien = await lien.evaluate((el) => getComputedStyle(el).backgroundColor)
  T('le lien « serveur non reconnu » n’a pas de fond plein', /rgba\(0, 0, 0, 0\)|transparent/.test(styleLien), styleLien)

  // Deux <button> voisins sont inline-block par défaut : ils se collent sur la même ligne
  // et se recouvrent. Un test d'API ne voit jamais ça, une capture d'écran si.
  const cadreLien = await lien.boundingBox()
  const chevauche = boite && cadreLien &&
    boite.x < cadreLien.x + cadreLien.width && cadreLien.x < boite.x + boite.width &&
    boite.y < cadreLien.y + cadreLien.height && cadreLien.y < boite.y + boite.height
  T('le bouton ne recouvre pas le lien du dessus', !chevauche,
    chevauche ? `bouton ${Math.round(boite.x)},${Math.round(boite.y)} · lien ${Math.round(cadreLien.x)},${Math.round(cadreLien.y)}` : '')

  // Le formulaire refuse ce qu'il doit refuser, sans appeler le serveur.
  T('le bouton est désactivé tant que les champs sont vides', await b.isDisabled())

  await page.fill('input[type="email"]', 'pas-une-adresse')
  await page.fill('input[type="password"]', 'x')
  T('bouton actif dès que les deux champs sont remplis', await b.isEnabled())

  console.log('\n── Depuis les Messages')
  await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle' })
  T('le raccourci « Canaux » est accessible depuis la boîte de réception',
    await page.locator('a[href="/messages/canaux"]').count() > 0)

  await nav.close()
  console.log(`\n📸 capture : ${SORTIE}/canaux.png`)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) {
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
    console.log('🧹 compte de test supprimé')
  }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
