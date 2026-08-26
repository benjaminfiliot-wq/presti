import './globals.css'
import type { ReactNode } from 'react'
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'

// Design system "Chantier" : display grotesque architecturé (Bricolage) + corps net (Hanken) + data (JetBrains Mono).
const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--f-display', display: 'swap' })
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--f-body', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-mono', display: 'swap' })

export const metadata = {
  title: "Presti — Répondez à chaque demande de devis en moins d'une minute",
  description:
    "Presti répond à vos demandes de devis en moins d'une minute, dans votre ton, et relance automatiquement jusqu'à la réponse. Ne perdez plus jamais un chantier faute de temps.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
