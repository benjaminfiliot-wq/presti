import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { SiteContenu } from '@/lib/ai'
import SiteMotion from './SiteMotion'
import LeadForm from '@/app/l/[slug]/LeadForm'

type Service = { nom?: string; description?: string }
type Realisation = { image?: string; titre?: string; specialite?: string }
type Reseaux = { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string; whatsapp?: string; site?: string; google?: string }
type Artisan = {
  nom: string | null; metier: string | null; slug: string | null; ville: string | null
  bio: string | null; services: Service[] | null; zone_intervention: string | null
  logo_url: string | null; photo_url: string | null; horaires: string | null
  accent: string | null; realisations: Realisation[] | null; reseaux: Reseaux | null
  tel_public: string | null; email_public: string | null
  site_active: boolean | null; site_tier: number | null; plateforme_active: boolean | null
  site_contenu: SiteContenu | null; site_contact_integre: boolean | null
}

async function getArtisan(slug: string): Promise<Artisan | null> {
  const { data } = await supabaseAdmin
    .from('artisans')
    .select('nom, metier, slug, ville, bio, services, zone_intervention, logo_url, photo_url, horaires, accent, realisations, reseaux, tel_public, email_public, site_active, site_tier, plateforme_active, site_contenu, site_contact_integre')
    .eq('slug', slug)
    .maybeSingle()
  return (data as Artisan) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArtisan(slug)
  if (!a) return { title: 'Site introuvable', robots: { index: false } }
  return {
    title: `${a.nom}${a.metier ? ` — ${a.metier}` : ''}`,
    description: a.site_contenu?.meta_description || a.bio || `${a.nom}${a.metier ? `, ${a.metier}` : ''}${a.zone_intervention ? ` à ${a.zone_intervention}` : ''}.`,
    robots: { index: false, follow: false },
  }
}

const initials = (n: string | null) => (n || 'A').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'A'

const IC = {
  arrow: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></svg>,
  insta: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg>,
  fb: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>,
}

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await getArtisan(slug)

  if (!a || a.site_active !== true) {
    return <main className="site"><div className="site-mid"><div className="site-404"><b>Site indisponible</b><span>Ce site n&apos;existe pas ou n&apos;est pas encore publié.</span></div></div></main>
  }

  const tier = [1, 2, 3].includes(Number(a.site_tier)) ? Number(a.site_tier) : 3
  const c = a.site_contenu || null // contenu rédigé par l'IA (sur-mesure), sinon données brutes
  const accent = /^#[0-9a-fA-F]{6}$/.test(a.accent || '') ? (a.accent as string) : '#D97757'
  const services = (Array.isArray(a.services) ? a.services : []).filter((s) => s && (s.nom || s.description))
  const realisations = (Array.isArray(a.realisations) ? a.realisations : []).filter((r) => r && r.image)
  const zone = a.zone_intervention || a.ville
  const brand = a.logo_url || a.photo_url
  const heroShot = realisations[0]?.image || a.photo_url
  const r = a.reseaux || {}
  const telDigits = (a.tel_public || '').replace(/[^0-9+]/g, '')
  const waDigits = (r.whatsapp || '').replace(/[^0-9+]/g, '')
  const channels: { href: string; label: string; icon: ReactNode }[] = [
    ...(telDigits ? [{ href: `tel:${telDigits}`, label: a.tel_public as string, icon: IC.phone }] : []),
    ...(a.email_public ? [{ href: `mailto:${a.email_public}`, label: a.email_public, icon: IC.mail }] : []),
    ...(waDigits ? [{ href: `https://wa.me/${waDigits.replace(/^\+/, '')}`, label: 'WhatsApp', icon: IC.phone }] : []),
    ...(r.instagram ? [{ href: r.instagram, label: 'Instagram', icon: IC.insta }] : []),
    ...(r.facebook ? [{ href: r.facebook, label: 'Facebook', icon: IC.fb }] : []),
    ...(r.google ? [{ href: r.google, label: 'Google', icon: IC.globe }] : []),
    ...(r.site ? [{ href: r.site, label: 'Site', icon: IC.globe }] : []),
  ]
  const ext = (h: string) => /^https?:/i.test(h)
  const contactHref = a.plateforme_active !== false ? `/l/${a.slug}` : (telDigits ? `tel:${telDigits}` : '#contact')
  // Connexion plateforme <-> site : le chat de contact est-il intégré directement dans le site ?
  const embedContact = a.site_contact_integre !== false && a.plateforme_active !== false && !!a.slug

  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: a.nom,
    ...(a.bio ? { description: a.bio } : {}),
    ...(zone ? { areaServed: zone } : {}),
    ...(a.tel_public ? { telephone: a.tel_public } : {}),
  }

  const showReal = realisations.length > 0 && tier >= 2
  const apropos = c?.apropos || a.bio
  const showAbout = !!apropos
  const showChannels = channels.length > 0
  // Mots-clés GÉANTS (inspiration sites cinématiques « FIND ») : d'abord ceux choisis par
  // l'IA (mots qui claquent, ancrés dans le geste), sinon repli sur prestations/spécialités.
  const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)))
  const aiWords = uniq(Array.isArray(c?.mots_cles) ? (c!.mots_cles as string[]) : [])
  const bigWords = (aiWords.length >= 2 ? aiWords : uniq([
    ...services.map((s) => s.nom || ''),
    ...realisations.map((rz) => rz.specialite || ''),
  ])).slice(0, 4)
  const manifesteTxt = c?.manifeste || c?.hero_accroche || (a.metier ? `${a.metier}, avec exigence.` : 'Un travail fait pour durer.')

  return (
    <main className={`site tier-${tier}`} style={{ ['--pc' as string]: accent }} data-tier={tier}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <SiteMotion />

      {/* NAV */}
      <header className="site-nav">
        <a className="site-brand" href="#top">
          <span className="site-mark">{brand
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={brand} alt="" /> : <b>{initials(a.nom)}</b>}</span>
          <span>{a.nom}</span>
        </a>
        <nav className="site-links">
          {showReal ? <a href="#realisations">Réalisations</a> : null}
          {services.length > 0 ? <a href="#services">Prestations</a> : null}
          {showAbout ? <a href="#apropos">À propos</a> : null}
          <a className="site-nav-cta" href={contactHref} {...(ext(contactHref) ? { target: '_blank', rel: 'noopener' } : {})}>Demander un devis</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="site-hero" id="top">
        {tier === 3 && heroShot ? (
          <div className="site-hero-media" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroShot} alt="" className="site-hero-img" />
            <span className="site-hero-veil" />
          </div>
        ) : null}
        <div className="site-hero-in">
          <span className="site-eyebrow site-reveal">{a.metier || 'Artisan'}{zone ? <> · {zone}</> : null}</span>
          <h1 className="site-reveal">{a.nom}</h1>
          {c?.hero_accroche ? <p className="site-tagline site-reveal">{c.hero_accroche}</p> : null}
          <p className="site-lede site-reveal">{c?.hero_lede || a.bio || `Un travail soigné, un devis clair, des délais tenus. Décrivez votre projet — on s'occupe du reste.`}</p>
          <div className="site-hero-cta site-reveal">
            <a className="site-btn p" href={contactHref} {...(ext(contactHref) ? { target: '_blank', rel: 'noopener' } : {})}>Demander un devis {IC.arrow}</a>
            {showReal ? <a className="site-btn g" href="#realisations">Voir mes réalisations</a> : null}
          </div>
          {(telDigits || zone) ? (
            <div className="site-hero-meta site-reveal">
              {telDigits ? <a href={`tel:${telDigits}`}>{IC.phone}{a.tel_public}</a> : null}
              {zone ? <span>{IC.pin}{zone}</span> : null}
              {a.horaires ? <span>{IC.clock}{a.horaires}</span> : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* CONFIANCE (tier 2+) */}
      {tier >= 2 ? (
        <section className="site-strip site-reveal">
          <div><b>Devis gratuit</b><span>Chiffrage clair, sans surprise</span></div>
          <div><b>Réponse rapide</b><span>On revient vers vous très vite</span></div>
          <div><b>Travail assuré</b><span>Sérieux engagé sur chaque chantier</span></div>
          {zone ? <div><b>Sur votre secteur</b><span>{zone}</span></div> : <div><b>Sur-mesure</b><span>Adapté à votre projet</span></div>}
        </section>
      ) : null}

      {/* MOTS GÉANTS (inspiration cinématique « FIND ») — les grands savoir-faire */}
      {tier === 3 && bigWords.length >= 2 ? (
        <section className="site-manifest" id="savoir-faire">
          <span className="site-kick site-reveal">Le savoir-faire</span>
          <div className="site-words">
            {bigWords.map((w, i) => (
              <a className="site-word site-reveal" href={showReal ? '#realisations' : '#contact'} key={i}>
                <span className="site-word-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="site-word-t">{w}</span>
                <svg className="site-word-a" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* BLOCS ÉDITORIAUX ALTERNÉS (inspiration « DRIP ») — chaque prestation en grand, avec photo */}
      {tier === 3 && services.length >= 2 && realisations.length >= 2 ? (
        <section className="site-features">
          {services.slice(0, Math.min(3, realisations.length)).map((s, i) => (
            <div className={`site-feature${i % 2 ? ' alt' : ''}`} key={i}>
              <div className="site-feature-media site-reveal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={realisations[i].image} alt={s.nom || ''} loading="lazy" />
              </div>
              <div className="site-feature-txt site-reveal">
                <span className="site-feature-n">0{i + 1}</span>
                <h3>{s.nom}</h3>
                {s.description ? <p>{s.description}</p> : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* MANIFESTE plein-cadre cinématique (image parallax + grande phrase) */}
      {tier === 3 && (realisations[1]?.image || heroShot) ? (
        <section className="site-manifesto">
          <div className="site-manifesto-media" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={realisations[1]?.image || heroShot || ''} alt="" className="site-manifesto-img" />
            <span className="site-manifesto-veil" />
          </div>
          <p className="site-manifesto-t site-reveal">{manifesteTxt}</p>
        </section>
      ) : null}

      {/* RÉALISATIONS (tier 2+) */}
      {showReal ? (
        <section className="site-block" id="realisations">
          <div className="site-head site-reveal"><span className="site-kick">Réalisations</span><h2>Le travail parle de lui-même</h2>{c?.realisations_intro ? <p className="site-sub">{c.realisations_intro}</p> : null}</div>
          <div className={`site-gallery${tier === 3 ? ' cine' : ''}`}>
            {realisations.map((rz, i) => (
              <figure className={`site-shot site-reveal${tier === 3 && i % 5 === 0 ? ' wide' : ''}`} key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rz.image} alt={rz.titre || 'Réalisation'} loading="lazy" />
                {(rz.titre || rz.specialite) ? (
                  <figcaption>{rz.specialite ? <span className="site-shot-tag">{rz.specialite}</span> : null}{rz.titre ? <b>{rz.titre}</b> : null}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* PRESTATIONS */}
      {services.length > 0 ? (
        <section className="site-block" id="services">
          <div className="site-head site-reveal"><span className="site-kick">Prestations</span><h2>Ce que je réalise</h2>{c?.prestations_intro ? <p className="site-sub">{c.prestations_intro}</p> : null}</div>
          <div className="site-services">
            {services.map((s, i) => (
              <div className="site-serv site-reveal" key={i}>
                <span className="site-serv-n">{String(i + 1).padStart(2, '0')}</span>
                <div><b>{s.nom || 'Prestation'}</b>{s.description ? <p>{s.description}</p> : null}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* À PROPOS */}
      {showAbout ? (
        <section className="site-block site-about" id="apropos">
          <div className="site-about-in site-reveal">
            <span className="site-kick">À propos</span>
            <p>{apropos}</p>
            {(zone || a.horaires) ? (
              <div className="site-about-meta">
                {zone ? <span>{IC.pin}{zone}</span> : null}
                {a.horaires ? <span>{IC.clock}{a.horaires}</span> : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* CONTACT */}
      <section className="site-cta-block site-reveal" id="contact">
        <h2>{c?.cta_titre || 'Parlons de votre projet'}</h2>
        <p>{c?.cta_texte || 'Décrivez votre besoin — vous recevez une réponse rapide et un devis clair.'}</p>
        {embedContact ? (
          <div className="plat-embed site-embed" style={{ ['--pc' as string]: accent }}>
            <div className="plat-form"><LeadForm slug={a.slug as string} artisanNom={a.nom} avatar={brand} /></div>
          </div>
        ) : (
          <a className="site-btn p lg" href={contactHref} {...(ext(contactHref) ? { target: '_blank', rel: 'noopener' } : {})}>Demander un devis {IC.arrow}</a>
        )}
        {showChannels ? (
          <div className="site-channels">
            {channels.map((c, i) => (
              <a className="site-chan" key={i} href={c.href} {...(ext(c.href) ? { target: '_blank', rel: 'noopener' } : {})}><span>{c.icon}</span>{c.label}</a>
            ))}
          </div>
        ) : null}
      </section>

      <footer className="site-foot">
        <span className="site-foot-b">{a.nom}</span>
        <span>{a.metier}{zone ? ` · ${zone}` : ''}</span>
      </footer>
    </main>
  )
}
