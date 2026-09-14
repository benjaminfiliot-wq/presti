import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { actif } from '@/lib/flags'
import { sessionVerifiee } from '@/lib/connexion'
import { suspensionEnCours } from '@/lib/suspension'

// Authentification des routes serveur, avec RÉVOCATION RÉELLE (v4 §11).
//
// Le problème que ce fichier résout, et qu'un test a mis en évidence : un jeton d'accès
// Supabase est autoporteur. `signOut` révoque le jeton de RAFRAÎCHISSEMENT, pas le jeton
// d'accès déjà émis — qui reste donc valable jusqu'à son expiration (une heure par
// défaut). Concrètement : un jeton copié depuis un poste partagé continue d'ouvrir le
// compte pendant une heure après la déconnexion. « Se déconnecter partout » ne
// déconnectait de rien tout de suite.
//
// La parade : l'artisan porte une date de révocation. Tout jeton émis AVANT cette date
// est refusé par nos routes, immédiatement. Le contrôle coûte une lecture déjà faite
// (on charge l'artisan de toute façon).
//
// Limite assumée, écrite ici pour que personne ne la découvre plus tard : ce verrou
// protège les routes de Presti. Les lectures directes depuis le navigateur vers
// PostgREST restent régies par la RLS et l'expiration du jeton. Les actions sensibles
// (identifiants de canaux, tarifs, suppressions, documents) passent toutes par ici.

export type Session = { uid: string; iat: number; email: string | null }
export type EchecAuth = { error: string; status: 401 | 403; code?: 'mfa_requise' | 'code_requis' | 'suspendu' }

/** La charge utile du jeton, sans vérifier la signature — Supabase l'a déjà fait. */
function chargeJeton(token: string): Record<string, unknown> | null {
  try {
    const charge = token.split('.')[1]
    if (!charge) return null
    return JSON.parse(Buffer.from(charge.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch { return null }
}

/** Lit l'`iat` (date d'émission) du jeton. */
function dateEmission(token: string): number | null {
  const iat = Number(chargeJeton(token)?.iat)
  return Number.isFinite(iat) ? iat : null
}

// ── Double authentification (sprint J-1 §6) ─────────────────────────────────────
//
// Un jeton porte son niveau d'assurance : `aal1` = mot de passe seul, `aal2` = second
// facteur validé dans cette session. Quand l'artisan a activé une application
// d'authentification, un jeton `aal1` ne doit plus ouvrir nos routes — sinon un mot de
// passe volé suffirait, et la 2FA ne serait qu'un décor. Le contrôle est ici, au centre,
// pour que les 28 routes en héritent sans être réécrites. Un compte SANS facteur vérifié
// n'est pas touché : même réponse qu'avant, à l'octet près.

export const ERREUR_MFA = 'Double authentification requise.'
/** Un compte suspendu (v10 J2b) : l'accès est coupé, les données sont intactes, et c'est réversible. */
export const ERREUR_SUSPENDU = 'Votre compte est suspendu. Écrivez-nous depuis la page de contact : vos données sont intactes.'
type Facteur = { factor_type?: string; status?: string }
type UtilisateurJeton = { id: string; factors?: Facteur[] }
const totpVerifie = (f: Facteur[]) => f.some((x) => x.factor_type === 'totp' && x.status === 'verified')

// GoTrue renvoie les facteurs avec `/user` : on les lit là, sans appel de plus. S'ils
// manquent (ancienne version), l'API admin fait foi — avec un cache court par artisan.
const cacheFacteurs = new Map<string, { verifie: boolean; jusqua: number }>()
async function aUnFacteurVerifie(u: UtilisateurJeton): Promise<boolean> {
  if (Array.isArray(u.factors)) return totpVerifie(u.factors)
  const c = cacheFacteurs.get(u.id)
  if (c && c.jusqua > Date.now()) return c.verifie
  const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: u.id })
  // En cas d'erreur de l'API, on ne bloque pas 28 routes sur un incident Supabase — on le note.
  if (error) { console.error('[mfa] listFactors:', error.message); return false }
  const verifie = totpVerifie((data?.factors ?? []) as Facteur[])
  cacheFacteurs.set(u.id, { verifie, jusqua: Date.now() + 60_000 })
  return verifie
}

/** Vrai si l'artisan a activé la 2FA mais que ce jeton ne l'a pas passée. */
async function mfaManquante(token: string, u: UtilisateurJeton): Promise<boolean> {
  if (chargeJeton(token)?.aal === 'aal2') return false
  return aUnFacteurVerifie(u)
}

// ── Le code par email (prompt v7, bloc 2) ────────────────────────────────────────
//
// Un compte SANS application d'authentification est protégé par le code envoyé par email :
// sa session doit figurer dans `sessions_verifiees` (posée par api/auth/code/verifier, ou
// par un appareil de confiance). Un jeton obtenu directement auprès de GoTrue avec le mot de
// passe — ce que fait n'importe qui avec la clé anonyme — n'ouvre AUCUNE route tant que le
// code n'a pas été prouvé. Un compte AVEC application d'authentification est déjà tenu à
// aal2 (ci-dessus) : c'est elle son second facteur, pas l'email. Même règle pour tous,
// fondateurs compris.

export const ERREUR_CODE = 'Connexion à vérifier : reconnectez-vous, un code vous sera envoyé par email.'

/** Vrai si ce jeton doit encore prouver le code email. */
async function codeManquant(token: string, u: UtilisateurJeton): Promise<boolean> {
  if (!actif('codeEmail')) return false
  const charge = chargeJeton(token)
  if (charge?.aal === 'aal2') return false
  if (await aUnFacteurVerifie(u)) return false // c'est mfaManquante qui juge, juste avant
  const sid = typeof charge?.session_id === 'string' ? charge.session_id : null
  return !sid || !(await sessionVerifiee(sid))
}

/**
 * Vérifie le jeton porté par la requête et renvoie l'identifiant de l'artisan,
 * ou un échec explicite. À utiliser à la place de `auth.getUser` seul.
 */
export async function authArtisan(req: Request): Promise<Session | EchecAuth> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Non authentifié', status: 401 }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return { error: 'Session expirée, reconnecte-toi.', status: 401 }

  const iat = dateEmission(token)
  // La suspension se lit par lib/suspension.ts (une requête directe sur `suspensions`, fail-closed) : l'imbrication
  // PostgREST (`suspensions!left(...)`, puis `suspensions!artisan_id(...)`) a échoué deux fois en silence en production
  // (PGRST201 : trois clés de suspensions vers artisans ; un artisan suspendu obtenait 200 au lieu de 403 —
  // scripts/suspension-e2e.mjs, 14/09). Une lecture de plus par requête vaut mieux qu'une suspension sans effet.
  const [{ data: art }, suspension] = await Promise.all([
    supabaseAdmin.from('artisans').select('sessions_invalides_avant').eq('id', data.user.id).maybeSingle(),
    suspensionEnCours(data.user.id),
  ])
  if (suspension) return { error: suspension.message?.trim() || ERREUR_SUSPENDU, status: 403, code: 'suspendu' }

  const seuil = art?.sessions_invalides_avant ? Math.floor(new Date(art.sessions_invalides_avant).getTime() / 1000) : 0
  if (seuil && iat !== null && iat < seuil) {
    return { error: 'Cette session a été fermée. Reconnecte-toi.', status: 401 }
  }
  if (await mfaManquante(token, data.user as UtilisateurJeton)) return { error: ERREUR_MFA, status: 401, code: 'mfa_requise' }
  if (await codeManquant(token, data.user as UtilisateurJeton)) return { error: ERREUR_CODE, status: 401, code: 'code_requis' }
  return { uid: data.user.id, iat: iat ?? 0, email: data.user.email ?? null }
}

/**
 * Ferme réellement toutes les sessions de cet artisan.
 *
 * Deux verrous, et il faut les DEUX — c'est la leçon du défaut trouvé le 2026-09-03 :
 *  1. le seuil `sessions_invalides_avant` invalide les jetons d'ACCÈS déjà émis ;
 *  2. la suppression des sessions en base tue les jetons de RAFRAÎCHISSEMENT.
 *
 * Sans le second, un jeton copié se refabriquait un accès indéfiniment, pendant que
 * l'interface affichait « toutes vos sessions ont été fermées ». Le premier code appelait
 * `auth.admin.signOut(uid, 'global')` — or cette API attend un JETON, pas un identifiant :
 * elle répondait 403, et l'erreur était jetée en silence. Une garantie de sécurité fausse
 * est pire qu'une garantie absente : la victime ne change pas son mot de passe.
 *
 * Renvoie false si la révocation a échoué — l'appelant DOIT le dire, jamais annoncer un
 * succès qu'il n'a pas.
 */
export async function revoquerSessions(uid: string): Promise<boolean> {
  // Une seconde dans le futur : un jeton émis pendant la même seconde que la révocation
  // serait sinon accepté (l'`iat` est en secondes entières).
  const quand = new Date(Date.now() + 1000).toISOString()
  const { error: eSeuil } = await supabaseAdmin.from('artisans')
    .update({ sessions_invalides_avant: quand }).eq('id', uid)
  if (eSeuil) { console.error('[revocation] seuil:', eSeuil.message); return false }

  const { error: eSessions } = await supabaseAdmin.rpc('revoquer_sessions_auth', { p_uid: uid })
  if (eSessions) { console.error('[revocation] sessions:', eSessions.message); return false }
  // v9 J2 — les appareils abonnés aux notifications tombent avec les sessions : un jeton volé ne garde pas
  // un canal vers l'artisan (revue du 06/09). Au mieux — la révocation, elle, est acquise.
  const { error: ePush } = await supabaseAdmin.from('push_abonnements').delete().eq('artisan_id', uid)
  if (ePush && !/push_abonnements/.test(ePush.message)) console.error('[revocation] notifications:', ePush.message)
  return true
}

export const estEchec = (r: Session | EchecAuth): r is EchecAuth => 'error' in r

type ReponseUtilisateur = Awaited<ReturnType<typeof supabaseAdmin.auth.getUser>>

/**
 * Remplaçant direct de `supabaseAdmin.auth.getUser(token)`, avec la révocation en plus.
 *
 * Pourquoi cette forme plutôt qu'un helper à appeler : les 28 routes de l'API écrivent
 * leur contrôle d'authentification chacune à leur manière (message, code, forme du
 * retour). Réécrire 28 variantes, c'est 28 occasions de casser quelque chose. En
 * remplaçant l'APPEL, la garde déjà écrite dans chaque route (`if (error || !data?.user)`)
 * fait le travail telle quelle, quelle que soit sa formulation.
 */
export async function getUserRevocable(token: string): Promise<ReponseUtilisateur> {
  const r = await supabaseAdmin.auth.getUser(token)
  if (r.error || !r.data?.user) return r

  const iat = dateEmission(token)
  // La suspension se lit ICI aussi, pas seulement dans `authArtisan` : dix-huit routes passent par
  // `getUserRevocable` — dont la génération de devis et la souscription — et un compte suspendu y
  // restait pleinement actif (revue du 07/09). Une suspension qui ne suspend que la moitié du produit
  // n'en est pas une.
  const [{ data: art }, suspension] = await Promise.all([
    supabaseAdmin.from('artisans').select('sessions_invalides_avant').eq('id', r.data.user.id).maybeSingle(),
    suspensionEnCours(r.data.user.id),
  ])
  if (suspension) {
    return { data: { user: null }, error: { message: suspension.message || ERREUR_SUSPENDU, name: 'AuthApiError', status: 403, code: 'suspendu' } } as unknown as ReponseUtilisateur
  }
  const seuil = art?.sessions_invalides_avant ? Math.floor(new Date(art.sessions_invalides_avant).getTime() / 1000) : 0
  if (seuil && iat !== null && iat < seuil) {
    // On rend exactement la forme d'un jeton invalide : la route ne voit pas la différence.
    return { data: { user: null }, error: { message: 'Session fermée', name: 'AuthApiError', status: 401 } } as unknown as ReponseUtilisateur
  }
  if (await mfaManquante(token, r.data.user as UtilisateurJeton)) {
    // Même forme : la route répond 401 avec ce message, et le client sait le reconnaître.
    return { data: { user: null }, error: { message: ERREUR_MFA, name: 'AuthApiError', status: 401, code: 'mfa_requise' } } as unknown as ReponseUtilisateur
  }
  if (await codeManquant(token, r.data.user as UtilisateurJeton)) {
    return { data: { user: null }, error: { message: ERREUR_CODE, name: 'AuthApiError', status: 401, code: 'code_requis' } } as unknown as ReponseUtilisateur
  }
  return r
}
