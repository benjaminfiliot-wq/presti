// scripts/pilotage-gestes-qa.mjs — le juge des routes d'écriture du Pilotage (fiche 026-074 réécrite), écrit en 026-066 par
// Claude Code.
//
//   node --import ./scripts/ts-loader.mjs scripts/pilotage-gestes-qa.mjs [--racine=<d>] [--base=<commit>] [--temoin] [--statique]
//
// Critères GE de 026-074 :
//   statiques (toute racine) : GE-1 drapeau, garde, domaine, paramètres ; GE-2 ordre du tranchage ; GE-3 reconfirmation de la
//     pause ; GE-4 AUCUNE route d'envoi, appels rendus ; GE-5 journal (type Action comparé au commit --base) avant l'écriture ;
//     GE-6 aucune écriture hors des fonctions dites ; GE-9 carte de fermeture-e2e ;
//   par doublures (toute racine, processus enfant, aucun réseau) : GE-11 transmettre, appel rendu, décision ; GE-12 appel rendu
//     d'une réservation ; GE-13 gestes du fondateur ; GE-14 carte de réponse reclassée ; GE-15 consigne adressée ;
//   vivants (racine réelle seulement, sans --racine ni --statique) : GE-7 (arbre réel : 404), GE-8 (copie au drapeau levé,
//     REFUS seulement, journal du fondateur d'essai inchangé, comptes supprimés dans un finally), GE-10 (typecheck).
//     Ce juge n'éprouve sur un serveur que des refus : aucune consigne valide ne lui est jamais envoyée.
//   --temoin  pose le témoin du lot b sur app/, lib/ et scripts/fermeture-e2e.mjs du commit --base, et le juge.
// Sortie « ✅ ID … » / « ❌ ID … », puis « pilotage-gestes-qa : PASS|FAIL ». Code 0, 1, ou 2 (appel invalide).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { R, court, premiereLigne, lireOptions, creerSortie, sansCommentaires, lancerAsync, listerFichiers } from './fixtures/026-pilotage/a/commun.mjs'
import { commitBase, lireBase, arbreTemoin, copieAvecDrapeau, serveurCopie, avecComptes, corpsDeFonction, journalDe, lf } from './fixtures/026-pilotage/b/commun.mjs'

const JUGE = 'pilotage-gestes-qa'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const DOUBLURES = path.join(R, 'scripts', 'fixtures', '026-pilotage', 'b', 'doublures-gestes.mjs')
const MARQUE = `@@${JUGE}@@ `
const o = lireOptions(process.argv.slice(2), { connues: ['base', 'statique', 'enfant'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)

const P = 'app/api/controle/pilotage'
const ROUTES = { decisions: `${P}/decisions/[id]/route.ts`, appels: `${P}/appels/[id]/route.ts`, agents: `${P}/agents/[nom]/route.ts`, consignes: `${P}/consignes/route.ts`, gestes: `${P}/gestes/route.ts` }
const DYNAMIQUES = ['decisions', 'appels', 'agents']
const GESTES = { ouvrir_envoi_froid: 'acq_envoi_froid_ouvrir', reprendre_technologie: 'acq_technologie_reprendre', rouvrir_canal: 'acq_canal_rouvrir', lever_modele: 'acq_modele_lever', palier_plafond: 'acq_palier_plafond' }
const ECRITURES = { decisions: ['ops_decision_trancher'], appels: ['acq_rdv_appel_rendu', 'acq_reponse_appel_rendu'], agents: ['ops_agent_pause'], consignes: ['station_consigne_transmettre'], gestes: Object.values(GESTES) }
const RPC_PERMIS = ['pilotage_decision', 'ops_decision_trancher', 'acq_reponse_reclasser', 'ops_agent_pause', 'acq_reponse_appel_rendu', 'acq_rdv_appel_rendu', 'station_consigne_transmettre', ...Object.values(GESTES)]
const NEUF = ['decision_tranchee', 'appel_rendu', 'agent_pause', 'consigne_transmise', 'envoi_froid_ouvert', 'technologie_reprise', 'canal_rouvert', 'modele_leve', 'palier_plafond']
const PHRASES = {
  'ops:mesure_absente': "La mesure à sec n'a pas réussi (026-165) : envoi_froid reste fermé.",
  'ops:epreuve_absente': "L'épreuve de bout en bout n'a pas encore réussi (026-163) : envoi_froid reste fermé.",
  'ops:notice_absente': "La notice en ligne n'est pas vérifiée depuis 7 jours (026-162) : envoi_froid reste fermé.",
}
const PARAMS_GESTES = { ouvrir_envoi_froid: {}, reprendre_technologie: { technologie: 'contact_form_7' }, rouvrir_canal: { canal: 'formulaire_site' }, lever_modele: { modele: 'gpt_6_luna' }, palier_plafond: { palier: 'P1', par_jour: 50 } }
const F = { uid: '90000000-0000-4000-8000-00000000f001', email: 'fondateur.temoin@exemple.invalid', role: 'direction', roleInterne: 'fondateur' }
const U1 = '90000000-0000-4000-8000-000000000001'

// ═══ Le processus enfant : les routes exécutées sur leurs doublures ════════════════════════════════════════════════════
const CROCHET = String.raw`
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
let RACINE = '', DOUBLURES = '', DEPOT = ''
export async function initialize(d) { RACINE = d.racine; DOUBLURES = d.doublures; DEPOT = d.depot }
const DOUBLES = { 'lib/flags': 'flags', 'lib/direction/garde': 'garde', 'lib/direction/reconfirmation': 'reconfirmation', 'lib/direction/journal': 'journal', 'lib/supabaseAdmin': 'supabaseAdmin' }
const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
const double = (m) => ({ url: DOUBLURES + '?m=' + m, shortCircuit: true, format: 'module' })
export async function resolve(spec, ctx, next) {
  if (spec === 'next/server') return double('next-server')
  let s = spec
  if (s.startsWith('@/')) s = new URL(s.slice(2), RACINE).href
  if (s.startsWith('.') || s.startsWith('file:')) {
    const base = s.startsWith('file:') ? s.split('?')[0] : new URL(s, ctx.parentURL).href
    if (base.toLowerCase().startsWith(RACINE.toLowerCase())) {
      const rel = decodeURIComponent(base.slice(RACINE.length)).replace(/\.(ts|tsx|js|mjs)$/, '').replace(/\/index$/, '')
      if (DOUBLES[rel]) return double(DOUBLES[rel])
    }
    if (!s.startsWith('file:') || !s.includes('?')) for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts']) if (estFichier(c)) return next(c, ctx)
  }
  if (!s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:') && ctx.parentURL && !ctx.parentURL.toLowerCase().startsWith(DEPOT.toLowerCase())) {
    return next(s, { ...ctx, parentURL: DEPOT + 'package.json' })
  }
  return next(s, ctx)
}`

async function enfant(RAC) {
  const res = { imports: {}, criteres: {}, console: [] }
  globalThis.fetch = async (u) => { throw new Error(`réseau interdit dans ${JUGE} (enfant) : ${u}`) }
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { const f = console[k]; console[k] = (...a) => { res.console.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); if (k === 'log' && String(a[0]).startsWith(MARQUE)) f(...a) } }
  const sep = (d) => pathToFileURL(path.resolve(d) + path.sep).href
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racine: sep(RAC), doublures: pathToFileURL(DOUBLURES).href, depot: sep(R) } })
  const D = await import(`${pathToFileURL(DOUBLURES).href}?m=juge`)
  const E = D.etat
  const mods = {}
  for (const [k, rel] of Object.entries(ROUTES)) {
    try { mods[k] = await import(pathToFileURL(path.join(RAC, rel)).href); res.imports[k] = typeof mods[k].POST === 'function' ? 'ok' : 'pas de POST' } catch (e) { res.imports[k] = premiereLigne(e) }
  }
  const defaut = () => ({ drapeaux: { pilotage: true, siteAchatPublic: true }, fondateur: F, refusGarde: null, reconfirme: true, journalOk: true, rpc: () => ({ data: true, error: null }) })
  const jouer = async (k, url, corps, params, config = {}) => {
    if (typeof mods[k]?.POST !== 'function') throw new Error(`${ROUTES[k]} : ${res.imports[k]}`)
    E.appels.length = 0
    E.config = { ...defaut(), ...config }
    const req = new Request(`http://127.0.0.1${url}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps) })
    const r = await mods[k].POST(req, params ? { params: Promise.resolve(params) } : undefined)
    const j = await r.json().catch(() => null)
    const appels = E.appels.map((a) => ({ ...a }))
    return { status: r.status, j, appels, rpc: appels.filter((a) => a.f === 'rpc'), journal: appels.filter((a) => a.f === 'journaliser'), suite: appels.filter((a) => ['rpc', 'journaliser', 'exigerReconfirmation'].includes(a.f)).map((a) => (a.f === 'rpc' ? `rpc:${a.nom}` : a.f)) }
  }
  const critere = async (id, f) => { const e = []; try { await f(e) } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) } res.criteres[id] = e }
  const erreur = (m) => ({ data: null, error: { message: m } })
  const decision = (x = {}) => ({ id: U1, question: 'Décision du témoin ?', contexte: 'Contexte', options: [{ cle: 'oui', libelle: 'Oui', recommandee: true }, { cle: 'non', libelle: 'Non' }], option_defaut: 'non', montant_cents: null, portee: 'aucune', echeance: null, cree_le: new Date().toISOString(), creee_par: 'chef', cle_idempotence: 'chef:2026-09-27:escalade', ...x })
  const rpcDecision = (d, trancher = { data: null, error: null }, reclasser = { data: {}, error: null }) => (nom) => (nom === 'pilotage_decision' ? { data: [d], error: null } : nom === 'ops_decision_trancher' ? trancher : nom === 'acq_reponse_reclasser' ? reclasser : { data: null, error: null })
  const URL_C = `/${P.replace(/^app\//, '')}/consignes`, URL_A = `/${P.replace(/^app\//, '')}/appels/${U1}`, URL_D = `/${P.replace(/^app\//, '')}/decisions/${U1}`, URL_G = `/${P.replace(/^app\//, '')}/gestes`
  const TEXTE = 'Consigne valide du témoin, jamais journalisée'

  await critere('GE-11', async (e) => {
    const n0 = res.console.length
    const a = await jouer('consignes', URL_C, { texte: TEXTE })
    if (a.status !== 200) e.push(`consigne valide → ${a.status}, 200 attendu`)
    if (a.journal.length !== 1 || a.journal[0].e.action !== 'consigne_transmise') e.push(`${a.journal.length} journaliser(, un seul avec action consigne_transmise attendu`)
    else if (JSON.stringify(a.journal[0].e.apres ?? {}).includes(TEXTE) || JSON.stringify(a.journal[0].e).includes(TEXTE)) e.push('le texte de la consigne est dans le journal')
    if (a.rpc.length !== 1 || a.rpc[0].nom !== 'station_consigne_transmettre' || a.rpc[0].args.p_auteur !== F.uid || a.rpc[0].args.p_agent !== null) e.push(`rpc : ${JSON.stringify(a.rpc.map((x) => [x.nom, x.args.p_auteur === F.uid, x.args.p_agent]))}, un station_consigne_transmettre (p_auteur = uid, p_agent null) attendu`)
    if (a.suite.join(' ') !== 'journaliser rpc:station_consigne_transmettre') e.push(`ordre ${a.suite.join(' → ')}`)
    if (res.console.slice(n0).some((l) => l.includes(TEXTE))) e.push('le texte entre dans un console.')
    const b = await jouer('consignes', URL_C, { texte: TEXTE }, null, { journalOk: false })
    if (b.status !== 503 || b.rpc.length) e.push(`journal refusé → ${b.status} et ${b.rpc.length} rpc(, 503 (refusJournal) et zéro rpc( attendus`)
    for (const [code, st] of [['ops:quota', 429], ['ops:auteur', 403], ['ops:texte', 400], ['ops:autre', 503]]) {
      const c = await jouer('consignes', URL_C, { texte: TEXTE }, null, { rpc: () => erreur(code) })
      if (c.status !== st) e.push(`${code} → ${c.status}, ${st} attendu`)
    }
    for (const t of ['ab', 'x'.repeat(201), '   ', 'deux\u0007']) { const c = await jouer('consignes', URL_C, { texte: t }); if (c.status !== 400 || c.rpc.length || c.journal.length) e.push(`consigne « ${court(t, 12)} » (${t.length} signes) → ${c.status}, 400 sans journal ni rpc attendu`) }
    const v = await jouer('appels', URL_A, {}, { id: U1 }, { rpc: () => ({ data: true, error: null }) }); if (v.status !== 200) e.push(`appel rendu true → ${v.status}`)
    const f = await jouer('appels', URL_A, {}, { id: U1 }, { rpc: () => ({ data: false, error: null }) }); if (f.status !== 404) e.push(`appel rendu false → ${f.status}, 404 attendu`)
    const d = await jouer('decisions', URL_D, { choix: 'oui' }, { id: U1 }, { rpc: rpcDecision(decision({ portee: 'argent', montant_cents: 5000 })) })
    if (d.status !== 200 || d.suite.join(' ') !== 'rpc:pilotage_decision exigerReconfirmation journaliser rpc:ops_decision_trancher') e.push(`décision : ${d.status}, ${d.suite.join(' → ')}`)
  })
  await critere('GE-12', async (e) => {
    const a = await jouer('appels', `${URL_A}?source=rdv`, {}, { id: U1 })
    if (a.status !== 200 || a.journal.length !== 1 || a.journal[0].e.cible_type !== 'rendez_vous') e.push(`source=rdv : ${a.status}, journal ${JSON.stringify(a.journal.map((x) => x.e.cible_type))}`)
    if (a.rpc.length !== 1 || a.rpc[0].nom !== 'acq_rdv_appel_rendu' || a.rpc[0].args.p_id !== U1) e.push(`source=rdv : rpc ${JSON.stringify(a.rpc.map((x) => [x.nom, x.args]))}, un acq_rdv_appel_rendu { p_id } attendu`)
    if (a.suite.join(' ') !== 'journaliser rpc:acq_rdv_appel_rendu') e.push(`ordre ${a.suite.join(' → ')}`)
    const b = await jouer('appels', `${URL_A}?source=rdv`, {}, { id: U1 }, { rpc: () => ({ data: false, error: null }) }); if (b.status !== 404) e.push(`source=rdv false → ${b.status}, 404 attendu`)
    const c = await jouer('appels', URL_A, {}, { id: U1 })
    if (c.rpc.length !== 1 || c.rpc[0].nom !== 'acq_reponse_appel_rendu' || c.rpc[0].args.p_reponse !== U1) e.push(`sans source : ${JSON.stringify(c.rpc.map((x) => [x.nom, x.args]))}, un acq_reponse_appel_rendu { p_reponse } attendu`)
    const d = await jouer('appels', `${URL_A}?source=autre`, {}, { id: U1 }); if (d.status !== 400 || d.rpc.length) e.push(`source=autre → ${d.status} et ${d.rpc.length} rpc(, 400 et zéro attendus`)
  })
  await critere('GE-13', async (e) => {
    for (const [geste, fonction] of Object.entries(GESTES)) {
      const a = await jouer('gestes', URL_G, { geste, ...PARAMS_GESTES[geste] })
      const rec = a.appels.find((x) => x.f === 'exigerReconfirmation')
      if (a.status !== 200) e.push(`${geste} → ${a.status}, 200 attendu`)
      if (a.suite.join(' ') !== `exigerReconfirmation journaliser rpc:${fonction}`) e.push(`${geste} : ${a.suite.join(' → ')}`)
      if (rec?.portee !== 'securite') e.push(`${geste} : portée ${rec?.portee}, securite attendue`)
      if (a.journal[0]?.e.reconfirme !== true) e.push(`${geste} : journal sans reconfirme: true`)
      if (a.rpc[0]?.args.p_auteur !== F.uid) e.push(`${geste} : p_auteur n'est pas l'uid du fondateur`)
      const b = await jouer('gestes', URL_G, { geste, ...PARAMS_GESTES[geste] }, null, { reconfirme: false })
      if (b.status !== 403 || b.rpc.length) e.push(`${geste} sans reconfirmation → ${b.status}, ${b.rpc.length} rpc(`)
    }
    for (const [code, phrase] of Object.entries(PHRASES)) {
      const c = await jouer('gestes', URL_G, { geste: 'ouvrir_envoi_froid' }, null, { rpc: () => erreur(code) })
      if (c.status !== 409 || c.j?.error !== phrase) e.push(`${code} → ${c.status} « ${court(c.j?.error, 50)} », 409 et sa phrase exacte attendus`)
    }
    // Plus de date (05/10/2026) : ops:trop_tot n'existe plus. S'il remontait quand même, la route ne dit plus « pas avant le lundi » :
    // elle répond « rien n'a été fait » (503), comme pour tout refus inconnu ; et son source ne porte plus ni date ni ce code.
    const tt = await jouer('gestes', URL_G, { geste: 'ouvrir_envoi_froid' }, null, { rpc: () => erreur('ops:trop_tot') })
    if (tt.status !== 503 || /12\/10|lundi|trop_tot|pas avant/i.test(String(tt.j?.error ?? ''))) e.push(`ops:trop_tot → ${tt.status} « ${court(tt.j?.error, 50)} », 503 sans date attendu`)
    for (const [code, st] of [['ops:borne', 400], ['ops:auteur', 403]]) { const c = await jouer('gestes', URL_G, { geste: 'palier_plafond', palier: 'P1', par_jour: 50 }, null, { rpc: () => erreur(code) }); if (c.status !== st) e.push(`${code} → ${c.status}, ${st} attendu`) }
    const f = await jouer('gestes', URL_G, { geste: 'ouvrir_envoi_froid' }, null, { drapeaux: { pilotage: true, siteAchatPublic: false } })
    if (f.status !== 409 || f.appels.some((x) => x.f === 'exigerReconfirmation') || f.rpc.length) e.push(`achat public fermé : ${f.status}, ${f.suite.join(' → ') || 'rien'} ; 409 sans reconfirmation ni rpc( attendu`)
    for (const corps of [{ geste: 'rouvrir_boite' }, { geste: 'palier_plafond', palier: 'P1', par_jour: 301 }, { geste: 'rouvrir_canal', canal: 'email' }]) { const c = await jouer('gestes', URL_G, corps); if (c.status !== 400 || c.appels.some((x) => x.f === 'exigerReconfirmation')) e.push(`${JSON.stringify(corps)} → ${c.status}, 400 avant toute reconfirmation attendu`) }
  })
  await critere('GE-14', async (e) => {
    const rep = decision({ cle_idempotence: `acq:reponse:${U1}:lire`, creee_par: 'standardiste', options: [{ cle: 'prix', libelle: 'Prix', recommandee: true }, { cle: 'ignorer', libelle: 'Ignorer' }], option_defaut: 'ignorer' })
    const a = await jouer('decisions', URL_D, { choix: 'prix' }, { id: U1 }, { rpc: rpcDecision(rep) })
    const rc = a.rpc.find((x) => x.nom === 'acq_reponse_reclasser')
    if (a.status !== 200 || a.suite.filter((x) => x.startsWith('rpc:')).join(' ') !== 'rpc:pilotage_decision rpc:ops_decision_trancher rpc:acq_reponse_reclasser') e.push(`carte de réponse : ${a.status}, ${a.suite.join(' → ')}`)
    if (!rc || rc.args.p_decision !== U1 || rc.args.p_par !== 'benj') e.push(`acq_reponse_reclasser : ${JSON.stringify(rc?.args)}, { p_decision: id, p_par: 'benj' } attendu`)
    const b = await jouer('decisions', URL_D, { choix: 'prix' }, { id: U1 }, { rpc: rpcDecision(rep, erreur('ops:deja_tranchee')) })
    if (b.status !== 409 || !b.rpc.some((x) => x.nom === 'acq_reponse_reclasser')) e.push(`déjà tranchée : ${b.status}, reclasser ${b.rpc.some((x) => x.nom === 'acq_reponse_reclasser') ? 'appelé' : 'absent'} ; 409 et l'appel attendus`)
    const c = await jouer('decisions', URL_D, { choix: 'oui' }, { id: U1 }, { rpc: rpcDecision(decision()) })
    if (c.rpc.some((x) => x.nom === 'acq_reponse_reclasser')) e.push("une décision chef:… appelle acq_reponse_reclasser")
    const d = await jouer('decisions', URL_D, { choix: 'prix' }, { id: U1 }, { rpc: rpcDecision(rep, { data: null, error: null }, erreur('boom')) })
    if (d.status !== 200 || !JSON.stringify(d.j ?? {}).includes('rappuie')) e.push(`reclasser en erreur : ${d.status} « ${court(JSON.stringify(d.j), 60)} », 200 avec « rappuie » attendu`)
  })
  await critere('GE-15', async (e) => {
    const a = await jouer('consignes', URL_C, { texte: 'Pour le facteur seulement', agent: 'facteur' })
    if (a.status !== 200 || a.rpc.length !== 1 || a.rpc[0].args.p_agent !== 'facteur' || a.journal[0]?.e.apres?.agent !== 'facteur') e.push(`agent facteur : ${a.status}, rpc ${JSON.stringify(a.rpc.map((x) => x.args.p_agent))}, journal ${JSON.stringify(a.journal.map((x) => x.e.apres?.agent))}`)
    const b = await jouer('consignes', URL_C, { texte: 'Pour tout l’équipage' })
    if (b.rpc[0]?.args.p_agent !== null) e.push(`sans agent : p_agent ${JSON.stringify(b.rpc[0]?.args.p_agent)}, null attendu`)
    for (const agent of ['inconnu', 'radar', 'ecommerce']) {
      const c = await jouer('consignes', URL_C, { texte: 'Consigne adressée', agent })
      if (c.status !== 400 || c.rpc.length || c.journal.length || !JSON.stringify(c.j ?? {}).includes('facteur')) e.push(`agent ${agent} : ${c.status}, ${c.journal.length} journal, ${c.rpc.length} rpc, liste ${JSON.stringify(c.j ?? {}).includes('facteur') ? 'rendue' : 'absente'} ; 400 avec la liste, sans journal ni rpc attendu`)
    }
  })
  console.log(MARQUE + JSON.stringify(res))
}
if (o.drapeaux.has('enfant')) { await enfant(o.racine); process.exit(0) }

// ═══ Le juge ═════════════════════════════════════════════════════════════════════════════════════════════════════════
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
let BASE
try { BASE = commitBase(o.valeurs.base) } catch (e) { refuser(premiereLigne(e)) }
const VIVANT = !o.valeurs.racine && !o.temoin && !o.drapeaux.has('statique')
let RAC = o.racine, TEMOIN = null
if (o.temoin) {
  try { TEMOIN = arbreTemoin(JUGE, { base: BASE, chemins: ['app', 'lib', 'scripts/fermeture-e2e.mjs'] }); RAC = TEMOIN.dest } catch (e) { refuser(`témoin impossible à poser : ${premiereLigne(e)}`) }
}
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
const IDS = ['GE-1', 'GE-2', 'GE-3', 'GE-4', 'GE-5', 'GE-6', 'GE-9', 'GE-11', 'GE-12', 'GE-13', 'GE-14', 'GE-15', ...(VIVANT ? ['GE-7', 'GE-8', 'GE-10'] : [])]
const S = creerSortie(JUGE, [...IDS], `${JUGE} — racine ${RAC}${TEMOIN ? ` — témoin du lot b posé sur ${BASE.slice(0, 7)}` : ''} — base ${BASE.slice(0, 7)} — ${VIVANT ? 'statique, doublures, puis refus sur la copie au drapeau levé' : 'statique et doublures (GE-7, GE-8, GE-10 se jugent sur la racine réelle)'}`)
const lireRac = (rel) => { try { return lf(fs.readFileSync(path.join(RAC, rel), 'utf8')) } catch { return null } }
const SRC = Object.fromEntries(Object.entries(ROUTES).map(([k, rel]) => [k, lireRac(rel)]))
const CODE = Object.fromEntries(Object.entries(SRC).map(([k, s]) => [k, s === null ? null : sansCommentaires(s)]))
const absents = Object.entries(ROUTES).filter(([k]) => SRC[k] === null).map(([, rel]) => rel)
const RE_DRAPEAU = /^\s*if\s*\(\s*!\s*actif\(\s*['"`]pilotage['"`]\s*\)\s*\)\s*(\{\s*)?return\b[^;]*\b404\b/
const indice = (s, x) => (s ?? '').indexOf(x)

// GE-1
{
  const e = absents.map((a) => `${a} absent`)
  for (const [k, s] of Object.entries(CODE)) {
    if (s === null) continue
    const post = corpsDeFonction(SRC[k], 'POST')
    if (post === null) { e.push(`${k} : aucun export async function POST`); continue }
    if (!RE_DRAPEAU.test(post)) e.push(`${k} : la première instruction du POST ne teste pas actif('pilotage') pour répondre 404`)
    const iD = post.indexOf('estDirection('), iDom = post.search(/exigerDomaine\(\s*\w+\s*,\s*'[a-z]+'\s*,\s*'ecrire'\s*\)/)
    if (iD < 0) e.push(`${k} : estDirection( absent`)
    if (/\bestFondateur\(/.test(post)) e.push(`${k} : estFondateur( (le rôle lecture ne tranche pas)`)
    if (iDom < 0) e.push(`${k} : exigerDomaine(…, 'ecrire') absent`)
    else if (iD > iDom) e.push(`${k} : exigerDomaine( avant estDirection(`)
    if (DYNAMIQUES.includes(k) && !/await\s+ctx\.params\b/.test(post)) e.push(`${k} : paramètres non lus par await ctx.params`)
  }
  S.juger('GE-1', e, "cinq routes ; dans chaque POST : actif('pilotage') → 404 d'abord, puis estDirection(, puis exigerDomaine(…, 'ecrire') ; await ctx.params pour les trois routes dynamiques")
}
// GE-2
{
  const e = []
  const s = CODE.decisions
  if (s === null) e.push(`${ROUTES.decisions} absent`)
  else {
    const jalons = ["'pilotage_decision'", 'choixValide(', 'porteeExigee(', 'exigerReconfirmation(', 'journaliser(', "'ops_decision_trancher'"]
    const ix = jalons.map((j) => indice(s, j))
    jalons.forEach((j, n) => { if (ix[n] < 0) e.push(`${j} absent`); else if (n && ix[n - 1] >= 0 && ix[n] < ix[n - 1]) e.push(`${j} avant ${jalons[n - 1]}`) })
    const iR = indice(s, 'exigerReconfirmation(')
    if (iR >= 0 && !/if\s*\(\s*portee\b[^)]*\)\s*\{?[^;]*$/.test(s.slice(Math.max(0, iR - 90), iR).replace(/\n/g, ' '))) e.push("exigerReconfirmation( hors de la condition sur la portée")
    for (const c of ['ops:deja_tranchee', 'ops:choix', 'ops:auteur']) if (!s.includes(`'${c}'`)) e.push(`${c} non traduit`)
  }
  S.juger('GE-2', e, 'pilotage_decision → choixValide( → porteeExigee( → exigerReconfirmation( (sous la portée) → journaliser( → ops_decision_trancher ; deja_tranchee, choix, auteur traduits')
}
// GE-3
{
  const e = []
  const s = CODE.agents
  if (s === null) e.push(`${ROUTES.agents} absent`)
  else {
    const m = /exigerReconfirmation\(\s*req\s*,\s*\w+\.uid\s*,\s*'securite'\s*\)/.exec(s)
    const iRpc = s.indexOf('.rpc(')
    if (!m) e.push("exigerReconfirmation(req, f.uid, 'securite') absent")
    else {
      if (iRpc >= 0 && m.index > iRpc) e.push('un rpc( précède la reconfirmation')
      const avant = s.slice(Math.max(0, s.lastIndexOf('\n', s.lastIndexOf('\n', m.index) - 1)), m.index)
      if (/if\s*\([^)]*pause/.test(avant) || /\bpause\b/.test(s.slice(s.lastIndexOf('\n', m.index), m.index))) e.push('la reconfirmation dépend d’une condition sur pause')
    }
    if (!/\/\^\[a-z0-9_\]\{2,40\}\$\//.test(s)) e.push('le nom n’est pas filtré par ^[a-z0-9_]{2,40}$')
  }
  for (const [k, c] of Object.entries(CODE)) if (c && /ops_interrupteur_poser/.test(c)) e.push(`${k} appelle ops_interrupteur_poser`)
  // Plus de date (05/10/2026) : la route des gestes ne porte plus ni le 12/10 ni ops:trop_tot (le 503 « rien n'a été fait » est joué par GE-13).
  if (SRC.gestes && /12\/10|2026-10-12|trop_tot/.test(SRC.gestes)) e.push('la route des gestes porte encore la date du 12/10 ou ops:trop_tot')
  S.juger('GE-3', e, "exigerReconfirmation(req, f.uid, 'securite') avant tout rpc(, sans condition sur pause ; nom filtré par ^[a-z0-9_]{2,40}$ ; pas d'ops_interrupteur_poser ; aucune date d'ouverture dans la route des gestes")
}
// GE-4
{
  const e = []
  const dossier = path.join(RAC, P)
  if (fs.existsSync(path.join(dossier, 'envois'))) e.push(`${P}/envois/ existe : aucune route d'envoi n'est permise`)
  for (const f of fs.existsSync(dossier) ? listerFichiers(dossier) : []) {
    const s = sansCommentaires(fs.readFileSync(path.join(dossier, f), 'utf8'))
    for (const x of ['acq_envoi_marquer', 'acq_envoi_preparer', 'acq_reponse_relayer']) if (s.includes(x)) e.push(`${P}/${f} cite ${x}`)
    const v = /['"`](envoye|saute|relayer)['"`]/.exec(s)
    if (v) e.push(`${P}/${f} : « ${v[1]} » comme valeur`)
  }
  const s = CODE.appels
  if (s === null) e.push(`${ROUTES.appels} absent`)
  else {
    const iJ = indice(s, 'journaliser(')
    const iRep = s.search(/rpc\(\s*'acq_reponse_appel_rendu'\s*,\s*\{\s*p_reponse\s*:\s*id\b/), iRdv = s.search(/rpc\(\s*'acq_rdv_appel_rendu'\s*,\s*\{\s*p_id\s*:\s*id\b/)
    if (iRep < 0) e.push("rpc('acq_reponse_appel_rendu', { p_reponse: id }) absent")
    if (iRdv < 0) e.push("rpc('acq_rdv_appel_rendu', { p_id: id }) absent")
    if (iJ < 0 || [iRep, iRdv].some((i) => i >= 0 && i < iJ)) e.push('un appel rendu précède journaliser(')
    if (/\breq(?:uest)?\.(json|text|formData|arrayBuffer|body)\b/.test(s)) e.push('le corps de la requête est lu')
  }
  S.juger('GE-4', e, "aucune route sous envois/, ni acq_envoi_marquer, acq_envoi_preparer, acq_reponse_relayer, ni « envoye », « saute », « relayer » ; appels rendus après journaliser(, corps ignoré")
}
// GE-5
const actions = (src) => { const s = sansCommentaires(src ?? ''); const i = s.indexOf('export type Action'); const j = s.indexOf('export type', i + 5); return new Set(i < 0 ? [] : [...s.slice(i, j < 0 ? undefined : j).matchAll(/'([a-z_]+)'/g)].map((m) => m[1])) }
{
  const e = []
  const ici = actions(lireRac('lib/direction/journal.ts')), la = actions(lireBase(BASE, 'lib/direction/journal.ts'))
  if (!la.size) e.push(`lib/direction/journal.ts de ${BASE.slice(0, 7)} illisible`)
  const ajoutees = [...ici].filter((x) => !la.has(x)), retirees = [...la].filter((x) => !ici.has(x))
  const intrus = ajoutees.filter((x) => !NEUF.includes(x) && x !== 'pause_generale')
  if (intrus.length) e.push(`Action gagne ${intrus.join(', ')}, hors des neuf valeurs`)
  if (retirees.length) e.push(`Action perd ${retirees.join(', ')}`)
  const manquent = NEUF.filter((x) => !ici.has(x))
  if (manquent.length) e.push(`Action sans ${manquent.join(', ')}`)
  for (const x of ['boite_rouverte', 'envoi_marque', 'reponse_relayee']) if (ici.has(x)) e.push(`Action porte ${x}`)
  for (const [k, s] of Object.entries(CODE)) {
    if (s === null) continue
    const iJ = indice(s, 'journaliser('), iW = Math.min(...ECRITURES[k].map((n) => s.search(new RegExp(`\\.rpc\\(\\s*'${n}'`))).filter((i) => i >= 0))
    if (iJ < 0) e.push(`${k} : journaliser( absent`)
    else if (Number.isFinite(iW) && iW < iJ) e.push(`${k} : l'écriture précède journaliser(`)
    if (!/if\s*\(\s*!\s*\w+\s*\)\s*return\s+refusJournal\(\)/.test(s)) e.push(`${k} : refusJournal() non rendu sur false`)
  }
  S.juger('GE-5', e, `Action gagne au plus les neuf valeurs (par rapport à ${BASE.slice(0, 7)}), jamais boite_rouverte ; chaque route journalise avant d'écrire et rend refusJournal() sur false`)
}
// GE-6
{
  const e = []
  const vus = new Set()
  for (const [k, s] of Object.entries(CODE)) {
    if (s === null) continue
    const w = /\.(from|insert|update|delete|schema)\(/.exec(s)
    if (w) e.push(`${k} : .${w[1]}(`)
    for (const m of s.matchAll(/\.rpc\(\s*(['"`]?)([\w$.]*)/g)) {
      if (!m[1]) e.push(`${k} : rpc( sans nom littéral`)
      else if (!RPC_PERMIS.includes(m[2])) e.push(`${k} : rpc('${m[2]}') hors de la liste`)
      else vus.add(m[2])
    }
    if (s.includes('acq_boite_rouvrir')) e.push(`${k} cite acq_boite_rouvrir`)
  }
  S.juger('GE-6', e, `aucun .from(, .insert(, .update(, .delete(, .schema( ; ${vus.size} fonctions appelées, toutes de la liste ; jamais acq_boite_rouvrir`)
}
// GE-9
{
  const e = []
  const carte = lireRac('scripts/fermeture-e2e.mjs')
  const ligne = (carte ?? '').split('\n').find((l) => l.trim().startsWith("'pilotage':")) ?? ''
  if (!ligne) e.push("la carte n'a pas de ligne 'pilotage'")
  for (const rel of ['app/api/controle/pilotage/route.ts', ...Object.values(ROUTES)]) {
    if (ligne && !ligne.includes(`'${rel}'`)) e.push(`la ligne 'pilotage' ne porte pas ${rel}`)
    const src = lireRac(rel)
    if (src !== null && !/actif\(['"`]pilotage['"`]\)/.test(src)) e.push(`${rel} ne lit pas actif('pilotage')`)
  }
  S.juger('GE-9', e, "la ligne 'pilotage' de la carte porte la route de lecture et les cinq routes d'écriture, qui lisent toutes actif('pilotage')")
}
// GE-11 à GE-15 : l'enfant, sur les doublures
{
  const r = await lancerAsync(process.execPath, [CE_SCRIPT, '--enfant', `--racine=${RAC}`], { cwd: R, timeout: 120_000 })
  const l = (r.stdout || '').split(/\r?\n/).find((x) => x.startsWith(MARQUE))
  let res = null
  try { res = l ? JSON.parse(l.slice(MARQUE.length)) : null } catch { /* illisible */ }
  if (!res) S.nonJuges(['GE-11', 'GE-12', 'GE-13', 'GE-14', 'GE-15'], `processus des doublures sans résultat (code ${r.code}) : ${court((r.stderr || r.stdout || '').trim().split('\n').pop(), 140)}`)
  else {
    const imp = Object.entries(res.imports).filter(([, v]) => v !== 'ok').map(([k, v]) => `${k} : ${court(v, 60)}`)
    // GE-13 et GE-14 ont aussi leur part lue dans le source ; GE-15 aussi.
    const e13 = [], e14 = [], e15 = []
    const hors = ['app/api/controle/pilotage', 'app/api/agents', 'app/api/cron', 'lib/agents']
    for (const d of hors) {
      const abs = path.join(RAC, d)
      for (const f of fs.existsSync(abs) ? listerFichiers(abs) : []) {
        const rel = `${d}/${f}`
        if (rel === ROUTES.gestes || !/\.(ts|tsx|mjs|js)$/.test(f)) continue
        const s = sansCommentaires(fs.readFileSync(path.join(abs, f), 'utf8'))
        for (const n of Object.values(GESTES)) if (s.includes(n)) e13.push(`${rel} cite ${n}`)
      }
    }
    if (SRC.decisions !== null && /from\s*['"](@\/lib\/agents\/acquisition|[./]*agents\/acquisition)/.test(CODE.decisions)) e14.push('la route du tranchage importe de lib/agents/acquisition/')
    if (SRC.consignes !== null) {
      if (!/import\s*\{[^}]*\bEQUIPAGE\b[^}]*\}\s*from\s*['"]@\/lib\/pilotage\/equipage['"]/.test(CODE.consignes)) e15.push("EQUIPAGE n'est pas importé de @/lib/pilotage/equipage")
      const recopies = [...CODE.consignes.matchAll(/['"`](chef|facteur|recenseur|standardiste|repondeur|livreur|crieur|tresorier|redacteur)['"`]/g)].map((m) => m[1])
      if (recopies.length) e15.push(`noms recopiés dans la route : ${[...new Set(recopies)].join(', ')}`)
    }
    const detail = {
      'GE-11': 'par doublures : un journaliser( sans le texte puis un station_consigne_transmettre (p_auteur = uid), 200 ; journal refusé → 503 sans rpc( ; quota 429, auteur 403, texte 400, autre 503 ; texte absent des console. ; appel rendu true 200 / false 404 ; décision dans l’ordre de GE-2',
      'GE-12': 'par doublures : source=rdv → journal rendez_vous puis un acq_rdv_appel_rendu { p_id } ; false → 404 ; sans source → acq_reponse_appel_rendu seul ; source=autre → 400 sans rpc(',
      'GE-13': 'par doublures, pour les cinq gestes : reconfirmation securite → journal (reconfirme) → un rpc( de 0111 avec p_auteur ; sans reconfirmation → refus sans rpc( ; les trois refus d’ouverture (mesure, épreuve, notice) en 409 avec leur phrase, ops:trop_tot disparu (503 sans date), borne 400, auteur 403 ; achat public fermé → 409 sans reconfirmation ; les cinq fonctions citées nulle part ailleurs',
      'GE-14': 'par doublures : carte acq:reponse:… → ops_decision_trancher puis acq_reponse_reclasser { p_decision, p_par: benj } ; déjà tranchée → 409 et reclassée ; chef:… → rien ; reclasser en erreur → « rappuie » ; rien de lib/agents/acquisition/',
      'GE-15': 'par doublures : agent facteur → p_agent facteur et journal apres.agent ; sans agent → null ; inconnu, radar, ecommerce → 400 avec la liste, sans journal ni rpc( ; EQUIPAGE importé, aucun nom recopié',
    }
    const plus = { 'GE-13': e13, 'GE-14': e14, 'GE-15': e15 }
    for (const id of ['GE-11', 'GE-12', 'GE-13', 'GE-14', 'GE-15']) S.juger(id, [...(imp.length ? [`import impossible : ${imp.join(' ; ')}`] : []), ...(res.criteres[id] ?? ['non joué']), ...(plus[id] ?? [])], detail[id])
  }
}

// ── Vivant : refus seulement, sur l'arbre réel et sur la copie au drapeau levé ──────────────────────────────────────────
async function vivant() {
  const { serveur } = await import('./lib/capture.mjs')
  const U = (k, id) => `/api/controle/pilotage/${k === 'decisions' ? `decisions/${id}` : k === 'appels' ? `appels/${id}` : k === 'agents' ? `agents/${id}` : k}`
  let reel = null
  try {
    reel = await serveur(R)
    const e = []
    for (const k of Object.keys(ROUTES)) { const r = await fetch(`${reel.base}${U(k, k === 'agents' ? 'chef' : U1)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); if (r.status !== 404) e.push(`${k} → ${r.status}`) }
    S.juger('GE-7', e, 'arbre réel, drapeau baissé : les cinq POST → 404 sans identité')
  } catch (err) { S.echoue('GE-7', `arbre réel injoignable : ${premiereLigne(err)}`) } finally { if (reel) await reel.arreter() }
  let srv = null
  try {
    const c = copieAvecDrapeau(R, { critere: 'GE-8' })
    srv = await serveurCopie(c.dest, { critere: 'GE-8' })
    const poster = async (chemin, corps, jeton) => { const r = await fetch(`${srv.base}${chemin}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* texte */ } return { status: r.status, j } }
    const { resultat, menage, erreur } = await avecComptes(['direction', 'artisan'], async ({ direction, artisan }) => {
      const e = []
      const avant = await journalDe(direction.id)
      for (const k of Object.keys(ROUTES)) { const r = await poster(U(k, k === 'agents' ? 'chef' : U1), {}, artisan.jeton); if (r.status !== 403) e.push(`artisan ${k} → ${r.status}, 403 attendu`) }
      // Uniquement des refus : aucune consigne valide, aucun geste reconfirmé, aucune décision tranchée.
      const cas = [
        ['/api/controle/pilotage/gestes', { geste: 'palier_plafond', palier: 'P1', par_jour: 50 }, (r) => r.status === 403 && r.j?.code === 'reconfirmation_requise' && r.j?.portee === 'securite', '403 reconfirmation_requise securite'],
        ['/api/controle/pilotage/gestes', { geste: 'inconnu' }, (r) => r.status === 400, '400'],
        ['/api/controle/pilotage/gestes', { geste: 'rouvrir_boite' }, (r) => r.status === 400, '400'],
        ['/api/controle/pilotage/gestes', { geste: 'palier_plafond', palier: 'P1', par_jour: 301 }, (r) => r.status === 400, '400'],
        ['/api/controle/pilotage/decisions/pas-un-uuid', { choix: 'oui' }, (r) => r.status === 404, '404'],
        ['/api/controle/pilotage/appels/pas-un-uuid', {}, (r) => r.status === 404, '404'],
        ['/api/controle/pilotage/agents/chef', { pause: true }, (r) => r.status === 403 && r.j?.code === 'reconfirmation_requise' && r.j?.portee === 'securite', '403 reconfirmation_requise securite'],
        ['/api/controle/pilotage/consignes', { texte: '' }, (r) => r.status === 400, '400'],
        ['/api/controle/pilotage/consignes', { texte: 'ab' }, (r) => r.status === 400, '400'],
        ['/api/controle/pilotage/consignes', { texte: 'x'.repeat(201) }, (r) => r.status === 400, '400'],
        [`/api/controle/pilotage/decisions/${U1}`, { choix: 'oui' }, (r) => r.status === 404 || r.status === 503, '404 ou 503'],
      ]
      for (const [chemin, corps, ok, attendu] of cas) { const r = await poster(chemin, corps, direction.jeton); if (r.status >= 500 && r.status !== 503) e.push(`${chemin} → ${r.status} (500 interdit)`); else if (!ok(r)) e.push(`${chemin} ${JSON.stringify(corps).slice(0, 40)} → ${r.status} ${r.j?.code ?? ''}, ${attendu} attendu`) }
      const apres = await journalDe(direction.id)
      if (apres !== avant) e.push(`le journal du fondateur d'essai a gagné ${apres - avant} ligne(s) pendant les refus`)
      return e
    })
    if (erreur) throw erreur
    S.juger('GE-8', [...resultat, ...(menage ? [] : ['ménage des comptes d’essai en échec : un compte n’a pas disparu'])], 'copie au drapeau levé, refus seulement : artisan 403 partout ; gestes sans reconfirmation 403, inconnu, rouvrir_boite, 301 → 400 ; faux UUID 404 ; agent sans jeton 403 ; consigne vide, 2 ou 201 signes → 400 ; décision inconnue 404 ou 503 ; jamais 500 ; journal inchangé ; comptes supprimés')
  } catch (err) { S.echoue('GE-8', `copie ou serveur : ${premiereLigne(err)}`) } finally { if (srv) await srv.arreter() }
  const t = spawnSync('npm', ['run', 'typecheck'], { cwd: R, encoding: 'utf8', shell: process.platform === 'win32', timeout: 600_000, windowsHide: true })
  S.juger('GE-10', t.status === 0 ? [] : [`npm run typecheck en code ${t.status} : ${court((t.stdout || '').split('\n').find((x) => /error TS/.test(x)) || t.stderr, 160)}`], 'npm run typecheck vert')
}
if (VIVANT) await vivant()
process.exit(S.finir())
