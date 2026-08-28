import type { MetadataRoute } from 'next'

// Google : liste des pages publiques indexables.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://prestiapp.fr'
  const now = new Date()
  const pages: { path: string; priority: number }[] = [
    { path: '', priority: 1 },
    { path: '/faq', priority: 0.7 },
    { path: '/cgu', priority: 0.4 },
    { path: '/confidentialite', priority: 0.4 },
    { path: '/mentions-legales', priority: 0.4 },
  ]
  return pages.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: p.priority,
  }))
}
