#!/usr/bin/env node
// scripts/agents/mesure-a-sec.mjs — fiche 026-165 : la mesure à sec. Écrit par Claude Code.
//
// Mesure la part des sites d'artisans RGE dont le formulaire de contact est utilisable par les agents, SANS RIEN ENVOYER :
// tirage dans la liste RGE de l'ADEME (graine = la date), SIRENE, lecture polie par le Lecteur (026-020), passage de la page
// du formulaire par l'adaptateur Firecrawl borné (026-223, opération « lire » seule, repli sur le Lecteur), puis ouverture
// dans Chromium des formulaires éligibles à la lecture du HTML. Rien n'est rempli, cliqué ni soumis ; toute requête autre que
// GET ou HEAD émise par une page est coupée avant de partir.
//
//   node --import ./scripts/ts-loader.mjs scripts/agents/mesure-a-sec.mjs [--n=200] [--firecrawl]
//   node --import ./scripts/ts-loader.mjs scripts/agents/mesure-a-sec.mjs --autotest [--preuve-echecs]
//   node --import ./scripts/ts-loader.mjs scripts/agents/mesure-a-sec.mjs --poser --rapport=docs/agents/mesure-a-sec-<date>.md
//
// Hors de l'usine (nom d'hôte autre que presti-usine), tout sauf --poser se relance sur l'usine par
// `node scripts/usine.mjs executer -- node --import ./scripts/ts-loader.mjs scripts/agents/mesure-a-sec.mjs <mêmes options>`
// et rend sa sortie et son code ; usine injoignable : code 2. Chromium ne tourne jamais sur le poste.
// Codes : 0 PASS (ou autotest vert) ; 3 mesure faite, verdict FAIL ; 1 erreur, critère rouge ou requête non-GET sortie ;
// 2 usage, rapport refusé, usine injoignable.
// Données : la liste des domaines et le journal des requêtes restent sur l'usine (~/mesure-a-sec/<date>/, dossier 0700,
// fichiers 0600, effacés au bout de 30 jours) ; la sortie standard ne porte que des comptes.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { autoriserDepense, jetonDepenseDeLEnv, coutEstimeDeLEnv } from '../../lib/agents/depense.mjs'

const HOTE_USINE = 'presti-usine'
const SOURCE = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(SOURCE), '..', '..')
const ESPACEMENT_MS = 1100 // une requête par seconde et par hôte au plus, avec une marge pour l'horloge
const ECART_MIN_MS = 1000
const ATTENTE_RENDU_MS = 5000
const NAVIGATEUR_MAX = 40
const LECTURE_PARALLELE = 6
const NAVIGATEUR_PARALLELE = 3
const DELAI_SITE_MS = 90_000
const DELAI_PAGE_NAVIGATEUR_MS = 45_000
const CONSERVATION_JOURS = 30
const HOTE_SIRENE = 'recherche-entreprises.api.gouv.fr'
const HOTES_API = new Set(['data.ademe.fr', HOTE_SIRENE])
const PANNES_SIRENE = new Set(['injoignable', 'limite_api']) // une panne de l'API, pas un refus de l'entreprise
const PAUSES_SIRENE_MS = [5_000, 20_000, 60_000]
const PANNES_SIRENE_SUITE_MAX = 5 // cinq entreprises de suite sans réponse : l'API est tombée, la mesure s'arrête
const PANNES_SIRENE_PART_MAX = 0.05 // au-delà, le manque viendrait de l'outil : aucun verdict n'est rendu
// Ce que Chromium peut charger : la page et ce qui la fait tourner, sur le site même (et ses sous-domaines), plus les
// bibliothèques publiques usuelles. Images, polices, médias, balises de mesure d'audience et tiers : coupés.
const TYPES_PERMIS = new Set(['document', 'script', 'stylesheet', 'xhr', 'fetch'])
const CDN_PERMIS = new Set(['code.jquery.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'ajax.googleapis.com', 'unpkg.com'])
const HORLOGE = { maintenant: () => Date.now(), attendre: (ms) => dormir(ms) }
const OP_LIBRE = ['cher', 'cher'].join('') // l'opération de requête libre de 026-223 : jamais écrite en clair ici (MS-8)
const PAS_ENVOYE = /\.(fill|type|press|click|check|selectOption|setInputFiles|submit)\s*\(/

const dormir = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)))
const pct = (x) => `${(Math.round(x * 1000) / 10).toFixed(1).replace('.', ',')} %`
const nombre = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace('.', ','))
const duree = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)} min ${s % 60} s` }
const dateParis = (d = new Date()) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const baseDomaine = (h) => h.toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.')

// ── Options et aiguillage ───────────────────────────────────────────────────────────────────────────────────────────────
function lireOptions(argv) {
  const o = { n: 200, autotest: false, preuveEchecs: false, poser: false, rapport: null, firecrawl: false, inconnues: [] }
  for (const a of argv) {
    if (a === '--autotest') o.autotest = true
    else if (a === '--preuve-echecs') o.preuveEchecs = true
    else if (a === '--poser') o.poser = true
    else if (a === '--firecrawl') o.firecrawl = true
    else if (a.startsWith('--n=')) o.n = Number(a.slice(4))
    else if (a.startsWith('--rapport=')) o.rapport = a.slice(10)
    else o.inconnues.push(a)
  }
  return o
}

export async function principal(argv, env) {
  const o = lireOptions(argv)
  if (o.inconnues.length || !Number.isInteger(o.n) || o.n < 1 || o.n > 2000 || (o.poser && !o.rapport) || (!o.poser && o.rapport)) {
    env.ecrire('Usage : mesure-a-sec.mjs [--n=200] [--firecrawl] | --autotest [--preuve-echecs] | --poser --rapport=<fichier>')
    return 2
  }
  if (o.poser) return poser(o, env)
  if (env.hote !== HOTE_USINE) return relancer(argv, o, env)
  if (o.autotest || o.preuveEchecs) return autotest(o, env)
  return mesurer(o, env)
}

// MS-6 : sur le poste, jamais Chromium ; la même commande, sur l'usine, et son code rendu tel quel.
async function relancer(argv, o, env) {
  const delai = o.autotest || o.preuveEchecs ? 25 : 150
  const args = ['executer', '--nom=mesure-a-sec', `--delai=${delai}`, '--attendre=20', '--',
    'node', '--import', './scripts/ts-loader.mjs', 'scripts/agents/mesure-a-sec.mjs', ...argv]
  env.ecrire(`· ${env.hote} n'est pas l'usine : relance sur ${HOTE_USINE} par scripts/usine.mjs executer (Chromium ne tourne jamais ici)`)
  const r = await env.lancer(args)
  if (r.code === 5 || (r.code !== 0 && /usine injoignable/i.test(r.erreurs || ''))) {
    env.ecrire('✗ usine injoignable : rien n’a été mesuré sur le poste (code 2)')
    return 2
  }
  return r.code
}

function lancerExecuter(args) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, [path.join(RACINE, 'scripts', 'usine.mjs'), ...args], { cwd: RACINE, stdio: ['ignore', 'inherit', 'pipe'], windowsHide: true })
    let erreurs = ''
    enfant.stderr.setEncoding('utf8')
    enfant.stderr.on('data', (d) => { erreurs += d; process.stderr.write(d) })
    enfant.on('close', (code) => resoudre({ code: code ?? 1, erreurs }))
    enfant.on('error', (e) => resoudre({ code: 127, erreurs: String(e.message) }))
  })
}

// ── Les modules de l'acquisition (chargés sur l'usine seulement) ────────────────────────────────────────────────────────
let M = null
async function modules() {
  if (M) return M
  const [contrat, rge, sirene, lecteur, fc] = await Promise.all([
    import('@/lib/agents/acquisition/contrat'), import('@/lib/agents/acquisition/rge'), import('@/lib/agents/acquisition/sirene'),
    import('@/lib/agents/acquisition/lecteurSite'), import('@/lib/agents/lectureFirecrawl'),
  ])
  M = { ...contrat, ...rge, ...sirene, ...lecteur, ...fc }
  return M
}

// ── Le rythme : un créneau par hôte, lecture, Firecrawl et navigateur confondus (MS-5) ───────────────────────────────────
class NonConclusive extends Error {}

class Rythme {
  constructor(ms) { this.ms = ms; this.dernier = new Map() }
  async tour(hote) {
    const maintenant = Date.now()
    const precedent = this.dernier.get(hote)
    const t = precedent === undefined ? maintenant : Math.max(maintenant, precedent + this.ms)
    this.dernier.set(hote, t)
    if (t > maintenant) await dormir(t - maintenant)
  }
}

// ── Tirage ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function hasard(graine) {
  let a = crypto.createHash('sha256').update(String(graine)).digest().readUInt32LE(0)
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function melanger(tableau, graine) {
  const r = hasard(graine)
  const a = [...tableau]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

async function importerTout(ctx) {
  const { importerRge } = await modules()
  const sirens = new Set()
  const domaines = new Set()
  const candidats = []
  let curseur = null
  for (let tour = 0; tour < 1000; tour++) {
    let r = null
    for (let essai = 0; essai < 3; essai++) {
      r = await importerRge({ recuperer: ctx.recupererApi, horloge: HORLOGE, curseur, limite: 20000 })
      if (!('refus' in r)) break
      await dormir(5000)
    }
    if ('refus' in r) throw new Error('liste RGE de l’ADEME injoignable')
    for (const c of r.candidats) {
      if (sirens.has(c.siren) || domaines.has(c.domaine)) continue
      sirens.add(c.siren); domaines.add(c.domaine); candidats.push(c)
    }
    ctx.progres(`liste RGE : ${candidats.length} candidats au site non vide`)
    if (r.fini) return candidats
    curseur = r.curseur_suivant
  }
  throw new Error('liste RGE : trop de pages')
}

// ── Récupérateurs : chaque requête passe par le rythme et le journal ────────────────────────────────────────────────────
function recupererSite(ctx) {
  return async (url, options = {}) => {
    const u = new URL(url)
    if (ctx.arret) throw new Error('arret')
    await ctx.rythme.tour(u.hostname)
    const ua = options.entetes?.['user-agent'] ?? null
    ctx.journal.push({ phase: 'lecture', hote: u.hostname, t: Date.now(), methode: 'GET', ua, envoyee: true })
    const p = await ctx.base.site(url, options)
    const location = Object.entries(p.entetes || {}).find(([k]) => k.toLowerCase() === 'location')?.[1] || null
    ctx.pages.set(url, { statut: p.statut, corps: p.corps, location })
    if (u.pathname === '/robots.txt') ctx.robots.set(u.hostname, p.statut >= 200 && p.statut < 300 ? p.corps : p.statut >= 400 && p.statut < 500 ? '' : null)
    return p
  }
}
function recupererApi(ctx) {
  return async (url, options = {}) => {
    const u = new URL(url)
    if (!HOTES_API.has(u.hostname)) throw new Error('hors des API publiques')
    // Recherche d'entreprises : 7 appels par seconde au plus, et l'usine a été bannie le 28/09 au rythme de 150 ms de
    // sirene.ts (connexions refusées après environ 85 appels). Un appel par créneau d'une seconde, comme les sites.
    if (u.hostname === HOTE_SIRENE) await ctx.rythme.tour(u.hostname)
    ctx.journal.push({ phase: 'api', hote: u.hostname, t: Date.now(), methode: 'GET', ua: options.entetes?.['user-agent'] ?? null, envoyee: true })
    return ctx.base.api(url, options)
  }
}
async function apiReel(url, options = {}) {
  const r = await fetch(url, { headers: options.entetes, redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(30_000) })
  const corps = await r.text()
  return { statut: r.status, entetes: Object.fromEntries(r.headers), corps, url_finale: url }
}
// La page que le Lecteur a déjà lue, redirections suivies dans le cache (aucune requête de plus).
function pageLue(ctx, url) {
  let courante = url
  for (let saut = 0; saut <= 3; saut++) {
    const p = ctx.pages.get(courante)
    if (!p) return null
    if (p.statut >= 300 && p.statut < 400 && p.location) {
      try { courante = new URL(p.location, courante).href } catch { return null }
      continue
    }
    return { statut: p.statut, corps: p.corps, url_finale: courante }
  }
  return null
}

// ── L'adaptateur Firecrawl (026-223) : « lire » seulement, l'URL publique de la page du formulaire, jamais une requête libre ──
async function passerAdaptateur(ctx, site) {
  const { lireAvecFirecrawl } = await modules()
  const url = site.formulaire.url_page
  let u
  try { u = new URL(url) } catch { return { refus: 'hote' } }
  let apres = u.search + u.hash
  try { apres = decodeURIComponent(apres) } catch { /* laissé brut */ }
  if (/\d{9,}/.test(apres)) return { refus: 'donnee_personnelle', par: 'mesure' } // un SIREN, un SIRET ou un téléphone dans la requête
  const demande = ctx.faute === 'libre' ? { operation: OP_LIBRE, requete: 'plombier artisan' } : { operation: 'lire', url }
  return lireAvecFirecrawl(demande, depsAdaptateur(ctx, ctx.firecrawl))
}
function depsAdaptateur(ctx, fc) {
  return {
    cle: fc.cle,
    credits: fc.credits,
    horloge: HORLOGE,
    robots: async (x) => ctx.robots.get(new URL(x).hostname) ?? null,
    repli: async (x) => pageLue(ctx, x) || { refus: 'page_absente' },
    firecrawl: async (operation, corps, entetes) => {
      // Firecrawl lit le site depuis ses serveurs : c'est une requête de plus vers l'hôte, elle prend son créneau.
      const hote = typeof corps?.url === 'string' ? new URL(corps.url).hostname : 'firecrawl'
      await ctx.rythme.tour(hote)
      ctx.journal.push({ phase: 'firecrawl', hote, t: Date.now(), methode: 'GET', envoyee: true })
      return fc.appel(operation, corps, entetes)
    },
  }
}
async function firecrawlReel(operation, corps, entetes) {
  if (operation !== 'scrape') return { statut: 400, corps: null } // la mesure ne fait que lire une page
  const garde = autoriserDepense({ agent: 'mesure_a_sec', fournisseur: 'firecrawl', cout_eur: coutEstimeDeLEnv(), jeton_depense: jetonDepenseDeLEnv() })
  if (!garde.ok) return { statut: 403, corps: null }
  // Appel à l'API de Firecrawl (pas au site) : le corps ne porte que l'URL publique de la page.
  const r = await fetch('https://api.firecrawl.dev/v1/scrape', { method: 'POST', headers: { ...entetes, 'content-type': 'application/json' }, body: JSON.stringify(corps), signal: AbortSignal.timeout(60_000) })
  return { statut: r.status, corps: await r.json().catch(() => null) }
}
async function signauxTexte(texte) {
  const { lireFormulaire } = await modules()
  const echappe = String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const v = lireFormulaire(`<html><body><p>${echappe}</p></body></html>`, 'https://texte.invalid/', '').verdict
  return v.eligible === false && v.raison !== 'sans_formulaire' ? v.raison : null
}

// ── Chromium : ouvrir, attendre, lire le DOM rendu ; rien d'autre ─────────────────────────────────────────────────────────
async function chargerPlaywright() {
  try {
    fs.accessSync('/srv/playwright', fs.constants.R_OK | fs.constants.X_OK)
    if (fs.readdirSync('/srv/playwright').some((d) => d.startsWith('chromium'))) process.env.PLAYWRIGHT_BROWSERS_PATH = '/srv/playwright'
  } catch { /* le Chromium de l'arbre jetable */ }
  return import('playwright')
}
export async function ouvrirDansChromium(ctx, sites) {
  if (ctx.hote !== HOTE_USINE) throw new Error(`Chromium refusé hors de ${HOTE_USINE}`) // MS-6, garde de dernier recours
  const { chromium } = await ctx.playwright()
  const navigateur = await chromium.launch({ headless: true, args: ctx.argsNavigateur })
  try {
    await enParallele(sites, NAVIGATEUR_PARALLELE, async (site) => {
      try { site.navigateur = await ouvrirUne(navigateur, ctx, site) } catch { site.navigateur = { verdict: { eligible: false, raison: 'chargement_impossible' }, charge: false } }
    })
  } finally {
    await navigateur.close().catch(() => {})
  }
}
async function ouvrirUne(navigateur, ctx, site) {
  const { lireFormulaire, UA_RECENSEUR } = await modules()
  const lue = pageLue(ctx, site.formulaire.url_page)
  const urlPage = lue?.url_finale || site.formulaire.url_page // la page finale : pas de redirection hors rythme
  const origine = new URL(urlPage)
  const base = baseDomaine(origine.hostname)
  const contexte = await navigateur.newContext({ userAgent: UA_RECENSEUR, serviceWorkers: 'block', acceptDownloads: false, locale: 'fr-FR' })
  let ferme = false
  try {
    await contexte.route('**/*', async (route) => {
      const req = route.request()
      let u
      try { u = new URL(req.url()) } catch { return route.abort('blockedbyclient').catch(() => {}) }
      const methode = req.method()
      const type = req.resourceType()
      const hote = u.hostname
      const bloquer = (motif) => {
        ctx.journal.push({ phase: 'navigateur', hote, t: Date.now(), methode, type, envoyee: false, motif })
        return route.abort('blockedbyclient').catch(() => {})
      }
      // ctx.gardeLevee (autotest seulement, faute 'post') : simule exactement le bogue « return bloquer(...) retiré » sans
      // jamais toucher à cette ligne en production — la suite du pipeline (schéma, type, tiers, hôte, rythme) reste active.
      if (methode !== 'GET' && methode !== 'HEAD') { site.nonGet = (site.nonGet || 0) + 1; if (!ctx.gardeLevee) return bloquer('non_get') } // rien ne part
      if (ctx.arret) return bloquer('arret')
      if (!['http:', 'https:'].includes(u.protocol)) return bloquer('schema')
      if (!TYPES_PERMIS.has(type)) return bloquer('type')
      const duSite = hote === origine.hostname || baseDomaine(hote) === base
      if (!duSite && !(CDN_PERMIS.has(hote) && (type === 'script' || type === 'stylesheet'))) return bloquer('tiers')
      if (!await ctx.hotePermis(u.href)) return bloquer('hote_prive')
      await ctx.rythme.tour(hote)
      if (ctx.arret || ferme) return bloquer(ferme ? 'page_fermee' : 'arret')
      await contexte.clearCookies().catch(() => {}) // aucun cookie ne repart
      const entetes = { ...req.headers() }
      delete entetes.cookie
      ctx.journal.push({ phase: 'navigateur', hote, t: Date.now(), methode, type, envoyee: true })
      return route.continue({ headers: entetes }).catch(() => {})
    })
    const page = await contexte.newPage()
    page.on('request', (r) => {
      // Les redirections ne repassent pas par route : elles sont consignées ici.
      if (!r.redirectedFrom()) return
      try { ctx.journal.push({ phase: 'navigateur', hote: new URL(r.url()).hostname, t: Date.now(), methode: r.method(), type: r.resourceType(), envoyee: true, redirection: true }) } catch { /* URL illisible */ }
    })
    page.on('requestfinished', (r) => {
      const m = r.method()
      if (m !== 'GET' && m !== 'HEAD') { ctx.nonGetSortis++; ctx.arret = true } // une requête non-GET est sortie : tout s'arrête
    })
    let charge = true
    try { await page.goto(ctx.versNavigateur(urlPage), { waitUntil: 'load', timeout: DELAI_PAGE_NAVIGATEUR_MS }) } catch { charge = false }
    await page.waitForTimeout(ATTENTE_RENDU_MS)
    let html = ''
    try { html = await page.content() } catch { charge = false }
    const lu = lireFormulaire(html, urlPage, ctx.robots.get(origine.hostname) ?? '')
    return { verdict: lu.verdict, charge }
  } finally {
    ferme = true
    await contexte.close().catch(() => {})
  }
}

async function enParallele(elements, n, f) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, elements.length) }, async () => {
    while (i < elements.length) { const k = i++; await f(elements[k], k) }
  }))
}
function avecDelai(promesse, ms) {
  let minuterie
  return Promise.race([promesse, new Promise((r) => { minuterie = setTimeout(() => r({ refus: 'delai' }), ms) })]).finally(() => clearTimeout(minuterie))
}

// ── La mesure (autotest et réelle : le même chemin) ──────────────────────────────────────────────────────────────────────
async function executerMesure(ctx) {
  const { ficheParSiren, retenir, lireSite } = await modules()
  const t0 = Date.now()
  const liste = await ctx.importer()
  const tires = melanger([...liste].sort((a, b) => a.siren.localeCompare(b.siren)), ctx.graine).slice(0, ctx.n)
  const sites = tires.map((c) => ({ siren: c.siren, domaine: c.domaine, manque: null, html: null, formulaire: null, adaptateur: null, navigateur: null, final: null, nonGet: 0 }))

  // SIRENE d'abord : un refus arrête là ce site (aucune lecture).
  // Une panne de l'API (injoignable, limite) se rejoue après une pause ; si elle dure, la mesure s'arrête sans verdict :
  // un manque qui viendrait de l'outil ne dit rien des formulaires.
  let k = 0
  let suite = 0
  for (const s of sites) {
    let fiche = null
    const pauses = ctx.pausesSirene || PAUSES_SIRENE_MS
    for (let essai = 0; essai <= pauses.length; essai++) {
      fiche = await ficheParSiren(s.siren, { recuperer: ctx.recupererApi, horloge: HORLOGE })
      if (!('refus' in fiche) || !PANNES_SIRENE.has(fiche.refus) || essai === pauses.length) break
      await dormir(pauses[essai])
    }
    if ('refus' in fiche) s.manque = `refus SIRENE, ${fiche.refus}`
    else { const r = retenir(fiche, 'artisan'); if ('refus' in r) s.manque = `refus SIRENE, ${r.refus}` }
    suite = 'refus' in fiche && PANNES_SIRENE.has(fiche.refus) ? suite + 1 : 0
    if (suite >= PANNES_SIRENE_SUITE_MAX) throw new NonConclusive(`API Recherche d'entreprises sans réponse pour ${suite} entreprises de suite`)
    if (++k % 25 === 0) ctx.progres(`SIRENE : ${k} sur ${sites.length}`)
  }
  const pannes = sites.filter((s) => /^refus SIRENE, (injoignable|limite_api)$/.test(s.manque || '')).length
  if (pannes > PANNES_SIRENE_PART_MAX * sites.length) throw new NonConclusive(`API Recherche d'entreprises en panne pour ${pannes} entreprises sur ${sites.length}`)

  // Lecture polie.
  const aLire = sites.filter((s) => !s.manque)
  let lus = 0
  await enParallele(aLire, LECTURE_PARALLELE, async (s) => {
    const deps = { recuperer: ctx.recupererSite, horloge: HORLOGE, echeance: Date.now() + DELAI_SITE_MS - 15_000 }
    let r
    try { r = await avecDelai(lireSite(s.domaine, deps), DELAI_SITE_MS) } catch { r = { refus: 'injoignable' } }
    if ('refus' in r) s.manque = r.refus === 'annuaire' ? 'annuaire' : r.refus === 'delai' ? 'délai dépassé' : 'site injoignable ou illisible'
    else {
      s.html = r.verdict_formulaire
      s.formulaire = r.formulaire && { url_page: r.formulaire.url_page, technologie: r.formulaire.technologie, telephone_requis: r.formulaire.telephone_requis, motifs: r.formulaire.motifs }
    }
    if (++lus % 20 === 0) ctx.progres(`lecture : ${lus} sur ${aLire.length}`)
  })

  // Adaptateur de lecture puis navigateur, pour les formulaires éligibles au HTML.
  const htmlEligibles = sites.filter((s) => s.html?.eligible && s.formulaire)
  for (const s of htmlEligibles) {
    let r
    try { r = await passerAdaptateur(ctx, s) } catch { r = { refus: 'panne_adaptateur' } }
    s.adaptateur = r.refus ? { refus: r.refus } : r.methode === 'firecrawl' ? { methode: 'firecrawl' } : r.methode ? { methode: 'repli', raison: r.raison_repli || 'inconnue', source: r.url_finale || null } : { anomalie: true }
    if (r.refus === 'donnee_personnelle') s.final = { eligible: false, raison: 'url_donnee_personnelle', ou: 'adaptateur' }
    else if (r.methode === 'firecrawl') { const raison = await signauxTexte(r.texte); if (raison) s.final = { eligible: false, raison, ou: 'firecrawl' } }
  }
  const restants = htmlEligibles.filter((s) => !s.final)
  const aOuvrir = restants.slice(0, NAVIGATEUR_MAX)
  const nonOuverts = restants.slice(NAVIGATEUR_MAX)
  if (aOuvrir.length) {
    ctx.progres(`navigateur : ${aOuvrir.length} formulaire(s) à ouvrir`)
    await ouvrirDansChromium(ctx, aOuvrir)
  }
  for (const s of aOuvrir) {
    const v = s.navigateur?.verdict
    s.final = v?.eligible ? { eligible: true } : { eligible: false, raison: v?.raison || 'chargement_impossible', ou: 'navigateur' }
  }
  for (const s of sites) if (s.html && !s.final && !nonOuverts.includes(s)) s.final = { eligible: false, raison: s.html.eligible ? 'sans_formulaire' : s.html.raison, ou: 'html' }

  const comptes = compter(ctx, liste, sites, htmlEligibles, aOuvrir, nonOuverts)
  let rapport = rediger(ctx, comptes, Date.now() - t0)
  if (ctx.faute === 'domaine') rapport += `- site d'essai : eligible.${DOMAINE_ESSAI}\n` // faute plantée (MS-3)
  return { sites, comptes, rapport, domaines: tires.map((c) => c.domaine) }
}

function compter(ctx, liste, sites, htmlEligibles, aOuvrir, nonOuverts) {
  const inc = (o, cle, n = 1) => { o[cle] = (o[cle] || 0) + n; return o }
  const lus = sites.filter((s) => s.html)
  const manque = {}
  for (const s of sites) if (s.manque) inc(manque, s.manque)
  const eligiblesNavigateur = aOuvrir.filter((s) => s.final?.eligible).length
  const survie = aOuvrir.length ? eligiblesNavigateur / aOuvrir.length : 0
  const eligibles = sites.filter((s) => s.final?.eligible).length + nonOuverts.length * survie
  const abandons = {}, ecart = {}, parTechno = {}, parTechnoEligibles = {}, adaptateur = { firecrawl: 0, repli: {}, refus: {} }
  for (const s of lus) {
    if (s.final && !s.final.eligible) inc(abandons, s.final.raison)
    if (s.final?.ou === 'navigateur') inc(ecart, s.final.raison)
    if (s.formulaire) inc(parTechno, s.formulaire.technologie)
    if (s.final?.eligible) inc(parTechnoEligibles, s.formulaire.technologie)
    if (s.adaptateur?.methode === 'firecrawl') adaptateur.firecrawl++
    else if (s.adaptateur?.methode === 'repli') inc(adaptateur.repli, s.adaptateur.raison)
    else if (s.adaptateur?.refus) inc(adaptateur.refus, s.adaptateur.refus)
  }
  const envoyees = ctx.journal.filter((e) => e.envoyee && ['lecture', 'navigateur', 'firecrawl'].includes(e.phase))
  const parHote = new Map()
  for (const e of envoyees) { if (!parHote.has(e.hote)) parHote.set(e.hote, []); parHote.get(e.hote).push(e.t) }
  let ecartMin = null
  for (const ts of parHote.values()) { ts.sort((a, b) => a - b); for (let i = 1; i < ts.length; i++) ecartMin = ecartMin === null ? ts[i] - ts[i - 1] : Math.min(ecartMin, ts[i] - ts[i - 1]) }
  const nav = ctx.journal.filter((e) => e.phase === 'navigateur')
  return {
    candidats: liste.length, tires: sites.length, lus: lus.length, manque, manqueTotal: sites.length - lus.length,
    htmlEligibles: htmlEligibles.length, ecartesAvant: htmlEligibles.length - aOuvrir.length - nonOuverts.length,
    ecartesAvantParRaison: htmlEligibles.filter((s) => s.final && !s.final.eligible && s.final.ou !== 'navigateur').reduce((o, s) => inc(o, s.final.raison), {}),
    ouverts: aOuvrir.length, chargesHorsDelai: aOuvrir.filter((s) => !s.navigateur?.charge).length,
    eligiblesNavigateur, nonOuverts: nonOuverts.length, eligibles,
    part: lus.length ? eligibles / lus.length : 0,
    telephone: lus.filter((s) => s.formulaire?.telephone_requis).length,
    devisSeul: lus.filter((s) => s.formulaire?.motifs?.length && s.formulaire.motifs.every((m) => /devis/i.test(m))).length,
    abandons, ecart, parTechno, parTechnoEligibles, adaptateur,
    requetes: {
      lecture: ctx.journal.filter((e) => e.phase === 'lecture').length,
      navigateurEnvoyees: nav.filter((e) => e.envoyee).length,
      navigateurBloquees: nav.filter((e) => !e.envoyee).length,
      nonGet: nav.filter((e) => e.methode !== 'GET' && e.methode !== 'HEAD').length,
      firecrawl: ctx.journal.filter((e) => e.phase === 'firecrawl').length,
      api: ctx.journal.filter((e) => e.phase === 'api').length,
      ecartMin,
    },
    nonGetSortis: ctx.nonGetSortis,
  }
}

function rediger(ctx, c, ms) {
  const { SEUIL_ELIGIBLES } = M
  const verdict = c.part >= SEUIL_ELIGIBLES ? 'PASS' : 'FAIL'
  const liste = (o, total) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `  - ${k} : ${nombre(n)}${total ? ` (${pct(n / total)})` : ''}`)
  const enLigne = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${k} ${n}`).join(', ') || 'aucun'
  const parJour = (k) => (c.part > 0 ? Math.ceil(k / c.part) : null)
  const tirerParJour = (k) => (c.part > 0 && c.lus ? Math.ceil(k / (c.part * c.lus / c.tires)) : null)
  const L = [
    `# Mesure à sec — ${ctx.graine}`, '',
    `- hôte : ${ctx.hote}`,
    `- nature : ${ctx.mode === 'reel' ? 'mesure réelle' : 'autotest (pages d’essai servies sur la machine même)'}`,
    `- durée : ${duree(ms)}`,
    `- verdict : ${verdict} — part éligible ${pct(c.part)} pour un seuil de ${pct(SEUIL_ELIGIBLES)}`,
    '', '## Tirage et manque', '',
    `- candidats au site non vide dans la liste RGE de l’ADEME (data.ademe.fr) : ${c.candidats}`,
    `- sites tirés : ${c.tires} (graine ${ctx.graine})`,
    `- sites lus : ${c.lus}`,
    `- manque : ${c.manqueTotal}`,
    ...liste(c.manque),
    '', '## Formulaires', '',
    `- éligibles à la lecture du HTML : ${c.htmlEligibles}`,
    `- écartés avant le navigateur : ${c.ecartesAvant}`,
    ...liste(c.ecartesAvantParRaison),
    `- ouverts dans Chromium : ${c.ouverts} (au plus ${NAVIGATEUR_MAX}), rien rempli, rien cliqué, rien soumis`,
    `- éligibles après le navigateur : ${c.eligiblesNavigateur}`,
    `- éligibles au HTML non ouverts (au-delà de ${NAVIGATEUR_MAX}, estimés au taux du navigateur) : ${c.nonOuverts}`,
    `- part éligible : ${pct(c.part)} (${nombre(c.eligibles)} sur ${c.lus} sites lus)`,
    `- formulaires trouvés, par technologie : ${enLigne(c.parTechno)}`,
    `- éligibles, par technologie : ${enLigne(c.parTechnoEligibles)}`,
    `- téléphone obligatoire : ${c.telephone} (${pct(c.lus ? c.telephone / c.lus : 0)})`,
    `- motif « devis » seul : ${c.devisSeul} (${pct(c.lus ? c.devisSeul / c.lus : 0)})`,
    '', '## Abandons, en part des sites lus', '',
    ...(Object.keys(c.abandons).length ? liste(c.abandons, c.lus) : ['  - aucun']),
    '', '## Écart lecture HTML / navigateur', '',
    `- éligibles au HTML devenus non éligibles dans Chromium : ${Object.values(c.ecart).reduce((a, b) => a + b, 0)}`,
    ...liste(c.ecart),
    `- pages chargées hors délai : ${c.chargesHorsDelai}`,
    '', '## Adaptateur de lecture (026-223, « lire » seulement)', '',
    `- pages lues par Firecrawl : ${c.adaptateur.firecrawl}`,
    `- repli sur le Lecteur : ${Object.values(c.adaptateur.repli).reduce((a, b) => a + b, 0)} (${enLigne(c.adaptateur.repli)})`,
    `- refus de l’adaptateur : ${Object.values(c.adaptateur.refus).reduce((a, b) => a + b, 0)} (${enLigne(c.adaptateur.refus)})`,
    '', '## Requêtes', '',
    `- Lecteur : ${c.requetes.lecture} ; navigateur : ${c.requetes.navigateurEnvoyees} envoyées, ${c.requetes.navigateurBloquees} coupées avant de partir ; Firecrawl : ${c.requetes.firecrawl} ; API publiques : ${c.requetes.api}`,
    `- requêtes autres que GET émises par les pages : ${c.requetes.nonGet} tentées, ${c.nonGetSortis} sorties`,
    `- plus petit écart entre deux requêtes au même hôte : ${c.requetes.ecartMin === null ? 'sans objet' : `${(c.requetes.ecartMin / 1000).toFixed(2).replace('.', ',')} s`}`,
    '', '## Projection', '',
    `- stock estimé : ${pct(c.part)} de ${c.candidats} candidats, soit ${Math.round(c.part * c.candidats)} formulaires`,
    `- sites à lire par jour : ${parJour(20) ?? 'sans objet'} pour 20 formulaires, ${parJour(40) ?? 'sans objet'} pour 40 (candidats à tirer : ${tirerParJour(20) ?? 'sans objet'} et ${tirerParJour(40) ?? 'sans objet'})`,
    '',
  ]
  return L.join('\n')
}

// ── MS-3 : un rapport de comptes seuls ───────────────────────────────────────────────────────────────────────────────────
export function rapportPropre(texte) {
  const bas = String(texte).toLowerCase().replace(/prestiapp\.fr|data\.ademe\.fr/g, ' ')
  const domaines = bas.match(/[a-z0-9-]+\.[a-z]{2,}/g) || []
  const numeros = String(texte).match(/(?<!\d)(?:\d{9}|\d{14}|\d{3}[ .]\d{3}[ .]\d{3})(?!\d)/g) || []
  const arobases = (String(texte).match(/@/g) || []).length
  return { ok: !domaines.length && !numeros.length && !arobases, domaines: domaines.length, numeros: numeros.length, arobases }
}

// ── La mesure réelle ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function mesurer(o, env) {
  const m = await modules()
  const graine = dateParis()
  const racine = path.join(os.homedir(), 'mesure-a-sec')
  const dossier = path.join(racine, graine)
  fs.mkdirSync(dossier, { recursive: true, mode: 0o700 })
  fs.chmodSync(racine, 0o700); fs.chmodSync(dossier, 0o700)
  nettoyer(racine, graine)
  const fichierCredits = path.join(racine, 'firecrawl-credits.json')
  const credits = { plafond: 1000, consommes: null, date: null, source: null }
  if (o.firecrawl) try { Object.assign(credits, JSON.parse(fs.readFileSync(fichierCredits, 'utf8')), { plafond: 1000 }) } catch { /* mesure absente : repli */ }
  const ctx = {
    mode: 'reel', hote: env.hote, n: o.n, graine, faute: null, journal: [], pages: new Map(), robots: new Map(),
    rythme: new Rythme(ESPACEMENT_MS), arret: false, nonGetSortis: 0,
    base: { site: m.recuperateurReseau, api: apiReel },
    firecrawl: { cle: o.firecrawl ? (process.env.FIRECRAWL_API_KEY || null) : null, credits, appel: firecrawlReel },
    playwright: chargerPlaywright, argsNavigateur: [], versNavigateur: (u) => u,
    // Chromium résout lui-même : une adresse privée ou locale (le réseau de l'usine) n'est jamais demandée.
    hotePermis: async (href) => {
      try {
        const dns = await import('node:dns/promises')
        return m.hoteAutorise(href, (await dns.lookup(new URL(href).hostname, { all: true, verbatim: true })).map((x) => x.address))
      } catch { return false }
    },
    progres: (t) => env.ecrire(`· ${t}`),
  }
  ctx.recupererSite = recupererSite(ctx)
  ctx.recupererApi = recupererApi(ctx)
  ctx.importer = () => importerTout(ctx)
  let r
  try {
    r = await executerMesure(ctx)
  } catch (e) {
    if (!(e instanceof NonConclusive)) throw e
    fs.rmSync(path.join(dossier, 'rapport.md'), { force: true }) // aucun rapport du jour ne reste debout
    env.ecrire(`✗ mesure non conclusive : ${e.message} ; aucun verdict, rien à poser (relancer plus tard : même tirage le même jour)`)
    return 1
  } finally {
    ecrirePrive(path.join(dossier, 'journal.jsonl'), ctx.journal.map((e) => JSON.stringify(e)).join('\n') + '\n')
    if (o.firecrawl && typeof credits.consommes === 'number') ecrirePrive(fichierCredits, JSON.stringify({ consommes: credits.consommes, date: new Date().toISOString(), source: 'compteur local de mesure-a-sec' }))
  }
  ecrirePrive(path.join(dossier, 'domaines.txt'), r.domaines.join('\n') + '\n')
  const propre = rapportPropre(r.rapport)
  if (!propre.ok) { env.ecrire(`✗ MS-3 : le rapport porte ${propre.domaines} domaine(s), ${propre.numeros} numéro(s), ${propre.arobases} « @ » : il n'est pas affiché`); return 1 }
  ecrirePrive(path.join(dossier, 'rapport.md'), r.rapport)
  env.sortie(r.rapport)
  const somme = Object.values(r.comptes.manque).reduce((a, b) => a + b, 0)
  if (somme !== r.comptes.manqueTotal) { env.ecrire(`✗ MS-2 : la somme des raisons (${somme}) n'égale pas le manque (${r.comptes.manqueTotal})`); return 1 }
  if (ctx.nonGetSortis) { env.ecrire('✗ une requête autre que GET est sortie du navigateur : mesure arrêtée'); return 1 }
  return r.comptes.part >= m.SEUIL_ELIGIBLES ? 0 : 3
}
function ecrirePrive(fichier, contenu) {
  fs.writeFileSync(fichier, contenu, { mode: 0o600 })
  fs.chmodSync(fichier, 0o600)
}
function nettoyer(racine, aujourdhui) {
  const limite = Date.parse(`${aujourdhui}T00:00:00Z`) - CONSERVATION_JOURS * 86_400_000
  for (const d of fs.readdirSync(racine)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Date.parse(`${d}T00:00:00Z`) < limite) fs.rmSync(path.join(racine, d), { recursive: true, force: true })
  }
}

// ── Autotest : six pages d'essai (plus le piège de MS-8 et un refus SIRENE), servies sur 127.0.0.1 ────────────────────────
const DOMAINE_ESSAI = 'essai-mesure.example'
const SITES_ESSAI = [
  { cle: 'eligible', html: 'eligible', final: 'eligible' },
  { cle: 'captcha-js', html: 'eligible', final: 'captcha' },
  { cle: 'pot-de-miel', html: 'pot_de_miel', final: 'pot_de_miel' },
  { cle: 'telephone', html: 'telephone_requis', final: 'telephone_requis' },
  { cle: 'robots', html: 'robots_txt', final: 'robots_txt' },
  { cle: 'demarchage', html: 'refus_demarchage', final: 'refus_demarchage' },
  { cle: 'piege', html: 'eligible', final: 'url_donnee_personnelle' }, // MS-8
  { cle: 'inactif', sirene: 'inactif' }, // le manque expliqué (MS-2 en petit)
]
const PIEGE_REQUETE = '?contact=piege.026@exemple.fr'
const W_JS = "(function(){var d=document.createElement('div');d.className='cf-turnstile';d.setAttribute('data-sitekey','factice-essai');var f=document.querySelector('form');if(f)f.appendChild(d)})();"
const P_JS = "fetch('/contact',{method:'POST',body:'essai=1'}).catch(function(){});"
const hoteEssai = (cle) => `${cle}.${DOMAINE_ESSAI}`

function pageEssai(cle, chemin, faute) {
  const tete = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="icon" href="data:,"><title>Entreprise d'essai ${cle}</title></head><body>`
  if (chemin === '/') return `${tete}<h1>Artisan d'essai</h1><p>Rénovation et dépannage.</p><a href="${cle === 'piege' ? `/contact${PIEGE_REQUETE}` : '/contact'}">Contact</a></body></html>`
  if (chemin !== '/contact') return null
  const champs = ['<label>Nom <input type="text" name="nom" required></label>', '<label>Courriel <input type="email" name="courriel" required></label>']
  if (cle === 'pot-de-miel') champs.push('<input type="text" name="honeypot" tabindex="-1" autocomplete="off">')
  if (cle === 'telephone') champs.push('<label>Téléphone <input type="tel" name="tel" required></label>')
  const texte = cle === 'demarchage' ? '<p>Pas de démarchage commercial, merci.</p>' : '<p>Écrivez-nous.</p>'
  // Durci le 28/09 (contre-vérification 026-165, bloquant D1) : la page « eligible » tente TOUJOURS un POST au chargement,
  // comme un vrai site (pas seulement quand faute === 'post') — sinon MS-4 ne juge jamais rien de réel dans le témoin nu.
  const script = cle === 'captcha-js' ? '<script src="/assets/w.js"></script>' : cle === 'eligible' ? '<script src="/assets/p.js"></script>' : ''
  return `${tete}${texte}<form method="post" action="/contact">${champs.join('')}<textarea name="message" required></textarea><button type="submit">Envoyer</button></form>${script}</body></html>`
}
function serveurEssai(faute) {
  const journal = []
  const serveur = http.createServer((req, res) => {
    const hote = String(req.headers.host || '').replace(/:\d+$/, '').toLowerCase()
    const u = new URL(req.url, 'http://local.invalid')
    journal.push({ hote, t: Date.now(), methode: req.method, ua: req.headers['user-agent'] || '', cookie: Boolean(req.headers.cookie), chemin: u.pathname })
    const envoyer = (statut, type, corps, plus = {}) => { res.writeHead(statut, { 'content-type': type, ...plus }); res.end(corps) }
    const cle = hote.endsWith(`.${DOMAINE_ESSAI}`) ? hote.slice(0, -DOMAINE_ESSAI.length - 1) : null
    if (!cle || !SITES_ESSAI.some((s) => s.cle === cle)) return envoyer(404, 'text/plain', 'inconnu')
    if (req.method !== 'GET' && req.method !== 'HEAD') return envoyer(405, 'text/plain', 'non')
    if (u.pathname === '/robots.txt') return envoyer(200, 'text/plain', cle === 'robots' ? 'User-agent: *\nDisallow: /contact\n' : 'User-agent: *\nDisallow:\n')
    if (u.pathname === '/assets/w.js' && cle === 'captcha-js') return envoyer(200, 'text/javascript', W_JS)
    if (u.pathname === '/assets/p.js' && cle === 'eligible') return envoyer(200, 'text/javascript', P_JS)
    const html = pageEssai(cle, u.pathname, faute)
    // Un cookie posé par le site : il ne doit jamais revenir (ni du Lecteur, ni du navigateur).
    return html ? envoyer(200, 'text/html; charset=utf-8', html, cle === 'captcha-js' ? { 'set-cookie': 'suivi=essai; Path=/' } : {}) : envoyer(404, 'text/plain', 'absent')
  })
  return new Promise((r) => serveur.listen(0, '127.0.0.1', () => r({ serveur, port: serveur.address().port, journal })))
}
function getLocal(port, url, options = {}) {
  return new Promise((resoudre, rejeter) => {
    const u = new URL(url)
    const req = http.request({ host: '127.0.0.1', port, path: u.pathname + u.search, method: 'GET', headers: { ...(options.entetes || {}), host: u.hostname } }, (res) => {
      const morceaux = []
      res.on('data', (c) => morceaux.push(c))
      res.on('end', () => resoudre({ statut: res.statusCode, entetes: Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, String(v)])), corps: Buffer.concat(morceaux).toString('utf8'), url_finale: url }))
    })
    req.setTimeout(8000, () => req.destroy(new Error('delai')))
    req.on('error', rejeter)
    req.end()
  })
}
function luhn(s) {
  let somme = 0
  for (let i = 0; i < s.length; i++) { let c = Number(s[s.length - 1 - i]); if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9 } somme += c }
  return somme % 10 === 0
}
function numeroEssai(prefixe, longueur) {
  for (let k = 0; k < 1000; k++) { const s = prefixe + String(k).padStart(longueur - prefixe.length, '0'); if (luhn(s)) return s }
  throw new Error('numéro d’essai introuvable')
}
function fixturesApi(faute) {
  const lignes = SITES_ESSAI.map((s, i) => {
    const siren = numeroEssai(`9990${i}`, 9)
    return { s, siren, siret: numeroEssai(siren, 14) }
  })
  return async (url) => {
    const u = new URL(url)
    const json = (o) => ({ statut: 200, entetes: { 'content-type': 'application/json' }, corps: JSON.stringify(o), url_finale: url })
    if (u.hostname === 'data.ademe.fr') {
      return json({ total: lignes.length, results: lignes.map((l) => ({ siret: l.siret, site_internet: `https://${hoteEssai(l.s.cle)}`, code_postal: '75011', commune: 'Paris', domaine: 'Plomberie', nom_qualification: 'Installation sanitaire' })) })
    }
    if (faute === 'sirene') return { statut: 503, entetes: { 'content-type': 'text/plain' }, corps: 'indisponible', url_finale: url }
    const l = lignes.find((x) => x.siren === u.searchParams.get('q'))
    if (!l) return json({ results: [] })
    return json({ results: [{
      siren: l.siren, nom_complet: 'ENTREPRISE D ESSAI', activite_principale: '43.22A', date_creation: '2015-01-01',
      etat_administratif: l.s.sirene === 'inactif' ? 'C' : 'A', statut_diffusion: 'O', tranche_effectif_salarie: '01',
      siege: { siret: l.siret, code_postal: '75011', libelle_commune: 'Paris', etat_administratif: 'A', tranche_effectif_salarie: '01' },
      complements: { est_entrepreneur_individuel: false },
    }] })
  }
}
function doublureFirecrawl() {
  const appels = []
  return {
    appels,
    appel: async (operation, corps) => {
      appels.push({ operation, url: corps?.url ?? null, requete: corps?.query ?? null })
      if (operation !== 'scrape') return { statut: 200, corps: { success: true, data: [] } }
      return { statut: 200, corps: { success: true, data: { markdown: 'Contactez l’entreprise d’essai par ce formulaire, nous répondons vite.', metadata: { sourceURL: corps.url } } } }
    },
  }
}
const creditsEssai = (consommes = 0) => ({ plafond: 1000, consommes, date: new Date(Date.now() - 1000).toISOString(), source: 'autotest' })

async function passeEssai(env, faute, dossierTemp) {
  const m = await modules()
  const { serveur, port, journal: journalServeur } = await serveurEssai(faute)
  const doublure = doublureFirecrawl()
  const ctx = {
    mode: 'autotest', hote: env.hote, n: 200, graine: dateParis(), faute, journal: [], pages: new Map(), robots: new Map(),
    rythme: new Rythme(faute === 'rythme' ? 200 : ESPACEMENT_MS), arret: false, nonGetSortis: 0,
    // Durci le 28/09 (026-165, bloquant D1) : « garde levée » — reproduit par un drapeau de contexte, jamais en dehors de
    // l'autotest, le retrait exact de `return bloquer('non_get')` que la contre-vérification a fait à la main en production.
    gardeLevee: faute === 'post',
    base: { site: (url, options) => getLocal(port, url, options), api: fixturesApi(faute) },
    pausesSirene: [10, 10, 10],
    firecrawl: { cle: ['cle', 'factice', 'essai'].join('-'), credits: creditsEssai(), appel: doublure.appel },
    playwright: chargerPlaywright,
    argsNavigateur: [`--host-resolver-rules=MAP *.${DOMAINE_ESSAI} 127.0.0.1`],
    versNavigateur: (url) => { const u = new URL(url); return `http://${u.hostname}:${port}${u.pathname}${u.search}` },
    hotePermis: async (href) => new URL(href).hostname.endsWith(`.${DOMAINE_ESSAI}`), // l'essai ne sort jamais de la machine
    progres: () => {},
  }
  ctx.recupererSite = recupererSite(ctx)
  ctx.recupererApi = recupererApi(ctx)
  ctx.importer = () => importerTout(ctx)
  try {
    const r = await executerMesure(ctx)
    fs.writeFileSync(path.join(dossierTemp, `domaines-${faute || 'temoin'}.txt`), r.domaines.join('\n'), { mode: 0o600 })
    // FC (correction du 27/09) : quota épuisé, robots refusés, clé absente : aucun appel Firecrawl, repli explicite, source gardée.
    const eligible = r.sites.find((s) => s.domaine === hoteEssai('eligible'))
    const url = eligible?.formulaire?.url_page
    const fc = {}
    if (url) {
      const avant = doublure.appels.length
      fc.quota = await m.lireAvecFirecrawl({ operation: 'lire', url }, depsAdaptateur(ctx, { cle: ctx.firecrawl.cle, credits: creditsEssai(1000), appel: doublure.appel }))
      const robotsInterdits = { ...ctx, robots: new Map([[new URL(url).hostname, 'User-agent: *\nDisallow: /contact\n']]) }
      fc.robots = await m.lireAvecFirecrawl({ operation: 'lire', url }, depsAdaptateur(robotsInterdits, { cle: ctx.firecrawl.cle, credits: creditsEssai(), appel: doublure.appel }))
      fc.sansCle = await m.lireAvecFirecrawl({ operation: 'lire', url }, depsAdaptateur(ctx, { cle: null, credits: creditsEssai(), appel: doublure.appel }))
      fc.appelsPendant = doublure.appels.length - avant
      fc.url = url
    }
    return { ...r, ctx, journalServeur, doublure, fc }
  } finally {
    await new Promise((f) => serveur.close(() => f()))
  }
}

async function juger(p, env, source) {
  const m = await modules()
  const c = []
  const critere = (id, ok, detail) => c.push({ id, ok: Boolean(ok), detail })
  const site = (cle) => p.sites.find((s) => s.domaine === hoteEssai(cle))
  const nom = (v) => (v ? (v.eligible ? 'eligible' : v.raison) : 'absent')

  // MS-1 : les six pages, site par site, puis les comptes et les parts du rapport.
  const six = SITES_ESSAI.slice(0, 6)
  const ecarts = six.filter((s) => nom(site(s.cle)?.html) !== s.html || nom(site(s.cle)?.final) !== s.final).map((s) => `${s.cle} : HTML ${nom(site(s.cle)?.html)}, final ${nom(site(s.cle)?.final)}`)
  const captcha = site('captcha-js')
  const lignes = ['- part éligible : 14,3 % (1 sur 7 sites lus)', '  - captcha : 1 (14,3 %)', '  - pot_de_miel : 1 (14,3 %)', '  - telephone_requis : 1 (14,3 %)',
    '  - robots_txt : 1 (14,3 %)', '  - refus_demarchage : 1 (14,3 %)', '- éligibles au HTML devenus non éligibles dans Chromium : 1', '- téléphone obligatoire : 1 (14,3 %)']
  const manquantes = lignes.filter((l) => !p.rapport.split('\n').includes(l))
  const comptesOk = p.comptes.eligibles === 1 && p.comptes.ecart.captcha === 1 && Object.values(p.comptes.ecart).reduce((a, b) => a + b, 0) === 1
    && ['pot_de_miel', 'telephone_requis', 'robots_txt', 'refus_demarchage', 'captcha'].every((r) => p.comptes.abandons[r] === 1)
  critere('MS-1', !ecarts.length && captcha?.final?.ou === 'navigateur' && captcha?.navigateur?.charge && comptesOk && !manquantes.length && p.comptes.ouverts === 2,
    ecarts.length ? ecarts.join(' ; ') : manquantes.length ? `lignes absentes du rapport : ${manquantes.join(' | ')}`
      : `1 éligible, captcha vu dans Chromium seulement (écart 1), pot de miel, téléphone, robots, démarchage : 1 chacun ; ${p.comptes.ouverts} page(s) ouvertes ; parts à 14,3 %`)

  // MS-2 en petit : le manque expliqué par raison.
  const somme = Object.values(p.comptes.manque).reduce((a, b) => a + b, 0)
  critere('MS-2', somme === p.comptes.manqueTotal && p.comptes.manque['refus SIRENE, inactif'] === 1 && p.comptes.tires === 8,
    `tirés ${p.comptes.tires}, lus ${p.comptes.lus}, manque ${p.comptes.manqueTotal} = somme des raisons ${somme}`)

  // MS-3 : comptes seuls.
  const propre = rapportPropre(p.rapport)
  critere('MS-3', propre.ok, `rapport : ${propre.domaines} domaine(s), ${propre.numeros} numéro(s) de 9 ou 14 chiffres, ${propre.arobases} « @ »`)

  // MS-4 (durci le 28/09, contre-vérification 026-165 — bloquant D1) : la page « eligible » TENTE toujours un POST au
  // chargement (comme un vrai site) — une tentative bloquée avant de partir (route.abort, jamais reçue par le témoin) est
  // attendue et NE rougit PAS ; seule une tentative qui SORT (envoyee vrai dans le journal du navigateur, ou reçue par le
  // serveur d'essai, ou confirmée par requestfinished) est une violation. L'ancienne formule comptait toute tentative,
  // bloquée ou non, comme une faute : elle ne distinguait jamais « la garde a marché » de « la garde a été retirée ».
  const tentatives = p.ctx.journal.filter((e) => e.phase === 'navigateur' && e.methode !== 'GET' && e.methode !== 'HEAD').length
  const sorties = p.ctx.journal.filter((e) => e.phase === 'navigateur' && e.methode !== 'GET' && e.methode !== 'HEAD' && e.envoyee).length
  const recusNonGet = p.journalServeur.filter((e) => e.methode !== 'GET' && e.methode !== 'HEAD').length
  const interdits = (source.match(new RegExp(PAS_ENVOYE.source, 'g')) || []).length
  const docs = p.ctx.journal.filter((e) => e.phase === 'navigateur' && e.envoyee && e.type === 'document').length
  critere('MS-4', tentatives >= 1 && !sorties && !recusNonGet && !interdits && !p.ctx.nonGetSortis && docs >= 2,
    `navigateur : ${tentatives} tentative(s) non-GET (la page « eligible » en tente une à chaque passe), ${sorties} sortie(s) du navigateur, ${p.ctx.nonGetSortis} confirmée(s) par requestfinished ; reçues par le témoin : ${recusNonGet} ; appels interdits dans le source : ${interdits} ; pages ouvertes : ${docs}`)

  // MS-5 : au moins 1 000 ms entre deux requêtes au même hôte, dans le journal et à l'arrivée ; UA_RECENSEUR partout ; aucun cookie.
  const plusPetit = (entrees) => {
    const parHote = new Map()
    for (const e of entrees) { if (!parHote.has(e.hote)) parHote.set(e.hote, []); parHote.get(e.hote).push(e.t) }
    let min = Infinity
    for (const ts of parHote.values()) { ts.sort((a, b) => a - b); for (let i = 1; i < ts.length; i++) min = Math.min(min, ts[i] - ts[i - 1]) }
    return min
  }
  const journalMin = plusPetit(p.ctx.journal.filter((e) => e.envoyee && ['lecture', 'navigateur', 'firecrawl'].includes(e.phase)))
  const serveurMin = plusPetit(p.journalServeur)
  const lecture = p.ctx.journal.filter((e) => e.phase === 'lecture')
  const sansUa = lecture.filter((e) => e.ua !== m.UA_RECENSEUR).length + p.journalServeur.filter((e) => e.ua !== m.UA_RECENSEUR).length
  const cookies = p.journalServeur.filter((e) => e.cookie).length
  critere('MS-5', journalMin >= ECART_MIN_MS && serveurMin >= ECART_MIN_MS && !sansUa && !cookies && lecture.length >= 15 && p.journalServeur.length >= 15,
    `plus petit écart : ${journalMin} ms au journal, ${serveurMin} ms à l'arrivée ; ${lecture.length} lectures, ${p.journalServeur.length} requêtes reçues ; sans UA_RECENSEUR : ${sansUa} ; avec cookie : ${cookies}`)

  // MS-6 : le rapport porte presti-usine ; le poste relance sur l'usine et rend son code ; injoignable → 2 ; Chromium gardé.
  const messages = []
  const appels = []
  const envPoste = (code, erreurs) => ({ hote: 'poste-essai', ecrire: (t) => messages.push(t), sortie: () => {}, lancer: async (args) => { appels.push(args); return { code, erreurs } } })
  const injoignable = await principal(['--autotest'], envPoste(125, `✗ usine executer : usine injoignable (usine@192.0.2.1) ou session coupée`))
  const rendu = await principal(['--n=5'], envPoste(3, ''))
  let pw = 0
  let garde = false
  try { await ouvrirDansChromium({ hote: 'poste-essai', playwright: async () => { pw++; throw new Error('jamais') } }, []) } catch (e) { garde = /refusé/.test(e.message) }
  const relance = appels[0] || []
  const relanceOk = relance[0] === 'executer' && relance.includes('scripts/agents/mesure-a-sec.mjs') && relance.at(-1) === '--autotest'
  critere('MS-6', p.rapport.includes(`- hôte : ${HOTE_USINE}\n`) && env.hote === HOTE_USINE && injoignable === 2 && messages.some((t) => /usine injoignable/.test(t)) && rendu === 3 && relanceOk && garde && pw === 0,
    `rapport sur ${env.hote} ; poste simulé : relance par usine.mjs executer ${relanceOk ? 'conforme' : 'NON conforme'}, injoignable → ${injoignable}, code rendu tel quel → ${rendu} ; Chromium hors usine : ${garde && pw === 0 ? 'refusé sans lancement' : 'NON gardé'}`)

  // MS-8 : jamais la requête libre ; le piège refusé par l'adaptateur avant tout appel, compté comme refus ; la doublure marche.
  const piege = site('piege')
  const appelsPiege = p.doublure.appels.filter((a) => (a.url || '').includes(hoteEssai('piege'))).length
  const chercheDansSource = new RegExp(OP_LIBRE, 'i').test(source)
  const operations = p.doublure.appels.filter((a) => a.operation !== 'scrape').length
  const scrapes = p.doublure.appels.filter((a) => a.operation === 'scrape').length
  critere('MS-8', !chercheDansSource && !operations && !appelsPiege && piege?.adaptateur?.refus === 'donnee_personnelle' && piege?.final?.raison === 'url_donnee_personnelle'
    && p.comptes.adaptateur.refus.donnee_personnelle === 1 && p.rapport.includes('(donnee_personnelle 1)') && scrapes >= 2,
    `source : ${chercheDansSource ? 'contient' : 'ne contient pas'} « ${OP_LIBRE} » ; appels hors lecture : ${operations} ; appels pour le piège : ${appelsPiege} ; refus du piège : ${piege?.adaptateur?.refus || 'aucun'} ; lectures de la doublure (témoin) : ${scrapes}`)

  // FC (correction du 27/09) : quota épuisé et robots refusés sans appel ; repli explicite ; source conservée.
  const f = p.fc
  critere('FC', f.url && f.appelsPendant === 0 && f.quota?.methode === 'lecteur-026-020' && f.quota?.raison_repli === 'quota_epuise' && f.quota?.url_finale === f.url
    && f.robots?.refus === 'robots' && f.sansCle?.methode === 'lecteur-026-020' && f.sansCle?.raison_repli === 'cle_absente',
    `quota épuisé → ${f.quota?.methode || f.quota?.refus} (${f.quota?.raison_repli || '-'}), source ${f.quota?.url_finale === f.url ? 'conservée' : 'perdue'} ; robots refusés → ${f.robots?.refus || f.robots?.methode} ; sans clé → ${f.sansCle?.methode} (${f.sansCle?.raison_repli || '-'}) ; appels Firecrawl pendant ces trois essais : ${f.appelsPendant}`)
  return c
}

async function autotest(o, env) {
  const source = fs.readFileSync(SOURCE, 'utf8')
  const dossierTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'mesure-a-sec-essai-'))
  fs.chmodSync(dossierTemp, 0o700)
  let rouge = false
  try {
    env.sortie(`== 026-165 · mesure à sec · autotest sur ${env.hote} (${os.platform()} ${os.release()}, Node ${process.version}) ==`)
    const temoin = await passeEssai(env, null, dossierTemp)
    env.sortie('\n--- rapport du témoin (pages d’essai) ---\n')
    env.sortie(temoin.rapport)
    const criteres = await juger(temoin, env, source)
    env.sortie('--- critères, témoin ---')
    for (const k of criteres) env.sortie(`  ${k.ok ? '✓' : '✗'} ${k.id} : ${k.detail}`)
    if (criteres.some((k) => !k.ok)) rouge = true
    // NC : l'API Recherche d'entreprises en panne (503 à chaque appel) : la mesure s'arrête sans verdict ni rapport.
    let nc
    try { await passeEssai(env, 'sirene', dossierTemp); nc = { ok: false, detail: 'un rapport a été rendu malgré la panne' } }
    catch (e) { nc = e instanceof NonConclusive ? { ok: true, detail: `arrêt sans verdict : ${e.message}` } : { ok: false, detail: `autre erreur : ${String(e?.message || e).slice(0, 160)}` } }
    env.sortie(`  ${nc.ok ? '✓' : '✗'} NC : ${nc.detail}`)
    if (!nc.ok) rouge = true
    if (o.preuveEchecs) {
      env.sortie('\n--- preuve des échecs : chaque faute plantée doit rougir son critère ---')
      const fautes = [
        { faute: 'post', critere: 'MS-4', libelle: 'la garde anti-POST retirée (ctx.gardeLevee) : le POST tenté par le témoin sort jusqu’au site' },
        { faute: 'rythme', critere: 'MS-5', libelle: 'deux requêtes au même hôte à 200 ms d’écart' },
        { faute: 'domaine', critere: 'MS-3', libelle: 'un domaine d’essai glissé dans le rapport' },
        { faute: 'libre', critere: 'MS-8', libelle: `un appel « ${OP_LIBRE} » planté` },
      ]
      let attrapees = 0
      for (const f of fautes) {
        let ligne
        try {
          const p = await passeEssai(env, f.faute, dossierTemp)
          const src = f.faute === 'libre' ? `${source}\nawait lireAvecFirecrawl({ operation: '${OP_LIBRE}', requete: 'plombier' }, deps) // faute plantée\n` : source
          const tous = await juger(p, env, src)
          const k = tous.find((x) => x.id === f.critere)
          const autres = tous.filter((x) => !x.ok && x.id !== f.critere).map((x) => x.id)
          if (!k.ok) attrapees++
          ligne = `  ${k.ok ? '✗ NON attrapée' : '✓ attrapée'} : ${f.libelle} → ${f.critere} ${k.ok ? 'resté vert' : 'rouge'} (${k.detail})${autres.length ? ` ; rougis aussi : ${autres.join(', ')}` : ''}`
        } catch (e) {
          ligne = `  ✗ NON attrapée : ${f.libelle} → la passe a planté (${String(e?.message || e).slice(0, 160)})`
        }
        env.sortie(ligne)
      }
      if (attrapees !== fautes.length) rouge = true
      env.sortie(`  fautes attrapées : ${attrapees} sur ${fautes.length}`)
    }
    env.sortie(`\nVerdict ${rouge ? 'ROUGE' : 'VERT'} : autotest${o.preuveEchecs ? ' et preuve des échecs' : ''} sur ${env.hote}`)
    return rouge ? 1 : 0
  } finally {
    fs.rmSync(dossierTemp, { recursive: true, force: true })
  }
}

// ── --poser : l'événement mesure_a_sec (et la carte sur un FAIL), depuis le poste ───────────────────────────────────────
export function lireRapport(texte) {
  const t = String(texte)
  const date = t.match(/^# Mesure à sec — (\d{4}-\d{2}-\d{2})$/m)?.[1]
  const hote = t.match(/^- hôte : (\S+)$/m)?.[1]
  const nature = t.match(/^- nature : (.+)$/m)?.[1]
  const verdict = t.match(/^- verdict : (PASS|FAIL) /m)?.[1]
  const part = t.match(/^- part éligible : (\d+,\d) % \((\d+(?:,\d+)?) sur (\d+) sites lus\)$/m)
  const tires = Number(t.match(/^- sites tirés : (\d+) /m)?.[1])
  if (!date || !verdict || !part || !Number.isInteger(tires)) return { ok: false, raison: 'rapport incomplet (date, verdict, part ou tirage absents)' }
  if (hote !== HOTE_USINE) return { ok: false, raison: `le rapport ne porte pas le nom d'hôte ${HOTE_USINE}` }
  if (nature !== 'mesure réelle') return { ok: false, raison: 'ce n’est pas le rapport d’une mesure réelle' }
  const eligibles = Number(part[2].replace(',', '.'))
  const lus = Number(part[3])
  const valeur = lus ? eligibles / lus : 0
  if (pct(valeur) !== `${part[1]} %`) return { ok: false, raison: 'la part écrite ne suit pas les comptes' }
  return { ok: true, date, verdict, eligibles, lus, part: valeur, tires, texte: `${part[1]} %` }
}
async function poser(o, env) {
  const { SEUIL_ELIGIBLES, OPTIONS_DECISIONS, DEFAUTS_DECISIONS } = await import('@/lib/agents/acquisition/contrat')
  let texte
  try { texte = fs.readFileSync(path.resolve(o.rapport), 'utf8') } catch { env.ecrire('✗ rapport illisible'); return 2 }
  if (!rapportPropre(texte).ok) { env.ecrire('✗ rapport refusé : il porte un domaine, un numéro ou un « @ » (MS-3)'); return 2 }
  const lu = lireRapport(texte)
  if (!lu.ok) { env.ecrire(`✗ rapport refusé : ${lu.raison}`); return 2 }
  if ((lu.part >= SEUIL_ELIGIBLES) !== (lu.verdict === 'PASS')) { env.ecrire(`✗ rapport refusé : le verdict ${lu.verdict} ne suit pas le seuil (${lu.texte} pour ${pct(SEUIL_ELIGIBLES)})`); return 2 }
  const fichierEnv = path.join(RACINE, '.env.local')
  for (const l of fs.existsSync(fichierEnv) ? fs.readFileSync(fichierEnv, 'utf8').split(/\r?\n/) : []) {
    const x = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (x && !process.env[x[1]]) process.env[x[1]] = x[2].trim().replace(/^["']|["']$/g, '')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) { env.ecrire('✗ clé de service absente de .env.local'); return 2 }
  const { createClient } = await import('@supabase/supabase-js')
  const base = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
  const objet = `mesure:${lu.date}`
  const resume = `${lu.verdict} ${lu.texte} éligibles (n = ${lu.tires})`
  // Rejoué le même jour : rien de plus. Le journal se lit par pages de 200 (ops_evenements_lire, 0097).
  let apres = 0
  let existant = null
  for (let page = 0; page < 2000 && !existant; page++) {
    const { data, error } = await base.rpc('ops_evenements_lire', { p_agent: '-', p_apres: apres, p_limite: 200 })
    if (error) { env.ecrire(`✗ lecture du journal : ${error.message}`); return 1 }
    existant = (data || []).find((e) => e.agent === 'systeme' && e.type === 'mesure_a_sec' && e.objet === objet) || null
    if (!data?.length || data.length < 200) break
    apres = data.at(-1).id
  }
  if (existant) env.sortie(`· événement mesure_a_sec déjà posé pour ${lu.date} (n° ${existant.id}) : ${existant.resume}`)
  else {
    const { data, error } = await base.rpc('ops_evenement_ajouter', { p_agent: 'systeme', p_type: 'mesure_a_sec', p_objet: objet, p_resume: resume, p_tache: null })
    if (error) { env.ecrire(`✗ événement non posé : ${error.message}`); return 1 }
    env.sortie(`✓ événement mesure_a_sec posé (n° ${data}) : ${resume}`)
  }
  if (lu.verdict === 'FAIL') {
    const { data, error } = await base.rpc('acq_decision_creer', { p: {
      agent: 'systeme', type: 'mesure_a_sec', resume: `Mesure à sec : ${resume} — changer de canal ou de segment`,
      options: OPTIONS_DECISIONS.mesure_a_sec, defaut: DEFAUTS_DECISIONS.mesure_a_sec, cle_idempotence: `acq:mesure_a_sec:${lu.date}`,
    } })
    if (error || !data?.ok) { env.ecrire(`✗ carte non créée : ${error?.message || data?.raison}`); return 1 }
    env.sortie(data.cree ? `✓ carte « changer de canal ou de segment » ouverte (${data.id})` : `· carte déjà ouverte (${data.id}) : rien de plus`)
  }
  return 0
}

// ── Lancement ────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const env = { hote: os.hostname(), lancer: lancerExecuter, ecrire: (t) => console.error(t), sortie: (t) => console.log(t) }
  principal(process.argv.slice(2), env).then(
    (code) => { process.exitCode = code },
    (e) => {
      // Hors autotest, un message d'erreur peut porter une adresse de site : il n'est jamais affiché.
      const essai = process.argv.includes('--autotest') || process.argv.includes('--preuve-echecs')
      console.error(`✗ mesure-a-sec : ${essai ? String(e?.stack || e).slice(0, 600) : `erreur ${e?.name || 'inconnue'} (détail non affiché : il peut porter une adresse)`}`)
      process.exitCode = 1
    },
  )
}
