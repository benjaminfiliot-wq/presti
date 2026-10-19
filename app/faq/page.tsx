import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { FAQ, FAQ_COMPLEMENTS, THEMES_FAQ } from '@/lib/faq'
import { actif } from '@/lib/flags'

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
  return actif('landingV2') ? <FaqV2 /> : <FaqActuelle />
}

// Refonte 18/10 (étape 6.3, drapeau landingV2) : la FAQ complète, rangée par thème, avec les trois questions de FAQ_COMPLEMENTS
// (reprises de phrases déjà publiées et auditées). Le balisage FAQPage décrit les douze questions affichées.
const TOUTES = [...FAQ, ...FAQ_COMPLEMENTS]
const schemaV2 = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: TOUTES.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.reponse } })),
}
function FaqV2() {
  let n = 0
  return (
    <div className="pub">
    <PublicNav v2 />
    <main className="pub-main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaV2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }} />
      <div className="container pub-grille">
        <aside className="pub-cote">
          <Breadcrumb label="FAQ" path="/faq" />
          <span className="legal-kick">Aide</span>
          <h1 className="pub-titre">Questions <span>fréquentes</span></h1>
          <p className="pub-intro">Tout ce qu’il faut savoir sur Presti : comment ça marche, l’essai et les prix, vos données, les devis.</p>
          <nav className="pub-carte faq-themes" aria-label="Thèmes">
            {THEMES_FAQ.map((t, k) => <a key={t.titre} href={`#theme-${k + 1}`}>{t.titre}</a>)}
          </nav>
          <div className="pub-carte">
            <b>Une autre question ?</b>
            <p>Écrivez-nous : on répond à chaque message.</p>
            <div className="pub-actions">
              <a className="lp-btn lp-btn--p" href="/contact">Nous écrire</a>
              <a className="lp-btn lp-btn--g" href="/offres">Voir les offres</a>
            </div>
          </div>
        </aside>

        <div className="pub-liste">
          {THEMES_FAQ.map((t, k) => (
            <section key={t.titre} id={`theme-${k + 1}`} className="faq-theme" aria-labelledby={`theme-${k + 1}-t`}>
              <h2 id={`theme-${k + 1}-t`} className="faq-theme-t">{t.titre}</h2>
              {t.questions.map((q) => TOUTES.find((f) => f.question === q)).filter((f): f is (typeof TOUTES)[number] => !!f).map((f) => (
                <details className="faq-item" key={f.question}>
                  <summary><em className="faq-n" aria-hidden="true">{String(++n).padStart(2, '0')}</em><span>{f.question}</span><i className="faq-ic" aria-hidden="true" /></summary>
                  <div className="faq-a">{f.reponse}{f.question.startsWith('En quoi Presti') ? <> <a href="/comparatif">Voir le comparatif</a>.</> : null}</div>
                </details>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
    <PublicPied v2 />
    </div>
  )
}

function FaqActuelle() {
  return (
    <div className="pub">
    <PublicNav />
    <main className="pub-main">
      {/* Les questions sont statiques aujourd'hui, mais le bloc est lu en texte brut jusqu'au
          premier « fin de balise script » : une réponse qui en contiendrait un livrerait la suite
          au parseur HTML. On échappe `<`, `>` et `&` — le sens des données ne change pas. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }} />
      <div className="container pub-grille">
        <aside className="pub-cote">
          <Breadcrumb label="FAQ" path="/faq" />
          <span className="legal-kick">Aide</span>
          <h1 className="pub-titre">Questions <span>fréquentes</span></h1>
          <p className="pub-intro">Tout ce qu’il faut savoir sur Presti : comment ça marche, vos données, les tarifs, les devis.</p>
          <div className="pub-carte">
            <b>Une autre question ?</b>
            <p>Écrivez-nous : on répond à chaque message.</p>
            <div className="pub-actions">
              <a className="lp-btn lp-btn--p" href="/contact">Nous écrire</a>
              <a className="lp-btn lp-btn--g" href="/signup">Essayer gratuitement</a>
            </div>
          </div>
        </aside>

        <div className="pub-liste">
          {FAQ.map((f, i) => (
            <details className="faq-item" key={i}>
              <summary><em className="faq-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</em><span>{f.question}</span><i className="faq-ic" aria-hidden="true" /></summary>
              <div className="faq-a">{f.reponse}</div>
            </details>
          ))}
        </div>
      </div>
    </main>
    <PublicPied />
    </div>
  )
}
