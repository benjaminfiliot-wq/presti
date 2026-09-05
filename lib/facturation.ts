// Conformité de facturation (v4 §10).
//
// Ce fichier concentre ce qui doit être JURIDIQUEMENT juste, à un endroit, avec ses
// sources — plutôt que dispersé dans des chaînes codées en dur au fil des écrans.
// Une mention fausse sur une facture n'est pas un défaut d'affichage : c'est un risque
// pour l'artisan.

/** Entrée en vigueur du CIBS pour la franchise en base (ordonnance n° 2025-1247 du 17/12/2025). */
export const DATE_CIBS = new Date('2026-09-01T00:00:00Z')
/** Fin de la tolérance BOFiP autorisant encore les anciennes références au CGI. */
export const FIN_TOLERANCE_CGI = new Date('2027-12-31T23:59:59Z')

export type BaseMention = 'auto' | 'cgi' | 'cibs'

/**
 * La mention de franchise en base, à la bonne date.
 *
 * Elle n'est PAS codée en dur : la recodification de la TVA du CGI vers le CIBS est
 * entrée en vigueur le 01/09/2026, avec une tolérance jusqu'au 31/12/2027 pendant
 * laquelle l'ancienne référence reste admise.
 *
 * Par défaut (`auto`), on sert « art. 293 B du CGI » TANT QUE la tolérance dure : c'est la
 * référence que tous les comptables, banques et clients reconnaissent, et celle que Presti
 * lui-même porte sur ses CGU et ses mentions légales — un document d'artisan et un document
 * de l'éditeur ne doivent pas se contredire (audit final, auditeur B, A4). Un artisan qui veut
 * déjà la nouvelle référence choisit `cibs`. Passée la tolérance, tout le monde bascule.
 */
export function mentionFranchise(base: BaseMention = 'auto', le: Date = new Date()): string {
  const CGI = 'TVA non applicable, art. 293 B du CGI.'
  const CIBS = 'TVA non applicable, art. L. 223-1 et s. du code des impositions sur les biens et services (CIBS).'
  if (base === 'cgi') {
    // Passée la tolérance, on ne laisse plus émettre une référence abrogée, même sur demande.
    return le > FIN_TOLERANCE_CGI ? CIBS : CGI
  }
  if (base === 'cibs') return CIBS
  return le > FIN_TOLERANCE_CGI ? CIBS : CGI
}

/** L'ancienne référence est-elle encore admise à cette date ? (sert à expliquer le choix) */
export function toleranceCgiEncoreValable(le: Date = new Date()): boolean {
  return le <= FIN_TOLERANCE_CGI
}

// ── SIREN / SIRET ────────────────────────────────────────────────────────────
// Le SIREN du client devient obligatoire sur les factures B2B. Le vérifier à la saisie
// évite un rejet par la plateforme au moment de l'émission, quand il est trop tard.

/** Contrôle de clé de Luhn — valide un SIREN (9 chiffres) ou un SIRET (14). */
export function sirenValide(v: string | null | undefined): boolean {
  const n = String(v ?? '').replace(/\s/g, '')
  if (!/^\d{9}$/.test(n) && !/^\d{14}$/.test(n)) return false
  // La Poste (356000000) est la seule exception connue à la clé de Luhn.
  if (n.startsWith('356000000')) return true
  let somme = 0
  for (let i = 0; i < n.length; i++) {
    let c = Number(n[n.length - 1 - i])
    if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9 }
    somme += c
  }
  return somme % 10 === 0
}

export const formaterSiren = (v: string) => String(v).replace(/\s/g, '').replace(/(\d{3})(?=\d)/g, '$1 ').trim()

// ── Catégorie d'opération (EN 16931) ─────────────────────────────────────────
// Un artisan facture presque toujours du MIXTE : de la fourniture (biens) et de la pose
// (services) sur la même facture. C'est le cas par défaut, et il faut qu'il soit proposé
// en premier, pas caché derrière « autre ».
export type CategorieOperation = 'mixte' | 'services' | 'biens'
export const CATEGORIES_OPERATION: { id: CategorieOperation; label: string; aide: string }[] = [
  { id: 'mixte', label: 'Fourniture et pose', aide: 'Le cas courant : vous vendez du matériel ET votre travail.' },
  { id: 'services', label: 'Main d’œuvre seule', aide: 'Vous n’avez fourni aucun matériel.' },
  { id: 'biens', label: 'Vente de matériel seule', aide: 'Vous avez vendu du matériel sans le poser.' },
]

// ── Motifs d'exonération codifiés ────────────────────────────────────────────
// Codes de la liste VATEX (EN 16931). ⚠️ Cette liste est volontairement COURTE et limitée
// aux cas qu'un artisan rencontre : mieux vaut trois codes sûrs qu'une liste exhaustive
// approximative. À revérifier contre la liste officielle avant l'échéance du 01/09/2027.
export const MOTIFS_EXONERATION: { code: string; label: string; mention: string }[] = [
  { code: 'VATEX-FR-FRANCHISE', label: 'Franchise en base de TVA', mention: mentionFranchise() },
  { code: 'VATEX-EU-AE', label: 'Autoliquidation par le client', mention: 'Autoliquidation — TVA due par le preneur.' },
  { code: 'VATEX-EU-O', label: 'Hors champ d’application de la TVA', mention: 'Opération hors du champ d’application de la TVA.' },
]

/** Le code d'exonération qui va avec le régime de l'artisan, quand aucun n'est choisi. */
export function codeExonerationParDefaut(tvaRegime: string | null | undefined): string | null {
  return (tvaRegime || 'franchise') === 'franchise' ? 'VATEX-FR-FRANCHISE' : null
}

// ── Bases HT par taux ────────────────────────────────────────────────────────
// Exigé par EN 16931 : la facture doit porter, pour chaque taux, la base HT et la TVA
// correspondante. Le total seul ne suffit pas.
export type Ligne = { quantite: number; prix_unitaire_ht: number; tva_taux: number }
export type BaseTaux = { taux: number; base_ht: number; tva: number }

export function basesParTaux(lignes: Ligne[], remisePct = 0): BaseTaux[] {
  const coef = 1 - Math.min(100, Math.max(0, remisePct)) / 100
  const par = new Map<number, number>()
  for (const l of lignes) {
    const ht = Number(l.quantite) * Number(l.prix_unitaire_ht) * coef
    if (!Number.isFinite(ht)) continue
    const t = Number(l.tva_taux) || 0
    par.set(t, (par.get(t) ?? 0) + ht)
  }
  return [...par.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([taux, base]) => ({
      taux,
      base_ht: Math.round(base * 100) / 100,
      tva: Math.round(base * (taux / 100) * 100) / 100,
    }))
}

/**
 * Empreinte d'une pièce comptable : sert à prouver qu'elle n'a pas bougé (§10.6).
 * Web Crypto plutôt que `node:crypto` — ce fichier est aussi importé par les écrans
 * (l'aperçu de la mention de franchise), et un import Node casserait leur compilation.
 */
export async function empreinte(contenu: string): Promise<string> {
  const octets = new TextEncoder().encode(contenu)
  const somme = await crypto.subtle.digest('SHA-256', octets)
  return [...new Uint8Array(somme)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
