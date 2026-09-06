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

/** Jamais en cache : données personnelles (/api, /auth) et surfaces artisan (/p, /site, et /l, l'ancienne
 *  adresse des plateformes encore redirigée par next.config.mjs — hors ligne, la redirection n'a pas lieu). */
const PRIVE = /^\/(api|auth|p|site|l)\//
/** Surfaces artisan : aucun repli hors-ligne Presti. */
const surfaceArtisan = (chemin: string) => /^\/(p|site|l)\//.test(chemin)

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
      // Fichier statique sans script (public/hors-ligne.html) : une page Next réclamait son chunk JS à
      // l'hydratation et, hors ligne, l'écran d'erreur générique remplaçait la page (revue du 06/09).
      { url: '/hors-ligne.html', matcher: ({ request }) => request.destination === 'document' && !surfaceArtisan(new URL(request.url).pathname) },
    ],
  },
})

serwist.addEventListeners()

// ── Notifications push (prompt v9 §3.4) ─────────────────────────────────────────────────────────────
// La charge utile vient de lib/push.ts : un titre, une ligne, une adresse Presti, un tag — jamais le
// contenu d'un message. Ici on ne fait confiance à rien : tout est borné et l'adresse doit être un
// chemin de même origine (un `//hôte` ou une URL externe retombe sur /dashboard).
type Charge = { titre?: unknown; ligne?: unknown; url?: unknown; tag?: unknown; renotify?: unknown }
const texte = (v: unknown, max: number, defaut = '') => (typeof v === 'string' ? v.slice(0, max) : defaut)
const cheminSur = (v: unknown) => (typeof v === 'string' && /^\/(?!\/)[^\s]*$/.test(v) ? v : '/dashboard')

self.addEventListener('push', (event) => {
  let c: Charge = {}
  try { c = (event.data?.json() ?? {}) as Charge } catch { c = { titre: 'Presti', ligne: texte(event.data?.text(), 120) } }
  const titre = texte(c.titre, 60, 'Presti') || 'Presti'
  const options: NotificationOptions & { renotify?: boolean } = {
    body: texte(c.ligne, 120),
    icon: '/marque/presti-icone-192.png',
    badge: '/marque/presti-icone-96.png',
    tag: texte(c.tag, 60, 'presti') || 'presti',
    renotify: !!c.renotify,
    data: { url: cheminSur(c.url) },
  }
  event.waitUntil(self.registration.showNotification(titre, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(cheminSur((event.notification.data as { url?: unknown } | undefined)?.url), self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (fenetres) => {
      // Une fenêtre Presti est déjà ouverte : on y va, sinon on en ouvre une (l'app installée si elle l'est).
      const f = fenetres.find((w) => 'navigate' in w && 'focus' in w)
      if (f) { const n = await f.navigate(url).catch(() => null); await (n ?? f).focus(); return }
      await self.clients.openWindow(url)
    }),
  )
})
