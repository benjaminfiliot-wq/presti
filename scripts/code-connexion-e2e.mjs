// Test permanent — Le code par email à la connexion (prompt v7, bloc 2), contre la production.
//
// Ce qu'on prouve, dans l'ordre où un artisan (ou un intrus) le vivrait :
//  1. anti-énumération : email inconnu et mauvais mot de passe → la même réponse, à l'octet près ;
//  2. bon mot de passe → un code part (ligne hachée, 10 min, 0 essai), AUCUNE session rendue ;
//     le gabarit de l'email porte le code (lib/connexion.gabaritCode) ;
//  3. un jeton obtenu AVANT vérification (mot de passe seul, directement auprès de GoTrue)
//     n'ouvre aucune route (401 `code_requis`) — auditeur A, rejeu ;
//  4. code faux ×5 → « nouveau code requis » ; le bon code ne vaut plus rien ensuite (usage unique) ;
//  5. renvoyer : 3 par quart d'heure, le 4e refusé ;
//  6. code expiré refusé ;
//  7. bon code + « se souvenir » → session rendue, cookie signé httpOnly, routes ouvertes ;
//  8. appareil de confiance → pas de code (même agent) ; agent différent → code redemandé ;
//  9. révocation unitaire, puis « fermer toutes mes sessions » → code redemandé ;
// 10. TOTP actif → c'est l'application qui prend le relais, pas d'email ;
// 11. fondateur : même règle ;
// 12. l'écran /login (Playwright) : le code, la case « se souvenir », Sécurité → appareils, retrait.
//
// Coût : aucun appel IA, aucun email réel (adresses .invalid, neutralisées par lib/email).
// Le code réel est haché : la suite pose un code CONNU par la clé service (scripts/lib/connexion-test).
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/code-connexion-e2e.mjs
// Si le drapeau `codeEmail` est baissé (migration 0063 pas encore collée), la suite LE DIT et sort en code 2.

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { hacherCode, poserCodeTest, claims } from './lib/connexion-test.mjs'
import { gabaritCode, COOKIE_APPAREIL } from '../lib/connexion.ts'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.env.TEST_BASE || 'https://prestiapp.fr'
const OUT = process.env.CAPTURES || 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) presti-code-e2e Chrome/128.0'

const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const auth = (p, jwt, o = {}) => fetch(`${SB}/auth/v1/${p}`, { ...o, headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const grant = async (email, password) => (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
const api = (chemin, o = {}) => fetch(`${APP}${chemin}`, { ...o, headers: { 'Content-Type': 'application/json', 'User-Agent': UA, ...(o.headers || {}) } })
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), setCookie: r.headers.get('set-cookie') })
const demanderCode = (email, password, extra = {}, headers = {}) => api('/api/auth/code', { method: 'POST', headers, body: JSON.stringify({ email, password, ...extra }) }).then(json)
const verifier = (email, password, code, extra = {}, headers = {}) => api('/api/auth/code/verifier', { method: 'POST', headers, body: JSON.stringify({ email, password, code, ...extra }) }).then(json)
const route = (chemin, jwt, o = {}) => api(chemin, { ...o, headers: { Authorization: `Bearer ${jwt}`, ...(o.headers || {}) } }).then(json)
const ligneCode = async (uid) => (await (await rest(`codes_connexion?select=user_id,expire_le,essais,hash_code&user_id=eq.${uid}`)).json())[0] ?? null
/** Les compteurs de plafond de cette suite : remis à zéro entre deux sections qui en abusent volontairement. */
const purgerPlafonds = () => rest('limites?cle=like.code%3A*', { method: 'DELETE', headers: { Prefer: 'return=minimal' } })

// RFC 6238, comme scripts/mfa-e2e.mjs — pour prouver que l'application remplace l'email.
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

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const fin = (code) => { process.exitCode = code; setTimeout(() => {}, 50) }

const st = Date.now(), pw = 'tuile-caramel-vendredi-42'
const comptes = []
async function creerCompte(prefixe, extra = {}) {
  const email = `${prefixe}.${st}@presti-test.invalid`, slug = `${prefixe}-${st}`
  const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
  if (!u?.id) throw new Error('création du compte impossible : ' + JSON.stringify(u).slice(0, 200))
  await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Atelier Code', metier: 'Menuisier', slug, plan: 'essentiel', aide_vues: ['visite:console'], ...extra }) })
  comptes.push(u.id)
  return { uid: u.id, email }
}
const nettoyer = async () => { for (const id of comptes) await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: id }) }).catch(() => {}) }

// ── Le drapeau est-il levé ? On le constate par l'effet, pas en lisant un fichier.
{
  const sonde = await demanderCode('sonde@presti-test.invalid', 'x')
  if (sonde.status === 404) {
    console.log("\n⛔ Le code par email est désactivé en production (drapeau 'codeEmail' baissé).")
    console.log('   À faire : coller _A_COLLER_sql_editor_0063.sql dans Supabase → SQL Editor, puis lib/flags.ts → codeEmail: true, déployer, relancer.')
    fin(2)
  }
}
if (process.exitCode === 2) { /* rien d'autre */ } else {
let A, B, C
try {
  A = await creerCompte('code-a')
  await purgerPlafonds()

  console.log('\n── 1. Anti-énumération : inconnu et mauvais mot de passe, même réponse')
  const inconnu = await demanderCode(`personne.${st}@presti-test.invalid`, 'n-importe-quoi-123')
  const faux = await demanderCode(A.email, 'mauvais-mot-de-passe-123')
  T('email inconnu → 401', inconnu.status === 401, String(inconnu.status))
  T('mauvais mot de passe → 401, corps identique', faux.status === inconnu.status && JSON.stringify(faux.body) === JSON.stringify(inconnu.body), JSON.stringify(faux.body))
  T('aucun code créé pour un mauvais mot de passe', (await ligneCode(A.uid)) === null)

  console.log('\n── 2. Bon mot de passe : un code part, aucune session ne revient')
  const d1 = await demanderCode(A.email, pw)
  T('réponse « code » sans session', d1.status === 200 && d1.body.etape === 'code' && !d1.body.session, JSON.stringify(d1.body))
  const l1 = await ligneCode(A.uid)
  T('une ligne codes_connexion : hachée, 0 essai', !!l1 && /^[0-9a-f]{64}$/.test(l1.hash_code) && l1.essais === 0)
  T('valable 10 minutes', !!l1 && Math.abs(new Date(l1.expire_le).getTime() - Date.now() - 600_000) < 30_000, l1?.expire_le)
  // L'email part de app/api/auth/code/route.ts (sendEmail, critique) ; les adresses .invalid ne sont jamais envoyées.
  const gab = gabaritCode('482913')
  T('le gabarit d’email porte le code et sa validité', gab.subject === 'Votre code Presti : 482 913' && /482 913/.test(gab.text) && /10 minutes/.test(gab.text))

  console.log('\n── 3. Un jeton obtenu AVANT vérification n’ouvre aucune route')
  const brut = await grant(A.email, pw)
  T('GoTrue rend bien une session au mot de passe seul (clé anonyme publique)', !!brut.access_token)
  const r1 = await route('/api/securite/sessions', brut.access_token)
  T('/api/securite/sessions → 401 code_requis', r1.status === 401 && r1.body.code === 'code_requis', `${r1.status} ${JSON.stringify(r1.body)}`)
  const r2 = await route('/api/plateforme/config', brut.access_token)
  T('/api/plateforme/config → 401 aussi', r2.status === 401 && r2.body.code === 'code_requis', String(r2.status))
  const r3 = await route('/api/auth/code', brut.access_token)
  T('GET /api/auth/code (état) → 401 code_requis (AppShell renvoie se connecter)', r3.status === 401 && r3.body.code === 'code_requis')

  console.log('\n── 4. Cinq codes faux → nouveau code requis ; le bon ne vaut plus rien')
  const attendus = [4, 3, 2, 1]
  let sequenceOk = true
  for (const restants of attendus) {
    const v = await verifier(A.email, pw, '000000')
    if (!(v.status === 400 && v.body.code === 'code_faux' && v.body.essais_restants === restants)) { sequenceOk = false; console.log('     ', JSON.stringify(v.body)) }
  }
  T('quatre refus, avec le compte à rebours 4 → 1', sequenceOk)
  const v5 = await verifier(A.email, pw, '000000')
  T('cinquième refus : « nouveau code requis »', v5.status === 400 && v5.body.code === 'code_epuise', JSON.stringify(v5.body))
  T('la ligne est effacée', (await ligneCode(A.uid)) === null)
  const bon = await poserCodeTest(A.uid, '135790')
  const vBon = await verifier(A.email, pw, bon)
  T('un code juste est accepté…', vBon.status === 200 && !!vBon.body.session, JSON.stringify(vBon.body).slice(0, 100))
  const vRejeu = await verifier(A.email, pw, bon)
  T('…et ne vaut qu’une fois (rejeu → aucun code en attente)', vRejeu.status === 400 && vRejeu.body.code === 'code_absent', JSON.stringify(vRejeu.body))
  const vMdpFaux = await verifier(A.email, 'mauvais-mot-de-passe-123', await poserCodeTest(A.uid, '111222'))
  T('un code juste avec un MAUVAIS mot de passe est refusé (le code ne remplace jamais le mot de passe)', vMdpFaux.status === 401, String(vMdpFaux.status))

  console.log('\n── 5. Renvoyer un code : trois par quart d’heure')
  await purgerPlafonds()
  const renvois = []
  for (let i = 0; i < 4; i++) renvois.push(await demanderCode(A.email, pw, { renvoi: true }))
  T('trois renvois acceptés', renvois.slice(0, 3).every((r) => r.status === 200 && r.body.etape === 'code'), renvois.slice(0, 3).map((r) => r.status).join(','))
  T('le quatrième est refusé (429, plafond)', renvois[3].status === 429 && renvois[3].body.code === 'renvoi_plafond', JSON.stringify(renvois[3].body))

  console.log('\n── 6. Un code expiré est refusé')
  await purgerPlafonds()
  const expire = await poserCodeTest(A.uid, '222333', { expireDansMs: -1000 })
  const vExp = await verifier(A.email, pw, expire)
  T('code expiré → code_expire', vExp.status === 400 && vExp.body.code === 'code_expire', JSON.stringify(vExp.body))

  console.log('\n── 7. Bon code + « se souvenir » : session rendue, cookie signé, routes ouvertes')
  const code7 = await poserCodeTest(A.uid, '246813')
  const v7 = await verifier(A.email, pw, code7, { souvenir: true }, { 'User-Agent': UA })
  T('200 avec une session', v7.status === 200 && !!v7.body.session?.access_token && !!v7.body.session?.refresh_token)
  const cookie = (v7.setCookie ?? '').split(';')[0]
  T(`un cookie ${COOKIE_APPAREIL}, HttpOnly, Secure, SameSite=Lax, 30 jours`, cookie.startsWith(`${COOKIE_APPAREIL}=`) && /HttpOnly/i.test(v7.setCookie ?? '') && /Secure/i.test(v7.setCookie ?? '') && /SameSite=Lax/i.test(v7.setCookie ?? '') && /Max-Age=2592000/.test(v7.setCookie ?? ''), v7.setCookie)
  T('le cookie est signé (trois segments)', cookie.split('=')[1]?.split('.').length === 3)
  const jetonA = v7.body.session.access_token
  const r7 = await route('/api/securite/sessions', jetonA)
  T('la session vérifiée ouvre les routes (/api/securite/sessions → 200)', r7.status === 200 && Array.isArray(r7.body.sessions), String(r7.status))
  const sv = (await (await rest(`sessions_verifiees?select=session_id,moyen&user_id=eq.${A.uid}`)).json())
  T('sessions_verifiees : cette session, moyen code_email', sv.some((x) => x.session_id === claims(jetonA).session_id && x.moyen === 'code_email'))
  const art = (await (await rest(`artisans?select=connexion_verifiee_le&id=eq.${A.uid}`)).json())[0]
  T('artisans.connexion_verifiee_le posé', !!art?.connexion_verifiee_le)
  T('le jeton d’AVANT (étape 3) reste refusé — la vérification est par session, pas par compte', (await route('/api/securite/sessions', brut.access_token)).status === 401)

  console.log('\n── 8. Appareil de confiance : pas de code pendant 30 jours, même agent seulement')
  await purgerPlafonds()
  const d8 = await demanderCode(A.email, pw, {}, { Cookie: cookie, 'User-Agent': UA })
  T('avec le cookie et le même agent → « ok » + session, sans code', d8.status === 200 && d8.body.etape === 'ok' && !!d8.body.session, JSON.stringify(d8.body).slice(0, 80))
  T('aucun code créé', (await ligneCode(A.uid)) === null)
  T('cette session ouvre les routes', (await route('/api/plateforme/config', d8.body.session.access_token)).status === 200)
  const d8b = await demanderCode(A.email, pw, {}, { Cookie: cookie, 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) autre-navigateur' })
  T('même cookie, agent différent → code redemandé (empreinte = agent + secret)', d8b.status === 200 && d8b.body.etape === 'code', JSON.stringify(d8b.body))
  const d8c = await demanderCode(A.email, pw, {}, { Cookie: `${COOKIE_APPAREIL}=${cookie.split('=')[1].replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))}`, 'User-Agent': UA })
  T('cookie altéré d’un caractère → signature invalide → code redemandé', d8c.status === 200 && d8c.body.etape === 'code')
  const liste = await route('/api/securite/appareils', jetonA, { headers: { Cookie: cookie } })
  T('Sécurité → appareils : un appareil, marqué « cet appareil »', liste.status === 200 && liste.body.appareils?.length === 1 && liste.body.appareils[0].courant === true, JSON.stringify(liste.body))

  console.log('\n── 9. Révocation : unitaire, puis « fermer toutes mes sessions »')
  const idApp = liste.body.appareils?.[0]?.id
  const rev = await route('/api/securite/appareils', jetonA, { method: 'DELETE', headers: { Cookie: cookie }, body: JSON.stringify({ id: idApp }) })
  T('retrait accepté, cookie effacé côté serveur', rev.status === 200 && /Max-Age=0/.test(rev.setCookie ?? ''), `${rev.status} ${rev.setCookie}`)
  await purgerPlafonds()
  const d9 = await demanderCode(A.email, pw, {}, { Cookie: cookie, 'User-Agent': UA })
  T('après retrait, le même cookie → code redemandé', d9.status === 200 && d9.body.etape === 'code')
  // un nouvel appareil, puis « fermer toutes mes sessions »
  const code9 = await poserCodeTest(A.uid, '987654')
  const v9 = await verifier(A.email, pw, code9, { souvenir: true }, { 'User-Agent': UA })
  const cookie2 = (v9.setCookie ?? '').split(';')[0]
  const jeton9 = v9.body.session?.access_token
  T('nouvel appareil de confiance enregistré', v9.status === 200 && cookie2.length > 40)
  const tout = await route('/api/securite/sessions', jeton9, { method: 'POST', headers: { Cookie: cookie2 } })
  T('« fermer toutes mes sessions » → 200, cookie effacé', tout.status === 200 && /Max-Age=0/.test(tout.setCookie ?? ''), `${tout.status} ${tout.setCookie}`)
  const restant = (await (await rest(`appareils_confiance?select=id,revoque_le&user_id=eq.${A.uid}`)).json())
  T('tous les appareils sont révoqués en base', restant.length >= 2 && restant.every((a) => !!a.revoque_le), JSON.stringify(restant))
  await purgerPlafonds()
  const d9b = await demanderCode(A.email, pw, {}, { Cookie: cookie2, 'User-Agent': UA })
  T('le cookie du nouvel appareil ne vaut plus rien → code redemandé', d9b.status === 200 && d9b.body.etape === 'code')

  console.log('\n── 10. Application d’authentification active : elle remplace l’email')
  B = await creerCompte('code-b')
  const sB = await grant(B.email, pw)
  const enrol = await (await auth('factors', sB.access_token, { method: 'POST', body: JSON.stringify({ factor_type: 'totp', friendly_name: 'Presti', issuer: 'Presti' }) })).json()
  if (!enrol?.id) {
    console.log('  ⏭  MFA TOTP indisponible côté Supabase :', JSON.stringify(enrol).slice(0, 120), '— section sautée')
  } else {
    const ch = await (await auth(`factors/${enrol.id}/challenge`, sB.access_token, { method: 'POST' })).json()
    let v = await auth(`factors/${enrol.id}/verify`, sB.access_token, { method: 'POST', body: JSON.stringify({ challenge_id: ch.id, code: totp(enrol.totp.secret) }) })
    if (!v.ok) { await new Promise((r) => setTimeout(r, 30000 - (Date.now() % 30000) + 500)); const ch2 = await (await auth(`factors/${enrol.id}/challenge`, sB.access_token, { method: 'POST' })).json(); v = await auth(`factors/${enrol.id}/verify`, sB.access_token, { method: 'POST', body: JSON.stringify({ challenge_id: ch2.id, code: totp(enrol.totp.secret) }) }) }
    T('facteur TOTP vérifié sur le compte B', v.ok)
    await purgerPlafonds()
    const d10 = await demanderCode(B.email, pw)
    T('mot de passe juste → « totp » avec la session (pas de code email)', d10.status === 200 && d10.body.etape === 'totp' && !!d10.body.session, JSON.stringify(d10.body).slice(0, 80))
    T('aucune ligne codes_connexion pour B', (await ligneCode(B.uid)) === null)
    const r10 = await route('/api/securite/sessions', d10.body.session.access_token)
    T('cette session (aal1) reste refusée tant que le code de l’application n’est pas passé', r10.status === 401 && r10.body.code === 'mfa_requise', JSON.stringify(r10.body))
  }

  console.log('\n── 11. Fondateur : même règle, aucune exception')
  C = await creerCompte('code-c', { is_founder: true, plan: 'business' })
  await purgerPlafonds()
  const d11 = await demanderCode(C.email, pw)
  T('un fondateur reçoit un code comme tout le monde', d11.status === 200 && d11.body.etape === 'code' && !d11.body.session, JSON.stringify(d11.body))
  const brutC = await grant(C.email, pw)
  // On interroge le poste ACTUEL (/api/controle, avec un « e ») : l'ancien a ete supprime le 07/09,
  // et un 404 aurait fait passer ce test pour de mauvaises raisons.
  T('son jeton au mot de passe seul n’ouvre pas le poste de contrôle', (await route('/api/controle/etat', brutC.access_token)).status === 401)

  console.log('\n── 12. L’écran de connexion, tel que l’artisan le voit')
  await purgerPlafonds()
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } }); const p = await ctx.newPage()
  try {
    await p.goto(`${APP}/login`, { waitUntil: 'load' })
    await p.fill('input[type=email]', C.email); await p.fill('input[type=password]', pw)
    await p.getByRole('button', { name: /Se connecter/i }).click()
    await p.waitForSelector('#code-email', { timeout: 60000 })
    T('après le mot de passe, l’écran demande le code reçu par email (même page /login)', p.url().includes('/login') && /vient de partir/.test(await p.locator('.card').innerText()))
    T('la case « Se souvenir de cet appareil 30 jours » est là', await p.locator('#souvenir-appareil').count() === 1)
    T('un ⓘ explique le code', await p.locator('label[for=code-email] button').count() === 1)
    T('le lien « renvoyer un code » et « Revenir à la connexion » existent', await p.getByText(/renvoyer un code/).count() === 1 && await p.getByText(/Revenir à la connexion/).count() === 1)
    await p.screenshot({ path: `${OUT}/code-1-ecran.png`, fullPage: true })
    await p.fill('#code-email', '000000'); await p.getByRole('button', { name: /^Valider$/ }).click()
    await p.waitForSelector('.msg.err', { timeout: 15000 })
    T('un code faux est refusé, en français, avec le compte à rebours', /Code incorrect.*4 essais/.test(await p.locator('.msg.err').innerText()), await p.locator('.msg.err').innerText())
    const codeUI = await poserCodeTest(C.uid, '314159')
    await p.check('#souvenir-appareil')
    await p.fill('#code-email', codeUI); await p.getByRole('button', { name: /^Valider$/ }).click()
    await p.waitForURL(/\/outils/, { timeout: 60000 })
    T('le bon code ouvre /outils', p.url().includes('/outils'))
    const cookies = await ctx.cookies(APP)
    const ck = cookies.find((c) => c.name === COOKIE_APPAREIL)
    T('le navigateur porte le cookie httpOnly de l’appareil', !!ck && ck.httpOnly === true && ck.secure === true)
    await p.goto(`${APP}/parametres?onglet=securite`, { waitUntil: 'load' })
    await p.waitForSelector('[data-appareils] .sess li', { timeout: 60000 })
    // innerText rend le texte tel qu'AFFICHÉ : la pastille est en capitales (text-transform) — on regarde la classe, comme parametres-e2e.
    T('Sécurité → « Appareils de confiance » liste cet appareil, marqué courant', await p.locator('[data-appareils] .sess li.courante').count() === 1 && /cet appareil/i.test(await p.locator('[data-appareils]').innerText()))
    await p.screenshot({ path: `${OUT}/code-2-appareils.png`, fullPage: true })
    // déconnexion (session locale effacée, cookie conservé) → reconnexion sans code
    await p.evaluate(() => localStorage.clear())
    await p.goto(`${APP}/login`, { waitUntil: 'load' })
    await p.fill('input[type=email]', C.email); await p.fill('input[type=password]', pw)
    await p.getByRole('button', { name: /Se connecter/i }).click()
    await p.waitForURL(/\/outils/, { timeout: 60000 })
    T('appareil reconnu : reconnexion directe, sans code', p.url().includes('/outils') && (await p.locator('#code-email').count()) === 0)
    await p.goto(`${APP}/parametres?onglet=securite`, { waitUntil: 'load' })
    await p.waitForSelector('[data-appareils] .sess li', { timeout: 60000 })
    await p.locator('[data-appareils] .sess li').first().getByRole('button', { name: /Retirer/ }).click()
    await p.waitForSelector('[data-appareils-vide]', { timeout: 15000 })
    T('« Retirer » vide la liste', (await p.locator('[data-appareils] .sess li').count()) === 0)
    await p.evaluate(() => localStorage.clear())
    await p.goto(`${APP}/login`, { waitUntil: 'load' })
    await p.fill('input[type=email]', C.email); await p.fill('input[type=password]', pw)
    await p.getByRole('button', { name: /Se connecter/i }).click()
    await p.waitForSelector('#code-email', { timeout: 60000 })
    T('après le retrait, le code est redemandé sur cet appareil', p.url().includes('/login'))
  } finally { await b.close() }

  // ── 9. Le compte de relecture des stores (v9 §5.4) ───────────────────────────────────────────────
  // UN compte désigné (RELECTURE_EMAIL) passe le second facteur avec un code FIXE (RELECTURE_CODE) : les relecteurs
  // Apple/Google n'ont pas de boîte email. Tout le reste tient : mot de passe exigé, le code fixe n'ouvre aucun autre
  // compte, un mauvais code est refusé. Variables absentes ici → la section est sautée, jamais prétendue.
  console.log('\n9. Le compte de relecture des stores (code fixe)')
  const REL = { email: (process.env.RELECTURE_EMAIL || '').toLowerCase(), code: process.env.RELECTURE_CODE || '', mdp: process.env.RELECTURE_MOT_DE_PASSE || '' }
  if (REL.email && REL.code && REL.mdp) {
    await purgerPlafonds()
    const vOk = await verifier(REL.email, REL.mdp, REL.code)
    T('compte de relecture : mot de passe + code fixe → session ouverte (200, jetons)', vOk.status === 200 && !!vOk.body.session?.access_token, JSON.stringify(vOk.body).slice(0, 120))
    if (vOk.body.session?.access_token) {
      const moi = await api('/api/push/abonner', { headers: { Authorization: `Bearer ${vOk.body.session.access_token}` } })
      T('compte de relecture : la session ouverte passe la garde des routes (200)', moi.status === 200, `HTTP ${moi.status}`)
    }
    const vFaux = await verifier(REL.email, REL.mdp, REL.code === '123456' ? '654321' : '123456')
    T('compte de relecture : un autre code est refusé (400)', vFaux.status === 400, `HTTP ${vFaux.status} ${JSON.stringify(vFaux.body).slice(0, 80)}`)
    const vMdp = await verifier(REL.email, 'pas-le-bon-mot-de-passe-9', REL.code)
    T('compte de relecture : le code fixe n’ouvre rien sans le mot de passe (401)', vMdp.status === 401, `HTTP ${vMdp.status}`)
    const vAutre = await verifier(`autre-${REL.email}`, REL.mdp, REL.code)
    T('le code fixe n’est pas un passe-partout : un autre email est refusé (401)', vAutre.status === 401, `HTTP ${vAutre.status}`)
    await purgerPlafonds()
  } else console.log('  ℹ️  RELECTURE_EMAIL / RELECTURE_CODE / RELECTURE_MOT_DE_PASSE absents ici : section sautée (scripts/compte-relecture.mjs les pose)')
} catch (e) {
  ko++; console.log('  ❌ exception :', e?.stack?.split('\n').slice(0, 3).join(' | ') || e)
} finally {
  await purgerPlafonds().catch(() => {})
  await nettoyer()
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
  console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués`)
  fin(ko === 0 ? 0 : 1)
}
}
