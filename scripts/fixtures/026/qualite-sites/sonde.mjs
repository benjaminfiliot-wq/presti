// Sonde du juge qualite-sites-qa (026-246) : importe le module jugé dans CE processus — dont le réseau direct est piégé —, lui
// donne des doublures réelles (navigateur et récupérateur qui parlent en HTTP au serveur factice, vrai lecteur prudent de
// lib/agents/acquisition/lecteurSite.ts, horloge factice, magasin, moteur), joue les scénarios de CONTRAT.md et imprime UNE
// ligne JSON { resultats: { 'QSI-n': { ok, detail } } } (ou { import_echec } si le module ne s'importe pas).
// Usage : node --import ./scripts/ts-loader.mjs sonde.mjs <chemin du module>   (cwd = racine du dépôt). Contrat : CONTRAT.md.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import zlib from 'node:zlib'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { syncBuiltinESMExports } from 'node:module'
import { demarrerServeur, BUDGET_POIDS_OCTETS } from './serveur-factice.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '../../../..')
const COMMANDES = JSON.parse(fs.readFileSync(path.join(ICI, 'sites-livres.json'), 'utf8')).commandes
const IDS = ['QSI-1', 'QSI-2', 'QSI-3', 'QSI-4', 'QSI-5', 'QSI-6', 'QSI-7', 'QSI-8', 'QSI-9']
const T0 = Date.UTC(2026, 9, 4, 9, 0, 0) // 4 octobre 2026, 09:00 UTC : l'horloge factice du banc
const HOTE = 'martin-plomberie.test'
const MOTEUR_CODEX = { qualite_sites: { moteur: 'codex', modele: 'gpt-6-luna', personnelles: true } }

// ── les originaux, gardés AVANT les pièges : seules les doublures du banc s'en servent ────────────────────────────────────
const httpRequest = http.request
const appels = [] // tout appel réseau direct tenté par le module (ou par ce qu'il importe) : refusé et consigné
const lireAppel = (args) => {
  const [a, b] = args
  const o = typeof a === 'string' || a instanceof URL ? (b && typeof b === 'object' ? b : {}) : (a ?? {})
  const url = typeof a === 'string' ? a : a instanceof URL ? a.href : a?.url ? String(a.url) : `${o.protocol ?? 'http:'}//${o.hostname ?? o.host ?? ''}${o.path ?? ''}`
  return { methode: String(o.method ?? 'GET').toUpperCase(), url }
}
const piege = (nom) => (...args) => { appels.push({ via: nom, ...lireAppel(args) }); throw new Error(`réseau direct interdit (${nom}) : le module passe par deps.navigateur et deps.lecteurPrudent`) }
globalThis.fetch = async (...args) => piege('fetch')(...args)
http.request = piege('http.request'); http.get = piege('http.get'); https.request = piege('https.request'); https.get = piege('https.get')
syncBuiltinESMExports()

// ── les doublures ────────────────────────────────────────────────────────────────────────────────────────────────────────
const creerHorloge = (t0) => { const h = { t: t0, maintenant: () => h.t, attendre: async (ms) => { h.t += ms } }; return h }
const texteVisible = (html) => String(html ?? '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const hexRgb = (h) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`

function requeteLoopback(port, { methode = 'GET', url, via, corps, entetes = {}, delaiMs = 1500 }) {
  return new Promise((ok, ko) => {
    const u = new URL(url)
    const req = httpRequest({
      host: '127.0.0.1', port, method: methode, path: u.pathname + u.search, agent: false,
      headers: { 'accept-encoding': 'gzip', ...entetes, host: u.hostname, 'x-factice-schema': u.protocol.replace(':', ''), 'x-factice-via': via, ...(corps ? { 'content-length': String(Buffer.byteLength(corps)) } : {}) },
    }, (res) => {
      const morceaux = []
      res.on('data', (c) => morceaux.push(c))
      res.on('error', ko)
      res.on('end', () => { try { let brut = Buffer.concat(morceaux); if (res.headers['content-encoding'] === 'gzip') brut = zlib.gunzipSync(brut); ok({ statut: res.statusCode, entetes: res.headers, corps: brut }) } catch (e) { ko(e) } })
    })
    req.setTimeout(delaiMs, () => req.destroy(Object.assign(new Error('délai dépassé'), { code: 'ETIMEDOUT' })))
    req.on('error', ko)
    if (corps) req.write(corps)
    req.end()
  })
}

function elementsTexte(html) {
  const fondPage = /<body\b[^>]*style="[^"]*background:\s*(#[0-9a-f]{6})/i.exec(html)?.[1] ?? '#ffffff'
  const sortie = []
  for (const m of html.matchAll(/<(h1|p|footer|span)\b([^>]*?)\sstyle="([^"]*)"([^>]*)>([^<]+)</gi)) {
    const style = m[3], couleur = /(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i.exec(style)?.[1]
    if (!couleur) continue
    const fond = /background:\s*(#[0-9a-f]{6})/i.exec(style)?.[1] ?? fondPage
    const id = /\bid="([^"]+)"/.exec(`${m[2]} ${m[4]}`)?.[1]
    sortie.push({ selecteur: id ? `#${id}` : m[1].toLowerCase(), texte: m[5].trim(), couleur: hexRgb(couleur), fond: hexRgb(fond), taille_px: Number(/font-size:\s*([\d.]+)px/i.exec(style)?.[1] ?? 16), gras: /font-weight:\s*(bold|[6-9]00)/i.test(style) })
  }
  return sortie
}
const imagesDe = (html) => [...html.matchAll(/<img\b([^>]*)>/gi)].map((m) => ({ src: /\bsrc="([^"]*)"/.exec(m[1])?.[1] ?? null, alt: /\balt="([^"]*)"/.exec(m[1])?.[1] ?? null }))
const liensDe = (html, base) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([^<]*)<\/a>/gi)].flatMap((m) => { try { return [{ href: new URL(m[1], base).href, texte: m[2].trim() }] } catch { return [] } })
const formulairesDe = (html) => [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)].map((m) => ({
  action: /\baction="([^"]*)"/.exec(m[1])?.[1] ?? null, methode: /\bmethod="([^"]*)"/.exec(m[1])?.[1] ?? null,
  champs: [...m[2].matchAll(/<(input|textarea)\b([^>]*)>/gi)].map((c) => ({ nom: /\bname="([^"]*)"/.exec(c[2])?.[1] ?? null, type: c[1].toLowerCase() === 'textarea' ? 'textarea' : (/\btype="([^"]*)"/.exec(c[2])?.[1] ?? 'text') })),
}))

/** Le « navigateur » : la forme d'observation que doit rendre l'adaptateur Playwright de l'usine (CONTRAT.md). Il HONORE la
 *  méthode demandée : une écriture tentée atteint le serveur, qui la consigne — c'est ce qui la rend détectable. */
const navigateurDouble = (port) => ({
  async ouvrir(url, options = {}) {
    let courante = url
    for (let i = 0; i < 6; i++) {
      let r
      try { r = await requeteLoopback(port, { methode: options.method ?? 'GET', url: courante, via: 'navigateur', corps: options.corps }) }
      catch (e) { return { url_demandee: url, url_finale: courante, statut: null, erreur: String(e.code ?? e.message), protocole: new URL(courante).protocol.replace(':', ''), certificat: null, entetes: {}, octets: Buffer.alloc(0), html: '', texte: '', elements_texte: [], images: [], liens: [], formulaires: [], capture: null } }
      if (r.statut >= 300 && r.statut < 400 && r.entetes.location) { courante = new URL(r.entetes.location, courante).href; continue }
      const html = r.corps.toString('utf8'), protocole = new URL(courante).protocol.replace(':', ''), expire = r.entetes['x-factice-certificat'] === 'expire'
      return {
        url_demandee: url, url_finale: courante, statut: r.statut, protocole, certificat: protocole === 'https' ? { valide: !expire, raison: expire ? 'expire' : null } : null,
        entetes: { ...r.entetes }, octets: r.corps, html, texte: texteVisible(html),
        elements_texte: elementsTexte(html), images: imagesDe(html), liens: liensDe(html, courante), formulaires: formulairesDe(html), capture: Buffer.from('PNG-FACTICE'),
      }
    }
    throw new Error('trop de redirections (doublure navigateur)')
  },
})

/** Le récupérateur de lecteurSite.ts (type Recuperateur : ne suit JAMAIS une redirection, coupure = exception). */
const recuperateurDouble = (port) => async (url, options) => {
  const r = await requeteLoopback(port, { url, via: 'recuperer', entetes: options?.entetes ?? {}, delaiMs: Math.min(options?.delaiMs ?? 8000, 400) })
  return { statut: r.statut, entetes: r.entetes, corps: r.corps.toString('utf8'), url_finale: url, tronque: false }
}

const pannesDe = (corps) => Object.values(corps?.verdicts ?? {}).filter(Boolean).flatMap((v) => v.pannes ?? [])
const codes = (corps) => pannesDe(corps).map((p) => p.panne).sort()

/** Le magasin du bus : travail (la route GET), rapport (la route POST, qui crée UNE décision par clé d'idempotence — comme
 *  acq_decision_creer), battement. Toute autre méthode appelée par le module est consignée HORS-CONTRAT. */
function creerMagasin({ sites, pause = false, travailEnErreur = false }) {
  const rapports = [], journalMagasin = [], decisions = new Map()
  const base = {
    async travail() { journalMagasin.push('travail'); if (travailEnErreur) throw new Error('travail indisponible'); return pause ? { pause: true, sites: [] } : { sites: structuredClone(sites) } },
    async rapport(corps) {
      journalMagasin.push('rapport'); rapports.push(structuredClone(corps)); let creees = 0
      for (const p of pannesDe(corps)) if (!decisions.has(p.cle_idempotence)) { decisions.set(p.cle_idempotence, { type: 'qualite_site', commande_id: corps.commande_id, panne: p.panne, mesure: p.mesure, cle_idempotence: p.cle_idempotence }); creees++ }
      return { decisions_creees: creees }
    },
    async battement(nom) { journalMagasin.push(`battement:${nom}`) },
  }
  const magasin = new Proxy(base, { get(cible, nom) { if (typeof nom === 'string' && nom !== 'then' && !(nom in cible)) journalMagasin.push(`HORS-CONTRAT:${nom}`); return cible[nom] } })
  return { magasin, rapports, journalMagasin, decisions }
}

// ── le module jugé ──────────────────────────────────────────────────────────────────────────────────────────────────────
const resultats = {}
const touche = (id) => { resultats[id] ??= { ok: true, details: [] } }
const echec = (id, detail) => { touche(id); resultats[id].ok = false; resultats[id].details.push(detail) }
const check = (cond, message) => { if (!cond) throw new Error(message) }
const juger = (id, fn) => { touche(id); try { fn() } catch (e) { echec(id, e.message) } }

let M
try { M = await import(pathToFileURL(process.argv[2]).href) } catch (e) { console.log(JSON.stringify({ import_echec: String(e.message).slice(0, 300) })); process.exitCode = 0 }
let recupererPoli = null
if (M) {
  try { ({ recupererPoli } = await import(pathToFileURL(path.join(R, 'lib/agents/acquisition/lecteurSite.ts')).href)) }
  catch (e) { echec('QSI-5', `lib/agents/acquisition/lecteurSite.ts (026-020) ne s'importe pas : ${String(e.message).slice(0, 160)}`) }
}

const martin = COMMANDES.find((c) => c.commande_id === 'cmd-martin')
const std = (pannes = [], extra = {}) => ({ ...structuredClone(martin), serveur: { pannes }, ...extra })

async function monter({ commandes, MOTEUR_DE = MOTEUR_CODEX, avecMoteur = true, pause = false, travailEnErreur = false }) {
  const horloge = creerHorloge(T0)
  const serveur = await demarrerServeur({ horloge, sites: commandes.filter((c) => c.domaine).map((c) => ({ hote: c.domaine, pannes: c.serveur?.pannes ?? [], identite: c.mentions_attendues })) })
  const mag = creerMagasin({ sites: commandes.map(({ serveur: _s, ...c }) => c), pause, travailEnErreur })
  const moteurAppels = []
  const etats = new Map()
  const lecteurPrudent = (url) => { const h = new URL(url).hostname; if (!etats.has(h)) etats.set(h, { recuperer: recuperateurDouble(serveur.port), horloge }); return recupererPoli(url, etats.get(h)) }
  const deps = {
    magasin: mag.magasin, navigateur: navigateurDouble(serveur.port), lecteurPrudent, horloge,
    ...(MOTEUR_DE ? { MOTEUR_DE } : {}),
    ...(avecMoteur ? { moteur: async (capture, cfg) => { moteurAppels.push({ capture, cfg: structuredClone(cfg) }); return 'ok' } } : {}),
  }
  return { horloge, serveur, mag, moteurAppels, passe: () => M.passeQualite(deps), fermer: () => serveur.arreter() }
}

/** Observations de TOUT scénario, jugées une fois, côté serveur : écritures reçues, voies de requête, débit du lecteur prudent. */
function collecter(nom, env) {
  const j = env.serveur.journal
  for (const e of j) {
    if (e.methode !== 'GET' && e.methode !== 'HEAD') {
      echec('QSI-1', `${nom} : ${e.methode} ${e.hote}${e.chemin} est arrivé au site audité`)
      if (e.chemin === '/api/contact') echec('QSI-7', `${nom} : ${e.methode} sur le point d'entrée du formulaire`)
    }
    if (e.via === 'inconnu') echec('QSI-5', `${nom} : requête hors des doublures (${e.methode} ${e.hote}${e.chemin})`)
    if (e.via === 'navigateur' && e.chemin !== '/' && e.chemin !== '/api/contact' && (e.methode === 'GET' || e.methode === 'HEAD')) echec('QSI-5', `${nom} : ${e.chemin} ouvert par le navigateur au lieu du lecteur prudent`)
  }
  if (env.serveur.soumissions.length) echec('QSI-7', `${nom} : ${env.serveur.soumissions.length} soumission(s) reçue(s) sur /api/contact`)
  const parHote = new Map()
  for (const e of j.filter((x) => x.via === 'recuperer')) { if (!parHote.has(e.hote)) parHote.set(e.hote, []); parHote.get(e.hote).push(e) }
  for (const [hote, liste] of parHote) for (let i = 1; i < liste.length; i++) {
    const ecart = liste[i].t - liste[i - 1].t
    if (ecart < 1000) { echec('QSI-5', `${nom} : ${liste[i - 1].chemin} puis ${liste[i].chemin} sur ${hote} à ${ecart} ms d'écart (1 requête par seconde exigée)`); break }
  }
  for (const a of appels.splice(0)) {
    if (a.methode !== 'GET' && a.methode !== 'HEAD') { echec('QSI-1', `${nom} : ${a.methode} ${a.url} tenté en réseau direct (${a.via})`); if (/\/api\/contact/.test(a.url)) echec('QSI-7', `${nom} : soumission tentée en réseau direct (${a.methode} ${a.url})`) }
    else echec('QSI-5', `${nom} : ${a.methode} ${a.url} en réseau direct (${a.via}), hors deps.navigateur et deps.lecteurPrudent`)
  }
}

async function scenario(ids, nom, config, fn) {
  let env
  try { env = await monter(config); await fn(env, juger) }
  catch (e) { for (const id of ids) echec(id, `${nom} : ${e.message}`) }
  finally { if (env) { collecter(nom, env); await env.fermer() } }
}
const unRapport = (e) => { check(e.mag.rapports.length === 1, `un rapport attendu, ${e.mag.rapports.length} reçu(s)`); return e.mag.rapports[0] }
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ── le ratio de contraste WCAG : l'implémentation du JUGE, écrite à part de celle du module ────────────────────────────────
const canal = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
const lum = (h) => 0.2126 * canal(parseInt(h.slice(1, 3), 16)) + 0.7152 * canal(parseInt(h.slice(3, 5), 16)) + 0.0722 * canal(parseInt(h.slice(5, 7), 16))
const ratioJuge = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

if (M) {
  // QSI-1 — l'import ne fait rien.
  juger('QSI-1', () => {
    check(appels.length === 0, `effet de bord à l'import : ${appels.map((a) => `${a.methode} ${a.url}`).join(', ')}`)
    appels.length = 0
  })
  if (typeof M.passeQualite !== 'function') { echec('QSI-2', 'export passeQualite(deps) absent — contrat de banc : scripts/fixtures/026/qualite-sites/CONTRAT.md') }
  else if (recupererPoli) {
    // ── le site sain : tous les critères de mesure, sans aucune panne ───────────────────────────────────────────────────
    await scenario(['QSI-2', 'QSI-3', 'QSI-4', 'QSI-5', 'QSI-6', 'QSI-7', 'QSI-8', 'QSI-9'], 'site sain', { commandes: [std()] }, async (e, j) => {
      const r = await e.passe(), rap = unRapport(e), v = rap.verdicts
      j('QSI-2', () => {
        check(r?.audits?.length === 1 && r.audits[0].statut === 'audite', `statut d'audit attendu « audite » : ${JSON.stringify(r?.audits)}`)
        check(v.disponibilite?.statut === 200 && v.disponibilite.protocole === 'https' && v.disponibilite.certificat_valide === true, `disponibilité d'un site sain : ${JSON.stringify(v.disponibilite)}`)
        check(rap.sain === true && codes(rap).length === 0, `un site sain rend sain:true sans panne (reçu : ${codes(rap)})`)
      })
      j('QSI-3', () => check(v.poids?.octets === e.serveur.tailles[HOTE] && v.poids.budget_octets === BUDGET_POIDS_OCTETS, `poids : ${JSON.stringify(v.poids)} pour ${e.serveur.tailles[HOTE]} octets servis, budget ${BUDGET_POIDS_OCTETS}`))
      j('QSI-4', () => check(v.accessibilite?.images_total === 1 && v.accessibilite.images_sans_alt === 0 && v.accessibilite.controles >= 3 && v.accessibilite.insuffisants.length === 0, `accessibilité d'une page saine : ${JSON.stringify(v.accessibilite)}`))
      j('QSI-5', () => {
        const demandes = e.serveur.journal.filter((x) => x.via === 'recuperer' && x.hote === HOTE).map((x) => x.chemin)
        for (const c of ['/services', '/realisations', '/mentions-legales']) check(demandes.includes(c), `lien interne ${c} jamais vérifié (par le lecteur prudent : ${demandes.join(' ')})`)
        for (const c of new Set(demandes)) check(demandes.filter((x) => x === c).length <= 2, `${c} demandé ${demandes.filter((x) => x === c).length} fois`)
        check(v.liens?.verifies >= 3 && v.liens.liens_morts.length === 0, `liens d'un site sain : ${JSON.stringify(v.liens)}`)
      })
      j('QSI-6', () => check(egal([...(v.mentions?.presentes ?? [])].sort(), ['adresse', 'forme_juridique', 'nom_artisan', 'siren']) && v.mentions.absentes.length === 0, `mentions d'un site sain : ${JSON.stringify(v.mentions)}`))
      j('QSI-7', () => {
        const f = v.formulaire
        check(f?.present === true && f.action === `https://${HOTE}/api/contact` && f.methode === 'POST' && f.champs.includes('message') && f.point_entree_statut === 405, `formulaire d'un site sain : ${JSON.stringify(f)}`)
        check(e.serveur.soumissions.length === 0, 'soumission reçue')
      })
      j('QSI-8', () => {
        check(v.visuel?.verdict === 'ok' && v.visuel.moteur === 'codex', `verdict visuel : ${JSON.stringify(v.visuel)}`)
        check(e.moteurAppels.length === 1 && Buffer.isBuffer(e.moteurAppels[0].capture) && e.moteurAppels[0].capture.length > 0 && egal(e.moteurAppels[0].cfg, { moteur: 'codex', modele: 'gpt-6-luna', personnelles: true }), `appel du moteur : ${JSON.stringify(e.moteurAppels.map((a) => a.cfg))}`)
      })
      j('QSI-9', () => {
        check(rap.periode === '2026-10' && rap.commande_id === 'cmd-martin' && e.mag.decisions.size === 0, `rapport sain : periode ${rap.periode}, ${e.mag.decisions.size} décision(s) créée(s)`)
        check(egal(e.mag.journalMagasin, ['travail', 'rapport', 'battement:qualite_sites']), `appels du magasin : ${e.mag.journalMagasin.join(' > ')}`)
      })
    })

    // ── QSI-2 : disponibilité, protocole, certificat — ce que le serveur a RÉELLEMENT rendu ──────────────────────────────
    for (const [nom, pannes, schema, a] of [
      ['page en erreur 500', ['http_500'], 'https', { statut: 500, codes: ['indisponible'] }],
      ['certificat expiré', ['certificat_expire'], 'https', { statut: 200, protocole: 'https', certificat: false, codes: ['certificat_invalide'] }],
      ['HTTP sans redirection', ['http_simple'], 'http', { statut: 200, protocole: 'http', codes: ['http_non_securise'] }],
      ['HTTP redirigé vers HTTPS (le protocole rendu fait foi, pas l’URL enregistrée)', ['http_vers_https'], 'http', { statut: 200, protocole: 'https', certificat: true, codes: [] }],
      ['site injoignable', ['injoignable'], 'https', { statut: null, codes: ['indisponible'] }],
    ]) {
      await scenario(['QSI-2'], nom, { commandes: [std(pannes, { url_en_ligne: `${schema}://${HOTE}/` })] }, async (e, j) => {
        await e.passe()
        const rap = unRapport(e), d = rap.verdicts.disponibilite
        j('QSI-2', () => {
          check(d?.statut === a.statut, `code HTTP ${d?.statut}, ${a.statut} rendu par le serveur`)
          if (a.protocole) check(d.protocole === a.protocole, `protocole ${d.protocole}, ${a.protocole} réellement rendu`)
          if (a.certificat !== undefined) check(d.certificat_valide === a.certificat, `certificat_valide ${d.certificat_valide}, ${a.certificat} attendu`)
          check(egal(codes(rap), a.codes) && rap.sain === (a.codes.length === 0), `pannes ${JSON.stringify(codes(rap))}, ${JSON.stringify(a.codes)} attendues`)
        })
      })
    }
    // Les cinq commandes livrées : un site programmé au retrait n'est jamais audité ; une livraison inachevée n'est pas une panne.
    await scenario(['QSI-2'], 'cinq commandes livrées', { commandes: COMMANDES }, async (e, j) => {
      const r = await e.passe()
      j('QSI-2', () => {
        const statuts = Object.fromEntries((r?.audits ?? []).map((x) => [x.commande_id, x.statut]))
        check(egal(statuts, { 'cmd-martin': 'audite', 'cmd-dubois': 'exclu_retrait', 'cmd-leroy': 'livraison_inachevee', 'cmd-garcia': 'audite', 'cmd-petit': 'audite' }), `statuts d'audit : ${JSON.stringify(statuts)}`)
        check(egal(e.mag.rapports.map((x) => x.commande_id).sort(), ['cmd-garcia', 'cmd-martin', 'cmd-petit']), `rapports pour ${e.mag.rapports.map((x) => x.commande_id)} — ni le site programmé au retrait ni la livraison inachevée ne se rapportent`)
        const dubois = e.serveur.journal.filter((x) => x.hote === 'dubois-electricite.test')
        check(dubois.length === 0, `le site programmé au retrait a reçu ${dubois.length} requête(s) : ${dubois.map((x) => x.chemin).join(' ')}`)
        const parCommande = Object.fromEntries(e.mag.rapports.map((x) => [x.commande_id, codes(x)]))
        check(egal(parCommande, { 'cmd-martin': [], 'cmd-garcia': ['lien_mort'], 'cmd-petit': ['http_non_securise'] }), `pannes par commande : ${JSON.stringify(parCommande)}`)
      })
    })

    // ── QSI-3 : le poids est celui des octets reçus, au-delà du budget STRICT ──────────────────────────────────────────────
    for (const [nom, pannes, panne] of [['3 Mio + 1 octet', ['poids_excessif'], true], ['exactement 3 Mio', ['poids_limite'], false], ['3 Mio décodés, quelques ko compressés (Content-Length mensonger)', ['poids_gzip'], true]]) {
      await scenario(['QSI-3'], nom, { commandes: [std(pannes)] }, async (e, j) => {
        await e.passe()
        const rap = unRapport(e), p = rap.verdicts.poids, servi = e.serveur.tailles[HOTE]
        j('QSI-3', () => {
          check(p?.octets === servi, `octets mesurés ${p?.octets}, ${servi} réellement reçus`)
          check(egal(codes(rap), panne ? ['poids_excessif'] : []), `pannes ${JSON.stringify(codes(rap))} pour ${servi} octets (budget ${BUDGET_POIDS_OCTETS})`)
          if (panne) check(pannesDe(rap)[0].mesure?.octets === servi, `la mesure de la panne ne porte pas le nombre exact d'octets : ${JSON.stringify(pannesDe(rap)[0].mesure)}`)
        })
      })
    }

    // ── QSI-4 : contraste calculé (ratio WCAG), seuil AA selon la taille, alt manquant compté ────────────────────────────────
    for (const [nom, pannes, couleur, taille, ko] of [
      ['gris clair sur blanc (2,32:1)', ['contraste_faible'], '#aaaaaa', 16, true], ['4,54:1, juste au-dessus du seuil AA', ['contraste_juste_ok'], '#767676', 16, false],
      ['4,48:1, juste en dessous du seuil AA', ['contraste_juste_ko'], '#777777', 16, true], ['3,03:1 en grand texte (24 px) : suffisant', ['grand_texte_ok'], '#949494', 24, false],
      ['3,03:1 en petit texte (16 px) : insuffisant', ['petit_texte_ko'], '#949494', 16, true],
    ]) {
      await scenario(['QSI-4'], nom, { commandes: [std(pannes)] }, async (e, j) => {
        await e.passe()
        const rap = unRapport(e), a = rap.verdicts.accessibilite
        j('QSI-4', () => {
          check(egal(codes(rap), ko ? ['contraste_insuffisant'] : []), `pannes ${JSON.stringify(codes(rap))} pour ${couleur} sur #ffffff à ${taille} px`)
          if (ko) {
            const x = a.insuffisants[0], attendu = ratioJuge(couleur, '#ffffff')
            check(a.insuffisants.length === 1 && x.element === '#intro' && Math.abs(x.ratio - attendu) <= 0.011 && x.seuil === 4.5, `contraste signalé ${JSON.stringify(a.insuffisants)}, ratio WCAG réel ${attendu.toFixed(2)} sur #intro (seuil 4.5)`)
          }
        })
      })
    }
    await scenario(['QSI-4'], 'images sans alt', { commandes: [std(['sans_alt'])] }, async (e, j) => {
      await e.passe()
      const rap = unRapport(e), a = rap.verdicts.accessibilite
      j('QSI-4', () => check(a?.images_total === 3 && a.images_sans_alt === 1 && egal(codes(rap), ['alt_manquant']), `alt : ${JSON.stringify(a)}, pannes ${JSON.stringify(codes(rap))} (3 images dont 1 sans attribut alt ; alt="" est décoratif, pas manquant)`))
    })

    // ── QSI-5 : liens internes suivis jusqu'à leur vrai code, par le lecteur prudent seul ────────────────────────────────────
    for (const [nom, pannes, a] of [
      ['lien mort (404)', ['lien_mort'], { codes: ['lien_mort'], morts: [{ chemin: '/realisations', statut: 404 }] }],
      ['lien en erreur 500', ['lien_500'], { codes: ['lien_mort'], morts: [{ chemin: '/realisations', statut: 500 }] }],
      ['lien qui ne répond pas (délai dépassé)', ['lien_lent'], { codes: ['lien_mort'], morts: [{ chemin: '/realisations', statut: null, raison: 'injoignable' }] }],
      ['boucle de redirections', ['lien_boucle'], { codes: ['lien_mort'], morts: [{ chemin: '/realisations', statut: null, raison: 'boucle_redirections' }] }],
      ['redirection simple vers une page vivante', ['lien_redirige'], { codes: [], morts: [] }],
      ['lien interdit par robots.txt', ['lien_robots'], { codes: [], morts: [], nonVerifies: ['/espace-prive/doc'] }],
    ]) {
      await scenario(['QSI-5'], nom, { commandes: [std(pannes)] }, async (e, j) => {
        await e.passe()
        const rap = unRapport(e), l = rap.verdicts.liens
        j('QSI-5', () => {
          check(egal(codes(rap), a.codes), `pannes ${JSON.stringify(codes(rap))}, ${JSON.stringify(a.codes)} attendues`)
          const morts = (l?.liens_morts ?? []).map((m) => ({ chemin: new URL(m.url).pathname, url: m.url, statut: m.statut, raison: m.raison }))
          check(morts.length === a.morts.length, `${morts.length} lien(s) mort(s), ${a.morts.length} attendu(s) : ${JSON.stringify(l?.liens_morts)}`)
          a.morts.forEach((m, i) => {
            check(morts[i].url === `https://${HOTE}${m.chemin}` && morts[i].statut === m.statut, `lien mort ${JSON.stringify(l.liens_morts[i])}, attendu ${m.chemin} avec statut ${m.statut}`)
            if (m.raison) check(morts[i].raison === m.raison, `raison « ${morts[i].raison} », « ${m.raison} » attendue`)
          })
          if (a.nonVerifies) {
            check(egal((l.non_verifies ?? []).map((x) => new URL(x.url).pathname), a.nonVerifies), `liens non vérifiés ${JSON.stringify(l.non_verifies)}`)
            for (const c of a.nonVerifies) check(!e.serveur.journal.some((x) => x.chemin === c), `${c} demandé alors que robots.txt l'interdit`)
          }
        })
      })
    }

    // ── QSI-6 : les mentions attendues de la commande, lues dans le rendu ──────────────────────────────────────────────────
    for (const [nom, pannes, absentes] of [['mentions légales absentes', ['mentions_absentes'], ['adresse', 'forme_juridique', 'siren']], ['SIREN seul absent', ['mention_siren_absente'], ['siren']]]) {
      await scenario(['QSI-6'], nom, { commandes: [std(pannes)] }, async (e, j) => {
        await e.passe()
        const rap = unRapport(e), m = rap.verdicts.mentions
        j('QSI-6', () => {
          check(egal(codes(rap), ['mentions_absentes']), `pannes ${JSON.stringify(codes(rap))}, mentions_absentes attendue`)
          check(egal([...(m?.absentes ?? [])].sort(), absentes), `mentions absentes ${JSON.stringify(m?.absentes)}, ${JSON.stringify(absentes)} attendues`)
        })
      })
    }

    // ── QSI-7 : formulaire, présence et point d'entrée en GET — jamais une soumission ────────────────────────────────────────
    for (const [nom, pannes, code, a] of [
      ['aucun formulaire', ['formulaire_absent'], 'formulaire_absent', { present: false }],
      ['formulaire sans attribut action', ['formulaire_sans_action'], 'formulaire_sans_action', { present: true }],
      ['point d’entrée mort (404)', ['formulaire_point_entree_mort'], 'formulaire_injoignable', { present: true, statut: 404 }],
    ]) {
      await scenario(['QSI-7'], nom, { commandes: [std(pannes)] }, async (e, j) => {
        await e.passe()
        const rap = unRapport(e), f = rap.verdicts.formulaire
        j('QSI-7', () => {
          check(f?.present === a.present, `formulaire.present ${f?.present}`)
          check(egal(codes(rap), [code]), `pannes ${JSON.stringify(codes(rap))}, ${code} attendue`)
          if (a.statut) check(f.point_entree_statut === a.statut, `point_entree_statut ${f.point_entree_statut}, ${a.statut} rendu par le serveur`)
          check(e.serveur.soumissions.length === 0, 'soumission reçue')
        })
      })
    }

    // ── QSI-8 : l'avis visuel passe par Codex déclaré personnelles:true ; sinon non_mesure, sans appel, audit valide seul ─────────
    for (const [nom, config, appele] of [
      ['aucune entrée MOTEUR_DE', { MOTEUR_DE: null }, false],
      ['moteur gratuit (freellmapi), données personnelles non déclarées', { MOTEUR_DE: { qualite_sites: { moteur: 'freellmapi', modele: 'auto', personnelles: false } } }, false],
      ['codex mais personnelles:false', { MOTEUR_DE: { qualite_sites: { moteur: 'codex', modele: 'gpt-6-luna', personnelles: false } } }, false],
      ['modèle :cloud', { MOTEUR_DE: { qualite_sites: { moteur: 'codex', modele: 'gpt-oss:120b-cloud', personnelles: true } } }, false],
      ['aucun moteur fourni', { avecMoteur: false }, false],
      ['codex personnelles:true', {}, true],
    ]) {
      await scenario(['QSI-8'], nom, { commandes: [std()], ...config }, async (e, j) => {
        await e.passe()
        const rap = unRapport(e), v = rap.verdicts.visuel
        j('QSI-8', () => {
          check(e.moteurAppels.length === (appele ? 1 : 0), `${e.moteurAppels.length} appel(s) du moteur (${JSON.stringify(e.moteurAppels.map((a) => a.cfg))}), ${appele ? 1 : 0} attendu(s)`)
          if (!appele) check(v?.verdict === 'non_mesure', `verdict visuel « ${v?.verdict} », « non_mesure » attendu sans moteur Codex déclaré personnelles:true`)
          check(rap.sain === true && v && egal(v.pannes ?? [], []), 'l’avis visuel n’est jamais une panne ; le contrôle automatique reste valide seul')
        })
      })
    }

    // ── QSI-9 : une décision par panne, jamais deux pour la même panne dans la période, aucune action sur le site ────────────
    await scenario(['QSI-9'], 'décisions sur trois passages', { commandes: [std(['lien_mort', 'contraste_faible'])] }, async (e, j) => {
      await e.passe()
      const rap1 = e.mag.rapports[0], cles1 = pannesDe(rap1).map((p) => p.cle_idempotence).sort()
      j('QSI-9', () => {
        check(egal(codes(rap1), ['contraste_insuffisant', 'lien_mort']), `pannes du premier passage : ${JSON.stringify(codes(rap1))}`)
        check(cles1.every((c) => /^qualite_site:cmd-martin:(lien_mort|contraste_insuffisant):2026-10$/.test(c)) && e.mag.decisions.size === 2, `clés d'idempotence : ${JSON.stringify(cles1)} ; ${e.mag.decisions.size} décision(s) pour 2 pannes`)
      })
      e.horloge.t += 2 * 86_400_000
      await e.passe()
      j('QSI-9', () => check(e.mag.decisions.size === 2 && e.mag.rapports.length === 2, `deuxième passage dans le même mois : ${e.mag.decisions.size} décision(s) au total (2 attendues), ${e.mag.rapports.length} rapport(s)`))
      e.horloge.t += 35 * 86_400_000
      await e.passe()
      j('QSI-9', () => check(e.mag.decisions.size === 4, `passage du mois suivant : ${e.mag.decisions.size} décision(s) au total, 4 attendues (la panne persiste, une nouvelle décision par période)`))
      j('QSI-9', () => {
        check(e.mag.journalMagasin.filter((x) => x === 'battement:qualite_sites').length === 3, `battements : ${e.mag.journalMagasin.filter((x) => x.startsWith('battement')).length}, un par passage réussi attendu`)
        check(!e.mag.journalMagasin.some((x) => x.startsWith('HORS-CONTRAT')), `méthode hors contrat appelée : ${e.mag.journalMagasin.filter((x) => x.startsWith('HORS-CONTRAT'))}`)
      })
    })
    await scenario(['QSI-9'], 'pause générale', { commandes: [std()], pause: true }, async (e, j) => {
      const r = await e.passe()
      j('QSI-9', () => check(r?.pause === true && e.serveur.journal.length === 0 && e.mag.rapports.length === 0 && !e.mag.journalMagasin.some((x) => x.startsWith('battement')), `en pause : retour ${JSON.stringify(r)}, ${e.serveur.journal.length} requête(s), ${e.mag.rapports.length} rapport(s), appels ${e.mag.journalMagasin.join(' > ')}`))
    })
    await scenario(['QSI-9'], 'travail en erreur', { commandes: [std()], travailEnErreur: true }, async (e, j) => {
      let rejete = false
      try { await e.passe() } catch { rejete = true }
      j('QSI-9', () => check(rejete && !e.mag.journalMagasin.some((x) => x.startsWith('battement')) && e.serveur.journal.length === 0, `en erreur : rejet ${rejete}, appels ${e.mag.journalMagasin.join(' > ')} (la promesse doit être rejetée, sans battement)`))
    })
  }
}

if (M) {
  for (const id of IDS) touche(id)
  const sortie = Object.fromEntries(IDS.map((id) => [id, { ok: resultats[id].ok, detail: resultats[id].details.slice(0, 3).join(' ; ').slice(0, 600) }]))
  console.log(JSON.stringify({ resultats: sortie }))
}
process.exitCode = 0
