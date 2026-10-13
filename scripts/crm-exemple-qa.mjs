#!/usr/bin/env node
// scripts/crm-exemple-qa.mjs — juge NAVIGATEUR du CRM en mode EXEMPLE (demande de Benj du 13/10), SANS compte, SANS base.
//
// Le vrai écran (/crm et ses fiches), servi par un serveur LOCAL de l'application, dans Chromium. Le réseau est tenu par le
// juge : une session factice est posée dans le navigateur (aucune connexion, aucun mot de passe), GET /api/crm/vue rend un
// compte VIDE (c'est le cas où l'exemple s'affiche d'office), et TOUTE autre requête vers Supabase ou une route d'écriture
// est interceptée, notée et jamais transmise. Rien ne peut sortir de la machine ni toucher la production.
//
//  E1  compte vide → l'exemple d'office, sur TOUS les onglets, sous le bandeau « Exemple : données fictives, rien n'est
//      enregistré » ; « Voir mes données » / « Voir l'exemple » basculent, et le choix tient d'un onglet à l'autre.
//  E2  AUCUNE écriture : sur chaque onglet et chaque fiche, le juge clique chaque bouton, change chaque liste, remplit et
//      envoie chaque formulaire — aucune requête autre que GET ne part, et aucune lecture de données réelles du CRM (autre
//      que la vue initiale) ; les boutons répondent « Dans l'exemple, rien n'est envoyé ».
//  E3  fiches : la fiche chantier et la fiche client de l'exemple s'ouvrent (« ?exemple=1 »), sans lire le serveur.
//  E4  recette : la visite guidée ne recouvre pas /crm ; « Payé » entière à 1 440 px ; téléphone sans défilement de côté.
//  E5  équipe : la notice d'information se télécharge (fichier fabriqué dans le navigateur).
//  E6  3D : première image de l'atelier d'exemple à froid (cache vide, lecture des données simulée à 600 ms) ≤ 2,5 s.
//  E7  zéro erreur de console.
//  K   captures bureau (1 440 × 900) et téléphone (390 × 844) de chaque onglet et des deux fiches (--captures=<dossier>).
//
// Usage : TEST_BASE=http://localhost:3158 node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-exemple-qa.mjs [--captures=<dossier>]
// Codes : 0 vert · 1 rouge · 2 serveur absent.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!BASE || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('TEST_BASE manquant ou non local (ex. http://localhost:3158).'); process.exit(2) }
const CAPTURES = process.argv.find((a) => a.startsWith('--captures='))?.slice(11)
if (CAPTURES) fs.mkdirSync(CAPTURES, { recursive: true })

let verts = 0
const rouges = []
const T = (n, c, d = '') => { if (c) { verts++; console.log(`PASS ${n}`) } else { rouges.push(n); console.log(`FAIL ${n}${d ? ' — ' + String(d).slice(0, 500) : ''}`) } }

// ── Le compte VIDE : la vraie forme de GET /api/crm/vue, calculée par lib/crm/vue.ts sur zéro ligne ──────────────────────
const { construireVue } = await import(pathToFileURL(path.join(RACINE, 'lib/crm/vue.ts')).href)
const UID = '00000000-0000-4000-8000-0000000000aa'
const VIDE = construireVue({ uid: UID, metier: 'Plombier', maintenant: new Date(), idDe: (c) => c.padEnd(64, '0').slice(0, 64),
  d: { devis: [], factures: [], leads: [], chantiers: [], taches: [], materiaux: [], deplacements: [], carnet: [], vehicules: [], membres: [], equipe: [], tronque: false } })

// ── La session factice (jamais envoyée à Supabase : toutes ses requêtes sont interceptées) ───────────────────────────────
const env = fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8')
const SUPA = (env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1] ?? '').trim()
const SUPA_HOTE = new URL(SUPA).host
const CLE_SESSION = `sb-${SUPA_HOTE.split('.')[0]}-auth-token`
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const exp = Math.floor(Date.now() / 1000) + 3600
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, aud: 'authenticated', role: 'authenticated', aal: 'aal1', amr: [{ method: 'password', timestamp: exp - 3600 }], exp })}.c2lnbmF0dXJlLWZhY3RpY2U`
const SESSION = { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'factice', user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'exemple@test.invalid', app_metadata: {}, user_metadata: {}, factors: [] } }
const ARTISAN = { id: UID, nom: 'Compte de test', metier: 'Plombier', plan: 'signature', aide_vues: [], is_founder: false }

const ecritures = [] // toute requête autre que GET (à n'importe quelle adresse)
const lecturesCrm = [] // toute lecture /api/crm/* autre que la vue initiale
const erreursConsole = []
async function preparer(ctx, { delaiVue = 0 } = {}) {
  await ctx.addInitScript(([cle, s]) => { try { localStorage.setItem(cle, s) } catch { /* rien */ } }, [CLE_SESSION, JSON.stringify(SESSION)])
  await ctx.route('**/*', async (route) => {
    const req = route.request()
    const u = new URL(req.url())
    const m = req.method()
    if (m !== 'GET' && m !== 'HEAD') ecritures.push(`${m} ${u.host === SUPA_HOTE ? 'supabase' : ''}${u.pathname}`)
    if (u.host === SUPA_HOTE) {
      if (u.pathname.startsWith('/rest/v1/artisans')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/vnd\.pgrst\.object/.test(req.headers().accept ?? '') ? ARTISAN : [ARTISAN]) })
      if (u.pathname.startsWith('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION.user) })
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/0' }, body: '[]' })
    }
    if (u.origin !== BASE) return route.fulfill({ status: 204, body: '' }) // aucune sortie vers l'extérieur
    if (u.pathname === '/api/crm/vue' && m === 'GET') { if (delaiVue) await new Promise((r) => setTimeout(r, delaiVue)); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...VIDE, maintenant: new Date().toISOString() }) }) }
    if (u.pathname.startsWith('/api/crm/')) lecturesCrm.push(`${m} ${u.pathname}`)
    if (u.pathname === '/api/essais') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ crm: true, assistant: false }) })
    if (u.pathname.startsWith('/api/')) return route.fulfill({ status: m === 'GET' ? 200 : 403, contentType: 'application/json', body: m === 'GET' ? '{}' : '{"error":"intercepté par le juge"}' })
    return route.continue()
  })
}
const surveiller = (page, nom) => {
  page.on('console', (msg) => { if (msg.type() === 'error') erreursConsole.push(`${nom}: ${msg.text()}`) })
  page.on('pageerror', (e) => erreursConsole.push(`${nom}: ${e}`))
  page.on('dialog', (d) => { void (d.type() === 'prompt' ? d.accept('Libellé modifié') : d.accept()) })
}

const statut = await fetch(`${BASE}/login`).then((r) => r.status).catch(() => 0)
if (statut !== 200) { console.error(`⏸  ${BASE} ne répond pas (${statut}).`); process.exit(2) }

const nav = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], channel: 'chromium' }).catch(() => chromium.launch())
const ONGLETS = [['atelier', 'Atelier'], ['tableau', 'Tableau de bord'], ['pipeline', 'Pipeline'], ['chantiers', 'Chantiers'], ['clients', 'Clients'], ['equipe', 'Équipe & véhicules']]
const capture = async (page, nom) => { if (CAPTURES) await page.screenshot({ path: path.join(CAPTURES, `${nom}.png`), fullPage: true }) }

/** Cliquer TOUT ce qui agit dans une zone (boutons, listes, formulaires), sauf ce qui navigue hors de la zone. */
async function toutActionner(page, zone, nom) {
  const avant = ecritures.length
  let gestes = 0
  // Les formulaires : chaque champ requis rempli, puis envoyé.
  for (const form of await page.locator(`${zone} form`).all()) {
    if (!(await form.isVisible().catch(() => false))) continue
    for (const champ of await form.locator('input:not([type=checkbox]):not([type=radio]), textarea').all()) {
      if (!(await champ.isVisible().catch(() => false)) || !(await champ.isEditable().catch(() => false))) continue
      const type = await champ.getAttribute('type')
      await champ.fill(type === 'date' ? '2026-10-20' : type === 'number' ? '2' : /quantit/i.test((await champ.getAttribute('inputmode')) ?? '') ? '2' : 'Essai du juge').catch(() => {})
    }
    for (const sel of await form.locator('select').all()) {
      const options = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean))
      if (options.length) await sel.selectOption(options[0]).catch(() => {})
    }
    const envoi = form.locator('button[type=submit]').first()
    if (await envoi.count() && await envoi.isEnabled().catch(() => false)) { await envoi.click().catch(() => {}); gestes++; await page.waitForTimeout(150) }
  }
  // Les listes hors formulaire (« Déplacer vers… », affectation d'une tâche).
  for (const sel of await page.locator(`${zone} select`).all()) {
    if (!(await sel.isVisible().catch(() => false)) || !(await sel.isEnabled().catch(() => false))) continue
    if (await sel.evaluate((s) => !!s.closest('form'))) continue
    const options = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean))
    if (options.length) { await sel.selectOption(options[options.length - 1]).catch(() => {}); gestes++; await page.waitForTimeout(120) }
  }
  // Les cases (tâches).
  for (const c of await page.locator(`${zone} input[type=checkbox]`).all()) {
    if (!(await c.isVisible().catch(() => false)) || !(await c.isEnabled().catch(() => false))) continue
    if (await c.evaluate((x) => !!x.closest('form'))) continue
    await c.click().catch(() => {}); gestes++; await page.waitForTimeout(120)
  }
  // Les boutons, un par un (relus à chaque tour : un clic peut en faire apparaître, comme « Envoyer au client »).
  const faits = new Set()
  for (let tour = 0; tour < 4; tour++) {
    for (const b of await page.locator(`${zone} button:not([role=tab])`).all()) {
      const cle = (await b.evaluate((x) => x.outerHTML.slice(0, 160)).catch(() => '')) + (await b.textContent().catch(() => ''))
      if (faits.has(cle)) continue
      faits.add(cle)
      if (!(await b.isVisible().catch(() => false)) || !(await b.isEnabled().catch(() => false))) continue
      const texte = (await b.textContent())?.trim() ?? ''
      if (/^(Voir mes données|Voir l’exemple|Télécharger le modèle de notice)$/.test(texte)) continue
      await b.click({ timeout: 2000 }).catch(() => {}); gestes++
      await page.waitForTimeout(140)
      if (!page.url().startsWith(BASE + '/crm')) { await page.goBack().catch(() => {}); break }
    }
  }
  return { gestes, ecrites: ecritures.slice(avant) }
}

// CRM_QA_VUES=telephone : une seule taille (mise au point) ; CRM_QA_SANS_3D=1 : sans la mesure E6.
for (const [vp, taille] of [['bureau', { width: 1440, height: 900 }], ['telephone', { width: 390, height: 844 }]].filter(([v]) => !process.env.CRM_QA_VUES || process.env.CRM_QA_VUES.split(',').includes(v))) {
  const tel = vp === 'telephone'
  const ctx = await nav.newContext({ viewport: taille, ...(tel ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}), acceptDownloads: true })
  await preparer(ctx)
  const page = await ctx.newPage()
  surveiller(page, vp)
  await page.goto(`${BASE}/crm?vue=atelier`, { waitUntil: 'domcontentloaded', timeout: 300_000 })
  await page.waitForSelector('[data-crm-mode]', { timeout: 180_000 })
  const bandeau = (await page.locator('[data-crm-mode]').innerText()).replace(/\s+/g, ' ')
  T(`E1 ${vp} : compte vide → l’exemple d’office, sous le bandeau « données fictives, rien n’est enregistré »`, (await page.locator('[data-crm-mode]').getAttribute('data-crm-mode')) === 'exemple' && /Exemple : données fictives, rien n’est enregistré\./.test(bandeau), bandeau)
  await page.waitForTimeout(1500)
  T(`E4 ${vp} : la visite guidée ne recouvre pas /crm`, (await page.locator('.visite').count()) === 0)

  for (const [id, libelle] of ONGLETS) {
    await page.getByRole('tab', { name: libelle }).click()
    await page.waitForTimeout(id === 'atelier' ? 2500 : 600)
    const texte = await page.locator('.crm-vue').innerText()
    const attendu = { atelier: /Raccords|Salle de bain|Liste des éléments|Plan/, tableau: /Signé ce mois[\s\S]*11[\s\u202f\u00a0]190/, pipeline: /Payé[\s\S]*Remplacement robinetterie|Remplacement robinetterie[\s\S]*Payé/, chantiers: /Salle de bain, étage[\s\S]*Client fictif A/, clients: /Client fictif A/, equipe: /Compagnon 1[\s\S]*Camionnette 1/ }[id]
    T(`E1 ${vp} : onglet ${libelle} montre l’exemple (et seulement lui)`, attendu.test(texte) && (await page.locator('[data-crm-mode="exemple"]').count()) === 1, texte.slice(0, 200))
    if (tel) T(`E4 ${vp} : ${libelle} sans défilement de côté de la page`, (await page.evaluate(() => document.documentElement.scrollWidth)) <= taille.width + 1,
      await page.evaluate(() => {
        const nom = (e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`
        const debordent = [...document.querySelectorAll('body *')].filter((e) => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible')
        // Les éléments plus larges que l'écran dont le parent ne l'est pas : c'est là que la page s'élargit.
        const depassent = [...document.querySelectorAll('.psh-content *')].filter((e) => {
          const r = e.getBoundingClientRect(), p = e.parentElement?.getBoundingClientRect()
          return r.width > window.innerWidth + 1 && p && p.width <= window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed'
        })
        return `${document.documentElement.scrollWidth} px ; débordent : ${debordent.slice(0, 6).map((e) => `${nom(e)} ${e.clientWidth}/${e.scrollWidth}`).join(', ')} ; dépassent : ${depassent.slice(0, 6).map((e) => `${nom(e)} ${Math.round(e.getBoundingClientRect().right)}`).join(', ')}`
      }))
    if (!tel && id === 'pipeline') {
      const geo = await page.evaluate(() => { const p = document.querySelector('.crm-pipeline'); const paye = document.getElementById('crm-col-paye')?.closest('section'); const a = p.getBoundingClientRect(), b = paye.getBoundingClientRect(); return { sw: p.scrollWidth, cw: p.clientWidth, droite: b.right, bord: a.right } })
      T('E4 bureau 1 440 px : les six colonnes tiennent, « Payé » est entière (pas de défilement)', geo.sw <= geo.cw + 1 && geo.droite <= geo.bord + 1, JSON.stringify(geo))
    }
    await capture(page, `${vp}-${id}`)
    if (id === 'atelier') continue // les boutons de l'atelier sont ceux de la caméra et des filtres (aucun appel)
    const r = await toutActionner(page, '.crm-vue', `${vp}-${id}`)
    T(`E2 ${vp} : ${libelle} — ${r.gestes} gestes, aucune écriture n’est partie`, r.ecrites.length === 0, r.ecrites.join(' | '))
    if (['pipeline', 'chantiers', 'equipe'].includes(id)) T(`E2 ${vp} : ${libelle} — le bouton répond « Dans l’exemple, rien n’est envoyé »`, /Dans l’exemple, rien n’est envoyé/.test(await page.locator('.crm-vue').innerText()))
    if (id === 'equipe' && !tel) {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10_000 }).catch(() => null), page.getByRole('button', { name: 'Télécharger le modèle de notice' }).click()])
      const chemin = dl ? await dl.path().catch(() => null) : null
      const contenu = chemin ? fs.readFileSync(chemin, 'utf8') : ''
      T('E5 la notice d’information de l’équipe se télécharge, avec les durées appliquées', dl?.suggestedFilename() === 'notice-information-equipe.txt' && /12 mois/.test(contenu) && /24 mois|2 ans/.test(contenu) && /CNIL/.test(contenu), contenu.slice(0, 120))
    }
  }

  // Fiche chantier de l'exemple.
  await page.getByRole('tab', { name: 'Chantiers' }).click()
  await page.locator('.crm-vue a.obj').first().click()
  await page.waitForSelector('.crm-fiche', { timeout: 60_000 })
  T(`E3 ${vp} : la fiche chantier de l’exemple s’ouvre (?exemple=1), sous le bandeau, sans lire le serveur`, /exemple=1/.test(page.url()) && (await page.locator('[data-crm-mode="exemple"]').count()) === 1 && /Salle de bain, étage/.test(await page.locator('.crm-fiche').innerText()) && lecturesCrm.length === 0, `${page.url()} ${lecturesCrm.join(' ')}`)
  await capture(page, `${vp}-fiche-chantier`)
  const coche = page.locator('.crm-taches input[type=checkbox]').nth(3)
  const avantCoche = await coche.isChecked()
  await coche.click(); await page.waitForTimeout(300)
  T(`E2 ${vp} : cocher une tâche dans l’exemple — la case revient, et l’écran dit que rien n’est envoyé`, (await coche.isChecked()) === avantCoche && /Dans l’exemple, rien n’est envoyé/.test(await page.locator('.crm-fiche').innerText()))
  await page.getByRole('button', { name: 'Notifier le client' }).click()
  await page.getByRole('button', { name: 'Envoyer au client' }).click(); await page.waitForTimeout(200)
  const rf = await toutActionner(page, '.crm-fiche', `${vp}-fiche-chantier`)
  T(`E2 ${vp} : fiche chantier — Notifier, Facturer, tâches, organisation, matériel, notes, suppression (${rf.gestes} gestes) : aucune écriture`, rf.ecrites.length === 0 && ecritures.length === 0, rf.ecrites.join(' | '))
  T(`E3 ${vp} : les liens hors CRM de la fiche sont inertes (devis, factures, inventaire, itinéraire)`, (await page.locator('.crm-fiche a[href^="/devis"], .crm-fiche a[href^="/factures"], .crm-fiche a[href^="/inventaire"], .crm-fiche a[href^="https:"]').count()) === 0 && (await page.locator('.crm-fiche .crm-lien-inerte').count()) > 0)

  // Fiche client de l'exemple.
  await page.goto(`${BASE}/crm?vue=clients`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-crm-mode="exemple"]', { timeout: 60_000 })
  await page.locator('.crm-vue a.obj', { hasText: 'Client fictif A' }).click()
  await page.waitForSelector('.crm-fiche', { timeout: 60_000 })
  T(`E3 ${vp} : la fiche client de l’exemple s’ouvre, avec son devis, son chantier et sa note`, /exemple=1/.test(page.url()) && /EX-2026-001[\s\S]*Salle de bain, étage[\s\S]*Préfère être appelée/.test(await page.locator('.crm-fiche').innerText()) && lecturesCrm.length === 0)
  await capture(page, `${vp}-fiche-client`)
  const rc = await toutActionner(page, '.crm-fiche', `${vp}-fiche-client`)
  T(`E2 ${vp} : fiche client — note ajoutée puis supprimée (${rc.gestes} gestes) : aucune écriture`, rc.ecrites.length === 0 && /Dans l’exemple, rien n’est envoyé/.test(await page.locator('.crm-fiche').innerText()), rc.ecrites.join(' | '))

  // Bascule « Voir mes données » : le compte (vide) ; le choix tient ; retour à l'exemple.
  await page.goto(`${BASE}/crm?vue=tableau`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-crm-mode="exemple"]', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Voir mes données' }).click()
  await page.waitForSelector('[data-crm-mode="donnees"]')
  const vide = await page.locator('.crm-vue').innerText()
  await capture(page, `${vp}-mes-donnees-vide`)
  await page.getByRole('tab', { name: 'Pipeline' }).click(); await page.waitForTimeout(300)
  T(`E1 ${vp} : « Voir mes données » montre le compte (vide : des « — », aucun chiffre d’exemple) et le choix tient d’un onglet à l’autre`, !/11[\s\u202f\u00a0]190|fictif/.test(vide) && /Aucun devis pour l’instant/.test(vide) && (await page.locator('[data-crm-mode="donnees"]').count()) === 1 && /Aucun dossier pour l’instant/.test(await page.locator('.crm-vue').innerText()))
  await page.getByRole('button', { name: 'Voir l’exemple' }).click()
  T(`E1 ${vp} : « Voir l’exemple » y revient`, (await page.locator('[data-crm-mode="exemple"]').count()) === 1 && /Client fictif/.test(await page.locator('.crm-vue').innerText()))
  T(`E2 ${vp} : au total, aucune requête autre que GET n’est partie, aucune donnée réelle du CRM n’a été lue en exemple`, ecritures.length === 0 && lecturesCrm.length === 0, [...ecritures, ...lecturesCrm].join(' | '))
  await ctx.close()
}

// ═══════════════════════ E6. Première image 3D à froid, sur /crm (exemple), lecture simulée à 600 ms ═══════════════════════
if (!process.env.CRM_QA_SANS_3D) {
  { const c = await nav.newContext(); const p = await c.newPage(); await p.goto(`${BASE}/login`, { waitUntil: 'load' }).catch(() => {}); await c.close() }
  const mesures = []
  for (let i = 0; i < 3; i++) {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
    await preparer(ctx, { delaiVue: 600 })
    const page = await ctx.newPage(); surveiller(page, '3d')
    await page.goto(`${BASE}/crm?vue=atelier&mesure=1`, { waitUntil: 'load', timeout: 300_000 })
    const ok = await page.waitForFunction(() => window.__atelier && window.__atelier.fps > 0, null, { timeout: 120_000 }).then(() => true).catch(() => false)
    mesures.push(ok ? Math.round(await page.evaluate(() => window.__atelier.premiereImageMs)) : Infinity)
    // Le détail (où passe le temps) : page prête, vue reçue, plus gros scripts reçus, première image.
    console.log('   ' + await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0]
      const res = performance.getEntriesByType('resource')
      const vue = res.find((r) => r.name.includes('/api/crm/vue'))
      const gros = res.filter((r) => r.initiatorType === 'script' && r.transferSize > 60_000).sort((a, b) => b.responseEnd - a.responseEnd).slice(0, 4)
      return `DOM prêt ${Math.round(nav.domContentLoadedEventEnd)} ms · vue ${vue ? `${Math.round(vue.startTime)}→${Math.round(vue.responseEnd)}` : '?'} ms · scripts lourds ${gros.map((r) => `${r.name.split('/').pop().slice(0, 18)} ${Math.round(r.transferSize / 1024)} Ko ${Math.round(r.startTime)}→${Math.round(r.responseEnd)}`).join(' ; ')} · atelier monté ${Math.round(window.__atelierMonte ?? -1)} · module 3D ${Math.round(window.__atelierEtapes?.module ?? -1)} · scène rendue ${Math.round(window.__atelierEtapes?.sceneRendue ?? -1)} · toile créée ${Math.round(window.__atelierEtapes?.toileCreee ?? -1)} · 1re image ${Math.round(window.__atelier.premiereImageMs)} ms`
    }).catch(() => '(détail indisponible)'))
    await ctx.close()
  }
  const med = [...mesures].sort((a, b) => a - b)[1]
  console.log(`   première image 3D sur /crm, cache vide, vue servie en 600 ms : ${mesures.join(' / ')} ms`)
  T(`E6 première image 3D à froid ≤ 2,5 s (médiane ${med} ms, lecture des données comprise)`, med <= 2500, mesures.join(' / '))
}

await nav.close()
const bruit = erreursConsole.filter((e) => !/Failed to load resource: the server responded with a status of (401|403|404)/.test(e))
T(`E7 aucune erreur de console (${bruit.length})`, bruit.length === 0, bruit.slice(0, 5).join(' | '))
console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
