// scripts/essais-gratuits-qa.mjs — le juge de l'ESSAI GRATUIT SANS CARTE (décision de Benj, 13/10/2026) : une semaine d'Essentiel,
// deux de Studio, trois de Signature, sans saisir de carte, une seule fois par compte.
//
// Il juge lib/plans.ts (ESSAI_JOURS), lib/essaiGratuit.ts (règles pures), lib/essaiGratuitServeur.ts (registre + Stripe),
// app/api/subscribe/route.ts (le Checkout) et app/api/stripe/webhook/route.ts (la vie de l'essai). Rien ne touche le réseau, la
// base ni Stripe : les routes sont EXÉCUTÉES pour de vrai, avec des doublures de lib/supabaseAdmin, lib/stripe, lib/email,
// lib/alertes, lib/authArtisan et next/server (fetch est remplacé par un piège ; la clé secrète Stripe est retirée de l'environnement).
//
//   EG-1  Règles pures : durées 7 / 14 / 21 ; crédits de l'essai (au prorata sur 30 jours, plafonnés à 150 : 18 / 116 / 150) ;
//         normalisation de l'e-mail (« +étiquette », points Gmail) ; table de décision « un seul essai » ; paramètres du Checkout
//         par offre ; reconnaissance d'une fin d'essai non payée.
//   EG-2  Le Checkout (POST /api/subscribe, exécuté) : par offre, trial_period_days = 7 / 14 / 21, payment_method_collection =
//         if_required, trial_settings.end_behavior.missing_payment_method = cancel, essai_jours en métadonnée ; AUCUN de ces champs
//         quand le compte a déjà eu son essai (par compte, par e-mail normalisé, par client Stripe, par autre client Stripe de même
//         e-mail) ou quand Stripe est injoignable ; registre absent (migration 0156 pas appliquée) → l'essai reste permis si Stripe
//         ne connaît rien ; déjà abonné → 409 ; fondateur → 403 ; GET dit la même chose que POST.
//   EG-3  Le webhook (POST /api/stripe/webhook, exécuté, faux événements) : début d'essai (plan, crédits au prorata, fin d'essai,
//         registre) ; essai forgé (durée qui n'est pas celle de l'offre) servi comme un abonnement payé ; abonnement « trialing » non
//         réaligné ; essai devenu payant (forfait entier servi) ; essai terminé sans carte (deleted) → plan gratuit, crédits ramenés
//         à ceux de l'Essai ; résiliation d'un abonnement payé → plan gratuit sans toucher aux crédits ; incomplete_expired →
//         plan gratuit ; fin d'un ANCIEN abonnement ignorée ; second essai annulé chez Stripe ; trial_will_end → message à l'artisan
//         seulement s'il n'a pas de carte.
//   EG-4  Lecture statique : la migration 0156 (RLS, service_role seul) ; le juge est dans SUITES ; « N jours gratuits » jamais écrit
//         en dur hors de lib/plans.ts ; « jours gratuits, sans carte » seulement à côté de ESSAI_JOURS, et sur /abonnement seulement
//         derrière le droit à l'essai ; « sans carte » cantonné aux fichiers connus.
//   EG-5  Le juge sait ROUGIR : 13 mutations du code (une durée changée, la carte exigée, le registre ignoré, les crédits
//         au forfait entier, la conversion oubliée…) sont appliquées à une copie du projet, et chacune doit faire échouer le
//         check qui la concerne. Une mutation qui ne s'applique plus est un échec (« sonde cassée »).
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/essais-gratuits-qa.mjs [--sans-mutations]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { register } from 'node:module'

const ICI = fileURLToPath(import.meta.url)
const args = process.argv.slice(2)

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
//  MODE SONDE : tourne dans un processus à part, sur une racine donnée (le dépôt, ou une copie mutée)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function sonde(racine, sortie) {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_essais_qa'
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_TAXE_AUTO
  const reseau = []
  globalThis.fetch = async (u) => { reseau.push(String(u && u.url ? u.url : u)); throw new Error('réseau coupé par essais-gratuits-qa') }

  const verifs = []
  const T = (id, ok, detail = '') => verifs.push({ id, ok: !!ok, detail: ok ? '' : String(detail).slice(0, 400) })
  const fatal = (e) => { fs.writeFileSync(sortie, JSON.stringify({ fatal: String((e && e.stack) || e).slice(0, 1500), verifs })); process.exit(0) }

  // ── les doublures ──
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'eg-doublures-'))
  const url = (rel) => pathToFileURL(path.join(racine, rel)).href
  const reel = (rel) => JSON.stringify(`${url(rel)}?reel`)
  const commun = `const E = () => globalThis.__eg\nconst copie = (x) => { try { return JSON.parse(JSON.stringify(x ?? null)) } catch { return String(x) } }\n`
  const fichiers = {
    'next-server.mjs': `export class NextResponse extends Response {
  static json(corps, init = {}) { const h = new Headers(init.headers); if (!h.has('content-type')) h.set('content-type', 'application/json'); return new NextResponse(JSON.stringify(corps), { ...init, headers: h }) }
  static redirect(u, init) { const status = typeof init === 'number' ? init : (init && init.status) || 307; return new NextResponse(null, { status, headers: { location: String(u) } }) }
  static next(init) { return new NextResponse(null, init) }
}
export class NextRequest extends Request {}
export function after(tache) { try { const p = typeof tache === 'function' ? tache() : tache; if (p && typeof p.then === 'function') globalThis.__eg.enAttente.push(p) } catch (e) { globalThis.__eg.enAttente.push(Promise.reject(e)) } }
export function userAgent() { return {} }
`,
    'supabaseAdmin.mjs': `${commun}function reponse(op) {
  const e = E()
  if (op.table === 'essais_gratuits') {
    if (e.registreAbsent) return { data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.essais_gratuits' in the schema cache" } }
    if (op.action === 'select') return { data: e.registre.filter((r) => op.filtres.every(([k, col, val]) => k !== 'eq' || r[col] === val)), error: null }
    if (op.action === 'upsert') { e.registre.push(copie(op.payload)); return { data: null, error: null } }
    return { data: null, error: null }
  }
  if (op.table === 'artisans' && op.action === 'select') { const a = e.artisan; return { data: op.unique ? (a ?? null) : (a ? [a] : []), error: null } }
  return { data: op.unique ? null : [], error: null }
}
function requete(table) {
  const op = { table, action: 'select', payload: null, opts: null, filtres: [], unique: false }
  E().base.push(op)
  const p = new Proxy(function () {}, {
    get(_, cle) {
      if (typeof cle === 'symbol') return undefined
      if (cle === 'then') return (ok, ko) => Promise.resolve(reponse(op)).then(ok, ko)
      if (cle === 'maybeSingle' || cle === 'single') return () => { op.unique = true; return Promise.resolve(reponse(op)) }
      if (cle === 'update' || cle === 'insert' || cle === 'upsert') return (payload, opts) => { op.action = cle; op.payload = copie(payload); op.opts = copie(opts); return p }
      if (cle === 'delete') return () => { op.action = 'delete'; return p }
      if (cle === 'select') return () => p
      return (...a) => { op.filtres.push([cle, ...a.map(copie)]); return p }
    },
  })
  return p
}
const neutre = () => new Proxy(function () {}, { get(_, cle) { if (cle === 'then' || typeof cle === 'symbol') return undefined; return neutre() }, apply() { return Promise.resolve({ data: null, error: null }) } })
export const supabaseAdmin = new Proxy({}, {
  get(_, cle) {
    if (cle === 'from') return (t) => requete(t)
    if (cle === 'then' || typeof cle === 'symbol') return undefined
    return neutre()
  },
})
`,
    'stripe.mjs': `export * from ${reel('lib/stripe.ts')}
${commun}const attendu = (e) => { if (e.stripeEchec) throw new Error('Stripe injoignable (doublure)') }
function constructEvent(brut, sig, secret) {
  if (!sig || !secret || secret !== process.env.STRIPE_WEBHOOK_SECRET) throw new Error('signature refusée par la doublure de Stripe')
  return JSON.parse(typeof brut === 'string' ? brut : Buffer.from(brut).toString('utf8'))
}
export const stripe = {
  webhooks: { constructEvent, constructEventAsync: async (...a) => constructEvent(...a) },
  checkout: { sessions: { create: async (p) => { const e = E(); e.sessions.push(copie(p)); return { id: 'cs_test_' + e.sessions.length, url: 'https://checkout.stripe.test/c/' + e.sessions.length } } } },
  customers: {
    list: async (p) => { const e = E(); e.appels.push(['customers.list', copie(p)]); attendu(e); return { data: e.clientsParEmail[p.email] || [] } },
    retrieve: async (id) => { const e = E(); e.appels.push(['customers.retrieve', id]); return (e.clients && e.clients[id]) || { id, invoice_settings: { default_payment_method: null } } },
    update: async (id, p) => { E().appels.push(['customers.update', id, copie(p)]); return { id } },
  },
  subscriptions: {
    list: async (p) => { const e = E(); e.appels.push(['subscriptions.list', copie(p)]); attendu(e); return { data: e.abosParClient[p.customer] || [] } },
    cancel: async (id) => { E().annulations.push(id); return { id, status: 'canceled' } },
    retrieve: async (id) => { const e = E(); e.appels.push(['subscriptions.retrieve', id]); return e.abonnementRelu || { id } },
  },
  billingPortal: { sessions: { create: async () => ({ url: 'https://portail.stripe.test' }) } },
}
`,
    'email.mjs': `export * from ${reel('lib/email.ts')}
${commun}export async function sendEmail(o) { E().emails.push(copie(o)); return { ok: true, id: 'factice' } }
export async function notifierEntreprise(sujet, corps) { E().notifs.push({ sujet: String(sujet), corps: String(corps) }); return { ok: true, id: 'factice' } }
`,
    'alertes.mjs': `export * from ${reel('lib/alertes.ts')}
${commun}export async function envoyerAlertes(alertes) { E().alertes.push(...copie(alertes)); return Array.isArray(alertes) ? alertes.length : 0 }
`,
    'authArtisan.mjs': `export * from ${reel('lib/authArtisan.ts')}
${commun}export async function getUserRevocable(token) { const e = E(); if (!token || token === 'invalide') return { data: { user: null }, error: { message: 'jeton refusé' } }; return { data: { user: { id: e.uid, email: e.emailAuth } }, error: null } }
`,
  }
  for (const [nom, contenu] of Object.entries(fichiers)) fs.writeFileSync(path.join(D, nom), contenu)
  const cle = (p) => { const x = p.split('\\').join('/'); return process.platform === 'win32' ? x.toLowerCase() : x }
  const mocks = {}
  for (const [rel, doublure] of [['lib/supabaseAdmin.ts', 'supabaseAdmin.mjs'], ['lib/stripe.ts', 'stripe.mjs'], ['lib/email.ts', 'email.mjs'], ['lib/alertes.ts', 'alertes.mjs'], ['lib/authArtisan.ts', 'authArtisan.mjs']]) {
    mocks[cle(path.join(racine, rel))] = pathToFileURL(path.join(D, doublure)).href
  }
  fs.writeFileSync(path.join(D, 'crochets.mjs'), `import { fileURLToPath } from 'node:url'
let DOUBLURES = {}, NEXT_SERVER = null
export async function initialize(data) { DOUBLURES = data.doublures; NEXT_SERVER = data.nextServer }
const cle = (u) => { try { const p = fileURLToPath(u).split('\\\\').join('/'); return process.platform === 'win32' ? p.toLowerCase() : p } catch { return null } }
export async function resolve(spec, ctx, next) {
  if (spec === 'next/server' || spec === 'next/server.js') return { url: NEXT_SERVER, shortCircuit: true }
  const r = await next(spec, ctx)
  if (r.url.startsWith('file:') && !r.url.includes('?reel')) { const d = DOUBLURES[cle(r.url.split('?')[0])]; if (d) return { url: d, shortCircuit: true } }
  return r
}
`)
  register(pathToFileURL(path.join(D, 'crochets.mjs')).href, { data: { doublures: mocks, nextServer: pathToFileURL(path.join(D, 'next-server.mjs')).href } })

  // ── l'état de chaque scénario ──
  const neuf = (o = {}) => {
    globalThis.__eg = {
      base: [], sessions: [], appels: [], annulations: [], notifs: [], emails: [], alertes: [], enAttente: [], registre: [], registreAbsent: false,
      clientsParEmail: {}, abosParClient: {}, clients: {}, stripeEchec: false, abonnementRelu: null,
      uid: 'u-0001', emailAuth: 'neuf@exemple.fr',
      artisan: { id: 'u-0001', email: 'neuf@exemple.fr', nom: 'Artisan de test', metier: 'plombier', plan: 'gratuit', credits: 3, stripe_customer_id: null, stripe_subscription_id: null, is_founder: false },
      ...o,
    }
    return globalThis.__eg
  }
  const sha = (email) => crypto.createHash('sha256').update(`presti-essai:${email}`).digest('hex') // recette de la migration 0156 : adresse NORMALISÉE
  const ecrituresArtisans = () => globalThis.__eg.base.filter((o) => o.table === 'artisans' && o.action === 'update')
  const jourPlus = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
  const unDesJours = (val, n) => val === jourPlus(n) || val === jourPlus(n - 1) || val === jourPlus(n + 1)

  // ── l'oracle : la décision de Benj, écrite ici une fois, indépendamment du code jugé ──
  const OFFRES = [
    { id: 'essentiel', jours: 7, credits: 18, prixCentimes: 2900, forfait: 80 },
    { id: 'studio', jours: 14, credits: 116, prixCentimes: 5900, forfait: 250 },
    { id: 'signature', jours: 21, credits: 150, prixCentimes: 9900, forfait: 600 },
  ]

  let plans, pur, serveur
  try {
    plans = await import(url('lib/plans.ts'))
    pur = await import(url('lib/essaiGratuit.ts'))
    serveur = await import(url('lib/essaiGratuitServeur.ts'))
  } catch (e) { return fatal(e) }

  // ══ EG-1 — règles pures ══
  const j = (x) => JSON.stringify(x)
  T('EG-1a', j(plans.ESSAI_JOURS) === j({ essentiel: 7, studio: 14, signature: 21 }), `ESSAI_JOURS = ${j(plans.ESSAI_JOURS)}`)
  for (const o of OFFRES) {
    T(`EG-1b ${o.id}`, pur.creditsEssai(o.id) === o.credits, `creditsEssai(${o.id}) = ${pur.creditsEssai(o.id)}, attendu ${o.credits}`)
    T(`EG-1b ${o.id} sous le forfait`, pur.creditsEssai(o.id) < o.forfait, 'un essai ne doit jamais servir le forfait entier')
  }
  T('EG-1b hors offre', ['gratuit', 'business', 'inconnu', null, undefined].every((p) => pur.creditsEssai(p) === 0 && pur.essaiJours(p) === 0), 'une offre sans essai doit donner 0 crédit et 0 jour')
  const normalisations = [['Jean.Dupont+Pub@Gmail.com', 'jeandupont@gmail.com'], ['a.b@googlemail.com', 'ab@gmail.com'], ['Pierre.Martin+x@entreprise.fr', 'pierre.martin@entreprise.fr'], [' X@Y.fr ', 'x@y.fr']]
  for (const [entree, attendu] of normalisations) T(`EG-1c ${entree}`, pur.normaliserEmail(entree) === attendu, `→ ${pur.normaliserEmail(entree)}`)
  const rien = { abonnementEnCours: false, essaiDejaPris: false, abonnementDejaEu: false }
  T('EG-1d compte vierge', pur.decisionEssai(rien).essai === true)
  for (const [fait, raison] of [['abonnementEnCours', 'abonnement_en_cours'], ['essaiDejaPris', 'essai_deja_pris'], ['abonnementDejaEu', 'abonnement_deja_eu'], ['verificationImpossible', 'verification_impossible']]) {
    const d = pur.decisionEssai({ ...rien, [fait]: true })
    T(`EG-1d ${fait}`, d.essai === false && d.raison === raison, j(d))
  }
  for (const o of OFFRES) {
    const c = pur.champsCheckoutEssai(o.id, true)
    T(`EG-1e ${o.id}`, c.payment_method_collection === 'if_required' && c.jours === o.jours && c.subscription_data?.trial_period_days === o.jours && c.subscription_data?.trial_settings?.end_behavior?.missing_payment_method === 'cancel', j(c))
    const sans = pur.champsCheckoutEssai(o.id, false)
    T(`EG-1e ${o.id} sans essai`, !sans.payment_method_collection && !sans.subscription_data && sans.jours === 0, j(sans))
  }
  T('EG-1e offre sans essai', ['gratuit', 'business', 'x'].every((p) => { const c = pur.champsCheckoutEssai(p, true); return !c.subscription_data && !c.payment_method_collection }), 'seules les trois offres payantes ont un essai')
  const T0 = 1_800_000_000
  T('EG-1f fin d’essai non payée', pur.finDEssaiSansPaiement({ trial_end: T0, ended_at: T0 + 10 }, 0) === true && pur.finDEssaiSansPaiement({ trial_end: T0, ended_at: T0 - 86_400 }, 0) === true, 'annulé à la fin ou pendant l’essai')
  T('EG-1f abonnement payé puis résilié', pur.finDEssaiSansPaiement({ trial_end: T0, ended_at: T0 + 20 * 86_400 }, 0) === false && pur.finDEssaiSansPaiement({ ended_at: T0 }, 0) === false, 'un abonnement payé garde ses crédits')
  T('EG-1g session forgée', pur.joursEssaiDeSession({ essai_jours: '7' }, 'essentiel') === 7 && pur.joursEssaiDeSession({ essai_jours: '60' }, 'essentiel') === 0 && pur.joursEssaiDeSession({ essai_jours: '7' }, 'studio') === 0 && pur.joursEssaiDeSession(undefined, 'essentiel') === 0 && pur.joursEssaiDeSession({ essai_jours: '-7' }, 'essentiel') === 0)
  T('EG-1h crédits après essai perdu', pur.creditsApresEssaiPerdu(18) === 3 && pur.creditsApresEssaiPerdu(2) === 2 && pur.creditsApresEssaiPerdu(null) === 0)
  T('EG-1i statuts', pur.abonnementFerme('canceled') && pur.abonnementFerme('incomplete_expired') && !pur.abonnementFerme('trialing') && !pur.abonnementFerme('active') && pur.essaiDevenuPayant('trialing', 'active') && !pur.essaiDevenuPayant('past_due', 'active'))
  T('EG-1j empreinte', serveur.empreinteEmail('Jean.Dupont+Pub@gmail.com') === sha('jeandupont@gmail.com') && !serveur.empreinteEmail('x@y.fr').includes('@'), 'l’empreinte suit la recette de la migration 0156 et ne contient pas l’adresse')

  // ══ EG-2 — le Checkout ══
  let subscribe, webhook
  try {
    subscribe = await import(url('app/api/subscribe/route.ts'))
    webhook = await import(url('app/api/stripe/webhook/route.ts'))
  } catch (e) { return fatal(e) }
  const poster = async (plan, jeton = 'valide') => {
    const res = await subscribe.POST(new Request('http://127.0.0.1/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${jeton}`, origin: 'http://127.0.0.1' }, body: JSON.stringify({ plan }) }))
    return { status: res.status, corps: await res.json().catch(() => ({})) }
  }
  const lire = async () => { const res = await subscribe.GET(new Request('http://127.0.0.1/api/subscribe', { headers: { authorization: 'Bearer valide' } })); return { status: res.status, corps: await res.json().catch(() => ({})) } }
  const sansEssai = (s) => s && !('trial_period_days' in (s.subscription_data || {})) && !('trial_settings' in (s.subscription_data || {})) && !('payment_method_collection' in s) && !(s.metadata && 'essai_jours' in s.metadata) && !(s.subscription_data?.metadata && 'essai_jours' in s.subscription_data.metadata)

  for (const o of OFFRES) {
    const e = neuf()
    const r = await poster(o.id)
    const s = e.sessions[0]
    T(`EG-2a ${o.id} session créée`, r.status === 200 && e.sessions.length === 1 && r.corps.url, j(r))
    T(`EG-2a ${o.id} trial_period_days`, s?.subscription_data?.trial_period_days === o.jours, `trial_period_days = ${s?.subscription_data?.trial_period_days}`)
    T(`EG-2a ${o.id} aucune carte demandée`, s?.payment_method_collection === 'if_required', `payment_method_collection = ${s?.payment_method_collection}`)
    T(`EG-2a ${o.id} annulation sans carte`, s?.subscription_data?.trial_settings?.end_behavior?.missing_payment_method === 'cancel', j(s?.subscription_data?.trial_settings))
    T(`EG-2a ${o.id} métadonnées`, s?.metadata?.essai_jours === String(o.jours) && s?.metadata?.plan === o.id && s?.metadata?.uid === 'u-0001' && s?.subscription_data?.metadata?.plan === o.id && s?.subscription_data?.metadata?.uid === 'u-0001', j(s?.metadata))
    T(`EG-2a ${o.id} prix et adresse inchangés`, s?.mode === 'subscription' && s?.line_items?.[0]?.price_data?.unit_amount === o.prixCentimes && s?.billing_address_collection === 'required', `unit_amount = ${s?.line_items?.[0]?.price_data?.unit_amount}`)
    T(`EG-2a ${o.id} GET`, (await lire()).corps?.essai?.disponible === true, 'GET /api/subscribe doit annoncer l’essai disponible')
  }
  {
    const e = neuf({ registre: [{ email_hash: 'autre', artisan_id: 'u-0001', plan: 'essentiel', jours: 7 }] })
    const r = await poster('studio')
    T('EG-2b essai déjà pris (par compte)', r.status === 200 && sansEssai(e.sessions[0]), j(e.sessions[0]?.subscription_data))
    T('EG-2b GET', (await lire()).corps?.essai?.disponible === false)
  }
  {
    const e = neuf({ emailAuth: 'Jean.Dupont+Pub@gmail.com', artisan: { id: 'u-0001', email: 'Jean.Dupont+Pub@gmail.com', plan: 'gratuit', credits: 3, stripe_customer_id: null, stripe_subscription_id: null, is_founder: false }, registre: [{ email_hash: sha('jeandupont@gmail.com'), artisan_id: 'ancien-compte', plan: 'essentiel', jours: 7 }] })
    await poster('essentiel')
    T('EG-2b compte recréé, même e-mail (alias Gmail)', sansEssai(e.sessions[0]) && e.sessions.length === 1, j(e.sessions[0]?.subscription_data))
  }
  {
    const e = neuf({ artisan: { id: 'u-0001', email: 'neuf@exemple.fr', plan: 'gratuit', credits: 3, stripe_customer_id: 'cus_ancien', stripe_subscription_id: null, is_founder: false }, abosParClient: { cus_ancien: [{ id: 'sub_ancien', status: 'canceled' }] } })
    await poster('signature')
    T('EG-2b client Stripe qui a déjà eu un abonnement', sansEssai(e.sessions[0]) && e.sessions.length === 1, j(e.sessions[0]?.subscription_data))
  }
  {
    const e = neuf({ clientsParEmail: { 'neuf@exemple.fr': [{ id: 'cus_autre' }] }, abosParClient: { cus_autre: [{ id: 'sub_autre', status: 'canceled' }] } })
    await poster('essentiel')
    T('EG-2b autre client Stripe de même e-mail', sansEssai(e.sessions[0]) && e.sessions.length === 1, j(e.sessions[0]?.subscription_data))
  }
  {
    const e = neuf({ clientsParEmail: { 'neuf@exemple.fr': [{ id: 'cus_vide' }] }, abosParClient: {} })
    await poster('essentiel')
    T('EG-2b un client Stripe sans abonnement n’ôte pas l’essai', e.sessions[0]?.subscription_data?.trial_period_days === 7, j(e.sessions[0]?.subscription_data))
  }
  {
    const e = neuf({ stripeEchec: true })
    const r = await poster('essentiel')
    T('EG-2c Stripe injoignable : pas d’essai, Checkout normal', r.status === 200 && sansEssai(e.sessions[0]) && e.sessions.length === 1, j(e.sessions[0]?.subscription_data))
  }
  {
    const e = neuf({ registreAbsent: true })
    const r = await poster('studio')
    T('EG-2d registre absent (0156 non appliquée) : l’essai reste permis', r.status === 200 && e.sessions[0]?.subscription_data?.trial_period_days === 14, j(e.sessions[0]?.subscription_data))
    const e2 = neuf({ registreAbsent: true, clientsParEmail: { 'neuf@exemple.fr': [{ id: 'cus_x' }] }, abosParClient: { cus_x: [{ id: 's', status: 'canceled' }] } })
    await poster('studio')
    T('EG-2d registre absent : Stripe garde la mémoire', sansEssai(e2.sessions[0]) && e2.sessions.length === 1)
  }
  {
    const e = neuf({ artisan: { id: 'u-0001', email: 'neuf@exemple.fr', plan: 'studio', credits: 5, stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_en_cours', is_founder: false } })
    const r = await poster('signature')
    T('EG-2e déjà abonné : 409, rien de créé', r.status === 409 && e.sessions.length === 0, j(r))
    const e2 = neuf({ artisan: { id: 'u-0001', email: 'neuf@exemple.fr', plan: 'business', credits: 5, stripe_customer_id: null, stripe_subscription_id: null, is_founder: true } })
    const r2 = await poster('studio')
    T('EG-2e fondateur : 403, rien de créé', r2.status === 403 && e2.sessions.length === 0, j(r2))
    neuf()
    const r3 = await poster('essentiel', 'invalide')
    T('EG-2e sans session valide : 401', r3.status === 401 && globalThis.__eg.sessions.length === 0, j(r3))
    neuf()
    const r4 = await poster('inconnu')
    T('EG-2e offre inconnue : 400', r4.status === 400 && globalThis.__eg.sessions.length === 0, j(r4))
  }

  // ══ EG-3 — le webhook ══
  const UID = 'u-0001'
  const evt = (type, objet, extra = {}) => ({ id: 'evt_' + crypto.randomBytes(6).toString('hex'), object: 'event', type, data: { object: objet, ...extra } })
  const envoyer = async (event) => {
    const res = await webhook.POST(new Request('http://127.0.0.1/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=essais' }, body: JSON.stringify(event) }))
    await Promise.allSettled(globalThis.__eg.enAttente)
    return { status: res.status, corps: (await res.text()).slice(0, 200) }
  }
  const sessionEssai = (o, extra = {}) => ({ id: 'cs_test_' + o.id, object: 'checkout.session', mode: 'subscription', payment_status: 'no_payment_required', status: 'complete', subscription: 'sub_nouveau', customer: 'cus_nouveau', client_reference_id: UID, amount_total: 0, currency: 'eur', metadata: { uid: UID, plan: o.id, credits: String(o.forfait), essai_jours: String(o.jours) }, ...extra })
  const abonnement = (o, extra = {}) => ({ id: 'sub_nouveau', object: 'subscription', status: 'trialing', customer: 'cus_nouveau', metadata: { uid: UID, plan: o.id }, items: { data: [{ price: { unit_amount: o.prixCentimes } }] }, trial_end: Math.floor(Date.now() / 1000) + 5 * 86_400, ...extra })

  for (const o of OFFRES) {
    const e = neuf()
    const r = await envoyer(evt('checkout.session.completed', sessionEssai(o)))
    const w = ecrituresArtisans().find((x) => x.payload?.stripe_subscription_id === 'sub_nouveau')?.payload
    T(`EG-3a ${o.id} essai démarré`, r.status === 200 && w?.plan === o.id && w?.stripe_subscription_id === 'sub_nouveau', `${r.status} ${j(w)}`)
    T(`EG-3a ${o.id} crédits de l’essai`, w?.credits === o.credits, `credits = ${w?.credits}, attendu ${o.credits} (prorata sur 30 jours, plafond 150)`)
    T(`EG-3a ${o.id} fin d’essai`, unDesJours(w?.credits_reset_le, o.jours), `credits_reset_le = ${w?.credits_reset_le}`)
    const reg = e.base.find((x) => x.table === 'essais_gratuits' && x.action === 'upsert')?.payload
    T(`EG-3a ${o.id} registre`, reg?.email_hash === sha('neuf@exemple.fr') && reg?.plan === o.id && reg?.jours === o.jours && reg?.artisan_id === UID && !JSON.stringify(reg).includes('@'), j(reg))
    T(`EG-3a ${o.id} entreprise prévenue`, e.notifs.some((n) => /essai gratuit/i.test(n.sujet)), j(e.notifs.map((n) => n.sujet)))
  }
  {
    const e = neuf({ artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'Gros solde', plan: 'gratuit', credits: 500, stripe_customer_id: null, stripe_subscription_id: null } })
    await envoyer(evt('checkout.session.completed', sessionEssai(OFFRES[0])))
    T('EG-3a les crédits offerts par la direction ne sont pas écrasés', ecrituresArtisans().find((x) => x.payload?.stripe_subscription_id)?.payload?.credits === 500)
  }
  {
    const e = neuf()
    await envoyer(evt('checkout.session.completed', sessionEssai(OFFRES[0], { metadata: { uid: UID, plan: 'essentiel', credits: '80', essai_jours: '60' } })))
    const w = ecrituresArtisans().find((x) => x.payload?.stripe_subscription_id)?.payload
    T('EG-3b durée forgée : servi comme un abonnement payé', w?.credits === 80 && !e.base.some((x) => x.table === 'essais_gratuits' && x.action === 'upsert'), `${j(w)}`)
    const e2 = neuf()
    await envoyer(evt('checkout.session.completed', sessionEssai(OFFRES[0], { payment_status: 'paid', metadata: { uid: UID, plan: 'essentiel', credits: '80' } })))
    const w2 = ecrituresArtisans().find((x) => x.payload?.stripe_subscription_id)?.payload
    T('EG-3b abonnement payé tout de suite : forfait entier, inchangé', w2?.credits === 80 && !!w2?.credits_reset_le, j(w2))
  }
  {
    const o = OFFRES[1]
    // un changement d'offre pendant l'essai (le montant dit Studio, le compte est en Essentiel) ne sert AUCUN crédit
    const enEssai = abonnement(o, { status: 'trialing' })
    const e = neuf({ abonnementRelu: enEssai, artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'T', plan: 'essentiel', credits: 10, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_nouveau' } })
    const r = await envoyer(evt('customer.subscription.updated', enEssai))
    T('EG-3c « trialing » : rien à aligner, aucun crédit servi', r.status === 200 && ecrituresArtisans().length === 0, `${r.status} ${j(ecrituresArtisans().map((x) => x.payload))}`)
  }
  {
    const o = OFFRES[1]
    const actif = abonnement(o, { status: 'active', trial_end: Math.floor(Date.now() / 1000) - 60 })
    const e = neuf({ abonnementRelu: actif, artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'T', plan: 'studio', credits: 5, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_nouveau' } })
    const r = await envoyer(evt('customer.subscription.updated', actif, { previous_attributes: { status: 'trialing' } }))
    const w = ecrituresArtisans().find((x) => x.payload?.credits === o.forfait)?.payload
    T('EG-3d l’essai devient payant : le forfait entier est servi', r.status === 200 && !!w && !!w.credits_reset_le, `${r.status} ${j(ecrituresArtisans().map((x) => x.payload))}`)
    T('EG-3d conversion signalée', e.notifs.some((n) => /conversion/i.test(n.sujet)), j(e.notifs.map((n) => n.sujet)))
  }
  {
    const o = OFFRES[0]
    const t = Math.floor(Date.now() / 1000)
    const e = neuf({ artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'T', plan: 'essentiel', credits: 14, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_nouveau' } })
    const r = await envoyer(evt('customer.subscription.deleted', abonnement(o, { status: 'canceled', trial_end: t - 10, ended_at: t - 5 })))
    const w = ecrituresArtisans()[0]?.payload
    T('EG-3e essai terminé sans carte : retour à l’Essai', r.status === 200 && w?.plan === 'gratuit' && w?.stripe_subscription_id === null, `${r.status} ${j(w)}`)
    T('EG-3e crédits ramenés à ceux de l’Essai', w?.credits === 3, `credits = ${w?.credits}`)
    T('EG-3e rien d’autre n’est touché', Object.keys(w || {}).every((k) => ['plan', 'stripe_subscription_id', 'credits'].includes(k)) && !e.base.some((x) => x.action === 'delete'), j(w))
    T('EG-3e entreprise prévenue', e.notifs.some((n) => /fin d.essai sans carte/i.test(n.sujet)), j(e.notifs.map((n) => n.sujet)))
  }
  {
    const o = OFFRES[0]
    const t = Math.floor(Date.now() / 1000)
    neuf({ artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'T', plan: 'essentiel', credits: 60, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_nouveau' } })
    const r = await envoyer(evt('customer.subscription.deleted', abonnement(o, { status: 'canceled', trial_end: t - 40 * 86_400, ended_at: t - 5 })))
    const w = ecrituresArtisans()[0]?.payload
    T('EG-3f abonnement payé puis résilié : plan gratuit, crédits intacts', r.status === 200 && w?.plan === 'gratuit' && w?.stripe_subscription_id === null && !('credits' in w), `${r.status} ${j(w)}`)
  }
  {
    const o = OFFRES[2]
    neuf({ artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'T', plan: 'signature', credits: 100, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_nouveau' } })
    const r = await envoyer(evt('customer.subscription.updated', abonnement(o, { status: 'incomplete_expired', trial_end: null })))
    const w = ecrituresArtisans()[0]?.payload
    T('EG-3g incomplete_expired : retour à l’Essai', r.status === 200 && w?.plan === 'gratuit' && w?.stripe_subscription_id === null, `${r.status} ${j(w)}`)
    neuf({ artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'T', plan: 'signature', credits: 100, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_nouveau' } })
    await envoyer(evt('customer.subscription.updated', abonnement(o, { status: 'canceled', trial_end: null })))
    T('EG-3g canceled (updated) : retour à l’Essai', ecrituresArtisans()[0]?.payload?.plan === 'gratuit')
  }
  {
    const o = OFFRES[0]
    const t = Math.floor(Date.now() / 1000)
    neuf({ artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'T', plan: 'studio', credits: 100, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_courant' } })
    const r = await envoyer(evt('customer.subscription.deleted', abonnement(o, { id: 'sub_ancien', status: 'canceled', trial_end: t - 10, ended_at: t - 5 })))
    T('EG-3h fin d’un ANCIEN abonnement ignorée', r.status === 200 && ecrituresArtisans().length === 0, `${r.status} ${j(ecrituresArtisans().map((x) => x.payload))}`)
  }
  {
    const o = OFFRES[1]
    const e = neuf({ artisan: { id: UID, email: 'neuf@exemple.fr', nom: 'T', plan: 'essentiel', credits: 10, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_premier' } })
    const r = await envoyer(evt('checkout.session.completed', sessionEssai(o, { subscription: 'sub_second' })))
    T('EG-3i second essai pour un compte déjà abonné : annulé chez Stripe', r.status === 200 && e.annulations.includes('sub_second'), `${r.status} annulations = ${j(e.annulations)}`)
    T('EG-3i … et le compte n’est pas écrasé', ecrituresArtisans().length === 0, j(ecrituresArtisans().map((x) => x.payload)))
  }
  {
    const o = OFFRES[1]
    const fin = Math.floor(Date.now() / 1000) + 3 * 86_400
    const e = neuf({ artisan: { id: UID, email: 'artisan@exemple.fr', nom: 'T', plan: 'studio', credits: 100, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_nouveau' } })
    const r = await envoyer(evt('customer.subscription.trial_will_end', abonnement(o, { trial_end: fin, default_payment_method: null })))
    const a = e.alertes.find((x) => x.a && x.a.email === 'artisan@exemple.fr')
    T('EG-3j fin d’essai proche, sans carte : l’artisan est prévenu', r.status === 200 && !!a && /essai gratuit/i.test(a.sujet) && /carte/i.test(a.corps) && /sans carte/i.test(a.corps) && /Essai/.test(a.corps), j(e.alertes))
    const e2 = neuf({ artisan: { id: UID, email: 'artisan@exemple.fr', nom: 'T', plan: 'studio', credits: 100, stripe_customer_id: 'cus_nouveau', stripe_subscription_id: 'sub_nouveau' }, clients: { cus_nouveau: { id: 'cus_nouveau', invoice_settings: { default_payment_method: 'pm_1' } } } })
    await envoyer(evt('customer.subscription.trial_will_end', abonnement(o, { trial_end: fin, default_payment_method: null })))
    T('EG-3j déjà une carte : aucun message', e2.alertes.length === 0, j(e2.alertes))
  }
  T('EG-3k aucun appel réseau, aucune clé Stripe', reseau.length === 0 && !process.env.STRIPE_SECRET_KEY, `réseau : ${reseau.join(', ')}`)

  fs.writeFileSync(sortie, JSON.stringify({ fatal: null, verifs }))
  process.exit(0)
}

if (args[0] === '--sonde') { await sonde(args[1], args[2]) }

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
//  MODE JUGE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const RACINE = process.cwd()
let ok = 0, ko = 0
const T = (nom, cond, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${nom}`) } else { ko++; console.log(`  ❌ ${nom}${detail ? `\n     → ${detail}` : ''}`) } }
const lire = (rel, racine = RACINE) => fs.readFileSync(path.join(racine, rel), 'utf8').replace(/\r\n/g, '\n')
const LOADER = pathToFileURL(path.join(RACINE, 'scripts', 'ts-loader.mjs')).href

/** Joue la sonde sur une racine ; rend { fatal, verifs }. */
function jouer(racine) {
  const sortie = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'eg-sortie-')), 'sortie.json')
  const env = { ...process.env }
  delete env.STRIPE_SECRET_KEY
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', LOADER, ICI, '--sonde', racine, sortie], { cwd: racine, encoding: 'utf8', timeout: 240_000, env })
  if (!fs.existsSync(sortie)) return { fatal: `la sonde n'a rien écrit (code ${r.status}) : ${(r.stderr || '').slice(-600)}`, verifs: [] }
  return JSON.parse(fs.readFileSync(sortie, 'utf8'))
}

console.log('\n— EG-1 à EG-3 : la sonde (règles, Checkout, webhook) sur le dépôt —')
const base = jouer(RACINE)
if (base.fatal) T('la sonde s’exécute', false, base.fatal)
else {
  const groupes = new Map()
  for (const v of base.verifs) { const g = v.id.slice(0, 4); (groupes.get(g) || groupes.set(g, []).get(g)).push(v) }
  for (const [g, vs] of groupes) {
    const rouges = vs.filter((v) => !v.ok)
    if (!rouges.length) T(`${g} : ${vs.length} contrôles`, true)
    else for (const v of rouges) T(v.id, false, v.detail)
  }
  T('la sonde a bien joué ses contrôles (plus de 90)', base.verifs.length > 90, `${base.verifs.length} contrôles`)
}

// ── EG-4 : lecture statique ──
console.log('\n— EG-4 : migration, lanceur, textes —')
{
  const mig = fs.existsSync(path.join(RACINE, 'supabase/migrations/0156_essais_gratuits.sql')) ? lire('supabase/migrations/0156_essais_gratuits.sql') : ''
  const nu = mig.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  T('0156 : la table existe, une ligne par empreinte d’e-mail', /create table if not exists public\.essais_gratuits/.test(nu) && /email_hash text primary key/.test(nu))
  T('0156 : RLS activée, rien pour anon / authenticated, service_role seul', /enable row level security/.test(nu) && /revoke all on public\.essais_gratuits from[^;]*anon[^;]*authenticated/.test(nu) && /grant [^;]*on public\.essais_gratuits to service_role/.test(nu))
  T('0156 : pas de clé étrangère vers artisans (la mémoire survit au compte)', !/references\s+(public\.)?artisans/i.test(nu))
  const lanceur = lire('scripts/tout-verifier.mjs')
  T('le juge est dans le tableau SUITES de tout-verifier.mjs', /scripts\/essais-gratuits-qa\.mjs/.test(lanceur.split('const retenues')[0]))

  const fichiersSource = []
  const marcher = (dir) => { for (const e of fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) { if (!['node_modules', '.next'].includes(e.name)) marcher(p) } else if (/\.(tsx?|mjs)$/.test(e.name)) fichiersSource.push(p) } }
  marcher('app'); marcher('lib'); marcher('components')
  const lignes = (f) => lire(f).split('\n').map((l, i) => ({ f, n: i + 1, l })).filter(({ l }) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  const toutes = fichiersSource.flatMap(lignes)
  const durs = toutes.filter(({ f, l }) => f !== 'lib/plans.ts' && /\b(7|14|21)\s+jours\s+gratuits?\b/i.test(l))
  T('« N jours gratuits » jamais écrit en dur hors de lib/plans.ts (tout dérive de ESSAI_JOURS)', durs.length === 0, durs.map((x) => `${x.f}:${x.n}`).join(', '))
  const dites = toutes.filter(({ l }) => /jours gratuits, sans carte/i.test(l))
  T('« jours gratuits, sans carte » seulement à côté de ESSAI_JOURS', dites.length >= 2 && dites.every(({ l }) => /ESSAI_JOURS/.test(l)), dites.filter((x) => !/ESSAI_JOURS/.test(x.l)).map((x) => `${x.f}:${x.n}`).join(', '))
  const abo = lire('app/abonnement/page.tsx')
  T('/abonnement : l’essai ne s’affiche que si le serveur le confirme (GET /api/subscribe)', /essai\s*&&\s*!current\s*\?[^\n]*jours gratuits, sans carte/.test(abo) && /essai\s*\?\s*`Essayer/.test(abo) && /fetch\('\/api\/subscribe'/.test(abo))
  const carte = toutes.filter(({ l }) => /sans carte/i.test(l))
  const PERMIS = new Set(['app/page.tsx', 'app/abonnement/page.tsx', 'app/cgu/page.tsx', 'app/parametres/SectionAbonnement.tsx', 'lib/aide.ts', 'lib/faq.ts', 'lib/plans.ts', 'lib/comparatifConcurrents.ts', 'lib/crieur/faits.ts', 'lib/essaiGratuitServeur.ts', 'app/api/stripe/webhook/route.ts'])
  const intrus = carte.filter((x) => !PERMIS.has(x.f))
  T('« sans carte » : uniquement dans les fichiers relus (offre d’Essai gratuite ou essai des abonnements)', intrus.length === 0, intrus.map((x) => `${x.f}:${x.n}`).join(', '))
  const gratuitSeul = carte.filter(({ f, l }) => ['app/page.tsx', 'lib/plans.ts', 'lib/crieur/faits.ts'].includes(f) && !/ESSAI_JOURS/.test(l))
  const sansPreuve = gratuitSeul.filter(({ l }) => !(/3 crédits|Essai offert|Essai gratuit|vraies demandes|crédits offerts|3 réponses ou devis|3 devis offerts|juger les devis chiffrés|maquette/i.test(l) || /Sans carte<\/b>/.test(l)))
  T('« sans carte » hors ESSAI_JOURS : seulement l’offre d’Essai (3 crédits) ou la maquette — jamais une offre payante', sansPreuve.length === 0, sansPreuve.map((x) => `${x.f}:${x.n} ${x.l.trim().slice(0, 90)}`).join(' | '))
  T('les CGU disent l’essai, une fois par compte, sans prélèvement sans carte', /Essai gratuit sans carte/.test(lire('app/cgu/page.tsx')) && /une seule fois par compte/.test(lire('app/cgu/page.tsx')))
}

// ── EG-6 (15/10) : ce que l'essai ouvre — « Ma plateforme » et « Mes chiffres » commencent avec Studio ──
// L'essai sans carte sert le plan PAYANT lui-même (webhook : `plan` = celui de l'offre essayée), donc les capacités de l'offre : l'essai
// de Studio ouvre « Ma plateforme » et « Mes chiffres », celui de Signature y ajoute leurs automatisations, celui d'Essentiel et l'Essai
// (retour à `gratuit` à la fin d'un essai sans carte) n'ouvrent ni l'un ni l'autre. Une seule règle : lib/plans.ts.
console.log("\n— EG-6 : l'essai et les écrans « Ma plateforme » / « Mes chiffres » —")
{
  const plansMod = await import(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)
  const { peut } = plansMod
  const hook = lire('app/api/stripe/webhook/route.ts')
  T("l'essai sert le plan payant lui-même (plan écrit tel quel, jamais « gratuit » avant la fin)", /^\s+plan,\s*$/m.test(hook))
  T('un essai sans carte non converti ramène le compte à « gratuit »', /plan: 'gratuit'/.test(hook))
  for (const [plan, ecrans, auto] of [['essentiel', false, false], ['studio', true, false], ['signature', true, true], ['gratuit', false, false]]) {
    T(`essai ${plan} : « Ma plateforme » et « Mes chiffres » ${ecrans ? 'ouverts' : 'fermés'}, automatique de Mes chiffres ${auto ? 'ouvert' : 'fermé'}`,
      peut(plan, 'plateforme.gestion') === ecrans && peut(plan, 'chiffres') === ecrans && peut(plan, 'chiffres.auto') === auto)
  }
  T("l'Essai (gratuit) n'a pas plus que l'Essentiel : mêmes capacités", JSON.stringify([...plansMod.PLANS.gratuit.capacites].sort()) === JSON.stringify([...plansMod.PLANS.essentiel.capacites].sort()))
  const ev = lire('app/EcranVerrouille.tsx')
  T("l'écran verrouillé parle de « votre essai » pour le plan gratuit", /votre essai/.test(ev))
}

// ── EG-5 : le juge sait rougir ──
if (!args.includes('--sans-mutations')) {
  console.log('\n— EG-5 : 13 mutations, chacune doit être vue —')
  const MUTATIONS = [
    { nom: 'la durée de Studio passe de 14 à 15 jours', fichier: 'lib/plans.ts', de: 'studio: 14,', vers: 'studio: 15,', attendu: 'EG-1a' },
    { nom: 'le Checkout redemande la carte', fichier: 'lib/essaiGratuit.ts', de: "payment_method_collection: 'if_required',\n    jours,", vers: "payment_method_collection: 'always',\n    jours,", attendu: 'EG-2a' },
    { nom: 'sans carte à la fin, Stripe ne résilie plus', fichier: 'lib/essaiGratuit.ts', de: "trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } },\n  }", vers: "trial_settings: { end_behavior: { missing_payment_method: 'create_invoice' } } },\n  }", attendu: 'EG-2a' },
    { nom: 'le Checkout oublie subscription_data de l’essai', fichier: 'app/api/subscribe/route.ts', de: '...(essai.subscription_data ?? {}) },', vers: '},', attendu: 'EG-2a' },
    { nom: 'le registre des essais est ignoré', fichier: 'lib/essaiGratuitServeur.ts', de: 'faits.essaiDejaPris = (parCompte.data?.length ?? 0) > 0 || (parEmail.data?.length ?? 0) > 0', vers: 'faits.essaiDejaPris = false', attendu: 'EG-2b' },
    { nom: 'Stripe injoignable ouvre quand même l’essai', fichier: 'lib/essaiGratuitServeur.ts', de: 'faits.verificationImpossible = true', vers: 'faits.verificationImpossible = false', attendu: 'EG-2c' },
    { nom: 'l’« +étiquette » d’un e-mail ne compte plus', fichier: 'lib/essaiGratuit.ts', de: "local = local.split('+')[0]\n", vers: '', attendu: 'EG-1c' },
    { nom: 'l’essai sert le forfait entier de crédits', fichier: 'app/api/stripe/webhook/route.ts', de: 'credits: Math.max(avant?.credits ?? 0, creditsEssai(plan))', vers: 'credits: Math.max(avant?.credits ?? 0, conf.creditsMois)', attendu: 'EG-3a' },
    { nom: 'un abonnement « trialing » est réaligné (crédits servis)', fichier: 'app/api/stripe/webhook/route.ts', de: "if (sub.status === 'trialing') {", vers: 'if (false) {', attendu: 'EG-3c' },
    { nom: 'l’essai qui devient payant ne sert plus le forfait', fichier: 'app/api/stripe/webhook/route.ts', de: 'if (essaiDevenuPayant(statutAvant, sub.status)) await essaiDevenuAbonnement(sub)', vers: '', attendu: 'EG-3d' },
    { nom: 'l’essai perdu garde ses crédits', fichier: 'app/api/stripe/webhook/route.ts', de: '...(essaiPerdu ? { credits: creditsApresEssaiPerdu(enBase?.credits) } : {}),', vers: '', attendu: 'EG-3e' },
    { nom: 'incomplete_expired / canceled ne ramènent plus à l’Essai', fichier: 'app/api/stripe/webhook/route.ts', de: 'if (abonnementFerme(sub.status)) {', vers: 'if (false) {', attendu: 'EG-3g' },
    { nom: 'un second essai n’est plus annulé', fichier: 'app/api/stripe/webhook/route.ts', de: "if (joursEssai && abo && avant?.stripe_subscription_id && avant.stripe_subscription_id !== abo) {", vers: 'if (false) {', attendu: 'EG-3i' },
  ]
  const copier = (src, dst) => fs.cpSync(src, dst, { recursive: true, filter: (p) => !/[\\/](node_modules|\.next|\.git)([\\/]|$)/.test(p) })
  for (const m of MUTATIONS) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eg-mutation-'))
    try {
      copier(path.join(RACINE, 'lib'), path.join(tmp, 'lib'))
      for (const d of ['app/api/subscribe', 'app/api/stripe']) copier(path.join(RACINE, d), path.join(tmp, d))
      for (const f of ['package.json', 'tsconfig.json']) fs.copyFileSync(path.join(RACINE, f), path.join(tmp, f))
      fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(tmp, 'node_modules'), 'junction')
      fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true })
      const cible = path.join(tmp, m.fichier)
      const src = fs.readFileSync(cible, 'utf8').replace(/\r\n/g, '\n')
      if (!src.includes(m.de)) { T(`mutation « ${m.nom} »`, false, `sonde cassée : le texte à muter n'existe plus dans ${m.fichier}`); continue }
      fs.writeFileSync(cible, src.replace(m.de, () => m.vers))
      const r = jouer(tmp)
      if (r.fatal) { T(`mutation « ${m.nom} »`, false, `la copie mutée ne s'exécute pas (ce n'est pas une preuve) : ${r.fatal.split('\n')[0]}`); continue }
      const rouges = r.verifs.filter((v) => !v.ok)
      const vu = rouges.some((v) => v.id.startsWith(m.attendu))
      T(`mutation « ${m.nom} » → vue (${m.attendu})`, vu, rouges.length ? `rouge ailleurs : ${rouges.slice(0, 3).map((v) => v.id).join(', ')}` : 'le juge est resté vert : il ne voit pas cette panne')
    } finally {
      // La jonction vers node_modules se retire d'abord (rmdir ne la suit jamais) ; si elle résiste, on laisse le dossier temporaire en paix.
      let libre = false
      try { fs.rmdirSync(path.join(tmp, 'node_modules')); libre = true } catch { libre = !fs.existsSync(path.join(tmp, 'node_modules')) }
      if (libre) { try { fs.rmSync(tmp, { recursive: true, force: true }) } catch { /* ménage best-effort */ } }
    }
  }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} essais-gratuits-qa : ${ok} réussis, ${ko} échoués`)
process.exit(ko === 0 ? 0 : 1)
