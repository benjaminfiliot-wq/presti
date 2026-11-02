import '@/app/globals.css'
import '@/app/ressources.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { AppelPresti, JsonLd, PourAllerPlusLoin, Source } from '@/app/SeoBlocs'
import { BASE, METIERS_DEVIS } from '@/lib/seoDevis'

// Le sommaire des modèles de devis (27/10/2026) : vise « modèle de devis », « modèle de devis artisan ». Chaque métier a sa page
// (app/modele-devis/[metier]) et ouvre le générateur pré-rempli, sans prix.

const TITRE = 'Modèle de devis artisan gratuit, par métier'
const DESC = 'Modèles de devis gratuits pour plombier, électricien, maçon, peintre, menuisier, couvreur, carreleur et chauffagiste : lignes types, questions à poser, mentions obligatoires.'

export const metadata: Metadata = {
  title: TITRE,
  description: DESC,
  alternates: { canonical: '/modele-devis' },
}

export default function PageModeles() {
  return (
    <div className="pub res">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: TITRE,
        description: DESC,
        url: `${BASE}/modele-devis`,
        inLanguage: 'fr-FR',
        hasPart: METIERS_DEVIS.map((m) => ({ '@type': 'WebPage', name: `Modèle de devis ${m.nom}`, url: `${BASE}/modele-devis/${m.slug}` })),
      }} />
      <PublicNav />
      <main className="pub-main">
        <div className="container res-article">
          <header className="res-tete">
            <Breadcrumb label="Modèles de devis" path="/modele-devis" />
            <span className="legal-kick">Modèles gratuits</span>
            <h1 className="pub-titre">Modèles de devis <span>par métier</span></h1>
            <p className="pub-intro res-intro">
              Un bon modèle de devis n’est pas un tableau vide : ce sont les bonnes lignes, les bonnes questions avant de chiffrer et les
              mentions propres à votre métier. Choisissez le vôtre, il s’ouvre dans le générateur, prêt à chiffrer.
            </p>
          </header>

          <ul className="res-cartes res-cartes--metiers">
            {METIERS_DEVIS.map((m) => (
              <li key={m.slug}>
                <Link href={`/modele-devis/${m.slug}`}>
                  <b>Modèle de devis {m.nom}</b>
                  <span>{m.intro.split('. ')[0]}.</span>
                </Link>
              </li>
            ))}
          </ul>

          <section>
            <h2>Ce que contient chaque modèle</h2>
            <ul className="pub-points">
              <li><i /><span>Les questions à poser au client avant de chiffrer, pour ne pas renégocier au chantier.</span></li>
              <li><i /><span>Les lignes types du métier, avec leur unité. Sans prix : c’est vous qui chiffrez, à vos tarifs.</span></li>
              <li><i /><span>Les points de vigilance : dépannage, TVA réduite, assurance décennale.</span></li>
              <li><i /><span>Les mentions obligatoires, vérifiées en direct dans le <Link href="/generateur-devis">générateur</Link> (liste de <Source cle="servicePublicBatiment" />).</span></li>
            </ul>
          </section>

          <section>
            <h2>Word, Excel ou générateur en ligne ?</h2>
            <p>
              Un modèle Word ou Excel se remplit à la main : rien ne vous dit qu’une mention manque, et les totaux se recalculent si la formule
              n’a pas été cassée. Le <Link href="/generateur-devis">générateur en ligne</Link> fait la même chose sans fichier à télécharger :
              il calcule les totaux taux par taux, signale les mentions absentes et produit un PDF propre.
            </p>
          </section>

          <AppelPresti
            titre="Votre modèle, mais à vos prix"
            texte="Dans Presti, le devis part de la demande du client et se chiffre par l’IA à partir de vos tarifs. Vous ajustez une ligne si besoin, et le client l’accepte en ligne."
          />

          <PourAllerPlusLoin courant="/modele-devis" />
        </div>
      </main>
      <PublicPied />
    </div>
  )
}
