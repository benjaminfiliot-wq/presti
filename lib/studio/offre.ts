// lib/studio/offre.ts — l'offre du Studio, EN PARAMÈTRE (fiche 026-166) : le seul endroit du prix du pack de départ
// (5 vidéos), et le lien privé de commande de 21 jours. Tout le reste (page, Checkout, ligne packs_pubs, texte de
// l'offre du Répondeur) lit ces valeurs ici et n'écrit jamais le prix.
//
// Aucun appel réseau, aucune lecture de la base. Le lien est un jeton signé : charge { p, m, e } en base64url, un point,
// puis la signature HMAC-SHA256 de cette charge par STUDIO_LIEN_SECRET (variable serveur de Vercel, jamais dans le dépôt).
// Syntaxe effaçable seulement (ts-loader) : ni `enum`, ni `namespace`.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const VIDEOS_PACK_STUDIO = 5
export const PRIX_PACK_STUDIO_CENTS = 49000
/** Le délai annoncé à la marque, en jours ouvrés (à confirmer par Benj sur le diff). */
export const DELAI_LIVRAISON_JOURS_OUVRES = 10
export const DUREE_LIEN_JOURS = 21

/** Format français, sans décimales quand elles sont nulles, calculé depuis les centimes. */
export function formaterEuros(cents: number): string {
  const entier = Math.floor(cents / 100)
  const reste = cents % 100
  const texte = reste === 0 ? String(entier) : `${entier},${String(reste).padStart(2, '0')}`
  return `${texte} €`
}
export const PRIX_PACK_STUDIO_TEXTE = formaterEuros(PRIX_PACK_STUDIO_CENTS)

export type OffreStudio = { videos: number; prix_cents: number; prix_texte: string; delai_jours_ouvres: number }
export function offre(): OffreStudio {
  return { videos: VIDEOS_PACK_STUDIO, prix_cents: PRIX_PACK_STUDIO_CENTS, prix_texte: PRIX_PACK_STUDIO_TEXTE, delai_jours_ouvres: DELAI_LIVRAISON_JOURS_OUVRES }
}

const BASE_LIEN = 'https://prestiapp.fr/studio/commander/'
const JOUR_MS = 86_400_000

export type ProspectCommande = { prospect_id: string; marque_cle: string }

function secret(): string {
  const s = process.env.STUDIO_LIEN_SECRET
  if (!s || s.length < 16) throw new Error('STUDIO_LIEN_SECRET absente ou trop courte : aucun lien de commande du Studio possible')
  return s
}
const signer = (charge: string, cle: string): string => createHmac('sha256', cle).update(charge).digest('base64url')

/** Le lien privé de commande, valable DUREE_LIEN_JOURS jours. Lève une erreur sans secret (le Répondeur la prend pour « offre absente »). */
export function lienCommandeStudio(prospect: ProspectCommande, maintenant: Date = new Date()): string {
  const cle = secret()
  const expiration = Math.floor((maintenant.getTime() + DUREE_LIEN_JOURS * JOUR_MS) / 1000)
  const charge = Buffer.from(JSON.stringify({ p: prospect.prospect_id, m: prospect.marque_cle, e: expiration })).toString('base64url')
  return `${BASE_LIEN}${charge}.${signer(charge, cle)}`
}

/** Le prospect et la marque d'un jeton valide ; `null` pour une signature fausse, une charge mal formée ou un lien expiré. */
export function lireJetonCommande(jeton: string, maintenant: Date = new Date()): ProspectCommande | null {
  try {
    if (typeof jeton !== 'string' || jeton.length > 1000) return null
    const parties = jeton.split('.')
    if (parties.length !== 2) return null
    const [charge, signature] = parties
    // Comparaison des CHAÎNES en temps constant, pas des octets décodés : le dernier signe d'un base64url porte des bits de bourrage.
    const attendue = Buffer.from(signer(charge, secret()))
    const recue = Buffer.from(signature)
    if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null
    const lu = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8')) as { p?: unknown; m?: unknown; e?: unknown }
    if (typeof lu.p !== 'string' || typeof lu.m !== 'string' || typeof lu.e !== 'number') return null
    if (!lu.p || !lu.m || lu.e * 1000 <= maintenant.getTime()) return null
    return { prospect_id: lu.p, marque_cle: lu.m }
  } catch {
    return null
  }
}
