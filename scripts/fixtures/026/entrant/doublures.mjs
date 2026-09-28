// scripts/fixtures/026/entrant/doublures.mjs — doublures de @/lib/flags, @/lib/security et @/lib/limites pour le
// juge de POST /api/prospects/entrant (026-145), écrites en 026-142. Chargées par crochet-resolution.mjs à la
// place des vrais modules (qui parlent à Supabase) : la route jugée n'appelle jamais la base pour ces trois-là.
//
// Un seul état mutable, relu à CHAQUE appel (pas figé à l'import) : le juge change le scénario entre deux essais
// sans avoir à réimporter la route. `reinitialiser()` entre deux corps d'essai.
export const etat = {
  drapeaux: { prospectsEntrant: false },
  bannis: new Set(),
  limitesRefusees: new Set(), // clés qui refusent (false) dès le prochain appel, quel que soit le compte
  limitesCompteurs: new Map(), // cle → nombre d'appels déjà VUS (imite consommer_limite : les `max` premiers passent)
  abus: [],
}
export const journal = [] // { fn, args, le } — chaque appel, dans l'ordre

const noter = (fn, args) => { journal.push({ fn, args, le: Date.now() }) }

export function actif(nom) {
  noter('actif', [nom])
  return nom === 'prospectsEntrant' ? etat.drapeaux.prospectsEntrant : true
}
export function getIp(req) {
  noter('getIp', [])
  const h = (req.headers.get && req.headers.get('x-forwarded-for')) || ''
  return h.split(',')[0].trim() || 'unknown'
}
export async function isBanned(ip) {
  noter('isBanned', [ip])
  return etat.bannis.has(ip)
}
export async function recordAbuse(ip, raison) {
  noter('recordAbuse', [ip, raison])
  etat.abus.push({ ip, raison })
  return false
}
export function ipPseudonyme(ip) {
  noter('ipPseudonyme', [ip])
  return ip ? `ip:temoin:${ip}` : null
}
export async function consommerLimite(cle, max, fenetreSec) {
  noter('consommerLimite', [cle, max, fenetreSec])
  if (etat.limitesRefusees.has(cle)) return false
  const n = (etat.limitesCompteurs.get(cle) || 0) + 1
  etat.limitesCompteurs.set(cle, n)
  return n <= max
}
export async function limiteAtteinte(cle) {
  noter('limiteAtteinte', [cle])
  return etat.limitesRefusees.has(cle)
}
export function cleEmail(prefixe, email) {
  noter('cleEmail', [prefixe])
  return `${prefixe}:temoin`
}

export function reinitialiser() {
  etat.drapeaux = { prospectsEntrant: false }
  etat.bannis = new Set()
  etat.limitesRefusees = new Set()
  etat.limitesCompteurs = new Map()
  etat.abus = []
  journal.length = 0
}
