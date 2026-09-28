import { NextResponse } from 'next/server'
import { getIp, ipPseudonyme, isBanned } from '@/lib/security'
import { consommerLimite } from '@/lib/limites'
import { clientPublic, marquerSessionVerifiee, sessionIdDuJeton } from '@/lib/connexion'

// Le lien de connexion de l'acheteur (fiche 026-027) : après un achat public, lib/siteAchatPublic.ts envoie
// https://prestiapp.fr/connexion/lien?th=<hashed_token>&commande=<id>. La page ne poste rien au chargement (les robots
// de messagerie ouvrent les liens et exécutent parfois leur JavaScript) : le jeton n'est consommé qu'ici, par un POST
// parti d'un clic. Pas de GET.
//
// Ce que la session prouve : l'accès à la boîte, exactement comme le code par e-mail (api/auth/code/verifier). Elle est
// donc marquée `code_email` dans sessions_verifiees, par les fonctions de lib/connexion.ts, appelées telles quelles.
// La double authentification n'est JAMAIS contournée : lib/authArtisan.ts juge le second facteur AVANT le code, et une
// session ouverte par ce lien reste au niveau d'un simple lien magique ; un compte qui a une application
// d'authentification devra toujours la passer. Rien ici ne touche au niveau d'assurance ni aux facteurs.
//
// Le type de verifyOtp : 'email'. @supabase/supabase-js est en 2.112 dans ce dépôt (la fiche citait 2.48) ; son
// EmailOtpType accepte 'magiclink' et 'email', et sa documentation (GoTrueClient.verifyOtp, « Verify Email Auth (Token
// Hash) ») donne { token_hash, type: 'email' } : 'magiclink' y est l'ancien nom, gardé pour compatibilité, et 'email'
// accepte le jeton d'un lien magique comme celui d'une confirmation d'inscription.

export const runtime = 'nodejs'

/** Le hachage rendu par generateLink : hexadécimal, de 20 à 128 signes. Tout le reste est refusé sans appeler Supabase. */
const FORME_TH = /^[0-9a-f]{20,128}$/i
/** 20 essais par 10 minutes et par adresse (pseudonymisée : la table des compteurs ne garde jamais l'adresse en clair). */
const PLAFOND = 20
const FENETRE_S = 600
/** Un seul message pour un jeton refusé : jamais le détail de Supabase (expiré, déjà servi, inconnu). */
const ERREUR_LIEN = 'Lien expiré ou déjà utilisé : demandez-en un nouveau.'
/** La réponse porte des jetons de session : aucun cache, nulle part. */
const SANS_CACHE = { 'Cache-Control': 'no-store' }

const refus = (error: string, status: number, code?: string) => NextResponse.json(code ? { error, code } : { error }, { status, headers: SANS_CACHE })

export async function POST(req: Request) {
  const ip = getIp(req)
  if (await isBanned(ip)) return refus('Accès refusé.', 403)

  if (!(await consommerLimite(`lien:ip:${ipPseudonyme(ip) ?? 'inconnue'}`, PLAFOND, FENETRE_S))) {
    return refus('Trop de tentatives. Patientez quelques minutes.', 429)
  }

  const corps = await req.json().catch(() => null)
  const th = typeof corps?.th === 'string' ? corps.th : ''
  if (!FORME_TH.test(th)) return refus('Lien incomplet : ouvrez le lien tel qu’il figure dans l’e-mail, ou demandez-en un nouveau.', 400, 'lien_forme')

  const pub = clientPublic()
  const { data, error } = await pub.auth.verifyOtp({ token_hash: th, type: 'email' })
  const session = data?.session
  if (error || !session?.access_token || !session.refresh_token) return refus(ERREUR_LIEN, 400, 'lien_refuse')

  // Le jeton vient d'être servi : s'il ne peut pas être marqué, la session est refermée côté Supabase (elle ne
  // quitte jamais ce serveur), et l'acheteur redemande un lien.
  const refermer = async () => { try { await pub.auth.signOut({ scope: 'local' }) } catch { /* rien de plus à faire */ } }
  const uid = session.user?.id ?? data.user?.id ?? null
  const sid = sessionIdDuJeton(session.access_token)
  if (!uid || !sid) {
    await refermer()
    console.error('[auth/lien] session sans identifiant exploitable')
    return refus('Connexion impossible pour l’instant.', 500)
  }
  if (!(await marquerSessionVerifiee(sid, uid, 'code_email'))) {
    await refermer()
    return refus('Connexion impossible pour l’instant.', 500)
  }

  return NextResponse.json({ ok: true, session: { access_token: session.access_token, refresh_token: session.refresh_token } }, { headers: SANS_CACHE })
}
