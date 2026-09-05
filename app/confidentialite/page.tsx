import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'

export const metadata = {
  title: 'Politique de confidentialité',
  // Sans cette ligne, la canonique du layout racine ('/') s'applique : la page se déclare
  // comme étant l'accueil, alors qu'elle figure au sitemap — donc jamais indexée.
  alternates: { canonical: '/confidentialite' },
}

const Back = () => <Breadcrumb label="Confidentialité" path="/confidentialite" />

export default function Confidentialite() {
  return (
    <>
    <PublicNav />
    <main className="legal-wrap">
      <Back />
      <h1>Politique de confidentialité</h1>
      <div className="legal-updated">Dernière mise à jour : 5 septembre 2026 · Conforme au RGPD</div>

      <p>Presti attache une grande importance à la protection de vos données personnelles. Cette politique explique quelles données nous collectons, pourquoi, et quels sont vos droits.</p>

      <h2>1. Responsable du traitement</h2>
      <p>Le responsable du traitement est <strong>Benjamin Filiot</strong> (Presti), 17230 Marans, France — joignable à <a href="mailto:benjaminfiliot+presti@gmail.com">benjaminfiliot+presti@gmail.com</a> ou par <a href="/contact">le formulaire de contact</a> (mêmes coordonnées complètes dans les <a href="/mentions-legales">mentions légales</a>).</p>

      <h2>2. Données que nous collectons</h2>
      <ul>
        <li><strong>Compte</strong> : nom, adresse email, mot de passe (haché — personne ne peut le relire, pas même nous), métier, informations d’entreprise (SIRET, assurance, adresse) que vous saisissez.</li>
        <li><strong>Activité</strong> : demandes reçues, devis et factures créés, coordonnées de vos clients que vous renseignez.</li>
        <li><strong>Paiement</strong> : gérés par Stripe. <strong>Presti ne stocke jamais vos numéros de carte.</strong></li>
        <li><strong>Techniques</strong> : logs de connexion, données strictement nécessaires au fonctionnement.</li>
        <li><strong>Messagerie connectée</strong> (option, si vous reliez votre boîte email professionnelle) : vos identifiants de messagerie, chiffrés et jamais réaffichés, et les emails reçus sur cette boîte, relevés chaque jour et rangés dans votre boîte de réception Presti. Leur contenu est traité pour votre compte, jamais pour un autre usage ; vous coupez la relève à tout moment et les identifiants sont alors effacés.</li>
      </ul>

      <h2>3. Finalités &amp; bases légales</h2>
      <ul>
        <li>Fournir le service (comptes, réponses, devis, factures) — <em>exécution du contrat</em>.</li>
        <li>Traiter les paiements et gérer les abonnements — <em>exécution du contrat / obligation légale</em>.</li>
        <li>Répondre à vos demandes et assurer le support — <em>intérêt légitime</em>.</li>
        <li>Améliorer le service — <em>intérêt légitime</em>.</li>
        <li>Relever votre messagerie connectée pour vous présenter les demandes reçues par email — <em>exécution du contrat</em>, uniquement si vous avez relié la boîte.</li>
      </ul>

      <h2>4. Sous-traitants &amp; destinataires</h2>
      <p>Nous faisons appel à des prestataires pour fournir le service. Chacun n’accède qu’aux données nécessaires :</p>
      <ul>
        <li><strong>Supabase</strong> — hébergement de la base de données et des photos — <em>Union européenne (Francfort)</em></li>
        <li><strong>Vercel</strong> — hébergement de l’application — <em>États-Unis</em></li>
        <li><strong>Stripe</strong> — traitement des paiements — <em>États-Unis</em></li>
        <li><strong>Resend</strong> — envoi des emails transactionnels — <em>États-Unis</em></li>
        <li><strong>Anthropic (Claude)</strong> — génération des réponses et devis par IA (le texte que vous soumettez est traité pour produire le résultat) — <em>États-Unis</em></li>
      </ul>
      <p>Les transferts hors Union européenne sont encadrés par les <strong>clauses contractuelles types</strong> de la Commission européenne (décision d’exécution (UE) 2021/914). Aucun de ces prestataires n’est autorisé à utiliser ces données pour son propre compte, ni à s’en servir pour entraîner ses modèles. Quand vous utilisez Presti pour vos propres clients, c’est vous le responsable du traitement et Presti votre sous-traitant : le contrat écrit qu’exige l’article 28 du RGPD est l’<a href="/cgu#sous-traitance">annexe des conditions générales</a>.</p>

      <h2>5. Durée de conservation</h2>
      <p>Vos données sont conservées le temps de votre utilisation du service, puis supprimées ou anonymisées. Vous pouvez demander la suppression de votre compte à tout moment : un <strong>délai de grâce de 30 jours</strong> s’ouvre alors — vous pouvez annuler la demande et exporter l’ensemble de vos données depuis <strong>Paramètres → Données &amp; confidentialité</strong> — puis la purge est automatique. Les pièces comptables (devis acceptés, factures) sont conservées <strong>10 ans</strong> (art. L. 102 B du livre des procédures fiscales) ; les traces techniques de protection contre les abus, <strong>12 mois</strong>.</p>

      <h2>6. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits d’<strong>accès</strong>, de <strong>rectification</strong>, d’<strong>effacement</strong>, de <strong>portabilité</strong>, de <strong>limitation</strong> et d’<strong>opposition</strong>. Pour les exercer : <a href="mailto:benjaminfiliot+presti@gmail.com">benjaminfiliot+presti@gmail.com</a> ou <a href="/contact">le formulaire de contact</a>. Vous pouvez aussi exporter vos données et supprimer votre compte vous-même, depuis Paramètres → Données &amp; confidentialité.</p>
      <p>Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong> (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>

      <h2>7. Sécurité</h2>
      <p>Nous mettons en œuvre des mesures techniques et organisationnelles adaptées : mots de passe hachés et refusés s’ils figurent dans une fuite connue, double authentification disponible sur votre compte, cloisonnement des données par compte appliqué par la base elle-même (isolation stricte), connexions chiffrées (HTTPS), secrets stockés côté serveur uniquement, adresses IP pseudonymisées avant tout enregistrement, bornes anti-abus. Le détail des mesures et le sort des données en fin de contrat figurent dans l’<a href="/cgu#sous-traitance">annexe de sous-traitance</a> des conditions générales.</p>

      <h2>8. Cookies</h2>
      <p>Presti utilise uniquement des cookies strictement nécessaires au fonctionnement (session de connexion). Aucun cookie publicitaire n’est déposé.</p>

      <p style={{ marginTop: '2.4rem' }}><a href="/cgu">Conditions générales</a> · <a href="/mentions-legales">Mentions légales</a></p>
    </main>
    </>
  )
}
