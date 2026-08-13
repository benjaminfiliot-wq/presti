import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Presti',
  description: 'Ne perds plus jamais un chantier.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
