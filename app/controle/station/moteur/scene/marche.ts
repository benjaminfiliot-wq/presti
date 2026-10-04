// Le chemin d'un personnage (fiche 026-181, K3) : d'où il est, jusqu'à son poste, par A* sur la grille de marche du thème (026-180).
// Une seule fonction pour tous les trajets : aucun chemin n'est écrit à la main. Module pur : ni Phaser ni DOM.
import { astar2D } from '../grille/grille'
import type { Marche } from '../theme/grille'
import type { Emplacement } from '../types'

/** La vitesse de marche, en pixels logiques PAR SECONDE : une seule pour tous, la distance fait la durée (jamais le nombre d'images). */
export const VITESSE = 120

/**
 * Les points à parcourir pour aller de `de` à `vers`, `de` exclu, `vers` en dernier : les centres des cases traversées, puis le but exact.
 * `[]` quand on y est. Sans chemin sur la grille (départ hors des cases libres), une ligne droite : le personnage arrive, il ne reste
 * jamais en route.
 */
export function cheminVers(marche: Marche, de: Emplacement, vers: Emplacement): Emplacement[] {
  const suite = astar2D(marche.grille, de, vers)
  if (suite === null) return de.x === vers.x && de.y === vers.y ? [] : [{ x: vers.x, y: vers.y }]
  const demi = marche.grille.pas / 2
  return suite.map((p, i) => (i === suite.length - 1 ? { x: p.x, y: p.y } : { x: p.x + demi, y: p.y + demi }))
}

/**
 * Avance de `pas` pixels le long de `chemin` (qui perd les points atteints) ; rend la nouvelle position, la distance parcourue et les
 * points atteints, dans l'ordre. Le sprite avance d'une traite, mais le miroir ne relève que ces POINTS : la suite de ses positions est celle
 * du chemin, jamais celle des images (deux pages, deux cadences, les mêmes pas).
 */
export function avancer(pos: Emplacement, chemin: Emplacement[], pas: number): { pos: Emplacement; croises: Emplacement[]; parcouru: number } {
  let { x, y } = pos
  let reste = pas, parcouru = 0
  const croises: Emplacement[] = []
  while (reste > 0 && chemin.length) {
    const p = chemin[0]
    const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy)
    if (d <= reste) { x = p.x; y = p.y; croises.push({ x: p.x, y: p.y }); chemin.shift(); reste -= d; parcouru += d } else { x += (dx / d) * reste; y += (dy / d) * reste; parcouru += reste; reste = 0 }
  }
  return { pos: { x, y }, croises, parcouru }
}
