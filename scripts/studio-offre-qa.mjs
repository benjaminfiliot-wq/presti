#!/usr/bin/env node
// scripts/studio-offre-qa.mjs — le juge de l'offre du Studio et de son paiement (fiche 026-128, « Ce qu'il faut
// faire », point 2 bis ; critères SO-1 à SO-8 détaillés dans 026-166.md, « Cahier du juge »), écrit par Claude Code
// AVANT ce qu'il juge : lib/studio/offre.ts, lib/studio/commandeServeur.ts, app/studio/commander/[jeton]/page.tsx,
// app/api/studio/commander/route.ts, scripts/studio/deposer-echantillon.mjs (026-166) n'existent pas encore, et la
// branche pack_studio de lib/stripeAiguillage.ts et app/api/stripe/webhook/route.ts non plus.
//
// Doublures : aucun appel réseau, jamais. Les fonctions PURES (lib/studio/offre.ts) sont importées et appelées pour
// de vrai (ts-loader, --temoin excepté) ; les fonctions qui écrivent en base (lib/studio/commandeServeur.ts) et les
// routes sont jugées par lecture de leur texte (comme scripts/pack-pub-paiement-qa.mjs juge lib/packPubServeur.ts et
// la route du pack C) — jamais exécutées avec un faux client Supabase, dont l'interface n'est pas encore connue ;
// --reel n'existe pas ici (le paiement réel se juge par la recette de 026-166, jamais par ce juge).
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/studio-offre-qa.mjs [--racine=<dossier>] [--temoin]
//   (sans --import ./scripts/ts-loader.mjs, les imports de fichiers .ts échouent proprement sur SO-1 : c'est ce que
//   fait scripts/juges-026-pubs-contenu-preuve.mjs, qui n'ajoute jamais cette option — les huit critères dépendent
//   tous d'un fichier qui n'existe pas encore de toute façon, SO-1 en premier)
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide.
// N'écrit que sous .orchestre/travail/studio-offre-qa/. Aucun secret affiché, aucun appel réseau.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, lireOptionsOuQuitter, lancer as lancerCommun, gitGrepFichiers } from './fixtures/025/commun.mjs'
import { creerRapport, dossierTravail, court, lf } from './lib/sql-essai.mjs'
import { CONTRAT } from './fixtures/026-pubs-contenu/commun.mjs'
import { testerSO2, testerSO4, testerSO8 } from './fixtures/026-pubs-contenu/studio/offre-comportement.mjs'

const NOM = 'studio-offre-qa'
const FICHE_CIBLE = '026-166'
const IDS = ['SO-1', 'SO-2', 'SO-3', 'SO-4', 'SO-5', 'SO-6', 'SO-7', 'SO-8']
const DELAI = 3 * 60_000
const posix = (p) => String(p).split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'
const PS = CONTRAT.pack_studio // { fiche, videos, prix_cents, prix_texte, metadata_stripe }

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: [] })
let ARRET = false
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exitCode = 2; ARRET = true }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
const TRAVAIL = dossierTravail(NOM)
const SAUT_TEMOIN = (fichier) => `témoin : dépend de ${fichier} (fiche ${FICHE_CIBLE}, pas encore écrite) — critère réel une fois ${fichier} en place, via « node --import ./scripts/ts-loader.mjs scripts/studio-offre-qa.mjs »`

function lancer(bin, args, opts = {}) { return lancerCommun(bin, args, { cwd: R, timeout: DELAI, ...opts }) }
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }
const ch = (rel2) => path.join(o.racine, rel2)

// ── Extraction de fonction (copie locale : pack-pub-paiement-qa.mjs a des effets de bord au chargement, on ne l'importe pas) ──
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
function extraireFonction(texte, nom) {
  const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${nom}\\b[\\s\\S]*?\\{`)
  const m = re.exec(texte)
  if (!m) return null
  return extraireAccolades(texte, m.index + m[0].length - 1)
}

// ── SO-1 : le prix n'est écrit qu'une fois (import réel de lib/studio/offre.ts) ─────────────────────────────────────
async function importerOffre() {
  const fichier = path.join(o.racine, 'lib', 'studio', 'offre.ts')
  if (!fs.existsSync(fichier)) return { erreur: `${rel(fichier)} absent` }
  try { return { m: await import(pathToFileURL(fichier).href + `?t=${Date.now()}`) } } catch (e) { return { erreur: String((e && e.stack) || e) } }
}
async function jugerSO1(s) {
  const { m, erreur } = await importerOffre()
  if (erreur) { s.echoue('SO-1', erreur); return null }
  const echecs = []
  if (m.VIDEOS_PACK_STUDIO !== PS.videos) echecs.push(`VIDEOS_PACK_STUDIO = ${JSON.stringify(m.VIDEOS_PACK_STUDIO)}, ${PS.videos} attendu`)
  if (m.PRIX_PACK_STUDIO_CENTS !== PS.prix_cents) echecs.push(`PRIX_PACK_STUDIO_CENTS = ${JSON.stringify(m.PRIX_PACK_STUDIO_CENTS)}, ${PS.prix_cents} attendu`)
  if (typeof m.offre !== 'function') echecs.push('offre() absente')
  else {
    let o1
    try { o1 = m.offre() } catch (e) { echecs.push(`offre() a levé : ${court(e.message, 140)}`) }
    if (o1) {
      if (o1.prix_cents !== PS.prix_cents) echecs.push(`offre().prix_cents = ${JSON.stringify(o1.prix_cents)}`)
      if (o1.videos !== PS.videos) echecs.push(`offre().videos = ${JSON.stringify(o1.videos)}`)
      if (!/490/.test(String(o1.prix_texte)) || !/€/.test(String(o1.prix_texte))) echecs.push(`offre().prix_texte = ${JSON.stringify(o1.prix_texte)}, un texte en euros attendu`)
    }
  }
  // Candidats : tout fichier suivi qui contient la sous-chaîne ; puis on ne retient que le prix lui-même — « 490 » ou « 49000 »
  // isolé (ni précédé d'un chiffre, d'un point ou d'une virgule, ni suivi d'un chiffre) : 14900 (le pack C), 14901-PGP, un
  // tracé SVG (-23.490000) ne sont pas le prix du Studio. Sont écartés : les jeux d'essai et les juges (scripts/*-qa.mjs,
  // scripts/juges-*, qui écrivent ce prix pour l'éprouver), et ce qui n'est pas du code du produit : notes et mémoire
  // (plans/, reprise-cloud/), actifs (public/ : tracés SVG, durées en ms), historique SQL (supabase/). Tout le reste des
  // fichiers suivis (lib/, app/, components/, scripts/ hors juges…) reste jugé : un prix écrit là rouvre SO-1.
  const EXCLURE_SO1 = ['lib/studio/offre.ts', 'scripts/fixtures/', '.orchestre/', 'plans/', 'reprise-cloud/', 'public/', 'supabase/']
  const JUGE_SO1 = /^scripts\/(?:[^/]*-qa\.mjs|juges-[^/]*)$/
  const PRIX_ISOLE = /(?<![\d.,])(?:490|49000)(?!\d)/
  const fuites = gitGrepFichiers(R, '490', { exclure: EXCLURE_SO1 })
    .concat(gitGrepFichiers(R, '49000', { exclure: EXCLURE_SO1 }))
    .filter((f) => !JUGE_SO1.test(f))
    .filter((f) => { const t = lireSi(path.join(R, f)); return t !== null && PRIX_ISOLE.test(t) })
  const fuitesUniques = [...new Set(fuites)]
  if (fuitesUniques.length) echecs.push(`« 490 » ou « 49000 » hors de lib/studio/offre.ts : ${fuitesUniques.slice(0, 5).join(', ')}`)
  if (echecs.length) { for (const x of echecs) s.echoue('SO-1', x); return null }
  s.passe('SO-1', `VIDEOS_PACK_STUDIO=${m.VIDEOS_PACK_STUDIO}, PRIX_PACK_STUDIO_CENTS=${m.PRIX_PACK_STUDIO_CENTS}, offre() cohérente, aucune fuite du prix`)
  return m
}

// ── SO-2 : changer la constante change tout (lecture statique : chaque consommateur importe offre.ts, jamais un « 490 » en dur) ──
function jugerSO2(s) {
  const CONSOMMATEURS = [
    'app/studio/commander/[jeton]/page.tsx',
    'app/api/studio/commander/route.ts',
    'app/api/cron/repondeur/route.ts', // le Répondeur lit l'offre par un import() protégé (026-096) : {videos} et {prix} de studio_offre_v1
  ]
  // modeles.ts est un module pur qui n'importe jamais lib/studio (026-083) : ni import de l'offre, ni prix écrit en dur.
  const PURS = ['lib/agents/acquisition/modeles.ts']
  const echecs = []
  for (const f of PURS) {
    const texte = lireSi(ch(f))
    if (texte === null) { echecs.push(`${f} absent`); continue }
    if (/490/.test(texte) || /49000/.test(texte)) echecs.push(`${f} : « 490 » ou « 49000 » écrit en dur (le prix vient du Répondeur, depuis offre.ts)`)
  }
  for (const f of CONSOMMATEURS) {
    const texte = lireSi(ch(f))
    if (texte === null) { echecs.push(`${f} absent`); continue }
    if (/490/.test(texte) || /49000/.test(texte)) echecs.push(`${f} : « 490 » ou « 49000 » écrit en dur (attendu : lu depuis offre.ts)`)
    if (!/(from\s+['"].*studio\/offre['"]|require\(\s*['"].*studio\/offre['"]\s*\)|import\(\s*['"].*studio\/offre['"]\s*\))/.test(texte)) echecs.push(`${f} n'importe pas lib/studio/offre`)
  }
  const echecsDyn = testerSO2(o.racine)
  if (echecsDyn.length) echecs.push(...echecsDyn)

  if (echecs.length) for (const x of echecs) s.echoue('SO-2', x)
  else s.passe('SO-2', `${CONSOMMATEURS.length} fichier(s) lisent le prix depuis lib/studio/offre.ts, ${PURS.length} module(s) pur(s) sans valeur en dur`)
}

// ── SO-3, SO-6 : la route (lecture statique du POST) ────────────────────────────────────────────────────────────────
function jugerSO3etSO6(s) {
  const fichier = 'app/api/studio/commander/route.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('SO-3', `${fichier} absent`); s.echoue('SO-6', `${fichier} absent`); return }
  const post = extraireFonction(texte, 'POST')
  if (!post) { s.echoue('SO-3', `export async function POST introuvable dans ${fichier}`); s.echoue('SO-6', `export async function POST introuvable dans ${fichier}`); return }
  // SO-3
  {
    const echecs = []
    if (!/mode\s*:\s*['"]payment['"]/.test(post)) echecs.push("mode: 'payment' introuvable")
    if (!/invoice_creation\s*:\s*\{[^}]*enabled\s*:\s*true/.test(post)) echecs.push('invoice_creation.enabled: true introuvable')
    for (const bloc of ['metadata', 'payment_intent_data']) {
      const i = post.indexOf(bloc)
      const morceau = i >= 0 ? post.slice(i, i + 400) : ''
      if (!/type\s*:\s*['"]pack_studio['"]/.test(morceau)) echecs.push(`${bloc} : type: 'pack_studio' introuvable`)
      if (!/pack_id/.test(morceau)) echecs.push(`${bloc} : pack_id introuvable`)
      if (!/marque_cle/.test(morceau)) echecs.push(`${bloc} : marque_cle introuvable`)
    }
    if (!/brouillonStudio\(/.test(post)) echecs.push("n'appelle pas brouillonStudio(")
    if (!/poserSessionStudio\(/.test(post)) echecs.push("n'appelle pas poserSessionStudio(")
    if (echecs.length) for (const x of echecs) s.echoue('SO-3', x)
    else s.passe('SO-3', "metadata et payment_intent_data.metadata portent type/pack_id/marque_cle, invoice_creation activée, brouillonStudio puis poserSessionStudio")
  }
  // SO-6 : jamais mode: 'subscription'
  {
    if (/(['"])subscription\1/.test(texte)) s.echoue('SO-6', "chaîne 'subscription' trouvée : le Studio est un paiement unique")
    else s.passe('SO-6', "aucune chaîne 'subscription' dans la route")
  }
}

// ── SO-4 : lib/stripeAiguillage.ts, la voie pack_studio ─────────────────────────────────────────────────────────────
function jugerSO4(s) {
  const fichier = 'lib/stripeAiguillage.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('SO-4', `${fichier} absent`); return }
  const corps = extraireFonction(texte, 'aiguiller')
  if (!corps) { s.echoue('SO-4', 'export function aiguiller introuvable'); return }
  const echecs = []
  if (!/pack_studio/.test(corps)) echecs.push("aucune référence à 'pack_studio' dans aiguiller")
  if (!/payment/.test(corps)) echecs.push("aucune vérification du mode 'payment' pour pack_studio")
  for (const voie of ['commande_site', 'abonnement', 'pack_pub', 'orphelin']) if (!corps.includes(voie)) echecs.push(`voie existante disparue : ${voie}`)
  
  const echecsDyn = testerSO4(o.racine)
  if (echecsDyn.length) echecs.push(...echecsDyn)

  if (echecs.length) for (const x of echecs) s.echoue('SO-4', x)
  else s.passe('SO-4', 'aiguiller() porte pack_studio (mode payment) sans toucher aux voies existantes')
}

// ── SO-5 : le webhook, la branche pack_studio et lib/studio/commandeServeur.ts::encaisserPackStudio ────────────────
function jugerSO5(s) {
  const fichierHook = 'app/api/stripe/webhook/route.ts'
  const texteHook = lireSi(ch(fichierHook))
  const fichierServeur = 'lib/studio/commandeServeur.ts'
  const texteServeur = lireSi(ch(fichierServeur))
  const echecs = []
  if (texteHook === null) echecs.push(`${fichierHook} absent`)
  else {
    const branche = /voie\s*===\s*'pack_studio'/.exec(texteHook)
    if (!branche) echecs.push("aucune branche « voie === 'pack_studio' » dans le webhook")
    else {
      const suite = texteHook.slice(branche.index, branche.index + 400)
      if (!/encaisserPackStudio\(/.test(suite)) echecs.push("la branche pack_studio n'appelle pas encaisserPackStudio(")
      if (!/===\s*'introuvable'[\s\S]{0,80}?throw/.test(suite)) echecs.push("la branche pack_studio ne lève pas d'erreur sur 'introuvable' (Stripe doit rejouer)")
    }
  }
  if (texteServeur === null) echecs.push(`${fichierServeur} absent`)
  else {
    const corps = extraireFonction(texteServeur, 'encaisserPackStudio')
    if (!corps) echecs.push('export async function encaisserPackStudio introuvable')
    else {
      if (!/decisionEncaissement\(/.test(corps)) echecs.push("encaisserPackStudio n'appelle pas decisionEncaissement(")
      if (!/\.eq\(\s*['"]etat['"]\s*,\s*['"]brouillon['"]\s*\)/.test(corps)) echecs.push("encaisserPackStudio ne met pas à jour avec .eq('etat', 'brouillon')")
      if (/\.insert\(/.test(corps)) echecs.push('encaisserPackStudio contient .insert( : il ne doit que mettre à jour une ligne existante (idempotent)')
    }
  }
  if (echecs.length) for (const x of echecs) s.echoue('SO-5', x)
  else s.passe('SO-5', "webhook : branche pack_studio → encaisserPackStudio, erreur sur 'introuvable' ; encaisserPackStudio : decisionEncaissement, .eq('etat','brouillon'), aucun .insert")
}

// ── SO-3 (complément) : lib/studio/commandeServeur.ts::brouillonStudio ─────────────────────────────────────────────
function jugerSO3Brouillon(s) {
  const fichier = 'lib/studio/commandeServeur.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) return // déjà signalé par SO-5
  const corps = extraireFonction(texte, 'brouillonStudio')
  if (!corps) { s.echoue('SO-3', `${fichier} : export async function brouillonStudio introuvable`); return }
  const echecs = []
  if (!/artisan_id\s*:\s*null/.test(corps)) echecs.push("brouillonStudio n'écrit pas artisan_id: null")
  if (!/type\s*:\s*['"]studio['"]/.test(corps)) echecs.push("brouillonStudio n'écrit pas type: 'studio'")
  if (!/PRIX_PACK_STUDIO_CENTS/.test(corps)) echecs.push('brouillonStudio ne lit pas PRIX_PACK_STUDIO_CENTS (le prix ne doit venir que de là)')
  if (echecs.length) for (const x of echecs) s.echoue('SO-3', x)
}

// ── SO-7 : lireJetonCommande / lienCommandeStudio, importées pour de vrai ────────────────────────────────────────────
async function jugerSO7(s) {
  const fichier = path.join(o.racine, 'lib', 'studio', 'offre.ts')
  if (!fs.existsSync(fichier)) { s.echoue('SO-7', `${rel(fichier)} absent`); return }
  process.env.STUDIO_LIEN_SECRET = 'essai-026-128-secret-de-temoin-sentinelle'
  let m
  try { m = await import(pathToFileURL(fichier).href + `?t7=${Date.now()}`) } catch (e) { s.echoue('SO-7', `import : ${court(String((e && e.stack) || e), 200)}`); return }
  if (typeof m.lienCommandeStudio !== 'function' || typeof m.lireJetonCommande !== 'function') { s.echoue('SO-7', 'lienCommandeStudio ou lireJetonCommande absente'); return }
  const prospect = { prospect_id: 'prospect-essai-0001', marque_cle: 'maison-solane' }
  const maintenant = new Date('2026-09-28T10:00:00Z')
  const echecs = []
  try {
    const lien = m.lienCommandeStudio(prospect, maintenant)
    const jeton = String(lien).split('/').pop()
    const lu = m.lireJetonCommande(jeton, maintenant)
    if (!lu || lu.marque_cle !== prospect.marque_cle) echecs.push(`jeton valide : lireJetonCommande a rendu ${JSON.stringify(lu)}`)
    const dans22j = new Date(maintenant.getTime() + 22 * 86_400_000)
    if (m.lireJetonCommande(jeton, dans22j) !== null) echecs.push('jeton au 22e jour : non expiré (null attendu)')
    const signatureAlteree = jeton.slice(0, -1) + (jeton.at(-1) === 'a' ? 'b' : 'a')
    if (m.lireJetonCommande(signatureAlteree, maintenant) !== null) echecs.push('signature altérée d\'un signe : acceptée (null attendu)')
    const [charge] = jeton.split('.')
    const chargeModifiee = `${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(charge, 'base64url').toString()), m: 'autre-marque' })).toString('base64url')}.${jeton.split('.')[1]}`
    if (m.lireJetonCommande(chargeModifiee, maintenant) !== null) echecs.push('charge modifiée : acceptée (null attendu)')
  } catch (e) { echecs.push(`exception : ${court(String((e && e.message) || e), 160)}`) }
  delete process.env.STUDIO_LIEN_SECRET
  try {
    let leve = false
    try { delete process.env.STUDIO_LIEN_SECRET; m.lienCommandeStudio(prospect, maintenant) } catch { leve = true }
    if (!leve) echecs.push('sans STUDIO_LIEN_SECRET, lienCommandeStudio ne lève pas')
  } catch { /* déjà géré */ }
  if (echecs.length) for (const x of echecs) s.echoue('SO-7', x)
  else s.passe('SO-7', 'jeton valide accepté, 22e jour / signature altérée / charge modifiée refusés (null), secret absent → erreur')
}

// ── SO-8 : deposer-echantillon.mjs (processus, pas d'appel réseau attendu) ─────────────────────────────────────────
function jugerSO8(s) {
  const script = path.join(o.racine, 'scripts', 'studio', 'deposer-echantillon.mjs')
  if (!fs.existsSync(script)) { s.echoue('SO-8', `${rel(script)} absent`); return }
  const dossierRouge = path.join(TRAVAIL, 'so8-rouge')
  fs.rmSync(dossierRouge, { recursive: true, force: true }); fs.mkdirSync(path.join(dossierRouge, 'sortie'), { recursive: true })
  fs.writeFileSync(path.join(dossierRouge, 'script.json'), JSON.stringify({ marque: 'x', produit: 'x', lignes: [], allegations: [], presentateur_virtuel: false }))
  const r1 = lancer(process.execPath, [script, '--marque=maison-solane', `--echantillon=${dossierRouge}`], { timeout: 5 * 60_000 })
  const echecs = []
  if (r1.code !== 1) echecs.push(`échantillon sans sortie/echantillon.mp4 (pub-qa rouge) : code ${r1.code}, 1 attendu`)
  const dossierSansDecision = path.join(TRAVAIL, 'so8-sans-decision')
  fs.rmSync(dossierSansDecision, { recursive: true, force: true }); fs.mkdirSync(path.join(dossierSansDecision, 'sortie'), { recursive: true })
  const r2 = lancer(process.execPath, [script, '--marque=maison-inconnue-0000', `--echantillon=${dossierSansDecision}`], { timeout: 5 * 60_000 })
  if (r2.code !== 2 && r2.code !== 1) echecs.push(`marque sans décision studio_echantillon ouverte : code ${r2.code}, 2 attendu`)
  
  const echecsDyn = testerSO8(o.racine)
  if (echecsDyn.length) echecs.push(...echecsDyn)

  if (echecs.length) for (const x of echecs) s.echoue('SO-8', x)
  else s.passe('SO-8', 'refuse un échantillon vide ou >3Mo, refuse une marque sans décision ouverte')
}

async function principal() {
  const entete = `${NOM} — racine ${rel(o.racine)}${o.temoin ? ' — témoin' : ''}`
  const s = creerRapport(NOM, IDS, { entete })

  if (o.temoin) {
    // Les huit critères jugent lib/studio/offre.ts, lib/studio/commandeServeur.ts, les routes app/api/studio/** et
    // app/studio/**, et scripts/studio/deposer-echantillon.mjs — tous écrits par 026-166, aucun encore en place :
    // même motif que scripts/pack-pub-paiement-qa.mjs --partie=route --temoin (rien à prouver tant que rien n'est
    // construit, un témoin ne doit ni échouer ni faire semblant). Tant que lib/studio/offre.ts n'existe pas, les
    // huit sont sautés ; dès qu'il existe, SO-1 (seul critère sans autre dépendance) tourne pour de vrai.
    const offreExiste = fs.existsSync(path.join(o.racine, 'lib', 'studio', 'offre.ts'))
    if (offreExiste) await jugerSO1(s); else s.saute('SO-1', SAUT_TEMOIN('lib/studio/offre.ts'))
    for (const id of IDS) if (id !== 'SO-1') s.saute(id, SAUT_TEMOIN('lib/studio/commandeServeur.ts, les routes ou deposer-echantillon.mjs'))
    return s.fin()
  }

  await jugerSO1(s)
  jugerSO2(s)
  jugerSO3etSO6(s)
  jugerSO3Brouillon(s)
  jugerSO4(s)
  jugerSO5(s)
  await jugerSO7(s)
  jugerSO8(s)
  return s.fin()
}

if (!ARRET) process.exitCode = await principal()
