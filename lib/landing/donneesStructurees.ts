// lib/landing/donneesStructurees.ts — les données structurées JSON-LD de la landing v2 (SEO, AEO, GEO).
// - SoftwareApplication : les offres et leurs prix LUS dans lib/plans.ts (OFFRES), jamais écrits à la main ; aucune note, aucun avis.
// - Organization + WebSite : l'éditeur, son logo, la langue.
// - FAQPage : la FAQ VISIBLE de la section 7, mot pour mot (Google refuse un balisage qui décrit ce que la page ne montre pas).
import { OFFRES } from '@/lib/plans'
import { FAQ_ACCUEIL, SEO, STUDIO, SIGNATURE } from './contenu'

const URL_SITE = 'https://prestiapp.fr'

// La description de chaque offre suit la règle du 25/10 (Studio prépare, Signature envoie seul), sans reprendre l'accroche de la grille.
const DESCRIPTION_OFFRE: Record<string, string> = {
  studio: `${STUDIO} : Presti prépare les réponses, les devis, les relances et les factures ; l’artisan valide d’un clic.`,
  signature: `${SIGNATURE} : les réponses et les relances partent seules, si l’artisan le choisit, avec le CRM et le pilote automatique.`,
}

export function donneesStructurees(): object[] {
  const org = { '@type': 'Organization', '@id': `${URL_SITE}/#org`, name: 'Presti', url: URL_SITE, logo: { '@type': 'ImageObject', url: `${URL_SITE}/marque/presti-icone-512.png`, width: 512, height: 512 } }
  return [
    {
      '@context': 'https://schema.org',
      '@graph': [
        org,
        { '@type': 'WebSite', '@id': `${URL_SITE}/#site`, url: URL_SITE, name: 'Presti', inLanguage: 'fr-FR', publisher: { '@id': `${URL_SITE}/#org` } },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Presti',
      url: URL_SITE,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'fr-FR',
      description: SEO.description,
      audience: { '@type': 'BusinessAudience', audienceType: 'Artisans du bâtiment, TPE du bâtiment, architectes' },
      publisher: { '@id': `${URL_SITE}/#org` },
      offers: OFFRES.map((o) => ({
        '@type': 'Offer',
        name: o.label,
        description: DESCRIPTION_OFFRE[o.id] ?? o.label,
        price: String(o.prix),
        priceCurrency: 'EUR',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: String(o.prix), priceCurrency: 'EUR', unitText: 'MONTH' },
        url: `${URL_SITE}/offres#${o.id}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ACCUEIL.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.reponse } })),
    },
  ]
}

/** Sérialisation sûre pour une balise <script> : aucun « < », « > » ni « & » brut. */
export const jsonLdSur = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
