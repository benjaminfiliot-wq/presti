#!/usr/bin/env node
// scripts/agents/porteur-formulaire.mjs — le porteur du formulaire, sur l'usine (fiche 026-095).
//
// Un formulaire de contact que le Facteur a approuvé (trois verdicts) et que Benj a accepté (accord individuel, 24 h, sur les
// octets exacts du texte) est soumis UNE SEULE FOIS, dans un vrai Chromium, comme le ferait une personne. Jamais de
// contournement : au moindre captcha, pot de miel, défi JavaScript ou pare-feu vu dans le navigateur, c'est un abandon
// définitif, sans capture ni nouvel essai.
//
//   node --import ./scripts/ts-loader.mjs scripts/agents/porteur-formulaire.mjs              une passe (toutes les 15 min)
//   node --import ./scripts/ts-loader.mjs scripts/agents/porteur-formulaire.mjs --export-nuit  l'export de nuit
//
// Sur l'usine seulement (jamais sur le poste de Benj), lancé par presti-porteur.service / presti-export-nuit.service, qui
// passent par avec-coffre.mjs : le jeton de l'agent facteur_usine arrive dans PRESTI_JETON_FACTEUR_USINE (à défaut, il est lu
// dans ~/.config/presti/agents.env). Le jeton, un texte, une adresse et une URL de site ne sont jamais affichés : la sortie
// ne porte que des identifiants d'envoi et des comptes.
//
// Réglages (aucun n'est un secret) : PRESTI_URL (défaut https://prestiapp.fr), PRESTI_PREUVES_DIR (défaut ~/presti-preuves),
// PRESTI_PORTEUR_ESSAI=1 (les jeux d'essai : autorise l'hôte 127.0.0.1, seulement lui), PRESTI_PORTEUR_SANS_BAC=1 (relance
// Chromium sans son bac à sable si le noyau de l'usine interdit les espaces de noms : à décider à la mise en service, 026-143).
//
// Sortie : 0 passe faite (même sans travail), 1 route ou navigateur en défaut, 2 usage, 3 jeton absent.
import fs from 'node:fs'
import os from 'node:os'
import net from 'node:net'
import dns from 'node:dns'
import path from 'node:path'
import crypto from 'node:crypto'
import { planDeRemplissage, controlesEnDirect, decisionCaseVue } from '../../lib/agents/acquisition/porteurFormulaire.ts'
import { UA_RECENSEUR } from '../../lib/agents/acquisition/contrat.ts'

const ARGS = process.argv.slice(2)
const EXPORT_NUIT = ARGS.includes('--export-nuit')
for (const a of ARGS) if (a !== '--export-nuit') { console.error('usage : porteur-formulaire.mjs [--export-nuit]'); process.exit(2) }

const BASE = (process.env.PRESTI_URL || 'https://prestiapp.fr').replace(/\/+$/, '')
const ESSAI = process.env.PRESTI_PORTEUR_ESSAI === '1'
const PREUVES = path.resolve(process.env.PRESTI_PREUVES_DIR || path.join(process.env.HOME || os.homedir(), 'presti-preuves'))
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DUREE_PASSE_MS = 12 * 60_000
const VERROU_MAX_MS = 15 * 60_000 // le bail de la base : au-delà, un verrou est celui d'une passe morte
const DELAI_HTTP_MS = 20_000
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (donnee) => crypto.createHash('sha256').update(donnee).digest('hex')
const compte = (...morceaux) => console.log(`porteur : ${morceaux.join(', ')}`)

// ── Le jeton : l'environnement (posé par avec-coffre), sinon le coffre lu ligne à ligne, jamais évalué ─────────────────────
function lireJeton() {
  if (process.env.PRESTI_JETON_FACTEUR_USINE) return process.env.PRESTI_JETON_FACTEUR_USINE
  try {
    const coffre = path.join(process.env.HOME || os.homedir(), '.config', 'presti', 'agents.env')
    for (const brute of fs.readFileSync(coffre, 'utf8').split('\n')) {
      const m = brute.replace(/\r$/, '').match(/^PRESTI_JETON_FACTEUR_USINE=(.*)$/)
      if (m) return m[1]
    }
  } catch { /* pas de coffre */ }
  return null
}
const JETON = lireJeton()

/** Un appel aux routes du porteur : { statut, json } ; json null si le corps n'est pas du JSON. Jamais de journal du corps. */
async function appeler(methode, chemin, corps) {
  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), DELAI_HTTP_MS)
  try {
    const r = await fetch(`${BASE}/api/usine/porteur/${chemin}`, {
      method: methode,
      headers: { authorization: `Bearer ${JETON}`, ...(corps !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: corps !== undefined ? JSON.stringify(corps) : undefined,
      signal: controleur.signal,
    })
    let json = null
    try { json = await r.json() } catch { json = null }
    return { statut: r.status, json }
  } catch { return { statut: 0, json: null } } finally { clearTimeout(minuterie) }
}

// ── Les fichiers : dossiers en 0700, fichiers en 0600 ─────────────────────────────────────────────────────────────────────
function dossier0700(d) {
  fs.mkdirSync(d, { recursive: true, mode: 0o700 })
  try { fs.chmodSync(d, 0o700) } catch { /* Windows (les essais) */ }
}
function ecrire0600(fichier, donnee) {
  fs.writeFileSync(fichier, donnee, { mode: 0o600 })
  try { fs.chmodSync(fichier, 0o600) } catch { /* Windows (les essais) */ }
}
const moisDe = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

// ── robots.txt : la lecture est celle du Lecteur (026-020, robotsAutorise), reprise ici sans l'importer ─────────────────────
function robotsAutorise(texte, ua, chemin) {
  const groupes = []
  let courant = null
  for (const ligne of texte.split(/\r?\n/)) {
    if (!ligne.trim()) { courant = null; continue }
    const m = ligne.replace(/#.*$/, '').match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/)
    if (!m) continue
    const cle = m[1].toLowerCase(), valeur = m[2]
    if (cle === 'user-agent') {
      if (!courant || courant.regles.length) { courant = { agents: [], regles: [] }; groupes.push(courant) }
      courant.agents.push(valeur.toLowerCase())
    } else if ((cle === 'allow' || cle === 'disallow') && courant && valeur) courant.regles.push({ permet: cle === 'allow', motif: valeur })
  }
  const nom = ua.toLowerCase().split('/')[0]
  const specifiques = groupes.filter((g) => g.agents.some((a) => a !== '*' && nom.includes(a)))
  const actives = specifiques.length ? specifiques : groupes.filter((g) => g.agents.includes('*'))
  let longueur = -1, permet = true
  for (const g of actives) for (const r of g.regles) {
    const re = '^' + r.motif.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\\\$$/, '$').replace(/\*/g, '.*')
    try {
      if (new RegExp(re).test(chemin)) {
        const n = r.motif.replace(/[*$]/g, '').length
        if (n > longueur || (n === longueur && r.permet)) { longueur = n; permet = r.permet }
      }
    } catch { /* règle incorrecte */ }
  }
  return permet
}

// ── Les hôtes : jamais une adresse du réseau interne (sauf 127.0.0.1 pour les jeux d'essai) ───────────────────────────────
function adressePrivee(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
  }
  const x = ip.toLowerCase()
  if (x === '::1' || x === '::') return true
  if (x.startsWith('::ffff:')) return adressePrivee(x.slice(7))
  return /^f[cd]/.test(x) || /^fe[89ab]/.test(x)
}
const hotesVus = new Map()
async function hoteAutorise(hote) {
  const h = String(hote || '').toLowerCase().replace(/^\[|\]$/g, '')
  if (!h) return false
  if (ESSAI && h === '127.0.0.1') return true
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false
  if (net.isIP(h)) return !adressePrivee(h)
  if (hotesVus.has(h)) return hotesVus.get(h)
  let ok = false
  try {
    const adresses = await dns.promises.lookup(h, { all: true })
    ok = adresses.length > 0 && adresses.every((a) => !adressePrivee(a.address))
  } catch { ok = false }
  hotesVus.set(h, ok)
  return ok
}
const urlHttp = (brut) => {
  try { const u = new URL(brut); return u.protocol === 'https:' || u.protocol === 'http:' ? u : null } catch { return null }
}

/** Au plus une requête par seconde et par hôte : chaque requête réserve son créneau. */
function limiteur() {
  const prochain = new Map()
  return async (hote) => {
    const maintenant = Date.now()
    const creneau = Math.max(maintenant, prochain.get(hote) ?? 0)
    prochain.set(hote, creneau + 1000)
    if (creneau > maintenant) await pause(creneau - maintenant)
  }
}
const attendreHote = limiteur()

/** robots.txt d'un hôte : le texte, '' si le site n'en a pas (404), null si on ne peut pas le lire (un doute vaut un refus). */
async function lireRobots(url) {
  const u = urlHttp(url)
  if (!u) return null
  await attendreHote(u.host)
  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), 8000)
  try {
    const r = await fetch(`${u.origin}/robots.txt`, { headers: { 'user-agent': UA_RECENSEUR }, redirect: 'follow', signal: controleur.signal, credentials: 'omit' })
    if (r.status >= 500) return null
    if (r.status >= 400) return ''
    const texte = await r.text()
    return texte.slice(0, 500_000)
  } catch { return null } finally { clearTimeout(minuterie) }
}

// ── Les verrous : un envoi n'est jamais soumis deux fois, même si deux passages se chevauchent ───────────────────────────
const dossierVerrous = () => path.join(PREUVES, 'verrous')
const fichierVerrou = (id) => path.join(dossierVerrous(), `${id}.lock`)
/** 'pris' : le verrou est à nous ; 'occupe' : une passe vivante le tient ; 'orphelin' : une soumission lancée par une passe morte. */
const vivant = (pid) => { if (!Number.isInteger(pid) || pid <= 0) return false; try { process.kill(pid, 0); return true } catch (e) { return e?.code === 'EPERM' } }
function prendreVerrou(id, reprise = false) {
  dossier0700(dossierVerrous())
  try {
    const fd = fs.openSync(fichierVerrou(id), 'wx', 0o600)
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, le: Date.now(), etat: 'pris' }))
    fs.closeSync(fd)
    return 'pris'
  } catch (e) {
    if (e?.code !== 'EEXIST') throw e
    let v = null
    try { v = JSON.parse(fs.readFileSync(fichierVerrou(id), 'utf8')) } catch { v = null }
    // Fichier créé mais pas encore écrit par la passe qui le prend : son âge est celui du fichier, et il est à elle.
    if (v === null) { let m = 0; try { m = fs.statSync(fichierVerrou(id)).mtimeMs } catch { m = 0 } if (Date.now() - m < 10_000) return 'occupe' }
    const age = Date.now() - (typeof v?.le === 'number' ? v.le : 0)
    // Une passe vivante tient le verrou (soumis ou pas) : on ne rend rien, la sienne rendra. Jamais deux rendus pour un envoi.
    if (age <= VERROU_MAX_MS && vivant(v?.pid)) return 'occupe'
    // Passe morte : après le clic, l'envoi a peut-être été soumis, on ne le refait jamais ; avant le clic, rien n'est parti.
    if (v?.etat === 'soumis' || age > VERROU_MAX_MS) return 'orphelin'
    if (!reprise) { try { fs.unlinkSync(fichierVerrou(id)) } catch { /* déjà parti */ } return prendreVerrou(id, true) }
    return 'occupe'
  }
}
const marquerVerrou = (id, etat) => { try { fs.writeFileSync(fichierVerrou(id), JSON.stringify({ pid: process.pid, le: Date.now(), etat }), { mode: 0o600 }) } catch { /* le verrou reste tel quel */ } }
const lacherVerrou = (id) => { try { fs.unlinkSync(fichierVerrou(id)) } catch { /* déjà parti */ } }

// ── Les captures : l'élément <form> seul, avec les adresses et les numéros masqués ────────────────────────────────────────
const MASQUE_ATTR = 'data-presti-masque'
/** Exécutée DANS la page (une vraie fonction : Playwright la sérialise et l'appelle) : marque tout élément dont le texte a le
 *  format d'une adresse e-mail ou d'un numéro de téléphone, pour que la capture le masque. */
function marquerAMasquer(racine, attribut) {
  const MAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
  const TEL = /(?:\+|00)?\d[\d .-]{7,}\d/
  const suspect = (t) => MAIL.test(t) || TEL.test(t)
  for (const el of [racine, ...racine.querySelectorAll('*')]) {
    if (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(el.tagName)) continue
    let porte = false
    for (const n of el.childNodes) if (n.nodeType === 3 && suspect(n.textContent || '')) { porte = true; break }
    if (!porte && el.tagName === 'INPUT' && suspect(el.getAttribute('placeholder') || '')) porte = true
    if (porte) el.setAttribute(attribut, '1')
  }
}
/** JPEG de l'élément donné seul (jamais la page : l'adresse de l'artisan peut s'afficher à côté). */
async function capturerElement(page, cible) {
  await cible.evaluate(marquerAMasquer, MASQUE_ATTR).catch(() => {})
  const masques = [cible.locator(`[${MASQUE_ATTR}]`), cible.locator('a[href^="mailto:" i]'), cible.locator('a[href^="tel:" i]'), page.locator(`[${MASQUE_ATTR}]`)]
  return cible.screenshot({ type: 'jpeg', quality: 92, mask: masques, maskColor: '#FF00FF', animations: 'disabled', timeout: 10_000 })
}

// ── Un envoi ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Exécutée dans la page, sur l'élément <form> : les contrôles obligatoires (nom, type, libellé). */
function lireObligatoires(forme) {
  return [...forme.querySelectorAll('input, textarea, select')]
    .filter((el) => (el.required === true || el.getAttribute('aria-required') === 'true') && !['hidden', 'submit', 'button', 'reset', 'image'].includes((el.getAttribute('type') || '').toLowerCase()))
    .map((el) => {
      const etiquette = el.closest('label') || (el.id ? forme.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null)
      return {
        nom: el.getAttribute('name') || '',
        type: (el.getAttribute('type') || (el.tagName === 'TEXTAREA' ? 'textarea' : el.tagName === 'SELECT' ? 'select' : 'text')).toLowerCase(),
        libelle: ((etiquette && etiquette.textContent) || el.getAttribute('aria-label') || '').trim().slice(0, 300),
      }
    })
}
const ERREUR_VISIBLE = '.wpcf7-not-valid-tip, .wpcf7-validation-errors, .wpforms-error, .gfield_validation_message, .validation_error, .form-error, [aria-invalid="true"]'
const ECHEC_TEXTE = /erreur|[ée]chec|impossible d.envoyer|n.a pas pu|failed|error|invalide/i
const SUCCES_TEXTE = /merci|bien [ée]t[ée] (?:envoy|re[cç]u)|bien re[cç]u|thank|message (?:envoy|re[cç]u)|nous vous r[ée]pondrons/i

const rendre = (id, corps) => appeler('POST', 'rendu', { envoi_id: id, ...corps })

async function rendreAvecReprises(id, corps, dossierPreuves) {
  for (let essai = 0; essai < 3; essai++) {
    const r = await rendre(id, corps)
    if (r.statut === 200 && r.json?.ok === true) return true
    if (r.statut >= 400 && r.statut < 500 && r.statut !== 429) break // refusé pour de bon : réessayer ne changerait rien
    await pause(1500 * (essai + 1))
  }
  // La soumission a eu lieu mais la base ne le sait pas : le prochain passage renvoie ce rendu (jamais une seconde soumission).
  if (dossierPreuves) { try { ecrire0600(path.join(dossierPreuves, 'rendu-en-attente.json'), JSON.stringify({ envoi_id: id, ...corps })) } catch { /* rien */ } }
  return false
}

async function abandonner(id, dossierEnvoi, raison, definitif, htmlEmpreinte) {
  if (process.env.PRESTI_DEBUG) console.error('abandon', raison, String(new Error().stack).split('\n')[2])
  // Aucune capture sur un abandon : la raison et l'empreinte du HTML, rien d'autre.
  if (htmlEmpreinte) {
    dossier0700(dossierEnvoi)
    ecrire0600(path.join(dossierEnvoi, 'abandon.json'), JSON.stringify({ raison, empreinte_html: htmlEmpreinte }))
  }
  await rendre(id, { ok: false, raison, definitif })
}

async function porterUn(navigateur, envoi, adresse) {
  const id = String(envoi.id).toLowerCase()
  const formulaire = envoi.formulaire
  const dossierEnvoi = path.join(PREUVES, 'formulaires', moisDe(new Date()), id)
  const pageUrl = urlHttp(formulaire?.url_page)
  const actionUrl = urlHttp(formulaire?.url_action)
  if (!pageUrl || !actionUrl || !Array.isArray(formulaire?.champs)) { await rendre(id, { ok: false, raison: 'formulaire_illisible', definitif: true }); return 'abandon' }

  const verrou = prendreVerrou(id)
  if (verrou === 'occupe') return 'passe'
  if (verrou === 'orphelin') { await rendre(id, { ok: false, raison: 'verrou_orphelin', definitif: true }); return 'abandon' }

  let soumisLance = false
  let contexte = null
  try {
    // 1. robots.txt, de l'hôte de la page et de celui de l'action
    for (const [url, u] of [[formulaire.url_page, pageUrl], [formulaire.url_action, actionUrl]]) {
      if (!(await hoteAutorise(u.hostname))) { await rendre(id, { ok: false, raison: 'hote_refuse', definitif: true }); return 'abandon' }
      const robots = await lireRobots(url)
      if (robots === null) { await rendre(id, { ok: false, raison: 'robots_illisible', definitif: false }); lacherVerrou(id); return 'echec' }
      if (!robotsAutorise(robots, UA_RECENSEUR, u.pathname + u.search)) { await rendre(id, { ok: false, raison: 'robots_txt', definitif: true }); return 'abandon' }
    }

    // 2. la pause, l'opposition, l'accord de Benj : relus juste avant de toucher au site
    const relecture = await appeler('GET', `travail?verifier=${encodeURIComponent(id)}`)
    if (relecture.statut !== 200 || relecture.json?.ok !== true) { lacherVerrou(id); return 'passe' }
    if (relecture.json.empreinte_texte !== sha256(envoi.texte)) { await rendre(id, { ok: false, raison: 'accord_texte', definitif: true }); return 'abandon' }

    // 3. un contexte neuf : aucun cookie, aucun stockage, le seul User-Agent du recenseur
    contexte = await navigateur.newContext({ userAgent: UA_RECENSEUR, acceptDownloads: false, serviceWorkers: 'block', viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, locale: 'fr-FR' })
    contexte.setDefaultTimeout(15_000)
    await contexte.route('**/*', async (route) => {
      const u = urlHttp(route.request().url())
      if (!u || !(await hoteAutorise(u.hostname))) return route.abort('blockedbyclient')
      await attendreHote(u.host)
      return route.continue()
    })
    const page = await contexte.newPage()
    page.on('dialog', (d) => d.dismiss().catch(() => {}))
    let reponsePage = null
    try { reponsePage = await page.goto(formulaire.url_page, { waitUntil: 'domcontentloaded', timeout: 25_000 }) } catch { lacherVerrou(id); await rendre(id, { ok: false, raison: 'page_injoignable', definitif: false }); return 'echec' }
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(1500) // une protection chargée par un script peut n'apparaître qu'après le chargement
    const html = await page.content().catch(() => '')
    const empreinteHtml = sha256(html)
    const hoteFinal = urlHttp(page.url())?.hostname.replace(/^www\./, '')
    if (hoteFinal !== pageUrl.hostname.toLowerCase().replace(/^www\./, '')) { await abandonner(id, dossierEnvoi, 'formulaire_change', true, empreinteHtml); return 'abandon' }

    // 4. les contrôles dans le navigateur, AVANT de remplir quoi que ce soit
    const controle = await controlesEnDirect(page, { statut: reponsePage?.status() ?? null, urlAction: formulaire.url_action, technologie: formulaire.technologie, longueurTexte: envoi.texte.length })
    if (!controle.ok) { await abandonner(id, dossierEnvoi, controle.raison, true, empreinteHtml); return 'abandon' }

    // 5. le plan de remplissage
    const plan = planDeRemplissage(formulaire, { texte: envoi.texte, objet: envoi.objet ?? null, adresse })
    if (!plan.ok) { await abandonner(id, dossierEnvoi, plan.raison, true, empreinteHtml); return 'abandon' }

    // 6. remplir, capturer « avant », soumettre
    const forme = page.locator('form:has(textarea)').first()
    const parNom = (nom) => forme.locator(`[name="${String(nom).replace(/["\\]/g, '\\$&')}"]`).first()
    for (const c of plan.champs) {
      const champ = parNom(c.nom)
      if (plan.motif !== null && c.valeur === plan.motif && (await champ.evaluate((el) => el.tagName).catch(() => '')) === 'SELECT') await champ.selectOption({ label: c.valeur })
      else await champ.fill(c.valeur)
    }
    // Le navigateur est la vérité : tout champ OBLIGATOIRE que le plan ne remplit pas fait abandonner, sauf une case de
    // consentement au traitement du message (jamais une copie, une lettre d'information ni une inscription).
    const remplis = new Set(plan.champs.map((c) => c.nom))
    const casesACocher = new Set(plan.cases)
    const obligatoires = await forme.evaluate(lireObligatoires).catch((e) => { if (process.env.PRESTI_DEBUG) console.error(String(e?.message).slice(0, 300)); return null })
    if (!Array.isArray(obligatoires)) { await abandonner(id, dossierEnvoi, 'formulaire_change', true, empreinteHtml); return 'abandon' }
    for (const c of obligatoires) {
      if (c.type === 'checkbox') {
        if (casesACocher.has(c.nom)) continue
        if (decisionCaseVue(c.nom, c.libelle) === 'cocher') { casesACocher.add(c.nom); continue }
        await abandonner(id, dossierEnvoi, 'champ_inconnu', true, empreinteHtml); return 'abandon'
      }
      if (c.type === 'tel') { await abandonner(id, dossierEnvoi, 'telephone_requis', true, empreinteHtml); return 'abandon' }
      if (c.type === 'radio' || c.type === 'file' || !remplis.has(c.nom)) { await abandonner(id, dossierEnvoi, 'champ_inconnu', true, empreinteHtml); return 'abandon' }
    }
    for (const nom of casesACocher) await parNom(nom).check()
    const avant = await capturerElement(page, forme)
    const bouton = forme.locator('input[type="submit"], button[type="submit"], button:not([type])').first()
    const hoteAction = actionUrl.hostname.toLowerCase().replace(/^www\./, '')
    const attente = page.waitForResponse((r) => r.request().method() === 'POST' && (urlHttp(r.url())?.hostname.toLowerCase().replace(/^www\./, '') === hoteAction), { timeout: 25_000 })
    attente.catch(() => {})
    marquerVerrou(id, 'soumis') // dès ce clic, l'envoi ne se soumet plus jamais une seconde fois
    soumisLance = true
    const soumisLe = new Date()
    await bouton.click({ timeout: 10_000 })
    let reponse = null
    try { reponse = await attente } catch { reponse = null }
    await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1500)

    // 7. la page d'après : le message de confirmation, ou l'élément qui contenait le formulaire
    let cibleApres = forme
    const formeToujoursLa = await forme.isVisible().catch(() => false)
    if (!formeToujoursLa) {
      const candidats = ['#confirmation', '.confirmation', '[role="alert"]', '[role="status"]', '[class*="merci" i]', '[class*="success" i]', 'main', '[role="main"]', 'body']
      cibleApres = page.locator('body')
      for (const s of candidats) {
        const l = page.locator(s).first()
        if (await l.isVisible().catch(() => false)) { cibleApres = l; break }
      }
    }
    const apres = await capturerElement(page, cibleApres)
    const texteApres = ((await cibleApres.innerText().catch(() => '')) || '').slice(0, 5000)
    const erreurVisible = await page.locator(ERREUR_VISIBLE).first().isVisible().catch(() => false) || (ECHEC_TEXTE.test(texteApres) && !SUCCES_TEXTE.test(texteApres))

    // 8. les preuves, sur l'usine seulement
    dossier0700(dossierEnvoi)
    ecrire0600(path.join(dossierEnvoi, 'avant.jpg'), avant)
    ecrire0600(path.join(dossierEnvoi, 'apres.jpg'), apres)
    ecrire0600(path.join(dossierEnvoi, 'texte.txt'), envoi.texte)
    const codeHttp = reponse ? reponse.status() : 0
    const preuve = {
      code_http: codeHttp,
      empreinte_texte: sha256(envoi.texte),
      empreinte_avant: sha256(avant),
      empreinte_apres: sha256(apres),
      chemin_usine: dossierEnvoi,
      technologie: formulaire.technologie,
      soumis_le: soumisLe.toISOString(),
    }
    ecrire0600(path.join(dossierEnvoi, 'preuve.json'), JSON.stringify(preuve))

    // 9. le rendu : succès seulement pour un 2xx ou 3xx sans erreur de formulaire
    if (reponse && codeHttp >= 200 && codeHttp < 400 && !erreurVisible) {
      await rendreAvecReprises(id, { ok: true, preuve }, dossierEnvoi)
      return 'soumis'
    }
    const raison = !reponse ? 'pas_de_reponse' : codeHttp >= 500 ? 'http_5xx' : codeHttp >= 400 ? 'http_4xx' : 'erreur_formulaire'
    await rendre(id, { ok: false, raison, definitif: !(raison === 'http_5xx' || raison === 'pas_de_reponse') })
    return 'echec'
  } catch {
    // Une erreur avant le clic : rien n'est parti, le verrou se lâche et l'envoi pourra être repris. Après le clic, le verrou
    // reste : la base saura « échec non définitif », mais la soumission ne se refera jamais.
    if (!soumisLance) lacherVerrou(id)
    await rendre(id, { ok: false, raison: soumisLance ? 'erreur_apres_soumission' : 'erreur_navigateur', definitif: soumisLance })
    return 'echec'
  } finally {
    if (contexte) await contexte.close().catch(() => {})
  }
}

// ── Les rendus en attente d'une passe précédente (la soumission a eu lieu, la base était injoignable) ──────────────────────
async function renvoyerEnAttente() {
  let n = 0
  const racine = path.join(PREUVES, 'formulaires')
  let mois = []
  try { mois = fs.readdirSync(racine) } catch { return 0 }
  for (const m of mois) {
    let ids = []
    try { ids = fs.readdirSync(path.join(racine, m)) } catch { continue }
    for (const id of ids) {
      const f = path.join(racine, m, id, 'rendu-en-attente.json')
      if (!UUID.test(id) || !fs.existsSync(f)) continue
      let corps = null
      try { corps = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { continue }
      const r = await appeler('POST', 'rendu', corps)
      if (r.statut === 200 || (r.statut >= 400 && r.statut < 500 && r.statut !== 429)) { try { fs.unlinkSync(f) } catch { /* rien */ } n++ }
    }
  }
  return n
}

async function passe() {
  if (!JETON) { console.error('porteur : jeton facteur_usine absent (PRESTI_JETON_FACTEUR_USINE)'); return 3 }
  const debut = Date.now()
  const renvoyes = await renvoyerEnAttente()
  const travail = await appeler('GET', 'travail')
  if (travail.statut !== 200 || !travail.json || !Array.isArray(travail.json.envois)) { compte(`travail illisible (statut ${travail.statut})`); return 1 }
  const envois = travail.json.envois.filter((e) => e && typeof e.id === 'string' && UUID.test(e.id) && typeof e.texte === 'string' && e.texte.length > 0)
  const adresse = typeof travail.json.adresse === 'string' ? travail.json.adresse.trim() : ''
  if (!envois.length || !adresse) { compte('0 envoi', `${renvoyes} rendu(s) renvoyé(s)`); return 0 }

  let chromium
  try { ({ chromium } = await import('playwright')) } catch { compte('Playwright absent : rien n\'est soumis'); return 1 }
  let navigateur
  try { navigateur = await chromium.launch({ headless: true }) } catch (e) {
    if (process.env.PRESTI_PORTEUR_SANS_BAC === '1') {
      try { navigateur = await chromium.launch({ headless: true, args: ['--no-sandbox'] }) } catch { navigateur = null }
    }
    if (!navigateur) { compte('Chromium ne se lance pas : rien n\'est soumis'); return 1 }
  }
  const bilan = { soumis: 0, abandon: 0, echec: 0, passe: 0 }
  try {
    for (const envoi of envois) {
      if (Date.now() - debut > DUREE_PASSE_MS) { bilan.passe++; continue }
      let etat = 'echec'
      try { etat = await porterUn(navigateur, envoi, adresse) } catch { etat = 'echec' }
      bilan[etat] = (bilan[etat] ?? 0) + 1
      console.log(`porteur : envoi ${String(envoi.id).toLowerCase()} → ${etat}`)
    }
  } finally { await navigateur.close().catch(() => {}) }
  compte(`${envois.length} envoi(s)`, `${bilan.soumis} soumis`, `${bilan.abandon} abandonné(s)`, `${bilan.echec} en échec`, `${bilan.passe} passé(s)`, `${renvoyes} rendu(s) renvoyé(s)`)
  return 0
}

// ── L'export de nuit : les oppositions recopiées sur l'usine, puis la purge des preuves que la base ne garde plus ───────────
async function exportNuit() {
  if (!JETON) { console.error('porteur : jeton facteur_usine absent (PRESTI_JETON_FACTEUR_USINE)'); return 3 }
  const lues = await appeler('GET', 'oppositions')
  if (lues.statut !== 200 || !Array.isArray(lues.json?.oppositions)) { compte('export de nuit : oppositions illisibles, rien n\'est effacé'); return 1 }
  const lignes = lues.json.oppositions.filter((o) => o && typeof o.cle_type === 'string' && typeof o.cle_valeur === 'string')
  if (lignes.length !== lues.json.oppositions.length) { compte('export de nuit : réponse mal formée, rien n\'est effacé'); return 1 }
  const dossierOpp = path.join(PREUVES, 'oppositions')
  dossier0700(dossierOpp)
  const jour = new Date().toISOString().slice(0, 10)
  const cible = path.join(dossierOpp, `${jour}.jsonl`)
  ecrire0600(`${cible}.tmp`, lignes.map((o) => JSON.stringify(o)).join('\n') + (lignes.length ? '\n' : ''))
  fs.renameSync(`${cible}.tmp`, cible)

  // Les dossiers de preuves : la base dit lesquels elle garde (l'envoi existe, son prospect n'est pas effacé, dernier contact < 3 ans).
  const racine = path.join(PREUVES, 'formulaires')
  const dossiers = []
  try {
    for (const m of fs.readdirSync(racine)) {
      let ids = []
      try { ids = fs.readdirSync(path.join(racine, m)) } catch { continue }
      for (const id of ids) if (UUID.test(id) && fs.statSync(path.join(racine, m, id)).isDirectory()) dossiers.push({ id: id.toLowerCase(), chemin: path.join(racine, m, id) })
    }
  } catch { /* pas encore de preuves */ }
  const aGarder = new Set()
  for (let i = 0; i < dossiers.length; i += 500) {
    const paquet = dossiers.slice(i, i + 500).map((d) => d.id)
    const r = await appeler('POST', 'oppositions', { envois: [...new Set(paquet)] })
    if (r.statut !== 200 || !Array.isArray(r.json?.garder) || !r.json.garder.every((x) => typeof x === 'string' && UUID.test(x))) {
      compte(`export de nuit : ${lignes.length} opposition(s) recopiée(s), réponse de la base illisible, rien n'est effacé`)
      return 1
    }
    for (const g of r.json.garder) aGarder.add(g.toLowerCase())
  }
  let effaces = 0
  for (const d of dossiers) {
    if (aGarder.has(d.id)) continue
    if (!d.chemin.startsWith(racine + path.sep)) continue
    try { fs.rmSync(d.chemin, { recursive: true, force: true }); effaces++ } catch { /* il sera repris demain */ }
    try { fs.rmdirSync(path.dirname(d.chemin)) } catch { /* le mois n'est pas vide */ }
    try { fs.unlinkSync(fichierVerrou(d.id)) } catch { /* pas de verrou */ }
  }
  compte(`export de nuit : ${lignes.length} opposition(s) recopiée(s)`, `${dossiers.length} dossier(s) de preuves`, `${aGarder.size} gardé(s)`, `${effaces} effacé(s)`)
  return 0
}

process.exitCode = EXPORT_NUIT ? await exportNuit() : await passe()
