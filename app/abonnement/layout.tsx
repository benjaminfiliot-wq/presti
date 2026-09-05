import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Métadonnées de /abonnement — voir app/login/layout.tsx pour le détail : page cliente, donc
// `metadata` ne peut pas être exporté depuis page.tsx ; sans ce fichier elle portait le titre
// et la canonique de l'accueil (audit final, C/11) ; `noindex` parce que c'est une page de la
// console, derrière la connexion, et que robots.txt interdit l'exploration mais pas
// l'indexation sur simple lien entrant ; et pas de bloc `openGraph`, qui remplacerait celui du
// layout racine, image de partage comprise.

export const metadata: Metadata = {
  title: 'Abonnement',
  description: 'Choisissez l’offre Presti adaptée à votre volume d’activité — sans engagement, résiliable à tout moment.',
  alternates: { canonical: '/abonnement' },
  robots: { index: false, follow: true },
}

export default function AbonnementLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
