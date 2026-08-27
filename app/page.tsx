import HeroDemo from '@/app/HeroDemo'
import Counter from '@/app/Counter'
import ScrollFx from '@/app/ScrollFx'

export default function Home() {
  return (
    <>
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
      <header className="site-header">
        <nav className="nav">
          <a className="brand" href="/"><span className="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21 L21 21" /><path d="M6 21 L6 10 L12 6 L18 10 L18 21" /><path d="M10 21 L10 15 L14 15 L14 21" /></svg></span>Presti</a>
          <div className="nav-spacer" />
          <div className="nav-links">
            <a href="#solutions">Solutions</a>
            <a href="#ia">L&apos;IA</a>
            <a href="#tarifs">Tarifs</a>
            <a href="/faq">FAQ</a>
          </div>
          <a className="btn btn--ghost" href="/login">Se connecter</a>
          <a className="btn btn--primary" href="/signup">Commencer</a>
        </nav>
      </header>

      <main>
        <ScrollFx />

        {/* HERO */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Pour les artisans du bâtiment</span>
              <h1>Le premier qui répond <span className="g">décroche le chantier.</span></h1>
              <p className="lede">
                Presti répond à chaque demande de devis en moins d&apos;une minute — dans votre style —, chiffre le
                devis, édite la facture et relance tout seul. Vous restez sur le chantier, Presti tient le standard.
              </p>
              <div className="cta-row">
                <a className="btn btn--primary btn--lg sweepborder" href="/signup">Essayer gratuitement</a>
                <a className="btn btn--ghost btn--lg" href="#solutions">Voir ce que ça fait</a>
              </div>
              <p className="trust"><span className="dot" /> 1 à 3 essais offerts · sans carte bancaire</p>
            </div>

            <HeroDemo />
          </div>
        </section>

        {/* RÉASSURANCE (cartes ✓) */}
        <section className="section" id="pourquoi">
          <div className="container">
            <div className="reassure">
              <div className="rcard"><span className="rc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 L9 17 L4 12" /></svg></span><div><b>Rapide</b><em>Réponse en &lt; 1 min</em></div></div>
              <div className="rcard"><span className="rc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 L9 17 L4 12" /></svg></span><div><b>Fiable</b><em>Devis conformes, dans votre ton</em></div></div>
              <div className="rcard"><span className="rc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 L9 17 L4 12" /></svg></span><div><b>Sécurisé</b><em>Vos données isolées, chiffrées</em></div></div>
              <div className="rcard"><span className="rc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 L9 17 L4 12" /></svg></span><div><b>Sans carte</b><em>Essai offert, résiliable</em></div></div>
            </div>
          </div>
        </section>

        {/* SOLUTIONS + DÉMOS */}
        <section className="section section--alt" id="solutions">
          <div className="container">
            <div className="section-head center">
              <span className="kicker">Ce que Presti fait, concrètement</span>
              <h2>Trois choses qui vous coûtent des chantiers. Presti s&apos;en charge.</h2>
            </div>

            {/* Solution 1 — réponse instantanée */}
            <div className="solu">
              <div>
                <span className="solu-tag">Réponse instantanée</span>
                <h3>Chaque demande reçoit une réponse pro. En moins d&apos;une minute.</h3>
                <p>Un client écrit pendant que vous êtes sous un évier ? Presti répond à votre place, dans votre ton, jour et nuit. Le client se sent pris en charge — avant que le concurrent ne rappelle.</p>
                <ul className="solu-pts">
                  <li>Écrit dans votre style, pas un robot</li>
                  <li>Vous êtes notifié, le lead est enregistré</li>
                  <li>Jamais un client perdu faute de temps</li>
                </ul>
              </div>
              <div className="solu-media">
                <div className="demo-card">
                  <div className="mchat">
                    <div className="mbub in">Bonjour, fuite sous mon évier depuis ce matin 😣 vous pouvez passer cette semaine ?<span className="st">Marie · 14:02</span></div>
                    <div className="mbub out">Bonjour Marie, merci de votre message ! Je comprends l&apos;urgence. Je vous rappelle dans la journée pour convenir d&apos;un passage — en attendant, coupez l&apos;arrivée d&apos;eau sous l&apos;évier.<span className="st">Presti · répondu en 41 s</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Solution 2 — devis & factures */}
            <div className="solu rev">
              <div>
                <span className="solu-tag">Devis &amp; factures</span>
                <h3>Décrivez le chantier. Le devis se chiffre tout seul.</h3>
                <p>Vous dictez « dépose + pose d&apos;un chauffe-eau 200 L », Presti détaille les postes, applique la bonne TVA et sort un PDF conforme (mentions légales incluses). La facture suit en un clic.</p>
                <ul className="solu-pts">
                  <li>Postes et prix cohérents avec votre métier</li>
                  <li>TVA, acompte, validité, mentions légales</li>
                  <li>PDF prêt à envoyer — puis facturé en un clic</li>
                </ul>
              </div>
              <div className="solu-media">
                <div className="demo-card">
                  <div className="mdev-row"><span className="d">Dépose + pose chauffe-eau 200 L</span><span className="p">620,00 €</span></div>
                  <div className="mdev-row"><span className="d">Groupe de sécurité + raccords</span><span className="p">84,00 €</span></div>
                  <div className="mdev-row"><span className="d">Main-d&apos;œuvre (2 h)</span><span className="p">90,00 €</span></div>
                  <div className="mdev-tot"><span>Total TTC</span><span className="p">873,40 €</span></div>
                  <span className="mdev-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 L9 17 L4 12" /></svg>PDF conforme · DEV-2026-0042</span>
                </div>
              </div>
            </div>

            {/* Solution 3 — relances auto */}
            <div className="solu">
              <div>
                <span className="solu-tag">Relances automatiques</span>
                <h3>Le client ne répond pas ? Presti relance à votre place.</h3>
                <p>80 % des devis se signent après une relance — que personne n&apos;a le temps de faire. Presti relance poliment à J+2, J+5 et J+10, et s&apos;arrête dès que le client répond ou signe.</p>
                <ul className="solu-pts">
                  <li>Relances écrites dans votre ton</li>
                  <li>S&apos;arrêtent automatiquement à la réponse</li>
                  <li>Vous récupérez des chantiers déjà oubliés</li>
                </ul>
              </div>
              <div className="solu-media">
                <div className="demo-card">
                  <div className="rl-step"><span className="rl-dot">J0</span><div className="rl-body"><b>Demande reçue</b><span>Réponse envoyée en 41 s</span></div></div>
                  <div className="rl-step"><span className="rl-dot">+2</span><div className="rl-body"><b>1re relance — J+2</b><span>« Toujours intéressé ? Je tiens le créneau. »</span></div></div>
                  <div className="rl-step"><span className="rl-dot">+5</span><div className="rl-body"><b>2e relance — J+5</b><span>Rappel du devis et de sa validité</span></div></div>
                  <div className="rl-step"><span className="rl-dot">+10</span><div className="rl-body"><b>3e relance — J+10</b><span>Dernière relance, puis on n&apos;insiste plus</span></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMMENT ÇA MARCHE */}
        <section className="section" id="fonctionnement">
          <div className="container">
            <div className="section-head">
              <span className="kicker">Comment ça marche</span>
              <h2>Prêt en 2 minutes. Ensuite, ça tourne tout seul.</h2>
            </div>
            <div className="steps">
              <div className="step">
                <div className="step-num">1</div>
                <h3>Créez votre profil</h3>
                <p>Votre nom, votre métier, votre façon de parler. Presti vous donne un lien de contact personnel.</p>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <h3>Collez votre lien partout</h3>
                <p>Le Bon Coin, Google, Facebook, votre signature mail. Chaque demande arrive dans Presti.</p>
              </div>
              <div className="step">
                <div className="step-num">3</div>
                <h3>Presti répond et relance</h3>
                <p>Réponse pro instantanée, devis chiffré, relances automatiques — tous vos leads au même endroit.</p>
              </div>
            </div>
          </div>
        </section>

        {/* IA / ADAPTABILITÉ */}
        <section className="section section--alt" id="ia">
          <div className="container">
            <div className="section-head">
              <span className="kicker">L&apos;intelligence derrière Presti</span>
              <h2>Une IA qui s&apos;adapte à vous — pas l&apos;inverse.</h2>
              <p>
                Presti apprend votre métier, votre ton et votre façon de chiffrer. Une demande floue, un cas
                particulier, une urgence ? Il s&apos;adapte, pose les bonnes questions et reste juste. Et vous
                choisissez la puissance : rapide pour le courant, expert pour les gros chantiers.
              </p>
            </div>
            <div className="chips">
              <span className="chip">Plombier, électricien, maçon, multiservices…</span>
              <span className="chip">Votre ton : direct, chaleureux, formel</span>
              <span className="chip">Cas particuliers &amp; urgences</span>
              <span className="chip">3 niveaux : Standard · Pro · Expert</span>
              <span className="chip">Devis, factures, réponses, relances</span>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="stat-num"><Counter to={7} suffix="×" /></div>
                <div className="stat-label">plus de chances de signer si vous répondez dans l&apos;heure.</div>
                <div className="stat-source">Harvard Business Review</div>
              </div>
              <div className="stat">
                <div className="stat-num">&lt; 1 min</div>
                <div className="stat-label">le temps que met Presti à répondre à votre place, jour et nuit.</div>
                <div className="stat-source">À chaque demande</div>
              </div>
              <div className="stat">
                <div className="stat-num"><Counter to={3} /> relances</div>
                <div className="stat-label">automatiques — J+2, J+5, J+10 — jusqu&apos;à la réponse.</div>
                <div className="stat-source">Sans y penser</div>
              </div>
            </div>
          </div>
        </section>

        {/* TARIFS */}
        <section className="section" id="tarifs">
          <div className="container">
            <div className="section-head center">
              <span className="kicker">Tarifs</span>
              <h2>Un abonnement rentabilisé dès le premier chantier sauvé.</h2>
              <p>Chaque réponse ou devis généré par l&apos;IA consomme <strong>1 crédit</strong>. Choisissez la formule qui suit votre activité.</p>
            </div>

            <div className="trial">
              <b>Essai gratuit</b>
              <em>1 à 3 réponses IA offertes sur vos vraies demandes — sans carte bancaire.</em>
              <a className="btn btn--ghost" href="/signup">Essayer</a>
            </div>

            <div className="pricing">
              <div className="plan">
                <div className="plan-name">Essentiel</div>
                <div className="price">29€<small>par mois</small></div>
                <p className="plan-sub">Ne plus jamais répondre en retard, devis et factures inclus.</p>
                <ul className="plan-list">
                  <li>Réponse instantanée dans votre ton</li>
                  <li>Devis &amp; factures IA (crédits inclus)</li>
                  <li>Relances automatiques</li>
                  <li>Modèles Standard &amp; Pro</li>
                </ul>
                <a className="btn btn--ghost" href="/signup">Choisir Essentiel</a>
              </div>
              <div className="plan plan--featured">
                <div className="plan-tag">Le plus choisi</div>
                <div className="plan-name">Studio</div>
                <div className="price">59€<small>par mois</small></div>
                <p className="plan-sub">Tout l&apos;Essentiel, plus votre site web et toute la puissance IA.</p>
                <ul className="plan-list">
                  <li>Tout l&apos;Essentiel</li>
                  <li>Votre site web pro inclus</li>
                  <li>Tous les modèles IA (Expert : 10 usages/mois)</li>
                  <li>Plus de crédits chaque mois</li>
                </ul>
                <a className="btn btn--primary" href="/signup">Choisir Studio</a>
              </div>
              <div className="plan">
                <div className="plan-name">Signature</div>
                <div className="price">99€<small>par mois</small></div>
                <p className="plan-sub">La machine complète : Presti répond tout seul, 24/7.</p>
                <ul className="plan-list">
                  <li>Tout Studio</li>
                  <li>Réponse automatique aux demandes 24/7</li>
                  <li>Page de capture dédiée (mini-site)</li>
                  <li>Crédits élevés · accompagnement</li>
                </ul>
                <a className="btn btn--ghost" href="/signup">Choisir Signature</a>
              </div>
            </div>
            <p className="pricing-note">Le modèle Expert consomme plus de crédits. Résiliable à tout moment, sans engagement.</p>
          </div>
        </section>

        {/* CTA */}
        <section className="section">
          <div className="container">
            <div className="cta-band">
              <h2>Le prochain client qui vous cherche, ne le laissez pas filer.</h2>
              <p>Créez votre lien Presti en 2 minutes. La prochaine demande, c&apos;est Presti qui y répond — en moins d&apos;une minute.</p>
              <a className="btn btn--primary btn--lg" href="/signup">Essayer gratuitement</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-in">
          <span className="brand" style={{ fontSize: '1.05rem' }}><span className="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21 L21 21" /><path d="M6 21 L6 10 L12 6 L18 10 L18 21" /><path d="M10 21 L10 15 L14 15 L14 21" /></svg></span>Presti</span>
          <div className="footer-links">
            <a href="/login">Se connecter</a>
            <a href="/signup">Créer un compte</a>
            <a href="#tarifs">Tarifs</a>
            <a href="/faq">FAQ</a>
          </div>
          <span className="muted">© 2026 Presti · Fait pour les artisans.</span>
          <div className="footer-legal" style={{ flexBasis: '100%' }}>
            <a href="/cgu">Conditions générales</a>
            <a href="/confidentialite">Confidentialité</a>
            <a href="/mentions-legales">Mentions légales</a>
          </div>
        </div>
      </footer>
    </>
  )
}
