import HeroDemo from '@/app/HeroDemo'
import Counter from '@/app/Counter'
import ScrollFx from '@/app/ScrollFx'

export default function Home() {
  return (
    <>
      <header className="site-header">
        <nav className="nav">
          <a className="brand" href="/"><span className="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21 L21 21" /><path d="M6 21 L6 10 L12 6 L18 10 L18 21" /><path d="M10 21 L10 15 L14 15 L14 21" /></svg></span>Presti</a>
          <div className="nav-spacer" />
          <div className="nav-links">
            <a href="#fonctionnement">Fonctionnement</a>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#tarifs">Tarifs</a>
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
                Presti répond à chaque demande de devis en moins d&apos;une minute, dans votre style — et relance
                tout seul jusqu&apos;à la réponse. Vous ne perdez plus un client parce que vous étiez sur un chantier.
              </p>
              <div className="cta-row">
                <a className="btn btn--primary btn--lg sweepborder" href="/signup">Commencer gratuitement</a>
                <a className="btn btn--ghost btn--lg" href="/login">J&apos;ai déjà un compte</a>
              </div>
              <p className="trust"><span className="dot" /> Gratuit pour démarrer · sans carte bancaire</p>
            </div>

            <HeroDemo />
          </div>
        </section>

        {/* PROBLÈME + STATS */}
        <section className="section section--alt" id="probleme">
          <div className="container">
            <div className="section-head">
              <span className="kicker">Le vrai problème</span>
              <h2>Ce n&apos;est pas le travail qui manque. C&apos;est le temps de répondre.</h2>
              <p>
                Un client remplit votre formulaire à 14 h. Vous êtes sous un évier, les mains dans le cambouis.
                À 18 h vous rappelez : il a déjà signé avec un autre. Le devis n&apos;a jamais été le problème —
                la vitesse de réponse, si.
              </p>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="stat-num"><Counter to={7} suffix="×" /></div>
                <div className="stat-label">plus de chances de décrocher le client si vous répondez dans l&apos;heure.</div>
                <div className="stat-source">Harvard Business Review</div>
              </div>
              <div className="stat">
                <div className="stat-num">&lt; 1 min</div>
                <div className="stat-label">le temps que met Presti à répondre à votre place, jour et nuit.</div>
                <div className="stat-source">À chaque demande reçue</div>
              </div>
              <div className="stat">
                <div className="stat-num"><Counter to={3} /> relances</div>
                <div className="stat-label">automatiques — J+2, J+5, J+10 — jusqu&apos;à ce que le client réponde.</div>
                <div className="stat-source">Sans y penser</div>
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
                <p>Réponse pro instantanée à chaque client, relances automatiques, et tous vos leads au même endroit.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FONCTIONNALITÉS */}
        <section className="section section--alt" id="fonctionnalites">
          <div className="container">
            <div className="section-head">
              <span className="kicker">Ce que Presti fait pour vous</span>
              <h2>Comme un secrétaire qui ne dort jamais.</h2>
            </div>
            <div className="features">
              <div className="feature">
                <div className="feature-ic">⚡</div>
                <h3>Réponse instantanée, dans votre voix</h3>
                <p>Chaque demande reçoit une réponse pro en moins d&apos;une minute, écrite dans votre ton. Le client se sent pris en charge, même quand vous êtes sur un chantier.</p>
              </div>
              <div className="feature">
                <div className="feature-ic">🔁</div>
                <h3>Relances automatiques</h3>
                <p>Pas de réponse ? Presti relance poliment à J+2, J+5 et J+10. Fini les clients oubliés faute de temps.</p>
              </div>
              <div className="feature">
                <div className="feature-ic">📋</div>
                <h3>Toutes vos demandes au même endroit</h3>
                <p>Chaque lead, son message et la réponse envoyée, dans un tableau de bord clair. Vous savez qui rappeler, et qui a déjà répondu.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TARIFS */}
        <section className="section" id="tarifs">
          <div className="container">
            <div className="section-head center">
              <span className="kicker">Tarifs</span>
              <h2>Un prix simple, rentabilisé dès le premier chantier sauvé.</h2>
              <p>Chaque réponse ou devis généré par l&apos;IA = <strong>1 crédit</strong>. Choisissez la puissance dont vous avez besoin.</p>
            </div>
            <div className="pricing">
              <div className="plan">
                <div className="plan-name">Gratuit</div>
                <div className="price">0€<span> /mois</span></div>
                <ul className="plan-list">
                  <li><strong>10 crédits</strong> / mois pour tester</li>
                  <li>1 lien de contact</li>
                  <li>Tableau de bord des demandes</li>
                </ul>
                <a className="btn btn--ghost" href="/signup">Commencer</a>
              </div>
              <div className="plan plan--featured">
                <div className="plan-tag">Le plus choisi</div>
                <div className="plan-name">Pro</div>
                <div className="price">39€<span> /mois</span></div>
                <ul className="plan-list">
                  <li><strong>100 crédits</strong> / mois</li>
                  <li>Réponses instantanées + relances auto</li>
                  <li>Génération de devis IA</li>
                  <li>Votre ton · support prioritaire</li>
                </ul>
                <a className="btn btn--primary" href="/signup">Choisir Pro</a>
              </div>
              <div className="plan">
                <div className="plan-name">Business</div>
                <div className="price">79€<span> /mois</span></div>
                <ul className="plan-list">
                  <li><strong>500 crédits</strong> / mois</li>
                  <li>Tout Pro, en illimité pratique</li>
                  <li>Modèle IA Expert (le plus précis)</li>
                  <li>Plusieurs métiers · accompagnement dédié</li>
                </ul>
                <a className="btn btn--ghost" href="/signup">Choisir Business</a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section">
          <div className="container">
            <div className="cta-band">
              <h2>Le prochain client qui vous cherche, ne le laissez pas filer.</h2>
              <p>Créez votre lien Presti en 2 minutes. La prochaine demande, c&apos;est Presti qui y répond — en moins d&apos;une minute.</p>
              <a className="btn btn--primary btn--lg" href="/signup">Commencer gratuitement</a>
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
