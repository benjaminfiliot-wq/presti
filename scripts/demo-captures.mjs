// Les cinq captures de la démo de la landing (v5 §5) — prises SUR LE VRAI PRODUIT.
//
// On joue le scénario « Une demande arrive » de bout en bout avec un compte de démonstration
// jetable (menuisier, offre Signature, règle « Réactif ») : le client écrit sur la plateforme
// depuis un téléphone, l'assistant répond et qualifie, la règle prépare le devis brouillon,
// l'artisan l'envoie, le client l'accepte. Chaque scène = une capture Playwright du produit,
// écrite dans public/demo/. Le compte et tout ce qu'il a créé sont détruits ensuite.
//
// Coût : 2 réponses IA + 1 chiffrage. Usage :
//   TEST_BASE=http://localhost:3006 node scripts/demo-captures.mjs        (build de production locale)
//   node scripts/demo-captures.mjs --garder   → conserve le compte (pour la démo de demain soir)

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const GARDER = process.argv.includes('--garder')
const OUT = path.join(process.cwd(), 'public', 'demo')
fs.mkdirSync(OUT, { recursive: true })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (s) => console.log(s)
// Portfolio du compte de démo : photos Wikimedia Commons sous licence libre, préparées dans
// public/demo/portfolio (WebP, sans EXIF). L'attribution est OBLIGATOIRE (CC BY-SA) : elle est
// la « ligne de fait » de chaque slide, et ATTRIBUTIONS.md dit que c'est une démonstration.
const PORTFOLIO = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'demo', 'portfolio', 'attributions.json'), 'utf8'))
const realisations = PORTFOLIO.map((p) => ({ image: `/demo/portfolio/${p.fichier}`, titre: p.titre_demo, specialite: p.specialite }))

let uid = null
const email = GARDER ? 'demo-menuisier@presti-test.invalid' : `demo-captures-${Date.now()}@presti-test.invalid`
const mdp = crypto.randomBytes(18).toString('base64url')
try {
  // ── Le compte de démonstration : un menuisier, offre Signature, profil légal complet
  //    (sinon l'envoi du devis est bloqué par les mentions obligatoires — et c'est voulu).
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  uid = u.user.id
  const slug = GARDER ? 'atelier-du-chene' : `demo-${Date.now()}`
  await admin.from('artisans').insert({
    id: uid, email, nom: 'Atelier du Chêne', metier: 'Menuisier', slug, plan: 'signature', credits: 600,
    ville: 'Marans', zone_intervention: 'La Rochelle et alentours', tel_public: '05 46 00 00 00', email_public: email,
    bio: 'Menuiserie sur mesure : escaliers, bibliothèques, cuisines et dressings en bois massif.',
    services: [{ nom: 'Escaliers sur mesure' }, { nom: 'Bibliothèques et dressings' }, { nom: 'Cuisines en bois massif' }],
    ton_style: 'Bonjour ! Merci pour votre message. Je regarde ça et je reviens vers vous rapidement.',
    plateforme_active: true, reponse_auto: true, site_active: true, site_tier: 3, theme: 'atelier', accent: '#8a5a2b',
    forme_juridique: 'EI', siret: '12345678900012', adresse: '4 rue des Ateliers', code_postal: '17230',
    assurance_nom: 'Assureur Démo', assurance_contrat: 'DEMO-2026', tva_regime: 'franchise',
    realisations,
    site_layout: { v: 2, sections: [
      { id: 'hero', on: true }, { id: 'trust', on: true },
      { id: 'slides', on: true, opts: { images: realisations.map((r) => r.image), style: 'profondeur', faits: Object.fromEntries(PORTFOLIO.map((p) => [`/demo/portfolio/${p.fichier}`, p.legende])) } },
      { id: 'words', on: true }, { id: 'gallery', on: true }, { id: 'services', on: true }, { id: 'process', on: true }, { id: 'about', on: true }, { id: 'contact', on: true },
    ] },
  })
  await admin.from('plateforme_config').upsert({ artisan_id: uid, mode_reponse: 'auto', modele: 'pro', ton: 'chaleureux', nom_assistant: 'L’atelier' }, { onConflict: 'artisan_id' })
  await admin.from('regles_automatisation').upsert({ artisan_id: uid, prereglage: 'reactif', actif: true,
    maillons: { devis_auto: true, photo_requise: false, modele: 'pro', notifier: false, validation: true, envoyer_apres_validation: true, acompte_pct: 30 } }, { onConflict: 'artisan_id' })
  log(`compte ${slug} prêt`)

  const nav = await chromium.launch()
  const tel = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' })).newPage()
  const pc = await (await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'fr-FR' })).newPage()
  const shot = async (page, nom) => { await page.screenshot({ path: path.join(OUT, `${nom}.png`) }); log(`📸 ${nom}`) }
  const reponseFinie = async () => {
    await tel.waitForSelector('.pchat-bub.typing', { timeout: 5000 }).catch(() => {})
    await tel.waitForSelector('.pchat-bub.typing', { state: 'detached', timeout: 60000 }).catch(() => {})
    await tel.waitForTimeout(800)
  }

  // ── Scène 1 — 22 h 14 : le client écrit
  await tel.goto(`${BASE}/p/${slug}`, { waitUntil: 'networkidle' })
  await tel.fill('form.pchat-composer textarea', 'Bonjour, je voudrais une bibliothèque sur mesure en chêne dans le salon, environ 2,40 m de large, du sol au plafond. Vous pouvez me faire un devis ?')
  await tel.waitForTimeout(300)
  await shot(tel, 'scene-1')
  await tel.press('form.pchat-composer textarea', 'Enter')
  log('  · attente de la réponse 1')
  await reponseFinie()
  // Le formulaire de coordonnées (variante B) n'apparaît qu'APRÈS la première réponse.
  const capture = tel.locator('form.pchat-capture')
  await capture.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  if (await capture.count()) {
    log('  · formulaire de coordonnées')
    await capture.locator('input[aria-label="Votre nom"]').fill('Claire Dubois')
    await capture.locator('input[aria-label="Email ou téléphone"]').fill('claire.dubois@presti-test.invalid')
    await capture.locator('button[type="submit"]').click()
    await tel.waitForTimeout(1500)
  } else {
    log('  ⚠️ pas de formulaire de coordonnées affiché — contact posé côté serveur pour la suite')
    await admin.from('leads').update({ contact: 'claire.dubois@presti-test.invalid', nom_prospect: 'Claire Dubois' }).eq('artisan_id', uid)
  }

  // ── Scène 2 — l'assistant a répondu et posé ses questions
  await tel.evaluate(() => { const el = document.querySelector('.pchat-thread, .pchat-msgs, .pchat-body'); if (el) el.scrollTop = el.scrollHeight })
  await shot(tel, 'scene-2')

  // Le client répond : la conversation est qualifiée, la règle prépare le devis.
  await tel.fill('form.pchat-composer textarea', 'Chêne massif, finition huilée, avec 6 étagères réglables et deux portes en bas. Pas de contrainte de délai. L’accès est facile, rez-de-chaussée.')
  await tel.press('form.pchat-composer textarea', 'Enter')
  await reponseFinie()
  // La règle chiffre APRÈS la réponse (after) : on attend le devis en base, jusqu'à 90 s (modèle Pro).
  log('  · attente du devis de la règle')
  for (let i = 0; i < 45; i++) {
    const { data: d } = await admin.from('devis').select('id').eq('artisan_id', uid).limit(1)
    if (d?.length) break
    await tel.waitForTimeout(2000)
  }

  // ── Scène 3 — 7 h 50 : l'artisan ouvre son espace, le devis brouillon l'attend
  await pc.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pc.fill('#email-connexion', email); await pc.fill('#mdp-connexion', mdp)
  await pc.click('form button[type="submit"], form button:not([type="button"])')
  await pc.waitForURL(/\/(outils|dashboard)/, { timeout: 20000 })
  await pc.goto(`${BASE}/plateforme`, { waitUntil: 'networkidle' })
  // Première ouverture de la console : la visite guidée (§4 B3) recouvre l'écran → « Plus tard ».
  const plusTard = pc.getByRole('button', { name: /Plus tard/ }); if (await plusTard.count()) { await plusTard.first().click(); await pc.waitForTimeout(400) }
  try {
    await pc.locator('.inbox-item').first().click({ timeout: 15000 })
  } catch {
    await pc.screenshot({ path: path.join(OUT, 'debug-scene-3.png') })
    const texte = await pc.evaluate(() => document.body.innerText.slice(0, 600))
    const { data: dbg } = await admin.from('leads').select('id, artisan_id, statut').eq('artisan_id', uid)
    throw new Error(`scène 3 : aucune conversation listée. URL=${pc.url()} · leads en base=${JSON.stringify(dbg)} · écran : ${texte.replace(/\s+/g, ' ')}`)
  }
  await pc.waitForTimeout(1500)
  await shot(pc, 'scene-3')

  // ── Scène 4 — 7 h 52 : l'artisan envoie le devis, le client l'accepte sur son téléphone
  const { data: dv } = await admin.from('devis').select('id, numero').eq('artisan_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!dv) throw new Error('aucun devis créé par la règle — vérifier declencherRegles')
  const pub = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: mdp })
  const env = await fetch(`${BASE}/api/devis/${dv.id}/envoyer`, { method: 'POST', headers: { Authorization: `Bearer ${s.session.access_token}` } })
  log(`envoi du devis ${dv.numero} → HTTP ${env.status}`)
  await tel.reload({ waitUntil: 'networkidle' })
  await tel.waitForSelector('button:has-text("Accepter le devis")', { timeout: 15000 })
  await tel.evaluate(() => { const el = document.querySelector('.pchat-thread, .pchat-msgs, .pchat-body'); if (el) el.scrollTop = el.scrollHeight })
  await tel.click('button:has-text("Accepter le devis")')
  await tel.waitForSelector('.pchat-carte.ok', { timeout: 15000 })
  await tel.waitForTimeout(600)
  await shot(tel, 'scene-4')

  // ── Scène 5 — le site, à la marque de l'artisan
  await pc.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' })
  await pc.waitForTimeout(1500)
  await shot(pc, 'scene-5')

  await nav.close()
  fs.writeFileSync(path.join(OUT, 'captures.json'), JSON.stringify({ prises_le: new Date().toISOString(), base: BASE, compte: GARDER ? slug : '(détruit)' }, null, 1))
  log(`\n✅ 5 captures dans ${OUT}`)
} catch (e) {
  console.error('❌', e.message)
  process.exitCode = 1
} finally {
  if (uid && !GARDER) {
    const { data: ls } = await admin.from('leads').select('id').eq('artisan_id', uid)
    for (const l of ls ?? []) await admin.from('messages').delete().eq('lead_id', l.id)
    const fac = (await admin.from('factures').select('id').eq('artisan_id', uid)).data?.map((f) => f.id) ?? []
    if (fac.length) await admin.from('factures_lignes').delete().in('facture_id', fac)
    await admin.from('factures').delete().eq('artisan_id', uid)
    const dv = (await admin.from('devis').select('id').eq('artisan_id', uid)).data?.map((d) => d.id) ?? []
    if (dv.length) await admin.from('devis_lignes').delete().in('devis_id', dv)
    await admin.from('devis').delete().eq('artisan_id', uid)
    await admin.from('leads').delete().eq('artisan_id', uid)
    await admin.from('regles_automatisation').delete().eq('artisan_id', uid)
    await admin.from('plateforme_config').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid).catch(() => {})
    log('🧹 compte de démonstration détruit')
  } else if (uid) {
    fs.writeFileSync(path.join(process.cwd(), '.demo-compte.local'), `email=${email}\nmot_de_passe=${mdp}\nslug=${slug}\n`)
    log(`compte conservé : ${email} — identifiants écrits dans .demo-compte.local (ignoré par git, jamais dans le chat)`)
  }
}
