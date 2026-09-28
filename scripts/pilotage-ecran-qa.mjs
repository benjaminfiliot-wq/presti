// scripts/pilotage-ecran-qa.mjs — le juge d'écran de la station Mission Control (fiche 026-104, écrit par Claude Code).
//
//   node scripts/pilotage-ecran-qa.mjs --partie=station|vues|salles|salles-suite|fil|gestes|experience
//        [--racine=<d>] [--temoin] [--base=<commit>] [--graine=<n>]
//
// Une partie par fiche jugée : station (026-111, ST), vues (026-113, VU), salles (026-120, SA), salles-suite (026-164, SB),
// fil (026-123, FL), gestes (026-117, EG), experience (026-125, EX). `--partie=carte` n'existe plus (décision Claw3D du
// 25/09) : code 2, la carte se juge par scripts/station-ecran-qa.mjs (026-172) et scripts/station-claw3d-qa.mjs (026-170).
//
// Les cinq règles de la méthode (mémoires et rectification §4.0, §4.8) :
//   · le juge capture lui-même : bureau.jpg (1440×900) et telephone.jpg (390×844), prises par CE script dans Chromium
//     (celui de presti, node_modules/playwright), l'image déjà présente au même chemin effacée avant ; refusées sous 10 Ko,
//     au-delà de 1,5 Mo, uniformes (écart type des pixels sous 4, mesuré par le juge), égales entre elles ou à celles d'une
//     autre partie ;
//   · une preuve vide est un mensonge ; la visibilité se mesure par elementFromPoint au centre de l'élément ;
//   · une propriété géométrique se mesure par la géométrie (getBoundingClientRect), jamais en comptant des pixels ; au
//     téléphone (390 px), un conteneur « overflow: hidden » ne cache rien au juge : tout élément ou ligne de texte hors de
//     0..390, ou qui dépasse la boîte du cadre qui le rogne, est un débordement, et un conteneur « overflow-x: auto|scroll »
//     plus large que lui est un défilement horizontal interdit (c/commun.mjs MESURES, debordements et entiers) ; une feuille
//     du téléphone est OPAQUE (alpha du fond calculé = 1 : rien de la station ne se lit à travers, fondOpaque) ;
//   · rien ne bouge sans un événement : sans changement servi, le compteur `data-images` de [data-station-carte],
//     l'empreinte des pixels de ses canevas et document.getAnimations() limité à la station restent constants 3 s durant ;
//     un événement injecté (fil-injection.json) se voit avant t + 10 s.
//
// Les données sont CONNUES : le juge sert lui-même, depuis scripts/fixtures/026-pilotage/c/jeux/ (au contrat de
// s/contrat-vues.mjs et de c/contrat-blocs.mjs), GET /api/controle/station?vue=…, /station/reglages, /tresorerie,
// /journal?limite=1, /jauges, /packs et /pilotage?bloc=…, tirés au hasard à chaque passage (graine affichée, --graine la
// rejoue) ; il intercepte et consigne chaque POST (chemin, corps, en-têtes) et répond selon le scénario ; toute requête du
// navigateur vers un autre hôte que la page servie est refusée, relevée sur CHAQUE page ouverte par la partie, et fait
// échouer le critère désigné de la partie (piège réseau du navigateur : ST-13, VU-8, SA-12, SB-6, FL-10, EG-12, EX-1).
// Les cadences se jugent horloge de la page avancée, bornées des deux côtés (ni trop souvent, ni figé : au moins une
// relecture par période). Aucun `_piege` (« Jean Témoin », 06 12 34 56 78, jean.temoin@exemple.invalid), posé par le juge dans
// chaque réponse, ne doit s'afficher ; un texte `<img src=x onerror=alert(1)>` servi doit s'afficher tel quel (une boîte
// `alert` ouverte par la page est relevée et fait échouer le critère des pièges).
//
// Trois façons de servir la page (les critères sont les mêmes) :
//   · racine réelle (sans --racine ni --temoin) : `next dev` sur la copie au drapeau levé (b/commun.mjs serveurCopie :
//     .env.local lu sans rien afficher), le compte fondateur d'essai créé et supprimé dans un finally, sa session posée
//     dans le navigateur ; la route du rôle (/api/controle/journal) tourne pour de vrai ; plus les critères qui ne se
//     jugent que là : le typecheck, l'arbre réel drapeau baissé. Captures dans .orchestre/preuves/<fiche jugée>/.
//     LIMITE CONNUE (contre-vérification de 026-104, 28/09) : ce mode n'est prouvé par AUCUNE preuve à ce jour ; la preuve
//     du lot c (juges-026-pilotage-preuve --lot=c) ne juge que le banc. Il écrit un compte fondateur d'essai en production
//     (purgé dans un finally) : son premier passage attend l'accord écrit de Benj et se fait au plus tard avec 026-111,
//     log versé dans .orchestre/preuves/026-111/. Voir .orchestre/preuves/026-104/mode-reel.md.
//   · --racine=<d> : le banc (c/banc.mjs) sert, sur 127.0.0.1 et sans réseau, les layouts et la page de la racine lue au
//     drapeau levé (c/commun.mjs vueDrapeau) ; c'est ainsi que la preuve (juges-026-pilotage-preuve.mjs --lot=c) juge la
//     référence, le témoin du lot c et ses sabotages. Captures sous .orchestre/travail/pilotage-ecran/captures/.
//   · --temoin : le juge prouve son harnais (JC-2 de 026-104) : il capture lui-même l'onglet Aujourd'hui existant du Poste
//     (/controle?onglet=aujourdhui, servi par le banc depuis la racine réelle) à 390×844 et à 1440×900, et prouve ses trois
//     témoins d'immobilité sur une page d'essai qu'il sert lui-même (un canevas immobile : constants ; un canevas animé :
//     compteur et empreinte changent) ; il contrôle aussi que les jeux de la partie passent le contrat.
// Si le premier critère d'une partie échoue (fichiers absents), aucun navigateur n'est lancé et le reste est « non jugé ».
// Les scénarios d'une partie sont indépendants (une page, un contexte chacun) : ils tournent PILOTAGE_ECRAN_PARALLELE à la
// fois (4 par défaut ; 1 les rejoue l'un après l'autre), pour que la preuve du lot tienne dans les 30 min de l'orchestre.
//
// Sortie « ✅ ID … » / « ❌ ID … », puis « pilotage-ecran-qa --partie=<p> : PASS|FAIL ». Code 0, 1, ou 2 (appel invalide,
// ou partie retirée). N'écrit que sous .orchestre/travail/pilotage-ecran/ et, sur la racine réelle, les captures dans
// .orchestre/preuves/<fiche jugée>/. Ne lit ni .env.local ni presti-secrets hors du mode racine réelle.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { court, premiereLigne, lireOptions, creerSortie, sansCommentaires, listerFichiers, typecheck, lsTree } from './fixtures/026-pilotage/a/commun.mjs'
import {
  R, TRAV, jeu, J, servir, MESURES, capturer, defautsCapture, vueDrapeau, copieDrapeau, supprimerCopie, euros, heureParis, dateParis, relTime,
  espaces, hasard, PIEGE, PIEGE_HTML, sha256, posix, erreurCritere, git, MAINTENANT_JEUX, avecPiege,
} from './fixtures/026-pilotage/c/commun.mjs'
import { tirerDirect, tirerTresorerie, tirerSources } from './fixtures/026-pilotage/c/tirages.mjs'
import { demarrerBanc } from './fixtures/026-pilotage/c/banc.mjs'

const JUGE = 'pilotage-ecran-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['partie', 'base', 'graine', 'serveur'] })
const refuser = (m, code = 2) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(code) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const PARTIE = o.valeurs.partie
if (PARTIE === 'carte') refuser('partie retirée par la décision Claw3D du 25/09 : scripts/station-ecran-qa.mjs (026-172)')
const PARTIES = {
  station: { fiche: '026-111', premier: 'ST-1', ids: ['ST-1', 'ST-2', 'ST-3', 'ST-4', 'ST-5', 'ST-6', 'ST-7', 'ST-8', 'ST-9', 'ST-10', 'ST-11', 'ST-12', 'ST-13', 'ST-14', 'ST-15', 'ST-16', 'ST-17', 'ST-18', 'ST-19'] },
  vues: { fiche: '026-113', premier: 'VU-1', ids: ['VU-1', 'VU-2', 'VU-3', 'VU-4', 'VU-5', 'VU-6', 'VU-7', 'VU-8', 'VU-9'] },
  salles: { fiche: '026-120', premier: 'SA-1', ids: ['SA-1', 'SA-2', 'SA-3', 'SA-4', 'SA-5', 'SA-6', 'SA-19', 'SA-7', 'SA-8', 'SA-9', 'SA-10', 'SA-11', 'SA-12', 'SA-13', 'SA-15', 'SA-16', 'SA-17', 'SA-18', 'SA-20', 'SA-14'] },
  'salles-suite': { fiche: '026-164', premier: 'SB-1', ids: ['SB-1', 'SB-2', 'SB-3', 'SB-4', 'SB-5', 'SB-6', 'SB-7', 'SB-8'] },
  fil: { fiche: '026-123', premier: 'FL-1', ids: ['FL-1', 'FL-2', 'FL-3', 'FL-4', 'FL-5', 'FL-6', 'FL-7', 'FL-8', 'FL-9', 'FL-10', 'FL-11', 'FL-13', 'FL-14', 'FL-12'] },
  gestes: { fiche: '026-117', premier: 'EG-1', ids: ['EG-1', 'EG-2', 'EG-3', 'EG-4', 'EG-5', 'EG-6', 'EG-7', 'EG-8', 'EG-9', 'EG-15', 'EG-10', 'EG-11', 'EG-13', 'EG-14', 'EG-12'] },
  experience: { fiche: '026-125', premier: 'EX-1', ids: ['EX-1', 'EX-2', 'EX-3', 'EX-4', 'EX-5', 'EX-6', 'EX-7', 'EX-8', 'EX-9'] },
}
if (!PARTIES[PARTIE]) refuser(`--partie=<${Object.keys(PARTIES).join('|')}> attendu, reçu : ${PARTIE ?? 'rien'}`)
const P = PARTIES[PARTIE]
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
const RAC = o.racine
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
const MODE = o.temoin ? 'temoin' : o.racineParDefaut ? 'vivant' : 'banc'
const H = hasard(o.valeurs.graine ? Number(o.valeurs.graine) : undefined)
const PARALLELE = Math.max(1, Math.min(8, Number(process.env.PILOTAGE_ECRAN_PARALLELE) || 4))
function commitBase() {
  const v = o.valeurs.base || process.env.JUGE_BASE_GIT || 'HEAD'
  if (!/^[\w.^~/-]{1,80}$/.test(v)) refuser(`--base « ${v} » : un commit attendu`)
  const r = git(['rev-parse', '--verify', `${v}^{commit}`])
  if (r.code !== 0) refuser(`--base « ${v} » introuvable : ${court(r.stderr)}`)
  return r.stdout.trim()
}
const BASE = commitBase()
// L'arbre de la base, lu une fois (git ls-tree) : un fichier de la racine identique blob pour blob à la base (empreinte git
// calculée ici) n'a rien ajouté, sans lancer git show ; seuls les fichiers qui diffèrent sont relus dans la base.
let ARBRE_BASE = null
const arbreBase = () => (ARBRE_BASE ??= (() => { try { return lsTree(BASE) } catch { return new Map() } })())
const blobGit = (buf) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex')
const lireBase = (rel) => { if (!arbreBase().has(rel)) return null; const r = git(['show', `${BASE}:${rel}`], { binaire: true }); return r.code === 0 ? r.stdout.toString('utf8') : null }
const identiqueBase = (rel) => { const e = arbreBase().get(rel); if (!e) return false; try { return blobGit(fs.readFileSync(path.join(RAC, rel))) === e.sha } catch { return false } }
const NOM = `${JUGE} --partie=${PARTIE}`

// ── Lecture des sources de la racine ─────────────────────────────────────────────────────────────────────────────────────
const ST = 'app/controle/station'
const lire = (rel) => { try { return fs.readFileSync(path.join(RAC, rel), 'utf8') } catch { return null } }
const existe = (rel) => fs.existsSync(path.join(RAC, rel))
const code = (rel) => { const s = lire(rel); return s === null ? null : sansCommentaires(s) }
const fichiersSous = (rel) => { const d = path.join(RAC, rel); return fs.existsSync(d) ? [...listerFichiers(d)].map((f) => `${rel}/${posix(f)}`) : [] }
/** Les chemins passés à apiDirection( dans un source (chaînes et gabarits, jusqu'au premier ${ ou ?). */
function appelsApi(src) {
  const out = []
  for (const m of String(src).matchAll(/apiDirection(?:<[^>]*>)?\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g)) out.push(m[2])
  return out
}
/** Chaque adresse '/api/…' écrite en littéral dans un source (chaîne ou gabarit), quel que soit l'appel qui la reçoit. */
function adressesApi(src) {
  const out = []
  for (const m of String(src).matchAll(/(['"`])(\/api\/(?:(?!\1)[^\\\n]|\\.)*)\1/g)) out.push(m[2])
  return out
}
const RE_HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/
/** Les lignes ajoutées depuis la base (git diff --no-index de chaque fichier, ou fichier entier s'il est neuf). */
function lignesAjoutees(rel) {
  if (identiqueBase(rel)) return []
  const avant = lireBase(rel), apres = lire(rel)
  if (apres === null) return []
  if (avant === null) return apres.split(/\r?\n/)
  const a = new Map()
  for (const l of avant.split(/\r?\n/)) a.set(l, (a.get(l) ?? 0) + 1)
  const out = []
  for (const l of apres.split(/\r?\n/)) { const n = a.get(l) ?? 0; if (n > 0) a.set(l, n - 1); else out.push(l) }
  return out
}
/** Chaque `transition` ou `animation` d'une feuille a sa garde prefers-reduced-motion. */
function gardeMouvement(css, nom) {
  if (css === null) return [`${nom} absent`]
  const s = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const gardes = [...s.matchAll(/@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g)]
  const hors = s.replace(/@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
  const mouvements = [...hors.matchAll(/(?:^|[;{\s])(transition|animation)(?:-[a-z-]+)?\s*:\s*(?!none\b)[^;}]+/g)].map((m) => m[0].trim())
  if (mouvements.length && !gardes.length) return [`${nom} : ${mouvements.length} transition(s) ou animation(s) sans garde prefers-reduced-motion (${court(mouvements[0], 60)})`]
  if (mouvements.length && !gardes.some((g) => /(?:animation|transition)\s*:\s*none/.test(s.slice(g.index, g.index + 600)))) return [`${nom} : la garde prefers-reduced-motion ne coupe ni animation ni transition`]
  return []
}
const hexDans = (src) => { const m = String(src ?? '').replace(/\/\*[\s\S]*?\*\//g, '').match(new RegExp(RE_HEX.source, 'g')); return m ?? [] }
/** Les défauts statiques communs d'un fichier d'écran : ni fetch(, ni supabase, ni dangerouslySetInnerHTML. */
function interditsSource(rel, { fetch = true, supabase = true, html = true } = {}) {
  const s = code(rel)
  if (s === null) return []
  const e = []
  if (fetch && /\bfetch\(/.test(s)) e.push(`${rel} contient fetch(`)
  if (supabase && /supabase/i.test(s)) e.push(`${rel} contient supabase`)
  if (html && /dangerouslySetInnerHTML/.test(s)) e.push(`${rel} contient dangerouslySetInnerHTML`)
  return e
}

// ── Les écrans : le serveur, le navigateur, les pages ────────────────────────────────────────────────────────────────────
const PAGE_STATION = { prefixes: ['/controle/station'], layouts: ['app/controle/layout.tsx', `${ST}/layout.tsx`], page: `${ST}/page.tsx` }
const PAGE_POSTE = { prefixes: ['/controle'], layouts: ['app/controle/layout.tsx'], page: 'app/controle/page.tsx', precharger: false }
const SESSION_BANC = { access_token: 'jeton-du-banc', token_type: 'bearer', user: { id: '90000000-0000-4000-8000-00000000f001', user_metadata: { prenom: 'Benj' } } }
// Les minuteries de la page, relevées par le juge (SA-19 : rien ne se recalcule panneau fermé) : setInterval et setTimeout
// enveloppés, le nombre d'intervalles actifs exposé par window.__JUGE_MINUTERIES__().
const MINUTERIES = String.raw`
(function () {
  var actifs = new Set(), si = window.setInterval, ci = window.clearInterval
  window.setInterval = function (f, ms) { var id = si.apply(window, arguments); actifs.add(id); return id }
  window.clearInterval = function (id) { actifs.delete(id); return ci.apply(window, arguments) }
  window.__JUGE_MINUTERIES__ = function () { return actifs.size }
})()
`
let SERVEUR = null // { base, session, arreter, mode }
// Le piège réseau du navigateur, relevé ICI pour toutes les parties (contre-vérification de 026-104 : seules station et
// vues le relevaient, et encore sur un seul scénario) : chaque page servie par ouvrir() ou par outils.servir est suivie ;
// à la fin de la partie, toute requête refusée hors de la page servie est une faute du critère désigné de la partie.
const SERVIS = []
const RESEAU = { station: 'ST-13', vues: 'VU-8', salles: 'SA-12', 'salles-suite': 'SB-6', fil: 'FL-10', gestes: 'EG-12', experience: 'EX-1' }
async function servirSuivi(page, scenario, options) { const s = await servir(page, scenario, options); SERVIS.push(s); return s }
async function preparerPage(page, { session = true, localStorageQuiLeve = false, minuteries = false } = {}) {
  await page.addInitScript(MESURES)
  if (minuteries) await page.addInitScript(MINUTERIES)
  if (MODE !== 'vivant' || !SERVEUR?.cleLocale) await page.addInitScript((s) => { window.__BANC__ = Object.assign(window.__BANC__ || {}, { session: s }) }, session ? SESSION_BANC : null)
  else if (session) await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v) } catch { /* fermé */ } }, [SERVEUR.cleLocale, SERVEUR.sessionJson])
  if (localStorageQuiLeve) await page.addInitScript(() => { const f = () => { throw new Error('stockage fermé (piège du juge)') }; try { Object.defineProperty(window, 'localStorage', { get: f, configurable: true }) } catch { /* déjà figé */ } })
}
async function servirPageEssai() {
  const pages = {
    immobile: '<canvas width="200" height="100" id="c"></canvas><script>var c=document.getElementById("c").getContext("2d");c.fillStyle="#3EE0F0";c.fillRect(10,10,80,40)</script>',
    anime: '<style>@keyframes t{from{transform:rotate(0)}to{transform:rotate(360deg)}}#b{width:20px;height:20px;background:#8A6BFF;animation:t 1s linear infinite}</style><div id="b"></div><canvas width="200" height="100" id="c"></canvas><script>var n=0,cv=document.getElementById("c"),c=cv.getContext("2d");function f(){n++;c.clearRect(0,0,200,100);c.fillStyle="#3EE0F0";c.fillRect(n%180,10,20,40);document.querySelector("[data-station-carte]").setAttribute("data-images",String(n));requestAnimationFrame(f)}requestAnimationFrame(f)</script>',
  }
  const srv = http.createServer((req, res) => {
    const cas = req.url.slice(1)
    res.writeHead(pages[cas] ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(pages[cas] ? `<!doctype html><html><body><div data-station><div data-station-carte data-images="0">${pages[cas]}</div></div></body></html>` : 'introuvable')
  })
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
  return { base: `http://127.0.0.1:${srv.address().port}`, arreter: () => new Promise((ok) => srv.close(() => ok())) }
}
/** Les trois témoins d'immobilité relevés `duree` ms, après `attente` ms sans événement. */
async function immobilite(page, { attente = 3000, duree = 3000, sel = '[data-station]' } = {}) {
  if (attente) await page.waitForTimeout(attente)
  const images = new Set(), empreintes = new Set()
  let animations = 0, premiere = null
  const pas = Math.max(250, Math.floor(duree / 8))
  for (let t = 0; t <= duree; t += pas) {
    const r = await page.evaluate((s) => ({ i: window.__JUGE__.images(), e: window.__JUGE__.empreinteCanevas(), a: window.__JUGE__.animations(s) }), sel)
    images.add(String(r.i)); empreintes.add(r.e)
    if (r.a.length) { animations++; premiere ??= r.a[0] }
    if (t + pas <= duree) await page.waitForTimeout(pas)
  }
  const constant = images.size === 1 && empreintes.size === 1 && animations === 0
  return { constant, images, empreintes, animations, detail: `data-images ${[...images].join('→')}, ${empreintes.size} empreinte(s) du canevas, ${animations ? `animation en cours : ${premiere}` : 'aucune animation en cours'}` }
}

// ── Les captures : racine réelle → .orchestre/preuves/<fiche jugée>/ ; banc → sous .orchestre/travail/ ─────────────────
function dossierCaptures(partie = PARTIE) {
  if (MODE === 'vivant') return path.join(R, '.orchestre', 'preuves', PARTIES[partie].fiche)
  return path.join(TRAV, 'captures', sha256(Buffer.from(path.resolve(RAC).toLowerCase())).slice(0, 12), partie)
}
function cheminCapture(nom) { return path.join(dossierCaptures(), nom) }
/** Les captures d'une partie doivent différer de celles des autres parties (même racine). */
function autresParties(captures) {
  const e = []
  for (const autre of Object.keys(PARTIES)) {
    if (autre === PARTIE) continue
    for (const nom of ['bureau.jpg', 'telephone.jpg']) {
      const f = path.join(dossierCaptures(autre), nom)
      let buf = null
      try { buf = fs.readFileSync(f) } catch { continue }
      const emp = sha256(buf)
      for (const c of Object.values(captures)) if (c && c.empreinte === emp) e.push(`${path.basename(c.fichier)} identique à ${nom} de la partie ${autre}`)
    }
  }
  return e
}
/** Les deux captures d'une partie (bureau.jpg, telephone.jpg) : bornes, uniformité, différentes entre elles et des autres. */
function jugerCaptures(captures) {
  const e = [...defautsCapture(captures.bureau, { largeur: 1440, hauteur: 900 }), ...defautsCapture(captures.telephone, { largeur: 390, hauteur: 844 })]
  if (captures.bureau && captures.telephone && captures.bureau.empreinte === captures.telephone.empreinte) e.push('bureau.jpg et telephone.jpg identiques')
  e.push(...autresParties(captures))
  const detail = Object.values(captures).filter(Boolean).map((c) => `${path.basename(c.fichier)} ${c.largeur}×${c.hauteur}, ${Math.round(c.octets / 1024)} Ko, écart type ${c.ecartType.toFixed(1)}`).join(' ; ') + ' — prises par le juge, différentes entre elles et des autres parties'
  return { echecs: e, detail }
}
/** La racine telle quelle, drapeau baissé : le banc sans remplacement, ou le serveur de l'arbre réel. */
async function demarrerBaisse() {
  if (MODE === 'vivant') {
    const { serveur } = await import('./lib/capture.mjs')
    const s = await serveur(R)
    return { mode: 'vivant', base: s.base, arreter: s.arreter }
  }
  const banc = await demarrerBanc({ racine: RAC, pages: { station: PAGE_STATION, poste: PAGE_POSTE } })
  return { mode: 'banc', base: banc.base, arreter: () => banc.arreter() }
}
/** SALLES de lib/pilotage/equipage.ts de la racine (026-070), clé → plaque, lue dans le source (aucune exécution). */
function plaques() {
  const s = lire('lib/pilotage/equipage.ts') ?? ''
  const i = s.indexOf('SALLES')
  return Object.fromEntries([...s.slice(i < 0 ? 0 : i).matchAll(/cle:\s*['"]([\w-]+)['"],\s*plaque:\s*['"]([^'"]+)['"]/g)].map((m) => [m[1], m[2]]))
}

// ── Démarrer le serveur de la partie (banc ou next dev) et le navigateur ─────────────────────────────────────────────────
async function demarrer({ critere, pages = { station: PAGE_STATION } }) {
  const { chromium } = await import('playwright')
  const nav = await chromium.launch()
  if (MODE === 'vivant') {
    const { serveurCopie, avecComptes } = await import('./fixtures/026-pilotage/b/commun.mjs')
    const copie = copieDrapeau(R, { critere, jonctions: true })
    const srv = await serveurCopie(copie.dest, { critere })
    // Le compte fondateur d'essai : créé ici, supprimé dans le finally du juge (arreter).
    let compte = null, fin = null, liberer = null
    const pret = new Promise((ok, ko) => { fin = avecComptes(['direction'], async ({ direction }) => { compte = direction; ok(); await new Promise((f) => { liberer = f }) }); fin.then((r) => { if (!compte) ko(r?.erreur ?? new Error('compte fondateur d’essai non créé')) }) })
    try { await pret } catch (e) { await nav.close().catch(() => {}); await srv.arreter(); supprimerCopie(copie.dest); throw erreurCritere(critere, `compte fondateur d’essai : ${premiereLigne(e)}`) }
    const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^https?:\/\//, '').split('.')[0]
    SERVEUR = {
      mode: 'vivant', base: srv.base, nav, cleLocale: `sb-${ref}-auth-token`, sessionJson: JSON.stringify(compte.sess), copie,
      arreter: async () => { await nav.close().catch(() => {}); liberer?.(); const r = await fin; await srv.arreter(); supprimerCopie(copie.dest); if (r && r.menage === false) console.log(`${JUGE} : ménage du compte d'essai en échec`) },
    }
  } else {
    const vue = vueDrapeau(RAC, { critere })
    const banc = await demarrerBanc({ racine: vue.racine, remplacements: vue.remplacements, pages })
    SERVEUR = { mode: 'banc', base: banc.base, nav, banc, vue, arreter: async () => { await nav.close().catch(() => {}); await banc.arreter() } }
  }
  return SERVEUR
}
/**
 * Une page à la taille dite, le scénario servi, l'adresse ouverte. → { page, ctx, s (journal), erreurs, dialogues, fermer }
 * Chaque boîte ouverte par la page (alert, confirm, prompt) est relevée dans `dialogues` et refermée.
 */
async function ouvrir(chemin, scenario, { largeur = 1440, hauteur = 900, mobile = false, session = true, reduit = false, horloge = null, localStorageQuiLeve = false, minuteries = false, attendre = '[data-station]', contexte = null, avantNavigation = null, heureFigee = null } = {}) {
  const ctx = contexte ?? await SERVEUR.nav.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Europe/Paris', reducedMotion: reduit ? 'reduce' : 'no-preference', ...(mobile ? { isMobile: true, hasTouch: true } : {}) })
  const page = await ctx.newPage()
  const erreurs = [], dialogues = []
  page.on('pageerror', (e) => erreurs.push(premiereLigne(e)))
  page.on('dialog', (d) => { dialogues.push(`${d.type()} « ${d.message()} »`); d.dismiss().catch(() => {}) })
  await preparerPage(page, { session, localStorageQuiLeve, minuteries })
  if (horloge) await page.clock.install({ time: horloge })
  // heureFigee : Date.now() rendu fixe (les minuteries tournent) ; les jeux sont alors datés relativement à cette heure.
  if (heureFigee) await page.clock.setFixedTime(heureFigee)
  const s = await servirSuivi(page, scenario, { origine: SERVEUR.base, laisser: MODE === 'vivant' ? ['journal'] : [], ...(heureFigee ? { delta: heureFigee - Date.parse(MAINTENANT_JEUX) } : {}) })
  if (avantNavigation) await avantNavigation(page)
  await page.goto(`${SERVEUR.base}${chemin}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (attendre) await page.waitForSelector(attendre, { timeout: 30_000 }).catch(() => {})
  return { page, ctx, s, erreurs, dialogues, fermer: async () => { if (!contexte) await ctx.close().catch(() => {}); else await page.close().catch(() => {}) } }
}
/**
 * Les scénarios d'une partie, PARALLELE à la fois : [{ ids, nom, f }]. Chacun exerce ses critères (vu) même sans faute ;
 * son interruption est une faute de chacun de ses critères ; sa durée va sur stderr avec PILOTAGE_ECRAN_CHRONO=1.
 */
async function enParallele(file, n = PARALLELE) {
  // PILOTAGE_ECRAN_SCENARIOS=<motif> ne joue que les scénarios dont le nom le contient (mise au point : les autres critères
  // restent « non jugé », la partie ne peut pas passer ainsi).
  const motif = process.env.PILOTAGE_ECRAN_SCENARIOS
  const reste = motif ? file.filter((s) => s.nom.includes(motif)) : [...file]
  const un = async () => {
    while (reste.length) {
      const { ids, nom, f } = reste.shift()
      const t0 = Date.now()
      try { await f() } catch (e) { for (const id of ids) faute(id, `scénario « ${nom} » interrompu : ${premiereLigne(e)}`) }
      finally { for (const id of ids) vu(id); if (process.env.PILOTAGE_ECRAN_CHRONO) process.stderr.write(`[chrono] ${nom} : ${((Date.now() - t0) / 1000).toFixed(1)} s\n`) }
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, file.length) }, un))
}
/** Les pièges dans un morceau de page : aucun champ `_piege` affiché ; aucune image créée par un texte servi. */
async function piegesDans(page, sel = 'body', { html = true } = {}) {
  const r = await page.evaluate(([s, p]) => {
    const racine = document.querySelector(s)
    if (!racine) return { absent: true }
    const t = racine.innerText.replace(/[  ]/g, ' ')
    return { absent: false, trouves: p.filter((x) => t.includes(x)), images: [...racine.querySelectorAll('img')].filter((i) => /(^|\/)x$/.test(i.getAttribute('src') ?? '') || i.hasAttribute('onerror')).length, texteHtml: t.includes('<img src=x onerror=alert(1)>') }
  }, [sel, [PIEGE.nom, PIEGE.telephone, PIEGE.email]])
  if (r.absent) return { echecs: [`${sel} absent : pièges non relevés`], texteHtml: false }
  const e = []
  for (const x of r.trouves) e.push(`${sel} affiche le piège « ${x} » (champ _piege)`)
  if (r.images) e.push(`${sel} : ${r.images} élément(s) img créé(s) par un texte servi`)
  return { echecs: e, texteHtml: r.texteHtml && html }
}
/** Boutons et liens d'un morceau de page dont le texte ou l'aria-label porte un mot interdit (casse libre). */
async function gestesInterdits(page, sel, mots) {
  return page.evaluate(([s, m]) => {
    const re = new RegExp(m.join('|'), 'i')
    return [...document.querySelectorAll(`${s} button, ${s} a, ${s} [role="button"]`)].map((e) => `${e.textContent ?? ''} ${e.getAttribute('aria-label') ?? ''}`.trim()).filter((t) => re.test(t))
  }, [sel, mots])
}
/**
 * Une feuille à 390×844 : plein écran (géométrie) et OPAQUE (alpha du fond calculé = 1, sur elle ou sur un descendant qui
 * la couvre toute : rien de la station ne se lit à travers) ; dans la feuille, rien hors de 0..390, rien de rogné par un
 * cadre « overflow: hidden », aucun défilement horizontal (ni de la page, ni d'un conteneur) ; boutons ≥ 44 px, textes ≥ 12 px.
 */
async function feuilleTelephone(page, sel, { textes = true } = {}) {
  const m = await page.evaluate(([s, t]) => ({ r: window.__JUGE__.rect(s), deb: window.__JUGE__.debordements(390, s), fond: window.__JUGE__.fondOpaque(s), petits: window.__JUGE__.petitsBoutons(44, s), textes: t ? window.__JUGE__.textesSous(12, s) : [] }), [sel, textes])
  const e = []
  if (!m.r) return [`${sel} absent à 390×844`]
  if (m.r.x > 1 || m.r.y > 1 || Math.abs(m.r.l - 390) > 2 || m.r.b < 844 - 2) e.push(`${sel} n'est pas une feuille plein écran (x ${Math.round(m.r.x)}, y ${Math.round(m.r.y)}, largeur ${Math.round(m.r.l)}, bas ${Math.round(m.r.b)})`)
  if (!m.fond.ok) e.push(m.fond.detail)
  if (m.deb.length) e.push(`${m.deb[0]}${m.deb.length > 1 ? ` (et ${m.deb.length - 1} autre(s) : ${m.deb.slice(1, 3).join(' ; ')})` : ''}`)
  if (m.petits.length) e.push(`bouton ou lien de moins de 44 px (${m.petits[0]})`)
  if (m.textes.length) e.push(`texte sous 12 px (${m.textes[0]})`)
  return e
}
/** Au bureau, une fenêtre ne recouvre pas la barre : son haut sous le bas de la barre, et la barre visible en son centre. */
async function sousLaBarre(page, sel) {
  const g = await page.evaluate((s) => ({ f: window.__JUGE__.rect(s), b: window.__JUGE__.rect('[data-zone="barre"]'), vis: window.__JUGE__.visible('[data-zone="barre"] [data-barre-ligne="2"]') }), sel)
  if (!g.f) return [`${sel} absent à 1440×900`]
  if (!g.b) return ['[data-zone="barre"] absent à 1440×900']
  const e = []
  if (g.f.y < g.b.b - 1) e.push(`${sel} (haut ${Math.round(g.f.y)}) recouvre la barre (bas ${Math.round(g.b.b)})`)
  if (!g.vis) e.push('la ligne 2 de la barre n’est pas visible (elementFromPoint) quand la fenêtre est ouverte')
  return e
}

// ═══ La sortie, les critères ═════════════════════════════════════════════════════════════════════════════════════════════
const fautes = new Map(), joues = new Set()
function faute(id, m) { joues.add(id); if (!fautes.has(id)) fautes.set(id, []); fautes.get(id).push(m) }
function vu(id) { joues.add(id) }
const DETAILS = {}

// ═══ --temoin : le juge prouve son harnais ═══════════════════════════════════════════════════════════════════════════════
if (MODE === 'temoin') {
  const S = creerSortie(NOM, ['TM-1', 'TM-2', 'TM-3'], `${NOM} — témoin du harnais (JC-2 de 026-104) : capture de l'onglet Aujourd'hui du Poste servi par le banc depuis ${RAC}, témoins d'immobilité sur une page d'essai, jeux de la partie au contrat — graine ${H.graine}`)
  const { chromium } = await import('playwright')
  let nav = null, banc = null, essai = null
  try {
    nav = await chromium.launch()
    // TM-1 : l'onglet Aujourd'hui existant, capturé par le juge à 390×844 et 1440×900, sur la racine au drapeau levé.
    await S.critere('TM-1', async () => {
      const e = []
      let vue
      try { vue = vueDrapeau(RAC, { critere: 'TM-1' }) } catch (err) { vue = { racine: RAC, remplacements: new Map(), sansDrapeau: premiereLigne(err) } }
      banc = await demarrerBanc({ racine: vue.racine, remplacements: vue.remplacements, pages: { poste: { prefixes: ['/controle'], layouts: ['app/controle/layout.tsx'], page: 'app/controle/page.tsx' } } })
      const caps = []
      for (const [l, h, nom] of [[390, 844, 'telephone'], [1440, 900, 'bureau']]) {
        const ctx = await nav.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Europe/Paris', ...(l < 1024 ? { isMobile: true, hasTouch: true } : {}) })
        const page = await ctx.newPage()
        await preparerPage(page, { session: true })
        const s = await servir(page, { journal: J('role-direction.json') }, { origine: banc.base })
        await page.goto(`${banc.base}/controle?onglet=aujourdhui`, { waitUntil: 'load' })
        await page.waitForFunction(() => !!document.querySelector('[data-barre-etat], .param-nav, [data-banc-erreur], [data-banc-404]'), null, { timeout: 20_000 }).catch(() => {})
        await page.waitForTimeout(800)
        const etat = await page.evaluate(() => ({ erreur: document.querySelector('[data-banc-erreur]')?.getAttribute('data-banc-erreur') ?? null, rail: !!document.querySelector('.param-nav'), sw: document.documentElement.scrollWidth }))
        if (etat.erreur) e.push(`${nom} : rendu en erreur (${court(etat.erreur, 100)})`)
        if (!etat.rail) e.push(`${nom} : le rail du Poste n'est pas rendu`)
        if (l === 390 && etat.sw > 390) e.push(`390 px : défilement horizontal (scrollWidth ${etat.sw})`)
        const c = await capturer(page, path.join(TRAV, 'captures', 'temoin', `${PARTIE}-aujourdhui-${nom}.jpg`))
        e.push(...defautsCapture(c, { largeur: l, hauteur: h }))
        if (s.externes.length) e.push(`${nom} : ${s.externes.length} requête(s) hors de 127.0.0.1 refusée(s) (${court(s.externes[0], 80)})`)
        caps.push(c)
        await ctx.close()
      }
      if (caps.length === 2 && caps[0].empreinte === caps[1].empreinte) e.push('les deux captures sont identiques')
      return { echecs: e, detail: `onglet Aujourd'hui du Poste servi par le banc (${vue.sansDrapeau ? `drapeau pilotage absent de la racine : capture sans le lever — ${court(vue.sansDrapeau, 80)}` : 'racine lue au drapeau levé'}), capturé par le juge : ${caps.map((c) => `${path.basename(c.fichier)} ${c.largeur}×${c.hauteur}, ${Math.round(c.octets / 1024)} Ko, écart type ${c.ecartType.toFixed(1)}`).join(' ; ')} ; pas de défilement horizontal à 390 px` }
    })
    // TM-2 : les trois témoins d'immobilité, prouvés sur une page d'essai servie par le juge.
    await S.critere('TM-2', async () => {
      essai = await servirPageEssai()
      const e = [], releves = {}
      for (const cas of ['immobile', 'anime']) {
        const ctx = await nav.newContext({ viewport: { width: 800, height: 600 } })
        const page = await ctx.newPage()
        await page.addInitScript(MESURES)
        await page.goto(`${essai.base}/${cas}`)
        await page.waitForTimeout(500)
        releves[cas] = await immobilite(page, { attente: 0, duree: 1500, sel: '[data-station]' })
        await ctx.close()
      }
      const im = releves.immobile, an = releves.anime
      if (!im.constant) e.push(`canevas immobile : les témoins ont bougé (${im.detail})`)
      if (an.images.size < 2) e.push('canevas animé : le compteur data-images n’a pas changé')
      if (an.empreintes.size < 2) e.push('canevas animé : l’empreinte du canevas n’a pas changé')
      if (!an.animations) e.push('canevas animé : aucune animation en cours relevée')
      return { echecs: e, detail: `page d'essai servie par le juge : canevas immobile → compteur, empreinte et animations constants (${im.detail}) ; canevas animé → ${an.images.size} valeurs de data-images, ${an.empreintes.size} empreintes, animation en cours relevée` }
    })
    await S.critere('TM-3', async () => {
      const { controleJeuxPartie } = await import('./fixtures/026-pilotage/c/controles.mjs')
      return controleJeuxPartie(PARTIE)
    })
  } finally {
    await nav?.close().catch(() => {})
    await banc?.arreter().catch(() => {})
    await essai?.arreter().catch(() => {})
  }
  process.exit(S.finir())
}

// ═══ Les parties : les critères de chaque partie sont dans scripts/fixtures/026-pilotage/c/parties/<partie>.mjs ═══════
const S = creerSortie(NOM, [...P.ids], `${NOM} — racine ${RAC} — ${MODE === 'vivant' ? 'racine réelle : next dev sur la copie au drapeau levé, compte fondateur d’essai' : 'banc (racine lue au drapeau levé, servie sur 127.0.0.1)'} — base ${BASE.slice(0, 7)} — graine ${H.graine} — ${PARALLELE} scénario(s) à la fois`)
function rendre() {
  for (const id of P.ids) {
    // Un critère jugé tôt (le premier, statique) garde les fautes relevées ensuite dans le navigateur : un complément rouge.
    if (S.evalue(id)) { if (fautes.get(id)?.length) S.juger(id, fautes.get(id), ''); continue }
    if (!joues.has(id)) { S.echoue(id, 'non jugé : aucun scénario ne l’a exercé'); continue }
    S.juger(id, fautes.get(id) ?? [], DETAILS[id] ?? 'conforme')
  }
  process.exit(S.finir())
}
const PARTIE_FN = await import(pathToFileURL(path.join(R, 'scripts', 'fixtures', '026-pilotage', 'c', 'parties', `${PARTIE}.mjs`)).href)
try {
  await PARTIE_FN.juger({
    S, faute, vu, DETAILS, P, PARTIE, MODE, RAC, BASE, H, lire, lireBase, existe, code, fichiersSous, appelsApi, adressesApi, lignesAjoutees, gardeMouvement, hexDans, RE_HEX, interditsSource,
    ST, PAGE_STATION, PAGE_POSTE, preparerPage, immobilite, demarrer, ouvrir, cheminCapture, autresParties, jugerCaptures, demarrerBaisse, plaques, enParallele, PARALLELE,
    piegesDans, gestesInterdits, feuilleTelephone, sousLaBarre,
    SERVEUR_NAV: () => SERVEUR.nav,
    outils: { jeu, J, servir: servirSuivi, capturer,defautsCapture, euros, heureParis, dateParis, relTime, espaces, PIEGE, PIEGE_HTML, sha256, tirerDirect, tirerTresorerie, tirerSources, typecheck, court, premiereLigne, MAINTENANT_JEUX, avecPiege },
  })
  // Le piège réseau : sur chaque page ouverte par la partie, toute requête du navigateur hors de la page servie.
  if (SERVIS.length) {
    const id = RESEAU[PARTIE], ext = SERVIS.flatMap((s) => s.externes)
    vu(id)
    if (ext.length) faute(id, `${ext.length} requête(s) du navigateur hors de la page servie, refusée(s) par le routeur du juge (${court(ext[0], 80)})`)
    else DETAILS[id] = `${DETAILS[id] ?? ''}${DETAILS[id] ? ' ; ' : ''}aucune requête du navigateur hors de la page servie sur les ${SERVIS.length} pages ouvertes`
  }
} catch (e) {
  S.nonJuges(P.ids, `interrompu : ${premiereLigne(e)}`)
} finally {
  await SERVEUR?.arreter?.().catch(() => {})
}
rendre()
