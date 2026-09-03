import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

export type Session = { uid: string; iat: number }
export type EchecAuth = { error: string; status: 401 | 403 }

/** Lit l'`iat` (date d'émission) du jeton sans vérifier la signature — Supabase l'a déjà fait. */
function dateEmission(token: string): number | null {
  try {
    const charge = token.split('.')[1]
    if (!charge) return null
    const json = Buffer.from(charge.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const iat = Number(JSON.parse(json)?.iat)
    return Number.isFinite(iat) ? iat : null
  } catch { return null }
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
  const { data: art } = await supabaseAdmin.from('artisans')
    .select('sessions_invalides_avant').eq('id', data.user.id).maybeSingle()

  const seuil = art?.sessions_invalides_avant ? Math.floor(new Date(art.sessions_invalides_avant).getTime() / 1000) : 0
  if (seuil && iat !== null && iat < seuil) {
    return { error: 'Cette session a été fermée. Reconnecte-toi.', status: 401 }
  }
  return { uid: data.user.id, iat: iat ?? 0 }
}

/** Ferme immédiatement toutes les sessions de cet artisan, y compris les jetons déjà émis. */
export async function revoquerSessions(uid: string): Promise<void> {
  // Une seconde dans le futur : un jeton émis pendant la même seconde que la révocation
  // serait sinon accepté (l'`iat` est en secondes entières).
  const quand = new Date(Date.now() + 1000).toISOString()
  await supabaseAdmin.from('artisans').update({ sessions_invalides_avant: quand }).eq('id', uid)
  await supabaseAdmin.auth.admin.signOut(uid, 'global').catch(() => {})
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
  const { data: art } = await supabaseAdmin.from('artisans')
    .select('sessions_invalides_avant').eq('id', r.data.user.id).maybeSingle()
  const seuil = art?.sessions_invalides_avant ? Math.floor(new Date(art.sessions_invalides_avant).getTime() / 1000) : 0
  if (seuil && iat !== null && iat < seuil) {
    // On rend exactement la forme d'un jeton invalide : la route ne voit pas la différence.
    return { data: { user: null }, error: { message: 'Session fermée', name: 'AuthApiError', status: 401 } } as unknown as ReponseUtilisateur
  }
  return r
}
