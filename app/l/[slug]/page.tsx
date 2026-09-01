import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import LeadForm from './LeadForm'
import PlatMotion from './PlatMotion'

type Service = { nom?: string; description?: string }
type Realisation = { image?: string; titre?: string; specialite?: string }
type Reseaux = { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string; whatsapp?: string; site?: string; google?: string }
type Artisan = {
  nom: string | null; metier: string | null; slug: string | null; ville: string | null
  bio: string | null; services: Service[] | null; zone_intervention: string | null
  photo_url: string | null; logo_url: string | null; horaires: string | null; plateforme_active: boolean | null
  accent: string | null; realisations: Realisation[] | null; reseaux: Reseaux | null
  tel_public: string | null; email_public: string | null; theme: string | null
}

async function getArtisan(slug: string): Promise<Artisan | null> {
  const { data } = await supabaseAdmin
    .from('artisans')
    .select('nom, metier, slug, ville, bio, services, zone_intervention, photo_url, logo_url, horaires, plateforme_active, accent, realisations, reseaux, tel_public, email_public, theme')
    .eq('slug', slug)
    .maybeSingle()
  return (data as Artisan) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArtisan(slug)
  if (!a) return { title: { absolute: 'Page introuvable' }, robots: { index: false } }
  const t = `${a.nom}${a.metier ? ` — ${a.metier}` : ''}`
  const d = a.bio || `${a.nom}${a.metier ? `, ${a.metier}` : ''}${a.zone_intervention ? ` à ${a.zone_intervention}` : ''}. Devis clair, réponse rapide.`
  return {
    // Titre + OG ABSOLUS : aucune mention « Presti » (plateforme white-label, marque de l'artisan seule).
    title: { absolute: t },
    description: d,
    applicationName: a.nom || undefined,
    authors: a.nom ? [{ name: a.nom }] : undefined,
    robots: { index: false, follow: false },
    openGraph: { title: t, description: d, type: 'website', ...(a.nom ? { siteName: a.nom } : {}) },
    twitter: { card: 'summary_large_image', title: t, description: d },
  }
}

const initials = (n: string | null) => (n || 'A').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'A'

const I = {
  bolt: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></svg>,
  insta: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg>,
  fb: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>,
  tiktok: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>,
  linkedin: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3" /><path d="M7 10v7M7 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 17v-7" /></svg>,
  wa: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.2-5.6A8.4 8.4 0 1 1 21 11.5z" /><path d="M8.5 8.8c.2-.6.6-.6.9-.6h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3 0 .6a5 5 0 0 0 2.4 2.1c.3.1.4 0 .6-.1l.5-.6c.2-.2.3-.2.5-.1l1.5.8c.2.1.3.2.3.4a1.6 1.6 0 0 1-1 1.4 3 3 0 0 1-2-.1 8.3 8.3 0 0 1-4.4-4c-.3-.6-.6-1.4-.6-2.2 0-.6.2-1 .5-1.2z" fill="currentColor" stroke="none" /></svg>,
}

const REASSURE = [
  { ic: I.bolt, t: 'Réponse en minutes', d: 'Une question, un besoin — vous avez un retour très vite, jour et nuit.' },
  { ic: I.doc, t: 'Devis clair', d: 'Un chiffrage détaillé, sans surprise, que vous validez avant tout travaux.' },
  { ic: I.shield, t: 'Travail assuré', d: 'Un professionnel qui engage son sérieux sur chaque intervention.' },
  { ic: I.chat, t: 'Contact direct', d: 'Vous échangez directement, sans intermédiaire ni standard interminable.' },
]

export default async function PlateformePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await getArtisan(slug)

  if (!a || a.plateforme_active === false) {
    return (
      <main className="plat"><div className="plat-mid"><div className="plat-404"><b>Page introuvable</b><span>Ce lien de contact n&apos;existe pas ou n&apos;est plus actif.</span></div></div></main>
    )
  }

  const services = (Array.isArray(a.services) ? a.services : []).filter((s) => s && (s.nom || s.description))
  const realisations = (Array.isArray(a.realisations) ? a.realisations : []).filter((r) => r && r.image)
  const zone = a.zone_intervention || a.ville
  const avatar = a.photo_url || a.logo_url
  // Canaux de contact affichés (l'artisan choisit). tel/whatsapp cliquables.
  const r = a.reseaux || {}
  const telDigits = (a.tel_public || '').replace(/[^0-9+]/g, '')
  const waDigits = (r.whatsapp || '').replace(/[^0-9+]/g, '')
  const channels: { href: string; label: string; icon: ReactNode }[] = [
    ...(telDigits ? [{ href: `tel:${telDigits}`, label: a.tel_public as string, icon: I.phone }] : []),
    ...(a.email_public ? [{ href: `mailto:${a.email_public}`, label: a.email_public, icon: I.mail }] : []),
    ...(waDigits ? [{ href: `https://wa.me/${waDigits.replace(/^\+/, '')}`, label: 'WhatsApp', icon: I.wa }] : []),
    ...(r.instagram ? [{ href: r.instagram, label: 'Instagram', icon: I.insta }] : []),
    ...(r.facebook ? [{ href: r.facebook, label: 'Facebook', icon: I.fb }] : []),
    ...(r.tiktok ? [{ href: r.tiktok, label: 'TikTok', icon: I.tiktok }] : []),
    ...(r.linkedin ? [{ href: r.linkedin, label: 'LinkedIn', icon: I.linkedin }] : []),
    ...(r.google ? [{ href: r.google, label: 'Google', icon: I.globe }] : []),
    ...(r.site ? [{ href: r.site, label: 'Site web', icon: I.globe }] : []),
  ]
  const ext = (h: string) => /^https?:/i.test(h)
  // Accent personnalisable (validé : hex 6 chiffres, sinon corail par défaut)
  const accent = /^#[0-9a-fA-F]{6}$/.test(a.accent || '') ? (a.accent as string) : '#D97757'
  const theme = ['atelier', 'nuit', 'epure'].includes(a.theme || '') ? (a.theme as string) : 'atelier'
  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: a.nom,
    ...(a.metier ? { description: a.bio || `${a.metier} — devis et contact rapide.` } : {}),
    ...(zone ? { areaServed: zone } : {}),
  }

  return (
    <main className="plat" style={{ ['--pc' as string]: accent }} data-theme={theme}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <PlatMotion />
      <div className="plat-aurora" aria-hidden="true"><span className="plat-glow a" /><span className="plat-glow b" /></div>
      <div className="plat-grid" aria-hidden="true" />

      {/* Header white-label (marque de l'artisan) */}
      <header className="plat-nav">
        <div className="plat-brand">
          <span className="plat-mark">{avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatar} alt="" /> : <b>{initials(a.nom)}</b>}</span>
          <span className="plat-brand-t">{a.nom}</span>
        </div>
        <a className="plat-nav-cta" href="#contact">Demander un devis</a>
      </header>

      {/* HERO */}
      <section className="plat-hero">
        <span className="plat-eyebrow plat-reveal"><b />{a.metier || 'Artisan'}{zone ? <> · <span className="plat-loc">{I.pin}{zone}</span></> : null}</span>
        <h1 className="plat-reveal">{a.nom}</h1>
        {a.bio ? <p className="plat-pitch plat-reveal">{a.bio}</p> : <p className="plat-pitch plat-reveal">Un problème, un projet chez vous&nbsp;? Décrivez-le en quelques mots — vous avez une réponse en moins d&apos;une minute.</p>}
        <div className="plat-cta plat-reveal">
          <a className="plat-btn plat-btn--p" href="#contact">Décrire mon besoin {I.arrow}</a>
          {services.length > 0 ? <a className="plat-btn plat-btn--g" href="#prestations">Voir mes prestations</a> : null}
        </div>
        <div className="plat-live plat-reveal"><span className="plat-live-dot" />Répond en moins d&apos;une minute</div>
      </section>

      {/* CONFIANCE */}
      <section className="plat-block plat-reveal">
        <div className="plat-reassure">
          {REASSURE.map((r, i) => (
            <div className="plat-rc" key={i}><span className="plat-rc-ic">{r.ic}</span><b>{r.t}</b><span>{r.d}</span></div>
          ))}
        </div>
      </section>

      {/* PRESTATIONS */}
      {services.length > 0 ? (
        <section className="plat-block" id="prestations">
          <div className="plat-head plat-reveal"><span className="plat-kick">Prestations</span><h2>Ce que je réalise</h2></div>
          <div className="plat-services">
            {services.map((s, i) => (
              <div className="plat-serv plat-reveal" key={i}>
                <span className="plat-serv-ic">{I.check}</span>
                <div><b>{s.nom || 'Prestation'}</b>{s.description ? <span>{s.description}</span> : null}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* RÉALISATIONS (portfolio par image) */}
      {realisations.length > 0 ? (
        <section className="plat-block" id="realisations">
          <div className="plat-head plat-reveal"><span className="plat-kick">Réalisations</span><h2>Mon travail en images</h2></div>
          <div className="plat-gallery">
            {realisations.map((rz, i) => (
              <figure className="plat-shot plat-reveal" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rz.image} alt={rz.titre || 'Réalisation'} loading="lazy" />
                {(rz.titre || rz.specialite) ? (
                  <figcaption>{rz.specialite ? <span className="plat-shot-tag">{rz.specialite}</span> : null}{rz.titre ? <b>{rz.titre}</b> : null}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* SAVOIR-FAIRE + ZONE */}
      {(a.bio || zone || a.horaires) ? (
        <section className="plat-block">
          <div className="plat-two">
            {a.bio ? (
              <div className="plat-card plat-about plat-reveal">
                <span className="plat-kick">Le savoir-faire</span>
                <p>{a.bio}</p>
              </div>
            ) : null}
            <div className="plat-side">
              {zone ? <div className="plat-card plat-info plat-reveal"><span className="plat-info-ic">{I.pin}</span><div><b>Zone d&apos;intervention</b><span>{zone}</span></div></div> : null}
              {a.horaires ? <div className="plat-card plat-info plat-reveal"><span className="plat-info-ic">{I.clock}</span><div><b>Disponibilités</b><span>{a.horaires}</span></div></div> : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* CONTACT */}
      <section className="plat-block plat-contact" id="contact">
        <div className="plat-head c plat-reveal"><span className="plat-kick">Contact</span><h2>Parlons de votre projet</h2><p>Décrivez votre besoin — vous recevez une réponse en moins d&apos;une minute.</p></div>
        {channels.length > 0 ? (
          <div className="plat-channels plat-reveal">
            {channels.map((c, i) => (
              <a className="plat-chan" key={i} href={c.href} {...(ext(c.href) ? { target: '_blank', rel: 'noopener' } : {})}>
                <span className="plat-chan-ic">{c.icon}</span><span>{c.label}</span>
              </a>
            ))}
          </div>
        ) : null}
        <div className="plat-card plat-form plat-reveal">
          <LeadForm slug={a.slug as string} artisanNom={a.nom} avatar={avatar} />
        </div>
      </section>

      <footer className="plat-foot">
        <div className="plat-foot-id"><b>{a.nom}</b>{a.metier ? <span>{a.metier}</span> : null}{zone ? <span>{I.pin}{zone}</span> : null}</div>
        {channels.length > 0 ? (
          <div className="plat-foot-soc">
            {channels.map((c, i) => (
              <a className="plat-soc" key={i} href={c.href} aria-label={c.label} title={c.label} {...(ext(c.href) ? { target: '_blank', rel: 'noopener' } : {})}>{c.icon}</a>
            ))}
          </div>
        ) : null}
      </footer>
    </main>
  )
}
