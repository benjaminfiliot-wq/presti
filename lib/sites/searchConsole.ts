// lib/sites/searchConsole.ts — soumettre seul le plan d'un site vendu à la Search Console (fiche 026-201).
//
// Un compte de service Google (sa clé JSON, en base64, dans GSC_COMPTE_SERVICE) vérifie le site par un fichier posé
// dans son dossier du bucket « sites », en devient propriétaire, ajoute le site à la Search Console et soumet son
// plan. Aucune dépendance npm : le jeton est un JWT RS256 signé par node:crypto. Tout le monde extérieur est injecté
// (fetch, stockage, horloge, adresses de base, mise à jour de la commande) ; les défauts sont ceux de la production.
//
// Rien de secret ne sort d'ici : ni la clé, ni l'assertion signée, ni le jeton d'accès — pas dans une console, pas
// dans une erreur rendue, pas dans un retour. Aucune exception non plus vers l'appelant : tout échec est un retour.
import { createPrivateKey, sign } from 'node:crypto'

const PORTEE = 'https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters'
const JETON_URL = 'https://oauth2.googleapis.com/token'
const VERIFICATION_BASE = 'https://www.googleapis.com/siteVerification/v1'
const SEARCH_BASE = 'https://www.googleapis.com/webmasters/v3'
const BUCKET_SITES = 'sites'
// Un appel qui traîne ne doit pas manger la minute du tour de livraison (maxDuration de la route : 60 s).
const DELAI_APPEL_MS = 6_000

type Reponse = { ok: boolean; status: number; json: () => Promise<unknown> }
type Appel = (url: string, init?: RequestInit) => Promise<Reponse>

export type DependancesSearchConsole = {
  /** L'environnement : GSC_COMPTE_SERVICE (JSON en base64 : client_email, private_key). Défaut : process.env. */
  env?: Record<string, string | undefined>
  /** Tous les appels réseau, sans exception. Défaut : fetch. */
  fetch?: Appel
  /** L'horloge : iat, exp du JWT et search_console_le. */
  maintenant?: () => Date
  /** Le point de jeton OAuth (aud du JWT et cible de l'échange). */
  jetonUrl?: string
  /** L'API de vérification de site, sans le chemin final. */
  verificationBase?: string
  /** L'API de la Search Console, sans le chemin final. */
  searchBase?: string
  /** L'écriture du fichier de vérification. Défaut : le bucket « sites » de Supabase. */
  stockage?: { ecrire: (bucket: string, chemin: string, contenu: string) => Promise<void> }
  /** La mise à jour de la ligne sites_commandes. Défaut : l'update Supabase. */
  mettreAJour?: (id: string, patch: { search_console_le: string }) => Promise<void>
}

export type CommandeSearchConsole = {
  id: string
  domaine_mode: string
  domaine: string | null
  search_console_le?: string | null
}

export type ResultatJeton = { ok: true; jeton: string } | { ok: false; raison: 'sans_compte' | 'compte_illisible' | 'jeton_refuse' }
export type ResultatSoumission = { ok: boolean; etape: string; raison?: string; statut?: number }

const enBase64Url = (objet: unknown): string => Buffer.from(JSON.stringify(objet)).toString('base64url')

/** Le jeton d'accès du compte de service : JWT RS256 signé ici, échangé contre un jeton d'accès d'une heure. */
export async function jetonCompteService(env: Record<string, string | undefined>, deps: DependancesSearchConsole = {}): Promise<ResultatJeton> {
  const brut = env?.GSC_COMPTE_SERVICE
  if (!brut) return { ok: false, raison: 'sans_compte' }
  const appel: Appel = deps.fetch ?? fetch
  const jetonUrl = deps.jetonUrl ?? JETON_URL
  let assertion: string
  try {
    const compte = JSON.parse(Buffer.from(brut, 'base64').toString('utf8'))
    if (typeof compte?.client_email !== 'string' || typeof compte?.private_key !== 'string') return { ok: false, raison: 'compte_illisible' }
    const iat = Math.floor((deps.maintenant ?? (() => new Date()))().getTime() / 1000)
    const entete = enBase64Url({ alg: 'RS256', typ: 'JWT' })
    const charge = enBase64Url({ iss: compte.client_email, scope: PORTEE, aud: jetonUrl, iat, exp: iat + 3600 })
    const signature = sign('RSA-SHA256', Buffer.from(`${entete}.${charge}`), createPrivateKey(compte.private_key)).toString('base64url')
    assertion = `${entete}.${charge}.${signature}`
  } catch { return { ok: false, raison: 'compte_illisible' } }
  try {
    const reponse = await appel(jetonUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
      signal: AbortSignal.timeout(DELAI_APPEL_MS),
    })
    if (!reponse.ok) return { ok: false, raison: 'jeton_refuse' }
    const jeton = ((await reponse.json()) as { access_token?: unknown } | null)?.access_token
    return typeof jeton === 'string' && jeton ? { ok: true, jeton } : { ok: false, raison: 'jeton_refuse' }
  } catch { return { ok: false, raison: 'jeton_refuse' } }
}

/** Un nom de domaine propre, en minuscules, ou null : il entre dans des adresses et des chemins, il ne passe pas brut. */
const domaineValide = (valeur: string): string | null => {
  const s = valeur.trim().toLowerCase()
  return /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:xn--[a-z0-9-]{1,59}|[a-z]{2,63})$/.test(s) ? s : null
}

// Le défaut de production du stockage et de la mise à jour : Supabase, importé seulement s'il faut s'en servir.
async function stockageParDefaut(): Promise<NonNullable<DependancesSearchConsole['stockage']>> {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
  return {
    ecrire: async (bucket, chemin, contenu) => {
      const { error } = await supabaseAdmin.storage.from(bucket).upload(chemin, Buffer.from(contenu, 'utf8'), { contentType: 'text/html; charset=utf-8', upsert: true, cacheControl: '300' })
      if (error) throw new Error('écriture dans le bucket impossible')
    },
  }
}
async function miseAJourParDefaut(): Promise<NonNullable<DependancesSearchConsole['mettreAJour']>> {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
  return async (id, patch) => {
    const { error } = await supabaseAdmin.from('sites_commandes').update(patch).eq('id', id)
    if (error) throw new Error('mise à jour de la commande impossible')
  }
}

/**
 * Vérifie le site de la commande, l'ajoute à la Search Console et soumet son plan. Dans l'ordre : jeton, nom du
 * fichier de vérification, fichier écrit dans le bucket (la seule écriture), vérification, site, plan, puis
 * search_console_le — posé seulement après la dernière réponse 2xx. Sans domaine propre, ou déjà soumise : rien à faire.
 */
export async function soumettreSiteSearchConsole(commande: CommandeSearchConsole, deps: DependancesSearchConsole = {}): Promise<ResultatSoumission> {
  if (commande.domaine_mode === 'aucun' || commande.search_console_le) return { ok: true, etape: 'sans_objet' }
  const brut = String(commande.domaine ?? '').trim()
  if (!brut) return { ok: true, etape: 'sans_objet' } // « domaine à prendre » : pas encore de nom, rien à soumettre
  let etape = 'domaine'
  let statut = undefined as number | undefined // posé par `demander`, lu dans le catch
  try {
    const domaine = domaineValide(brut)
    if (!domaine || !/^[\w-]{1,64}$/.test(String(commande.id))) return { ok: false, etape, raison: 'domaine_invalide' }
    etape = 'jeton'
    const jeton = await jetonCompteService(deps.env ?? process.env, deps)
    if (!jeton.ok) return { ok: false, etape, raison: jeton.raison }
    const appel: Appel = deps.fetch ?? fetch
    const horloge = deps.maintenant ?? (() => new Date())
    const verificationBase = deps.verificationBase ?? VERIFICATION_BASE
    const searchBase = deps.searchBase ?? SEARCH_BASE
    const entetes = { Authorization: `Bearer ${jeton.jeton}`, 'Content-Type': 'application/json' }
    const demander = async (url: string, methode: 'POST' | 'PUT', corps?: unknown): Promise<Reponse> => {
      const reponse = await appel(url, { method: methode, headers: entetes, body: corps === undefined ? undefined : JSON.stringify(corps), signal: AbortSignal.timeout(DELAI_APPEL_MS) })
      if (!reponse.ok) { statut = reponse.status; throw new Error('refus') }
      return reponse
    }
    const site = `https://${domaine}/`
    const siteDansLeChemin = `${searchBase}/sites/${encodeURIComponent(site)}`

    etape = 'token'
    const nom = ((await (await demander(`${verificationBase}/token`, 'POST', { site: { type: 'SITE', identifier: site }, verificationMethod: 'FILE' })).json()) as { token?: unknown } | null)?.token
    // Le nom vient de Google mais il devient un chemin du bucket : jamais autre chose que « google<hexa>.html ».
    if (typeof nom !== 'string' || !/^google[0-9a-f]{8,64}\.html$/.test(nom)) throw new Error('nom de fichier inattendu')

    etape = 'fichier'
    await (deps.stockage ?? await stockageParDefaut()).ecrire(BUCKET_SITES, `${commande.id}/${nom}`, `google-site-verification: ${nom}`)

    etape = 'verification'
    await demander(`${verificationBase}/webResource?verificationMethod=FILE`, 'POST', { site: { type: 'SITE', identifier: site } })

    etape = 'site'
    await demander(siteDansLeChemin, 'PUT')

    etape = 'sitemap'
    await demander(`${siteDansLeChemin}/sitemaps/${encodeURIComponent(`${site}sitemap.xml`)}`, 'PUT')

    etape = 'date'
    await (deps.mettreAJour ?? await miseAJourParDefaut())(commande.id, { search_console_le: horloge().toISOString() })
    return { ok: true, etape }
  } catch {
    // Le message de l'erreur n'est jamais rendu : il pourrait citer une réponse, une adresse, un jeton.
    const raison = etape === 'fichier' ? 'ecriture_impossible' : etape === 'date' ? 'date_non_posee' : statut ? 'refus_externe' : 'injoignable'
    return statut ? { ok: false, etape, raison, statut } : { ok: false, etape, raison }
  }
}
