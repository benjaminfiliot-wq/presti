// scripts/fixtures/026-pilotage/c/commun.mjs — l'aide du juge d'écran de la station (lot c, fiche 026-104, écrite par
// Claude Code). Elle reprend les aides des lots a et b (a/commun.mjs, b/commun.mjs) sans les recopier.
//
//   copieDrapeau(racine, { critere })   la copie au drapeau levé : app/, lib/ et les fichiers de tête de la racine sous
//        .orchestre/travail/pilotage-ecran/copie-<pid>/, `pilotage: false,` remplacé par `pilotage: true,` dans la copie de
//        lib/flags.ts SEULEMENT (même mécanique que copieAvecDrapeau de b/commun.mjs, dans un dossier propre au processus :
//        deux juges ne se marchent pas dessus). Jamais .env.local. `jonctions: true` relie node_modules et public (pour
//        `next dev`). Lève une erreur qui porte le critère de l'appelant si un préalable manque.
//   jeu(rel), jeuxTous()                les jeux d'essai de c/jeux/ (fabriqués par c/fabriquer-jeux.mjs).
//   servir(page, scenario)              l'interception du juge : chaque requête sortante du navigateur est vue ; hors de
//        l'origine servie, elle est REFUSÉE et consignée (le routeur de Playwright est le piège réseau du navigateur) ;
//        /api/… est servi depuis le scénario (jeux décalés à maintenant, `_piege` ajouté), tout autre /api/ rend 503 « non
//        servi par le juge » ; chaque appel est consigné (chemin, méthode, corps, en-têtes, instant).
//   capturer(page, fichier)             la capture JPEG prise par le juge (l'image déjà présente au même chemin est effacée
//        AVANT) ; → { octets, largeur, hauteur, ecartType, empreinte } mesurés par le juge sur le fichier écrit.
//   MESURES                             les fonctions de mesure injectées dans la page (window.__JUGE__) : géométrie,
//        visibilité par elementFromPoint, textes sous 12 px, boutons sous 44 px, débordements (hors de l'écran, rognés par
//        un cadre « overflow: hidden », défilement horizontal), éléments entiers, fond opaque d'une feuille, animations en cours,
//        empreinte du canevas, compteur d'images de la carte.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { R, TRAVAIL, court, premiereLigne, lireOuNull, exigerSousTravail, listerFichiers, sansCommentaires, git } from '../a/commun.mjs'

export { R, TRAVAIL, court, premiereLigne, lireOuNull, exigerSousTravail, listerFichiers, sansCommentaires, git }
export const C = path.dirname(fileURLToPath(import.meta.url))
export const DOSSIER_JEUX = path.join(C, 'jeux')
export const TRAV = path.join(TRAVAIL, 'pilotage-ecran')
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
export const posix = (p) => p.split(path.sep).join('/')
const requireDepot = createRequire(path.join(R, 'package.json'))

// ── Les jeux d'essai ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const MAINTENANT_JEUX = '2026-10-23T10:00:00.000Z'
const cache = new Map()
export function jeu(rel) {
  if (!cache.has(rel)) cache.set(rel, JSON.parse(fs.readFileSync(path.join(DOSSIER_JEUX, rel), 'utf8')))
  return structuredClone(cache.get(rel))
}
export const PIEGE = Object.freeze({ nom: 'Jean Témoin', telephone: '06 12 34 56 78', email: 'jean.temoin@exemple.invalid' })
export const PIEGE_HTML = '<img src=x onerror=alert(1)>'
/** Un clone de la réponse, `_piege` posé à la racine et dans chaque objet `valeur` : aucun écran ne doit l'afficher. */
export function avecPiege(x) {
  const c = structuredClone(x)
  const poser = (o, prof = 0) => {
    if (!o || typeof o !== 'object' || prof > 6) return
    if (Array.isArray(o)) { for (const y of o) poser(y, prof + 1); return }
    if ('valeur' in o && o.valeur && typeof o.valeur === 'object' && !Array.isArray(o.valeur)) o.valeur._piege = { ...PIEGE }
    for (const v of Object.values(o)) poser(v, prof + 1)
  }
  if (c && typeof c === 'object' && !Array.isArray(c)) { c._piege = { ...PIEGE }; poser(c) }
  return c
}
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
/** Toutes les dates ISO décalées de `delta` ms (les jeux sont figés à MAINTENANT_JEUX ; le juge sert « maintenant »). */
export function decaler(x, delta) {
  if (typeof x === 'string') return ISO.test(x) ? new Date(Date.parse(x) + delta).toISOString() : x
  if (Array.isArray(x)) return x.map((y) => decaler(y, delta))
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, decaler(v, delta)]))
  return x
}

// ── Mises en forme (celles de l'écran, refaites par le juge pour calculer l'attendu) ──────────────────────────────────
const FORMAT_EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
/** Comme `euros()` de lib/direction/fraicheur.ts. */
export const euros = (n) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : FORMAT_EUR.format(n))
const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false })
const JOUR = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' })
export const heureParis = (d = Date.now()) => HEURE.format(new Date(d))
export const dateParis = (iso) => JOUR.format(new Date(iso))
/** Comme `relTime()` de lib/direction/fraicheur.ts. */
export function relTime(iso, maintenant = Date.now()) {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  if (!Number.isFinite(d)) return '—'
  const s = Math.max(0, Math.round((maintenant - d) / 1000))
  if (s < 45) return 'à l’instant'
  const min = Math.round(s / 60)
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 36) return `il y a ${h} h`
  return `il y a ${Math.round(h / 24)} j`
}
export const espaces = (t) => String(t ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()

// ── Le hasard du juge (graine affichée : un passage se rejoue) ───────────────────────────────────────────────────────────
export function hasard(graine = crypto.randomInt(1, 2 ** 31 - 1)) {
  let s = graine >>> 0
  const suivant = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const entre = (a, b) => a + Math.floor(suivant() * (b - a + 1))
  return { graine, suivant, entre, parmi: (l) => l[entre(0, l.length - 1)], montant: (a, b) => Math.round((a + suivant() * (b - a)) * 100) / 100, melanger: (l) => { const c = [...l]; for (let i = c.length - 1; i > 0; i--) { const j = entre(0, i); [c[i], c[j]] = [c[j], c[i]] } return c } }
}

// ── La copie au drapeau levé ─────────────────────────────────────────────────────────────────────────────────────────────
const MOTIF_BAISSE = 'pilotage: false,', MOTIF_LEVE = 'pilotage: true,'
// D-0510-D2 (correction du chef, 05/10, 026-117 et 026-120) : le drapeau `pilotage` est LEVÉ en production depuis 026-140 (Benj, 05/10) : le juge exigeait encore exactement un
// `pilotage: false,` dans lib/flags.ts et refusait toute racine réelle. Il accepte désormais l'UN des deux états, exactement une fois : baissé (levé dans la copie, comme avant)
// ou déjà levé (copie telle quelle). Rien d'assoupli : absent, doublé, ou `false` et `true` ensemble restent refusés ; la copie doit finir levée ; la source ne doit pas bouger.
const compter = (t, m) => t.split(m).length - 1
const etatDrapeau = (t) => { const b = compter(t, MOTIF_BAISSE), l = compter(t, MOTIF_LEVE); return b === 1 && l === 0 ? 'baisse' : b === 0 && l === 1 ? 'leve' : null }
const refusDrapeau = (t) => `lib/flags.ts porte « ${MOTIF_BAISSE} » ${compter(t, MOTIF_BAISSE)} fois et « ${MOTIF_LEVE} » ${compter(t, MOTIF_LEVE)} fois : exactement un des deux, une seule fois, est attendu (le drapeau ne peut pas être levé dans la copie)`
export const erreurCritere = (critere, m) => { const e = new Error(`${critere} : ${m}`); e.critere = critere; return e }
// Une jonction (node_modules, public) se retire SEULE, jamais par un rm récursif qui la suivrait jusqu'au vrai dossier.
function retirerJonctions(dest) {
  for (const j of ['node_modules', 'public']) {
    const p = path.join(dest, j)
    let st = null
    try { st = fs.lstatSync(p) } catch { continue }
    if (!st.isSymbolicLink()) continue
    try { fs.rmdirSync(p) } catch { try { fs.unlinkSync(p) } catch { /* essayé deux fois */ } }
    let reste = true
    try { fs.lstatSync(p) } catch { reste = false }
    if (reste) throw new Error(`jonction ${p} impossible à retirer : la copie n'est pas effacée (elle pointerait vers le vrai ${j})`)
  }
}
export function supprimerCopie(dest) {
  if (!dest || !fs.existsSync(dest)) return
  exigerSousTravail(dest)
  retirerJonctions(dest)
  fs.rmSync(dest, { recursive: true, force: true })
}
/** → { dest, tete, leveDansCopie, baisseDansRacine, empreinteRacine } */
export function copieDrapeau(racine, { critere, jonctions = false, nom = `copie-${process.pid}` } = {}) {
  const dest = exigerSousTravail(path.join(TRAV, nom))
  const tete = ['proxy.ts', 'middleware.ts'].find((f) => fs.existsSync(path.join(racine, f)))
  if (!tete) throw erreurCritere(critere, `ni proxy.ts ni middleware.ts dans ${racine} : la copie n'aurait pas de garde`)
  const flags = lireOuNull(path.join(racine, 'lib', 'flags.ts'))
  if (flags === null) throw erreurCritere(critere, 'lib/flags.ts absent de la racine')
  const etat = etatDrapeau(flags)
  if (!etat) throw erreurCritere(critere, refusDrapeau(flags))
  const empreinteRacine = sha256(Buffer.from(flags))
  supprimerCopie(dest)
  fs.mkdirSync(dest, { recursive: true })
  for (const d of ['app', 'lib']) {
    if (!fs.existsSync(path.join(racine, d))) throw erreurCritere(critere, `${d}/ absent de la racine`)
    fs.cpSync(path.join(racine, d), path.join(dest, d), { recursive: true })
  }
  for (const f of [tete, 'next.config.mjs', 'tsconfig.json', 'package.json', 'next-env.d.ts']) {
    if (fs.existsSync(path.join(racine, f))) fs.copyFileSync(path.join(racine, f), path.join(dest, f))
    else if (f !== 'next-env.d.ts') throw erreurCritere(critere, `${f} absent de la racine`)
  }
  if (jonctions) for (const j of ['node_modules', 'public']) { const cible = path.join(R, j); if (fs.existsSync(cible)) fs.symlinkSync(cible, path.join(dest, j), 'junction') }
  fs.writeFileSync(path.join(dest, 'lib', 'flags.ts'), (etat === 'baisse' ? flags.replace(MOTIF_BAISSE, () => MOTIF_LEVE) : flags))
  if (fs.existsSync(path.join(dest, '.env.local'))) throw erreurCritere(critere, '.env.local dans la copie')
  const copie = fs.readFileSync(path.join(dest, 'lib', 'flags.ts'), 'utf8')
  return { dest, tete, empreinteRacine, leveDansCopie: copie.includes(MOTIF_LEVE) && !copie.includes(MOTIF_BAISSE), baisseDansRacine: (lireOuNull(path.join(racine, 'lib', 'flags.ts')) ?? '').includes(MOTIF_BAISSE) }
}

/**
 * La même copie au drapeau levé, sans rien écrire : le banc lit la racine telle quelle, sauf lib/flags.ts qu'il lit levé
 * (même motif, mêmes refus que copieDrapeau). → { racine, remplacements: Map(chemin absolu → texte), leveDansCopie }
 */
export function vueDrapeau(racine, { critere } = {}) {
  const tete = ['proxy.ts', 'middleware.ts'].find((f) => fs.existsSync(path.join(racine, f)))
  if (!tete) throw erreurCritere(critere, `ni proxy.ts ni middleware.ts dans ${racine} : la copie n'aurait pas de garde`)
  const f = path.join(racine, 'lib', 'flags.ts')
  const flags = lireOuNull(f)
  if (flags === null) throw erreurCritere(critere, 'lib/flags.ts absent de la racine')
  const etat = etatDrapeau(flags)
  if (!etat) throw erreurCritere(critere, refusDrapeau(flags))
  const leve = etat === 'baisse' ? flags.replace(MOTIF_BAISSE, () => MOTIF_LEVE) : flags
  return { racine, tete, remplacements: new Map([[path.resolve(f), leve]]), leveDansCopie: leve.includes(MOTIF_LEVE) && !leve.includes(MOTIF_BAISSE) }
}

// ── L'arbre du mode --temoin : le témoin du lot c posé sur les chemins utiles d'un commit ─────────────────────────────────
export const TEMOIN_C = path.join(C, 'temoin')
export const CHEMINS_ARBRE = ['app', 'lib', 'middleware.ts', 'proxy.ts', 'next.config.mjs', 'tsconfig.json', 'package.json', 'next-env.d.ts']
export function fichiersTemoinC() {
  const m = new Map()
  for (const f of listerFichiers(TEMOIN_C)) {
    const p = posix(f)
    if (!p.endsWith('.temoin')) throw new Error(`témoin : ${p} sans le suffixe .temoin`)
    m.set(p.slice(0, -'.temoin'.length), fs.readFileSync(path.join(TEMOIN_C, f)))
  }
  return m
}
/** git archive <base> -- CHEMINS_ARBRE (rien n'est écrit dans .git), puis le témoin posé dessus. → { dest, poses } */
export async function arbreTemoinC(base, nom = 'temoin-arbre') {
  const { extraireTar } = await import('../a/commun.mjs')
  const dest = exigerSousTravail(path.join(TRAV, nom))
  // Réutilisé s'il porte la même marque (commit, empreinte du témoin) et que chaque fichier posé est intact.
  const temoin = fichiersTemoinC()
  const marque = `${dest}.json`
  const empreinte = sha256(Buffer.from([...temoin].map(([k, b]) => `${k}:${sha256(b)}`).sort().join('\n')))
  try {
    const m = JSON.parse(fs.readFileSync(marque, 'utf8'))
    if (m.base === base && m.empreinte === empreinte && [...temoin].every(([k, b]) => { try { return fs.readFileSync(path.join(dest, k)).equals(b) } catch { return false } })) return { dest, poses: [...temoin.keys()], reutilise: true }
  } catch { /* à refaire */ }
  fs.rmSync(marque, { force: true })
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const tar = path.join(TRAV, `${nom}.tar`)
  const presents = CHEMINS_ARBRE.filter((c) => git(['cat-file', '-e', `${base}:${c}`]).code === 0)
  const r = git(['-c', 'core.autocrlf=false', 'archive', '--format=tar', `--output=${posix(tar)}`, base, '--', ...presents])
  if (r.code !== 0) throw new Error(`git archive ${String(base).slice(0, 7)} : ${court(r.stderr)}`)
  extraireTar(tar, dest)
  fs.rmSync(tar, { force: true })
  const poses = []
  for (const [rel, buf] of temoin) {
    const f = path.join(dest, rel)
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.rmSync(f, { force: true }); fs.writeFileSync(f, buf)
    poses.push(rel)
  }
  fs.writeFileSync(marque, JSON.stringify({ base, empreinte, le: new Date().toISOString() }))
  return { dest, poses, reutilise: false }
}

// ── L'interception : le juge sert les vues et consigne chaque appel ──────────────────────────────────────────────────────
/**
 * scenario : { <cle>: reponse } où <cle> est « direct », « fil », « tresorerie », « reglages », « journal », « jauges »,
 * « salle:<clé> », « agent:<nom> » (ou « agent:* »), « bloc:<bloc> », « packs », « post » ; une réponse est un jeu
 * ({ statut, reponse }) ou une fonction (appel) → jeu ; `retard` (ms) facultatif sur un jeu. `post(appel)` répond aux POST.
 * `laisser` : les clés non servies par le scénario que le vrai serveur sert (route.continue). → { journal, externes, arreter } ;
 * appel = { t, methode, chemin, url, corps, entetes, cle, n }
 */
export async function servir(page, scenario, { origine, delta = null, piege = true, laisser = [] } = {}) {
  const journal = [], externes = []
  const compteurs = new Map()
  const decal = delta ?? (Date.now() - Date.parse(MAINTENANT_JEUX))
  const cleDe = (u) => {
    const p = u.pathname, q = u.searchParams
    if (p === '/api/controle/station') { const v = q.get('vue'); return v === 'salle' ? `salle:${q.get('salle')}` : v === 'agent' ? `agent:${q.get('nom')}` : v === 'fil' && q.get('agent') ? `fil:${q.get('agent')}` : v ?? 'station?' }
    if (p === '/api/controle/station/reglages') return 'reglages'
    if (p === '/api/controle/tresorerie') return 'tresorerie'
    if (p === '/api/controle/journal') return 'journal'
    if (p === '/api/controle/jauges') return 'jauges'
    if (p === '/api/controle/packs') return 'packs'
    if (p === '/api/controle/pilotage' && q.get('bloc')) return `bloc:${q.get('bloc')}`
    return p
  }
  await page.route('**/*', async (route) => {
    const req = route.request()
    let u
    try { u = new URL(req.url()) } catch { return route.abort() }
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue()
    if (`${u.protocol}//${u.host}` !== origine) { externes.push(req.url().slice(0, 200)); return route.abort('blockedbyclient') }
    if (!u.pathname.startsWith('/api/')) return route.continue()
    const methode = req.method()
    let corps = null
    try { corps = req.postData() ? JSON.parse(req.postData()) : null } catch { corps = req.postData() }
    const cle = methode === 'GET' ? cleDe(u) : 'post'
    const n = (compteurs.get(cle) ?? 0) + 1
    compteurs.set(cle, n)
    const appel = { t: Date.now(), methode, chemin: u.pathname + u.search, url: u, corps, entetes: req.headers(), cle, n }
    journal.push(appel)
    let r = scenario[cle] ?? (cle.startsWith('agent:') ? scenario['agent:*'] : undefined) ?? (cle.startsWith('fil:') ? scenario['fil:*'] : undefined)
    if (typeof r === 'function') r = await r(appel)
    // `laisser` : les clés que le vrai serveur sert (racine réelle : la route du rôle tourne pour de vrai), sauf scénario.
    if (!r && laisser.includes(cle)) return route.continue()
    if (!r) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'non servi par le juge' }) })
    if (r.retard) await new Promise((ok) => setTimeout(ok, r.retard))
    const statut = r.statut ?? 200
    const brut = r.brut ? r.reponse : decaler(r.reponse, decal)
    // `sansPiege` sur un jeu : ses textes exacts sont servis sans `_piege` (la fiche du Répondeur, SA-12).
    const reponse = piege && !r.sansPiege && statut < 300 && brut && typeof brut === 'object' ? avecPiege(brut) : brut
    return route.fulfill({ status: statut, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(reponse ?? {}) }).catch(() => {})
  })
  return { journal, externes, compteurs, decal }
}
/** Un jeu d'essai, comme réponse de scénario. */
export const J = (rel, plus = {}) => { const j = jeu(rel); return { statut: j.statut ?? 200, reponse: j.reponse, ...plus } }

// ── Les mesures dans la page ─────────────────────────────────────────────────────────────────────────────────────────────
export const MESURES = String.raw`
window.__JUGE__ = (function () {
  function rect(el) { var r = el.getBoundingClientRect(); return { x: r.x, y: r.y, l: r.width, h: r.height, d: r.right, b: r.bottom } }
  function visible(el) {
    if (!el) return false
    var r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    var x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1)
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false
    var e = document.elementFromPoint(x, y)
    return !!e && (e === el || el.contains(e) || e.contains(el))
  }
  function textesSous(racine, min) {
    var out = [], w = document.createTreeWalker(racine || document.body, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) {
      var n = w.currentNode, t = n.textContent.trim(); if (!t) continue
      var el = n.parentElement; if (!el) continue
      var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
      var r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue
      var fs = parseFloat(cs.fontSize); if (fs < min) out.push(t.slice(0, 40) + ' (' + fs + ' px)')
    }
    return out
  }
  function petitsBoutons(racine, min) {
    var out = []
    ;(racine || document).querySelectorAll('button, a[href], [role="button"], [role="tab"]').forEach(function (el) {
      var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return
      var r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return
      if (el.getAttribute('role') === 'button' && el.hasAttribute('data-agent')) return
      if (r.height < min - 0.5) out.push((el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30) + ' (' + Math.round(r.height) + ' px)')
    })
    return out
  }
  // ── Les débordements (contre-vérification de 026-104) : un conteneur « overflow: hidden » ne cache plus rien au juge. ──
  // Pour un élément ou une ligne de texte, le cadre d'un axe est le plus proche ancêtre, en suivant les blocs conteneurs
  // (absolute : le premier ancêtre positionné ; fixed : le premier qui porte transform, filter, perspective ou contain,
  // sinon l'écran), dont l'overflow de cet axe n'est pas « visible » : il ROGNE (hidden, clip, contain: paint) ou il
  // DÉFILE (auto, scroll). Est un débordement : un rectangle hors de 0..largeur ; un rectangle qui dépasse la boîte de
  // remplissage du cadre qui le rogne (sur l'un ou l'autre axe : le texte coupé ne se voit pas, il manque) ; un cadre
  // « overflow-x: auto|scroll » dont le contenu est plus large que lui (défilement horizontal interdit au téléphone).
  function nomDe(el) {
    if (!el || !el.getAttribute) return String(el)
    var attrs = el.attributes, i
    for (i = 0; i < attrs.length; i++) if (attrs[i].name.indexOf('data-') === 0) return '[' + attrs[i].name + (attrs[i].value ? '="' + attrs[i].value.slice(0, 24) + '"' : '') + ']'
    var c = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : ''
    return el.tagName.toLowerCase() + (c ? '.' + c : '')
  }
  function peint(el) {
    var cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return null
    var r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return null
    return { cs: cs, r: r }
  }
  function contient(s) { return /paint|strict|content/.test(s.contain || '') }
  /** Les cadres d'un élément, axe par axe : { x: { el, rogne }, y: { el, rogne } } (null : l'écran). */
  function cadres(el, soiMeme) {
    var pos = getComputedStyle(el).position, res = { x: null, y: null }, p = soiMeme ? el : el.parentElement, premier = !!soiMeme
    for (; p && p !== document.documentElement && (!res.x || !res.y); p = p.parentElement, premier = false) {
      var s = getComputedStyle(p)
      var bloc = premier || (pos === 'fixed' ? (s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none' || contient(s) || /transform|filter|perspective/.test(s.willChange))
        : pos === 'absolute' ? (s.position !== 'static' || s.transform !== 'none' || s.filter !== 'none' || contient(s)) : true)
      if (!bloc) continue
      var ox = contient(s) && s.overflowX === 'visible' ? 'clip' : s.overflowX, oy = contient(s) && s.overflowY === 'visible' ? 'clip' : s.overflowY
      if (!res.x && ox !== 'visible') res.x = { el: p, rogne: ox === 'hidden' || ox === 'clip' }
      if (!res.y && oy !== 'visible') res.y = { el: p, rogne: oy === 'hidden' || oy === 'clip' }
      pos = s.position
    }
    return res
  }
  function boite(c) { var a = c.getBoundingClientRect(); var g = a.left + c.clientLeft, h = a.top + c.clientTop; return { g: g, d: g + c.clientWidth, h: h, b: h + c.clientHeight, l: c.clientWidth, t: c.clientHeight } }
  /** Le défaut d'un rectangle r (élément ou ligne de texte) dont les cadres sont cs, ou null. */
  function defautRect(r, cs, largeur, quoi) {
    if (r.right > largeur + 1 || r.left < -1) return quoi + ' hors de 0..' + largeur + ' px (' + Math.round(r.left) + ' → ' + Math.round(r.right) + ')'
    var ax = ['x', 'y']
    for (var i = 0; i < 2; i++) {
      var c = cs[ax[i]]
      if (!c || !c.rogne) continue
      var b = boite(c.el)
      if (b.l <= 1 || b.t <= 1) continue // un cadre de 1 px est un texte masqué exprès (lecteurs d'écran), pas un texte coupé
      var dehors = ax[i] === 'x' ? (r.left < b.g - 1 || r.right > b.d + 1) : (r.top < b.h - 1 || r.bottom > b.b + 1)
      if (dehors) return quoi + ' rogné par ' + nomDe(c.el) + ' (' + (ax[i] === 'x' ? Math.round(r.left) + ' → ' + Math.round(r.right) + ' dans ' + Math.round(b.g) + ' → ' + Math.round(b.d) : Math.round(r.top) + ' → ' + Math.round(r.bottom) + ' dans ' + Math.round(b.h) + ' → ' + Math.round(b.b)) + ')'
    }
    return null
  }
  var SANS_TEXTE = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|OPTION|SELECT|TEMPLATE)$/
  function debordements(largeur, sel) {
    var out = [], racine = sel ? document.querySelector(sel) : document.body
    if (!racine) return [sel + ' absent']
    var doc = document.scrollingElement || document.documentElement
    if (doc.scrollWidth > largeur + 1) out.push('la page défile à l’horizontale (scrollWidth ' + doc.scrollWidth + ' > ' + largeur + ')')
    var els = [racine].concat([].slice.call(racine.querySelectorAll('*')))
    for (var i = 0; i < els.length && out.length < 12; i++) {
      var el = els[i]
      if (el.ownerSVGElement) continue
      var v = peint(el); if (!v) continue
      var d = defautRect(v.r, cadres(el, false), largeur, nomDe(el))
      if (d) { out.push(d); continue }
      if ((v.cs.overflowX === 'auto' || v.cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) out.push(nomDe(el) + ' défile à l’horizontale (scrollWidth ' + el.scrollWidth + ' > ' + el.clientWidth + ')')
    }
    // Les lignes de texte : un texte plus large que sa boîte (mot trop long, nowrap) ou coupé par le cadre de son parent.
    var w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT), rg = document.createRange()
    while (w.nextNode() && out.length < 12) {
      var n = w.currentNode, t = n.textContent.trim(); if (!t) continue
      var pe = n.parentElement; if (!pe || SANS_TEXTE.test(pe.tagName) || pe.ownerSVGElement || pe instanceof SVGElement) continue
      if (!peint(pe)) continue
      rg.selectNodeContents(n)
      var rs = rg.getClientRects(), cs = null
      for (var j = 0; j < rs.length; j++) {
        if (rs[j].width < 1 || rs[j].height < 1) continue
        cs = cs || cadres(pe, true)
        var dt = defautRect(rs[j], cs, largeur, '« ' + t.slice(0, 30) + ' » (' + nomDe(pe) + ')')
        if (dt) { out.push(dt); break }
      }
    }
    return out
  }
  /** Chaque élément de sel entièrement visible : rectangle dans 0..largeur et dans son cadre, et elementFromPoint le rend en son centre et à ses deux bords. */
  function entiers(sel, largeur) {
    var out = []
    document.querySelectorAll(sel).forEach(function (el) {
      var v = peint(el)
      if (!v) { out.push(nomDe(el) + ' invisible (aucune boîte)'); return }
      var d = defautRect(v.r, cadres(el, false), largeur, nomDe(el))
      if (d) { out.push(d); return }
      var y = v.r.top + v.r.height / 2
      var xs = [v.r.left + Math.min(2, v.r.width / 2), v.r.left + v.r.width / 2, v.r.right - Math.min(2, v.r.width / 2)]
      for (var k = 0; k < 3; k++) {
        var e = document.elementFromPoint(Math.min(Math.max(xs[k], 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1))
        if (!e || !(e === el || el.contains(e))) { out.push(nomDe(el) + ' recouvert ou coupé en x ' + Math.round(xs[k]) + ' (elementFromPoint rend ' + nomDe(e) + ')'); break }
      }
    })
    return out
  }
  /** Le fond d'une feuille : opaque si son background-color calculé (ou celui d'un descendant qui la couvre toute) a un alpha de 1, et si aucune opacité ne la rend translucide. */
  function fondOpaque(sel) {
    var f = document.querySelector(sel)
    if (!f) return { ok: false, detail: sel + ' absent' }
    var alpha = function (c) { var m = /rgba?\(([^)]*)\)/.exec(c || ''); if (!m) return c === 'transparent' ? 0 : 1; var p = m[1].split(/[\s,\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) * (/%$/.test(p[3]) ? 0.01 : 1) : 1 }
    var op = 1
    for (var p = f; p; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity)
    var rf = f.getBoundingClientRect(), fonds = []
    var candidats = [f].concat([].slice.call(f.querySelectorAll('*')).slice(0, 400))
    for (var i = 0; i < candidats.length; i++) {
      var c = candidats[i], cs = getComputedStyle(c), r = c.getBoundingClientRect()
      if (c !== f && (r.left > rf.left + 1 || r.top > rf.top + 1 || r.right < rf.right - 1 || r.bottom < rf.bottom - 1)) continue
      var a = alpha(cs.backgroundColor)
      fonds.push(nomDe(c) + ' ' + cs.backgroundColor)
      if (a >= 0.999 && op >= 0.999) return { ok: true, detail: 'fond opaque ' + cs.backgroundColor + ' sur ' + nomDe(c) }
    }
    return { ok: false, detail: 'feuille translucide : ' + (op < 0.999 ? 'opacité ' + op.toFixed(2) + ' ; ' : '') + (fonds.join(', ') || 'aucun fond') + ' — le texte d’en dessous se lit à travers' }
  }
  function animations(sel) {
    var racine = sel ? document.querySelector(sel) : document.body
    if (!racine) return []
    return document.getAnimations().filter(function (a) { var t = a.effect && a.effect.target; return a.playState === 'running' && t && (racine === t || racine.contains(t)) }).map(function (a) { var t = a.effect.target; return (a.animationName || a.transitionProperty || 'animation') + ' sur ' + (t.getAttribute && (t.getAttribute('data-zone') || t.className) || t.tagName) })
  }
  function empreinteCanevas() {
    var cs = document.querySelectorAll('[data-station-carte] canvas, [data-station] canvas')
    if (!cs.length) return 'aucun canevas'
    var h = 0
    cs.forEach(function (c) { try { var d = c.toDataURL('image/png'); for (var i = 0; i < d.length; i += 7) h = (h * 31 + d.charCodeAt(i)) | 0 } catch (e) { h = h ^ 1 } })
    return String(h)
  }
  function images() { var c = document.querySelector('[data-station-carte]'); return c ? c.getAttribute('data-images') : null }
  function texte(sel) { var e = typeof sel === 'string' ? document.querySelector(sel) : sel; return e ? e.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : null }
  return { rect: function (s) { var e = document.querySelector(s); return e ? rect(e) : null }, visible: function (s) { return visible(typeof s === 'string' ? document.querySelector(s) : s) }, textesSous: function (min, s) { return textesSous(s ? document.querySelector(s) : document.body, min) }, petitsBoutons: function (min, s) { return petitsBoutons(s ? document.querySelector(s) : document, min) }, debordements: debordements, entiers: entiers, fondOpaque: fondOpaque, animations: animations, empreinteCanevas: empreinteCanevas, images: images, texte: texte }
})()
`

// ── Les captures ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let jpeg = null
/** Écart type de la luminance et dimensions d'un JPEG, mesurés par le juge sur les octets écrits. */
export function analyserJpeg(buf) {
  jpeg ??= requireDepot('jpeg-js')
  const im = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 })
  let n = 0, s = 0, s2 = 0
  for (let i = 0; i < im.data.length; i += 4 * 3) { const y = 0.299 * im.data[i] + 0.587 * im.data[i + 1] + 0.114 * im.data[i + 2]; s += y; s2 += y * y; n++ }
  const m = s / n
  return { largeur: im.width, hauteur: im.height, ecartType: Math.sqrt(Math.max(0, s2 / n - m * m)) }
}
export async function capturer(page, fichier) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true })
  fs.rmSync(fichier, { force: true }) // l'image d'avant est effacée : seule compte celle que le juge prend maintenant
  await page.screenshot({ path: fichier, type: 'jpeg', quality: 82, fullPage: false })
  const buf = fs.readFileSync(fichier)
  return { fichier, octets: buf.length, empreinte: sha256(buf), ...analyserJpeg(buf) }
}
/** Les défauts d'une capture : 10 Ko à 1,5 Mo, non uniforme (écart type ≥ 4), dimensions attendues. */
export function defautsCapture(c, { largeur, hauteur }) {
  const e = []
  if (!c) return ['capture absente']
  if (c.octets < 10 * 1024) e.push(`${path.basename(c.fichier)} : ${c.octets} octets, 10 Ko au moins`)
  if (c.octets > 1.5 * 1024 * 1024) e.push(`${path.basename(c.fichier)} : ${c.octets} octets, 1,5 Mo au plus`)
  if (!(c.ecartType >= 4)) e.push(`${path.basename(c.fichier)} : image uniforme (écart type ${c.ecartType.toFixed(2)})`)
  if (c.largeur !== largeur || c.hauteur !== hauteur) e.push(`${path.basename(c.fichier)} : ${c.largeur}×${c.hauteur}, ${largeur}×${hauteur} attendu`)
  return e
}
