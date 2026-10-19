// CRM — les PHOTOS et PIÈCES d'un chantier (plan plans/crm-idees-twenty-1810.md, n°5 ; table chantier_pieces et bucket privé
// chantier-pieces, migration 0163). Module pur (imports purs seulement) : rejoué par scripts/crm-lot3-qa.mjs.
//
//  • le TYPE RÉEL d'un fichier se lit dans ses premiers octets (jamais dans son nom ni dans l'en-tête annoncé par le navigateur) :
//    JPEG, PNG, WebP, PDF ; tout le reste est refusé (HEIC, SVG, exécutables…) ;
//  • le CHEMIN de stockage est fabriqué ici, jamais choisi par l'utilisateur : <artisan>/<chantier>/<identifiant>.<ext> ;
//  • le QUOTA du compte : la somme des tailles enregistrées (une ligne supprimée libère sa place) contre le plafond de l'offre.
import { detecterTypeImage } from '../typeImage.ts'
import { PLAFOND_PIECES_CHANTIER_MO, type PlanId } from '../plans.ts'

export const TYPES_PIECE = ['avant', 'pendant', 'apres', 'probleme', 'facture_fournisseur', 'plan', 'autre'] as const
export type TypePiece = (typeof TYPES_PIECE)[number]
export const LIBELLES_PIECE: Record<TypePiece, string> = {
  avant: 'Avant travaux', pendant: 'Pendant', apres: 'Après', probleme: 'Problème constaté', facture_fournisseur: 'Facture fournisseur', plan: 'Plan', autre: 'Autre',
}
export const TAILLE_MAX_PIECE = 4 * 1024 * 1024
export const MIMES_PIECE = ['image/webp', 'image/jpeg', 'image/png', 'application/pdf'] as const
export type MimePiece = (typeof MIMES_PIECE)[number]
/** Durée de validité des adresses signées d'affichage : le temps de regarder une fiche, pas plus. */
export const DUREE_LIEN_SIGNE = 600

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Le type RÉEL d'un fichier, lu dans ses octets : une image (JPEG, PNG, WebP) ou un PDF ; sinon null. */
export function typeReel(octets: Uint8Array): { mime: MimePiece; ext: 'webp' | 'jpg' | 'png' | 'pdf' } | null {
  if (octets.length >= 5 && octets[0] === 0x25 && octets[1] === 0x50 && octets[2] === 0x44 && octets[3] === 0x46 && octets[4] === 0x2d) return { mime: 'application/pdf', ext: 'pdf' }
  const t = detecterTypeImage(octets)
  return t.ok ? { mime: t.type, ext: t.ext } : null
}

/** Le chemin de stockage d'une pièce : jamais un nom venu de l'utilisateur. */
export function cheminPiece(artisanId: string, chantierId: string, id: string, ext: string): string {
  if (![artisanId, chantierId, id].every((x) => RE_UUID.test(x)) || !['webp', 'jpg', 'png', 'pdf'].includes(ext)) throw new Error('chemin invalide')
  return `${artisanId.toLowerCase()}/${chantierId.toLowerCase()}/${id.toLowerCase()}.${ext}`
}

const idPlan = (plan: string | null | undefined): PlanId =>
  plan && Object.prototype.hasOwnProperty.call(PLAFOND_PIECES_CHANTIER_MO, plan) ? (plan as PlanId) : 'gratuit'
export const plafondPieces = (plan: string | null | undefined): number => PLAFOND_PIECES_CHANTIER_MO[idPlan(plan)] * 1024 * 1024

/** Le fichier tient-il encore dans l'offre ? `utilise` : la somme des tailles enregistrées du compte. */
export function verdictQuotaPieces(plan: string | null | undefined, utilise: number, taille: number): { ok: true } | { ok: false; message: string } {
  const plafond = plafondPieces(plan)
  if (taille > TAILLE_MAX_PIECE) return { ok: false, message: 'Fichier trop lourd : 4 Mo au plus (une photo est réduite automatiquement ; un PDF, à compresser).' }
  if (utilise + taille > plafond) return { ok: false, message: plafond ? `L’espace des photos de chantier est plein (${Math.round(plafond / 1024 / 1024)} Mo) : supprimez des photos anciennes.` : 'Les photos de chantier font partie de l’offre Signature.' }
  return { ok: true }
}

export type ChampsPiece = { type: TypePiece; legende: string | null; pris_le: string | null }
/** Les champs d'une pièce (à l'envoi comme à la correction) : type de la liste, légende ≤ 200, date de prise passée ou présente. */
export function validerChampsPiece(b: Record<string, unknown>, maintenant: Date, creation: boolean): { ok: true; valeur: Partial<ChampsPiece> } | { ok: false; erreur: string } {
  const permis = ['type', 'legende', 'pris_le']
  const inconnus = Object.keys(b).filter((k) => !permis.includes(k))
  if (inconnus.length) return { ok: false, erreur: `Champ inconnu : ${inconnus.slice(0, 3).join(', ')}.` }
  const v: Partial<ChampsPiece> = {}
  if (b.type !== undefined) {
    if (typeof b.type !== 'string' || !(TYPES_PIECE as readonly string[]).includes(b.type)) return { ok: false, erreur: 'Type : valeur inconnue.' }
    v.type = b.type as TypePiece
  } else if (creation) v.type = 'pendant'
  if (b.legende !== undefined && b.legende !== null && b.legende !== '') {
    if (typeof b.legende !== 'string' || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(b.legende)) return { ok: false, erreur: 'Légende : texte attendu.' }
    const t = b.legende.trim()
    if ([...t].length > 200) return { ok: false, erreur: 'Légende : 200 caractères au plus.' }
    v.legende = t || null
  } else if (b.legende !== undefined) v.legende = null
  if (b.pris_le !== undefined && b.pris_le !== null && b.pris_le !== '') {
    const t = typeof b.pris_le === 'string' ? Date.parse(b.pris_le) : NaN
    if (Number.isNaN(t) || t > maintenant.getTime() + 5 * 60_000 || t < Date.UTC(2000, 0, 1)) return { ok: false, erreur: 'Date de prise invalide.' }
    v.pris_le = new Date(t).toISOString()
  }
  if (!creation && !Object.keys(v).length) return { ok: false, erreur: 'Rien à modifier.' }
  return { ok: true, valeur: v }
}

export type Piece = { id: string; type: TypePiece; legende: string | null; pris_le: string; taille: number; mime: MimePiece; url: string | null }
/** Le compte des pièces par type (les onglets de la galerie). */
export function compterParType(pieces: readonly { type: string }[]): Record<TypePiece | 'tout', number> {
  const c = Object.fromEntries([['tout', pieces.length], ...TYPES_PIECE.map((t) => [t, 0])]) as Record<TypePiece | 'tout', number>
  for (const p of pieces) if ((TYPES_PIECE as readonly string[]).includes(p.type)) c[p.type as TypePiece]++
  return c
}
