// La landing v2 (refonte 18/10, étape 6.1 ; piste B « Cinéma » validée par Benj le 19/10), derrière le drapeau `landingV2`.
// Dix sections (plans/refonte-1018/ARCHITECTURE.md §1) au lieu de quinze ; chaque bloc de l'ancienne page a sa place ici ou
// sur /offres, /comparatif, /faq (plans/refonte-1018/INVENTAIRE-CONTENU.md, coché ligne par ligne). Les démos existantes sont
// RÉUTILISÉES (HeroApp, DemoGestion, DemoSite, DemoChiffres, DemoCompta, MaquetteForm, captures de lib/demoScenes.ts),
// jamais réécrites. Pas d'anneau WebGL : l'aube corail est un dégradé CSS (gain de temps de blocage, contraste maîtrisé).
// « Essayer gratuitement » : deux fois en bouton (héros, appel final) ; le pied et la barre n'en refont pas.
// Sans JavaScript : onglets, slides et sélecteur se déplient en liste ; le filet .reveal-armed laisse tout visible.
import '@/app/globals.css'
import '@/app/accueil.css'
import '@/components/ui/ui.css'
import './landing-v2.css'
import type { ReactNode } from 'react'
import PublicPied from '@/app/PublicPied'
import PublicNav from '@/app/PublicNav'
import HeroApp from '@/app/HeroApp'
import Motion from '@/app/Motion'
import DemoSite from '@/app/DemoSite'
import DemoGestion from '@/app/DemoGestion'
import DemoChiffres from '@/app/DemoChiffres'
import DemoCompta from '@/app/DemoCompta'
import MaquetteForm from '@/app/MaquetteForm'
import Onglets from '@/components/ui/Onglets'
import Slides from '@/components/ui/Slides'
import { METIERS } from '@/lib/agents/acquisition/contrat'
import { FLAGS, actif } from '@/lib/flags'
import { AUTOMATISATION, ESSAI_JOURS, OFFRES, PLANS, offreMinimale } from '@/lib/plans'
import { SITE_A_LA_DEMANDE } from '@/lib/siteCommande'
import { FAQ } from '@/lib/faq'
import { TOUTES_SCENES } from '@/lib/demoScenes'

const OFFRE_CHIFFRES = (() => { const o = offreMinimale('chiffres'); return o ? PLANS[o].label : '' })()
const OFFRE_PLATEFORME = (() => { const o = offreMinimale('plateforme.conversation'); return o ? PLANS[o].label : '' })()
const PRIX_MIN = Math.min(...OFFRES.map((o) => o.prix))
const scene = (image: string) => TOUTES_SCENES.find((s) => s.image === image)

/* Icônes (traits, jamais d'emoji). */
const I = {
  zap: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  badge: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l2.4 1.8 3 .2.2 3L19.4 9l-1.8 2.4 1.8 2.4-1.8 2.6-.2 3-3 .2L12 22l-2.4-1.8-3-.2-.2-3L4.6 14 6.4 12 4.6 9.6l1.8-2.6.2-3 3-.2z" /><path d="M9 12l2 2 4-4" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M21 12h-6a2 2 0 0 0 0 4h6v-4z" /></svg>,
  serrure: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 15v2" /></svg>,
  oeilBarre: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.8" /><path d="M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.7-1.2" /><path d="m2 2 20 20" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>,
  registre: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z" /><path d="M8 7h8M8 11h8M8 15h5" /></svg>,
  stop: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></svg>,
  repeat: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>,
}

// « Pour qui » : les mêmes quatre demandes TYPES que la landing actuelle (app/page.tsx), écrites pour l'exemple.
const POUR_QUI: { id: string; metier: string; demande: string; regle: string }[] = [
  { id: 'plombier', metier: 'Plombier-chauffagiste', demande: 'Mon chauffe-eau ne chauffe plus depuis hier soir.', regle: "Elle arrive quand vous êtes sous un évier. La réponse est prête dans votre ton : vous l'envoyez entre deux interventions, avant qu'il appelle un autre plombier." },
  { id: 'electricien', metier: 'Électricien', demande: 'Je vends ma maison, il faut remettre le tableau aux normes.', regle: "La réponse préparée pose les questions qui manquent, puis le devis se prépare sur vos prix. Vous relisez avant d'envoyer." },
  { id: 'menuisier', metier: 'Menuisier', demande: "Un escalier en chêne pour remplacer l'ancien, c'est possible ?", regle: "Le devis sur mesure, c'est souvent le soir, après le chantier. Presti le prépare sur vos prix : vous l'ajustez, vous l'envoyez." },
  { id: 'couvreur', metier: 'Couvreur', demande: 'Il manque des tuiles depuis le coup de vent, vous pouvez venir voir ?', regle: "Votre réponse envoyée, trois relances sont prévues (J+2, J+5, J+10) : le client n'est pas oublié pendant que vous êtes sur un toit." },
]

// « Comment ça marche » : les quatre étapes de la chaîne (texte inchangé) ; à droite, la capture du vrai produit de la même
// heure (lib/demoScenes.ts) et le fragment d'interface d'exemple qui l'accompagnait.
const CHAINE: { id: string; heure: string; titre: string; texte: string; image: string; fragment: ReactNode }[] = [
  {
    id: 'demande', heure: '22 h 14', titre: 'La demande arrive.', image: '/demo/scene-1.webp',
    texte: 'Par votre lien, sur votre fiche Google, votre page Facebook ou votre signature mail. Le client écrit le soir, vous êtes encore sur le chantier : elle vous attend dans Presti.',
    fragment: <div className="lp-cpv lp-cpv-msg"><span className="lp-cpv-chip">Nouvelle demande · exemple</span><p>Bonjour, mon chauffe-eau ne chauffe plus depuis hier soir. Vous pouvez passer cette semaine&nbsp;?</p><em>Mme Garnier</em></div>,
  },
  {
    id: 'reponse', heure: '22 h 15', titre: 'La réponse est prête.', image: '/demo/scene-2.webp',
    texte: "Prête en moins d'une minute, dans votre ton. Elle pose les questions qui manquent, sans inventer de prix ni de créneau. Vous la relisez, vous l'envoyez.",
    fragment: <div className="lp-cpv lp-cpv-rep"><span className="lp-cpv-chip ia">Préparée par l&apos;IA · à relire</span><p>Bonjour Madame Garnier, merci pour votre message. Pour bien préparer mon passage&nbsp;: de quelle marque est votre chauffe-eau, et quelle est sa capacité&nbsp;?</p><b>Envoyer</b></div>,
  },
  {
    id: 'devis', heure: '7 h 31', titre: 'Le devis, sur vos prix.', image: '/demo/scene-3.webp',
    texte: "Presti le chiffre à partir de vos tarifs. Vous ajustez une ligne si besoin, le PDF conforme part au client, qui l'accepte en ligne.",
    fragment: <div className="lp-cpv lp-cpv-devis"><span className="lp-cpv-chip">Devis · exemple fictif</span><ul><li><span>Chauffe-eau 200 L</span><i /></li><li><span>Groupe de sécurité</span><i /></li><li><span>Dépose de l&apos;ancien appareil</span><i /></li><li><span>Main-d&apos;œuvre</span><i /></li></ul><p><span>Total TTC</span><b>1 240,00 €</b></p></div>,
  },
  {
    // Les relances sont celles de la CONVERSATION (lib/relances.ts), armées par la réponse ou le devis envoyé (13/10).
    id: 'ensuite', heure: 'Ensuite', titre: 'Relances, facture, compta.', image: '/demo/scene-4.webp',
    texte: "Trois relances prévues (J+2, J+5, J+10) après la réponse au client, la facture en un clic quand il accepte, et vos fichiers de compta rangés par l'IA.",
    fragment: <div className="lp-cpv lp-cpv-fil"><span className="lp-cpv-chip">Ce qui suit</span><ol><li className="ok">Relances J+2, J+5, J+10 planifiées</li><li className="ok">Devis accepté</li><li className="ok">Facture émise</li><li className="ok">Compta rangée</li></ol></div>,
  },
]

/** Une capture du vrai produit (lib/demoScenes.ts), avec sa légende — dimensions posées : aucun saut de mise en page. */
function Capture({ image, legende = true }: { image: string; legende?: boolean }) {
  const s = scene(image)
  if (!s) return null
  const tel = s.appareil === 'telephone'
  return (
    <figure className={`lp2-capture${tel ? ' tel' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image} srcSet={tel ? `${s.image.replace(/\.webp$/, '-390.webp')} 390w, ${s.image.replace(/\.webp$/, '-520.webp')} 520w, ${s.image} 780w` : undefined}
        sizes={tel ? '(max-width:900px) 46vw, 260px' : undefined} width={tel ? 780 : 1400} height={tel ? 1688 : 875} alt="" loading="lazy" decoding="async" style={{ objectPosition: s.focus }} />
      {legende ? <figcaption><span className="lp2-heure">{s.heure}</span><b>{s.titre}</b><span>{s.texte}</span></figcaption> : null}
    </figure>
  )
}

export default function LandingV2() {
  const faqCourte = [0, 4, 5, 6, 7].map((k) => FAQ[k]).filter(Boolean)
  const gestion = FLAGS.assistant && FLAGS.crm
  const onglets = [
    ...(gestion ? [{
      id: 'gestion', libelle: 'Assistant et CRM',
      contenu: (
        <div className="lp2-onglet">
          <DemoGestion />
          <div className="lp2-captures">
            {['/demo/scene-8.webp', '/demo/scene-9.webp'].map((im) => <Capture key={im} image={im} />)}
          </div>
        </div>
      ),
    }] : []),
    {
      id: 'chiffres', libelle: 'Vos chiffres',
      contenu: (
        <div className="lp2-onglet">
          <div className="lp-head2 c"><span className="lp-kick">Fin de mois</span><h3 className="lp2-h3">Vos chiffres, sans tableur.</h3><p>Ce que vous avez facturé, ce qui est encaissé, ce qui traîne, les devis à relancer. Calculé à partir de vos devis et de vos factures : rien à saisir. Dès l&apos;offre {OFFRE_CHIFFRES}.</p></div>
          <DemoChiffres />
        </div>
      ),
    },
    {
      id: 'compta', libelle: 'Comptabilité',
      contenu: (
        <div className="lp2-onglet lp-clair lp2-clair">
          <div className="lp-head2 c"><span className="lp-kick">Comptabilité</span><h3 className="lp2-h3">Votre compta, rangée par l&apos;IA.</h3><p>Déposez vos relevés et vos Excel tels quels, même en désordre. L&apos;IA comprend les colonnes, écarte les lignes de total, classe les dépenses. Les montants, eux, sont calculés, jamais devinés. Dès l&apos;offre {OFFRE_CHIFFRES}.</p></div>
          <DemoCompta />
        </div>
      ),
    },
    ...(FLAGS.landingDemoSite ? [{
      id: 'site', libelle: 'Votre site',
      contenu: (
        <div className="lp2-onglet">
          <DemoSite />
          {actif('siteCommandeVente') ? <div className="lp2-captures un"><Capture image="/demo/scene-5.webp" /></div> : null}
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="lp lp2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        // Google veut voir à l'écran ce que le balisage décrit : les CINQ questions affichées ici ; les dix sont sur /faq.
        mainEntity: faqCourte.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.reponse } })),
      }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Presti', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: 'https://prestiapp.fr',
        description: "Dès l'offre Studio, chaque demande faite par votre lien arrive dans Presti : la réponse est prête en moins d'une minute, dans votre ton. Vous l'envoyez.",
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: 'Essai gratuit' },
        provider: { '@type': 'Organization', name: 'Presti', url: 'https://prestiapp.fr' },
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', '@id': 'https://prestiapp.fr/#org', name: 'Presti', url: 'https://prestiapp.fr', logo: { '@type': 'ImageObject', url: 'https://prestiapp.fr/marque/presti-icone-512.png', width: 512, height: 512 } },
          { '@type': 'WebSite', '@id': 'https://prestiapp.fr/#site', url: 'https://prestiapp.fr', name: 'Presti', inLanguage: 'fr-FR', publisher: { '@id': 'https://prestiapp.fr/#org' } },
        ],
      }) }} />

      <Motion />
      <PublicNav accueil v2 />

      <main>
        {/* L1 · HÉROS — promesse, pastilles, démo produit dans le premier écran */}
        <section className="lp2-hero">
          <div className="container lp2-hero-in">
            <div className="lp2-hero-texte">
              <span className="lp-eyebrow"><b />Assistant IA pour les artisans du bâtiment</span>
              <h1>Le premier qui répond <span className="g">décroche le chantier.</span></h1>
              <p className="lp2-lede">Chaque demande faite par votre lien a sa réponse prête en moins d&apos;une minute, dans votre ton : vous l&apos;envoyez (dès l&apos;offre {OFFRE_PLATEFORME}). Puis le devis sur vos prix et la facture, dès l&apos;offre {PLANS.essentiel.label}.</p>
              <div className="lp2-cta">
                <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
                <a className="lp-btn lp-btn--g lp-btn--lg" href="#comment">Voir comment ça marche</a>
              </div>
              <p className="lp-trust">3 crédits offerts · sans carte bancaire · ensuite dès {PRIX_MIN} € par mois, sans engagement</p>
              <ul className="lp2-pastilles" aria-label="En bref">
                <li><span className="i">{I.zap}</span><b>Rapide</b><em>Réponse prête en moins d&apos;une minute : vous l&apos;envoyez (dès {OFFRE_PLATEFORME})</em></li>
                <li><span className="i">{I.badge}</span><b>Fiable</b><em>Devis conformes, dans votre ton</em></li>
                <li><span className="i">{I.shield}</span><b>Sécurisé</b><em>Vos données isolées, chiffrées</em></li>
                <li><span className="i">{I.wallet}</span><b>Sans carte</b><em>Essai offert, résiliable</em></li>
              </ul>
              <p className="sr-only">Presti prépare la réponse, chiffre le devis, facture, relance le client et range la compta. Vous relisez avant d’envoyer.</p>
            </div>
            <div className="lp2-hero-scene">
              <div className="lp-stage">
                <div className="lp-tilt"><HeroApp /></div>
                <span className="lp-puce p1" aria-hidden="true"><i />Devis PDF prêt</span>
                <span className="lp-puce p2" aria-hidden="true"><i />Relance J+2 planifiée</span>
                <span className="lp-puce p3" aria-hidden="true"><i />Facture en un clic</span>
              </div>
            </div>
          </div>
        </section>

        {/* L2 · PREUVE */}
        <section className="lp-blk lp-proof lp2-preuve reveal">
          <div className="container lp-proof-in">
            <div className="lp-bignum count" data-to="7" data-suffix="×">7×</div>
            <div>
              <p>plus de chances d&apos;obtenir un vrai échange avec le client en répondant dans l&apos;heure plutôt qu&apos;en attendant. Avec la plateforme (dès l&apos;offre {OFFRE_PLATEFORME}), Presti prépare la réponse dans votre ton en moins d&apos;une minute ; vous l&apos;envoyez.</p>
              <div className="src">Source : Harvard Business Review, « The Short Life of Online Sales Leads » (étude sur 2 241 entreprises)</div>
            </div>
          </div>
        </section>

        {/* L3 · COMMENT ÇA MARCHE — slides épinglées (ordinateur), pas-à-pas (téléphone) */}
        <section className="lp-blk lp2-ccm" id="comment">
          <div className="container">
            <div className="lp-head2 c reveal">
              <span className="lp-kick">Comment ça marche</span>
              <h2>De la demande à la compta, sans rien ressaisir.</h2>
              <p>L&apos;IA prépare chaque étape. Vous relisez, vous envoyez. La plateforme (la demande qui arrive, la réponse prête, les relances) commence avec l&apos;offre {OFFRE_PLATEFORME} ; le devis et la facture, dès {PLANS.essentiel.label}. Un client écrit le soir ; le lendemain matin, vous lancez le devis d&apos;un clic (avec Signature, une règle l&apos;a déjà préparé), il l&apos;accepte. Des scènes prises sur le vrai produit.</p>
            </div>
            <div className="lp2-scene-cadre">
              <Slides etiquette="Comment ça marche, en quatre étapes" etapes={CHAINE.map((e) => ({
                id: e.id, sur: e.heure, titre: e.titre, texte: e.texte,
                visuel: <div className="lp2-visuel"><Capture image={e.image} />{e.fragment}</div>,
              }))} />
              <small className="dm-note lp2-note">Captures du produit réel : rien n’est dessiné. Les fragments d’interface sont des exemples fictifs.</small>
            </div>
          </div>
        </section>

        {/* L4 · FONCTIONNALITÉS — onglets ; #chiffres et #compta ouvrent leur onglet */}
        <section className="lp-blk lp2-fonc" id="fonctionnalites">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Fonctionnalités</span><h2>Tout ce qui suit la demande, au même endroit.</h2></div>
            <Onglets etiquette="Fonctionnalités" ancres onglets={onglets} className="lp2-onglets" />
          </div>
        </section>

        {/* L5 · POUR QUI — sélecteur de métier */}
        <section className="lp-blk lp2-pourqui" id="pour-qui">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Pour qui</span><h2>Pour l&apos;artisan qui est sur le chantier quand le client écrit.</h2><p>Quatre métiers, quatre demandes types, écrites pour l&apos;exemple : ce ne sont pas des clients.</p></div>
            <Onglets etiquette="Choisissez votre métier" className="ui-onglets--pastilles lp2-metiers" onglets={POUR_QUI.map((c) => ({
              id: c.id, libelle: c.metier,
              contenu: <div className="lp2-metier"><span className="lp2-metier-sur">Demande type · exemple</span><q>{c.demande}</q><p>{c.regle}</p></div>,
            }))} />
          </div>
        </section>

        {/* L6 · CONFIANCE — même drapeau que la fonctionnalité qui la tient */}
        {FLAGS.supportArtisan ? (
          <section className="lp-blk lp2-confiance" id="confiance">
            <div className="container">
              <div className="lp-head2 c reveal"><span className="lp-kick">Et nous, on voit quoi&nbsp;?</span><h2>Rien. Sauf si vous ouvrez vous-même.</h2><p>Vos clients vous écrivent des choses qu&apos;ils ne diraient pas à un inconnu. Voilà ce que Presti s&apos;interdit, et comment.</p></div>
              <div className="lp2-bento reveal-kids">
                <div className="lp-cc lp-spot lp2-tuile-l"><span className="i">{I.serrure}</span><b>La porte naît fermée</b><em>Pour qu&apos;on regarde un devis, il faut <b>votre</b> clic. Une heure, puis elle se referme seule. Personne chez Presti ne peut l&apos;ouvrir à votre place.</em></div>
                <div className="lp-cc lp-spot"><span className="i">{I.oeilBarre}</span><b>La forme, jamais le fond</b><em>On voit qu&apos;un devis a sept lignes et un total. Jamais le nom de votre client, jamais vos échanges, jamais vos photos.</em></div>
                <div className="lp-cc lp-spot"><span className="i">{I.registre}</span><b>Chaque coup d&apos;œil est écrit</b><em>Qui a regardé, quoi, à quelle minute. Dans <b>votre</b> espace, pas seulement dans le nôtre. Et ça part avec vos données quand vous les exportez.</em></div>
                <div className="lp-cc lp-spot lp2-tuile-l"><span className="i">{I.stop}</span><b>Un verrou, si vous préférez</b><em>«&nbsp;Ne plus jamais me demander.&nbsp;» Un bouton, et la demande n&apos;arrive même plus jusqu&apos;à vous.</em></div>
              </div>
              <p className="lp-conf-fin reveal">Ce n&apos;est pas un paragraphe dans des conditions générales.<b> C&apos;est du code, et il refuse.</b> <a href="/confidentialite">Comment nous traitons vos données</a></p>
            </div>
          </section>
        ) : null}

        {/* L7 · TARIFS — l'essentiel ici ; le détail sur /offres, le comparatif sur /comparatif */}
        <section className="lp-blk lp2-tarifs" id="tarifs">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Abonnements</span><h2>Simple : un forfait mensuel, avec des crédits inclus.</h2><p>Chaque formule vous donne des crédits chaque mois ; il n&apos;y a pas de recharge à l&apos;unité. Vous montez en formule quand votre activité grandit.</p></div>
            <div className="lp-plans lp2-plans reveal-kids">
              {OFFRES.map((o) => (
                <div key={o.id} className={`lp-plan lp-spot${o.id === 'studio' ? ' lp-plan--feat' : ''}`}>
                  <div className="lp-pn">{o.label}</div>
                  <div className="lp-pp">{o.prix}€<small>par mois</small></div>
                  <div className="lp-credits"><b>{o.credits}</b>&nbsp;crédits / mois</div>
                  <div className="lp-essai" data-essai-gratuit={o.id}><b>{ESSAI_JOURS[o.id]} jours gratuits, sans carte</b></div>
                  <div className="lp-tva">TVA non applicable, art. 293 B du CGI</div>
                  <div className="lp-for">{o.accroche}</div>
                  <p className="lp2-auto"><b>Automatisation :</b> {AUTOMATISATION[o.id]}</p>
                  <a className="lp2-detail" href={`/offres#${o.id}`}>Tout ce qu’inclut l’offre {o.label} →</a>
                  <a className={`lp-btn ${o.id === 'studio' ? 'lp-btn--p' : 'lp-btn--g'}`} href="/signup">Essayer {ESSAI_JOURS[o.id]} jours gratuits</a>
                  <a className="lp-pay" href={`/signup?abonnement=${o.id}`} data-payer-direct={o.id}>Ou vous abonner directement, sans essai</a>
                </div>
              ))}
            </div>
            <div className="lp-trial reveal"><b>Essai gratuit</b><em>3 crédits offerts (3 devis chiffrés par l&apos;IA sur vos prix) pour juger la qualité avant de payer. Sans carte. L&apos;essai n&apos;inclut pas la plateforme de conversation, qui commence avec l&apos;offre {OFFRE_PLATEFORME}.</em></div>
            <details className="lp2-credits">
              <summary>Comment marchent les crédits</summary>
              <div className="lp-howcredits">
                <div className="lp-hc lp-spot"><span className="ic">{I.zap}</span><b>1 crédit = 1 génération</b><span>Chaque réponse préparée pour un client (une par message qu&apos;il vous écrit), un devis chiffré par l&apos;IA ou un dépôt de fichiers de compta. Une recherche chez vos fournisseurs : 2 crédits (3 avec Expert).</span></div>
                <div className="lp-hc lp-spot"><span className="ic">{I.badge}</span><b>Modèle Expert = 3 crédits</b><span>L&apos;IA la plus puissante consomme plus : réservez-la aux gros chantiers.</span></div>
                <div className="lp-hc lp-spot"><span className="ic">{I.repeat}</span><b>Rechargés chaque mois</b><span>Vos crédits se réinitialisent à chaque renouvellement. Non reportés au mois suivant.</span></div>
              </div>
            </details>
            <p className="lp-pnote">1 crédit = 1 génération (réponse, devis, compta) · recherche fournisseurs = 2 crédits · Expert = 3 crédits · crédits rechargés chaque mois (non reportés) · sans engagement · essai gratuit : une fois par compte, crédits de l’essai proportionnels à sa durée</p>
            {actif('siteCommandeVente') && (
              <div className="lp-site reveal lp-spot">
                <h3>{SITE_A_LA_DEMANDE.titre}</h3>
                {SITE_A_LA_DEMANDE.phrases.map((p, i) => <p key={i}>{p}</p>)}
                <div className="lp-site-cta"><a className="lp-btn lp-btn--g" href={SITE_A_LA_DEMANDE.lien}>{SITE_A_LA_DEMANDE.bouton}</a></div>
              </div>
            )}
            <div className="lp2-liens-tarifs" id="comparatif">
              <p>Ce que Presti fait de plus que les logiciels de devis et factures : la demande qui arrive, et la gestion par la conversation. Les mêmes critères pour tous, lus sur le site de chaque éditeur.</p>
              <div><a className="lp-btn lp-btn--g" href="/offres">Voir le comparatif détaillé des offres</a><a className="lp-btn lp-btn--g" href="/comparatif">Comparer avec les autres logiciels</a></div>
            </div>
          </div>
        </section>

        {/* L8 · MAQUETTE OFFERTE — le formulaire, inchangé sur le fond */}
        {actif('prospectsEntrant') ? (
          <section className="lp-blk" id="maquette">
            <div className="container">
              <div className="lp-mq reveal">
                <div className="lp-mq-texte">
                  <span className="lp-kick">Pas encore prêt à essayer&nbsp;?</span>
                  <h2>Recevez la maquette de votre site.</h2>
                  <p>Donnez votre activité et votre site actuel ou votre compte Instagram : l&apos;assistant IA de Presti prépare une maquette de site pour votre entreprise et vous l&apos;envoie à l&apos;adresse que vous indiquez, sans délai garanti. Gratuit, sans compte, sans carte.</p>
                  <p className="lp-mq-note">Une seule demande par entreprise. Vous pouvez refuser toute suite en répondant STOP.</p>
                </div>
                <MaquetteForm metiers={METIERS.map((m) => ({ id: m.id, libelle: m.libelle }))} />
              </div>
            </div>
          </section>
        ) : null}

        {/* L9 · QUESTIONS — cinq, les dix sur /faq */}
        <section className="lp-blk" id="questions">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Avant d&apos;essayer</span><h2>Les questions qu&apos;on nous pose.</h2></div>
            <div className="lp-faq">
              {faqCourte.map((f) => (
                <details className="faq-item" key={f.question}>
                  <summary>{f.question}</summary>
                  <div className="faq-a">{f.reponse}</div>
                </details>
              ))}
              <p className="lp-faq-plus"><a href="/faq">Toutes les questions</a></p>
            </div>
          </div>
        </section>

        {/* L10 · APPEL FINAL */}
        <section className="lp-blk lp-final lp2-final reveal">
          <div className="container">
            <h2>Le prochain client qui vous cherche,<br /><span className="g">ne le laissez pas filer.</span></h2>
            <p>3 devis offerts, chiffrés par l&apos;IA sur vos prix, sans carte bancaire. Vous jugez la qualité avant de payer quoi que ce soit.</p>
            <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
            {actif('prospectsEntrant') ? <p className="lp-final-alt"><a href="#maquette">Ou recevoir d&apos;abord la maquette de mon site</a></p> : null}
          </div>
        </section>
      </main>

      <PublicPied accueil v2 />
    </div>
  )
}
