import crypto from 'node:crypto'

// Les empreintes de la mesure d'audience (0090, 0091) — côté serveur seulement, parce qu'elles exigent un secret.
//
// L'adresse IP n'est JAMAIS écrite. Elle sert, le temps de la requête, à deux HMAC qui changent chaque jour :
//   · `empreinteDuJour` (jour | IP | navigateur) → la colonne `empreinte` : compter les visiteurs du jour sans
//     compter deux fois la même personne. audience_cloturer() l'efface le lendemain.
//   · `clePlafond` (jour | réseau de l'IP) → la clé du plafond dans `limites`. Sans le navigateur : un user-agent
//     changé à chaque requête remettait le plafond à zéro (revue du 14/09). Dérivée avec un autre préfixe, elle ne
//     se recoupe pas avec la colonne `empreinte`, et la clôture efface les créneaux terminés le lendemain.

const sel = () => process.env.IP_SEL || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'presti'

/** Le jour civil à Paris, `AAAA-MM-JJ` : un visiteur de 23 h 59 et de 0 h 01 est compté deux jours, comme partout. */
export function jourParis(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/**
 * Minuit à Paris du jour de `d`, en ISO. Le décalage est lu à 0 h UTC de ce jour : Paris y est encore avant le
 * changement d'heure (qui a lieu à 1 h UTC), donc au même décalage que son propre minuit.
 */
export function minuitParis(d: Date = new Date()): string {
  const jour = jourParis(d)
  const zeroUtc = Date.parse(`${jour}T00:00:00Z`)
  const heure = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(zeroUtc))
  return new Date(zeroUtc - heure * 3600_000).toISOString()
}

/** Le réseau d'une adresse : l'IPv4 entière, le /64 d'une IPv6 (un abonné en reçoit un entier, et en change à volonté). */
export function reseauIp(ip: string): string {
  const v = ip.trim().toLowerCase()
  if (!v.includes(':')) return v
  const v4 = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4) return v4[1]
  const [tete, queue] = v.split('::')
  const a = tete ? tete.split(':') : []
  const b = queue ? queue.split(':') : []
  const groupes = v.includes('::') ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a
  return `${groupes.slice(0, 4).map((g) => (g || '0').replace(/^0+(?=.)/, '')).join(':')}::/64`
}

export function empreinteDuJour(ip: string, ua: string, d: Date = new Date()): string {
  return crypto.createHmac('sha256', `audience|${sel()}`).update(`${jourParis(d)}|${ip}|${ua}`).digest('hex').slice(0, 16)
}

/**
 * Le plafond du jour pour TOUTE la mesure (~6 Mo au pire) : même depuis mille adresses, le disque reste borné. La clé
 * porte le jour de Paris, donc il se rouvre à minuit, heure de Paris, au plus tard (les créneaux de consommer_limite
 * sont calés sur l'UTC : un jour de Paris peut en toucher deux, soit au pire deux plafonds — acceptable).
 * Lu par l'onglet Visiteurs, qui dit quand il est atteint : une mesure saturée ne doit pas se lire comme un jour calme.
 */
export const PLAFOND_JOUR_AUDIENCE = 20_000
export const cleJourAudience = (d: Date = new Date()): string => `audience:jour:${jourParis(d)}`

export function clePlafond(ip: string, d: Date = new Date()): string {
  return `audience:ip:${crypto.createHmac('sha256', `audience-plafond|${sel()}`).update(`${jourParis(d)}|${reseauIp(ip)}`).digest('hex').slice(0, 24)}`
}
