import '@/app/globals.css'
import './contact-demo.css'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import Formulaire from '@/app/contact/Formulaire'
import '@/app/landing/landing-v2.css'
import Entete from '@/app/landing/Entete'
import Pied from '@/app/landing/Pied'
import { actif } from '@/lib/flags'
import { DEMO_ENTREPRISE } from '@/lib/landing/contenu'

// 033-005 (critique 033-004, défaut 10) : au motif « entreprise », drapeau landingV2 levé, la page de démo porte la barre et le pied de la
// v2 (app/landing/), un h1 « Demander une démo entreprise », et aucun « Essayer gratuitement ». La page reste STATIQUE : le motif se lit
// dans le navigateur (plan du chantier 2, §0 bis), par une ligne de script posée avant le contenu, qui marque <html> avant le premier
// affichage (aucun clignement) ; la feuille contact-demo.css montre une version, cache l'autre. PublicNav et PublicPied ne changent pas.
// Sans script : la page de toujours. Drapeau baissé : rien de tout cela n'est servi.
const V2 = actif('landingV2')
const MOTIF = "if(/[?&]motif=entreprise(&|$)/.test(location.search))document.documentElement.classList.add('ct-entreprise')"

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
    {V2 ? <script dangerouslySetInnerHTML={{ __html: MOTIF }} /> : null}
    <PublicNav />
    {V2 ? <div className="lp lp3 ct-v2 ct-v2-barre"><Entete base="/" /></div> : null}
    <main className="pub-main">
      <div className="container pub-grille">
        <aside className="pub-cote">
          {V2 ? (
            <div className="ct-si-entreprise">
              <span className="legal-kick">Presti pour l’entreprise</span>
              <h1 className="pub-titre">Demander une <span>démo entreprise</span></h1>
              <p className="pub-intro">{DEMO_ENTREPRISE.sousPhrase}</p>
            </div>
          ) : null}
          <div className="ct-si-support">
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
          </div>
        </aside>

        <div className="pub-carte pub-forme">
          <Formulaire />
        </div>
      </div>
    </main>
    <PublicPied />
    {V2 ? <div className="lp lp3 ct-v2 ct-v2-pied"><Pied /></div> : null}
    </div>
  )
}
