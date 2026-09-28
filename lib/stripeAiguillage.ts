// lib/stripeAiguillage.ts — où va un checkout.session.completed (fiche 025-07). Fonction pure : ni réseau, ni base, ni
// horloge ; elle lit la session sans la modifier. La route du webhook (app/api/stripe/webhook/route.ts) la suit à la lettre.
//
// Les deux voies connues reprennent MOT POUR MOT les conditions de la route avant 025-07 (route.ts:35-44 à 1620723) :
//   · commande_site : paiement unique (mode 'payment') ET metadata.type = 'commande_site' — prioritaire sur l'abonnement ;
//   · abonnement    : un uid (metadata.uid, sinon client_reference_id) ET un plan (metadata.plan), quel que soit le mode.
// Tout le reste est « orphelin » : encaissé par Stripe sans que Presti sache le servir (lien de paiement créé à la main,
// futur pack sans branche). Avant 025-07, il tombait dans le vide ; la route alerte maintenant l'entreprise.
//
// Tout nouveau produit payant (pack pubs, Studio) porte un metadata.type et reçoit sa voie ICI, puis sa branche dans la
// route, AVANT d'être vendu — sinon chacun de ses paiements lèvera une alerte d'orphelin.
import type Stripe from 'stripe'

export type Voie = 'commande_site' | 'pack_pub' | 'abonnement' | 'en_attente' | 'orphelin'

/** Ce que l'aiguillage lit d'une session, et rien d'autre. Une session réduite à {} est acceptée (→ orphelin). */
export type SessionAiguillee = Partial<Pick<Stripe.Checkout.Session, 'mode' | 'metadata' | 'client_reference_id' | 'payment_status'>>

/** L'artisan et le plan d'une session d'abonnement, lus comme la route les a toujours lus ; chaînes vides si absents. */
export function champsAbonnement(s: SessionAiguillee): { uid: string; plan: string } {
  return {
    uid: (s.metadata?.uid as string) || (s.client_reference_id as string) || '',
    plan: (s.metadata?.plan as string) || '',
  }
}

/** La voie d'une session : un paiement en cours ne sert encore personne. */
export function aiguiller(s: SessionAiguillee): Voie {
  if (s.mode === 'payment' && s.metadata?.type === 'commande_site') {
    return s.payment_status === 'paid' ? 'commande_site' : s.payment_status === 'unpaid' ? 'en_attente' : 'orphelin'
  }
  // Pack pubs locales (fiche 026-112) : comme commande_site, mais avec pack_id EN PLUS du type — un paiement forgé
  // à la main (type = pack_pub sans pack_id) ne doit pas se faire passer pour un vrai pack (026-108 point 5).
  if (s.mode === 'payment' && s.metadata?.type === 'pack_pub' && s.metadata?.pack_id) {
    return s.payment_status === 'paid' ? 'pack_pub' : s.payment_status === 'unpaid' ? 'en_attente' : 'orphelin'
  }
  const { uid, plan } = champsAbonnement(s)
  if (uid && plan) {
    return s.payment_status === 'paid' || s.payment_status === 'no_payment_required' ? 'abonnement' : s.payment_status === 'unpaid' ? 'en_attente' : 'orphelin'
  }
  return 'orphelin'
}
