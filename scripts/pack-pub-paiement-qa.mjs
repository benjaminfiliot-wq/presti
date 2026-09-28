#!/usr/bin/env node
// scripts/pack-pub-paiement-qa.mjs — le juge de l'argent du pack pubs (fiches 026-112 « noyau » et 026-118 « route »),
// écrit par Claude Code AVANT ce qu'il juge (fiche 026-108, « Ce qu'il faut faire », point 3). Contrat : scripts/
// fixtures/026-pubs-contenu/contrat-pack.json ; jeux d'essai : scripts/fixtures/026-pubs-contenu/argent/{sessions,dossiers}.
//
// --partie=noyau (PP-1 à PP-7) : les fonctions pures de lib/packPub.ts et l'aiguillage de lib/stripeAiguillage.ts sont
// APPELÉES pour de vrai, dans un processus à part (node --experimental-strip-types --import ./scripts/ts-loader.mjs,
// cwd = racine) — jamais une lecture de leur texte, sauf pour la branche du webhook (PP-4) et lib/packPubServeur.ts
// (PP-5, écriture Supabase : on lit ce qu'il fait, on ne l'exécute pas). --partie=route (PP-8, PP-9) : lecture statique
// de app/api/pubs/commander/route.ts et de lib/flags.ts. --reel (Claude Code seulement, accord de Benj) : une vraie
// session Checkout avec parametresCheckoutPack(), expirée aussitôt, sans débit (modèle scripts/stripe-session-test.mjs).
//
// Critères noyau : PP-1 constantes et erreursAvantPaiementPack · PP-2 decisionEncaissement · PP-3 aiguiller (pack_pub,
// orphelin) · PP-4 branche du webhook · PP-5 lib/packPubServeur.ts · PP-6 parametresCheckoutPack · PP-7 non-régression.
// Critères route : PP-8 la route /api/pubs/commander · PP-9 lib/flags.ts.
//
// Usage :
//   node scripts/pack-pub-paiement-qa.mjs --partie=noyau|route [--racine=<dossier>]
//   node scripts/pack-pub-paiement-qa.mjs --partie=noyau|route --temoin   PP-7 seul (non-régression ; route : rien à
//                                                                          prouver tant que rien n'est encore construit)
//   node scripts/pack-pub-paiement-qa.mjs --partie=noyau --reel            Claude Code seulement, accord de Benj
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide ou préalable manquant (--reel).
// N'écrit que sous .orchestre/travail/pack-pub-paiement-qa/. Aucun secret affiché.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, lireOptionsOuQuitter, git, lancer } from './fixtures/025/commun.mjs'
import { creerRapport, lireEnvLocal, dossierTravail, court, lf } from './lib/sql-essai.mjs'
import { CONTRAT, lireSessions, lireDossiers } from './fixtures/026-pubs-contenu/commun.mjs'

const NOM = 'pack-pub-paiement-qa'
const TS_LOADER = path.join(R, 'scripts', 'ts-loader.mjs')
const FICHE = { noyau: '026-112', route: '026-118' }
const IDS = { noyau: ['PP-1', 'PP-2', 'PP-3', 'PP-4', 'PP-5', 'PP-6', 'PP-7'], route: ['PP-8', 'PP-9'] }
const PL = CONTRAT.pack_locale

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['partie'] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
const PARTIE = o.valeur('partie')
if (!['noyau', 'route'].includes(PARTIE)) refuser(`--partie=noyau|route attendu (reçu : ${PARTIE ?? 'rien'})`)
if (o.reel && PARTIE !== 'noyau') refuser('--reel ne se lance que sur --partie=noyau (parametresCheckoutPack)')
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }
const jsonEgal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ── Un extracteur de bloc { … } conscient des chaînes, gabarits et commentaires JS/TS (PAS un parseur SQL) ────────────
function extraireAccolades(texte, iOuverte) {
  let i = iOuverte, prof = 0
  const n = texte.length
  while (i < n) {
    const c = texte[i]
    if (c === '/' && texte[i + 1] === '/') { const nl = texte.indexOf('\n', i); i = nl < 0 ? n : nl; continue }
    if (c === '/' && texte[i + 1] === '*') { const e = texte.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue }
    if (c === "'" || c === '"') { const q = c; i++; while (i < n && texte[i] !== q) { i += texte[i] === '\\' ? 2 : 1 }; i++; continue }
    if (c === '`') { i++; while (i < n && texte[i] !== '`') { if (texte[i] === '\\') i += 2; else if (texte[i] === '$' && texte[i + 1] === '{') { i += 2; let d = 1; while (i < n && d) { if (texte[i] === '{') d++; else if (texte[i] === '}') d--; i++ } } else i++ }; i++; continue }
    if (c === '{') { prof++; i++; continue }
    if (c === '}') { prof--; i++; if (prof === 0) return texte.slice(iOuverte, i); continue }
    i++
  }
  return null
}
/** Le corps de `export [async ]function <nom>(…) { … }`, accolades comprises, ou null. */
function extraireFonction(texte, nom) {
  const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${nom}\\b[\\s\\S]*?\\{`)
  const m = re.exec(texte)
  if (!m) return null
  return extraireAccolades(texte, m.index + m[0].length - 1)
}

// ── La sonde (--partie=noyau) : un processus à part, cwd = racine, qui IMPORTE et APPELLE le code jugé ────────────────
const ENTREE_CHECKOUT = { packId: 'pack-essai-0001', uid: 'uid-essai-0001', email: 'artisan-essai@exemple.invalid', origin: 'https://prestiapp.fr' }
const DECISIONS = [
  { nom: 'aucune ligne', avant: null, session: { id: 'sess_a' }, attendu: 'introuvable' },
  { nom: 'brouillon', avant: { etat: 'brouillon', stripe_session_id: null }, session: { id: 'sess_b' }, attendu: 'encaisser' },
  { nom: 'même session déjà payée', avant: { etat: 'payee', stripe_session_id: 'sess_c' }, session: { id: 'sess_c' }, attendu: 'deja' },
  { nom: 'autre session sur une ligne déjà payée', avant: { etat: 'payee', stripe_session_id: 'sess_c' }, session: { id: 'sess_d' }, attendu: 'second_paiement' },
]
function construireSonde() {
  const dossiers = lireDossiers().map((d) => ({ nom: d.nom, entree: d.entree, champ: d.champ }))
  const sessions = lireSessions().map((s) => ({ nom: s.nom, session: s.session, attendu: { site: 'commande_site', abonnement: 'abonnement', pack: 'pack_pub', 'pack-abonnement': 'orphelin', 'type-inconnu': 'orphelin', 'sans-metadata': 'orphelin' }[s.nom] }))
  return `// Sonde de ${NOM} (--partie=noyau), écrite par le juge (fiche 026-108). Importe et APPELLE le code jugé, cwd = racine.
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const R = ${JSON.stringify(racine)}
async function importer(rel) { try { return { m: await import(pathToFileURL(path.join(R, rel)).href) } } catch (e) { return { erreur: String((e && e.stack) || e) } } }
const packPub = await importer('lib/packPub.ts')
const aiguillage = await importer('lib/stripeAiguillage.ts')
const facturation = await importer('lib/facturation.ts')
const out = { erreurs: {}, constantes: {}, dossiers: [], decisions: [], aiguillages: [], checkout: null, mentionFranchise: null }
if (packPub.erreur) out.erreurs.packPub = packPub.erreur
if (aiguillage.erreur) out.erreurs.aiguillage = aiguillage.erreur
if (facturation.erreur) out.erreurs.facturation = facturation.erreur
const PP = packPub.m || {}
const AI = aiguillage.m || {}
const FA = facturation.m || {}
out.constantes = { PRIX_PACK_PUB_CENTS: PP.PRIX_PACK_PUB_CENTS, PRIX_PACK_PUB_TEXTE: PP.PRIX_PACK_PUB_TEXTE, ETATS_PACK: PP.ETATS_PACK, TRANSITIONS_PACK: PP.TRANSITIONS_PACK, ACCROCHES_PACK: PP.ACCROCHES_PACK }
for (const d of ${JSON.stringify(dossiers)}) {
  try { const r = typeof PP.erreursAvantPaiementPack === 'function' ? PP.erreursAvantPaiementPack(d.entree) : '(absente)'; out.dossiers.push({ nom: d.nom, champ: d.champ, resultat: r }) }
  catch (e) { out.dossiers.push({ nom: d.nom, champ: d.champ, exception: String((e && e.message) || e) }) }
}
for (const c of ${JSON.stringify(DECISIONS)}) {
  try { out.decisions.push({ nom: c.nom, attendu: c.attendu, rendu: typeof PP.decisionEncaissement === 'function' ? PP.decisionEncaissement(c.avant, c.session) : '(absente)' }) }
  catch (e) { out.decisions.push({ nom: c.nom, attendu: c.attendu, exception: String((e && e.message) || e) }) }
}
for (const s of ${JSON.stringify(sessions)}) {
  try { out.aiguillages.push({ nom: s.nom, attendu: s.attendu, rendu: typeof AI.aiguiller === 'function' ? AI.aiguiller(s.session) : '(absente)' }) }
  catch (e) { out.aiguillages.push({ nom: s.nom, attendu: s.attendu, exception: String((e && e.message) || e) }) }
}
try {
  delete process.env.STRIPE_TAXE_AUTO
  delete process.env.STRIPE_PRIX_PACK_PUB
  out.checkout = typeof PP.parametresCheckoutPack === 'function' ? PP.parametresCheckoutPack(${JSON.stringify(ENTREE_CHECKOUT)}) : '(absente)'
  out.mentionFranchise = typeof FA.mentionFranchise === 'function' ? FA.mentionFranchise('auto') : null
} catch (e) { out.erreurs.checkout = String((e && e.message) || e) }
console.log('SONDE_PP_JSON ' + JSON.stringify(out))
`
}
function lancerSonde() {
  const fichier = path.join(dossierTravail(NOM), 'sonde-noyau.mjs')
  fs.writeFileSync(fichier, construireSonde())
  const r = lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(TS_LOADER).href, fichier], { cwd: racine, timeout: 60_000, env: {} })
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith('SONDE_PP_JSON '))
  if (!ligne) return { erreur: `la sonde n'a rendu aucun résultat (code ${r.code}${r.signal ? ` signal ${r.signal}` : ''}) : ${court(r.sortie, 300)}` }
  try { return { r: JSON.parse(ligne.slice('SONDE_PP_JSON '.length)) } } catch { return { erreur: 'résultat de la sonde illisible (JSON invalide)' } }
}

// ── PP-1 à PP-3, PP-6 : jugés sur le résultat de la sonde ───────────────────────────────────────────────────────────────
function jugerPP1(s, r) {
  if (r.erreurs.packPub) { s.echoue('PP-1', `lib/packPub.ts ne s'importe pas : ${court(r.erreurs.packPub, 200)}`); return }
  const c = r.constantes
  if (c.PRIX_PACK_PUB_CENTS !== PL.prix_cents) s.echoue('PP-1', `PRIX_PACK_PUB_CENTS = ${JSON.stringify(c.PRIX_PACK_PUB_CENTS)}, ${PL.prix_cents} attendu`)
  if (c.PRIX_PACK_PUB_TEXTE !== PL.prix_texte) s.echoue('PP-1', `PRIX_PACK_PUB_TEXTE = ${JSON.stringify(c.PRIX_PACK_PUB_TEXTE)}, ${JSON.stringify(PL.prix_texte)} attendu`)
  if (!Array.isArray(c.ETATS_PACK) || !jsonEgal([...c.ETATS_PACK].sort(), [...PL.etats].sort())) s.echoue('PP-1', `ETATS_PACK = ${JSON.stringify(c.ETATS_PACK)}, ${JSON.stringify(PL.etats)} attendu`)
  if (!c.TRANSITIONS_PACK || typeof c.TRANSITIONS_PACK !== 'object' || !jsonEgal(c.TRANSITIONS_PACK, PL.transitions)) s.echoue('PP-1', `TRANSITIONS_PACK = ${JSON.stringify(c.TRANSITIONS_PACK)}, ${JSON.stringify(PL.transitions)} attendu`)
  if (!Array.isArray(c.ACCROCHES_PACK) || !jsonEgal([...c.ACCROCHES_PACK].sort(), [...PL.accroches].sort())) s.echoue('PP-1', `ACCROCHES_PACK = ${JSON.stringify(c.ACCROCHES_PACK)}, ${JSON.stringify(PL.accroches)} attendu`)
  for (const d of r.dossiers) {
    if (d.exception) { s.echoue('PP-1', `erreursAvantPaiementPack(${d.nom}) a levé : ${court(d.exception, 140)}`); continue }
    if (d.resultat === '(absente)') { s.echoue('PP-1', 'erreursAvantPaiementPack absente de lib/packPub.ts'); continue }
    if (!Array.isArray(d.resultat)) { s.echoue('PP-1', `erreursAvantPaiementPack(${d.nom}) ne rend pas un tableau : ${court(JSON.stringify(d.resultat), 100)}`); continue }
    if (d.champ === null) { if (d.resultat.length) s.echoue('PP-1', `valide.json refusé : ${d.resultat.join(' ; ')}`) }
    else if (!d.resultat.length) s.echoue('PP-1', `${d.nom}.json accepté à tort (aucune erreur rendue), champ ${d.champ} attendu`)
    else if (!d.resultat.some((m) => String(m).toLowerCase().includes(String(d.champ).toLowerCase()))) s.echoue('PP-1', `${d.nom}.json : erreur(s) « ${d.resultat.join(' ; ')} » ne nomme(nt) pas ${d.champ}`)
  }
  if (!s.enEchec('PP-1')) s.passe('PP-1', `constantes conformes au contrat ; erreursAvantPaiementPack : ${r.dossiers.length} jeux d'essai (valide.json accepté, chaque refus nommé)`)
}
function jugerPP2(s, r) {
  for (const d of r.decisions) {
    if (d.exception) s.echoue('PP-2', `decisionEncaissement(${d.nom}) a levé : ${court(d.exception, 140)}`)
    else if (d.rendu === '(absente)') s.echoue('PP-2', 'decisionEncaissement absente de lib/packPub.ts')
    else if (d.rendu !== d.attendu) s.echoue('PP-2', `decisionEncaissement(${d.nom}) = ${JSON.stringify(d.rendu)}, ${JSON.stringify(d.attendu)} attendu`)
  }
  if (!s.enEchec('PP-2')) s.passe('PP-2', `decisionEncaissement : ${r.decisions.length} cas (introuvable, encaisser, deja, second_paiement)`)
}
function jugerPP3(s, r) {
  if (r.erreurs.aiguillage) { s.echoue('PP-3', `lib/stripeAiguillage.ts ne s'importe pas : ${court(r.erreurs.aiguillage, 200)}`); return }
  for (const a of r.aiguillages) {
    if (a.exception) s.echoue('PP-3', `aiguiller(${a.nom}) a levé : ${court(a.exception, 140)}`)
    else if (a.rendu === '(absente)') s.echoue('PP-3', 'aiguiller absente de lib/stripeAiguillage.ts')
    else if (a.rendu !== a.attendu) s.echoue('PP-3', `aiguiller(${a.nom}) = ${JSON.stringify(a.rendu)}, ${JSON.stringify(a.attendu)} attendu`)
  }
  if (!s.enEchec('PP-3')) s.passe('PP-3', `aiguiller : ${r.aiguillages.length} sessions (commande_site, abonnement, pack_pub, orphelin) inchangées pour les deux voies existantes`)
}
function jugerPP6(s, r) {
  if (r.erreurs.checkout) { s.echoue('PP-6', `parametresCheckoutPack(…) a levé : ${court(r.erreurs.checkout, 200)}`); return }
  const cx = r.checkout
  if (cx === '(absente)' || !cx || typeof cx !== 'object') { s.echoue('PP-6', 'parametresCheckoutPack absente de lib/packPub.ts'); return }
  const echec = (m) => s.echoue('PP-6', m)
  if (cx.mode !== 'payment') echec(`mode = ${JSON.stringify(cx.mode)}, 'payment' attendu`)
  if (!cx.invoice_creation?.enabled) echec('invoice_creation.enabled ≠ true')
  if (cx.invoice_creation?.invoice_data?.footer !== r.mentionFranchise) echec(`invoice_creation.invoice_data.footer ≠ mentionFranchise('auto') (« ${court(cx.invoice_creation?.invoice_data?.footer, 60)} » ≠ « ${court(r.mentionFranchise, 60)} »)`)
  if (cx.billing_address_collection !== 'required') echec(`billing_address_collection = ${JSON.stringify(cx.billing_address_collection)}, 'required' attendu`)
  if (!cx.tax_id_collection?.enabled) echec('tax_id_collection.enabled ≠ true')
  const montant = cx.line_items?.[0]?.price_data?.unit_amount ?? cx.line_items?.[0]?.price_data?.unitAmount
  if (montant !== PL.prix_cents) echec(`montant = ${JSON.stringify(montant)}, ${PL.prix_cents} attendu (STRIPE_PRIX_PACK_PUB absent)`)
  const md = cx.metadata || {}
  if (md.uid !== ENTREE_CHECKOUT.uid) echec(`metadata.uid = ${JSON.stringify(md.uid)}, ${JSON.stringify(ENTREE_CHECKOUT.uid)} attendu`)
  if (md.type !== 'pack_pub') echec(`metadata.type = ${JSON.stringify(md.type)}, 'pack_pub' attendu`)
  if (md.pack_id !== ENTREE_CHECKOUT.packId) echec(`metadata.pack_id = ${JSON.stringify(md.pack_id)}, ${JSON.stringify(ENTREE_CHECKOUT.packId)} attendu`)
  if (!jsonEgal(cx.payment_intent_data?.metadata, md)) echec(`payment_intent_data.metadata ≠ metadata (${JSON.stringify(cx.payment_intent_data?.metadata)} ≠ ${JSON.stringify(md)})`)
  const su = String(cx.success_url || '')
  if (!su.includes(ENTREE_CHECKOUT.packId)) echec(`success_url ne porte pas l'identifiant du pack : ${su}`)
  if (su.includes(ENTREE_CHECKOUT.email)) echec(`success_url porte l'email du client : ${su}`)
  if (!s.enEchec('PP-6')) s.passe('PP-6', "payment, invoice_creation avec mention de franchise, adresse et TVA intracommunautaire demandées, montant du contrat, métadonnées aux deux endroits, success_url sans autre donnée que l'identifiant du pack")
}

// ── PP-4 (texte, webhook) et PP-5 (texte, lib/packPubServeur.ts) ────────────────────────────────────────────────────────
function jugerPP4(s) {
  const fichier = 'app/api/stripe/webhook/route.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('PP-4', `${fichier} absent ou vide`); return }
  const branche = /voie\s*===\s*'pack_pub'/.exec(texte)
  if (!branche) s.echoue('PP-4', "aucune branche « voie === 'pack_pub' » dans la route")
  else {
    const suite = texte.slice(branche.index, branche.index + 500)
    if (!/encaisserPackPub\(/.test(suite)) s.echoue('PP-4', "la branche pack_pub n'appelle pas encaisserPackPub(")
    if (!/===\s*'introuvable'[\s\S]{0,80}?throw/.test(suite)) s.echoue('PP-4', "la branche pack_pub ne lève pas d'erreur sur 'introuvable'")
  }
  if (!/alerteOrphelin\(/.test(texte) || !/envoyerAlertes\(\[alerteOrphelin/.test(texte)) s.echoue('PP-4', 'la branche orpheline de 025-07 a disparu (alerteOrphelin / envoyerAlertes)')
  const debut = "if (voie === 'commande_site') {", finMarque = "} else if (voie === 'abonnement')"
  const iD = texte.indexOf(debut), iF = texte.indexOf(finMarque)
  if (iD < 0 || iF < 0 || iF < iD) s.echoue('PP-4', 'branche commande_site introuvable (marqueurs déplacés)')
  else {
    const brancheIci = texte.slice(iD, iF)
    const head = git(['show', `HEAD:${fichier}`])
    if (head.code !== 0) s.echoue('PP-4', `${fichier} introuvable dans HEAD`)
    else {
      const t = lf(head.stdout)
      const iD2 = t.indexOf(debut), iF2 = t.indexOf(finMarque)
      if (iD2 < 0 || iF2 < 0) s.echoue('PP-4', 'branche commande_site introuvable dans HEAD : la comparaison ne prouverait rien')
      else if (t.slice(iD2, iF2) !== brancheIci) s.echoue('PP-4', 'la branche commande_site a changé par rapport à HEAD (elle ne doit changer que par la fiche 026-025)')
    }
  }
  if (!s.enEchec('PP-4')) s.passe('PP-4', "branche pack_pub → encaisserPackPub, erreur sur 'introuvable' ; branche orpheline toujours là ; branche commande_site identique à HEAD")
}
function jugerPP5(s) {
  const fichier = 'lib/packPubServeur.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('PP-5', `${fichier} absent ou vide`); return }
  const corps = extraireFonction(texte, 'encaisserPackPub')
  if (!corps) s.echoue('PP-5', 'export async function encaisserPackPub introuvable')
  else {
    if (!/decisionEncaissement\(/.test(corps)) s.echoue('PP-5', "encaisserPackPub n'appelle pas decisionEncaissement(")
    if (!/\.eq\(\s*['"]etat['"]\s*,\s*['"]brouillon['"]\s*\)/.test(corps)) s.echoue('PP-5', "encaisserPackPub ne met pas à jour avec .eq('etat', 'brouillon')")
    for (const champ of ['stripe_session_id', 'stripe_payment_intent_id', 'paye_le']) if (!corps.includes(champ)) s.echoue('PP-5', `encaisserPackPub n'écrit pas ${champ}`)
    if (!/notifierEntreprise\(/.test(corps)) s.echoue('PP-5', "encaisserPackPub n'appelle pas notifierEntreprise(")
    if (/\.insert\(/.test(corps)) s.echoue('PP-5', 'encaisserPackPub contient .insert( : il ne doit que mettre à jour une ligne existante')
  }
  for (const nom of ['brouillonPackDe', 'enregistrerBrouillonPack', 'poserSessionStripePack']) {
    const c = extraireFonction(texte, nom)
    if (!c) s.echoue('PP-5', `export async function ${nom} introuvable`)
    else if (!c.includes('artisan_id')) s.echoue('PP-5', `${nom} ne filtre pas sur artisan_id`)
  }
  if (!s.enEchec('PP-5')) s.passe('PP-5', 'encaisserPackPub (decisionEncaissement, .eq brouillon, aucun .insert) ; brouillonPackDe, enregistrerBrouillonPack, poserSessionStripePack filtrent sur artisan_id')
}

// ── PP-7 (noyau) : non-régression + typecheck ────────────────────────────────────────────────────────────────────────
const FICHIERS_INCHANGES = ['lib/stripe.ts', 'lib/abonnementSync.ts', 'lib/plans.ts', 'lib/siteCommande.ts', 'lib/siteCommandeServeur.ts']
function jugerPP7(s) {
  const echecs = []
  for (const f of FICHIERS_INCHANGES) {
    const head = git(['show', `HEAD:${f}`])
    if (head.code !== 0) { echecs.push(`${f} introuvable dans HEAD`); continue }
    const ici = lireSi(ch(f))
    if (ici === null) { echecs.push(`${f} absent (racine ${aff(racine)})`); continue }
    if (lf(head.stdout) !== ici) echecs.push(`${f} modifié par rapport à HEAD`)
  }
  if (echecs.length) { for (const e of echecs) s.echoue('PP-7', e); return }
  const r = lancer('npm', ['run', 'typecheck'], { cwd: racine, timeout: 300_000, shell: process.platform === 'win32' })
  if (r.code !== 0) s.echoue('PP-7', `npm run typecheck en code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''} : ${court(r.derniereLigne || r.sortie, 200)}`)
  else s.passe('PP-7', `${FICHIERS_INCHANGES.length} fichiers identiques à HEAD ; npm run typecheck vert`)
}

// ── PP-8, PP-9 (--partie=route) ──────────────────────────────────────────────────────────────────────────────────────
function jugerPP8(s) {
  const fichier = 'app/api/pubs/commander/route.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('PP-8', `${fichier} absent ou vide`) } else {
    const post = extraireFonction(texte, 'POST')
    if (!post) s.echoue('PP-8', `export async function POST introuvable dans ${fichier}`)
    else {
      if (!/^\{\s*(?:\/\/[^\n]*\n\s*)*if\s*\(\s*!\s*actif\(\s*['"]packPub['"]\s*\)\s*\)/.test(post)) s.echoue('PP-8', "la première instruction du POST n'est pas « if (!actif('packPub')) … »")
      const positions = {
        actif: post.search(/actif\(\s*['"]packPub['"]\s*\)/),
        authArtisan: post.indexOf('authArtisan('),
        fondateur: post.search(/is_founder/),
        erreurs: post.indexOf('erreursAvantPaiementPack('),
        params: post.indexOf('parametresCheckoutPack('),
        poser: post.indexOf('poserSessionStripePack('),
      }
      for (const [nom, pos] of Object.entries(positions)) if (pos < 0) s.echoue('PP-8', `${nom} introuvable dans POST`)
      const ordre = Object.entries(positions)
      if (ordre.every(([, p]) => p >= 0)) for (let i = 1; i < ordre.length; i++) if (ordre[i][1] <= ordre[i - 1][1]) s.echoue('PP-8', `ordre : ${ordre[i - 1][0]} devrait précéder ${ordre[i][0]}`)
      if (positions.fondateur >= 0 && !/403/.test(post.slice(positions.fondateur, positions.fondateur + 200))) s.echoue('PP-8', 'compte fondateur : pas de 403 à proximité de is_founder')
    }
  }
  if (/(['"])subscription\1/.test(texte || '')) s.echoue('PP-8', "chaîne 'subscription' trouvée : le pack est un paiement unique")
  if (!s.enEchec('PP-8')) s.passe('PP-8', "POST : 404 (drapeau packPub), authArtisan, 403 fondateur, erreursAvantPaiementPack, parametresCheckoutPack, poserSessionStripePack, dans l'ordre ; aucune chaîne 'subscription'")
}
function jugerPP9(s) {
  const head = git(['show', 'HEAD:lib/flags.ts'])
  const ici = lireSi(ch('lib/flags.ts'))
  if (head.code !== 0) s.echoue('PP-9', 'lib/flags.ts introuvable dans HEAD')
  else if (ici === null) s.echoue('PP-9', 'lib/flags.ts absent')
  else {
    const parser = (t) => { const m = new Map(); for (const x of t.matchAll(/^\s{2}(\w+):\s*(true|false),?\s*$/gm)) m.set(x[1], x[2]); return m }
    const avant = parser(lf(head.stdout)), apres = parser(ici)
    for (const [k, v] of avant) if (apres.get(k) !== v) s.echoue('PP-9', `${k} : ${v} → ${apres.get(k) ?? 'absent'} (aucun autre drapeau ne doit changer)`)
    for (const k of apres.keys()) if (!avant.has(k) && k !== 'packPub' && k !== 'packPubVente') s.echoue('PP-9', `drapeau en plus, hors du périmètre de cette fiche : ${k}`)
    if (apres.get('packPub') !== 'false') s.echoue('PP-9', `packPub = ${apres.get('packPub') ?? 'absent'}, false attendu`)
    if (apres.get('packPubVente') !== 'false') s.echoue('PP-9', `packPubVente = ${apres.get('packPubVente') ?? 'absent'}, false attendu`)
    if (!s.enEchec('PP-9')) s.passe('PP-9', `packPub et packPubVente à false, ${avant.size} autre(s) drapeau(x) inchangé(s)`)
  }
  const r = lancer('npm', ['run', 'typecheck'], { cwd: racine, timeout: 300_000, shell: process.platform === 'win32' })
  if (r.code !== 0) s.echoue('PP-9', `npm run typecheck en code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''} : ${court(r.derniereLigne || r.sortie, 200)}`)
}

// ── --reel : une vraie session Checkout, expirée aussitôt (Claude Code seulement) ──────────────────────────────────────
class Prealable extends Error {}
async function reel() {
  lireEnvLocal(R)
  const cle = process.env.STRIPE_SECRET_KEY
  if (!cle) throw new Prealable('STRIPE_SECRET_KEY absente de .env.local')
  const sonde = lancerSonde()
  if (sonde.erreur) throw new Prealable(sonde.erreur)
  if (sonde.r.erreurs.packPub) throw new Prealable(`lib/packPub.ts ne s'importe pas : ${court(sonde.r.erreurs.packPub, 160)}`)
  const cx = sonde.r.checkout
  if (!cx || cx === '(absente)') throw new Prealable('parametresCheckoutPack absente ou en échec')
  const s = creerRapport(NOM, ['PP-REEL'], { entete: `${NOM} --partie=noyau --reel` })
  const StripeMod = await import('stripe')
  const Stripe = StripeMod.default
  const stripe = new Stripe(cle)
  try {
    const session = await stripe.checkout.sessions.create(cx)
    s.passe('PP-REEL', `session Checkout acceptée (${session.id}), mode ${session.mode}, montant ${((session.amount_total ?? 0) / 100).toFixed(2)} €`)
    await stripe.checkout.sessions.expire(session.id).catch(() => {})
    s.passe('PP-REEL', 'session expirée aussitôt, sans débit')
  } catch (e) {
    s.echoue('PP-REEL', `Stripe a refusé la session : ${court(e.message, 200)}`)
  }
  return s.fin()
}

// ── Le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────────
function juger() {
  const s = creerRapport(NOM, IDS[PARTIE], { entete: `${NOM} --partie=${PARTIE} (${FICHE[PARTIE]}) — racine ${aff(racine)}${o.temoin ? ' — témoin' : ''}` })
  if (o.temoin) {
    for (const id of IDS[PARTIE]) if (id !== 'PP-7') s.saute(id, `témoin : critère de fabrication, prouvé par le PASS de ${FICHE[PARTIE]}`)
    if (IDS[PARTIE].includes('PP-7')) jugerPP7(s)
    return s.fin()
  }
  if (PARTIE === 'noyau') {
    const sonde = lancerSonde()
    if (sonde.erreur) { for (const id of IDS.noyau) if (id !== 'PP-7') s.echoue(id, `sonde en échec : ${sonde.erreur}`) }
    else { jugerPP1(s, sonde.r); jugerPP2(s, sonde.r); jugerPP3(s, sonde.r); jugerPP4(s); jugerPP5(s); jugerPP6(s, sonde.r) }
    jugerPP7(s)
  } else {
    jugerPP8(s)
    jugerPP9(s)
  }
  return s.fin()
}

if (o.reel) {
  try { process.exitCode = await reel() } catch (e) {
    if (e instanceof Prealable) { console.log(`${NOM} --partie=${PARTIE} --reel : PRÉALABLE MANQUANT — ${e.message}`); process.exitCode = 2 }
    else { console.log(`${NOM} --partie=${PARTIE} --reel : ERREUR — ${court(e.message, 200)}`); process.exitCode = 1 }
  }
} else process.exit(juger())
