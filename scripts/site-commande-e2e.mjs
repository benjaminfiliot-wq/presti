// scripts/site-commande-e2e.mjs — le site à la demande, bout en bout (prompt v15 §4, étape 1).
//
// Ce qu'on prouve, dans l'ordre d'importance :
//   1. Un paiement Stripe (mode 'payment', 300 € nets) passe le dossier de brouillon à payee — et le rejeu du
//      même événement ne change rien (Stripe relivre, il ne doit pas encaisser deux fois).
//   2. Rien ne se paie sans dossier complet : la route refuse (400) tant qu'il manque une pièce, et dit laquelle.
//   3. Le dossier n'appartient qu'à son artisan, et ce qui vient des écrans est nettoyé (HTML, doublons, SIREN, URL).
//   4. Drapeau baissé = 404 : si la cible répond 404, on s'arrête en le disant, on ne conclut pas à un bug.
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/site-commande-e2e.mjs                 (cible TEST_BASE, défaut https://prestiapp.fr)
//         TEST_BASE=http://localhost:3000 node --import ./scripts/ts-loader.mjs scripts/site-commande-e2e.mjs
//         --anomalies : livre aussi un paiement sans dossier (→ 500 attendu, et un mail à l'entreprise : à ne pas lancer en boucle)
// Env (.env.local) : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//                    STRIPE_WEBHOOK_SECRET (celui que lit la cible : les webhooks simulés sont signés avec).
// Les comptes créés sont @presti-test.invalid et supprimés à la fin, quoi qu'il arrive. La page de paiement ouverte
// par la cible n'est jamais payée : une session Stripe non payée expire seule, rien n'est débité.
import fs from 'node:fs'
import crypto from 'node:crypto'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PRIX_SITE_CENTS, PHOTOS_MIN, sirenValide } from '../lib/siteCommande.ts'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const f of ['.env.local', '.stripe-webhook.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
const ARGS = new Set(process.argv.slice(2))
const BASE = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: URL_SB, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE, STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET })) {
  if (!v) { console.error(`variable manquante : ${k}`); process.exit(2) }
}
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
// Ne sert qu'à SIGNER les événements simulés : aucune requête Stripe n'est faite avec cette clé.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST || 'sk_test_signature_seulement')

let ok = 0, ko = 0
const j = (v, n = 160) => String(JSON.stringify(v)).slice(0, n)
const T = (nom, cond, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${nom}`) } else { ko++; console.log(`  ❌ ${nom}${detail ? ' — ' + detail : ''}`) } }
const comptes = []

async function compte(nomCourt) {
  const st = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  const email = `${nomCourt}-${st}@presti-test.invalid`
  const mdp = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  comptes.push(u.user.id)
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: mdp })
  await verifierSessionTest(s?.session?.access_token)
  const jeton = s?.session?.access_token
  if (!jeton) throw new Error('connexion impossible pour ' + email)
  // La ligne artisans naît côté client à l'inscription (RLS : chacun insère la sienne) — on fait pareil.
  const nav = createClient(URL_SB, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } })
  const { error: eArt } = await nav.from('artisans').insert({ id: u.user.id, email, nom: `Test ${nomCourt}`, metier: 'Plombier', slug: `${nomCourt}-${st}` })
  if (eArt) throw new Error('ligne artisans : ' + eArt.message)
  return { uid: u.user.id, email, jeton }
}
const api = (jeton, chemin, init = {}) => fetch(`${BASE}${chemin}`, { ...init, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(init.headers || {}) } })
const json = async (r) => ({ status: r.status, corps: await r.json().catch(() => ({})) })
const commandeEnBase = async (id) => (await admin.from('sites_commandes').select('id, artisan_id, etat, stripe_session_id, stripe_payment_intent_id, paye_le, prix_cents').eq('id', id).maybeSingle()).data

/** Un SIREN de test dont la clé de Luhn est juste — jamais celui d'une vraie entreprise. */
function sirenTest() { for (let c = 0; c < 10; c++) { const s = `12345678${c}`; if (sirenValide(s)) return s } throw new Error('pas de SIREN de test') }
function evenement(type, objet) {
  return {
    id: `evt_sim_${crypto.randomBytes(12).toString('hex')}`, object: 'event', api_version: '2025-08-27.basil',
    created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null }, type, data: { object: objet },
  }
}
const session = (id, uid, commandeId, email) => ({
  id, object: 'checkout.session', mode: 'payment', status: 'complete', payment_status: 'paid', livemode: false,
  amount_total: PRIX_SITE_CENTS, currency: 'eur', customer: null, customer_details: { email },
  client_reference_id: uid, metadata: { uid, type: 'commande_site', commande_id: commandeId },
  payment_intent: `pi_sim_${crypto.randomBytes(8).toString('hex')}`,
})
async function signer(payload) {
  try { return stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) }
  catch { return await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: WEBHOOK_SECRET }) }
}
async function livrer(ev) {
  const payload = JSON.stringify(ev)
  const r = await fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': await signer(payload) }, body: payload })
  return { status: r.status, corps: await r.json().catch(() => ({})) }
}

console.log(`Site à la demande — bout en bout sur ${BASE}`)
try {
  const A = await compte('site-a')
  const B = await compte('site-b')

  console.log('\n── 0. Le drapeau et le service')
  let r = await json(await api(A.jeton, '/api/site/commander/brouillon'))
  if (r.status === 404) { T('drapeau siteCommande levé sur la cible', false, 'GET → 404 : coller 0088, lever siteCommande dans lib/flags.ts, redéployer'); throw new Error('drapeau baissé sur la cible') }
  T('GET /api/site/commander/brouillon → 200', r.status === 200, `HTTP ${r.status} ${r.corps?.error ?? ''}`)
  T('dossier vide : ce qui manque est dit', Array.isArray(r.corps?.erreurs) && r.corps.erreurs.length >= 5, j(r.corps?.erreurs, 120))
  T('sans jeton → 401', (await api('', '/api/site/commander/brouillon')).status === 401)

  console.log('\n── 1. Rien ne se paie sans dossier complet')
  r = await json(await api(A.jeton, '/api/site/commander', { method: 'POST' }))
  T('POST /api/site/commander sans dossier → 400', r.status === 400, `HTTP ${r.status} ${r.corps?.error ?? ''}`)
  r = await json(await api(A.jeton, '/api/site/commander/brouillon', { method: 'PUT', body: JSON.stringify({ domaine_mode: 'existant', domaine: 'martin-plomberie.fr', metier: 'Plombier', communes: ['Lyon'] }) }))
  T('PUT dossier partiel → 200 (on sauvegarde, on ne rejette pas)', r.status === 200, `HTTP ${r.status} ${r.corps?.error ?? ''}`)
  T('… et il dit ce qui manque (photos, adresse, SIREN, horaires, décennale)', r.corps?.erreurs?.length >= 4, j(r.corps?.erreurs, 160))
  r = await json(await api(A.jeton, '/api/site/commander', { method: 'POST' }))
  T('POST paiement sur dossier incomplet → 400 avec la liste', r.status === 400 && Array.isArray(r.corps?.erreurs) && r.corps.erreurs.length >= 4, `HTTP ${r.status}`)

  console.log('\n── 2. Le dossier complet, nettoyé')
  const siren = sirenTest()
  const complet = {
    domaine_mode: 'existant', domaine: 'https://Martin-Plomberie.fr/', metier: '<b>Plombier</b>',
    metiers_secondaires: ['Chauffagiste', 'chauffagiste', 'Dépannage'],
    communes: ['Lyon', 'lyon', 'Villeurbanne', 'Vénissieux<br>'],
    matiere: {
      photos: Array.from({ length: PHOTOS_MIN }, (_, i) => ({ url: `https://exemple.invalid/photo-${i}.webp`, legende: `Chantier ${i + 1}`, role: 'chantier' })).concat([{ url: 'javascript:alert(1)' }]),
      logo_url: 'https://exemple.invalid/logo.png', adresse: '12 rue des Artisans, 69003 Lyon', siren: siren.replace(/^(\d{3})(\d{3})/, '$1 $2 '),
      horaires: 'Lun-Ven 8 h-18 h', decennale: { assureur: 'Assureur Test', numero: 'DEC-123456' }, avis_google: { url: 'https://g.page/r/exemple' },
    },
  }
  r = await json(await api(A.jeton, '/api/site/commander/brouillon', { method: 'PUT', body: JSON.stringify(complet) }))
  const b = r.corps?.brouillon
  T('PUT dossier complet → 200, aucune erreur restante', r.status === 200 && r.corps?.erreurs?.length === 0, `HTTP ${r.status} ${j(r.corps?.erreurs ?? r.corps?.error, 160)}`)
  T('le HTML est retiré du métier', b?.metier === 'Plombier', String(b?.metier))
  T('communes dédoublonnées et nettoyées', Array.isArray(b?.communes) && b.communes.length === 3 && b.communes.includes('Vénissieux'), j(b?.communes))
  T('métiers secondaires dédoublonnés', b?.metiers_secondaires?.length === 2, JSON.stringify(b?.metiers_secondaires))
  T('domaine normalisé', b?.domaine === 'martin-plomberie.fr', String(b?.domaine))
  T('la photo javascript: est écartée, les autres gardées', b?.matiere?.photos?.length === PHOTOS_MIN, String(b?.matiere?.photos?.length))
  T('SIREN gardé sans espaces, clé valide', b?.matiere?.siren === siren && sirenValide(b.matiere.siren), String(b?.matiere?.siren))
  r = await json(await api(A.jeton, '/api/site/commander/brouillon', { method: 'PUT', body: JSON.stringify({ ...complet, matiere: { ...complet.matiere, siren: '123456789' } }) }))
  T('un SIREN à clé fausse bloque le paiement', r.corps?.erreurs?.some((e) => /SIREN/.test(e)), JSON.stringify(r.corps?.erreurs))
  await api(A.jeton, '/api/site/commander/brouillon', { method: 'PUT', body: JSON.stringify(complet) })

  console.log('\n── 3. Le dossier n’appartient qu’à son artisan')
  r = await json(await api(B.jeton, '/api/site/commander/brouillon'))
  T('B ne voit pas le dossier de A', r.status === 200 && !r.corps?.brouillon?.id && r.corps?.commandes?.length === 0, j(r.corps, 120))

  console.log('\n── 4. La page de paiement')
  r = await json(await api(A.jeton, '/api/site/commander', { method: 'POST', headers: { origin: BASE } }))
  T('POST /api/site/commander → page Stripe', r.status === 200 && /^https:\/\/checkout\.stripe\.com\//.test(r.corps?.url ?? ''), `HTTP ${r.status} ${r.corps?.error ?? ''} ${JSON.stringify(r.corps?.erreurs ?? '')}`)
  const commandeId = r.corps?.commande
  let c = commandeId ? await commandeEnBase(commandeId) : null
  T('la session est rattachée au dossier, encore en brouillon', !!c && c.etat === 'brouillon' && /^cs_/.test(c.stripe_session_id ?? ''), JSON.stringify({ etat: c?.etat, session: c?.stripe_session_id?.slice(0, 8) }))
  T('le prix en base est 300 € nets', c?.prix_cents === PRIX_SITE_CENTS, String(c?.prix_cents))
  const sessionId = c?.stripe_session_id ?? `cs_sim_${crypto.randomBytes(8).toString('hex')}`
  // Ménage côté Stripe quand la cible tourne sur la clé de test : la session est expirée (rien n'est débité de toute façon).
  if (process.env.STRIPE_SECRET_KEY_TEST && /^cs_test_/.test(sessionId)) await stripe.checkout.sessions.expire(sessionId).catch(() => {})

  console.log('\n── 5. Le webhook encaisse — une fois')
  const ev = evenement('checkout.session.completed', session(sessionId, A.uid, commandeId, A.email))
  let w = await livrer(ev)
  T('checkout.session.completed (payment) → 200 received', w.status === 200 && w.corps?.received === true, `HTTP ${w.status} ${JSON.stringify(w.corps)}`)
  c = await commandeEnBase(commandeId)
  T('état = payee', c?.etat === 'payee', String(c?.etat))
  T('paye_le et payment_intent posés', !!c?.paye_le && /^pi_/.test(c?.stripe_payment_intent_id ?? ''), JSON.stringify({ paye_le: c?.paye_le, pi: c?.stripe_payment_intent_id }))
  const payeLe = c?.paye_le
  w = await livrer(ev)
  T('rejeu du même événement → 200 (Stripe ne doit pas boucler)', w.status === 200, `HTTP ${w.status}`)
  c = await commandeEnBase(commandeId)
  T('rejeu → rien ne change (idempotence)', c?.etat === 'payee' && c?.paye_le === payeLe, JSON.stringify({ etat: c?.etat, paye_le: c?.paye_le, avant: payeLe }))
  const { data: lignes } = await admin.from('sites_commandes').select('id').eq('artisan_id', A.uid)
  T('une seule commande pour A', lignes?.length === 1, String(lignes?.length))
  r = await json(await api(A.jeton, '/api/site/commander/brouillon'))
  T('après paiement : plus de brouillon, la commande apparaît payee', r.status === 200 && !r.corps?.brouillon?.id && r.corps?.commandes?.[0]?.etat === 'payee', JSON.stringify(r.corps?.commandes?.map((x) => x.etat)))
  r = await json(await api(A.jeton, '/api/site/commander', { method: 'POST', headers: { origin: BASE } }))
  T('repayer sans nouveau dossier → 400', r.status === 400, `HTTP ${r.status}`)

  if (ARGS.has('--anomalies')) {
    console.log('\n── 6. Un paiement sans dossier remonte en erreur (Stripe rejouera, un humain est prévenu)')
    w = await livrer(evenement('checkout.session.completed', session(`cs_sim_${crypto.randomBytes(8).toString('hex')}`, A.uid, crypto.randomUUID(), A.email)))
    T('commande introuvable → 500', w.status === 500, `HTTP ${w.status}`)
  }
} catch (e) {
  ko++
  console.log(`  ❌ interrompu : ${e.message}`)
} finally {
  for (const uid of comptes) {
    await admin.from('sites_commandes').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid).catch(() => {})
  }
  console.log(`\n🧹 ${comptes.length} compte(s) de test supprimé(s)`)
}
console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués`)
process.exit(ko === 0 ? 0 : 1)
