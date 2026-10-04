// scripts/station-recette.mjs — la recette en production de la carte Claw3D de la station (fiche 026-172, critères RK ; écrit pour 026-193 par Claude Code,
// réservé à Claude Code).
//
//   node scripts/station-recette.mjs                      critères statiques RK-0, puis code 2 (préalable : choisir un mode)
//   node scripts/station-recette.mjs --racine=<d>         critères statiques sur <d> seulement (la preuve du lot e : sur la référence, RK-0 échoue)
//   node scripts/station-recette.mjs --temoin [--base=<commit>]   les critères statiques sur le TÉMOIN du lot e posé sur le commit --base (défaut : la référence du lot) ;
//                                                         rien n'est lancé ni écrit, aucun réseau
//   node scripts/station-recette.mjs --avant   [--base=https://prestiapp.fr]   RK-1 : stationCarte encore baissé, le cadre d'attente et sa liste des salles
//   node scripts/station-recette.mjs --reel    [--base=…]                      RK-2 à RK-5 : stationCarte levé et déployé (026-193)
//   node scripts/station-recette.mjs --constat=reunion [--base=…]              RK-C : le miroir pendant une réunion réelle, puis après ; rien n'est écrit
//
// Les critères statiques (lus dans la racine, sans rien lancer) : RK-0 (app/controle/station/moteur/claw3d/LICENSE-claw3d.txt existe : la notice MIT de
// Claw3D), RK-0-CARTE (Carte.tsx lit actif('stationCarte')), RK-0-THEME (public/station/themes/station/theme.json existe), RK-0-DRAPEAU (lib/flags.ts porte
// le drapeau stationCarte). Sur la référence du lot e, RK-0 échoue (le moteur n'existe pas).
//
// Les modes réels chargent .env.local eux-mêmes (chargerEnv de scripts/lib/capture.mjs : rien n'est affiché), créent leur compte fondateur d'essai
// (fondateurEssai de b/commun.mjs : e-mail en @presti-test.invalid, mot de passe tiré, gardé en mémoire, jamais écrit) et leurs objets d'essai (agent
// `essai-station-<aléa>`, réglage `affichage.titre` marqué `essai-station-<aléa>`), capturent eux-mêmes dans .orchestre/preuves/026-193/ (l'image d'avant
// effacée), et font TOUT leur ménage dans un `finally` : code 1 si le ménage échoue. `--constat` n'écrit rien. Aucun push, aucun e-mail, aucun envoi.
// Sortie « ✅ ID … » / « ❌ ID … », puis « station-recette : PASS|FAIL ». Code 0, 1, ou 2 (préalable ou appel invalide).
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { R, court, premiereLigne, lireOptions, creerSortie, sansCommentaires, git } from './fixtures/026-pilotage/a/commun.mjs'

const JUGE = 'station-recette'
const o = lireOptions(process.argv.slice(2), { connues: ['avant', 'reel', 'constat', 'base'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const modes = [o.drapeaux.has('avant') && 'avant', o.drapeaux.has('reel') && 'reel', 'constat' in o.valeurs && 'constat'].filter(Boolean)
if (modes.length > 1) refuser(`un seul mode à la fois (${modes.join(', ')})`)
const MODE = modes[0] ?? null
if (MODE && (o.temoin || o.valeurs.racine)) refuser(`--${MODE} ne juge que la production, depuis la racine réelle : ni --racine ni --temoin`)
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
if (MODE === 'constat' && o.valeurs.constat !== 'reunion') refuser(`--constat=reunion attendu, reçu : ${o.valeurs.constat}`)
// --base est une origine https en production (--avant, --reel, --constat) et un commit avec --temoin.
const BASE_ARG = o.valeurs.base
if (o.temoin ? (BASE_ARG !== undefined && !/^[\w.^~/-]{1,80}$/.test(BASE_ARG)) : (BASE_ARG !== undefined && !/^https:\/\/[\w.-]+\/?$/.test(BASE_ARG))) refuser(`--base « ${BASE_ARG} » : ${o.temoin ? 'un commit attendu' : 'une origine https:// attendue'}`)
const BASE = (!o.temoin && BASE_ARG ? BASE_ARG : 'https://prestiapp.fr').replace(/\/+$/, '')

// ── Lecteurs de racine ───────────────────────────────────────────────────────────────────────────────────────────────────
const ST = 'app/controle/station'
const lecteurDossier = (racine) => ({ nom: racine, existe: (rel) => fs.existsSync(path.join(racine, rel)), lire: (rel) => { try { return fs.readFileSync(path.join(racine, rel), 'utf8') } catch { return null } } })

// ── Les critères statiques ───────────────────────────────────────────────────────────────────────────────────────────────
/** Les critères statiques sur un lecteur : [{ id, echecs, detail }], RK-0 d'abord. */
function statiques(L) {
  const out = []
  const licence = `${ST}/moteur/claw3d/LICENSE-claw3d.txt`
  { const t = L.lire(licence); out.push({ id: 'RK-0', echecs: t === null ? [`${licence} absent de ${L.nom} : la notice MIT de Claw3D (le moteur de la carte n'est pas livré)`] : !t.trim() ? [`${licence} est vide`] : [], detail: `${licence} existe (${(t ?? '').length} signes) : la notice de Claw3D accompagne le moteur` }) }
  {
    const e = []
    const brut = L.lire(`${ST}/Carte.tsx`)
    if (brut === null) e.push('Carte.tsx absent')
    else if (!/\bactif\(\s*['"]stationCarte['"]\s*\)/.test(sansCommentaires(brut))) e.push("Carte.tsx ne lit pas actif('stationCarte') : le drapeau ne décide pas de la carte")
    out.push({ id: 'RK-0-CARTE', echecs: e, detail: "Carte.tsx lit actif('stationCarte')" })
  }
  { const t = 'public/station/themes/station/theme.json'; out.push({ id: 'RK-0-THEME', echecs: L.existe(t) ? [] : [`${t} absent : le thème Station n'est pas livré`], detail: `${t} existe` }) }
  { const f = L.lire('lib/flags.ts'); out.push({ id: 'RK-0-DRAPEAU', echecs: f === null ? ['lib/flags.ts absent'] : /\bstationCarte\s*:\s*(true|false)\s*,/.test(sansCommentaires(f)) ? [] : ['lib/flags.ts ne porte pas le drapeau stationCarte'], detail: 'lib/flags.ts porte le drapeau stationCarte' }) }
  return out
}
const IDS_STATIQUES = ['RK-0', 'RK-0-CARTE', 'RK-0-THEME', 'RK-0-DRAPEAU']

// ── --temoin : les statiques sur le témoin du lot e posé sur la base ─────────────────────────────────────────────────────
if (o.temoin) {
  const { arbreTemoinE } = await import('./fixtures/026-pilotage/e/commun.mjs')
  const { reference } = await import('./fixtures/026-pilotage/e/lot.mjs')
  const base = BASE_ARG ?? reference
  let a
  try { a = arbreTemoinE(base) } catch (e) { console.log(`${JUGE} : préalable — le témoin ne se pose pas (${premiereLigne(e)})`); process.exit(2) }
  const S = creerSortie(`${JUGE} --temoin`, [...IDS_STATIQUES], `${JUGE} --temoin — le témoin du lot e (${a.poses.length} fichiers) posé sur ${base.slice(0, 7)} sous ${path.relative(R, a.dest)} ; critères statiques seulement, rien n'est lancé ni écrit`)
  for (const x of statiques(lecteurDossier(a.dest))) S.juger(x.id, x.echecs, x.detail)
  process.exitCode = S.finir()
  process.exit(process.exitCode)
}

// ── Statiques (sans option, ou --racine) ───────────────────────────────────────────────────────────────────────────────
const RAC = o.racine
const IDS_MODE = { avant: ['RK-1'], reel: ['RK-2', 'RK-3', 'RK-4', 'RK-5'], constat: ['RK-C'] }
const S = creerSortie(JUGE, [...IDS_STATIQUES, ...(MODE ? IDS_MODE[MODE] : [])], `${JUGE}${MODE ? ` --${MODE}${MODE === 'constat' ? '=reunion' : ''}` : ''} — racine ${RAC}${MODE ? ` — production ${BASE}` : ''}`)
for (const x of statiques(lecteurDossier(RAC))) S.juger(x.id, x.echecs, x.detail)
if (!MODE) {
  if (!o.racineParDefaut) { process.exitCode = S.finir(); process.exit(process.exitCode) }
  S.finir()
  console.log(`${JUGE} : préalable — choisir --avant, --reel ou --constat=reunion (026-193) ; sans mode, seuls les critères statiques sont jugés`)
  process.exit(2)
}
if (IDS_STATIQUES.some((id) => S.enEchec(id))) { S.nonJuges(IDS_MODE[MODE], 'critères statiques en échec : la recette en production n\'est pas lancée'); process.exitCode = S.finir(); process.exit(process.exitCode) }

// ═══ Les modes réels ═════════════════════════════════════════════════════════════════════════════════════════════════════
const { chargerEnv } = await import('./lib/capture.mjs')
chargerEnv(R)
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!SB || !SVC || !ANON) { console.log(`${JUGE} : préalable — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_ANON_KEY attendues dans .env.local`); process.exit(2) }
const HS = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const ALEA = crypto.randomBytes(3).toString('hex')
const PREUVES = path.join(R, '.orchestre', 'preuves', '026-193')
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const requireDepot = createRequire(path.join(R, 'package.json'))
const esp = (t) => String(t ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
const MARQUE = `essai-station-${ALEA}`

async function rpc(nom, args = {}) {
  const r = await fetch(`${SB}/rest/v1/rpc/${nom}`, { method: 'POST', headers: HS, body: JSON.stringify(args) })
  let corps = null; try { corps = await r.json() } catch { /* vide */ }
  return { ok: r.ok, status: r.status, corps }
}
async function compter(table, filtre) {
  const r = await fetch(`${SB}/rest/v1/${table}?select=*&${filtre}`, { headers: { ...HS, Prefer: 'count=exact', Range: '0-0' } })
  const n = Number((r.headers.get('content-range') ?? '').split('/')[1])
  if (!r.ok || !Number.isFinite(n)) throw new Error(`comptage de ${table} illisible (${r.status})`)
  return n
}
/** GET/PUT en production avec la session du compte d'essai (ou sans). */
async function prod(chemin, { jeton = null, methode = 'GET', corps, entetes = {} } = {}) {
  const r = await fetch(`${BASE}${chemin}`, { method: methode, headers: { ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(corps !== undefined ? { 'Content-Type': 'application/json' } : {}), ...entetes }, body: corps !== undefined ? JSON.stringify(corps) : undefined, redirect: 'manual' })
  let donnees = null; try { donnees = await r.json() } catch { /* HTML ou vide */ }
  return { status: r.status, donnees }
}
let NAV = null, WEBKIT = null
/** Un contexte à la taille dite, la session posée, les violations de CSP et les scripts demandés consignés. */
async function page(chemin, compte, { largeur = 1440, hauteur = 900, webkit = false } = {}) {
  const pw = requireDepot('playwright')
  const nav = webkit ? (WEBKIT ??= await pw.webkit.launch()) : (NAV ??= await pw.chromium.launch())
  const ctx = await nav.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: webkit ? 3 : 1, locale: 'fr-FR', timezoneId: 'Europe/Paris', ...(largeur < 1024 ? { isMobile: true, hasTouch: true } : {}) })
  const p = await ctx.newPage()
  const J = { csp: [], scripts: new Map() }
  await p.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)) })
  if (compte) await p.addInitScript(([k, v]) => { try { localStorage.setItem(k, v) } catch { /* fermé */ } }, [compte.cleLocale, JSON.stringify(compte.sess)])
  p.on('response', async (r) => { try { if (r.request().resourceType() === 'script') { const b = await r.body(); J.scripts.set(r.url(), { octets: b.length, gzip: zlib.gzipSync(b).length, phaser: /https:\/\/phaser\.io/.test(b.toString('utf8')) }) } } catch { /* corps indisponible */ } })
  await p.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await p.waitForSelector('[data-station]', { timeout: 30_000 }).catch(() => {})
  return { p, J, fermer: () => ctx.close().catch(() => {}) }
}
const violations = (pg) => pg.p.evaluate(() => window.__csp ?? []).catch(() => [])
async function capturer(p, nom) {
  const { analyserJpeg, sha256 } = await import('./fixtures/026-pilotage/c/commun.mjs')
  const f = path.join(PREUVES, nom)
  fs.mkdirSync(PREUVES, { recursive: true }); fs.rmSync(f, { force: true })
  await p.screenshot({ path: f, type: 'jpeg', quality: 82 })
  const buf = fs.readFileSync(f)
  return { fichier: f, octets: buf.length, empreinte: sha256(buf), ...analyserJpeg(buf) }
}
const defauts = (c, l, h) => [...(c.octets < 10 * 1024 ? [`${path.basename(c.fichier)} : ${c.octets} octets, 10 Ko au moins`] : []), ...(c.octets > 1.5 * 1024 * 1024 ? [`${path.basename(c.fichier)} : plus de 1,5 Mo`] : []), ...(c.ecartType < 4 ? [`${path.basename(c.fichier)} : image uniforme`] : []), ...(c.largeur !== l || c.hauteur !== h ? [`${path.basename(c.fichier)} : ${c.largeur}×${c.hauteur}, ${l}×${h} attendu`] : [])]
/** L'empreinte du canevas de la carte : une capture de sa boîte (jamais un toDataURL). */
async function empreinteCarte(p) {
  const box = await p.locator('[data-station-carte] canvas').first().boundingBox()
  if (!box) return null
  return crypto.createHash('sha256').update(await p.screenshot({ clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.max(1, box.width), height: Math.max(1, box.height) }, animations: 'disabled' })).digest('hex').slice(0, 16)
}
const carteAffichee = (p) => p.waitForFunction(() => !!document.querySelector('[data-station-carte] canvas') && document.querySelectorAll('ul[data-miroir] > li[data-personnage]').length > 0, null, { timeout: 30_000 }).then(() => true).catch(() => false)
const miroir = (p) => p.evaluate(() => [...document.querySelectorAll('ul[data-miroir] > li[data-personnage]')].map((li) => ({ nom: li.dataset.personnage, salle: li.dataset.salle, motif: li.dataset.motif, etat: li.dataset.etat, x: li.dataset.x, y: li.dataset.y })))
const { fondateurEssai, artisanEssai } = await import('./fixtures/026-pilotage/b/commun.mjs')

let menage = true
try {
  if (MODE === 'avant') await avant()
  else if (MODE === 'reel') await reel()
  else await constat()
} catch (e) {
  S.nonJuges(IDS_MODE[MODE], `interrompu : ${premiereLigne(e)}`)
} finally {
  await NAV?.close().catch(() => {})
  await WEBKIT?.close().catch(() => {})
}
// Un ménage raté a posé process.exitCode = 1 : il n'est pas écrasé par le verdict. Fin par process.exitCode (Node 24 sous Windows : un process.exit après un fetch
// plante sur une assertion de libuv) ; les fonctions ci-dessous sont des déclarations, hissées.
process.exitCode = Math.max(S.finir(), process.exitCode ?? 0, menage ? 0 : 1)

// ── --avant : RK-1 ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function avant() {
  const e = []
  const d = spawnSync(process.execPath, ['scripts/deploiement-etat.mjs', '--n=1'], { cwd: R, encoding: 'utf8', windowsHide: true })
  if (d.status !== 0) e.push(`deploiement-etat : code ${d.status} (le dernier déploiement de production n'est pas READY)`)
  const sha = (/READY\s+([0-9a-f]{7})/.exec(d.stdout ?? '') ?? [])[1]
  if (!sha) e.push('commit du dernier déploiement READY illisible')
  else for (const f of ['026-179', '026-180', '026-181', '026-182', '026-183', '026-184', '026-185', '026-186', '026-187', '026-188', '026-189']) {
    const c = git(['log', '-1', '--format=%H', `--grep=^${f} `, 'HEAD']).stdout.trim()
    if (!c) { e.push(`${f} : aucun commit`); continue }
    if (git(['merge-base', '--is-ancestor', c, sha]).code !== 0) e.push(`${f} (${c.slice(0, 7)}) n'est pas dans le déploiement ${sha}`)
  }
  // `pilotage` levé : la route existe (401 sans jeton, pas 404) ; `stationCarte` baissé : le cadre d'attente et la liste des salles, sans canevas.
  const v = await prod('/api/controle/station?vue=direct')
  if (v.status !== 401) e.push(`/api/controle/station?vue=direct sans jeton : ${v.status}, 401 attendu (pilotage levé)`)
  let compte = null
  try {
    compte = await fondateurEssai()
    const pg = await page('/controle/station', compte)
    try {
      await pg.p.waitForSelector('[data-station-carte]', { timeout: 30_000 }).catch(() => {})
      const m = await pg.p.evaluate(() => { const c = document.querySelector('[data-station-carte]'); return c ? { canevas: c.querySelectorAll('canvas').length, attente: !!c.querySelector('.mc-carte-attente'), boutons: c.querySelectorAll('[data-liste-salles] [data-salle]').length } : null })
      if (!m) e.push('/controle/station ne porte pas de [data-station-carte]')
      else { if (m.canevas) e.push(`stationCarte est encore baissé : ${m.canevas} canevas dans la carte`); if (!m.attente) e.push('le cadre d\'attente (.mc-carte-attente) est absent'); if (m.boutons < 21) e.push(`${m.boutons} bouton(s) dans la liste des salles, 21 attendus`) }
      for (const [u, x] of pg.J.scripts) if (x.phaser) e.push(`un morceau de Phaser est chargé alors que stationCarte est baissé : ${court(u, 80)}`)
    } finally { await pg.fermer() }
  } finally { if (compte && !(await compte.supprimer())) { menage = false; e.push('le compte d\'essai existe encore') } }
  S.juger('RK-1', e, `dernier déploiement READY (${sha}) avec les fiches de la carte ; pilotage levé (vue=direct : 401 sans jeton) ; stationCarte baissé : le cadre d'attente, la liste des 21 salles, aucun canevas, aucun morceau de Phaser`)
}

// ── --reel : RK-2 à RK-5 ─────────────────────────────────────────────────────────────────────────────────────────────────
async function reel() {
  let compte = null, artisan = null, agent = null
  let avantReglages = null, ecrit = false
  try {
    compte = await fondateurEssai()
    const J = compte.jeton
    // RK-2 : les captures, la CSP, aucun Phaser ailleurs que sur la station, le poids.
    {
      const e = []
      const station = await page('/controle/station', compte)
      if (!(await carteAffichee(station.p))) e.push('la carte n\'est pas affichée en 30 s (canevas et personnages du miroir)')
      await attendre(2500)
      const c1 = await capturer(station.p, 'bureau.jpg'); e.push(...defauts(c1, 1440, 900))
      const csp = await violations(station); if (csp.length) e.push(`${csp.length} violation(s) de CSP sur la station (${csp[0]})`)
      const stationJs = new Map(station.J.scripts)
      await station.fermer()
      const tel = await page('/controle/station', compte, { largeur: 390, hauteur: 844 })
      await tel.p.locator('[data-onglet-tel="station"]').click({ timeout: 15_000 }).catch(() => {})
      await carteAffichee(tel.p); await attendre(2000)
      const c2 = await capturer(tel.p, 'telephone.jpg'); e.push(...defauts(c2, 390, 844))
      if (c1.empreinte === c2.empreinte) e.push('bureau.jpg et telephone.jpg identiques')
      const cspTel = await violations(tel); if (cspTel.length) e.push(`${cspTel.length} violation(s) de CSP sur la station au téléphone (${cspTel[0]})`)
      await tel.fermer()
      const console_ = await page('/controle', compte)
      await attendre(2000)
      const controleJs = new Map(console_.J.scripts)
      const cspC = await violations(console_); if (cspC.length) e.push(`${cspC.length} violation(s) de CSP sur /controle (${cspC[0]})`)
      for (const [u, x] of controleJs) if (x.phaser) e.push(`Phaser est chargé sur /controle : ${court(u, 80)}`)
      await console_.fermer()
      artisan = await artisanEssai()
      // Le slug du compte artisan d'essai est `capture-<instant de création>` (compteTest, scripts/lib/capture.mjs) ; l'instant est aussi dans son e-mail.
      const slug = `capture-${/.(d+)@/.exec(artisan.email)?.[1] ?? 'inconnu'}`
      for (const chemin of [`/site/${slug}`, `/p/${slug}`]) {
        const pub = await page(chemin, null)
        await attendre(1500)
        for (const [u, x] of pub.J.scripts) if (x.phaser) e.push(`Phaser est chargé sur ${chemin.split('/').slice(0, 2).join('/')}/… : ${court(u, 80)}`)
        await pub.fermer()
      }
      // Le poids : les scripts demandés par la station et pas par /controle, en gzip (mesuré dans le navigateur sur les .js réellement demandés).
      let en_plus = 0
      for (const [u, x] of stationJs) if (!controleJs.has(u)) en_plus += x.gzip
      if (en_plus > 400 * 1024) e.push(`/controle/station moins /controle : ${Math.round(en_plus / 1024)} Kio en gzip, 400 Kio au plus`)
      S.juger('RK-2', e, `bureau.jpg (${Math.round(c1.octets / 1024)} Ko) et telephone.jpg (${Math.round(c2.octets / 1024)} Ko) prises par le script en production ; zéro violation de CSP ; aucun morceau de Phaser sur /controle, /site/<slug> ni /p/<slug> ; /controle/station moins /controle : ${Math.round(en_plus / 1024)} Kio en gzip (400 au plus)`)
    }
    // RK-3 : un événement réel fait bouger son personnage, puis la carte redevient immobile.
    {
      const e = []
      agent = `${MARQUE}`.replace(/-/g, '_')
      const r0 = await rpc('ops_agent_enregistrer', { p_nom: agent, p_libelle: `Essai recette ${ALEA}`, p_capacites: ['decider'], p_types_crees: [], p_tables: [], p_periode_minutes: 60, p_debit_minute: 1, p_quota_creations_jour: 5, p_plafond_euros_jour: 0 })
      if (!r0.ok) throw new Error(`ops_agent_enregistrer : ${r0.status} ${court(JSON.stringify(r0.corps), 100)}`)
      const pg = await page('/controle/station', compte)
      try {
        await carteAffichee(pg.p); await attendre(1500)
        const t0 = Date.now()
        const ev = await rpc('ops_evenement_ajouter', { p_agent: agent, p_type: 'tache_prise', p_objet: MARQUE, p_resume: 'essai de recette', p_tache: null })
        if (!ev.ok) e.push(`ops_evenement_ajouter : ${ev.status}`)
        const bouge = await pg.p.waitForFunction((a) => document.querySelector(`ul[data-miroir] > li[data-personnage="${a}"]`)?.dataset.motif === 'tache', agent, { timeout: 15_000 }).then(() => true).catch(() => false)
        if (!bouge) e.push(`avant 15 s, [data-personnage="${agent}"] n'a pas data-motif="tache"`)
        const bulle = await pg.p.waitForFunction((a) => (document.querySelector(`[data-bulle="${a}"]`)?.textContent ?? '').includes('essai de recette'), agent, { timeout: 15_000 }).then(() => true).catch(() => false)
        if (!bulle) e.push(`la bulle « essai de recette » n'apparaît pas pour ${agent} avant 15 s`)
        const dt = Date.now() - t0
        await pg.p.waitForFunction((a) => document.querySelector(`ul[data-miroir] > li[data-personnage="${a}"]`)?.dataset.etat === 'arrive', agent, { timeout: 20_000 }).catch(() => {})
        await attendre(1500)
        const hashes = new Set()
        for (let i = 0; i < 6; i++) { hashes.add(await empreinteCarte(pg.p)); await attendre(500) }
        const anims = await pg.p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('[data-station]')).length)
        if (hashes.size !== 1 || anims) e.push(`la carte ne redevient pas immobile (${hashes.size} empreinte(s) du canevas sur 3 s, ${anims} animation(s) en cours)`)
        S.juger('RK-3', e, `tache_prise écrit pour ${agent} : son personnage passe en data-motif="tache" et sa bulle apparaît (${(dt / 1000).toFixed(1)} s), puis la carte est immobile`)
      } finally { await pg.fermer() }
    }
    // RK-4 : le thème Station se charge ; un réglage est écrit, relu, rétabli à la version d'avant, et journalisé.
    {
      const e = []
      const themes = []
      for (const cle of ['station', 'vaisseau']) {
        const t = await prod(`/station/themes/${cle}/theme.json`)
        if (t.status === 200 && t.donnees?.cle === cle && t.donnees?.grille) themes.push(cle)
        else if (cle === 'station') e.push(`/station/themes/station/theme.json : ${t.status}, le thème Station doit se servir`)
        else if (t.status !== 404) e.push(`/station/themes/vaisseau/theme.json : ${t.status} (200 s'il est livré, 404 sinon)`)
      }
      const g0 = await prod('/api/controle/station/reglages', { jeton: J })
      if (g0.status !== 200 || !Number.isInteger(g0.donnees?.version)) e.push(`GET /api/controle/station/reglages : ${g0.status}`)
      else {
        avantReglages = { version: g0.donnees.version, reglages: g0.donnees.reglages }
        const nouveaux = { ...g0.donnees.reglages, affichage: { ...(g0.donnees.reglages?.affichage ?? {}), titre: MARQUE } }
        const p1 = await prod('/api/controle/station/reglages', { jeton: J, methode: 'PUT', corps: { reglages: nouveaux, version: g0.donnees.version } })
        if (p1.status !== 200) e.push(`PUT d'un réglage d'essai : ${p1.status}`)
        else {
          ecrit = true
          const g1 = await prod('/api/controle/station/reglages', { jeton: J })
          if (g1.donnees?.reglages?.affichage?.titre !== MARQUE) e.push('le réglage écrit n\'est pas relu')
          const p2 = await prod('/api/controle/station/reglages', { jeton: J, methode: 'PUT', corps: { reglages: avantReglages.reglages, version: p1.donnees?.version ?? g1.donnees?.version } })
          if (p2.status !== 200) e.push(`PUT du rétablissement : ${p2.status}`)
          else {
            ecrit = false
            const g2 = await prod('/api/controle/station/reglages', { jeton: J })
            if (JSON.stringify(g2.donnees?.reglages) !== JSON.stringify(avantReglages.reglages)) e.push('le réglage n\'est pas rétabli à la version d\'avant')
          }
        }
        const n = await compter('journal_direction', `acteur_id=eq.${compte.id}&action=eq.station_reglages`)
        if (n !== 2) e.push(`journal_direction : ${n} ligne(s) station_reglages, exactement 2 attendues`)
      }
      const pg = await page('/controle/station', compte)
      try {
        await carteAffichee(pg.p)
        const k = await pg.p.evaluate(() => { const c = document.querySelector('[data-station-carte] canvas'); return c ? c.width : null })
        const th = themes.includes('station') ? (await prod('/station/themes/station/theme.json')).donnees : null
        if (!k || !th || k % th.grille.largeur !== 0) e.push(`le canevas fait ${k} px de large, un multiple entier de la grille du thème (${th?.grille?.largeur}) attendu`)
      } finally { await pg.fermer() }
      S.juger('RK-4', e, `thème(s) ${themes.join(' et ')} servis et chargés (canevas = grille × k) ; un réglage écrit (${MARQUE}), relu, rétabli à la version d'avant, deux lignes station_reglages dans journal_direction`)
    }
    // RK-5 : les vingt salles et la réservée s'ouvrent depuis la carte ; CE-24 sous WebKit sur la production.
    {
      const e = []
      const pg = await page('/controle/station', compte)
      try {
        await carteAffichee(pg.p); await attendre(1500)
        const cles = await pg.p.evaluate(() => [...document.querySelectorAll('[data-station-carte] [data-zone-salle]')].map((z) => z.dataset.zoneSalle))
        if (cles.length !== 21) e.push(`${cles.length} zone(s) [data-zone-salle] sous la carte, 21 attendues`)
        for (const cle of cles) {
          const b = await pg.p.evaluate((c) => { const r = document.querySelector(`[data-station-carte] [data-zone-salle="${c}"]`)?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null }, cle)
          if (!b) { e.push(`la zone ${cle} a disparu`); continue }
          await pg.p.mouse.click(b.x, b.y)
          const ouverte = await pg.p.waitForFunction((c) => new URL(location.href).searchParams.get('salle') === c, cle, { timeout: 5000 }).then(() => true).catch(() => false)
          if (!ouverte) e.push(`un clic sur ${cle} ne pose pas ?salle=${cle}`)
          await pg.p.keyboard.press('Escape'); await attendre(250)
        }
      } finally { await pg.fermer() }
      // CE-24 (WebKit, 390×844), sur la production : la session est la vraie ; le pincement ne se prouve pas (Playwright n'offre que tap).
      try {
        const w = await page('/controle/station', compte, { largeur: 390, hauteur: 844, webkit: true })
        try {
          await w.p.locator('[data-onglet-tel="station"]').click({ timeout: 15_000 }).catch(() => {})
          await carteAffichee(w.p); await attendre(800)
          const m = await w.p.evaluate(() => {
            const cadre = document.querySelector('[data-station-carte]'), r = cadre.getBoundingClientRect(), cs = getComputedStyle(cadre)
            const bouton = (a) => { const b = document.querySelector(`[data-action="${a}"]`)?.getBoundingClientRect(); return b ? [Math.round(b.width), Math.round(b.height)] : null }
            return { sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), larg: r.width, vue: cadre.dataset.vue ?? null, touch: cs.touchAction, gesture: cadre.dispatchEvent(new Event('gesturestart', { bubbles: true, cancelable: true })) === false, plus: bouton('zoom-avant'), moins: bouton('zoom-arriere'), ensemble: bouton('vue-ensemble') }
          })
          if (m.sw > 390) e.push(`WebKit : scrollWidth ${m.sw} px, 390 au plus`)
          if (Math.abs(m.larg - 358) > 1.5) e.push(`WebKit : le cadre de la carte fait ${m.larg.toFixed(1)} px, 358 attendus`)
          if (m.vue !== 'ensemble') e.push(`WebKit : la carte ne s'ouvre pas en vue d'ensemble (${m.vue})`)
          if (m.touch !== 'none') e.push(`WebKit : touch-action « ${m.touch} » sur le cadre, none attendu`)
          if (!m.gesture) e.push('WebKit : gesturestart n\'est pas bloqué dans le cadre')
          for (const [nom, b] of [['+', m.plus], ['−', m.moins], ['⊞', m.ensemble]]) if (!b || b[0] < 44 || b[1] < 44) e.push(`WebKit : le bouton ${nom} fait ${b ? `${b[0]}×${b[1]}` : 'rien'} px, 44×44 au moins`)
        } finally { await w.fermer() }
      } catch (err) { e.push(`WebKit : ${premiereLigne(err)}`) }
      S.juger('RK-5', e, 'les vingt salles et la réservée s\'ouvrent depuis la carte (?salle=<clé> sans changer de page) ; CE-24 sous WebKit à 390×844 sur la production : cadre de 358 px, touch-action none, gesturestart bloqué, boutons de 44 px, aucun défilement horizontal')
    }
  } finally {
    // Le ménage, relu par la clé de service : l'agent d'essai, le réglage, les comptes.
    const e = []
    try {
      if (agent) { const r = await rpc('ops_agent_retirer', { p_nom: agent }); if (!r.ok) e.push(`ops_agent_retirer : ${r.status}`); const l = await rpc('pilotage_agents'); if (!l.ok) e.push('pilotage_agents illisible après le ménage'); else if ((Array.isArray(l.corps) ? l.corps : []).some((a) => a.nom === agent)) e.push(`${agent} existe encore`) }
      if (ecrit && avantReglages && compte) { const l = await rpc('station_reglages_lire'); const v = Array.isArray(l.corps) ? l.corps[0]?.version : null; const r = await rpc('station_reglages_ecrire', { p_reglages: avantReglages.reglages, p_auteur: compte.id, p_version: v }); if (!r.ok) e.push(`rétablissement du réglage d'essai : ${r.status}`) }
    } catch (err) { e.push(`ménage : ${premiereLigne(err)}`) }
    for (const c of [compte, artisan]) if (c) { try { if (!(await c.supprimer())) e.push('un compte d\'essai existe encore') } catch (err) { e.push(`suppression d'un compte d'essai : ${premiereLigne(err)}`) } }
    if (e.length) { menage = false; console.log(`${JUGE} : ménage incomplet — ${e.join(' ; ')}`) }
  }
}

// ── --constat=reunion : RK-C (rien n'est écrit) ──────────────────────────────────────────────────────────────────────────
async function constat() {
  let compte = null
  try {
    compte = await fondateurEssai()
    const J = compte.jeton
    const e = []
    const fin = Date.now() + 45 * 60_000
    let vue = false
    while (Date.now() < fin && !vue) {
      const r = await prod('/api/controle/station?vue=salle&salle=reunion', { jeton: J })
      if (r.donnees?.valeur?.enCours) {
        const pg = await page('/controle/station', compte)
        try {
          await carteAffichee(pg.p); await attendre(2500)
          const m = await miroir(pg.p)
          const ni = m.filter((l) => l.motif !== 'reunion' && l.motif !== 'pause' && l.motif !== 'panne')
          if (ni.length) e.push(`pendant la réunion, ${ni.map((l) => `${l.nom} (${l.motif})`).slice(0, 4).join(', ')} n'est pas en reunion`)
          e.push(...defauts(await capturer(pg.p, 'constat-reunion.jpg'), 1440, 900))
        } finally { await pg.fermer() }
        vue = true
      } else await attendre(60_000)
    }
    if (!vue) e.push('aucune réunion en cours en 45 min')
    else {
      while (Date.now() < fin) { const r = await prod('/api/controle/station?vue=salle&salle=reunion', { jeton: J }); if (!r.donnees?.valeur?.enCours) break; await attendre(60_000) }
      const pg = await page('/controle/station', compte)
      try {
        await carteAffichee(pg.p); await attendre(3000)
        const restes = (await miroir(pg.p)).filter((l) => l.motif === 'reunion')
        if (restes.length) e.push(`après la réunion, ${restes.map((l) => l.nom).slice(0, 4).join(', ')} reste en reunion`)
      } finally { await pg.fermer() }
    }
    S.juger('RK-C', e, 'pendant la réunion réelle, les personnages du miroir (ni en pause ni en panne) sont en reunion (constat-reunion.jpg) ; après, ils sont revenus')
  } finally { if (compte && !(await compte.supprimer())) { menage = false; console.log(`${JUGE} : ménage du compte d'essai en échec`) } }
}
