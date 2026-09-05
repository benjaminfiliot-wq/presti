import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'
import { TRAITEMENTS, SOUS_TRAITANTS } from '@/lib/legalArtisan'

export const metadata = {
  title: 'Conditions générales',
  // Sans cette ligne, la canonique du layout racine ('/') s'applique : la page se déclare
  // comme étant l'accueil, alors qu'elle figure au sitemap — donc jamais indexée.
  alternates: { canonical: '/cgu' },
}

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
        <li>Le service s’adresse aux <strong>professionnels</strong> (artisans, entreprises du bâtiment et des services) agissant dans le cadre de leur activité. Il n’est pas destiné aux consommateurs.</li>
        <li>Presti propose une offre d’essai gratuite (limitée) et des abonnements payants fonctionnant à base de <strong>crédits</strong>. Les prix affichés sur la page <a href="/abonnement">Abonnement</a> sont exprimés en euros ; <strong>TVA non applicable, art. 293 B du CGI</strong> (franchise en base) : le montant affiché est le montant payé. Si Presti devient assujetti, les prix et la mention seront mis à jour avant tout prélèvement au nouveau régime.</li>
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

      <h2>11. Contact</h2>
      <p>Pour toute question sur ces Conditions ou sur le service : <a href="/contact">le formulaire de contact</a>. Les coordonnées complètes de l’éditeur figurent dans les <a href="/mentions-legales">mentions légales</a>.</p>

      <h2 id="sous-traitance">12. Annexe — Traitement des données pour le compte de l’artisan (art. 28 RGPD)</h2>
      <p>Quand vous utilisez Presti pour recevoir des demandes, converser avec vos clients, établir des devis et des factures, <strong>vous êtes responsable du traitement</strong> des données de vos clients et prospects, et <strong>Presti est votre sous-traitant</strong>. La présente annexe est le contrat écrit qu’exige l’article 28.3 du RGPD ; elle fait partie des Conditions que vous acceptez à l’inscription.</p>
      <h3>Objet, durée, nature et finalités</h3>
      <ul>
        {TRAITEMENTS.map((t) => (
          <li key={t.finalite}><strong>{t.finalite}</strong> — données : {t.donnees.toLowerCase()} ; durée : {t.duree}.</li>
        ))}
      </ul>
      <p>Le traitement dure le temps de votre compte, puis le temps de la suppression ou de l’anonymisation décrite ci-dessous. Personnes concernées : vos clients et prospects. Nature : hébergement, rédaction assistée des réponses, génération de documents, envoi d’emails, relève de votre messagerie si vous l’avez reliée.</p>
      <h3>Engagements de Presti</h3>
      <ul>
        <li><strong>Instructions</strong> : Presti ne traite ces données que sur vos instructions documentées — celles que vous donnez en configurant votre plateforme (mode de réponse, règles d’automatisation, canaux reliés) — et pour aucune autre finalité. Si une instruction nous paraît contraire au RGPD, nous vous en informons.</li>
        <li><strong>Confidentialité</strong> : les personnes autorisées à accéder aux données sont tenues à la confidentialité. Presti n’accède aux conversations de vos clients que pour le support, à votre demande, ou pour la sécurité du service.</li>
        <li><strong>Sécurité</strong> (art. 32) : chiffrement en transit, cloisonnement par compte (politiques de sécurité au niveau des lignes), identifiants de messagerie chiffrés et jamais réaffichés, journal des accès, sauvegardes.</li>
        <li><strong>Sous-traitants ultérieurs</strong> : vous autorisez le recours aux prestataires suivants, chacun encadré par un contrat imposant les mêmes obligations. Tout changement vous est notifié par email au moins 30 jours avant ; vous pouvez alors vous y opposer en résiliant.
          <ul>{SOUS_TRAITANTS.filter((s) => s.nom !== 'Presti').map((s) => <li key={s.nom}><strong>{s.nom}</strong> — {s.role} — {s.lieu}</li>)}</ul>
        </li>
        <li><strong>Assistance</strong> : Presti vous aide à répondre aux demandes d’exercice de droits de vos clients (accès, rectification, effacement, portabilité) — vous disposez pour cela de la suppression par brique et de l’export depuis Paramètres → Données — et à respecter vos obligations de sécurité, d’analyse d’impact et de consultation de l’autorité, dans la mesure du possible.</li>
        <li><strong>Violation de données</strong> : Presti vous notifie toute violation affectant ces données sans retard injustifié après en avoir eu connaissance, avec les éléments utiles à votre propre notification à la CNIL.</li>
        <li><strong>Fin du traitement</strong> : à la suppression de votre compte, vous exportez vos données pendant le délai de grâce de 30 jours, puis Presti supprime les données de vos clients — sauf les pièces comptables que la loi vous impose de conserver dix ans, qui restent accessibles anonymisées de vos coordonnées personnelles.</li>
        <li><strong>Information et audit</strong> : Presti met à votre disposition les informations nécessaires pour démontrer le respect de ces obligations (cette annexe, la politique de confidentialité, la liste des sous-traitants) et se prête à un audit raisonnable que vous mandateriez, à vos frais, avec un préavis de 30 jours.</li>
      </ul>
      <p>Presti tient un registre des catégories d’activités de traitement effectuées pour votre compte (art. 30.2). Cette annexe vous est aussi présentée, sous une forme adaptée à vos clients, sur la page « Informations légales » de votre site et de votre plateforme.</p>

      <p style={{ marginTop: '2.4rem' }}><a href="/confidentialite">Politique de confidentialité</a> · <a href="/mentions-legales">Mentions légales</a></p>
    </main>
  )
}
