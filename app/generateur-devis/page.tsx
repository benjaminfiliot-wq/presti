import '@/app/globals.css'
import '@/app/ressources.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { AppelPresti, JsonLd, PourAllerPlusLoin, Source } from '@/app/SeoBlocs'
import { BASE, METIERS_DEVIS } from '@/lib/seoDevis'
import Generateur from './Generateur'

// La page outil « générateur de devis gratuit » (27/10/2026) : vise « générateur de devis », « devis gratuit », « faire un devis en
// ligne ». Utile sans compte ; l'essai de Presti est proposé à côté, jamais exigé.

const TITRE = 'Générateur de devis gratuit en ligne, sans inscription'
const DESC = 'Faites un devis en ligne gratuitement : mentions obligatoires vérifiées en direct, calcul HT, TVA et TTC, PDF prêt à envoyer. Sans compte, rien n’est envoyé.'

export const metadata: Metadata = {
  title: TITRE,
  description: DESC,
  alternates: { canonical: '/generateur-devis' },
}

const FAQ_OUTIL = [
  { q: 'Le générateur de devis est-il vraiment gratuit ?', r: 'Oui. Il marche sans compte et sans limite de nombre : vous remplissez, vous téléchargez le PDF. Rien n’est envoyé à un serveur, vos saisies restent dans votre navigateur.' },
  { q: 'Comment obtenir le devis en PDF ?', r: 'Cliquez sur « Télécharger en PDF », puis choisissez « Enregistrer au format PDF » dans la fenêtre d’impression. Seule la feuille du devis est imprimée.' },
  { q: 'Le devis produit est-il conforme ?', r: 'Le générateur vérifie en direct la présence des mentions que la fiche service-public.fr demande pour un devis de travaux dans le bâtiment. Il ne connaît pas votre situation : vérifiez le taux de TVA applicable et votre obligation d’assurance.' },
  { q: 'Je suis micro-entrepreneur, comment gérer la TVA ?', r: 'Cochez la case « franchise en base de TVA » : le devis n’affiche plus de TVA et porte la mention « TVA non applicable, article 293 B du CGI ».' },
  { q: 'Mes données sont-elles conservées ?', r: 'Uniquement dans votre navigateur, pour que vous retrouviez votre devis si vous revenez sur la page. Le bouton « Tout effacer » les supprime.' },
]

export default function PageGenerateur() {
  const url = `${BASE}/generateur-devis`
  return (
    <div className="pub res">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Générateur de devis gratuit',
        url,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        inLanguage: 'fr-FR',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        description: DESC,
        provider: { '@type': 'Organization', '@id': `${BASE}/#org`, name: 'Presti', url: BASE },
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_OUTIL.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
      }} />
      <PublicNav />
      <main className="pub-main">
        <div className="container">
          <header className="res-tete res-noprint">
            <Breadcrumb label="Générateur de devis" path="/generateur-devis" />
            <span className="legal-kick">Outil gratuit</span>
            <h1 className="pub-titre">Générateur de devis <span>gratuit</span></h1>
            <p className="pub-intro res-intro">
              Remplissez, vérifiez, téléchargez : un devis d’artisan prêt à envoyer, avec les mentions obligatoires contrôlées pendant que vous
              écrivez. Sans compte, sans inscription, et rien ne quitte votre navigateur.
            </p>
            <p className="res-metiers res-metiers--tete">
              <span>Partir d’un modèle :</span>
              {METIERS_DEVIS.map((m) => <a key={m.slug} href={`/generateur-devis?metier=${m.slug}`}>{m.titre}</a>)}
            </p>
          </header>

          <Generateur />

          <div className="res-corps res-noprint">
            <section>
              <h2>Faire un devis en ligne en quatre étapes</h2>
              <ol className="res-etapes">
                <li><b>Votre entreprise.</b> Nom, forme juridique, adresse, SIRET : ils se remplissent une fois et restent dans votre navigateur pour le devis suivant.</li>
                <li><b>Le client et le chantier.</b> Le nom du client, le lieu d’exécution et la nature exacte des travaux, en mots que le client comprend.</li>
                <li><b>Le décompte.</b> Une ligne par prestation ou produit, avec sa quantité, son unité et son prix unitaire HT. Les totaux HT, TVA et TTC se calculent seuls, taux par taux.</li>
                <li><b>Les conditions.</b> Taux horaire, déplacement, déchets, validité, gratuit ou payant. Puis « Télécharger en PDF ».</li>
              </ol>
            </section>

            <section>
              <h2>Ce que le générateur vérifie</h2>
              <p>
                La liste des mentions suit la fiche officielle des devis de travaux dans le bâtiment : <Source cle="servicePublicBatiment" />.
                Pour un dépannage, une réparation ou un entretien, s’ajoute l’information sur les pièces remplacées : <Source cle="servicePublicDevis" />.
                Le détail, mention par mention, est dans le guide <Link href="/comment-faire-un-devis">Comment faire un devis</Link>.
              </p>
            </section>

            <AppelPresti
              titre="Et si le devis se préparait tout seul ?"
              texte="Avec Presti, la demande de votre client arrive par votre lien, la réponse est prête en moins d’une minute, et le devis est chiffré par l’IA sur vos propres prix. Vous relisez, vous envoyez."
            />

            <section>
              <h2>Questions fréquentes</h2>
              <div className="pub-liste">
                {FAQ_OUTIL.map((f, i) => (
                  <details className="faq-item" key={i}>
                    <summary><em className="faq-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</em><span>{f.q}</span><i className="faq-ic" aria-hidden="true" /></summary>
                    <div className="faq-a">{f.r}</div>
                  </details>
                ))}
              </div>
            </section>

            <PourAllerPlusLoin courant="/generateur-devis" />
          </div>
        </div>
      </main>
      <PublicPied />
    </div>
  )
}
