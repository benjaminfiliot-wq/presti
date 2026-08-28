import type { MetadataRoute } from 'next'

// Google : autorise l'indexation des pages publiques, bloque l'espace privé (app) et l'API.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/devis', '/factures', '/abonnement', '/outils', '/onboarding', '/controle', '/login', '/signup', '/api/'],
      },
    ],
    sitemap: 'https://prestiapp.fr/sitemap.xml',
    host: 'https://prestiapp.fr',
  }
}
