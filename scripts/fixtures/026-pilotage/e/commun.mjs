// scripts/fixtures/026-pilotage/e/commun.mjs — l'aide du juge d'écran de la station Claw3D (lot e, fiche 026-172, écrite par Claude Code) :
// scripts/station-ecran-qa.mjs, scripts/station-recette.mjs et juges-026-pilotage-preuve.mjs --lot=e (via lot.mjs et controles.mjs).
// Elle importe les aides des lots a, c et k sans les recopier (jamais l'inverse). Rien ici ne lit .env.local ni presti-secrets ; aucune écriture hors
// .orchestre/travail/ (et, pour les captures de la racine réelle, .orchestre/preuves/<fiche jugée>/).
//
//   PARTIES, FICHE_DE, CRITERES_DE          les huit parties du juge, la fiche que chacune juge, les critères CE de chacune (CONTRAT.md)
//   fichiersTemoinE(), arbreTemoinE(base)   l'arbre du mode --temoin : le TÉMOIN du lot (e/temoin/, suffixe .temoin ôté) posé sur le commit `base`
//   copierPourBuild(racine, nom)            la copie jugée : app/ élagué à la station et à ce qu'elle importe, lib/, config minimale, public/ relié, les
//                                           deux drapeaux levés dans lib/flags.ts de la COPIE seulement, `new Phaser.Game(` instrumenté dans moteur/
//   servirCopie(racine)                     copie → un seul `next build` (cache par contenu) → `next start` ; public/ repointé sur la racine jugée à chaque fois
//   lancerChromium(), lancerWebkit()        les navigateurs de Playwright, hors réseau
//   nouvellePage(ctx, options)              une page neuve : session simulée, interceptions, journal du miroir, boîtes de dialogue, PUT des réglages
//   hashToile(P), imageFrame(P), …          les trois témoins d'immobilité (image du jeu, empreinte du canevas, animations), les lectures du miroir
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { R, TRAVAIL, court, premiereLigne, git, exigerSousTravail, listerFichiers, extraireTar, sansCommentaires } from '../a/commun.mjs'
import { leverDrapeaux } from '../k/commun.mjs'
import { construire, servir, TRAV as TRAV_CLAW3D } from '../k/juge-arbre.mjs'
import { interceptions, poserSession, reponsesParDefaut, PORT_MORT } from '../k/session-simulee.mjs'

export { R, TRAVAIL, court, premiereLigne, git, sansCommentaires, listerFichiers, PORT_MORT }
export const E = path.dirname(fileURLToPath(import.meta.url))
export const TEMOIN_E = path.join(E, 'temoin')
export const TRAV_E = path.join(TRAVAIL, 'station-ecran-qa')
export const posix = (p) => p.split(path.sep).join('/')
export const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
export const sha16 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16)
export const jeuE = (rel) => JSON.parse(fs.readFileSync(path.join(E, rel), 'utf8'))
export const copie = (x) => JSON.parse(JSON.stringify(x))
export const erreurCritere = (critere, m) => { const e = new Error(`${critere} : ${m}`); e.critere = critere; return e }

// ── Les parties et leurs critères (l'ordre est celui du jugement) ───────────────────────────────────────────────────────────
export const PARTIES = ['verite', 'camera', 'acteurs', 'calque', 'themes', 'reglages', 'salles2', 'webkit']
export const CRITERES_DE = {
  verite: ['CE-2', 'CE-3', 'CE-4', 'CE-5', 'CE-6', 'CE-7', 'CE-8', 'CE-25', 'CE-26', 'CE-27'],
  camera: ['CE-9', 'CE-10', 'CE-11'],
  acteurs: ['CE-12', 'CE-13'],
  calque: ['CE-14', 'CE-15', 'CE-16', 'CE-28'],
  themes: ['CE-17'],
  reglages: ['CE-18', 'CE-19', 'CE-20', 'CE-29'],
  salles2: ['CE-21', 'CE-22', 'CE-23'],
  webkit: ['CE-24'],
}
/** La fiche que chaque partie juge : ses captures vont dans .orchestre/preuves/<fiche>/ quand la racine jugée est la racine réelle. */
export const FICHE_DE = { verite: '026-181', camera: '026-182', acteurs: '026-183', calque: '026-184', themes: '026-185', reglages: '026-187', salles2: '026-188', webkit: '026-186' }

// ── L'arbre du mode --temoin ─────────────────────────────────────────────────────────────────────────────────────────────────
export function fichiersTemoinE() {
  const m = new Map()
  for (const f of listerFichiers(TEMOIN_E)) {
    const p = posix(f)
    if (!p.endsWith('.temoin')) throw new Error(`témoin du lot e : ${p} sans le suffixe .temoin`)
    m.set(p.slice(0, -'.temoin'.length), fs.readFileSync(path.join(TEMOIN_E, f)))
  }
  return m
}
/** app/, lib/ et les fichiers de tête du commit `base` (git archive : rien n'est écrit dans .git), puis le témoin posé dessus. */
export function arbreTemoinE(base) {
  const dest = exigerSousTravail(path.join(TRAV_E, 'temoin-arbre'))
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const tar = path.join(TRAV_E, 'temoin-arbre.tar')
  const r = git(['-c', 'core.autocrlf=false', 'archive', '--format=tar', `--output=${posix(tar)}`, base, '--', 'app', 'lib', 'proxy.ts', 'next.config.mjs', 'tsconfig.json', 'package.json'])
  if (r.code !== 0) throw new Error(`git archive ${base.slice(0, 7)} : ${court(r.stderr)}`)
  extraireTar(tar, dest)
  fs.rmSync(tar, { force: true })
  const poses = []
  for (const [rel, buf] of fichiersTemoinE()) {
    const f = path.join(dest, rel)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.rmSync(f, { force: true })
    fs.writeFileSync(f, buf)
    poses.push(rel)
  }
  return { dest, poses }
}

// ── La copie jugée ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.json']
const RE_CODE = /\.(?:tsx?|jsx?|mjs|css)$/
const RE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*(?:\/\*[^*]*\*\/\s*)?|\bimport\s+|\brequire\(\s*|@import\s+)['"]([^'"]+)['"]/g
const listerSources = (d, out = []) => {
  if (!fs.existsSync(d)) return out
  for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) listerSources(p, out); else out.push(p) }
  return out
}
/** Les fichiers de app/ que la station importe, de proche en proche (le build ne compile que ceux-là ; les autres pages de la console sont élaguées). */
function fermetureApp(racine) {
  const app = path.join(racine, 'app')
  const gardes = new Set(), file = [], autres = new Set()
  const ajouter = (f) => { f = path.normalize(f); if (!gardes.has(f) && fs.existsSync(f) && fs.statSync(f).isFile()) { gardes.add(f); file.push(f) } }
  for (const f of ['layout.tsx', 'globals.css', 'base.css', 'error.tsx', 'global-error.tsx', 'not-found.tsx']) ajouter(path.join(app, f))
  for (const f of ['layout.tsx', 'client.ts', 'client.tsx']) ajouter(path.join(app, 'controle', f))
  for (const f of listerSources(path.join(app, 'controle', 'station'))) ajouter(f)
  const resoudre = (spec, de) => {
    let base = null
    if (spec.startsWith('.')) base = path.resolve(path.dirname(de), spec)
    else if (spec.startsWith('@/')) {
      const rel = spec.slice(2), top = rel.split('/')[0]
      if (top !== 'app' && top !== 'lib' && fs.existsSync(path.join(racine, top))) autres.add(top)
      base = path.join(racine, rel)
    } else return []
    return [base, ...EXT.map((x) => base + x), ...EXT.map((x) => path.join(base, `index${x}`))]
  }
  while (file.length) {
    const f = file.pop()
    if (!RE_CODE.test(f)) continue
    const t = fs.readFileSync(f, 'utf8')
    for (const m of t.matchAll(RE_IMPORT)) for (const c of resoudre(m[1], f)) if (path.relative(app, c).startsWith('..') === false) ajouter(c)
  }
  return { gardes, autres, app }
}
const CONFIG_MINIMALE = "// Config posée par station-ecran-qa dans la COPIE (le juge d'écran ne juge ni la CSP ni Serwist : CL-11 et CL-12 le font ; sans CSP, un onerror créé par la page s'exécuterait : CE-16 n'en est que plus dur).\nexport default { reactStrictMode: false, typescript: { ignoreBuildErrors: true }, images: { unoptimized: true }, serverExternalPackages: ['@react-pdf/renderer', 'imapflow'] }\n"

/** `new Phaser.Game(args)` → `(globalThis.__stationGame = new Phaser.Game(args))` (même instrument que station-claw3d-qa). */
export function instrumenterJeu(texte, ts) {
  const cible = ts ? '(globalThis as unknown as Record<string, unknown>).__stationGame' : 'globalThis.__stationGame'
  let n = 0, out = '', i = 0
  const re = /new\s+Phaser\s*\.\s*Game\s*\(/g
  for (let m; (m = re.exec(texte));) {
    let j = m.index + m[0].length, prof = 1
    for (; j < texte.length && prof > 0; j++) {
      const c = texte[j]
      if (c === '\'' || c === '"' || c === '`') { const q = c; j++; while (j < texte.length && texte[j] !== q) { if (texte[j] === '\\') j++; j++ } continue }
      if (c === '(') prof++; else if (c === ')') prof--
    }
    if (prof !== 0) break
    out += `${texte.slice(i, m.index)}(${cible} = ${texte.slice(m.index, j)})`
    i = j; re.lastIndex = j; n++
  }
  return { texte: out + texte.slice(i), n }
}

/** → { dest, erreurs, jeux, themes } ; `themes` : les clés de public/station/themes/ de la racine jugée (un theme.json chacune). */
export function copierPourBuild(racine, { nom = 'copie' } = {}) {
  const erreurs = []
  const dest = exigerSousTravail(path.join(TRAV_E, 'prep', nom))
  try { fs.unlinkSync(path.join(dest, 'node_modules')) } catch { /* absent */ }
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  if (!fs.existsSync(path.join(racine, 'app')) || !fs.existsSync(path.join(racine, 'lib'))) return { dest, erreurs: [`app/ ou lib/ absent de ${court(racine, 60)}`], jeux: 0, themes: [] }
  const { gardes, autres } = fermetureApp(racine)
  for (const f of gardes) { const d = path.join(dest, path.relative(racine, f)); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(f, d) }
  for (const d of ['lib', ...autres]) fs.cpSync(path.join(racine, d), path.join(dest, d), { recursive: true, filter: (s) => !/[\\/](node_modules|\.next)([\\/]|$)/.test(s) })
  for (const f of ['package.json', 'tsconfig.json']) if (fs.existsSync(path.join(racine, f))) fs.copyFileSync(path.join(racine, f), path.join(dest, f))
  fs.writeFileSync(path.join(dest, 'next.config.mjs'), CONFIG_MINIMALE)
  fs.mkdirSync(path.join(dest, 'public'), { recursive: true })
  fs.symlinkSync(path.join(R, 'node_modules'), path.join(dest, 'node_modules'))
  const flags = path.join(dest, 'lib', 'flags.ts')
  if (!fs.existsSync(flags)) erreurs.push('lib/flags.ts absent')
  else fs.writeFileSync(flags, leverDrapeaux(fs.readFileSync(flags, 'utf8'), ['pilotage', 'stationCarte']).texte)
  let jeux = 0
  for (const f of listerSources(path.join(dest, 'app', 'controle', 'station', 'moteur')).filter((x) => /\.(?:tsx?|jsx?|mjs)$/.test(x))) {
    const r = instrumenterJeu(fs.readFileSync(f, 'utf8'), /\.tsx?$/.test(f))
    if (r.n) { fs.writeFileSync(f, r.texte); jeux += r.n }
  }
  const themes = []
  const dt = path.join(racine, 'public', 'station', 'themes')
  if (fs.existsSync(dt)) for (const e of fs.readdirSync(dt, { withFileTypes: true })) if (e.isDirectory() && fs.existsSync(path.join(dt, e.name, 'theme.json'))) themes.push(e.name)
  return { dest, erreurs, jeux, themes: themes.sort() }
}
/** public/ de l'arbre construit : un dossier réel dont chaque entrée est un lien vers celle de la racine JUGÉE (le thème, le témoin : jamais ceux d'une autre racine). */
function reposerPublic(arbre, racine) {
  const p = path.join(arbre, 'public')
  fs.rmSync(p, { recursive: true, force: true })
  fs.mkdirSync(p, { recursive: true })
  const src = path.join(racine, 'public')
  if (fs.existsSync(src)) for (const e of fs.readdirSync(src)) fs.symlinkSync(path.join(src, e), path.join(p, e))
}
let serveurMemo = null
/** La copie construite (un seul next build : le cache de k garde le résultat par contenu) et servie. → { base, arreter, jeux, themes, cache } */
const T0 = Date.now()
const trace = (m) => { if (process.env.STATION_ECRAN_TRACE) console.error(`[trace commun ${((Date.now() - T0) / 1000).toFixed(1)} s] ${m}`) }
export async function servirCopie(racine) {
  if (serveurMemo && serveurMemo.racine === racine) return serveurMemo
  trace('copierPourBuild')
  const copieJugee = copierPourBuild(racine, { nom: 'jugee' })
  trace('construire')
  if (copieJugee.erreurs.length) throw erreurCritere('CE-1', `la copie ne se prépare pas : ${copieJugee.erreurs.join(' ; ')}`)
  const b = await construire(copieJugee, 'ecran')
  if (b.prealable) { const e = erreurCritere('CE-1', b.log); e.prealable = true; throw e }
  if (!b.ok) throw erreurCritere('CE-1', b.log)
  trace('reposerPublic et servir')
  reposerPublic(b.arbre, racine)
  const s = await servir(b.arbre)
  trace('servi')
  serveurMemo = { racine, base: s.base, arreter: s.arreter, jeux: copieJugee.jeux, themes: copieJugee.themes, cache: b.cache, duree: b.duree }
  return serveurMemo
}

// ── Les navigateurs ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function lancerChromium() { const { lancerNavigateur } = await import('../k/juge-rendu.mjs'); return lancerNavigateur() }
export async function lancerWebkit() {
  const { webkit } = await import('playwright')
  try { return await webkit.launch({ args: [] }) } catch (e) { throw new Error(`WebKit introuvable ou impossible à lancer : ${premiereLigne(e)}`) }
}

// ── Une page ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SCRIPT_PAGE = () => {
  window.__j = []; window.__carres = 0; window.__plusun = 0; window.__plusunTextes = []
  const noter = (tag, li) => window.__j.push([tag, li.dataset.personnage, li.dataset.salle, li.dataset.motif, li.dataset.etat, li.dataset.x, li.dataset.y].join('|'))
  const estLi = (n) => n && n.nodeType === 1 && n.matches && n.matches('li[data-personnage]')
  const compter = (n) => {
    if (!n || n.nodeType !== 1) return
    if (estLi(n)) noter('+', n)
    for (const c of [n, ...(n.querySelectorAll ? n.querySelectorAll('[data-carre],[data-plus-un],li[data-personnage]') : [])]) {
      if (c.matches && c.matches('[data-carre]')) window.__carres++
      if (c.matches && c.matches('[data-plus-un]')) { window.__plusun++; window.__plusunTextes.push(c.textContent) }
      if (c !== n && estLi(c)) noter('+', c)
    }
  }
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'attributes' && estLi(m.target)) noter('m', m.target)
      else if (m.type === 'childList') {
        for (const n of m.addedNodes) compter(n)
        for (const n of m.removedNodes) if (estLi(n)) window.__j.push(`-|${n.dataset.personnage}`)
      }
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-salle', 'data-motif', 'data-etat', 'data-x', 'data-y'] })
}
const json = (route, statut, corps) => route.fulfill({ status: statut, contentType: 'application/json; charset=utf-8', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(corps) })

/**
 * Une page neuve (un contexte neuf). options : viewport, dpr, reponses, reduit, role ('direction'|'lecture'), mobile, chemin, cpu (ralentissement),
 * put409 (le PUT des réglages répond 409), historique (les versions servies). → { page, contexte, reponses, i, erreurs, dialogues, puts, aller, fermer }
 */
export async function nouvellePage(ctx, o = {}) {
  const { viewport = { width: 1440, height: 900 }, dpr = 1, reponses = reponsesParDefaut(), reduit = false, role = 'direction', mobile = false, chemin = '/controle/station', cpu = 1 } = o
  const contexte = await ctx.nav.newContext({ viewport, deviceScaleFactor: dpr, serviceWorkers: 'block', locale: 'fr-FR', timezoneId: 'UTC', reducedMotion: reduit ? 'reduce' : 'no-preference', ...(mobile ? { isMobile: true, hasTouch: true } : {}) })
  await poserSession(contexte, { port: PORT_MORT })
  await contexte.addInitScript(SCRIPT_PAGE)
  const i = await interceptions(contexte, { reponses, port: PORT_MORT })
  const P = { contexte, reponses, i, erreurs: [], dialogues: [], puts: [], gets: [], etatReglages: { put409: !!o.put409, historique: o.historique ?? null } }
  // Enregistrées APRÈS celles de la session simulée : Playwright joue les plus récentes d'abord ; `fallback()` passe la main.
  await contexte.route((u) => u.pathname === '/api/controle/journal', (route) => json(route, 200, { role, lignes: [] }))
  await contexte.route((u) => u.pathname === '/api/controle/station/reglages', async (route) => {
    const req = route.request(), u = new URL(req.url())
    if (req.method() === 'PUT') {
      let corps = null
      try { corps = JSON.parse(req.postData() ?? 'null') } catch { corps = null }
      P.puts.push({ corps, auth: !!req.headers().authorization })
      if (P.etatReglages.put409) return json(route, 409, { error: 'Ces réglages ont été modifié ailleurs : recharge.' })
      const version = (P.reponses.reglages.version ?? 0) + 1
      P.reponses.reglages = { ...P.reponses.reglages, version, reglages: corps?.reglages ?? {} }
      return json(route, 200, { version })
    }
    if (u.searchParams.get('historique')) {
      P.gets.push('historique')
      const versions = P.etatReglages.historique ?? Array.from({ length: 12 }, (_, n) => ({ version: 12 - n, modifie_par: '90000000-0000-4000-8000-00000000f001', modifie_le: `2026-10-${String(22 - n).padStart(2, '0')}T18:00:00.000Z`, reglages: { affichage: { titre: `Version ${12 - n}` } } }))
      return json(route, 200, { versions })
    }
    return route.fallback()
  })
  const page = await contexte.newPage()
  page.setDefaultTimeout(20_000)
  page.on('pageerror', (e) => P.erreurs.push(`pageerror : ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`))
  page.on('dialog', (d) => { P.dialogues.push(d.message()); d.dismiss().catch(() => {}) })
  P.page = page
  if (cpu > 1) { const cdp = await contexte.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }) }
  P.aller = async (c = chemin) => { await page.goto(`${ctx.base}${c}`, { waitUntil: 'domcontentloaded', timeout: 60_000 }) }
  P.fermer = async () => { try { await contexte.close() } catch { /* déjà fermé */ } }
  return P
}

export async function jusqua(cond, { delai = 30_000, pas = 100 } = {}) {
  const t0 = Date.now()
  for (;;) {
    let v = null
    try { v = await cond() } catch { v = null }
    if (v) return v
    if (Date.now() - t0 > delai) return null
    await attendre(pas)
  }
}
/** Au plus `n` tâches à la fois ; rend les résultats dans l'ordre. */
export async function pool(taches, n = Number(process.env.STATION_ECRAN_PARALLELE) || 4) {
  const res = new Array(taches.length)
  let k = 0
  await Promise.all(Array.from({ length: Math.min(n, taches.length) }, async () => { for (;;) { const i = k++; if (i >= taches.length) return; res[i] = await taches[i]().catch((e) => ({ interrompu: premiereLigne(e) })) } }))
  return res
}

// ── Les lectures de la page ──────────────────────────────────────────────────────────────────────────────────────────────────
const TOILE = '[data-station-carte] canvas'
export const lireMiroir = (page) => page.evaluate(() => [...document.querySelectorAll('ul[data-miroir] > li[data-personnage]')].map((li) => ({ nom: li.dataset.personnage, salle: li.dataset.salle, motif: li.dataset.motif, etat: li.dataset.etat, x: li.dataset.x, y: li.dataset.y, halo: li.dataset.halo, texte: li.textContent })).sort((a, b) => (a.nom < b.nom ? -1 : 1)))
export const imageFrame = (page) => page.evaluate(() => globalThis.__stationGame?.loop?.frame ?? null)
export const nbAnimations = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('[data-station]')).length)
export const journal = (page) => page.evaluate(() => window.__j.slice())
// Seuls les pixels du CANEVAS comptent (le décor, l'antenne, les halos) : pendant la mesure, tout ce qui se pose par-dessus dans la carte (plaques, noms, bulles,
// info-bulles, « +1 », miroir) est masqué par une feuille de style que le juge pose et retire lui-même. Sans elle, un texte qui chevauche la zone de l'antenne ou
// qui se réécrit à chaque lecture ferait changer l'empreinte d'un canevas immobile (vu au premier essai : deux empreintes « du décor » sans que le décor bouge).
const MASQUE = '[data-station-carte] :not(canvas){visibility:hidden!important}[data-station-carte] canvas{visibility:visible!important}'
/** L'empreinte des pixels du canevas (ou de la zone `clip`) : une capture de la page, jamais un toDataURL (WebGL le rend blanc hors image). */
export async function hashToile(page, clip = null) {
  const loc = page.locator(TOILE).first()
  let box = clip
  if (!box) box = await loc.boundingBox()
  if (!box || box.width < 1 || box.height < 1) throw new Error('canevas sans boîte')
  await page.evaluate((css) => { const s = document.createElement('style'); s.dataset.jugeMasque = ''; s.textContent = css; document.head.append(s) }, MASQUE)
  try { return sha16(await page.screenshot({ clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.max(1, box.width), height: Math.max(1, box.height) }, animations: 'disabled', caret: 'initial' })) } catch { return sha16(await loc.screenshot({ animations: 'disabled', caret: 'initial' })) } finally { await page.evaluate(() => { for (const s of document.querySelectorAll('style[data-juge-masque]')) s.remove() }).catch(() => {}) }
}
/** La carte est prête : un canevas dans [data-station-carte] et un jeu. → null si prête, sinon la raison. */
export async function attendrePrete(P, { delai = 45_000, personnages = true } = {}) {
  const ok = await jusqua(async () => (await P.page.locator(TOILE).count()) > 0 && (await P.page.evaluate(() => !!globalThis.__stationGame)) && (!personnages || (await P.page.locator('ul[data-miroir] > li[data-personnage]').count()) > 0), { delai, pas: 150 })
  if (ok) return null
  const nb = await P.page.locator(TOILE).count().catch(() => -1)
  const jeu = await P.page.evaluate(() => !!globalThis.__stationGame).catch(() => false)
  const li = await P.page.locator('ul[data-miroir] > li[data-personnage]').count().catch(() => -1)
  const vu = await P.page.evaluate(() => ({ station: !!document.querySelector('[data-station]'), carte: !!document.querySelector('[data-station-carte]'), texte: (document.body?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 90) })).catch(() => null)
  return `la carte n'est pas prête après ${delai / 1000} s (canevas : ${nb}, jeu __stationGame : ${jeu ? 'oui' : 'NON — aucun « new Phaser.Game( » sous moteur/'}, personnages du miroir : ${li}${P.erreurs.length ? `, première erreur : ${P.erreurs[0]}` : ''}${vu ? `, page ${P.page.url().replace(/^https?:\/\/[^/]+/, '')} : station ${vu.station ? 'oui' : 'non'}, carte ${vu.carte ? 'oui' : 'non'}, « ${vu.texte} »` : ''})`
}
/** Attend que `loop.frame` ne bouge plus pendant `ms`. → { ok, frame } */
export async function attendreCalme(P, { ms = 500, delai = 20_000 } = {}) {
  let f0 = await imageFrame(P.page), depuis = Date.now()
  const ok = await jusqua(async () => { const f = await imageFrame(P.page); if (f !== f0) { f0 = f; depuis = Date.now(); return false } return Date.now() - depuis >= ms }, { delai, pas: 100 })
  return { ok: !!ok, frame: f0 }
}
/**
 * Trois témoins d'immobilité sur `duree` ms : image du jeu, empreinte du canevas, animations en cours dans la station. L'image du jeu et les animations se lisent
 * toutes les 250 ms (un appel léger) ; l'empreinte (une capture, de 0,3 à plus de 2 s sur une machine saturée) au début, environ chaque seconde et à la fin.
 * Une machine saturée ne doit JAMAIS faire passer une carte qui bouge pour immobile (une boucle de capture qui ne tourne qu'une fois voit une image constante) :
 * moins de 4 relevés de l'image du jeu, ou de 2 empreintes, et la mesure est dite insuffisante, donc non constante.
 */
export async function immobile(P, { duree = 3000, pas = 250 } = {}) {
  const frames = new Set(), hashes = new Set(), t0 = Date.now()
  let animations = 0, releves = 0, prochaine = 0
  const empreinte = async () => { hashes.add(await hashToile(P.page)); prochaine = Date.now() + 1000 }
  // D-0510-3 (correction du chef, 05/10, 026-172 JA-2 et JA-7) : sur une machine saturée, UNE empreinte (capture) dure plus que la durée entière et la boucle ne
  // relevait l'image que deux fois (« mesure insuffisante : 2 relevés »), ce qui n'est pas un défaut de la carte. La mesure se POURSUIT jusqu'à 4 relevés, au plus
  // six fois la durée (18 s) : les seuils (4 relevés, une empreinte, la durée entière) et la règle « insuffisant = non constant » sont INCHANGÉS.
  while (Date.now() - t0 < duree || (releves < 4 && Date.now() - t0 < duree * 6)) {
    frames.add(await imageFrame(P.page)); releves++
    animations = Math.max(animations, await nbAnimations(P.page))
    if (Date.now() >= prochaine) await empreinte()
    await attendre(pas)
  }
  frames.add(await imageFrame(P.page)); releves++
  await empreinte()
  animations = Math.max(animations, await nbAnimations(P.page))
  const insuffisant = releves < 4 || hashes.size < 1 || Date.now() - t0 < duree
  return { constant: !insuffisant && frames.size === 1 && hashes.size === 1 && animations === 0, frames: [...frames], empreintes: hashes.size, animations, releves, insuffisant }
}
export const coordsPoste = (theme, emplacement, motif) => { const e = theme.emplacements.find((x) => x.cle === emplacement); const p = motif === 'porte' || !e.poste ? e.porte : e.poste; return { x: p.x, y: p.y } }
export const sansEspaces = (t) => String(t ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
export { TRAV_CLAW3D }
