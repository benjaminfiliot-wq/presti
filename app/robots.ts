import type { MetadataRoute } from 'next'

// Google : autorise l'indexation des pages publiques, bloque l'espace privé (app) et l'API.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Toute la console privée. Ces pages redirigent vers /login côté client : rien ne fuit,
        // mais elles n'ont rien à faire dans un index — et la liste doit suivre les pages ajoutées.
        disallow: [
          '/dashboard', '/devis', '/factures', '/abonnement', '/outils', '/onboarding', '/controle',
          '/messages', '/profil', '/parametres', '/plateforme',
          '/login', '/signup', '/reset-password', '/api/',
        ],
      },
    ],
    sitemap: 'https://prestiapp.fr/sitemap.xml',
    host: 'https://prestiapp.fr',
  }
}
