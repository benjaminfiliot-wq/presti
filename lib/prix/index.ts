import { sourceArtisan } from './artisan'
import { sourceMarche } from './marche'
import type { Poste, SourceId } from './types'

export * from './types'
export { sourceArtisan, sourceMarche }

// Le catalogue servi au moteur de devis (v4 §8/F1).
//
// Ordre de priorité assumé : les prix de l'artisan d'abord, les ordres de grandeur du
// marché ensuite, et seulement pour les postes qu'il n'a pas. Un prix qu'il a lui-même
// saisi ou importé bat toujours une moyenne nationale — c'est tout l'intérêt.

const normaliser = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export type Catalogue = {
  postes: Poste[]
  /** Combien viennent de l'artisan lui-même : sert à dire honnêtement sur quoi on chiffre. */
  nbArtisan: number
  nbMarche: number
  fraicheurArtisan: Date | null
}

export async function catalogueDe(artisanId: string, metier: string | null): Promise<Catalogue> {
  const [propres, marche, fraicheur] = await Promise.all([
    sourceArtisan.catalogue({ artisanId, limite: 150 }),
    sourceMarche.catalogue({ metier, limite: 60 }),
    sourceArtisan.fraicheur({ artisanId }),
  ])

  // Un poste du marché dont l'artisan a déjà l'équivalent n'apporte rien : on le laisse
  // de côté plutôt que de proposer deux prix contradictoires pour la même chose.
  const connus = new Set(propres.map((p) => normaliser(p.designation)))
  const complement = marche.filter((p) => !connus.has(normaliser(p.designation)))

  return {
    postes: [...propres, ...complement],
    nbArtisan: propres.length,
    nbMarche: complement.length,
    fraicheurArtisan: fraicheur,
  }
}

/** Recherche toutes sources confondues, les prix de l'artisan en tête. */
export async function rechercherPrix(q: string, ctx: { artisanId: string; metier: string | null }): Promise<Poste[]> {
  const [a, m] = await Promise.all([
    sourceArtisan.rechercher(q, ctx),
    sourceMarche.rechercher(q, ctx),
  ])
  const connus = new Set(a.map((p) => normaliser(p.designation)))
  return [...a, ...m.filter((p) => !connus.has(normaliser(p.designation)))]
}


export const SOURCES_DISPONIBLES: SourceId[] = ['artisan', 'marche']
