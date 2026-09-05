import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'
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
    <main className="legal-wrap">
      <Breadcrumb label="Nous écrire" path="/contact" />
      <h1>Nous écrire</h1>

      <p className="ct-intro">
        Une question avant de vous abonner, un problème sur votre compte, une remarque : écrivez ici.
        Le message arrive directement chez nous, et la réponse part sur l’adresse que vous indiquez.
      </p>

      <Formulaire />

      <div className="legal-note">
        <p style={{ margin: 0 }}>
          <b>Vous êtes un client d’un artisan ?</b> Presti n’est que l’outil que votre artisan
          utilise. Pour votre devis, vos travaux ou votre rendez-vous, répondez directement au
          message de l’artisan : c’est lui qui vous suit, et lui seul.
        </p>
      </div>
    </main>
  )
}
