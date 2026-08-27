import HeroApp from '@/app/HeroApp'
import Motion from '@/app/Motion'
import ScrollScene from '@/app/ScrollScene'

/* Icônes SVG (Lucide-style) — jamais d'emoji comme icône. */
const I = {
  house: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M6 21V10l6-4 6 4v11" /><path d="M10 21v-6h4v6" /></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  badge: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 1.8 3 .2.2 3L19.4 9l-1.8 2.4 1.8 2.4-1.8 2.6-.2 3-3 .2L12 22l-2.4-1.8-3-.2-.2-3L4.6 14 6.4 12 4.6 9.6l1.8-2.6.2-3 3-.2z" /><path d="M9 12l2 2 4-4" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M21 12h-6a2 2 0 0 0 0 4h6v-4z" /></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>,
  file: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h4" /></svg>,
  card: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  repeat: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
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
          <a className="lp-btn lp-btn--p" href="/signup">Commencer</a>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="lp-hero">
          <div className="container">
            <span className="lp-eyebrow"><b />Pour les artisans du bâtiment</span>
            <h1>Le premier qui répond <span className="g">décroche le chantier.</span></h1>
            <p className="lp-lede">Presti répond à chaque demande de devis en moins d&apos;une minute — dans votre style —, chiffre le devis et relance tout seul jusqu&apos;à la signature. Vous restez sur le chantier, Presti tient le standard.</p>
            <div className="lp-cta">
              <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
              <a className="lp-btn lp-btn--g lp-btn--lg" href="#fonctionnalites">Voir ce que ça fait</a>
            </div>
            <p className="lp-trust">1 à 3 essais offerts · sans carte bancaire</p>
          </div>
          <div className="container">
            <div className="lp-stage"><span className="lp-beam" aria-hidden="true" /><div className="lp-float"><HeroApp /></div></div>
          </div>
        </section>

        {/* RÉASSURANCE */}
        <section className="lp-blk reveal" style={{ paddingTop: '1rem' }}>
          <div className="container">
            <div className="lp-reassure">
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
            <p>plus de chances de signer le client si vous répondez dans l&apos;heure. Presti, lui, répond en moins d&apos;une minute — jour et nuit.</p>
            <div className="src">Source : Harvard Business Review</div>
          </div>
        </section>

        <div id="fonctionnalites" />

        {/* SCÈNE 1 — DEVIS (scroll-scrub épinglé) */}
        <ScrollScene className="lp-scene" height="400vh">
          <div className="lp-sticky" data-stage="">
            <span className="lp-beam2" aria-hidden="true" />
            <span className="lp-floor" aria-hidden="true" />
            <div className="lp-shead" data-anim="" data-p="0,0.06">
              <span className="k"><span className="fi">{I.file}</span>Devis chiffrés</span>
              <h3>Un devis qui se chiffre tout seul.</h3>
            </div>
            <div className="lp-spec s1" data-anim="" data-p="0.30,0.42"><div className="lab">Chiffrage</div><div className="big">30<span style={{ fontSize: '.42em' }}> s</span></div></div>
            <div className="lp-spec s2" data-anim="" data-p="0.36,0.48"><div className="lab">TVA auto</div><div className="big">10<span style={{ fontSize: '.42em' }}> %</span></div></div>
            <div className="lp-spec s3" data-anim="" data-p="0.58,0.70"><div className="lab">Total TTC</div><div className="big" data-count="873.40" data-p="0.46,0.72" data-dec="2" data-suffix=" €">0 €</div></div>
            <div className="lp-spec s4" data-anim="" data-p="0.72,0.84"><div className="lab">Conforme</div><div className="big">PDF</div></div>
            <div data-tilt="16" style={{ transformStyle: 'preserve-3d' }}>
              <div className="lp-doc">
                <div className="lp-doc-h">
                  <div className="co">Dupont Plomberie<small>17230 Marans · SIRET en cours</small></div>
                  <div className="ti"><b>DEVIS</b><small>DEV-2026-0042</small></div>
                </div>
                <div className="lp-doc-cli">Client<br /><b>Marie Lefèvre — Rénovation salle d&apos;eau</b></div>
                <div style={{ marginTop: '.8rem' }}>
                  <div className="lp-dl" data-anim="" data-p="0.16,0.24"><span>Dépose + pose chauffe-eau 200 L</span><span className="p">620,00 €</span></div>
                  <div className="lp-dl" data-anim="" data-p="0.22,0.30"><span>Groupe de sécurité + raccords</span><span className="p">84,00 €</span></div>
                  <div className="lp-dl" data-anim="" data-p="0.28,0.36"><span>Main-d&apos;œuvre (2 h)</span><span className="p">90,00 €</span></div>
                </div>
                <div className="lp-doc-tot"><span>Total TTC</span><span className="p" data-count="873.40" data-p="0.46,0.72" data-dec="2" data-suffix=" €">0 €</span></div>
                <div className="lp-doc-badges">
                  <span className="lp-bdg ok" data-anim="" data-p="0.72,0.80">✓ PDF conforme</span>
                  <span className="lp-bdg" data-anim="" data-p="0.76,0.84">Mentions légales</span>
                  <span className="lp-bdg" data-anim="" data-p="0.80,0.88">Prêt à envoyer</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollScene>

        {/* SCÈNE 2 — RELANCES (scroll-scrub épinglé) */}
        <ScrollScene className="lp-scene" height="360vh">
          <div className="lp-sticky" data-stage="">
            <span className="lp-beam2" aria-hidden="true" />
            <div className="lp-shead" data-anim="" data-p="0,0.06">
              <span className="k"><span className="fi">{I.repeat}</span>Relances automatiques</span>
              <h3>Presti relance à votre place, jusqu&apos;à la réponse.</h3>
            </div>
            <div className="lp-spec s1" data-anim="" data-p="0.42,0.54"><div className="lab">Cadence</div><div className="big">J+2·5·10</div></div>
            <div className="lp-spec s3" data-anim="" data-p="0.62,0.74"><div className="lab">Devis signés après relance</div><div className="big">80<span style={{ fontSize: '.42em' }}> %</span></div></div>
            <div className="lp-relwrap">
              <div className="lp-relmsg" data-anim="" data-p="0.10,0.20"><div className="rt">Jour 0 · réponse envoyée</div><p>« Bonjour Marie, je vous rappelle dans la journée pour convenir d&apos;un passage. »</p></div>
              <div className="lp-relmsg" data-anim="" data-p="0.26,0.38"><div className="rt">Relance J+2</div><p>« Toujours intéressée ? Je peux tenir un créneau cette semaine. »</p></div>
              <div className="lp-relmsg" data-anim="" data-p="0.44,0.56"><div className="rt">Relance J+5</div><p>« Je vous renvoie le devis, valable encore 20 jours. »</p></div>
              <div className="lp-relmsg win" data-anim="" data-p="0.62,0.74"><div className="rt">✓ Client répond — relances stoppées</div><p>« C&apos;est bon pour moi, on démarre quand ? »</p></div>
            </div>
          </div>
        </ScrollScene>

        {/* SCÈNE 3 — DASHBOARD (scroll-scrub épinglé) */}
        <ScrollScene className="lp-scene" height="340vh">
          <div className="lp-sticky" data-stage="">
            <span className="lp-beam2" aria-hidden="true" />
            <div className="lp-shead" data-anim="" data-p="0,0.06">
              <span className="k"><span className="fi">{I.grid}</span>Tableau de bord</span>
              <h3>Toutes vos demandes, au même endroit.</h3>
            </div>
            <div className="lp-spec s2" data-anim="" data-p="0.5,0.62"><div className="lab">Demandes ce mois</div><div className="big" data-count="12" data-p="0.4,0.64" data-dec="0">0</div></div>
            <div className="lp-spec s4" data-anim="" data-p="0.6,0.72"><div className="lab">Rien ne se perd</div><div className="big">0 oubli</div></div>
            <div className="lp-dashwin">
              <div className="dh">Vos demandes</div>
              <div className="lp-drowd" data-anim="" data-p="0.12,0.22"><div><div className="who">Marie Lefèvre</div><div className="m">Fuite sous l&apos;évier…</div></div><span className="lp-pill new">Nouveau</span></div>
              <div className="lp-drowd" data-anim="" data-p="0.26,0.36"><div><div className="who">Karim B.</div><div className="m">Électricité T2…</div></div><span className="lp-pill ok">Répondu</span></div>
              <div className="lp-drowd" data-anim="" data-p="0.40,0.50"><div><div className="who">Sophie D.</div><div className="m">Rénovation salle de bain…</div></div><span className="lp-pill ok">Gagné</span></div>
              <div className="lp-drowd" style={{ borderBottom: 'none' }} data-anim="" data-p="0.54,0.64"><div><div className="who">Entreprise TP</div><div className="m">Devis carrelage…</div></div><span className="lp-pill wait">En attente</span></div>
            </div>
          </div>
        </ScrollScene>

        {/* LIEN + PAIEMENT (compacts, révélés) */}
        <section className="lp-blk">
          <div className="container">
            <div className="lp-mini reveal">
              <div>
                <span className="lp-feattag"><span className="fi">{I.link}</span>Votre lien de contact</span>
                <h3 style={{ fontSize: 'clamp(1.4rem,2.6vw,2rem)', margin: '.6rem 0 0', fontWeight: 700 }}>Un lien à vous. Chaque demande atterrit dans Presti.</h3>
                <p style={{ color: 'var(--muted)', margin: '1rem 0 0', maxWidth: '42ch' }}>Collez-le sur Le Bon Coin, Google, votre signature mail. Le client remplit un formulaire simple, la demande arrive instantanément — plus rien ne se perd.</p>
              </div>
              <div className="lp-media"><div className="lp-card">
                <div className="lp-lbl">prestiapp.fr / votre-nom</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                  <input readOnly value="Marie Lefèvre" style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '.65rem .8rem', color: 'var(--ink)', fontSize: '.86rem' }} />
                  <textarea readOnly rows={2} value="Fuite sous l'évier, vous passez cette semaine ?" style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '.65rem .8rem', color: 'var(--ink)', fontSize: '.86rem', resize: 'none', fontFamily: 'inherit' }} />
                  <span className="lp-btn lp-btn--p" style={{ justifyContent: 'center' }}>Envoyer ma demande</span>
                </div>
              </div></div>
            </div>

            <div className="lp-mini rev reveal" style={{ marginTop: '4rem' }}>
              <div>
                <span className="lp-feattag"><span className="fi">{I.card}</span>Paiement en ligne</span>
                <h3 style={{ fontSize: 'clamp(1.4rem,2.6vw,2rem)', margin: '.6rem 0 0', fontWeight: 700 }}>Le client règle le devis en un lien sécurisé.</h3>
                <p style={{ color: 'var(--muted)', margin: '1rem 0 0', maxWidth: '42ch' }}>Chaque devis peut être payé en ligne, par carte, via un lien sécurisé (Stripe). Fini les chèques oubliés — l&apos;acompte tombe, le chantier démarre.</p>
              </div>
              <div className="lp-media"><div className="lp-card">
                <div className="lp-lbl">Paiement sécurisé</div>
                <div className="lp-dtot" style={{ marginTop: 0 }}><span>À régler</span><span className="p">873,40 €</span></div>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', margin: '1rem 0', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '.65rem .8rem' }}>
                  <span style={{ color: 'var(--co2)' }}>{I.card}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: 'var(--ink2)' }}>4242 4242 4242 4242</span>
                </div>
                <span className="lp-btn lp-btn--p" style={{ justifyContent: 'center', width: '100%' }}>Payer 873,40 €</span>
                <span className="lp-dbadge"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>Chiffré · propulsé par Stripe</span>
              </div></div>
            </div>
          </div>
        </section>

        {/* TARIFS */}
        <section className="lp-blk" id="tarifs">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Abonnements</span><h2>Choisissez jusqu&apos;où Presti travaille pour vous.</h2><p>Chaque réponse ou devis généré par l&apos;IA consomme <strong style={{ color: 'var(--ink)' }}>1 crédit</strong>. Vous montez en formule quand votre activité grandit.</p></div>

            <div className="lp-trial reveal"><b>Essai gratuit</b><em>1 à 3 réponses IA offertes sur vos vraies demandes — pour juger la qualité avant de payer. Sans carte.</em><a className="lp-btn lp-btn--g" href="/signup">Essayer</a></div>

            <div className="lp-plans reveal">
              <div className="lp-plan">
                <div className="lp-pn">Essentiel</div>
                <div className="lp-pp">29€<small>par mois</small></div>
                <div className="lp-for">Pour l&apos;artisan solo qui ne veut plus louper une demande.</div>
                <p className="lp-psub">L&apos;essentiel pour répondre vite et bien : chaque demande reçoit une réponse pro dans votre ton, vous générez devis et factures en quelques mots, et Presti relance tout seul.</p>
                <ul className="lp-plist"><li>Réponse instantanée dans votre ton</li><li>Génération de devis IA (crédits inclus)</li><li>Relances automatiques J+2 / J+5 / J+10</li><li>Modèles IA Standard &amp; Pro</li></ul>
                <a className="lp-btn lp-btn--g" href="/signup">Choisir Essentiel</a>
              </div>

              <div className="lp-plan lp-plan--feat">
                <div className="lp-pn">Studio</div>
                <div className="lp-pp">59€<small>par mois</small></div>
                <div className="lp-for">Pour celui qui veut aussi une présence en ligne et toute la puissance.</div>
                <p className="lp-psub">Tout l&apos;Essentiel, plus l&apos;accès à tous les modèles d&apos;IA — le plus puissant, Expert, jusqu&apos;à 10 fois par mois — et plus de crédits. Votre site web pro clé en main arrive bientôt, inclus dans ce palier.</p>
                <ul className="lp-plist"><li>Tout l&apos;Essentiel inclus</li><li>Tous les modèles IA (Expert : 10×/mois)</li><li>Crédits augmentés chaque mois</li><li>Site web pro clé en main <em style={{ color: 'var(--co2)', fontStyle: 'normal' }}>· bientôt</em></li></ul>
                <a className="lp-btn lp-btn--p" href="/signup">Choisir Studio</a>
              </div>

              <div className="lp-plan">
                <div className="lp-pn">Signature</div>
                <div className="lp-pp">99€<small>par mois</small></div>
                <div className="lp-for">Pour l&apos;atelier qui tourne à plein régime.</div>
                <p className="lp-psub">Le maximum de puissance et de crédits, plusieurs métiers gérés, et un accompagnement dédié pour installer Presti dans votre quotidien.</p>
                <ul className="lp-plist"><li>Tout Studio inclus</li><li>Crédits élevés (gros volumes)</li><li>Plusieurs métiers / activités</li><li>Accompagnement dédié</li></ul>
                <a className="lp-btn lp-btn--g" href="/signup">Choisir Signature</a>
              </div>
            </div>
            <p className="lp-pnote">Le modèle Expert consomme plus de crédits · Résiliable à tout moment, sans engagement</p>
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
