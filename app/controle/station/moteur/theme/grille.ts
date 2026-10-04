// La marche sur la carte (fiche 026-180, K2) : la grille de marche d'une carte du moteur, et UNE SEULE fonction pour aller d'une porte à
// son poste. Les six trajets écrits à la main de Claw3D (*Route.ts) n'existent pas ici : tout chemin sort de astar2D sur la grille
// que le thème dessine (moteur/grille/grille.ts, le module pur que le juge CL-15 joue sur le thème d'essai).
import type { ContexteMoteur } from '../types'
import type { Destinations, GrilleMarche } from '../grille/grille'
import { astar2D, construireGrille, destinations } from '../grille/grille'
import type { CarteMoteur } from './carte'

/** La carte et sa grille de marche : ce que la scène, la caméra et les acteurs (K3, K4) lisent du thème. */
export type Marche = { grille: GrilleMarche; destinations: Destinations; carte: CarteMoteur }

/** Construit la marche d'une carte : la grille vient de la carte effective (disposition et portrait appliqués), jamais du thème brut. */
export function marcheDe(carte: CarteMoteur): Marche {
  const vue = { grille: { largeur: carte.canvas.width, hauteur: carte.canvas.height, pas: carte.canvas.tileSize }, emplacements: carte.emplacements, coursives: carte.coursives, tapis: carte.tapis }
  return { grille: construireGrille(vue), destinations: destinations(vue), carte }
}

/**
 * Le chemin de la porte au poste d'une salle, porte comprise : les deux extrémités sont celles du thème, les points intermédiaires sont
 * les centres des cases traversées. `null` pour une salle sans poste (l'emplacement réservé, ou une clé inconnue) ou sans chemin.
 */
export function porteVersPoste(marche: Marche, salle: string): { x: number; y: number }[] | null {
  const emplacement = marche.carte.emplacements.find((e) => e.salle === salle)
  const porte = emplacement ? marche.destinations.salles[emplacement.cle] : undefined
  const poste = emplacement ? marche.destinations.postes[emplacement.cle] : undefined
  if (!porte || !poste) return null
  const suite = astar2D(marche.grille, porte, poste)
  if (!suite) return null
  const demi = marche.grille.pas / 2
  const milieu = suite.slice(0, -1).map((p) => ({ x: p.x + demi, y: p.y + demi }))
  return [{ x: porte.x, y: porte.y }, ...milieu, ...suite.slice(-1)]
}

// ── Où le moteur range ce que l'accroche `theme` a construit ─────────────────────────────────────────────────────────────
// ContexteMoteur (types.ts, K1) ne connaît pas la carte : les fiches suivantes la lisent par mondeDe(contexte), typée, sans toucher à ce type.
export type Monde = { carte: CarteMoteur; marche: Marche }
const MONDES = new WeakMap<ContexteMoteur, Monde>()
export function poserMonde(contexte: ContexteMoteur, monde: Monde): void { MONDES.set(contexte, monde) }
export function mondeDe(contexte: ContexteMoteur): Monde | null { return MONDES.get(contexte) ?? null }
