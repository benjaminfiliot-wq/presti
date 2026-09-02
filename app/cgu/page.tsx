import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'

export const metadata = { title: 'Conditions générales' }

const Back = () => <Breadcrumb label="Conditions générales" path="/cgu" />

export default function CGU() {
  return (
    <main className="legal-wrap">
      <Back />
      <h1>Conditions Générales d’Utilisation et de Vente</h1>
      <div className="legal-updated">Dernière mise à jour : 27 août 2026</div>

      <p>Les présentes conditions (les « Conditions ») régissent l’accès et l’utilisation du service <strong>Presti</strong>, édité par Benjamin Filiot (voir <a href="/mentions-legales">Mentions légales</a>). En créant un compte, vous acceptez ces Conditions.</p>

      <h2>1. Objet du service</h2>
      <p>Presti est un outil en ligne d’assistance pour artisans permettant, notamment, de répondre aux demandes de devis, de générer des devis et factures, et de gérer son activité. Presti fournit une <strong>assistance</strong> : les contenus proposés (réponses, devis, factures) sont des propositions que l’utilisateur doit vérifier et valider.</p>

      <h2>2. Compte</h2>
      <p>L’utilisateur s’engage à fournir des informations exactes et à préserver la confidentialité de ses identifiants. Il est responsable de toute activité réalisée depuis son compte.</p>

      <h2>3. Abonnements, crédits et paiement</h2>
      <ul>
        <li>Presti propose une offre d’essai gratuite (limitée) et des abonnements payants fonctionnant à base de <strong>crédits</strong>.</li>
        <li>Les paiements sont traités par <strong>Stripe</strong>. Les abonnements sont sans engagement et résiliables à tout moment ; l’accès reste actif jusqu’à la fin de la période payée.</li>
        <li>Les crédits inclus dans un abonnement sont valables pour la période concernée et ne sont pas reportables sauf mention contraire.</li>
        <li>Sauf disposition légale impérative, les sommes versées ne sont pas remboursables une fois le service consommé.</li>
      </ul>

      <h2>4. Obligations de l’utilisateur</h2>
      <ul>
        <li>Utiliser le service conformément à la loi et aux présentes Conditions.</li>
        <li><strong>Vérifier, corriger et valider</strong> tout contenu généré avant de l’envoyer à un client ou de l’utiliser à des fins officielles (devis, facture, réponse).</li>
        <li>S’assurer de la conformité de ses documents à la réglementation applicable à son activité (mentions obligatoires, TVA, assurance, etc.).</li>
        <li>Ne pas détourner le service, ni porter atteinte à sa sécurité.</li>
      </ul>

      <h2 id="responsabilite">5. Limitation de responsabilité</h2>
      <div className="legal-note">
        Presti est un <strong>outil d’aide à la rédaction et à la gestion</strong>, s’appuyant notamment sur l’intelligence artificielle. Les contenus générés peuvent comporter des inexactitudes.
      </div>
      <ul>
        <li>Presti ne garantit pas l’exactitude, l’exhaustivité ou la conformité légale des contenus générés (devis, factures, réponses). <strong>L’utilisateur en demeure seul responsable</strong> et doit les vérifier avant usage.</li>
        <li>Presti ne saurait être tenu responsable des décisions prises, des documents envoyés, ni des conséquences (commerciales, fiscales, juridiques) résultant de l’usage du service.</li>
        <li>La responsabilité de l’éditeur, à supposer qu’elle soit engagée, est limitée au montant effectivement payé par l’utilisateur au titre des douze (12) derniers mois.</li>
        <li>Presti n’est pas responsable des interruptions liées à ses prestataires (hébergement, paiement, IA, email) ou à des cas de force majeure.</li>
      </ul>

      <h2>6. Propriété intellectuelle</h2>
      <p>La marque, l’interface et le code de Presti restent la propriété de l’éditeur. Les contenus que vous saisissez et les documents que vous générez vous appartiennent ; vous accordez à Presti une licence limitée nécessaire à la fourniture du service.</p>

      <h2>7. Données personnelles</h2>
      <p>Le traitement des données est décrit dans la <a href="/confidentialite">Politique de confidentialité</a>.</p>

      <h2>8. Résiliation</h2>
      <p>Vous pouvez cesser d’utiliser le service et supprimer votre compte à tout moment. L’éditeur peut suspendre un compte en cas de manquement grave aux présentes Conditions.</p>

      <h2>9. Modification des Conditions</h2>
      <p>L’éditeur peut faire évoluer ces Conditions. Les utilisateurs sont informés des modifications substantielles ; la poursuite de l’utilisation vaut acceptation.</p>

      <h2>10. Droit applicable</h2>
      <p>Les présentes Conditions sont soumises au <strong>droit français</strong>. En cas de litige, une solution amiable sera recherchée en priorité ; à défaut, les tribunaux français seront compétents (sous réserve des règles protectrices applicables aux consommateurs).</p>

      <p style={{ marginTop: '2.4rem' }}><a href="/confidentialite">Politique de confidentialité</a> · <a href="/mentions-legales">Mentions légales</a></p>
    </main>
  )
}
