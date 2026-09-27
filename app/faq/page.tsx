import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import { FAQ } from '@/lib/faq'

export const metadata = {
  // Sans cette ligne, la canonique du layout racine ('/') s'applique : la page se déclare
  // comme étant l'accueil, alors qu'elle figure au sitemap — donc jamais indexée.
  alternates: { canonical: '/faq' },
  title: 'FAQ',
  description: 'Questions fréquentes sur Presti : fonctionnement, sécurité des données, tarifs, devis, paiements.',
  // Pas de bloc `openGraph` ici, et c'est voulu : en redéclarer un remplacerait celui du layout
  // racine EN ENTIER, image de partage comprise. Le titre et le texte ci-dessus suffisent —
  // Next s'en sert pour og:title et og:description dès lors que le layout racine ne les fige
  // plus (audit final, C/12).
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.reponse },
  })),
}

export default function FaqPage() {
  return (
    <>
    <PublicNav />
    <main className="legal-wrap">
      {/* Les questions sont statiques aujourd'hui, mais le bloc est lu en texte brut jusqu'au
          premier « fin de balise script » : une réponse qui en contiendrait un livrerait la suite
          au parseur HTML. On échappe `<`, `>` et `&` — le sens des données ne change pas. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }} />
      <Breadcrumb label="FAQ" path="/faq" />
      <h1>Questions fréquentes</h1>
      <div className="legal-updated">Tout ce qu’il faut savoir sur Presti</div>

      {FAQ.map((f, i) => (
        <details className="faq-item" key={i}>
          <summary>{f.question}</summary>
          <div className="faq-a">{f.reponse}</div>
        </details>
      ))}

      <p style={{ marginTop: '2.4rem' }}>
        Une autre question ? <a href="/contact">Écrivez-nous</a> — on répond à chaque message.
      </p>
      <p><a href="/cgu">Conditions générales</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/mentions-legales">Mentions légales</a></p>
    </main>
    </>
  )
}
