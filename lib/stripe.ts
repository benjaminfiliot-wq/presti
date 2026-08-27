import Stripe from 'stripe'

// La clé secrète est lue côté serveur uniquement (variable d'env Vercel STRIPE_SECRET_KEY).
// Jamais exposée au navigateur.
const key = process.env.STRIPE_SECRET_KEY
export const stripe = key ? new Stripe(key) : null
