import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const revalidate = 3600 // le sitemap se rafraîchit au plus une fois par heure

// Google : pages publiques de la landing + TOUS les sites vitrine publiés et indexables.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://prestiapp.fr'
  const now = new Date()
  const pages: { path: string; priority: number }[] = [
    { path: '', priority: 1 },
    { path: '/faq', priority: 0.7 },
    { path: '/cgu', priority: 0.4 },
    { path: '/confidentialite', priority: 0.4 },
    { path: '/mentions-legales', priority: 0.4 },
  ]
  const entries: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${base}${p.path}`, lastModified: now, changeFrequency: 'monthly', priority: p.priority,
  }))

  // Sites vitrine des artisans (publiés + SEO activé). Best-effort : en cas d'erreur, on renvoie au moins la landing.
  try {
    const { data } = await supabaseAdmin
      .from('artisans')
      .select('slug, created_at')
      .eq('site_active', true)
      .eq('site_seo', true)
      .not('slug', 'is', null)
      .limit(5000)
    for (const a of (data as { slug: string | null; created_at: string | null }[]) ?? []) {
      if (!a.slug) continue
      entries.push({
        url: `${base}/site/${a.slug}`,
        lastModified: a.created_at ? new Date(a.created_at) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch { /* landing seule si la requête échoue */ }
  return entries
}
