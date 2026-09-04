import './plat.css'
import type { Metadata } from 'next'
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
  openGraph: { title: 'Page introuvable', description: 'Cette page n’existe pas.', siteName: '—', url: undefined, images: [] },
  twitter: { card: 'summary', title: 'Page introuvable', description: 'Cette page n’existe pas.', images: [] },
}

export default function PlatSegmentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
