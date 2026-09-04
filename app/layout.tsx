import './base.css' // fondation seule (reset + tokens). L'UI console/landing (globals.css) est
                    // importée par AppShell + les pages publiques → /site et /l ne la chargent JAMAIS.
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono, Fraunces, Archivo_Narrow, IBM_Plex_Sans, Manrope, Newsreader, Instrument_Serif, Syne, Lora } from 'next/font/google'
import GoogleAnalytics from '@/app/GoogleAnalytics'

// Design system "Chantier" : display grotesque architecturé (Bricolage) + corps net (Hanken) + data (JetBrains Mono).
const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--f-display', display: 'swap' })
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--f-body', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-mono', display: 'swap' })
// Site vitrine (constructeur 3 niveaux) : serif éditoriale à caractère (Fraunces) pour un rendu premium.
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '600', '700', '900'], style: ['normal', 'italic'], variable: '--f-fraunces', display: 'swap' })
// Polices des THÈMES de site artisan (preload:false → chargées seulement quand le thème les utilise).
const archivo = Archivo_Narrow({ subsets: ['latin'], weight: ['600', '700'], variable: '--f-archivo', display: 'swap', preload: false })
const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--f-plex', display: 'swap', preload: false })
const manrope = Manrope({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--f-manrope', display: 'swap', preload: false })
// Couples de polices du mode avancé (v4 §7/E1) — preload:false : le navigateur ne télécharge
// que la police du couple réellement choisi par l'artisan.
const newsreader = Newsreader({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--f-newsreader', display: 'swap', preload: false })
const instrument = Instrument_Serif({ subsets: ['latin'], weight: ['400'], style: ['normal', 'italic'], variable: '--f-instrument', display: 'swap', preload: false })
const syne = Syne({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--f-syne', display: 'swap', preload: false })
const lora = Lora({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--f-lora', display: 'swap', preload: false })

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
  // Google Search Console : poser le code dans la variable d'env GOOGLE_SITE_VERIFICATION
  // (Vercel → Settings → Environment Variables) → la balise apparaît, le domaine est vérifié.
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
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable} ${fraunces.variable} ${archivo.variable} ${plex.variable} ${manrope.variable} ${newsreader.variable} ${instrument.variable} ${syne.variable} ${lora.variable}`}>
      <body>{children}<GoogleAnalytics /></body>
    </html>
  )
}
