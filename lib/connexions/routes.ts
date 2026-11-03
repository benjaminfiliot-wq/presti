import crypto from 'node:crypto'
import type { Capacite } from '../plans'
import { chiffrementsDisponibles, chiffrerPour, dechiffrerPour } from './chiffrement'
import {
  CAPACITE, COOKIE_ETAT, COOKIE_ETAT_EFFACE, DUREE_ETAT_MS, ESSAI_LECTURE, URL_JETON, URL_REVOCATION,
  compteDepuisIdToken, controlerPortees, cookieEtat, defi, egalConstant, estFournisseurGoogle, fournisseurOuvert,
  lireCookie, nouveauVerificateur, ouvrirEtat, scellerEtat, urlAutorisation,
} from './oauth'
import { patchRetrait, type LigneConnexion, type SecretOAuth } from './etat'

// Le cœur des routes « Connecter / Retirer » (tâche 036-009). Les fichiers app/api/connexions/** ne font que brancher les vraies
// dépendances (lib/connexions/serveur.ts) ; le juge scripts/connexions-qa.mjs branche un faux fournisseur et une fausse base.
// Ordre de chaque route, jamais un autre : (1) drapeau `connexions` baissé → 404, rien d'autre n'est lu ; (2) session ; (3) offre par
// peut() ; (4) le travail. Aucune réponse ne porte un jeton, un code, un vérificateur PKCE ni le client secret.

type Env = Record<string, string | undefined>

/** La base, vue par ces routes. Chaque méthode filtre sur le compte : la clé de service passe outre la RLS.
 *  `vivantes` LÈVE sur une erreur de lecture (jamais une liste vide trompeuse : le parcours s'arrête). */
export type MagasinConnexions = {
  lire(id: string, artisanId: string): Promise<LigneConnexion | null>
  /** Les connexions non retirées du compte, pour ce compte Google (`compte`), tous fournisseurs si `fournisseur` est null. */
  vivantes(artisanId: string, fournisseur: string | null, compte: string | null): Promise<LigneConnexion[]>
  inserer(l: LigneConnexion): Promise<boolean>
  maj(id: string, artisanId: string, patch: Partial<LigneConnexion>): Promise<boolean>
}

export type Dependances = {
  drapeauLeve: () => boolean
  session: (req: Request) => Promise<{ uid: string; iat: number } | { statut: number; erreur: string }>
  /** Au retour (sans Bearer) : le compte n'est ni suspendu, ni déconnecté partout depuis l'émission de la session de départ. */
  compteValide: (uid: string, iatSession: number) => Promise<boolean>
  planDe: (uid: string) => Promise<{ plan: string | null } | null>
  peut: (plan: string | null | undefined, c: Capacite) => boolean
  magasin: MagasinConnexions
  env: Env
  fetch: typeof fetch
  maintenant: () => number
}

const SANS_CACHE = { 'Cache-Control': 'no-store' }

function json(corps: unknown, statut = 200, entetes: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json', ...SANS_CACHE, ...entetes } })
}
/** Drapeau baissé : la route n'existe pas (rien ne dit qu'elle existera). */
export const introuvable = (): Response => json({ error: 'Introuvable.' }, 404)

function retourVers(issue: 'ok' | 'refus', motif?: string): Response {
  const lieu = issue === 'ok' ? '/dashboard?connexion=ok' : `/dashboard?connexion=refus&motif=${encodeURIComponent(motif || 'inconnu')}`
  return new Response(null, { status: 303, headers: { Location: lieu, 'Set-Cookie': COOKIE_ETAT_EFFACE, ...SANS_CACHE } })
}

async function offreDe(d: Dependances, uid: string): Promise<{ plan: string | null } | Response> {
  const o = await d.planDe(uid).catch(() => null)
  if (!o) return json({ error: 'Votre offre n’a pas pu être lue. Réessayez dans un instant.' }, 503)
  return o
}

// ── POST /api/connexions/google/demarrer { fournisseur } → { url } + cookie d'état ────────────────────────────────────────────
export async function demarrer(req: Request, d: Dependances): Promise<Response> {
  if (!d.drapeauLeve()) return introuvable()
  if (req.method !== 'POST') return json({ error: 'Méthode non permise.' }, 405)
  const s = await d.session(req)
  if ('statut' in s) return json({ error: s.erreur }, s.statut)
  const b = await req.json().catch(() => null) as { fournisseur?: unknown } | null
  const f = b?.fournisseur
  if (!estFournisseurGoogle(f)) return json({ error: 'Outil inconnu.' }, 400)
  if (!fournisseurOuvert(f, d.env)) return json({ error: 'Cet outil n’est pas encore ouvert.', code: 'non_ouvert' }, 409)
  const o = await offreDe(d, s.uid)
  if (o instanceof Response) return o
  if (!d.peut(o.plan, CAPACITE[f])) return json({ error: 'Votre offre ne comprend pas cet outil.', code: 'offre' }, 403)
  const clientId = d.env.GOOGLE_OAUTH_CLIENT_ID, redirection = d.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!clientId || !d.env.GOOGLE_OAUTH_CLIENT_SECRET || !redirection || !chiffrementsDisponibles(d.env)) {
    return json({ error: 'Connexion indisponible pour le moment.', code: 'non_configure' }, 503)
  }
  const state = crypto.randomBytes(32).toString('base64url')
  const verificateur = nouveauVerificateur()
  const scelle = scellerEtat({ uid: s.uid, iat: s.iat, fournisseur: f, state, verificateur, expire: d.maintenant() + DUREE_ETAT_MS }, d.env)
  const url = urlAutorisation({ clientId, redirection, fournisseur: f, state, defi: defi(verificateur) })
  return json({ ok: true, url }, 200, { 'Set-Cookie': cookieEtat(scelle) })
}

// ── GET /api/connexions/google/retour?code&state (redirection de Google) ─────────────────────────────────────────────────────
export async function retour(req: Request, d: Dependances): Promise<Response> {
  if (!d.drapeauLeve()) return introuvable()
  const u = new URL(req.url)
  const etat = ouvrirEtat(lireCookie(req, COOKIE_ETAT), d.env)
  const stateRecu = u.searchParams.get('state') || ''
  // L'état : présent, intact, non échu, identique à celui reçu. Sinon rien n'est échangé (CSRF de connexion, rejeu).
  if (!etat || etat.expire < d.maintenant() || !stateRecu || !egalConstant(etat.state, stateRecu)) return retourVers('refus', 'etat_invalide')
  if (u.searchParams.get('error')) return retourVers('refus', 'refuse_par_artisan')
  const code = u.searchParams.get('code')
  if (!code) return retourVers('refus', 'code_absent')
  const f = etat.fournisseur
  // Le compte et l'offre sont relus à ce moment-là, pour l'uid que la session avait scellé au départ.
  if (!await d.compteValide(etat.uid, etat.iat).catch(() => false)) return retourVers('refus', 'compte')
  const o = await offreDe(d, etat.uid)
  if (o instanceof Response || !d.peut(o.plan, CAPACITE[f]) || !fournisseurOuvert(f, d.env)) return retourVers('refus', 'offre')
  const clientId = d.env.GOOGLE_OAUTH_CLIENT_ID, secretClient = d.env.GOOGLE_OAUTH_CLIENT_SECRET, redirection = d.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!clientId || !secretClient || !redirection || !chiffrementsDisponibles(d.env)) return retourVers('refus', 'non_configure')

  let jetons: Record<string, unknown> | null = null
  try {
    const r = await d.fetch(URL_JETON, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: secretClient,
        redirect_uri: redirection, code_verifier: etat.verificateur }).toString(),
    })
    jetons = r.ok ? await r.json().catch(() => null) as Record<string, unknown> | null : null
  } catch { jetons = null }
  if (!jetons || typeof jetons.access_token !== 'string' || typeof jetons.refresh_token !== 'string') return retourVers('refus', 'echange_refuse')

  const compte = compteDepuisIdToken(jetons.id_token, clientId)
  // Les connexions déjà vivantes de ce compte Google, tous fournisseurs : une erreur de lecture arrête tout (rien n'est retiré).
  let memeCompte: LigneConnexion[]
  try { memeCompte = await d.magasin.vivantes(etat.uid, null, compte) } catch { return retourVers('refus', 'enregistrement') }
  // Chez Google, révoquer un jeton retire TOUTE l'autorisation de l'application pour ce compte Google (Gmail, agenda, Drive) :
  // on ne révoque le jeton reçu que si aucune autre connexion vivante n'en dépend.
  const revoquerSiSeul = async () => { if (memeCompte.length === 0) await revoquer(d, jetons!.refresh_token as string) }
  const portees = controlerPortees(f, typeof jetons.scope === 'string' ? jetons.scope : '')
  if (!portees.ok) {
    await revoquerSiSeul()
    return retourVers('refus', portees.motif)
  }

  const t = d.maintenant()
  const secret: SecretOAuth = { refresh_token: jetons.refresh_token as string, access_token: jetons.access_token as string,
    access_expire: t + Math.max(0, Number(jetons.expires_in) || 0) * 1000 }
  const secretClair = JSON.stringify(secret)
  // Rebrancher le même compte pour le même outil : la connexion est RENOUVELÉE sur place (nouveaux secrets, liés à la même ligne),
  // jamais retirée puis recréée : aucune fenêtre où l'artisan n'aurait plus rien si l'écriture échouait (index connexions_vivante_unique).
  const existante = memeCompte.find((l) => l.fournisseur === f)
  const id = existante?.id ?? crypto.randomUUID()
  const chiffres = { secret_app: chiffrerPour('app', secretClair, id, d.env), secret_n8n: chiffrerPour('n8n', secretClair, id, d.env) }
  const enregistre = existante
    ? await d.magasin.maj(id, etat.uid, { ...chiffres, portees: portees.portees, etat: 'a_verifier', motif_erreur: null })
    : await d.magasin.inserer({
      id, artisan_id: etat.uid, fournisseur: f, compte_affiche: compte, portees: portees.portees, etat: 'a_verifier',
      motif_erreur: null, verifiee_le: null, derniere_synchro: null, expire_le: null, retiree_le: null, ...chiffres,
    })
  if (!enregistre) {
    // Une connexion existante garde ses anciens secrets (rien n'a été écrit) ; seul un jeton orphelin est révoqué.
    await revoquerSiSeul()
    return retourVers('refus', 'enregistrement')
  }
  // L'essai de lecture, avant tout « active » (C4).
  const e = ESSAI_LECTURE[f]
  let lu = false
  try {
    const r = await d.fetch(e.url, {
      method: e.methode,
      headers: { authorization: `Bearer ${secret.access_token}`, 'content-type': 'application/json' },
      body: e.methode === 'POST'
        ? JSON.stringify({ timeMin: new Date(t).toISOString(), timeMax: new Date(t + 86_400_000).toISOString(), items: [{ id: 'primary' }] })
        : undefined,
    })
    lu = r.ok
  } catch { lu = false }
  const iso = new Date(d.maintenant()).toISOString()
  await d.magasin.maj(id, etat.uid, lu ? { etat: 'active', verifiee_le: iso, motif_erreur: null }
    : { etat: 'erreur', motif_erreur: 'essai_lecture_echoue' })
  return lu ? retourVers('ok') : retourVers('refus', 'essai_lecture_echoue')
}

// ── POST /api/connexions/retirer { id } ────────────────────────────────────────────────────────────────────────────────────────
// Retirer reste permis quelle que soit l'offre : on ne garde jamais une autorisation que le client veut reprendre.
export async function retirer(req: Request, d: Dependances): Promise<Response> {
  if (!d.drapeauLeve()) return introuvable()
  if (req.method !== 'POST') return json({ error: 'Méthode non permise.' }, 405)
  const s = await d.session(req)
  if ('statut' in s) return json({ error: s.erreur }, s.statut)
  const b = await req.json().catch(() => null) as { id?: unknown } | null
  const id = typeof b?.id === 'string' && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : null
  if (!id) return json({ error: 'Connexion inconnue.' }, 400)
  const l = await d.magasin.lire(id, s.uid)
  if (!l || l.artisan_id !== s.uid) return json({ error: 'Connexion inconnue.' }, 404)
  if (l.etat === 'retiree') return json({ ok: true, etat: 'retiree', deja: true })
  // Révocation chez Google, au mieux : le retrait chez Presti ne dépend pas de sa réussite.
  const clair = dechiffrerPour('app', l.secret_app, l.id, d.env)
  // Une autre connexion vivante du même compte Google (Gmail, agenda, Drive partagent l'autorisation) : pas de révocation chez Google,
  // qui la couperait aussi ; le jeton est seulement effacé chez Presti. Lecture en erreur : on ne révoque pas (prudence).
  const autres = await d.magasin.vivantes(s.uid, null, l.compte_affiche).then((v) => v.filter((x) => x.id !== l.id).length, () => 1)
  if (clair && autres === 0) {
    try { const sec = JSON.parse(clair) as SecretOAuth; if (sec.refresh_token) await revoquer(d, sec.refresh_token) } catch { /* rien */ }
  }
  const ok = await d.magasin.maj(l.id, s.uid, patchRetrait(new Date(d.maintenant()).toISOString()))
  if (!ok) return json({ error: 'Le retrait n’a pas pu être enregistré. Réessayez.' }, 503)
  return json({ ok: true, etat: 'retiree' })
}

async function revoquer(d: Dependances, jeton: string): Promise<void> {
  try {
    await d.fetch(URL_REVOCATION, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: jeton }).toString() })
  } catch { /* au mieux */ }
}
