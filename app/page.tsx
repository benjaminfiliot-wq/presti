import '@/app/globals.css'
import '@/app/accueil.css'
import PublicPied from '@/app/PublicPied'
import PublicNav from '@/app/PublicNav'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import HeroApp from '@/app/HeroApp'
import Motion from '@/app/Motion'
import ObjetVivant from '@/app/ObjetVivant'
import BandeMots from '@/app/BandeMots'
import DemoSequence from '@/app/DemoSequence'
import DemoVideo from '@/app/DemoVideo'
import DemoSite from '@/app/DemoSite'
import DemoGestion from '@/app/DemoGestion'
import DemoChiffres from '@/app/DemoChiffres'
import MaquetteForm from '@/app/MaquetteForm'
import { METIERS } from '@/lib/agents/acquisition/contrat'
import { FLAGS, actif } from '@/lib/flags'
import Comparatif from '@/app/Comparatif'
import ComparatifConcurrents from '@/app/ComparatifConcurrents'
import OffreDetail from '@/app/OffreDetail'
import { OFFRES, ESSAI_JOURS, PLANS, offreMinimale } from '@/lib/plans'
import { SITE_A_LA_DEMANDE } from '@/lib/siteCommande'
import { FAQ } from '@/lib/faq'

// Google Search Console : la balise de vérification n'est posée QUE sur la landing — jamais sur
// /site ni /p, qui vivent sur le domaine de l'artisan (marque blanche).
//
// 27/10 (SEO « devis ») : le titre et la description de l'ACCUEIL portent enfin la requête visée (« logiciel de devis artisan ») ;
// le layout racine garde les siens pour les pages sans titre. `absolute` : pas de suffixe « · Presti », le nom est déjà en tête.
// 02/11 (Benj) : la landing dit ce que Presti apporte (« les bénéfices, pas les features ») : un assistant qui tient le bureau.
// La requête du 27/10 reste en tête du titre.
export const metadata: Metadata = {
  title: { absolute: 'Presti — Logiciel de devis artisan : votre assistant tient le bureau' },
  description: 'Chaque demande faite par votre lien a sa réponse prête en moins d’une minute, puis son devis sur vos prix, ses relances et sa facture.',
  alternates: { canonical: '/' },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
}

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

// 15/10 (Benj) : « Mes chiffres » (et sa compta) commencent avec une offre — la landing la nomme, lue dans lib/plans.ts, jamais recopiée.
const OFFRE_CHIFFRES = (() => { const o = offreMinimale('chiffres'); return o ? PLANS[o].label : '' })()
// 15/10 (Benj) : « La plateforme n'est disponible qu'à partir de Studio » — la landing nomme l'offre, lue dans lib/plans.ts, jamais recopiée.
const OFFRE_PLATEFORME = (() => { const o = offreMinimale('plateforme.conversation'); return o ? PLANS[o].label : '' })()
// 25/10 (Benj) : deux offres. Studio prépare tout et l'artisan valide ; l'offre qui envoie seule (réponse, relances) se lit dans
// lib/plans.ts (capacité `plateforme.ia.auto`), jamais recopiée.
const OFFRE_AUTO = (() => { const o = offreMinimale('plateforme.ia.auto'); return o ? PLANS[o].label : '' })()
// Le prix d'appel se lit dans la grille (lib/plans.ts), jamais recopié à la main.
const PRIX_MIN = Math.min(...OFFRES.map((o) => o.prix))

// 02/11 (Benj) : l'offre sur mesure se nomme par lib/plans.ts, jamais recopiée ; elle mène au contact, sans démonstration.
const OFFRE_ENTREPRISE = PLANS.entreprise.label

// « La chaîne complète » : quatre étapes, quatre cartes empilées. Les heures reprennent la démonstration plus bas
// (« de 22 h 14 à 7 h 52 »). Les visuels sont des fragments d'interface en code, pas des captures : aucun montant
// sauf celui de l'exemple fictif (M. Leroy, lib/compta-exemple.ts), et l'écran dit que c'est un exemple.
const CHAINE: { heure: string; titre: string; texte: string; visuel: ReactNode }[] = [
  {
    heure: '22 h 14',
    titre: 'Le client écrit le soir.',
    texte: 'Par votre lien, sur votre fiche Google, votre page Facebook ou votre signature mail. Le client écrit le soir, vous êtes encore sur le chantier : elle vous attend dans Presti.',
    visuel: <div className="lp-cpv lp-cpv-msg"><span className="lp-cpv-chip">Nouvelle demande · exemple</span><p>Bonjour, mon chauffe-eau ne chauffe plus depuis hier soir. Vous pouvez passer cette semaine&nbsp;?</p><em>Mme Garnier</em></div>,
  },
  {
    heure: '22 h 15',
    titre: 'Sa réponse est prête avant qu’il appelle ailleurs.',
    texte: `Prête en moins d'une minute, dans votre ton. Elle pose les questions qui manquent, sans inventer de prix ni de créneau. Validée d'un clic, ou envoyée seule avec ${OFFRE_AUTO}.`,
    visuel: <div className="lp-cpv lp-cpv-rep"><span className="lp-cpv-chip ia">Préparée par l&apos;IA · à relire</span><p>Bonjour Madame Garnier, merci pour votre message. Pour bien préparer mon passage&nbsp;: de quelle marque est votre chauffe-eau, et quelle est sa capacité&nbsp;?<span className="lp-curseur" /></p><b>Envoyer</b></div>,
  },
  {
    heure: '7 h 31',
    titre: 'Le devis est prêt le matin, pas le dimanche soir.',
    texte: "Votre assistant le chiffre à partir de vos tarifs, jamais d'un prix deviné. Vous ajustez une ligne si besoin, le PDF conforme part au client, qui l'accepte en ligne.",
    visuel: <div className="lp-cpv lp-cpv-devis"><span className="lp-cpv-chip">Devis · exemple fictif</span><ul><li><span>Chauffe-eau 200 L</span><i /></li><li><span>Groupe de sécurité</span><i /></li><li><span>Dépose de l&apos;ancien appareil</span><i /></li><li><span>Main-d&apos;œuvre</span><i /></li></ul><p><span>Total TTC</span><b>1 240,00 €</b></p></div>,
  },
  {
    heure: 'Ensuite',
    // (13/10) Les relances sont celles de la CONVERSATION (lib/relances.ts) : armées par la réponse envoyée ou le devis envoyé
    // depuis la conversation (app/api/messages, app/api/devis/[id]/envoyer). Le fil montrait « Facture émise » puis « Relance J+2 » : il
    // laissait croire à des relances de facture impayée, qui n'existent pas (audit des promesses, produit, ligne 90).
    titre: 'Rien ne tombe entre deux chantiers.',
    texte: "Trois relances prévues (J+2, J+5, J+10) après la réponse au client, la facture en un clic quand il accepte, et vos fichiers de compta rangés par l'IA.",
    visuel: <div className="lp-cpv lp-cpv-fil"><span className="lp-cpv-chip">Ce qui suit</span><ol><li className="ok">Relances J+2, J+5, J+10 planifiées</li><li className="ok">Devis accepté</li><li className="ok">Facture émise</li><li className="ok">Compta rangée</li></ol></div>,
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
              "Chaque demande faite par votre lien a sa réponse prête en moins d'une minute : avec Studio, vous la validez d'un clic ; avec Signature, elle part seule.",
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

      <Motion />

      <PublicNav accueil />

      <main>
        {/* HERO */}
        <section className="lp-hero">
          {/* L'objet vivant (refonte du 11/10, d'après les sites de référence) : un anneau de plasma en WebGL qui
              respire, suit la souris et s'ouvre au défilement. Il démarre après le texte et se met en pause hors écran. */}
          <ObjetVivant className="lp-objet" />
          <span className="lp-objet-fondu" aria-hidden="true" />
          <div className="container">
            <span className="lp-eyebrow"><b />Assistant IA pour les artisans du bâtiment</span>
            {/* 02/11 (Benj) : ce que Presti apporte d'abord — le bureau tenu pendant que l'artisan est sur le chantier ; l'artisan valide
                (Studio) ou laisse partir (Signature). « Assistant », pas « agents IA » (Benj, 03/11 à 0 h 45). */}
            <h1>Votre assistant tient le bureau. <span className="g">Vous, le chantier.</span></h1>
            {/* Deux versions de la même promesse : en 390 px, la longue faisait 6 lignes et repoussait l'appel à l'action
                (mesure du 06/10). La courte tient en deux lignes ; la longue reste sur les écrans larges. */}
            <p className="lp-lede">
              <span className="lp-lede-court">Chaque demande faite par votre lien a sa réponse prête en moins d&apos;une minute. Vous validez d&apos;un clic, ou tout part seul avec {OFFRE_AUTO}.</span>
              <span className="lp-lede-long">Fini les demandes qui attendent et les devis du dimanche soir. Une demande arrive par votre lien (Google, Facebook, votre signature mail) : votre assistant prépare la réponse dans votre ton en moins d&apos;une minute, chiffre le devis sur vos prix, relance le client (J+2, J+5, J+10) et prépare la facture. Avec {OFFRE_PLATEFORME}, tout est prêt et vous validez d&apos;un clic ; avec {OFFRE_AUTO}, tout part seul. Jamais un prix estimé ni un paiement sans vous.</span>
            </p>
            <div className="lp-cta">
              <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
              <a className="lp-btn lp-btn--g lp-btn--lg" href="#fonctionnalites">Voir votre assistant travailler</a>
            </div>
            <p className="lp-trust">3 crédits offerts · sans carte bancaire · ensuite dès {PRIX_MIN} € par mois, sans engagement</p>
          </div>
          <div className="container">
            <div className="lp-stage">
              <div className="lp-tilt"><HeroApp /></div>
              {/* Ce qui suit la réponse, en étiquettes autour de la scène (bureau seulement). Aucun chiffre, aucune durée. */}
              <span className="lp-puce p1" aria-hidden="true"><i />Devis PDF prêt</span>
              <span className="lp-puce p2" aria-hidden="true"><i />Relance J+2 planifiée</span>
              <span className="lp-puce p3" aria-hidden="true"><i />Facture en un clic</span>
            </div>
          </div>
        </section>

        <BandeMots />

        {/* RÉASSURANCE */}
        <section className="lp-blk" style={{ paddingTop: '1rem' }}>
          <div className="container">
            <div className="lp-reassure reveal-kids">
              <div className="lp-rc"><span className="i">{I.zap}</span><div><b>Rapide</b><em>Réponse prête en moins d&apos;une minute : validée d&apos;un clic, ou envoyée seule avec {OFFRE_AUTO}</em></div></div>
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
            <p>plus de chances d&apos;obtenir un vrai échange avec le client en répondant dans l&apos;heure plutôt qu&apos;en attendant. Votre assistant prépare la réponse dans votre ton en moins d&apos;une minute : avec {OFFRE_PLATEFORME}, vous la validez d&apos;un clic ; avec {OFFRE_AUTO}, elle part seule, jour et nuit.</p>
            <div className="src">Source : Harvard Business Review, « The Short Life of Online Sales Leads » (étude sur 2 241 entreprises)</div>
            </div>
          </div>
        </section>

        {/* LA CHAÎNE — quatre cartes qui s'empilent au défilement (position: sticky, aucun script). Chaque étape dit
            qui fait quoi : l'IA prépare, l'artisan relit et envoie (mode assisté par défaut, lib/plateformeConfig.ts) ; en Signature (25/10),
            la réponse et les relances partent seules (capacité `plateforme.ia.auto`, modeEffectif). */}
        <section className="lp-blk lp-chaine" id="comment">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Ce que fait votre assistant</span><h2>De la demande à la compta, votre assistant s&apos;en charge.</h2><p>Avec {OFFRE_PLATEFORME}, il prépare chaque étape (la réponse, le devis sur vos prix, les relances) et rien ne part sans votre clic. Avec {OFFRE_AUTO}, les réponses et les relances partent seules{FLAGS.piloteAutomatique ? <>, et le Pilote automatique envoie ce que vous lui confiez après 10 minutes pour annuler</> : null}. Jamais un prix estimé, jamais un paiement sans vous.</p></div>
            <ol className="lp-pile">
              {CHAINE.map((e, i) => (
                <li key={e.titre} className="lp-carte-pile" style={{ ['--i' as string]: i }}>
                  <div className="lp-cp-texte">
                    <span className="lp-cp-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="lp-cp-heure">{e.heure}</span>
                    <h3>{e.titre}</h3>
                    <p>{e.texte}</p>
                  </div>
                  <div className="lp-cp-visuel" aria-hidden="true">{e.visuel}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FONCTIONNALITÉS : vitrine interactive (clique → la démo se joue) */}
        <section className="lp-blk" id="fonctionnalites">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>01</i>En vrai</span><h2>Ce qui se passe, de 22 h 14 à 7 h 52.</h2><p>Un client écrit le soir ; le lendemain matin, le devis se lance d&apos;un clic (avec Signature, une règle l&apos;a déjà préparé) et il l&apos;accepte. Des scènes prises sur le vrai produit. La plateforme de conversation commence avec l&apos;offre {OFFRE_PLATEFORME}.</p></div>
            {FLAGS.landingVideo ? <DemoVideo /> : <DemoSequence />}
            {FLAGS.assistant && FLAGS.crm ? <DemoGestion /> : null}
            {FLAGS.landingDemoSite ? <DemoSite /> : null}
          </div>
        </section>

        {/* VOS CHIFFRES — le tableau de bord de gestion (/chiffres), livré le 06/10 : le vrai écran,
            nourri par le vrai calcul, sur un artisan fictif (app/DemoChiffres.tsx). */}
        <section className="lp-blk" id="chiffres">
          <div className="container">
            {/* 02/11 (Benj, « plus court ») : la compta (le tableur de DemoCompta) tient en une phrase ici, plus en section à part. */}
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>02</i>Gestion</span><h2>Vous savez où vous en êtes, sans tableur.</h2><p>Ce que vous avez facturé, ce qui est encaissé, ce qui traîne, les devis à relancer : calculé à partir de vos devis et de vos factures, rien à saisir. Vos relevés et vos Excel, déposés tels quels, sont classés par l&apos;IA ; les montants sont calculés, jamais devinés. Dès l&apos;offre {OFFRE_CHIFFRES}.</p></div>
            <DemoChiffres />
          </div>
        </section>

        {/* CONFIANCE — ce qu'on s'interdit, et par quel mécanisme. Sous le même drapeau que la
            fonctionnalité : une promesse commerciale ne doit pas survivre à ce qui la tient. */}
        {FLAGS.supportArtisan ? (
          <section className="lp-blk lp-conf lp-clair" id="confiance">
            <div className="container">
              <div className="lp-head2 c reveal">
                <span className="lp-kick"><i>03</i>Et nous, on voit quoi&nbsp;?</span>
                <h2>Rien. Sauf si vous ouvrez vous-même.</h2>
                <p>Vos clients vous écrivent des choses qu&apos;ils ne diraient pas à un inconnu. Voilà ce que Presti s&apos;interdit, et comment.</p>
              </div>
              <div className="lp-conf-grid reveal-kids">
                <div className="lp-cc lp-spot"><span className="i">{I.serrure}</span><b>La porte naît fermée</b><em>Pour qu&apos;on regarde un devis, il faut <b>votre</b> clic. Une heure, puis elle se referme seule. Personne chez Presti ne peut l&apos;ouvrir à votre place.</em></div>
                <div className="lp-cc lp-spot"><span className="i">{I.oeilBarre}</span><b>La forme, jamais le fond</b><em>On voit qu&apos;un devis a sept lignes et un total. Jamais le nom de votre client, jamais vos échanges, jamais vos photos.</em></div>
                <div className="lp-cc lp-spot"><span className="i">{I.registre}</span><b>Chaque coup d&apos;œil est écrit</b><em>Qui a regardé, quoi, à quelle minute. Dans <b>votre</b> espace, pas seulement dans le nôtre. Et ça part avec vos données quand vous les exportez.</em></div>
                <div className="lp-cc lp-spot"><span className="i">{I.stop}</span><b>Un verrou, si vous préférez</b><em>«&nbsp;Ne plus jamais me demander.&nbsp;» Un bouton, et la demande n&apos;arrive même plus jusqu&apos;à vous.</em></div>
              </div>
              <p className="lp-conf-fin reveal">Ce n&apos;est pas un paragraphe dans des conditions générales.<b> C&apos;est du code, et il refuse.</b></p>
            </div>
          </section>
        ) : null}

        {/* TARIFS */}
        <section className="lp-blk" id="tarifs">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>04</i>Abonnements</span><h2>Choisissez ce que votre assistant fait seul.</h2><p>Avec {OFFRE_PLATEFORME}, il prépare tout et rien ne part sans votre clic. Avec {OFFRE_AUTO}, tout part seul. Pour une entreprise qui veut ses propres automatisations : {OFFRE_ENTREPRISE}, sur mesure. Chaque formule donne des crédits chaque mois ; il n&apos;y a pas de recharge à l&apos;unité.</p></div>

            {/* Les prix d'abord : mesuré le 06/10 en 390 px, l'explication des crédits (529 px) passait
                avant la première formule. Elle suit maintenant la grille. 02/11 (Benj, « trop d'informations sur les offres, pas assez sur
                l'entreprise ») : trois cartes côte à côte comme celles de claude.com, une ligne par groupe (OffreDetail court), et l'offre
                sur mesure à droite, sans prix, avec un contact. Le détail complet reste dans « Qui a quoi, ligne par ligne ». */}
            <div className="lp-plans lp-plans--3 reveal-kids">
              {OFFRES.map((o) => (
                <div key={o.id} className={`lp-plan lp-spot${o.id === 'studio' ? ' lp-plan--feat' : ''}`}>
                  <div className="lp-pn">{o.label}</div>
                  <div className="lp-pp">{o.prix}€<small>par mois</small></div>
                  <div className="lp-credits"><b>{o.credits}</b>&nbsp;crédits / mois</div>
                  <div className="lp-essai" data-essai-gratuit={o.id}><b>{ESSAI_JOURS[o.id]} jours gratuits, sans carte</b></div>
                  <div className="lp-tva">TVA non applicable, art. 293 B du CGI</div>
                  <div className="lp-for">{o.accroche}</div>
                  <OffreDetail id={o.id} classe="lp-plist" court />
                  <a className={`lp-btn ${o.id === 'studio' ? 'lp-btn--p' : 'lp-btn--g'}`} href="/signup">Essayer {ESSAI_JOURS[o.id]} jours gratuits</a>
                  <a className="lp-pay" href={`/signup?abonnement=${o.id}`} data-payer-direct={o.id}>Ou vous abonner directement, sans essai</a>
                </div>
              ))}
              {/* Ce que l'offre porte vraiment : l'autonomie de Signature, le suivi des clients et des automatisations adaptés à
                  l'entreprise (lib/plans.ts:15-16, :101), et la méthode du kit (plans/011-cadrage-01-11/p5-entreprise/kit/ : découverte,
                  matrice irritant → workflow, annexe d'autonomie). Les membres n'y sont pas nommés : rien ne les annonce avant leur
                  drapeau (lib/plans.ts:44). Aucun chiffre de gain, aucune démonstration (p5:42 ; Benj, 02/11). */}
              <div className="lp-plan lp-plan--ent lp-spot" data-offre="entreprise">
                <div className="lp-pn">{OFFRE_ENTREPRISE}</div>
                <div className="lp-pp lp-pp--mesure">Sur mesure</div>
                <div className="lp-credits">Prix sur devis</div>
                <div className="lp-for">Votre façon de travailler, automatisée de bout en bout, sur le même moteur que {OFFRE_AUTO}.</div>
                <div className="od od--court">
                  <p className="od-herite">Tout ce qu’inclut l’offre {OFFRE_AUTO}, <b>plus</b>&nbsp;:</p>
                  <ul className="lp-plist">
                    <li>Un atelier pour comprendre votre entreprise : vos clients, vos outils, vos règles</li>
                    <li>Vos automatisations, construites sur ce qui vous fait perdre du temps</li>
                    <li>Le suivi de vos clients et de vos chantiers, adapté à vos métiers</li>
                    <li>Vos outils reliés à votre assistant</li>
                    <li>Ce qui part seul, choisi avec vous, action par action</li>
                  </ul>
                </div>
                <a className="lp-btn lp-btn--g" href="/contact?sujet=entreprise">Nous contacter</a>
              </div>
            </div>

            {/* 02/11 (Benj) : plus d'explication sur l'offre sur mesure, en trois temps, tirés du kit Entreprise (mode A). */}
            <div className="lp-ent-temps reveal-kids">
              <div className="lp-et lp-spot"><span>1</span><b>On écoute</b><em>Un atelier sur votre façon de travailler : vos clients, vos outils, vos règles, et ce qui vous fait perdre du temps aujourd&apos;hui.</em></div>
              <div className="lp-et lp-spot"><span>2</span><b>On construit</b><em>Vos automatisations et le suivi de vos clients, sur le même moteur que {OFFRE_AUTO}, essayés sur des données d&apos;exemple avant le moindre envoi.</em></div>
              <div className="lp-et lp-spot"><span>3</span><b>Vous choisissez</b><em>Action par action, ce qui part seul et ce qui attend votre clic. Un prix estimé ou un paiement ne partent jamais seuls.</em></div>
            </div>
            <div className="lp-trial reveal"><b>Essai gratuit</b><em>3 crédits offerts (3 devis chiffrés par l&apos;IA sur vos prix) pour juger la qualité avant de payer. Sans carte. L&apos;essai n&apos;inclut pas la plateforme de conversation, qui commence avec l&apos;offre {OFFRE_PLATEFORME}.</em><a className="lp-btn lp-btn--g" href="/signup">Essayer</a></div>

            {/* Le tableau « qui a quoi » — la même matrice que les verrous serveur (lib/plans.ts).
                Replié par défaut : ouvert, il faisait 1 503 px en 390 px de large (mesure du 06/10). */}
            <div className="reveal lp-cmp">
              <details className="lp-cmp-pli">
                <summary>Qui a quoi, ligne par ligne</summary>
                <Comparatif />
              </details>
            </div>
            <p className="lp-pnote">1 crédit = 1 génération (réponse, devis, compta) · recherche fournisseurs = 2 crédits · Expert = 3 crédits · crédits rechargés chaque mois (non reportés) · sans engagement · essai gratuit : une fois par compte, crédits de l’essai proportionnels à sa durée</p>
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

        {/* COMPARATIF — Presti face aux autres logiciels de devis et factures : faits lus sur leurs sites, datés, mêmes critères
            pour tous (lib/comparatifConcurrents.ts ; art. L122-1 du Code de la consommation ; scripts/comparatif-qa.mjs). */}
        {/* 02/11 (Benj, « plus court ») : replié comme « Qui a quoi » ; le contenu reste dans la page, pour les moteurs de recherche. */}
        <section className="lp-blk" id="comparatif" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="reveal lp-cmp">
              <details className="lp-cmp-pli">
                <summary>Presti et les autres logiciels de devis et factures</summary>
                <p className="lp-cmp-intro">Les mêmes critères pour tous, lus sur le site de chaque éditeur. Les autres font très bien les devis et les factures ; Presti s&apos;occupe en plus de la demande qui arrive et de la gestion par la conversation.</p>
                <ComparatifConcurrents />
              </details>
            </div>
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
                  <p>Donnez votre activité et votre site actuel ou votre compte Instagram : l&apos;assistant IA de Presti prépare une maquette de site pour votre entreprise et vous l&apos;envoie à l&apos;adresse que vous indiquez, sans délai garanti. Gratuit, sans compte, sans carte.</p>
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
            <div className="lp-head2 c reveal"><span className="lp-kick"><i>05</i>Avant d&apos;essayer</span><h2>Les questions qu&apos;on nous pose.</h2></div>
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
          <ObjetVivant className="lp-objet lp-objet--final" />
          <div className="container">
            <h2>Le prochain client qui vous écrit,<br /><span className="g">sa réponse est déjà prête.</span></h2>
            <p>3 devis offerts, chiffrés par l&apos;IA sur vos prix, sans carte bancaire. Vous jugez la qualité avant de payer quoi que ce soit.</p>
            <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer gratuitement</a>
            {actif('prospectsEntrant') ? <p className="lp-final-alt"><a href="#maquette">Ou recevoir d&apos;abord la maquette de mon site</a></p> : null}
          </div>
        </section>
      </main>

      <PublicPied accueil />
    </div>
  )
}
