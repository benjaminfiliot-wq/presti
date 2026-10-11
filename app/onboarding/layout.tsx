import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AuthCadre from '@/app/AuthCadre'

// Premiers pas après l'inscription : le même cadre que la connexion (refonte du 11/10/2026), avec un
// panneau qui dit où l'on en est. La page est un composant client : les métadonnées vivent ici.
export const metadata: Metadata = {
  title: 'Ton profil',
  robots: { index: false, follow: false },
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <AuthCadre variante="profil">{children}</AuthCadre>
}
