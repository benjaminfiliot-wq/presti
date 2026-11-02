import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { METIERS_DEVIS, PAGES_DEVIS } from '@/lib/seoDevis'
import { actif } from '@/lib/flags'

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
    { path: '/contact', priority: 0.6 },
    { path: '/mentions-legales', priority: 0.4 },
    // 02/11 (chantier 2, lot 6) : /offres et /comparatif, pages secondaires de la landing v2 — dans le plan du site seulement drapeau
    // levé (baissé, elles répondent 404 en production : un plan du site ne liste jamais une page absente).
    ...(actif('landingV2') ? [{ path: '/offres', priority: 0.8 }, { path: '/comparatif', priority: 0.6 }] : []),
    // 27/10 — la rubrique « devis » (lib/seoDevis.ts) : générateur, modèles par métier, guide, logiciel.
    ...PAGES_DEVIS.map((p) => ({ path: p.path, priority: 0.9 })),
    ...METIERS_DEVIS.map((m) => ({ path: `/modele-devis/${m.slug}`, priority: 0.7 })),
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
      .not('email', 'like', '%@presti-test.invalid') // jamais un compte de test ou de démonstration dans l'index
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
