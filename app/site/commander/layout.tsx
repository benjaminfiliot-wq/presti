import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { PRIX_SITE_CENTS } from '@/lib/siteCommande'

// Sans ce bloc, la page héritait du titre de l'accueil et de sa canonique « / » (audit du 11/10).
export const metadata: Metadata = {
  title: 'Commander votre site',
  description: `Un site pour votre entreprise, à ${PRIX_SITE_CENTS / 100} € une fois, sans abonnement.`,
  alternates: { canonical: '/site/commander' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
