import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'

export const metadata = {
  title: 'Mentions légales',
  // Sans cette ligne, la canonique du layout racine ('/') s'applique : la page se déclare
  // comme étant l'accueil, alors qu'elle figure au sitemap — donc jamais indexée.
  alternates: { canonical: '/mentions-legales' },
}

const Back = () => <Breadcrumb label="Mentions légales" path="/mentions-legales" />

export default function MentionsLegales() {
  return (
    <main className="legal-wrap">
      <Back />
      <h1>Mentions légales</h1>
      <div className="legal-updated">Dernière mise à jour : 2 septembre 2026</div>

      <h2>Éditeur du site</h2>
      <div className="legal-card">
        <div><span className="k">Service</span> Presti (prestiapp.fr)</div>
        <div><span className="k">Éditeur</span> Benjamin Filiot — entrepreneur individuel (micro-entreprise)</div>
        <div><span className="k">Adresse</span> 1 rue du Brouage, 17230 Marans, France</div>
        <div><span className="k">SIREN</span> 109 411 348 (RNE — immatriculée le 1er septembre 2026)</div>
        <div><span className="k">Code APE</span> 6201Z — Programmation informatique</div>
        <div><span className="k">TVA</span> non applicable, art. 293 B du CGI (franchise en base)</div>
        <div><span className="k">Contact</span> <a href="/contact">la page « Nous écrire »</a></div>
        <div><span className="k">Directeur de la publication</span> Benjamin Filiot</div>
      </div>

      <h2>Hébergement</h2>
      <p>Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — <a href="https://vercel.com" target="_blank" rel="noopener">vercel.com</a>.</p>
      <p>Les données applicatives (comptes, demandes, devis) sont hébergées via <strong>Supabase</strong>. Les paiements sont traités par <strong>Stripe</strong>.</p>

      <h2>Propriété intellectuelle</h2>
      <p>L’ensemble des éléments du site (marque « Presti », textes, interfaces, code, éléments graphiques) est protégé par le droit de la propriété intellectuelle et reste la propriété exclusive de l’éditeur, sauf mention contraire. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable, est interdite.</p>

      <h2>Responsabilité</h2>
      <p>Presti est un outil d’assistance. L’éditeur s’efforce d’assurer l’exactitude des informations et le bon fonctionnement du service, sans garantie d’absence d’erreur ou d’interruption. L’utilisateur reste seul responsable de l’usage qu’il fait des contenus générés (devis, factures, réponses) et de leur vérification avant tout envoi à un tiers.</p>

      <h2>Données personnelles</h2>
      <p>Le traitement des données personnelles est détaillé dans notre <a href="/confidentialite">Politique de confidentialité</a>. Conformément au RGPD, vous disposez de droits d’accès, de rectification et de suppression que vous pouvez exercer à l’adresse ci-dessus.</p>

      <h2>Contact</h2>
      <p>Pour toute question : <a href="/contact">la page « Nous écrire »</a>.</p>

      <p style={{ marginTop: '2.4rem' }}><a href="/cgu">Conditions générales</a> · <a href="/confidentialite">Politique de confidentialité</a></p>
    </main>
  )
}
