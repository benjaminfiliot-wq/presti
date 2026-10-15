// Les deux vidéos de la landing « L'assistant qui agit, le CRM qui voit tout » (offre Signature) — VRAIES captures de l'interface.
//
// Enregistrement d'écran Playwright, sans son, 1440 × 900 :
//   1. assistant-devis : « Fais le devis de Mme Martin pour 12 m² de carrelage » tapé dans l'assistant ; il lit les tarifs, prépare le
//      brouillon, on l'ouvre. UN SEUL appel réel de l'assistant par enregistrement (crédits comptés sur le compte de test).
//   2. crm-atelier : la carte Atelier du CRM (données d'EXEMPLE fictives du produit, bandeau visible), on parcourt, on ouvre un chantier.
//
// Compte : un compte de TEST jetable (menuisier→carreleur fictif « Atelier Durand », offre Signature, AUCUNE réalisation : le portfolio de la
// démo, aux photos CC BY-SA, n'existe pas ici et ne peut donc apparaître). Détruit dans le `finally`, quoi qu'il arrive.
// Les données du compte de démonstration « Atelier du Chêne » ne sont ni lues ni écrites.
//
// Usage : TEST_BASE=http://localhost:3010 node scripts/demo-gestion-videos.mjs [assistant|crm|tout] [--garder-brut]
// Sortie : videos/gestion-brut/*.webm (bruts) — le montage (rognage, accéléré de l'attente, H.264) est fait par ffmpeg ensuite.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'http://localhost:3010'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error('Enregistrer sur un serveur local (TEST_BASE=http://localhost:3010), pas sur la production.')
const QUOI = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'tout'
const SORTIE = path.join(process.cwd(), 'videos', 'gestion-brut')
fs.mkdirSync(SORTIE, { recursive: true })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (s) => console.log(s)

const email = `demo-gestion-${Date.now()}@presti-test.invalid`
const mdp = crypto.randomBytes(18).toString('base64url')
const slug = `demo-gestion-${Date.now()}`
let uid = null
let nav = null
let navSimple = null

// Les tarifs de l'artisan fictif (ce que l'assistant lit pour chiffrer) : de vrais postes de carrelage, prix HT.
const TARIFS = [
  ['Fourniture carrelage grès cérame 60x60', 'm²', 32, 10],
  ['Pose de carrelage au sol', 'm²', 45, 10],
  ['Ragréage autolissant', 'm²', 9, 10],
  ['Dépose de l’ancien carrelage', 'm²', 18, 10],
  ['Colle et joints', 'm²', 6.5, 10],
  ['Plinthes carrelées', 'ml', 8, 10],
]

try {
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  uid = u.user.id
  await admin.from('artisans').upsert({
    id: uid, email, nom: 'Atelier Durand', metier: 'Carreleur', slug, plan: 'signature', credits: 600,
    ville: 'Marans', zone_intervention: 'La Rochelle et alentours', tel_public: '05 46 00 00 00', email_public: null, site_seo: false,
    bio: 'Carrelage et faïence : sols, salles de bain, terrasses.', services: [{ nom: 'Carrelage de sol' }, { nom: 'Salles de bain' }],
    ton_style: 'Bonjour ! Merci pour votre message. Je regarde ça et je reviens vers vous rapidement.',
    plateforme_active: true, reponse_auto: false, site_active: false, theme: 'atelier', accent: '#8a5a2b',
    forme_juridique: 'EI', siret: '12345678900012', adresse: '4 rue des Ateliers', code_postal: '17230',
    assurance_nom: 'Assureur Démo', assurance_contrat: 'DEMO-2026', tva_regime: 'reel', tva_num: 'FR00123456789', // assujetti : la page du devis affiche alors la même TVA que l'assistant (en franchise, elle montre 20 % avant enregistrement)
    realisations: [], // JAMAIS de photo du portfolio CC BY-SA dans une vidéo
  })
  await admin.from('plateforme_config').upsert({ artisan_id: uid, mode_reponse: 'assistee', modele: 'pro', ton: 'chaleureux', nom_assistant: 'L’atelier' }, { onConflict: 'artisan_id' })
  await admin.from('prix_artisan').insert(TARIFS.map(([designation, unite, prix_ht, tva_taux]) => ({ artisan_id: uid, designation, unite, prix_ht, tva_taux, source: 'saisie' })))
  log(`compte de test prêt (${slug}), ${TARIFS.length} tarifs`)

  nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

  navSimple = await chromium.launch() // sans GL logiciel forcé : les captures en rafale y sont 5 à 10 fois plus rapides

  // Connexion hors enregistrement : la vidéo ne montre jamais l'e-mail ni le mot de passe du compte de test.
  const ctxLogin = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
  const pl = await ctxLogin.newPage()
  await pl.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pl.fill('#email-connexion', email); await pl.fill('#mdp-connexion', mdp)
  await pl.click('form button[type="submit"], form button:not([type="button"])')
  await codeEmailSiDemande(pl, email)
  await pl.waitForURL(/\/(outils|dashboard)/, { timeout: 20000 })
  // Les visites guidées et le choix d'onglet sont posés ici pour que la vidéo démarre sur l'écran utile.
  await pl.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/visite|presti-aide/i.test(k)) localStorage.setItem(k, '1') } catch {} })
  const etat = await ctxLogin.storageState()
  await ctxLogin.close()


  if (process.env.BENCH) {
    const configs = { simple: {}, gpu: { channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }, swift: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } }
    for (const [nomc, opts] of Object.entries(configs)) {
      try {
        const b = await chromium.launch(opts)
        const c = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', storageState: etat }); const p = await c.newPage()
        await p.goto(`${BASE}/assistant`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
        const t = Date.now(); for (let i = 0; i < 6; i++) await p.screenshot({ type: 'jpeg', quality: 88 })
        log(`BENCH ${nomc} : ${Math.round((Date.now() - t) / 6)} ms/image`)
        await b.close()
      } catch (e) { log(`BENCH ${nomc} : ${e.message.slice(0, 100)}`) }
    }
    throw new Error('bench terminé')
  }
  async function enregistrer(nom, scenario) {
    const dir = path.join(SORTIE, nom)
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', storageState: etat, recordVideo: { dir, size: { width: 1440, height: 900 } } })
    const page = await ctx.newPage()
    const t0 = Date.now()
    const marque = {}
    try { await scenario(page, (k) => { marque[k] = (Date.now() - t0) / 1000 }) }
    finally {
      const v = page.video()
      await ctx.close()
      const brut = await v.path()
      fs.renameSync(brut, path.join(SORTIE, `${nom}.webm`))
      fs.writeFileSync(path.join(SORTIE, `${nom}.marques.json`), JSON.stringify(marque, null, 1))
      fs.rmSync(dir, { recursive: true, force: true })
      log(`🎬 ${nom}.webm — ${((Date.now() - t0) / 1000).toFixed(1)} s ; marques ${JSON.stringify(marque)}`)
    }
  }

  // Enregistrement par CAPTURES en rafale (au lieu du flux vidéo de Playwright) : le flux d'écran de Chromium sans fenêtre laissait
  // l'écran figé 4 s sur « L'assistant travaille » alors que la réponse était affichée (constaté deux fois, souffle de souris compris).
  // Une capture est toujours le vrai écran. Les images sont rassemblées par ffmpeg avec leur durée réelle (concat) → .mp4 brut.
  async function enregistrerCaptures(nom, scenario) {
    const dir = path.join(SORTIE, `_${nom}-images`)
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
    const ctx = await navSimple.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', storageState: etat })
    const page = await ctx.newPage()
    const t0 = Date.now(); const marque = {}; const images = []
    let actif = true
    let depart = null
    const pret = new Promise((r) => { depart = r })
    const boucle = (async () => {
      await pret // une capture lancée pendant le chargement de la page reste bloquée jusqu'à 30 s : on ne démarre qu'à l'écran prêt
      while (actif) {
        const t = Date.now()
        try { const buf = await page.screenshot({ type: 'jpeg', quality: 88, timeout: 2000 }); const f = `f${String(images.length).padStart(5, '0')}.jpg`; fs.writeFileSync(path.join(dir, f), buf); images.push({ f, t }) } catch { await page.waitForTimeout(150) /* page en navigation : image sautée */ }
        await page.waitForTimeout(Math.max(0, 70 - (Date.now() - t)))
      }
    })()
    try { await scenario(page, (k) => { marque[k] = (Date.now() - t0) / 1000 }, () => { depart(); marque.depart = (Date.now() - t0) / 1000 }) }
    finally { actif = false; depart(); await boucle; await ctx.close() }
    const liste = images.map((im, i) => `file '${im.f}'
duration ${(((images[i + 1]?.t ?? im.t + 70) - im.t) / 1000).toFixed(3)}`).join(String.fromCharCode(10)) + `
file '${images[images.length - 1].f}'
`
    fs.writeFileSync(path.join(dir, 'liste.txt'), liste)
    const sortie = path.join(SORTIE, `${nom}.mp4`)
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'liste.txt'), '-vf', 'fps=25,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', sortie], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error('ffmpeg : ' + (r.stderr || '').slice(0, 300))
    fs.writeFileSync(path.join(SORTIE, `${nom}.marques.json`), JSON.stringify({ ...marque, _images: images.length, _t: images.map((i) => Math.round((i.t - t0) / 10) / 100) }))
    fs.rmSync(dir, { recursive: true, force: true })
    log(`🎬 ${nom}.mp4 — ${((Date.now() - t0) / 1000).toFixed(1)} s, ${images.length} images ; marques ${JSON.stringify(marque)}`)
  }
  // Le décodeur d'écran de Chromium sans fenêtre n'émet une image que si la page se repeint : une attente immobile gèle la vidéo
  // (constaté : la réponse de l'assistant affichée 4 s à l'écran mais absente du fichier). Un souffle de souris dans un coin vide
  // force le rafraîchissement, sans rien survoler d'utile.
  const vivant = async (page, ms) => { const t = Date.now(); let k = 0; while (Date.now() - t < ms) { await page.mouse.move(1250 + (k % 2) * 4, 860 + (k % 3) * 3); await page.waitForTimeout(80); k++ } }
  const attendreVivant = async (page, sel, timeout) => { const t = Date.now(); while (Date.now() - t < timeout) { if (await page.locator(sel).first().isVisible().catch(() => false)) return; await vivant(page, 250) } throw new Error(`délai dépassé : ${sel}`) }
  const ecartVisite = async (page) => { const b = page.getByRole('button', { name: /Plus tard|Passer|Fermer la visite/ }); if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(300) } }

  if (QUOI === 'tout' || QUOI === 'assistant') {
    await enregistrerCaptures('assistant-devis', async (page, marque, demarrer) => {
      await page.goto(`${BASE}/assistant`, { waitUntil: 'networkidle' })
      await ecartVisite(page)
      await page.waitForSelector('textarea[aria-label="Votre commande à l’assistant"]', { timeout: 20000 })
      await vivant(page, 800)
      demarrer()
      await vivant(page, 1200)
      marque('debut_saisie')
      await page.locator('textarea[aria-label="Votre commande à l’assistant"]').click()
      await page.keyboard.type('Fais le devis de Mme Martin pour 12 m² de carrelage', { delay: 55 })
      await vivant(page, 700)
      marque('envoi')
      await page.keyboard.press('Enter')
      // L'assistant travaille (lecture des tarifs, brouillon) : jusqu'à 90 s.
      await attendreVivant(page, '.asst-bulle.assistant:not(.attente)', 90000)
      await vivant(page, 600)
      marque('reponse')
      await vivant(page, 4200)
      const ouvrir = page.getByRole('link', { name: /Ouvrir le devis|Ouvrir le brouillon/ })
      if (await ouvrir.count()) {
        marque('ouvrir')
        await ouvrir.first().click()
        await page.waitForLoadState('networkidle')
        await vivant(page, 3800)
        marque('devis')
      } else await vivant(page, 1500)
    })
  }

  if (QUOI === 'tout' || QUOI === 'crm') {
    await enregistrer('crm-atelier', async (page, marque) => {
      await page.goto(`${BASE}/crm?vue=atelier`, { waitUntil: 'networkidle' })
      await ecartVisite(page)
      await page.waitForSelector('[data-crm-mode="exemple"]', { timeout: 30000 }).catch(async (e) => { await page.screenshot({ path: path.join(SORTIE, '_crm-debug.png') }); throw new Error(`CRM : bandeau d'exemple absent (URL ${page.url()}) — ${e.message.slice(0, 120)}`) })
      await vivant(page, 3500)
      marque('atelier')
      // Un tour de la carte (la souris survole), puis le tableau de bord, puis un chantier ouvert.
      await page.mouse.move(700, 500); await page.mouse.move(900, 450, { steps: 25 }); await vivant(page, 1200)
      await page.getByRole('tab', { name: 'Chantiers' }).click(); await vivant(page, 2200)
      marque('chantiers')
      const lien = page.locator('a[href*="/crm/chantiers/"]').first()
      await lien.scrollIntoViewIfNeeded().catch(() => {})
      marque('clic')
      await lien.click()
      await page.getByText('Tâches').first().waitFor({ timeout: 20000 })
      await vivant(page, 600)
      marque('fiche_prete')
      await vivant(page, 4500)
      marque('fin')
    })
  }
} finally {
  try { if (nav) await nav.close() } catch {}
  try { if (navSimple) await navSimple.close() } catch {}
  if (uid) {
    // Nettoyage dans l'ordre : ce que l'assistant et les écrans ont pu créer, puis le compte.
    const dv = (await admin.from('devis').select('id').eq('artisan_id', uid)).data?.map((d) => d.id) ?? []
    if (dv.length) await admin.from('devis_lignes').delete().in('devis_id', dv)
    for (const t of ['assistant_actions', 'assistant_journal', 'assistant_conversations', 'devis', 'leads', 'clients', 'prix_artisan', 'regles_automatisation', 'plateforme_config']) {
      const r = await admin.from(t).delete().eq('artisan_id', uid); if (r.error) log(`  (nettoyage ${t} : ${r.error.message.slice(0, 80)})`)
    }
    const r = await admin.from('artisans').delete().eq('id', uid); if (r.error) log(`  (nettoyage artisans : ${r.error.message.slice(0, 100)})`)
    await admin.auth.admin.deleteUser(uid).catch((e) => log(`  (deleteUser : ${e.message})`))
    const reste = await admin.from('artisans').select('id', { count: 'exact', head: true }).eq('id', uid)
    log(reste.count === 0 ? '🧹 compte de test détruit' : '⚠️ compte de test encore présent : à supprimer à la main')
  }
}
