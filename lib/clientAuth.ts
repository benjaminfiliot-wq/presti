import crypto from 'crypto'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Session des CLIENTS de la plateforme (v4 §6/§D4).
// Principes tenus :
//  • le cookie est httpOnly + Secure + SameSite=Lax → jamais lisible par du JS ;
//  • la base ne stocke que l'EMPREINTE du jeton (jamais le jeton lui-même) ;
//  • la déconnexion révoque la ligne → le jeton est réellement invalide côté serveur ;
//  • les comptes sont scopés par artisan : aucune donnée croisée entre deux artisans.

export const COOKIE_SESSION = 'pcs'
const DUREE_SESSION_J = 30
const DUREE_LIEN_MIN = 20

const empreinte = (jeton: string) => crypto.createHash('sha256').update(jeton).digest('hex')
const jetonNeuf = () => crypto.randomBytes(32).toString('base64url')

export type ClientSession = { clientId: string; artisanId: string; email: string; nom: string | null }

/** Crée un lien magique et renvoie le jeton EN CLAIR (à envoyer par email, jamais stocké). */
export async function creerLienMagique(artisanId: string, email: string, ip?: string): Promise<string> {
  const jeton = jetonNeuf()
  await supabaseAdmin.from('clients_liens').insert({
    artisan_id: artisanId,
    email: email.toLowerCase(),
    token_hash: empreinte(jeton),
    expire_le: new Date(Date.now() + DUREE_LIEN_MIN * 60000).toISOString(),
    ip: ip && ip !== 'unknown' ? ip : null,
  })
  return jeton
}

/**
 * Consomme un lien magique (usage unique) : crée/retrouve le compte client, ouvre une
 * session et renvoie le jeton de session à poser en cookie.
 */
export async function consommerLien(jeton: string, ip?: string, ua?: string): Promise<{ ok: true; session: string; client: ClientSession } | { ok: false; erreur: string }> {
  const { data: lien } = await supabaseAdmin
    .from('clients_liens').select('id, artisan_id, email, expire_le, utilise_le')
    .eq('token_hash', empreinte(jeton)).maybeSingle()
  if (!lien) return { ok: false, erreur: 'Lien invalide.' }
  if (lien.utilise_le) return { ok: false, erreur: 'Ce lien a déjà servi. Demandez-en un nouveau.' }
  if (new Date(lien.expire_le).getTime() < Date.now()) return { ok: false, erreur: 'Ce lien a expiré. Demandez-en un nouveau.' }

  await supabaseAdmin.from('clients_liens').update({ utilise_le: new Date().toISOString() }).eq('id', lien.id)

  // Compte scopé (artisan_id, email) — créé à la première connexion.
  const { data: existant } = await supabaseAdmin
    .from('clients_plateforme').select('id, email, nom, supprime_le')
    .eq('artisan_id', lien.artisan_id).eq('email', lien.email).maybeSingle()
  let clientId = existant?.id as string | undefined
  let nom = existant?.nom ?? null
  if (!clientId) {
    const { data: cree } = await supabaseAdmin.from('clients_plateforme')
      .insert({ artisan_id: lien.artisan_id, email: lien.email }).select('id, nom').single()
    clientId = cree?.id; nom = cree?.nom ?? null
  } else if (existant?.supprime_le) {
    // Compte précédemment supprimé : on le réactive proprement (nouvelle relation).
    await supabaseAdmin.from('clients_plateforme').update({ supprime_le: null }).eq('id', clientId)
  }
  if (!clientId) return { ok: false, erreur: 'Compte indisponible.' }

  await supabaseAdmin.from('clients_plateforme').update({ derniere_connexion: new Date().toISOString() }).eq('id', clientId)

  const session = jetonNeuf()
  await supabaseAdmin.from('clients_sessions').insert({
    client_id: clientId,
    token_hash: empreinte(session),
    expire_le: new Date(Date.now() + DUREE_SESSION_J * 86400000).toISOString(),
    ip: ip && ip !== 'unknown' ? ip : null,
    user_agent: (ua || '').slice(0, 300) || null,
  })
  return { ok: true, session, client: { clientId, artisanId: lien.artisan_id, email: lien.email, nom } }
}

/** Lit la session depuis le cookie. Renvoie null si absente, expirée ou RÉVOQUÉE. */
export async function sessionCourante(): Promise<ClientSession | null> {
  const jeton = (await cookies()).get(COOKIE_SESSION)?.value
  if (!jeton) return null
  const { data: s } = await supabaseAdmin
    .from('clients_sessions').select('id, client_id, expire_le, revoque_le')
    .eq('token_hash', empreinte(jeton)).maybeSingle()
  if (!s || s.revoque_le || new Date(s.expire_le).getTime() < Date.now()) return null
  const { data: c } = await supabaseAdmin
    .from('clients_plateforme').select('id, artisan_id, email, nom, supprime_le').eq('id', s.client_id).maybeSingle()
  if (!c || c.supprime_le) return null
  return { clientId: c.id, artisanId: c.artisan_id, email: c.email, nom: c.nom }
}

/** Déconnexion : révocation SERVEUR (le jeton copié avant ne vaut plus rien). */
export async function revoquerSession(): Promise<void> {
  const jeton = (await cookies()).get(COOKIE_SESSION)?.value
  if (!jeton) return
  await supabaseAdmin.from('clients_sessions')
    .update({ revoque_le: new Date().toISOString() }).eq('token_hash', empreinte(jeton))
}

/** Options du cookie de session (jamais accessible au JS de la page). */
export function cookieOptions(maxAgeSec = DUREE_SESSION_J * 86400) {
  return { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: maxAgeSec }
}
