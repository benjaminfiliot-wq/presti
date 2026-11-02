import Link from 'next/link'

// Fil d'Ariane (checklist pré-lancement) : visuel + données structurées BreadcrumbList.
// `parents` (27/10) : les niveaux intermédiaires, pour les pages à trois niveaux (« Modèles de devis › Plombier »).
export default function Breadcrumb({ label, path, parents = [] }: { label: string; path: string; parents?: { label: string; path: string }[] }) {
  const niveaux = [{ label: 'Accueil', path: '' }, ...parents, { label, path }]
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: niveaux.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n.label, item: `https://prestiapp.fr${n.path}` })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <nav aria-label="Fil d'Ariane" className="crumb">
        <Link href="/">Accueil</Link>
        {parents.map((p) => (
          <span key={p.path} style={{ display: 'contents' }}><span aria-hidden="true">›</span><Link href={p.path}>{p.label}</Link></span>
        ))}
        <span aria-hidden="true">›</span>
        <span className="crumb-cur">{label}</span>
      </nav>
    </>
  )
}
