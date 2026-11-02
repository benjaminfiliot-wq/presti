import '@/app/globals.css'
import '@/app/ressources.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { JsonLd, PourAllerPlusLoin } from '@/app/SeoBlocs'
import { BASE } from '@/lib/seoDevis'
import { AUTOMATISATION, ESSAI_JOURS, OFFRES, PLANS } from '@/lib/plans'
import { FLAGS } from '@/lib/flags'
import { DELAI_ANNULATION_MIN } from '@/lib/pilote/regles'

// La page « logiciel de devis artisan » (27/10/2026) : vise « logiciel de devis artisan », « logiciel devis bâtiment », « logiciel
// devis IA ». Tout ce qu'elle promet se lit dans lib/plans.ts (offres, prix, essais, niveau d'automatisation) et lib/flags.ts
// (devis par lots, situations) : rien n'est recopié à la main, rien de ce qui est derrière un drapeau baissé n'est annoncé.
// Le devis n'est présenté comme parti tout seul qu'en Signature, Pilote activé, prix tous sourcés (lib/pilote/regles.ts) ; en
// Studio, l'artisan le relit (vault, « Positionnement automatique »).

const TITRE = 'Logiciel de devis artisan avec IA : du message client au devis signé'
const DESC = `Presti chiffre vos devis par l’IA à partir de vos prix, prépare la réponse à chaque demande en moins d’une minute et relance pour vous. Dès ${Math.min(...OFFRES.map((o) => o.prix))} € par mois, essai sans carte.`

export const metadata: Metadata = {
  title: TITRE,
  description: DESC,
  alternates: { canonical: '/logiciel-devis-artisan' },
}

const ETAPES: { titre: string; texte: string }[] = [
  { titre: 'La demande arrive', texte: 'Le client écrit par votre lien de contact, posé sur votre fiche Google, votre page Facebook ou votre signature e-mail. La demande arrive dans Presti, avec ses photos.' },
  { titre: 'La réponse est prête', texte: 'En moins d’une minute, dans votre ton. Elle pose les questions qui manquent, sans inventer de prix ni de créneau.' },
  { titre: 'Le devis se chiffre', texte: 'L’IA le chiffre à partir de vos tarifs. Vous ajustez une ligne si besoin ; le PDF porte les mentions de votre entreprise, et le client l’accepte en ligne.' },
  { titre: 'Relances et facture', texte: 'Trois relances sont prévues après la réponse (J+2, J+5, J+10). Le devis accepté devient une facture en un clic, sans ressaisie.' },
]

const FAQ_LOGICIEL = [
  // 01/11/2026 — l'ancienne réponse disait « Non » sans condition : faux en Signature, où le Pilote automatique peut envoyer
  // seul un devis dont TOUS les prix viennent des tarifs de l'artisan (lib/pilote/regles.ts, garde prixSources).
  { q: 'Presti envoie-t-il les devis tout seul ?', r: `En ${PLANS.studio.label}, non : le devis est chiffré par l’IA à partir de vos prix, puis vous le relisez avant de l’envoyer. En ${PLANS.signature.label}, si vous l’activez, le Pilote automatique envoie seul un devis dont tous les prix viennent de vos tarifs, après ${DELAI_ANNULATION_MIN} minutes pendant lesquelles vous pouvez l’annuler. Un prix estimé ne part jamais seul, ni un paiement.` },
  { q: 'D’où viennent les prix du devis ?', r: 'De vos tarifs, enregistrés dans Presti. L’IA ne présente pas un prix deviné comme un prix sourcé : c’est la règle qui guide tout le produit.' },
  { q: 'Quelle différence entre Studio et Signature ?', r: `${PLANS.studio.label} : ${AUTOMATISATION.studio}. ${PLANS.signature.label} : ${AUTOMATISATION.signature}.` },
  { q: 'Puis-je essayer sans carte bancaire ?', r: `Oui : ${ESSAI_JOURS.studio} jours en ${PLANS.studio.label} et ${ESSAI_JOURS.signature} jours en ${PLANS.signature.label}, une fois par compte. Sans carte ajoutée à la fin de l’essai, rien n’est prélevé.` },
  { q: 'Le client voit-il le nom « Presti » ?', r: 'Non. Les messages partent à votre nom, avec votre adresse en réponse ; votre page de contact est à votre marque.' },
]

export default function PageLogiciel() {
  const url = `${BASE}/logiciel-devis-artisan`
  // Ce que la page affirme sur les devis et factures, une ligne = une capacité livrée.
  const FONCTIONS: { titre: string; texte: string }[] = [
    { titre: 'Devis chiffré par l’IA sur vos prix', texte: 'À partir de la demande du client et de vos tarifs. Vous gardez la main sur chaque ligne.' },
    ...(FLAGS.devisLots ? [{ titre: 'Devis par lots', texte: 'Un gros chantier se découpe en lots, chacun avec ses lignes et son sous-total.' }] : []),
    { titre: 'Mentions de votre entreprise', texte: 'SIRET, assurance, forme juridique : Presti refuse d’émettre un devis ou une facture à qui il manque une mention bloquante, et vous dit laquelle.' },
    { titre: 'Facture en un clic', texte: 'Le devis accepté devient une facture, sans ressaisie, avec un export XML Factur-X.' },
    ...(FLAGS.facturesSituation ? [{ titre: 'Acompte, situations, solde', texte: 'Facture d’acompte, situations de travaux à l’avancement, facture de solde qui déduit ce qui est déjà facturé.' }] : []),
    { titre: 'Relances prévues', texte: 'Après votre réponse au client : J+2, J+5, J+10. Préparées en Studio, envoyées seules en Signature.' },
  ]
  return (
    <div className="pub res">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Presti',
        url,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Logiciel de devis et de facturation pour artisans',
        operatingSystem: 'Web',
        inLanguage: 'fr-FR',
        description: DESC,
        featureList: FONCTIONS.map((f) => f.titre),
        offers: OFFRES.map((o) => ({
          '@type': 'Offer',
          name: o.label,
          description: o.accroche,
          price: String(o.prix),
          priceCurrency: 'EUR',
          priceSpecification: { '@type': 'UnitPriceSpecification', price: String(o.prix), priceCurrency: 'EUR', unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } },
          url: `${BASE}/signup`,
        })),
        provider: { '@type': 'Organization', '@id': `${BASE}/#org`, name: 'Presti', url: BASE },
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_LOGICIEL.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
      }} />
      <PublicNav />
      <main className="pub-main">
        <div className="container res-article">
          <header className="res-tete">
            <Breadcrumb label="Logiciel de devis artisan" path="/logiciel-devis-artisan" />
            <span className="legal-kick">Logiciel de devis</span>
            <h1 className="pub-titre">Le logiciel de devis <span>qui part de la demande</span></h1>
            <p className="pub-intro res-intro">
              Un logiciel de devis classique attend que vous ayez le temps de le remplir. Presti commence plus tôt : au message du client.
              La réponse est prête en moins d’une minute, le devis se chiffre par l’IA sur vos prix, et les relances sont prévues.
            </p>
            <div className="pub-actions">
              <a className="lp-btn lp-btn--p" href="/signup">Essayer gratuitement</a>
              <Link className="lp-btn lp-btn--g" href="/#tarifs">Voir les tarifs</Link>
            </div>
          </header>

          <section>
            <h2>Du message du client au devis signé</h2>
            <ol className="res-etapes">
              {ETAPES.map((e, i) => <li key={i}><b>{e.titre}.</b> {e.texte}</li>)}
            </ol>
          </section>

          <section>
            <h2>Ce que Presti fait pour vos devis et vos factures</h2>
            <ul className="res-cartes">
              {FONCTIONS.map((f) => <li key={f.titre}><div><b>{f.titre}</b><span>{f.texte}</span></div></li>)}
            </ul>
          </section>

          <section>
            <h2>Deux offres, un niveau d’automatisation chacune</h2>
            <div className="res-offres">
              {OFFRES.map((o) => (
                <div className="res-offre" key={o.id}>
                  <b>{o.label}</b>
                  <p className="res-prix">{o.prix} €<small> par mois · {o.credits} crédits</small></p>
                  <p>{AUTOMATISATION[o.id].charAt(0).toUpperCase() + AUTOMATISATION[o.id].slice(1)}.</p>
                  <p className="res-appel-petit">Essai sans carte : {ESSAI_JOURS[o.id]} jours.</p>
                </div>
              ))}
            </div>
            <p className="res-appel-petit">TVA non applicable, art. 293 B du CGI. Sans engagement, résiliable à tout moment. 1 crédit = 1 réponse préparée ou 1 devis généré par l’IA.</p>
          </section>

          <section>
            <h2>Bien choisir son logiciel de devis</h2>
            <div className="res-table-cadre">
              <table className="res-table">
                <thead><tr><th scope="col">Critère</th><th scope="col">Modèle Word ou Excel</th><th scope="col">Générateur gratuit</th><th scope="col">Presti</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Mentions obligatoires contrôlées</th><td>non</td><td>oui (<Link href="/generateur-devis">le nôtre</Link>)</td><td>oui, émission bloquée s’il en manque</td></tr>
                  <tr><th scope="row">Chiffrage à partir de vos prix</th><td>à la main</td><td>à la main</td><td>par l’IA, sur vos tarifs</td></tr>
                  <tr><th scope="row">Réponse au client avant le devis</th><td>non</td><td>non</td><td>prête en moins d’une minute</td></tr>
                  <tr><th scope="row">Relances</th><td>non</td><td>non</td><td>J+2, J+5, J+10</td></tr>
                  <tr><th scope="row">Devis transformé en facture</th><td>ressaisie</td><td>ressaisie</td><td>en un clic</td></tr>
                  <tr><th scope="row">Prix</th><td>gratuit</td><td>gratuit</td><td>dès {Math.min(...OFFRES.map((o) => o.prix))} € par mois</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Moins de devis à faire, peu de relances, pas de demandes qui arrivent le soir : un modèle ou le{' '}
              <Link href="/generateur-devis">générateur gratuit</Link> suffit. Un logiciel se justifie quand les demandes s’accumulent et
              que les devis partent en retard.
            </p>
          </section>

          <section>
            <h2>Questions fréquentes</h2>
            <div className="pub-liste">
              {FAQ_LOGICIEL.map((f, i) => (
                <details className="faq-item" key={i}>
                  <summary><em className="faq-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</em><span>{f.q}</span><i className="faq-ic" aria-hidden="true" /></summary>
                  <div className="faq-a">{f.r}</div>
                </details>
              ))}
            </div>
          </section>

          <PourAllerPlusLoin courant="/logiciel-devis-artisan" />
        </div>
      </main>
      <PublicPied />
    </div>
  )
}
