import './plat.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

// Layout de segment : charge la feuille de la PLATEFORME uniquement pour /p/[slug].
// Métadonnées neutres pour la 404 (voir app/site/[slug]/layout.tsx) — la page rend la marque de l'artisan.
export const metadata: Metadata = {
  title: { absolute: 'Page introuvable' },
  description: 'Cette page n’existe pas.',
  applicationName: '—',
  authors: [],
  keywords: [],
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  // v9 §2.2 — white-label : pas de manifeste d'application ni de mode « app iOS » sur une surface
  // d'artisan. `null` efface ce que le layout racine déclare (scripts/pwa-e2e.mjs le vérifie).
  manifest: null,
  appleWebApp: null,
  other: { 'apple-mobile-web-app-capable': '' }, // '' → balise non rendue (Next ignore un contenu vide)
  openGraph: { title: 'Page introuvable', description: 'Cette page n’existe pas.', siteName: '—', url: undefined, images: [] },
  twitter: { card: 'summary', title: 'Page introuvable', description: 'Cette page n’existe pas.', images: [] },
}

// v9 §2.2 — la couleur de thème Presti (fond nuit) n'a rien à faire sur la surface d'un artisan.
export const viewport: Viewport = { themeColor: null }

export default function PlatSegmentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
