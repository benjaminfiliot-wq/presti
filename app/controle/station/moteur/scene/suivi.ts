// Ce que la scène (Phaser) dit au reste du moteur (fiche 026-181, K3) : où sont les personnages et dans quel état, et si l'antenne tourne.
// Phaser ne dessine que le canevas ; le miroir accessible, la bulle, « Zz » (calque HTML, moteur/calque/) lisent d'ici ce que la scène a
// décidé, sans jamais rien en déduire eux-mêmes. Aucun import à l'exécution : un module de données et de rappels, rien de plus.
import type { ActeurStation, ContexteMoteur, Emplacement } from '../types'

/** Un personnage tel que la scène le tient : sa salle et son motif viennent de `positions()`, sa place est celle du DERNIER PAS de marche. */
export type Vivant = {
  nom: string
  salle: string
  motif: string | null
  /** `marche` tant que le personnage n'est pas au bout de son chemin, `arrive` ensuite (et au premier relevé). */
  etat: 'marche' | 'arrive'
  /** Pixels logiques, entiers : le centre de la dernière case traversée, ou le poste (la porte pour le motif `porte`) à l'arrivée. */
  x: number
  y: number
}

/** La zone de l'antenne du toit, en pixels logiques, et son état (`tourne` pendant les 2 s d'un tour). */
export type Antenne = { zone: { x: number; y: number; l: number; h: number } | null; tourne: boolean }

export type Suivi = {
  /** Les personnages dessinés, par nom : un acteur sans salle n'y figure pas. */
  vivants: Map<string, Vivant>
  /** Les acteurs que l'adaptateur a posés dans le pont (le calque les lit ici : il n'appelle jamais le pont). */
  acteurs: readonly ActeurStation[]
  antenne: Antenne
  /** Rappelé à chaque changement ; `nom` est le personnage touché (null : l'antenne, ou tout à la fois). Rend la fonction qui se désabonne. */
  ecouter: (suivre: (nom: string | null) => void) => () => void
  publier: (v: Vivant) => void
  retirer: (nom: string) => void
  poserAntenne: (a: Partial<Antenne>) => void
  poserActeurs: (a: readonly ActeurStation[]) => void
}

export function creerSuivi(): Suivi {
  const suiveurs = new Set<(nom: string | null) => void>()
  const prevenir = (nom: string | null) => { for (const f of [...suiveurs]) f(nom) }
  const suivi: Suivi = {
    vivants: new Map(),
    acteurs: [],
    antenne: { zone: null, tourne: false },
    ecouter: (suivre) => { suiveurs.add(suivre); return () => { suiveurs.delete(suivre) } },
    publier: (v) => {
      const avant = suivi.vivants.get(v.nom)
      if (avant && avant.salle === v.salle && avant.motif === v.motif && avant.etat === v.etat && avant.x === v.x && avant.y === v.y) return
      suivi.vivants.set(v.nom, v)
      prevenir(v.nom)
    },
    retirer: (nom) => { if (suivi.vivants.delete(nom)) prevenir(nom) },
    poserAntenne: (a) => {
      const zoneChange = a.zone !== undefined && JSON.stringify(a.zone) !== JSON.stringify(suivi.antenne.zone)
      const tourneChange = a.tourne !== undefined && a.tourne !== suivi.antenne.tourne
      if (!zoneChange && !tourneChange) return
      suivi.antenne = { ...suivi.antenne, ...a }
      prevenir(null)
    },
    poserActeurs: (a) => { suivi.acteurs = a; prevenir(null) },
  }
  return suivi
}

/** Ce que les propriétés de la carte disent à la scène, hors des acteurs : la nuit, le mouvement réduit et les tours d'antenne demandés. */
export type EtatScene = {
  /** `carte.nuit` servi (le moteur ne lit jamais l'heure) ; null tant qu'aucune lecture n'est arrivée. */
  nuit: boolean | null
  reduit: boolean
  /** Nombre de tours d'antenne demandés depuis le début : un de plus par bulle NOUVELLE du Radar ou du Veilleur. */
  tours: number
  /** Posé par la scène : réveille la boucle de Phaser pour qu'elle prenne en compte un changement. */
  reveiller: (() => void) | null
}

export const creerEtatScene = (): EtatScene => ({ nuit: null, reduit: false, tours: 0, reveiller: null })

// ── Où le moteur range ce qu'il partage entre ses accroches (comme mondeDe pour le thème) ───────────────────────────────────────
type Partage = { suivi: Suivi; etat: EtatScene }
const PARTAGES = new WeakMap<ContexteMoteur, Partage>()
export function partageDe(contexte: ContexteMoteur): Partage {
  let p = PARTAGES.get(contexte)
  if (!p) { p = { suivi: creerSuivi(), etat: creerEtatScene() }; PARTAGES.set(contexte, p) }
  return p
}
export const suiviDe = (contexte: ContexteMoteur): Suivi => partageDe(contexte).suivi

export type { Emplacement }
