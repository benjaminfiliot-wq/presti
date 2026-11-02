import '@/app/globals.css'
import '@/app/landing-v2.css'
import PublicNav from './PublicNav'
import PublicPied from './PublicPied'
import Image from 'next/image'
import { ESSAI_JOURS, PLANS } from '@/lib/plans'

// Témoin de scripts/landing-v2-qa.mjs (tâche 033-002) : la FORME d'une page conforme au prompt 4, en 7 sections. Phrases neutres, données marquées
// « Exemple » : un gabarit de test, jamais une proposition de texte (le texte de la page est celui de la tâche 033-001).
const DONNEES = { schema: 'https://schema.org', type: 'SoftwareApplication', nom: 'Presti', description: 'Presti prépare vos réponses, vos devis et vos relances pour les artisans du bâtiment.' }

export default function LandingV2() {
  return (
    <div className="lp lp2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': DONNEES.schema, '@type': DONNEES.type, name: DONNEES.nom, description: DONNEES.description }) }} />
      <PublicNav />
      <main>
        <section className="lp2-hero" id="haut">
          <h1>Chaque demande reçoit sa réponse préparée, vous gardez la main.</h1>
          <p>Presti prépare la réponse, le devis et la facture : avec Studio vous validez, avec Signature tout part seul.</p>
          <div className="lp2-cta">
            <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Essayer Presti</a>
            <a className="lp-btn lp-btn--g lp-btn--lg" href="#entreprise">Presti pour l’entreprise</a>
          </div>
          <p className="lp2-ligne">Essai gratuit, sans carte bancaire, sans engagement.</p>
          <p>{PLANS.studio.label} : {ESSAI_JOURS.studio} jours gratuits, sans carte. {PLANS.signature.label} : {ESSAI_JOURS.signature} jours gratuits, sans carte.</p>
          <figure className="lp2-win" aria-label="Fenêtre de démonstration de Presti">
            <figcaption><span className="lp2-exemple">Exemple</span> Fenêtre de démonstration</figcaption>
            <Image src="/demo/scene-1.webp" alt="" width={1400} height={875} />
            <p>Marie · 14:02</p>
            <p>Bonjour Madame Garnier, voici votre devis DEV-2026-0042 : 873,40 €.</p>
          </figure>
        </section>

        <section id="probleme">
          <h2>Ce qui vous prend du temps</h2>
          <ul>
            <li>Trop de temps perdu sur les devis.</li>
            <li>Relances oubliées.</li>
            <li>Inventaire et documents difficiles à suivre.</li>
          </ul>
          <p><b className="count" data-to="7">7×</b> plus de chances d’obtenir un vrai échange avec le client en répondant dans l’heure.</p>
          <small>Source : Harvard Business Review, « The Short Life of Online Sales Leads » (étude sur 2 241 entreprises)</small>
        </section>

        <section id="comment">
          <h2>Comment ça marche</h2>
          <ol className="lp2-frise">
            <li className="lp2-etape"><b>Décris le chantier ou envoie ta demande.</b> <span className="lp2-exemple">Exemple</span></li>
            <li className="lp2-etape"><b>Presti prépare le devis.</b></li>
            <li className="lp2-etape valide" data-etat="valide"><b>Tu valides et envoies.</b></li>
          </ol>
        </section>

        <section id="fonctionnalites">
          <h2>Fonctionnalités essentielles</h2>
          <div className="lp2-cartes">
            <figure className="lp2-carte"><h3>Devis assistés par IA</h3><p>Chiffrés sur vos prix. Dès Studio.</p></figure>
            <figure className="lp2-carte"><h3>Factures et relances</h3><p>Avec Signature, la relance part seule ; avec Studio, vous validez d’un clic.</p></figure>
            <figure className="lp2-carte"><h3>CRM clients</h3><p>Vos clients et vos chantiers au même endroit. Dès Signature.</p></figure>
            <figure className="lp2-carte"><h3>Inventaire</h3><p>Votre matériel suivi. Dès Studio.</p></figure>
            <figure className="lp2-carte"><h3>Documents centralisés</h3><p>Les PDF de vos devis et de vos factures.</p></figure>
            <figure className="lp2-carte"><span className="lp2-exemple">Exemple</span><h3>Assistant de gestion</h3><p>Facture FAC-2026-0007 : 620,00 €.</p></figure>
          </div>
        </section>

        <section id="pour-qui">
          <h2>Pour qui</h2>
          <ul>
            <li>Artisans du bâtiment.</li>
            <li>TPE du bâtiment.</li>
            <li>Architectes.</li>
            <li>Artisans multi-chantiers.</li>
            <li>Entreprises qui veulent industrialiser leur gestion.</li>
          </ul>
        </section>

        <section id="entreprise">
          <h2>Presti pour l’entreprise</h2>
          <p>Vous avez plusieurs collaborateurs, un CRM, un inventaire ou des processus internes à automatiser ?</p>
          <p>Nous intégrons Presti à votre organisation et connectons des agents IA à vos outils.</p>
          <a className="lp-btn lp-btn--g" href="/contact?motif=entreprise">Demander une démo</a>
        </section>

        <section id="final">
          <h2>Prêt à commencer ?</h2>
          <a className="lp-btn lp-btn--p lp-btn--lg" href="/signup">Créer mon compte</a>
          <a className="lp-btn lp-btn--g lp-btn--lg" href="/contact?motif=entreprise">Demander une démo entreprise</a>
          <p className="lp2-ligne">Essai gratuit, sans carte bancaire, sans engagement.</p>
        </section>
      </main>
      <PublicPied />
    </div>
  )
}
