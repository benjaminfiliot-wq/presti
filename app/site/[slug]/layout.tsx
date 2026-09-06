import './site.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

// Layout de segment : charge la feuille du SITE VITRINE uniquement pour /site/[slug].
//
// Ses métadonnées sont NEUTRES : quand la page appelle notFound(), Next ne garde que les
// métadonnées des layouts — et le layout racine dit « Presti — Répondez à chaque demande… »,
// titre, auteur, OG et carte Twitter compris. Une 404 sur la surface d'un artisan porterait
// donc la marque Presti (audit v4 : fuite white-label sur domaine perso). La page, quand elle
// rend, écrase tout ceci avec la marque de l'artisan.
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

export default function SiteSegmentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
