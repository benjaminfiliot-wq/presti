#!/usr/bin/env node
// scripts/crieur-qa.mjs — le juge du Crieur (fiche 026-116, « Ce qu'il faut faire », point 3), écrit par Claude Code
// AVANT la production qu'il juge (« un juge s'écrit avant ce qu'il juge ») :
//   --partie=composer (026-119) juge lib/crieur/faits.ts et lib/crieur/composer.ts — CR-1 à CR-4.
//   --partie=route    (026-122) juge app/api/cron/crieur/route.ts, lib/crieur/publora.ts et
//                      app/api/crieur/visuel/[id]/route.tsx — CR-5 à CR-9, CR-15 à CR-19.
//   --partie=horloge  (026-134) juge la migration supabase/migrations/*_crieur.sql — CR-10 à CR-13.
//   --partie=juge     (CETTE fiche, 026-116) juge lib/crieur/juge.ts (jugerPublication) — CR-14.
// Chaque fichier jugé par composer/route/horloge n'existe pas encore quand cette fiche est déposée : ses critères
// échouent alors naturellement (fichier absent), ce que prouve scripts/fixtures/026-pubs-contenu/preuve-20.json
// (CR-1, CR-5, CR-10 en échec attendu sur la référence). --partie=juge (CR-14) juge lib/crieur/juge.ts, écrit par
// CETTE fiche : il tourne pour de vrai dès maintenant, référence comprise (juge.ts n'existe pas non plus AVANT
// cette fiche).
//
// --temoin : composer, route et horloge n'ont rien à prouver eux-mêmes tant que leur propre fiche (026-119,
// 026-122, 026-134) n'a pas livré — chacun de leurs critères est SAUTÉ, avec un renvoi vers cette fiche-là.
// Correction du 28/09 : le saut est conditionné à l'absence de .orchestre/fait/<sa fiche>.md — une fois livrée, un
// --temoin rejuge pour de vrai (jamais de témoin vert indéfini sur une fabrication absente ou fausse).
// --partie=juge --temoin exécute CR-14 pour de vrai (juge.ts existe déjà). CR-NR (non-régression de quatre fichiers
// hors du périmètre du Crieur : app/api/cron/relances/route.ts, lib/alertes.ts, scripts/pipeline.mjs, vercel.json,
// identiques à HEAD) est vérifié dans TOUS les modes et toutes les parties.
//
// Usage :
//   node scripts/crieur-qa.mjs --partie=composer|route|horloge|juge [--racine=<dossier>]
//   node scripts/crieur-qa.mjs --partie=composer|route|horloge|juge --temoin
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide.
// N'écrit que sous .orchestre/travail/crieur-qa/. Aucun fetch, aucun secret lu ni affiché.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, lireOptionsOuQuitter, git, lancer } from './fixtures/025/commun.mjs'
import { creerRapport, dossierTravail, instructions, normaliser, masquer, fermante, decouperVirgules, compacter, serrer, jumeauNuCoupe, empreinte, lireCompteRendu, court, lf, MARQUE_CONTROLE } from './lib/sql-essai.mjs'
import { lireCorpusJuge } from './fixtures/026-pubs-contenu/crieur/lire.mjs'

const NOM = 'crieur-qa'
const TS_LOADER = path.join(R, 'scripts', 'ts-loader.mjs')
const PARTIES = ['composer', 'route', 'horloge', 'juge']
const FICHE = { composer: '026-119', route: '026-122', horloge: '026-134', juge: '026-116' }
const IDS = {
  composer: ['CR-1', 'CR-2', 'CR-3', 'CR-4', 'CR-NR'],
  route: ['CR-5', 'CR-6', 'CR-7', 'CR-7BIS', 'CR-8', 'CR-9', 'CR-15', 'CR-16', 'CR-17', 'CR-18', 'CR-19', 'CR-NR'],
  horloge: ['CR-10', 'CR-11', 'CR-12', 'CR-13', 'CR-NR'],
  juge: ['CR-14', 'CR-NR'],
}
const PHRASE_AIMANT_ATTENDUE = 'Commente SITE, je te prépare gratuitement la maquette de ton site.'
const FICHIERS_SENTINELLES = ['app/api/cron/relances/route.ts', 'lib/alertes.ts', 'scripts/pipeline.mjs', 'vercel.json']
// Un lundi fixe, à 5 h UTC = 6 h de Paris (2024-01-01 était un lundi) : la même horloge d'essai sert composer (CR-4)
// et route (CR-19), jamais l'heure réelle — un juge doit rendre le même verdict rejoué demain.
const LUNDI_ESSAI = '2024-01-01T05:00:00.000Z'

// ── Options ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['partie'] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
if (o.reel) refuser(`${NOM} ne connaît pas --reel`)
const PARTIE = o.valeur('partie')
if (!PARTIES.includes(PARTIE)) refuser(`--partie=${PARTIES.join('|')} attendu (reçu : ${PARTIE ?? 'rien'})`)
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }

// ── Un extracteur de bloc { … } conscient des chaînes, gabarits et commentaires JS/TS (repris de pack-pub-paiement-qa.mjs,
// même mécanisme, jamais un parseur SQL) ───────────────────────────────────────────────────────────────────────────────
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

// ── CR-NR : non-régression de quatre fichiers hors du périmètre du Crieur, dans TOUS les modes ────────────────────────
function jugerNonRegression(s) {
  const echecs = []
  for (const f of FICHIERS_SENTINELLES) {
    const head = git(['show', `HEAD:${f}`])
    if (head.code !== 0) { echecs.push(`${f} introuvable dans HEAD`); continue }
    const ici = lireSi(ch(f))
    if (ici === null) { echecs.push(`${f} absent (racine ${aff(racine)})`); continue }
    if (lf(head.stdout) !== ici) echecs.push(`${f} modifié par rapport à HEAD`)
  }
  if (echecs.length) for (const e of echecs) s.echoue('CR-NR', e)
  else s.passe('CR-NR', `${FICHIERS_SENTINELLES.length} fichier(s) hors périmètre du Crieur inchangé(s) (identiques à HEAD)`)
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --partie=juge (CR-14) — lib/crieur/juge.ts, jugé pour de vrai dès cette fiche
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function analyserSourceJuge(texte) {
  const raisons = []
  if (/\bfetch\s*\(/.test(texte)) raisons.push('fetch( trouvé dans lib/crieur/juge.ts')
  if (/\bprocess\.env\b/.test(texte)) raisons.push('process.env trouvé dans lib/crieur/juge.ts')
  for (const m of texte.matchAll(/^\s*import\s+(?!type\b)\S[^\n]*$/gm)) raisons.push(`import non-type dans lib/crieur/juge.ts : ${court(m[0].trim(), 100)}`)
  return raisons
}
function construireSondeJuge(cas, corpus) {
  return `// Sonde de ${NOM} (--partie=juge), écrite par le juge (fiche 026-116). Importe et APPELLE jugerPublication.
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const R = ${JSON.stringify(racine)}
let mod, erreur = null
try { mod = await import(pathToFileURL(path.join(R, 'lib/crieur/juge.ts')).href) } catch (e) { erreur = String((e && e.stack) || e) }
const out = { erreur, phraseAimant: mod ? mod.PHRASE_AIMANT : null, jugerAbsente: !mod || typeof mod.jugerPublication !== 'function', resultats: [] }
if (!out.jugerAbsente) {
  const FAITS = ${JSON.stringify(corpus.faits)}
  const GABARIT = ${JSON.stringify(corpus.phrasesGabarit)}
  const BASE = ${JSON.stringify(corpus.drapeauxBase)}
  for (const c of ${JSON.stringify(cas)}) {
    try {
      const drapeaux = c.drapeaux ? { ...BASE, ...c.drapeaux } : BASE
      const r = mod.jugerPublication({ canal: c.canal, texte: c.texte, fait_ids: c.fait_ids, media: c.media ?? undefined }, { faits: FAITS, phrasesGabarit: GABARIT, drapeaux })
      out.resultats.push({ nom: c.nom, ok: !!(r && r.ok), raisons: (r && r.raisons) || [] })
    } catch (e) { out.resultats.push({ nom: c.nom, exception: String((e && e.message) || e) }) }
  }
}
console.log('SONDE_CR14_JSON ' + JSON.stringify(out))
`
}
function lancerSondeJuge(corpus) {
  const cas = [...corpus.conformes.map((c) => ({ ...c, genre: 'conforme' })), ...corpus.fautives.map((c) => ({ ...c, genre: 'fautive' }))]
  const dossier = dossierTravail('crieur-qa')
  const fichier = path.join(dossier, 'sonde-juge.mjs')
  fs.writeFileSync(fichier, construireSondeJuge(cas, corpus))
  const r = lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(TS_LOADER).href, fichier], { cwd: racine, timeout: 60_000, env: {} })
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith('SONDE_CR14_JSON '))
  if (!ligne) return { erreur: `la sonde n'a rendu aucun résultat (code ${r.code}${r.signal ? ` signal ${r.signal}` : ''}) : ${court(r.sortie, 300)}` }
  try { return { r: JSON.parse(ligne.slice('SONDE_CR14_JSON '.length)) } } catch { return { erreur: 'résultat de la sonde illisible (JSON invalide)' } }
}
function jugerCR14(s) {
  const fichier = 'lib/crieur/juge.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('CR-14', `${fichier} absent ou vide`); return }
  for (const r of analyserSourceJuge(texte)) s.echoue('CR-14', r)
  const corpus = lireCorpusJuge()
  const sonde = lancerSondeJuge(corpus)
  if (sonde.erreur) { s.echoue('CR-14', `sonde en échec : ${sonde.erreur}`); return }
  const r = sonde.r
  if (r.erreur) { s.echoue('CR-14', `${fichier} ne s'importe pas : ${court(r.erreur, 200)}`); return }
  if (r.jugerAbsente) { s.echoue('CR-14', 'jugerPublication absente de lib/crieur/juge.ts (ou pas une fonction)'); return }
  if (r.phraseAimant !== PHRASE_AIMANT_ATTENDUE) s.echoue('CR-14', `PHRASE_AIMANT = ${JSON.stringify(r.phraseAimant)}, ${JSON.stringify(PHRASE_AIMANT_ATTENDUE)} attendue`)
  const raisonsVues = new Set()
  for (const c of corpus.conformes) {
    const res = r.resultats.find((x) => x.nom === c.nom)
    if (!res) s.echoue('CR-14', `${c.nom} : aucun résultat de la sonde`)
    else if (res.exception) s.echoue('CR-14', `${c.nom} (conforme) a levé : ${court(res.exception, 140)}`)
    else if (!res.ok) s.echoue('CR-14', `${c.nom} (conforme) refusée à tort : ${res.raisons.join(', ')}`)
  }
  for (const c of corpus.fautives) {
    const res = r.resultats.find((x) => x.nom === c.nom)
    if (!res) { s.echoue('CR-14', `${c.nom} : aucun résultat de la sonde`); continue }
    if (res.exception) { s.echoue('CR-14', `${c.nom} (fautive « ${c.raison} ») a levé : ${court(res.exception, 140)}`); continue }
    if (res.ok) { s.echoue('CR-14', `${c.nom} (fautive « ${c.raison} ») acceptée à tort`); continue }
    for (const x of res.raisons) raisonsVues.add(x)
    if (!res.raisons.includes(c.raison)) s.echoue('CR-14', `${c.nom} : raisons ${JSON.stringify(res.raisons)} ne portent pas ${c.raison}`)
  }
  if (corpus.fautives.length < 12) s.echoue('CR-14', `corpus : ${corpus.fautives.length} fautive(s), 12 attendues au moins`)
  const OBLIGATOIRES = ['aimant_absent', 'aimant_en_trop', 'media_invalide', 'phrase_inconnue', 'drapeau_baisse']
  for (const oId of OBLIGATOIRES) if (!raisonsVues.has(oId)) s.echoue('CR-14', `raison ${oId} jamais observée dans le corpus`)
  if (raisonsVues.size < 8) s.echoue('CR-14', `${raisonsVues.size} raison(s) distincte(s) observée(s) dans le corpus, 8 attendues au moins`)
  if (!s.enEchec('CR-14')) s.passe('CR-14', `${corpus.conformes.length} conforme(s) acceptée(s), ${corpus.fautives.length} fautive(s) refusée(s) chacune avec sa raison (${raisonsVues.size} distinctes) ; source sans fetch(, process.env ni import hors type`)
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --partie=composer (CR-1 à CR-4) — lib/crieur/faits.ts, lib/crieur/composer.ts (026-119)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function construireSondeComposer(etatsRuntime) {
  return `// Sonde de ${NOM} (--partie=composer), écrite par le juge (fiche 026-116). Importe et APPELLE composerLot,
// cleSemaine, horairesSemaine (lib/crieur/composer.ts) et jugerPublication (lib/crieur/juge.ts, déjà écrit).
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const R = ${JSON.stringify(racine)}
async function importer(rel) { try { return { m: await import(pathToFileURL(path.join(R, rel)).href) } } catch (e) { return { erreur: String((e && e.stack) || e) } } }
const faits = await importer('lib/crieur/faits.ts')
const composer = await importer('lib/crieur/composer.ts')
const juge = await importer('lib/crieur/juge.ts')
const out = { erreurs: {}, faits: null, exports: {}, lots: [], determinisme: null, cleSemaine: null, horairesSemaine: null, horizon: null }
if (faits.erreur) out.erreurs.faits = faits.erreur
if (composer.erreur) out.erreurs.composer = composer.erreur
if (juge.erreur) out.erreurs.juge = juge.erreur
const F = faits.m || {}, C = composer.m || {}, J = juge.m || {}
out.faits = Array.isArray(F.FAITS) ? F.FAITS : (F.FAITS ? '(pas un tableau)' : '(absent)')
out.exports = { PHRASES_GABARIT: Array.isArray(C.PHRASES_GABARIT) ? C.PHRASES_GABARIT : null, composerLot: typeof C.composerLot === 'function', cleSemaine: typeof C.cleSemaine === 'function', horairesSemaine: typeof C.horairesSemaine === 'function' }
// fait-recent.json / drapeau-baisse.json visent un fait RÉEL : les fixtures ne connaissent pas les id de
// lib/crieur/faits.ts (026-119, écrit après cette fiche), donc la cible est choisie ici, une fois FAITS importé —
// jamais un id inventé qui ne correspondrait à rien.
const FAITS_OK = Array.isArray(out.faits) ? out.faits : []
out.cibleFaitRecent = FAITS_OK[0]?.id ?? null
const faitAvecDrapeau = FAITS_OK.find((f) => f && f.drapeau)
out.cibleDrapeauBaisse = faitAvecDrapeau?.id ?? null
const CAS = ${JSON.stringify(etatsRuntime)}.map((c) => {
  if (c.nom === 'fait-recent' && out.cibleFaitRecent) {
    return { ...c, etat: { ...c.etat, faits_publies: { [out.cibleFaitRecent]: new Date(new Date(c.maintenant).getTime() - 5 * 86_400_000).toISOString() } } }
  }
  if (c.nom === 'drapeau-baisse' && out.cibleDrapeauBaisse) {
    return { ...c, etat: { ...c.etat, drapeaux: { ...c.etat.drapeaux, [faitAvecDrapeau.drapeau]: false } } }
  }
  return c
})
for (const c of CAS) {
  try {
    const m = new Date(c.maintenant)
    const r1 = typeof C.composerLot === 'function' ? C.composerLot(c.etat, m) : '(absente)'
    const r2 = typeof C.composerLot === 'function' ? C.composerLot(c.etat, m) : '(absente)'
    let jugements = null
    if (Array.isArray(r1) && typeof J.jugerPublication === 'function') {
      jugements = r1.map((p) => { try { return J.jugerPublication(p, { faits: !Array.isArray(out.faits) ? {} : Object.fromEntries(out.faits.map((x) => [x.id, x])), phrasesGabarit: out.exports.PHRASES_GABARIT || [], drapeaux: c.etat.drapeaux || {} }) } catch (e) { return { ok: false, raisons: ['exception:' + String((e && e.message) || e)] } } })
    }
    out.lots.push({ nom: c.nom, rendu: r1, rendu2: r2, jugements })
  } catch (e) { out.lots.push({ nom: c.nom, exception: String((e && e.message) || e) }) }
}
try {
  const m = new Date(${JSON.stringify(LUNDI_ESSAI)})
  out.cleSemaine = typeof C.cleSemaine === 'function' ? String(C.cleSemaine(m)) : '(absente)'
  out.horairesSemaine = typeof C.horairesSemaine === 'function' ? C.horairesSemaine(m).map((d) => new Date(d).toISOString()) : '(absente)'
  out.horizon = typeof C.composerLot === 'function' ? C.composerLot({ publies_mois: 0, externes_mois: 0, a_venir: 0, canaux_semaine: [], drapeaux: { aimantSite: true }, faits_publies: {} }, m, { horizonHeures: 26 }) : '(absente)'
} catch (e) { out.erreurs.temporel = String((e && e.message) || e) }
console.log('SONDE_COMPOSER_JSON ' + JSON.stringify(out))
`
}
function lancerSondeComposer() {
  const fs2 = fs
  const dossier = dossierTravail('crieur-qa')
  const etatsRuntime = ['mois-neuf', 'quota-plein', 'trois-programmees', 'fait-recent', 'drapeau-baisse'].map((nom) => {
    const brut = JSON.parse(fs2.readFileSync(path.join(R, 'scripts/fixtures/026-pubs-contenu/crieur/etats', `${nom}.json`), 'utf8'))
    const maintenant = new Date(LUNDI_ESSAI)
    const { faits_publies_relatifs, ...reste } = brut
    const faits_publies = { ...(brut.faits_publies || {}) }
    for (const [id, jours] of Object.entries(faits_publies_relatifs || {})) faits_publies[id] = new Date(maintenant.getTime() + Number(jours) * 86_400_000).toISOString()
    return { nom, maintenant: maintenant.toISOString(), etat: { ...reste, faits_publies } }
  })
  const fichier = path.join(dossier, 'sonde-composer.mjs')
  fs.writeFileSync(fichier, construireSondeComposer(etatsRuntime))
  const r = lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(TS_LOADER).href, fichier], { cwd: racine, timeout: 60_000, env: {} })
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith('SONDE_COMPOSER_JSON '))
  if (!ligne) return { erreur: `la sonde n'a rendu aucun résultat (code ${r.code}${r.signal ? ` signal ${r.signal}` : ''}) : ${court(r.sortie, 300)}` }
  try { return { r: JSON.parse(ligne.slice('SONDE_COMPOSER_JSON '.length)) } } catch { return { erreur: 'résultat de la sonde illisible (JSON invalide)' } }
}

const FORMULES_INTERDITES_TEXTE = (t) => {
  const raisons = []
  if (/moins d['’ʼ]une minute/i.test(t) && !/prêt|prépar/i.test(t)) raisons.push("« moins d'une minute » sans « prête »/« prépare »")
  if (/presti répond/i.test(t) && !/studio|signature/i.test(t)) raisons.push('« Presti répond » sans « Studio »/« Signature »')
  if (/n°\s?1/i.test(t)) raisons.push('« n°1 »')
  if (/\bmeilleur/i.test(t)) raisons.push('« meilleur »')
  if (/\bgaranti/i.test(t)) raisons.push('« garanti »')
  if (/premier sur google/i.test(t)) raisons.push('« premier sur Google »')
  return raisons
}

function jugerComposer(s) {
  const sonde = lancerSondeComposer()
  if (sonde.erreur) { for (const id of ['CR-1', 'CR-2', 'CR-3', 'CR-4']) s.echoue(id, sonde.erreur); return }
  const r = sonde.r

  // CR-1
  if (r.erreurs.faits) { s.echoue('CR-1', `lib/crieur/faits.ts ne s'importe pas : ${court(r.erreurs.faits, 200)}`) }
  else if (!Array.isArray(r.faits)) s.echoue('CR-1', `FAITS = ${JSON.stringify(r.faits)} : un tableau attendu`)
  else {
    if (r.faits.length < 12) s.echoue('CR-1', `FAITS : ${r.faits.length} entrée(s), 12 attendues au moins`)
    const ids = new Set()
    for (const f of r.faits) {
      if (!f || typeof f !== 'object') { s.echoue('CR-1', `entrée non-objet : ${JSON.stringify(f)}`); continue }
      if (!f.id) s.echoue('CR-1', 'un fait sans id')
      else if (ids.has(f.id)) s.echoue('CR-1', `id en double : ${f.id}`)
      else ids.add(f.id)
      if (typeof f.texte !== 'string' || !f.texte.trim()) s.echoue('CR-1', `${f.id || '?'} : texte manquant`)
      else if ([...f.texte].length > 220) s.echoue('CR-1', `${f.id} : texte de ${[...f.texte].length} signes, 220 au plus`)
      if (!Array.isArray(f.canaux) || !f.canaux.length) s.echoue('CR-1', `${f.id || '?'} : canaux manquants`)
      const preuve = f.preuve
      if (!preuve || typeof preuve !== 'object') s.echoue('CR-1', `${f.id || '?'} : preuve manquante`)
      else if (preuve.fichier) {
        // Correction du 28/09 (contre-vérification indépendante, défaut bloquant confirmé, Codex) :
        // `texteFichier.includes(String(preuve.motif || ''))` valait toujours vrai quand `motif` était vide ou
        // absent (`''.includes('')` en JS) — un fait pouvait être déclaré « prouvé » sans qu'aucun motif ne soit
        // réellement vérifié dans le fichier. Un motif vide (ou seulement des blancs) est désormais un échec.
        const motif = typeof preuve.motif === 'string' ? preuve.motif : ''
        if (!motif.trim()) s.echoue('CR-1', `${f.id || '?'} : preuve.motif vide ou absent (un motif réel est requis pour vérifier ${preuve.fichier})`)
        else {
          const texteFichier = lireSi(ch(preuve.fichier))
          if (texteFichier === null) s.echoue('CR-1', `${f.id} : preuve.fichier ${preuve.fichier} introuvable`)
          else if (!texteFichier.includes(motif)) s.echoue('CR-1', `${f.id} : ${preuve.fichier} ne contient pas mot pour mot « ${court(motif, 60)} »`)
        }
      } else if (preuve.promesse !== undefined) {
        const p = lireSi(ch('plans/promesses.md'))
        if (p === null) s.echoue('CR-1', `${f.id} : plans/promesses.md introuvable`)
        else {
          const lignes = p.split(/\r?\n/).filter((l) => /^\s*\|/.test(l))
          const ligne = lignes[Number(preuve.promesse) - 1]
          if (!ligne) s.echoue('CR-1', `${f.id} : plans/promesses.md ne porte pas de ligne ${preuve.promesse}`)
          else if (!/✅/.test(ligne)) s.echoue('CR-1', `${f.id} : plans/promesses.md ligne ${preuve.promesse} sans ✅`)
        }
      } else s.echoue('CR-1', `${f.id || '?'} : preuve ni { fichier, motif } ni { promesse }`)
      if (f.drapeau !== undefined) {
        const flagsTxt = lireSi(ch('lib/flags.ts'))
        if (flagsTxt === null || !new RegExp(`\\b${f.drapeau}\\s*:`).test(flagsTxt)) s.echoue('CR-1', `${f.id} : drapeau ${f.drapeau} absent de lib/flags.ts`)
      }
    }
    if (!s.enEchec('CR-1')) s.passe('CR-1', `${r.faits.length} faits, ids uniques, textes ≤ 220 signes, chaque preuve vérifiée`)
  }

  // CR-2 (sur les textes de FAITS)
  if (Array.isArray(r.faits)) {
    for (const f of r.faits) { for (const raison of FORMULES_INTERDITES_TEXTE(String(f?.texte || ''))) s.echoue('CR-2', `${f?.id || '?'} : ${raison}`) }
    if (!s.enEchec('CR-2')) s.passe('CR-2', `${r.faits.length} texte(s) sans formule interdite`)
  } else s.echoue('CR-2', 'FAITS non jugeable (CR-1 en échec)')

  // CR-3, CR-4
  if (r.erreurs.composer) { s.echoue('CR-3', `lib/crieur/composer.ts ne s'importe pas : ${court(r.erreurs.composer, 200)}`); s.echoue('CR-4', `lib/crieur/composer.ts ne s'importe pas : ${court(r.erreurs.composer, 200)}`) }
  else {
    if (!r.exports.composerLot) s.echoue('CR-3', 'composerLot absente de lib/crieur/composer.ts')
    if (!Array.isArray(r.exports.PHRASES_GABARIT)) s.echoue('CR-3', 'PHRASES_GABARIT absente (liste fermée attendue)')
    const composerTxt = lireSi(ch('lib/crieur/composer.ts'))
    if (composerTxt !== null) {
      for (const m of composerTxt.matchAll(/^\s*import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/gm)) {
        if (!['./faits', './juge'].includes(m[1])) s.echoue('CR-3', `import non permis dans composer.ts : ${m[1]}`)
      }
      if (/\bsupabase\b|\bfetch\s*\(|\bprocess\.env\b/.test(composerTxt)) s.echoue('CR-3', 'composer.ts contient supabase, fetch( ou process.env : il doit rester pur')
    }
    const LIMITES = { linkedin: 1300, facebook: 500, instagram: 2200 }
    for (const lot of r.lots) {
      if (lot.exception) { s.echoue('CR-3', `composerLot(${lot.nom}) a levé : ${court(lot.exception, 140)}`); continue }
      const publications = lot.rendu
      if (['quota-plein', 'trois-programmees'].includes(lot.nom)) {
        if (!(Array.isArray(publications) && publications.length === 0)) s.echoue('CR-3', `composerLot(${lot.nom}) : liste vide attendue, reçu ${JSON.stringify(publications)?.slice(0, 120)}`)
        continue
      }
      if (!Array.isArray(publications)) { s.echoue('CR-3', `composerLot(${lot.nom}) ne rend pas un tableau`); continue }
      if (publications.length > 3) s.echoue('CR-3', `composerLot(${lot.nom}) : ${publications.length} publication(s), 3 au plus attendues`)
      // Correction du 28/09 (contre-vérification indépendante, défaut majeur, Codex) : seules des bornes hautes
      // étaient vérifiées — un composerLot qui renvoie toujours [] les satisfaisait toutes. mois-neuf, fait-recent
      // et drapeau-baisse ont un quota et des parutions à venir loin d'être atteints (CR-1 exige ≥ 12 faits) : au
      // moins une publication est attendue, sans quoi le composeur n'aurait jamais rien exclu (fait récent, drapeau).
      if (['mois-neuf', 'fait-recent', 'drapeau-baisse'].includes(lot.nom) && publications.length === 0) {
        s.echoue('CR-3', `composerLot(${lot.nom}) : liste vide reçue, au moins 1 publication attendue (quota et parutions à venir loin d'être atteints)`)
      }
      const canaux = new Set()
      publications.forEach((p, i) => {
        const id = `composerLot(${lot.nom})[${i}]`
        if (!p || typeof p !== 'object') { s.echoue('CR-3', `${id} : objet attendu`); return }
        if (!['linkedin', 'facebook', 'instagram'].includes(p.canal)) s.echoue('CR-3', `${id} : canal ${p.canal}`)
        if (canaux.has(p.canal)) s.echoue('CR-3', `${id} : deux publications sur ${p.canal} dans le même lot`)
        canaux.add(p.canal)
        const lim = LIMITES[p.canal]
        if (lim && typeof p.texte === 'string' && [...p.texte].length > lim) s.echoue('CR-3', `${id} : ${[...p.texte].length} signes sur ${p.canal}, ${lim} au plus`)
        if (p.canal === 'instagram' && !p.visuel) s.echoue('CR-3', `${id} : instagram sans visuel`)
        const j = lot.jugements?.[i]
        if (j && j.ok !== true) s.echoue('CR-3', `${id} : refusée par jugerPublication (${(j.raisons || []).join(', ')})`)
      })
    }
    // fait-recent.json : le premier fait réel de FAITS, daté d'il y a 5 jours — jamais reproposé avant 30 jours.
    const litFR = r.lots.find((l) => l.nom === 'fait-recent')
    if (r.cibleFaitRecent && litFR && !litFR.exception && Array.isArray(litFR.rendu) && litFR.rendu.some((p) => Array.isArray(p.fait_ids) && p.fait_ids.includes(r.cibleFaitRecent))) {
      s.echoue('CR-3', `composerLot(fait-recent) : le fait « ${r.cibleFaitRecent} », publié il y a 5 jours, est reproposé (30 jours attendus)`)
    }
    // drapeau-baisse.json : un fait réel dont le drapeau est baissé — jamais proposé.
    const litDB = r.lots.find((l) => l.nom === 'drapeau-baisse')
    if (r.cibleDrapeauBaisse && litDB && !litDB.exception && Array.isArray(litDB.rendu) && litDB.rendu.some((p) => Array.isArray(p.fait_ids) && p.fait_ids.includes(r.cibleDrapeauBaisse))) {
      s.echoue('CR-3', `composerLot(drapeau-baisse) : le fait « ${r.cibleDrapeauBaisse} », dont le drapeau est baissé, est proposé`)
    }
    if (!s.enEchec('CR-3')) s.passe('CR-3', `${r.lots.length} état(s) jugés : quota et parutions à venir respectés, ≤ 3 publications, un canal par lot, limites de signes, visuel Instagram, faits récents/drapeau baissé exclus, chaque publication passe jugerPublication`)

    const detEtat = r.lots[0]
    if (detEtat && !detEtat.exception && JSON.stringify(detEtat.rendu) !== JSON.stringify(detEtat.rendu2)) s.echoue('CR-4', `composerLot(${detEtat.nom}) : deux appels identiques rendent des résultats différents`)
    if (!/^\d{4}-S\d{2}$/.test(String(r.cleSemaine))) s.echoue('CR-4', `cleSemaine = ${JSON.stringify(r.cleSemaine)}, forme AAAA-Snn attendue`)
    if (Array.isArray(r.horairesSemaine)) {
      if (r.horairesSemaine.length !== 3) s.echoue('CR-4', `horairesSemaine : ${r.horairesSemaine.length} instant(s), 3 attendus`)
      const maintenant = new Date(LUNDI_ESSAI), fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false })
      const attendus = ['lundi', 'mercredi', 'vendredi']
      r.horairesSemaine.forEach((iso, i) => {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) { s.echoue('CR-4', `horairesSemaine[${i}] : date invalide ${iso}`); return }
        if (d < maintenant || d.getTime() - maintenant.getTime() > 7 * 86_400_000) s.echoue('CR-4', `horairesSemaine[${i}] hors des 7 jours : ${iso}`)
        // formatToParts, pas .format().split(' à ') : le séparateur textuel entre le jour et l'heure dépend de l'ICU
        // du système (« lundi à 12:00 » sous Linux, « lundi 12:00 » sous Windows) — les parts nommées, elles, sont stables.
        const parties = fmt.formatToParts(d)
        const jour = (parties.find((p) => p.type === 'weekday')?.value || '').toLowerCase()
        const heure = parties.find((p) => p.type === 'hour')?.value || ''
        const minute = parties.find((p) => p.type === 'minute')?.value || ''
        if (!(heure === '12' && minute === '00')) s.echoue('CR-4', `horairesSemaine[${i}] : ${iso} n'est pas 12 h de Paris (${fmt.format(d)})`)
        if (attendus[i] && !jour.startsWith(attendus[i])) s.echoue('CR-4', `horairesSemaine[${i}] : ${jour}, ${attendus[i]} attendu`)
      })
    } else s.echoue('CR-4', `horairesSemaine = ${JSON.stringify(r.horairesSemaine)}`)
    if (Array.isArray(r.horizon)) {
      if (r.horizon.length > 1) s.echoue('CR-4', `composerLot(…, { horizonHeures: 26 }) : ${r.horizon.length} publication(s), au plus 1 attendue (lundi 5 h UTC → seul le créneau du lundi midi tombe dans les 26 h)`)
      // Correction du 28/09 (contre-vérification indépendante, défaut majeur, Codex) : seule la borne haute (≤ 1)
      // était vérifiée — un composerLot qui renvoie toujours [] la satisfaisait aussi. Le créneau du lundi midi
      // tombe bien dans les 26 h depuis 5 h UTC : une liste vide est donc aussi un échec, pas seulement > 1.
      else if (r.horizon.length === 0) s.echoue('CR-4', `composerLot(…, { horizonHeures: 26 }) : aucune publication rendue, 1 attendue (le créneau du lundi midi tombe dans les 26 h depuis lundi 5 h UTC)`)
      if (r.horizon[0] && r.horizon[0].canal !== 'instagram') s.echoue('CR-4', `composerLot(…, { horizonHeures: 26 }) : canal ${r.horizon[0].canal}, instagram attendu (créneau du lundi)`)
    } else s.echoue('CR-4', `composerLot(…, { horizonHeures: 26 }) = ${JSON.stringify(r.horizon)}`)
    if (!s.enEchec('CR-4')) s.passe('CR-4', 'déterminisme, cleSemaine (AAAA-Snn), horairesSemaine (lundi/mercredi/vendredi 12 h Paris, dans les 7 jours), horizonHeures=26 ne rend que le créneau du lundi')
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --partie=route (CR-5, CR-6, CR-7, CR-7BIS, CR-8, CR-9, CR-15, CR-16, CR-17, CR-18, CR-19) — 026-122
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function construireSondePublora() {
  return `// Sonde de ${NOM} (--partie=route, CR-7/CR-7BIS), écrite par le juge (fiche 026-116). Importe et APPELLE
// creerPublication et connexions de lib/crieur/publora.ts avec un faux fetch (jamais le réseau).
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const R = ${JSON.stringify(racine)}
const { creerFauxFetch, lireConnexionsPublora } = await import(${JSON.stringify(pathToFileURL(path.join(R, 'scripts/fixtures/026-pubs-contenu/crieur/lire.mjs')).href)})
// La sonde ne dépend pas de l'environnement ambiant : une clé d'essai, jamais une vraie, et le faux fetch ne sort pas du processus.
process.env.PUBLORA_API_KEY = 'cle-essai-hors-ligne'
let mod, erreur = null
try { mod = await import(pathToFileURL(path.join(R, 'lib/crieur/publora.ts')).href) } catch (e) { erreur = String((e && e.stack) || e) }
const out = { erreur, appels: [], connexions: null, refusScheduledTime: null, refusProgrammeePour: null, programmation: null }
if (mod) {
  const conn = lireConnexionsPublora()
  const { fetch, requetes } = creerFauxFetch({ 'https://api.publora.com/api/v1/create-post': { corps: { success: true, postGroupId: 'pg-essai-0001' } }, 'https://api.publora.com/api/v1/platform-connections': { corps: conn } })
  try {
    if (typeof mod.creerPublication === 'function') {
      await mod.creerPublication({ contenu: 'texte essai', plateformes: ['linkedin-essai'] }, fetch)
      await mod.creerPublication({ contenu: 'texte essai insta', plateformes: ['instagram-essai'], medias: ['https://prestiapp.fr/api/crieur/visuel/minute.png'] }, fetch)
    }
  } catch (e) { out.erreurAppel = String((e && e.message) || e) }
  out.appels = requetes
  try {
    if (typeof mod.creerPublication === 'function') { await mod.creerPublication({ contenu: 'x', plateformes: ['linkedin-essai'], scheduledTime: '2030-01-01T00:00:00Z' }, fetch); out.refusScheduledTime = 'accepte' }
  } catch (e) { out.refusScheduledTime = 'refuse:' + String((e && e.message) || e) }
  try {
    if (typeof mod.creerPublication === 'function') { await mod.creerPublication({ contenu: 'x', plateformes: ['linkedin-essai'], programmeePour: '2030-01-01T00:00:00Z' }, fetch); out.refusProgrammeePour = 'accepte' }
  } catch (e) { out.refusProgrammeePour = 'refuse:' + String((e && e.message) || e) }
  // CR-7BIS (04/10/2026, décision « tout est automatique », D-0410-1) : programmer n'est plus interdit, c'est un geste séparé du dépôt
  // et SOUS COÛT NUL STRICT. programmerPublication ne doit RIEN envoyer tant que le coût n'est pas exactement le nombre 0, ni sans clé
  // idempotente du Crieur, ni vers un créneau passé, et doit refuser une réponse qui ne confirme pas le statut et l'heure demandés.
  try {
    if (typeof mod.programmerPublication !== 'function') out.programmation = { absente: true }
    else {
      const futur = '2030-01-01T12:00:00.000Z', maintenant = new Date('2029-12-31T12:00:00.000Z')
      const bonne = { defaut: { corps: { success: true, postGroup: { status: 'scheduled', scheduledTime: futur } } } }
      const p = { absente: false, coutAccepte: [], appelsAvantRefus: 0, cout0: null, cleInvalide: 'accepte', creneauPasse: 'accepte', nonConfirme: 'accepte' }
      for (const cout of [undefined, null, '0', -1, 1, 0.01, NaN]) {
        const faux = creerFauxFetch(bonne)
        try { await mod.programmerPublication('pub-essai', futur, 'crieur-essai', cout, faux.fetch, maintenant); p.coutAccepte.push(String(cout)) } catch {}
        p.appelsAvantRefus += faux.requetes.length
      }
      const f0 = creerFauxFetch(bonne)
      try { await mod.programmerPublication('pub-essai', futur, 'crieur-essai', 0, f0.fetch, maintenant); p.cout0 = { ok: true, requetes: f0.requetes } } catch (e) { p.cout0 = { ok: false, erreur: String((e && e.message) || e) } }
      const fc = creerFauxFetch(bonne)
      try { await mod.programmerPublication('pub-essai', futur, 'cle-sans-prefixe', 0, fc.fetch, maintenant); p.cleInvalide = 'accepte' } catch { p.cleInvalide = 'refuse' }
      if (fc.requetes.length) p.cleInvalide = 'appel'
      const fp = creerFauxFetch(bonne)
      try { await mod.programmerPublication('pub-essai', '2029-12-30T12:00:00.000Z', 'crieur-essai', 0, fp.fetch, maintenant); p.creneauPasse = 'accepte' } catch { p.creneauPasse = 'refuse' }
      if (fp.requetes.length) p.creneauPasse = 'appel'
      const fn = creerFauxFetch({ defaut: { corps: { success: true, postGroup: { status: 'draft', scheduledTime: futur } } } })
      try { await mod.programmerPublication('pub-essai', futur, 'crieur-essai', 0, fn.fetch, maintenant); p.nonConfirme = 'accepte' } catch { p.nonConfirme = 'refuse' }
      out.programmation = p
    }
  } catch (e) { out.programmation = { erreur: String((e && e.message) || e) } }
  try { out.connexions = typeof mod.connexions === 'function' ? await mod.connexions(fetch) : '(absente)' } catch (e) { out.connexions = 'exception:' + String((e && e.message) || e) }
}
console.log('SONDE_PUBLORA_JSON ' + JSON.stringify(out))
`
}
function lancerSondePublora() {
  const dossier = dossierTravail('crieur-qa')
  const fichier = path.join(dossier, 'sonde-publora.mjs')
  fs.writeFileSync(fichier, construireSondePublora())
  // 04/10/2026 (CR-7 non hermétique, audit C §5.8) : lib/crieur/publora.ts lève sans PUBLORA_API_KEY et commun.mjs hérite de
  // l'environnement de la machine ({ ...process.env, ...env }) : le PASS dépendait de qui rendait le verdict. Le juge pose lui-même une
  // clé FACTICE (la sonde n'appelle que le faux fetch, jamais le réseau) et neutralise le coût déclaré : même verdict partout.
  const env = { PUBLORA_API_KEY: 'cle-factice-crieur-qa-sans-valeur', PUBLORA_COUT_PAR_PUBLICATION_EUR: '' }
  const r = lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(TS_LOADER).href, fichier], { cwd: racine, timeout: 60_000, env })
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith('SONDE_PUBLORA_JSON '))
  if (!ligne) return { erreur: `la sonde n'a rendu aucun résultat (code ${r.code}${r.signal ? ` signal ${r.signal}` : ''}) : ${court(r.sortie, 300)}` }
  try { return { r: JSON.parse(ligne.slice('SONDE_PUBLORA_JSON '.length)) } } catch { return { erreur: 'résultat de la sonde illisible (JSON invalide)' } }
}
function jugerCR7(s) {
  const sonde = lancerSondePublora()
  if (sonde.erreur) { s.echoue('CR-7', sonde.erreur); s.echoue('CR-7BIS', sonde.erreur); return }
  const r = sonde.r
  if (r.erreur) { s.echoue('CR-7', `lib/crieur/publora.ts ne s'importe pas : ${court(r.erreur, 200)}`); s.echoue('CR-7BIS', `lib/crieur/publora.ts ne s'importe pas : ${court(r.erreur, 200)}`); return }
  if (r.erreurAppel) s.echoue('CR-7', `creerPublication a levé : ${court(r.erreurAppel, 160)}`)
  const appelsCreation = (r.appels || []).filter((a) => a.url === 'https://api.publora.com/api/v1/create-post')
  if (!appelsCreation.length) s.echoue('CR-7', 'aucun POST vers /create-post observé')
  for (const a of appelsCreation) {
    if (a.methode !== 'POST') s.echoue('CR-7', `create-post appelé en ${a.methode}, POST attendu`)
    if (!a.entetes?.['x-publora-key']) s.echoue('CR-7', "en-tête x-publora-key absent de l'appel create-post")
    const cles = Object.keys(a.corps || {}).sort()
    const permis = new Set(['content', 'platforms', 'mediaUrls'])
    for (const k of cles) if (!permis.has(k)) s.echoue('CR-7', `create-post : clé non permise dans le corps : ${k}`)
    // Correction du 28/09 (contre-vérification indépendante, défaut majeur, Codex) : l'absence de clé en trop ne
    // suffit pas — un corps vide ({}) passait cette seule vérification. content et platforms sont désormais exigées.
    if (typeof a.corps?.content !== 'string' || !a.corps.content.trim()) s.echoue('CR-7', 'create-post : corps sans content (ou content vide)')
    if (!Array.isArray(a.corps?.platforms) || !a.corps.platforms.length) s.echoue('CR-7', 'create-post : corps sans platforms (tableau non vide attendu)')
    if ('scheduledTime' in (a.corps || {})) s.echoue('CR-7', 'create-post : scheduledTime présent dans le corps (interdit depuis le 27/09, R24)')
  }
  const appelInstagram = appelsCreation.find((a) => (a.corps?.platforms || []).some((p) => String(p).startsWith('instagram-')))
  if (appelInstagram && !appelInstagram.corps?.mediaUrls) s.echoue('CR-7', "l'appel Instagram ne porte pas mediaUrls")
  if (r.connexions === '(absente)') s.echoue('CR-7', 'connexions absente de lib/crieur/publora.ts')
  else if (r.connexions && r.connexions.exception) s.echoue('CR-7', `connexions a levé : ${court(r.connexions, 160)}`)
  else if (Array.isArray(r.connexions)) {
    for (const prefixe of ['linkedin-', 'facebook-', 'instagram-']) if (!r.connexions.some((c) => String(c).startsWith(prefixe))) s.echoue('CR-7', `connexions() ne garde pas d'identifiant ${prefixe}…`)
  }
  if (!s.enEchec('CR-7')) s.passe('CR-7', 'POST /create-post, x-publora-key, corps aux seules clés content/platforms(/mediaUrls), jamais scheduledTime ; connexions garde les trois préfixes')

  if (r.refusScheduledTime === 'accepte') s.echoue('CR-7BIS', 'creerPublication accepte un scheduledTime au lieu de le refuser')
  else if (!r.refusScheduledTime) s.echoue('CR-7BIS', 'creerPublication(scheduledTime) non testé (sonde en échec)')
  if (r.refusProgrammeePour === 'accepte') s.echoue('CR-7BIS', 'creerPublication accepte un programmeePour au lieu de le refuser')
  else if (!r.refusProgrammeePour) s.echoue('CR-7BIS', 'creerPublication(programmeePour) non testé (sonde en échec)')
  const publoraTxt = lireSi(ch('lib/crieur/publora.ts'))
  const routeTxt = lireSi(ch('app/api/cron/crieur/route.ts'))
  if (publoraTxt !== null && /CRIEUR_PUBLIE_SEUL/.test(publoraTxt)) s.echoue('CR-7BIS', 'lib/crieur/publora.ts lit CRIEUR_PUBLIE_SEUL (supprimé le 27/09)')
  if (routeTxt !== null && /CRIEUR_PUBLIE_SEUL/.test(routeTxt)) s.echoue('CR-7BIS', 'la route lit CRIEUR_PUBLIE_SEUL (supprimé le 27/09)')
  // Correction du 04/10/2026 (décision D-0410-1 de Benj, « tout doit être auto », confirmant celle du 30/09 ; audit C §5.3/§5.4) : la route
  // écrit désormais 'programmee' — c'est légitime, mais SEULEMENT sous les garde-fous que l'ancienne interdiction totale garantissait
  // par défaut. Ce critère ne s'assouplit donc pas, il change d'objet : il attrape une programmation sans pause relue, sans coût nul
  // exact, sans suspension à la pause générale, ou un statut 'programmee' inséré d'emblée à la réservation.
  const prog = r.programmation
  if (prog && prog.erreur) s.echoue('CR-7BIS', `la sonde de programmerPublication a levé : ${court(prog.erreur, 160)}`)
  else if (prog && prog.absente) {
    if (routeTxt !== null && /statut\s*:\s*['"]programmee['"]/.test(routeTxt)) s.echoue('CR-7BIS', "la route écrit 'programmee' mais lib/crieur/publora.ts n'exporte pas programmerPublication")
  } else if (prog) {
    if (prog.coutAccepte.length) s.echoue('CR-7BIS', `programmerPublication accepte un coût qui n'est pas exactement le nombre 0 : ${prog.coutAccepte.join(', ')}`)
    if (prog.appelsAvantRefus) s.echoue('CR-7BIS', `programmerPublication appelle Publora (${prog.appelsAvantRefus} appel(s)) avant de refuser un coût inconnu ou positif`)
    if (!prog.cout0 || prog.cout0.ok !== true) s.echoue('CR-7BIS', `programmerPublication(coût 0) refusée à tort : ${court(prog.cout0 && prog.cout0.erreur, 140)}`)
    else {
      const [a, ...autres] = prog.cout0.requetes
      if (autres.length || !a || a.methode !== 'PUT' || a.url !== 'https://api.publora.com/api/v1/update-post/pub-essai' || a.corps?.status !== 'scheduled' || typeof a.corps?.scheduledTime !== 'string' || !a.entetes?.['x-publora-key']) {
        s.echoue('CR-7BIS', `programmerPublication : appel attendu = un seul PUT /update-post/<id>, x-publora-key, corps { status: 'scheduled', scheduledTime } (reçu : ${court(JSON.stringify(prog.cout0.requetes), 200)})`)
      }
    }
    if (prog.cleInvalide !== 'refuse') s.echoue('CR-7BIS', `programmerPublication sans clé idempotente « crieur-… » : ${prog.cleInvalide === 'appel' ? 'appelle Publora' : 'acceptée'}`)
    if (prog.creneauPasse !== 'refuse') s.echoue('CR-7BIS', `programmerPublication vers un créneau passé : ${prog.creneauPasse === 'appel' ? 'appelle Publora' : 'acceptée'}`)
    if (prog.nonConfirme !== 'refuse') s.echoue('CR-7BIS', "programmerPublication accepte une réponse qui ne confirme pas le statut 'scheduled'")
  } else s.echoue('CR-7BIS', 'programmerPublication non testée (sonde en échec)')
  if (routeTxt !== null) jugerProgrammationRoute(s, routeTxt)
  if (!s.enEchec('CR-7BIS')) s.passe('CR-7BIS', "ni publora.ts ni la route ne lisent CRIEUR_PUBLIE_SEUL ; scheduledTime/programmeePour refusés au dépôt ; programmation sous coût nul strict, pause relue entre le dépôt et l'inscription, suspension à chaque pause, jamais 'programmee' à la réservation")
}

// CR-7BIS, côté route (04/10/2026) : le statut 'programmee' n'est légitime que sous les garde-fous de la programmation automatique.
// Texte seulement : le comportement réel de la route est jugé par scripts/crieur-route-qa.mjs et scripts/crieur-suspension-qa.mjs.
function jugerProgrammationRoute(s, routeTxt) {
  const get = extraireFonction(routeTxt, 'GET')
  if (!get) return // jugerRouteTexte le signale déjà (CR-5…)
  const iIns = get.indexOf('.insert(')
  if (iIns >= 0) {
    const fin = get.indexOf('.select(', iIns)
    if (/statut\s*:\s*['"]programmee['"]/.test(get.slice(iIns, fin > iIns ? fin : iIns + 800))) s.echoue('CR-7BIS', "la réservation insère d'emblée le statut 'programmee' (elle doit rester 'erreur', puis brouillon_publora, puis programmee après confirmation)")
  }
  const posEcr = get.search(/statut\s*:\s*['"]programmee['"]/)
  if (posEcr < 0) return // aucune programmation écrite : brouillons seuls, rien d'autre à garder
  const posCout = get.search(/PUBLORA_COUT_PAR_PUBLICATION_EUR\s*!==\s*['"]0['"]/)
  const posCree = get.search(/creerPublication\s*\(/)
  const posProg = get.search(/programmerPublication\s*\(/)
  const posIntention = get.search(/programmation_en_cours/)
  if (posProg < 0 || posProg > posEcr) s.echoue('CR-7BIS', "la route écrit 'programmee' sans avoir appelé programmerPublication( avant")
  if (posCout < 0) s.echoue('CR-7BIS', "la route programme sans exiger PUBLORA_COUT_PAR_PUBLICATION_EUR !== '0' (coût nul non attesté)")
  else if (posCree >= 0 && posCout > posCree) s.echoue('CR-7BIS', 'le coût nul est exigé APRÈS creerPublication( : un brouillon partirait déjà sans coût attesté')
  if (posCree < 0 || (posProg >= 0 && posCree > posProg)) s.echoue('CR-7BIS', "programmerPublication( n'est pas précédée du dépôt creerPublication(")
  if (!/programmerPublication\s*\(\s*[^()]*?,\s*[^()]*?,\s*[^()]*?,\s*0\s*\)/.test(get)) s.echoue('CR-7BIS', 'programmerPublication( ne reçoit pas le coût littéral 0 en 4e argument')
  if (posIntention < 0 || (posProg >= 0 && posIntention > posProg)) s.echoue('CR-7BIS', "l'intention 'programmation_en_cours' n'est pas inscrite AVANT l'appel de programmation (une pause ne retrouverait pas une programmation incertaine)")
  if (posProg >= 0 && posCree >= 0 && posCree < posProg && !/sortiePermise\s*\(/.test(get.slice(posCree, posProg))) s.echoue('CR-7BIS', 'la pause générale (sortiePermise) n\'est pas relue entre le dépôt Publora et la demande de programmation')
  if (posProg >= 0 && posProg < posEcr && !/sortiePermise\s*\(/.test(get.slice(posProg, posEcr))) s.echoue('CR-7BIS', "la pause générale (sortiePermise) n'est pas relue entre la demande de programmation et l'écriture de 'programmee'")
  if (!/import\s*\{[^}]*\bsignalerProgrammees\b[^}]*\}\s*from\s*['"]@\/lib\/crieur\/pauseProgrammees['"]/.test(routeTxt)) s.echoue('CR-7BIS', "signalerProgrammees n'est pas importée de @/lib/crieur/pauseProgrammees (la pause doit suspendre les publications programmées)")
  for (const m of get.matchAll(/sortiePermise\s*\(/g)) {
    if (!/signalerProgrammees\s*\(/.test(get.slice(m.index, m.index + 260))) { s.echoue('CR-7BIS', "une lecture de la pause (sortiePermise) n'est pas suivie de signalerProgrammees( : la pause générale ne suspendrait pas ce qui est programmé"); break }
  }
  if (!/suspendrePublication\s*\(/.test(get)) s.echoue('CR-7BIS', "suspendrePublication( absente : un registre qui échoue après la programmation laisserait une publication programmée sans suivi")
}

function jugerRouteTexte(s) {
  const fichier = 'app/api/cron/crieur/route.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) {
    for (const id of ['CR-5', 'CR-6', 'CR-8', 'CR-9', 'CR-16', 'CR-17', 'CR-18', 'CR-19']) s.echoue(id, `${fichier} absent ou vide`)
    return
  }
  const get = extraireFonction(texte, 'GET')
  if (!get) { for (const id of ['CR-5', 'CR-6', 'CR-8', 'CR-9', 'CR-16', 'CR-17', 'CR-18', 'CR-19']) s.echoue(id, `export async function GET introuvable dans ${fichier}`); return }

  // CR-5 : 401 sans Authorization: Bearer <CRON_SECRET>, même forme que relances/route.ts
  if (!/CRON_SECRET/.test(get)) s.echoue('CR-5', 'CRON_SECRET introuvable dans GET')
  if (!/401/.test(get)) s.echoue('CR-5', 'aucune réponse 401 dans GET')
  const posAuth = get.search(/CRON_SECRET/)
  const posPause = get.search(/sortiePermise\s*\(/)
  if (posAuth < 0) s.echoue('CR-5', 'CRON_SECRET introuvable')
  if (!s.enEchec('CR-5')) s.passe('CR-5', 'CRON_SECRET vérifié, 401 en cas de jeton absent ou faux')

  // CR-17 : la pause générale, lue par sortiePermise() de lib/agents/sortie.ts (porte FAIL-CLOSED : seule la valeur exacte `active: false`
  // ouvre ; une lecture qui lève ou rend autre chose ferme), juste après le contrôle du jeton, avant toute lecture de crieur_posts / appel à
  // publora. Correction du 04/10/2026 : la route passait par pauseGenerale() de lib/agents/pause.ts, qui ouvrait en cas de doute ; elle
  // utilise sortiePermise depuis 0ac78df0. Le critère exige la porte fail-closed (plus stricte) et que son résultat COMMANDE le passage.
  if (!/import\s*\{[^}]*\bsortiePermise\b[^}]*\}\s*from\s*['"]@\/lib\/agents\/sortie['"]/.test(texte)) s.echoue('CR-17', "sortiePermise n'est pas importée de @/lib/agents/sortie")
  if (/from\s*['"]@\/lib\/agents\/pause['"]/.test(texte)) s.echoue('CR-17', "la route lit encore la pause par @/lib/agents/pause (qui ouvre en cas de doute) : seule la porte fail-closed @/lib/agents/sortie est permise")
  if (!/\(\s*await\s+sortiePermise\s*\(\s*\)\s*\)\s*\.permise/.test(get)) s.echoue('CR-17', 'le résultat de sortiePermise() ne commande pas la sortie ((await sortiePermise()).permise attendu)')
  if (posPause < 0) s.echoue('CR-17', 'sortiePermise( introuvable dans GET')
  else {
    const posPosts = get.search(/crieur_posts/)
    const posPublora = get.search(/creerPublication\s*\(/)
    if (posAuth >= 0 && posPause < posAuth) s.echoue('CR-17', 'sortiePermise( est appelée avant le contrôle de CRON_SECRET')
    if (posPosts >= 0 && posPosts < posPause) s.echoue('CR-17', 'crieur_posts est lu avant sortiePermise(')
    if (posPublora >= 0 && posPublora < posPause) s.echoue('CR-17', 'creerPublication( est appelée avant sortiePermise(')
  }
  if (!s.enEchec('CR-17')) s.passe('CR-17', 'sortiePermise (porte fail-closed) importée de @/lib/agents/sortie, appelée juste après le contrôle du jeton, avant crieur_posts et creerPublication ; son résultat commande la sortie')

  // CR-6 : ?a_sec=1 rend le lot en JSON avant toute écriture/appel Publora
  if (!/a_sec/.test(get)) s.echoue('CR-6', 'a_sec introuvable dans GET')
  const posASec = get.search(/a_sec/)
  const posInsert = get.search(/\.insert\s*\(/)
  const posUpdate = get.search(/\.update\s*\(/)
  const posPublora2 = get.search(/creerPublication\s*\(/)
  if (posASec >= 0) {
    if (posInsert >= 0 && posInsert < posASec) s.echoue('CR-6', 'une écriture (.insert() précède le traitement de ?a_sec=1')
    if (posUpdate >= 0 && posUpdate < posASec) s.echoue('CR-6', 'une écriture (.update() précède le traitement de ?a_sec=1')
    if (posPublora2 >= 0 && posPublora2 < posASec) s.echoue('CR-6', 'creerPublication( précède le traitement de ?a_sec=1')
  }
  if (!s.enEchec('CR-6')) s.passe('CR-6', '?a_sec=1 traité avant toute écriture ou appel à Publora')

  // CR-8 : idempotence par semaine/canal, jugerPublication avant creerPublication, statut brouillon_publora + programmee_pour, notifierEntreprise
  if (!/jugerPublication\s*\(/.test(get)) s.echoue('CR-8', 'jugerPublication( introuvable dans GET')
  else { const pj = get.search(/jugerPublication\s*\(/), pc = get.search(/creerPublication\s*\(/); if (pc >= 0 && pc < pj) s.echoue('CR-8', 'creerPublication( est appelée avant jugerPublication(') }
  if (!/brouillon_publora/.test(get)) s.echoue('CR-8', "le statut 'brouillon_publora' introuvable")
  if (!/programmee_pour/.test(get)) s.echoue('CR-8', 'programmee_pour introuvable')
  if (!/notifierEntreprise\s*\(/.test(texte)) s.echoue('CR-8', 'notifierEntreprise( introuvable')
  if (!/Crieur\s*(—|-)\s*/.test(get) && !/brouillons à accorder/.test(get)) s.echoue('CR-8', "le sujet « Crieur — n brouillons à accorder » introuvable")
  if (!s.enEchec('CR-8')) s.passe('CR-8', 'jugerPublication avant creerPublication, statut brouillon_publora + programmee_pour, notifierEntreprise (sujet « … brouillons à accorder »)')

  // CR-9 : aucun import de lib/ai, enregistrerPassage('crieur', …)
  if (/from\s*['"]@\/lib\/ai['"]/.test(texte)) s.echoue('CR-9', 'la route importe @/lib/ai')
  if (!/enregistrerPassage\s*\(\s*['"]crieur['"]/.test(texte)) s.echoue('CR-9', "enregistrerPassage('crieur', …) introuvable")
  const tc = lancer('npm', ['run', 'typecheck'], { cwd: racine, timeout: 300_000, shell: process.platform === 'win32' })
  if (tc.code !== 0) s.echoue('CR-9', `npm run typecheck en code ${tc.code} : ${court(tc.derniereLigne || tc.sortie, 200)}`)
  if (!s.enEchec('CR-9')) s.passe('CR-9', "aucun import de lib/ai, enregistrerPassage('crieur', …) appelé, npm run typecheck vert")

  // CR-16 : ops_battement('crieur') après enregistrerPassage(, jamais en a_sec ni en erreur Publora
  if (!/ops_battement\s*\(/.test(texte)) s.echoue('CR-16', 'ops_battement( introuvable')
  else {
    const posEP = texte.search(/enregistrerPassage\s*\(/), posB = texte.search(/ops_battement\s*\(/)
    if (posEP >= 0 && posB < posEP) s.echoue('CR-16', "ops_battement( ne suit pas enregistrerPassage(")
    if (!/crieur/.test(texte.slice(Math.max(0, texte.search(/ops_battement\s*\(/) - 5), texte.search(/ops_battement\s*\(/) + 60))) s.echoue('CR-16', "ops_battement( n'est pas appelée avec 'crieur' à proximité")
  }
  if (!s.enEchec('CR-16')) s.passe('CR-16', "ops_battement('crieur') suit enregistrerPassage(")

  // CR-18 : le drapeau aimantSite lu par actif(), passé au compositeur et au juge ; lib/flags.ts et fermeture-e2e.mjs
  if (!/actif\s*\(\s*['"]aimantSite['"]\s*\)/.test(texte)) s.echoue('CR-18', "actif('aimantSite') introuvable dans la route")
  if (!/aimantSite/.test(get)) s.echoue('CR-18', "aimantSite n'apparaît pas dans GET")
  const flagsTxt = lireSi(ch('lib/flags.ts'))
  if (flagsTxt === null) s.echoue('CR-18', 'lib/flags.ts absent')
  else if (!/aimantSite\s*:\s*false/.test(flagsTxt)) s.echoue('CR-18', 'lib/flags.ts : aimantSite doit valoir false tant que le service de bout en bout n\'est pas prouvé')
  const fermetureTxt = lireSi(ch('scripts/fermeture-e2e.mjs'))
  if (fermetureTxt === null) s.echoue('CR-18', 'scripts/fermeture-e2e.mjs absent')
  else if (!/['"]aimantSite['"]\s*:\s*\[\s*['"]lu['"]/.test(fermetureTxt)) s.echoue('CR-18', "scripts/fermeture-e2e.mjs : la carte ne porte pas 'aimantSite': ['lu']")
  if (!s.enEchec('CR-18')) s.passe('CR-18', "actif('aimantSite') lu et transmis, lib/flags.ts (false, commenté) et fermeture-e2e.mjs ('lu') à jour")

  // CR-19 : quotidienne, 26 h, jamais scheduledTime/programmeePour transmis par la route (creerPublication le refuse déjà, CR-7BIS)
  if (!/26/.test(get)) s.echoue('CR-19', "l'horizon de 26 h n'apparaît pas dans GET")
  if (/scheduledTime/.test(get)) s.echoue('CR-19', 'GET construit un scheduledTime (interdit depuis le 27/09)')
  if (!/deja\s*:\s*true/.test(texte)) s.echoue('CR-19', "{ deja: true } introuvable (rejeu idempotent le même jour)")
  if (!s.enEchec('CR-19')) s.passe('CR-19', "horizon de 26 h, { deja: true } au rejeu, jamais scheduledTime envoyé (route + creerPublication, CR-7BIS)")
}

function jugerVisuel(s) {
  const fichier = 'app/api/crieur/visuel/[id]/route.tsx'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('CR-15', `${fichier} absent ou vide`); return }
  if (!/ImageResponse/.test(texte) || !/next\/og/.test(texte)) s.echoue('CR-15', "ImageResponse de next/og introuvable")
  if (!/404/.test(texte)) s.echoue('CR-15', "aucune réponse 404 (id inconnu) dans la route")
  if (!/1080/.test(texte)) s.echoue('CR-15', 'dimensions 1080×1080 introuvables')
  if (!/Cache-Control/.test(texte) || !/max-age=86400/.test(texte)) s.echoue('CR-15', "Cache-Control: public, max-age=86400 introuvable")
  if (/https?:\/\/(?!prestiapp\.fr)/i.test(texte.replace(/\/\/[^\n]*/g, ''))) s.echoue('CR-15', 'une adresse hors prestiapp.fr apparaît (police ou image chargée ailleurs)')
  if (!/get\s*\(/i.test(texte) && !/export\s+(?:async\s+)?function\s+GET/.test(texte)) s.echoue('CR-15', 'export async function GET introuvable')
  if (!s.enEchec('CR-15')) s.passe('CR-15', "GET : 404 sur id inconnu, ImageResponse 1080×1080, aucune adresse externe, Cache-Control 86400")
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --partie=horloge (CR-10 à CR-13) — supabase/migrations/*_crieur.sql (026-134)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function lireInstructions(sql) { return instructions(sql).map((t) => ({ t, n: normaliser(t), c: compacter(t) })) }
function trouverMigrationCrieur() {
  const dossier = ch('supabase/migrations')
  let noms
  try { noms = fs.readdirSync(dossier) } catch { return { erreur: `dossier introuvable : supabase/migrations (racine ${aff(racine)})` } }
  const RE = /^(\d{4})_crieur\.sql$/
  const correspond = noms.filter((n) => RE.test(n))
  if (correspond.length !== 1) return { erreur: `${correspond.length} fichier(s) supabase/migrations/*_crieur.sql, un seul attendu (trouvé(s) : ${correspond.join(', ') || 'aucun'})` }
  const n = RE.exec(correspond[0])[1]
  const autres = noms.filter((f) => f !== correspond[0] && f.startsWith(n))
  if (autres.length) return { erreur: `le numéro ${n} est aussi porté par ${autres.join(', ')} : un numéro de migration ne se partage pas` }
  return { n, fichier: `supabase/migrations/${correspond[0]}` }
}
function parserTable(t) {
  const m = masquer(t)
  const i = m.indexOf('('), j = i < 0 ? -1 : fermante(m, i)
  if (j < 0) return null
  const colonnes = new Map()
  for (const it of decouperVirgules(t.slice(i + 1, j))) {
    const n = normaliser(it)
    if (/^(constraint|check|unique|primary key|foreign key|exclude)\b/.test(n)) continue
    colonnes.set(n.split(' ')[0].replace(/"/g, ''), n)
  }
  return colonnes
}
function jugerCR11(s, texteM) {
  const ins = lireInstructions(texteM)
  const table = ins.find((x) => /^create table( if not exists)? public\.crieur_posts\(/.test(x.n))
  if (!table) { s.echoue('CR-11', 'create table public.crieur_posts : instruction absente'); return }
  const cols = parserTable(table.t)
  if (!cols) { s.echoue('CR-11', 'create table public.crieur_posts : parenthèses non refermées'); return }
  const OBLIGATOIRES = ['id', 'semaine', 'canal', 'fait_ids', 'texte', 'publora_id', 'statut', 'programmee_pour', 'raisons', 'cree_le']
  for (const c of OBLIGATOIRES) if (!cols.has(c)) s.echoue('CR-11', `colonne absente : ${c}`)
  const semaine = cols.get('semaine'); if (semaine && !/^semaine text not null/.test(semaine)) s.echoue('CR-11', `semaine : « ${court(semaine, 80)} »`)
  const canal = cols.get('canal'); if (canal && !/check\(canal in\(('linkedin'|"linkedin")/.test(canal) && !/check\s*\(\s*canal\s+in\s*\(/.test(normaliser(canal))) s.echoue('CR-11', `canal : contrainte in (linkedin, facebook, instagram) introuvable (« ${court(canal, 90)} »)`)
  const faitIds = cols.get('fait_ids'); if (faitIds && !/^fait_ids text\[\] not null/.test(faitIds)) s.echoue('CR-11', `fait_ids : « ${court(faitIds, 80)} »`)
  const texteCol = cols.get('texte'); if (texteCol && !/^texte text not null/.test(texteCol)) s.echoue('CR-11', `texte : « ${court(texteCol, 80)} »`)
  const statut = cols.get('statut')
  if (statut) {
    const attendues = ['programmee', 'brouillon_publora', 'erreur', 'externe']
    for (const v of attendues) if (!statut.includes(`'${v}'`)) s.echoue('CR-11', `statut : valeur ${v} absente de la contrainte (« ${court(statut, 100)} »)`)
  }
  const progPour = cols.get('programmee_pour'); if (progPour && !/timestamptz/.test(progPour)) s.echoue('CR-11', `programmee_pour : timestamptz attendu (« ${court(progPour, 60)} »)`)
  const idx = ins.find((x) => /^create unique index( if not exists)? [a-z0-9_]+ on public\.crieur_posts\(semaine,\s*canal\)/.test(x.n) || (/^create unique index/.test(x.n) && x.c.includes('crieur_posts(semaine,canal)')))
  if (!idx) s.echoue('CR-11', "index unique partiel (semaine, canal) hors externe introuvable")
  else if (!/externe/.test(idx.n)) s.echoue('CR-11', "l'index unique (semaine, canal) ne semble pas exclure le statut externe (where …)")
  const rls = ins.find((x) => /^alter table( if exists)?( only)? public\.crieur_posts enable row level security$/.test(x.n))
  if (!rls) s.echoue('CR-11', 'enable row level security sur crieur_posts : absent')
  const rev = ins.find((x) => /^revoke all( privileges)?( on( table)?)? public\.crieur_posts from /.test(x.n))
  if (!rev) s.echoue('CR-11', 'revoke all … on public.crieur_posts from … : absent')
  else for (const r of ['public', 'anon', 'authenticated']) if (!rev.n.includes(r)) s.echoue('CR-11', `revoke … from … : ${r} manquant`)
  const policies = ins.filter((x) => /^create policy .* on public\.crieur_posts /.test(x.n))
  if (policies.length) s.echoue('CR-11', `${policies.length} politique(s) sur crieur_posts, aucune attendue`)
  if (!s.enEchec('CR-11')) s.passe('CR-11', 'crieur_posts : colonnes du contrat, index unique partiel (semaine, canal) hors externe, RLS activée, revoke, aucune politique')
}
function jugerCR12(s, texteM) {
  const m = /create\s+or\s+replace\s+function\s+public\.crieur_appel\s*\(\s*\)[\s\S]*?\$[a-z_]*\$/i.exec(texteM)
  if (!m) { s.echoue('CR-12', 'public.crieur_appel() : fonction introuvable'); return }
  const nCorps = normaliser(texteM)
  if (!/security definer/.test(nCorps)) s.echoue('CR-12', 'security definer introuvable')
  if (!/search_path\s*=/.test(nCorps)) s.echoue('CR-12', 'search_path fixé introuvable')
  const revExec = /revoke execute on function public\.crieur_appel\(\)\s*from\s*([^;]+)/i.exec(texteM)
  if (!revExec) s.echoue('CR-12', 'revoke execute on function public.crieur_appel() from … : absent')
  else for (const r of ['public', 'anon', 'authenticated', 'service_role']) if (!revExec[1].includes(r)) s.echoue('CR-12', `revoke execute … from … : ${r} manquant`)
  if (!/vault\.decrypted_secrets/.test(texteM)) s.echoue('CR-12', 'vault.decrypted_secrets introuvable')
  if (!/name\s*=\s*'cron_secret'/.test(nCorps)) s.echoue('CR-12', "name = 'cron_secret' introuvable")
  if (!/return\s+null/i.test(texteM)) s.echoue('CR-12', 'return null (secret manquant) introuvable')
  if (!/net\.http_get/.test(texteM)) s.echoue('CR-12', 'net.http_get introuvable')
  if (!/https:\/\/prestiapp\.fr\/api\/cron\/crieur/.test(texteM)) s.echoue('CR-12', "l'URL https://prestiapp.fr/api/cron/crieur introuvable")
  const to = /timeout_milliseconds\s*:?=?\s*(\d+)/.exec(nCorps)
  if (!to) s.echoue('CR-12', 'timeout_milliseconds introuvable')
  else { const v = Number(to[1]); if (!(v >= 10_000 && v <= 55_000)) s.echoue('CR-12', `timeout_milliseconds = ${v}, entre 10000 et 55000 attendu`) }
  const cron = /cron\.schedule\s*\(\s*'presti-crieur'\s*,\s*'([^']*)'/.exec(texteM)
  if (!cron) s.echoue('CR-12', "cron.schedule('presti-crieur', …) introuvable")
  else if (cron[1].trim() !== '0 5 * * *') s.echoue('CR-12', `presti-crieur planifié « ${cron[1]} », « 0 5 * * * » attendu (chaque jour)`)
  if (/\bBearer\s+[A-Za-z0-9_\-.]{20,}/.test(texteM.replace(/'\s*\|\|\s*v_secret/g, "'"))) s.echoue('CR-12', "un jeton semble écrit en clair après 'Bearer '")
  if (/\b[A-Fa-f0-9]{32,}\b/.test(texteM.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ''))) s.echoue('CR-12', 'un jeton de 32 signes ou plus semble écrit en clair')
  if (!s.enEchec('CR-12')) s.passe('CR-12', 'crieur_appel() : security definer, search_path fixé, execute révoqué, secret lu dans le Vault, net.http_get protégé, cron.schedule quotidien 5 h UTC, aucun secret en clair')
}
function jugerCR13(s, texteM, n) {
  const jumeau = `supabase/migrations/_A_COLLER_sql_editor_${n}.sql`, nu = `supabase/migrations/_A_COLLER_sql_editor_${n}_NU.sql`
  const J = lireSi(ch(jumeau)), N = lireSi(ch(nu))
  if (J === null || N === null) { s.echoue('CR-13', `jumeau(x) absent(s) : ${[J === null && jumeau, N === null && nu].filter(Boolean).join(', ')}`); return }
  if (!J || !N) { s.echoue('CR-13', `jumeau(x) de 0 octet : ${[!J && jumeau, !N && nu].filter(Boolean).join(', ')}`); return }
  if (!N.includes(MARQUE_CONTROLE)) s.echoue('CR-13', `${nu} ne porte pas la marque du contrôle (sql-nu.mjs --controle)`)
  const forme = (x) => instructions(x).map(normaliser)
  const a = forme(texteM), b = forme(jumeauNuCoupe(ch(nu)))
  const k = a.findIndex((x, i) => x !== b[i])
  if (k >= 0 || a.length !== b.length) s.echoue('CR-13', `la migration a ${a.length} instruction(s), le nu coupé ${b.length} ; première différence à l'instruction ${(k >= 0 ? k : Math.min(a.length, b.length)) + 1}`)

  const controle = `supabase/controles/${n}_crieur.sql`
  const C = lireSi(ch(controle))
  if (!C) s.echoue('CR-13', `contrôle ${C === null ? 'absent' : 'vide'} : ${controle}`)
  else {
    const ci = lireInstructions(C)
    for (const x of ci) if (!/^(select|with)\b/.test(x.n)) s.echoue('CR-13', `${controle} contient une instruction qui n'est pas une lecture : « ${court(x.n, 90)} »`)
    const verbe = /\b(insert|update|delete|truncate|create|alter|drop|grant|revoke|call|copy|vacuum)\b/.exec(serrer(C).replace(/'(?:[^']|'')*'/g, "''"))
    if (verbe) s.echoue('CR-13', `${controle} contient « ${verbe[1]} » hors des chaînes : un contrôle ne fait que lire`)
  }

  const essai = ch('.orchestre/preuves/026-134/essai-a-sec.txt')
  const e = empreinte(jumeauNuCoupe(ch(nu)))
  const cr = lireCompteRendu(essai, { empreinte: e, cles: ['table', 'rls', 'anon_refuse', 'unique_refuse', 'externe_accepte', 'instagram_accepte', 'appel_protege', 'tache_planifiee'] })
  if (!cr.ok) for (const raison of cr.raisons) s.echoue('CR-13', `.orchestre/preuves/026-134/essai-a-sec.txt : ${raison}`)
  if (!s.enEchec('CR-13')) s.passe('CR-13', `${jumeau} et ${nu} équivalents à la migration ; ${controle} en lecture seule ; essai à sec relu (table, rls, anon_refuse, unique_refuse, externe_accepte, instagram_accepte, appel_protege, tache_planifiee, APRES rien_ne_reste=true)`)
}
function jugerHorloge(s) {
  const m = trouverMigrationCrieur()
  if (m.erreur) { for (const id of ['CR-10', 'CR-11', 'CR-12', 'CR-13']) s.echoue(id, m.erreur); return }
  if (!s.enEchec('CR-10')) s.passe('CR-10', `${m.fichier} — numéro ${m.n}, porté par aucun autre fichier de supabase/migrations/`)
  const texteM = lireSi(ch(m.fichier))
  if (!texteM) { for (const id of ['CR-11', 'CR-12', 'CR-13']) s.echoue(id, `${m.fichier} absent ou vide alors que trouvé au listage`); return }
  jugerCR11(s, texteM)
  jugerCR12(s, texteM)
  jugerCR13(s, texteM, m.n)
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le jugement
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Correction du 28/09 (contre-vérification indépendante, défaut bloquant confirmé, Codex, « risque de conception ») :
// --temoin sautait TOUJOURS les critères fonctionnels de composer/route/horloge, sans regarder si leur fiche avait
// livré — un composer.ts/route.ts/migration absent OU FAUX aurait pu laisser un témoin vert indéfiniment, tant que
// personne ne relançait crieur-qa SANS --temoin. Le saut ne vaut plus que tant que la fiche propriétaire n'est pas
// dans fait/ : une fois 026-119/122/134 livrée (fait/<id>.md présent), --temoin rejuge pour de vrai, comme --partie
// seul. Aujourd'hui (026-119/122/134 pas encore livrées), ce changement ne modifie rien : preuve dans correction-28-09.md.
function ficheLivree(id) {
  return id ? lireSi(ch(`.orchestre/fait/${id}.md`)) !== null : false
}
function juger() {
  const s = creerRapport(NOM, IDS[PARTIE], { entete: `${NOM} --partie=${PARTIE} (${FICHE[PARTIE]}) — racine ${aff(racine)}${o.temoin ? ' — témoin' : ''}` })
  const modeFabrication = o.temoin && PARTIE !== 'juge' && !ficheLivree(FICHE[PARTIE])
  if (modeFabrication) {
    for (const id of IDS[PARTIE]) if (id !== 'CR-NR') s.saute(id, `témoin : critère de fabrication, sauté tant que ${FICHE[PARTIE]} n'est pas dans fait/ (sa propre PASS le prouvera une fois livrée)`)
  } else if (PARTIE === 'composer') {
    jugerComposer(s)
  } else if (PARTIE === 'route') {
    jugerRouteTexte(s)
    jugerVisuel(s)
    jugerCR7(s)
  } else if (PARTIE === 'horloge') {
    jugerHorloge(s)
  } else {
    jugerCR14(s)
  }
  jugerNonRegression(s)
  return s.fin()
}

process.exit(juger())
