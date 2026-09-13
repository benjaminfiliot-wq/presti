// lib/sitesGeneres.ts — les sites générés à la demande, côté serveur : où ils vivent, comment on les sert (v15 §3.2).
//
// Un site généré est un dossier statique déposé dans le bucket PRIVÉ `sites`, sous `<commande>/…`. Personne ne le
// lit sans passer par ici : la route app/site-genere/[commande] vérifie l'état de la commande et le jeton d'aperçu,
// puis sert le fichier avec son type. Sur le domaine de l'artisan, le middleware réécrit tout le domaine vers cette
// route ; sur prestiapp.fr (aperçu), les liens absolus du site sont réécrits pour rester sous /site-genere/<id>/.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const BUCKET_SITES = 'sites'
export const PREFIXE_ROUTE = '/site-genere'

export const TYPES_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json',
}
export const typeMime = (chemin: string): string => TYPES_MIME[(chemin.match(/\.[a-z0-9]+$/i)?.[0] ?? '').toLowerCase()] ?? 'application/octet-stream'

/** Le chemin d'objet dans le bucket pour un chemin d'URL : `/` → index.html, `/x/` → x/index.html, `/x` → x/index.html. */
export function cheminObjet(commandeId: string, cheminUrl: string): string | null {
  let p = decodeURIComponent(cheminUrl || '/').replace(/\/{2,}/g, '/')
  if (p.includes('..') || p.includes('\\') || p.includes('\0')) return null
  if (p === '' || p === '/') p = '/index.html'
  else if (p.endsWith('/')) p += 'index.html'
  else if (!/\.[a-z0-9]+$/i.test(p)) p += '/index.html'
  return `${commandeId}${p}`
}

export type FichierServi = { corps: ArrayBuffer; type: string }

/** Lit un fichier du site dans le bucket ; `null` s'il n'existe pas. */
export async function lireFichier(objet: string): Promise<FichierServi | null> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_SITES).download(objet)
  if (error || !data) return null
  return { corps: await data.arrayBuffer(), type: typeMime(objet) }
}

/** Le site a-t-il été déposé (au moins son index) ? */
export async function siteDepose(commandeId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.storage.from(BUCKET_SITES).list(commandeId, { limit: 1, search: 'index.html' })
  return !!data && data.some((f) => f.name === 'index.html')
}

/** Réécrit les liens absolus (`/x`) d'un HTML ou d'un CSS pour qu'ils restent sous /site-genere/<id>/ — l'aperçu
 *  sur prestiapp.fr. Sur le domaine de l'artisan, rien n'est réécrit : le middleware fait le travail. */
export function reecrireLiens(texte: string, commandeId: string, type: string): string {
  const base = `${PREFIXE_ROUTE}/${commandeId}`
  if (type.startsWith('text/css')) return texte.replace(/url\((['"]?)\/(?!\/)/g, `url($1${base}/`)
  if (!type.startsWith('text/html')) return texte
  return texte
    .replace(/\b(href|src|action|poster)=(["'])\/(?!\/)/g, `$1=$2${base}/`)
    .replace(/\b(srcset|imagesrcset)=(["'])([^"']*)\2/g, (_, attr, q, valeur) => `${attr}=${q}${valeur.replace(/(^|,\s*)\/(?!\/)/g, `$1${base}/`)}${q}`)
    .replace(/url\((['"]?)\/(?!\/)/g, `url($1${base}/`)
}
