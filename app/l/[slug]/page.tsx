import { supabaseAdmin } from '@/lib/supabaseAdmin'
import LeadForm from './LeadForm'

export default async function PublicLeadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: artisan } = await supabaseAdmin
    .from('artisans')
    .select('nom, metier, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!artisan) {
    return (
      <main className="wrap">
        <div className="card">
          <div className="brand"><span className="dot" />Presti</div>
          <h1>Lien introuvable</h1>
          <p className="muted">Ce lien de contact n'existe pas ou n'est plus actif.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="wrap">
      <div className="card">
        <div className="brand"><span className="dot" />Presti</div>
        <h1>Contactez {artisan.nom}</h1>
        <p className="muted">{artisan.metier} · Décrivez votre besoin, {artisan.nom} vous répond très vite.</p>
        <LeadForm slug={artisan.slug as string} />
      </div>
    </main>
  )
}
