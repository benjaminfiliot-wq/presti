// Composition du site vitrine, pilotée par les données (v3/J4).
// L'artisan peut réordonner / activer / désactiver des sections. Stocké dans
// `artisans.site_layout` (jsonb). Défaut = composition dérivée du niveau → aucun site cassé.

export type SectionId =
  | 'hero' | 'trust' | 'words' | 'features' | 'manifesto'
  | 'gallery' | 'services' | 'about' | 'process' | 'faq' | 'zone' | 'contact'

export type SiteSection = { id: SectionId; on: boolean; variant?: string; opts?: Record<string, unknown> }
export type SiteLayout = { v: 2; sections: SiteSection[] }

// Niveau minimal requis par section (gating SERVEUR par formule — jamais un simple masquage CSS).
export const SECTION_MIN_TIER: Record<SectionId, 1 | 2 | 3> = {
  hero: 1, contact: 1, services: 1, about: 1, process: 1, faq: 1, zone: 1,
  trust: 2, gallery: 2,
  words: 3, features: 3, manifesto: 3,
}

// Ordre canonique (sert de repli et de tri de secours).
export const SECTION_ORDER: SectionId[] = ['hero', 'trust', 'words', 'features', 'manifesto', 'gallery', 'services', 'about', 'process', 'faq', 'zone', 'contact']

// Composition par défaut selon le niveau (reproduit EXACTEMENT le rendu actuel).
export function defaultLayout(tier: 1 | 2 | 3): SiteLayout {
  const ids: SectionId[] = tier >= 3
    ? ['hero', 'trust', 'words', 'features', 'manifesto', 'gallery', 'services', 'about', 'contact']
    : tier === 2
      ? ['hero', 'trust', 'gallery', 'services', 'about', 'contact']
      : ['hero', 'services', 'about', 'contact']
  return { v: 2, sections: ids.map((id) => ({ id, on: true })) }
}

// Résout la composition finale à rendre : part du stocké (ou du défaut), garde les sections
// ACTIVÉES et AUTORISÉES par le niveau. La disponibilité du contenu (photos, etc.) est gérée
// au rendu (une section sans contenu rend null).
export function resolveLayout(stored: unknown, tier: 1 | 2 | 3): SiteLayout {
  const raw = (stored && typeof stored === 'object' && Array.isArray((stored as SiteLayout).sections))
    ? (stored as SiteLayout)
    : defaultLayout(tier)
  const seen = new Set<SectionId>()
  const sections = raw.sections
    .filter((s) => s && typeof s.id === 'string' && SECTION_MIN_TIER[s.id as SectionId] !== undefined)
    .filter((s) => s.on !== false && SECTION_MIN_TIER[s.id] <= tier)
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true))) // dédup
  // contact et hero sont structurants : on garantit leur présence.
  if (!seen.has('hero')) sections.unshift({ id: 'hero', on: true })
  if (!seen.has('contact')) sections.push({ id: 'contact', on: true })
  return { v: 2, sections }
}
