import Stripe from 'stripe'

// La clé secrète est lue côté serveur uniquement (variable d'env Vercel STRIPE_SECRET_KEY).
// Jamais exposée au navigateur.
const key = process.env.STRIPE_SECRET_KEY
export const stripe = key ? new Stripe(key) : null

/**
 * Un événement `customer.subscription.deleted` ne rétrograde l'artisan QUE s'il concerne
 * l'abonnement courant. Sans ce contrôle, le rejeu tardif de la fin d'un ANCIEN abonnement
 * (résilié puis remplacé) rétrograderait un abonné actif (audit final, auditeur H).
 * Sans identifiant en base (compte d'avant la colonne), on accepte : mieux vaut rétrograder
 * à tort qu'offrir l'accès payant à vie.
 */
export function concerneAbonnementCourant(enBase: string | null | undefined, evenement: string): boolean {
  return !enBase || enBase === evenement
}
