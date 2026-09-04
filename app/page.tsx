import '@/app/globals.css'
import type { Metadata } from 'next'
import HeroApp from '@/app/HeroApp'
import Motion from '@/app/Motion'
import DemoSequence from '@/app/DemoSequence'
import DemoVideo from '@/app/DemoVideo'
import { FLAGS } from '@/lib/flags'
import Comparatif from '@/app/Comparatif'
import { OFFRES, pointsForts } from '@/lib/plans'

// Google Search Console : la balise de vérification n'est posée QUE sur la landing — jamais sur
// /site ni /p, qui vivent sur le domaine de l'artisan (marque blanche).
export const metadata: Metadata = process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}

/* Icônes SVG (Lucide-style) — jamais d'emoji comme icône. */
const I = {
  house: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M6 21V10l6-4 6 4v11" /><path d="M10 21v-6h4v6" /></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  badge: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 1.8 3 .2.2 3L19.4 9l-1.8 2.4 1.8 2.4-1.8 2.6-.2 3-3 .2L12 22l-2.4-1.8-3-.2-.2-3L4.6 14 6.4 12 4.6 9.6l1.8-2.6.2-3 3-.2z" /><path d="M9 12l2 2 4-4" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M21 12h-6a2 2 0 0 0 0 4h6v-4z" /></svg>,
  repeat: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>,
}

export default function Home() {
  return (
    <div className="lp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Presti',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://prestiapp.fr',
            description:
              "Presti répond à chaque demande de devis en moins d'une minute, dans votre ton, génère vos devis et factures, et relance automatiquement jusqu'à la réponse.",
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: 'Essai gratuit' },
            provider: { '@type': 'Organization', name: 'Presti', url: 'https://prestiapp.fr' },
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              { '@type': 'Organization', '@id': 'https://prestiapp.fr/#org', name: 'Presti', url: 'https://prestiapp.fr', logo: 'https://prestiapp.fr/icon.svg' },
              { '@type': 'WebSite', '@id': 'https://prestiapp.fr/#site', url: 'https://prestiapp.fr', name: 'Presti', inLanguage: 'fr-FR', publisher: { '@id': 'https://prestiapp.fr/#org' } },
            ],
          }),
        }}
      />

      <div className="lp-aurora" aria-hidden="true">
        <span className="lp-glow a parallax" data-speed="-14" />
        <span className="lp-glow b parallax" data-speed="10" />
      </div>
      <div className="lp-noise" aria-hidden="true" />
      <Motion />

      <header className="lp-head">
        <nav className="lp-nav">
          <a className="lp-brand" href="/"><i>{I.house}</i>Presti</a>
          <div className="lp-sp" />
          <div className="lp-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#tarifs">Tarifs</a>
            <a href="/faq">FAQ</a>
          </div>
          <a className="lp-btn lp-btn--g" href="/login">Se connecter</a>
          <a className="lp-btn lp-btn--p" href="/signup">Essayer gratuitement</a>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="lp-hero">
          <div className="container">
            <span className="lp-eyebrow"><b />Assistant IA pour les artisans du bâtiment</span>
            <h1>Le premier qui répond <span className="g">décroche le chantier.</span></h1>
            <p className="lp-lede">Presti répond à chaque demande de devis en moins d&apos;une minute — dans votre style —, chiffre le devis et relance tout seul jusqu&apos;à la signature. Vous restez sur le chantier, Presti tient le standard.</p>
            <div className="lp-cta">
              <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
              <a className="lp-btn lp-btn--g lp-btn--lg" href="#fonctionnalites">Voir ce que ça fait</a>
            </div>
            <p className="lp-trust">3 crédits offerts · sans carte bancaire</p>
          </div>
          <div className="container">
            <div className="lp-stage"><span className="lp-beam" aria-hidden="true" /><div className="lp-float"><HeroApp /></div></div>
          </div>
        </section>

        {/* RÉASSURANCE */}
        <section className="lp-blk" style={{ paddingTop: '1rem' }}>
          <div className="container">
            <div className="lp-reassure reveal-kids">
              <div className="lp-rc"><span className="i">{I.zap}</span><div><b>Rapide</b><em>Réponse en moins d&apos;une minute</em></div></div>
              <div className="lp-rc"><span className="i">{I.badge}</span><div><b>Fiable</b><em>Devis conformes, dans votre ton</em></div></div>
              <div className="lp-rc"><span className="i">{I.shield}</span><div><b>Sécurisé</b><em>Vos données isolées, chiffrées</em></div></div>
              <div className="lp-rc"><span className="i">{I.wallet}</span><div><b>Sans carte</b><em>Essai offert, résiliable</em></div></div>
            </div>
          </div>
        </section>

        {/* PROOF */}
        <section className="lp-blk lp-proof reveal">
          <div className="container">
            <div className="lp-bignum count" data-to="7" data-suffix="×">7×</div>
            <p>plus de chances d&apos;obtenir un vrai échange avec le client en répondant dans l&apos;heure plutôt qu&apos;en attendant. Presti, lui, répond en moins d&apos;une minute — jour et nuit.</p>
            <div className="src">Source : Harvard Business Review — « The Short Life of Online Sales Leads » (étude sur 2 241 entreprises)</div>
          </div>
        </section>

        {/* FONCTIONNALITÉS — vitrine interactive (clique → la démo se joue) */}
        <section className="lp-blk" id="fonctionnalites">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Une demande arrive</span><h2>Ce qui se passe, de 22 h 14 à 7 h 52.</h2><p>Un client écrit le soir. Le lendemain matin, le devis est prêt, il l&apos;accepte. Cinq scènes, prises sur le vrai produit.</p></div>
            {FLAGS.landingVideo ? <DemoVideo /> : <DemoSequence />}
          </div>
        </section>

        {/* TARIFS */}
        <section className="lp-blk" id="tarifs">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Abonnements</span><h2>Simple : vous payez à l&apos;usage, en crédits.</h2><p>Chaque formule vous donne des crédits chaque mois. Vous montez en formule quand votre activité grandit.</p></div>

            <div className="lp-howcredits reveal-kids">
              <div className="lp-hc"><span className="ic">{I.zap}</span><b>1 crédit = 1 génération</b><span>Une réponse envoyée à un client, ou un devis chiffré par l&apos;IA.</span></div>
              <div className="lp-hc"><span className="ic">{I.badge}</span><b>Modèle Expert = 3 crédits</b><span>L&apos;IA la plus puissante consomme plus — réservez-la aux gros chantiers.</span></div>
              <div className="lp-hc"><span className="ic">{I.repeat}</span><b>Rechargés chaque mois</b><span>Vos crédits se réinitialisent à chaque renouvellement. Non reportés au mois suivant.</span></div>
            </div>

            <div className="lp-trial reveal"><b>Essai gratuit</b><em>3 crédits offerts (3 réponses ou devis) sur vos vraies demandes — pour juger la qualité avant de payer. Sans carte.</em><a className="lp-btn lp-btn--g" href="/signup">Essayer</a></div>

            <div className="lp-plans reveal-kids">
              {OFFRES.map((o) => (
                <div key={o.id} className={`lp-plan${o.id === 'studio' ? ' lp-plan--feat' : ''}`}>
                  <div className="lp-pn">{o.label}</div>
                  <div className="lp-pp">{o.prix}€<small>par mois</small></div>
                  <div className="lp-credits"><b>{o.credits}</b>&nbsp;crédits / mois</div>
                  <div className="lp-tva">TVA non applicable, art. 293 B du CGI</div>
                  <div className="lp-for">{o.accroche}</div>
                  <ul className="lp-plist">{pointsForts(o.id).slice(0, 5).map((f) => <li key={f}>{f}</li>)}</ul>
                  <a className={`lp-btn ${o.id === 'studio' ? 'lp-btn--p' : 'lp-btn--g'}`} href="/signup">Choisir {o.label}</a>
                </div>
              ))}
            </div>
            {/* Le tableau « qui a quoi » — la même matrice que les verrous serveur (lib/plans.ts). */}
            <div className="reveal lp-cmp"><h3>Qui a quoi, ligne par ligne</h3><Comparatif /></div>
            <p className="lp-pnote">1 crédit = 1 génération · Expert = 3 crédits · crédits rechargés chaque mois (non reportés) · sans engagement</p>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-blk lp-final reveal">
          <div className="container">
            <h2>Le prochain client qui vous cherche,<br />ne le laissez pas filer.</h2>
            <p>Créez votre lien Presti en 2 minutes. La prochaine demande, c&apos;est Presti qui y répond — en moins d&apos;une minute.</p>
            <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="container lp-foot-in">
          <span className="lp-brand" style={{ fontSize: '1.05rem' }}><i>{I.house}</i>Presti</span>
          <div style={{ display: 'flex', gap: '1.3rem', flexWrap: 'wrap' }}>
            <a href="/faq">FAQ</a>
            <a href="/cgu">Conditions générales</a>
            <a href="/confidentialite">Confidentialité</a>
            <a href="/mentions-legales">Mentions légales</a>
          </div>
          <span>© 2026 Presti · Fait pour les artisans.</span>
        </div>
      </footer>
    </div>
  )
}
