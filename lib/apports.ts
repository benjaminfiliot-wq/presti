import crypto from 'node:crypto'

// Le lien d'apport (prompt v10 §2.2 ; demande de Benj du 07/09 : « avec preuve »).
//
// Un apporteur a un lien personnel : prestiapp.fr/a/<code>. Quand quelqu'un l'ouvre, le SERVEUR pose une
// empreinte signée dans un cookie httpOnly (90 jours), puis renvoie vers la landing. À l'inscription, le serveur
// relit cette empreinte, vérifie sa signature, et inscrit l'artisan au registre avec le statut « prouvé ».
//
// Trois propriétés qui font la preuve :
//  • le cookie est httpOnly et signé par une clé serveur : le navigateur ne peut ni le lire ni le fabriquer ;
//  • il porte la date d'arrivée et la page d'entrée, donc le registre dit QUAND et PAR OÙ ;
//  • il n'est lu qu'une fois, à l'inscription, et jamais après trente jours (article 5 du contrat).
//
// Ce n'est pas du pistage publicitaire : aucune mesure d'audience, aucun tiers, une seule finalité — reconnaître
// qui a amené un client. C'est écrit dans la politique de confidentialité.
export const COOKIE_APPORT = 'presti_apport'
export const JOURS_APPORT = 90
export const CODE = /^[a-z0-9]{6,24}$/

type Charge = { c: string; t: number; p?: string }

/** La clé de signature : le même motif que les appareils de confiance (lib/connexion.ts). */
const secret = () => crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || '').update('presti:apport:v1').digest()
const signer = (v: string) => crypto.createHmac('sha256', secret()).update(v).digest('base64url')

/** La valeur à poser dans le cookie : `<charge base64url>.<signature>`. */
export function valeurCookie(code: string, page?: string): string {
  const charge: Charge = { c: code, t: Date.now(), ...(page ? { p: page.slice(0, 120) } : {}) }
  const corps = Buffer.from(JSON.stringify(charge)).toString('base64url')
  return `${corps}.${signer(corps)}`
}

export const enteteCookieApport = (valeur: string, maxAgeSec = JOURS_APPORT * 86_400): string =>
  `${COOKIE_APPORT}=${valeur}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=Lax`

/** Lit et VÉRIFIE l'empreinte. Rend `null` si elle est absente, modifiée, illisible ou périmée. */
export function lireApport(req: Request): { code: string; arrivee: string; page: string | null } | null {
  const brut = (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE_APPORT}=`))
  if (!brut) return null
  const valeur = brut.slice(COOKIE_APPORT.length + 1)
  const point = valeur.lastIndexOf('.')
  if (point <= 0) return null
  const corps = valeur.slice(0, point), signature = valeur.slice(point + 1)
  const attendue = signer(corps)
  if (signature.length !== attendue.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(attendue))) return null
  let charge: Charge
  try { charge = JSON.parse(Buffer.from(corps, 'base64url').toString('utf8')) as Charge } catch { return null }
  if (!charge?.c || !CODE.test(charge.c) || typeof charge.t !== 'number') return null
  if (Date.now() - charge.t > JOURS_APPORT * 86_400_000) return null
  return { code: charge.c, arrivee: new Date(charge.t).toISOString(), page: charge.p ?? null }
}

/** Ce que le registre gardera comme preuve — rien de plus que ce que le serveur a constaté. */
export const preuveDepuisCookie = (a: { code: string; arrivee: string; page: string | null }) =>
  ({ code: a.code, arrivee: a.arrivee, page: a.page, inscription: new Date().toISOString(), source: 'lien' as const })
