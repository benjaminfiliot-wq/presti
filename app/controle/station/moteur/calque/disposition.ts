// Fiche 026-184 (K4c) : où se posent les plaques, les personnages et les « +1 » sur la grille logique de la carte.
// La disposition vient du thème (theme.json, validé par lib/pilotage/theme.ts, le même code qu'au serveur) ; sans thème lisible
// (réseau coupé, fichier invalide) une grille de repli en cellules égales garde la carte utilisable : les plaques et les noms restent lisibles.
import { SALLES, SALLE_RESERVEE } from '@/lib/pilotage/equipage'
import type { Theme } from '@/lib/pilotage/theme'
import { chargerTheme as charger } from '../theme/charger'
import type { Emplacement, Grille, MotifActeur } from '../types'

export type Cadre = { x: number; y: number; l: number; h: number }
export type Place = { cle: string; texte: string; cadre: Cadre; plaque: Emplacement; porte: Emplacement; poste: Emplacement | null; reservee: boolean }
export type Disposition = { places: Place[]; etapes: Record<string, Emplacement> }

/** Le thème de la liste fermée, par le SEUL chargeur du moteur (moteur/theme/charger.ts : un seul fetch, préfixe fixe) ; null s'il est refusé. */
export async function chargerTheme(cle: string): Promise<Theme | null> {
  const r = await charger(cle)
  return r.ok ? r.theme : null
}

const boite = (e: Theme['emplacements'][number]): Cadre => {
  const f = e.forme
  if (f.type === 'polygone' && f.points?.length) {
    const xs = f.points.map((p) => p[0]), ys = f.points.map((p) => p[1])
    return { x: Math.min(...xs), y: Math.min(...ys), l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  }
  return { x: f.x ?? 0, y: f.y ?? 0, l: f.l ?? 0, h: f.h ?? 0 }
}

/** La disposition du thème pour la grille du canevas : celle du bureau, ou le bloc `portrait` quand la grille est la sienne. */
export function dispositionDuTheme(theme: Theme, grille: Grille): Disposition {
  const g = theme.grille
  const portrait = theme.portrait && !(g.largeur === grille.largeur && g.hauteur === grille.hauteur)
    && theme.portrait.grille.largeur === grille.largeur && theme.portrait.grille.hauteur === grille.hauteur
  const emplacements = portrait && theme.portrait ? theme.portrait.emplacements : theme.emplacements
  const etapes: Record<string, Emplacement> = {}
  for (const e of theme.tapis.etapes) etapes[e.cle] = { x: e.x, y: e.y }
  return {
    etapes,
    places: emplacements.map((e) => ({
      cle: e.cle, texte: e.plaque.texte, cadre: boite(e), plaque: { x: e.plaque.x, y: e.plaque.y }, porte: e.porte, poste: e.poste, reservee: e.reservee,
    })),
  }
}

/** La grille de repli : les vingt salles et la réservée en six colonnes de cellules égales. */
export function dispositionDeRepli(grille: Grille): Disposition {
  const cles = [...SALLES.map((s) => ({ cle: s.cle, texte: s.plaque, reservee: false })), { cle: SALLE_RESERVEE.cle, texte: SALLE_RESERVEE.plaque, reservee: true }]
  const colonnes = 6, lignes = Math.ceil(cles.length / colonnes)
  const l = grille.largeur / colonnes, h = grille.hauteur / lignes
  return {
    etapes: {},
    places: cles.map((c, i) => {
      const x = (i % colonnes) * l, y = Math.floor(i / colonnes) * h
      return {
        cle: c.cle, texte: c.texte, cadre: { x: x + 2, y: y + 2, l: l - 4, h: h - 4 }, plaque: { x: x + 4, y: y + 4 },
        porte: { x: x + l / 2, y: y + h - 2 }, poste: c.reservee ? null : { x: x + l / 2, y: y + h * 0.65 }, reservee: c.reservee,
      }
    }),
  }
}

/** Où se pose le pied d'un personnage : à la porte pour le motif `porte`, sinon au poste de sa salle, étalé selon son rang. */
export function piedDe(place: Place | undefined, motif: MotifActeur | null, rang: number, dans: number): Emplacement | null {
  if (!place) return null
  const base = motif === 'porte' || !place.poste ? place.porte : place.poste
  const pas = 14, decalage = (rang - (dans - 1) / 2) * pas
  const x = Math.min(place.cadre.x + place.cadre.l - 6, Math.max(place.cadre.x + 6, base.x + decalage))
  return { x: Math.round(x), y: Math.round(base.y) }
}
