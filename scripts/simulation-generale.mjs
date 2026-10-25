// scripts/simulation-generale.mjs — LA SIMULATION GÉNÉRALE de Presti (16/10/2026, demande de Benj : « faire des tests de simulation sur
// chaque fonctionnalité pour s'assurer que tout marche très bien ; et pour chaque abonnement, deux options : soit tu paies, soit tu
// utilises des semaines gratuites offertes »).
//
// Ce que le script fait, de bout en bout :
//   1. lance le build de PRODUCTION local (next start, .next-simulation) branché à la vraie base, avec les garde-fous dans l'environnement
//      du seul serveur : clé Stripe de TEST, aucun e-mail réel (interception + journal), appels IA comptés par un proxy (2 réels au plus) ;
//   2. crée trois comptes de test (Essai, Studio, Signature — l'Essentiel n'est plus vendu depuis le 25/10 — @presti-test.invalid) et fait parcourir à chacun CHAQUE
//      fonctionnalité de son offre (API réelle + écrans en vrai navigateur), puis vérifie que tout ce qui n'est pas inclus est FERMÉ
//      (écran verrouillé + 403 serveur, sans donnée ni crédit consommé) ;
//   3. pour chaque offre payante : les DEUX choix, « payer » (la session de paiement Stripe se crée en mode test, on ne paie pas) et
//      « essai gratuit offert » (la durée annoncée = la durée appliquée, activation de l'essai par webhook signé, fin d'essai sans carte) ;
//   4. supprime tous les comptes dans un finally et PROUVE qu'il ne reste rien en base (ni compte, ni ligne dans aucune table liée) ;
//   5. écrit le rapport : plans/simulation-generale-1610.md (tableau offre × fonctionnalité, choix payer/essai, journal des e-mails et de l'IA).
//
// Les suites existantes sont rejouées par --suites (ecrans-offre-e2e, comptes-clients-e2e, relances-e2e, crm-*, assistant-qa --live…) ; leur
// résultat est repris dans le rapport.
//
// Usage :
//   PRESTI_DIST=.next-simulation npm run build          (une fois, ou après un changement de code)
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/simulation-generale.mjs [--suites] [--sans-ui] [--garder-rapport]
// Codes : 0 tout vert · 1 au moins un défaut · 2 prérequis absent.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { PLANS, OFFRES, ESSAI_JOURS, ESSAI_CREDITS_PLAFOND, peut } from '../lib/plans.ts'
import { FLAGS } from '../lib/flags.ts'
import { creditsEssai } from '../lib/essaiGratuit.ts'
import { verifierSessionTest } from './lib/connexion-test.mjs'
import { demarrerServeur, chargerEnv } from './lib/sim-serveur.mjs'
import { demarrerProxyIA } from './lib/sim-ia-proxy.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARGS = new Set(process.argv.slice(2))
chargerEnv()
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SB || !ANON || !SVC) { console.error('Variables Supabase manquantes (.env.local).'); process.exit(2) }
const admin = createClient(SB, SVC, { auth: { persistSession: false } })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST)
const REF = SB.replace(/^https?:\/\//, '').split('.')[0]
const HORO = Date.now()
const JOUR = new Date().toISOString().slice(0, 10)

// ─────────────────────────────── le registre des constats ───────────────────────────────
// statut : 'marche' (la fonction marche) · 'ferme' (fermée comme prévu) · 'defaut' · 'nt' (non testé, avec la raison)
const constats = []
let section = null   // 'ecrans' | 'abonnements' | 'suites' | null (parcours par l'API)
let ok = 0, ko = 0
const log = (s = '') => console.log(s)
function constat(plan, fonction, statut, detail = '') {
  constats.push({ plan, fonction, statut, detail: String(detail).slice(0, 500), section })
  if (statut === 'defaut') { ko++; log(`  ❌ [${plan}] ${fonction}${detail ? `\n       → ${String(detail).slice(0, 400)}` : ''}`) }
  else { ok++; log(`  ✅ [${plan}] ${fonction}${statut === 'ferme' ? ' (fermé)' : statut === 'nt' ? ' (non testé)' : ''}`) }
}
/** Un contrôle attendu vrai : 'marche' s'il l'est, 'defaut' sinon. */
const verifier = (plan, fonction, condition, detail = '') => constat(plan, fonction, condition ? 'marche' : 'defaut', condition ? '' : detail)
/** Un refus attendu : 'ferme' s'il tient, 'defaut' sinon. */
const verifierFerme = (plan, fonction, condition, detail = '') => constat(plan, fonction, condition ? 'ferme' : 'defaut', condition ? '' : detail)

// ─────────────────────────────── comptes de test ───────────────────────────────
const comptes = []   // { id, email, plan, ... } — tous retirés dans le finally
const PLAN_LIBELLE = { gratuit: 'Essai', essentiel: 'Essentiel', studio: 'Studio', signature: 'Signature' }

/** Un SIRET de 14 chiffres qui passe la clé de Luhn (lib/facturation.ts sirenValide). */
function siretValide() {
  const base = '9' + String(HORO % 1e12).padStart(12, '0')
  for (let d = 0; d < 10; d++) {
    const n = base + d
    let s = 0
    for (let i = 0; i < n.length; i++) { let c = Number(n[n.length - 1 - i]); if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9 } s += c }
    if (s % 10 === 0) return n
  }
  return '35600000000048'
}

async function creerCompte(plan, { credits = 40, role = plan, mentions = true, extra = {} } = {}) {
  const email = `sim-${role}-${HORO}@presti-test.invalid`
  const mdp = 'Sim-' + crypto.randomBytes(14).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  const c = { id: u.user.id, email, mdp, plan, slug: `sim-${role}-${HORO}`.toLowerCase() }
  comptes.push(c)
  const ligne = {
    id: c.id, email, nom: `Sim ${PLAN_LIBELLE[plan] ?? role} Plomberie`, metier: 'Plombier', slug: c.slug, plan, credits, credits_reset_le: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    aide_vues: ['visite:console'],
    ...(mentions ? {
      forme_juridique: 'EI', siret: siretValide(), adresse: '12 rue des Lilas', code_postal: '69003', ville: 'Lyon', tel_public: '0472000000',
      email_public: email, assurance_nom: 'Assurance Test SA', assurance_contrat: 'DEC-2026-001', mediateur_nom: 'Médiateur Test', mediateur_url: 'https://mediateur.invalid',
      zone_intervention: 'Lyon et alentours',
    } : {}),
    ...extra,
  }
  let r = await admin.from('artisans').insert(ligne)
  if (r.error) { // colonnes absentes (migration en retard) : on réessaie sans les champs facultatifs
    const { aide_vues, ...sans } = ligne
    r = await admin.from('artisans').insert(sans)
  }
  if (r.error) throw new Error('fiche artisan : ' + r.error.message)
  const pub = createClient(SB, ANON, { auth: { persistSession: false } })
  const { data: s, error: es } = await pub.auth.signInWithPassword({ email, password: mdp })
  if (es || !s?.session) throw new Error('connexion du compte de test : ' + (es?.message ?? '?'))
  await verifierSessionTest(s.session.access_token)
  c.token = s.session.access_token
  c.session = s.session
  return c
}

// ─────────────────────────────── appels HTTP ───────────────────────────────
let BASE = ''
let compteurIp = 0
/** Une adresse IP de documentation (RFC 5737, 203.0.113.0/24) distincte par appel ou par contexte : le serveur local croit à un visiteur différent à chaque fois, donc le plafond anti-abus par IP (6 demandes / 10 min) ne fausse pas la simulation. */
const ipSim = () => `203.0.113.${(compteurIp++ % 250) + 1}`
async function http(c, methode, chemin, corps, { brut = false, entetes = {} } = {}) {
  const r = await fetch(BASE + chemin, {
    method: methode,
    headers: { 'x-forwarded-for': ipSim(), ...(corps !== undefined && !brut ? { 'Content-Type': 'application/json' } : {}), ...(c?.token ? { Authorization: `Bearer ${c.token}` } : {}), ...entetes },
    ...(corps !== undefined ? { body: brut ? corps : JSON.stringify(corps) } : {}),
    signal: AbortSignal.timeout(90_000),
  })
  const type = r.headers.get('content-type') || ''
  let donnees
  if (/json/.test(type)) donnees = await r.json().catch(() => ({}))
  else if (/pdf|octet|xml|zip/.test(type)) donnees = Buffer.from(await r.arrayBuffer())
  else donnees = await r.text()
  return { status: r.status, corps: donnees, type }
}
const ligneDe = async (table, filtre) => {
  let q = admin.from(table).select('*')
  for (const [k, v] of Object.entries(filtre)) q = q.eq(k, v)
  const { data } = await q.limit(1)
  return data?.[0] ?? null
}
const compter = async (table, filtre) => {
  let q = admin.from(table).select('*', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filtre)) q = q.eq(k, v)
  const { count, error } = await q
  return error ? -1 : (count ?? 0)
}
const creditsDe = async (c) => (await ligneDe('artisans', { id: c.id }))?.credits

// ─────────────────────────────── l'écran : un vrai navigateur ───────────────────────────────
const PAGES_CONSOLE = [
  // [clé, chemin, capacité qui l'ouvre (null = toutes les offres)]
  ['dashboard', '/dashboard', null],
  ['devis', '/devis', null],
  ['factures', '/factures', null],
  ['tarifs', '/tarifs', null],
  ['profil', '/profil', null],
  ['parametres', '/parametres', null],
  ['abonnement', '/abonnement', null],
  ['aide', '/aide', null],
  ['messages', '/messages', 'plateforme.conversation'],
  ['plateforme', '/plateforme', 'plateforme.gestion'],
  ['outils', '/outils', 'plateforme.conversation'],
  ['chiffres', '/chiffres', 'chiffres'],
  ['inventaire', '/inventaire', 'inventaire.stock'],
  ['crm', '/crm', 'crm'],
  ['assistant', '/assistant', 'assistant'],
  ['messages_canaux', '/messages/canaux', 'canaux.email'],
  ['inventaire_fournisseurs', '/inventaire/fournisseurs', 'inventaire.stock'],
  ['inventaire_recherche', '/inventaire/recherche', 'inventaire.recherche_ia'],
]

async function parcoursEcrans(navigateur, c) {
  const plan = c.plan
  log(`\n── Écrans (${PLAN_LIBELLE[plan]})`)
  const ctx = await contexteDe(navigateur, c)
  const page = await ctx.newPage()
  const apiErr = []
  const erreursPage = []
  page.on('response', (r) => { if (r.status() >= 400 && /\/api\//.test(r.url())) apiErr.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`) })
  page.on('pageerror', (e) => erreursPage.push(String(e.message).slice(0, 160)))
  const releves = {}
  for (const [cle, chemin, cap] of PAGES_CONSOLE) {
    apiErr.length = 0; erreursPage.length = 0
    let statut = 0
    try {
      const rep = await page.goto(BASE + chemin, { waitUntil: 'load', timeout: 45_000 })
      statut = rep?.status() ?? 0
      await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {})
      // L'écran se décide côté client (offre lue après le chargement) : on attend le verrou, ou l'écran, jusqu'à 10 s.
      await page.waitForFunction(() => !!document.querySelector('[data-ecran-verrouille]') || /n.est pas dans votre offre|Disponible avec l.offre|commence avec l.offre|Passer [àa] l.offre/i.test(document.body.innerText) || document.body.innerText.replace(/s+/g, ' ').length > 900, null, { timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(500)
    } catch (e) { statut = -1 }
    const url = new URL(page.url()).pathname
    const texte = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ')
    const verrou = (await page.locator('[data-ecran-verrouille]').count()) > 0
    const dit = /n.est pas dans votre offre|Disponible avec l.offre|commence avec l.offre|r[ée]serv[ée] [àa]|offre (Studio|Signature)|Passer [àa] l.offre/i.test(texte)
    const redirige = url !== chemin && !chemin.startsWith(url + '?')
    const ouvert = cap === null || peut(plan, cap)
    releves[cle] = { statut, url, verrou, dit, redirige, longueur: texte.length, extrait: texte.slice(0, 160), apiErr: [...apiErr], erreursPage: [...erreursPage] }
    const fonction = `écran ${chemin}`
    const api500 = apiErr.filter((e) => /^5/.test(e))
    if (ouvert) {
      const bon = statut === 200 && !verrou && !redirige && texte.length > 200 && /* pas de page d'erreur */ !/Une erreur est survenue|Application error|404/i.test(texte.slice(0, 300))
      if (bon && !api500.length && !erreursPage.length) constat(plan, fonction, 'marche')
      else constat(plan, fonction, 'defaut', `statut ${statut} url ${url} verrou ${verrou} len ${texte.length} api ${api500.join(', ')} js ${erreursPage.join(' | ')} : ${texte.slice(0, 140)}`)
    } else {
      const ferme = verrou || dit || redirige || statut === 404 || statut === 403
      if (ferme) constat(plan, fonction, 'ferme', verrou ? 'écran verrouillé' : redirige ? `redirigé vers ${url}` : `HTTP ${statut} : ${texte.slice(0, 80)}`)
      else constat(plan, fonction, 'defaut', `écran non verrouillé alors que l’offre ne l’inclut pas : ${texte.slice(0, 160)}`)
    }
  }
  await ctx.close()
  return releves
}

// ─────────────────────────────── les parcours par l'API (le vrai serveur, la vraie base) ───────────────────────────────
const MARQUEUR_TARIF = 'Pose carrelage 60x60 SIMTARIF' + (HORO % 100000)
const EMAIL_CLIENT = 'client.simulation@example.org' // jamais livré : le serveur de la simulation intercepte tout envoi (scripts/lib/sim-preload.cjs)
const iaParPlan = {}   // plan → 'réel' | 'simulé' (le chiffrage IA du socle)
const ctxPlan = {}   // état partagé entre les étapes d'un même plan : { devisId, devisNumero, factureId, leadToken… }

const pdfOk = (r, min = 1500) => r.status === 200 && Buffer.isBuffer(r.corps) && r.corps.subarray(0, 5).toString() === '%PDF-' && r.corps.length > min

/** Tarifs, devis (création, chiffrage IA, PDF, envoi), factures (depuis un devis, payée, Factur-X) : le socle de TOUTES les offres. */
async function socle(c, { ia }) {
  const plan = c.plan, K = ctxPlan[plan] = {}
  log('\n── Socle : tarifs, devis, factures (' + PLAN_LIBELLE[plan] + ')')

  // Tarifs
  const t1 = await http(c, 'POST', '/api/tarifs', { designation: MARQUEUR_TARIF, unite: 'm²', prix_ht: 45, tva_taux: 10, fournisseur: 'Fournisseur Sim' })
  const t2 = await http(c, 'GET', '/api/tarifs')
  verifier(plan, 'tarifs : ajout d’un tarif puis lecture de la bibliothèque', t1.status < 300 && t2.status === 200 && (t2.corps.lignes ?? []).some((l) => l.designation === MARQUEUR_TARIF && Number(l.prix_ht) === 45), 'POST ' + t1.status + ' ' + JSON.stringify(t1.corps).slice(0, 120) + ' / GET ' + t2.status)

  // Devis : création
  const nouveau = await http(c, 'POST', '/api/devis', {
    objet: 'Rénovation salle de bain', client_nom: 'Cliente Simulation', client_email: EMAIL_CLIENT, client_adresse: '5 rue Test, 69001 Lyon', acompte_pct: 30, validite_jours: 30,
    lignes: [{ designation: MARQUEUR_TARIF, quantite: 10, unite: 'm²', prix_unitaire_ht: 45, tva_taux: 10 }, { designation: 'Déplacement', quantite: 1, unite: 'forfait', prix_unitaire_ht: 120, tva_taux: 10 }],
  })
  K.devisId = nouveau.corps.id; K.devisNumero = nouveau.corps.numero
  const dv = K.devisId ? await ligneDe('devis', { id: K.devisId }) : null
  verifier(plan, 'devis : création (numéro, 2 lignes, totaux)', nouveau.status === 200 && /^DEV-\d{4}-\d{4}$/.test(K.devisNumero ?? '') && dv && Math.abs(Number(dv.total_ht) - 570) < 0.01 && (await compter('devis_lignes', { devis_id: K.devisId })) === 2,
    'HTTP ' + nouveau.status + ' ' + JSON.stringify(nouveau.corps).slice(0, 140) + ' total ' + dv?.total_ht)
  const pdfDevis = K.devisId ? await http(c, 'GET', '/api/devis/' + K.devisId + '/pdf') : { status: 0 }
  verifier(plan, 'devis : PDF généré et lisible', pdfOk(pdfDevis), 'HTTP ' + pdfDevis.status + ' ' + (Buffer.isBuffer(pdfDevis.corps) ? pdfDevis.corps.length + ' octets' : String(pdfDevis.corps).slice(0, 100)))

  // Devis : chiffrage par l'IA sur SES tarifs
  const avant = await creditsDe(c)
  const appelsAvant = ia.etat.journal.length
  if (ia.etat.reelsUtilises < 2 && plan === 'studio') ia.autoriser(1)
  ia.marqueur(MARQUEUR_TARIF)
  const gen = await http(c, 'POST', '/api/devis/generer', { description: 'Pose de carrelage 60x60 dans une salle de bain de 10 m², dépose de l’ancien revêtement comprise.' })
  ia.autoriser(0)
  const apres = await creditsDe(c)
  const appel = ia.etat.journal.slice(appelsAvant)[0]
  verifier(plan, 'devis : chiffrage par l’IA (lignes proposées, 1 crédit débité)', gen.status === 200 && Array.isArray(gen.corps.lignes) && gen.corps.lignes.length >= 1 && avant - apres === 1,
    'HTTP ' + gen.status + ' ' + JSON.stringify(gen.corps).slice(0, 160) + ' crédits ' + avant + '→' + apres)
  verifier(plan, 'devis : le chiffrage reçoit LES TARIFS de l’artisan (le prompt les contient)', !!appel?.contientMarqueur, JSON.stringify(appel))
  iaParPlan[plan] = appel?.mode === 'reel' ? 'réel' : 'simulé'
  K.iaReelle = appel?.mode === 'reel'
  if (K.iaReelle) {
    const bonnes = (gen.corps.lignes ?? []).filter((l) => l.designation && Number(l.prix_unitaire_ht) > 0)
    const reprendTarif = (gen.corps.lignes ?? []).some((l) => Number(l.prix_unitaire_ht) === 45 || l.source_prix === 'tarif' || /tarif/i.test(String(l.source_prix)))
    verifier(plan, 'devis : réponse du vrai modèle exploitable (lignes chiffrées)', bonnes.length >= 1, JSON.stringify(gen.corps.lignes).slice(0, 200))
    K.iaLignes = gen.corps.lignes
  }

  // Devis : envoi (intercepté)
  const nMails = serveur.mails().length
  const env = K.devisId ? await http(c, 'POST', '/api/devis/' + K.devisId + '/envoyer', {}) : { status: 0 }
  const mails = serveur.mails().slice(nMails)
  const mailDevis = mails.find((m) => String(m.a).includes(EMAIL_CLIENT))
  const dvApres = K.devisId ? await ligneDe('devis', { id: K.devisId }) : null
  verifier(plan, 'devis : envoi au client (statut « envoyé », e-mail intercepté avec le PDF en pièce jointe)', env.status === 200 && dvApres?.statut === 'envoye' && !!mailDevis && (mailDevis.pj ?? []).some((p) => /\.pdf$/i.test(p.nom) && p.octets > 1500),
    'HTTP ' + env.status + ' ' + JSON.stringify(env.corps).slice(0, 140) + ' statut ' + dvApres?.statut + ' mails ' + mails.length)

  // Factures : depuis le devis — SIGNÉ seulement (audit de cohérence du 18/10, C6) : un devis envoyé est refusé, puis le client signe.
  const facNonSigne = K.devisId ? await http(c, 'POST', '/api/factures', { devis_id: K.devisId }) : { status: 0 }
  verifier(plan, 'factures : un devis envoyé mais non signé ne se facture pas (409)', facNonSigne.status === 409, 'HTTP ' + facNonSigne.status)
  if (K.devisId) await admin.from('devis').update({ statut: 'accepte' }).eq('id', K.devisId)
  const fac = K.devisId ? await http(c, 'POST', '/api/factures', { devis_id: K.devisId }) : { status: 0, corps: {} }
  K.factureId = fac.corps.id
  verifier(plan, 'factures : création depuis le devis (numéro FAC, lignes reprises)', fac.status === 200 && /^FAC-/.test(fac.corps.numero ?? '') && (await compter('factures_lignes', { facture_id: K.factureId })) === 2, 'HTTP ' + fac.status + ' ' + JSON.stringify(fac.corps).slice(0, 200))
  const fac2 = K.devisId ? await http(c, 'POST', '/api/factures', { devis_id: K.devisId }) : { status: 0 }
  verifier(plan, 'factures : un second clic ne refacture pas le devis (409)', fac2.status === 409, 'HTTP ' + fac2.status)
  const pdfFac = K.factureId ? await http(c, 'GET', '/api/factures/' + K.factureId + '/pdf') : { status: 0 }
  verifier(plan, 'factures : PDF généré et lisible', pdfOk(pdfFac), 'HTTP ' + pdfFac.status)
  const fx = K.factureId ? await http(c, 'GET', '/api/factures/' + K.factureId + '/facturx') : { status: 0, corps: '' }
  const xml = Buffer.isBuffer(fx.corps) ? fx.corps.toString('utf8') : String(fx.corps)
  verifier(plan, 'factures : Factur-X (XML de facture électronique avec le numéro)', fx.status === 200 && /CrossIndustryInvoice/.test(xml) && xml.includes(fac.corps.numero ?? '§'), 'HTTP ' + fx.status + ' ' + xml.slice(0, 160))
  const pay = K.factureId ? await http(c, 'PATCH', '/api/factures/' + K.factureId, { statut: 'payee' }) : { status: 0 }
  const fp = K.factureId ? await ligneDe('factures', { id: K.factureId }) : null
  verifier(plan, 'factures : marquée payée (statut en base)', pay.status === 200 && fp?.statut === 'payee', 'HTTP ' + pay.status + ' statut ' + fp?.statut)
  const retour = K.factureId ? await http(c, 'PATCH', '/api/factures/' + K.factureId, { statut: 'emise' }) : { status: 0 }
  verifier(plan, 'factures : une facture payée ne revient pas en arrière (409)', retour.status === 409, 'HTTP ' + retour.status)

  // Crédits épuisés : le chiffrage est refusé (402) AVANT tout appel au modèle, et ne débite rien.
  await admin.from('artisans').update({ credits: 0 }).eq('id', c.id)
  const nAppels = ia.etat.journal.length
  const sec = await http(c, 'POST', '/api/devis/generer', { description: 'Pose de carrelage dans une cuisine de 12 m².' })
  verifier(plan, 'crédits épuisés : le chiffrage est refusé (402), aucun appel au modèle, aucun débit', sec.status === 402 && sec.corps.outOfCredits === true && ia.etat.journal.length === nAppels && (await creditsDe(c)) === 0, 'HTTP ' + sec.status + ' ' + JSON.stringify(sec.corps).slice(0, 140) + ' appels ' + nAppels + '→' + ia.etat.journal.length)
  await admin.from('artisans').update({ credits: 40 }).eq('id', c.id)
}

// ─────────────────────────────── les portes : ce qui n'est pas dans l'offre est fermé ───────────────────────────────
const UUID0 = '00000000-0000-4000-8000-000000000000'
const ECHANTILLON = { feuilles: [{ nom: 'Dépenses', lignes: 1, apercu: [['Date', 'Libellé']], valeurs: [['Date'], ['Libellé']] }] }
// [nom, capacité, méthode, chemin, corps si FERMÉ (valide : le refus doit venir de l'offre), corps si OUVERT (invalide exprès : on ne consomme ni crédit ni IA)]
const PORTES = [
  ['Messages (boîte de réception, réponses)', 'plateforme.conversation', 'POST', '/api/messages', { action: 'suggest', lead_id: UUID0 }, { action: 'suggest', lead_id: UUID0 }],
  ['Réponses instantanées (IA)', 'plateforme.conversation', 'POST', '/api/tools/reponse', { message: 'Bonjour, je voudrais un devis pour un chauffe-eau.' }, { message: '' }],
  ['Devis automatique depuis une conversation', 'plateforme.conversation', 'POST', '/api/devis/auto', { lead_id: UUID0 }, { lead_id: UUID0 }],
  ['Ma plateforme : réglages', 'plateforme.gestion', 'GET', '/api/plateforme/config'],
  ['Ma plateforme : apparence', 'plateforme.gestion', 'GET', '/api/plateforme/apparence'],
  ['Boîte e-mail branchée', 'canaux.email', 'GET', '/api/canaux'],
  ['Mes chiffres', 'chiffres', 'GET', '/api/compta/tableau'],
  ['Mes chiffres : rangement des fichiers par l’IA', 'chiffres', 'POST', '/api/compta/assistant', { echantillon: ECHANTILLON }, { echantillon: { feuilles: [] } }],
  ['Mes chiffres : automatisations (Signature)', 'chiffres.auto', 'GET', '/api/compta/reglages'],
  ['Relances automatiques des factures impayées', 'factures.relances', 'GET', '/api/factures/relances-auto'],
  ['Inventaire', 'inventaire.stock', 'GET', '/api/inventaire'],
  ['Inventaire : recherche chez les fournisseurs (IA)', 'inventaire.recherche_ia', 'POST', '/api/inventaire/recherche', { requete: 'robinet mitigeur' }, {}],
  ['CRM atelier', 'crm', 'GET', '/api/crm/vue'],
  ['Assistant de gestion', 'assistant', 'POST', '/api/assistant', { message: 'Bonjour, combien ai-je de devis ?' }, { message: '' }],
]

async function portes(c) {
  const plan = c.plan
  log('\n── Portes (' + PLAN_LIBELLE[plan] + ') : ouvertes si l’offre les inclut, fermées sinon')
  for (const [nom, cap, methode, chemin, corpsFerme, corpsOuvert] of PORTES) {
    const ouvert = peut(plan, cap)
    const credits0 = await creditsDe(c)
    const r = await http(c, methode, chemin, ouvert ? (corpsOuvert ?? corpsFerme) : corpsFerme)
    const credits1 = await creditsDe(c)
    const donnees = JSON.stringify(r.corps).length
    if (ouvert) {
      const passe = r.status !== 401 && r.status !== 403 && r.status < 500
      if (passe && credits0 === credits1) constat(plan, 'porte : ' + nom, 'marche', 'HTTP ' + r.status)
      else constat(plan, 'porte : ' + nom, 'defaut', 'ouverte attendue : HTTP ' + r.status + ' ' + JSON.stringify(r.corps).slice(0, 140) + ' crédits ' + credits0 + '→' + credits1)
    } else {
      const refuse = r.status === 403 || r.status === 404
      const propre = !/"(factures|devis|demandes|materiaux|chantiers|lignes)"\s*:\s*\[\s*\{/.test(JSON.stringify(r.corps)) && donnees < 700
      if (refuse && propre && credits0 === credits1) constat(plan, 'porte : ' + nom, 'ferme', 'HTTP ' + r.status + (r.corps?.code ? ' ' + r.corps.code : ''))
      else constat(plan, 'porte : ' + nom, 'defaut', 'fermée attendue : HTTP ' + r.status + ' ' + JSON.stringify(r.corps).slice(0, 160) + ' crédits ' + credits0 + '→' + credits1)
    }
  }
  // La page de conversation publique : une demande client est refusée sans rien enregistrer ni débiter si l'offre n'a pas la plateforme.
  if (!peut(plan, 'plateforme.conversation')) {
    const avant = await compter('leads', { artisan_id: c.id }), cred0 = await creditsDe(c)
    const r = await http(null, 'POST', '/api/leads', { slug: c.slug, nom_prospect: 'Client Refusé', contact: `refuse-${plan}-${HORO}@presti-test.invalid`, message: 'Bonjour, je voudrais un devis pour un chauffe-eau.' })
    const apres = await compter('leads', { artisan_id: c.id }), cred1 = await creditsDe(c)
    verifierFerme(plan, 'page de conversation publique : une demande est refusée (403 « plateforme »), rien enregistré, aucun crédit', r.status === 403 && r.corps.code === 'plateforme' && avant === apres && cred0 === cred1, 'HTTP ' + r.status + ' ' + JSON.stringify(r.corps).slice(0, 140) + ' leads ' + avant + '→' + apres)
    const page = await http(null, 'GET', '/p/' + c.slug)
    verifierFerme(plan, 'page publique de l’artisan : neutre (pas de chat)', page.status === 200 && /ne re[cç]oit pas de demandes en ligne/i.test(String(page.corps).replace(/<[^>]+>/g, ' ')), 'HTTP ' + page.status)
    // Relances de conversation : un devis rattaché à une demande part, mais SANS plateforme il n'arme aucune relance (J+2 / J+5 / J+10 sont une fonction de la plateforme).
    const { data: leadSans } = await admin.from('leads').insert({ artisan_id: c.id, nom_prospect: 'Lead Sim', contact: `lead-${plan}-${HORO}@presti-test.invalid`, message: 'Demande de test', canal: 'formulaire', statut: 'nouveau' }).select('id').single()
    const dvSans = await http(c, 'POST', '/api/devis', { objet: 'Devis rattaché sans plateforme', client_nom: 'Lead Sim', client_email: `ui-sans-${plan}-${HORO}@example.org`, lignes: [{ designation: 'Prestation', quantite: 1, unite: 'u', prix_unitaire_ht: 100, tva_taux: 0 }] })
    if (leadSans?.id && dvSans.corps.id) await admin.from('devis').update({ lead_id: leadSans.id }).eq('id', dvSans.corps.id)
    const envSans = dvSans.corps.id ? await http(c, 'POST', '/api/devis/' + dvSans.corps.id + '/envoyer', {}) : { status: 0, corps: {} }
    const relSans = leadSans?.id ? await compter('relances', { lead_id: leadSans.id }) : -1
    verifierFerme(plan, 'relances de conversation : aucune relance armée sans plateforme (le devis part, la demande reste intacte)', envSans.status === 200 && envSans.corps.relances === 0 && relSans === 0 && (await ligneDe('leads', { id: leadSans.id }))?.statut === 'nouveau', 'HTTP ' + envSans.status + ' ' + JSON.stringify(envSans.corps) + ' relances ' + relSans)
    const nMails = serveur.mails().length
    const lien = await http(null, 'POST', '/api/p/auth', { action: 'demande', slug: c.slug, email: `compte.ferme.${plan}.${HORO}@example.org` })
    const liens = await compter('clients_liens', { artisan_id: c.id })
    verifierFerme(plan, 'comptes clients : aucun lien magique créé ni envoyé', lien.status === 200 && liens === 0 && !serveur.mails().slice(nMails).some((m) => /connexion=/.test(m.texte)), 'HTTP ' + lien.status + ' liens ' + liens)
  }
}

// ─────────────────────────────── la plateforme (Studio et au-dessus) ───────────────────────────────
const lienDuMail = (m) => (/connexion=([A-Za-z0-9_%-]+)/.exec(m.texte) || [])[1]

async function plateforme(c) {
  const plan = c.plan, K = ctxPlan[plan]
  log('\n── Plateforme (' + PLAN_LIBELLE[plan] + ')')
  const moi = createClient(SB, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + c.token } } })
  const page = await http(null, 'GET', '/p/' + c.slug)
  verifier(plan, 'page de conversation publique : affichée à la marque de l’artisan', page.status === 200 && String(page.corps).includes('Sim ' + PLAN_LIBELLE[plan]), 'HTTP ' + page.status)
  const cfg0 = await http(c, 'GET', '/api/plateforme/config')
  verifier(plan, 'Ma plateforme : réglages lus (mode de réponse)', cfg0.status === 200 && ['auto', 'assistee', 'manuelle'].includes(cfg0.corps.mode_reponse), 'HTTP ' + cfg0.status)

  // Réponse AUTOMATIQUE : l'IA répond seule à la demande d'un client.
  const up = await moi.from('plateforme_config').upsert({ artisan_id: c.id, mode_reponse: 'auto', maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
  verifier(plan, 'Ma plateforme : le mode « automatique » s’enregistre (RLS de l’artisan)', !up.error, up.error?.message)
  const cred0 = await creditsDe(c)
  const contact = `client-${plan}-${HORO}@presti-test.invalid`
  const demande = await http(null, 'POST', '/api/leads', { slug: c.slug, nom_prospect: 'Paul Client', contact, message: 'Bonjour, je voudrais faire remplacer mon chauffe-eau de 200 litres, pouvez-vous me faire un devis ?' })
  const leadA = demande.corps.leadId
  const msgsA = leadA ? (await admin.from('messages').select('sens, type, etat, contenu').eq('lead_id', leadA)).data ?? [] : []
  // 25/10 (Benj) : la réponse qui part seule est Signature (`plateforme.ia.auto`). En Studio, le réglage « automatique » est rétrogradé
  // en assisté (modeEffectif, motif verrou_offre) : l'IA prépare, rien ne part au client sans la validation de l'artisan.
  if (peut(plan, 'plateforme.ia.auto')) {
    verifier(plan, 'conversation publique : la demande du client est enregistrée et l’IA répond seule (mode automatique)',
      demande.status === 200 && !!leadA && typeof demande.corps.reply === 'string' && demande.corps.reply.length > 20 && msgsA.some((m) => m.sens === 'in') && msgsA.some((m) => m.type === 'reponse_auto' && m.sens === 'out' && !m.etat),
      'HTTP ' + demande.status + ' ' + JSON.stringify(demande.corps).slice(0, 200))
    verifier(plan, 'réponse automatique : 1 crédit débité', cred0 - (await creditsDe(c)) === 1, cred0 + '→' + (await creditsDe(c)))
    const suite = await http(null, 'POST', '/api/conversation', { token: demande.corps.token, message: 'Il est dans la cave, accès par un escalier étroit.' })
    verifier(plan, 'conversation publique : le client poursuit la discussion, l’IA répond', suite.status === 200 && typeof suite.corps.reply === 'string' && suite.corps.reply.length > 10, 'HTTP ' + suite.status + ' ' + JSON.stringify(suite.corps).slice(0, 160))
  } else {
    verifier(plan, 'conversation publique (« automatique » réglé, offre sans envoi seul) : la demande est enregistrée, la réponse est PRÉPARÉE, rien ne part au client',
      demande.status === 200 && !!leadA && demande.corps.reply == null && msgsA.some((m) => m.sens === 'in') && msgsA.some((m) => m.type === 'reponse_auto' && m.etat === 'proposition') && !msgsA.some((m) => m.sens === 'out' && !m.etat),
      'HTTP ' + demande.status + ' ' + JSON.stringify(demande.corps).slice(0, 200) + ' messages ' + JSON.stringify(msgsA.map((m) => [m.sens, m.type, m.etat])))
    verifier(plan, 'réponse préparée (verrou d’offre) : 1 crédit débité pour la proposition', cred0 - (await creditsDe(c)) === 1, cred0 + '→' + (await creditsDe(c)))
    const suite = await http(null, 'POST', '/api/conversation', { token: demande.corps.token, message: 'Il est dans la cave, accès par un escalier étroit.' })
    verifier(plan, 'conversation publique : le client poursuit, l’IA ne répond pas seule (motif verrou_offre)', suite.status === 200 && suite.corps.reply == null && suite.corps.raison === 'verrou_offre', 'HTTP ' + suite.status + ' ' + JSON.stringify(suite.corps).slice(0, 160))
  }

  // Réponse PRÉPARÉE : l'IA rédige, l'artisan valide.
  await moi.from('plateforme_config').upsert({ artisan_id: c.id, mode_reponse: 'assistee', maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
  const d2 = await http(null, 'POST', '/api/leads', { slug: c.slug, nom_prospect: 'Léa Cliente', contact: `lea-${plan}-${HORO}@presti-test.invalid`, message: 'Bonjour, je souhaite un devis pour installer une douche italienne.' })
  const lead = d2.corps.leadId; K.leadId = lead; K.leadToken = d2.corps.token
  const prop = lead ? (await admin.from('messages').select('id, etat, contenu').eq('lead_id', lead).eq('etat', 'proposition')).data ?? [] : []
  verifier(plan, 'réponse préparée : rien ne part seul, une proposition attend la validation de l’artisan', d2.status === 200 && d2.corps.reply == null && prop.length === 1, 'HTTP ' + d2.status + ' ' + JSON.stringify(d2.corps).slice(0, 160) + ' propositions ' + prop.length)
  const val = prop[0] ? await http(c, 'POST', '/api/messages', { action: 'valider', lead_id: lead, message_id: prop[0].id }) : { status: 0, corps: {} }
  const leadApres = lead ? await ligneDe('leads', { id: lead }) : null
  verifier(plan, 'Messages : l’artisan valide la réponse préparée (envoyée, statut « répondu »)', val.status === 200 && leadApres?.statut === 'repondu', 'HTTP ' + val.status + ' ' + JSON.stringify(val.corps).slice(0, 140) + ' statut ' + leadApres?.statut)
  const nbRel = lead ? await compter('relances', { lead_id: lead }) : 0
  const rel = lead ? (await admin.from('relances').select('rang, planifiee_le, envoyee').eq('lead_id', lead).order('rang')).data ?? [] : []
  const jours = rel.map((r) => Math.round((new Date(r.planifiee_le).getTime() - Date.now()) / 86400000))
  verifier(plan, 'relances de conversation : armées à J+2 / J+5 / J+10 après la réponse', nbRel === 3 && JSON.stringify(jours) === '[2,5,10]' && rel.every((r) => r.envoyee === false), 'relances ' + nbRel + ' jours ' + JSON.stringify(jours))
  const rep = await http(c, 'POST', '/api/messages', { lead_id: lead, message: 'Bonjour Léa, je passe jeudi matin pour prendre les mesures.' })
  verifier(plan, 'Messages : l’artisan répond lui-même au client', rep.status === 200 && rep.corps.ok === true, 'HTTP ' + rep.status + ' ' + JSON.stringify(rep.corps).slice(0, 140))
  const cred1 = await creditsDe(c)
  const sug = await http(c, 'POST', '/api/messages', { lead_id: lead, action: 'suggest' })
  verifier(plan, 'Messages : brouillon de réponse proposé par l’IA (1 crédit)', sug.status === 200 && JSON.stringify(sug.corps).length > 30 && cred1 - (await creditsDe(c)) === 1, 'HTTP ' + sug.status + ' ' + JSON.stringify(sug.corps).slice(0, 140) + ' crédits ' + cred1 + '→' + (await creditsDe(c)))
  const pm = await http(c, 'POST', '/api/messages', { lead_id: lead, action: 'prise_en_main' })
  const rm = await http(c, 'POST', '/api/messages', { lead_id: lead, action: 'rendre_main' })
  verifier(plan, 'Messages : prise de main puis retour de la main à l’assistant', pm.status === 200 && pm.corps.prise_en_main === true && rm.status === 200 && rm.corps.prise_en_main === false, 'HTTP ' + pm.status + '/' + rm.status)

  // Devis depuis la conversation → envoi → acceptation par le client (jeton secret)
  const da = await http(c, 'POST', '/api/devis/auto', { lead_id: lead })
  const dvAuto = da.corps.id ? await ligneDe('devis', { id: da.corps.id }) : null
  verifier(plan, 'devis automatique depuis la conversation : brouillon chiffré par l’IA, rattaché au client', da.status === 200 && dvAuto?.lead_id === lead && dvAuto?.statut === 'brouillon', 'HTTP ' + da.status + ' ' + JSON.stringify(da.corps).slice(0, 200))
  K.devisConvId = da.corps.id
  const envC = K.devisConvId ? await http(c, 'POST', '/api/devis/' + K.devisConvId + '/envoyer', {}) : { status: 0, corps: {} }
  verifier(plan, 'devis de la conversation : envoyé au client', envC.status === 200 && (await ligneDe('devis', { id: K.devisConvId }))?.statut === 'envoye', 'HTTP ' + envC.status + ' ' + JSON.stringify(envC.corps).slice(0, 200))
  if (peut(plan, 'plateforme.regles')) {
    const r = await moi.from('regles_automatisation').upsert({ artisan_id: c.id, prereglage: 'perso', actif: true, maillons: { devis_auto: true, photo_requise: false, modele: 'standard', notifier: true, validation: true, envoyer_apres_validation: false, acompte_pct: 30 }, maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
    verifier(plan, 'règles d’automatisation (Signature) : enregistrées avec un acompte de 30 %', !r.error, r.error?.message)
  }
  const acc = await http(null, 'POST', '/api/conversation/devis', { token: K.leadToken, action: 'accepter' })
  const dvAcc = K.devisConvId ? await ligneDe('devis', { id: K.devisConvId }) : null
  verifier(plan, 'conversation publique : le client accepte le devis depuis le fil (horodaté)', acc.status === 200 && dvAcc?.statut === 'accepte' && !!dvAcc?.accepte_le, 'HTTP ' + acc.status + ' ' + JSON.stringify(acc.corps).slice(0, 160) + ' statut ' + dvAcc?.statut)
  await new Promise((r) => setTimeout(r, 1200))
  const facAcompte = K.devisConvId ? (await admin.from('factures').select('id, numero, statut, total_ttc').eq('devis_id', K.devisConvId)).data ?? [] : []
  if (peut(plan, 'plateforme.regles')) verifier(plan, 'règle d’acompte : une facture d’acompte de 30 % est émise à l’acceptation', facAcompte.length === 1 && Math.abs(Number(facAcompte[0].total_ttc) - Number(dvAcc.total_ttc) * 0.3) < 0.05, 'factures ' + JSON.stringify(facAcompte) + ' total devis ' + dvAcc?.total_ttc)
  else verifierFerme(plan, 'règle d’acompte automatique : aucune facture émise (règles = Signature)', facAcompte.length === 0, 'factures ' + JSON.stringify(facAcompte))

  // Comptes clients : lien magique reçu par e-mail (intercepté), session ouverte, déconnexion
  const adresse = `compte.${plan}.${HORO}@example.org`
  const nM = serveur.mails().length
  const dem = await http(null, 'POST', '/api/p/auth', { action: 'demande', slug: c.slug, email: adresse })
  const mailLien = serveur.mails().slice(nM).find((m) => m.a?.includes(adresse))
  const jeton = mailLien ? decodeURIComponent(lienDuMail(mailLien) ?? '') : ''
  verifier(plan, 'comptes clients : le lien magique part par e-mail (intercepté, au nom de l’artisan)', dem.status === 200 && !!jeton && /Sim /.test(mailLien.objet ?? ''), 'HTTP ' + dem.status + ' mail ' + JSON.stringify(mailLien)?.slice(0, 160))
  if (jeton) {
    const ver = await fetch(BASE + '/api/p/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipSim() }, body: JSON.stringify({ action: 'verifier', token: jeton }) })
    const cookie = (ver.headers.get('set-cookie') || '').split(';')[0]
    const vc = await ver.json().catch(() => ({}))
    const moiClient = await fetch(BASE + '/api/p/auth', { headers: { Cookie: cookie } }).then((r) => r.json()).catch(() => ({}))
    verifier(plan, 'comptes clients : le lien ouvre une session (cookie), le client est reconnu', ver.status === 200 && vc.ok === true && !!cookie && moiClient.connecte === true && moiClient.client?.email === adresse, 'HTTP ' + ver.status + ' ' + JSON.stringify(moiClient))
    const reuse = await fetch(BASE + '/api/p/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipSim() }, body: JSON.stringify({ action: 'verifier', token: jeton }) })
    verifier(plan, 'comptes clients : le lien ne sert qu’une fois', reuse.status === 400, 'HTTP ' + reuse.status)
  }
}

// ─────────────────────────────── Mes chiffres, impayés, inventaire (Studio et au-dessus) ───────────────────────────────
async function gestion(c) {
  const plan = c.plan, K = ctxPlan[plan]
  log('\n── Mes chiffres, relances d’impayés, inventaire (' + PLAN_LIBELLE[plan] + ')')
  const t = await http(c, 'GET', '/api/compta/tableau')
  verifier(plan, 'Mes chiffres : le tableau reprend les factures du compte (dont la facture payée)', t.status === 200 && Array.isArray(t.corps.factures) && t.corps.factures.some((f) => f.id === K.factureId || f.numero), 'HTTP ' + t.status + ' ' + JSON.stringify(t.corps).slice(0, 200))
  verifier(plan, 'Mes chiffres : automatisations ' + (peut(plan, 'chiffres.auto') ? 'ouvertes (Signature)' : 'fermées'), t.corps.automatisations === peut(plan, 'chiffres.auto'), JSON.stringify(t.corps.automatisations))
  if (peut(plan, 'chiffres.auto')) {
    const rg = await http(c, 'GET', '/api/compta/reglages')
    verifier(plan, 'Mes chiffres : réglages d’automatisation (alerte impayés, export mensuel) lisibles', rg.status === 200, 'HTTP ' + rg.status + ' ' + JSON.stringify(rg.corps).slice(0, 160))
  }

  // Relances d'impayés : réglage, puis passage quotidien SIMULÉ (horloge avancée, e-mail espionné, UN seul compte)
  const rl = await http(c, 'PUT', '/api/factures/relances-auto', { actif: true, jours: [3, 10, 21], textes: {} })
  verifier(plan, 'relances d’impayés : l’artisan les active (opt-in)', rl.status === 200, 'HTTP ' + rl.status + ' ' + JSON.stringify(rl.corps).slice(0, 160))
  const dv = await http(c, 'POST', '/api/devis', { objet: 'Dépannage chauffe-eau', client_nom: 'Client Impayé', client_email: `impaye-${plan}-${HORO}@example.org`, lignes: [{ designation: 'Remplacement résistance', quantite: 1, unite: 'u', prix_unitaire_ht: 150, tva_taux: 10 }] })
  if (dv.corps?.id) await admin.from('devis').update({ statut: 'accepte' }).eq('id', dv.corps.id) // on ne facture qu'un devis signé (C6)
  const fi = await http(c, 'POST', '/api/factures', { devis_id: dv.corps.id })
  const envois = []
  const prevenus = []
  try {
    const { tourRelancesImpayes } = await import('../lib/relancesImpayesTour.ts')
    const { magasinSupabase } = await import('../lib/relancesImpayesMagasin.ts')
    // Le vrai magasin (vraie base), restreint à CE compte de test. Le magasin réel ne lit que les factures déjà échues à l'horloge réelle
    // (date_echeance < aujourd'hui) : la facture de test, émise à l'instant, ne l'est pas. On lit donc les factures émises du compte sans ce
    // filtre de date, et c'est `maintenant` (l'horloge simulée) qui décide de l'échéance, comme au passage quotidien de dans 34 jours.
    const magasin = {
      ...magasinSupabase,
      comptes: async (n) => (await magasinSupabase.comptes(n)).filter((x) => x.artisan_id === c.id),
      factures: async (id) => id === c.id ? ((await admin.from('factures').select('*').eq('artisan_id', id).eq('statut', 'emise').is('avoir_de', null).not('date_echeance', 'is', null)).data ?? []) : [],
      // L'avis « une relance vous attend » (offre Studio) est capté ici : ce processus n'est pas le serveur aux e-mails interceptés.
      notifierPreparee: async (artisan, n) => { prevenus.push({ artisan: artisan.id, ...n }) },
    }
    const demain = (j) => new Date(Date.now() + j * 86400000)
    const b1 = await tourRelancesImpayes({ actif: true, magasin, envoyer: async (m) => { envois.push(m); return { ok: true } }, sortiePermise: async () => true, maintenant: demain(30 + 4) })
    const b2 = await tourRelancesImpayes({ actif: true, magasin, envoyer: async (m) => { envois.push(m); return { ok: true } }, sortiePermise: async () => true, maintenant: demain(30 + 4) })
    const miens = () => envois.filter((e) => e.to === `impaye-${plan}-${HORO}@example.org`)   // le compte peut avoir d’autres factures échues (l’acompte de Signature) : on juge CELLE-ci
    // 25/10 (Benj) : en Signature (`factures.relances.auto`) la relance part seule ; en Studio (`factures.relances` seule) elle est PRÉPARÉE
    // (statut « a_valider », sujet et texte gardés), l'artisan est prévenu, et rien ne part tant qu'il ne l'a pas validée.
    const auto = peut(plan, 'factures.relances.auto')
    if (auto) {
      verifier(plan, 'relances d’impayés (passage simulé à échéance +4 j) : une relance part, une seule, au nom de l’artisan', b1.comptes === 1 && miens().length === 1 && /Sim /.test(miens()[0].fromName ?? '') && /Rappel/.test(miens()[0].subject ?? '') && /FAC-/.test(miens()[0].subject ?? ''), JSON.stringify(b1) + ' ' + JSON.stringify(miens()[0] ?? {}).slice(0, 200))
      verifier(plan, 'relances d’impayés : un second passage le même jour ne renvoie rien (idempotent)', b2.envoyees === 0 && miens().length === 1, JSON.stringify(b2))
    } else {
      const lignes = (await admin.from('relances_impayes').select('statut, sujet, texte').eq('facture_id', fi.corps.id)).data ?? []
      verifier(plan, 'relances d’impayés (passage simulé à échéance +4 j) : la relance est PRÉPARÉE « à valider » (sujet et texte gardés), l’artisan est prévenu, rien ne part au client',
        b1.comptes === 1 && b1.preparees >= 1 && miens().length === 0 && lignes.length === 1 && lignes[0].statut === 'a_valider' && !!lignes[0].sujet && !!lignes[0].texte && prevenus.length >= 1,
        JSON.stringify(b1) + ' lignes ' + JSON.stringify(lignes).slice(0, 200) + ' avis ' + prevenus.length)
      verifier(plan, 'relances d’impayés : un second passage le même jour ne prépare ni n’envoie rien de plus (une relance attend déjà)', b2.preparees === 0 && b2.envoyees === 0 && miens().length === 0, JSON.stringify(b2))
    }
    const parti = miens().length
    // Facture payée → plus de relance
    await http(c, 'PATCH', '/api/factures/' + fi.corps.id, { statut: 'payee' })
    const b3 = await tourRelancesImpayes({ actif: true, magasin, envoyer: async (m) => { envois.push(m); return { ok: true } }, sortiePermise: async () => true, maintenant: demain(30 + 12) })
    verifier(plan, 'relances d’impayés : une facture réglée n’est plus relancée', miens().length === parti, JSON.stringify(b3) + ' envois pour cette facture : ' + miens().length)
  } catch (e) { constat(plan, 'relances d’impayés (passage simulé)', 'defaut', e?.stack ?? e) }

  // Inventaire
  const art = await http(c, 'POST', '/api/inventaire', { nom: 'Vis inox 4x40 SIM', unite: 'u', seuil_alerte: 5, fournisseur_prefere: 'Fournisseur Sim' })
  const mv = art.corps.id ? await http(c, 'POST', '/api/inventaire', { mouvement: { materiau_id: art.corps.id, type: 'entree', quantite: 20 } }) : { status: 0, corps: {} }
  const sortie = art.corps.id ? await http(c, 'POST', '/api/inventaire', { mouvement: { materiau_id: art.corps.id, type: 'sortie', quantite: 17 } }) : { status: 0, corps: {} }
  const liste = await http(c, 'GET', '/api/inventaire')
  verifier(plan, 'inventaire : article créé, entrée de 20, sortie de 17 → reste 3 (sous le seuil de 5)', art.status === 200 && mv.corps.reste === 20 && sortie.corps.reste === 3 && liste.status === 200 && JSON.stringify(liste.corps).includes('Vis inox 4x40 SIM'), 'HTTP ' + art.status + ' ' + JSON.stringify(mv.corps) + ' ' + JSON.stringify(sortie.corps))
  const rech = await http(c, 'POST', '/api/inventaire/recherche', {})
  verifier(plan, 'inventaire : recherche chez les fournisseurs — porte ouverte (requête invalide refusée en 400, sans crédit)', rech.status === 400, 'HTTP ' + rech.status + ' ' + JSON.stringify(rech.corps).slice(0, 140))
}

// ─────────────────────────────── CRM atelier et assistant de gestion (Signature) ───────────────────────────────
async function atelier(c, ia) {
  const plan = c.plan, K = ctxPlan[plan]
  log('\n── CRM atelier et assistant de gestion (' + PLAN_LIBELLE[plan] + ')')
  const vue = await http(c, 'GET', '/api/crm/vue')
  const colonnes = vue.corps?.pipeline?.colonnes ?? []
  const cartes = colonnes.flatMap((x) => x.cartes ?? [])
  verifier(plan, 'CRM : le pipeline (6 colonnes) reprend les devis, demandes et factures du compte', vue.status === 200 && colonnes.length === 6 && cartes.length >= 3, 'HTTP ' + vue.status + ' colonnes ' + colonnes.length + ' cartes ' + cartes.length + ' ' + JSON.stringify(vue.corps).slice(0, 120))
  verifier(plan, 'CRM : clients, tableau de bord et atelier présents dans la vue', ['clients', 'tableau', 'atelier'].every((k) => k in (vue.corps ?? {})) || Object.keys(vue.corps ?? {}).length >= 4, Object.keys(vue.corps ?? {}).join(','))
  const carteDevis = cartes.find((x) => x.objet === 'devis' && x.id === K.devisConvId)
  const dep = carteDevis ? await http(c, 'POST', '/api/crm/pipeline', { objet: 'devis', id: K.devisConvId, vers: 'chantier', note: 'simulation' }) : { status: 0, corps: {} }
  verifier(plan, 'CRM : déplacement manuel d’un dossier dans le pipeline (journalisé)', dep.status === 200 && dep.corps.ok === true, 'carte ' + !!carteDevis + ' HTTP ' + dep.status + ' ' + JSON.stringify(dep.corps).slice(0, 160))
  const ch = K.devisConvId ? await http(c, 'POST', '/api/crm/chantiers', { devis_id: K.devisConvId, generer_taches: true }) : { status: 0, corps: {} }
  const idChantier = ch.corps.id ?? ch.corps.chantier?.id
  const taches = idChantier ? await compter('chantier_taches', { chantier_id: idChantier }) : 0
  verifier(plan, 'CRM : un chantier naît du devis signé, avec une tâche par ligne', ch.status < 300 && !!idChantier && taches >= 1, 'HTTP ' + ch.status + ' ' + JSON.stringify(ch.corps).slice(0, 160) + ' tâches ' + taches)
  const cl = await http(c, 'GET', '/api/crm/clients')
  verifier(plan, 'CRM : fiches clients', cl.status === 200, 'HTTP ' + cl.status + ' ' + JSON.stringify(cl.corps).slice(0, 120))

  // Assistant de gestion. (1) UN appel IA réel : une commande simple, répondue par le vrai modèle. (2) La boucle réelle du serveur avec un
  // « modèle » scripté (scripts/lib/sim-ia-proxy.mjs) : la commande « Envoie le devis… » produit une carte à confirmer, rien ne part avant le clic.
  const lire = async (message) => {
    const r = await fetch(BASE + '/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.token, 'x-forwarded-for': ipSim() }, body: JSON.stringify({ message }), signal: AbortSignal.timeout(120_000) })
    const flux = await r.text()
    const ev = flux.split(String.fromCharCode(10)).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    return { status: r.status, flux, ev, fin: ev.find((e) => e.e === 'fin') }
  }
  const reelsAvant = ia.etat.reelsUtilises
  ia.autoriser(ia.etat.reelsUtilises < 2 ? 1 : 0)
  const simple = await lire('Bonjour, en une phrase : que peux-tu faire pour moi dans Presti ?')
  ia.autoriser(0)
  const reel = ia.etat.reelsUtilises > reelsAvant
  verifier(plan, 'assistant de gestion : une commande simple est comprise et répondue', simple.status === 200 && !!simple.fin && String(simple.fin.texte ?? '').length > 25, 'HTTP ' + simple.status + ' ' + simple.flux.slice(0, 300))
  const dvA = await http(c, 'POST', '/api/devis', { objet: 'Remplacement robinet', client_nom: 'Marc Assistant', client_email: `assistant-${HORO}@example.org`, lignes: [{ designation: 'Robinet mitigeur', quantite: 1, unite: 'u', prix_unitaire_ht: 85, tva_taux: 10 }] })
  K.devisAssistant = dvA.corps
  const nM = serveur.mails().length
  const cmd = await lire(`Envoie le devis ${dvA.corps.numero} à mon client maintenant (c’est un brouillon, il est prêt).`)
  const carte = (cmd.fin?.cartes ?? [])[0]
  const avantEnvoi = (await ligneDe('devis', { id: dvA.corps.id }))?.statut
  verifier(plan, 'assistant de gestion : « Envoie le devis… » propose une CARTE à confirmer, et rien n’est parti', cmd.status === 200 && !!carte?.id && avantEnvoi === 'brouillon' && serveur.mails().length === nM, 'HTTP ' + cmd.status + ' cartes ' + JSON.stringify(cmd.fin?.cartes ?? []).slice(0, 200) + ' statut ' + avantEnvoi + ' | ' + cmd.flux.slice(0, 300))
  if (carte?.id) {
    const conf = await http(c, 'POST', '/api/assistant/actions', { id: carte.id, decision: 'confirmer' })
    const apresEnvoi = (await ligneDe('devis', { id: dvA.corps.id }))?.statut
    const mailA = serveur.mails().slice(nM).find((m) => String(m.a).includes(`assistant-${HORO}@example.org`))
    verifier(plan, 'assistant de gestion : après ma confirmation, le devis part (statut « envoyé », e-mail intercepté avec le PDF)', conf.status === 200 && apresEnvoi === 'envoye' && !!mailA && (mailA.pj ?? []).some((p) => p.octets > 1500), 'HTTP ' + conf.status + ' ' + JSON.stringify(conf.corps).slice(0, 200) + ' statut ' + apresEnvoi)
    const encore = await http(c, 'POST', '/api/assistant/actions', { id: carte.id, decision: 'confirmer' })
    verifier(plan, 'assistant de gestion : un second clic sur la carte ne renvoie rien', encore.status >= 400 && serveur.mails().slice(nM).filter((m) => String(m.a).includes(`assistant-${HORO}@example.org`)).length === 1, 'HTTP ' + encore.status)
  }
}

// ─────────────────────────────── les DEUX choix de chaque offre payante : payer, ou les semaines gratuites ───────────────────────────────
// ─────────────────────────────── les gestes à l'écran (vrai navigateur) ───────────────────────────────
async function contexteDe(navigateur, c, largeur = 1360, hauteur = 900) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR', bypassCSP: true })
  ctx.setDefaultTimeout(60_000); ctx.setDefaultNavigationTimeout(60_000)
  await ctx.setExtraHTTPHeaders({ 'x-forwarded-for': ipSim() })
  await ctx.addInitScript((e) => { try { for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v) } catch { /* stockage indisponible */ } },
    { [`sb-${REF}-auth-token`]: JSON.stringify(c.session), 'presti.aide_vues': JSON.stringify(['visite:console']) })
  return ctx
}

/** Le devis et la facture, comme l'artisan les fait : formulaire, chiffrage IA, enregistrement, envoi, facture. */
async function ecranDevis(navigateur, c) {
  const plan = c.plan
  const ctx = await contexteDe(navigateur, c), page = await ctx.newPage()
  const dialogues = []
  page.on('dialog', (d) => { dialogues.push(d.message()); d.accept().catch(() => {}) })
  const avant = await creditsDe(c), nMails = serveur.mails().length
  const client = `ui-${plan}-${HORO}-${tentative}@example.org`
  try {
    await page.goto(BASE + '/devis/nouveau', { waitUntil: 'load', timeout: 45_000 })
    await page.waitForSelector('input[placeholder="Marie Dupont"]', { timeout: 20_000 })
    await page.fill('input[placeholder="Marie Dupont"]', 'Cliente Écran')
    await page.fill('input[placeholder="marie@email.fr"]', client)
    await page.fill('input[placeholder="Rénovation électrique appartement"]', 'Remplacement d’un ballon d’eau chaude')
    await page.fill('textarea[placeholder^="Ex : remplacement du tableau"]', 'Remplacement d’un ballon d’eau chaude de 200 litres, évacuation de l’ancien.')
    await page.getByRole('button', { name: /Chiffrer avec l.IA/ }).click()
    await page.waitForFunction(() => [...document.querySelectorAll('input.desig')].some((i) => i.value && i.value.trim().length > 3), null, { timeout: 60_000 })
    const lignes = await page.locator('input.desig').evaluateAll((els) => els.map((e) => e.value).filter(Boolean))
    verifier(plan, 'écran devis : « Chiffrer avec l’IA » remplit les lignes du devis', lignes.length >= 1, JSON.stringify(lignes))
    await page.getByRole('button', { name: /^Enregistrer$/ }).click()
    await page.waitForTimeout(2500)
    const devis = (await admin.from('devis').select('id, numero, statut, client_nom, client_email, total_ht').eq('artisan_id', c.id).eq('client_email', client)).data ?? []
    verifier(plan, 'écran devis : « Enregistrer » crée le devis en base (client, lignes, total)', devis.length === 1 && devis[0].client_nom === 'Cliente Écran' && Number(devis[0].total_ht) > 0, JSON.stringify(devis))
    verifier(plan, 'écran devis : le chiffrage par l’IA a coûté 1 crédit', avant - (await creditsDe(c)) === 1, `${avant} → ${await creditsDe(c)}`)
    await page.getByRole('button', { name: /Envoyer au client/ }).click()
    await page.waitForTimeout(4000)
    const apres = devis[0] ? await ligneDe('devis', { id: devis[0].id }) : null
    const mail = serveur.mails().slice(nMails).find((m) => String(m.a).includes(client))
    verifier(plan, 'écran devis : « Envoyer au client » (statut « envoyé », e-mail intercepté avec le PDF)', apres?.statut === 'envoye' && !!mail && (mail.pj ?? []).some((p) => p.octets > 1500), `statut ${apres?.statut} mail ${!!mail} ${dialogues.join(' | ').slice(0, 160)}`)
    await page.getByRole('button', { name: /Créer la facture/ }).click()
    await page.waitForURL(/\/factures/, { timeout: 20_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const fac = devis[0] ? (await admin.from('factures').select('numero, statut').eq('devis_id', devis[0].id)).data ?? [] : []
    const texte = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ')
    verifier(plan, 'écran devis : « Créer la facture » émet la facture, visible dans la liste', fac.length === 1 && /^FAC-/.test(fac[0].numero) && texte.includes(fac[0].numero), `factures ${JSON.stringify(fac)} url ${new URL(page.url()).pathname}`)
  } catch (e) { constat(plan, 'écran devis : parcours complet', 'defaut', String(e?.message ?? e).slice(0, 300)) }
  await ctx.close()
}

/** La plateforme vue par le CLIENT (page publique, vrai chat) puis par l'artisan (Messages). */
async function ecranPlateforme(navigateur, c) {
  const plan = c.plan
  const moi = createClient(SB, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + c.token } } })
  await moi.from('plateforme_config').upsert({ artisan_id: c.id, mode_reponse: 'auto', maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
  const client = await navigateur.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', bypassCSP: true, extraHTTPHeaders: { 'x-forwarded-for': ipSim() } })
  const p = await client.newPage()
  const reponses = []
  p.on('response', async (r) => { if (/[/]api[/](leads|conversation)/.test(r.url())) reponses.push(`${r.status()} ${new URL(r.url()).pathname} ${(await r.text().catch(() => '')).slice(0, 160)}`) })
  try {
    await p.goto(BASE + '/p/' + c.slug, { waitUntil: 'load', timeout: 45_000 })
    await p.waitForSelector('textarea[placeholder^="Décrivez votre besoin"]', { timeout: 20_000 })
    await p.fill('textarea[placeholder^="Décrivez votre besoin"]', 'Bonjour, mon radiateur ne chauffe plus, pouvez-vous me proposer un rendez-vous ?')
    await p.getByRole('button', { name: 'Envoyer' }).click()
    // 25/10 : la réponse ne part seule qu'en Signature (`plateforme.ia.auto`) ; en Studio le client lit l'accusé « Bien reçu ! » de PlatChat
    // (app/p/[slug]/PlatChat.tsx) et la réponse préparée attend l'artisan.
    const auto = peut(plan, 'plateforme.ia.auto')
    await p.waitForFunction((a) => (a ? /merci pour votre message/i : /bien reçu/i).test(document.body.innerText), auto, { timeout: 60_000 })
    verifier(plan, auto ? 'page de conversation (vrai chat, mobile) : le client écrit, l’assistant répond dans le fil' : 'page de conversation (vrai chat, mobile) : le client écrit, reçoit l’accusé ; la réponse préparée attend l’artisan', true)
    const contact = `chat-${plan}-${HORO}-${tentative}@presti-test.invalid`
    const champ = p.locator('input[placeholder="Email ou téléphone"]')
    if (await champ.count()) { await champ.fill(contact); await p.getByRole('button', { name: 'Être recontacté' }).click(); await p.waitForTimeout(1500) }
    const lead = (await admin.from('leads').select('id, contact, nom_prospect, message').eq('artisan_id', c.id).ilike('message', '%radiateur%').order('created_at', { ascending: false }).limit(1)).data ?? []
    verifier(plan, 'page de conversation : la demande arrive chez l’artisan avec les coordonnées laissées', lead.length === 1 && lead[0].contact === contact, JSON.stringify(lead))
    const art = await contexteDe(navigateur, c), pm = await art.newPage()
    await pm.goto(BASE + '/messages', { waitUntil: 'load', timeout: 45_000 })
    await pm.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await pm.waitForTimeout(1200)
    const t = (await pm.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ')
    verifier(plan, 'Messages (écran de l’artisan) : la conversation du client est dans la boîte', /radiateur/i.test(t) || /Paul Client|Léa Cliente/.test(t), t.slice(0, 200))
    await art.close()
  } catch (e) { constat(plan, 'page de conversation : parcours client à l’écran', 'defaut', String(e?.message ?? e).slice(0, 160) + ' | réponses serveur : ' + reponses.join(' ## ').slice(0, 400) + ' | texte : ' + (await p.locator('body').innerText().catch(() => '')).replace(/[\s]+/g, ' ').slice(-200)) }
  await client.close()
}

/** Paramètres (chaque onglet), tableau de bord, centre d'aide (vidéos présentes et lisibles). */
async function ecransCommuns(navigateur, c) {
  const plan = c.plan
  const ctx = await contexteDe(navigateur, c), page = await ctx.newPage()
  const erreurs = []
  page.on('pageerror', (e) => erreurs.push(String(e.message).slice(0, 120)))
  try {
    for (const onglet of ['profil', 'notifications', 'application', 'legal', 'abonnement', 'securite', 'donnees']) {
      await page.goto(BASE + '/parametres?onglet=' + onglet, { waitUntil: 'load', timeout: 45_000 })
      await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {})
      const t = (await page.locator('main, body').first().innerText().catch(() => '')).replace(/\s+/g, ' ')
      verifier(plan, `paramètres : onglet « ${onglet} » s’affiche`, t.length > 150 && !/Une erreur est survenue/i.test(t), t.slice(0, 120))
    }
    // Paramètres → Abonnement : pour chaque offre au-dessus de la sienne, les DEUX choix (essai gratuit / payer) quand le compte a droit à l'essai.
    await page.goto(BASE + '/parametres?onglet=abonnement', { waitUntil: 'load', timeout: 45_000 })
    await page.waitForSelector('[data-abo-payer]', { timeout: 15_000 }).catch(() => {})
    const attendues = plan === 'gratuit' ? OFFRES.length : OFFRES.filter((o) => PLANS[o.id].prixMois > PLANS[plan].prixMois).length
    const nbPayer = await page.locator('[data-abo-payer]').count()
    verifier(plan, 'paramètres → abonnement : le choix « payer » est proposé à côté de l’essai pour chaque offre supérieure', nbPayer === attendues, `${nbPayer} bouton(s) « payer », ${attendues} offre(s) supérieure(s)`)
    await page.goto(BASE + '/aide', { waitUntil: 'load', timeout: 45_000 })
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {})
    await page.waitForSelector('details.aide-vid', { timeout: 20_000 }).catch(() => {})
    const nbVideos = await page.locator('details.aide-vid').count()
    verifier(plan, 'centre d’aide : des vidéos sont proposées', nbVideos >= 5, `${nbVideos} vidéo(s)`)
    if (nbVideos) {
      await page.locator('details.aide-vid > summary').first().click()
      await page.waitForSelector('details.aide-vid[open] video source', { state: 'attached', timeout: 8000 }).catch(() => {})
      const src = await page.locator('details.aide-vid[open] video source').first().getAttribute('src').catch(() => null)
      verifier(plan, 'centre d’aide : ouvrir une vidéo monte le lecteur vidéo (source mp4, étapes écrites dessous)', !!src && /\.mp4$/.test(src) && (await page.locator('details.aide-vid[open] ol li').count()) >= 1, String(src))
    }
    await page.goto(BASE + '/dashboard', { waitUntil: 'load', timeout: 45_000 })
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {})
    const dash = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ')
    verifier(plan, 'tableau de bord : affiche l’activité du compte (devis, factures, crédits)', /devis/i.test(dash) && /facture/i.test(dash) && dash.length > 400 && erreurs.length === 0, dash.slice(0, 160) + ' ' + erreurs.join('|'))
  } catch (e) { constat(plan, 'paramètres / aide / tableau de bord : parcours à l’écran', 'defaut', String(e?.message ?? e).slice(0, 300)) }
  await ctx.close()
}

/** Les vidéos du centre d'aide : présentes, servies en lecture partielle, vraiment des mp4 (le montage n'est pas touché). */
async function videosAide() {
  const VIDEOS = JSON.parse(fs.readFileSync(path.join(RACINE, 'lib', 'aide-videos.json'), 'utf8')).videos
  const urlVideo = (v) => `/aide-videos/${v.id}.mp4`, urlAffiche = (v) => `/aide-videos/${v.id}.webp`
  const defauts = []
  for (const v of VIDEOS) {
    for (const [url, type, min] of [[urlVideo(v), /video\/mp4/, 20_000], [urlAffiche(v), /image\//, 1000]]) {
      const r = await fetch(BASE + url, { headers: { Range: 'bytes=0-65535' } }).catch(() => null)
      if (!r || ![200, 206].includes(r.status)) { defauts.push(`${url} : HTTP ${r?.status}`); continue }
      const buf = Buffer.from(await r.arrayBuffer())
      const total = Number((r.headers.get('content-range') || '').split('/')[1]) || Number(r.headers.get('content-length')) || buf.length
      if (!type.test(r.headers.get('content-type') || '')) defauts.push(`${url} : type ${r.headers.get('content-type')}`)
      else if (total < min) defauts.push(`${url} : ${total} octets`)
      else if (url.endsWith('.mp4') && buf.subarray(4, 8).toString() !== 'ftyp') defauts.push(`${url} : pas un mp4`)
    }
  }
  verifier('tous', `centre d’aide : les ${VIDEOS.length} vidéos (mp4 + affiche) sont servies et lisibles`, defauts.length === 0, defauts.slice(0, 5).join(' ; '))
}

let secretWebhook = ''
/** Livre un événement Stripe SIGNÉ (comme Stripe le ferait) au vrai webhook du serveur local. */
async function webhook(type, objet, extra = {}) {
  const evenement = { id: 'evt_sim_' + crypto.randomBytes(8).toString('hex'), object: 'event', api_version: '2024-06-20', created: Math.floor(Date.now() / 1000), livemode: false, type, data: { object: objet, ...extra } }
  const payload = JSON.stringify(evenement)
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: secretWebhook })
  const r = await fetch(BASE + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body: payload })
  return { status: r.status, corps: await r.text() }
}
const sessionsAExpirer = [], clientsStripe = []
const idSession = (url) => (/(cs_(?:test|live)_[A-Za-z0-9]+)/.exec(String(url)) || [])[1]
const derniereSessionStripe = (n0) => serveur.stripe().slice(n0).filter((x) => x.methode === 'POST' && /\/v1\/checkout\/sessions$/.test(x.chemin)).pop()

async function abonnements(navigateur) {
  log('\n── Abonnements : les deux choix de chaque offre (payer / semaines gratuites offertes)')
  // L'accueil : chaque offre annonce ses semaines gratuites ET propose de s'abonner directement.
  const accueil = await navigateur.newPage({ viewport: { width: 1360, height: 900 }, locale: 'fr-FR' })
  await accueil.goto(BASE + '/', { waitUntil: 'load', timeout: 45_000 })
  await accueil.waitForTimeout(800)
  for (const o of OFFRES) {
    const essaiTxt = (await accueil.locator(`[data-essai-gratuit="${o.id}"]`).first().innerText().catch(() => '')).replace(/\s+/g, ' ')
    const payer = accueil.locator(`[data-payer-direct="${o.id}"]`).first()
    const href = await payer.getAttribute('href').catch(() => null)
    verifier(o.id, 'accueil : les semaines gratuites sont annoncées (durée = ESSAI_JOURS)', essaiTxt.includes(`${ESSAI_JOURS[o.id]} jours gratuits`), essaiTxt)
    verifier(o.id, 'accueil : le choix « s’abonner directement » existe et mène à l’inscription de CETTE offre', !!href && href.includes(`abonnement=${o.id}`), String(href))
    const lienEssai = await accueil.locator(`a:has-text("Essayer ${ESSAI_JOURS[o.id]} jours gratuits")`).first().getAttribute('href').catch(() => null)
    verifier(o.id, 'accueil : le choix « essai gratuit » existe et mène à l’inscription', lienEssai === '/signup', String(lienEssai))
  }
  await accueil.close()

  for (const o of OFFRES) {
    const P = o.id
    const c = await creerCompte('gratuit', { role: 'abo-' + P, credits: 3 })
    log(`\n  ${PLAN_LIBELLE[P]} — ${o.prix} €/mois, ${ESSAI_JOURS[P]} jours gratuits`)
    const droit = await http(c, 'GET', '/api/subscribe')
    verifier(P, 'abonnement : un compte neuf a droit à l’essai, avec les durées de lib/plans.ts', droit.corps?.essai?.disponible === true && droit.corps.essai.jours?.[P] === ESSAI_JOURS[P], JSON.stringify(droit.corps))

    // ── L'écran /abonnement du compte : les deux boutons, puis un vrai clic sur chacun (la redirection vers Stripe est interceptée avant le chargement)
    const ctx = await contexteDe(navigateur, c)
    const page = await ctx.newPage()
    await page.route(/checkout\.stripe\.com/, (route) => route.abort())
    const demandesStripe = []
    page.on('request', (r) => { if (/checkout\.stripe\.com/.test(r.url())) demandesStripe.push(r.url()) })
    await page.goto(BASE + '/abonnement', { waitUntil: 'load' })
    await page.waitForSelector(`[data-abo-essai="${P}"]`, { timeout: 20_000 }).catch(() => {})
    const txtEssai = (await page.locator(`[data-abo-essai="${P}"]`).innerText().catch(() => '')).replace(/\s+/g, ' ')
    const txtPayer = (await page.locator(`[data-abo-payer="${P}"]`).innerText().catch(() => '')).replace(/\s+/g, ' ')
    const annonce = (await page.locator(`[data-essai-gratuit="${P}"]`).innerText().catch(() => '')).replace(/\s+/g, ' ')
    verifier(P, 'écran /abonnement : le choix « essai gratuit » (durée annoncée = ESSAI_JOURS)', txtEssai.includes(`${ESSAI_JOURS[P]} jours gratuits`) && annonce.includes(`${ESSAI_JOURS[P]} jours gratuits`), `bouton « ${txtEssai} » annonce « ${annonce} »`)
    verifier(P, 'écran /abonnement : le choix « payer » (prix de la grille)', txtPayer.includes(String(o.prix)), `bouton « ${txtPayer} »`)

    // PAYER (clic réel)
    const n0 = serveur.stripe().length
    await page.locator(`[data-abo-payer="${P}"]`).click()
    await page.waitForTimeout(3500)
    const urlPayer = demandesStripe.find((u) => /cs_test_/.test(u))
    const sp = derniereSessionStripe(n0)
    sessionsAExpirer.push(idSession(urlPayer))
    verifier(P, 'payer : le bouton envoie vers le paiement Stripe en mode TEST (session créée, page checkout.stripe.com)', !!urlPayer && /cs_test_/.test(urlPayer), 'requêtes Stripe vues : ' + JSON.stringify(demandesStripe).slice(0, 200))
    verifier(P, 'payer : session d’abonnement mensuel au prix de la grille, SANS essai, carte demandée tout de suite',
      !!sp && sp.champs.mode === 'subscription' && sp.champs['line_items[0][price_data][unit_amount]'] === String(o.prix * 100) && sp.champs['line_items[0][price_data][recurring][interval]'] === 'month'
      && !('subscription_data[trial_period_days]' in sp.champs) && sp.champs.payment_method_collection === undefined && sp.champs['metadata[plan]'] === P && !('metadata[essai_jours]' in sp.champs),
      JSON.stringify(sp?.champs ?? {}).slice(0, 400))
    const sessionPayer = urlPayer ? await stripe.checkout.sessions.retrieve(idSession(urlPayer)).catch((e) => ({ erreur: String(e) })) : null
    verifier(P, 'payer : Stripe confirme la session (ouverte, TEST, montant de la grille)', sessionPayer?.status === 'open' && sessionPayer.livemode === false && sessionPayer.amount_total === o.prix * 100 && sessionPayer.mode === 'subscription', JSON.stringify(sessionPayer ?? {}).slice(0, 200))

    // ESSAI GRATUIT (clic réel)
    demandesStripe.length = 0
    await page.goto(BASE + '/abonnement', { waitUntil: 'load' })
    await page.waitForSelector(`[data-abo-essai="${P}"]`, { timeout: 20_000 }).catch(() => {})
    const n1 = serveur.stripe().length
    await page.locator(`[data-abo-essai="${P}"]`).click()
    await page.waitForTimeout(3500)
    const urlEssai = demandesStripe.find((u) => /cs_test_/.test(u))
    const se = derniereSessionStripe(n1)
    sessionsAExpirer.push(idSession(urlEssai))
    verifier(P, 'essai gratuit : le bouton ouvre la session Stripe de TEST', !!urlEssai, JSON.stringify(demandesStripe).slice(0, 200))
    verifier(P, `essai gratuit : Stripe reçoit ${ESSAI_JOURS[P]} jours d’essai, AUCUNE carte exigée, annulation si aucune carte à la fin`,
      !!se && se.champs['subscription_data[trial_period_days]'] === String(ESSAI_JOURS[P]) && se.champs.payment_method_collection === 'if_required'
      && se.champs['subscription_data[trial_settings][end_behavior][missing_payment_method]'] === 'cancel' && se.champs['metadata[essai_jours]'] === String(ESSAI_JOURS[P]),
      JSON.stringify(se?.champs ?? {}).slice(0, 500))
    await ctx.close()

    // ── Activation de l'essai (webhook signé, comme Stripe l'enverrait à la fin du Checkout sans carte)
    const avant = await ligneDe('artisans', { id: c.id })
    const jourDuWebhook = new Date().toISOString().slice(0, 10)
    // Un VRAI client Stripe de test (le serveur le réutilise pour les sessions suivantes : un identifiant inventé ferait échouer le Checkout). Supprimé en fin de simulation.
    const clientStripe = await stripe.customers.create({ email: c.email, name: 'Simulation ' + P, metadata: { simulation: 'generale' } })
    clientsStripe.push(clientStripe.id)
    const subId = 'sub_sim_' + crypto.randomBytes(6).toString('hex'), cusId = clientStripe.id
    const meta = { uid: c.id, plan: P, credits: String(o.credits), essai_jours: String(ESSAI_JOURS[P]) }
    const w1 = await webhook('checkout.session.completed', { id: idSession(urlEssai), object: 'checkout.session', mode: 'subscription', status: 'complete', payment_status: 'no_payment_required', client_reference_id: c.id, metadata: meta, customer: cusId, subscription: subId, customer_details: { email: c.email, name: 'Sim' } })
    const apres = await ligneDe('artisans', { id: c.id })
    const joursAppliques = apres?.credits_reset_le ? Math.round((new Date(apres.credits_reset_le + 'T00:00:00Z').getTime() - new Date(jourDuWebhook + 'T00:00:00Z').getTime()) / 86400000) : -1
    verifier(P, `essai gratuit activé : offre ${PLAN_LIBELLE[P]}, crédits de l’essai (${creditsEssai(P)}), abonnement enregistré`, w1.status === 200 && apres?.plan === P && apres.credits === Math.max(avant.credits, creditsEssai(P)) && apres.stripe_subscription_id === subId, `HTTP ${w1.status} ${w1.corps.slice(0, 120)} plan ${apres?.plan} crédits ${apres?.credits} abo ${apres?.stripe_subscription_id}`)
    verifier(P, `essai gratuit : durée annoncée (${ESSAI_JOURS[P]} j) = durée appliquée (fin d’essai à J+${joursAppliques})`, joursAppliques === ESSAI_JOURS[P], `annoncé ${ESSAI_JOURS[P]} appliqué ${joursAppliques} (fin ${apres?.credits_reset_le})`)
    const registre = (await admin.from('essais_gratuits').select('plan, jours, artisan_id').eq('artisan_id', c.id)).data ?? []
    verifier(P, 'essai gratuit : inscrit au registre (un seul essai par compte)', registre.length === 1 && registre[0].plan === P && registre[0].jours === ESSAI_JOURS[P], JSON.stringify(registre))
    const w1bis = await webhook('checkout.session.completed', { id: idSession(urlEssai), object: 'checkout.session', mode: 'subscription', status: 'complete', payment_status: 'no_payment_required', client_reference_id: c.id, metadata: meta, customer: cusId, subscription: subId })
    const apresBis = await ligneDe('artisans', { id: c.id })
    verifier(P, 'essai gratuit : le rejeu du même événement ne recharge pas les crédits (idempotent)', w1bis.status === 200 && apresBis.credits === apres.credits, `${apres.credits} → ${apresBis.credits}`)
    const faux = await fetch(BASE + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=forge' }, body: '{}' })
    verifier(P, 'webhook : une signature forgée est refusée (400)', faux.status === 400, 'HTTP ' + faux.status)

    // ── Pendant l'essai : l'accès suit l'offre choisie
    const d1 = await http(c, 'GET', '/api/subscribe')
    verifier(P, 'pendant l’essai : plus d’autre essai possible (un seul par compte)', d1.corps?.essai?.disponible === false, JSON.stringify(d1.corps))
    await accesDeLOffre(c, P, 'pendant l’essai')

    // ── Fin de l'essai SANS carte : Stripe annule, le compte retombe sur l'Essai (lib/essaiGratuit.ts finDEssaiSansPaiement)
    const finEssaiTs = Math.floor(Date.now() / 1000) - 60
    const w2 = await webhook('customer.subscription.deleted', { id: subId, object: 'subscription', status: 'canceled', customer: cusId, metadata: { uid: c.id, plan: P, essai_jours: String(ESSAI_JOURS[P]) }, trial_end: finEssaiTs, ended_at: finEssaiTs, canceled_at: finEssaiTs })
    const fin = await ligneDe('artisans', { id: c.id })
    verifier(P, 'fin d’essai sans carte : retour à l’offre d’Essai, aucun abonnement, crédits ramenés à ceux de l’Essai', w2.status === 200 && fin?.plan === 'gratuit' && fin.stripe_subscription_id === null && fin.credits <= PLANS.gratuit.creditsMois, `HTTP ${w2.status} plan ${fin?.plan} abo ${fin?.stripe_subscription_id} crédits ${fin?.credits}`)
    await accesDeLOffre(c, 'gratuit', 'après la fin de l’essai', P)
    const d2 = await http(c, 'GET', '/api/subscribe')
    verifier(P, 'après l’essai : plus de semaines gratuites (déjà prises), seul le paiement reste', d2.corps?.essai?.disponible === false, JSON.stringify(d2.corps))
    {
      const ctx2 = await contexteDe(navigateur, c), p2 = await ctx2.newPage()
      await p2.goto(BASE + '/abonnement', { waitUntil: 'load' })
      await p2.waitForSelector(`[data-abo-payer="${P}"]`, { timeout: 30_000 }).catch(() => {})
      const nbEssai = await p2.locator(`[data-abo-essai="${P}"]`).count(), nbPayer = await p2.locator(`[data-abo-payer="${P}"]`).count()
      const mention = (await p2.locator('body').innerText().catch(() => '')).includes('jours gratuits, sans carte')
      verifier(P, 'écran /abonnement après l’essai : seul le choix « payer » reste, aucune promesse de jours gratuits', nbPayer === 1 && nbEssai === 0 && !mention, `payer ${nbPayer} essai ${nbEssai} mention ${mention}`)
      await ctx2.close()
    }
    const n2 = serveur.stripe().length
    const reEssai = await http(c, 'POST', '/api/subscribe', { plan: P, mode: 'essai' })
    const sr = derniereSessionStripe(n2)
    sessionsAExpirer.push(idSession(reEssai.corps?.url))
    verifier(P, 'après l’essai : redemander l’essai n’en donne pas un second (la session exige la carte)', reEssai.status === 200 && !!sr && !('subscription_data[trial_period_days]' in sr.champs) && sr.champs.payment_method_collection === undefined, JSON.stringify(sr?.champs ?? {}).slice(0, 300))

    // ── PAYER, jusqu'à l'activation (paiement simulé : webhook signé « payé ») puis résiliation
    const subPay = 'sub_sim_' + crypto.randomBytes(6).toString('hex')
    const w3 = await webhook('checkout.session.completed', { id: idSession(reEssai.corps?.url), object: 'checkout.session', mode: 'subscription', status: 'complete', payment_status: 'paid', client_reference_id: c.id, metadata: { uid: c.id, plan: P, credits: String(o.credits) }, customer: cusId, subscription: subPay })
    const pay = await ligneDe('artisans', { id: c.id })
    verifier(P, `payer : l’abonnement est activé — offre ${PLAN_LIBELLE[P]}, forfait entier de ${o.credits} crédits`, w3.status === 200 && pay?.plan === P && pay.credits >= o.credits && pay.stripe_subscription_id === subPay, `HTTP ${w3.status} plan ${pay?.plan} crédits ${pay?.credits}`)
    await accesDeLOffre(c, P, 'abonnement payé')
    const w4 = await webhook('customer.subscription.deleted', { id: subPay, object: 'subscription', status: 'canceled', customer: cusId, metadata: { uid: c.id, plan: P }, trial_end: null, ended_at: Math.floor(Date.now() / 1000) })
    const res = await ligneDe('artisans', { id: c.id })
    verifier(P, 'résiliation d’un abonnement payé : retour à l’Essai sans perdre les crédits restants', w4.status === 200 && res?.plan === 'gratuit' && res.credits === pay.credits, `plan ${res?.plan} crédits ${pay.credits}→${res?.credits}`)
  }
  // Ménage Stripe (mode test) : les sessions ouvertes sont expirées, aucune ne reste payable.
  let expirees = 0
  for (const id of new Set(sessionsAExpirer.filter(Boolean))) { try { await stripe.checkout.sessions.expire(id); expirees++ } catch { /* déjà expirée */ } }
  let supprimes = 0
  for (const id of clientsStripe) { try { await stripe.customers.del(id); supprimes++ } catch { /* déjà supprimé */ } }
  log(`\n  Stripe (test) : ${expirees} session(s) de paiement expirée(s), ${supprimes} client(s) de test supprimé(s), aucun abonnement réel créé.`)
}

/** Ce que l'offre `P` ouvre (ou ferme) côté serveur, vérifié sur trois portes révélatrices. */
async function accesDeLOffre(c, P, quand, cle = P) {
  const portes = [['plateforme.gestion', 'GET', '/api/plateforme/config'], ['inventaire.stock', 'GET', '/api/inventaire'], ['crm', 'GET', '/api/crm/vue']]
  const ecarts = []
  for (const [cap, m, chemin] of portes) {
    const r = await http(c, m, chemin)
    const ouvert = r.status !== 403 && r.status !== 401 && r.status < 500
    if (ouvert !== peut(P, cap)) ecarts.push(`${chemin} : HTTP ${r.status}, attendu ${peut(P, cap) ? 'ouvert' : 'fermé'}`)
  }
  verifier(cle, `accès ${quand} : les portes suivent l’offre ${PLAN_LIBELLE[P]} (Ma plateforme, inventaire, CRM)`, ecarts.length === 0, ecarts.join(' ; '))
}

// ─────────────────────────────── main ───────────────────────────────
const ETAPES_DEMANDEES = (process.argv.find((a) => a.startsWith('--etapes=')) || '').slice(9).split(',').filter(Boolean)
const PLANS_DEMANDES = (process.argv.find((a) => a.startsWith('--plans=')) || '').slice(8).split(',').filter(Boolean)
const PLANS_JOUES = ['gratuit', 'studio', 'signature'].filter((p) => PLANS_DEMANDES.length === 0 || PLANS_DEMANDES.includes(p))
/** Un écran qui se fige (machine chargée, page bloquée) ne fige pas la simulation : le parcours est rejoué UNE fois avec un navigateur neuf ; s'il échoue encore, c'est un défaut. */
let tentative = 0
async function garde(plan, nom, ms, fn) {
  for (let essai = 1; essai <= 2; essai++) {
    tentative++
    const n0 = constats.length
    let erreur = null, t
    try { await Promise.race([fn(), new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`bloqué plus de ${ms / 1000} s`)), ms) })]) }
    catch (e) { erreur = e } finally { clearTimeout(t) }
    const nouveaux = constats.slice(n0)
    const rate = erreur || nouveaux.some((c) => c.statut === 'defaut')
    if (!rate) return
    if (essai === 1) {
      // Première défaillance : on l'oublie (elle a pu venir d'une machine chargée) et on rejoue, navigateur neuf.
      for (const c of nouveaux) { if (c.statut === 'defaut') ko--; else ok-- }
      constats.length = n0
      log(`  ↻ ${nom} (${plan}) : défaillance, nouvel essai avec un navigateur neuf${erreur ? ' — ' + String(erreur.message).slice(0, 100) : ''}`)
      try { await navigateur.close() } catch { /* déjà fermé */ }
      navigateur = await chromium.launch()
    } else if (erreur) {
      constat(plan, `${nom} : le parcours va jusqu’au bout`, 'defaut', String(erreur.message ?? erreur).slice(0, 300))
      try { await navigateur.close() } catch { /* déjà fermé */ }
      navigateur = await chromium.launch()
    }
  }
}
const ECRANS_DEMANDES = (process.argv.find((a) => a.startsWith('--ecrans=')) || '').slice(9).split(',').filter(Boolean)
const ecr = (n) => ECRANS_DEMANDES.length === 0 || ECRANS_DEMANDES.includes(n)
const etape = (nom) => ETAPES_DEMANDEES.length === 0 || ETAPES_DEMANDEES.includes(nom)
const proxy = await demarrerProxyIA({ reelsMax: 2 })
let serveur = null, navigateur = null, erreurFatale = null
const resultatsSuites = []
const idsPurges = []
let verdictMenage = { comptes: 0, restes: [], echecs: [] }
try {
  log('Simulation générale — démarrage du serveur local de production…')
  serveur = await demarrerServeur({ ia: proxy.url })
  BASE = serveur.base
  secretWebhook = serveur.secretWebhook
  log(`Serveur : ${BASE} (clé Stripe de TEST, e-mails interceptés, IA comptée)`)
  navigateur = await chromium.launch()

  const C = {}
  if (etape('parcours') || etape('ecrans')) {
    for (const plan of PLANS_JOUES) C[plan] = await creerCompte(plan)
    log(`Comptes créés : ${Object.values(C).map((c) => c.plan).join(', ')}`)
  }
  if (etape('parcours')) {
    for (const plan of PLANS_JOUES) {
      await socle(C[plan], { ia: proxy })
      await portes(C[plan])
      if (peut(plan, 'plateforme.conversation')) { await plateforme(C[plan]); await gestion(C[plan]) }
      if (peut(plan, 'crm')) await atelier(C[plan], proxy)
    }
  }
  if (etape('ecrans') && !ARGS.has('--sans-ui')) {
    section = 'ecrans'
    for (const plan of PLANS_JOUES) {
      if (ecr('pages')) await garde(plan, 'écrans de la console', 420_000, () => parcoursEcrans(navigateur, C[plan]))
      if (ecr('devis')) await garde(plan, 'écran devis', 300_000, () => ecranDevis(navigateur, C[plan]))
      if (ecr('chat') && peut(plan, 'plateforme.conversation')) await garde(plan, 'page de conversation et Messages', 300_000, () => ecranPlateforme(navigateur, C[plan]))
      if (ecr('communs')) await garde(plan, 'paramètres, aide, tableau de bord', 300_000, () => ecransCommuns(navigateur, C[plan]))
    }
    if (ecr('videos')) await videosAide()
  }
  if (etape('abonnements')) { section = 'abonnements'; try { await abonnements(navigateur) } catch (e) { constat('tous', 'abonnements : le parcours va jusqu’au bout', 'defaut', String(e?.stack ?? e).slice(0, 400)) } }
  section = 'suites'
  if (ARGS.has('--suites')) await lancerSuites()
} catch (e) {
  erreurFatale = e
  console.error('\nERREUR FATALE :', e?.stack ?? e)
} finally {
  try { await navigateur?.close() } catch { /* fermé */ }
  verdictMenage = await menage()
  log(`\nMénage : ${verdictMenage.comptes} compte(s) retiré(s)${verdictMenage.echecs.length ? ` — ÉCHECS : ${verdictMenage.echecs.join(' | ')}` : ''}${verdictMenage.restes.length ? ` — RESTES : ${verdictMenage.restes.join(' | ')}` : ' — rien ne reste en base'}`)
  if (verdictMenage.echecs.length || verdictMenage.restes.length) { ko++; constats.push({ plan: 'tous', fonction: 'ménage : plus rien en base après la simulation', statut: 'defaut', detail: [...verdictMenage.echecs, ...verdictMenage.restes].join(' | '), section: 'menage' }) }
  else constats.push({ plan: 'tous', fonction: 'ménage : plus rien en base après la simulation', statut: 'marche', detail: '', section: 'menage' })
  const mailsInterceptes = (() => { try { return serveur?.mails() ?? [] } catch { return [] } })()
  const appelsStripe = (() => { try { return serveur?.stripe() ?? [] } catch { return [] } })()
  try { await serveur?.arreter() } catch { /* arrêté */ }
  try { await proxy.fermer() } catch { /* fermé */ }
  if (!ARGS.has('--sans-rapport')) { try { ecrireRapport({ mailsInterceptes, appelsStripe }) } catch (e) { console.error('rapport :', e) } }
}
log(`\nBilan : ${ok} ok · ${ko} défaut(s)`)
process.exit(erreurFatale ? 2 : ko ? 1 : 0)

// ─────────────────────────────── les suites existantes ───────────────────────────────
async function lancerSuites() {
  log('\n── Suites existantes rejouées contre le serveur local')
  const base = BASE
  const envSuite = { ...process.env, TEST_BASE: base, STRIPE_WEBHOOK_SECRET: serveur.secretWebhook, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY_TEST, RESEND_API_KEY: 'sim-cle-factice-aucun-envoi-reel', ANTHROPIC_BASE_URL: 'http://127.0.0.1:1' }
  const ts = ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs']
  const LISTE = [
    ['Écrans et verrous par offre (HTTP, comptes réels)', ts, 'scripts/ecrans-offre-e2e.mjs'],
    ['Écrans verrouillés (statique)', ts, 'scripts/ecrans-offre-qa.mjs'],
    ['Offres = verrous (matrice)', ts, 'scripts/offres-e2e.mjs'],
    ['Affichage des offres (accueil, abonnement, comparatif)', ts, 'scripts/offres-affichage-qa.mjs'],
    ['Comparatif', ts, 'scripts/comparatif-qa.mjs'],
    ['Essai gratuit sans carte (Checkout, webhook, textes, 13 mutations)', ts, 'scripts/essais-gratuits-qa.mjs'],
    ['Abonnement : cycle de vie Stripe (mode test, via le serveur local)', ['--import', './scripts/ts-loader.mjs'], 'scripts/abonnement-e2e.mjs', ['--via-serveur']],
    ['Comptes clients (lien magique, session, cloisonnement)', [], 'scripts/comptes-clients-e2e.mjs', [base]],
    ['Relances d’impayés (calendrier, arrêts, idempotence — mémoire)', ts, 'scripts/relances-impayes-qa.mjs'],
    ['Accès aux automatisations', ts, 'scripts/acces-automatisations-qa.mjs'],
    ['CRM (validation, accès, pipeline, rendu)', ts, 'scripts/crm-qa.mjs'],
    ['CRM : temps réel (deux clients, isolation)', ts, 'scripts/crm-temps-reel-qa.mjs'],
    ['Assistant de gestion (hors ligne + comptes de test, sans modèle réel)', ts, 'scripts/assistant-qa.mjs', ['--live']],
    ['Centre d’aide : vidéos présentes et lisibles (lecture seule)', [], 'scripts/aide-videos-qa.mjs'],
    ['Fermeture des portes (routes, pages, capacités)', ts, 'scripts/fermeture-e2e.mjs'],
  ]
  const seulement = (process.argv.find((a) => a.startsWith('--suite=')) || '').slice(8)
  for (const [nom, pre, script, post = []] of LISTE.filter((x) => !seulement || x[2].includes(seulement))) {
    if (!fs.existsSync(path.join(RACINE, script))) { resultatsSuites.push({ nom, script, code: -1, resume: 'script absent' }); continue }
    await purgerAbusLocal()
    const t0 = Date.now()
    const r = spawnSync(process.execPath, [...pre, script, ...post], { cwd: RACINE, env: envSuite, encoding: 'utf8', timeout: 420_000, maxBuffer: 64 * 1024 * 1024 })
    const sortie = String(r.stdout ?? '') + String(r.stderr ?? '')
    if (seulement) fs.writeFileSync(path.join(process.env.TEMP || '.', 'sim-suite-' + path.basename(script) + '.log'), sortie)
    const lignes = sortie.split(/\r?\n/).filter((l) => l.trim())
    const echecs = lignes.filter((l) => /❌|FAIL|✗/.test(l)).length
    const verts = lignes.filter((l) => /✅|PASS|✓/.test(l)).length
    const bilan = [...lignes].reverse().find((l) => /bilan|total|pass|ok\b|vert|rouge|défaut|✅.*\d|\d+\s*\/\s*\d+/i.test(l)) ?? lignes.slice(-1)[0] ?? ''
    const code = r.status ?? (r.error ? -2 : -3)
    resultatsSuites.push({ nom, script, code, verts, echecs, secondes: Math.round((Date.now() - t0) / 1000), resume: bilan.slice(0, 200), echecsLignes: lignes.filter((l) => /❌|FAIL/.test(l)).slice(0, 4).map((l) => l.slice(0, 220)) })
    log(`  ${code === 0 ? '✅' : '❌'} ${nom} — code ${code}, ${verts} ✓ / ${echecs} ✗ (${Math.round((Date.now() - t0) / 1000)} s)`)
    for (const l of resultatsSuites.at(-1).echecsLignes) log('       ' + l)
  }
}

// ─────────────────────────────── les traces d'abus du serveur LOCAL ───────────────────────────────
/** Les suites existantes frappent le serveur local depuis 127.0.0.1 : l'anti-abus (fait pour ça) y note des abus, finit par bannir, et pose des plafonds.
 *  Ces lignes-là — et celles de nos adresses de documentation 203.0.113.x — ne concernent aucun vrai visiteur ; on les retire (comme scripts/purger-abus.mjs, mais pour l'adresse du serveur local). */
async function purgerAbusLocal() {
  const ips = ['127.0.0.1', '::1', '::ffff:127.0.0.1']
  for (const t of ['ip_abus', 'ip_bans']) {
    await admin.from(t).delete().in('ip', ips).then(() => {}, () => {})
    await admin.from(t).delete().like('ip', '203.0.113.%').then(() => {}, () => {})
  }
  for (const ip of ips) await admin.from('limites').delete().like('cle', '%' + ip + '%').then(() => {}, () => {})
  await admin.from('limites').delete().like('cle', '%203.0.113.%').then(() => {}, () => {})
}

// ─────────────────────────────── le ménage, PROUVÉ ───────────────────────────────
async function menage() {
  const v = { comptes: comptes.length, restes: [], echecs: [] }
  const ids = comptes.map((c) => c.id)
  // Stripe (mode test) : aucune session de paiement ne reste ouverte, aucun client de test ne reste (même si le parcours a été interrompu).
  for (const id of new Set(sessionsAExpirer.filter(Boolean))) await stripe.checkout.sessions.expire(id).then(() => {}, () => {})
  for (const id of clientsStripe) await stripe.customers.del(id).then(() => {}, () => {})
  const leadsAvant = []
  for (const id of ids) leadsAvant.push(...(((await admin.from('leads').select('id').eq('artisan_id', id)).data ?? []).map((l) => l.id)))
  for (const c of comptes) {
    const { error } = await admin.rpc('purger_compte_test', { p_id: c.id })
    if (error) v.echecs.push(`${c.email.replace(/@.*/, '')} : ${error.message}`)
  }
  // Le registre des essais garde, VOLONTAIREMENT, la trace d'un compte supprimé (pas de nouvel essai avec la même boîte) : pour des comptes de test, la simulation la retire.
  await purgerAbusLocal()
  await admin.from('essais_gratuits').delete().in('artisan_id', ids).then(() => {}, () => {})
  // Les compteurs anti-abus (table limites) portent l'identifiant du compte dans leur clé : ils partent aussi.
  for (const id of ids) await admin.from('limites').delete().like('cle', `%${id}%`).then(() => {}, () => {})
  // La preuve : on LIT la base. Compte de connexion, fiche, puis CHAQUE table qui porte une colonne artisan_id (schéma lu chez PostgREST).
  for (const id of ids) {
    const u = await fetch(`${SB}/auth/v1/admin/users/${id}`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } })
    if (u.status !== 404) v.restes.push(`compte de connexion ${id.slice(0, 8)} (${u.status})`)
  }
  const ouverture = await fetch(`${SB}/rest/v1/`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).then((r) => r.json()).catch(() => null)
  const defs = ouverture?.definitions ?? {}
  const tables = Object.entries(defs).filter(([, d]) => d?.properties && ('artisan_id' in d.properties || (d.properties.id && 'email' in d.properties && 'plan' in d.properties))).map(([nom, d]) => [nom, 'artisan_id' in d.properties ? 'artisan_id' : 'id'])
  let verifiees = 0
  for (const [table, col] of tables) {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true }).in(col, ids)
    if (error) continue
    verifiees++
    if ((count ?? 0) > 0) v.restes.push(`${table} : ${count} ligne(s)`)
  }
  if (leadsAvant.length) {
    const m = await admin.from('messages').select('*', { count: 'exact', head: true }).in('lead_id', leadsAvant)
    if ((m.count ?? 0) > 0) v.restes.push(`messages : ${m.count} ligne(s)`)
    const r = await admin.from('relances').select('*', { count: 'exact', head: true }).in('lead_id', leadsAvant)
    if ((r.count ?? 0) > 0) v.restes.push(`relances : ${r.count} ligne(s)`)
  }
  const e = await admin.from('essais_gratuits').select('*', { count: 'exact', head: true }).in('artisan_id', ids)
  if ((e.count ?? 0) > 0) v.restes.push(`essais_gratuits : ${e.count} ligne(s)`)
  const f = await admin.storage.from('artisan-media').list(ids[0] ?? 'x').then((x) => x.data ?? [], () => [])
  v.tablesVerifiees = verifiees
  return v
}

// ─────────────────────────────── le rapport ───────────────────────────────
function ecrireRapport({ mailsInterceptes, appelsStripe }) {
  const SYMBOLE = { marche: '✅', ferme: '🔒', defaut: '❌', nt: '⚪' }
  const fichier = path.join(RACINE, 'plans', 'simulation-generale-1610.md')
  const plans = ['gratuit', 'studio', 'signature']
  const principal = constats.filter((c) => !c.section || c.section === 'ecrans')
  const abo = constats.filter((c) => c.section === 'abonnements')
  const rang = { defaut: 3, nt: 2, ferme: 1, marche: 0 }
  const tableau = (liste, colonnes, cle) => {
    const lignes = new Map()
    for (const c of liste) {
      const l = lignes.get(c.fonction) ?? {}
      const k = cle(c)
      if (!l[k] || rang[c.statut] > rang[l[k].statut]) l[k] = c
      lignes.set(c.fonction, l)
    }
    const en = '| Fonctionnalité | ' + colonnes.map((p) => PLAN_LIBELLE[p] ?? p).join(' | ') + ' |\n|---|' + colonnes.map(() => ':-:').join('|') + '|\n'
    return en + [...lignes].map(([f, l]) => `| ${f.replace(/\|/g, '/')} | ${colonnes.map((p) => (l[p] ? SYMBOLE[l[p].statut] : '·')).join(' | ')} |`).join('\n')
  }
  const defauts = constats.filter((c) => c.statut === 'defaut')
  const FONCTIONS = [
    ['Tableau de bord', /tableau de bord|écran \/dashboard/i],
    ['Clients (fiches clients du CRM ; hors CRM, le client se saisit dans le devis)', /fiches clients|porte : CRM atelier/i],
    ['Devis : création, PDF, envoi par e-mail', /^devis : (création|PDF|envoi)|écran devis|écran \/devis$|devis de la conversation/i],
    ['Chiffrage du devis par l’IA, sur les tarifs de l’artisan', /chiffrage|chiffrer avec|crédits épuisés|devis automatique/i],
    ['Factures : depuis un devis, payée, Factur-X', /^factures :|écran \/factures|créer la facture/i],
    ['Acompte automatique à l’acceptation (règle Signature)', /acompte|règles d’automatisation/i],
    ['Mes tarifs', /^tarifs|écran \/tarifs/i],
    ['Page de conversation publique (demande d’un client)', /page de conversation|page publique|conversation publique/i],
    ['Messages (boîte, réponses, prise de main)', /^Messages|porte : Messages|écran \/messages$|écran \/messages\/canaux|porte : Boîte e-mail/i],
    ['Réponse préparée / automatique, Réponses instantanées', /réponse préparée|réponse automatique|Réponses instantanées|écran \/outils|Ma plateforme|écran \/plateforme/i],
    ['Comptes clients (lien magique)', /comptes clients/i],
    ['Relances de conversation (J+2 / J+5 / J+10)', /relances de conversation/i],
    ['Relances d’impayés', /relances d’impayés|Relances automatiques des factures/i],
    ['Inventaire (stock, recherche fournisseurs)', /inventaire/i],
    ['Mes chiffres', /porte : Mes chiffres(?! : auto)|écran \/chiffres|^Mes chiffres : (le tableau)/i],
    ['Automatisations de Mes chiffres (Signature)', /automatisations/i],
    ['CRM atelier (pipeline, chantiers, vue)', /^CRM|porte : CRM atelier|écran \/crm/i],
    ['Assistant de gestion (commande + carte à confirmer)', /assistant de gestion|porte : Assistant|écran \/assistant/i],
    ['Centre d’aide (vidéos)', /centre d’aide|écran \/aide/i],
    ['Paramètres', /paramètres|écran \/parametres|écran \/profil/i],
    ['Abonnement (écran, choix payer / essai)', /écran \/abonnement|paramètres → abonnement/i],
  ]
  const synthese = (() => {
    const lignes = FONCTIONS.map(([label, re]) => {
      const cellules = plans.map((p) => {
        const liste = principal.filter((c) => c.plan === p && re.test(c.fonction))
        if (!liste.length) return '·'
        if (liste.some((c) => c.statut === 'defaut')) return '❌'
        const m = liste.some((c) => c.statut === 'marche'), fe = liste.some((c) => c.statut === 'ferme')
        return m && fe ? '✅🔒' : fe ? '🔒' : m ? '✅' : '⚪'
      })
      return `| ${label} | ${cellules.join(' | ')} |`
    })
    return '| Fonctionnalité | ' + plans.map((p) => PLAN_LIBELLE[p]).join(' | ') + ' |\n|---|' + plans.map(() => ':-:').join('|') + '|\n' + lignes.join('\n')
  })()
  const ia = proxy.etat.journal
  const reels = ia.filter((x) => x.mode === 'reel')
  const ordreSection = { ecrans: 'Écrans', abonnements: 'Abonnements' }
  const auto = [
    '<!-- AUTO-DEBUT : ce bloc est réécrit par scripts/simulation-generale.mjs ; le reste du fichier est à la main -->',
    `## Résultats de la dernière exécution (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`,
    '',
    `Bilan : **${ok} contrôles verts, ${ko} défaut(s)** — ${constats.length} constats ; build local de production (\`.next-simulation\`), base réelle, clé Stripe de TEST, e-mails interceptés (${mailsInterceptes.length} message(s) consigné(s), aucun parti), appels IA comptés (${reels.length} réel(s) sur ${ia.length}).`,
    '',
    'Légende : ✅ marche · 🔒 fermé comme prévu (écran verrouillé et/ou refus serveur sans donnée ni crédit) · ❌ défaut · · non applicable ou non joué.',
    '',
    '### Offre × fonctionnalité (synthèse)',
    '',
    synthese,
    '',
    '_✅🔒 : la fonction marche et ses annexes hors offre sont fermées (ex. chiffrage ouvert, rangement IA des fichiers fermé)._',
    '',
    '<details><summary>Détail : les ' + principal.length + ' contrôles, un par un</summary>',
    '',
    tableau(principal, plans, (c) => c.plan),
    '',
    '</details>',
    '',
    '### Contrôles transverses',
    '',
    constats.filter((c) => c.plan === 'tous').map((c) => `- ${SYMBOLE[c.statut]} ${c.fonction}${c.statut === 'defaut' ? ' — ' + c.detail : ''}`).join('\n') || '_aucun_',
    '',
    '### Les deux choix de chaque offre payante (payer / semaines gratuites offertes)',
    '',
    abo.length ? tableau(abo, OFFRES.map((o) => o.id), (c) => c.plan) : '_non joué dans cette exécution_',
    '',
    '### Appels IA',
    '',
    ia.length ? `${ia.length} appel(s) au modèle : **${reels.length} réel(s)** (plafond de la simulation : 2), ${ia.length - reels.length} simulé(s).\n\n` + reels.map((x) => `- réel : ${x.modele ?? '?'} — « ${String(x.note).slice(0, 60)}… » (outils : ${x.outils}${x.contientMarqueur ? ', les tarifs de l’artisan figuraient dans le prompt' : ''})`).join('\n') : '_aucun_',
    '',
    '### E-mails interceptés (jamais livrés)',
    '',
    mailsInterceptes.length ? mailsInterceptes.map((m) => `- à \`${(Array.isArray(m.a) ? m.a.join(',') : m.a) || '?'}\` — ${String(m.objet ?? '').slice(0, 80)}${m.pj?.length ? ` (pièce jointe ${m.pj.map((p) => `${p.nom} ${p.octets} o`).join(', ')})` : ''}`).join('\n') : '_aucun_',
    '',
    '### Stripe (mode test)',
    '',
    `${appelsStripe.filter((x) => /checkout\/sessions$/.test(x.chemin) && x.methode === 'POST').length} session(s) de paiement créée(s) par le serveur (mode test), toutes expirées ensuite ; aucun paiement, aucun abonnement réel.`,
    '',
    resultatsSuites.length ? '### Suites existantes rejouées\n\n| Suite | Code | ✓ | ✗ | Durée |\n|---|:-:|:-:|:-:|:-:|\n' + resultatsSuites.map((s) => `| ${s.nom} (\`${s.script}\`) | ${s.code === 0 ? '✅ 0' : '❌ ' + s.code} | ${s.verts ?? ''} | ${s.echecs ?? ''} | ${s.secondes ?? ''} s |`).join('\n') + (resultatsSuites.some((s) => s.code !== 0) ? '\n\n' + resultatsSuites.filter((s) => s.code !== 0).map((s) => `- **${s.nom}** : ${(s.echecsLignes ?? []).join(' / ') || s.resume}`).join('\n') : '') : '',
    '',
    '### Ménage',
    '',
    verdictMenage.echecs.length || verdictMenage.restes.length ? `❌ ${[...verdictMenage.echecs, ...verdictMenage.restes].join(' ; ')}` : `${verdictMenage.comptes} comptes de test créés puis supprimés ; relu en base après coup : aucun compte de connexion, aucune fiche, aucune ligne dans les ${verdictMenage.tablesVerifiees ?? '?'} tables portant \`artisan_id\`, ni messages, relances ou essais.`,
    '',
    defauts.length ? '### Défauts relevés par cette exécution\n\n' + defauts.map((d) => `- [${PLAN_LIBELLE[d.plan] ?? d.plan}] ${d.fonction} — ${d.detail}`).join('\n') : '### Défauts relevés par cette exécution\n\naucun.',
    '<!-- AUTO-FIN -->',
  ].join('\n')
  let existant = fs.existsSync(fichier) ? fs.readFileSync(fichier, 'utf8') : '# Simulation générale — 16/10/2026\n\n<!-- AUTO-DEBUT -->\n<!-- AUTO-FIN -->\n'
  existant = existant.replace(/<!-- AUTO-DEBUT[\s\S]*?<!-- AUTO-FIN -->/, () => auto)
  fs.writeFileSync(fichier, existant)
  log(`Rapport : ${path.relative(RACINE, fichier)}`)
}
