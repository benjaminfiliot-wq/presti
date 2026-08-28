import './globals.css'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'

// Design system "Chantier" : display grotesque architecturé (Bricolage) + corps net (Hanken) + data (JetBrains Mono).
const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--f-display', display: 'swap' })
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--f-body', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-mono', display: 'swap' })

const TITLE = "Presti — Répondez à chaque demande de devis en moins d'une minute"
const DESC =
  "Presti répond à vos demandes de devis en moins d'une minute, dans votre ton, et relance automatiquement jusqu'à la réponse. Ne perdez plus jamais un chantier faute de temps."

export const metadata: Metadata = {
  metadataBase: new URL('https://prestiapp.fr'),
  title: { default: TITLE, template: '%s · Presti' },
  description: DESC,
  applicationName: 'Presti',
  keywords: ['devis artisan', 'logiciel devis bâtiment', 'réponse devis automatique', 'facture artisan', 'relance devis', 'IA artisan', 'plombier électricien devis'],
  authors: [{ name: 'Presti' }],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://prestiapp.fr',
    siteName: 'Presti',
    title: TITLE,
    description: DESC,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
