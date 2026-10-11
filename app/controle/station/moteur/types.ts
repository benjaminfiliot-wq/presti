// Types communs du moteur de la carte (fiche 026-179, K1). Rien ici n'importe Phaser à l'exécution : les types de Phaser
// sont des `import type`, effacés à la compilation (Phaser ne se charge que par `import("phaser")`, dans claw3d/).
import type PhaserType from 'phaser'
import type { Bulle, CarteDonnees, Env, Equipage, ReglagesServis, Tapis } from '../Station'
import type { OfficeSceneBridge } from './claw3d/OfficeSceneBridge'

/**
 * Les propriétés de la carte, telles que Carte.tsx les passe : la même forme que `CarteProps` de Carte.tsx. Le moteur ne l'importe pas de
 * Carte.tsx : le juge de poids (CL-12) remplace ce fichier par un cadre vide pour mesurer « le même moteur absent », et le moteur doit
 * encore se compiler. Les types des vues viennent de Station.tsx (026-111).
 */
export type PropsCarte = {
  equipage: Env<Equipage> | null
  tapis: Env<Tapis> | null
  bulles: Bulle[]
  reglages: ReglagesServis | null
  carte: Env<CarteDonnees> | null
}

/** La grille logique du dessin, en pixels : un canevas fait toujours `largeur × k` par `hauteur × k` pixels de l'appareil, k entier. */
export type Grille = { largeur: number; hauteur: number }

/** Les cinq motifs que `positions()` (026-070) peut servir. Un motif absent veut dire : pas de position. */
export type MotifActeur = 'porte' | 'tache' | 'reunion' | 'pause' | 'panne'

/**
 * Ce que le moteur reçoit d'un agent : notre type, pas celui de Claw3D (`OfficeAgentPresence` ne porte ni salle ni motif).
 * La salle et le motif viennent de `positions()` seule ; la scène ne déduit jamais une salle. Un acteur sans salle n'est pas dessiné.
 */
export type ActeurStation = {
  nom: string
  couleur: string
  avatar: string
  salle: string | null
  motif: MotifActeur | null
  bulle: string | null
}

/** Où se pose le pied d'un personnage, en pixels logiques. */
export type Emplacement = { x: number; y: number }

/** Choisit l'emplacement d'un acteur dans sa salle (`rang` = son rang parmi ceux de la même salle) ; null : pas de place, pas de dessin. */
export type Placeur = (acteur: ActeurStation, rang: number) => Emplacement | null

/** Fabrique la scène de Phaser : reçoit la bibliothèque (chargée par import dynamique) et ce que la scène doit savoir du jeu. */
export type FabriqueScene = (params: {
  Phaser: typeof PhaserType
  pont: OfficeSceneBridge<ActeurStation>
  grille: Grille
  k: number
  pret: (toile: HTMLCanvasElement) => void
  placer: Placeur
}) => PhaserType.Scene

/**
 * Ce que les accroches reçoivent. Un seul objet, le même pour toutes, modifié au fil des accroches : celle qui passe avant
 * (`theme`) peut remplacer `grille`, celle de `scene` peut remplacer `fabrique` ou `placer`, avant que le jeu ne soit construit.
 */
export type ContexteMoteur = {
  /** Les propriétés reçues de Carte.tsx, à jour à chaque rendu. */
  props: PropsCarte
  grille: Grille
  pont: OfficeSceneBridge<ActeurStation>
  fabrique: FabriqueScene
  placer: Placeur
  /** Le jeu Phaser ; null tant qu'il n'est pas construit (les accroches `theme`, `adaptateur` et `scene` passent avant). */
  jeu: PhaserType.Game | null
  /** Le cadre HTML qui porte le canevas ; null avant le montage. */
  racine: HTMLElement | null
  /** Enregistre une fonction rappelée à CHAQUE changement des propriétés (c'est à elle de comparer, le pont n'est appelé que sur un vrai changement). */
  ecouter: (suivre: (props: PropsCarte) => void) => void
}

/** Une accroche : appelée avec le contexte, éventuellement asynchrone ; elle peut rendre une fonction qui défait ce qu'elle a posé. */
export type Accroche = (contexte: ContexteMoteur) => void | (() => void) | Promise<void | (() => void)>

/** Les points où les fiches K2 à K5 branchent leurs modules, dans l'ordre où ils sont appelés. Toutes vides (null) à la fiche K1. */
export type Accroches = {
  theme: Accroche | null
  adaptateur: Accroche | null
  scene: Accroche | null
  camera: Accroche | null
  acteurs: Accroche | null
  calque: Accroche | null
  telephone: Accroche | null
}
