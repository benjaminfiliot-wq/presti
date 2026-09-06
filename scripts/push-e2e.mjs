// Test permanent — Notifications push web (prompt v9 §3.5), contre la production (ou TEST_BASE local).
//
// Préalables (sinon ⏳ code 2, « en attente d'un préalable humain ») : la migration 0064 collée
// (table push_abonnements), le drapeau `pushWeb` levé, les clés VAPID dans .env.local.
//
// Ce qu'il prouve :
//   1. lib/push.ts contre un FAUX service de push local : la notification arrive chiffrée (aes128gcm,
//      en-tête VAPID, TTL), se DÉCHIFFRE avec les clés de l'appareil et ne contient QUE titre, ligne,
//      adresse Presti, tag, renotify — aucune donnée personnelle ; 410 → abonnement supprimé ;
//      3 échecs → désactivé ; plafond horaire respecté ; bornes de la charge utile ;
//   2. lib/notifications.ts : la push suit les préférences (push coupé → rien ; email coupé, push gardé
//      → la push part), mène à la conversation (/messages?lead=…) et se regroupe par conversation ;
//   3. les routes /api/push : abonnement valide accepté, invalide refusé, liste, retrait, « test » qui
//      purge un abonnement mort chez un vrai service de push (404/410), plafond du test ;
//   4. le service worker en ligne porte `push` et `notificationclick` ;
//   5. l'écran Paramètres → Notifications : email + push par événement (enregistré en base), l'appel
//      à l'activation sur Chrome, le message iPhone hors écran d'accueil.
//
// Coût : 0 IA, 0 email réel (compte @presti-test.invalid). Usage :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/push-e2e.mjs
import fs from 'node:fs'
import http from 'node:http'
import crypto from 'node:crypto'
import { chromium, webkit, devices } from 'playwright'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.env.TEST_BASE || 'https://prestiapp.fr'
const LOCAL = /^http:\/\/localhost/.test(APP)
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const b64u = (b) => Buffer.from(b).toString('base64url')

// ── Préalables ─────────────────────────────────────────────────────────────────────────────────────
{
  const r = await rest('push_abonnements?select=id&limit=0')
  if (r.status === 404 || r.status === 400) { console.log('⏳ push-e2e : la table push_abonnements n’existe pas — migration 0064 à coller (_A_COLLER_sql_editor_0064.sql)'); process.exit(2) }
  const { actif } = await import('../lib/flags.ts')
  if (!actif('pushWeb')) { console.log('⏳ push-e2e : drapeau pushWeb baissé (lib/flags.ts) — à lever une fois 0064 collée'); process.exit(2) }
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) { console.log('⏳ push-e2e : clés VAPID absentes de .env.local'); process.exit(2) }
}
const { envoyerPushArtisan, chargeUtile, PLAFOND_PUSH_HEURE } = await import('../lib/push.ts')
const { notifierArtisan } = await import('../lib/notifications.ts')

// ── Le faux service de push : reçoit ce que web-push envoie, répond selon le chemin ─────────────────
const recus = []
const faux = http.createServer((req, res) => {
  const morceaux = []
  req.on('data', (c) => morceaux.push(c))
  req.on('end', () => {
    recus.push({ chemin: req.url, headers: req.headers, corps: Buffer.concat(morceaux) })
    const code = req.url.startsWith('/gone') ? 410 : req.url.startsWith('/ko') ? 500 : 201
    res.writeHead(code); res.end()
  })
})
await new Promise((r) => faux.listen(0, '127.0.0.1', r))
const PORT = faux.address().port
const url = (chemin) => `http://127.0.0.1:${PORT}${chemin}`

/** Les clés d'un « navigateur » : ECDH P-256 + secret d'authentification, comme un vrai abonnement. */
function appareil() {
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys()
  return { ecdh, p256dh: b64u(ecdh.getPublicKey()), auth: b64u(crypto.randomBytes(16)) }
}
/** Déchiffre une notification Web Push (RFC 8291, aes128gcm) avec les clés de l'appareil. */
async function dechiffrer(corps, ap) {
  const ece = (await import('http_ece')).default
  return ece.decrypt(corps, { version: 'aes128gcm', privateKey: ap.ecdh, authSecret: ap.auth }).toString('utf8')
}

// ── Le compte de test ──────────────────────────────────────────────────────────────────────────────
const st = Date.now(), EMAIL = `push.${st}@presti-test.invalid`, MDP = 'Push-e2e-' + st + '!Aa'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: MDP, email_confirm: true }) })).json()
if (!u.id) { console.log('❌ création du compte de test impossible', JSON.stringify(u).slice(0, 120)); process.exit(1) }
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email: EMAIL, nom: 'Push E2E', metier: 'Plombier', ton_style: 'pro', slug: `push-e2e-${st}` }) })
const UID = u.id
const nettoyer = async () => { faux.close(); await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: UID }) }).catch(() => {}) }
const abos = async () => (await rest(`push_abonnements?artisan_id=eq.${UID}&select=id,endpoint,actif,echecs,dernier_succes&order=cree_le`)).json()
const inserer = async (endpoint, ap) => rest('push_abonnements', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ artisan_id: UID, type: 'web', endpoint, p256dh: ap.p256dh, auth: ap.auth, appareil: 'Test · e2e' }) })

try {
  // ── 1. Envoi, chiffrement, charge utile ────────────────────────────────────────────────────────────
  console.log('\n1. Envoi chiffré vers un faux service de push')
  const ap1 = appareil()
  await inserer(url('/ok/1'), ap1)
  const charge = { titre: 'Nouvelle demande', ligne: 'Un client vous a écrit. Ouvrez la conversation.', url: '/messages?lead=abc', tag: 'conv-abc', renotify: true }
  const r1 = await envoyerPushArtisan(UID, charge)
  T('envoyerPushArtisan : 1 envoyé, 0 supprimé, 0 désactivé', r1.envoyes === 1 && r1.supprimes === 0 && r1.desactives === 0 && !r1.raison, JSON.stringify(r1))
  const q1 = recus.find((x) => x.chemin === '/ok/1')
  T('le faux service a reçu UNE requête : aes128gcm, en-tête VAPID, TTL 3600', !!q1 && q1.headers['content-encoding'] === 'aes128gcm' && /^vapid t=.+, k=.+/.test(q1.headers.authorization || '') && q1.headers.ttl === '3600', q1 ? JSON.stringify({ ce: q1.headers['content-encoding'], ttl: q1.headers.ttl, auth: (q1.headers.authorization || '').slice(0, 12) }) : 'rien reçu')
  let clair = null
  try { clair = q1 ? JSON.parse(await dechiffrer(q1.corps, ap1)) : null } catch (e) { console.log('     (déchiffrement :', e.message, ')') }
  T('déchiffrée avec les clés de l’appareil : exactement titre, ligne, url, tag, renotify', !!clair && Object.keys(clair).sort().join(',') === 'ligne,renotify,tag,titre,url' && clair.titre === charge.titre && clair.ligne === charge.ligne && clair.url === charge.url && clair.tag === charge.tag && clair.renotify === true, JSON.stringify(clair))
  T('aucune donnée personnelle dans la charge (ni @, ni téléphone, ni nom)', !!clair && !/@|\+?\d[\d .]{8,}\d|Push E2E/.test(JSON.stringify(clair)))
  const [a1] = await abos()
  T('dernier_succes posé, échecs à 0', !!a1?.dernier_succes && a1.echecs === 0, JSON.stringify(a1))

  // 410 → oublié ; 3 échecs → désactivé
  const ap2 = appareil(); await inserer(url('/gone/2'), ap2)
  const r2 = await envoyerPushArtisan(UID, charge)
  T('service répond 410 → abonnement supprimé (1 supprimé, 1 envoyé au premier)', r2.supprimes === 1 && r2.envoyes === 1 && (await abos()).every((x) => !x.endpoint.includes('/gone/')), JSON.stringify(r2))
  const ap3 = appareil(); await inserer(url('/ko/3'), ap3)
  let r3
  for (let i = 0; i < 3; i++) r3 = await envoyerPushArtisan(UID, charge)
  const l3 = (await abos()).find((x) => x.endpoint.includes('/ko/'))
  T('service répond 500 trois fois → abonnement désactivé (echecs 3, actif false)', !!l3 && l3.echecs === 3 && l3.actif === false && r3.desactives === 1, JSON.stringify({ l3, r3 }))
  const avant = recus.length
  await envoyerPushArtisan(UID, charge)
  T('un abonnement désactivé ne reçoit plus rien', recus.filter((x) => x.chemin.startsWith('/ko/')).length === 3 && recus.length === avant + 1)

  // bornes de la charge utile
  const b = JSON.parse(chargeUtile({ titre: 'T'.repeat(200), ligne: 'L'.repeat(300), url: 'https://evil.example/x', tag: 'x'.repeat(100) }))
  const b2 = JSON.parse(chargeUtile({ titre: 't', ligne: 'l', url: '//evil.example', tag: 't' }))
  T('charge utile bornée : titre 60, ligne 120, tag 60 ; url externe ou //hôte → /dashboard', b.titre.length === 60 && b.ligne.length === 120 && b.tag.length === 60 && b.url === '/dashboard' && b2.url === '/dashboard' && b.renotify === false)

  // plafond horaire
  const dejaConsomme = recus.length + 2 // envois déjà comptés (chaque appel consomme 1)
  for (let i = 0; i < PLAFOND_PUSH_HEURE; i++) await rest('rpc/consommer_limite', { method: 'POST', body: JSON.stringify({ p_cle: `push:artisan:${UID}`, p_max: PLAFOND_PUSH_HEURE, p_fenetre_s: 3600 }) })
  const rp = await envoyerPushArtisan(UID, charge)
  T(`plafond de ${PLAFOND_PUSH_HEURE} par heure atteint → raison « plafond », rien n’est envoyé`, rp.raison === 'plafond' && rp.envoyes === 0, JSON.stringify(rp))
  void dejaConsomme
  // on libère le compteur pour la suite (fenêtre repartie : on supprime les lignes du compteur de ce compte)
  await rest(`limites?cle=eq.${encodeURIComponent(`push:artisan:${UID}`)}`, { method: 'DELETE' })

  // ── 2. notifierArtisan : préférences, conversation, regroupement ───────────────────────────────────
  console.log('\n2. notifierArtisan : préférences et lien vers la conversation')
  const nAvant = recus.length
  const n1 = await notifierArtisan(UID, 'nouvelle_demande', EMAIL, { subject: 'Nouveau message — Jean Dupont', text: 'contenu privé', leadId: 'lead-123' })
  await new Promise((r) => setTimeout(r, 1500))
  const q2 = recus.slice(nAvant).find((x) => x.chemin === '/ok/1')
  let c2 = null; try { c2 = q2 ? JSON.parse(await dechiffrer(q2.corps, ap1)) : null } catch {}
  T('nouvelle_demande → push « Nouvelle demande » vers /messages?lead=…, tag par conversation, sans le sujet ni le nom', n1.push === true && !!c2 && c2.titre === 'Nouvelle demande' && c2.url === '/messages?lead=lead-123' && c2.tag === 'conv-lead-123' && !/Dupont|contenu privé/.test(JSON.stringify(c2)), JSON.stringify({ n1, c2 }))
  await rest(`artisans?id=eq.${UID}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: { push: { nouvelle_demande: false } } }) })
  const nAvant2 = recus.length
  const n2 = await notifierArtisan(UID, 'nouvelle_demande', EMAIL, { subject: 's', text: 't', leadId: 'lead-124' })
  await new Promise((r) => setTimeout(r, 1200))
  T('push coupée pour ce type → aucune push (l’email suit sa propre règle)', n2.push === false && recus.length === nAvant2, JSON.stringify(n2))
  await rest(`artisans?id=eq.${UID}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: { devis_accepte: false } }) })
  const nAvant3 = recus.length
  const n3 = await notifierArtisan(UID, 'devis_accepte', EMAIL, { subject: 's', text: 't', leadId: 'lead-125' })
  await new Promise((r) => setTimeout(r, 1200))
  T('email coupé mais push gardée → email non envoyé, push partie', n3.envoye === false && n3.raison === 'desactive' && n3.push === true && recus.length === nAvant3 + 1, JSON.stringify(n3))
  await rest(`artisans?id=eq.${UID}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: {} }) })

  // ── 3. Les routes /api/push ────────────────────────────────────────────────────────────────────────
  console.log('\n3. Les routes /api/push')
  const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: MDP }) })).json()
  await verifierSessionTest(sess.access_token)
  const api = async (chemin, o = {}) => { const r = await fetch(`${APP}${chemin}`, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.access_token}`, ...(o.headers || {}) } }); return { status: r.status, data: await r.json().catch(() => ({})) } }
  const apR = appareil()
  const mort = `https://fcm.googleapis.com/fcm/send/e2e-${st}-${crypto.randomBytes(6).toString('hex')}`
  const p1 = await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: mort, keys: { p256dh: apR.p256dh, auth: apR.auth } }) })
  T('POST abonner : abonnement web valide accepté (200), libellé d’appareil déduit', p1.status === 200 && p1.data.ok === true && typeof p1.data.appareil?.appareil === 'string', JSON.stringify(p1.data).slice(0, 120))
  const p2 = await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: 'http://insecure.example/x', keys: { p256dh: apR.p256dh, auth: apR.auth } }) })
  const p3 = await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: mort, keys: { p256dh: 'court', auth: apR.auth } }) })
  T('POST abonner : endpoint non https ou clés invalides → 400', p2.status === 400 && p3.status === 400, `${p2.status} ${p3.status}`)
  const g1 = await api('/api/push/abonner')
  T('GET : la clé publique VAPID et la liste (l’abonnement mort y est)', g1.status === 200 && typeof g1.data.cle === 'string' && g1.data.cle.length > 60 && (g1.data.appareils || []).some((x) => x.endpoint === mort), JSON.stringify(g1.data).slice(0, 100))
  const sansJeton = await fetch(`${APP}/api/push/abonner`)
  T('GET sans jeton → 401', sansJeton.status === 401, `HTTP ${sansJeton.status}`)
  const t1 = await api('/api/push/test', { method: 'POST' })
  const apres = (await abos()).map((x) => x.endpoint)
  T('POST test : le vrai service de push répond 404/410 pour l’abonnement mort → il est purgé (supprimé 1)', t1.status === 200 && t1.data.supprimes >= 1 && !apres.includes(mort), JSON.stringify(t1.data))
  const rDel = await api('/api/push/abonner', { method: 'DELETE', body: JSON.stringify({ endpoint: url('/ok/1') }) })
  T('DELETE : retrait d’un appareil par endpoint (200)', rDel.status === 200 && rDel.data.ok === true && !(await abos()).some((x) => x.endpoint === url('/ok/1')))
  let dernier = 0
  for (let i = 0; i < 6; i++) dernier = (await api('/api/push/test', { method: 'POST' })).status
  T('POST test : plafond de 5 par heure → 429 ensuite', dernier === 429, `HTTP ${dernier}`)

  // ── 4. Le service worker ───────────────────────────────────────────────────────────────────────────
  console.log('\n4. Le service worker')
  const sw = await (await fetch(`${APP}/sw.js`)).text()
  T('/sw.js : gestionnaires push et notificationclick, icône de marque, adresse bornée', /"push"/.test(sw) && /"notificationclick"/.test(sw) && sw.includes('showNotification') && sw.includes('/marque/presti-icone-192.png') && sw.includes('/dashboard'))

  // ── 5. L'écran Paramètres → Notifications ──────────────────────────────────────────────────────────
  console.log('\n5. Paramètres → Notifications')
  const ref = SB.match(/https:\/\/([^.]+)\./)[1], CLE = `sb-${ref}-auth-token`
  const init = ([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])); localStorage.setItem('presti.installer_refus', new Date().toISOString()) } catch {} }
  const routeLocal = async (ctx) => { if (LOCAL) await ctx.route(/^https:\/\/localhost(:\d+)?\//, async (route) => { const q = route.request(); try { const r = await fetch(q.url().replace(/^https:/, 'http:'), { method: q.method(), headers: q.headers(), body: ['GET', 'HEAD'].includes(q.method()) ? undefined : q.postDataBuffer() ?? undefined, redirect: 'manual' }); const h = {}; r.headers.forEach((v, k) => { if (!/^(content-encoding|transfer-encoding|content-length|connection)$/i.test(k)) h[k] = v }); await route.fulfill({ status: r.status, headers: h, body: Buffer.from(await r.arrayBuffer()) }) } catch { await route.abort() } }) }
  const cr = await chromium.launch()
  {
    const ctx = await cr.newContext({ ...devices['Pixel 7'], locale: 'fr-FR', reducedMotion: 'reduce', permissions: ['notifications'] })
    await routeLocal(ctx)
    await ctx.addInitScript(init, [CLE, sess])
    const page = await ctx.newPage()
    await page.goto(`${APP}/parametres?onglet=notifications`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await page.waitForSelector('[data-notif-prefs]', { timeout: 15000 }).catch(() => null)
    const lignes = await page.$$('[data-notif-prefs] .notif-row')
    const cases = await page.$$('[data-notif-prefs] .notif-canaux input')
    T('trois événements, chacun avec Email et Push', lignes.length === 3 && cases.length === 6, `${lignes.length} lignes, ${cases.length} cases`)
    await page.click('[data-notif-prefs] [data-type="nouvelle_demande"] .notif-canaux label:nth-child(2) input').catch(() => {})
    await page.waitForTimeout(1200)
    const prefs = (await (await rest(`artisans?id=eq.${UID}&select=notifications`)).json())[0]?.notifications
    T('décocher « Push » sur Nouvelle demande → enregistré en base (notifications.push.nouvelle_demande = false)', prefs?.push?.nouvelle_demande === false, JSON.stringify(prefs))
    const carte = await page.$('[data-notif-push]')
    const bouton = await page.$('[data-notif-push] [data-activer]')
    T('carte « Sur votre téléphone » avec le bouton « Activer sur cet appareil » (Chrome)', !!carte && !!bouton)
    if (bouton) {
      await bouton.click().catch(() => {})
      await page.waitForFunction(() => document.querySelector('[data-etat="actif"], .notif-erreur, [data-appareils]'), null, { timeout: 20000 }).catch(() => {})
      const etat = await page.evaluate(() => ({ actif: !!document.querySelector('[data-etat="actif"]'), erreur: document.querySelector('.notif-erreur')?.textContent || '', appareils: document.querySelectorAll('[data-appareils] li').length }))
      console.log(`  ℹ️  activation en headless : ${etat.actif ? 'abonnement réel créé' : etat.erreur ? `refus propre — « ${etat.erreur.slice(0, 70)} »` : 'sans réponse visible'}`)
      T('l’activation aboutit, ou explique proprement pourquoi elle n’a pas pu (jamais silencieuse)', etat.actif || !!etat.erreur)
    }
    await page.screenshot({ path: 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/pwa/notifications-pixel.png', fullPage: true }).catch(() => {})
    await ctx.close()
  }
  await cr.close()
  {
    let b; try { b = await webkit.launch() } catch { b = await chromium.launch() }
    const ctx = await b.newContext({ ...devices['iPhone 14'], locale: 'fr-FR', reducedMotion: 'reduce' })
    await routeLocal(ctx)
    await ctx.addInitScript(init, [CLE, sess])
    await ctx.addInitScript(() => { try { delete window.PushManager } catch {} })
    const page = await ctx.newPage()
    await page.goto(`${APP}/parametres?onglet=notifications`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    const ios = await page.waitForSelector('[data-notif-push] [data-etat="ios"]', { timeout: 15000 }).catch(() => null)
    const txt = ios ? await ios.textContent() : ''
    T('iPhone hors écran d’accueil : le message explique l’installation (Partager → Sur l’écran d’accueil) et aucun bouton n’est promis', !!ios && /écran d’accueil/.test(txt) && (await page.$('[data-notif-push] [data-activer]')) === null, txt.slice(0, 80))
    await ctx.close(); await b.close()
  }
} finally {
  await nettoyer()
}
console.log(`\n${ko === 0 ? '✅' : '❌'} push-e2e : ${ok}/${ok + ko} — ${APP}`)
process.exitCode = ko === 0 ? 0 : 1
