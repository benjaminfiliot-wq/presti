// scripts/fixtures/026-pilotage/k/juge-rendu.mjs — les critères de station-claw3d-qa qui se mesurent DANS LE NAVIGATEUR
// (fiche 026-170, écrit par Claude Code). Chromium (Playwright) parle au serveur de production de la copie jugée
// (juge-arbre.mjs) ; la session est simulée (session-simulee.mjs : aucun compte, aucune clé) ; toute requête hors de
// 127.0.0.1 est coupée et consignée. Le juge ne demande AUCUN crochet au moteur : il lit le DOM que CONTRAT.md §2 décrit
// (miroir, bulles, Zz, écrans, un seul canevas), et deux instruments qu'il pose lui-même dans sa COPIE (le jeu Phaser et le
// pont : juge-arbre.mjs).
//
//   critereVerite(ctx)  → { cl5, cl7, cl8 }  la suite d'événements rejouée deux fois sur deux pages neuves, le piège de la
//                         pause, le décor sans donnée
//   critereRepos(ctx)   → CL-9   critereGarde(ctx) → CL-10   critereCsp(ctx) → CL-11   criterePoids(ctx) → CL-12
//   criterePixel(ctx)   → CL-13  critereContexte(ctx) → CL-14
// Chaque fonction rend { echecs, detail } ; ctx : { nav, base, chunks, theme, suite, buildReference }.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { chromium } from 'playwright'
import { court } from '../a/commun.mjs'
import { interceptions, poserSession, reponsesParDefaut, suiteEvenements, appliquerEtape, PORT_MORT } from './session-simulee.mjs'

export const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16)
const copie = (x) => JSON.parse(JSON.stringify(x))
export const KIB = 1024

/** Rejoue `cond` jusqu'à ce qu'elle rende une valeur vraie (ou `delai` ms). → la valeur, ou null. */
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

// ── Chromium ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ARGUMENTS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost']
function executablesConnus() {
  const racines = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', path.join(os.homedir(), '.cache', 'ms-playwright')].filter(Boolean)
  const trouves = []
  for (const r of racines) {
    let noms = []
    try { noms = fs.readdirSync(r) } catch { continue }
    for (const n of noms.sort().reverse()) {
      for (const sous of ['chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome', 'chrome-linux64/chrome']) {
        const f = path.join(r, n, sous)
        if (/^chromium/.test(n) && fs.existsSync(f)) trouves.push(f)
      }
    }
  }
  return trouves
}
/** Chromium : celui de Playwright, sinon un chromium de /opt/pw-browsers ou du cache de Playwright. Lève si aucun ne démarre. */
export async function lancerNavigateur() {
  let derniere = null
  for (const exe of [process.env.PRESTI_CHROMIUM || undefined, undefined, ...executablesConnus()]) {
    try { return await chromium.launch({ executablePath: exe, args: ARGUMENTS }) } catch (e) { derniere = e }
  }
  throw new Error(`Chromium introuvable ou impossible à lancer : ${String(derniere?.message ?? derniere).split('\n')[0].slice(0, 160)}`)
}

// ── Une page instrumentée ────────────────────────────────────────────────────────────────────────────────────────────────
// Posé avant tout script de la page : les violations de CSP, et le JOURNAL du miroir (chaque changement d'un
// li[data-personnage], relevé par un MutationObserver : c'est ainsi que le juge voit les pas de marche, sans crochet).
const SCRIPT_PAGE = () => {
  window.__csp = []
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
  window.__j = []
  const noter = (tag, li) => window.__j.push([tag, li.dataset.personnage, li.dataset.salle, li.dataset.motif, li.dataset.etat, li.dataset.x, li.dataset.y].join('|'))
  const estLi = (n) => n && n.nodeType === 1 && n.matches && n.matches('li[data-personnage]')
  const filtre = ['data-salle', 'data-motif', 'data-etat', 'data-x', 'data-y']
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'attributes' && estLi(m.target)) noter('m', m.target)
      else if (m.type === 'childList') {
        for (const n of m.addedNodes) if (estLi(n)) noter('+', n)
        for (const n of m.removedNodes) if (estLi(n)) window.__j.push(`-|${n.dataset.personnage}`)
      }
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: filtre })
}

/**
 * Une page neuve (contexte neuf) sur la station. options : session (vrai), dpr (1), viewport, reponses, delaiDirect (ms, la
 * première lecture de `vue=direct` seulement), statutDirect (200), chemin ('/controle/station'), mesurer (relever le poids gzip
 * des .js). → { page, contexte, i, erreurs, sockets, js, fermer }
 */
export async function nouvellePage(ctx, o = {}) {
  const { session = true, dpr = 1, viewport = { width: 1280, height: 800 }, reponses = reponsesParDefaut(), delaiDirect = 0, statutDirect = 200, chemin = '/controle/station', mesurer = false, base = ctx.base } = o
  const contexte = await ctx.nav.newContext({ viewport, deviceScaleFactor: dpr, serviceWorkers: 'block', locale: 'fr-FR', timezoneId: 'UTC' })
  if (session) await poserSession(contexte, { port: PORT_MORT })
  await contexte.addInitScript(SCRIPT_PAGE)
  const i = await interceptions(contexte, { reponses, port: PORT_MORT })
  const etat = { libere: null, delaiDirect, statutDirect }
  // Enregistrée APRÈS celle de la session simulée : Playwright la joue d'abord, puis `fallback()` passe la main à l'autre.
  await contexte.route((u) => u.pathname === '/api/controle/station' && u.searchParams.get('vue') === 'direct', async (route) => {
    if (etat.delaiDirect && etat.libere === null) { await attendre(etat.delaiDirect) }
    etat.libere ??= Date.now()
    if (etat.statutDirect !== 200 && /^Bearer /.test(route.request().headers().authorization ?? '')) return route.fulfill({ status: etat.statutDirect, contentType: 'application/json', body: JSON.stringify({ error: 'refusé (essai du juge)' }) })
    return route.fallback()
  })
  const page = await contexte.newPage()
  const erreurs = [], sockets = [], js = new Map(), attente = []
  page.on('pageerror', (e) => erreurs.push(`pageerror : ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`))
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(`console : ${m.text().split('\n')[0].slice(0, 200)}`) })
  page.on('websocket', (w) => sockets.push(w.url()))
  if (mesurer) {
    page.on('response', (r) => {
      let u
      try { u = new URL(r.url()) } catch { return }
      if (u.origin !== base || !u.pathname.startsWith('/_next/static/') || !u.pathname.endsWith('.js') || r.status() !== 200) return
      attente.push(r.body().then((b) => { js.set(u.pathname, zlib.gzipSync(b, { level: 9 }).length) }).catch(() => {}))
    })
  }
  const fermer = async () => { try { await Promise.all(attente) } catch { /* corps perdu */ } try { await contexte.close() } catch { /* déjà fermé */ } }
  const aller = async () => { await page.goto(`${base}${chemin}`, { waitUntil: 'domcontentloaded', timeout: 60_000 }) }
  return { page, contexte, i, erreurs, sockets, js, etat, fermer, aller, reponses }
}

const SELECTEUR_TOILE = '[data-station-carte] canvas'
/** La carte est prête : un canevas dans [data-station-carte] et le jeu Phaser instrumenté. → null si prête, sinon la raison. */
export async function attendrePrete(P, { delai = 30_000 } = {}) {
  const ok = await jusqua(async () => (await P.page.locator(SELECTEUR_TOILE).count()) > 0 && await P.page.evaluate(() => !!globalThis.__stationGame), { delai })
  if (ok) return null
  const nb = await P.page.locator(SELECTEUR_TOILE).count().catch(() => -1)
  const jeu = await P.page.evaluate(() => !!globalThis.__stationGame).catch(() => false)
  const carte = await P.page.locator('[data-station-carte]').count().catch(() => -1)
  return `la carte n'est pas prête après ${delai / 1000} s (cadre [data-station-carte] : ${carte}, canevas : ${nb}, jeu Phaser instrumenté : ${jeu ? 'oui' : 'NON — aucun « new Phaser.Game(… » dans moteur/ ou construit hors du contrat'}${P.erreurs.length ? `, première erreur : ${P.erreurs[0]}` : ''})`
}

const lireMiroir = (page) => page.evaluate(() => [...document.querySelectorAll('ul[data-miroir] > li[data-personnage]')].map((li) => ({ nom: li.dataset.personnage, salle: li.dataset.salle, motif: li.dataset.motif, etat: li.dataset.etat, x: Number(li.dataset.x), y: Number(li.dataset.y) })).sort((a, b) => (a.nom < b.nom ? -1 : 1)))
const lireZz = (page) => page.evaluate(() => [...document.querySelectorAll('[data-zz]')].map((e) => e.getAttribute('data-zz')).sort())
const lireBulles = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-bulle]')].map((e) => [e.getAttribute('data-bulle'), e.textContent])))
const lireEcrans = (page) => page.evaluate(() => [...document.querySelectorAll('[data-ecran]')].map((e) => ({ salle: e.getAttribute('data-ecran'), texte: (e.textContent ?? '').trim() })))
const lireImage = async (page) => { const l = page.locator(SELECTEUR_TOILE).first(); return l.screenshot({ animations: 'disabled', caret: 'initial' }) }

/** L'empreinte du canevas d'une scène immobile : deux clichés à 250 ms d'écart doivent être identiques. → { hash } ou { instable } */
export async function empreinteRepos(page, { essais = 8 } = {}) {
  let prec = null
  for (let n = 0; n < essais; n++) {
    let h
    try { h = sha(await lireImage(page)) } catch (e) { return { erreur: String(e?.message ?? e).split('\n')[0].slice(0, 120) } }
    if (h === prec) return { hash: h }
    prec = h
    await attendre(250)
  }
  return { instable: true, hash: prec }
}

// ── La suite d'événements (CL-5, CL-7, CL-8) ─────────────────────────────────────────────────────────────────────────────
const resume = (journal) => { const out = []; for (const l of journal) if (out.at(-1) !== l) out.push(l); return out }
const marchants = (journal) => [...new Set(journal.filter((l) => l.split('|')[4] === 'marche').map((l) => l.split('|')[1]))].sort()
const memes = (a, b) => JSON.stringify(a) === JSON.stringify(b)
/** Les chemins d'un journal : pour chaque personnage, la suite de ses positions (x,y) successives, sans doublon consécutif.
 *  L'ordre entre personnages et les états intermédiaires (un motif qui arrive une lecture avant une bulle) n'en font pas partie. */
function chemins(journal) {
  const par = {}
  for (const l of journal) {
    const [tag, nom, , , , x, y] = l.split('|')
    if (tag === '-' || x === undefined) continue
    const p = `${x},${y}`
    const liste = (par[nom] ??= [])
    if (liste.at(-1) !== p) liste.push(p)
  }
  return par
}

/** Attend que le miroir porte `attendu`, que tout le monde soit arrivé et que le journal se taise 700 ms. */
async function attendreRepos(P, attendu, { delai = 25_000 } = {}) {
  const noms = Object.keys(attendu).sort()
  let dernierN = -1, depuis = Date.now(), miroir = []
  const ok = await jusqua(async () => {
    const n = await P.page.evaluate(() => window.__j.length)
    if (n !== dernierN) { dernierN = n; depuis = Date.now() }
    miroir = await lireMiroir(P.page)
    if (!memes(miroir.map((l) => l.nom), noms)) return false
    if (miroir.some((l) => l.salle !== attendu[l.nom].salle || l.motif !== attendu[l.nom].motif || l.etat !== 'arrive')) return false
    return Date.now() - depuis >= 700
  }, { delai, pas: 120 })
  return { ok: !!ok, miroir }
}
const differences = (miroir, attendu) => {
  const d = []
  const vus = new Set(miroir.map((l) => l.nom))
  for (const l of miroir) {
    const a = attendu[l.nom]
    if (!a) d.push(`${l.nom} est dessiné (${l.salle}/${l.motif}) alors qu'il n'a pas de salle dans la vue servie`)
    else if (l.salle !== a.salle || l.motif !== a.motif) d.push(`${l.nom} : ${l.salle}/${l.motif}, ${a.salle}/${a.motif} attendu`)
    else if (l.etat !== 'arrive') d.push(`${l.nom} marche encore`)
  }
  for (const n of Object.keys(attendu)) if (!vus.has(n)) d.push(`${n} n'est pas dessiné (${attendu[n].salle}/${attendu[n].motif} attendu)`)
  return d
}

/** Rejoue la suite sur une page neuve. → { etapes: [{ cle, journal, marchent, miroir, zz, bulles, hash, ecarts }], erreur? } */
async function jouerSuite(ctx, suite, { avantChaqueEtape } = {}) {
  const reponses = reponsesParDefaut()
  appliquerEtape(reponses, suite.etapes[0])
  const P = await nouvellePage(ctx, { reponses })
  const res = { etapes: [], P }
  try {
    await P.aller()
    const raison = await attendrePrete(P)
    if (raison) { res.erreur = raison; return res }
    for (const [n, etape] of suite.etapes.entries()) {
      await P.page.evaluate(() => window.__j.splice(0))
      if (n > 0) appliquerEtape(reponses, etape)
      const { ok, miroir } = await attendreRepos(P, etape.attendu)
      const journal = resume(await P.page.evaluate(() => window.__j.slice()))
      const e = { cle: etape.cle, journal, marchent: marchants(journal), miroir, ecarts: ok ? [] : differences(miroir, etape.attendu) }
      if (!ok && !e.ecarts.length) e.ecarts.push('le miroir ne se stabilise pas (il change encore)')
      // Une scène qui marche toujours après l'arrivée annoncée : le journal ne doit plus bouger pendant la pause.
      if (ok && n === 0) e.zz = await lireZz(P.page)
      e.zz = await lireZz(P.page)
      e.bulles = await lireBulles(P.page)
      const em = await empreinteRepos(P.page)
      e.hash = em.hash ?? null; e.instable = !!em.instable; e.erreurImage = em.erreur ?? null
      if (avantChaqueEtape) await avantChaqueEtape(P, etape, e)
      res.etapes.push(e)
      if (!ok) { res.arret = etape.cle; break } // la suite ne se rejoue pas sur un miroir déjà faux
    }
  } finally { await P.fermer() }
  return res
}

const motifsPause = (etape) => Object.entries(etape.attendu).filter(([, a]) => a.motif === 'pause').map(([n]) => n)
const meilleureBulle = (etape) => {
  const derniere = {}
  for (const b of etape.fil?.valeur?.bulles ?? []) if (!derniere[b.agent] || b.id > derniere[b.agent].id) derniere[b.agent] = b
  return derniere
}

export async function critereVerite(ctx) {
  const suite = ctx.suite
  const [A, B] = await Promise.all([jouerSuite(ctx, suite), jouerSuite(ctx, suite)])
  const cl5 = [], cl7 = []
  for (const [nom, r] of [['première lecture', A], ['seconde lecture', B]]) if (r.erreur) cl5.push(`${nom} : ${r.erreur}`)
  if (!A.erreur && !B.erreur) {
    // CL-5 : mêmes chemins (journal du miroir) et même empreinte du canevas à chaque étape, sur deux pages neuves.
    for (const [n, etape] of suite.etapes.entries()) {
      const a = A.etapes[n], b = B.etapes[n]
      if (!a || !b) break
      const ca = chemins(a.journal), cb = chemins(b.journal)
      if (!memes(ca, cb)) {
        const nom = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].sort().find((n) => !memes(ca[n], cb[n]))
        cl5.push(`étape « ${etape.cle} » : les chemins diffèrent d'une page à l'autre (${nom} : ${(ca[nom] ?? []).length} positions et ${(cb[nom] ?? []).length} ; « ${court((ca[nom] ?? []).join(' '), 60)} » contre « ${court((cb[nom] ?? []).join(' '), 60)} »)`)
      }
      if (a.hash !== b.hash) cl5.push(`étape « ${etape.cle} » : l'empreinte du canevas diffère d'une page à l'autre (${a.hash} et ${b.hash})`)
      if (a.instable || b.instable) cl5.push(`étape « ${etape.cle} » : le canevas ne se fige pas (deux clichés successifs diffèrent : quelque chose s'anime encore au repos)`)
      if (a.erreurImage) cl5.push(`étape « ${etape.cle} » : cliché impossible (${a.erreurImage})`)
    }
    const hashs = new Set(A.etapes.map((e) => e.hash))
    if (hashs.size < 2) cl5.push('le canevas ne change à aucune étape : la carte ne dessine rien de ce que la suite raconte')
    // CL-7 : la vérité, étape par étape (première page).
    let precedent = null
    for (const [n, etape] of suite.etapes.entries()) {
      const a = A.etapes[n]
      if (!a) break
      for (const d of a.ecarts) cl7.push(`étape « ${etape.cle} » : ${d}`)
      for (const l of a.miroir) {
        if (l.motif !== 'pause' && l.salle === 'repos') cl7.push(`étape « ${etape.cle} » : ${l.nom} (${l.motif}) est dessiné au Repos : seul le motif « pause » y mène`)
        if (l.motif === 'pause' && l.salle !== 'repos') cl7.push(`étape « ${etape.cle} » : ${l.nom} est en pause mais dessiné en ${l.salle}`)
      }
      const attendus = [...etape.marche].sort()
      if (!memes(a.marchent, attendus)) cl7.push(`étape « ${etape.cle} » : ${a.marchent.length ? `marchent ${a.marchent.join(', ')}` : 'personne ne marche'}, ${attendus.length ? attendus.join(', ') : 'personne'} attendu(s) (un agent ne bouge que sur un vrai événement)`)
      const zz = motifsPause(etape).sort()
      if (!memes(a.zz, zz)) cl7.push(`étape « ${etape.cle} » : « Zz » sur ${a.zz.join(', ') || 'personne'}, ${zz.join(', ') || 'personne'} attendu (seul le motif « pause » endort)`)
      const bulles = meilleureBulle(etape)
      for (const [nom, texte] of Object.entries(a.bulles)) {
        const servis = (etape.fil?.valeur?.bulles ?? []).filter((x) => x.agent === nom).map((x) => x.texte)
        if (!servis.includes(texte)) cl7.push(`étape « ${etape.cle} » : la bulle de ${nom} dit « ${court(texte, 40)} », qui n'est pas un texte servi`)
      }
      for (const nom of Object.keys(bulles)) if (etape.attendu[nom] && !(nom in a.bulles)) cl7.push(`étape « ${etape.cle} » : ${nom} a une bulle servie et aucune bulle dessinée`)
      precedent = etape
    }
    void precedent
    // « une pause donne UNE marche vers le Repos, puis plus rien » : après l'arrivée, ni journal ni image ne bougent.
    const iPause = suite.etapes.findIndex((e, n) => n > 0 && motifsPause(e).some((x) => !motifsPause(suite.etapes[n - 1]).includes(x)))
    if (iPause < 0) cl7.push('evenements.json ne contient aucune étape où un agent passe en pause (le piège de la pause ne peut pas être joué)')
    else {
      const nom = motifsPause(suite.etapes[iPause]).find((x) => !motifsPause(suite.etapes[iPause - 1]).includes(x))
      const marches = A.etapes[iPause].journal.filter((l) => l.startsWith('m|' + nom + '|') && l.split('|')[4] === 'marche')
      if (!marches.length) cl7.push(`étape « ${suite.etapes[iPause].cle} » : ${nom} passe en pause sans marcher vers le Repos`)
      const fin = A.etapes[iPause].journal.filter((l) => l.split('|')[1] === nom).at(-1) ?? ''
      if (!/\|repos\|pause\|arrive\|/.test(fin)) cl7.push(`étape « ${suite.etapes[iPause].cle} » : ${nom} n'est pas arrivé au Repos (dernier relevé : « ${court(fin, 50)} »)`)
      // Puis plus rien : une page neuve, l'étape jouée, 3 s de silence.
      const rep = reponsesParDefaut()
      appliquerEtape(rep, suite.etapes[iPause])
      const P = await nouvellePage(ctx, { reponses: rep })
      try {
        await P.aller()
        const raison = await attendrePrete(P)
        if (raison) cl7.push(`page de la pause : ${raison}`)
        else {
          const { ok } = await attendreRepos(P, suite.etapes[iPause].attendu)
          if (!ok) cl7.push('page de la pause : le miroir ne se stabilise pas')
          else {
            await P.page.evaluate(() => window.__j.splice(0))
            const h0 = (await empreinteRepos(P.page)).hash
            const f0 = await P.page.evaluate(() => globalThis.__stationGame?.loop?.frame ?? null)
            await attendre(3000)
            const reste = await P.page.evaluate(() => window.__j.slice())
            const h1 = (await empreinteRepos(P.page)).hash
            const f1 = await P.page.evaluate(() => globalThis.__stationGame?.loop?.frame ?? null)
            if (reste.length) cl7.push(`après la marche vers le Repos, ${nom} ou un autre bouge encore (${reste.length} relevé(s) en 3 s : « ${court(reste[0], 50)} »)`)
            if (h0 !== h1) cl7.push('après la marche vers le Repos, le canevas change encore')
            if (f0 !== null && f0 !== f1) cl7.push(`après la marche vers le Repos, la boucle de Phaser tourne encore (${f1 - f0} image(s) en 3 s) : rien ne doit se dessiner au repos`)
          }
        }
      } finally { await P.fermer() }
    }
  }
  const cl8 = await critereDecor(ctx, suite)
  const n = suite.etapes.length
  return {
    cl5: { echecs: cl5, detail: `${n} étapes de evenements.json rejouées sur deux pages neuves : mêmes chemins (positions successives de chaque personnage relevées dans le miroir : ${A.etapes.reduce((s, e) => s + Object.values(chemins(e.journal)).reduce((t, l) => t + l.length, 0), 0)} pas) et même empreinte du canevas à chaque étape (${new Set(A.etapes.map((e) => e.hash)).size} images distinctes, chacune figée)` },
    cl7: { echecs: cl7, detail: `${n} étapes : le miroir porte exactement les positions servies, seul le motif « pause » mène au Repos, chaque marche est celle d'un événement, une pause donne une marche puis le silence (journal, canevas et boucle de Phaser), « Zz » et bulles au texte servi` },
    cl8,
  }
}

// ── CL-8 : le décor ne porte aucune donnée ───────────────────────────────────────────────────────────────────────────────
const STRUCTURE = new Set(['nom', 'salle', 'motif', 'avatar', 'cle', 'vue', 'role', 'etat', 'point', 'source', 'ton', 'type', 'position', 'a', 'cache', 'manque', 'note'])
/** Une copie de la vue `direct` dont chaque nombre et chaque texte de DONNÉE est autre (la structure et les positions restent). */
function autresDonnees(x, delta, cle = '') {
  if (STRUCTURE.has(cle)) return x
  if (typeof x === 'number') return x + delta
  if (typeof x === 'string') return /^\d{4}-\d\d-\d\dT/.test(x) ? x : `${x} ${delta}`
  if (Array.isArray(x)) return x.map((v) => autresDonnees(v, delta, cle))
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, autresDonnees(v, delta, k)]))
  return x
}
const sansAgents = (d) => { const c = copie(d); c.valeur.equipage.valeur.agents = []; return c }

async function critereDecor(ctx, suite) {
  const e = []
  const depart = suite.etapes[0]
  const jeux = {
    vide: { direct: sansAgents(autresDonnees(depart.direct, 0)), tresorerie: null },
    videAutre: { direct: sansAgents(autresDonnees(depart.direct, 4242)), tresorerie: null },
    chargeA: { direct: autresDonnees(depart.direct, 7), tresorerie: null },
    chargeB: { direct: autresDonnees(depart.direct, 91234), tresorerie: null },
  }
  // « jeu vide » : rien de servi que la structure (aucun agent, tous les chiffres à zéro).
  jeux.vide.direct = sansAgents(zero(depart.direct))
  const pages = await Promise.all(Object.entries(jeux).map(async ([nom, j]) => {
    const rep = reponsesParDefaut()
    rep.direct = j.direct
    rep.fil = { ...rep.fil, valeur: { bulles: [] } }
    rep.tresorerie = { valeur: { solde: 100 + (nom.length * 37) }, source: 'essai' }
    const P = await nouvellePage(ctx, { reponses: rep })
    try {
      await P.aller()
      const raison = await attendrePrete(P)
      if (raison) return { nom, erreur: raison }
      await jusqua(async () => (await lireEcrans(P.page)).length > 0 || null, { delai: 8000 })
      await attendre(1500)
      const ecrans = await lireEcrans(P.page)
      const em = await empreinteRepos(P.page)
      // La texture du décor elle-même, quand le moteur la range sous la clé `decor` (NOTES-TEMOIN.md §3.10) : octet pour octet.
      const texture = await P.page.evaluate(() => { try { const t = globalThis.__stationGame.textures; return t.exists('decor') ? t.get('decor').getSourceImage().toDataURL() : null } catch { return null } })
      return { nom, ecrans, hash: em.hash ?? null, instable: !!em.instable, decor: texture ? sha(texture) : null }
    } finally { await P.fermer() }
  }))
  for (const p of pages) if (p.erreur) e.push(`jeu « ${p.nom} » : ${p.erreur}`)
  if (!e.length) {
    const emplacements = ctx.theme.emplacements.filter((x) => !x.reservee).length
    for (const p of pages) {
      if (p.ecrans.length < emplacements) e.push(`jeu « ${p.nom} » : ${p.ecrans.length} écran(s) [data-ecran], ${emplacements} attendu(s) (un par salle non réservée)`)
      const bavards = p.ecrans.filter((x) => x.texte !== '—')
      if (bavards.length) e.push(`jeu « ${p.nom} » : l'écran de ${bavards[0].salle} dit « ${court(bavards[0].texte, 30)} » au lieu de « — » (${bavards.length} écran(s) parlent)`)
      if (p.instable) e.push(`jeu « ${p.nom} » : le canevas ne se fige pas`)
    }
    const h = Object.fromEntries(pages.map((p) => [p.nom, p.hash]))
    if (h.vide !== h.videAutre) e.push(`la texture du décor dépend des données : sans agent, un jeu vide et un jeu chargé donnent deux images (${h.vide} et ${h.videAutre})`)
    if (h.chargeA !== h.chargeB) e.push(`la texture du décor dépend des données : deux jeux de données différents donnent deux images (${h.chargeA} et ${h.chargeB}) — un chiffre est peint dans le décor`)
    if (!h.vide || !h.chargeA) e.push('cliché impossible')
    const textures = new Set(pages.map((p) => p.decor))
    if (pages.every((p) => p.decor) && textures.size > 1) e.push(`la texture du décor (clé « decor ») n'est pas la même octet pour octet d'un jeu de données à l'autre (${textures.size} textures pour ${pages.length} jeux) : une donnée y est peinte`)
    if (h.vide && h.vide === h.chargeA) e.push('avec ou sans agents la carte donne la même image : elle ne dessine rien')
  }
  return { echecs: e, detail: 'quatre pages (jeu vide, jeu vide autre, deux jeux chargés aux chiffres et textes tous différents) : chaque écran [data-ecran] dit « — », et les images sont identiques deux à deux ; la texture du décor (clé « decor », quand elle existe) est la même octet pour octet dans les quatre jeux' }
}
/** La structure de `direct` avec chaque nombre à 0 et chaque texte de donnée vide. */
function zero(x, cle = '') {
  if (STRUCTURE.has(cle)) return x
  if (typeof x === 'number') return 0
  if (typeof x === 'string') return /^\d{4}-\d\d-\d\dT/.test(x) ? x : ''
  if (Array.isArray(x)) return x.map((v) => zero(v, cle))
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, zero(v, k)]))
  return x
}

// ── CL-9 : le repos ──────────────────────────────────────────────────────────────────────────────────────────────────────
export async function critereRepos(ctx) {
  const e = []
  const P = await nouvellePage(ctx, { reponses: constantes(ctx.suite) })
  let detail = ''
  try {
    await P.aller()
    const raison = await attendrePrete(P)
    if (raison) return { echecs: [raison], detail: '' }
    if (!(await P.page.evaluate(() => typeof globalThis.__stationPontAppels === 'number'))) return { echecs: ['le pont n\'est pas instrumenté : moteur/claw3d/OfficeSceneBridge.ts est absent (CONTRAT.md §1)'], detail: '' }
    // La boucle doit finir par dormir : le compteur d'images se fige.
    const figee = await jusqua(async () => {
      const a = await P.page.evaluate(() => globalThis.__stationGame.loop.frame)
      await attendre(400)
      const b = await P.page.evaluate(() => globalThis.__stationGame.loop.frame)
      return a === b ? { frame: b } : null
    }, { delai: 20_000, pas: 200 })
    if (!figee) return { echecs: ['game.loop.frame avance sans cesse : la boucle de Phaser ne s\'endort jamais (rien ne doit se dessiner au repos)'], detail: '' }
    await attendre(600)
    const avant = { frame: await P.page.evaluate(() => globalThis.__stationGame.loop.frame), pont: await P.page.evaluate(() => globalThis.__stationPontAppels), fil: P.i.compteurs.fil, direct: P.i.compteurs.direct, t: Date.now() }
    const h0 = (await empreinteRepos(P.page)).hash
    // À la vraie cadence : au moins 3 lectures du fil et 1 de direct, aux réponses identiques.
    const assez = await jusqua(async () => (P.i.compteurs.fil - avant.fil >= 3 && P.i.compteurs.direct - avant.direct >= 1) || null, { delai: 75_000, pas: 250 })
    await attendre(800)
    const apres = { frame: await P.page.evaluate(() => globalThis.__stationGame.loop.frame), pont: await P.page.evaluate(() => globalThis.__stationPontAppels), fil: P.i.compteurs.fil, direct: P.i.compteurs.direct, t: Date.now() }
    const h1 = (await empreinteRepos(P.page)).hash
    const lectures = { fil: apres.fil - avant.fil, direct: apres.direct - avant.direct }
    if (!assez) e.push(`la station n'a relu que ${lectures.fil} fois le fil et ${lectures.direct} fois direct en ${Math.round((apres.t - avant.t) / 1000)} s (3 et 1 attendues) : la mesure du repos n'a pas eu lieu`)
    if (apres.frame !== avant.frame) e.push(`game.loop.frame a avancé de ${apres.frame - avant.frame} image(s) pendant ${lectures.fil} lectures du fil et ${lectures.direct} de direct aux réponses identiques : Phaser est réveillé par une lecture qui ne change rien`)
    if (apres.pont !== avant.pont) e.push(`le pont (OfficeSceneBridge) a été appelé ${apres.pont - avant.pont} fois pendant ${lectures.fil} lectures du fil et ${lectures.direct} de direct aux réponses identiques : aucun appel n'est permis au repos`)
    if (h0 !== h1) e.push('le canevas a changé pendant des lectures aux réponses identiques')
    detail = `${lectures.fil} lectures du fil et ${lectures.direct} de direct en ${Math.round((apres.t - avant.t) / 1000)} s, réponses identiques : game.loop.frame figé à ${apres.frame}, le pont (OfficeSceneBridge) appelé 0 fois (${apres.pont} au total depuis le montage), canevas identique`
  } finally { await P.fermer() }
  return { echecs: e, detail }
}
/** Les réponses de la première étape, sans bulle : ce que la station relit, à chaque cadence, à l'identique. */
function constantes(suite) {
  const r = reponsesParDefaut()
  appliquerEtape(r, suite.etapes[0])
  return r
}

// ── CL-10 : la garde ─────────────────────────────────────────────────────────────────────────────────────────────────────
const demandes = (P, chunks) => P.i.requetes.map((r) => { try { return new URL(r.url).pathname } catch { return '' } }).filter((p) => chunks.has(p))
export async function critereGarde(ctx) {
  const e = []
  // A. sans session : ni Phaser, ni canevas, ni carte.
  {
    const P = await nouvellePage(ctx, { session: false })
    try {
      await P.aller()
      await attendre(4000)
      const canevas = await P.page.locator('canvas').count(), carte = await P.page.locator('[data-station-carte]').count()
      const morceaux = demandes(P, ctx.chunks)
      if (morceaux.length) e.push(`sans session, la page demande un morceau de Phaser (${morceaux[0]})`)
      if (canevas) e.push(`sans session, ${canevas} canevas existe(nt)`)
      if (carte) e.push('sans session, <Carte /> est monté ([data-station-carte])')
    } finally { await P.fermer() }
  }
  // B. avec session, mais `vue=direct` tarde : la carte n'apparaît qu'APRÈS la première réponse 200.
  {
    const P = await nouvellePage(ctx, { delaiDirect: 3500 })
    try {
      await P.aller()
      let vueAvant = null
      const debut = Date.now()
      const surveille = await jusqua(async () => {
        if (P.etat.libere === null) {
          const carte = await P.page.locator('[data-station-carte]').count(), canevas = await P.page.locator('canvas').count()
          if (carte || canevas) vueAvant = { carte, canevas, apres: Date.now() - debut }
          const morceaux = demandes(P, ctx.chunks)
          if (morceaux.length && !vueAvant) vueAvant = { phaser: morceaux[0], apres: Date.now() - debut }
          return vueAvant
        }
        return true
      }, { delai: 12_000, pas: 80 })
      if (surveille && vueAvant) e.push(`avant la première réponse 200 de vue=direct (${vueAvant.apres} ms après le chargement, la réponse attend 3,5 s) : ${vueAvant.phaser ? `la page demande un morceau de Phaser (${vueAvant.phaser})` : `<Carte /> est monté (cadre : ${vueAvant.carte}, canevas : ${vueAvant.canevas})`}`)
      if (!surveille) e.push('vue=direct n\'a jamais été demandée avec une session : la page ne lit pas la station')
      else {
        const vue = await jusqua(async () => (await P.page.locator('[data-station-carte]').count()) > 0, { delai: 30_000 })
        if (!vue) e.push('après la réponse 200 de vue=direct, <Carte /> n\'apparaît jamais')
      }
    } finally { await P.fermer() }
  }
  // C. avec session, `vue=direct` refusé (403) : aucune carte, aucun Phaser.
  {
    const P = await nouvellePage(ctx, { statutDirect: 403 })
    try {
      await P.aller()
      await attendre(4000)
      const canevas = await P.page.locator('canvas').count(), carte = await P.page.locator('[data-station-carte]').count()
      const morceaux = demandes(P, ctx.chunks)
      if (morceaux.length) e.push(`vue=direct refusé (403) : la page demande un morceau de Phaser (${morceaux[0]})`)
      if (canevas || carte) e.push(`vue=direct refusé (403) : la carte est montée (cadre : ${carte}, canevas : ${canevas})`)
    } finally { await P.fermer() }
  }
  return { echecs: e, detail: 'sans session : aucun morceau de Phaser, aucun canevas, aucune carte ; avec session, la carte n\'apparaît qu\'après la première réponse 200 de vue=direct (retenue 3,5 s) ; vue=direct refusé (403) : rien' }
}

// ── CL-11 : la CSP ───────────────────────────────────────────────────────────────────────────────────────────────────────
const AUTORISEES = [
  /^\/controle\/station\/?$/, /^\/api\/controle\/station$/, /^\/api\/controle\/tresorerie$/, /^\/api\/controle\/station\/reglages$/,
  /^\/station\/themes\/(?:station|vaisseau|essai)\//, /^\/_next\/static\//, /^\/favicon\.ico$/, /^\/(?:icon|apple-icon)[\w.-]*$/,
]
export async function critereCsp(ctx) {
  const e = []
  const P = await nouvellePage(ctx, { reponses: constantes(ctx.suite) })
  let n = 0
  try {
    await P.aller()
    const raison = await attendrePrete(P)
    if (raison) return { echecs: [raison], detail: '' }
    await attendre(3000)
    const violations = await P.page.evaluate(() => window.__csp.slice())
    if (violations.length) e.push(`${violations.length} événement(s) securitypolicyviolation (« ${court(violations[0], 80)} »)`)
    const csp = P.erreurs.filter((m) => /Content Security Policy|Refused to (?:connect|load|execute|apply)/i.test(m))
    if (csp.length) e.push(`la console signale un refus de la CSP : ${court(csp[0], 120)}`)
    const vues = new Set()
    for (const r of P.i.requetes) {
      let u
      try { u = new URL(r.url) } catch { e.push(`requête illisible : ${court(r.url, 60)}`); continue }
      if (u.protocol === 'data:' || u.protocol === 'blob:') continue
      n++
      const local = u.origin === ctx.base
      const supabase = u.host === `127.0.0.1:${PORT_MORT}`
      if (supabase) continue
      if (!local) { vues.add(`${u.origin} (hors de la boucle locale)`); continue }
      if (u.pathname === '/api/controle/station' && !/^\?vue=/.test(u.search)) { vues.add(`${u.pathname}${u.search}`); continue }
      if (!AUTORISEES.some((re) => re.test(u.pathname))) vues.add(`${u.pathname}${u.search}`.slice(0, 80))
    }
    if (vues.size) e.push(`requête(s) hors de la liste autorisée : ${[...vues].slice(0, 4).join(', ')}${vues.size > 4 ? ` (+${vues.size - 4})` : ''}`)
    if (P.i.bloquees.length) e.push(`${P.i.bloquees.length} requête(s) vers un hôte externe coupée(s) : ${court(P.i.bloquees[0], 80)}`)
    if (P.sockets.length) e.push(`WebSocket ouverte : ${court(P.sockets[0], 80)}`)
    if (P.erreurs.some((m) => m.startsWith('pageerror'))) e.push(`erreur non rattrapée : ${P.erreurs.find((m) => m.startsWith('pageerror'))}`)
  } finally { await P.fermer() }
  return { echecs: e, detail: `build de production : zéro securitypolicyviolation, ${n} requêtes de la page toutes dans la liste (/api/controle/station?vue=, /api/controle/tresorerie, /api/controle/station/reglages, /station/themes/<clé de la liste fermée>/…, /_next/static/…), aucune WebSocket, aucun hôte externe` }
}

// ── CL-12 : le poids ─────────────────────────────────────────────────────────────────────────────────────────────────────
const LIMITE_STATION = 400 * KIB
const ECART_MAX = 1 * KIB
async function peser(ctx, base, chemin, { session = true } = {}) {
  const P = await nouvellePage(ctx, { chemin, mesurer: true, base, session })
  try {
    await P.aller()
    if (chemin === '/controle/station') { const r = await attendrePrete(P); if (r) return { erreur: r } }
    await attendre(chemin === '/controle/station' ? 2500 : 4000)
    await Promise.all([])
  } finally { await P.fermer() }
  const morceaux = [...P.js.entries()]
  return { total: morceaux.reduce((s, [, t]) => s + t, 0), n: morceaux.length, demandes: [...P.js.keys()] }
}
export async function criterePoids(ctx) {
  const e = []
  const ref = await ctx.buildReference()
  if (ref.erreur) return { echecs: [`build de référence (le même moteur absent) : ${ref.erreur}`], detail: '' }
  const pages = ['/controle', '/site/essai-artisan', '/p/essai-artisan']
  const A = {}, B = {}
  const station = await peser(ctx, ctx.base, '/controle/station')
  if (station.erreur) return { echecs: [station.erreur], detail: '' }
  for (const p of pages) { A[p] = await peser(ctx, ctx.base, p); B[p] = await peser(ctx, ref.base, p) }
  const diff = station.total - A['/controle'].total
  if (diff > LIMITE_STATION) e.push(`/controle/station pèse ${Math.round(diff / KIB)} Kio de plus que /controle en gzip (${Math.round(station.total / KIB)} contre ${Math.round(A['/controle'].total / KIB)} ; 400 Kio au plus)`)
  if (diff < 100 * KIB) e.push(`/controle/station ne pèse que ${Math.round(diff / KIB)} Kio de plus que /controle : Phaser (≈ 307 Kio en gzip) n'est pas chargé avec la carte, la mesure ne prouve rien`)
  const lignes = []
  for (const p of pages) {
    const phaser = A[p].demandes.filter((u) => ctx.chunks.has(u))
    if (phaser.length) e.push(`${p} charge un morceau de Phaser (${phaser[0]}) : Phaser ne doit se charger qu'avec la carte`)
    if (!A[p].n) e.push(`${p} : aucun .js relevé (la page ne s'est pas chargée)`)
    const ecart = Math.abs(A[p].total - B[p].total)
    if (ecart > ECART_MAX) e.push(`${p} pèse ${A[p].total} octets en gzip, ${B[p].total} sur le build du même moteur absent : ${ecart} octets d'écart (1 Kio au plus)`)
    lignes.push(`${p} ${A[p].total} o (référence ${B[p].total} o)`)
  }
  return { echecs: e, detail: `mesuré dans le navigateur sur next build puis next start de la copie, .js réellement demandés en gzip : /controle/station − /controle = ${Math.round(diff / KIB)} Kio (≤ 400) ; aucun morceau de Phaser ailleurs ; écart au plus 1 Kio avec le build du même moteur absent : ${lignes.join(', ')}` }
}

// ── CL-13 : le pixel ─────────────────────────────────────────────────────────────────────────────────────────────────────
export async function criterePixel(ctx) {
  const e = []
  const { largeur, hauteur } = ctx.theme.grille
  const lignes = []
  for (const dpr of [1, 2, 2.625, 3]) {
    const P = await nouvellePage(ctx, { dpr, reponses: constantes(ctx.suite) })
    try {
      await P.aller()
      const raison = await attendrePrete(P)
      if (raison) { e.push(`densité ${dpr} : ${raison}`); continue }
      await attendre(800)
      const m = await P.page.evaluate(() => {
        const c = document.querySelector('[data-station-carte] canvas')
        const r = c.getBoundingClientRect()
        const cfg = globalThis.__stationGame.config
        return { w: c.width, h: c.height, css: c.style.width, cssH: c.style.height, rw: r.width, rh: r.height, dpr: window.devicePixelRatio, n: document.querySelectorAll('[data-station-carte] canvas').length, pixelArt: cfg.pixelArt, antialias: cfg.antialias, roundPixels: cfg.roundPixels }
      })
      const k = m.w / largeur
      if (m.dpr !== dpr) e.push(`densité ${dpr} : le navigateur du juge rend devicePixelRatio ${m.dpr}`)
      if (m.n !== 1) e.push(`densité ${dpr} : ${m.n} canevas dans la carte (un seul attendu)`)
      if (!Number.isInteger(k) || k < 1) e.push(`densité ${dpr} : le canevas fait ${m.w} px de large, ${largeur} × k avec k entier attendu (k = ${k})`)
      else {
        if (m.h !== hauteur * k) e.push(`densité ${dpr} : le canevas fait ${m.w} × ${m.h}, ${largeur * k} × ${hauteur * k} attendu (grille ${largeur} × ${hauteur}, k = ${k})`)
        const css = parseFloat(m.css), cssH = parseFloat(m.cssH)
        if (!(Math.abs(css - m.w / dpr) <= 0.02)) e.push(`densité ${dpr} : taille CSS ${m.css || 'non posée'}, ${m.w / dpr} px attendu (canevas ÷ devicePixelRatio)`)
        if (!(Math.abs(cssH - m.h / dpr) <= 0.02)) e.push(`densité ${dpr} : hauteur CSS ${m.cssH || 'non posée'}, ${m.h / dpr} px attendu`)
        if (!(Math.abs(m.rw - m.w / dpr) <= 0.6)) e.push(`densité ${dpr} : le canevas occupe ${m.rw.toFixed(2)} px à l'écran, ${m.w / dpr} px attendu (mis à l'échelle par un autre moyen)`)
        lignes.push(`${dpr} → k = ${k} (${m.w}×${m.h}, CSS ${(m.w / dpr).toFixed(2)})`)
      }
      if (m.pixelArt !== true) e.push(`densité ${dpr} : pixelArt vaut ${m.pixelArt} dans la configuration du jeu (true attendu)`)
      if (m.antialias !== false) e.push(`densité ${dpr} : antialias vaut ${m.antialias} (false attendu)`)
      if (m.roundPixels !== true) e.push(`densité ${dpr} : roundPixels vaut ${m.roundPixels} (true attendu)`)
    } finally { await P.fermer() }
  }
  return { echecs: e, detail: `grille ${largeur} × ${hauteur} : ${lignes.join(' ; ')} ; pixelArt: true, antialias: false, roundPixels: true dans le jeu en marche` }
}

// ── CL-14 : la perte de contexte WebGL ───────────────────────────────────────────────────────────────────────────────────
/** Le nombre de couleurs distinctes d'un cliché PNG, décodé dans une page vierge (createImageBitmap). */
async function couleurs(ctx, png) {
  const p = await ctx.nav.newPage()
  try {
    return await p.evaluate(async (b64) => {
      const bin = atob(b64), oct = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i)
      const img = await createImageBitmap(new Blob([oct], { type: 'image/png' }))
      const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d')
      g.drawImage(img, 0, 0)
      const d = g.getImageData(0, 0, img.width, img.height).data, vus = new Set()
      for (let i = 0; i < d.length && vus.size < 8; i += 4) vus.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])
      return vus.size
    }, png.toString('base64'))
  } finally { await p.close() }
}
export async function critereContexte(ctx) {
  const e = []
  const P = await nouvellePage(ctx, { reponses: constantes(ctx.suite) })
  let detail = ''
  try {
    await P.aller()
    const raison = await attendrePrete(P)
    if (raison) return { echecs: [raison], detail: '' }
    await attendre(1200)
    const avant = await lireMiroir(P.page)
    if (await couleurs(ctx, await lireImage(P.page)) < 2) return { echecs: ['avant la perte, le canevas est uniforme : la carte ne dessine rien (rien à rattraper)'], detail: '' }
    const perdu = await P.page.evaluate(() => {
      const c = document.querySelector('[data-station-carte] canvas')
      const g = c.getContext('webgl2') || c.getContext('webgl')
      if (!g) return 'aucun contexte WebGL'
      const x = g.getExtension('WEBGL_lose_context')
      if (!x) return 'WEBGL_lose_context indisponible'
      globalThis.__perte = x
      x.loseContext()
      return null
    })
    if (perdu === 'aucun contexte WebGL') return { echecs: ['préalable : le canevas n\'a pas de contexte WebGL (le jeu tourne déjà en rendu Canvas) : la perte ne peut pas être simulée'], detail: '' }
    if (perdu) return { echecs: [`préalable : ${perdu}`], detail: '' }
    // Le contexte n'est PAS rendu : un moteur qui ne fait qu'attendre sa restauration reste vide. Il doit se rebâtir (WebGL neuf ou rendu Canvas).
    const revenu = await jusqua(async () => {
      if (!(await P.page.locator(SELECTEUR_TOILE).count())) return null
      const n = await couleurs(ctx, await lireImage(P.page).catch(() => Buffer.alloc(0)).then((b) => (b.length ? b : Buffer.from('')))).catch(() => 0)
      return n >= 2 ? true : null
    }, { delai: 5000, pas: 250 })
    if (!revenu) e.push('après la perte du contexte WebGL, le canevas reste uniforme 5 s : la carte ne revient pas (ni WebGL, ni rendu Canvas)')
    else {
      const apres = await lireMiroir(P.page)
      if (apres.length !== avant.length) e.push(`après la perte, le miroir porte ${apres.length} personnage(s), ${avant.length} avant : la scène rebâtie n'a pas reçu l'état`)
      const type = await P.page.evaluate(() => (globalThis.__stationGame ? globalThis.__stationGame.config.renderType : null))
      detail = `perte simulée (WEBGL_lose_context, contexte jamais rendu) : le canevas est de nouveau dessiné dans les 5 s${type === 1 ? ' (rendu Canvas)' : ''}, ${apres.length} personnages au miroir`
    }
    const non = P.erreurs.filter((m) => m.startsWith('pageerror'))
    if (non.length) e.push(`erreur non rattrapée après la perte : ${non[0]}`)
  } finally { await P.fermer() }
  return { echecs: e, detail: detail || 'perte simulée : la carte revient' }
}
