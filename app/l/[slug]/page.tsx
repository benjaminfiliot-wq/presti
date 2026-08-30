import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import LeadForm from './LeadForm'

async function getArtisan(slug: string) {
  const { data } = await supabaseAdmin
    .from('artisans')
    .select('nom, metier, slug, ville')
    .eq('slug', slug)
    .maybeSingle()
  return data
}

// Titre unique par page (checklist pré-lancement) + pas d'indexation des pages de contact.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArtisan(slug)
  if (!a) return { title: 'Lien introuvable', robots: { index: false } }
  return {
    title: `Contactez ${a.nom}${a.metier ? ` — ${a.metier}` : ''}`,
    description: `Décrivez votre besoin à ${a.nom}${a.metier ? ` (${a.metier})` : ''} : réponse rapide via Presti.`,
    robots: { index: false, follow: false }, // pages de contact privées, hors index
  }
}

export default async function PublicLeadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artisan = await getArtisan(slug)

  if (!artisan) {
    return (
      <main className="wrap">
        <div className="card">
          <div className="brand"><span className="dot" />Presti</div>
          <h1>Lien introuvable</h1>
          <p className="muted">Ce lien de contact n&apos;existe pas ou n&apos;est plus actif.</p>
        </div>
      </main>
    )
  }

  // Schéma local (LocalBusiness) — l'artisan est une entreprise locale : aide au référencement.
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: artisan.nom,
    ...(artisan.metier ? { description: `${artisan.metier} — devis et contact rapide.` } : {}),
    ...(artisan.ville ? { areaServed: artisan.ville, address: { '@type': 'PostalAddress', addressLocality: artisan.ville } } : {}),
  }

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="card">
        <div className="brand"><span className="dot" />Presti</div>
        <h1>Contactez {artisan.nom}</h1>
        <p className="muted">{artisan.metier} · Décrivez votre besoin, {artisan.nom} vous répond très vite.</p>
        <LeadForm slug={artisan.slug as string} />
      </div>
    </main>
  )
}
