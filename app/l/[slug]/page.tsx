import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import LeadForm from './LeadForm'

type Service = { nom?: string; description?: string }
type Artisan = {
  nom: string | null; metier: string | null; slug: string | null; ville: string | null
  bio: string | null; services: Service[] | null; zone_intervention: string | null
  photo_url: string | null; logo_url: string | null; horaires: string | null; plateforme_active: boolean | null
}

async function getArtisan(slug: string): Promise<Artisan | null> {
  const { data } = await supabaseAdmin
    .from('artisans')
    .select('nom, metier, slug, ville, bio, services, zone_intervention, photo_url, logo_url, horaires, plateforme_active')
    .eq('slug', slug)
    .maybeSingle()
  return (data as Artisan) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArtisan(slug)
  if (!a) return { title: 'Lien introuvable', robots: { index: false } }
  return {
    title: `${a.nom}${a.metier ? ` — ${a.metier}` : ''}`,
    description: a.bio || `Contactez ${a.nom}${a.metier ? ` (${a.metier})` : ''} : réponse rapide, devis clair.`,
    robots: { index: false, follow: false },
  }
}

const initials = (n: string | null) => (n || 'A').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'A'

const ICON = {
  bolt: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>,
}

export default async function PlateformePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await getArtisan(slug)

  if (!a || a.plateforme_active === false) {
    return (
      <main className="plat">
        <div className="plat-wrap">
          <div className="plat-404"><b>Page introuvable</b><span>Ce lien de contact n&apos;existe pas ou n&apos;est plus actif.</span></div>
        </div>
      </main>
    )
  }

  const services = (Array.isArray(a.services) ? a.services : []).filter((s) => s && (s.nom || s.description))
  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: a.nom,
    ...(a.metier ? { description: a.bio || `${a.metier} — devis et contact rapide.` } : {}),
    ...(a.ville || a.zone_intervention ? { areaServed: a.zone_intervention || a.ville } : {}),
  }

  return (
    <main className="plat">
      {/* Échappe </script> dans les champs libres de l'artisan (anti-XSS stocké) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <div className="plat-wrap">

        {/* HERO */}
        <header className="plat-hero">
          <div className="plat-ava">
            {a.photo_url || a.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={(a.photo_url || a.logo_url) as string} alt={a.nom || ''} />
              : <span>{initials(a.nom)}</span>}
          </div>
          <h1>{a.nom}</h1>
          <p className="plat-sub">
            {a.metier}{(a.zone_intervention || a.ville) ? <> · <span className="plat-loc">{ICON.pin}{a.zone_intervention || a.ville}</span></> : null}
          </p>
          <div className="plat-badge">{ICON.bolt}<span>Répond en moins d&apos;une minute</span></div>
        </header>

        {a.bio ? (
          <section className="plat-card plat-bio"><p>{a.bio}</p></section>
        ) : null}

        {services.length > 0 ? (
          <section className="plat-block">
            <h2>Ce que je propose</h2>
            <div className="plat-services">
              {services.map((s, i) => (
                <div className="plat-serv" key={i}>
                  <span className="plat-serv-ic">{ICON.check}</span>
                  <div><b>{s.nom || 'Prestation'}</b>{s.description ? <span>{s.description}</span> : null}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {a.horaires ? (
          <section className="plat-card plat-hours"><span className="plat-hours-ic">{ICON.clock}</span><div><b>Disponibilités</b><span>{a.horaires}</span></div></section>
        ) : null}

        {/* CONTACT — le cœur de la plateforme */}
        <section className="plat-block" id="contact">
          <h2>Votre demande</h2>
          <p className="plat-lead">Décrivez votre besoin en quelques mots — vous recevez une réponse très vite.</p>
          <div className="plat-card plat-form">
            <LeadForm slug={a.slug as string} />
          </div>
        </section>

        <footer className="plat-foot">Propulsé par <b>Presti</b></footer>
      </div>
    </main>
  )
}
