import crypto from 'node:crypto'

// Chiffrement des autorisations des connecteurs (tâche 036-009, décision 1 de
// plans/011-cadrage-01-11/p6-signature/premiere-reponse.md § 5).
//
// Deux destinataires, deux clés, jamais l'une pour l'autre :
//   • « app » : CANAUX_KEY, la clé de lib/secretBox.ts ; chiffre connexions.secret_app, que seule l'application ouvre ;
//   • « n8n » : BOITE_CLE_N8N, la clé propre à n8n (nom fixé par 036-003, connecteurs/imap.md) ; chiffre connexions.secret_n8n,
//     que n8n ouvre en mémoire, à l'exécution. n8n ne reçoit jamais CANAUX_KEY ; l'application ne lit jamais secret_n8n.
//
// Format stocké : exactement celui de lib/secretBox.ts:21-30, `v1.<iv>.<tag>.<données>` en base64url (AES-256-GCM, iv de 12 octets,
// étiquette de 16), contrôlé par la base (0193_systeme_agents.sql, connexions_secret_*_format). lib/secretBox.ts n'est pas modifié.
// Une différence, voulue par 0193 : chaque chiffré est LIÉ à sa ligne et à son destinataire par la donnée associée GCM
// (`connexions:<id>:<destinataire>`). Un chiffré recopié d'une ligne à l'autre, ou de secret_app vers secret_n8n, ne s'ouvre plus.
// Les clés vivent en variable d'environnement seulement : jamais dans le dépôt, jamais en base, jamais dans un journal.

export type Destinataire = 'app' | 'n8n'

export const VARIABLE_CLE: Record<Destinataire, string> = { app: 'CANAUX_KEY', n8n: 'BOITE_CLE_N8N' }

/** Le format que la base accepte (0193 : connexions_secret_app_format, connexions_secret_n8n_format). */
export const FORMAT_V1 = /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/

type Env = Record<string, string | undefined>

function lireCle(b64: string | undefined): Buffer | null {
  if (!b64) return null
  try {
    const k = Buffer.from(b64, 'base64')
    return k.length === 32 ? k : null
  } catch { return null }
}

/** La clé d'un destinataire. La clé de n8n est refusée si elle est la même que celle de l'app : la séparation serait fictive. */
function cle(dest: Destinataire, env: Env): Buffer | null {
  const k = lireCle(env[VARIABLE_CLE[dest]])
  if (!k) return null
  if (dest === 'n8n') {
    const app = lireCle(env[VARIABLE_CLE.app])
    if (app && crypto.timingSafeEqual(app, k)) return null
  }
  return k
}

function donneeAssociee(lien: string, dest: Destinataire): Buffer {
  return Buffer.from(`connexions:${lien}:${dest}`, 'utf8')
}

/** Les deux clés sont-elles posées (et distinctes) ? Sans elles, aucune autorisation n'est enregistrée. */
export function chiffrementsDisponibles(env: Env = process.env): boolean {
  return cle('app', env) !== null && cle('n8n', env) !== null
}

/** Chiffre pour un destinataire, lié à la ligne `lien` (l'id de la connexion). Refuse plutôt que d'écrire en clair. */
export function chiffrerPour(dest: Destinataire, clair: string, lien: string, env: Env = process.env): string {
  const k = cle(dest, env)
  if (!k) throw new Error(`${VARIABLE_CLE[dest]} absente ou invalide : refus de stocker une autorisation en clair.`)
  if (!lien) throw new Error('chiffrerPour : la ligne liée est obligatoire.')
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', k, iv)
  c.setAAD(donneeAssociee(lien, dest))
  const data = Buffer.concat([c.update(clair, 'utf8'), c.final()])
  const tag = c.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join('.')
}

/** Déchiffre. null si la clé manque, le format est inconnu, la ligne ou le destinataire ne correspondent pas, ou l'intégrité est rompue. */
export function dechiffrerPour(dest: Destinataire, stocke: string | null | undefined, lien: string, env: Env = process.env): string | null {
  const k = cle(dest, env)
  if (!k || !stocke || !lien || !FORMAT_V1.test(stocke)) return null
  const p = stocke.split('.')
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(p[1], 'base64url'))
    d.setAAD(donneeAssociee(lien, dest))
    d.setAuthTag(Buffer.from(p[2], 'base64url'))
    return Buffer.concat([d.update(Buffer.from(p[3], 'base64url')), d.final()]).toString('utf8')
  } catch { return null }
}
