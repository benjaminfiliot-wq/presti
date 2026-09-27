// Doublure de lib/agents/veilleur (026-045), pour tic-qa : veilleur() consigne son appel et l'instant simulé reçu.
import { jouer } from './commun-doublures.mjs'

export const URGENTS = ['paiement', 'appel', 'panne_agent', 'argent_bloque', 'coupe_circuit', 'usine_injoignable', 'canal_arrete', 'gmail_bloque']
export const COULEURS = {}
export const AGENTS_DE_L_USINE = ['atelier_maquettes', 'livreur_usine', 'chef']
export const creneauDigest = () => null
export const veilleur = (o) => jouer('veilleur.veilleur', { maintenant: o?.maintenant instanceof Date ? o.maintenant.toISOString() : o?.maintenant ?? null }, () => ({ attention: [], urgents: 0, digest: null, notifications: 0 }))
