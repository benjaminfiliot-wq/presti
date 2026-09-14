// scripts/site-commander-e2e.mjs — suite e2e du parcours de commande d'un site (prompt v15 §3, §4, tâche 014-11).
//
// Ce qu'elle prouve au navigateur (Playwright) et sur l'API :
//   1. /site/commander connecté : l'écran 1 « Nom de domaine » s'affiche ; ?etape=zone|matiere|paiement ouvrent chacun leur écran ;
//   2. Le brouillon persiste : remplir le métier principal et deux communes à l'écran 2, recharger la page → les valeurs sont là (GET/PUT /api/site/commander/brouillon) ;
//   3. Dossier incomplet : à l'écran 4 avec un dossier incomplet, le bloc « Dossier incomplet » liste les manques et le bouton Payer est inactif ; après correction, il devient actif ;
//   4. Départ vers Stripe : cliquer « Payer » appelle POST /api/site/commander et renvoie une URL checkout.stripe.com ; la commande est en base à l'état « brouillon » avec son stripe_session_id ;
//   5. Retour ?paiement=annule : l'écran de paiement s'affiche et le brouillon est conservé ;
//   6. Compte suspendu : suspensions avec artisan_id n'ouvre pas /site/commander (403 suspendu).
//
// 0 donnée réelle. Comptes `cmd-art-*@presti-test.invalid`, supprimés en `finally`.

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest, codeEmailSiDemande } from './lib/connexion-test.mjs'

// ── Chargement des variables d'environnement (.env.local) ──────────────────────────
for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BASE = (process.env.PRESTI_BASE_URL || process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')

if (!SB || !SVC || !ANON) {
  console.log('❌ variables Supabase absentes (.env.local)')
  process.exit(1)
}

const admin = createClient(SB, SVC, { auth: { persistSession: false } })
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })

let ok = 0, ko = 0
const T = (nom, condition, detail = '') => {
  if (condition) {
    ok++
    console.log(`  ✅ ${nom}`)
  } else {
    ko++
    console.log(`  ❌ ${nom}${detail ? ` — ${detail}` : ''}`)
  }
}

const comptes = []
const commandesCrees = []
let nav = null

async function nettoyer() {
  for (const id of comptes) {
    await rest(`suspensions?artisan_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
    await rest(`sites_commandes?artisan_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
    await rest(`artisans?id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
    await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: id }) }).catch(() => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  for (const cid of commandesCrees) {
    await rest(`sites_commandes?id=eq.${cid}`, { method: 'DELETE' }).catch(() => {})
  }
}

console.log(`\nsite-commander-e2e — ${BASE}\n`)

try {
  // ── 0. Préalables ────────────────────────────────────────────────────────────────
  console.log('0. Préalables')
  const sondeTable = await rest('sites_commandes?select=id&limit=1')
  if (sondeTable.status === 404) {
    console.log('  ⛔ À faire (Benj) : la table sites_commandes n’existe pas — migration 0088 non collée.')
    process.exit(2)
  }

  const sondeRoute = await fetch(`${BASE}/api/site/commander/brouillon`)
  if (sondeRoute.status === 404) {
    console.log('  ⛔ Drapeau siteCommande baissé sur la cible. Rien à éprouver.')
    process.exit(2)
  }

  // ── Décor : création d'un compte artisan de test ────────────────────────────────
  const st = Date.now() + '-' + crypto.randomBytes(3).toString('hex')
  const email = `cmd-art-${st}@presti-test.invalid`
  const password = `Cmd-${crypto.randomBytes(9).toString('base64url')}-1`
  const slug = `cmd-art-${st}`

  const { data: u, error: errU } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (errU || !u?.user?.id) throw new Error(`création utilisateur test : ${errU?.message}`)
  const uid = u.user.id
  comptes.push(uid)

  const { error: errA } = await admin.from('artisans').insert({
    id: uid,
    email,
    nom: 'Artisan Test Commande',
    metier: 'Plomberie',
    slug,
    plan: 'essentiel',
    is_founder: false,
    est_demo: true,
    aide_vues: ['visite:console'],
  })
  if (errA) throw new Error(`création artisan test : ${errA.message}`)

  const pub = createClient(SB, ANON, { auth: { persistSession: false } })
  const { data: authData, error: errS } = await pub.auth.signInWithPassword({ email, password })
  if (errS || !authData?.session?.access_token) throw new Error(`connexion artisan test : ${errS?.message}`)
  const sess = authData.session
  const jeton = sess.access_token
  await verifierSessionTest(jeton)

  T('compte artisan de test créé et session attestée', !!uid && !!jeton)

  // ── Lancement Playwright & Connexion ──────────────────────────────────────────────
  nav = await chromium.launch()
  const ctx = await nav.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'fr-FR',
    bypassCSP: true,
  })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await codeEmailSiDemande(page, email, { uid })
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 60000 })

  // ── 1. /site/commander connecté & les quatre écrans ─────────────────────────────
  console.log('\n1. Écrans adressables (?etape=domaine|zone|matiere|paiement)')

  page.on('console', (msg) => console.log('  [browser log]', msg.text()))
  page.on('pageerror', (err) => console.log('  [browser error]', err.message))
  page.on('dialog', (d) => d.dismiss().catch(() => {}))

  const h3Domaine = page.locator('h3', { hasText: 'Nom de domaine' })
  const h3Zone = page.locator('h3', { hasText: 'Métier & Zone' })
  const h3Matiere = page.locator('h3', { hasText: 'La matière' })
  const h3Paiement = page.locator('h3', { hasText: 'Récapitulatif & Paiement' })

  await page.goto(`${BASE}/site/commander`, { waitUntil: 'load', timeout: 60000 })
  await h3Domaine.waitFor({ state: 'visible', timeout: 30000 })
  T('écran 1 « Nom de domaine » affiché par défaut', await h3Domaine.isVisible())

  await page.goto(`${BASE}/site/commander?etape=zone`, { waitUntil: 'load', timeout: 30000 })
  await h3Zone.waitFor({ state: 'visible', timeout: 30000 })
  T('?etape=zone ouvre l’écran « Métier & Zone »', await h3Zone.isVisible())

  await page.goto(`${BASE}/site/commander?etape=matiere`, { waitUntil: 'load', timeout: 30000 })
  await h3Matiere.waitFor({ state: 'visible', timeout: 30000 })
  T('?etape=matiere ouvre l’écran « La matière »', await h3Matiere.isVisible())

  await page.goto(`${BASE}/site/commander?etape=paiement`, { waitUntil: 'load', timeout: 30000 })
  await h3Paiement.waitFor({ state: 'visible', timeout: 30000 })
  T('?etape=paiement ouvre l’écran « Récapitulatif & Paiement »', await h3Paiement.isVisible())

  // ── 2. Persistance du brouillon (saisie UI + rechargement) ───────────────────────
  console.log('\n2. Persistance du brouillon (GET/PUT /api/site/commander/brouillon)')

  await page.goto(`${BASE}/site/commander?etape=zone`, { waitUntil: 'load', timeout: 30000 })
  await h3Zone.waitFor({ state: 'visible', timeout: 30000 })

  // Remplir le métier principal
  const metierInput = page.locator('div:has(> label:has-text("Métier principal")) input')
  await metierInput.fill('Plombier chauffagiste')

  // Remplir deux communes réellement servies
  const communeInput = page.locator('div:has(> label:has-text("Communes réellement servies")) input')
  const ajouterCommuneBtn = page.locator('div:has(> label:has-text("Communes réellement servies")) button:has-text("Ajouter")')

  await communeInput.fill('Lyon')
  await ajouterCommuneBtn.click()
  await page.waitForTimeout(300)

  await communeInput.fill('Villeurbanne')
  await ajouterCommuneBtn.click()
  await page.waitForTimeout(300)

  // Cliquer sur Continuer (saveAndNext vers matiere)
  const continuerBtn = page.locator('button:has-text("Continuer")')
  await continuerBtn.click()
  await h3Matiere.waitFor({ state: 'visible', timeout: 30000 })

  // Vérifier via l'API que le brouillon a bien été enregistré
  const resBrouillonApi = await fetch(`${BASE}/api/site/commander/brouillon`, {
    headers: { Authorization: `Bearer ${jeton}` },
  })
  const jsonBrouillon = await resBrouillonApi.json()
  T(
    'GET /api/site/commander/brouillon renvoie les données enregistrées',
    resBrouillonApi.status === 200 &&
      jsonBrouillon?.brouillon?.metier === 'Plombier chauffagiste' &&
      Array.isArray(jsonBrouillon?.brouillon?.communes) &&
      jsonBrouillon.brouillon.communes.includes('Lyon') &&
      jsonBrouillon.brouillon.communes.includes('Villeurbanne'),
    `status=${resBrouillonApi.status} metier=${jsonBrouillon?.brouillon?.metier} communes=${JSON.stringify(jsonBrouillon?.brouillon?.communes)}`
  )

  // Recharger la page à l'écran 2 et vérifier que les valeurs persistent dans l'UI
  await page.goto(`${BASE}/site/commander?etape=zone`, { waitUntil: 'load', timeout: 30000 })
  await h3Zone.waitFor({ state: 'visible', timeout: 30000 })

  const valMetier = await metierInput.inputValue()
  const communesText = await page.locator('div:has(> label:has-text("Communes réellement servies")) ul').innerText()
  T(
    'les valeurs saisies sont conservées dans l’UI après rechargement',
    valMetier === 'Plombier chauffagiste' && communesText.includes('Lyon') && communesText.includes('Villeurbanne'),
    `metier="${valMetier}" communes="${communesText.replace(/\n/g, ' ')}"`
  )

  // ── 3. Contrôles du dossier incomplet & activation du bouton ────────────────────
  console.log('\n3. Contrôles du dossier incomplet')

  await page.goto(`${BASE}/site/commander?etape=paiement`, { waitUntil: 'load', timeout: 30000 })
  await h3Paiement.waitFor({ state: 'visible', timeout: 30000 })

  const blocIncomplet = page.locator('.msg.err:has-text("Dossier incomplet")')
  await blocIncomplet.waitFor({ state: 'visible', timeout: 15000 })
  T('le bloc « Dossier incomplet » est visible quand des informations manquent', await blocIncomplet.isVisible())

  const boutonPayer = page.locator('button:has-text("Payer")')
  const boutonInactif = await boutonPayer.isDisabled()
  T('le bouton de paiement est inactif tant que le dossier est incomplet', boutonInactif)

  // Compléter le dossier via l'API brouillon
  const dossierComplet = {
    domaine_mode: 'aucun',
    domaine: null,
    metier: 'Plombier chauffagiste',
    metiers_secondaires: ['Chauffagiste'],
    communes: ['Lyon', 'Villeurbanne'],
    matiere: {
      photos: [
        { url: 'https://prestiapp.fr/sites-demo/plombier/images/hero-960.webp', role: 'chantier', legende: 'Rénovation complète' },
        { url: 'https://prestiapp.fr/sites-demo/plombier/images/hero-480.webp', role: 'avant', legende: 'Avant travaux' },
        { url: 'https://prestiapp.fr/sites-demo/plombier/images/hero.webp', role: 'apres', legende: 'Après travaux' },
      ],
      adresse: '12 rue de la République 69002 Lyon',
      siren: '732829320',
      horaires: 'Du lundi au vendredi de 8h à 18h',
      decennale: {
        assureur: 'AXA Assurances',
        numero: 'DEC-987654321',
      },
      avis_google: { url: 'https://maps.google.com/?cid=123456789' },
    },
  }

  const resPutComplet = await fetch(`${BASE}/api/site/commander/brouillon`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
    body: JSON.stringify(dossierComplet),
  })
  const jsonPut = await resPutComplet.json()
  T('mise à jour du dossier complet (PUT /api/site/commander/brouillon → 200, 0 erreur)', resPutComplet.status === 200 && (!jsonPut.erreurs || jsonPut.erreurs.length === 0))

  // Recharger l'écran 4 et vérifier que le bouton devient actif
  await page.goto(`${BASE}/site/commander?etape=paiement`, { waitUntil: 'load', timeout: 30000 })
  await h3Paiement.waitFor({ state: 'visible', timeout: 30000 })

  const blocIncompletApres = await page.locator('.msg.err:has-text("Dossier incomplet")').count()
  const boutonActif = await boutonPayer.isEnabled()
  T('après complétion : le bloc « Dossier incomplet » disparaît', blocIncompletApres === 0)
  T('après complétion : le bouton Payer devient actif', boutonActif)

  // ── 4. Départ vers Stripe ────────────────────────────────────────────────────────
  console.log('\n4. Départ vers Stripe (POST /api/site/commander)')

  let captureStripe = null
  await page.route('**/api/site/commander', async (route) => {
    if (route.request().method() === 'POST') {
      try {
        const response = await route.fetch()
        const json = await response.json().catch(() => ({}))
        captureStripe = { status: response.status(), body: json }
        await route.fulfill({ response })
      } catch {
        await route.continue()
      }
    } else {
      await route.continue()
    }
  })
  await page.route('https://checkout.stripe.com/**', (route) => route.abort('blockedbyclient'))

  // Cliquer sur Payer
  await boutonPayer.click()

  // Attendre la capture du POST
  for (let i = 0; i < 60 && !captureStripe; i++) {
    await page.waitForTimeout(500)
  }

  const statutStripe = captureStripe?.status ?? 0
  const jsonStripe = captureStripe?.body ?? {}
  const stripeUrl = jsonStripe?.url

  T(
    'cliquer « Payer » appelle POST /api/site/commander → 200 avec URL Stripe Checkout',
    statutStripe === 200 && typeof stripeUrl === 'string' && stripeUrl.includes('checkout.stripe.com'),
    `HTTP ${statutStripe} url=${stripeUrl?.slice(0, 50)}`
  )

  const commandeId = jsonStripe?.commande
  if (commandeId) commandesCrees.push(commandeId)

  // Vérifier la commande en base : état 'brouillon' avec stripe_session_id posé
  let dbCmd = null
  if (commandeId) {
    const resDbCmd = await rest(`sites_commandes?id=eq.${commandeId}&select=id,artisan_id,etat,stripe_session_id`)
    const rawDb = await resDbCmd.json().catch(() => [])
    if (Array.isArray(rawDb)) dbCmd = rawDb[0]
  }
  T(
    'la commande existe en base à l’état « brouillon » avec son stripe_session_id',
    dbCmd?.etat === 'brouillon' && typeof dbCmd?.stripe_session_id === 'string' && dbCmd.stripe_session_id.startsWith('cs_'),
    `etat=${dbCmd?.etat} stripe_session_id=${dbCmd?.stripe_session_id?.slice(0, 20)}`
  )

  // ── 5. Retour ?paiement=annule ───────────────────────────────────────────────────
  console.log('\n5. Retour ?paiement=annule')

  await page.goto(`${BASE}/site/commander?paiement=annule`, { waitUntil: 'load', timeout: 30000 })
  await h3Paiement.waitFor({ state: 'visible', timeout: 30000 })

  const texteRecap = await page.locator('.prof-grid .tool-card').innerText()
  T(
    'retour ?paiement=annule : l’écran de paiement s’ouvre et le brouillon est conservé',
    await h3Paiement.isVisible() &&
      texteRecap.includes('Plombier chauffagiste') &&
      texteRecap.includes('732829320'),
    `recap=${texteRecap.slice(0, 100).replace(/\n/g, ' ')}`
  )

  // ── 6. Compte suspendu ───────────────────────────────────────────────────────────
  console.log('\n6. Compte suspendu (fermeture de /site/commander)')

  // Poser une suspension active pour cet artisan
  const { error: errSusp } = await admin.from('suspensions').insert({
    artisan_id: uid,
    motif: 'Suspension test e2e commande',
    message: 'Compte suspendu pour vérification.',
    suspendu_le: new Date().toISOString(),
  })
  if (errSusp) throw new Error(`erreur insertion suspension : ${errSusp.message}`)

  // 6a. Appel API direct GET brouillon → 403
  const resGetSusp = await fetch(`${BASE}/api/site/commander/brouillon`, {
    headers: { Authorization: `Bearer ${jeton}` },
  })
  const jsonGetSusp = await resGetSusp.json().catch(() => ({}))
  T(
    'compte suspendu : GET /api/site/commander/brouillon → 403 (code: suspendu)',
    resGetSusp.status === 403 && jsonGetSusp?.code === 'suspendu',
    `HTTP ${resGetSusp.status} code=${jsonGetSusp?.code}`
  )

  // 6b. Appel API direct POST commande → 403
  const resPostSusp = await fetch(`${BASE}/api/site/commander`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}` },
  })
  const jsonPostSusp = await resPostSusp.json().catch(() => ({}))
  T(
    'compte suspendu : POST /api/site/commander → 403 (code: suspendu)',
    resPostSusp.status === 403 && jsonPostSusp?.code === 'suspendu',
    `HTTP ${resPostSusp.status} code=${jsonPostSusp?.code}`
  )

  // 6c. Requête de brouillon émise par le navigateur → 403
  const [resBrouillonNav] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === '/api/site/commander/brouillon', { timeout: 30000 }),
    page.goto(`${BASE}/site/commander`, { waitUntil: 'load', timeout: 30000 }),
  ])
  T(
    'compte suspendu : GET /api/site/commander/brouillon renvoie 403 au navigateur',
    resBrouillonNav.status() === 403,
    `HTTP ${resBrouillonNav.status()}`
  )
} catch (e) {
  ko++
  console.log('  ❌ exception :', e?.stack?.split('\n').slice(0, 3).join(' | ') || e)
} finally {
  if (nav) await nav.close().catch(() => {})
  await nettoyer().catch(() => {})
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
  const total = ok + ko
  console.log(`\n${ko === 0 ? '✅' : '❌'} site-commander-e2e : ${ok}/${total} — ${BASE}`)
  process.exitCode = ko === 0 ? 0 : 1
}
