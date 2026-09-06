// Service worker de la console Presti (prompt v9 §2.3), compilé par @serwist/next vers public/sw.js.
//
// Ce qu'il fait — et surtout ce qu'il ne fait PAS :
//  - précache : la page hors-ligne et les icônes de marque (liste dans next.config.mjs) ;
//  - /_next/static/* (fichiers immuables, hachés) : cache d'abord, 30 jours ;
//  - /marque/* : servi du cache, rafraîchi derrière ;
//  - pages (navigations) : réseau seulement — une page de la console porte des données
//    personnelles, elle n'entre JAMAIS dans un cache ; sans réseau → /hors-ligne ;
//  - /api/*, /auth/*, /p/*, /site/* : réseau seulement, et AUCUN repli Presti : le client d'un
//    artisan hors ligne voit l'erreur de son navigateur, pas une page « Presti » (white-label).
//  - skipWaiting désactivé : une nouvelle version attend que l'artisan clique « Recharger »
//    (app/MiseAJour.tsx) — jamais de rechargement imposé au milieu d'un devis.
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}
declare const self: ServiceWorkerGlobalScope

/** Jamais en cache : données personnelles (/api, /auth) et surfaces artisan (/p, /site). */
const PRIVE = /^\/(api|auth|p|site)\//
/** Surfaces artisan : aucun repli hors-ligne Presti. */
const surfaceArtisan = (chemin: string) => /^\/(p|site)\//.test(chemin)

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  disableDevLogs: true,
  runtimeCaching: [
    { matcher: ({ sameOrigin, url }) => sameOrigin && PRIVE.test(url.pathname), handler: new NetworkOnly() },
    { matcher: ({ sameOrigin, request }) => sameOrigin && request.mode === 'navigate', handler: new NetworkOnly() },
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
      handler: new CacheFirst({ cacheName: 'presti-statique', plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 30 * 86400 })] }),
    },
    { matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/marque/'), handler: new StaleWhileRevalidate({ cacheName: 'presti-marque' }) },
  ],
  fallbacks: {
    entries: [
      { url: '/hors-ligne', matcher: ({ request }) => request.destination === 'document' && !surfaceArtisan(new URL(request.url).pathname) },
    ],
  },
})

serwist.addEventListeners()
