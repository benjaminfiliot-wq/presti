// Abonnement de bout en bout (audit final H — Stripe, plans, crédits) : les 11 transitions du
// cycle de vie d'un abonnement, rejouées SANS aucun débit et SANS appel IA.
//
// Ce que la suite fait, dans l'ordre :
//   1. inscription → profil forcé « gratuit, 3 crédits » par le verrou SQL, même si le navigateur
//      demande autre chose ;
//   2. session de paiement Stripe (mode TEST) pour les trois offres, montant = matrice, TVA = 0,
//      puis expiration immédiate ;
//   3. webhooks SIMULÉS (signés avec le secret du point de terminaison, comme Stripe le ferait) :
//      paiement réussi → plan + crédits + capacités ; rejeu du même événement → idempotence ;
//      signature forgée → 400 ; résiliation → retour à l'essai sans perte ; renouvellement ;
//      échec de prélèvement ; changement d'offre ;
//   4. portail de facturation ; fondateurs ; décompte atomique ; prospect d'un artisan à 0 crédit ;
//   5. aucun prix ni volume de crédits écrit en dur hors lib/plans.ts.
//
// Deux familles d'assertions :
//   ✅/❌  ce qui DOIT tenir aujourd'hui (une ❌ fait échouer la suite) ;
//   ⚠️     « écart connu » : ce que la spécification exige mais que le code ne fait pas encore
//          (plans/audit-final/abonnement.md). Compté à part, n'échoue pas — devient ✅ quand c'est corrigé.
//
// PRÉREQUIS (dans .env.local, jamais affichés) :
//   STRIPE_SECRET_KEY_TEST   clé de TEST (sk_test_… ou rk_test_…). Une clé réelle (sk_live / rk_live) est REFUSÉE sauf --reel.
//   STRIPE_WEBHOOK_SECRET    secret de signature du point de terminaison visé (Vercel → STRIPE_WEBHOOK_SECRET,
//                            ou .stripe-webhook.local). Sans lui, les webhooks simulés sont sautés.
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
//   TEST_BASE                (optionnel) URL de l'application visée — défaut https://prestiapp.fr.
//
// ⚠️ Les webhooks simulés sont livrés à TEST_BASE/api/stripe/webhook signés avec STRIPE_WEBHOOK_SECRET :
//    le serveur les accepte comme s'ils venaient de Stripe (il ne regarde pas `livemode`). Ils ne
//    touchent que les comptes @presti-test.invalid créés ici, purgés à la fin. Si la production tourne
//    avec la clé RÉELLE, /api/subscribe et /api/stripe/portail y créent des objets LIVE : ces deux
//    appels serveur ne sont donc faits qu'avec --via-serveur (préversion Vercel configurée en test).
//
// Usage :
//   node --import ./scripts/ts-loader.mjs scripts/abonnement-e2e.mjs
//   node --import ./scripts/ts-loader.mjs scripts/abonnement-e2e.mjs --via-serveur   (TEST_BASE en clé de test)
//   node --import ./scripts/ts-loader.mjs scripts/abonnement-e2e.mjs --reel          (jamais sans Benj)
// Contrôle de syntaxe : node --check scripts/abonnement-e2e.mjs
// Purge de secours : node scripts/purger-comptes-test.mjs · IP bannie (403) : node scripts/purger-abus.mjs

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PLANS, OFFRES, CREDIT_COST, COUT_RECHERCHE, peut } from '../lib/plans.ts'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const f of ['.env.local', '.stripe-webhook.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const ARGS = new Set(process.argv.slice(2))
const REEL = ARGS.has('--reel')
const VIA_SERVEUR = ARGS.has('--via-serveur')
const BASE = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLE = process.env.STRIPE_SECRET_KEY_TEST
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// ── Garde-fous : on refuse de tourner sans les prérequis, et jamais en réel par accident.
const manques = []
if (!CLE) manques.push('STRIPE_SECRET_KEY_TEST absente de .env.local (action humaine H4 : clé de TEST sk_test_…)')
else if (CLE.startsWith('sk_live') && !REEL) manques.push('STRIPE_SECRET_KEY_TEST est une clé RÉELLE (sk_live) — refusée sans --reel')
else if (CLE.startsWith('rk_live') && !REEL) manques.push('STRIPE_SECRET_KEY_TEST est une clé RÉELLE restreinte (rk_live) — « limitée » ne veut pas dire « de test » : refusée')
else if (!/^(sk|rk)_test_/.test(CLE) && !REEL) manques.push('STRIPE_SECRET_KEY_TEST ne ressemble pas à une clé de test (sk_test_… ou rk_test_…)')
if (!URL_SB || !ANON || !SERVICE) manques.push('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY')
if (manques.length) {
  console.log('\n⛔ Prérequis manquants — la suite ne fait rien :')
  manques.forEach((m) => console.log(`   · ${m}`))
  console.log('\nRien n’a été créé, ni chez Stripe, ni en base.\n')
  process.exit(2)
}
if (REEL) console.log('\n⚠️  MODE RÉEL demandé : les sessions créées sont de vraies pages de paiement (expirées aussitôt, aucun débit).')

const stripe = new Stripe(CLE)
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })

let ok = 0, ko = 0, ecarts = 0, resorbes = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const E = (n, c, d = '') => { if (c) { resorbes++; console.log(`  ✅ ${n} (écart résorbé)`) } else { ecarts++; console.log(`  ⚠️  ${n} — écart connu${d ? ` : ${d}` : ''}`) } }
const SAUT = (n, why) => console.log(`  ⏭  ${n} — ${why}`)

const comptes = []      // uid des comptes de test à purger
const sessions = []     // sessions Stripe à expirer
const clientsStripe = [] // clients Stripe de test à supprimer

// ── Outils ───────────────────────────────────────────────────────────────────
async function compte(nomCourt) {
  const st = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  const email = `abo-${nomCourt}-${st}@presti-test.invalid`
  const mdp = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  comptes.push(u.user.id)
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: mdp })
  await verifierSessionTest(s?.session?.access_token)
  const jeton = s?.session?.access_token
  if (!jeton) throw new Error('connexion impossible pour ' + email)
  const nav = createClient(URL_SB, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jeton}` } } })
  return { uid: u.user.id, email, jeton, nav, slug: `abo-${nomCourt}-${st}` }
}
const lire = async (uid) => (await admin.from('artisans').select('plan, credits, credits_reset_le, is_founder, stripe_customer_id, stripe_subscription_id').eq('id', uid).single()).data
const plusUnMois = () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10) }
const dansUnMois = (iso) => { if (!iso) return false; const j = Math.abs((new Date(iso) - new Date(plusUnMois())) / 86_400_000); return j <= 2 }

/** Un événement tel que Stripe le livre : seule la signature compte pour le serveur. */
function evenement(type, objet, id) {
  return {
    id: id || `evt_sim_${crypto.randomBytes(12).toString('hex')}`, object: 'event', api_version: '2025-08-27.basil',
    created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 1,
    request: { id: null, idempotency_key: null }, type, data: { object: objet },
  }
}
async function signer(payload, secret = WEBHOOK_SECRET) {
  try { return stripe.webhooks.generateTestHeaderString({ payload, secret }) }
  catch { return await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret }) }
}
async function livrer(ev, opts = {}) {
  const payload = JSON.stringify(ev)
  // `entete: null` veut dire « aucun en-tête » : avec `??`, null retombait sur une signature VALIDE et le
  // test « sans en-tête » passait un vrai paiement (constaté au premier passage réel, 05/09).
  const entete = opts.entete === undefined ? await signer(opts.payloadSigne ?? payload, opts.secret) : opts.entete
  const r = await fetch(`${BASE}/api/stripe/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(entete ? { 'stripe-signature': entete } : {}) }, body: payload,
  })
  return { status: r.status, corps: await r.json().catch(() => ({})) }
}
const sessionPayee = (uid, plan, sub, cus) => ({
  id: `cs_sim_${crypto.randomBytes(8).toString('hex')}`, object: 'checkout.session', mode: 'subscription', status: 'complete',
  payment_status: 'paid', currency: 'eur', amount_total: PLANS[plan].prixMois * 100, amount_subtotal: PLANS[plan].prixMois * 100,
  total_details: { amount_tax: 0, amount_discount: 0, amount_shipping: 0 },
  customer: cus, subscription: sub, client_reference_id: uid,
  metadata: { uid, plan, credits: String(PLANS[plan].creditsMois) },
})
const abonnement = (uid, plan, sub, cus, status = 'canceled') => ({
  id: sub, object: 'subscription', status, customer: cus, cancel_at_period_end: false, metadata: { uid, plan },
  items: { object: 'list', data: [{ id: `si_${sub}`, object: 'subscription_item', price: { id: `price_${plan}`, unit_amount: PLANS[plan].prixMois * 100, currency: 'eur', recurring: { interval: 'month' } } }] },
})
const facture = (uid, plan, sub, cus, paid) => ({
  id: `in_sim_${crypto.randomBytes(8).toString('hex')}`, object: 'invoice', status: paid ? 'paid' : 'open', paid, customer: cus, subscription: sub,
  billing_reason: 'subscription_cycle', amount_due: PLANS[plan].prixMois * 100, amount_paid: paid ? PLANS[plan].prixMois * 100 : 0, currency: 'eur',
  attempt_count: paid ? 1 : 2, next_payment_attempt: paid ? null : Math.floor(Date.now() / 1000) + 3 * 86_400,
  subscription_details: { metadata: { uid, plan } }, metadata: {},
})

// ── Marche des fichiers (transition 11) ─────────────────────────────────────
function* fichiers(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!['node_modules', '.next', '.git'].includes(e.name)) yield* fichiers(p) }
    else if (/\.(ts|tsx)$/.test(e.name)) yield p
  }
}

try {
  console.log(`\nCible : ${BASE} · Stripe : ${CLE.startsWith('sk_live') ? 'RÉEL' : 'test'} · webhooks simulés : ${WEBHOOK_SECRET ? 'oui' : 'non (STRIPE_WEBHOOK_SECRET absent)'}`)

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 0. La matrice, telle que vendue')
  T('trois offres payantes dans l’ordre des prix', OFFRES.map((o) => o.id).join(',') === 'essentiel,studio,signature' && OFFRES[0].prix < OFFRES[1].prix && OFFRES[1].prix < OFFRES[2].prix)
  T('les crédits montent avec le prix', OFFRES[0].credits < OFFRES[1].credits && OFFRES[1].credits < OFFRES[2].credits)
  T('l’essai a les capacités de l’Essentiel, en Standard seul, site niveau 1',
    PLANS.gratuit.capacites.join() === PLANS.essentiel.capacites.join() && PLANS.gratuit.tiers.join() === 'standard' && PLANS.gratuit.siteMax === 1)
  T('coût d’une génération : Standard 1, Pro 1, Expert 3', CREDIT_COST.standard === 1 && CREDIT_COST.pro === 1 && CREDIT_COST.expert === 3)
  T('coût d’une recherche fournisseurs à froid : 2 (3 en Expert)', COUT_RECHERCHE.standard === 2 && COUT_RECHERCHE.pro === 2 && COUT_RECHERCHE.expert === 3)

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 1. Inscription → essai, 3 crédits, rien d’autre (même si le navigateur insiste)')
  const A = await compte('inscription')
  // Le profil se crée depuis le navigateur (onboarding) : on rejoue ça en demandant des privilèges.
  const { error: eIns } = await A.nav.from('artisans').insert({ id: A.uid, email: A.email, nom: 'Abo Inscription', metier: 'Plombier', slug: A.slug, plan: 'signature', credits: 999, is_founder: true })
  T('le navigateur peut créer son profil', !eIns, eIns?.message)
  const a1 = await lire(A.uid)
  T('plan forcé à « gratuit »', a1?.plan === 'gratuit', a1?.plan)
  T('crédits forcés à 3', a1?.credits === PLANS.gratuit.creditsMois && PLANS.gratuit.creditsMois === 3, String(a1?.credits))
  T('is_founder forcé à false', a1?.is_founder === false)
  T('aucun identifiant Stripe', !a1?.stripe_customer_id && !a1?.stripe_subscription_id)
  T('l’essai n’ouvre pas l’inventaire (🔒 Studio)', !peut('gratuit', 'inventaire.stock') && !peut('gratuit', 'plateforme.ia.auto'))
  T('mais ouvre la plateforme et les devis IA', peut('gratuit', 'plateforme.conversation') && peut('gratuit', 'devis.ia'))
  // Le verrou serveur, pas seulement l'affichage :
  const rInv = await fetch(`${BASE}/api/inventaire`, { headers: { Authorization: `Bearer ${A.jeton}` } })
  T('GET /api/inventaire → 403 pour l’essai', rInv.status === 403, `HTTP ${rInv.status}${rInv.status === 403 ? '' : ' (IP bannie ? node scripts/purger-abus.mjs)'}`)
  const { error: eUp } = await A.nav.from('artisans').update({ credits: 999999, plan: 'business' }).eq('id', A.uid)
  const a1b = await lire(A.uid)
  T('l’artisan ne peut pas se recharger depuis le navigateur (verrou 0055)', !eUp && a1b?.credits === 3 && a1b?.plan === 'gratuit', JSON.stringify(a1b))

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 2. Sessions de paiement : bon prix, aucune TVA, expirées aussitôt')
  for (const o of OFFRES) {
    let s
    if (VIA_SERVEUR) {
      const r = await fetch(`${BASE}/api/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${A.jeton}` }, body: JSON.stringify({ plan: o.id }) })
      const d = await r.json().catch(() => ({}))
      T(`${o.label} · /api/subscribe rend une page de paiement`, r.ok && /^https:\/\/checkout\.stripe\.com\//.test(d.url ?? ''), `HTTP ${r.status} ${d.error ?? ''}`)
      const id = (d.url ?? '').match(/\/(cs_(?:test|live)_[A-Za-z0-9]+)/)?.[1]
      if (id) s = await stripe.checkout.sessions.retrieve(id, { expand: ['total_details'] })
    } else {
      // Sans préversion en clé de test, on construit la session EXACTEMENT comme app/api/subscribe/route.ts
      // (STRIPE_TAXE_AUTO=0) : ce qui est prouvé ici, c'est que Stripe accepte cette forme et ce qu'elle affiche.
      s = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price_data: { currency: 'eur', product_data: { name: `Presti — ${o.label}`, description: `${o.credits} crédits / mois` }, unit_amount: Math.round(o.prix * 100), recurring: { interval: 'month' } }, quantity: 1 }],
        client_reference_id: A.uid, customer_email: A.email,
        metadata: { uid: A.uid, plan: o.id, credits: String(o.credits) }, subscription_data: { metadata: { uid: A.uid, plan: o.id } },
        allow_promotion_codes: true, success_url: `${BASE}/dashboard?abo=ok`, cancel_url: `${BASE}/abonnement?abo=annule`,
      })
    }
    if (!s) { T(`${o.label} · session lisible`, false, 'aucune session'); continue }
    sessions.push(s.id)
    T(`${o.label} · montant annoncé = ${o.prix} € (matrice)`, s.amount_total === o.prix * 100, `${s.amount_total} centimes`)
    T(`${o.label} · TVA = 0 et calcul automatique éteint`, (s.total_details?.amount_tax ?? 0) === 0 && !s.automatic_tax?.enabled)
    T(`${o.label} · l’abonnement portera uid + plan (pour le webhook)`, s.metadata?.uid === A.uid && s.metadata?.plan === o.id)
    T(`${o.label} · mensuel, sans engagement`, s.mode === 'subscription')
    E(`${o.label} · la page de paiement porte la mention 293 B (custom_text)`, JSON.stringify(s.custom_text ?? {}).includes('293 B'))
    E(`${o.label} · l’adresse du client pro est demandée (mention obligatoire de la facture)`, s.billing_address_collection === 'required')
    const exp = await stripe.checkout.sessions.expire(s.id).catch((e) => ({ status: `erreur ${e.message}` }))
    T(`${o.label} · session expirée, rien ne traîne`, exp.status === 'expired', String(exp.status))
  }
  // La route elle-même (lecture statique : ce que le serveur enverra à Stripe).
  const routeSub = fs.readFileSync('app/api/subscribe/route.ts', 'utf8')
  T('la route lit ses prix dans lib/plans (OFFRES) et nulle part ailleurs', /from '@\/lib\/plans'/.test(routeSub) && /OFFRES\.find/.test(routeSub) && !/unit_amount:\s*\d/.test(routeSub))
  E('la route refuse une seconde souscription à un artisan déjà abonné (double facturation)', /stripe_subscription_id/.test(routeSub) && /(409|déjà abonné|portail)/i.test(routeSub))
  E('la route utilise des prix du catalogue (lookup_key / price:) plutôt que price_data à la volée', /lookup_key|price:\s*/.test(routeSub) && !/price_data/.test(routeSub))

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 3. Webhooks simulés (signés comme Stripe) : paiement, rejeu, forgeries, résiliation, renouvellement')
  const routeWh = fs.readFileSync('app/api/stripe/webhook/route.ts', 'utf8')
  if (!WEBHOOK_SECRET) {
    SAUT('toute la section', 'STRIPE_WEBHOOK_SECRET absent — copie-le depuis Vercel (ou .stripe-webhook.local) pour signer')
  } else {
    const B = await compte('webhook')
    await B.nav.from('artisans').insert({ id: B.uid, email: B.email, nom: 'Abo Webhook', metier: 'Électricien', slug: B.slug })
    const cus = `cus_sim_${crypto.randomBytes(6).toString('hex')}`, subA = `sub_sim_A_${crypto.randomBytes(6).toString('hex')}`

    // 3a. Forgeries d'abord : rien ne doit passer sans la bonne signature.
    const evStudio = evenement('checkout.session.completed', sessionPayee(B.uid, 'studio', subA, cus))
    let r = await livrer(evStudio, { entete: null })
    T('sans en-tête de signature → refusé (400 ou 503)', r.status === 400 || r.status === 503, `HTTP ${r.status}`)
    r = await livrer(evStudio, { entete: 't=1,v1=forge' })
    T('signature forgée → 400', r.status === 400, `HTTP ${r.status}`)
    r = await livrer(evStudio, { secret: 'whsec_mauvais_secret' })
    T('signé avec un autre secret → 400', r.status === 400, `HTTP ${r.status}`)
    const evAutre = evenement('checkout.session.completed', sessionPayee(B.uid, 'signature', subA, cus))
    r = await livrer(evAutre, { payloadSigne: JSON.stringify(evStudio) })
    T('corps modifié après signature (Studio signé, Signature envoyé) → 400', r.status === 400, `HTTP ${r.status}`)
    const b0 = await lire(B.uid)
    T('après ces quatre tentatives, le compte est toujours en essai', b0?.plan === 'gratuit' && b0?.credits === 3, JSON.stringify(b0))

    // 3b. Le vrai paiement.
    r = await livrer(evStudio)
    T('checkout.session.completed (Studio) → 200 received', r.status === 200 && r.corps?.received === true, `HTTP ${r.status} ${JSON.stringify(r.corps)}`)
    const b1 = await lire(B.uid)
    T('plan = studio', b1?.plan === 'studio', b1?.plan)
    T(`crédits = ${PLANS.studio.creditsMois} (matrice)`, b1?.credits === PLANS.studio.creditsMois, String(b1?.credits))
    T('renouvellement posé à un mois', dansUnMois(b1?.credits_reset_le), String(b1?.credits_reset_le))
    T('identifiants Stripe enregistrés', b1?.stripe_customer_id === cus && b1?.stripe_subscription_id === subA)
    const rInvB = await fetch(`${BASE}/api/inventaire`, { headers: { Authorization: `Bearer ${B.jeton}` } })
    T('capacité Studio déverrouillée côté serveur (GET /api/inventaire → 200)', rInvB.status === 200, `HTTP ${rInvB.status}`)
    const rApp = await fetch(`${BASE}/api/plateforme/apparence`, { headers: { Authorization: `Bearer ${B.jeton}` } })
    const dApp = await rApp.json().catch(() => ({}))
    T('personnalisation avancée ouverte (GET /api/plateforme/apparence → avance:true)', rApp.ok && dApp?.avance === true, `HTTP ${rApp.status} ${JSON.stringify(dApp).slice(0, 80)}`)
    E('un email de confirmation Presti part vers l’artisan (aujourd’hui : reçu Stripe seulement)', /sendEmail|notifierArtisan|alertePaiement/.test(routeWh) && /checkout\.session\.completed[\s\S]*?(sendEmail|notifierArtisan)\(/.test(routeWh))

    // 3c. Idempotence : Stripe relivre parfois le MÊME événement (délai, 5xx). Il ne doit rien changer.
    const { data: reste } = await admin.rpc('consume_credit', { p_uid: B.uid, p_cost: 1, p_credits_mois: PLANS.studio.creditsMois })
    T('un crédit consommé entre-temps', Number(reste) === PLANS.studio.creditsMois - 1, String(reste))
    r = await livrer(evStudio) // même event.id, même corps
    T('rejeu du même événement → 200 (Stripe ne doit pas boucler)', r.status === 200, `HTTP ${r.status}`)
    const b2 = await lire(B.uid)
    E('rejeu du même event.id → crédits INCHANGÉS (idempotence)', b2?.credits === PLANS.studio.creditsMois - 1, `crédits ${b2?.credits} (remis à ${PLANS.studio.creditsMois} : l’événement a été retraité)`)
    E('le code garde une trace des event.id traités', /event\.id/.test(routeWh) && /(stripe_evenements|webhook_events|evenements_stripe)/.test(routeWh))

    // 3d. Échec de prélèvement au renouvellement : le client garde son accès (grâce), il est prévenu.
    r = await livrer(evenement('invoice.payment_failed', facture(B.uid, 'studio', subA, cus, false)))
    T('invoice.payment_failed → 200', r.status === 200, `HTTP ${r.status}`)
    const b3 = await lire(B.uid)
    T('grâce : le plan reste studio après un échec', b3?.plan === 'studio', b3?.plan)
    E('le webhook écoute invoice.payment_failed et prévient l’artisan (alertePaiement(\'echec\'))', /invoice\.payment_failed/.test(routeWh) && /alertePaiement\(\s*'echec'/.test(routeWh))

    // 3e. Renouvellement : crédits REMIS au montant, jamais cumulés.
    await admin.from('artisans').update({ credits: 7 }).eq('id', B.uid)
    r = await livrer(evenement('invoice.paid', facture(B.uid, 'studio', subA, cus, true)))
    T('invoice.paid → 200', r.status === 200, `HTTP ${r.status}`)
    const b4 = await lire(B.uid)
    E('invoice.paid remet les crédits au montant de la matrice', b4?.credits === PLANS.studio.creditsMois, `crédits ${b4?.credits} (événement non écouté)`)
    // Le mécanisme réel d'aujourd'hui : le reset paresseux à la première consommation après la date.
    const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    await admin.from('artisans').update({ credits: 7, credits_reset_le: hier }).eq('id', B.uid)
    const { data: apresReset } = await admin.rpc('consume_credit', { p_uid: B.uid, p_cost: 1, p_credits_mois: PLANS.studio.creditsMois })
    const b5 = await lire(B.uid)
    T(`reset paresseux : date passée → ${PLANS.studio.creditsMois} − 1 (remis, pas cumulés)`, Number(apresReset) === PLANS.studio.creditsMois - 1 && b5?.credits === PLANS.studio.creditsMois - 1, `${apresReset} / ${b5?.credits}`)
    T('et la prochaine date est reposée à un mois', dansUnMois(b5?.credits_reset_le), String(b5?.credits_reset_le))

    // 3f. Changement d'offre depuis Stripe (Studio → Signature) : le plan doit suivre.
    r = await livrer(evenement('customer.subscription.updated', abonnement(B.uid, 'signature', subA, cus, 'active')))
    T('customer.subscription.updated → 200', r.status === 200, `HTTP ${r.status}`)
    const b6 = await lire(B.uid)
    E('le plan suit un changement d’offre côté Stripe (studio → signature)', b6?.plan === 'signature', `plan ${b6?.plan} (événement non écouté, et absent du point de terminaison)`)

    // 3g. Résiliation : retour à l'essai, rien n'est perdu, le client Stripe reste connu.
    r = await livrer(evenement('customer.subscription.deleted', abonnement(B.uid, b6?.plan ?? 'studio', subA, cus)))
    T('customer.subscription.deleted → 200', r.status === 200, `HTTP ${r.status}`)
    const b7 = await lire(B.uid)
    T('plan = gratuit après résiliation', b7?.plan === 'gratuit', b7?.plan)
    T('l’abonnement est détaché, le client Stripe reste (réabonnement sans re-saisie)', b7?.stripe_subscription_id === null && b7?.stripe_customer_id === cus, JSON.stringify(b7))
    T('les crédits restants ne sont pas effacés à la résiliation', Number(b7?.credits) === Number(b5?.credits), `${b7?.credits} vs ${b5?.credits}`)
    const rInvB2 = await fetch(`${BASE}/api/inventaire`, { headers: { Authorization: `Bearer ${B.jeton}` } })
    T('l’inventaire se referme (403) mais ses données restent en base', rInvB2.status === 403, `HTTP ${rInvB2.status}`)
    E('un email d’annulation Presti part vers l’artisan (alertePaiement(\'annulation\'))', /alertePaiement\(\s*'annulation'/.test(routeWh))

    // 3h. Réabonnement, puis rejeu tardif de la résiliation de l'ANCIEN abonnement : ne doit rien casser.
    const subB = `sub_sim_B_${crypto.randomBytes(6).toString('hex')}`
    r = await livrer(evenement('checkout.session.completed', sessionPayee(B.uid, 'essentiel', subB, cus)))
    const b8 = await lire(B.uid)
    T('réabonnement (Essentiel) → plan essentiel, nouvel abonnement enregistré', r.status === 200 && b8?.plan === 'essentiel' && b8?.stripe_subscription_id === subB, JSON.stringify(b8))
    r = await livrer(evenement('customer.subscription.deleted', abonnement(B.uid, 'studio', subA, cus)))
    const b9 = await lire(B.uid)
    E('la résiliation d’un ANCIEN abonnement (id ≠ enregistré) ne rétrograde pas l’abonné', b9?.plan === 'essentiel' && b9?.stripe_subscription_id === subB, `plan ${b9?.plan}, abonnement ${b9?.stripe_subscription_id} (le webhook ne compare pas l’identifiant)`)
    E('une erreur de traitement renvoie 5xx (Stripe réessaie) au lieu d’un 200 silencieux', !/renvoie 200 quand même/.test(routeWh) && /status:\s*5\d\d/.test(routeWh))
  }

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 4. Portail de facturation (Paramètres → Abonnement)')
  const rPort0 = await fetch(`${BASE}/api/stripe/portail`, { headers: { Authorization: `Bearer ${A.jeton}` } })
  const dPort0 = await rPort0.json().catch(() => ({}))
  T('GET sans abonnement → { abonnement: null } (rien à afficher)', rPort0.ok && dPort0?.abonnement === null, `HTTP ${rPort0.status} ${JSON.stringify(dPort0)}`)
  const rPort1 = await fetch(`${BASE}/api/stripe/portail`, { method: 'POST', headers: { Authorization: `Bearer ${A.jeton}` } })
  T('POST sans client Stripe → 404 « Aucun abonnement payant »', rPort1.status === 404, `HTTP ${rPort1.status}`)
  const rPort2 = await fetch(`${BASE}/api/stripe/portail`, { method: 'POST' })
  T('POST sans jeton → 401', rPort2.status === 401, `HTTP ${rPort2.status}`)
  if (VIA_SERVEUR) {
    const c = await stripe.customers.create({ email: A.email, name: 'Abo test portail', metadata: { uid: A.uid, test: 'abonnement-e2e' } })
    clientsStripe.push(c.id)
    await admin.from('artisans').update({ stripe_customer_id: c.id }).eq('id', A.uid)
    const rPort3 = await fetch(`${BASE}/api/stripe/portail`, { method: 'POST', headers: { Authorization: `Bearer ${A.jeton}`, Origin: BASE } })
    const dPort3 = await rPort3.json().catch(() => ({}))
    T('POST avec client → une URL de portail Stripe', rPort3.ok && /^https:\/\/billing\.stripe\.com\//.test(dPort3.url ?? ''), `HTTP ${rPort3.status} ${dPort3.error ?? ''} — si 500 : aucune configuration de portail enregistrée dans Stripe (tableau de bord → Paramètres → Portail client)`)
  } else {
    const confs = await stripe.billingPortal.configurations.list({ limit: 3 }).catch(() => ({ data: [] }))
    T('une configuration de portail existe dans ce mode Stripe (sinon POST /api/stripe/portail → 500)', confs.data.length > 0, 'aucune : Stripe → Paramètres → Portail client → Enregistrer')
    if (confs.data[0]) {
      const f = confs.data[0].features ?? {}
      T('le portail permet de résilier', f.subscription_cancel?.enabled === true)
      E('le portail permet de changer d’offre (produits du catalogue déclarés)', f.subscription_update?.enabled === true && (f.subscription_update?.products?.length ?? 0) >= 3)
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 5. Fondateurs : jamais décomptés, jamais facturés, impossibles à obtenir soi-même')
  const F = await compte('fondateur')
  await F.nav.from('artisans').insert({ id: F.uid, email: F.email, nom: 'Abo Fondateur', metier: 'Maçon', slug: F.slug })
  await F.nav.from('artisans').update({ is_founder: true, plan: 'business' }).eq('id', F.uid)
  const f0 = await lire(F.uid)
  T('un artisan ne peut pas se déclarer fondateur (verrou 0005/0055)', f0?.is_founder === false && f0?.plan === 'gratuit', JSON.stringify(f0))
  await admin.from('artisans').update({ is_founder: true, plan: 'business', credits: 0, credits_reset_le: plusUnMois() }).eq('id', F.uid)
  T('le plan interne « business » a les capacités Signature et 100 000 crédits théoriques', PLANS.business.capacites.join() === PLANS.signature.capacites.join() && PLANS.business.creditsMois >= 100000)
  const rInvF = await fetch(`${BASE}/api/inventaire`, { headers: { Authorization: `Bearer ${F.jeton}` } })
  T('fondateur à 0 crédit : l’inventaire reste ouvert (200)', rInvF.status === 200, `HTTP ${rInvF.status}`)
  const libCredits = fs.readFileSync('lib/credits.ts', 'utf8')
  T('lib/credits.ts court-circuite le décompte pour un fondateur AVANT tout appel SQL', /if \(isFounder\) return \{ ok: true \}/.test(libCredits) && libCredits.indexOf('isFounder) return') < libCredits.indexOf('rpc('))
  const { data: creditsF } = await admin.rpc('consume_credit', { p_uid: F.uid, p_cost: 1, p_credits_mois: PLANS.business.creditsMois })
  T('note : la fonction SQL seule ne connaît pas les fondateurs (le court-circuit est en TypeScript)', Number(creditsF) === -1 || Number(creditsF) >= 0)
  E('un fondateur ne peut pas souscrire une offre payante (/api/subscribe le refuse)', /is_founder/.test(routeSub))

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 6. Crédits : décompte atomique, refus propre à zéro')
  const C = await compte('credits')
  await C.nav.from('artisans').insert({ id: C.uid, email: C.email, nom: 'Abo Crédits', metier: 'Peintre', slug: C.slug })
  await admin.from('artisans').update({ credits: 5, credits_reset_le: plusUnMois() }).eq('id', C.uid)
  const rafale = await Promise.all(Array.from({ length: 12 }, () => admin.rpc('consume_credit', { p_uid: C.uid, p_cost: 1, p_credits_mois: 3 })))
  const passes = rafale.filter((x) => Number(x.data) >= 0).length, refus = rafale.filter((x) => Number(x.data) === -1).length
  T('12 consommations parallèles sur 5 crédits → exactement 5 passent, 7 refusées', passes === 5 && refus === 7, `${passes} / ${refus}`)
  const c1 = await lire(C.uid)
  T('le solde en base vaut 0, jamais négatif', c1?.credits === 0, String(c1?.credits))
  await admin.from('artisans').update({ credits: 2 }).eq('id', C.uid)
  const { data: expert } = await admin.rpc('consume_credit', { p_uid: C.uid, p_cost: CREDIT_COST.expert, p_credits_mois: 3 })
  const c2 = await lire(C.uid)
  T('Expert (3) avec 2 crédits → refusé, solde intact', Number(expert) === -1 && c2?.credits === 2, `${expert} / ${c2?.credits}`)
  const { data: zero } = await admin.rpc('consume_credit', { p_uid: C.uid, p_cost: 0, p_credits_mois: 3 })
  const { data: negatif } = await admin.rpc('consume_credit', { p_uid: C.uid, p_cost: -50, p_credits_mois: 3 })
  const c3 = await lire(C.uid)
  T('coût 0 ou négatif → ramené à 1 (jamais de recharge par la bande)', Number(zero) === 1 && Number(negatif) === 0 && c3?.credits === 0, `${zero} / ${negatif} / ${c3?.credits}`)
  const { error: eAnon } = await createClient(URL_SB, ANON, { auth: { persistSession: false } }).rpc('consume_credit', { p_uid: C.uid, p_cost: -1000, p_credits_mois: 3 })
  T('consume_credit est fermée au navigateur (0008)', !!eAnon)
  T('le message de refus dit quoi faire', /renouvellement mensuel ou formule supérieure/.test(libCredits))
  E('le refus renvoie aussi un lien vers /abonnement (message ET lien)', /\/abonnement/.test(libCredits))

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 7. Le prospect d’un artisan à 0 crédit n’est jamais bloqué (et l’IA n’est pas appelée)')
  // Un fil de conversation existant, l'artisan à sec avec une date de renouvellement FUTURE
  // (sinon le reset paresseux lui rendrait 3 crédits et la route appellerait l'IA).
  await admin.from('artisans').update({ credits: 0, credits_reset_le: plusUnMois(), reponse_auto: true }).eq('id', C.uid)
  const jetonConv = crypto.randomUUID()
  const { data: lead, error: eLead } = await admin.from('leads').insert({ artisan_id: C.uid, nom_prospect: 'Prospect test', contact: 'prospect@presti-test.invalid', message: 'Bonjour, une question', statut: 'nouveau', token: jetonConv }).select('id').single()
  T('un fil de conversation de test existe', !eLead && !!lead?.id, eLead?.message)
  if (lead?.id) {
    const rConv = await fetch(`${BASE}/api/conversation/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: jetonConv, message: 'Pouvez-vous passer mardi ?' }) })
    const type = rConv.headers.get('content-type') || ''
    const dConv = type.includes('event-stream') ? null : await rConv.json().catch(() => ({}))
    T('le message du prospect est accepté (200, pas d’erreur)', rConv.status === 200, `HTTP ${rConv.status}${rConv.status === 403 ? ' (IP bannie : node scripts/purger-abus.mjs)' : ''}`)
    T('aucune réponse IA (réponse JSON reply:null, pas de flux)', dConv !== null && dConv?.ok === true && dConv?.reply === null, `${type} ${JSON.stringify(dConv)}`)
    const { data: msgs } = await admin.from('messages').select('sens, contenu').eq('lead_id', lead.id)
    T('son message est bien enregistré dans le fil (rien n’est perdu)', (msgs ?? []).some((m) => m.sens === 'in' && /mardi/.test(m.contenu)))
    const cC = await lire(C.uid)
    T('le solde n’est pas passé en négatif', cC?.credits === 0, String(cC?.credits))
    const platChat = fs.readFileSync('app/p/[slug]/PlatChat.tsx', 'utf8')
    E('l’interface affiche une phrase au prospect quand la réponse est null en cours de fil (« X vous répond personnellement »)', /reply\s*===?\s*null[\s\S]{0,400}(répond|revient vers vous)/.test(platChat) || /raison[\s\S]{0,200}(répond|revient vers vous)/.test(platChat))
  }

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── 8. Aucun prix ni volume de crédits écrit en dur hors lib/plans.ts')
  const prix = OFFRES.map((o) => o.prix), volumes = OFFRES.map((o) => o.credits)
  const rePrix = new RegExp(`(?<![\\d.,])(${prix.join('|')})\\s*(€|&euro;|euros?\\b)`, 'g')
  const reVol = new RegExp(`(?<![\\d.,])(${volumes.join('|')})\\s*crédits|crédits\\s*(?:chaque mois\\s*)?[:=]?\\s*(${volumes.join('|')})(?![\\d])`, 'g')
  const trouves = []
  for (const dir of ['app', 'lib', 'components']) {
    if (!fs.existsSync(dir)) continue
    for (const f of fichiers(dir)) {
      if (f.replace(/\\/g, '/').endsWith('lib/plans.ts')) continue
      const src = fs.readFileSync(f, 'utf8')
      src.split('\n').forEach((l, i) => {
        if (/^\s*\/\//.test(l)) return // les commentaires expliquent, ils ne vendent pas
        if (rePrix.test(l) || reVol.test(l)) trouves.push(`${f.replace(/\\/g, '/')}:${i + 1}`)
        rePrix.lastIndex = 0; reVol.lastIndex = 0
      })
    }
  }
  T('0 occurrence de 29/59/99 € ou 80/250/600 crédits hors lib/plans.ts (code livré)', trouves.length === 0, trouves.join(', '))
  const simu = fs.readFileSync('lib/alertes.ts', 'utf8')
  E('le texte de simulation des alertes ne fige pas « sur 80 » (lire la matrice)', !/sur 80/.test(simu))
} catch (e) {
  ko++; console.log('  ❌ exception :', e?.message ?? e)
} finally {
  for (const id of sessions) await stripe.checkout.sessions.expire(id).catch(() => {})
  for (const id of clientsStripe) await stripe.customers.del(id).catch(() => {})
  let purges = 0
  for (const uid of comptes) {
    const { error } = await admin.rpc('purger_compte_test', { p_id: uid })
    if (error) { await admin.from('artisans').delete().eq('id', uid); await admin.auth.admin.deleteUser(uid).catch(() => {}) }
    purges++
  }
  if (comptes.length) console.log(`\n🧹 ${purges} compte(s) de test purgé(s)${clientsStripe.length ? `, ${clientsStripe.length} client(s) Stripe de test supprimé(s)` : ''}`)
}

console.log(`\n${ok} réussis, ${ko} échoués, ${ecarts} écart(s) connu(s)${resorbes ? `, ${resorbes} résorbé(s)` : ''}\n`)
process.exit(ko ? 1 : 0)
