import '@/app/globals.css'
import '@/app/ressources.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { AppelPresti, JsonLd, PourAllerPlusLoin, Source } from '@/app/SeoBlocs'
import { BASE, METIERS_DEVIS, metierParSlug } from '@/lib/seoDevis'

// Un modèle de devis par métier (27/10/2026) : vise « modèle de devis plombier », « devis électricien »… Le contenu vient de
// lib/seoDevis.ts (METIERS_DEVIS) : questions à poser, lignes SANS prix, points de vigilance sourcés.

export const dynamicParams = false
export function generateStaticParams() {
  return METIERS_DEVIS.map((m) => ({ metier: m.slug }))
}

type Props = { params: Promise<{ metier: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = metierParSlug((await params).metier)
  if (!m) return {}
  return {
    title: `Modèle de devis ${m.nom} gratuit`,
    description: `Modèle de devis ${m.nom} : les questions à poser avant de chiffrer, les lignes types, les mentions obligatoires. À remplir en ligne et à télécharger en PDF, gratuitement.`,
    alternates: { canonical: `/modele-devis/${m.slug}` },
  }
}

export default async function PageMetier({ params }: Props) {
  const m = metierParSlug((await params).metier)
  if (!m) notFound()
  const url = `${BASE}/modele-devis/${m.slug}`
  const lienGenerateur = `/generateur-devis?metier=${m.slug}`
  return (
    <div className="pub res">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `Faire un devis de ${m.nom}`,
        inLanguage: 'fr-FR',
        url,
        tool: [{ '@type': 'HowToTool', name: 'Générateur de devis gratuit', url: `${BASE}${lienGenerateur}` }],
        step: [
          { '@type': 'HowToStep', position: 1, name: 'Poser les bonnes questions', text: m.questions.join(' ') },
          { '@type': 'HowToStep', position: 2, name: 'Découper le devis en lignes', text: m.lignes.map((l) => `${l.designation} (${l.unite})`).join(' ; ') },
          { '@type': 'HowToStep', position: 3, name: 'Vérifier les mentions et les points de vigilance', text: m.vigilance.join(' ') },
        ],
      }} />
      <PublicNav />
      <main className="pub-main">
        <div className="container res-article">
          <header className="res-tete">
            <Breadcrumb label={m.titre} path={`/modele-devis/${m.slug}`} parents={[{ label: 'Modèles de devis', path: '/modele-devis' }]} />
            <span className="legal-kick">Modèle gratuit</span>
            <h1 className="pub-titre">Modèle de devis <span>{m.nom}</span></h1>
            <p className="pub-intro res-intro">{m.intro}</p>
            <div className="pub-actions">
              <a className="lp-btn lp-btn--p" href={lienGenerateur}>Remplir ce modèle en ligne</a>
              <Link className="lp-btn lp-btn--g" href="/comment-faire-un-devis">Les mentions obligatoires</Link>
            </div>
          </header>

          <section>
            <h2>Avant de chiffrer : les questions à poser</h2>
            <ol className="res-etapes">
              {m.questions.map((q, i) => <li key={i}>{q}</li>)}
            </ol>
          </section>

          <section>
            <h2>Les lignes d’un devis de {m.nom}</h2>
            <p>Les lignes types, avec leur unité. Les prix restent à votre main : ce sont vos tarifs qui font le devis.</p>
            <div className="res-table-cadre">
              <table className="res-table">
                <thead><tr><th scope="col">Désignation</th><th scope="col">Unité</th><th scope="col">Prix unitaire HT</th></tr></thead>
                <tbody>
                  {m.lignes.map((l, i) => <tr key={i}><th scope="row">{l.designation}</th><td>{l.unite}</td><td className="res-achiffrer">à chiffrer</td></tr>)}
                </tbody>
              </table>
            </div>
            <p><a className="res-lien-fort" href={lienGenerateur}>Ouvrir ces lignes dans le générateur de devis →</a></p>
          </section>

          <section>
            <h2>Points de vigilance</h2>
            <ul className="pub-points">
              {m.vigilance.map((v, i) => <li key={i}><i /><span>{v}</span></li>)}
            </ul>
            <p className="res-sources">
              Sources : <Source cle="servicePublicBatiment" />
              {m.depannage ? <> ; <Source cle="arrete2017" /></> : null}
              {m.vigilance.some((v) => v.includes('L243-2')) ? <> ; <Source cle="assuranceDecennale" /></> : null}
              {m.vigilance.some((v) => v.includes('loi de finances pour 2025')) ? <> ; <Source cle="tvaReduiteCapeb" /></> : null}.
            </p>
          </section>

          <AppelPresti
            titre={`Le devis de ${m.nom}, préparé depuis la demande du client`}
            texte="Avec Presti, la demande arrive par votre lien, la réponse qui pose les bonnes questions est prête en moins d’une minute, puis le devis se chiffre par l’IA sur vos prix."
          />

          <PourAllerPlusLoin courant={`/modele-devis/${m.slug}`} />
        </div>
      </main>
      <PublicPied />
    </div>
  )
}
