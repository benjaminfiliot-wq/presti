import './site.css'
import type { Metadata } from 'next'
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
  openGraph: { title: 'Page introuvable', description: 'Cette page n’existe pas.', siteName: '—', url: undefined, images: [] },
  twitter: { card: 'summary', title: 'Page introuvable', description: 'Cette page n’existe pas.', images: [] },
}

export default function SiteSegmentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
