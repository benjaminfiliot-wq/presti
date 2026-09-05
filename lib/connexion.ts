import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { lireUserAgent } from '@/lib/userAgent'

// Le code par email à la connexion (prompt v7, bloc 2).
//
// Le principe : le mot de passe ne suffit plus. Après un mot de passe juste, Presti envoie un
// code à 6 chiffres à l'adresse du compte ; la session Supabase n'est rendue au navigateur
// qu'une fois le code saisi — avant, elle n'existe nulle part côté client. Chaque session
// vérifiée est notée dans `sessions_verifiees` ; lib/authArtisan refuse les autres.
//
// Pourquoi PAR SESSION et pas une date sur l'artisan : avec une seule date « dernière
// vérification », un jeton obtenu par un tiers avec le mot de passe volé (l'API GoTrue est
// publique, la clé anonyme aussi) deviendrait valable dès que le vrai titulaire se
// reconnecte. Ici, un jeton ne vaut que si SA session a passé le code.
//
// Ce que ça ne couvre pas, écrit ici pour que personne ne le découvre plus tard : les lectures
// directes du navigateur vers PostgREST (RLS) restent ouvertes à un jeton au mot de passe seul.
// Le verrou protège les routes de Presti — comme la révocation des sessions (v4 §11).

export const COOKIE_APPAREIL = 'appareil_confiance'
export const JOURS_APPAREIL = 30
export const MINUTES_CODE = 10
export const ESSAIS_CODE = 5
export const ERREUR_IDENTIFIANTS = 'Email ou mot de passe incorrect.'

/** Client anonyme jetable : vérifie le mot de passe exactement comme le navigateur le ferait. */
export function clientPublic() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/** Secret serveur : posé explicitement, sinon dérivé de la clé service — il tourne avec elle. */
function secret(): Buffer {
  const explicite = process.env.PRESTI_SECRET_CONNEXION
  if (explicite) return crypto.createHash('sha256').update(explicite).digest()
  return crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || '').update('presti:connexion:v1').digest()
}

/** Le code n'est jamais stocké en clair : HMAC du couple (compte, code), avec le secret serveur. */
export const hacherCode = (userId: string, code: string): string =>
  crypto.createHmac('sha256', secret()).update(`${userId}:${code}`).digest('hex')

export const genererCode = (): string => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
export const formaterCode = (code: string): string => `${code.slice(0, 3)} ${code.slice(3)}`

/** L'email du code — sobre, au nom de Presti (c'est la console, pas la marque de l'artisan). */
export function gabaritCode(code: string): { subject: string; text: string } {
  const joli = formaterCode(code)
  return {
    subject: `Votre code Presti : ${joli}`,
    text: `Bonjour,\n\nVoici votre code de connexion à Presti :\n\n    ${joli}\n\nIl est valable ${MINUTES_CODE} minutes et ne sert qu'une fois.\n\nSi vous n'êtes pas à l'origine de cette connexion, quelqu'un connaît votre mot de passe : changez-le dès maintenant depuis Paramètres → Sécurité, ou par « Mot de passe oublié ».\n\n— Presti`,
  }
}

/** Le `session_id` porté par le jeton. Sans vérifier la signature : Supabase l'a déjà fait. */
export function sessionIdDuJeton(token: string): string | null {
  try {
    const charge = token.split('.')[1]
    if (!charge) return null
    const json = JSON.parse(Buffer.from(charge.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    return typeof json?.session_id === 'string' ? json.session_id : null
  } catch { return null }
}

// ── Sessions vérifiées ───────────────────────────────────────────────────────────

export type MoyenVerification = 'code_email' | 'appareil' | 'service'

// Cache court par session : le contrôle est sur chaque appel de route ; une session
// vérifiée le reste (la révocation passe par `sessions_invalides_avant`, contrôlé avant).
const cacheVerifiees = new Map<string, number>()

export async function marquerSessionVerifiee(sessionId: string, userId: string, moyen: MoyenVerification): Promise<boolean> {
  const { error } = await supabaseAdmin.from('sessions_verifiees').upsert({ session_id: sessionId, user_id: userId, moyen }, { onConflict: 'session_id' })
  if (error) { console.error('[connexion] sessions_verifiees:', error.message); return false }
  await supabaseAdmin.from('artisans').update({ connexion_verifiee_le: new Date().toISOString() }).eq('id', userId)
  cacheVerifiees.set(sessionId, Date.now() + 60_000)
  return true
}

/** Cette session a-t-elle passé le code ? Fail-CLOSED : une base qui ne répond pas ne laisse pas entrer. */
export async function sessionVerifiee(sessionId: string): Promise<boolean> {
  const j = cacheVerifiees.get(sessionId)
  if (j && j > Date.now()) return true
  const { data, error } = await supabaseAdmin.from('sessions_verifiees').select('session_id').eq('session_id', sessionId).maybeSingle()
  if (error) { console.error('[connexion] lecture sessions_verifiees:', error.message); return false }
  if (data) cacheVerifiees.set(sessionId, Date.now() + 60_000)
  return !!data
}

// ── Appareils de confiance ───────────────────────────────────────────────────────
//
// Le cookie porte `<id>.<secret>.<signature>` : l'identifiant de la ligne, un secret aléatoire
// et une signature HMAC du tout. La base ne garde que l'EMPREINTE sha256(agent | secret) :
// une ligne lue en base ne permet pas de fabriquer le cookie, et un cookie volé ne vaut que
// sur un navigateur au même agent. Jamais l'adresse IP seule : elle change avec la box, la 4G,
// le train — et ne distingue rien derrière un partage de connexion.

const signer = (v: string) => crypto.createHmac('sha256', secret()).update(v).digest('base64url')
const egal = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

export const empreinteAppareil = (ua: string, secretAppareil: string): string =>
  crypto.createHash('sha256').update(`${ua}|${secretAppareil}`).digest('hex')

export function lireCookieAppareil(req: Request): { id: string; secret: string } | null {
  const brut = req.headers.get('cookie') ?? ''
  const m = brut.match(new RegExp(`(?:^|;\\s*)${COOKIE_APPAREIL}=([^;]+)`))
  if (!m) return null
  const [id, s, sig] = m[1].trim().split('.')
  if (!id || !s || !sig || !egal(sig, signer(`${id}.${s}`))) return null
  return { id, secret: s }
}

export const enteteCookieAppareil = (valeur: string, maxAgeSec: number): string =>
  `${COOKIE_APPAREIL}=${valeur}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`
export const enteteCookieAppareilVide = (): string => enteteCookieAppareil('', 0)

type Appareil = { id: string; user_id: string; empreinte: string; expire_le: string; revoque_le: string | null }

/** L'appareil du cookie est-il un appareil de confiance de CE compte, encore valable ? */
export async function appareilReconnu(req: Request, userId: string): Promise<{ id: string } | null> {
  const c = lireCookieAppareil(req)
  if (!c || !/^[0-9a-f-]{36}$/i.test(c.id)) return null
  const { data } = await supabaseAdmin.from('appareils_confiance').select('id, user_id, empreinte, expire_le, revoque_le').eq('id', c.id).maybeSingle()
  const a = data as Appareil | null
  if (!a || a.user_id !== userId || a.revoque_le || new Date(a.expire_le).getTime() < Date.now()) return null
  if (!egal(empreinteAppareil(req.headers.get('user-agent') ?? '', c.secret), a.empreinte)) return null
  await supabaseAdmin.from('appareils_confiance').update({ dernier_usage_le: new Date().toISOString() }).eq('id', a.id)
  return { id: a.id }
}

/** Enregistre l'appareil courant comme appareil de confiance et rend la valeur du cookie à poser. */
export async function creerAppareil(req: Request, userId: string): Promise<string | null> {
  const ua = req.headers.get('user-agent') ?? ''
  const s = crypto.randomBytes(24).toString('base64url')
  const { appareil, navigateur } = lireUserAgent(ua)
  const { data, error } = await supabaseAdmin.from('appareils_confiance').insert({
    user_id: userId,
    empreinte: empreinteAppareil(ua, s),
    nom: `${appareil} · ${navigateur}`,
    expire_le: new Date(Date.now() + JOURS_APPAREIL * 86_400_000).toISOString(),
  }).select('id').single()
  if (error || !data) { console.error('[connexion] appareils_confiance:', error?.message); return null }
  return `${data.id}.${s}.${signer(`${data.id}.${s}`)}`
}

/** Révoque un appareil (ou tous) : la ligne reste datée, le cookie ne vaut plus rien. Rend le nombre révoqué. */
export async function revoquerAppareils(userId: string, id?: string): Promise<number> {
  let q = supabaseAdmin.from('appareils_confiance').update({ revoque_le: new Date().toISOString() }).eq('user_id', userId).is('revoque_le', null)
  if (id) q = q.eq('id', id)
  const { data, error } = await q.select('id')
  if (error) { console.error('[connexion] révocation appareils:', error.message); return 0 }
  return data?.length ?? 0
}

export type AppareilListe = { id: string; nom: string; cree_le: string; expire_le: string; dernier_usage_le: string | null; courant: boolean }

export async function listerAppareils(req: Request, userId: string): Promise<AppareilListe[]> {
  const { data } = await supabaseAdmin.from('appareils_confiance')
    .select('id, nom, cree_le, expire_le, dernier_usage_le')
    .eq('user_id', userId).is('revoque_le', null).gt('expire_le', new Date().toISOString())
    .order('cree_le', { ascending: false })
  const courant = lireCookieAppareil(req)?.id ?? null
  return ((data ?? []) as Omit<AppareilListe, 'courant'>[]).map((a) => ({ ...a, courant: a.id === courant }))
}
