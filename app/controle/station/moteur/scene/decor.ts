// Le DÉCOR de la carte (lot « décor » du 05/10, sur les écarts n° 1 à 3 de .orchestre/preuves/conformite-05-10/videos.md) : ce que la scène peint
// sous les personnages. Module PUR : il reçoit un contexte 2D, la carte du moteur, l'atlas du thème (une image, ou rien) et rend le tracé ; ni Phaser,
// ni réseau, ni horloge, ni hasard (les étoiles viennent d'une suite congruentielle à graine fixe : deux pages dessinent le même ciel).
//
// Ce que le thème « station » fournit (public/station/themes/station/atlas.png, CC0, voir licence.json) : au bureau, la COQUE entière (octogone à
// néon, antenne du toit, coursives, vingt et une cases) en un seul bloc 400 × 384 au pixel près de la grille du thème, posé à y = 384 de l'atlas,
// avec un fond uni (#0B0418) que `detourerCoque` rend transparent pour que le ciel passe derrière. Au téléphone (portrait) la coque est tracée
// ici avec les mêmes couleurs, et chaque case est recopiée du bloc du bureau (même clé de salle). Sans atlas (autre thème, image absente) tout se
// trace en code avec la palette du thème : la carte ne reste jamais vide.
//
// Le mobilier est du pixel art écrit ici (des rectangles, pas d'image) : chaque salle « sol » reçoit deux meubles de son genre, un de chaque côté du
// poste (le milieu reste libre pour le personnage), et un LISERÉ à la teinte de la salle (l'identité de la salle ne se lit plus dans un aplat).
import type { CarteMoteur } from '../theme/carte'
import type { Emplacement } from '../types'

type Ctx = CanvasRenderingContext2D
type Palette = Partial<Record<string, string>>

/** L'image de l'atlas qu'on sait lire (le bloc du bureau : 400 × 384 à y = 384, donc au moins 400 × 768). */
export const BLOC = { x: 0, y: 384, l: 400, h: 384 }
/** La tête de l'antenne du toit dans le bloc du bureau (le point autour duquel tourne l'antenne de la scène). */
export const ANTENNE_BUREAU: Emplacement = { x: 200, y: 25 }
/** Les cases de l'atlas (bloc du bureau) par clé d'emplacement : de là, le portrait recopie chaque case. Chaque case fait 48 × 48. */
export const CASES_ATLAS: Record<string, [number, number]> = {
  commandement: [80, 96], reunion: [128, 96], radar: [176, 96], observatoire: [224, 96], ecommerce: [272, 96],
  redaction: [56, 160], envois: [104, 160], standard: [152, 160], atelier: [200, 160], usine: [248, 160], crieur: [296, 160],
  recettes: [56, 224], tresorerie: [104, 224], studio: [152, 224], experience: [200, 224], presti: [248, 224], audience: [296, 224],
  machines: [104, 288], chantier: [152, 288], securite: [200, 288], repos: [248, 288],
}

// ── Les couleurs ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const hex = (s: string): [number, number, number] => {
  const v = parseInt(s.replace('#', '').slice(0, 6), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
const css = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`
const melange = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]

const MOBILIER: Record<string, string> = {
  k: '#1b0b33', p: '#2e1152', q: '#4a1675', m: '#c949ba', n: '#f08ad8', c: '#2fc6e0', C: '#1a8ca6', d: '#0e4f63', w: '#fff4f0', e: '#c9d0d8',
  y: '#f2d15c', o: '#e8923a', r: '#ff4d6d', g: '#3bd16f', G: '#1f8f4a', b: '#4d7cff', t: '#9c5b4b', T: '#6b3a3a', l: '#e3b7a3', s: '#8a8f98', S: '#596673',
}
const rect = (c: Ctx, x: number, y: number, w: number, h: number, couleur: string) => { c.fillStyle = couleur; c.fillRect(x, y, w, h) }

// ── Le mobilier : des rectangles [x, y, l, h, couleur] dans une boîte l × h ; `mur` se pose en haut de la salle, `sol` sur son plancher ───────────
type Meuble = { l: number; h: number; mur?: boolean; r: [number, number, number, number, string][] }
const MEUBLES: Record<string, Meuble> = {
  ecran: { l: 12, h: 11, mur: true, r: [[0, 0, 12, 8, 'k'], [1, 1, 10, 6, 'S'], [2, 2, 8, 4, 'c'], [2, 2, 3, 1, 'w'], [3, 5, 5, 1, 'C'], [5, 8, 2, 2, 'k'], [3, 10, 6, 1, 'k']] },
  bureau: { l: 14, h: 13, r: [[3, 0, 8, 6, 'k'], [4, 1, 6, 4, 'c'], [4, 1, 2, 1, 'w'], [6, 6, 2, 1, 'k'], [0, 7, 14, 3, 'l'], [0, 7, 14, 1, 'e'], [0, 10, 14, 1, 'T'], [1, 11, 2, 2, 'T'], [11, 11, 2, 2, 'T'], [4, 8, 6, 1, 'S']] },
  rack: { l: 10, h: 18, r: [[0, 0, 10, 18, 'k'], [1, 1, 8, 16, 'p'], [2, 2, 6, 3, 'q'], [3, 3, 1, 1, 'r'], [5, 3, 2, 1, 'c'], [2, 6, 6, 3, 'q'], [3, 7, 1, 1, 'g'], [5, 7, 2, 1, 'c'], [2, 10, 6, 3, 'q'], [3, 11, 1, 1, 'g'], [5, 11, 2, 1, 'y'], [2, 14, 6, 3, 'q'], [3, 15, 1, 1, 'r'], [5, 15, 2, 1, 'c']] },
  plante: { l: 8, h: 12, r: [[1, 8, 6, 4, 'T'], [2, 8, 4, 1, 't'], [3, 0, 2, 8, 'G'], [1, 2, 2, 4, 'g'], [5, 3, 2, 4, 'g'], [0, 5, 1, 2, 'G'], [3, 1, 1, 3, 'g']] },
  canape: { l: 14, h: 10, r: [[0, 0, 14, 5, 'k'], [1, 1, 12, 3, 'q'], [0, 5, 14, 5, 'k'], [1, 5, 12, 4, 'm'], [1, 5, 12, 1, 'n'], [0, 3, 2, 7, 'k'], [0, 4, 2, 5, 'q']] },
  radar: { l: 12, h: 12, mur: true, r: [[0, 0, 12, 12, 'k'], [1, 1, 10, 10, 'p'], [4, 2, 4, 8, 'd'], [3, 3, 6, 6, 'd'], [2, 4, 8, 4, 'd'], [6, 6, 3, 1, 'c'], [5, 4, 1, 1, 'g'], [7, 8, 1, 1, 'g'], [6, 2, 1, 1, 'c']] },
  coffre: { l: 12, h: 13, r: [[0, 0, 12, 12, 'k'], [1, 1, 10, 10, 'S'], [2, 2, 8, 8, 's'], [5, 4, 4, 4, 'y'], [6, 5, 2, 2, 'k'], [1, 12, 2, 1, 'k'], [9, 12, 2, 1, 'k']] },
  pieces: { l: 8, h: 8, r: [[0, 5, 7, 3, 'o'], [0, 5, 7, 2, 'y'], [1, 2, 6, 3, 'o'], [1, 2, 6, 2, 'y'], [2, 0, 4, 2, 'y']] },
  graphique: { l: 12, h: 12, mur: true, r: [[0, 0, 12, 12, 'k'], [1, 1, 10, 10, 'p'], [2, 7, 2, 3, 'g'], [5, 5, 2, 5, 'c'], [8, 3, 2, 7, 'y'], [2, 10, 8, 1, 's']] },
  hautparleur: { l: 12, h: 10, r: [[0, 3, 3, 4, 'S'], [3, 2, 3, 6, 'y'], [6, 1, 3, 8, 'o'], [9, 0, 3, 10, 'y'], [1, 7, 2, 3, 'k']] },
  caisse: { l: 12, h: 13, r: [[0, 6, 7, 7, 'k'], [1, 7, 5, 5, 't'], [1, 9, 5, 1, 'T'], [3, 7, 1, 5, 'T'], [5, 0, 7, 7, 'k'], [6, 1, 5, 5, 'l'], [6, 3, 5, 1, 't'], [8, 1, 1, 5, 't']] },
  convoyeur: { l: 14, h: 8, r: [[0, 4, 14, 3, 'S'], [0, 3, 14, 1, 'k'], [0, 7, 14, 1, 'k'], [1, 5, 1, 1, 'y'], [5, 5, 1, 1, 'y'], [9, 5, 1, 1, 'y'], [4, 0, 5, 4, 'T'], [5, 1, 3, 2, 't'], [4, 0, 5, 1, 'l']] },
  projecteur: { l: 10, h: 16, r: [[0, 0, 10, 7, 'k'], [1, 1, 8, 5, 'w'], [2, 2, 6, 3, 'y'], [4, 7, 2, 6, 'S'], [1, 13, 8, 1, 'S'], [0, 14, 3, 2, 'k'], [7, 14, 3, 2, 'k']] },
  bouclier: { l: 12, h: 12, mur: true, r: [[0, 0, 12, 12, 'k'], [1, 1, 10, 10, 'p'], [3, 2, 6, 5, 'c'], [4, 7, 4, 2, 'c'], [5, 9, 2, 1, 'c'], [5, 4, 2, 2, 'k'], [2, 2, 1, 1, 'w']] },
  fiole: { l: 10, h: 12, r: [[3, 0, 4, 1, 'w'], [3, 1, 4, 3, 'e'], [2, 4, 6, 1, 'e'], [1, 5, 8, 6, 'e'], [2, 7, 6, 4, 'g'], [2, 7, 6, 1, 'n'], [0, 11, 10, 1, 'k']] },
  rouage: { l: 12, h: 12, mur: true, r: [[5, 0, 2, 12, 'S'], [0, 5, 12, 2, 'S'], [2, 2, 8, 8, 'S'], [3, 3, 6, 6, 's'], [5, 5, 2, 2, 'k'], [1, 1, 2, 2, 'S'], [9, 1, 2, 2, 'S'], [1, 9, 2, 2, 'S'], [9, 9, 2, 2, 'S']] },
  plans: { l: 14, h: 10, r: [[0, 3, 14, 5, 'k'], [1, 4, 12, 3, 'C'], [2, 5, 5, 1, 'w'], [8, 5, 3, 1, 'w'], [1, 8, 2, 2, 'T'], [11, 8, 2, 2, 'T']] },
  signal: { l: 14, h: 8, r: [[0, 2, 14, 4, 'k'], [1, 3, 2, 2, 'y'], [5, 3, 2, 2, 'y'], [9, 3, 2, 2, 'y'], [1, 6, 2, 2, 'S'], [11, 6, 2, 2, 'S']] },
}

/** Les salles « sol » : deux meubles, un de chaque côté du poste. Les salles à pavé néon de l'atlas (Commandement, Réunion…) gardent leur pavé. */
const SALLES_MEUBLEES: Record<string, [string, string]> = {
  radar: ['radar', 'ecran'], envois: ['caisse', 'bureau'], atelier: ['plans', 'fiole'], usine: ['convoyeur', 'rouage'], crieur: ['hautparleur', 'ecran'],
  recettes: ['graphique', 'pieces'], tresorerie: ['coffre', 'pieces'], studio: ['projecteur', 'ecran'], audience: ['graphique', 'plante'],
  machines: ['rack', 'rouage'], chantier: ['caisse', 'signal'], securite: ['bouclier', 'ecran'], repos: ['canape', 'plante'],
}

/** Sans l'atlas, les deux salles rondes de l'atlas n'ont pas leur pavé : elles reçoivent un mobilier comme les autres. */
const SALLES_SANS_ATLAS: Record<string, [string, string]> = { reunion: ['plante', 'ecran'], observatoire: ['radar', 'plante'] }

/** Pose un meuble : `x` est son bord gauche, `y` le haut de la salle, `bas` la ligne du plancher ; `f` est l'agrandissement entier (une case de 96 px prend des meubles ×2). */
function poserMeuble(c: Ctx, nom: string, x: number, y: number, bas: number, f: number) {
  const m = MEUBLES[nom]
  if (!m) return
  const oy = m.mur ? y + 4 * f : y + bas * f - m.h * f
  if (!m.mur) { c.fillStyle = 'rgba(27,11,51,0.35)'; c.fillRect(x + f, y + bas * f, m.l * f, f) }
  for (const [rx, ry, rl, rh, col] of m.r) rect(c, x + rx * f, oy + ry * f, rl * f, rh * f, MOBILIER[col] ?? '#ff00ff')
}

// ── Les boîtes ────────────────────────────────────────────────────────────────────────────────────────────────────────────
type Boite = { x: number; y: number; l: number; h: number }
const boiteDe = (e: CarteMoteur['emplacements'][number]): Boite => {
  const f = e.forme
  if (f.type === 'polygone' && f.points?.length) {
    const xs = f.points.map((p) => p[0]), ys = f.points.map((p) => p[1])
    return { x: Math.min(...xs), y: Math.min(...ys), l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  }
  return { x: f.x ?? 0, y: f.y ?? 0, l: f.l ?? 0, h: f.h ?? 0 }
}

// ── Le ciel : nébuleuse tramée et étoiles, sans hasard ni horloge ───────────────────────────────────────────────────────────
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const BLOBS = [
  { x: 0.1, y: 0.1, r: 0.34, a: true, f: 0.95 }, { x: 0.94, y: 0.16, r: 0.26, a: false, f: 1 }, { x: 0.06, y: 0.9, r: 0.3, a: false, f: 1 },
  { x: 0.9, y: 0.93, r: 0.32, a: true, f: 0.85 }, { x: 0.52, y: 0.02, r: 0.22, a: false, f: 0.7 }, { x: 0.5, y: 0.99, r: 0.2, a: true, f: 0.6 },
]

/** Une suite congruentielle (Numerical Recipes) : le même ciel à chaque page, jamais de tirage au hasard. */
function suite(graine: number) {
  let s = graine >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

/** Le ciel ne dépend que de la taille, de la palette et du jour ou de la nuit : il est tracé une fois, puis recopié (la carte se rebâtit au zoom et à la perte du contexte). */
const CIELS = new Map<string, HTMLCanvasElement>()
export function peindreCiel(c: Ctx, l: number, h: number, pal: Palette, nuit: boolean, reserve: Boite | null) {
  const cle = [l, h, nuit ? 1 : 0, pal['--mc-fond'], pal['--mc-mur'], pal['--mc-accent'], pal['--mc-texte'], pal['--mc-ecran'], reserve ? `${reserve.y}:${reserve.h}` : ''].join('|')
  let ciel = CIELS.get(cle)
  if (!ciel && typeof document !== 'undefined') {
    ciel = document.createElement('canvas')
    ciel.width = l
    ciel.height = h
    const g = ciel.getContext('2d')
    if (g) { tracerCiel(g, l, h, pal, nuit, reserve); if (CIELS.size > 6) CIELS.clear(); CIELS.set(cle, ciel) } else ciel = undefined
  }
  if (ciel) c.drawImage(ciel, 0, 0)
  else tracerCiel(c, l, h, pal, nuit, reserve)
}

function tracerCiel(c: Ctx, l: number, h: number, pal: Palette, nuit: boolean, reserve: Boite | null) {
  const fond = hex(pal['--mc-fond'] ?? '#0b0418'), mur = hex(pal['--mc-mur'] ?? '#4a1675'), accent = hex(pal['--mc-accent'] ?? '#c949ba')
  const texte = hex(pal['--mc-texte'] ?? '#fff4f0'), ecran = hex(pal['--mc-ecran'] ?? '#2fc6e0')
  const image = c.createImageData(l, h), d = image.data
  const force = nuit ? 0.62 : 1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      let fm = 0, fa = 0
      for (const b of BLOBS) {
        const dx = (x / l - b.x) * (l / Math.max(l, h)), dy = (y / h - b.y) * (h / Math.max(l, h))
        if (Math.abs(dx) >= b.r || Math.abs(dy) >= b.r) continue
        const t = 1 - Math.hypot(dx, dy) / b.r
        if (t > 0) { const v = t * t * b.f; if (b.a) fa += v; else fm += v }
      }
      const bruit = 0.78 + 0.22 * Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2.4)
      const v = (fm * 0.95 + fa * 0.7) * bruit * force
      const q = Math.max(0, Math.min(3, Math.floor(v * 3 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9 + 0.5)))
      const base = fa > fm ? accent : mur
      const px = melange(fond, base, [0, 0.2, 0.38, 0.58][q])
      const i = (y * l + x) * 4
      d[i] = px[0]; d[i + 1] = px[1]; d[i + 2] = px[2]; d[i + 3] = 255
    }
  }
  c.putImageData(image, 0, 0)
  // Les étoiles : un pixel (la plupart), quelques croix de trois pixels. Rien là où le tapis porte ses libellés (bande `reserve`).
  const alea = suite(0x57a71)
  const n = Math.round((l * h) / 1500)
  const teintes = [texte, ecran, accent, melange(texte, fond, 0.45), melange(texte, fond, 0.45), texte]
  for (let i = 0; i < n; i++) {
    const x = 2 + Math.floor(alea() * (l - 4)), y = 2 + Math.floor(alea() * (h - 4)), t = alea(), k = Math.floor(alea() * teintes.length)
    if (reserve && x >= reserve.x - 2 && x <= reserve.x + reserve.l + 2 && y >= reserve.y - 2 && y <= reserve.y + reserve.h + 2) continue
    const couleur = nuit ? teintes[k] : melange(teintes[k], fond, 0.18)
    rect(c, x, y, 1, 1, css(couleur))
    if (t > 0.9) {
      const lueur = css(melange(couleur, fond, 0.6))
      rect(c, x - 1, y, 1, 1, lueur); rect(c, x + 1, y, 1, 1, lueur); rect(c, x, y - 1, 1, 1, lueur); rect(c, x, y + 1, 1, 1, lueur)
    }
  }
}

// ── La coque ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Le bloc « bureau » de l'atlas, débarrassé de son fond uni : tout pixel de la couleur du coin haut-gauche relié au bord par des pixels de
 * cette couleur devient transparent (le ciel passe derrière la coque ; les cases de l'intérieur gardent leurs couleurs). null si l'atlas n'a
 * pas la forme attendue (image absente, trop petite) : la coque se trace alors en code.
 */
export function detourerCoque(atlas: CanvasImageSource | null): HTMLCanvasElement | null {
  const source = atlas as { width?: number; height?: number } | null
  if (!source || !source.width || !source.height || source.width < BLOC.x + BLOC.l || source.height < BLOC.y + BLOC.h) return null
  if (typeof document === 'undefined') return null
  const toile = document.createElement('canvas')
  toile.width = BLOC.l
  toile.height = BLOC.h
  const g = toile.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  g.drawImage(atlas as CanvasImageSource, BLOC.x, BLOC.y, BLOC.l, BLOC.h, 0, 0, BLOC.l, BLOC.h)
  const image = g.getImageData(0, 0, BLOC.l, BLOC.h), d = image.data
  const r = d[0], v = d[1], b = d[2]
  if (d[3] !== 255) return toile
  const pareil = (i: number) => d[i * 4] === r && d[i * 4 + 1] === v && d[i * 4 + 2] === b && d[i * 4 + 3] === 255
  const vu = new Uint8Array(BLOC.l * BLOC.h), pile = new Int32Array(BLOC.l * BLOC.h)
  let n = 0
  const pousser = (x: number, y: number) => { const i = y * BLOC.l + x; if (!vu[i] && pareil(i)) { vu[i] = 1; pile[n++] = i } }
  for (let x = 0; x < BLOC.l; x++) { pousser(x, 0); pousser(x, BLOC.h - 1) }
  for (let y = 0; y < BLOC.h; y++) { pousser(0, y); pousser(BLOC.l - 1, y) }
  while (n) {
    const i = pile[--n], x = i % BLOC.l, y = (i - x) / BLOC.l
    d[i * 4 + 3] = 0
    if (x > 0) pousser(x - 1, y)
    if (x < BLOC.l - 1) pousser(x + 1, y)
    if (y > 0) pousser(x, y - 1)
    if (y < BLOC.h - 1) pousser(x, y + 1)
  }
  g.putImageData(image, 0, 0)
  return toile
}

/** Un octogone plein, rasterisé ligne à ligne (aucun lissage : les biseaux sont des escaliers de pixels), avec un trait de `epais` pixels. */
function octogone(c: Ctx, x0: number, y0: number, x1: number, y1: number, biseau: number, remplissage: string, trait: string, epais: number, rayure: string | null) {
  for (let y = y0; y < y1; y++) {
    const haut = y - y0, bas = y1 - 1 - y
    const retrait = Math.max(0, biseau - Math.min(haut, bas))
    const a = x0 + retrait, b = x1 - retrait
    rect(c, a, y, b - a, 1, remplissage)
    if (rayure && (y - y0) % 7 === 3) rect(c, a + epais, y, b - a - 2 * epais, 1, rayure)
    if (Math.min(haut, bas) < epais) { rect(c, a, y, b - a, 1, trait); continue }
    const bord = retrait > 0 ? epais + 1 : epais
    rect(c, a, y, bord, 1, trait)
    rect(c, b - bord, y, bord, 1, trait)
  }
}

function coqueEnCode(c: Ctx, l: number, h: number, boites: Boite[], pal: Palette) {
  const sol = pal['--mc-coursive'] ?? '#2e1152', mur = pal['--mc-mur'] ?? '#4a1675', neon = pal['--mc-porte'] ?? '#c949ba'
  const minX = Math.min(...boites.map((b) => b.x)), maxX = Math.max(...boites.map((b) => b.x + b.l))
  const minY = Math.min(...boites.map((b) => b.y)), maxY = Math.max(...boites.map((b) => b.y + b.h))
  const x0 = Math.max(4, minX - 14), x1 = Math.min(l - 4, maxX + 14), y0 = Math.max(10, minY - 16), y1 = Math.min(h - 6, maxY + 18)
  octogone(c, x0, y0, x1, y1, 14, sol, neon, 2, mur)
  // Le couloir entre deux rangées de salles : une bande plus sombre, un pointillé de voyants.
  const rangees = [...new Set(boites.map((b) => b.y))].sort((a, b) => a - b)
  for (let i = 0; i + 1 < rangees.length; i++) {
    const bas = Math.max(...boites.filter((b) => b.y === rangees[i]).map((b) => b.y + b.h)), haut = rangees[i + 1]
    if (haut - bas < 6) continue
    rect(c, x0 + 3, bas + 2, x1 - x0 - 6, haut - bas - 4, 'rgba(11,4,24,0.45)')
    for (let x = x0 + 8; x < x1 - 8; x += 8) rect(c, x, Math.floor((bas + haut) / 2), 2, 1, 'rgba(47,198,224,0.55)')
  }
  // L'antenne : un mât et sa boule, sur le bord haut, à droite du milieu de la coque.
  const ax = Math.round((x0 + x1) / 2)
  rect(c, ax, y0 - 7, 1, 8, '#8a8f98')
  rect(c, ax - 1, y0 - 9, 3, 3, '#9aa3b2')
}

// ── Une case ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function caseEnCode(c: Ctx, b: Boite, pal: Palette, reservee: boolean, pave: boolean) {
  const neon = pal['--mc-porte'] ?? '#c949ba', sol = pal['--mc-sol'] ?? '#cf9782'
  if (reservee) {
    rect(c, b.x, b.y, b.l, b.h, '#1b0b33'); rect(c, b.x + 2, b.y + 2, b.l - 4, 1, '#8a8f98'); rect(c, b.x + 2, b.y + b.h - 3, b.l - 4, 1, '#8a8f98')
    rect(c, b.x + 2, b.y + 2, 1, b.h - 4, '#8a8f98'); rect(c, b.x + b.l - 3, b.y + 2, 1, b.h - 4, '#8a8f98')
    return
  }
  const f = Math.max(1, Math.floor(Math.min(b.l, b.h) / 48)), plinthe = 6 * f
  rect(c, b.x, b.y, b.l, b.h, neon)
  rect(c, b.x + 1, b.y + 1, b.l - 2, b.h - 2, sol)
  rect(c, b.x + 1, b.y + b.h - plinthe, b.l - 2, 4 * f, '#6b3a3a')
  if (pave) {
    // Le pavé d'une salle de pilotage : un cadre sombre, un liseré à la couleur du néon, et le carré où se tient le personnage.
    const m = 3 * f
    rect(c, b.x + m, b.y + m, b.l - 2 * m, b.h - 3 * m, pal['--mc-coursive'] ?? '#2e1152')
    rect(c, b.x + m + 2 * f, b.y + m + 2 * f, b.l - 2 * m - 4 * f, b.h - 3 * m - 4 * f, neon)
    rect(c, b.x + m + 4 * f, b.y + m + 4 * f, b.l - 2 * m - 8 * f, b.h - 3 * m - 8 * f, pal['--mc-fond'] ?? '#1b0b33')
  }
}

/** Le plancher d'une case meublée : le sol d'origine (effaçant les repères de l'atlas), des dalles discrètes, la plinthe. */
function replancher(c: Ctx, b: Boite, pal: Palette, f: number) {
  const sol = hex(pal['--mc-sol'] ?? '#cf9782')
  const plinthe = 6 * f
  rect(c, b.x + 1, b.y + 1, b.l - 2, b.h - 1 - plinthe, css(sol))
  const joint = css(melange(sol, [27, 11, 51], 0.12))
  for (let i = 16 * f; i < b.l - 1; i += 16 * f) rect(c, b.x + i, b.y + 1, 1, b.h - 1 - plinthe, joint)
  for (let j = 16 * f; j < b.h - plinthe; j += 16 * f) rect(c, b.x + 1, b.y + j, b.l - 2, 1, joint)
}

/** Le liseré : la teinte de la salle en bandeau sur le haut et en filet sur le contour ; l'identité de la salle n'est plus un aplat. */
function lisere(c: Ctx, b: Boite, teinte: string, forme: Emplacement[] | null) {
  c.fillStyle = teinte
  if (forme) {
    for (const [i, p] of forme.entries()) {
      const q = forme[(i + 1) % forme.length]
      const n = Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y))
      for (let s = 0; s <= n; s++) c.fillRect(Math.round(p.x + ((q.x - p.x) * s) / Math.max(1, n)), Math.round(p.y + ((q.y - p.y) * s) / Math.max(1, n)), 1, 1)
    }
    return
  }
  c.fillRect(b.x, b.y, b.l, 3)
  c.fillRect(b.x, b.y, 1, b.h)
  c.fillRect(b.x + b.l - 1, b.y, 1, b.h)
  c.fillRect(b.x, b.y + b.h - 1, b.l, 1)
}

// ── Le tout ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type ParamsDecor = {
  carte: CarteMoteur
  nuit: boolean
  /** L'atlas du thème, déjà chargé (l'image brute), ou null. */
  atlas: CanvasImageSource | null
  /** Le bloc du bureau sans son fond (detourerCoque(atlas)), calculé une fois par la scène, ou null. */
  coque: HTMLCanvasElement | null
}

/** Rend la tête de l'antenne si le décor en porte une (le bloc du bureau), sinon null (la scène prend alors la zone libre du bord haut). */
export function peindreDecor(c: Ctx, p: ParamsDecor): { antenne: Emplacement | null } {
  const { carte, nuit } = p
  // Les repères de l'atlas (la coque, les cases) sont ceux du thème « station » : un autre thème n'a pas la même planche.
  const sonAtlas = carte.cle === 'station'
  const atlas = sonAtlas ? p.atlas : null
  const coque = sonAtlas ? p.coque : null
  const { width: l, height: h } = carte.canvas
  const pal = carte.palette as Palette
  const boites = carte.emplacements.map(boiteDe)
  const bureau = !!coque && l === BLOC.l && h === BLOC.h
  const dim = atlas as { width?: number; height?: number } | null
  const atlasLisible = !!dim && (dim.width ?? 0) >= BLOC.x + BLOC.l && (dim.height ?? 0) >= BLOC.y + BLOC.h
  const trace = carte.tapis.trace
  const reserve = trace.length ? { x: 0, y: Math.min(...trace.map((q) => q.y)) - 14, l, h: 28 } : null
  peindreCiel(c, l, h, pal, nuit, reserve)

  if (bureau && coque) c.drawImage(coque, 0, 0)
  else if (boites.length) coqueEnCode(c, l, h, boites, pal)

  for (const [i, e] of carte.emplacements.entries()) {
    const b = boites[i]
    const dansAtlas = CASES_ATLAS[e.cle]
    const meubles = SALLES_MEUBLEES[e.cle] ?? (bureau || atlasLisible ? undefined : SALLES_SANS_ATLAS[e.cle])
    if (!bureau) {
      if (atlas && atlasLisible && dansAtlas) c.drawImage(atlas, BLOC.x + dansAtlas[0], BLOC.y + dansAtlas[1], 48, 48, b.x, b.y, 48, 48)
      else caseEnCode(c, b, pal, e.reservee, !meubles && !e.reservee && e.cle !== 'reunion' && e.cle !== 'observatoire')
    }
    if (e.reservee) continue
    if (meubles) {
      const f = Math.max(1, Math.floor(Math.min(b.l, b.h) / 48))
      replancher(c, b, pal, f)
      // Le repère du poste : une dalle plus sombre sous les pieds du personnage, pour qu'il ne flotte pas.
      const poste = e.poste ?? { x: b.x + Math.floor(b.l / 2), y: b.y + Math.floor(b.h / 2) }
      rect(c, poste.x - 7 * f, poste.y, 14 * f, 2 * f, 'rgba(107,58,58,0.45)')
      poserMeuble(c, meubles[0], b.x + 3 * f, b.y, 34, f)
      poserMeuble(c, meubles[1], b.x + b.l - (3 + (MEUBLES[meubles[1]]?.l ?? 12)) * f, b.y, 34, f)
    }
    const teinte = carte.teintes[e.cle] ?? e.teinte
    const f = e.forme
    lisere(c, b, teinte, f.type === 'polygone' && f.points?.length ? f.points.map(([x, y]) => ({ x, y })) : null)
  }

  if (nuit) { c.fillStyle = 'rgba(4,6,26,0.46)'; c.fillRect(0, 0, l, h) }
  return { antenne: bureau ? ANTENNE_BUREAU : null }
}
