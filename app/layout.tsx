import './base.css' // fondation seule (reset + tokens). L'UI console/landing (globals.css) est
                    // importée par AppShell + les pages publiques → /site et /l ne la chargent JAMAIS.
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono, Fraunces, Archivo_Narrow, IBM_Plex_Sans, Manrope, Newsreader, Instrument_Serif, Syne, Lora } from 'next/font/google'
import GoogleAnalytics from '@/app/GoogleAnalytics'
// v9 J3 — dans la coque native, l'écran de lancement se retire au premier rendu, quelle que soit la page (inerte ailleurs).
import NatifSplash from '@/app/NatifSplash'
// v9 J4 — verrou biométrique après 5 min d'arrière-plan : toutes les pages authentifiées (/controle, /onboarding compris), jamais /site ni /p.
import VerrouNatif from '@/app/VerrouNatif'

// Design system "Chantier" : display grotesque architecturé (Bricolage) + corps net (Hanken) + data (JetBrains Mono).
const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--f-display', display: 'swap' })
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--f-body', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-mono', display: 'swap' })
// Site vitrine (constructeur 3 niveaux) : serif éditoriale à caractère (Fraunces) pour un rendu premium.
//
// `preload: false` — mesuré le 08/09. Elle était préchargée depuis le layout RACINE, donc sur toutes
// les pages, alors qu'elle ne sert QUE dans site.css et plat.css : `globals.css`, qui habille la
// vitrine Presti et toute la console, ne la nomme nulle part. Quatre polices se disputaient donc la
// bande passante du premier écran, dont une inutile — et l'élément qui décide du plus grand rendu sur
// la page d'accueil est le mot « Presti » du bandeau, c'est-à-dire du TEXTE, qui attend sa police.
// Sans préchargement, Fraunces reste déclarée et disponible : les pages qui l'utilisent la demandent
// en découvrant leur CSS, et `display: swap` fait qu'aucun texte n'attend jamais après elle.
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '600', '700', '900'], style: ['normal', 'italic'], variable: '--f-fraunces', display: 'swap', preload: false })
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

// ICÔNES — elles n'apparaissent pas dans l'objet ci-dessous, et c'est la bonne façon de faire.
// Next les découvre par convention de fichier : app/icon.svg (onglets modernes),
// app/apple-icon.png (écran d'accueil iOS), app/site/[slug]/icon.tsx et apple-icon.tsx pour la
// marque de l'artisan. Deux règles à ne pas casser :
//
//  1. NE JAMAIS déclarer `icons` dans ces métadonnées. Une icône posée là empêche Next de
//     prendre celles des segments enfants : /site/[slug] et /p/[slug] perdraient l'icône à la
//     marque de l'artisan et afficheraient celle de Presti (marque blanche démentie).
//  2. Le .ico est dans public/, PAS dans app/. Un app/favicon.ico est traité par Next comme un
//     cas spécial : il est ajouté à TOUTES les routes, y compris celles de l'artisan, qu'un
//     segment enfant redéfinisse ou non ses icônes — même conséquence qu'au point 1. Depuis
//     public/, il ne produit aucune balise : il sert de repli implicite sur /favicon.ico, ce que
//     Safari va chercher quand il ne sait pas lire l'icône SVG déclarée (audit final, C/13). Sur
//     le site d'un artisan, l'icône déclarée est un PNG : Safari la lit et ne descend jamais
//     jusqu'à ce repli.
// v8 A1.4 — `viewportFit: 'cover'` : sans lui, les zones sûres d'iOS (encoche, barre d'accueil) valent 0
// et les barres collées en bas passent sous la barre d'accueil. Le thème et l'app installable : partie B.
// v9 §2.2 — `themeColor` : la barre système prend le fond nuit quand l'app est installée. Le manifeste
// (app/manifest.ts) et `appleWebApp` ci-dessous sont RETIRÉS par les segments /site et /p (white-label).
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0A0C11' }

export const metadata: Metadata = {
  metadataBase: new URL('https://prestiapp.fr'),
  title: { default: TITLE, template: '%s · Presti' },
  description: DESC,
  applicationName: 'Presti',
  // v9 §2.2 — installée sur l'écran d'accueil iOS : plein écran, barre d'état translucide, nom « Presti ».
  appleWebApp: { capable: true, title: 'Presti', statusBarStyle: 'black-translucent' },
  // Next rend `mobile-web-app-capable` ; les iOS antérieurs à 17.4 ne lisent que la variante `apple-`.
  other: { 'apple-mobile-web-app-capable': 'yes' },
  keywords: ['devis artisan', 'logiciel devis bâtiment', 'réponse devis automatique', 'facture artisan', 'relance devis', 'IA artisan', 'plombier électricien devis'],
  authors: [{ name: 'Presti' }],
  // PIÈGE : cette canonique est celle de l'ACCUEIL, et elle descend sur toute page qui ne la
  // redéfinit pas — la page se déclare alors comme étant l'accueil (audit final, C/11 : c'était
  // le cas de /login, /signup, /abonnement, /reset-password et de la 404). Toute nouvelle page
  // publique doit poser `alternates: { canonical: '/son-chemin' }`, et une page qui n'a pas
  // d'URL canonique propre (404) doit poser `alternates: { canonical: null }`.
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  // Google Search Console : poser le code dans la variable d'env GOOGLE_SITE_VERIFICATION
  // (Vercel → Settings → Environment Variables) → la balise apparaît, le domaine est vérifié.

  // Aperçu de partage. PAS de `title` ni de `description` ici, et c'est volontaire : Next ne
  // fusionne pas `openGraph` champ par champ entre segments. Un titre posé ici n'est donc pas
  // un défaut — c'est un titre GRAVÉ sur toutes les pages, que ni /faq, ni /contact, ni les
  // pages légales ne pouvaient corriger sans redéclarer tout le bloc (et perdre au passage
  // l'image de app/opengraph-image.tsx, rattachée au bloc et non au fichier). Laissés vides,
  // Next les remplit avec le `title` et la `description` PROPRES à chaque page — l'accueil
  // récupère les siens (TITLE/DESC ci-dessus) sans rien changer (audit final, C/12).
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://prestiapp.fr',
    siteName: 'Presti',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable} ${fraunces.variable} ${archivo.variable} ${plex.variable} ${manrope.variable} ${newsreader.variable} ${instrument.variable} ${syne.variable} ${lora.variable}`}>
      <body>{children}<GoogleAnalytics /><NatifSplash /><VerrouNatif /></body>
    </html>
  )
}
