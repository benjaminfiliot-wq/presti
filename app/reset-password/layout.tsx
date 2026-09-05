import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Métadonnées de /reset-password — voir app/login/layout.tsx pour le détail : page cliente,
// donc `metadata` ne peut pas être exporté depuis page.tsx ; sans ce fichier elle portait le
// titre et la canonique de l'accueil (audit final, C/11) ; `noindex` parce que robots.txt
// interdit l'exploration mais pas l'indexation sur simple lien entrant ; et pas de bloc
// `openGraph`, qui remplacerait celui du layout racine, image de partage comprise.

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  description: 'Recevez un lien pour redéfinir le mot de passe de votre compte Presti.',
  alternates: { canonical: '/reset-password' },
  robots: { index: false, follow: true },
}

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
