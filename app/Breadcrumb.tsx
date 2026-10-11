import Link from 'next/link'

// Fil d'Ariane (checklist pré-lancement) : visuel + données structurées BreadcrumbList.
export default function Breadcrumb({ label, path }: { label: string; path: string }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://prestiapp.fr' },
      { '@type': 'ListItem', position: 2, name: label, item: `https://prestiapp.fr${path}` },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <nav aria-label="Fil d'Ariane" className="crumb">
        <Link href="/">Accueil</Link>
        <span aria-hidden="true">›</span>
        <span className="crumb-cur">{label}</span>
      </nav>
    </>
  )
}
