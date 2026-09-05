import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'

export const metadata = {
  // Sans cette ligne, la canonique du layout racine ('/') s'applique : la page se déclare
  // comme étant l'accueil, alors qu'elle figure au sitemap — donc jamais indexée.
  alternates: { canonical: '/faq' },
  title: 'FAQ',
  description: 'Questions fréquentes sur Presti : fonctionnement, sécurité des données, tarifs, devis, paiements.',
  // Pas de bloc `openGraph` ici, et c'est voulu : en redéclarer un remplacerait celui du layout
  // racine EN ENTIER, image de partage comprise. Le titre et le texte ci-dessus suffisent —
  // Next s'en sert pour og:title et og:description dès lors que le layout racine ne les fige
  // plus (audit final, C/12).
}

const FAQ: { q: string; a: string }[] = [
  { q: 'Qu’est-ce que Presti ?', a: 'Presti est un outil en ligne pour les artisans du bâtiment. Il répond à vos demandes de devis en moins d’une minute, dans votre ton, génère des devis et factures conformes, et relance automatiquement vos prospects jusqu’à leur réponse.' },
  { q: 'Comment ça marche ?', a: 'Vous récupérez un lien de contact à coller partout (Le Bon Coin, Google, Facebook, votre signature mail). Chaque demande arrive dans votre espace, Presti y répond automatiquement, et vous génère un devis prêt à envoyer. Vous gardez la main : vous vérifiez et validez avant d’envoyer.' },
  { q: 'Est-ce que mes données sont en sécurité ?', a: 'Oui. Vos données sont cloisonnées par compte : personne d’autre ne voit vos demandes ni vos devis. Les connexions sont chiffrées (HTTPS), vos mots de passe sont chiffrés, et les paiements passent par Stripe — Presti ne stocke jamais vos numéros de carte. Le traitement est conforme au RGPD.' },
  { q: 'Qui peut voir mes demandes et mes devis ?', a: 'Vous seul. Chaque compte est isolé de façon stricte : vos données ne sont jamais accessibles aux autres utilisateurs de Presti.' },
  { q: 'Puis-je essayer gratuitement ?', a: 'Oui, une offre d’essai gratuite vous permet de tester Presti et d’obtenir vos premières réponses. Ensuite, des abonnements à crédits s’adaptent à votre volume d’activité.' },
  { q: 'Combien ça coûte ?', a: 'Des abonnements simples fonctionnant à base de crédits : 1 crédit = 1 réponse ou 1 devis généré par l’IA. Vous choisissez le niveau dont vous avez besoin, sans engagement, résiliable à tout moment.' },
  { q: 'Les devis générés sont-ils valables ?', a: 'Presti génère des devis conformes (mentions légales, TVA, assurance décennale). Vous restez responsable de leur vérification et de leur validation avant envoi : Presti est un outil d’assistance, pas un substitut à votre contrôle.' },
  { q: 'L’intelligence artificielle peut-elle se tromper ?', a: 'Comme tout outil basé sur l’IA, les contenus proposés peuvent comporter des inexactitudes. Vous devez toujours les relire et les valider avant de les envoyer à un client. Voir nos conditions générales pour le détail.' },
  { q: 'Puis-je annuler à tout moment ?', a: 'Oui, les abonnements sont sans engagement et résiliables à tout moment. Votre accès reste actif jusqu’à la fin de la période déjà payée.' },
]

const schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function FaqPage() {
  return (
    <main className="legal-wrap">
      {/* Les questions sont statiques aujourd'hui, mais le bloc est lu en texte brut jusqu'au
          premier « fin de balise script » : une réponse qui en contiendrait un livrerait la suite
          au parseur HTML. On échappe `<`, `>` et `&` — le sens des données ne change pas. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }} />
      <Breadcrumb label="FAQ" path="/faq" />
      <h1>Questions fréquentes</h1>
      <div className="legal-updated">Tout ce qu’il faut savoir sur Presti</div>

      {FAQ.map((f, i) => (
        <details className="faq-item" key={i}>
          <summary>{f.q}</summary>
          <div className="faq-a">{f.a}</div>
        </details>
      ))}

      <p style={{ marginTop: '2.4rem' }}>
        Une autre question ? <a href="/contact">Écrivez-nous</a> — on répond à chaque message.
      </p>
      <p><a href="/cgu">Conditions générales</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/mentions-legales">Mentions légales</a></p>
    </main>
  )
}
