import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Métadonnées de /login. Elles vivent ici et pas dans page.tsx parce que la page est un
// composant client ('use client') : Next refuse d'y exporter `metadata`. Sans ce fichier, la
// page héritait du titre ET de la canonique de la racine — elle se déclarait comme étant
// l'accueil (audit final, C/11).
//
// `noindex` en plus : robots.txt interdit déjà /login, mais un robot qui ne peut pas EXPLORER
// une page peut quand même l'INDEXER sur la foi d'un lien entrant. La balise, elle, tranche.
//
// Pas de bloc `openGraph` : en redéclarer un remplacerait celui du layout racine EN ENTIER,
// image de partage comprise. Le titre et la description ci-dessous en tiennent lieu.

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à votre espace Presti pour retrouver vos demandes, vos devis et vos factures.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
