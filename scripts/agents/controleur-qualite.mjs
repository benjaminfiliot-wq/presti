#!/usr/bin/env node
// Contrôleur qualité des sites livrés. L'import est sans effet : seule une passe explicite lit le réseau.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hoteAutorise, recupererPoli, recuperateurReseau } from '../../lib/agents/acquisition/lecteurSite.ts'
import { MOTEUR_DE } from '../../lib/agents/moteurs.ts'
export const BUDGET_POIDS_OCTETS = 3 * 1024 * 1024
const SEUIL_TEXTE = 4.5
const SEUIL_GRAND_TEXTE = 3

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function ratioContraste(a, b) {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (clair + 0.05) / (sombre + 0.05)
}
const rgb = (texte) => { const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(String(texte ?? '')); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null }
const arrondi = (x) => Math.round(x * 100) / 100
const grandTexte = (el) => el.taille_px >= 24 || (el.gras && el.taille_px >= 18.66)

const periode = (ms) => new Date(ms).toISOString().slice(0, 7)
const panne = (code, mesure, commande, ms) => ({ panne: code, mesure, cle_idempotence: `qualite_site:${commande}:${code}:${periode(ms)}` })
const hoteDe = (url) => new URL(url).hostname.replace(/^www\./, '')
const sansFragment = (url) => { const u = new URL(url); u.hash = ''; return u.href }
const texteVisible = (html) => String(html ?? '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const normaliser = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const chiffresCollees = (s) => String(s ?? '').replace(/(\d)[\s .](?=\d)/g, '$1')
const POINT_ENTREE_REPOND = (s) => (s >= 200 && s < 400) || s === 401 || s === 403 || s === 405

async function verifierLien(url, lecteurPrudent) {
  let r
  try { r = await lecteurPrudent(url) } catch { return { url, mort: true, statut: null, raison: 'injoignable' } }
  if (r?.refus) {
    if (r.refus === 'injoignable') return { url, mort: true, statut: null, raison: 'injoignable' }
    if (r.refus === 'redirections') return { url, mort: true, statut: null, raison: 'boucle_redirections' }
    if (r.refus === 'trop_gros' || r.refus === 'type') return { url, mort: false, statut: null }
    return { url, mort: false, non_verifie: r.refus }
  }
  if (r.statut >= 400) return { url, mort: true, statut: r.statut, raison: `http_${r.statut}`, corps: r.corps }
  return { url, mort: false, statut: r.statut, corps: r.corps }
}

async function auditer(site, deps, ms) {
  const { navigateur, lecteurPrudent } = deps
  const id = site.commande_id
  let obs
  try { obs = await navigateur.ouvrir(site.url_en_ligne, { method: 'GET' }) }
  catch (e) { obs = { statut: null, protocole: null, erreur: e instanceof Error ? e.message.slice(0, 120) : 'injoignable' } }
  const verdicts = { disponibilite: null, poids: null, accessibilite: null, liens: null, mentions: null, formulaire: null, visuel: null }

  // QSI-2 — ce que le navigateur a réellement reçu : code, protocole final, certificat (jamais déduits de l'URL demandée).
  const statut = obs.statut ?? null
  const dispo = { statut, protocole: obs.protocole ?? null, certificat_valide: obs.protocole === 'https' ? obs.certificat?.valide === true : null, url_finale: obs.url_finale ?? site.url_en_ligne, pannes: [] }
  verdicts.disponibilite = dispo
  if (statut === null || statut >= 400) dispo.pannes.push(panne('indisponible', { statut, erreur: obs.erreur ?? null }, id, ms))
  else {
    if (dispo.protocole === 'http') dispo.pannes.push(panne('http_non_securise', { protocole: 'http' }, id, ms))
    if (dispo.protocole === 'https' && dispo.certificat_valide === false) dispo.pannes.push(panne('certificat_invalide', { raison: obs.certificat?.raison ?? null }, id, ms))
  }
  if (statut === null || statut >= 400) return finir(id, ms, verdicts)

  // QSI-3 — les octets réellement reçus (réponse complète décodée), jamais l'en-tête Content-Length.
  const octets = obs.octets?.length ?? 0
  verdicts.poids = { octets, budget_octets: BUDGET_POIDS_OCTETS, pannes: octets > BUDGET_POIDS_OCTETS ? [panne('poids_excessif', { octets, budget_octets: BUDGET_POIDS_OCTETS }, id, ms)] : [] }

  // QSI-4 — ratio WCAG calculé sur les couleurs rendues ; alt manquant compté.
  const insuffisants = []
  for (const el of obs.elements_texte ?? []) {
    const fg = rgb(el.couleur), bg = rgb(el.fond)
    if (!fg || !bg) continue
    const ratio = ratioContraste(fg, bg), seuil = grandTexte(el) ? SEUIL_GRAND_TEXTE : SEUIL_TEXTE
    if (ratio < seuil) insuffisants.push({ element: el.selecteur, ratio: arrondi(ratio), seuil })
  }
  const imagesSansAlt = (obs.images ?? []).filter((i) => i.alt === null).length
  const acc = { controles: (obs.elements_texte ?? []).length, insuffisants, images_total: (obs.images ?? []).length, images_sans_alt: imagesSansAlt, pannes: [] }
  if (insuffisants.length) acc.pannes.push(panne('contraste_insuffisant', { insuffisants }, id, ms))
  if (imagesSansAlt) acc.pannes.push(panne('alt_manquant', { images_sans_alt: imagesSansAlt }, id, ms))
  verdicts.accessibilite = acc

  // QSI-5 — chaque lien interne distinct, par le lecteur prudent (robots.txt, 1 requête par seconde), jamais autrement.
  const racine = hoteDe(obs.url_finale ?? site.url_en_ligne)
  const vus = new Set([sansFragment(obs.url_finale ?? site.url_en_ligne)]), internes = []
  for (const l of obs.liens ?? []) {
    let u; try { u = new URL(l.href) } catch { continue }
    if (!/^https?:$/.test(u.protocol) || hoteDe(u.href) !== racine) continue
    const cle = sansFragment(u.href)
    if (vus.has(cle)) continue
    vus.add(cle); internes.push({ url: cle, texte: l.texte ?? '' })
  }
  const resultats = []
  for (const l of internes) resultats.push({ ...l, ...(await verifierLien(l.url, lecteurPrudent)) })
  const morts = resultats.filter((r) => r.mort).map((r) => ({ url: r.url, statut: r.statut, raison: r.raison }))
  const liens = { verifies: resultats.filter((r) => !r.non_verifie).length, liens_morts: morts, non_verifies: resultats.filter((r) => r.non_verifie).map((r) => ({ url: r.url, raison: r.non_verifie })), pannes: [] }
  if (morts.length) liens.pannes.push(panne('lien_mort', { liens_morts: morts }, id, ms))
  verdicts.liens = liens

  // QSI-6 — les mentions attendues de CETTE commande, cherchées dans le texte rendu (accueil + page des mentions légales).
  const pageLegale = resultats.find((r) => /mentions|l[ée]gal/i.test(`${new URL(r.url).pathname} ${r.texte}`))
  const texte = `${obs.texte ?? texteVisible(obs.html)} ${pageLegale?.corps ? texteVisible(pageLegale.corps) : ''}`
  const attendues = Object.entries(site.mentions_attendues ?? {}).filter(([, v]) => v), presentes = [], absentes = []
  for (const [nom, valeur] of attendues) {
    const trouve = nom === 'siren' ? chiffresCollees(texte).includes(String(valeur).replace(/\D/g, '')) : normaliser(texte).includes(normaliser(valeur))
    ;(trouve ? presentes : absentes).push(nom)
  }
  verdicts.mentions = { attendues: attendues.map(([n]) => n), presentes, absentes, pannes: absentes.length ? [panne('mentions_absentes', { absentes }, id, ms)] : [] }

  // QSI-7 — formulaire de contact, contrôle PASSIF : sa présence dans le HTML rendu, puis un GET sur son point d'entrée.
  const formes = obs.formulaires ?? []
  const forme = formes.find((f) => (f.champs ?? []).some((c) => c.type === 'textarea')) ?? formes[0]
  const form = { present: Boolean(forme), action: null, methode: null, champs: [], point_entree_statut: null, pannes: [] }
  if (!forme) form.pannes.push(panne('formulaire_absent', {}, id, ms))
  else {
    form.methode = String(forme.methode || 'GET').toUpperCase()
    form.champs = (forme.champs ?? []).map((c) => c.nom).filter(Boolean)
    if (!forme.action) form.pannes.push(panne('formulaire_sans_action', { methode: form.methode }, id, ms))
    else {
      form.action = new URL(forme.action, obs.url_finale ?? site.url_en_ligne).href
      const r = await verifierLien(form.action, lecteurPrudent)
      form.point_entree_statut = r.non_verifie ? null : r.statut
      if (!r.non_verifie && (r.mort && r.raison !== 'http_401' && r.raison !== 'http_403' && r.raison !== 'http_405')) form.pannes.push(panne('formulaire_injoignable', { statut: r.statut, raison: r.raison }, id, ms))
    }
  }
  verdicts.formulaire = form

  // QSI-8 — avis visuel : Codex seul, données personnelles déclarées ; sinon « non_mesure », jamais un moteur gratuit ni :cloud.
  const cfg = deps.MOTEUR_DE?.qualite_sites
  const permis = cfg && cfg.moteur === 'codex' && cfg.personnelles === true && !/cloud/i.test(String(cfg.modele ?? '')) && typeof deps.moteur === 'function' && obs.capture?.length > 0
  verdicts.visuel = permis
    ? { verdict: String(await deps.moteur(obs.capture, { moteur: cfg.moteur, modele: cfg.modele, personnelles: true })), moteur: 'codex', pannes: [] }
    : { verdict: 'non_mesure', moteur: null, pannes: [] }
  return finir(id, ms, verdicts)
}

function finir(id, ms, verdicts) {
  const pannes = Object.values(verdicts).filter(Boolean).flatMap((v) => v.pannes ?? [])
  return { commande_id: id, periode: periode(ms), mesure_le: new Date(ms).toISOString(), sain: pannes.length === 0, verdicts }
}

export async function passeQualite(deps) {
  const { magasin, horloge } = deps
  const travail = await magasin.travail()
  if (travail?.pause) return { pause: true, audits: [] }
  const audits = []
  for (const site of travail?.sites ?? []) {
    if (site.compte_supprime_le || site.retiree_le || site.etat === 'retiree') { audits.push({ commande_id: site.commande_id, statut: 'exclu_retrait' }); continue }
    if (!site.url_en_ligne) { audits.push({ commande_id: site.commande_id, statut: 'livraison_inachevee' }); continue }
    const rapport = await auditer(site, deps, horloge.maintenant())
    await magasin.rapport(rapport)
    audits.push({ commande_id: site.commande_id, statut: 'audite', sain: rapport.sain, pannes: Object.values(rapport.verdicts).filter(Boolean).flatMap((v) => v.pannes ?? []).map((p) => p.panne) })
  }
  await magasin.battement('qualite_sites')
  return { audits }
}

const attendre = (ms) => new Promise((resoudre) => setTimeout(resoudre, ms))

// Lancé par presti-qualite.service (scripts/usine/avec-coffre.mjs PRESTI_JETON_QUALITE -- …), le contrôleur reçoit son jeton et
// PRESTI_URL dans l'environnement : le coffre partagé de l'usine porte d'autres jetons que le sien, sa lecture directe est
// refusée (leçon de l'atelier, 05/10). Jamais de lecture du coffre ici. http n'est admis que vers la boucle locale (jeux d'essai).
export const TYPE_EVENEMENT = 'qualite_passe'
function configuration(env) {
  let base
  try { base = new URL(String(env.PRESTI_URL ?? '')) } catch { throw new Error('PRESTI_URL invalide') }
  const boucle = base.hostname === '127.0.0.1' || base.hostname === 'localhost' || base.hostname === '[::1]'
  if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && boucle)) || base.username || base.password || base.pathname !== '/' || base.search || base.hash || !env.PRESTI_JETON_QUALITE) throw new Error('environnement incomplet')
  return { base: base.origin, jeton: env.PRESTI_JETON_QUALITE }
}

async function appelBus(configuration, chemin, methode, corps) {
  const url = `${configuration.base}${chemin}`
  const reponse = await fetch(url, { method: methode, headers: {
    authorization: `Bearer ${configuration.jeton}`,
    ...(corps ? { 'content-type': 'application/json' } : {}),
  }, body: corps ? JSON.stringify(corps) : undefined, signal: AbortSignal.timeout(20_000) })
  if (!reponse.ok) throw new Error(`bus ${reponse.status}`)
  return reponse.json()
}

// Chromium ne démarre qu'à la première page à ouvrir : une passe sans site à auditer (le cas normal tant qu'aucun site n'est en
// ligne) ne lance aucun navigateur.
function creerNavigateur() {
  let navigateur = null
  return { fermer: async () => { await navigateur?.close() }, adapter: {
    async ouvrir(url) {
      if (!navigateur) { const { chromium } = await import('playwright'); navigateur = await chromium.launch({ headless: true }) }
      // La garde DNS précède Chromium : une URL contrôlée en base ne doit pas atteindre le réseau privé.
      const hote = new URL(url).hostname
      const { lookup } = await import('node:dns/promises')
      const ips = (await lookup(hote, { all: true, verbatim: true })).map((r) => r.address)
      if (!hoteAutorise(url, ips)) throw new Error('hote refuse')
      const contexte = await navigateur.newContext({ serviceWorkers: 'block', acceptDownloads: false })
      const page = await contexte.newPage()
      await page.route('**/*', async (route) => {
        const cible = route.request().url()
        if (route.request().method() !== 'GET') return route.abort()
        try {
          const ipsCible = (await lookup(new URL(cible).hostname, { all: true, verbatim: true })).map((r) => r.address)
          if (hoteAutorise(cible, ipsCible)) return route.continue()
        } catch { /* URL ou DNS non sûr */ }
        return route.abort()
      })
      try {
        const reponse = await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 })
        const finale = page.url()
        const statut = reponse?.status() ?? null
        const octets = reponse ? Buffer.from(await reponse.body()) : Buffer.alloc(0)
        const rendu = await page.evaluate(() => {
          const texte = (el) => (el.textContent || '').trim()
          const couleurFond = (el) => { let courant = el; while (courant) { const c = getComputedStyle(courant).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; courant = courant.parentElement } return 'rgb(255, 255, 255)' }
          return {
            texte: document.body?.innerText || '', html: document.documentElement.outerHTML,
            elements_texte: [...document.querySelectorAll('p, a, button, label, h1, h2, h3, li')].filter((el) => texte(el)).slice(0, 300).map((el) => { const s = getComputedStyle(el); return { selecteur: el.tagName.toLowerCase(), texte: texte(el).slice(0, 100), couleur: s.color, fond: couleurFond(el), taille_px: parseFloat(s.fontSize), gras: parseInt(s.fontWeight, 10) >= 700 } }),
            images: [...document.images].map((el) => ({ src: el.currentSrc, alt: el.hasAttribute('alt') ? el.getAttribute('alt') : null })),
            liens: [...document.links].map((el) => ({ href: el.href, texte: texte(el) })),
            formulaires: [...document.forms].map((el) => ({ action: el.getAttribute('action'), methode: el.getAttribute('method'), champs: [...el.elements].map((c) => ({ nom: c.name, type: c.type })) })),
          }
        })
        return { url_demandee: url, url_finale: finale, statut, protocole: new URL(finale).protocol.slice(0, -1), certificat: new URL(finale).protocol === 'https:' ? { valide: true } : null, entetes: reponse?.headers() ?? {}, octets, ...rendu, capture: await page.screenshot({ fullPage: true }) }
      } finally { await contexte.close() }
    },
  } }
}

async function principal() {
  if (process.argv.length !== 3 || process.argv[2] !== '--une-passe') { console.error('usage : controleur-qualite.mjs --une-passe'); return 2 }
  let reglages
  try { reglages = configuration({ PRESTI_URL: process.env.PRESTI_URL, PRESTI_JETON_QUALITE: process.env.PRESTI_JETON_QUALITE }) } catch { console.error('qualite_sites : PRESTI_URL (https) et PRESTI_JETON_QUALITE attendus dans l\'environnement (avec-coffre.mjs) ; rien n\'est lancé'); return 3 }
  let nav
  try {
    nav = creerNavigateur()
    const horloge = { maintenant: () => Date.now(), attendre }
    const lectures = new Map()
    const resultat = await passeQualite({
      magasin: {
        travail: () => appelBus(reglages, '/api/usine/qualite/travail', 'GET'),
        rapport: (corps) => appelBus(reglages, '/api/usine/qualite/rapport', 'POST', corps),
        battement: () => appelBus(reglages, '/api/usine/qualite/travail?battement=1', 'GET'),
      },
      navigateur: nav.adapter,
      lecteurPrudent: (url) => {
        const hote = new URL(url).hostname
        if (!lectures.has(hote)) lectures.set(hote, { recuperer: recuperateurReseau, horloge })
        return recupererPoli(url, lectures.get(hote))
      },
      horloge, MOTEUR_DE,
    })
    if (resultat.pause) { console.log('qualite_sites : pause, rien à faire'); return 0 }
    // UN événement par passe, des nombres seulement : le battement est posé par la passe elle-même (route travail, ?battement=1).
    const faits = resultat.audits.filter((a) => a.statut === 'audite')
    const resume = `passe : ${faits.length} site(s) audité(s), ${faits.filter((a) => a.sain).length} sain(s), ${faits.filter((a) => !a.sain).length} avec panne(s), ${resultat.audits.length - faits.length} écarté(s)`
    await appelBus(reglages, '/api/agents/evenements', 'POST', { type: TYPE_EVENEMENT, resume })
    console.log(`qualite_sites : ${resultat.audits.length === 0 ? 'rien à traiter' : `${faits.length} audit(s)`}`)
    return 0
  } catch (e) {
    // L'agent mis en pause : le bus répond 423 à tout appel, ce n'est pas une panne de la passe.
    if (e instanceof Error && e.message === 'bus 423') { console.log('qualite_sites : agent en pause, rien à faire'); return 0 }
    console.error('qualite_sites : passe impossible', e instanceof Error ? e.message : 'erreur'); return 1
  } finally { await nav?.fermer() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await principal()
