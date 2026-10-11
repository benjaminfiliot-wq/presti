import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import Formulaire from '@/app/contact/Formulaire'

export const metadata = {
  title: 'Nous écrire',
  description: 'Une question sur Presti, avant ou après votre inscription ? Écrivez-nous, la réponse arrive sous 24 h.',
  alternates: { canonical: '/contact' },
  // Pas de bloc `openGraph` ici, et c'est voulu : en redéclarer un remplacerait celui du layout
  // racine EN ENTIER, image de partage comprise. Le titre et le texte ci-dessus servent
  // directement d'og:title et d'og:description (audit final, C/12).
}

export default function Contact() {
  return (
    <div className="pub">
    <PublicNav />
    <main className="pub-main">
      <div className="container pub-grille">
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

        <div className="pub-carte pub-forme">
          <Formulaire />
        </div>
      </div>
    </main>
    <PublicPied />
    </div>
  )
}
