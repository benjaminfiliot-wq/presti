// Test permanent — Double authentification (sprint J-1 §6, Paramètres → Sécurité).
//
// Ce qu'on vérifie, dans l'ordre où un artisan le vivrait :
//  1. l'enrôlement depuis la page Sécurité : QR code visible, clé copiable, code à 6 chiffres
//     (généré ici, RFC 6238, node:crypto — aucune dépendance) → « Activée le … » ;
//  2. déconnexion / reconnexion : l'étape 2 est exigée, un mauvais code est refusé, le bon
//     ouvre /outils ;
//  3. côté serveur : une route sensible (/api/securite/sessions) répond 401 `mfa_requise` à
//     un jeton au mot de passe seul (aal1), 200 à un jeton passé par le second facteur (aal2) ;
//  4. la désactivation (après un dernier code) → reconnexion sans étape 2.
//
// Usage : node scripts/mfa-e2e.mjs [http://localhost:3116]   (défaut : https://prestiapp.fr)
// Si la MFA TOTP n'est pas activée côté projet Supabase, le test LE DIT et sort en code 2.

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { verifierSessionTest, codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = process.env.CAPTURES || 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const auth = (p, jwt, o = {}) => fetch(`${SB}/auth/v1/${p}`, { ...o, headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const connexion = async (email, password) => { const j = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json', 'User-Agent': 'presti-e2e' }, body: JSON.stringify({ email, password }) })).json(); await verifierSessionTest(j.access_token); return j }
const api = (chemin, jwt, o = {}) => fetch(`${APP}${chemin}`, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`, ...(o.headers || {}) } })
const claims = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'))

// RFC 6238 (TOTP) sur RFC 4226 (HOTP) : HMAC-SHA1, pas de 30 s, 6 chiffres — ce que font
// Google Authenticator et consorts. La clé arrive en base32 (RFC 4648).
function base32(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of s.replace(/[\s=]/g, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0')
  const out = []
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(out)
}
function totp(secret, quand = Date.now()) {
  const compteur = Buffer.alloc(8)
  compteur.writeBigUInt64BE(BigInt(Math.floor(quand / 30000)))
  const h = crypto.createHmac('sha1', base32(secret)).update(compteur).digest()
  const o = h[h.length - 1] & 0x0f
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}
/** Un code sûrement faux : celui d'il y a une heure. */
const codeFaux = (secret) => totp(secret, Date.now() - 3600_000)

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const st = Date.now(), email = `mfa.${st}@presti-test.invalid`, pw = 'tuile-caramel-vendredi-42', slug = `mfa-${st}`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
if (!u?.id) { console.error('création du compte impossible', u); process.exit(1) }
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'studio', credits: 180 }) })
// Pas de visite guidée pendant le test : son voile intercepte les clics (marquée vue en base, pas seulement en localStorage).
await rest(`artisans?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ aide_vues: ['visite:console'] }) })
const nettoyer = async () => { await admin(`users/${u.id}`, { method: 'DELETE' }) }

// La MFA TOTP est-elle activée côté projet ? On le constate par l'effet : un enrôlement brut.
const j0 = (await connexion(email, pw)).access_token
const sonde = await auth('factors', j0, { method: 'POST', body: JSON.stringify({ factor_type: 'totp', friendly_name: 'sonde' }) })
const sondeJson = await sonde.json().catch(() => ({}))
if (!sonde.ok) {
  console.log(`\n⛔ MFA TOTP non activée côté projet Supabase (enrôlement → HTTP ${sonde.status} : ${sondeJson.msg || sondeJson.message || JSON.stringify(sondeJson)}).`)
  console.log('   À cocher : tableau de bord Supabase → Authentication → Multi-Factor (Auth → « Multi-factor authentication ») → TOTP : Enabled.')
  await nettoyer()
  process.exit(2)
}
await auth(`factors/${sondeJson.id}`, j0, { method: 'DELETE' }) // un facteur non vérifié se retire sans aal2

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 960 } })
await p.addInitScript(() => { try { localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} })
const deconnecter = async () => { await p.evaluate(() => localStorage.clear()); await p.context().clearCookies() }
const seConnecter = async () => {
  await p.goto(`${APP}/login`, { waitUntil: 'load' })
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw)
  await p.getByRole('button', { name: /Se connecter/i }).click()
  // Avant l'enrôlement TOTP : le code email est demandé ; après : c'est l'application qui prend le relais.
  await codeEmailSiDemande(p, email, { uid: u.id })
}
let secret = ''
try {
  console.log('\n── 1. Enrôlement depuis Paramètres → Sécurité')
  await seConnecter()
  await p.waitForURL(/outils|dashboard|onboarding/, { timeout: 20000 }).catch(() => {})
  await p.goto(`${APP}/parametres?onglet=securite`, { waitUntil: 'load' })
  await p.waitForSelector('[data-mfa]', { timeout: 20000 })
  T('le bloc « Double authentification » est là (drapeau mfa levé)', await p.locator('[data-mfa]').count() === 1)
  await p.waitForSelector('[data-mfa="inactive"]', { timeout: 15000 })
  T('état initial : désactivée', /Désactivée/.test(await p.locator('.mfa-etat').innerText()))
  await p.getByRole('button', { name: /^Activer$/ }).click()
  await p.waitForSelector('[data-mfa="enrolement"]', { timeout: 20000 })
  const qrOk = await p.locator('.mfa-qr img').evaluate((img) => new Promise((r) => { if (img.complete) r(img.naturalWidth > 0); else { img.onload = () => r(img.naturalWidth > 0); img.onerror = () => r(false) } }))
  T('le QR code (SVG Supabase) s’affiche', qrOk)
  secret = (await p.locator('.mfa-secret code').innerText()).replace(/\s+/g, '')
  T('la clé de saisie manuelle est affichée (base32, 32 caractères)', /^[A-Z2-7]{32}$/.test(secret), secret.length + ' caractères')
  T('la clé se copie (bouton Copier)', await p.getByRole('button', { name: /Copier/ }).count() === 1)
  await p.screenshot({ path: `${OUT}/mfa-1-enrolement.png`, fullPage: true })
  T('Vérifier est inactif tant que le code n’a pas 6 chiffres', await p.getByRole('button', { name: /Vérifier et activer/ }).isDisabled())
  await p.fill('#mfa-code', codeFaux(secret))
  await p.getByRole('button', { name: /Vérifier et activer/ }).click(); await p.waitForSelector('.msg.err', { timeout: 15000 })
  T('un code faux est refusé, en français', /Code incorrect/.test(await p.locator('.msg.err').innerText()))
  await p.fill('#mfa-code', totp(secret))
  await p.getByRole('button', { name: /Vérifier et activer/ }).click()
  await p.waitForSelector('[data-mfa="active"]', { timeout: 20000 })
  T('après le bon code : « Activée le … »', /Activée le \d/.test(await p.locator('.mfa-etat').innerText()))
  const facteurs = await (await admin(`users/${u.id}/factors`)).json()
  T('le facteur est vérifié côté Supabase', Array.isArray(facteurs) && facteurs.some((f) => f.factor_type === 'totp' && f.status === 'verified'))
  T('la page Sécurité continue de lister les sessions (la session est passée en aal2)', await p.locator('.sess li').count() >= 1)
  await p.screenshot({ path: `${OUT}/mfa-2-activee.png`, fullPage: true })

  console.log('\n── 2. Reconnexion : l’étape 2 est exigée')
  await deconnecter()
  await seConnecter()
  await p.waitForSelector('input[autocomplete=one-time-code]', { timeout: 20000 })
  T('après le mot de passe, la page demande le code (même page /login)', p.url().includes('/login'))
  await p.fill('input[autocomplete=one-time-code]', codeFaux(secret))
  await p.getByRole('button', { name: /Valider/ }).click(); await p.waitForSelector('.msg.err', { timeout: 15000 })
  T('mauvais code refusé, avec le nombre d’essais restants', /Code incorrect.*4 essais/.test(await p.locator('.msg.err').innerText()), await p.locator('.msg.err').innerText())
  T('toujours sur /login', p.url().includes('/login'))
  await p.screenshot({ path: `${OUT}/mfa-3-etape2.png` })
  await p.fill('input[autocomplete=one-time-code]', totp(secret))
  await p.getByRole('button', { name: /Valider/ }).click()
  await p.waitForURL(/\/outils/, { timeout: 20000 })
  T('bon code → /outils', p.url().includes('/outils'))

  console.log('\n── 3. Côté serveur : aal1 refusé, aal2 accepté')
  const s1 = await connexion(email, pw)
  T('une connexion par mot de passe seul donne un jeton aal1', claims(s1.access_token).aal === 'aal1')
  const r1 = await api('/api/securite/sessions', s1.access_token)
  const r1j = await r1.json().catch(() => ({}))
  T('/api/securite/sessions → 401 mfa_requise avec ce jeton', r1.status === 401 && r1j.code === 'mfa_requise', `HTTP ${r1.status} ${JSON.stringify(r1j)}`)
  const r1b = await api('/api/inventaire', s1.access_token)
  T('une route passant par getUserRevocable (/api/inventaire) refuse aussi (401)', r1b.status === 401, `HTTP ${r1b.status}`)
  const lf = await (await auth('factors', s1.access_token)).json().catch(() => null)
  const fid = facteurs.find((f) => f.status === 'verified')?.id
  const ch = await (await auth(`factors/${fid}/challenge`, s1.access_token, { method: 'POST' })).json()
  // Un code TOTP ne sert qu'une fois par pas de 30 s : on attend le pas suivant si besoin.
  let v = await auth(`factors/${fid}/verify`, s1.access_token, { method: 'POST', body: JSON.stringify({ challenge_id: ch.id, code: totp(secret) }) })
  if (!v.ok) { await new Promise((r) => setTimeout(r, 30000 - (Date.now() % 30000) + 500)); const ch2 = await (await auth(`factors/${fid}/challenge`, s1.access_token, { method: 'POST' })).json(); v = await auth(`factors/${fid}/verify`, s1.access_token, { method: 'POST', body: JSON.stringify({ challenge_id: ch2.id, code: totp(secret) }) }) }
  const s2 = await v.json()
  T('le second facteur donne un jeton aal2', v.ok && claims(s2.access_token || '').aal === 'aal2', String(v.status) + (lf ? '' : ' (liste des facteurs illisible)'))
  const r2 = await api('/api/securite/sessions', s2.access_token)
  T('/api/securite/sessions → 200 avec le jeton aal2', r2.ok, `HTTP ${r2.status}`)

  console.log('\n── 4. Désactivation, puis reconnexion sans étape 2')
  await p.goto(`${APP}/parametres?onglet=securite`, { waitUntil: 'load' })
  await p.waitForSelector('[data-mfa="active"]', { timeout: 20000 })
  await p.getByRole('button', { name: /^Désactiver$/ }).click()
  await p.waitForSelector('#mfa-code', { timeout: 10000 })
  T('la désactivation demande un dernier code', await p.locator('#mfa-code').count() === 1)
  await p.fill('#mfa-code', codeFaux(secret))
  await p.getByRole('button', { name: /Désactiver la double authentification/ }).click(); await p.waitForSelector('.msg.err', { timeout: 15000 })
  T('un code faux ne désactive pas', await p.locator('[data-mfa="active"]').count() === 1)
  // Le code du pas courant a peut-être déjà servi (étape 3) : on prend le suivant si besoin.
  await p.fill('#mfa-code', totp(secret))
  await p.getByRole('button', { name: /Désactiver la double authentification/ }).click()
  const desactive = await p.waitForSelector('[data-mfa="inactive"]', { timeout: 15000 }).then(() => true).catch(() => false)
  if (!desactive) {
    await new Promise((r) => setTimeout(r, 30000 - (Date.now() % 30000) + 500))
    await p.fill('#mfa-code', totp(secret)); await p.getByRole('button', { name: /Désactiver la double authentification/ }).click()
    await p.waitForSelector('[data-mfa="inactive"]', { timeout: 15000 })
  }
  T('après le bon code : désactivée', await p.locator('[data-mfa="inactive"]').count() === 1)
  const apres = await (await admin(`users/${u.id}/factors`)).json()
  T('plus aucun facteur vérifié côté Supabase', !(Array.isArray(apres) && apres.some((f) => f.status === 'verified')))
  await p.screenshot({ path: `${OUT}/mfa-4-desactivee.png`, fullPage: true })
  await deconnecter()
  await seConnecter()
  await p.waitForURL(/\/outils/, { timeout: 20000 })
  T('reconnexion directe vers /outils, sans étape 2', p.url().includes('/outils'))
  const s3 = await connexion(email, pw)
  T('un jeton au mot de passe seul ouvre de nouveau les routes', (await api('/api/securite/sessions', s3.access_token)).ok)
} catch (e) { T('exception', false, e?.stack || String(e)); await p.screenshot({ path: `${OUT}/mfa-erreur.png`, fullPage: true }).catch(() => {}) } finally {
  await b.close()
  await nettoyer()
  console.log(`\n${ok} ✅ · ${ko} ❌ — compte de test supprimé`)
  process.exit(ko ? 1 : 0)
}
