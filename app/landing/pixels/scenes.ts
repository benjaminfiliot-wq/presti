// app/landing/pixels/scenes.ts — les quatre scènes d'artisan en pixels (version artisan des « pixels qui avancent » de mistral.ai).
// Chaque scène est une liste de cases sur une grille logique (colonnes × rangs), dans l'ordre de dessin. Chaque case porte son
// moment d'apparition sur la progression p (0 → 1) : `d` (début) et `u` (durée), et son effet :
//   fixe    toujours là (silhouettes, sol) ;
//   pose    la brique qu'on pose : elle tombe de `dy` cases et se pose avec un petit rebond (back.out 1,6), éclair de mortier ivoire ;
//   vol     la case arrive de (dx, dy) et se pose (power3.out) : les outils qui s'assemblent case par case ;
//   allume  la case s'allume sur place (smoothstep) : le ciel en marches, la fenêtre ;
//   eteint  la case s'éteint (les étoiles quand l'aube monte) ;
//   monte   la case monte de `dy` cases, par marches entières (le soleil derrière l'horizon).
// Déterministe (graine fixe) : mêmes cases à chaque rendu. Palette de moteur.ts seulement.
import { PALETTE, graine, teinte } from './moteur'

export type Effet = 'fixe' | 'pose' | 'vol' | 'allume' | 'eteint' | 'monte'
export type Cellule = {
  x: number; y: number
  /** couleur CSS */
  c: string
  /** opacité de base */
  a: number
  /** début et durée sur la progression (0 → 1) */
  d: number; u: number
  e: Effet
  dx: number; dy: number
  /** couleur de l'éclair à la pose (mortier frais), si la case en a un */
  eclair?: string
  /** pour « monte » : la case n'est dessinée qu'au-dessus de ce rang (le soleil derrière l'horizon) */
  horizon?: number
}
export type NomScene = 'mur' | 'maison' | 'outils' | 'aube'
export type Scene = { nom: NomScene; colonnes: number; rangs: number; ecart: number; dureeBoucle: number; cellules: Cellule[] }

const P = PALETTE
const IVOIRE_MORTIER = (c: string) => teinte(c, P.ivoire, 0.6)
/** Le sol et les bois du chantier : un ivoire chauffé de corail (jamais un gris froid). */
const SOL = teinte(P.ivoire, P.corail, 0.3)
const COULEURS: Record<string, string> = {
  I: P.ivoire, C: P.corail, D: P.corailProfond, A: P.ambre, L: P.corailClair, E: P.etincelle,
}

function cellule(x: number, y: number, c: string, e: Effet, d = 0, u = 0.05, extra: Partial<Cellule> = {}): Cellule {
  return { x, y, c, a: 1, d, u, e, dx: 0, dy: 0, ...extra }
}

// ── Le mur : briques posées une à une, rangée par rangée (le maçon va et vient), puis le niveau posé dessus, bulle au centre.
// Briques de 6 × 3 cases, joint d'une case (le fond fait le mortier), appareil en quinconce : demi-briques en bout de rangée impaire.
function mur(): Scene {
  const hasard = graine(2211)
  const cellules: Cellule[] = []
  const colonnes = 54, rangs = 32, x0 = 3, sol = 29, assises = 6, L = 6, H = 3
  for (let x = 1; x <= 52; x++) cellules.push(cellule(x, sol, SOL, 'allume', 0, 0.05, { a: 0.3 }))

  type Brique = { x: number; y: number; l: number }
  const rangees: Brique[][] = []
  for (let k = 0; k < assises; k++) {
    const y = sol - H - (H + 1) * k
    const r: Brique[] = []
    if (k % 2 === 0) for (let j = 0; j < 7; j++) r.push({ x: x0 + (L + 1) * j, y, l: L })
    else {
      r.push({ x: x0, y, l: 3 })
      for (let j = 0; j < 6; j++) r.push({ x: x0 + 4 + (L + 1) * j, y, l: L })
      r.push({ x: x0 + 4 + (L + 1) * 6, y, l: 2 })
    }
    rangees.push(k % 2 === 0 ? r : r.reverse())
  }
  const toutes = rangees.flat()
  const teintes = [P.corail, P.corail, P.corailProfond, teinte(P.corail, P.ambre, 0.28), teinte(P.corailProfond, P.corail, 0.5)]
  toutes.forEach((b, j) => {
    const base = teintes[Math.floor(hasard() * teintes.length)]
    const haut = teinte(base, P.corailClair, 0.45)
    const ombre = teinte(base, P.nuit, 0.22)
    const d = 0.04 + (j / toutes.length) * 0.74
    for (let dx = 0; dx < b.l; dx++) for (let dy = 0; dy < H; dy++) {
      const c = dy === 0 ? haut : dy === H - 1 || dx === b.l - 1 ? ombre : base
      cellules.push(cellule(b.x + dx, b.y + dy, c, 'pose', d, 0.11, { dy: 4, eclair: IVOIRE_MORTIER(c) }))
    }
  })

  // Le niveau, posé sur la dernière assise ; la bulle s'allume au centre (l'étincelle rare de la scène).
  const niveau = ['LLLLLLLLLLLLLLLL', 'AAAAAAIIIIAAAAAA', 'DDDDDDDDDDDDDDDD']
  const nx = 19, ny = sol - H - (H + 1) * (assises - 1) - 4
  niveau.forEach((ligne, dy) => [...ligne].forEach((ch, dx) => {
    cellules.push(cellule(nx + dx, ny + dy, COULEURS[ch], 'vol', 0.84, 0.1, { dy: -6 }))
  }))
  cellules.push(cellule(nx + 7, ny + 1, P.etincelle, 'allume', 0.95, 0.05), cellule(nx + 8, ny + 1, P.etincelle, 'allume', 0.95, 0.05))
  return { nom: 'mur', colonnes, rangs, ecart: 0, dureeBoucle: 3800, cellules }
}

// ── La maison : l'échafaudage, la fondation, les murs assise par assise, les linteaux, le toit en marches, la cheminée, la porte,
// puis la fenêtre qui s'allume (ambre, cœur d'étincelle, halo sur la façade).
function maison(): Scene {
  const hasard = graine(4807)
  const cellules: Cellule[] = []
  const colonnes = 48, rangs = 36, sol = 33
  for (let x = 2; x <= 45; x++) cellules.push(cellule(x, sol, SOL, 'allume', 0, 0.05, { a: 0.3 }))
  // L'échafaudage du chantier, à droite.
  const echaf = SOL
  for (const x of [39, 43]) for (let y = 15; y <= 32; y++) cellules.push(cellule(x, y, echaf, 'allume', 0.02 + (32 - y) * 0.004, 0.04, { a: 0.3 }))
  for (const y of [20, 26]) for (let x = 38; x <= 44; x++) cellules.push(cellule(x, y, echaf, 'allume', 0.06 + (x - 38) * 0.004, 0.04, { a: 0.38 }))
  for (let i = 0; i < 5; i++) cellules.push(cellule(40 + i % 3, 27 + i, echaf, 'allume', 0.08, 0.04, { a: 0.2 }))

  // La fondation.
  for (let x = 10; x <= 37; x++) cellules.push(cellule(x, 32, teinte(P.corailProfond, P.nuit, 0.3), 'pose', 0.02 + ((x - 10) / 27) * 0.06, 0.05, { dy: 2 }))

  const dansFenetre = (x: number, y: number, x0: number) => x >= x0 && x <= x0 + 4 && y >= 21 && y <= 24
  const dansPorte = (x: number, y: number) => x >= 22 && x <= 25 && y >= 26 && y <= 31
  const assises = 13
  for (let k = 0; k < assises; k++) {
    const y = 31 - k
    const decal = (k % 2) * 2
    const nb = Math.ceil((26 + decal) / 3)
    for (let x = 11; x <= 36; x++) {
      if (dansFenetre(x, y, 14) || dansFenetre(x, y, 29) || dansPorte(x, y)) continue
      const b = Math.floor((x - 11 + decal) / 3)
      const alt = (b + k) % 2 === 0
      const c = hasard() < 0.08 ? P.corailClair : alt ? P.corail : teinte(P.corail, P.corailProfond, 0.55)
      const d = 0.08 + ((k + b / nb) / assises) * 0.42
      cellules.push(cellule(x, y, c, 'pose', d, 0.06, { dy: 2, eclair: IVOIRE_MORTIER(c) }))
    }
  }
  const finAssise = (k: number) => 0.08 + ((k + 1) / assises) * 0.42
  // Linteaux (au-dessus des fenêtres et de la porte), cadres de fenêtre, vitres sombres.
  for (let x = 13; x <= 19; x++) cellules.push(cellule(x, 20, teinte(P.ivoire, P.corail, 0.12), 'pose', finAssise(10), 0.05, { dy: 2 }))
  for (let x = 28; x <= 34; x++) cellules.push(cellule(x, 20, teinte(P.ivoire, P.corail, 0.12), 'pose', finAssise(10), 0.05, { dy: 2 }))
  for (let x = 21; x <= 26; x++) cellules.push(cellule(x, 25, teinte(P.ivoire, P.corail, 0.12), 'pose', finAssise(5), 0.05, { dy: 2 }))
  for (const x0 of [14, 29]) for (let y = 21; y <= 24; y++) for (let x = x0; x <= x0 + 4; x++) {
    const bord = x === x0 || x === x0 + 4 || y === 21 || y === 24 || x === x0 + 2
    cellules.push(cellule(x, y, bord ? teinte(P.ivoire, P.corail, 0.18) : teinte(P.nuit, P.corailProfond, 0.22), 'allume', finAssise(7), 0.04))
  }

  // Le toit, en marches : huit rangs de tuiles, du bord vers le faîte.
  for (let k = 0; k < 8; k++) {
    const y = 18 - k, xa = 9 + 2 * k, xb = 38 - 2 * k
    for (let x = xa; x <= xb; x++) {
      const bord = x === xa || x === xb
      const c = bord ? P.corailProfond : k % 2 === 0 ? P.ambre : teinte(P.ambre, P.corailProfond, 0.4)
      const d = 0.5 + ((k + (x - xa) / Math.max(1, xb - xa)) / 8) * 0.24
      cellules.push(cellule(x, y, c, 'pose', d, 0.05, { dy: 2 }))
    }
  }
  for (let y = 10; y <= 14; y++) for (const x of [31, 32]) cellules.push(cellule(x, y, y === 10 ? P.corailClair : P.corailProfond, 'pose', 0.75 + (14 - y) * 0.006, 0.04, { dy: 2 }))

  // La porte.
  for (let y = 26; y <= 31; y++) for (let x = 22; x <= 25; x++) cellules.push(cellule(x, y, teinte(P.corailProfond, P.nuit, 0.45), 'allume', 0.78 + (31 - y) * 0.004, 0.04))
  cellules.push(cellule(24, 29, P.ivoire, 'allume', 0.81, 0.03, { a: 0.85 }))

  // La fenêtre de droite s'allume : la lueur sur la façade, la vitre ambre, le cœur d'étincelle.
  for (let y = 18; y <= 27; y++) for (let x = 26; x <= 36; x++) {
    if (dansFenetre(x, y, 29)) continue
    const dist = Math.hypot(x - 31, y - 22.5)
    if (dist > 5.4) continue
    cellules.push(cellule(x, y, P.ambre, 'allume', 0.9, 0.08, { a: 0.26 * (1 - dist / 5.6) }))
  }
  for (let y = 22; y <= 23; y++) for (const x of [30, 32, 33]) cellules.push(cellule(x, y, P.ambre, 'allume', 0.86, 0.06))
  cellules.push(cellule(30, 22, P.etincelle, 'allume', 0.9, 0.05), cellule(33, 23, P.etincelle, 'allume', 0.92, 0.05))
  return { nom: 'maison', colonnes, rangs, ecart: 0, dureeBoucle: 4600, cellules }
}

// ── Les outils : marteau, truelle, clé, niveau ; chaque case arrive d'ailleurs et se pose à sa place, outil après outil.
const SPRITES: Record<string, string[]> = {
  marteau: [
    '...IIIIIIII.', '.IIIIIIIIIII', 'IIIIIIIIIIII', 'II...DD..III', 'I....DD.....', '.....DD.....', '.....DD.....', '.....DD.....',
    '.....DD.....', '.....DD.....', '.....CC.....', '.....CC.....', '.....CC.....', '.....CC.....', '....CCCC....', '.....CC.....',
  ],
  truelle: [
    '.....CC.....', '.....CC.....', '.....CC.....', '.....CC.....', '.....DD.....', '......I.....', '......I.....', '...IIIIII...',
    '..IIIIIIII..', '.IIIIIIIIII.', 'IIIIIIIIIIII', '.IIIIIIIIII.', '..IIIIIIII..', '...IIIIII...', '....IIII....', '.....II.....',
  ],
  cle: [
    '..II....II..', '..II....II..', '..III..III..', '...IIIIII...', '....IIII....', '.....II.....', '.....II.....', '.....II.....',
    '.....II.....', '.....II.....', '.....II.....', '.....II.....', '....IIII....', '...II..II...', '...II..II...', '....IIII....',
  ],
  niveau: ['LLLLLLLLLLLLLLLL', 'AAAAAAIIIIAAAAAA', 'AAAAAAIEEIAAAAAA', 'AAAAAAIIIIAAAAAA', 'DDDDDDDDDDDDDDDD'],
}
function outils(): Scene {
  const hasard = graine(9031)
  const cellules: Cellule[] = []
  const colonnes = 72, rangs = 24, etabli = 21
  for (let x = 2; x <= 69; x++) cellules.push(cellule(x, etabli, SOL, 'allume', 0, 0.05, { a: 0.3 }))
  const places: [string, number, number][] = [['marteau', 4, 3], ['truelle', 21, 3], ['cle', 38, 3], ['niveau', 53, 9]]
  places.forEach(([nom, x0, y0], i) => {
    SPRITES[nom].forEach((ligne, dy) => [...ligne].forEach((ch, dx) => {
      if (ch === '.') return
      const angle = hasard() * Math.PI * 2
      const r = 5 + hasard() * 9
      const d = 0.04 + i * 0.19 + hasard() * 0.18 // le dernier outil finit à 0,99 : à p = 1, tout est posé
      const etincelle = ch === 'E'
      cellules.push(cellule(x0 + dx, y0 + dy, COULEURS[ch], etincelle ? 'allume' : 'vol', etincelle ? 0.93 : d, etincelle ? 0.05 : 0.2, {
        dx: etincelle ? 0 : Math.round(Math.cos(angle) * r), dy: etincelle ? 0 : Math.round(Math.sin(angle) * r * 0.7),
      }))
    }))
  })
  return { nom: 'outils', colonnes, rangs, ecart: 1, dureeBoucle: 3200, cellules }
}

// ── L'aube du chantier : la lumière monte derrière la grue et la maison en construction, bande par bande, en marches de quatre
// colonnes depuis le centre ; le soleil monte case par case ; les étoiles s'éteignent ; une fenêtre du chantier s'allume.
function aube(): Scene {
  const hasard = graine(1811)
  const cellules: Cellule[] = []
  const colonnes = 64, rangs = 30, horizon = 26
  const nuitChaude = (t: number) => teinte(P.corailProfond, P.nuit, t)
  const bandes = [P.ambre, teinte(P.ambre, P.corailClair, 0.5), P.corailClair, P.corail, P.corailProfond, nuitChaude(0.4), nuitChaude(0.64), nuitChaude(0.82)]

  // Les étoiles, dessinées d'abord : le ciel qui s'allume les recouvre, et elles s'éteignent.
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(hasard() * colonnes), y = Math.floor(hasard() * 15)
    cellules.push(cellule(x, y, P.ivoire, 'eteint', 0.3 + hasard() * 0.25, 0.2, { a: 0.25 + hasard() * 0.4 }))
  }
  // Le ciel : huit bandes de trois rangs, tramées en damier à leur bord haut (la marche de pixels).
  for (let b = 0; b < bandes.length; b++) {
    for (let r = 0; r < 3; r++) {
      const y = horizon - 1 - 3 * b - r
      for (let x = 0; x < colonnes; x++) {
        const trame = r === 2 && (x + y) % 2 === 0 && b < bandes.length - 1
        const c = trame ? bandes[b + 1] : bandes[b]
        const marche = Math.floor(Math.abs(x - 31.5) / 4) * 0.011
        cellules.push(cellule(x, y, c, 'allume', 0.06 + b * 0.075 + marche, 0.05))
      }
    }
  }
  // Le soleil, qui monte de douze cases (par marches entières).
  for (let y = horizon - 8; y <= horizon + 7; y++) for (let x = 24; x <= 39; x++) {
    const dist = Math.hypot(x - 31.5, y - (horizon - 1))
    if (dist > 6.6) continue
    const c = dist < 2.6 ? P.ivoire : dist < 4.6 ? teinte(P.ivoire, P.ambre, 0.55) : P.corailClair
    cellules.push(cellule(x, y, c, 'monte', 0.1, 0.62, { dy: 12, horizon }))
  }
  // La ligne d'horizon (le soleil est coupé à l'horizon au dessin : sous lui, le fond de la page, quel qu'il soit).
  for (let x = 0; x < colonnes; x++) cellules.push(cellule(x, horizon, nuitChaude(0.7), 'allume', 0.3, 0.2))

  // Les silhouettes du chantier : la grue (mât, flèche, contre-flèche, câble, charge) et la maison en construction échafaudée.
  const S = P.silhouette
  const sil = (x: number, y: number) => cellules.push(cellule(x, y, S, 'fixe'))
  for (let y = 4; y <= 25; y++) { sil(10, y); sil(11, y) }
  sil(10, 3); sil(11, 3); sil(10, 2)
  for (let x = 5; x <= 34; x++) sil(x, 5)
  for (let x = 8; x <= 30; x += 2) sil(x, 6)
  for (let x = 4; x <= 8; x++) { sil(x, 6); sil(x, 7) }
  for (let y = 6; y <= 15; y++) sil(28, y)
  for (let x = 27; x <= 29; x++) sil(x, 16)
  for (let x = 25; x <= 31; x++) { sil(x, 17); sil(x, 18) }
  for (let y = 19; y <= 25; y++) for (let x = 40; x <= 56; x++) sil(x, y)
  for (let k = 0; k < 5; k++) for (let x = 39 + 2 * k; x <= 57 - 2 * k; x++) sil(x, 18 - k)
  for (let y = 14; y <= 25; y++) sil(37, y)
  for (let x = 35; x <= 39; x++) sil(x, 19)
  for (let x = 58; x <= 60; x++) for (let y = 23; y <= 25; y++) if (hasard() < 0.8) sil(x, y)
  // La fenêtre du chantier qui s'allume : l'étincelle rare.
  for (const [x, y] of [[46, 21], [47, 21], [46, 22], [47, 22]]) cellules.push(cellule(x, y, P.etincelle, 'allume', 0.9, 0.06))
  for (const [x, y] of [[50, 21], [51, 21], [50, 22], [51, 22]]) cellules.push(cellule(x, y, P.ambre, 'allume', 0.94, 0.05, { a: 0.7 }))
  return { nom: 'aube', colonnes, rangs, ecart: 0, dureeBoucle: 4800, cellules }
}

const CONSTRUCTEURS: Record<NomScene, () => Scene> = { mur, maison, outils, aube }
const cache = new Map<NomScene, Scene>()

export function construireScene(nom: NomScene): Scene {
  let s = cache.get(nom)
  if (!s) { s = (CONSTRUCTEURS[nom] ?? mur)(); cache.set(nom, s) }
  return s
}
