// La grille de marche de la carte (fiche 026-180, K2) : où un personnage peut poser le pied, et par où il passe.
// Module PUR : ni Phaser, ni DOM, et aucun import à l'exécution (seuls des types, effacés à la compilation) : le juge CL-15
// (scripts/fixtures/026-pilotage/k/juge-grille-enfant.mjs) le charge sous Node sans transpileur et joue le thème d'essai dessus.
// Écrit pour presti : A* à quatre voisins, une case = un pas de la grille du thème. Le A* copié de Claw3D (claw3d/pathfinding.ts)
// marche à huit voisins sur des cases de 8 pixels, sans notion de salle : il ne sert pas ici.
//
// Ce que le thème dit, et ce que la grille en fait :
//   · une COURSIVE est un tracé (nœuds, arêtes) d'une certaine largeur : toute case dont le centre est à moins de la moitié de la
//     largeur d'une arête (même convention que lib/pilotage/disposition.ts pour la porte) est ouverte ;
//   · un EMPLACEMENT est un volume fermé : son pourtour (les cases dont une voisine est hors du volume) est un mur, son sol est
//     ouvert ; la PORTE ouvre le mur, et le trajet de la porte au poste est ouvert case par case. Rien d'autre ne traverse un mur ;
//   · l'emplacement RÉSERVÉ (E-commerce) est fermé tout entier : aucune case ouverte, ni porte ni poste ni destination ;
//   · le TAPIS n'est ni obstacle ni chemin : c'est le bandeau du parcours du prospect, il se dessine et ne se marche pas.
import type { Coursives, Emplacement, Point, Tapis } from '@/lib/pilotage/theme'

/** Ce que la grille lit d'un thème (ou d'une vue du thème : disposition et portrait appliqués). */
export type VueMarche = {
  grille: { largeur: number; hauteur: number; pas: number }
  emplacements: Emplacement[]
  coursives: Coursives
  tapis?: Tapis
}

/** La grille de marche : une case par pas du thème, `libres[r * cols + c]` vaut 1 quand on peut y poser le pied. */
export type GrilleMarche = { pas: number; cols: number; rows: number; libres: Uint8Array }

/** Les portes et les postes par clé d'emplacement ; l'emplacement réservé n'y figure jamais. */
export type Destinations = { salles: Record<string, Point>; postes: Record<string, Point> }

type Case = { c: number; r: number }

const EPS = 1e-9

/** Le point (x, y) est-il dans le volume ? Rectangle : bords haut et gauche compris ; polygone : lancer de rayon. */
function dansLeVolume(e: Emplacement, x: number, y: number): boolean {
  const f = e.forme
  if (f.type === 'polygone') {
    const p = f.points ?? []
    let dedans = false
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans
    }
    return dedans
  }
  const { x: x0 = 0, y: y0 = 0, l = 0, h = 0 } = f
  return x >= x0 && x < x0 + l && y >= y0 && y < y0 + h
}

function distanceSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, n = dx * dx + dy * dy
  const t = n === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / n))
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

/** Construit la grille de marche d'une vue du thème. Ne jette jamais pour une arête ou un nœud illisible : elle l'ignore. */
export function construireGrille(vue: VueMarche): GrilleMarche {
  const pas = vue.grille.pas
  const cols = Math.max(1, Math.ceil(vue.grille.largeur / pas))
  const rows = Math.max(1, Math.ceil(vue.grille.hauteur / pas))
  const libres = new Uint8Array(cols * rows)
  const idx = (c: number, r: number) => r * cols + c
  const dans = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows
  const centre = (n: number) => n * pas + pas / 2
  const caseDe = (p: Point): Case => ({ c: Math.floor(p.x / pas), r: Math.floor(p.y / pas) })

  // 1. Les coursives.
  const noeuds = new Map(vue.coursives.noeuds.map(n => [n.id, n]))
  for (const a of vue.coursives.aretes) {
    const p = noeuds.get(a.de), q = noeuds.get(a.a)
    if (!p || !q) continue
    const demi = a.largeur / 2
    const c1 = Math.max(0, Math.floor((Math.min(p.x, q.x) - demi) / pas)), c2 = Math.min(cols - 1, Math.floor((Math.max(p.x, q.x) + demi) / pas))
    const r1 = Math.max(0, Math.floor((Math.min(p.y, q.y) - demi) / pas)), r2 = Math.min(rows - 1, Math.floor((Math.max(p.y, q.y) + demi) / pas))
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (distanceSegment(centre(c), centre(r), p, q) <= demi + EPS) libres[idx(c, r)] = 1
  }

  // 2. Les volumes : tout ce qu'un volume couvre est d'abord fermé (une coursive qui mord sur une salle ne l'ouvre pas), puis le sol
  //    des salles ordinaires est rouvert, mur excepté.
  const volumes = vue.emplacements.map(e => {
    const cases: Case[] = []
    const dedans = new Set<number>()
    const xs = e.forme.type === 'polygone' ? (e.forme.points ?? []).map(q => q[0]) : [e.forme.x ?? 0, (e.forme.x ?? 0) + (e.forme.l ?? 0)]
    const ys = e.forme.type === 'polygone' ? (e.forme.points ?? []).map(q => q[1]) : [e.forme.y ?? 0, (e.forme.y ?? 0) + (e.forme.h ?? 0)]
    if (!xs.length || !ys.length) return { e, cases, dedans }
    const c1 = Math.max(0, Math.floor(Math.min(...xs) / pas)), c2 = Math.min(cols - 1, Math.floor(Math.max(...xs) / pas))
    const r1 = Math.max(0, Math.floor(Math.min(...ys) / pas)), r2 = Math.min(rows - 1, Math.floor(Math.max(...ys) / pas))
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (dansLeVolume(e, centre(c), centre(r))) { cases.push({ c, r }); dedans.add(idx(c, r)) }
    return { e, cases, dedans }
  })
  for (const v of volumes) for (const { c, r } of v.cases) libres[idx(c, r)] = 0
  for (const v of volumes) {
    if (v.e.reservee) continue
    for (const { c, r } of v.cases) {
      const mur = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => !dans(c + dc, r + dr) || !v.dedans.has(idx(c + dc, r + dr)))
      if (!mur) libres[idx(c, r)] = 1
    }
  }

  // 3. Les portes : la case de la porte et celles qui la relient au poste s'ouvrent, en préférant ce qui est déjà ouvert, puis le volume.
  for (const v of volumes) {
    if (v.e.reservee || !v.e.poste) continue
    let cur = caseDe(v.e.porte)
    const but = caseDe(v.e.poste)
    if (dans(cur.c, cur.r)) libres[idx(cur.c, cur.r)] = 1
    for (let garde = cols + rows; garde > 0 && (cur.c !== but.c || cur.r !== but.r); garde--) {
      const options: Case[] = []
      if (cur.c !== but.c) options.push({ c: cur.c + Math.sign(but.c - cur.c), r: cur.r })
      if (cur.r !== but.r) options.push({ c: cur.c, r: cur.r + Math.sign(but.r - cur.r) })
      const note = (o: Case) => (!dans(o.c, o.r) ? 3 : libres[idx(o.c, o.r)] ? 0 : v.dedans.has(idx(o.c, o.r)) ? 1 : 2)
      options.sort((a, b) => note(a) - note(b))
      cur = options[0]
      if (!dans(cur.c, cur.r)) break
      libres[idx(cur.c, cur.r)] = 1
    }
  }
  return { pas, cols, rows, libres }
}

/**
 * Le chemin de `de` à `vers`, en cases, à quatre voisins : les coins haut-gauche des cases traversées, DÉPART EXCLU, le dernier point
 * étant `vers` lui-même. `[]` quand on y est déjà ; `null` quand la case de départ ou celle d'arrivée est fermée, ou que rien ne les
 * relie : jamais de « case libre la plus proche » (la salle réservée ne doit pas devenir joignable par ce biais).
 */
export function astar2D(grille: GrilleMarche, de: Point, vers: Point): Point[] | null {
  const { pas, cols, rows, libres } = grille
  const c0 = Math.floor(de.x / pas), r0 = Math.floor(de.y / pas), c1 = Math.floor(vers.x / pas), r1 = Math.floor(vers.y / pas)
  const ok = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows && libres[r * cols + c] === 1
  if (!ok(c0, r0) || !ok(c1, r1)) return null
  if (c0 === c1 && r0 === r1) return de.x === vers.x && de.y === vers.y ? [] : [{ x: vers.x, y: vers.y }]
  const g = new Float64Array(cols * rows).fill(Infinity)
  const parent = new Int32Array(cols * rows).fill(-1)
  const fini = new Uint8Array(cols * rows)
  const h = (c: number, r: number) => Math.abs(c - c1) + Math.abs(r - r1)
  const depart = r0 * cols + c0, arrivee = r1 * cols + c1
  g[depart] = 0
  // File de priorité (tas binaire) : f croissant, à égalité g décroissant (on creuse), puis ordre d'arrivée : le résultat est déterministe.
  type Noeud = { i: number; f: number; g: number; n: number }
  const tas: Noeud[] = []
  let n = 0
  const avant = (a: Noeud, b: Noeud) => a.f !== b.f ? a.f < b.f : a.g !== b.g ? a.g > b.g : a.n < b.n
  const pousser = (x: Noeud) => { tas.push(x); let i = tas.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!avant(tas[i], tas[p])) break; [tas[i], tas[p]] = [tas[p], tas[i]]; i = p } }
  const tirer = (): Noeud => {
    const haut = tas[0], dernier = tas.pop() as Noeud
    if (tas.length) { tas[0] = dernier; let i = 0; for (;;) { const l = 2 * i + 1, d = l + 1; let m = i; if (l < tas.length && avant(tas[l], tas[m])) m = l; if (d < tas.length && avant(tas[d], tas[m])) m = d; if (m === i) break; [tas[i], tas[m]] = [tas[m], tas[i]]; i = m } }
    return haut
  }
  pousser({ i: depart, f: h(c0, r0), g: 0, n: n++ })
  while (tas.length) {
    const { i } = tirer()
    if (fini[i]) continue
    fini[i] = 1
    if (i === arrivee) break
    const c = i % cols, r = (i - c) / cols
    for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nc = c + dc, nr = r + dr
      if (!ok(nc, nr)) continue
      const j = nr * cols + nc
      if (fini[j] || g[i] + 1 >= g[j]) continue
      g[j] = g[i] + 1
      parent[j] = i
      pousser({ i: j, f: g[j] + h(nc, nr), g: g[j], n: n++ })
    }
  }
  if (!fini[arrivee]) return null
  const chemin: Point[] = []
  for (let i = arrivee; i !== depart; i = parent[i]) chemin.push({ x: (i % cols) * pas, y: Math.floor(i / cols) * pas })
  chemin.reverse()
  chemin[chemin.length - 1] = { x: vers.x, y: vers.y }
  return chemin
}

/** Les portes et les postes, par clé d'emplacement ; la salle réservée (sans poste, jamais une destination) n'y figure pas. */
export function destinations(vue: Pick<VueMarche, 'emplacements'>): Destinations {
  const salles: Record<string, Point> = {}
  const postes: Record<string, Point> = {}
  for (const e of vue.emplacements) {
    if (e.reservee || !e.poste) continue
    salles[e.cle] = { x: e.porte.x, y: e.porte.y }
    postes[e.cle] = { x: e.poste.x, y: e.poste.y }
  }
  return { salles, postes }
}

/** Le tapis est continu : au moins deux points, chacun à un pas au plus du précédent (jamais le même), dans la grille, et chaque étape sur le tracé. */
export function tapisContinu(vue: Pick<VueMarche, 'grille' | 'tapis'>): boolean {
  const trace = vue.tapis?.trace
  if (!Array.isArray(trace) || trace.length < 2) return false
  const { largeur, hauteur, pas } = vue.grille
  const dedans = (p: Point) => p.x >= 0 && p.y >= 0 && p.x <= largeur && p.y <= hauteur
  if (!trace.every(dedans)) return false
  for (let i = 1; i < trace.length; i++) {
    const dx = Math.abs(trace[i].x - trace[i - 1].x), dy = Math.abs(trace[i].y - trace[i - 1].y)
    if (dx > pas || dy > pas || (dx === 0 && dy === 0)) return false
  }
  const sur = new Set(trace.map(p => `${p.x},${p.y}`))
  return (vue.tapis?.etapes ?? []).every(s => sur.has(`${s.x},${s.y}`))
}
