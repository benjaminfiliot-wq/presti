// CRM — le PLACEMENT des étiquettes de la carte (lot 6, retour de Benj : « corrige le chevauchement des étiquettes de chantiers »).
// Module PUR (aucun DOM, aucun three) : des rectangles à l'écran en entrée, une place par étiquette en sortie. Appelé par la scène 3D
// (app/crm/atelier/Scene3D.tsx, Projecteur) à chaque mouvement de caméra ; rejoué par scripts/crm-atelier3d-qa.mjs (section L).
//
// Règles :
//   • par PRIORITÉ : sélectionné > en retard > en cours > à démarrer > fini (puis zones), à égalité par clé — déterministe ;
//   • une étiquette complète essaie : dessus, dessous, droite, gauche, puis des places décalées reliées par un TRAIT DE RAPPEL ;
//   • elle ne recouvre JAMAIS une autre étiquette, ni l'épingle d'un voisin, ni l'interface posée sur la carte (urgences, outils…),
//     et reste dans l'écran ;
//   • sans place, elle se REPLIE en pastille compacte (icône d'état + numéro), qui se déplie au survol et au clic ; sans place même
//     pour la pastille, elle est masquée (l'épingle et la liste des éléments restent) ;
//   • au zoom avant, les épingles s'écartent : plus d'étiquettes complètes trouvent leur place, sans autre règle.

export type Rect = { x: number; y: number; l: number; h: number }
export type EntreeEtiquette = {
  cle: string
  /** Plus grand = placé d'abord (voir PRIORITES). */
  priorite: number
  /** L'épingle à l'écran (le pied de l'étiquette s'y rattache ; aucune autre étiquette ne la couvre). */
  epingle: Rect
  /** La taille de l'étiquette complète, et celle de sa pastille (absente : pas de repli, elle est masquée si elle ne tient pas). */
  taille: { l: number; h: number }
  pastille?: { l: number; h: number }
}
export type Cote = 'dessus' | 'dessous' | 'droite' | 'gauche' | 'decale'
export type SortieEtiquette = { cle: string; mode: 'complete' | 'pastille' | 'cachee'; x: number; y: number; l: number; h: number; cote: Cote | null; rappel: boolean }

/** Les priorités : sélectionné > en retard > en cours > à démarrer > fini ; les zones (noms des espaces de la base) en dernier. */
export const PRIORITES = { selection: 100, retard: 50, enCours: 40, aDemarrer: 30, fini: 20, poste: 35, zone: 5 } as const
/** L'écart entre l'épingle et l'étiquette, et la marge autour de chaque rectangle (deux étiquettes ne se touchent pas). */
export const ECART = 5
export const MARGE = 2

export const seCoupent = (a: Rect, b: Rect, m = 0): boolean => a.x < b.x + b.l + m && b.x < a.x + a.l + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m
const dedans = (r: Rect, ecran: { l: number; h: number }, m = 4) => r.x >= m && r.y >= m && r.x + r.l <= ecran.l - m && r.y + r.h <= ecran.h - m

/** Les places essayées autour de l'épingle, dans l'ordre : les quatre côtés, puis des places décalées (avec trait de rappel). */
export function candidats(e: Rect, l: number, h: number): { r: Rect; cote: Cote; rappel: boolean }[] {
  const cx = e.x + e.l / 2, cy = e.y + e.h / 2
  const haut = e.y - ECART - h, bas = e.y + e.h + ECART
  const out: { r: Rect; cote: Cote; rappel: boolean }[] = [
    { r: { x: cx - l / 2, y: haut, l, h }, cote: 'dessus', rappel: false },
    { r: { x: cx - l / 2, y: bas, l, h }, cote: 'dessous', rappel: false },
    { r: { x: e.x + e.l + ECART, y: cy - h / 2, l, h }, cote: 'droite', rappel: false },
    { r: { x: e.x - ECART - l, y: cy - h / 2, l, h }, cote: 'gauche', rappel: false },
  ]
  // Les places décalées : en haut à droite / à gauche, puis plus haut, plus bas, plus loin — chacune reliée à l'épingle par un trait.
  const pas = [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -2], [0, 2], [2, -1], [-2, -1], [2, 1], [-2, 1], [1, -2], [-1, -2], [1, 2], [-1, 2], [0, -3], [3, 0], [-3, 0]]
  for (const [dx, dy] of pas) {
    const x = dx === 0 ? cx - l / 2 : dx > 0 ? e.x + e.l + ECART + (Math.abs(dx) - 1) * (l * 0.6 + ECART) : e.x - ECART - l - (Math.abs(dx) - 1) * (l * 0.6 + ECART)
    const y = dy < 0 ? haut - (Math.abs(dy) - 1) * (h + ECART) - (dx === 0 ? 0 : h * 0.5) : bas + (Math.abs(dy) - 1) * (h + ECART) + (dx === 0 ? 0 : h * 0.5)
    out.push({ r: { x, y, l, h }, cote: 'decale', rappel: true })
  }
  return out
}

/**
 * Place les étiquettes. `obstacles` : ce qui est posé sur la carte (panneaux, outils) ; `ecran` : la taille du calque.
 * Rend une sortie par entrée, dans l'ordre d'ENTRÉE (pas de priorité) : le DOM s'y applique tel quel.
 */
export function placerEtiquettes(entrees: readonly EntreeEtiquette[], ecran: { l: number; h: number }, obstacles: readonly Rect[] = []): SortieEtiquette[] {
  const ordre = [...entrees].sort((a, b) => b.priorite - a.priorite || (a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0))
  const poses: Rect[] = [...obstacles]
  const epingles = entrees.map((e) => ({ cle: e.cle, r: e.epingle }))
  const libre = (r: Rect, cle: string) => dedans(r, ecran) && !poses.some((p) => seCoupent(r, p, MARGE)) && !epingles.some((p) => p.cle !== cle && seCoupent(r, p.r, MARGE))
  const sortie = new Map<string, SortieEtiquette>()
  // Deux passes : d'abord les étiquettes COMPLÈTES par priorité (une étiquette prioritaire n'est jamais repliée pour laisser la place
  // à une moins importante), puis les PASTILLES des étiquettes restées sans place.
  const restees: EntreeEtiquette[] = []
  for (const e of ordre) {
    const c = candidats(e.epingle, e.taille.l, e.taille.h).find((x) => libre(x.r, e.cle))
    if (c) { poses.push(c.r); sortie.set(e.cle, { cle: e.cle, mode: 'complete', ...c.r, cote: c.cote, rappel: c.rappel }) }
    else restees.push(e)
  }
  for (const e of restees) {
    const c = e.pastille ? candidats(e.epingle, e.pastille.l, e.pastille.h).find((x) => libre(x.r, e.cle)) : undefined
    if (c) { poses.push(c.r); sortie.set(e.cle, { cle: e.cle, mode: 'pastille', ...c.r, cote: c.cote, rappel: c.rappel }) }
    else sortie.set(e.cle, { cle: e.cle, mode: 'cachee', x: -9999, y: -9999, l: 0, h: 0, cote: null, rappel: false })
  }
  return entrees.map((e) => sortie.get(e.cle)!)
}

/** La priorité d'une étiquette de chantier, d'après la couleur de son épingle (lib/crm/atelier.ts, couleurEpingle) et la sélection. */
export function prioriteChantier(o: { epingle: string | null; etat: { retard: boolean } }, couleurs: { vert: string; corail: string; corailFonce: string }, choisi: boolean): number {
  if (choisi) return PRIORITES.selection
  if (o.etat.retard || o.epingle === couleurs.corailFonce) return PRIORITES.retard
  if (o.epingle === couleurs.corail) return PRIORITES.enCours
  if (o.epingle === couleurs.vert) return PRIORITES.fini
  return PRIORITES.aDemarrer
}
