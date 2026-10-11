import '@/app/globals.css'
import PublicNav from '@/app/PublicNav'
import Marque from './Marque'
import type { Metadata } from 'next'
import HeroApp from '@/app/HeroApp'
import Motion from '@/app/Motion'
import DemoSequence from '@/app/DemoSequence'
import DemoVideo from '@/app/DemoVideo'
import DemoSite from '@/app/DemoSite'
import DemoChiffres from '@/app/DemoChiffres'
import DemoCompta from '@/app/DemoCompta'
import MaquetteForm from '@/app/MaquetteForm'
import { METIERS } from '@/lib/agents/acquisition/contrat'
import { FLAGS, actif } from '@/lib/flags'
import Comparatif from '@/app/Comparatif'
import { OFFRES, pointsForts } from '@/lib/plans'
import { SITE_A_LA_DEMANDE } from '@/lib/siteCommande'
import { FAQ } from '@/lib/faq'

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
  serrure: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 15v2" /></svg>,
  oeilBarre: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.8" /><path d="M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.7-1.2" /><path d="m2 2 20 20" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>,
  registre: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z" /><path d="M8 7h8M8 11h8M8 15h5" /></svg>,
  stop: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></svg>,
  repeat: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>,
}

// Le prix d'appel se lit dans la grille (lib/plans.ts), jamais recopié à la main.
const PRIX_MIN = Math.min(...OFFRES.map((o) => o.prix))

// « Pour qui » : les quatre métiers de la première cible (docs/presti/STRATEGIE-GLOBALE-0610.md §1). Chaque demande est une
// demande TYPE, écrite pour l'exemple — pas un client, et l'écran le dit. Aucun chiffre ; aucun mot d'escalade (« fuite »,
// « urgence »… : lib/plateformeConfig.ts, escalade_mots), sur lesquels Presti alerte l'artisan au lieu de préparer seul.
const POUR_QUI: { metier: string; demande: string; regle: string }[] = [
  {
    metier: 'Plombier-chauffagiste',
    demande: 'Mon chauffe-eau ne chauffe plus depuis hier soir.',
    regle: "Elle arrive quand vous êtes sous un évier. La réponse est prête dans votre ton : vous l'envoyez entre deux interventions, avant qu'il appelle un autre plombier.",
  },
  {
    metier: 'Électricien',
    demande: 'Je vends ma maison, il faut remettre le tableau aux normes.',
    regle: "La réponse préparée pose les questions qui manquent, puis le devis se prépare sur vos prix. Vous relisez avant d'envoyer.",
  },
  {
    metier: 'Menuisier',
    demande: "Un escalier en chêne pour remplacer l'ancien, c'est possible ?",
    regle: "Le devis sur mesure, c'est souvent le soir, après le chantier. Presti le prépare sur vos prix : vous l'ajustez, vous l'envoyez.",
  },
  {
    metier: 'Couvreur',
    demande: 'Il manque des tuiles depuis le coup de vent, vous pouvez venir voir ?',
    regle: "Votre réponse envoyée, trois relances sont prévues (J+2, J+5, J+10) : le client n'est pas oublié pendant que vous êtes sur un toit.",
  },
]

export default function Home() {
  return (
    <div className="lp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.slice(0, 8).map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.reponse },
            })),
          }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026'),
        }}
      />
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
              "Chaque demande arrive dans Presti. La réponse est prête en moins d'une minute : Presti la prépare dans votre ton, vous l'envoyez.",
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
              { '@type': 'Organization', '@id': 'https://prestiapp.fr/#org', name: 'Presti', url: 'https://prestiapp.fr', logo: { '@type': 'ImageObject', url: 'https://prestiapp.fr/marque/presti-icone-512.png', width: 512, height: 512 } },
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

      <PublicNav accueil />

      <main>
        {/* HERO */}
        <section className="lp-hero">
          {/* Refonte du 11/10 : un sol en grille et deux orbes, en dégradés purs (aucun filtre flou à repeindre),
              animés seulement par transform. Décor : masqué aux lecteurs d'écran. */}
          <div className="lp-hero-decor" aria-hidden="true"><span className="lp-grille" /><span className="lp-orbe o1" /><span className="lp-orbe o2" /></div>
          <div className="container">
            <span className="lp-eyebrow"><b />Assistant IA pour les artisans du bâtiment</span>
            <h1>Le premier qui répond <span className="g">décroche le chantier.</span></h1>
            {/* Deux versions de la même promesse : en 390 px, la longue faisait 6 lignes et repoussait l'appel à l'action
                (mesure du 06/10). La courte tient en deux lignes ; la longue reste sur les écrans larges. */}
            <p className="lp-lede">
              <span className="lp-lede-court">Chaque demande Google ou Le Bon Coin a sa réponse prête : vous l&apos;envoyez.</span>
              <span className="lp-lede-long">Votre lien sur Google, Le Bon Coin ou Facebook : chaque demande arrive dans Presti, la réponse est prête en moins d&apos;une minute dans votre ton, vous l&apos;envoyez. Puis le devis sur vos prix, la facture, et trois relances (J+2, J+5, J+10).</span>
            </p>
            <div className="lp-cta">
              <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
              <a className="lp-btn lp-btn--g lp-btn--lg" href="#fonctionnalites">Voir ce que ça fait</a>
            </div>
            <p className="lp-trust">3 crédits offerts · sans carte bancaire · ensuite dès {PRIX_MIN} € par mois, sans engagement</p>
          </div>
          <div className="container">
            <div className="lp-stage">
              <span className="lp-beam" aria-hidden="true" />
              <div className="lp-tilt"><div className="lp-float"><HeroApp /></div></div>
              {/* Ce qui suit la réponse, en étiquettes autour de la scène (bureau seulement). Aucun chiffre, aucune durée. */}
              <span className="lp-puce p1" aria-hidden="true"><i />Devis PDF prêt</span>
              <span className="lp-puce p2" aria-hidden="true"><i />Relance J+2 planifiée</span>
              <span className="lp-puce p3" aria-hidden="true"><i />Facture en un clic</span>
            </div>
          </div>
        </section>

        {/* RÉASSURANCE */}
        <section className="lp-blk" style={{ paddingTop: '1rem' }}>
          <div className="container">
            <div className="lp-reassure reveal-kids">
              <div className="lp-rc"><span className="i">{I.zap}</span><div><b>Rapide</b><em>Réponse prête en moins d&apos;une minute : vous l&apos;envoyez</em></div></div>
              <div className="lp-rc"><span className="i">{I.badge}</span><div><b>Fiable</b><em>Devis conformes, dans votre ton</em></div></div>
              <div className="lp-rc"><span className="i">{I.shield}</span><div><b>Sécurisé</b><em>Vos données isolées, chiffrées</em></div></div>
              <div className="lp-rc"><span className="i">{I.wallet}</span><div><b>Sans carte</b><em>Essai offert, résiliable</em></div></div>
            </div>
          </div>
        </section>

        {/* PROOF */}
        <section className="lp-blk lp-proof reveal">
          <div className="container lp-proof-in">
            <div className="lp-bignum count" data-to="7" data-suffix="×">7×</div>
            <div>
            <p>plus de chances d&apos;obtenir un vrai échange avec le client en répondant dans l&apos;heure plutôt qu&apos;en attendant. Presti prépare la réponse dans votre ton en moins d&apos;une minute ; vous l&apos;envoyez.</p>
            <div className="src">Source : Harvard Business Review — « The Short Life of Online Sales Leads » (étude sur 2 241 entreprises)</div>
            </div>
          </div>
        </section>

        {/* FONCTIONNALITÉS — vitrine interactive (clique → la démo se joue) */}
        <section className="lp-blk" id="fonctionnalites">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>01</i>Une demande arrive</span><h2>Ce qui se passe, de 22 h 14 à 7 h 52.</h2><p>Un client écrit le soir. Le lendemain matin, le devis est prêt, il l&apos;accepte. Des scènes prises sur le vrai produit.</p></div>
            {FLAGS.landingVideo ? <DemoVideo /> : <DemoSequence />}
            {FLAGS.landingDemoSite ? <DemoSite /> : null}
          </div>
        </section>

        {/* VOS CHIFFRES — le tableau de bord de gestion (/chiffres), livré le 06/10 : le vrai écran,
            nourri par le vrai calcul, sur un artisan fictif (app/DemoChiffres.tsx). */}
        <section className="lp-blk" id="chiffres">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>02</i>Fin de mois</span><h2>Vos chiffres, sans tableur.</h2><p>Ce que vous avez facturé, ce qui est encaissé, ce qui traîne, les devis à relancer. Calculé à partir de vos devis et de vos factures : rien à saisir.</p></div>
            <DemoChiffres />
          </div>
        </section>

        {/* COMPTABILITÉ — le tableur façon Excel de /chiffres (PR #10, 11/10) : le vrai composant, en lecture seule,
            sur un plombier fictif (app/DemoCompta.tsx, lib/compta-exemple.ts). */}
        <section className="lp-blk" id="compta">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>03</i>Comptabilité</span><h2>Votre compta, comme dans Excel.</h2><p>Déposez vos fichiers Excel ou CSV : chaque ligne est rangée, triée, totalisée. Vous corrigez une cellule, les totaux suivent, et le classeur repart en .xlsx pour votre comptable.</p></div>
            <DemoCompta />
          </div>
        </section>

        {/* POUR QUI — les quatre métiers de la cible, une demande type chacun et ce que Presti en fait (vague 2, 06/10).
            Placée APRÈS le produit (démo, site, chiffres) le 07/10 : entre la preuve et la démo, elle retardait la démo d'un écran
            entier en 390 px ; l'ordre de la stratégie (§5) met le produit montré tel quel juste après la promesse. */}
        <section className="lp-blk" id="pour-qui">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>04</i>Pour qui</span><h2>Pour l&apos;artisan qui est sur le chantier quand le client écrit.</h2><p>Quatre métiers, quatre demandes types — écrites pour l&apos;exemple, pas des clients.</p></div>
            <ul className="lp-pq-rang reveal-kids">
              {POUR_QUI.map((c) => (
                <li key={c.metier} className="lp-pq lp-spot">
                  <b>{c.metier}</b>
                  <q>{c.demande}</q>
                  <span>{c.regle}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CONFIANCE — ce qu'on s'interdit, et par quel mécanisme. Sous le même drapeau que la
            fonctionnalité : une promesse commerciale ne doit pas survivre à ce qui la tient. */}
        {FLAGS.supportArtisan ? (
          <section className="lp-blk lp-conf" id="confiance">
            <div className="container">
              <div className="lp-head2 c reveal">
                <span className="lp-kick"><i>05</i>Et nous, on voit quoi&nbsp;?</span>
                <h2>Rien. Sauf si vous ouvrez vous-même.</h2>
                <p>Vos clients vous écrivent des choses qu&apos;ils ne diraient pas à un inconnu. Voilà ce que Presti s&apos;interdit — et comment.</p>
              </div>
              <div className="lp-conf-grid reveal-kids">
                <div className="lp-cc lp-spot"><span className="i">{I.serrure}</span><b>La porte naît fermée</b><em>Pour qu&apos;on regarde un devis, il faut <b>votre</b> clic. Une heure, puis elle se referme seule. Personne chez Presti ne peut l&apos;ouvrir à votre place.</em></div>
                <div className="lp-cc lp-spot"><span className="i">{I.oeilBarre}</span><b>La forme, jamais le fond</b><em>On voit qu&apos;un devis a sept lignes et un total. Jamais le nom de votre client, jamais vos échanges, jamais vos photos.</em></div>
                <div className="lp-cc lp-spot"><span className="i">{I.registre}</span><b>Chaque coup d&apos;œil est écrit</b><em>Qui a regardé, quoi, à quelle minute. Dans <b>votre</b> espace, pas seulement dans le nôtre — et ça part avec vos données quand vous les exportez.</em></div>
                <div className="lp-cc lp-spot"><span className="i">{I.stop}</span><b>Un verrou, si vous préférez</b><em>«&nbsp;Ne plus jamais me demander.&nbsp;» Un bouton, et la demande n&apos;arrive même plus jusqu&apos;à vous.</em></div>
              </div>
              <p className="lp-conf-fin reveal">Ce n&apos;est pas un paragraphe dans des conditions générales.<b> C&apos;est du code, et il refuse.</b></p>
            </div>
          </section>
        ) : null}

        {/* TARIFS */}
        <section className="lp-blk" id="tarifs">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>06</i>Abonnements</span><h2>Simple : vous payez à l&apos;usage, en crédits.</h2><p>Chaque formule vous donne des crédits chaque mois. Vous montez en formule quand votre activité grandit.</p></div>

            {/* Les prix d'abord : mesuré le 06/10 en 390 px, l'explication des crédits (529 px) passait
                avant la première formule. Elle suit maintenant la grille. */}
            <div className="lp-plans reveal-kids">
              {OFFRES.map((o) => (
                <div key={o.id} className={`lp-plan lp-spot${o.id === 'studio' ? ' lp-plan--feat' : ''}`}>
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
            <div className="lp-trial reveal"><b>Essai gratuit</b><em>3 crédits offerts (3 réponses ou devis) sur vos vraies demandes — pour juger la qualité avant de payer. Sans carte.</em><a className="lp-btn lp-btn--g" href="/signup">Essayer</a></div>

            <div className="lp-howcredits reveal-kids">
              <div className="lp-hc lp-spot"><span className="ic">{I.zap}</span><b>1 crédit = 1 génération</b><span>Une réponse préparée pour un client, ou un devis chiffré par l&apos;IA.</span></div>
              <div className="lp-hc lp-spot"><span className="ic">{I.badge}</span><b>Modèle Expert = 3 crédits</b><span>L&apos;IA la plus puissante consomme plus — réservez-la aux gros chantiers.</span></div>
              <div className="lp-hc lp-spot"><span className="ic">{I.repeat}</span><b>Rechargés chaque mois</b><span>Vos crédits se réinitialisent à chaque renouvellement. Non reportés au mois suivant.</span></div>
            </div>

            {/* Le tableau « qui a quoi » — la même matrice que les verrous serveur (lib/plans.ts).
                Replié par défaut : ouvert, il faisait 1 503 px en 390 px de large (mesure du 06/10). */}
            <div className="reveal lp-cmp">
              <details className="lp-cmp-pli">
                <summary>Qui a quoi, ligne par ligne</summary>
                <Comparatif />
              </details>
            </div>
            <p className="lp-pnote">1 crédit = 1 génération · Expert = 3 crédits · crédits rechargés chaque mois (non reportés) · sans engagement</p>
            {actif('siteCommandeVente') && (
              <div className="lp-site reveal lp-spot">
                <h3>{SITE_A_LA_DEMANDE.titre}</h3>
                {SITE_A_LA_DEMANDE.phrases.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <div className="lp-site-cta">
                  <a className="lp-btn lp-btn--p" href={SITE_A_LA_DEMANDE.lien}>{SITE_A_LA_DEMANDE.bouton}</a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* MAQUETTE — le formulaire d'entrée sans compte (décision 1 de Benj, 06/10 ; route 026-145, drapeau prospectsEntrant).
            Après les prix : pour l'artisan qui n'est pas prêt à créer un compte, une porte plus petite que l'essai. */}
        {actif('prospectsEntrant') ? (
          <section className="lp-blk" id="maquette">
            <div className="container">
              <div className="lp-mq reveal">
                <div className="lp-mq-texte">
                  <span className="lp-kick">Pas encore prêt à essayer&nbsp;?</span>
                  <h2>Recevez la maquette de votre site.</h2>
                  <p>Donnez votre activité et votre site actuel ou votre compte Instagram : l&apos;assistant IA de Presti prépare une maquette de site pour votre entreprise et vous l&apos;envoie à l&apos;adresse que vous indiquez. Gratuit, sans compte, sans carte.</p>
                  <p className="lp-mq-note">Une seule demande par entreprise. Vous pouvez refuser toute suite en répondant STOP.</p>
                </div>
                <MaquetteForm metiers={METIERS.map((m) => ({ id: m.id, libelle: m.libelle }))} />
              </div>
            </div>
          </section>
        ) : null}

        {/* QUESTIONS — les mêmes que le balisage FAQPage ci-dessus (FAQ.slice(0, 8)) : Google veut voir à
            l'écran ce que le balisage décrit, et ce sont les objections qu'un artisan se pose avant d'essayer. */}
        <section className="lp-blk" id="questions">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>07</i>Avant d&apos;essayer</span><h2>Les questions qu&apos;on nous pose.</h2></div>
            <div className="lp-faq">
              {FAQ.slice(0, 8).map((f) => (
                <details className="faq-item" key={f.question}>
                  <summary>{f.question}</summary>
                  <div className="faq-a">{f.reponse}</div>
                </details>
              ))}
              <p className="lp-faq-plus"><a href="/faq">Toutes les questions</a></p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-blk lp-final reveal">
          <div className="lp-hero-decor" aria-hidden="true"><span className="lp-grille" /></div>
          <div className="container">
            <h2>Le prochain client qui vous cherche,<br /><span className="g">ne le laissez pas filer.</span></h2>
            <p>3 réponses ou devis offerts, sur vos vraies demandes, sans carte bancaire. Vous jugez la qualité avant de payer quoi que ce soit.</p>
            <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
            {actif('prospectsEntrant') ? <p className="lp-final-alt"><a href="#maquette">Ou recevoir d&apos;abord la maquette de mon site</a></p> : null}
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="container">
          <div className="lp-foot-haut">
            <div className="lp-foot-marque">
              <span className="lp-brand"><i className="marque"><Marque size={22} /></i>Presti</span>
              <p>L&apos;assistant des artisans du bâtiment : chaque demande a sa réponse prête, puis le devis, la facture et les relances.</p>
              <a className="lp-btn lp-btn--p" href="/signup">Essayer gratuitement</a>
            </div>
            <nav aria-label="Produit"><b>Produit</b><a href="#fonctionnalites">Fonctionnalités</a><a href="#chiffres">Vos chiffres</a><a href="#compta">Comptabilité</a><a href="#tarifs">Tarifs</a></nav>
            <nav aria-label="Aide"><b>Aide</b><a href="/faq">Questions fréquentes</a><a href="/contact">Nous écrire</a><a href="/login">Se connecter</a></nav>
            <nav aria-label="Informations légales"><b>Légal</b><a href="/cgu">Conditions générales</a><a href="/confidentialite">Confidentialité</a><a href="/mentions-legales">Mentions légales</a></nav>
          </div>
          <div className="lp-foot-bas"><span>© 2026 Presti · Fait pour les artisans.</span></div>
        </div>
        <div className="lp-foot-mot" aria-hidden="true">Presti</div>
      </footer>
    </div>
  )
}
