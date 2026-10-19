// CRM — la MAQUETTE du chantier en coupe isométrique (plan du 18/10, n°8, version 2). Module PUR : à partir du plan par pièce
// (lib/crm/plan.ts), il pose les volumes que app/crm/atelier/SceneChantier.tsx dessine. Même méthode que l'atelier
// (lib/crm/atelier.ts) : une forme = une couche instanciée, donc au plus cinq appels de dessin quelle que soit la maison.
//
// La maison est vue EN COUPE : sol de chaque pièce coloré selon son état (à faire, en cours, fini), murs du fond et de gauche
// seulement (on voit dedans), l'équipe debout dans la pièce où elle a des tâches, et le DÉCOR du métier : baignoire et lavabo
// (plombier), tableau électrique (électricien), chaudière (chauffagiste), toiture en coupe (couvreur), parpaings (maçon)…
// Un schéma, pas un plan à l'échelle.
import { COULEURS, couleurRole, type Forme, type Inst, type Prereglage } from './atelier.ts'
import type { PiecePlan } from './plan.ts'

type V3 = [number, number, number]
export const LARGEUR_PIECE = 4.2
export const PROFONDEUR_PIECE = 3.6
const ECART = 0.25
const HAUT_MUR = 1.15
const EP_MUR = 0.14

export const COULEUR_ETAT: Record<PiecePlan['etat'], string> = { a_faire: COULEURS.dalle, en_cours: COULEURS.ambre, fini: COULEURS.sauge }

export type EtiquettePiece = { nom: string; p: V3; pct: number; etat: PiecePlan['etat'] }
export type SceneChantier = { instances: Record<Forme, Inst[]>; etiquettes: EtiquettePiece[]; bornes: { min: V3; max: V3 } }

/** La grille des pièces : au plus 3 de large, la maison s'allonge vers le fond. */
export function disposition(n: number): { colonnes: number; rangees: number } {
  const colonnes = n <= 1 ? 1 : n <= 4 ? 2 : 3
  return { colonnes, rangees: Math.max(1, Math.ceil(n / colonnes)) }
}

export function sceneChantier(p: { pieces: readonly PiecePlan[]; prereglage: Prereglage; roles?: ReadonlyMap<string, string> }): SceneChantier {
  const inst: Record<Forme, Inst[]> = { box: [], cyl: [], sph: [], toit: [], cone: [] }
  const etiquettes: EtiquettePiece[] = []
  const { colonnes, rangees } = disposition(p.pieces.length)
  const pasX = LARGEUR_PIECE + ECART, pasZ = PROFONDEUR_PIECE + ECART
  const x0 = -((colonnes - 1) * pasX) / 2, z0 = -((rangees - 1) * pasZ) / 2
  const ajouter = (f: Forme, pos: V3, taille: V3, c: string, o: number, r: V3 = [0, 0, 0]) => inst[f].push({ p: pos, s: taille, r, c, o })

  p.pieces.forEach((piece, i) => {
    const cx = x0 + (i % colonnes) * pasX, cz = z0 + Math.floor(i / colonnes) * pasZ
    // Le sol de la pièce, coloré selon son état ; une bande d'avancement sur le bord avant.
    ajouter('box', [cx, 0.06, cz], [LARGEUR_PIECE, 0.12, PROFONDEUR_PIECE], COULEUR_ETAT[piece.etat], i)
    if (piece.pct > 0 && piece.pct < 100) ajouter('box', [cx - LARGEUR_PIECE / 2 + (LARGEUR_PIECE * piece.pct) / 200, 0.135, cz + PROFONDEUR_PIECE / 2 - 0.12], [(LARGEUR_PIECE * piece.pct) / 100, 0.03, 0.16], COULEURS.corail, i)
    // Les murs du fond et de gauche (coupe : on voit dedans).
    ajouter('box', [cx, HAUT_MUR / 2 + 0.12, cz - PROFONDEUR_PIECE / 2 + EP_MUR / 2], [LARGEUR_PIECE, HAUT_MUR, EP_MUR], COULEURS.mur, i)
    ajouter('box', [cx - LARGEUR_PIECE / 2 + EP_MUR / 2, HAUT_MUR / 2 + 0.12, cz], [EP_MUR, HAUT_MUR, PROFONDEUR_PIECE], COULEURS.mur, i)
    decor(piece.nom, p.prereglage, [cx, cz], i, ajouter)
    // L'équipe : un personnage par membre qui a des tâches ici (corps + tête), en ligne devant le décor.
    piece.membres.slice(0, 4).forEach((m, k) => {
      const mx = cx - 0.9 + k * 0.6, mz = cz + 0.75
      const c = couleurRole(p.roles?.get(m.id) ?? 'compagnon')
      ajouter('cyl', [mx, 0.12 + 0.36, mz], [0.32, 0.72, 0.32], c, i)
      ajouter('sph', [mx, 0.12 + 0.9, mz], [0.3, 0.3, 0.3], COULEURS.peau, i)
    })
    etiquettes.push({ nom: piece.nom, p: [cx, HAUT_MUR + 0.6, cz], pct: piece.pct, etat: piece.etat })
  })
  // Le couvreur : la toiture en coupe, posée au-dessus de la maison (sans masquer les pièces : décalée vers le fond).
  if (p.prereglage === 'couvreur' && p.pieces.length) {
    const largeur = colonnes * pasX
    ajouter('toit', [0, HAUT_MUR + 1.4, z0 - PROFONDEUR_PIECE / 2 - 0.2], [largeur * 0.72, 1.6, 0.7], '#B9785B', -1, [0, Math.PI / 4, 0])
  }
  const demiX = (colonnes * pasX) / 2 + 0.5, demiZ = (rangees * pasZ) / 2 + 0.5
  return { instances: inst, etiquettes, bornes: { min: [-demiX, 0, -demiZ], max: [demiX, HAUT_MUR + 2, demiZ] } }
}

/** Le décor d'une pièce : ce qu'elle contient (d'après son nom) et ce que le MÉTIER y installe. Quelques volumes simples. */
function decor(nom: string, metier: Prereglage, [cx, cz]: [number, number], o: number, ajouter: (f: Forme, p: V3, s: V3, c: string, o: number, r?: V3) => void) {
  const fond = cz - PROFONDEUR_PIECE / 2 + 0.55, gauche = cx - LARGEUR_PIECE / 2 + 0.6
  const sol = 0.12
  switch (nom) {
    case 'Salle de bain':
      ajouter('box', [cx + 0.6, sol + 0.28, fond + 0.1], [1.6, 0.56, 0.75], COULEURS.blanc, o) // baignoire
      ajouter('cyl', [gauche + 0.1, sol + 0.42, cz - 0.2], [0.42, 0.84, 0.42], COULEURS.blanc, o) // lavabo
      break
    case 'WC':
      ajouter('cyl', [cx, sol + 0.22, fond + 0.1], [0.42, 0.44, 0.55], COULEURS.blanc, o)
      ajouter('box', [cx, sol + 0.55, fond - 0.12], [0.5, 0.5, 0.16], COULEURS.blanc, o)
      break
    case 'Cuisine':
      ajouter('box', [cx, sol + 0.45, fond], [2.6, 0.9, 0.62], COULEURS.bois, o) // plan de travail
      ajouter('box', [cx + 0.7, sol + 0.93, fond], [0.6, 0.06, 0.45], COULEURS.ardoise, o) // plaque
      break
    case 'Chambre':
      ajouter('box', [cx + 0.4, sol + 0.25, cz - 0.3], [1.5, 0.5, 2], COULEURS.planche, o)
      break
    case 'Séjour':
      ajouter('box', [cx + 0.3, sol + 0.3, fond + 0.15], [2, 0.6, 0.8], COULEURS.pierre, o)
      break
    case 'Toiture':
      ajouter('toit', [cx, sol + 0.8, cz], [LARGEUR_PIECE * 0.7, 1.4, PROFONDEUR_PIECE * 0.7], '#B9785B', o, [0, Math.PI / 4, 0])
      break
    case 'Extérieur':
      ajouter('cyl', [cx + 1.2, sol + 0.5, fond + 0.3], [0.2, 1, 0.2], COULEURS.tronc, o)
      ajouter('sph', [cx + 1.2, sol + 1.25, fond + 0.3], [0.9, 0.9, 0.9], COULEURS.sauge, o)
      break
    default:
      break
  }
  // Le métier, dans la première pièce technique qui s'y prête (ou la pièce elle-même) : un repère, pas un inventaire.
  if (metier === 'chauffagiste' && ['Garage', 'Cuisine', 'Salle de bain', 'Général'].includes(nom)) ajouter('box', [gauche + 0.15, sol + 0.6, fond + 0.05], [0.55, 1.2, 0.5], COULEURS.blanc, o) // chaudière
  if (metier === 'electricien' && ['Entrée', 'Garage', 'Couloir', 'Général'].includes(nom)) ajouter('box', [gauche, sol + 0.85, fond - 0.35], [0.6, 0.7, 0.1], COULEURS.gris, o) // tableau
  if (metier === 'macon' && ['Général', 'Extérieur', 'Garage', 'Façade'].includes(nom)) for (let k = 0; k < 3; k++) ajouter('box', [cx - 0.6 + k * 0.45, sol + 0.12, cz + 0.2], [0.4, 0.24, 0.2], COULEURS.pierre, o) // parpaings
  if (metier === 'peintre') ajouter('cyl', [cx + 1.4, sol + 0.15, cz + 0.9], [0.3, 0.3, 0.3], COULEURS.corailClair, o) // pot de peinture
  if (metier === 'carreleur' && ['Salle de bain', 'Cuisine', 'WC'].includes(nom)) ajouter('box', [cx - 1, sol + 0.1, cz + 0.9], [0.5, 0.2, 0.5], COULEURS.pierre, o) // carreaux
  if (metier === 'menuisier') ajouter('box', [cx + 1.3, sol + 0.06, cz + 0.6], [1.2, 0.12, 0.3], COULEURS.bois, o) // planches
}

/** Le nombre d'appels de dessin : une couche par forme utilisée (le sol de la scène en plus, compté par le composant). */
export const appelsDeDessin = (s: SceneChantier): number => (Object.keys(s.instances) as Forme[]).filter((f) => s.instances[f].length > 0).length
