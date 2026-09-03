// Socle de chiffrage (v4 §8/F1) — l'interface qui rend les sources de prix interchangeables.
//
// Pourquoi une abstraction avant d'avoir plusieurs sources : le jour où une licence de
// base d'ouvrages arrive (Batiprix, BatiChiffrage), on branche une implémentation de plus
// sans toucher au moteur de devis. Sans ça, la source finit codée en dur dans le prompt
// et tout est à réécrire.
//
// Ce qu'on ne fera PAS, et c'est une décision, pas un oubli : aspirer les prix des
// grossistes. Ils ne sont pas publics (chaque artisan a son prix net négocié, donc un
// prix tarif serait faux pour tout le monde), et l'extraction systématique d'une base
// tierce est illicite (droit sui generis, art. L.342-1 CPI).

export type SourceId = 'artisan' | 'marche' | 'ouvrages' | 'insee' | 'manuel'

/** Un prix, toujours accompagné de ce qui permet de le juger : d'où il vient et de quand. */
export type Poste = {
  designation: string
  unite: string
  prix_ht: number
  /** Fourchette quand la source ne donne pas un prix ferme (ordres de grandeur du marché). */
  prix_ht_min?: number
  prix_ht_max?: number
  tva_taux: number
  source: SourceId
  /** Ce qu'on affiche à l'artisan : « vos tarifs · Rexel · 12/02/2026 ». */
  source_libelle: string
  date_prix: string | null
  fournisseur?: string | null
  reference?: string | null
}

export type Fourchette = { min: number; max: number; source: SourceId; source_libelle: string; date_prix: string | null }

export interface SourcePrix {
  readonly id: SourceId
  /** Postes correspondant à une recherche libre. Tri par pertinence, à la charge de la source. */
  rechercher(q: string, ctx: { artisanId?: string; metier?: string | null; limite?: number }): Promise<Poste[]>
  /** Tout ce que la source peut fournir pour ce contexte (sert à nourrir le moteur de devis). */
  catalogue(ctx: { artisanId?: string; metier?: string | null; limite?: number }): Promise<Poste[]>
  /** Date de la donnée la plus récente — un prix sans fraîcheur ne vaut rien. */
  fraicheur(ctx: { artisanId?: string }): Promise<Date | null>
}

/** Libellé affichable d'un prix — c'est ce que verra l'artisan sur sa ligne de devis. */
export function libelleSource(p: Poste): string {
  const d = p.date_prix ? new Date(p.date_prix).toLocaleDateString('fr-FR') : null
  switch (p.source) {
    case 'artisan':
      return `vos tarifs${p.fournisseur ? ` · ${p.fournisseur}` : ''}${d ? ` · ${d}` : ''}`
    case 'marche':
      return 'ordre de grandeur du marché'
    case 'ouvrages':
      return `base d'ouvrages${d ? ` · ${d}` : ''}`
    case 'insee':
      return 'indice INSEE (révision, pas un prix)'
    default:
      return 'estimation'
  }
}

/**
 * Ce que l'IA a le droit d'écrire comme provenance sur une ligne (v4 §8/F4).
 * Toute valeur inattendue retombe sur « estimation » : jamais un prix qui a l'air
 * sourcé alors qu'il ne l'est pas.
 */
export function sourceLigneValide(brut: unknown, catalogue: Poste[]): string {
  const s = String(brut ?? '').trim()
  if (!s) return 'estimation'
  // On n'accepte qu'un libellé RÉELLEMENT présent dans le catalogue transmis à l'IA :
  // c'est ce qui l'empêche d'inventer « tarifs Rexel » pour un prix qu'elle a deviné.
  const permis = new Set<string>(['estimation', 'ordre de grandeur du marché'])
  for (const p of catalogue) permis.add(p.source_libelle)
  return permis.has(s) ? s : 'estimation'
}
