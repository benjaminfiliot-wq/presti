#!/usr/bin/env node
// scripts/prospects-entrant-qa.mjs — juge de app/api/prospects/entrant/route.ts (026-145), écrit en 026-142 AVANT
// la fabrication (Règle 1, CLAUDE.md:23) : l'exécutant de 026-145 ne le modifie pas.
//
//   node --import ./scripts/ts-loader.mjs scripts/prospects-entrant-qa.mjs [--temoin] [--reel]
//
// Le `--import ./scripts/ts-loader.mjs` est celui du `verifier` de 026-145.md : il résout déjà `@/…` et les
// extensions `.ts`. Ce juge enregistre EN PLUS son propre hook (fixtures/026/entrant/crochet-resolution.mjs, par
// `module.register`), qui double `@/lib/flags`, `@/lib/security` et `@/lib/limites` — jamais `@/lib/agents/
// acquisition/entrant` ni `…/magasinSupabase`, qui restent les VRAIS modules du projet : magasinSupabase parle au
// faux PostgREST (026-038) par les variables d'environnement NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY,
// posées avant l'import de la route (jamais après : le client Supabase les lit à l'import).
//
// PE-1 est un PRÉALABLE : si app/api/prospects/entrant/route.ts n'existe pas encore (026-145 pas déposée), aucun
// autre critère n'est tenté — code 2. Codes : 0 tout vert · 1 un critère rouge · 2 préalable manquant.
//
// --temoin : autocontrôle du JUGE lui-même, sans la route (qui peut ne pas exister encore) : les doublures
// consignent bien un appel, chaque corps fautif des jeux d'essai porte une raison connue, le faux PostgREST répond
// au contrat attendu. Code 0 si tout tient.
//
// --reel : réservé à Claude Code, après la levée du drapeau (PE-8). Charge .env.local lui-même, sans jamais
// l'afficher ; ménage dans un `finally`. Sans --reel, aucune requête ne sort de 127.0.0.1.
// PE-7 lance npm par un shell sur Windows (npm.cmd direct échoue en EINVAL sur ce poste) ; les arguments sont des
// littéraux fixes du juge (jamais une valeur du corps d'une requête), donc sans risque d'injection malgré l'avis.
process.noDeprecation = true
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { demarrer as demarrerFauxPostgrest } from './lib/faux-postgrest.mjs'
import * as Doublure from './fixtures/026/entrant/doublures.mjs'
import { VALIDES, FAUTIFS, CORPS_BRUTS } from './fixtures/026/entrant/corps.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE_PROJET = path.resolve(ICI, '..')
const ROUTE_REL = 'app/api/prospects/entrant/route.ts'
const ROUTE = path.join(RACINE_PROJET, ROUTE_REL)
const FLAGS = path.join(RACINE_PROJET, 'lib', 'flags.ts')
const FERMETURE = path.join(RACINE_PROJET, 'scripts', 'fermeture-e2e.mjs')

const argv = process.argv.slice(2)
const drapeau = (n) => argv.includes(`--${n}`)
const TEMOIN = drapeau('temoin')
const REEL = drapeau('reel')

const criteres = []
function marquer(id, ok, detail) { criteres.push({ id, ok, detail: String(detail || '').slice(0, 300) }); return ok }
const lireSource = (p) => { try { return fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n') } catch { return null } }
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

function corpsFonction(src, nom) {
  const m = new RegExp(`export\\s+async\\s+function\\s+${nom}\\s*\\(`).exec(src)
  if (!m) return null
  const i = src.indexOf('{', m.index)
  if (i < 0) return null
  let depth = 0
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(i, j + 1) }
  }
  return null
}

// ── faux PostgREST : contrat minimal d'acq_candidats_enregistrer(p jsonb) ───────────────────────────────────────
const CONTRAT_ACQ = { fonctions: { acq_candidats_enregistrer: { params: [['p', 'jsonb']] } } }

async function main() {
  if (TEMOIN) { process.exitCode = await autocontrole(); return }
  if (REEL) { console.log('PE-8 : réservé à Claude Code, après la levée de prospectsEntrant. Non exercé (le drapeau est baissé).'); process.exitCode = 2; return }

  const srcBrut = lireSource(ROUTE)
  if (srcBrut === null) { marquer('PE-1', false, `${ROUTE_REL} n'existe pas encore (026-145 pas encore écrite ni déposée).`); rapporter(); process.exitCode = 2; return }
  const src = sansCommentaires(srcBrut)
  const exportGet = /export\s+(async\s+)?function\s+GET\s*\(|export\s+const\s+GET\s*=/.test(src)
  const exportPost = /export\s+async\s+function\s+POST\s*\(|export\s+const\s+POST\s*=/.test(src)
  const runtimeOk = /export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(src)
  const dynamicOk = /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(src)
  if (!exportPost || runtimeOk === false || dynamicOk === false || exportGet) {
    marquer('PE-1', false, `POST=${exportPost} runtime=${runtimeOk} dynamic=${dynamicOk} GET=${exportGet}`)
    rapporter(); process.exitCode = 2; return
  }
  marquer('PE-1', true, "POST exporté, runtime='nodejs', dynamic='force-dynamic', pas de GET")

  let scenarioActuel = () => ({ status: 200, body: { ajoutes: 1, ignores: 0 } })
  const fauxpg = await demarrerFauxPostgrest({ contrat: CONTRAT_ACQ, reponses: { acq_candidats_enregistrer: (p, appel) => scenarioActuel(p, appel) } })
  process.env.NEXT_PUBLIC_SUPABASE_URL = fauxpg.url
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'temoin-026-142'

  const racineFile = pathToFileURL(RACINE_PROJET + path.sep).href
  const doublureFile = pathToFileURL(path.join(RACINE_PROJET, 'scripts', 'fixtures', '026', 'entrant', 'doublures.mjs')).href
  register(pathToFileURL(path.join(ICI, 'fixtures', '026', 'entrant', 'crochet-resolution.mjs')).href, { data: { racine: racineFile, doublure: doublureFile } })

  let mod
  try {
    mod = await import(pathToFileURL(ROUTE).href)
  } catch (e) {
    await fauxpg.arreter()
    marquer('PE-1', false, `la route ne se charge pas : ${e && e.message || e}`)
    rapporter(); process.exitCode = 2; return
  }

  try {
    const consoleAvant = { log: console.log, error: console.error, warn: console.warn }
    const captures = []
    const espionner = () => { for (const n of ['log', 'error', 'warn']) console[n] = (...a) => captures.push(a.map(String).join(' ')) }
    const cesser = () => { Object.assign(console, consoleAvant) }

    const appeler = async (corpsTexte, { ip = '203.0.113.' + (1 + Math.floor(Math.random() * 250)), headers = {} } = {}) => {
      const req = new Request('http://127.0.0.1/api/prospects/entrant', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...headers }, body: corpsTexte })
      const debut = Date.now()
      captures.length = 0
      espionner()
      let res
      try { res = await mod.POST(req) } finally { cesser() }
      const fin = Date.now()
      let json = null
      try { json = await res.clone().json() } catch { /* pas du JSON */ }
      return { status: res.status, json, ip, debut, fin, captures: [...captures] }
    }
    const reinit = () => { Doublure.reinitialiser(); fauxpg.appels.length = 0 }

    // ── PE-2 : drapeau, diffs limités, garde en tête de POST ───────────────────────────────────────────────────
    await critere_pe2(appeler, reinit, fauxpg, src)
    // ── PE-3 : garde (bannie, piège, plafonds) ─────────────────────────────────────────────────────────────────
    await critere_pe3(appeler, reinit, fauxpg)
    // ── PE-4 : validation ──────────────────────────────────────────────────────────────────────────────────────
    await critere_pe4(appeler, reinit, fauxpg)
    // ── PE-5 : enregistrement ──────────────────────────────────────────────────────────────────────────────────
    await critere_pe5(appeler, reinit, fauxpg, (fn) => { scenarioActuel = fn })
    // ── PE-6 : rien n'apprend rien ─────────────────────────────────────────────────────────────────────────────
    await critere_pe6(appeler, reinit, fauxpg, (fn) => { scenarioActuel = fn }, src)
    // ── PE-7 : typecheck ───────────────────────────────────────────────────────────────────────────────────────
    critere_pe7()
    // ── PE-9 : source (normaliserDemandeEntrante, message) ─────────────────────────────────────────────────────
    critere_pe9(src)
    // ── PE-10 : case_cochee_le après accord, réponse muette ────────────────────────────────────────────────────
    await critere_pe10(appeler, reinit, fauxpg, (fn) => { scenarioActuel = fn }, src)
  } finally {
    await fauxpg.arreter()
  }

  rapporter()
  process.exitCode = criteres.every((c) => c.ok) ? 0 : 1

  async function critere_pe2(appeler, reinit, fauxpg, src) {
    const corpsPost = corpsFonction(src, 'POST')
    const iActif = corpsPost ? corpsPost.indexOf('actif(') : -1
    const iAutre = corpsPost ? Math.min(...['getIp(', 'isBanned(', 'consommerLimite('].map((m) => { const i = corpsPost.indexOf(m); return i < 0 ? Infinity : i }).filter((n) => Number.isFinite(n)), Infinity) : -1
    const gardeEnTete = iActif >= 0 && (iAutre === Infinity || iActif < iAutre)
    if (!gardeEnTete) return marquer('PE-2', false, "le test du drapeau (actif('prospectsEntrant')) n'est pas la première instruction de POST")
    const dFlags = diffLimite(FLAGS, /prospectsEntrant/)
    if (!dFlags.ok) return marquer('PE-2', false, `diff de lib/flags.ts hors du drapeau : ${dFlags.detail}`)
    const dFerm = diffLimite(FERMETURE, /prospectsEntrant/)
    if (!dFerm.ok) return marquer('PE-2', false, `diff de scripts/fermeture-e2e.mjs hors de la carte : ${dFerm.detail}`)
    const brutFerm = lireSource(FERMETURE) || ''
    if (!new RegExp(String.raw`'prospectsEntrant'\s*:\s*\[\s*'route'\s*,\s*'/api/prospects/entrant'\s*,\s*'POST'\s*,\s*'app/api/prospects/entrant/route\.ts'\s*\]`).test(brutFerm)) {
      return marquer('PE-2', false, "scripts/fermeture-e2e.mjs : la ligne de CARTE attendue est absente")
    }
    reinit()
    Doublure.etat.drapeaux.prospectsEntrant = false
    const r = await appeler(JSON.stringify({}))
    const appelsBase = Doublure.journal.filter((j) => j.fn === 'isBanned' || j.fn === 'consommerLimite').length
    if (r.status !== 404 || appelsBase !== 0 || fauxpg.appels.length !== 0) return marquer('PE-2', false, `drapeau baissé : status ${r.status}, ${appelsBase} appel(s) sécurité, ${fauxpg.appels.length} appel(s) base (0 attendus)`)
    reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
    return marquer('PE-2', true, "drapeau baissé → 404 sans appel ; diffs limités au drapeau et à la ligne de carte ; garde en tête de POST")
  }

  async function critere_pe3(appeler, reinit, fauxpg) {
    reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
    const ipBannie = '198.51.100.7'
    Doublure.etat.bannis.add(ipBannie)
    const r1 = await appeler(JSON.stringify(VALIDES[0].corps), { ip: ipBannie })
    const appelsApresBan = Doublure.journal.filter((j) => !['actif', 'getIp', 'isBanned'].includes(j.fn)).length
    if (r1.status !== 403 || appelsApresBan !== 0 || fauxpg.appels.length !== 0) return marquer('PE-3', false, `IP bannie : status ${r1.status} (403 attendu), ${appelsApresBan} appel(s) au-delà de getIp/isBanned`)

    reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
    const piege = FAUTIFS.find((f) => f.nom === 'champ-piege')
    const r2 = await appeler(JSON.stringify(piege.corps))
    const abus = Doublure.journal.filter((j) => j.fn === 'recordAbuse').length
    if (r2.status !== 200 || !r2.json?.ok || abus !== 1 || fauxpg.appels.length !== 0) return marquer('PE-3', false, `champ piège : status ${r2.status}, ok=${r2.json?.ok}, ${abus} recordAbuse (1 attendu), ${fauxpg.appels.length} appel(s) base (0 attendus)`)

    reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
    const ip = '198.51.100.42'
    let dernier
    for (let i = 0; i < 4; i++) dernier = await appeler(JSON.stringify(VALIDES[0].corps), { ip })
    if (dernier.status !== 429 || fauxpg.appels.length !== 3) return marquer('PE-3', false, `4e envoi/heure : status ${dernier.status} (429 attendu), ${fauxpg.appels.length} appel(s) base (3 attendus, les 3 premiers)`)

    reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
    let dernierJour
    for (let i = 0; i < 51; i++) dernierJour = await appeler(JSON.stringify(VALIDES[0].corps), { ip: `198.51.100.${100 + i}` })
    if (dernierJour.status !== 429 || fauxpg.appels.length !== 50) return marquer('PE-3', false, `51e envoi/jour : status ${dernierJour.status} (429 attendu), ${fauxpg.appels.length} appel(s) base (50 attendus)`)

    return marquer('PE-3', true, 'IP bannie → 403, champ piège → 200 sans base, plafonds 3/heure et 50/jour → 429 sans base au-delà')
  }

  async function critere_pe4(appeler, reinit, fauxpg) {
    const echecs = []
    for (const f of [...FAUTIFS.filter((x) => x.nom !== 'champ-piege'), ...CORPS_BRUTS]) {
      reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
      const texte = 'corps' in f ? JSON.stringify(f.corps) : f.brut
      const r = await appeler(texte)
      if (r.status !== 400 || fauxpg.appels.length !== 0) echecs.push(`${f.nom} (${f.raison}) : status ${r.status} (400 attendu), ${fauxpg.appels.length} appel(s) base`)
    }
    if (echecs.length) return marquer('PE-4', false, echecs.join(' | '))
    return marquer('PE-4', true, `${FAUTIFS.length - 1 + CORPS_BRUTS.length} corps fautifs → 400 chacun, zéro appel à la base`)
  }

  async function critere_pe5(appeler, reinit, fauxpg, fixerScenario) {
    fixerScenario(() => ({ status: 200, body: { ajoutes: 1, ignores: 0 } }))
    const echecs = []
    for (const f of VALIDES) {
      reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
      const r = await appeler(JSON.stringify(f.corps))
      if (r.status !== 200) { echecs.push(`${f.nom} : status ${r.status}`); continue }
      if (fauxpg.appels.length !== 1) { echecs.push(`${f.nom} : ${fauxpg.appels.length} appel(s) à acq_candidats_enregistrer (1 attendu)`); continue }
      const appel = fauxpg.appels[0]
      const liste = appel.params?.p
      if (!Array.isArray(liste) || liste.length !== 1) { echecs.push(`${f.nom} : p n'est pas un tableau d'un candidat`); continue }
      const c = liste[0]
      if (c.source !== 'entrant') echecs.push(`${f.nom} : source « ${c.source} » ≠ entrant`)
      if (c.froid !== false) echecs.push(`${f.nom} : froid « ${c.froid} » ≠ false`)
      if (!/^(siren|domaine|page_meta|instagram):.{2,160}$/.test(String(c.cle_dedup))) echecs.push(`${f.nom} : cle_dedup « ${c.cle_dedup} » hors du format 0096`)
      if (f.nom === 'site-valide' && !/^domaine:/.test(String(c.cle_dedup))) echecs.push(`${f.nom} : cle_dedup attendu domaine:… (« ${c.cle_dedup} »)`)
      if (f.nom === 'instagram-valide' && !/^instagram:/.test(String(c.cle_dedup))) echecs.push(`${f.nom} : cle_dedup attendu instagram:… (« ${c.cle_dedup} »)`)
      const canaux = Array.isArray(c.canaux) ? c.canaux : []
      const canalEmail = canaux.find((x) => x && x.nature === 'donnee_par_la_personne' && x.valeur === f.corps.email)
      if (!canalEmail) { echecs.push(`${f.nom} : aucun canal nature=donnee_par_la_personne pour ${f.corps.email}`); continue }
      if (!canalEmail.case_cochee_le || !Number.isFinite(Date.parse(canalEmail.case_cochee_le))) { echecs.push(`${f.nom} : case_cochee_le absent ou non-ISO`); continue }
      const t = Date.parse(canalEmail.case_cochee_le)
      if (t < r.debut - 1000 || t > r.fin + 1000) echecs.push(`${f.nom} : case_cochee_le hors de la fenêtre de la requête`)
    }
    if (echecs.length) return marquer('PE-5', false, echecs.join(' | '))
    return marquer('PE-5', true, 'site → domaine:…, Instagram → instagram:…, source=entrant, froid=false, canal donnee_par_la_personne avec case_cochee_le')
  }

  async function critere_pe6(appeler, reinit, fauxpg, fixerScenario, src) {
    const reponses = []
    for (const nom of ['cree', 'existant', 'oppose']) {
      fixerScenario(() => ({ status: 200, body: nom === 'cree' ? { ajoutes: 1, ignores: 0 } : { ajoutes: 0, ignores: 1 } }))
      reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
      const r = await appeler(JSON.stringify(VALIDES[0].corps))
      reponses.push(JSON.stringify({ status: r.status, json: r.json }))
      const fuite = r.captures.some((l) => l.includes(VALIDES[0].corps.entreprise) || l.includes(VALIDES[0].corps.email))
      if (fuite) return marquer('PE-6', false, `une valeur du corps (${nom}) apparaît dans la console`)
    }
    if (new Set(reponses).size !== 1) return marquer('PE-6', false, `réponses différentes pour créé/existant/opposé : ${reponses.join(' ¦ ')}`)
    fixerScenario(() => ({ status: 500, body: { code: 'XX000', message: 'panne simulée 026-142' } }))
    reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
    const rErr = await appeler(JSON.stringify(VALIDES[0].corps))
    if (rErr.status !== 503) return marquer('PE-6', false, `erreur base : status ${rErr.status} (503 attendu)`)
    if (JSON.stringify(rErr.json || {}).includes('panne simulée')) return marquer('PE-6', false, "le détail de l'erreur base fuite dans la réponse")
    if (/@\/lib\/ai['"]|@\/lib\/agents\/llm['"]|@\/lib\/email['"]/.test(src)) return marquer('PE-6', false, 'import interdit (@/lib/ai, @/lib/agents/llm ou @/lib/email)')
    if (/console\.log\(\s*(body|corps|req\.body)\b/.test(src)) return marquer('PE-6', false, 'console.log( d\'une variable du corps trouvé dans le source')
    return marquer('PE-6', true, 'créé/existant/opposé → même réponse octet pour octet ; erreur base → 503 sans détail ; aucune fuite en console ni import interdit')
  }

  function critere_pe7() {
    try {
      execFileSync('npm', ['run', 'typecheck'], { cwd: RACINE_PROJET, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, timeout: 180_000, shell: process.platform === 'win32' })
      return marquer('PE-7', true, 'npm run typecheck : code 0')
    } catch (e) {
      return marquer('PE-7', false, `npm run typecheck : ${(e.stdout || e.message || '').toString().slice(0, 200)}`)
    }
  }

  function critere_pe9(src) {
    if (!/from\s+['"]@\/lib\/agents\/acquisition\/entrant['"]/.test(src) || !/normaliserDemandeEntrante/.test(src)) {
      return marquer('PE-9', false, "la route n'importe pas normaliserDemandeEntrante de @/lib/agents/acquisition/entrant")
    }
    if (/menuisier|plombier|chauffagiste|electricien/i.test(src)) return marquer('PE-9', false, 'la route réécrit une liste de métiers (attendu : seulement dans le contrat)')
    if (!/vous écrira à cette adresse/.test(srcBrutGlobal())) return marquer('PE-9', false, "le message ne dit pas « vous écrira à cette adresse »")
    if (!/assistant IA/.test(srcBrutGlobal())) return marquer('PE-9', false, "le message ne dit pas « assistant IA »")
    return marquer('PE-9', true, "importe normaliserDemandeEntrante, ne réécrit pas la liste des métiers, message conforme")
    function srcBrutGlobal() { return src }
  }

  async function critere_pe10(appeler, reinit, fauxpg, fixerScenario, src) {
    const corpsPost = corpsFonction(src, 'POST')
    const iAccord = corpsPost ? corpsPost.search(/accord\s*(===|!==)\s*true/) : -1
    const iCasse = corpsPost ? corpsPost.indexOf('case_cochee_le') : -1
    if (iAccord < 0 || iCasse < 0 || iCasse < iAccord) return marquer('PE-10', false, "case_cochee_le n'apparaît pas après le test accord === true")
    if (!/case_cochee_le\s*:\s*new Date\(\)\.toISOString\(\)/.test(corpsPost) && !/new Date\(\)\.toISOString\(\)/.test(corpsPost)) return marquer('PE-10', false, "case_cochee_le n'est pas posé par new Date().toISOString()")
    fixerScenario(() => ({ status: 200, body: { ajoutes: 1, ignores: 0 } }))
    reinit(); Doublure.etat.drapeaux.prospectsEntrant = true
    const r = await appeler(JSON.stringify(VALIDES[0].corps))
    const texteReponse = JSON.stringify(r.json || {})
    if (texteReponse.includes('case_cochee_le') || /"id"\s*:/.test(texteReponse)) return marquer('PE-10', false, `la réponse HTTP porte case_cochee_le ou un id : ${texteReponse.slice(0, 200)}`)
    return marquer('PE-10', true, "case_cochee_le après accord === true, par new Date().toISOString(), absent de la réponse HTTP")
  }
}

function diffLimite(fichier, reAutorise) {
  const rel = path.relative(RACINE_PROJET, fichier).split(path.sep).join('/')
  let diff
  try { diff = execFileSync('git', ['diff', '--unified=0', '--', rel], { cwd: RACINE_PROJET, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return { ok: true, detail: 'git indisponible : diff non vérifié' } }
  const lignes = diff.split('\n').filter((l) => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'))
  const horsSujet = lignes.filter((l) => !reAutorise.test(l) && !/^[+-]\s*(\/\*\*?|\*\/?|\/\/)/.test(l) && l.replace(/^[+-]/, '').trim() !== '')
  return { ok: horsSujet.length === 0, detail: horsSujet.slice(0, 3).join(' ¦ ') }
}

// ── --temoin : autocontrôle du juge, indépendant de la route ────────────────────────────────────────────────────
async function autocontrole() {
  const lignes = []
  Doublure.reinitialiser()
  Doublure.actif('prospectsEntrant')
  Doublure.getIp({ headers: { get: (n) => (n === 'x-forwarded-for' ? '203.0.113.9' : null) } })
  await Doublure.isBanned('203.0.113.9')
  await Doublure.recordAbuse('203.0.113.9', 'essai')
  await Doublure.consommerLimite('essai', 3, 3600)
  lignes.push([Doublure.journal.length === 5, `AC-1 les doublures consignent chaque appel (5 attendus, ${Doublure.journal.length} vus)`])

  const fautifsAvecRaison = FAUTIFS.every((f) => typeof f.raison === 'string' && f.raison.length > 0) && CORPS_BRUTS.every((f) => typeof f.raison === 'string' && f.raison.length > 0)
  lignes.push([fautifsAvecRaison, 'AC-2 chaque corps fautif porte une raison connue'])
  // Chaque corps est identifiable comme un témoin : son adresse (quand il en porte une) est un sous-domaine
  // « temoin » en .invalid — jamais une vraie adresse, même pour les corps fautifs qui doivent violer une AUTRE
  // règle (ex. une entreprise d'un seul signe ne peut pas aussi contenir « Témoin » en toutes lettres).
  const avecEmail = [...VALIDES, ...FAUTIFS].filter((f) => typeof f.corps.email === 'string' && f.raison !== 'email')
  const nomsTemoin = avecEmail.every((f) => /temoin/i.test(f.corps.email) && /\.invalid$/.test(f.corps.email))
  lignes.push([nomsTemoin, 'AC-3 les adresses des jeux d\'essai sont des sous-domaines « temoin » en .invalid'])

  let fauxpgOk = false
  try {
    const fauxpg = await demarrerFauxPostgrest({ contrat: { fonctions: { acq_candidats_enregistrer: { params: [['p', 'jsonb']] } } }, reponses: { acq_candidats_enregistrer: () => ({ status: 200, body: { ajoutes: 1, ignores: 0 } }) } })
    try {
      const r = await fetch(fauxpg.url + '/rest/v1/rpc/acq_candidats_enregistrer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ p: [{ cle_dedup: 'domaine:essai-temoin.invalid' }] }) })
      const j = await r.json()
      fauxpgOk = r.status === 200 && j.ajoutes === 1
    } finally { await fauxpg.arreter() }
  } catch { fauxpgOk = false }
  lignes.push([fauxpgOk, 'AC-4 le faux PostgREST répond au contrat de acq_candidats_enregistrer(p jsonb)'])

  for (const [ok, texte] of lignes) console.log(`${ok ? '✓' : '✗'} ${texte}`)
  const tout = lignes.every(([ok]) => ok)
  console.log(tout ? '\n✓ prospects-entrant-qa --temoin : autocontrôle vert' : '\n✗ prospects-entrant-qa --temoin : autocontrôle en échec')
  return tout ? 0 : 1
}

function rapporter() {
  for (const c of criteres) console.log(`${c.ok ? '✓' : '✗'} ${c.id} ${c.detail}`)
  const rouge = criteres.find((c) => !c.ok)
  console.log('')
  console.log(rouge ? `✗ prospects-entrant-qa : ${rouge.id} en échec` : '✓ prospects-entrant-qa : tous les critères sont verts')
}

main().catch((e) => { console.error('✗ prospects-entrant-qa : erreur inattendue —', e && e.stack || e); process.exitCode = 1 })
