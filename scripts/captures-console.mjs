// Captures de la CONSOLE de l'artisan — pour les vidéos des publications (prompt v13).
//
// Pourquoi ce script existe alors que `demo-captures.mjs` existe déjà : celui-là photographie la
// page vue par LE CLIENT (les cinq scènes de la landing). Les vidéos de v13 parlent de ce que
// l'artisan voit, et surtout du **devis posé en brouillon** — l'écran qui prouve la phrase
// « mon IA chiffre le devis, puis elle s'arrête ». Cet écran n'existait dans aucune capture.
//
//   node scripts/captures-console.mjs
//
// Coût IA : ZÉRO. Aucune génération n'est déclenchée. Le devis brouillon photographié est une
// COPIE du devis que le produit a réellement chiffré le 04/09 sur le compte de démonstration,
// reposée en brouillon le temps de la photo, puis supprimée dans un `finally`. On photographie
// donc le vrai écran du vrai produit avec du vrai contenu produit par lui — ce qui est la seule
// chose que v13 autorise, et le contraire d'une interface redessinée.
//
// Le compte : `atelier-du-chene` (menuisier, offre Signature), conservé par `--garder`, ses
// identifiants dans `.demo-compte.local`. Le « client » de la démonstration est un personnage,
// pas une personne : aucune donnée d'un vrai artisan ni d'un vrai prospect n'entre ici.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const OUT = path.join(process.cwd(), 'promo-src', 'captures')
fs.mkdirSync(OUT, { recursive: true })

const compte = Object.fromEntries(
  fs.readFileSync('.demo-compte.local', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1)]
  }),
)
const email = compte.email
// Le mot de passe noté dans `.demo-compte.local` est périmé dès que `demo-captures.mjs` a
// retourné (il le renouvelle à chaque exécution) — la connexion échoue alors sur un
// « Email ou mot de passe incorrect » qui ressemble à un compte cassé. On le renouvelle ici
// aussi, et on réécrit le fichier : le prochain qui l'ouvre lit quelque chose de vrai.
const mdp = crypto.randomBytes(18).toString('base64url')

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const log = (s) => console.log(s)

// Le brouillon temporaire, gardé ici pour que le `finally` le retrouve même si tout casse au milieu.
let brouillonId = null
let navigateur = null

try {
  const { data: artisan } = await admin.from('artisans').select('id, nom').eq('slug', 'atelier-du-chene').single()
  log(`compte de démonstration : ${artisan.nom}`)

  const { error: eMdp } = await admin.auth.admin.updateUserById(artisan.id, { password: mdp })
  if (eMdp) throw new Error(`mot de passe non renouvelé : ${eMdp.message}`)
  fs.writeFileSync('.demo-compte.local', `email=${email}
mot_de_passe=${mdp}
slug=atelier-du-chene
`, 'utf8')
  log('mot de passe renouvelé et réécrit dans .demo-compte.local')

  // ── Le brouillon : copie conforme du devis réellement chiffré par le produit le 04/09 ────────
  const { data: source } = await admin
    .from('devis').select('*').eq('artisan_id', artisan.id).order('created_at', { ascending: false }).limit(1).single()
  const { data: lignes } = await admin.from('devis_lignes').select('*').eq('devis_id', source.id).order('ordre')
  log(`devis source : ${source.numero} (${source.statut}), ${lignes.length} lignes`)

  const copie = { ...source }
  for (const champ of ['id', 'created_at', 'updated_at', 'accepte_le', 'accepte_ip', 'accepte_canal', 'envoye_le']) delete copie[champ]
  copie.numero = 'DEV-2026-0006'
  copie.statut = 'brouillon'
  // `devis_regle_par_lead_idx` (0050_pilotage.sql:68) n'autorise qu'UN devis de source `regle`
  // par lead — une bonne garde, qui empêche une règle de chiffrer deux fois la même conversation.
  // La copie n'est pas issue d'une règle : elle est posée à la main pour la photo, et le dit.
  copie.source = 'manuel'

  const { data: cree, error: eCree } = await admin.from('devis').insert(copie).select('id, numero').single()
  if (eCree) throw new Error(`création du brouillon refusée : ${eCree.message}`)
  brouillonId = cree.id
  log(`brouillon posé : ${cree.numero}`)

  const { error: eL } = await admin.from('devis_lignes').insert(
    lignes.map((l) => {
      const c = { ...l }
      delete c.id
      c.devis_id = brouillonId
      return c
    }),
  )
  if (eL) throw new Error(`lignes du brouillon refusées : ${eL.message}`)

  // ── La console, vue comme l'artisan la voit ──────────────────────────────────────────────────
  navigateur = await chromium.launch()
  const page = await navigateur.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 })

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#email-connexion', email)
  await page.fill('#mdp-connexion', mdp)
  await page.click('form button[type="submit"], form button:not([type="button"])')
  await codeEmailSiDemande(page, email)
  try {
    await page.waitForURL(/\/(outils|dashboard|plateforme|devis)/, { timeout: 25000 })
  } catch {
    // Un échec de connexion muet ferait sortir quatre captures d'une page de login — c'est
    // exactement le genre de sortie qui passe pour un succès. On dit où on est, et ce qu'on voit.
    const vu = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400))
    await page.screenshot({ path: path.join(OUT, 'debug-connexion.png') })
    throw new Error(`connexion bloquée · URL=${page.url()} · écran : ${vu}`)
  }
  log(`connecté — ${page.url()}`)

  const shot = async (nom, cible) => {
    const f = path.join(OUT, `${nom}.png`)
    await (cible || page).screenshot({ path: f })
    log(`📸 ${nom} — ${(fs.statSync(f).size / 1024).toFixed(0)} Ko`)
  }

  // La visite guidée recouvre l'écran à la première ouverture.
  const plusTard = page.getByRole('button', { name: /Plus tard/ })

  await page.goto(`${BASE}/devis`, { waitUntil: 'networkidle' })
  if (await plusTard.count()) { await plusTard.first().click(); await page.waitForTimeout(400) }
  await page.waitForTimeout(1500)
  await shot('console-devis-liste')

  await page.goto(`${BASE}/devis/${brouillonId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await shot('console-devis-brouillon')

  await page.goto(`${BASE}/plateforme`, { waitUntil: 'networkidle' })
  if (await plusTard.count()) { await plusTard.first().click(); await page.waitForTimeout(400) }
  await page.waitForTimeout(1200)
  await shot('console-plateforme')

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await shot('console-tableau-de-bord')

  // ── Le site public, SANS la photo du portfolio ──────────────────────────────────────────────
  //
  // Les photos du portfolio de démonstration viennent de Wikimedia Commons et sont en **CC BY-SA
  // 4.0** (escalier hélicoïdal : Petar Milošević — voir public/demo/portfolio/attributions.json).
  // Sur le site c'est parfait : l'attribution y est affichée. Dans une VIDÉO DE PUBLICITÉ, non :
  // l'attribution devrait être incrustée, et surtout le partage à l'identique s'étendrait au film
  // lui-même. On capture donc la page **défilée sous la bannière**, là où il n'y a que le texte,
  // la marque et les boutons de l'artisan — c'est-à-dire ce que la publication n° 8 raconte.
  await page.goto(`${BASE}/site/atelier-du-chene`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 1.25)))
  await page.waitForTimeout(1400)
  await shot('site-public-sous-banniere')

  log(`\n✓ captures dans ${path.relative(process.cwd(), OUT)}`)
} finally {
  // Le ménage n'est PAS conditionnel : un brouillon de démonstration laissé en production est une
  // ligne fausse dans le compte que Benj montre. Il part même si la capture a échoué.
  if (brouillonId) {
    await admin.from('devis_lignes').delete().eq('devis_id', brouillonId)
    const { error } = await admin.from('devis').delete().eq('id', brouillonId)
    log(error ? `⚠️ brouillon ${brouillonId} NON supprimé : ${error.message}` : '🧹 brouillon temporaire supprimé')
  }
  if (navigateur) await navigateur.close()
}
