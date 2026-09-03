import crypto from 'crypto'

// Chiffrement applicatif des identifiants de canaux (v4 §B2).
// AES-256-GCM : confidentialité ET intégrité (une ligne modifiée en base ne déchiffre plus).
// La clé vit UNIQUEMENT en variable d'environnement (CANAUX_KEY) — jamais dans le dépôt,
// jamais en base, jamais dans un log. Sans elle, les identifiants stockés sont inexploitables.

const ALGO = 'aes-256-gcm'

function cle(): Buffer | null {
  const b64 = process.env.CANAUX_KEY
  if (!b64) return null
  try {
    const k = Buffer.from(b64, 'base64')
    return k.length === 32 ? k : null
  } catch { return null }
}

export function chiffrementDisponible(): boolean { return cle() !== null }

/** Chiffre une chaîne. Format stocké : v1.<iv>.<tag>.<données> (base64url). */
export function chiffrer(clair: string): string {
  const k = cle()
  if (!k) throw new Error('CANAUX_KEY absente : refus de stocker un identifiant en clair.')
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv(ALGO, k, iv)
  const data = Buffer.concat([c.update(clair, 'utf8'), c.final()])
  const tag = c.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join('.')
}

/** Déchiffre. Renvoie null si la clé est absente, le format inconnu ou l'intégrité rompue. */
export function dechiffrer(stocke: string | null | undefined): string | null {
  const k = cle()
  if (!k || !stocke) return null
  const p = String(stocke).split('.')
  if (p.length !== 4 || p[0] !== 'v1') return null
  try {
    const d = crypto.createDecipheriv(ALGO, k, Buffer.from(p[1], 'base64url'))
    d.setAuthTag(Buffer.from(p[2], 'base64url'))
    return Buffer.concat([d.update(Buffer.from(p[3], 'base64url')), d.final()]).toString('utf8')
  } catch { return null }
}

/** Aperçu sûr d'un secret pour l'interface (jamais le secret lui-même). */
export function masque(v: string | null | undefined): string {
  if (!v) return ''
  return '•'.repeat(Math.min(10, Math.max(6, v.length)))
}
