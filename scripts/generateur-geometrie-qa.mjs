// scripts/generateur-geometrie-qa.mjs — le juge de la fiche 025-23 (« le site généré tient dans l'écran »), écrit par Claude Code
// le 25/09 à partir de la relecture des productions 025-18 à 025-22 (.orchestre/travail/relecture-18-22/ : captures/ et
// mesure/mesure.json), défauts R1, R2, R8 et R9. Les verdicts sont à lui : un exécutant ne le modifie pas.
//
// Juge GÉOMÉTRIQUE : une propriété de mise en page se mesure dans un vrai moteur (boîtes, point de contact, couleurs calculées et
// pixels rendus), jamais au texte du HTML. Il n'importe que scripts/fixtures/025/commun.mjs (aucun autre juge : deux sessions dans
// un même fichier se marchent dessus).
//
// Usage :
//   node scripts/generateur-geometrie-qa.mjs                     GG-1 à GG-5 et T1 sur le dépôt
//   node scripts/generateur-geometrie-qa.mjs --racine=<dossier>  la même chose, tout lu et lancé depuis <dossier>
//   node scripts/generateur-geometrie-qa.mjs --temoin            tous les critères sur le témoin « après » (voir plus bas)
//   … --critere=GG-1,GG-3                                        seulement ces critères
// Sortie : « PASS|FAIL <id> — … » par critère, puis « generateur-geometrie-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est
// vert, 1 sinon, 2 si l'appel est invalide. N'écrit que sous .orchestre/travail/generateur-geometrie-qa/ (src/, sites/, lestraque/,
// mutations/, temoin/, et le rapport : rapport/<depot|temoin|racine>/mesure.json et captures/). Rien n'est généré en place, aucun appel réseau (les pages sont servies en local,
// toute autre requête est coupée). Lance Chromium ET WebKit (≈ 10 min) : sur le PC de Benj, TOUJOURS par
// `node scripts/usine.mjs executer`.
//
// Les sites mesurés :
//   - les quatre commandes FICTIVES de scripts/fixtures/025/commandes-metiers/ (plombier à Lyon, couvreur à Strasbourg, électricien
//     à Nantes, menuisier à Tours ; photos = celles de la démo gelée public/sites-demo/<m>/ du DÉPÔT, bases de matiere.photos),
//     générées par <racine>/public/sites-demo/generer.mjs --source (code 0 exigé) ;
//   - Lestraque, LE TÉMOIN qui ne doit pas bouger : régénéré par T1 (<racine>/public/sites-demo/generer.mjs lestraque --sortie=…),
//     puis mesuré comme les autres (il tient partout aujourd'hui : un correctif qui le casse est rouge).
//   Chaque site est servi à la racine d'un serveur local (commun.mjs, servir). Pages : l'accueil et la première page commune de
//   site.json. Fenêtres : 1280×800, 1440×900, 1920×1080 (bureau, DPR 1) et 390×844 (téléphone : isMobile, tactile, DPR 2), dans
//   Chromium ET WebKit (Playwright de node_modules). Mesure à défilement 0, après load, les polices prêtes, les images du héros
//   chargées et les animations finies du document terminées (les animations infinies et celles liées au défilement ignorées ;
//   6 s au plus).
//
// Critères :
//   GG-1 (R1) le titre tient dans l'écran : pour chaque site × page × moteur × fenêtre, chaque morceau de texte du <h1> du héros
//        (rectangles de ses nœuds texte, Range.getClientRects) est entier dans l'écran [0, largeur] ET dans chaque ancêtre qui coupe
//        (overflow-x ≠ visible, dont .h1__ligne en overflow:clip) — tolérance 1 px ; et le document n'a pas de défilement horizontal
//        (scrollWidth ≤ largeur). Chaque première vue est capturée par le juge (JPEG valable : non vide, aux bonnes dimensions, non
//        uniforme). Mutation (Lestraque, accueil, 1440 et 390, les deux moteurs) : titre à 40 vw sans retour à la ligne → vu.
//   GG-2 (R1) le bouton du héros est visible : le lien « Demander un devis » de .hero__actions existe dans le héros de chaque page ;
//        sa boîte est entière en largeur dans l'écran (tolérance 1 px) et document.elementFromPoint en son centre rend le bouton (ou
//        un descendant), défilement horizontal à 0 — le centre est d'abord pris à défilement 0 ; s'il est hors de l'écran en hauteur,
//        la page défile verticalement seulement (scrollTo(0, y)) pour l'amener au milieu. Mutations (mêmes pages) : bouton poussé de
//        110 vw → vu ; un voile posé sur l'écran → vu.
//   GG-3 (R2) sur la page commune, le nom (.nav__marque > span) et le menu (chaque lien visible de .nav__liens ; sans lien visible,
//        les barres du bouton ☰) ont un contraste ≥ 4,5:1 contre leur fond. Couleur du texte : getComputedStyle (color, ou
//        background-color des barres), alpha × opacité effective des ancêtres, composée sur le fond ; fond : les pixels RENDUS sous
//        le texte, capturés par le juge une fois le texte rendu transparent, son ombre portée gardée (un halo fait partie du fond :
//        WCAG 1.4.3) — ce qui vaut pour un aplat comme pour une photo sous un voile. Contraste retenu : le 10e centile des contrastes pixel par pixel (90 % du fond sous le texte fait
//        au moins ce contraste). Mutation (menuisier, page commune, 1440 et 390, les deux moteurs) : .nav--claire posée sur la nav
//        d'une page claire → vu.
//   GG-4 (R8) le texte des crédits de /mentions-legales/ (le <p> qui suit <h2 id="credits">) commence par une lettre, sans « . »
//        initial, sans « .. » ni « . . » ni espace avant un point ou une virgule, pour trois sites de l'électricien générés en code 0 :
//        photos de Commons (celui de GG-1), photos de l'artisan (auteur = l'artisan, licence « propriétaire »), et photos libres qui
//        ne viennent NI de Commons NI de l'artisan (source Flickr, licence CC d'origine : le cas R8) ; ce dernier ne dit ni
//        « Wikimedia » ni « Commons » ni « appartiennent » ; chaque auteur est cité dans la page. Mutation : « . Chaque auteur… »
//        → vu.
//   GG-5 (R9) <racine>/scripts/site-qa.mjs --statique --json, sur la commande d'exemple sans domaine (url_base
//        = <BASE_PRESTI>/site-genere/<id>) générée en --source : accepte le site tel quel (canonique et sitemap), puis REFUSE
//        (a) la canonique de l'accueil sur <BASE_PRESTI>/ (sans /site-genere/<id>), (b) celle de la première commune sur
//        <BASE_PRESTI>/<chemin>, (c) un <loc> du sitemap sur <BASE_PRESTI>/<chemin>. Contrôle de lecture : la canonique sur
//        /site/<slug>/ (refusée depuis 025-21) doit être vue refusée, sinon le juge lit mal site-qa.
//   T1 Lestraque régénéré depuis <racine> : index.html et site.js identiques octet pour octet, styles.css au plus par sa ligne 1
//        (commun.mjs, t1) ; sur le dépôt, Lestraque sans modification ni fichier non suivi en place. _kit/kit.css entre tel quel
//        (sans commentaires) dans le styles.css de CHAQUE site, Lestraque compris : une règle ajoutée au kit fait tomber T1.
//
// --temoin : tous les critères sur l'arbre .orchestre/travail/generateur-geometrie-qa/temoin/ : lib/urls.ts, public/sites-demo/_kit/,
//   _polices/, lestraque/, generer.mjs et scripts/site-qa.mjs copiés du dépôt, puis scripts/fixtures/025/temoins/generateur-geometrie-qa/
//   superposé, suffixe .temoin retiré : une copie de generer.mjs corrigée (R1 : plafond du titre en --source seulement ; R2 : nav
//   claire sur une page commune seulement avec un bandeau ; R8 : l'origine des photos libres hors Commons) et une copie de
//   site-qa.mjs qui exige le chemin de url_base (R9). Les jeux d'essai et les photos restent ceux du dépôt.
//
// Choix du juge (la relecture ne tranche pas) :
//   - Le texte du titre se mesure par ses nœuds texte, pas par la boîte du <h1> : .h1__ligne est un bloc de la largeur du conteneur,
//     et le texte qui en sort (white-space:nowrap) ne l'élargit pas — c'est justement le défaut R1.
//   - Le fond d'un texte se mesure aux pixels rendus (texte masqué), pas en remontant les background-color : sur une page commune
//     avec bandeau, la nav est posée sur une photo sous un voile, qu'aucune couleur calculée ne décrit. L'ombre portée du texte
//     (text-shadow, le halo du kit sur la nav claire) reste dans la capture du fond : c'est un moyen admis d'assurer le contraste.
//   - La capture de la première vue est prise AVANT le masque du contraste (sinon les barres du ☰ y reviennent à moitié).
//   - Le seuil de 4,5:1 vaut aussi pour les barres du bouton ☰ (la fiche le demande pour « le nom et le menu »).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  R, FIXTURES, TRAVAIL, COMMANDE_EXEMPLE,
  exigerSousTravail, listerFichiers, lireOuNull, fichierNonVide, lancer, preparerTemoin, lireOptionsOuQuitter, creerSortie,
  lireJson, servir, lancerNavigateur, capturer, t1,
} from './fixtures/025/commun.mjs'

export const JUGE = 'generateur-geometrie-qa'
export const IDS = ['GG-1', 'GG-2', 'GG-3', 'GG-4', 'GG-5', 'T1']
const ICI = path.join(TRAVAIL, JUGE)
const METIERS = ['plombier', 'couvreur', 'electricien', 'menuisier']
const DOSSIER_METIERS = path.join(FIXTURES, 'commandes-metiers')
export const FENETRES = [
  { nom: '1280', contexte: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
  { nom: '1440', contexte: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  { nom: '1920', contexte: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 } },
  { nom: '390', contexte: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
]
export const MOTEURS = ['chromium', 'webkit']
export const CONTRASTE_MIN = 4.5
const TOLERANCE = 1 // px
const FENETRES_SONDES = ['1440', '390']

const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const decoder = (s) => String(s).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const texteHtml = (html) => decoder(String(html).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/[\s  ]+/g, ' ')
const limiter = (l, n = 10) => `${l.slice(0, n).join(' ; ')}${l.length > n ? ` (et ${l.length - n} autre(s))` : ''}`

// ── Préparation des commandes et génération ───────────────────────────────────────────────────────────────────────────────
/** Une commande métier : commande.json et contenu.json du jeu d'essai, photos de la démo gelée du DÉPÔT (bases de matiere.photos). */
function preparerMetier(metier, { nom = metier, attributions: transformer = null } = {}) {
  const fx = path.join(DOSSIER_METIERS, metier)
  const commande = lireJson(path.join(fx, 'commande.json'))
  const demo = path.join(R, 'public', 'sites-demo', metier)
  const toutes = lireJson(path.join(demo, 'attributions.json'))
  const bases = new Set(commande.matiere.photos.map((p) => p.base))
  const gardees = toutes.filter((a) => bases.has(a.base))
  const manquantes = [...bases].filter((b) => !gardees.some((a) => a.base === b))
  if (manquantes.length) throw new Error(`jeu d’essai ${metier} : photo(s) ${manquantes.join(', ')} absente(s) de ${rel(demo)}/attributions.json`)
  const src = exigerSousTravail(path.join(ICI, 'src', nom))
  fs.rmSync(src, { recursive: true, force: true })
  fs.mkdirSync(path.join(src, 'photos'), { recursive: true })
  fs.copyFileSync(path.join(fx, 'commande.json'), path.join(src, 'commande.json'))
  fs.copyFileSync(path.join(fx, 'contenu.json'), path.join(src, 'contenu.json'))
  for (const a of gardees) fs.copyFileSync(path.join(demo, a.fichier), path.join(src, 'photos', path.basename(a.fichier)))
  const attributions = transformer ? gardees.map(transformer) : gardees
  fs.writeFileSync(path.join(src, 'photos', 'attributions.json'), `${JSON.stringify(attributions, null, 1)}\n`)
  return { src, commande, attributions }
}
/** La commande d'exemple (sans domaine) copiée sous .orchestre/travail/<juge>/src/<nom>. */
function preparerExemple(nom) {
  const src = exigerSousTravail(path.join(ICI, 'src', nom))
  fs.rmSync(src, { recursive: true, force: true })
  fs.cpSync(COMMANDE_EXEMPLE, src, { recursive: true })
  return src
}
/** <racine>/public/sites-demo/generer.mjs --source=<src> --sortie=<.orchestre/travail/<juge>/sites/<nom>> (cwd <racine>). */
function generer(racine, src, nom) {
  const sortie = exigerSousTravail(path.join(ICI, 'sites', nom))
  fs.rmSync(sortie, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(sortie), { recursive: true })
  const g = path.join(racine, 'public', 'sites-demo', 'generer.mjs')
  if (!fichierNonVide(g)) return { code: null, sortie, message: `${g} absent ou vide` }
  const t0 = Date.now()
  const r = lancer(process.execPath, [g, `--source=${src}`, `--sortie=${sortie}`], { cwd: racine, timeout: 240_000 })
  return { ...r, sortie, secondes: (Date.now() - t0) / 1000, message: r.derniereLigne }
}
const echecGeneration = (quoi, g) => `${quoi} : ${g.code === null && !g.signal ? g.message : `code ${g.code}${g.signal ? ` (${g.signal})` : ''} : « ${court(g.message, 180)} »`}`
const pagesHtml = (site) => [...listerFichiers(site)].filter((f) => /\.html?$/i.test(f)).sort()

// ── Couleurs et contraste (WCAG 2) ───────────────────────────────────────────────────────────────────────────────────────────
/** « rgb(…) », « rgba(…) », « color(srgb …) » → { r, g, b, a } (0-255, alpha 0-1), ou null. */
export function lireCouleur(s) {
  const t = String(s ?? '').trim()
  const alpha = (v) => (v === undefined ? 1 : String(v).endsWith('%') ? parseFloat(v) / 100 : Number(v))
  let m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(t)
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: alpha(m[4]) }
  m = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(t)
  if (m) return { r: 255 * m[1], g: 255 * m[2], b: 255 * m[3], a: alpha(m[4]) }
  if (/^transparent$/i.test(t)) return { r: 0, g: 0, b: 0, a: 0 }
  return null
}
const lin = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
export const luminance = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
export const rapport = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
/**
 * Contraste d'un texte de couleur `texte` ({r,g,b,a}, alpha déjà multiplié par l'opacité effective) sur des pixels de fond
 * ([r,g,b, r,g,b, …]) : le texte est composé sur chaque pixel, et le 10e centile des contrastes pixel par pixel est rendu.
 * → { contraste, pixels, fondClair (luminance médiane du fond) }
 */
export function contrasteSurFond(texte, pixels) {
  const n = Math.floor(pixels.length / 3)
  if (!n) return { contraste: null, pixels: 0, fondMedian: null }
  const a = Math.max(0, Math.min(1, texte.a ?? 1))
  const cs = new Float64Array(n), lf = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const r = pixels[3 * i], g = pixels[3 * i + 1], b = pixels[3 * i + 2]
    const lp = luminance(r, g, b)
    const lt = luminance(a * texte.r + (1 - a) * r, a * texte.g + (1 - a) * g, a * texte.b + (1 - a) * b)
    cs[i] = rapport(lt, lp); lf[i] = lp
  }
  cs.sort(); lf.sort()
  return { contraste: cs[Math.floor(0.1 * (n - 1))], pixels: n, fondMedian: lf[Math.floor(0.5 * (n - 1))] }
}

// ── Ce qui est mesuré dans la page (fonctions autonomes : sérialisées par Playwright) ──────────────────────────────────────────
/** Attend load déjà passé : polices, images du héros, animations finies du document (6 s au plus), deux images. */
const ATTENDRE_STABLE = async () => {
  const delai = (ms) => new Promise((r) => setTimeout(r, ms))
  try { await Promise.race([document.fonts ? document.fonts.ready : 0, delai(5000)]) } catch { /* sans polices */ }
  const imgs = [...document.querySelectorAll('section.hero img, header img')]
  await Promise.race([Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }) })))), delai(8000)])
  const fin = Date.now() + 6000
  while (Date.now() < fin) {
    const enCours = (document.getAnimations ? document.getAnimations() : []).filter((a) => {
      if (a.playState !== 'running') return false
      if (a.timeline && a.timeline !== document.timeline) return false
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null
      return !!t && Number.isFinite(Number(t.endTime))
    })
    if (!enCours.length) break
    await delai(100)
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return { scrollX: window.scrollX, scrollY: window.scrollY }
}
/** Le titre du héros (texte, bornes, pire dépassement) et le bouton du héros (marqué data-gg-bouton). */
const MESURER = () => {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight
  const nom = (e) => { if (!e) return '(rien)'; let s = e.tagName.toLowerCase(); if (e.id) s += `#${e.id}`; const c = [...e.classList].slice(0, 3); if (c.length) s += `.${c.join('.')}`; return s }
  // les bornes horizontales d'un élément : l'écran, resserré par chaque ancêtre qui coupe (overflow-x ≠ visible). body et html
  // ne comptent pas : leur overflow passe à la fenêtre (c'est l'écran).
  const bornes = (e) => {
    let g = 0, d = vw, parG = 'l’écran', parD = 'l’écran'
    for (let a = e; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      if (getComputedStyle(a).overflowX === 'visible') continue
      const b = a.getBoundingClientRect()
      if (b.left > g) { g = b.left; parG = nom(a) }
      if (b.right < d) { d = b.right; parD = nom(a) }
    }
    return { g, d, parG, parD }
  }
  const hero = document.querySelector('main section.hero') || document.querySelector('section.hero')
  const h1 = (hero && hero.querySelector('h1')) || document.querySelector('h1')
  const res = { vw, vh, scrollX: window.scrollX, docLarge: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0), hero: nom(hero), titre: null, bouton: null }
  if (h1) {
    let pire = null, gauche = Infinity, droite = -Infinity, morceaux = 0
    const w = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
    const r = document.createRange()
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = n.nodeValue.replace(/\s+/g, ' ').trim()
      if (!t) continue
      const cs = getComputedStyle(n.parentElement)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      r.selectNodeContents(n)
      const b = bornes(n.parentElement)
      for (const x of r.getClientRects()) {
        if (x.width <= 0.5 || x.height <= 0.5) continue
        morceaux++
        gauche = Math.min(gauche, x.left); droite = Math.max(droite, x.right)
        const dg = b.g - x.left, dd = x.right - b.d, dep = Math.max(dg, dd)
        if (!pire || dep > pire.depasse) pire = { depasse: Math.round(dep * 10) / 10, mot: t, cote: dg > dd ? 'gauche' : 'droite', par: dg > dd ? b.parG : b.parD, gauche: Math.round(x.left), droite: Math.round(x.right), borne: Math.round(dg > dd ? b.g : b.d) }
      }
    }
    res.titre = { texte: h1.textContent.replace(/\s+/g, ' ').trim(), police: getComputedStyle(h1).fontSize, morceaux, gauche: Math.round(gauche), droite: Math.round(droite), pire }
  }
  const btn = hero && ([...hero.querySelectorAll('.hero__actions a, .hero__actions button')].find((a) => /devis/i.test(a.textContent)) || hero.querySelector('.hero__actions .bouton'))
  for (const e of document.querySelectorAll('[data-gg-bouton]')) e.removeAttribute('data-gg-bouton')
  if (btn) { btn.setAttribute('data-gg-bouton', '1'); res.bouton = { texte: btn.textContent.replace(/\s+/g, ' ').trim() } }
  return res
}
/** Le bouton marqué : boîte, centre, ce que elementFromPoint y rend. */
const LIRE_BOUTON = () => {
  const nom = (e) => { if (!e) return '(rien)'; let s = e.tagName.toLowerCase(); if (e.id) s += `#${e.id}`; const c = [...e.classList].slice(0, 3); if (c.length) s += `.${c.join('.')}`; return s }
  const btn = document.querySelector('[data-gg-bouton]')
  if (!btn) return null
  const b = btn.getBoundingClientRect()
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2
  const vw = document.documentElement.clientWidth, vh = window.innerHeight
  const el = cx >= 0 && cx < vw && cy >= 0 && cy < vh ? document.elementFromPoint(cx, cy) : null
  return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), cx: Math.round(cx), cy: Math.round(cy), vw, vh, scrollX: window.scrollX, scrollY: Math.round(window.scrollY), touche: !!el && (el === btn || btn.contains(el)), dessus: nom(el) }
}
/** Les cibles du contraste (nom, liens du menu ou barres du ☰), puis le texte masqué (style #gg-masque). */
const PREPARER_CONTRASTE = () => {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight
  const nav = document.querySelector('header.nav') || document.querySelector('header')
  if (!nav) return { erreur: 'pas de header.nav' }
  const visible = (e) => { if (!e) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const b = e.getBoundingClientRect(); return b.width > 1 && b.height > 1 && b.bottom > 0 && b.top < vh && b.right > 0 && b.left < vw }
  const opacite = (e) => { let o = 1; for (let a = e; a; a = a.parentElement) o *= Number(getComputedStyle(a).opacity); return o }
  const boite = (x) => ({ left: x.left, top: x.top, right: x.right, bottom: x.bottom })
  const rectsTexte = (e) => { const out = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); const r = document.createRange(); for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.nodeValue.trim()) continue; r.selectNodeContents(n); for (const x of r.getClientRects()) if (x.width > 0.5 && x.height > 0.5) out.push(boite(x)) } return out }
  const cibles = []
  const nomE = nav.querySelector('.nav__marque > span') || nav.querySelector('.nav__marque')
  if (visible(nomE)) cibles.push({ quoi: `nom « ${nomE.textContent.trim()} »`, couleur: getComputedStyle(nomE).color, opacite: opacite(nomE), rects: rectsTexte(nomE) })
  else cibles.push({ quoi: 'nom', absent: true })
  const liens = [...nav.querySelectorAll('.nav__liens a')].filter(visible)
  for (const a of liens) cibles.push({ quoi: `menu « ${a.textContent.trim()} »`, couleur: getComputedStyle(a).color, opacite: opacite(a), rects: rectsTexte(a) })
  if (!liens.length) {
    const bu = nav.querySelector('.burger')
    const barres = bu ? [...bu.querySelectorAll('span')].filter(visible) : []
    if (visible(bu) && barres.length) cibles.push({ quoi: 'menu (barres du ☰)', couleur: getComputedStyle(barres[0]).backgroundColor, opacite: opacite(barres[0]), rects: barres.map((s) => boite(s.getBoundingClientRect())) })
    else cibles.push({ quoi: 'menu', absent: true })
  }
  const st = document.createElement('style')
  st.id = 'gg-masque'
  st.textContent = 'header .nav__marque,header .nav__marque *,header .nav__liens a{color:transparent!important;transition:none!important}header .nav__liens a::after{visibility:hidden!important}header .burger span{background:transparent!important;transition:none!important}'
  document.head.appendChild(st)
  return { vw, vh, nav: nav.className, cibles }
}

// ── Mesures d'une page ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function testerBouton(page) {
  let r = await page.evaluate(LIRE_BOUTON)
  if (!r) return null
  if (r.cy < 0 || r.cy >= r.vh) {
    const avant = r
    await page.evaluate((dy) => window.scrollTo(0, window.scrollY + dy), r.cy - r.vh / 2)
    await page.waitForTimeout(700)
    r = { ...(await page.evaluate(LIRE_BOUTON)), defile: true, avant: { cy: avant.cy } }
  }
  r.ok = !!r.touche && r.left >= -TOLERANCE && r.right <= r.vw + TOLERANCE && r.scrollX === 0
  return r
}
/** Le contraste des cibles de la nav : texte masqué, pixels du fond capturés, masque retiré. → { cibles: [{ quoi, contraste, … }] } */
async function mesurerContraste(page) {
  const prep = await page.evaluate(PREPARER_CONTRASTE)
  if (prep.erreur) return { erreur: prep.erreur, cibles: [] }
  try {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.waitForTimeout(60)
    const bas = Math.max(1, ...prep.cibles.filter((c) => !c.absent).flatMap((c) => c.rects.map((x) => x.bottom)))
    const hauteur = Math.max(1, Math.min(prep.vh, Math.ceil(bas) + 2))
    const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: prep.vw, height: hauteur }, scale: 'css' })
    const sharp = (await import('sharp')).default
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const kx = info.width / prep.vw, ky = info.height / hauteur
    const cibles = prep.cibles.map((c) => {
      if (c.absent) return { quoi: c.quoi, absent: true }
      const coul = lireCouleur(c.couleur)
      if (!coul) return { quoi: c.quoi, erreur: `couleur illisible « ${c.couleur} »` }
      const px = []
      for (const x of c.rects) {
        const x0 = Math.max(0, Math.floor(x.left * kx)), x1 = Math.min(info.width, Math.ceil(x.right * kx))
        const y0 = Math.max(0, Math.floor(x.top * ky)), y1 = Math.min(info.height, Math.ceil(x.bottom * ky))
        for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) { const i = (y * info.width + xx) * info.channels; px.push(data[i], data[i + 1], data[i + 2]) }
      }
      const texte = { ...coul, a: coul.a * c.opacite }
      const r = contrasteSurFond(texte, px)
      return { quoi: c.quoi, couleur: c.couleur, opacite: Math.round(c.opacite * 1000) / 1000, contraste: r.contraste === null ? null : Math.round(r.contraste * 100) / 100, pixels: r.pixels, fondMedian: r.fondMedian === null ? null : Math.round(r.fondMedian * 1000) / 1000 }
    })
    return { nav: prep.nav, cibles }
  } finally {
    await page.evaluate(() => { const s = document.getElementById('gg-masque'); if (s) s.remove() }).catch(() => {})
  }
}
const defautsContraste = (m) => {
  if (!m) return ['contraste non mesuré']
  if (m.erreur) return [m.erreur]
  const d = []
  for (const c of m.cibles) {
    if (c.absent) d.push(`${c.quoi} introuvable ou invisible dans la nav`)
    else if (c.erreur) d.push(`${c.quoi} : ${c.erreur}`)
    else if (!c.pixels || c.contraste === null) d.push(`${c.quoi} : aucun pixel sous le texte`)
    else if (c.contraste < CONTRASTE_MIN) d.push(`${c.quoi} ${c.contraste}:1 (${c.couleur}${c.opacite < 1 ? `, opacité ${c.opacite}` : ''}, fond de luminance ${c.fondMedian})`)
  }
  return d
}
const defautsTitre = (m) => {
  const d = []
  if (!m.titre) d.push('pas de <h1>')
  else if (!m.titre.morceaux) d.push('<h1> sans texte rendu')
  else if (m.titre.pire.depasse > TOLERANCE) d.push(`« ${court(m.titre.pire.mot, 40)} » dépasse de ${Math.round(m.titre.pire.depasse)} px à ${m.titre.pire.cote} (${m.titre.pire.par}, borne ${m.titre.pire.borne} px ; titre de ${m.titre.gauche} à ${m.titre.droite} px, police ${m.titre.police})`)
  if (m.docLarge > m.vw + TOLERANCE) d.push(`document large de ${m.docLarge} px pour ${m.vw} (défilement horizontal)`)
  return d
}
const defautsBouton = (b) => {
  if (!b) return ['pas de bouton « Demander un devis » dans .hero__actions du héros']
  if (b.ok) return []
  const d = []
  if (b.left < -TOLERANCE || b.right > b.vw + TOLERANCE) d.push(`bouton de ${b.left} à ${b.right} px pour un écran de ${b.vw}`)
  if (!b.touche) d.push(`au centre (${b.cx}, ${b.cy}) elementFromPoint rend ${b.dessus}`)
  if (b.scrollX !== 0) d.push(`défilement horizontal ${b.scrollX}`)
  return d
}

/** Une page : chargée, stabilisée, capture, contraste (page commune), titre, bouton. → la mesure */
async function mesurerPage(page, { base, chemin, commune, capture }) {
  const m = { chemin, commune }
  await page.goto(`${base}${chemin}`, { waitUntil: 'load', timeout: 90_000 })
  await page.evaluate(ATTENDRE_STABLE)
  // la capture AVANT le contraste : une fois le masque retiré, les barres du ☰ reviennent en 0,3 s (transition du kit)
  const c = await capturer(page, capture, { qualite: 70 })
  m.capture = { fichier: rel(capture), ok: c.ok, raisons: c.raisons, octets: c.octets }
  if (commune) m.contraste = await mesurerContraste(page)
  Object.assign(m, await page.evaluate(MESURER))
  m.boutonMesure = await testerBouton(page)
  return m
}

// ── Les sondes (mutations vues par le détecteur) ───────────────────────────────────────────────────────────────────────────
async function sondesTitreBouton(page, { base, chemin }) {
  const out = {}
  await page.goto(`${base}${chemin}`, { waitUntil: 'load', timeout: 90_000 })
  await page.evaluate(ATTENDRE_STABLE)
  const t = await page.addStyleTag({ content: 'section.hero h1{font-size:40vw!important}section.hero h1,section.hero h1 *{white-space:nowrap!important}' })
  await page.waitForTimeout(150)
  const mt = await page.evaluate(MESURER)
  out.titre = { vu: defautsTitre(mt).length > 0, detail: defautsTitre(mt)[0] || `titre de ${mt.titre?.gauche} à ${mt.titre?.droite} px` }
  await t.evaluate((e) => e.remove())
  await page.evaluate(MESURER) // remet la marque du bouton
  const b = await page.addStyleTag({ content: '[data-gg-bouton]{translate:110vw 0!important;transition:none!important}' })
  await page.waitForTimeout(150)
  const mb = await testerBouton(page)
  out.boutonPousse = { vu: defautsBouton(mb).length > 0, detail: defautsBouton(mb)[0] || 'bouton vu en place' }
  await b.evaluate((e) => e.remove())
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  await page.evaluate(() => { const v = document.createElement('div'); v.id = 'gg-voile'; v.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.01)'; document.body.appendChild(v) })
  const mv = await testerBouton(page)
  out.boutonCouvert = { vu: defautsBouton(mv).length > 0, detail: defautsBouton(mv)[0] || 'bouton vu' }
  return out
}
async function sondeContraste(page, { base, chemin }) {
  await page.goto(`${base}${chemin}`, { waitUntil: 'load', timeout: 90_000 })
  await page.evaluate(ATTENDRE_STABLE)
  await page.evaluate(() => { const n = document.querySelector('header.nav'); if (n) { n.classList.add('nav--claire'); n.classList.remove('solide') } })
  await page.waitForTimeout(700) // .nav : transition de color .45 s
  const m = await mesurerContraste(page)
  const d = defautsContraste(m)
  return { vu: d.length > 0, detail: d[0] || `contrastes ${m.cibles.map((c) => c.contraste).join(', ')}` }
}

// ── GG-1 à GG-3 : les mesures dans les deux moteurs ────────────────────────────────────────────────────────────────────────
/** sites : [{ nom, dossier }] générés ; → { mesures: [...], sondes: {...}, echecsTechniques: [] } */
async function mesurerSites(sites, rapport) {
  const mesures = [], techniques = [], sondes = { titre: [], boutonPousse: [], boutonCouvert: [], contraste: [] }
  const serveurs = []
  try {
    for (const s of sites) {
      const contrat = lireJson(path.join(s.dossier, 'site.json'))
      const commune = (contrat.pages || []).find((p) => p.type === 'commune')
      s.pages = [{ chemin: '/', commune: false, cle: 'accueil' }, ...(commune ? [{ chemin: commune.chemin, commune: true, cle: 'commune' }] : [])]
      if (!commune) techniques.push(`${s.nom} : aucune page commune dans site.json`)
      s.srv = await servir(s.dossier)
      serveurs.push(s.srv)
    }
    const temoin = sites.find((s) => s.nom === 'lestraque'), clair = sites.find((s) => s.nom === 'menuisier')
    for (const moteur of MOTEURS) {
      let nav = null
      try {
        nav = await lancerNavigateur(moteur)
        for (const f of FENETRES) {
          const ctx = await nav.newContext({ ...f.contexte, serviceWorkers: 'block' })
          try {
            await ctx.route('**/*', (r) => (/^http:\/\/127\.0\.0\.1:\d+\//.test(r.request().url()) ? r.continue() : r.abort('blockedbyclient')))
            const page = await ctx.newPage()
            for (const s of sites) {
              for (const p of s.pages) {
                const capture = path.join(rapport, 'captures', `${s.nom}-${p.cle}-${moteur}-${f.nom}.jpg`)
                try { mesures.push({ site: s.nom, moteur, fenetre: f.nom, ...(await mesurerPage(page, { base: s.srv.base, chemin: p.chemin, commune: p.commune, capture })) }) } catch (e) { mesures.push({ site: s.nom, moteur, fenetre: f.nom, chemin: p.chemin, commune: p.commune, erreur: premiereLigne(e) }) }
              }
            }
            if (FENETRES_SONDES.includes(f.nom)) {
              if (temoin) { try { const r = await sondesTitreBouton(page, { base: temoin.srv.base, chemin: '/' }); for (const k of ['titre', 'boutonPousse', 'boutonCouvert']) sondes[k].push({ moteur, fenetre: f.nom, ...r[k] }) } catch (e) { for (const k of ['titre', 'boutonPousse', 'boutonCouvert']) sondes[k].push({ moteur, fenetre: f.nom, vu: false, detail: `sonde interrompue : ${premiereLigne(e)}` }) } }
              const pc = clair?.pages?.find((p) => p.commune)
              if (pc) { try { sondes.contraste.push({ moteur, fenetre: f.nom, ...(await sondeContraste(page, { base: clair.srv.base, chemin: pc.chemin })) }) } catch (e) { sondes.contraste.push({ moteur, fenetre: f.nom, vu: false, detail: `sonde interrompue : ${premiereLigne(e)}` }) } }
            }
          } finally { await ctx.close().catch(() => {}) }
        }
      } catch (e) {
        techniques.push(`${moteur} : ${premiereLigne(e)}`)
      } finally { if (nav) await nav.close().catch(() => {}) }
    }
  } finally { for (const v of serveurs) await v.fermer().catch(() => {}) }
  return { mesures, sondes, techniques }
}
const cle = (m) => `${m.site}${m.chemin} ${m.moteur}@${m.fenetre}`
function jugerGeometrie({ mesures, sondes, techniques }, attendus) {
  const out = {}
  const manquantes = attendus.filter((a) => !mesures.some((m) => m.site === a.site && m.moteur === a.moteur && m.fenetre === a.fenetre && m.chemin === a.chemin)).map(cle)
  const communs = [...techniques, ...(manquantes.length ? [`${manquantes.length} mesure(s) jamais prise(s) : ${manquantes.slice(0, 4).join(', ')}`] : [])]
  const sondeKo = (l, quoi) => { if (!l.length) return [`détecteur non éprouvé : aucune sonde « ${quoi} »`]; return l.filter((x) => !x.vu).map((x) => `détecteur aveugle (${quoi}, ${x.moteur}@${x.fenetre}) : ${x.detail}`) }
  const faitsSonde = (l, quoi) => (l.length && l.every((x) => x.vu) ? [`mutation « ${quoi} » vue ${l.length}/${l.length} (${l.map((x) => `${x.moteur}@${x.fenetre}`).join(', ')})`] : [])
  // GG-1
  {
    const e = [...communs], n = { ok: 0 }
    for (const m of mesures) {
      if (m.erreur) { e.push(`${cle(m)} : page non mesurée (${m.erreur})`); continue }
      const d = defautsTitre(m)
      if (!m.capture?.ok) d.push(`capture invalide (${(m.capture?.raisons || []).join(', ')})`)
      if (d.length) e.push(`${cle(m)} : ${d.join(' ; ')}`); else n.ok++
    }
    e.push(...sondeKo(sondes.titre, 'titre à 40 vw'))
    out['GG-1'] = { ok: !e.length, echecs: e, faits: [`${n.ok} mesure(s) (5 sites × 2 pages × 2 moteurs × 4 fenêtres) : titre entier dans l’écran et dans ses boîtes, sans défilement horizontal ; captures valables`, ...faitsSonde(sondes.titre, 'titre à 40 vw')] }
  }
  // GG-2
  {
    const e = [...communs], n = { ok: 0, defile: 0 }
    for (const m of mesures) {
      if (m.erreur) { e.push(`${cle(m)} : page non mesurée`); continue }
      const d = defautsBouton(m.bouton ? m.boutonMesure : null)
      if (d.length) e.push(`${cle(m)} : ${d.join(' ; ')}`); else { n.ok++; if (m.boutonMesure.defile) n.defile++ }
    }
    e.push(...sondeKo(sondes.boutonPousse, 'bouton poussé de 110 vw'), ...sondeKo(sondes.boutonCouvert, 'voile sur le bouton'))
    out['GG-2'] = { ok: !e.length, echecs: e, faits: [`${n.ok} bouton(s) du héros entiers en largeur et touchés en leur centre${n.defile ? ` (${n.defile} après un défilement vertical)` : ''}`, ...faitsSonde(sondes.boutonPousse, 'bouton poussé'), ...faitsSonde(sondes.boutonCouvert, 'voile')] }
  }
  // GG-3
  {
    const e = [...communs], vus = []
    for (const m of mesures.filter((x) => x.commune)) {
      if (m.erreur) { e.push(`${cle(m)} : page non mesurée`); continue }
      const d = defautsContraste(m.contraste)
      if (d.length) e.push(`${cle(m)} (nav « ${m.contraste?.nav || '?'} ») : ${d.join(' ; ')}`)
      else vus.push(Math.min(...m.contraste.cibles.map((c) => c.contraste)))
    }
    e.push(...sondeKo(sondes.contraste, 'nav claire sur page claire'))
    out['GG-3'] = { ok: !e.length, echecs: e, faits: [`${vus.length} page(s) commune(s) : nom et menu à ${vus.length ? Math.min(...vus).toFixed(2) : '?'}:1 au moins (≥ ${CONTRASTE_MIN})`, ...faitsSonde(sondes.contraste, 'nav claire sur page claire')] }
  }
  return out
}

// ── GG-4 : le texte des crédits ────────────────────────────────────────────────────────────────────────────────────────────
/** Le texte du paragraphe qui suit <h2 id="credits"> (null s'il n'y en a pas). */
export function texteCredits(html) {
  const m = /<h2\b[^>]*\bid="credits"[^>]*>[\s\S]*?<\/h2>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(String(html))
  return m ? texteHtml(m[1]).trim() : null
}
export function defautsCredits(texte, { libres = false } = {}) {
  const d = []
  const t = String(texte ?? '').trim()
  if (!t) return ['aucun texte de crédits sous « Crédits »']
  if (!/^\p{L}/u.test(t)) d.push(`commence par « ${t.slice(0, 12)} » (une lettre attendue)`)
  const m = /\.\s*\.|\s[.,]/.exec(t)
  if (m) d.push(`ponctuation orpheline « ${t.slice(Math.max(0, m.index - 20), m.index + 12)} »`)
  if (libres) for (const [re, quoi] of [[/wikimedia/i, '« Wikimedia »'], [/commons/i, '« Commons »'], [/appartien/i, '« appartiennent »']]) { const x = re.exec(t); if (x) d.push(`${quoi} alors qu’aucune photo ne vient de Commons ni de l’artisan : « ${court(t.slice(Math.max(0, x.index - 40), x.index + 30), 80)} »`) }
  return d
}
async function jugerCredits({ racine, siteElectricien }) {
  const echecs = [], faits = []
  const cmd = lireJson(path.join(DOSSIER_METIERS, 'electricien', 'commande.json'))
  const artisan = `${cmd.matiere.artisan.prenom} ${cmd.matiere.artisan.nom}`
  const sansCommons = (a) => { const { titre_commons: _t, ...x } = a; return x }
  const variantes = [
    { nom: 'électricien, photos de l’artisan', dossier: 'electricien-photos-propres', libres: false, t: (a, i) => ({ ...sansCommons(a), auteur: artisan, licence: 'propriétaire', source: `https://${cmd.domaine}/photos/${a.base}`, modifiee: 'Non' }) },
    { nom: 'électricien, photos libres hors Commons (R8)', dossier: 'electricien-photos-libres', libres: true, t: (a) => ({ ...sansCommons(a), source: `https://www.flickr.com/photos/essai-025-23/${Math.abs([...String(a.base)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}/` }) },
  ]
  const cas = []
  if (siteElectricien) cas.push({ nom: 'électricien, photos de Commons', site: siteElectricien, libres: false })
  else echecs.push('site de l’électricien (photos de Commons) non généré')
  for (const v of variantes) {
    try {
      const p = preparerMetier('electricien', { nom: v.dossier, attributions: v.t })
      const g = generer(racine, p.src, v.dossier)
      if (g.code !== 0) echecs.push(echecGeneration(v.nom, g)); else cas.push({ nom: v.nom, site: g.sortie, libres: v.libres })
    } catch (e) { echecs.push(`${v.nom} : ${premiereLigne(e)}`) }
  }
  for (const c of cas) {
    const f = pagesHtml(c.site).find((x) => /mentions/.test(x))
    if (!f) { echecs.push(`${c.nom} : aucune page de mentions légales`); continue }
    const html = fs.readFileSync(path.join(c.site, f), 'utf8')
    const t = texteCredits(html)
    const d = defautsCredits(t, { libres: c.libres })
    const page = texteHtml(html)
    for (const a of new Set(lireJson(path.join(c.site, 'attributions.json')).map((x) => x.auteur))) if (!page.includes(a)) d.push(`auteur « ${a} » non cité`)
    if (d.length) echecs.push(`${c.nom} (${f}) : ${d.join(' ; ')} — texte : « ${court(t, 110)} »`)
    else faits.push(`${c.nom} : « ${court(t, 90)} »`)
  }
  const sonde = defautsCredits('. Chaque auteur, licence et origine figure ci-dessous.', { libres: true })
  if (!sonde.length) echecs.push('détecteur aveugle : « . Chaque auteur… » passe'); else faits.push(`mutation « . Chaque auteur… » → vue (${sonde.length} défaut)`)
  return { ok: !echecs.length, echecs, faits }
}

// ── GG-5 : site-qa exige le chemin de url_base ─────────────────────────────────────────────────────────────────────────────
function siteQa(racine, site) {
  const qa = path.join(racine, 'scripts', 'site-qa.mjs')
  if (!fichierNonVide(qa)) return { code: null, rapport: null, erreur: `${qa} absent` }
  const r = lancer(process.execPath, [qa, site, '--statique', '--json'], { cwd: racine, timeout: 180_000 })
  let rapport = null
  try { rapport = JSON.parse(r.stdout) } catch { /* sortie non JSON */ }
  return rapport ? { code: r.code, rapport } : { code: r.code, rapport: null, erreur: `site-qa illisible (code ${r.code}) : ${court(r.sortie, 160)}` }
}
const RE_CANON = /^canonical = la page elle-même$/, RE_SITEMAP = /^sitemap\.xml liste toutes les pages/
/** Les tests d'adresse du rapport de site-qa : [{ bloc, nom, passe, mesure }] */
const testsAdresse = (rapport) => rapport.blocs.flatMap((b) => b.tests.filter((t) => RE_CANON.test(t.nom) || RE_SITEMAP.test(t.nom)).map((t) => ({ bloc: b.nom, ...t })))
const refuseCanonique = (rapport, chemin) => rapport.blocs.some((b) => b.nom.startsWith(`Page ${chemin} `) && b.tests.some((t) => RE_CANON.test(t.nom) && !t.passe))
const refuseSitemap = (rapport) => rapport.blocs.some((b) => b.tests.some((t) => RE_SITEMAP.test(t.nom) && !t.passe))
function muter(site, nom, fichier, remplacer) {
  const d = exigerSousTravail(path.join(ICI, 'mutations', nom))
  fs.rmSync(d, { recursive: true, force: true }); fs.cpSync(site, d, { recursive: true })
  const f = path.join(d, ...fichier.split('/'))
  const avant = fs.readFileSync(f, 'utf8'), apres = remplacer(avant)
  if (apres === avant) throw new Error(`mutation ${nom} : ${fichier} inchangé`)
  fs.writeFileSync(f, apres)
  return d
}
const remplacerCanonique = (html, url) => html.replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*/i, `$1${url}`)
async function jugerCanoniqueSiteQa({ racine }) {
  const echecs = [], faits = []
  const urls = lireOuNull(path.join(racine, 'lib', 'urls.ts'))?.toString('utf8') || ''
  const base = /export\s+const\s+BASE_PRESTI\s*=\s*['"](https:\/\/[^'"]+)['"]/.exec(urls)?.[1]
  if (!base) return { ok: false, echecs: [`BASE_PRESTI introuvable dans ${rel(path.join(racine, 'lib', 'urls.ts'))}`], faits }
  const g = generer(racine, preparerExemple('exemple'), 'exemple')
  if (g.code !== 0) return { ok: false, echecs: [echecGeneration('commande d’exemple', g)], faits }
  const contrat = lireJson(path.join(g.sortie, 'site.json'))
  const prefixe = new URL(contrat.url_base).pathname.replace(/\/+$/, '')
  if (!/^\/site-genere\/[^/]+$/.test(prefixe)) echecs.push(`url_base de la commande d’exemple « ${contrat.url_base} » : /site-genere/<id> attendu (voir GV-5)`)
  const commune = (contrat.pages || []).find((p) => p.type === 'commune')
  if (!commune) return { ok: false, echecs: [...echecs, 'commande d’exemple sans page commune'], faits }
  // le site tel quel : accepté
  const q0 = siteQa(racine, g.sortie)
  if (!q0.rapport) return { ok: false, echecs: [...echecs, q0.erreur], faits }
  const t0 = testsAdresse(q0.rapport)
  if (!t0.length) echecs.push('site-qa n’a jugé ni la canonique ni le sitemap')
  const refuses0 = t0.filter((t) => !t.passe)
  if (refuses0.length) echecs.push(`site-qa refuse le site tel quel : ${refuses0.slice(0, 3).map((t) => `${t.bloc} › ${t.nom} (${court(t.mesure, 60)})`).join(' ; ')}`)
  else faits.push(`site tel quel : ${t0.length} contrôle(s) d’adresse acceptés`)
  // contrôle de lecture : /site/<slug>/ refusé
  const lecture = siteQa(racine, muter(g.sortie, 'gg5-site-slug', 'index.html', (h) => remplacerCanonique(h, `${base}/site/${contrat.slug}/`)))
  if (!lecture.rapport || !refuseCanonique(lecture.rapport, '/')) echecs.push(`lecture de site-qa douteuse : la canonique sur ${base}/site/${contrat.slug}/ n’est pas vue refusée`)
  // les trois mutations R9
  const fichierCommune = `${commune.chemin.replace(/^\/|\/$/g, '')}/index.html`
  const mutations = [
    { nom: 'gg5-accueil', quoi: `canonique de l’accueil sur ${base}/`, fichier: 'index.html', f: (h) => remplacerCanonique(h, `${base}/`), refuse: (r) => refuseCanonique(r, '/') },
    { nom: 'gg5-commune', quoi: `canonique de ${commune.chemin} sur ${base}${commune.chemin}`, fichier: fichierCommune, f: (h) => remplacerCanonique(h, `${base}${commune.chemin}`), refuse: (r) => refuseCanonique(r, commune.chemin) },
    { nom: 'gg5-sitemap', quoi: `<loc> de ${commune.chemin} sur ${base}${commune.chemin}`, fichier: 'sitemap.xml', f: (x) => x.replace(`<loc>${contrat.url_base}${commune.chemin}</loc>`, `<loc>${base}${commune.chemin}</loc>`), refuse: (r) => refuseSitemap(r) },
  ]
  for (const m of mutations) {
    let q
    try { q = siteQa(racine, muter(g.sortie, m.nom, m.fichier, m.f)) } catch (e) { echecs.push(`${m.quoi} : ${premiereLigne(e)}`); continue }
    if (!q.rapport) echecs.push(`${m.quoi} : ${q.erreur}`)
    else if (!m.refuse(q.rapport)) echecs.push(`site-qa accepte la ${m.quoi} (sans ${prefixe})`)
    else faits.push(`${m.quoi} → refusée`)
  }
  return { ok: !echecs.length, echecs, faits }
}

// ── Témoin ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function construireTemoin() {
  const d = preparerTemoin(JUGE, { copier: ['lib/urls.ts', 'public/sites-demo/_kit', 'public/sites-demo/_polices', 'public/sites-demo/lestraque', 'public/sites-demo/generer.mjs', 'scripts/site-qa.mjs'] })
  let n = 0
  for (const f of listerFichiers(d)) if (f.endsWith('.temoin')) { fs.renameSync(path.join(d, f), path.join(d, f.slice(0, -'.temoin'.length))); n++ }
  if (n < 2) throw new Error(`témoin incomplet : ${n} fichier(s) .temoin dans ${rel(path.join(FIXTURES, 'temoins', JUGE))}`)
  return d
}

// ── Le juge ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['critere'] })
  if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
  if (o.reel) { console.error('✗ ce juge n’a pas de mode --reel : il ne parle jamais à la production'); process.exit(2) }
  const ids = o.valeur('critere') === undefined ? IDS : o.liste('critere')
  if (o.drapeau('critere') || !ids.length || ids.some((x) => !IDS.includes(x))) { console.error(`✗ --critere attend des critères de ${IDS.join(', ')}`); process.exit(2) }
  const s = creerSortie(JUGE, ids, { racine: o.racine, temoin: o.temoin })
  const veut = (...xs) => xs.some((x) => ids.includes(x))
  if (ids !== IDS) s.note(`--critere : seulement ${ids.join(', ')}`)
  await s.executer(async () => {
    let racine = o.racine
    if (o.temoin) { racine = construireTemoin(); s.note(`témoin : ${rel(racine)} (générateur et site-qa de scripts/fixtures/025/temoins/${JUGE}/)`) }
    exigerSousTravail(ICI)
    const t0 = Date.now()
    // T1 (et le témoin Lestraque des mesures)
    let lestraque = null
    if (veut('T1', 'GG-1', 'GG-2', 'GG-3')) {
      const r1 = t1({ juge: JUGE, racine, sortie: path.join(ICI, 'lestraque') })
      if (veut('T1')) { s.resultat('T1', r1); for (const f of r1.faits) s.note(`T1 : ${f}`) }
      if (fichierNonVide(path.join(r1.sortie, 'index.html'))) lestraque = r1.sortie
    }
    // les quatre métiers
    const sites = [], nonGeneres = []
    if (veut('GG-1', 'GG-2', 'GG-3', 'GG-4')) {
      for (const m of METIERS) {
        try {
          const p = preparerMetier(m)
          const g = generer(racine, p.src, `metier-${m}`)
          if (g.code === 0) { sites.push({ nom: m, dossier: g.sortie }); s.note(`${m} : généré en ${g.secondes.toFixed(1)} s`) } else nonGeneres.push(echecGeneration(m, g))
        } catch (e) { nonGeneres.push(`${m} : ${premiereLigne(e)}`) }
      }
    }
    if (veut('GG-5')) { const r = await jugerCanoniqueSiteQa({ racine }); s.verdict('GG-5', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) }
    if (veut('GG-4')) { const r = await jugerCredits({ racine, siteElectricien: sites.find((x) => x.nom === 'electricien')?.dossier }); s.verdict('GG-4', r.ok, r.faits.join(' ; '), r.echecs.join(' ; ')) }
    if (veut('GG-1', 'GG-2', 'GG-3')) {
      const mesurables = [...sites, ...(lestraque ? [{ nom: 'lestraque', dossier: lestraque }] : [])]
      const rapport = exigerSousTravail(path.join(ICI, 'rapport', o.temoin ? 'temoin' : o.racineParDefaut ? 'depot' : 'racine'))
      fs.rmSync(rapport, { recursive: true, force: true }); fs.mkdirSync(rapport, { recursive: true })
      const r = await mesurerSites(mesurables, rapport)
      const attendus = []
      for (const x of mesurables) for (const p of x.pages || []) for (const moteur of MOTEURS) for (const f of FENETRES) attendus.push({ site: x.nom, chemin: p.chemin, moteur, fenetre: f.nom })
      fs.writeFileSync(path.join(rapport, 'mesure.json'), `${JSON.stringify({ racine: rel(racine), temoin: o.temoin, date: new Date().toISOString(), ...r }, null, 1)}\n`)
      s.note(`mesures : ${r.mesures.length} page(s) dans ${MOTEURS.join(' et ')}, ${rel(path.join(rapport, 'mesure.json'))} ; captures dans ${rel(path.join(rapport, 'captures'))}`)
      const v = jugerGeometrie(r, attendus)
      const avant = [...nonGeneres, ...(lestraque ? [] : ['Lestraque (témoin) non régénéré : voir T1'])]
      for (const id of ['GG-1', 'GG-2', 'GG-3']) if (veut(id)) { const e = [...avant, ...v[id].echecs]; s.verdict(id, !e.length, v[id].faits.join(' ; '), limiter(e, 12)) }
    }
    s.note(`durée : ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await principal()
