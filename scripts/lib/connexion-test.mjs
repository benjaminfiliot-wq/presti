// Aides de connexion pour les suites de test (prompt v7, bloc 2).
//
// Depuis le code par email, un jeton obtenu par le mot de passe seul n'ouvre aucune route :
// sa session doit figurer dans `sessions_verifiees`. Les suites n'ont pas de boîte mail ; elles
// disposent en revanche de la clé service — c'est l'OPÉRATEUR qui atteste la session, ce que
// la table prévoit (`moyen = 'service'`). La suite code-connexion-e2e, elle, prouve le vrai
// chemin (email, code, essais, appareil de confiance).
//
// Tant que la migration 0063 n'est pas posée, ces aides sont sans effet (et le verrou est
// baissé : lib/flags.ts → codeEmail) : elles le détectent au premier 404 et se taisent.
//
// Les variables d'environnement sont lues à l'appel, pas à l'import : les suites chargent
// .env.local APRÈS leurs imports.

import crypto from 'node:crypto'

const env = () => ({ SB: process.env.NEXT_PUBLIC_SUPABASE_URL, SVC: process.env.SUPABASE_SERVICE_ROLE_KEY })
const entetes = () => { const { SVC } = env(); return { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' } }

/** Même dérivation que lib/connexion.ts : le secret serveur, ou son substitut dérivé de la clé service. */
export function secretConnexion() {
  const e = process.env.PRESTI_SECRET_CONNEXION
  if (e) return crypto.createHash('sha256').update(e).digest()
  return crypto.createHmac('sha256', env().SVC || '').update('presti:connexion:v1').digest()
}
export const hacherCode = (uid, code) => crypto.createHmac('sha256', secretConnexion()).update(`${uid}:${code}`).digest('hex')
export const claims = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))

let tableAbsente = false

/** Atteste la session de ce jeton (comme si le code avait été saisi). Rend vrai si c'est fait. */
export async function verifierSessionTest(accessToken) {
  if (!accessToken || tableAbsente) return false
  const c = claims(accessToken)
  if (!c.session_id) return false
  const { SB } = env()
  const r = await fetch(`${SB}/rest/v1/sessions_verifiees`, {
    method: 'POST', headers: { ...entetes(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ session_id: c.session_id, user_id: c.sub, moyen: 'service' }),
  })
  if (r.status === 404) { tableAbsente = true; return false }
  if (!r.ok) console.warn('[connexion-test] sessions_verifiees :', r.status, (await r.text()).slice(0, 120))
  return r.ok
}

/** L'identifiant d'un compte à partir de son email (table artisans). */
export async function uidParEmail(email) {
  const { SB } = env()
  const r = await fetch(`${SB}/rest/v1/artisans?select=id&email=eq.${encodeURIComponent(email.trim().toLowerCase())}`, { headers: entetes() })
  const j = await r.json().catch(() => [])
  return Array.isArray(j) && j[0]?.id ? j[0].id : null
}

/** Pose un code CONNU pour ce compte (le vrai est haché, illisible) ; rend le code. */
export async function poserCodeTest(uid, code = '246813', { expireDansMs = 10 * 60_000, essais = 0 } = {}) {
  const { SB } = env()
  const r = await fetch(`${SB}/rest/v1/codes_connexion`, {
    method: 'POST', headers: { ...entetes(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: uid, hash_code: hacherCode(uid, code), expire_le: new Date(Date.now() + expireDansMs).toISOString(), essais }),
  })
  if (!r.ok) throw new Error(`poserCodeTest : ${r.status} ${(await r.text()).slice(0, 160)}`)
  return code
}

/**
 * Après « Se connecter » sur /login (Playwright) : si l'écran du code apparaît, on y répond
 * avec un code posé par le service. Sinon (drapeau baissé, appareil de confiance, TOTP) : rien.
 * Rend 'code' | 'totp' (application d'authentification : la suite s'en charge) | 'app' | 'aucun'.
 */
export async function codeEmailSiDemande(page, email, { timeout = 30000, uid = null } = {}) {
  const champ = page.locator('#code-email')
  const issue = await Promise.race([
    champ.waitFor({ state: 'visible', timeout }).then(() => 'code').catch(() => 'aucun'),
    page.locator('#code-connexion').waitFor({ state: 'visible', timeout }).then(() => 'totp').catch(() => 'aucun'),
    page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout }).then(() => 'app').catch(() => 'aucun'),
  ])
  if (issue !== 'code') return issue
  const id = uid || (await uidParEmail(email))
  if (!id) throw new Error(`codeEmailSiDemande : compte introuvable pour ${email}`)
  const code = await poserCodeTest(id)
  await champ.fill(code)
  await page.getByRole('button', { name: /^Valider$/ }).click()
  // Sans ce filet, un aléa de réseau ici faisait remonter une exception Playwright qui emportait TOUT
  // le bloc navigateur de l'appelant — dix-sept assertions perdues d'un coup, et une pile illisible à
  // la place du vrai symptôme. On rend l'issue, l'appelant en fait ce qu'il veut.
  const arrive = await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout }).then(() => true, () => false)
  return arrive ? 'code' : 'bloque'
}
