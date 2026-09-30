// scripts/fixtures/026-pilotage/t/outils.mjs — les outils communs aux juges du lot t (fiche 026-171), écrit par Claude Code :
// station-themes-qa, ecommerce-reservee-qa, leurs contrôles (controles.mjs) et le fabricant du témoin (fabriquer-temoin.mjs).
// Il importe a/commun.mjs (jamais l'inverse) et ne lit ni .env.local ni presti-secrets.
//
// Index : T, K, R, lireJson, copie, sha256 · themeEssai, schemaTheme, avecPortrait, transposer · geometrie : distanceSegment,
//   partiesDuGraphe, portesAtteintes, dispositionDefauts, materialiser · LOT_A_DOSSIERS · png, bruit · diffLignes ·
//   LIGNES_ECOMMERCE · listerImages, poidsDossier · lireEmpreintes.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { R, lireOuNull, listerFichiers } from '../a/commun.mjs'

export { R }
export const T = path.dirname(fileURLToPath(import.meta.url))
export const K = path.join(T, '..', 'k')
export const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
export const copie = (x) => JSON.parse(JSON.stringify(x))
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
export const themeEssai = () => lireJson(path.join(K, 'themes', 'essai', 'theme.json'))
export const schemaTheme = () => lireJson(path.join(K, 'theme.schema.json'))
export const jeuT = (nom) => lireJson(path.join(T, nom))

// ── Le thème en portrait ─────────────────────────────────────────────────────────────────────────────────────────────────
// Le thème d'essai n'a pas de bloc `portrait` : le juge en fabrique un en TRANSPOSANT le bureau (x ↔ y, largeur ↔ hauteur).
// Les portes restent sur leurs coursives (la distance d'une porte à sa bande ne change pas), les 21 emplacements y sont.
const tr = (p) => (p ? { ...p, x: p.y, y: p.x } : p)
function transposerEmplacement(e) {
  const f = e.forme
  const forme = f.type === 'polygone' ? { ...f, points: f.points.map(([x, y]) => [y, x]) } : { ...f, x: f.y, y: f.x, l: f.h, h: f.l }
  return { ...e, forme, porte: tr(e.porte), poste: e.poste === null ? null : tr(e.poste), plaque: tr(e.plaque) }
}
export function transposer(theme) {
  return {
    grille: { ...theme.grille, largeur: theme.grille.hauteur, hauteur: theme.grille.largeur },
    emplacements: theme.emplacements.map(transposerEmplacement),
    // Les identifiants de nœuds du portrait portent un « p » : une arête du portrait n'a jamais le même texte qu'une arête du bureau.
    coursives: { noeuds: theme.coursives.noeuds.map((n) => ({ ...tr(n), id: `p${n.id}` })), aretes: theme.coursives.aretes.map((a) => ({ ...a, de: `p${a.de}`, a: `p${a.a}` })) },
  }
}
export function avecPortrait(theme) { const t = copie(theme); t.portrait = transposer(t); return t }

// ── La géométrie des coursives (calcul INDÉPENDANT du module jugé) ───────────────────────────────────────────────────────
export function distanceSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, n = dx * dx + dy * dy
  const t = n === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / n))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}
/** Les composantes connexes du graphe : Map id de nœud → numéro de composante ; arêtes vers un nœud inconnu ignorées. */
export function partiesDuGraphe(coursives) {
  const ids = coursives.noeuds.map((n) => n.id)
  const parent = new Map(ids.map((i) => [i, i]))
  const racine = (i) => { while (parent.get(i) !== i) { parent.set(i, parent.get(parent.get(i))); i = parent.get(i) } return i }
  for (const a of coursives.aretes) if (parent.has(a.de) && parent.has(a.a)) parent.set(racine(a.de), racine(a.a))
  const num = new Map(), out = new Map()
  for (const i of ids) { const r = racine(i); if (!num.has(r)) num.set(r, num.size); out.set(i, num.get(r)) }
  return out
}
/** Pour chaque emplacement (clé), l'ensemble des composantes que sa porte touche (distance à une arête ≤ largeur / 2). */
export function composantesDesPortes(emplacements, coursives) {
  const comp = partiesDuGraphe(coursives), noeuds = new Map(coursives.noeuds.map((n) => [n.id, n]))
  const out = new Map()
  for (const e of emplacements) {
    const s = new Set()
    for (const a of coursives.aretes) {
      const p = noeuds.get(a.de), q = noeuds.get(a.a)
      if (p && q && distanceSegment(e.porte, p, q) <= a.largeur / 2) s.add(comp.get(a.de))
    }
    out.set(e.cle, s)
  }
  return out
}
/** Les emplacements (clés) dont la porte est reliée à celle de `depart` (emplacement du Commandement). */
export function portesAtteintes(emplacements, coursives, depart) {
  const c = composantesDesPortes(emplacements, coursives)
  const d = c.get(depart) ?? new Set()
  return new Set([...c].filter(([, s]) => [...s].some((x) => d.has(x))).map(([k]) => k))
}

// ── Les dispositions du jeu d'essai (dispositions.json) ─────────────────────────────────────────────────────────────────
/** salle → emplacement, d'après `defauts` du thème (les 21). */
export const dispositionDefauts = (theme) => ({ salles: Object.fromEntries(theme.defauts.map((d) => [d.salle, d.emplacement])) })
const vueDe = (theme, vue) => (vue === 'portrait' ? theme.portrait : theme)
/** Retire les arêtes qui touchent la porte de l'emplacement `cle` : la salle qui y siège n'est plus reliée. */
export function isoler(theme, vue, cle) {
  const v = vueDe(theme, vue)
  const e = v.emplacements.find((x) => x.cle === cle)
  const noeuds = new Map(v.coursives.noeuds.map((n) => [n.id, n]))
  return v.coursives.aretes.filter((a) => !(distanceSegment(e.porte, noeuds.get(a.de), noeuds.get(a.a)) <= a.largeur / 2))
}
/**
 * Fabrique { theme, disposition } d'un cas de dispositions.json (le jeu décrit des opérations, pas des dispositions complètes) :
 *   echanger [[a, b]…]   permute les emplacements de deux salles · fixer { salle: emplacement } · retirer [salle…]
 *   plaques { salle: texte } · portrait true : le thème reçoit son bloc `portrait` (transposé) ·
 *   coursives { isoler: salle, vue: 'bureau'|'portrait' }     : les arêtes qui touchent la porte de la salle disparaissent
 *                                                                DE LA DISPOSITION (coursives / portrait.coursives)
 *   themeCoupe { isoler: salle, vue }                          : elles disparaissent DU THÈME (la disposition reste celle des défauts)
 *   tapis { casser: i } | { etapeHors: true }                  : le tracé saute au point i / une étape quitte le tracé
 */
export function materialiser(essai, cas) {
  let theme = (cas.portrait || cas.vue === 'portrait' || cas.coursives?.vue === 'portrait' || cas.themeCoupe?.vue === 'portrait') ? avecPortrait(essai) : copie(essai)
  const d = dispositionDefauts(theme)
  const salles = d.salles
  for (const [a, b] of cas.echanger ?? []) { const x = salles[a]; salles[a] = salles[b]; salles[b] = x }
  for (const [s, e] of Object.entries(cas.fixer ?? {})) salles[s] = e
  for (const s of cas.retirer ?? []) delete salles[s]
  const disposition = { salles }
  if (cas.plaques) disposition.plaques = { ...cas.plaques }
  if (cas.coursives) {
    const c = cas.coursives, vue = c.vue ?? 'bureau'
    const empl = vueDe(theme, vue).emplacements.find((x) => x.cle === salles[c.isoler])
    void empl
    const coupe = { noeuds: copie(vueDe(theme, vue).coursives.noeuds), aretes: isoler(theme, vue, salles[c.isoler]) }
    if (vue === 'portrait') disposition.portrait = { coursives: coupe }; else disposition.coursives = coupe
  }
  if (cas.themeCoupe) {
    const c = cas.themeCoupe, vue = c.vue ?? 'bureau'
    const cle = salles[c.isoler]
    const v = vueDe(theme, vue)
    v.coursives = { noeuds: v.coursives.noeuds, aretes: isoler(theme, vue, cle) }
  }
  if (cas.tapis?.casser !== undefined) {
    const tp = copie(theme.tapis), p = tp.trace[cas.tapis.casser]
    p.x += 3 * theme.grille.pas
    disposition.tapis = tp
  }
  if (cas.tapis?.etapeHors) { const tp = copie(theme.tapis); tp.etapes[0].x += 1; disposition.tapis = tp }
  return { theme, disposition }
}

// ── Le lot A (10 packs CC0 de ~/station-assets, décision 1 de Benj) ─────────────────────────────────────────────────────
// Liste fermée relue dans docs/station/planche.md:21 (01, 02, 03, 08, 10) et docs/station/licence-planche.json (04, 05, 07, 09) ;
// 06-kenney-tiny-factory : docs/station/planche.md:21. Un pack hors de cette liste n'est pas du lot A.
export const LOT_A_DOSSIERS = ['01-ganamoda', '02-ansimuz-sideview', '03-warped-city', '04-rottingpixels-scifi-tileset', '05-zwonky-spacers', '06-kenney-tiny-factory', '07-ansimuz-tech-lab', '08-emceeflesher', '09-shade-puny-characters', '10-buch']
export const EXT_IMAGES = /\.(png|webp|avif|jpe?g|gif)$/i

/** Les empreintes des feuilles du lot A : { 'dossier/chemin': 'taille:sha256' } (format de station-planche-qa). */
export function lireEmpreintes(racineParDefaut) {
  const sources = []
  const maison = os.homedir()
  const live = path.join(maison, 'station-assets')
  if (fs.existsSync(live)) {
    const m = {}
    const voir = (d, r) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const q = path.join(d, e.name), rr = r ? `${r}/${e.name}` : e.name
        if (!r && e.name === '.venv') continue
        if (e.isDirectory()) voir(q, rr); else if (e.isFile()) { const b = fs.readFileSync(q); m[rr] = `${b.length}:${sha256(b)}` }
      }
    }
    voir(live, '')
    return { source: `~/station-assets relu (${Object.keys(m).length} fichiers)`, empreintes: m }
  }
  for (const f of [path.join(R, '.orchestre', 'travail', 'station-planche-qa', 'empreintes-lot-a.json'), path.join(maison, 'presti', '.orchestre', 'travail', 'station-planche-qa', 'empreintes-lot-a.json')]) {
    const t = lireOuNull(f)
    if (t) { try { return { source: `${path.relative(R, f).startsWith('..') ? f : path.relative(R, f)} (${Object.keys(JSON.parse(t)).length} fichiers)`, empreintes: JSON.parse(t) } } catch { sources.push(`${f} illisible`) } }
  }
  void racineParDefaut
  return { source: null, empreintes: null, essais: sources }
}

// ── Images et poids ─────────────────────────────────────────────────────────────────────────────────────────────────────
export function poidsDossier(dossier) {
  const fichiers = []
  for (const f of [...listerFichiers(dossier)].sort()) fichiers.push({ f, octets: fs.statSync(path.join(dossier, f)).size })
  return { fichiers, total: fichiers.reduce((s, x) => s + x.octets, 0) }
}

// ── Un encodeur PNG minimal et un bruit déterministe (fabriquer-temoin.mjs, jamais le juge) ─────────────────────────────
const TABLE_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = TABLE_CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const morceau = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data]))); return Buffer.concat([l, Buffer.from(type), data, c]) }
/** PNG RGBA (8 bits) ; `pixel(x, y)` rend [r, g, b, a]. */
export function png(largeur, hauteur, pixel) {
  const brut = Buffer.alloc((largeur * 4 + 1) * hauteur)
  for (let y = 0; y < hauteur; y++) for (let x = 0; x < largeur; x++) { const [r, g, b, a] = pixel(x, y); const o = y * (largeur * 4 + 1) + 1 + x * 4; brut[o] = r; brut[o + 1] = g; brut[o + 2] = b; brut[o + 3] = a }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(largeur, 0); ihdr.writeUInt32BE(hauteur, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), morceau('IHDR', ihdr), morceau('IDAT', zlib.deflateSync(brut, { level: 9 })), morceau('IEND', Buffer.alloc(0))])
}
/** Un générateur pseudo-aléatoire déterministe (mulberry32) : le même bruit à chaque fabrication. */
export function bruit(graine) { let a = graine >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ── Les lignes de la branche réservée (ecommerce-reservee-qa, fabriquer-temoin.mjs, 026-176) ────────────────────────────
// Une seule source : ce que le juge pose lui-même dans sa copie (--temoin) est ce que le témoin de la preuve porte.
export const LIGNES_ECOMMERCE = {
  drapeauCommentaire: '  /** Branche réservée par Benj le 25/09 : rien n’est construit ; elle attend ses trois vidéos sources. */',
  drapeau: '  ecommerce: false,',
  carte: "    'ecommerce': ['note', 'branche réservée : rien n’est construit, attend les trois vidéos sources de Benj'],",
  doc: [
    '# Branche e-commerce et dropshipping — réservée',
    '',
    'Décision 7 de Benj, le 25/09 : Presti aura une branche e-commerce et dropshipping. Elle est **réservée** : une place à part, rien de construit.',
    '',
    '- **Le drapeau `ecommerce`** de `lib/flags.ts` est éteint (`false`) ; sa ligne dans la carte de `scripts/fermeture-e2e.mjs` est une « note » (il ne ferme rien).',
    '- **La salle réservée** de la station (clé `ecommerce`, genre `reservee`, sans titulaire, jamais une destination) tient sa place : porte fermée, aucun poste.',
    '- **Rien n’est construit** : ni route, ni page, ni table, ni bibliothèque.',
    '- On ne construit rien avant les **trois vidéos sources** de Benj ; les fiches de cette branche formeront une série à part, après elles.',
    '',
  ].join('\n'),
}

// ── Un diff de lignes (ecommerce-reservee-qa EC-5) ──────────────────────────────────────────────────────────────────────
/** → [{ retirees: [lignes], ajoutees: [lignes], avant: i }] : les blocs de différence entre deux textes (plus longue sous-suite commune). */
export function diffLignes(base, nouveau) {
  const a = base.split(/\r?\n/), b = nouveau.split(/\r?\n/)
  const n = a.length, m = b.length
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const blocs = []
  let i = 0, j = 0, cur = null
  const vider = () => { if (cur) { blocs.push(cur); cur = null } }
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { vider(); i++; j++; continue }
    cur ??= { retirees: [], ajoutees: [], avant: i }
    if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) cur.ajoutees.push(b[j++])
    else cur.retirees.push(a[i++])
  }
  vider()
  return blocs
}
