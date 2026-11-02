import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import Formulaire from '@/app/contact/Formulaire'
import { PLANS } from '@/lib/plans'

export const metadata = {
  title: 'Nous écrire',
  description: 'Une question sur Presti, avant ou après votre inscription ? Écrivez-nous, la réponse arrive sous 24 h.',
  alternates: { canonical: '/contact' },
  // Pas de bloc `openGraph` ici, et c'est voulu : en redéclarer un remplacerait celui du layout
  // racine EN ENTIER, image de partage comprise. Le titre et le texte ci-dessus servent
  // directement d'og:title et d'og:description (audit final, C/12).
}

// 02/11 (Benj) : la carte « sur mesure » de la landing mène ici, comme le « Contact sales » des offres Team et Enterprise de claude.com.
// Ce que l'offre porte se lit dans lib/plans.ts (:15-16, :101), jamais recopié ; rien n'y promet de démonstration.
export default async function Contact({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const entreprise = (await searchParams).sujet === 'entreprise'
  const offre = PLANS.entreprise.label
  return (
    <div className="pub">
    <PublicNav />
    <main className="pub-main">
      <div className="container pub-grille">
        {entreprise ? (
          <aside className="pub-cote">
            <Breadcrumb label="Nous écrire" path="/contact" />
            <span className="legal-kick">{offre}</span>
            <h1 className="pub-titre">Parlons de <span>votre entreprise</span></h1>
            <p className="pub-intro">
              Dites-nous comment vous travaillez aujourd’hui et ce que vous voulez confier à votre assistant. Nous vous répondons à
              l’adresse indiquée, en général sous 24 h, pour en parler et vous faire un devis.
            </p>
            <ul className="pub-points">
              <li><i /><span>Le même moteur que {PLANS.signature.label}, construit autour de votre façon de travailler.</span></li>
              <li><i /><span>Vos automatisations, le suivi de vos clients adapté à vos métiers, vos outils reliés à votre assistant.</span></li>
              <li><i /><span>Un prix sur devis, selon ce que vous voulez automatiser.</span></li>
            </ul>
          </aside>
        ) : (
          <aside className="pub-cote">
            <Breadcrumb label="Nous écrire" path="/contact" />
            <span className="legal-kick">Contact</span>
            <h1 className="pub-titre">Nous <span>écrire</span></h1>
            <p className="pub-intro">
              Une question avant de vous abonner, un problème sur votre compte, une remarque : écrivez ici.
            </p>
            <ul className="pub-points">
              <li><i /><span>Le message arrive directement chez nous.</span></li>
              <li><i /><span>La réponse part sur l’adresse que vous indiquez.</span></li>
              <li><i /><span>Une question courante ? <a href="/faq">Les questions fréquentes</a> y répondent peut-être déjà.</span></li>
            </ul>
            <div className="legal-note">
              <p style={{ margin: 0 }}>
                <b>Vous êtes un client d’un artisan ?</b> Presti n’est que l’outil que votre artisan
                utilise. Pour votre devis, vos travaux ou votre rendez-vous, répondez directement au
                message de l’artisan : c’est lui qui vous suit, et lui seul.
              </p>
            </div>
          </aside>
        )}

        <div className="pub-carte pub-forme">
          <Formulaire offreEntreprise={entreprise ? offre : undefined} />
        </div>
      </div>
    </main>
    <PublicPied />
    </div>
  )
}
