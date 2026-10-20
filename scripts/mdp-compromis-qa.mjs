// QA du contrôle « mot de passe déjà présent dans une fuite » (Have I Been Pwned, k-anonymat).
//
// Complète scripts/fuite-mdp-e2e.mjs (qui vise la production et crée un compte) : celui-ci ne
// touche à aucune base et ne fait QU'UN SEUL appel réel à HIBP. Ce qu'il prouve :
//  1. « password » est reconnu comme fuité (appel réel, une seule fois) ;
//  2. un mot de passe aléatoire de 24 caractères ne l'est pas ;
//  3. une panne (réseau coupé, HTTP 503, silence au-delà du délai) rend « indisponible »
//     SANS compromis : l'inscription n'est jamais bloquée par un service tiers en rade ;
//  4. invariant de source : tout ce qui part vers HIBP ou vers notre relais tient en 5 caractères
//     hexadécimaux (URL, corps JSON), jamais le mot de passe ni l'empreinte entière ;
//  5. les trois écrans qui font choisir un mot de passe passent par verifierFuite AVANT l'appel
//     à Supabase / à la route de confirmation, et aucun ne parle à HIBP directement.
//
// Usage : node --experimental-strip-types scripts/mdp-compromis-qa.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { verifierFuite, recupererDepuisHibp } from '../lib/motDePasse.ts'

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const lire = (p) => fs.readFileSync(p, 'utf8')
const fetchReel = globalThis.fetch

// Enregistre chaque requête sortante (URL, en-têtes, corps) avant de la laisser passer ou de la remplacer.
function espionner(remplacant) {
  const vues = []
  globalThis.fetch = async (url, init = {}) => {
    vues.push({ url: String(url), headers: init.headers ?? {}, body: init.body ?? null, method: init.method ?? 'GET' })
    return remplacant ? remplacant(url, init) : fetchReel(url, init)
  }
  return vues
}

try {
  console.log('\n── 1. « password » est reconnu (un seul appel réel à HIBP)')
  const vues1 = espionner()
  const f1 = await verifierFuite('password', recupererDepuisHibp)
  globalThis.fetch = fetchReel
  T('un seul appel sortant', vues1.length === 1, `${vues1.length} appels`)
  T('« password » est compromis', f1.compromis === true && !f1.indisponible, JSON.stringify(f1))
  T('avec un nombre d’occurrences concret', f1.occurrences > 1000, String(f1.occurrences))

  console.log('\n── 2. Un mot de passe aléatoire de 24 caractères n’est pas compromis')
  const alea = crypto.randomBytes(18).toString('base64url').slice(0, 24)
  const vues2 = espionner()
  const f2 = await verifierFuite(alea, recupererDepuisHibp)
  globalThis.fetch = fetchReel
  T('longueur 24', alea.length === 24)
  T('non compromis, service disponible', f2.compromis === false && f2.indisponible === false, JSON.stringify(f2))

  console.log('\n── 3. Panne : indisponible, jamais bloquant')
  const reseauCoupe = espionner(() => { throw new TypeError('fetch failed') })
  const f3 = await verifierFuite('Cheval-Agrafe-Lundi-83', recupererDepuisHibp)
  T('réseau coupé → indisponible, non compromis', f3.indisponible === true && f3.compromis === false, JSON.stringify(f3))
  espionner(() => new Response('oups', { status: 503 }))
  const f3b = await verifierFuite('Cheval-Agrafe-Lundi-83', recupererDepuisHibp)
  T('HTTP 503 → indisponible, non compromis', f3b.indisponible === true && f3b.compromis === false, JSON.stringify(f3b))
  espionner((_u, init) => new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))))
  const t0 = Date.now()
  const f3c = await verifierFuite('Cheval-Agrafe-Lundi-83', recupererDepuisHibp)
  const dt = Date.now() - t0
  T('silence de HIBP → indisponible après ~3 s', f3c.indisponible === true && f3c.compromis === false && dt >= 2800 && dt < 4500, `${dt} ms ${JSON.stringify(f3c)}`)
  const f3d = await verifierFuite('Cheval-Agrafe-Lundi-83', async () => { throw new Error('relais en panne') })
  T('relais en panne → indisponible, non compromis', f3d.indisponible === true && f3d.compromis === false)
  globalThis.fetch = fetchReel
  void reseauCoupe

  console.log('\n── 4. Invariant : seuls 5 caractères hexadécimaux sortent')
  const SECRET = 'Mon-Secret-Tres-Particulier-2026'
  const empreinte = crypto.createHash('sha1').update(SECRET).digest('hex').toUpperCase()
  const sortant = espionner(() => new Response('', { status: 200 }))
  await verifierFuite(SECRET, recupererDepuisHibp)
  await verifierFuite(SECRET) // chemin navigateur : relais POST /api/auth/mdp-fuite
  globalThis.fetch = fetchReel
  T('deux requêtes captées (HIBP direct, relais)', sortant.length === 2, `${sortant.length}`)
  const [direct, relais] = sortant
  T('HIBP : URL = …/range/ + 5 hex, rien d’autre', /^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/.test(direct?.url ?? ''), direct?.url)
  T('HIBP : en-tête Add-Padding: true', String(direct?.headers?.['Add-Padding']) === 'true')
  T('HIBP : aucun corps', direct?.body == null)
  const corps = JSON.parse(relais?.body ?? '{}')
  T('relais : corps JSON = { prefixe } de 5 hex', Object.keys(corps).join() === 'prefixe' && /^[0-9A-F]{5}$/.test(corps.prefixe ?? ''), relais?.body)
  const tout = sortant.map((s) => `${s.url}|${s.body ?? ''}|${JSON.stringify(s.headers)}`).join('\n')
  T('le préfixe est celui de l’empreinte SHA-1', direct?.url.endsWith(empreinte.slice(0, 5)) && corps.prefixe === empreinte.slice(0, 5))
  T('ni le mot de passe, ni l’empreinte entière, ni son suffixe ne sortent', !tout.includes(SECRET) && !tout.includes(encodeURIComponent(SECRET)) && !tout.includes(empreinte) && !tout.includes(empreinte.slice(5)))

  console.log('\n── 5. Invariants de source : qui appelle quoi, et dans quel ordre')
  const lib = lire('lib/motDePasse.ts')
  const nbHibp = (lib.match(/api\.pwnedpasswords\.com/g) ?? []).length
  T('lib/motDePasse.ts : une seule URL HIBP', nbHibp === 1, `${nbHibp}`)
  const ecrans = {
    'app/signup/page.tsx': ['verifierFuite(password)', 'supabase.auth.signUp('],
    'app/reset-password/page.tsx': ['verifierFuite(pw)', "fetch('/api/auth/reset-confirm'"],
  }
  for (const [chemin, [avant, apres]] of Object.entries(ecrans)) {
    const src = lire(chemin)
    const ia = src.indexOf(avant, src.indexOf('async function'))
    const ib = src.indexOf(apres)
    T(`${chemin} : ${avant} avant ${apres}`, ia > 0 && ib > 0 && ia < ib, `positions ${ia} / ${ib}`)
    T(`${chemin} : aucun appel direct à HIBP`, !/pwnedpasswords/.test(src))
  }
  const secu = lire('app/parametres/SectionSecurite.tsx')
  T('app/parametres/SectionSecurite.tsx : vérifie à la frappe, sans appel direct à HIBP', /verifierFuite\(nouveau\)/.test(secu) && !/pwnedpasswords/.test(secu))
  for (const chemin of ['app/api/securite/mot-de-passe/route.ts', 'app/api/auth/reset-confirm/route.ts']) {
    const src = lire(chemin)
    const i1 = src.indexOf('verifierFuite(')
    const i2 = Math.max(src.indexOf('updateUserById('), src.indexOf("method: 'PUT'"))
    T(`${chemin} : côté serveur, vérification avant l’écriture du mot de passe`, i1 > 0 && i2 > i1, `positions ${i1} / ${i2}`)
  }
  const csp = lire('next.config.mjs')
  T('CSP : pwnedpasswords absent de connect-src (le navigateur passe par le relais)', !/pwnedpasswords/.test(csp))
} catch (e) {
  ko++
  console.log('  ❌ exception :', e?.message ?? e)
} finally {
  globalThis.fetch = fetchReel
}

console.log(`\n${ok} ✅ / ${ko} ❌`)
process.exit(ko ? 1 : 0)
