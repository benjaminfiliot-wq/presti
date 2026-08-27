import HeroApp from '@/app/HeroApp'
import Motion from '@/app/Motion'

/* Icônes SVG (Lucide-style) — jamais d'emoji comme icône. */
const I = {
  house: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M6 21V10l6-4 6 4v11" /><path d="M10 21v-6h4v6" /></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  badge: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 1.8 3 .2.2 3L19.4 9l-1.8 2.4 1.8 2.4-1.8 2.6-.2 3-3 .2L12 22l-2.4-1.8-3-.2-.2-3L4.6 14 6.4 12 4.6 9.6l1.8-2.6.2-3 3-.2z" /><path d="M9 12l2 2 4-4" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M21 12h-6a2 2 0 0 0 0 4h6v-4z" /></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>,
  msg: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  file: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h4" /></svg>,
  card: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  repeat: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
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
            <p className="lp-lede">Presti répond à chaque demande de devis en moins d&apos;une minute — dans votre style —, chiffre le devis, édite la facture et relance tout seul. Vous restez sur le chantier, Presti tient le standard.</p>
            <div className="lp-cta">
              <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
              <a className="lp-btn lp-btn--g lp-btn--lg" href="#fonctionnalites">Voir ce que ça fait</a>
            </div>
            <p className="lp-trust">1 à 3 essais offerts · sans carte bancaire</p>
          </div>

          <div className="container">
            <div className="lp-stage">
              <span className="lp-beam" aria-hidden="true" />
              <div className="lp-float"><HeroApp /></div>
            </div>
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

        {/* FONCTIONNALITÉS — une démo par feature */}
        <section className="lp-blk" id="fonctionnalites">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Tout ce que Presti fait pour vous</span><h2>Chaque fonctionnalité, en démonstration.</h2></div>

            {/* F1 — Lien de contact */}
            <div className="lp-feat reveal" style={{ marginTop: '3.5rem' }}>
              <div>
                <div className="lp-featnum">01</div>
                <div className="lp-feattag"><span className="fi">{I.link}</span>Votre lien de contact</div>
                <h3>Un lien à vous. Chaque demande atterrit dans Presti.</h3>
                <p>Collez votre lien Presti sur Le Bon Coin, Google, Facebook, votre signature mail. Le client remplit un formulaire simple, et sa demande arrive instantanément — plus rien ne se perd dans les SMS et les mails.</p>
                <ul className="lp-pts"><li>Un lien personnel, prêt en 2 minutes</li><li>Formulaire clair pour le client</li><li>Chaque demande centralisée, horodatée</li></ul>
              </div>
              <div className="lp-media"><div className="lp-card">
                <div className="lp-lbl">prestiapp.fr / votre-nom</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  <input readOnly value="Marie Lefèvre" style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '.7rem .85rem', color: 'var(--ink)', fontSize: '.88rem' }} />
                  <input readOnly value="marie.l@email.fr" style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '.7rem .85rem', color: 'var(--ink)', fontSize: '.88rem' }} />
                  <textarea readOnly rows={2} value="Fuite sous l'évier, vous passez cette semaine ?" style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '.7rem .85rem', color: 'var(--ink)', fontSize: '.88rem', resize: 'none', fontFamily: 'inherit' }} />
                  <span className="lp-btn lp-btn--p" style={{ justifyContent: 'center' }}>Envoyer ma demande</span>
                </div>
              </div></div>
            </div>

            {/* F2 — Réponse instantanée */}
            <div className="lp-feat rev reveal">
              <div>
                <div className="lp-featnum">02</div>
                <div className="lp-feattag"><span className="fi">{I.msg}</span>Réponse instantanée</div>
                <h3>Une réponse pro à chaque client, en moins d&apos;une minute.</h3>
                <p>Presti répond à votre place, dans votre ton, jour et nuit — avant que le concurrent ne rappelle. Besoin d&apos;écrire vous-même ? Un générateur rédige aussi la réponse à la demande quand vous le voulez, à la puissance que vous choisissez.</p>
                <ul className="lp-pts"><li>Écrit dans votre style, pas un robot</li><li>Détecte l&apos;urgence et pose les bonnes questions</li><li>3 niveaux d&apos;IA : Standard, Pro, Expert</li></ul>
              </div>
              <div className="lp-media"><div className="lp-card">
                <div className="lp-chat" style={{ marginBottom: '1rem' }}>
                  <div className="lp-bub in show">Un devis pour refaire l&apos;électricité d&apos;un T2 ?<span className="st">Karim · 09:14</span></div>
                  <div className="lp-bub out show">Bonjour Karim ! Avec plaisir. Pour un T2, je peux vous faire une estimation dès aujourd&apos;hui — pouvez-vous me préciser la surface et l&apos;année du logement ?<span className="st">Presti · répondu en 38 s</span></div>
                </div>
                <div className="lp-lbl">Puissance de l&apos;IA</div>
                <div className="lp-models"><span className="m">Standard</span><span className="m on">Pro <span>●</span></span><span className="m">Expert</span></div>
              </div></div>
            </div>

            {/* F3 — Devis chiffré + PDF */}
            <div className="lp-feat reveal">
              <div>
                <div className="lp-featnum">03</div>
                <div className="lp-feattag"><span className="fi">{I.file}</span>Devis &amp; factures</div>
                <h3>Décrivez le chantier. Le devis se chiffre tout seul.</h3>
                <p>Vous dictez « pose d&apos;un chauffe-eau 200 L », Presti détaille les postes, applique la bonne TVA et sort un PDF conforme (mentions légales incluses). La facture suit en un clic.</p>
                <ul className="lp-pts"><li>Postes et prix cohérents avec votre métier</li><li>TVA, acompte, validité, mentions légales</li><li>PDF prêt à envoyer, puis facturé en un clic</li></ul>
              </div>
              <div className="lp-media"><div className="lp-card">
                <div className="lp-lbl">Devis — DEV-2026-0042</div>
                <div className="lp-drow"><span>Dépose + pose chauffe-eau 200 L</span><span className="p">620,00</span></div>
                <div className="lp-drow"><span>Groupe de sécurité + raccords</span><span className="p">84,00</span></div>
                <div className="lp-drow"><span>Main-d&apos;œuvre (2 h)</span><span className="p">90,00</span></div>
                <div className="lp-dtot"><span>Total TTC</span><span className="p">873,40 €</span></div>
                <span className="lp-dbadge"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>PDF conforme · TVA 10 %</span>
              </div></div>
            </div>

            {/* F4 — Paiement */}
            <div className="lp-feat rev reveal">
              <div>
                <div className="lp-featnum">04</div>
                <div className="lp-feattag"><span className="fi">{I.card}</span>Paiement en ligne</div>
                <h3>Le client règle le devis en un lien sécurisé.</h3>
                <p>Chaque devis peut être payé en ligne, par carte, via un lien sécurisé. Fini les relances de chèque et les virements oubliés — l&apos;acompte tombe, le chantier démarre.</p>
                <ul className="lp-pts"><li>Lien de paiement sur chaque devis</li><li>Paiement carte sécurisé</li><li>Suivi des encaissements</li></ul>
              </div>
              <div className="lp-media"><div className="lp-card">
                <div className="lp-lbl">Paiement sécurisé</div>
                <div className="lp-dtot" style={{ marginTop: 0 }}><span>À régler</span><span className="p">873,40 €</span></div>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', margin: '1rem 0', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '.7rem .85rem' }}>
                  <span style={{ color: 'var(--co2)' }}>{I.card}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: 'var(--ink2)' }}>4242 4242 4242 4242</span>
                </div>
                <span className="lp-btn lp-btn--p" style={{ justifyContent: 'center', width: '100%' }}>Payer 873,40 €</span>
                <span className="lp-dbadge"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>Chiffré · propulsé par Stripe</span>
              </div></div>
            </div>

            {/* F5 — Relances automatiques */}
            <div className="lp-feat reveal">
              <div>
                <div className="lp-featnum">05</div>
                <div className="lp-feattag"><span className="fi">{I.repeat}</span>Relances automatiques</div>
                <h3>Le client ne répond pas ? Presti relance à votre place.</h3>
                <p>80 % des devis se signent après une relance — que personne n&apos;a le temps de faire. Presti relance poliment à J+2, J+5 et J+10, et s&apos;arrête dès que le client répond ou signe.</p>
                <ul className="lp-pts"><li>Relances écrites dans votre ton</li><li>S&apos;arrêtent automatiquement à la réponse</li><li>Vous récupérez des chantiers déjà oubliés</li></ul>
              </div>
              <div className="lp-media"><div className="lp-card">
                <div className="lp-tl-step"><span className="lp-tl-dot">J0</span><div className="lp-tl-b"><b>Demande reçue</b><span>Réponse envoyée en 41 s</span></div></div>
                <div className="lp-tl-step"><span className="lp-tl-dot">+2</span><div className="lp-tl-b"><b>1re relance — J+2</b><span>« Toujours intéressé ? Je tiens le créneau. »</span></div></div>
                <div className="lp-tl-step"><span className="lp-tl-dot">+5</span><div className="lp-tl-b"><b>2e relance — J+5</b><span>Rappel du devis et de sa validité</span></div></div>
                <div className="lp-tl-step"><span className="lp-tl-dot">+10</span><div className="lp-tl-b"><b>3e relance — J+10</b><span>Dernière relance, puis on n&apos;insiste plus</span></div></div>
              </div></div>
            </div>

            {/* F6 — Tableau de bord */}
            <div className="lp-feat rev reveal">
              <div>
                <div className="lp-featnum">06</div>
                <div className="lp-feattag"><span className="fi">{I.grid}</span>Tableau de bord</div>
                <h3>Toutes vos demandes au même endroit.</h3>
                <p>Chaque lead, son message, la réponse envoyée et son statut — dans un tableau clair. Vous savez qui rappeler, qui a répondu, qui a signé. Plus rien ne passe entre les mailles.</p>
                <ul className="lp-pts"><li>Tous vos leads centralisés</li><li>Statuts clairs : nouveau, répondu, gagné</li><li>Historique de chaque échange</li></ul>
              </div>
              <div className="lp-media"><div className="lp-card">
                <div className="lp-lbl">Vos demandes</div>
                <div className="lp-dash-row"><div><div className="who">Marie Lefèvre</div><div className="msg">Fuite sous l&apos;évier…</div></div><span className="lp-pill new">Nouveau</span></div>
                <div className="lp-dash-row"><div><div className="who">Karim B.</div><div className="msg">Électricité T2…</div></div><span className="lp-pill ok">Répondu</span></div>
                <div className="lp-dash-row"><div><div className="who">Sophie D.</div><div className="msg">Rénovation salle de bain…</div></div><span className="lp-pill ok">Gagné</span></div>
                <div className="lp-dash-row" style={{ borderBottom: 'none' }}><div><div className="who">Entreprise TP</div><div className="msg">Devis carrelage…</div></div><span className="lp-pill wait">En attente</span></div>
              </div></div>
            </div>
          </div>
        </section>

        {/* TARIFS — abonnements expliqués */}
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
                <ul className="lp-plist"><li>Réponse instantanée dans votre ton</li><li>Devis &amp; factures IA (crédits inclus)</li><li>Relances automatiques J+2 / J+5 / J+10</li><li>Modèles IA Standard &amp; Pro</li></ul>
                <a className="lp-btn lp-btn--g" href="/signup">Choisir Essentiel</a>
              </div>

              <div className="lp-plan lp-plan--feat">
                <div className="lp-pn">Studio</div>
                <div className="lp-pp">59€<small>par mois</small></div>
                <div className="lp-for">Pour celui qui veut aussi une présence en ligne et toute la puissance.</div>
                <p className="lp-psub">Tout l&apos;Essentiel, plus votre site web pro clé en main et l&apos;accès à tous les modèles d&apos;IA — le plus puissant, Expert, jusqu&apos;à 10 fois par mois. Plus de crédits pour tenir le rythme.</p>
                <ul className="lp-plist"><li>Tout l&apos;Essentiel inclus</li><li>Votre site web pro clé en main</li><li>Tous les modèles IA (Expert : 10×/mois)</li><li>Crédits augmentés chaque mois</li></ul>
                <a className="lp-btn lp-btn--p" href="/signup">Choisir Studio</a>
              </div>

              <div className="lp-plan">
                <div className="lp-pn">Signature</div>
                <div className="lp-pp">99€<small>par mois</small></div>
                <div className="lp-for">Pour l&apos;artisan qui veut que ça tourne sans lui.</div>
                <p className="lp-psub">La machine complète : Presti répond automatiquement à chaque demande, 24/7, avec une page de capture dédiée qui transforme vos visiteurs en devis. Crédits élevés et accompagnement.</p>
                <ul className="lp-plist"><li>Tout Studio inclus</li><li>Réponse automatique aux demandes 24/7</li><li>Page de capture dédiée (mini-site)</li><li>Crédits élevés · accompagnement</li></ul>
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
