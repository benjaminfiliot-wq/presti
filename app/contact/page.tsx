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

// 036-026 : `?motif=entreprise` (bouton « Parler à l'équipe » de la carte Entreprise et de /entreprise) adapte la page : titre,
// trois points vrais (prompt 6 § 2.4), message prérempli de quatre questions. Sans motif, la page est exactement celle d'avant.
// L'API ne change pas : le formulaire envoie les mêmes champs (voir Formulaire.tsx).
type Params = { motif?: string | string[] }

export default async function Contact({ searchParams }: { searchParams: Promise<Params> }) {
  const { motif } = await searchParams
  const entreprise = motif === 'entreprise'
  return (
    <div className="pub">
    <PublicNav />
    <main className="pub-main">
      <div className="container pub-grille">
        {entreprise ? (
          <aside className="pub-cote" data-motif="entreprise">
            <Breadcrumb label="Nous écrire" path="/contact" />
            <span className="legal-kick">{PLANS.entreprise.label}</span>
            <h1 className="pub-titre">Parlons de votre <span>entreprise</span></h1>
            <p className="pub-intro">
              Dites-nous en quelques lignes qui vous êtes et ce qui vous fait perdre du temps. Nous vous proposons ensuite un rendez-vous.
            </p>
            <ul className="pub-points">
              <li><i /><span>Un rendez-vous de découverte : votre métier, vos outils, ce qui vous fait perdre le plus de temps.</span></li>
              <li><i /><span>Une proposition avec deux options réelles, et un devis parcouru avec vous ligne à ligne.</span></li>
              <li><i /><span>Rien n’est construit sans votre accord écrit.</span></li>
            </ul>
            <div className="legal-note">
              <p style={{ margin: 0 }}>
                <b>Avant d’écrire ?</b> <a href="/entreprise">Tout savoir sur l’offre Entreprise</a> : ce qui est construit pour vous, comment ça se passe, vos garanties.
              </p>
            </div>
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
          <Formulaire motif={entreprise ? 'entreprise' : undefined} />
        </div>
      </div>
    </main>
    <PublicPied />
    </div>
  )
}
