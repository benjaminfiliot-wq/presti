// Les adresses publiques de l'artisan — UN seul endroit qui les construit (v5, demande
// de Benj : « les URL ne doivent pas être presti pour la plateforme et le site »).
//
// Trois modes, du meilleur au repli :
//   perso        https://<son-domaine>/            et  /demande        (offre Signature, domaine vérifié)
//   sousdomaine  https://<slug>.<domaine-neutre>/  et  /demande        (domaine neutre de Presti, sans « presti »)
//   neutre       https://<domaine-neutre>/<slug>   et  /<slug>/demande (même domaine, sans sous-domaines)
//   presti       https://prestiapp.fr/site/<slug>  et  /p/<slug>       (tant qu'aucun domaine neutre n'est configuré)
//
// Le domaine neutre vient de `NEXT_PUBLIC_DOMAINE_NEUTRE` (ex. `votreartisan.fr`). Le mode
// sous-domaine demande un DNS joker (`*`) : `NEXT_PUBLIC_DOMAINE_NEUTRE_SOUSDOMAINES=1`
// une fois qu'il est en place. Sans variable, tout continue de marcher comme avant.

export type ArtisanAdresse = { slug: string | null; domaine?: string | null; domaine_verifie?: boolean | null }

export const BASE_PRESTI = 'https://prestiapp.fr'
export const DOMAINE_NEUTRE: string | null = (process.env.NEXT_PUBLIC_DOMAINE_NEUTRE || '').trim().toLowerCase() || null
export const SOUS_DOMAINES: boolean = process.env.NEXT_PUBLIC_DOMAINE_NEUTRE_SOUSDOMAINES === '1'

/** Noms qu'un artisan ne peut pas prendre comme adresse : ils sont des chemins ou des sous-domaines techniques. */
export const SLUGS_RESERVES = new Set([
  'www', 'qg', 'api', 'admin', 'app', 'mail', 'smtp', 'imap', 'ftp', 'ns1', 'ns2',
  'demande', 'site', 'p', 'login', 'signup', 'onboarding', 'contact', 'presti', 'prestiapp',
  'static', 'assets', 'infos-legales', 'cgu', 'mentions-legales', 'confidentialite', 'faq', 'aide', 'acheter', 'commander',
])

/**
 * Début de l'adresse que la purge donne à un compte anonymisé (lib/purgeComptes.ts). Personne ne peut le prendre : un
 * tiers qui occuperait « supprime-<8 caractères> » ferait échouer l'anonymisation de ce compte. La base le refuse aussi à
 * l'inscription (migration 0095).
 */
export const PREFIXE_ADRESSE_PURGEE = 'supprime-'

export type ModeUrl = 'perso' | 'sousdomaine' | 'neutre' | 'presti'

export function modeUrl(a: ArtisanAdresse): ModeUrl {
  if (a.domaine && a.domaine_verifie) return 'perso'
  if (DOMAINE_NEUTRE) return SOUS_DOMAINES ? 'sousdomaine' : 'neutre'
  return 'presti'
}

function origine(a: ArtisanAdresse): string {
  switch (modeUrl(a)) {
    case 'perso': return `https://${a.domaine}`
    case 'sousdomaine': return `https://${a.slug}.${DOMAINE_NEUTRE}`
    case 'neutre': return `https://${DOMAINE_NEUTRE}`
    default: return BASE_PRESTI
  }
}

/** Chemins relatifs des trois surfaces, selon le mode. Servent aussi aux liens internes. */
export function chemins(mode: ModeUrl, slug: string | null): { site: string; plateforme: string; infos: string } {
  const s = slug || ''
  switch (mode) {
    case 'perso':
    case 'sousdomaine': return { site: '/', plateforme: '/demande', infos: '/infos-legales' }
    case 'neutre': return { site: `/${s}`, plateforme: `/${s}/demande`, infos: `/${s}/infos-legales` }
    default: return { site: `/site/${s}`, plateforme: `/p/${s}`, infos: `/site/${s}/infos-legales` }
  }
}

export const urlSite = (a: ArtisanAdresse) => origine(a) + chemins(modeUrl(a), a.slug).site
export const urlPlateforme = (a: ArtisanAdresse) => origine(a) + chemins(modeUrl(a), a.slug).plateforme
export const urlInfosLegales = (a: ArtisanAdresse) => origine(a) + chemins(modeUrl(a), a.slug).infos

/** Pour l'affichage : sans le protocole, sans la barre finale. */
export const afficher = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

/**
 * Le mode réellement en vigueur pour la requête en cours, déduit de l'hôte. Une page servie
 * sur le domaine perso doit lier vers `/demande`, pas vers `/p/<slug>` — sinon l'adresse
 * « presti » réapparaît au premier clic.
 */
export function modeDepuisHote(host: string | null | undefined, a: ArtisanAdresse): ModeUrl {
  const h = (host || '').toLowerCase().replace(/:\d+$/, '')
  if (!h) return 'presti'
  if (a.domaine && (h === a.domaine || h === `www.${a.domaine}`)) return 'perso'
  if (DOMAINE_NEUTRE) {
    if (h === DOMAINE_NEUTRE || h === `www.${DOMAINE_NEUTRE}`) return 'neutre'
    if (h.endsWith(`.${DOMAINE_NEUTRE}`)) return 'sousdomaine'
  }
  return 'presti'
}

/** Validation d'une adresse choisie par l'artisan. Rend le problème, ou null si c'est bon. */
export function problemeSlug(slug: string): string | null {
  const s = (slug || '').trim()
  if (s.length < 3) return 'Trop court : au moins 3 caractères.'
  if (s.length > 40) return 'Trop long : 40 caractères maximum.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return 'Uniquement des lettres minuscules, des chiffres et des tirets (pas au début ni à la fin).'
  if (SLUGS_RESERVES.has(s)) return 'Cette adresse est réservée.'
  if (s.startsWith(PREFIXE_ADRESSE_PURGEE)) return 'Cette adresse est réservée.'
  return null
}
