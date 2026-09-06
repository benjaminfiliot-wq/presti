import type { MetadataRoute } from 'next'

// Manifeste de l'application installable (prompt v9 §2.1). Convention Next : servi sur
// /manifest.webmanifest en `application/manifest+json`, relié depuis le layout racine.
//
// White-label : les segments /site/[slug] et /p/[slug] posent `manifest: null` dans leurs
// métadonnées — la balise <link rel="manifest"> n'y existe pas, le client d'un artisan n'est
// jamais invité à « installer Presti » (scripts/pwa-e2e.mjs le vérifie).
//
// Icônes : les 192/512 « any » sont l'icône de marque (coins arrondis transparents) ; les
// « maskable » sont générées depuis presti-icone-512.png sur fond nuit plein cadre, la marque
// réduite à 76 % pour tenir dans la zone sûre (cercle de 80 %).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Presti',
    short_name: 'Presti',
    description: 'Répondez à chaque demande de devis en moins d’une minute',
    start_url: '/dashboard?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    lang: 'fr',
    dir: 'ltr',
    background_color: '#0A0C11',
    theme_color: '#0A0C11',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/marque/presti-icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/marque/presti-icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/marque/presti-icone-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/marque/presti-icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/marque/captures/app-messages.png', sizes: '1080x2340', type: 'image/png', form_factor: 'narrow', label: 'Vos conversations : chaque demande de devis, répondue en moins d’une minute' },
      { src: '/marque/captures/app-devis.png', sizes: '1080x2340', type: 'image/png', form_factor: 'narrow', label: 'Vos devis et factures, prêts à envoyer' },
      { src: '/marque/captures/app-tableau.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide', label: 'Le tableau de bord de votre activité' },
    ],
    shortcuts: [
      { name: 'Messages', short_name: 'Messages', description: 'Vos conversations', url: '/messages', icons: [{ src: '/marque/presti-icone-96.png', sizes: '96x96', type: 'image/png' }] },
      { name: 'Nouveau devis', short_name: 'Devis', description: 'Rédiger un devis', url: '/devis/nouveau', icons: [{ src: '/marque/presti-icone-96.png', sizes: '96x96', type: 'image/png' }] },
      { name: 'Inventaire', short_name: 'Inventaire', description: 'Votre stock et vos fournisseurs', url: '/inventaire', icons: [{ src: '/marque/presti-icone-96.png', sizes: '96x96', type: 'image/png' }] },
    ],
  }
}
