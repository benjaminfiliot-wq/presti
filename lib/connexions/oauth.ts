import crypto from 'node:crypto'
import type { Capacite } from '../plans'
import { chiffrerPour, dechiffrerPour } from './chiffrement'

// OAuth Google de l'artisan (tâche 036-009) : portées minimales, état lié à la session, PKCE (S256).
// L'échange se fait sur Presti, jamais sur n8n (décision 1). Le client secret et les jetons ne quittent jamais le serveur.
// Fiches : plans/011-cadrage-01-11/p6-signature/connecteurs/gmail.md, drive-sheets.md ; demande de vérification : verification-google.md.

export type FournisseurGoogle = 'gmail' | 'google_agenda' | 'google_drive'
export const FOURNISSEURS_GOOGLE: readonly FournisseurGoogle[] = ['gmail', 'google_agenda', 'google_drive']

const G = 'https://www.googleapis.com/auth/'

/** Les portées demandées : LE MINIMUM, en lecture d'abord (p6 § 0.4). `openid email` sert seulement à afficher le compte branché
 *  et à ne pas brancher deux fois la même boîte (index connexions_vivante_unique). Toute portée en plus est un refus du juge. */
export const PORTEES: Readonly<Record<FournisseurGoogle, readonly string[]>> = {
  // Restreinte (vérification + évaluation de sécurité annuelle, décision 2) : la lecture seule ; le brouillon (gmail.compose) viendra
  // par une tâche dédiée, après la vérification.
  gmail: ['openid', 'email', `${G}gmail.readonly`],
  // Sensible : les créneaux occupés, rien d'autre (ni le titre ni les invités des rendez-vous).
  google_agenda: ['openid', 'email', `${G}calendar.freebusy`],
  // Non sensible : seulement les fichiers que Presti crée ou que l'artisan lui ouvre (sélecteur de fichiers), Sheets compris.
  google_drive: ['openid', 'email', `${G}drive.file`],
}

/** Ce que Google rend pour `email` dans le champ `scope` de la réponse. */
const ALIAS: Record<string, string> = { email: `${G}userinfo.email`, profile: `${G}userinfo.profile` }
const normaliser = (p: string): string => ALIAS[p] ?? p

/** La question d'offre de chaque fournisseur, posée par peut() (jamais `plan === …`). */
export const CAPACITE: Readonly<Record<FournisseurGoogle, Capacite>> = {
  gmail: 'canaux.email',
  google_agenda: 'assistant',
  google_drive: 'assistant',
}

/** Gmail en OAuth ne s'ouvre qu'une fois la vérification Google accordée (décision 2) : variable posée par Benj, pas par un agent. */
export function fournisseurOuvert(f: FournisseurGoogle, env: Record<string, string | undefined>): boolean {
  if (f === 'gmail') return env.GOOGLE_VERIFICATION_GMAIL === 'accordee'
  return true
}

export const estFournisseurGoogle = (v: unknown): v is FournisseurGoogle =>
  typeof v === 'string' && (FOURNISSEURS_GOOGLE as readonly string[]).includes(v)

export const URL_AUTORISATION = 'https://accounts.google.com/o/oauth2/v2/auth'
export const URL_JETON = 'https://oauth2.googleapis.com/token'
export const URL_REVOCATION = 'https://oauth2.googleapis.com/revoke'

/** Un essai de lecture par fournisseur, avant tout état « active » (C4, connexions_active_verifiee). */
export const ESSAI_LECTURE: Readonly<Record<FournisseurGoogle, { url: string; methode: 'GET' | 'POST' }>> = {
  gmail: { url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile', methode: 'GET' },
  google_agenda: { url: 'https://www.googleapis.com/calendar/v3/freeBusy', methode: 'POST' },
  google_drive: { url: 'https://www.googleapis.com/drive/v3/about?fields=kind', methode: 'GET' },
}

// ── PKCE (RFC 7636), méthode S256 seulement ───────────────────────────────────────────────────────────────────────────────────
export function nouveauVerificateur(): string { return crypto.randomBytes(48).toString('base64url') }
export function defi(verificateur: string): string { return crypto.createHash('sha256').update(verificateur).digest('base64url') }

// ── L'état, lié à la session ─────────────────────────────────────────────────────────────────────────────────────────────────
// `state` est 32 octets aléatoires. Il voyage vers Google en clair ; sa copie, avec l'uid de la session qui a cliqué, le vérificateur
// PKCE et l'heure limite, vit dans un cookie HttpOnly, Secure, SameSite=Lax, chiffré pour l'app (lié à « oauth-etat »). Au retour :
// même `state` (comparaison à temps constant), cookie intact et non échu, sinon rien n'est échangé.
export const COOKIE_ETAT = '__Host-cnx_oauth'
export const DUREE_ETAT_MS = 10 * 60 * 1000

export type EtatOAuth = { uid: string; iat: number; fournisseur: FournisseurGoogle; state: string; verificateur: string; expire: number }

export function scellerEtat(e: EtatOAuth, env: Record<string, string | undefined>): string {
  return chiffrerPour('app', JSON.stringify(e), 'oauth-etat', env)
}

export function ouvrirEtat(scelle: string | null | undefined, env: Record<string, string | undefined>): EtatOAuth | null {
  const clair = dechiffrerPour('app', scelle, 'oauth-etat', env)
  if (!clair) return null
  try {
    const e = JSON.parse(clair) as Partial<EtatOAuth>
    if (typeof e.uid !== 'string' || typeof e.iat !== 'number' || typeof e.state !== 'string' || typeof e.verificateur !== 'string'
      || typeof e.expire !== 'number' || !estFournisseurGoogle(e.fournisseur)) return null
    return e as EtatOAuth
  } catch { return null }
}

export function egalConstant(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8'), y = Buffer.from(b, 'utf8')
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

export function cookieEtat(valeur: string): string {
  return `${COOKIE_ETAT}=${valeur}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DUREE_ETAT_MS / 1000}`
}
export const COOKIE_ETAT_EFFACE = `${COOKIE_ETAT}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

export function lireCookie(req: Request, nom: string): string | null {
  const brut = req.headers.get('cookie') || ''
  for (const morceau of brut.split(';')) {
    const i = morceau.indexOf('=')
    if (i > 0 && morceau.slice(0, i).trim() === nom) return morceau.slice(i + 1).trim()
  }
  return null
}

export function urlAutorisation(p: { clientId: string; redirection: string; fournisseur: FournisseurGoogle; state: string; defi: string }): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirection,
    response_type: 'code',
    scope: PORTEES[p.fournisseur].join(' '),
    state: p.state,
    code_challenge: p.defi,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
    // Jamais les portées accordées auparavant à Presti : la connexion porte exactement ce qu'elle demande.
    include_granted_scopes: 'false',
  })
  return `${URL_AUTORISATION}?${q.toString()}`
}

/** Les portées accordées doivent être EXACTEMENT celles demandées : une en moins (case décochée) ou une en plus = refus. */
export function controlerPortees(f: FournisseurGoogle, accordees: string | undefined):
  { ok: true; portees: string[] } | { ok: false; motif: 'portee_refusee' | 'portee_elargie' } {
  const voulues = new Set(PORTEES[f].map(normaliser))
  const recues = new Set(String(accordees || '').split(/\s+/).filter(Boolean).map(normaliser))
  for (const p of recues) if (!voulues.has(p)) return { ok: false, motif: 'portee_elargie' }
  for (const p of voulues) if (p !== 'openid' && !recues.has(p)) return { ok: false, motif: 'portee_refusee' }
  return { ok: true, portees: [...recues].sort() }
}

/** L'adresse du compte, lue dans l'id_token reçu DIRECTEMENT du point de jeton de Google, en TLS (OpenID Connect Core § 3.1.3.7 :
 *  la signature peut alors ne pas être vérifiée) ; on contrôle tout de même l'émetteur, le destinataire et l'adresse vérifiée. */
export function compteDepuisIdToken(idToken: unknown, clientId: string): string | null {
  if (typeof idToken !== 'string') return null
  const p = idToken.split('.')
  if (p.length !== 3) return null
  try {
    const c = JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8')) as Record<string, unknown>
    if (c.iss !== 'https://accounts.google.com' && c.iss !== 'accounts.google.com') return null
    if (c.aud !== clientId || c.email_verified !== true || typeof c.email !== 'string') return null
    const email = c.email.trim().toLowerCase()
    return email.length >= 3 && email.length <= 254 ? email : null
  } catch { return null }
}
