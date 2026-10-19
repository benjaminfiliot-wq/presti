#!/usr/bin/env node
// scripts/crm-captures.mjs — captures des écrans du CRM en mode EXEMPLE, pour REGARDER le rendu réel de chaque lot (bureau et
// téléphone, schéma de couleurs clair et sombre émulé), SANS compte et SANS base : même méthode que scripts/crm-exemple-qa.mjs
// (session factice dans le navigateur, réseau tenu par le script, GET /api/crm/vue = compte vide → exemple d'office ; toute
// autre requête vers Supabase ou une route d'écriture est interceptée et jamais transmise).
//
// Il vérifie aussi, page par page : zéro erreur de console, aucun défilement de côté sur téléphone (390 px).
// Usage : TEST_BASE=http://localhost:3217 node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-captures.mjs <dossier> [page…]
//   page : un chemin (« /crm?vue=pipeline »). Par défaut : tableau de bord, pipeline, fiche chantier, fiche client.
// Codes : 0 vert · 1 rouge · 2 serveur absent.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('TEST_BASE manquant ou non local.'); process.exit(2) }
const [DOSSIER, ...PAGES_ARG] = process.argv.slice(2)
if (!DOSSIER) { console.error('Dossier de sortie manquant.'); process.exit(2) }
fs.mkdirSync(DOSSIER, { recursive: true })
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const PAGES = PAGES_ARG.length ? PAGES_ARG : ['/crm?vue=tableau&exemple=1', '/crm?vue=pipeline&exemple=1', `/crm/chantiers/${ID(1)}?exemple=1`, `/crm/clients/d-${ID(501)}?exemple=1`]

const { construireVue } = await import(pathToFileURL(path.join(RACINE, 'lib/crm/vue.ts')).href)
const UID = '00000000-0000-4000-8000-0000000000aa'
const VIDE = construireVue({ uid: UID, metier: 'Plombier', maintenant: new Date(), idDe: (c) => c.padEnd(64, '0').slice(0, 64),
  d: { devis: [], factures: [], leads: [], chantiers: [], taches: [], materiaux: [], deplacements: [], carnet: [], vehicules: [], membres: [], equipe: [], tronque: false } })
const env = fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8')
const SUPA_HOTE = new URL((env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1] ?? '').trim()).host
const CLE_SESSION = `sb-${SUPA_HOTE.split('.')[0]}-auth-token`
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const exp = Math.floor(Date.now() / 1000) + 3600
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, aud: 'authenticated', role: 'authenticated', aal: 'aal1', exp })}.c2lnbmF0dXJlLWZhY3RpY2U`
const SESSION = { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'factice', user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'exemple@test.invalid', app_metadata: {}, user_metadata: {}, factors: [] } }
const ARTISAN = { id: UID, nom: 'Compte de test', metier: 'Plombier', plan: 'signature', aide_vues: ['*'], is_founder: false }

let verts = 0
const rouges = []
const T = (n, c, d = '') => { if (c) { verts++; console.log(`PASS ${n}`) } else { rouges.push(n); console.log(`FAIL ${n}${d ? ' — ' + String(d).slice(0, 400) : ''}`) } }
const statut = await fetch(`${BASE}/login`).then((r) => r.status).catch(() => 0)
if (statut !== 200) { console.error(`${BASE} ne répond pas.`); process.exit(2) }
const nav = await chromium.launch()
try {
  for (const [nomVue, vue] of [['bureau', { width: 1440, height: 900 }], ['telephone', { width: 390, height: 844 }]]) {
    for (const schema of ['dark', 'light']) {
      const ctx = await nav.newContext({ viewport: vue, colorScheme: schema, deviceScaleFactor: nomVue === 'telephone' ? 2 : 1, reducedMotion: 'reduce' })
      await ctx.addInitScript(([cle, s]) => { try { localStorage.setItem(cle, s); localStorage.setItem('presti-visite-vue', '1') } catch { /* rien */ } }, [CLE_SESSION, JSON.stringify(SESSION)])
      await ctx.routeWebSocket(/realtime/, (ws) => { void ws.close() })
      await ctx.route('**/*', async (route) => {
        const req = route.request(); const u = new URL(req.url()); const m = req.method()
        if (u.host === SUPA_HOTE) {
          if (u.pathname.startsWith('/rest/v1/artisans')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/vnd\.pgrst\.object/.test(req.headers().accept ?? '') ? ARTISAN : [ARTISAN]) })
          if (u.pathname.startsWith('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION.user) })
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/0' }, body: '[]' })
        }
        if (u.origin !== BASE) return route.fulfill({ status: 204, body: '' })
        if (u.pathname === '/api/crm/vue' && m === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...VIDE, maintenant: new Date().toISOString() }) })
        if (u.pathname === '/api/essais') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ crm: true, assistant: false }) })
        if (u.pathname.startsWith('/api/')) return route.fulfill({ status: m === 'GET' ? 200 : 403, contentType: 'application/json', body: m === 'GET' ? '{}' : '{"error":"intercepté"}' })
        return route.continue()
      })
      const page = await ctx.newPage()
      const erreurs = []
      page.on('console', (msg) => { if (msg.type() === 'error' && !/Failed to load resource|favicon|status of 40[34]/.test(msg.text())) erreurs.push(msg.text()) })
      page.on('pageerror', (e) => erreurs.push(String(e)))
      for (const chemin of PAGES) {
        erreurs.length = 0
        // « atelier:<texte> » : l'atelier d'exemple (plan 2D, mouvement réduit), puis le panneau de l'objet qui porte ce texte.
        const objet = chemin.startsWith('atelier:') ? chemin.slice(8) : null
        await page.goto(`${BASE}${objet ? '/crm?vue=atelier&exemple=1' : chemin}`, { waitUntil: 'domcontentloaded', timeout: 300_000 })
        await page.waitForSelector('.crm-fiche, .crm-tdb, .crm-pipeline-cadre, .crm-vue', { timeout: 120_000 }).catch(() => {})
        if (objet) { await page.locator('.atl-plan-objet', { hasText: objet }).first().click({ timeout: 60_000 }); await page.waitForSelector('.atl-panneau', { timeout: 30_000 }) }
        // L'indicateur du serveur de développement (« N ») n'est pas l'application : retiré de la capture.
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
        await page.waitForTimeout(1200)
        const nom = `${chemin.replace(/:/g, '-').replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-?exemple-1/, '').slice(0, 60)}-${nomVue}-${schema}`
        await page.screenshot({ path: path.join(DOSSIER, `${nom}.png`), fullPage: true })
        const large = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        T(`${nom} : aucune erreur de console`, erreurs.length === 0, erreurs.join(' | '))
        if (nomVue === 'telephone') T(`${nom} : aucun défilement de côté (${large} px)`, large <= 1, String(large))
      }
      await ctx.close()
    }
  }
} finally { await nav.close() }
console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)`)
process.exitCode = rouges.length ? 1 : 0
