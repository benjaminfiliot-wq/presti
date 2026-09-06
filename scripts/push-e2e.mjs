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
import https from 'node:https'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
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
// Certificat auto-signé du faux service de push (généré une fois avec openssl dans scripts/.certs-test/, ignoré
// par git). Le serveur local doit lui faire confiance pour le chemin réel :
//   NODE_EXTRA_CA_CERTS=scripts/.certs-test/cert.pem npx next start -p 3116
const CERTS = 'scripts/.certs-test'
let tls = null
try {
  if (!fs.existsSync(`${CERTS}/cert.pem`)) {
    fs.mkdirSync(CERTS, { recursive: true })
    const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', `${CERTS}/key.pem`, '-out', `${CERTS}/cert.pem`, '-subj', '/CN=127.0.0.1', '-days', '3650', '-addext', 'subjectAltName=IP:127.0.0.1'], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error((r.stderr || r.error?.message || 'openssl').slice(0, 120))
  }
  tls = { key: fs.readFileSync(`${CERTS}/key.pem`), cert: fs.readFileSync(`${CERTS}/cert.pem`) }
} catch (e) { console.log('  ⚠️  pas de certificat de test (openssl absent ?) : faux service en http, transport remplacé —', String(e.message).slice(0, 80)) }

// Vers le faux service, web-push fait TOUT comme en vrai (chiffrement aes128gcm, signature VAPID, https) : on lui
// donne seulement l'autorité de certification du certificat de test. Sans certificat (http), on garde le
// chiffrement et la signature (generateRequestDetails) et on ne remplace que le transport.
{
  const wp = (await import('web-push')).default
  const vrai = wp.sendNotification.bind(wp)
  const agentTest = tls ? new https.Agent({ ca: tls.cert }) : null
  wp.sendNotification = (sub, corps, opts) => {
    if (!/^https?:\/\/127\.0\.0\.1:/.test(sub.endpoint)) return vrai(sub, corps, opts)
    if (agentTest) return vrai(sub, corps, { ...opts, agent: agentTest })
    const d = wp.generateRequestDetails(sub, corps, opts)
    return new Promise((resolve, reject) => {
      const req = http.request(d.endpoint, { method: d.method, headers: d.headers }, (res) => {
        res.resume()
        res.on('end', () => { if (res.statusCode >= 200 && res.statusCode < 300) resolve({ statusCode: res.statusCode }); else { const e = new Error('HTTP ' + res.statusCode); e.statusCode = res.statusCode; reject(e) } })
      })
      req.on('error', reject); req.end(d.body)
    })
  }
}
const { envoyerPushArtisan, chargeUtile, PLAFOND_PUSH_HEURE, TAILLE_CHARGE } = await import('../lib/push.ts')
const { notifierArtisan } = await import('../lib/notifications.ts')

// ── Le faux service de push : reçoit ce que web-push envoie, répond selon le chemin ─────────────────
// En HTTPS, comme un vrai (web-push n'envoie qu'en https) : certificat auto-signé généré une fois avec openssl
// dans scripts/.certs-test/ (ignoré par git). Le serveur local doit lui faire confiance pour le chemin réel :
//   NODE_EXTRA_CA_CERTS=scripts/.certs-test/cert.pem npx next start -p 3116
// Sans openssl : http, transport remplacé (moins fidèle, dit en clair).
const recus = []
const gestionnaire = (req, res) => {
  const morceaux = []
  req.on('data', (c) => morceaux.push(c))
  req.on('end', () => {
    recus.push({ chemin: req.url, headers: req.headers, corps: Buffer.concat(morceaux) })
    const code = req.url.startsWith('/gone') ? 410 : req.url.startsWith('/ko') ? 403 : req.url.startsWith('/panne') ? 500 : 201
    res.writeHead(code); res.end()
  })
}
const faux = tls ? https.createServer(tls, gestionnaire) : http.createServer(gestionnaire)
await new Promise((r) => faux.listen(0, '127.0.0.1', r))
const PORT = faux.address().port
const url = (chemin) => `${tls ? 'https' : 'http'}://127.0.0.1:${PORT}${chemin}`

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
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email: EMAIL, nom: 'Push E2E', metier: 'Plombier', ton_style: 'pro', slug: `push-e2e-${st}`, aide_vues: ['visite:console', 'visite:messages', 'visite:devis', 'visite:plateforme', 'visite:inventaire'] }) })
const UID = u.id
const autres = []
const nettoyer = async () => { faux.close(); for (const id of [UID, ...autres]) await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: id }) }).catch(() => {}) }
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
  let clair = null, brut1 = ''
  try { brut1 = q1 ? await dechiffrer(q1.corps, ap1) : ''; clair = brut1 ? JSON.parse(brut1) : null } catch (e) { console.log('     (déchiffrement :', e.message, ')') }
  const sansRembourrage = (c) => (c ? Object.keys(c).filter((k) => k !== 'p').sort().join(',') : '')
  T('déchiffrée avec les clés de l’appareil : exactement titre, ligne, url, tag, renotify (+ rembourrage « p », des espaces)', !!clair && sansRembourrage(clair) === 'ligne,renotify,tag,titre,url' && /^ *$/.test(clair.p ?? '') && clair.titre === charge.titre && clair.ligne === charge.ligne && clair.url === charge.url && clair.tag === charge.tag && clair.renotify === true, JSON.stringify(clair).slice(0, 200))
  T(`rembourrée à ${TAILLE_CHARGE} OCTETS (UTF-8, pas des unités UTF-16) : la longueur du chiffré ne trahit pas l’événement`, Buffer.byteLength(brut1, 'utf8') === TAILLE_CHARGE, `${Buffer.byteLength(brut1, 'utf8')} octets`)
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
  T('service répond 403 trois fois (l’abonnement est en cause) → désactivé (echecs 3, actif false)', !!l3 && l3.echecs === 3 && l3.actif === false && r3.desactives === 1, JSON.stringify({ l3, r3 }))
  const avant = recus.length
  await envoyerPushArtisan(UID, charge)
  T('un abonnement désactivé ne reçoit plus rien', recus.filter((x) => x.chemin.startsWith('/ko/')).length === 3 && recus.length === avant + 1)
  // une panne du service (5xx) ne compte pas contre l'appareil
  const ap4 = appareil(); await inserer(url('/panne/4'), ap4)
  for (let i = 0; i < 3; i++) await envoyerPushArtisan(UID, charge)
  const l4 = (await abos()).find((x) => x.endpoint.includes('/panne/'))
  T('service répond 500 trois fois (panne passagère) → l’appareil reste actif, échecs à 0', !!l4 && l4.actif === true && l4.echecs === 0, JSON.stringify(l4))
  await rest(`push_abonnements?endpoint=eq.${encodeURIComponent(url('/panne/4'))}`, { method: 'DELETE' })

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
  const LEAD1 = crypto.randomUUID()
  const n1 = await notifierArtisan(UID, 'nouvelle_demande', EMAIL, { subject: 'Nouveau message — Jean Dupont', text: 'contenu privé', leadId: LEAD1 })
  await new Promise((r) => setTimeout(r, 1500))
  const q2 = recus.slice(nAvant).find((x) => x.chemin === '/ok/1')
  let c2 = null; try { c2 = q2 ? JSON.parse(await dechiffrer(q2.corps, ap1)) : null } catch {}
  T('nouvelle_demande → push « Nouvelle demande » vers /messages?lead=<uuid>, tag par conversation, sans le sujet ni le nom', n1.push === true && !!c2 && c2.titre === 'Nouvelle demande' && c2.url === `/messages?lead=${LEAD1}` && c2.tag === `conv-${LEAD1}` && !/Dupont|contenu privé/.test(JSON.stringify(c2)), JSON.stringify({ n1, c2 }).slice(0, 220))
  // un identifiant qui n'est pas un UUID (chaîne libre) n'entre ni dans l'adresse ni dans le tag
  const { chargePush } = await import('../lib/notifications.ts')
  const cLibre = chargePush('nouvelle_demande', 'jean.dupont@exemple.fr')
  T('chargePush : un identifiant qui n’est pas un UUID est ignoré (adresse /messages, tag neutre)', cLibre.url === '/messages' && cLibre.tag === 'conv' && !/dupont/.test(JSON.stringify(cLibre)))
  await rest(`artisans?id=eq.${UID}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: { push: { nouvelle_demande: false } } }) })
  const nAvant2 = recus.length
  const n2 = await notifierArtisan(UID, 'nouvelle_demande', EMAIL, { subject: 's', text: 't', leadId: crypto.randomUUID() })
  await new Promise((r) => setTimeout(r, 1200))
  T('push coupée pour ce type → aucune push (l’email suit sa propre règle)', n2.push === false && recus.length === nAvant2, JSON.stringify(n2))
  await rest(`artisans?id=eq.${UID}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: { devis_accepte: false } }) })
  const nAvant3 = recus.length
  const n3 = await notifierArtisan(UID, 'devis_accepte', EMAIL, { subject: 's', text: 't', leadId: crypto.randomUUID() })
  await new Promise((r) => setTimeout(r, 1200))
  T('email coupé mais push gardée → email non envoyé, push partie', n3.envoye === false && n3.raison === 'desactive' && n3.push === true && recus.length === nAvant3 + 1, JSON.stringify(n3))
  await rest(`artisans?id=eq.${UID}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: {} }) })

  if (LOCAL) {
    // Le chemin RÉEL de production (invariant 3) : une demande arrive par /api/leads → la réponse HTTP part →
    // la push suit (after), sans le message du client. Local seulement : le serveur doit atteindre le faux service.
    await rest(`artisans?id=eq.${UID}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: {} }) })
    const nAvant4 = recus.length, t0 = Date.now()
    const rl = await fetch(`${APP}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: `push-e2e-${st}`, contact: `client.${st}@presti-test.invalid`, nom: 'Client Test', message: 'Bonjour, je voudrais un devis pour une salle de bain.' }) })
    const tReponse = Date.now() - t0
    let attente = 0
    while (recus.length === nAvant4 && attente < 15000) { await new Promise((r) => setTimeout(r, 250)); attente += 250 }
    const q4 = recus.slice(nAvant4).find((x) => x.chemin === '/ok/1')
    let c4 = null; try { c4 = q4 ? JSON.parse(await dechiffrer(q4.corps, ap1)) : null } catch {}
    T(`chemin réel : POST /api/leads (${rl.status} en ${tReponse} ms) → la push « Nouvelle demande » suit la réponse (${attente} ms), sans le message ni le nom du client`, rl.status < 300 && !!c4 && c4.titre === 'Nouvelle demande' && /^\/messages\?lead=[0-9a-f-]{36}$/.test(c4.url) && !/salle de bain|Client Test/.test(JSON.stringify(c4)), JSON.stringify({ status: rl.status, c4 }).slice(0, 220))
  } else console.log('  ℹ️  chemin réel /api/leads → push : joué en local seulement (le serveur doit atteindre le faux service)')

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
  // isolation entre comptes (invariant 2) : un second artisan ne voit, ne retire ni ne reprend rien de A
  const EMAIL2 = `push2.${st}@presti-test.invalid`
  const u2 = await (await admin('users', { method: 'POST', body: JSON.stringify({ email: EMAIL2, password: MDP, email_confirm: true }) })).json()
  autres.push(u2.id)
  await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u2.id, email: EMAIL2, nom: 'Push E2E bis', metier: 'Plombier', ton_style: 'pro', slug: `push-e2e-bis-${st}`, aide_vues: ['visite:console'] }) })
  const sess2 = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL2, password: MDP }) })).json()
  await verifierSessionTest(sess2.access_token)
  const api2 = async (chemin, o = {}) => { const r = await fetch(`${APP}${chemin}`, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess2.access_token}`, ...(o.headers || {}) } }); return { status: r.status, data: await r.json().catch(() => ({})) } }
  const g2 = await api2('/api/push/abonner')
  T('compte B : GET ne liste que ses appareils (aucun de A)', g2.status === 200 && (g2.data.appareils || []).length === 0, JSON.stringify(g2.data).slice(0, 100))
  const idA = (g1.data.appareils || []).find((x) => x.endpoint === mort)?.id
  const dB = await api2('/api/push/abonner', { method: 'DELETE', body: JSON.stringify({ id: idA }) })
  T('compte B : DELETE de l’appareil de A → sans effet sur A', dB.status === 200 && (await abos()).some((x) => x.endpoint === mort))
  const apB = appareil()
  const pB = await api2('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: mort, keys: { p256dh: apB.p256dh, auth: apB.auth } }) })
  T('compte B : reprendre l’endpoint de A avec d’autres clés → 409, A garde son appareil', pB.status === 409 && (await abos()).some((x) => x.endpoint === mort), `HTTP ${pB.status}`)
  const pB2 = await api2('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: mort, keys: { p256dh: apR.p256dh, auth: apR.auth } }) })
  T('même endpoint, mêmes clés, autre compte → 409 « reabonner » : jamais de transfert silencieux, A garde son appareil, B se réabonne', pB2.status === 409 && pB2.data.code === 'reabonner' && (await abos()).some((x) => x.endpoint === mort), `HTTP ${pB2.status} ${JSON.stringify(pB2.data)}`)
  const pH = await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: `https://push.evil.example/${st}`, keys: { p256dh: apR.p256dh, auth: apR.auth } }) })
  T('service de push inconnu (hôte quelconque) → 400 : Presti ne relaie pas de requête signée vers n’importe où', pH.status === 400, `HTTP ${pH.status}`)
  const pL = await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: `https://fcm.googleapis.com/fcm/send/e2e-long-${st}`, keys: { p256dh: apR.p256dh + 'A'.repeat(200), auth: apR.auth } }) })
  T('clé p256dh hors format (trop longue) → 400', pL.status === 400, `HTTP ${pL.status}`)
  for (let i = 0; i < 10; i++) await rest('push_abonnements', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ artisan_id: u2.id, type: 'web', endpoint: `https://fcm.googleapis.com/fcm/send/cap-${st}-${i}`, p256dh: apB.p256dh, auth: apB.auth, appareil: 'cap' }) })
  const p11 = await api2('/api/push/abonner', { method: 'POST', body: JSON.stringify({ endpoint: `https://fcm.googleapis.com/fcm/send/cap-${st}-11`, keys: { p256dh: apB.p256dh, auth: apB.auth } }) })
  T('onzième appareil → 409 : dix appareils actifs au plus par compte', p11.status === 409, `HTTP ${p11.status}`)
  const t1 = await api('/api/push/test', { method: 'POST' })
  const apres = (await abos()).map((x) => x.endpoint)
  T('POST test : le vrai service de push répond 404/410 pour l’abonnement mort → il est purgé (supprimé 1)', t1.status === 200 && t1.data.supprimes >= 1 && !apres.includes(mort), JSON.stringify(t1.data))
  const rDel = await api('/api/push/abonner', { method: 'DELETE', body: JSON.stringify({ endpoint: url('/ok/1') }) })
  T('DELETE : retrait d’un appareil par endpoint (200)', rDel.status === 200 && rDel.data.ok === true && !(await abos()).some((x) => x.endpoint === url('/ok/1')))
  // appareil NATIF (coque Capacitor, J3) : un jeton FCM/APNs — accepté, listé, ignoré sans Firebase, retirable ; hors format → 400
  const jetonNatif = `e2e-${st}:${crypto.randomBytes(60).toString('base64url')}`
  const pN = await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ type: 'android', jeton: jetonNatif }) })
  const ligneN = ((await api('/api/push/abonner')).data.appareils || []).find((x) => x.jeton === jetonNatif)
  T('POST abonner natif (type android + jeton) → 200, listé comme appareil Android de l’application', pN.status === 200 && !!ligneN && ligneN.type === 'android' && /Android · application Presti/.test(ligneN.appareil || ''), JSON.stringify({ status: pN.status, ligneN }).slice(0, 160))
  const pN2 = await api('/api/push/abonner', { method: 'POST', body: JSON.stringify({ type: 'ios', jeton: 'court' }) })
  T('POST abonner natif : jeton hors format → 400', pN2.status === 400, `HTTP ${pN2.status}`)
  const tN = await api('/api/push/test', { method: 'POST' })
  // Deux mondes : sans compte Firebase (avant M3) le natif est ignoré proprement ; avec (M3 fait le 07/09), FCM refuse le
  // jeton bidon (400 INVALID_ARGUMENT) et l’appareil est retiré — comme un 410 web. Les deux sont des comportements voulus.
  const avecFirebase = tN.status === 200 && tN.data.natifsIgnores === undefined
  const apresN = ((await api('/api/push/abonner')).data.appareils || []).some((x) => x.jeton === jetonNatif)
  T(avecFirebase
    ? 'test avec un appareil natif ET Firebase : FCM refuse le jeton bidon → appareil retiré (supprimes ≥ 1), aucune erreur'
    : 'test avec un seul appareil natif et sans compte Firebase → ignoré proprement (natifsIgnores 1, aucune erreur)',
    tN.status === 200 && tN.data.envoyes === 0 && (avecFirebase ? tN.data.supprimes >= 1 && !apresN : tN.data.natifsIgnores === 1), JSON.stringify(tN.data))
  const dN = await api('/api/push/abonner', { method: 'DELETE', body: JSON.stringify({ jeton: jetonNatif }) })
  T('DELETE par jeton natif → retiré', dN.status === 200 && !((await api('/api/push/abonner')).data.appareils || []).some((x) => x.jeton === jetonNatif))
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
    await ctx.grantPermissions(['notifications'], { origin: new URL(APP).origin }).catch(() => {})
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
    const permission = await page.evaluate(() => ('Notification' in window ? Notification.permission : 'absente'))
    console.log(`  ℹ️  Notification.permission dans ce Chrome sans tête : ${permission}`)
    const bouton = await page.$('[data-notif-push] [data-activer]')
    if (permission === 'denied') {
      // Chrome sans tête refuse parfois la permission malgré l'octroi : l'écran doit alors le dire, sans bouton qui ne mènerait nulle part.
      T('carte « Sur votre téléphone » : permission refusée par le navigateur → message clair, aucun bouton', !!carte && !bouton && !!(await page.$('[data-notif-push] [data-etat="refuse"]')))
    } else {
      T('carte « Sur votre téléphone » avec le bouton « Activer sur cet appareil » (Chrome)', !!carte && !!bouton)
    }
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
