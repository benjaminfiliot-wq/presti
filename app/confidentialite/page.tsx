import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'

export const metadata = {
  title: 'Politique de confidentialité',
  // Sans cette ligne, la canonique du layout racine ('/') s'applique : la page se déclare
  // comme étant l'accueil, alors qu'elle figure au sitemap — donc jamais indexée.
  alternates: { canonical: '/confidentialite' },
}

const Back = () => <Breadcrumb label="Confidentialité" path="/confidentialite" />

export default function Confidentialite() {
  return (
    <main className="legal-wrap">
      <Back />
      <h1>Politique de confidentialité</h1>
      <div className="legal-updated">Dernière mise à jour : 27 août 2026 · Conforme au RGPD</div>

      <p>Presti attache une grande importance à la protection de vos données personnelles. Cette politique explique quelles données nous collectons, pourquoi, et quels sont vos droits.</p>

      <h2>1. Responsable du traitement</h2>
      <p>Le responsable du traitement est <strong>Benjamin Filiot</strong> (Presti), 17230 Marans, France — joignable par <a href="/contact">le formulaire de contact</a>.</p>

      <h2>2. Données que nous collectons</h2>
      <ul>
        <li><strong>Compte</strong> : nom, adresse email, mot de passe (chiffré), métier, informations d’entreprise (SIRET, assurance, adresse) que vous saisissez.</li>
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
        <li><strong>Supabase</strong> — hébergement de la base de données</li>
        <li><strong>Vercel</strong> — hébergement de l’application</li>
        <li><strong>Stripe</strong> — traitement des paiements</li>
        <li><strong>Resend</strong> — envoi des emails transactionnels</li>
        <li><strong>Anthropic (Claude)</strong> — génération des réponses et devis par IA (le texte que vous soumettez est traité pour produire le résultat)</li>
      </ul>
      <p>Certains prestataires peuvent être situés hors UE ; les transferts sont encadrés par des garanties appropriées (clauses contractuelles types).</p>

      <h2>5. Durée de conservation</h2>
      <p>Vos données sont conservées le temps de votre utilisation du service, puis supprimées ou anonymisées. Les données de facturation sont conservées 10 ans conformément aux obligations comptables. Vous pouvez demander la suppression de votre compte à tout moment.</p>

      <h2>6. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits d’<strong>accès</strong>, de <strong>rectification</strong>, d’<strong>effacement</strong>, de <strong>portabilité</strong>, de <strong>limitation</strong> et d’<strong>opposition</strong>. Pour les exercer : <a href="/contact">le formulaire de contact</a>.</p>
      <p>Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong> (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>

      <h2>7. Sécurité</h2>
      <p>Nous mettons en œuvre des mesures techniques et organisationnelles adaptées : chiffrement des mots de passe, cloisonnement des données par compte (isolation stricte), connexions sécurisées (HTTPS), secrets stockés côté serveur uniquement.</p>

      <h2>8. Cookies</h2>
      <p>Presti utilise uniquement des cookies strictement nécessaires au fonctionnement (session de connexion). Aucun cookie publicitaire n’est déposé.</p>

      <p style={{ marginTop: '2.4rem' }}><a href="/cgu">Conditions générales</a> · <a href="/mentions-legales">Mentions légales</a></p>
    </main>
  )
}
