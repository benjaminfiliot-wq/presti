import dns from 'node:dns/promises'
import net from 'node:net'

// Audit du 20/10 (SSRF IMAP) : `POST /api/canaux` et la relève se connectaient à n'importe quel hôte:port fourni
// par l'artisan — un scanner de ports du réseau interne, avec des messages d'erreur différents selon « fermé »,
// « filtré » ou « ouvert ». Ce module décide si un serveur de messagerie est acceptable AVANT toute connexion :
//  • port IMAP seulement (993 TLS direct, 143 STARTTLS). Le SMTP des canaux n'est JAMAIS contacté par le code
//    (`smtp_hote`/`smtp_port` sont stockés, rien ne s'y connecte) : aucun port 465/587 n'est donc ouvert ici ;
//  • un NOM DNS public, jamais une IP littérale (ni `localhost`, ni `.local`, `.internal`…) ;
//  • TOUTES les adresses résolues doivent être publiques — une seule privée suffit à refuser (rebinding mixte).
// La résolution est refaite à CHAQUE connexion (enregistrement puis relève) et l'appelant se connecte à l'adresse
// validée (`adresse`) avec le nom en SNI : entre la vérification et la connexion, le DNS ne peut plus changer.

export const PORTS_IMAP: readonly number[] = [993, 143]
export const MESSAGE_SERVEUR_INJOIGNABLE = 'Connexion impossible à ce serveur de messagerie.'

const NOM_DNS = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/
const SUFFIXES_INTERNES = ['.local', '.localhost', '.internal', '.intranet', '.lan', '.home', '.corp', '.private', '.localdomain']

function v4(a: number[]): boolean {
  const [p, q, r] = a
  if (a.length !== 4) return true
  if (p === 0 || p === 10 || p === 127) return true // 0/8, 10/8, 127/8
  if (p === 100 && q >= 64 && q <= 127) return true // 100.64/10 (CGNAT)
  if (p === 169 && q === 254) return true // lien-local, dont les métadonnées cloud
  if (p === 172 && q >= 16 && q <= 31) return true
  if (p === 192 && q === 168) return true
  if (p === 192 && q === 0 && (r === 0 || r === 2)) return true // 192.0.0/24, 192.0.2/24
  if (p === 198 && (q === 18 || q === 19)) return true // 198.18/15
  if (p === 198 && q === 51 && r === 100) return true
  if (p === 203 && q === 0 && r === 113) return true
  if (p >= 224) return true // multicast, réservé, diffusion
  return false
}

/** Découpe une IPv6 en huit mots de 16 bits ; null si elle est illisible (donc refusée par l'appelant). */
function mots6(ip: string): number[] | null {
  let s = ip.toLowerCase().split('%')[0]
  const fin4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (fin4) {
    const o = fin4[1].split('.').map(Number)
    if (o.some((n) => !(n >= 0 && n <= 255))) return null
    s = s.slice(0, -fin4[1].length) + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16)
  }
  const doubles = s.split('::')
  if (doubles.length > 2) return null
  const tete = doubles[0] ? doubles[0].split(':') : []
  const queue = doubles.length === 2 && doubles[1] ? doubles[1].split(':') : []
  const manque = 8 - tete.length - queue.length
  if (doubles.length === 1 ? manque !== 0 : manque < 1) return null
  const tous = [...tete, ...Array(doubles.length === 2 ? manque : 0).fill('0'), ...queue]
  const n = tous.map((h) => (/^[0-9a-f]{1,4}$/.test(h) ? parseInt(h, 16) : NaN))
  return n.length === 8 && n.every((x) => x >= 0) ? n : null
}

/** Vrai si l'adresse (IPv4 ou IPv6) est privée, de boucle, de lien local, réservée — ou illisible. */
export function adresseInterdite(ip: string): boolean {
  const brute = String(ip ?? '').trim()
  if (net.isIPv4(brute)) return v4(brute.split('.').map(Number))
  if (!net.isIPv6(brute)) return true
  const m = mots6(brute)
  if (!m) return true
  const [a, b, c, d, e, f, g, h] = m
  const interne4 = [g >> 8, g & 255, h >> 8, h & 255]
  const zeros5 = a === 0 && b === 0 && c === 0 && d === 0 && e === 0
  if (zeros5 && f === 0) return true // ::, ::1 et l'ancienne forme « compatible IPv4 » ::a.b.c.d
  if (zeros5 && f === 0xffff) return v4(interne4) // ::ffff:a.b.c.d (IPv4 mappée)
  if (a === 0x64 && b === 0xff9b && c === 0 && d === 0 && e === 0 && f === 0) return v4(interne4) // NAT64
  if (a === 0x2002) return v4([b >> 8, b & 255, c >> 8, c & 255]) // 6to4
  if ((a & 0xfe00) === 0xfc00) return true // fc00::/7 (adresses locales uniques)
  if ((a & 0xffc0) === 0xfe80) return true // fe80::/10 (lien local)
  if ((a & 0xffc0) === 0xfec0) return true // fec0::/10 (site local, abandonné)
  if ((a & 0xff00) === 0xff00) return true // ff00::/8 (multicast)
  if (a === 0x2001 && b === 0x0db8) return true // documentation
  return false
}

export type Resolveur = (hote: string) => Promise<string[]>
const resolveurSysteme: Resolveur = async (hote) => (await dns.lookup(hote, { all: true, verbatim: true })).map((r) => r.address)

export type VerdictHote = { ok: true; hote: string; adresse: string } | { ok: false; raison: 'port' | 'hote' | 'prive' | 'dns' }

/** Le serveur de messagerie `hote:port` est-il acceptable ? `resoudre` est injectable pour les tests (aucun réseau). */
export async function verifierServeurImap(hote: string, port: number, resoudre: Resolveur = resolveurSysteme): Promise<VerdictHote> {
  if (!PORTS_IMAP.includes(port)) return { ok: false, raison: 'port' }
  const nom = String(hote ?? '').trim().toLowerCase()
  if (net.isIP(nom) !== 0 || !NOM_DNS.test(nom) || nom === 'localhost' || SUFFIXES_INTERNES.some((s) => nom.endsWith(s))) return { ok: false, raison: 'hote' }
  let adresses: string[]
  try { adresses = await resoudre(nom) } catch { return { ok: false, raison: 'dns' } }
  if (!adresses.length) return { ok: false, raison: 'dns' }
  if (adresses.some(adresseInterdite)) return { ok: false, raison: 'prive' }
  // IPv4 d'abord : c'est ce que tous les fournisseurs français servent, et la plateforme n'a pas toujours de route IPv6.
  return { ok: true, hote: nom, adresse: adresses.find((x) => net.isIPv4(x)) ?? adresses[0] }
}
