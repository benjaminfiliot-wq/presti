// Les places d'une salle (lot « décor » du 05/10) : plusieurs agents dans la même salle s'ÉTALENT au lieu de s'empiler au même poste.
// Module pur. Chaque personnage garde SA place tant qu'il reste dans la salle (et au même genre : porte ou poste) : un arrivant prend la
// première place libre, et personne d'autre ne bouge à cause de lui (la règle de vérité : un agent ne marche que sur son propre événement).
// La place 0 est le poste (ou la porte) lui-même : un agent seul se tient exactement où le thème le met, comme avant.
import type { Emplacement } from '../types'

/** À la porte (le motif `porte` : il attend) ou au poste (tout le reste). */
export type GenrePlace = 'porte' | 'poste'

/** Les décalages (pixels logiques) des places autour du poste : le milieu, la gauche, la droite, puis une deuxième rangée en dessous. Un sprite fait 16 px de large, une salle 48. */
export const PLACES: readonly (readonly [number, number])[] = [[0, 0], [-15, 0], [15, 0], [-8, 9], [8, 9], [0, 18], [-15, 18], [15, 18]]

export const genreDePlace = (motif: string | null): GenrePlace => (motif === 'porte' ? 'porte' : 'poste')

/** La première place que personne d'autre ne tient dans cette salle et ce genre ; au-delà du tableau, on reprend (deux agents peuvent alors se recouvrir). */
export function placeLibre(prises: Iterable<number>): number {
  const p = new Set(prises)
  for (let i = 0; i < PLACES.length; i += 1) if (!p.has(i)) return i
  return p.size % PLACES.length
}

/** Où se pose le pied d'un personnage : la base (porte ou poste du thème) décalée de sa place, et gardée dans la salle. À la porte, les rangées montent. */
export function decalageDePlace(base: Emplacement, genre: GenrePlace, place: number, salle: { x: number; y: number; l: number; h: number } | null): Emplacement {
  const [dx, dy] = PLACES[place % PLACES.length]
  let x = base.x + dx
  let y = base.y + (genre === 'porte' ? -dy : dy)
  if (salle) {
    x = Math.min(salle.x + salle.l - 8, Math.max(salle.x + 8, x))
    y = genre === 'porte' ? Math.max(salle.y + 26, y) : Math.min(salle.y + salle.h - 6, y)
  }
  return { x: Math.round(x), y: Math.round(y) }
}
