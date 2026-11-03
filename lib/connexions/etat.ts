import { chiffrerPour, dechiffrerPour } from './chiffrement'
import { URL_JETON } from './oauth'

// L'état d'une connexion (tâche 036-009) : ce que montre l'écran « Connexions », ce qui se passe à l'expiration, ce que fait le retrait.
// Règle de p6 § 0.4 : une autorisation expirée → le système se tait, « Connexions » le dit, UNE alerte part, rien ne plante.
// Aucune fonction de ce fichier ne lève d'exception vers son appelant ; aucune ne rend un jeton hors du serveur.

export type EtatConnexion = 'a_verifier' | 'active' | 'expiree' | 'retiree' | 'erreur'

/** Une ligne de public.connexions (0193_systeme_agents.sql:99-128). */
export type LigneConnexion = {
  id: string
  artisan_id: string
  fournisseur: string
  compte_affiche: string | null
  portees: string[]
  etat: EtatConnexion
  motif_erreur: string | null
  verifiee_le: string | null
  derniere_synchro: string | null
  expire_le: string | null
  retiree_le: string | null
  secret_app: string | null
  secret_n8n: string | null
}

/** Ce que contient un secret, une fois ouvert (jamais hors du serveur ni de l'exécution n8n). */
export type SecretOAuth = { refresh_token: string; access_token: string; access_expire: number }

/** Ce que voit le navigateur : une liste blanche de champs, jamais un secret ni un jeton. */
export type VueConnexion = Pick<LigneConnexion, 'id' | 'fournisseur' | 'compte_affiche' | 'portees' | 'etat' | 'derniere_synchro'> & { libelle: string }

const LIBELLE: Record<EtatConnexion, string> = {
  a_verifier: 'En cours de vérification',
  active: 'Connecté',
  expiree: 'Autorisation expirée : reconnectez-le',
  retiree: 'Retiré',
  erreur: 'À reconnecter',
}

export function vueConnexion(l: LigneConnexion): VueConnexion {
  return {
    id: l.id, fournisseur: l.fournisseur, compte_affiche: l.compte_affiche, portees: [...l.portees],
    etat: l.etat, derniere_synchro: l.derniere_synchro, libelle: LIBELLE[l.etat] ?? LIBELLE.erreur,
  }
}

/** L'alerte de l'expiration : une seule, au titulaire, par n8n (lib-alerter, liste fermée). Aucun secret dedans. */
export type AlerteConnexion = { type: 'connexion_expiree' | 'connexion_illisible'; artisan_id: string; connexion_id: string; fournisseur: string }

export type IssueJeton =
  | { utilisable: true; jeton: string; patch?: Partial<LigneConnexion> }
  | { utilisable: false; motif: string; patch?: Partial<LigneConnexion>; alerte?: AlerteConnexion }

type Env = Record<string, string | undefined>

/** Un jeton d'accès utilisable pour une connexion, en le rafraîchissant au besoin. Ne lève jamais.
 *  - connexion non active : silence (déjà signalée), aucune alerte de plus ;
 *  - secret illisible : état « erreur », une alerte ;
 *  - Google répond invalid_grant (autorisation retirée chez Google ou expirée) : état « expiree », une alerte ;
 *  - Google injoignable : silence, ni changement d'état ni alerte (le disjoncteur de n8n compte). */
export async function jetonUtilisable(l: LigneConnexion, d: { env: Env; fetch: typeof fetch; maintenant: () => number }): Promise<IssueJeton> {
  try {
    if (l.etat !== 'active') return { utilisable: false, motif: l.etat }
    const clair = dechiffrerPour('app', l.secret_app, l.id, d.env)
    let s: SecretOAuth | null = null
    try { s = clair ? JSON.parse(clair) as SecretOAuth : null } catch { s = null }
    if (!s || typeof s.refresh_token !== 'string') {
      return { utilisable: false, motif: 'secret_illisible', patch: { etat: 'erreur', motif_erreur: 'secret_illisible' },
        alerte: { type: 'connexion_illisible', artisan_id: l.artisan_id, connexion_id: l.id, fournisseur: l.fournisseur } }
    }
    const t = d.maintenant()
    if (typeof s.access_token === 'string' && s.access_expire > t + 60_000) return { utilisable: true, jeton: s.access_token }

    const id = d.env.GOOGLE_OAUTH_CLIENT_ID, secret = d.env.GOOGLE_OAUTH_CLIENT_SECRET
    if (!id || !secret) return { utilisable: false, motif: 'non_configure' }
    let r: Response
    try {
      r = await d.fetch(URL_JETON, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: s.refresh_token, client_id: id, client_secret: secret }).toString(),
      })
    } catch { return { utilisable: false, motif: 'injoignable' } }
    const corps = await r.json().catch(() => null) as Record<string, unknown> | null
    if (!r.ok) {
      if (corps?.error === 'invalid_grant') {
        return { utilisable: false, motif: 'expiree', patch: { etat: 'expiree', motif_erreur: null },
          alerte: { type: 'connexion_expiree', artisan_id: l.artisan_id, connexion_id: l.id, fournisseur: l.fournisseur } }
      }
      return { utilisable: false, motif: 'injoignable' }
    }
    if (typeof corps?.access_token !== 'string') return { utilisable: false, motif: 'injoignable' }
    const neuf: SecretOAuth = {
      refresh_token: typeof corps.refresh_token === 'string' ? corps.refresh_token : s.refresh_token,
      access_token: corps.access_token,
      access_expire: t + Math.max(0, Number(corps.expires_in) || 0) * 1000,
    }
    const texte = JSON.stringify(neuf)
    return { utilisable: true, jeton: neuf.access_token,
      patch: { secret_app: chiffrerPour('app', texte, l.id, d.env), secret_n8n: chiffrerPour('n8n', texte, l.id, d.env) } }
  } catch {
    // Dernier filet : une clé retirée en cours de route, une réponse inattendue. On se tait, sans rien changer.
    return { utilisable: false, motif: 'injoignable' }
  }
}

/** Le retrait : sans retour, les deux secrets effacés (la base le refait d'elle-même : connexions_coherence, 0193). */
export function patchRetrait(maintenantIso: string): Partial<LigneConnexion> {
  return { etat: 'retiree', secret_app: null, secret_n8n: null, retiree_le: maintenantIso }
}
