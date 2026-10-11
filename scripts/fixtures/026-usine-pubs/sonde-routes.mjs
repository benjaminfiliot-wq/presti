// La sonde des routes de usine-pubs-qa (026-199) : le processus à part où les TROIS VRAIES routes de la racine jugée s'exécutent, sans
// réseau ni secret. Lancée par le juge avec :
//   node --experimental-strip-types --import <dépôt>/scripts/ts-loader.mjs --import crochet.mjs sonde-routes.mjs <cfg.json>
//   (cwd = racine jugée ; UP_RACINE et UP_DEPOT posés par le juge pour le crochet)
// Elle démarre le faux Supabase (PostgREST + stockage, faux-supabase.mjs), pose NEXT_PUBLIC_SUPABASE_URL sur lui AVANT d'importer les
// routes (lib/supabaseAdmin.ts le lit à l'import), puis joue les scénarios et écrit { nonce, obs } : des OBSERVATIONS (statuts, corps,
// appels consignés par le faux Supabase et par les doublures). Le juge, lui, en tire les verdicts : la sonde ne juge rien.
//
// Les routes y sont servies par les VRAIES lib/supabaseAdmin.ts et lib/agents/bus.ts du dépôt (le vrai client @supabase/supabase-js) ; seules
// lib/flags, lib/agents/garde, lib/agents/pause et next/server sont des doublures (doublures/). La base est celle de CONTRAT.md :
// tables packs_pubs et artisans, les RPC du bus (contrat-ops.json) et deux fonctions que le juge fixe (acq_studio_a_fabriquer,
// acq_studio_bail_poser).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { demarrerFauxSupabase } from './faux-supabase.mjs'
import { U } from './doublures/etat.mjs'
import { donnees, TOKEN_FORMAT, AGENT, BUCKET, GO, sha256, hasard, JPEG, MP4, uuid } from './commun.mjs'

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const { nonce, sortie, racine, depot } = cfg
const ecrire = (o) => { fs.writeFileSync(sortie, JSON.stringify({ nonce, ...o })); process.exitCode = 0 }
const premiere = (e) => String((e && (e.stack || e.message)) || e).split('\n').slice(0, 3).join(' | ').slice(0, 500)

// ── le temps du juge : le bail de 90 min se joue sans attendre (Date et Date.now décalés ensemble) ─────────────────────────────
const VraiDate = Date
let decalageMs = 0
globalThis.Date = class extends VraiDate {
  constructor(...a) { if (a.length === 0) super(VraiDate.now() + decalageMs); else super(...a) }
  static now() { return VraiDate.now() + decalageMs }
}
const avancer = (minutes) => { decalageMs += minutes * 60_000 }

// ── la base ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const contrat = JSON.parse(fs.readFileSync(path.join(depot, 'scripts/fixtures/026-horloge-bus/contrat-ops.json'), 'utf8'))
const fonctions = {
  ...contrat.fonctions,
  ops_cout_autoriser: { params: [['p_agent', 'text'], ['p_montant_eur', 'numeric']] },
  acq_studio_a_fabriquer: { params: [['p_limite', 'integer']] },
  acq_studio_bail_poser: { params: [['p_decision', 'uuid'], ['p_bail_s', 'integer']] },
}
const erreurOps = (code) => ({ status: 400, body: { code: 'P0001', message: `ops:${code}`, details: null, hint: null } })
const D = donnees('http://127.0.0.1:0') // les ids ne dépendent pas de l'origine
const S = { decisions: new Map(), baux: new Map(), marques: [], octets: 0.5 * GO, stockage_erreur: false, stockage_nul: false, appels_bail: [] }
const fondateurs = () => faux.tables.artisans.filter((a) => a.is_founder).map((a) => a.id)
const rpcs = {
  ops_battement: () => ({ status: 200, body: null }),
  ops_stockage_octets: () => (S.stockage_erreur ? { status: 500, body: { code: 'XX000', message: 'stockage illisible' } } : { status: 200, body: S.stockage_nul ? null : S.octets }),
  ops_cout_autoriser: () => ({ status: 200, body: true }),
  ops_cout_ajouter: () => ({ status: 200, body: 0 }),
  ops_evenement_ajouter: () => ({ status: 200, body: 1 }),
  ops_etat: () => ({ status: 200, body: { decisions_ouvertes: [] } }),
  ops_decision_creer: (p) => {
    const o = Array.isArray(p.p_options) ? p.p_options : []
    if (o.length < 2 || o.length > 3 || o.some((x) => !x || !/^[a-z_]{2,30}$/.test(x.cle || '') || typeof x.libelle !== 'string' || x.libelle.length < 1 || x.libelle.length > 80 || typeof x.recommandee !== 'boolean') || o.filter((x) => x.recommandee).length !== 1) return erreurOps('options')
    if (!o.some((x) => x.cle === p.p_defaut)) return erreurOps('defaut')
    const e = Date.parse(p.p_echeance)
    if (!Number.isFinite(e) || e < Date.now() + 3_600_000 || e > Date.now() + 30 * 86_400_000) return erreurOps('echeance')
    for (const d of S.decisions.values()) if (p.p_cle && d.cle === p.p_cle) return { status: 200, body: [{ id: d.id, creee: false }] }
    const id = uuid()
    S.decisions.set(id, { id, cle: p.p_cle ?? null, creee_par: p.p_agent, options: o, defaut: p.p_defaut, question: p.p_question, contexte: p.p_contexte, statut: 'ouverte', choix: null, tranchee_le: null })
    return { status: 200, body: [{ id, creee: true }] }
  },
  ops_decision_trancher: (p) => {
    if (!fondateurs().includes(p.p_auteur)) return erreurOps('auteur')
    const d = S.decisions.get(p.p_id)
    if (!d || d.statut !== 'ouverte') return erreurOps('deja_tranchee')
    if (!d.options.some((x) => x.cle === p.p_choix)) return erreurOps('choix')
    d.statut = 'tranchee'; d.choix = p.p_choix; d.tranchee_le = new Date().toISOString()
    return { status: 200, body: null }
  },
  ops_decisions_tranchees: (p) => ({ status: 200, body: [...S.decisions.values()].filter((d) => d.creee_par === p.p_agent && d.statut !== 'ouverte').map((d) => ({ id: d.id, cle_idempotence: d.cle, choix: d.choix, tranchee_le: d.tranchee_le })) }),
  acq_studio_a_fabriquer: (p) => ({ status: 200, body: [...S.marques].sort((a, b) => a.accord_recu_le.localeCompare(b.accord_recu_le)).slice(0, p.p_limite).map((m) => structuredClone(m)) }),
  acq_studio_bail_poser: (p) => {
    S.appels_bail.push({ decision: p.p_decision, bail_s: p.p_bail_s })
    const fin = S.baux.get(p.p_decision)
    if (fin !== undefined && fin > Date.now()) return { status: 200, body: false }
    S.baux.set(p.p_decision, Date.now() + p.p_bail_s * 1000)
    return { status: 200, body: true }
  },
}
const faux = await demarrerFauxSupabase({ tables: { packs_pubs: [], artisans: [] }, rpcs, fonctions })
process.env.NEXT_PUBLIC_SUPABASE_URL = faux.url
process.env.SUPABASE_SERVICE_ROLE_KEY = `service-${hasard(16)}`
const DONNEES = donnees(faux.url)
const PAGE = `${faux.url}/marque/produit.html`

function semer({ packs = DONNEES.packs(), marques = [], octets = 0.5 * GO, objets = [], decisions = [] } = {}) {
  faux.tables.packs_pubs.length = 0; faux.tables.packs_pubs.push(...structuredClone(packs))
  faux.tables.artisans.length = 0; faux.tables.artisans.push(...DONNEES.artisans())
  faux.objets.clear()
  for (const ph of DONNEES.photos()) faux.objets.set(`artisan-media/${ph.chemin}`, { octets: ph.octets, type: 'image/jpeg' })
  for (const [cle, o] of objets) faux.objets.set(cle, o)
  S.decisions.clear(); S.baux.clear(); S.appels_bail.length = 0; S.marques = structuredClone(marques)
  for (const m of marques) S.decisions.set(m.decision_id, { id: m.decision_id, cle: `acq:studio_echantillon:${m.marque_cle}`, creee_par: 'standardiste', options: [{ cle: 'depose' }, { cle: 'ne_rien_faire' }], statut: 'ouverte', choix: null })
  for (const d of decisions) S.decisions.set(d.id, d)
  S.octets = octets; S.stockage_erreur = false; S.stockage_nul = false
  faux.etat.stockage = null
  faux.appels.length = 0; U().journal.length = 0
  decalageMs = 0
}

// ── l'appel d'une route et ce qu'on en retient ───────────────────────────────────────────────────────────────────────────
const jetons = {}
for (const nom of [AGENT, 'livreur_usine', 'atelier_maquettes', 'chef']) { jetons[nom] = TOKEN_FORMAT(nom); U().agents.set(jetons[nom], { nom, en_pause: false }) }
const inconnu = TOKEN_FORMAT('inconnu')
const modules = {}
const resume = (a) => ({ genre: a.genre, methode: a.methode, fonction: a.fonction ?? null, table: a.table ?? null, requete: a.requete ?? null, corps: a.corps ?? null, params: a.params ?? null, action: a.action ?? null, bucket: a.bucket ?? null, chemin: a.chemin ?? null, chemins: a.chemins ?? null, expiresIn: a.expiresIn ?? null, jeton: a.jeton ?? null, jetons: a.jetons ?? null, statut: a.statut, faute: a.faute ?? null })
async function jouer(route, { jeton = jetons[AGENT], corps, brut, methode = route === 'travail' ? 'GET' : 'POST', sansEntete = false } = {}) {
  const avant = { appels: faux.appels.length, journal: U().journal.length }
  const handler = modules[route]?.[methode]
  if (typeof handler !== 'function') return { absent: true, status: null, json: null, texte: '', exception: `la route n'exporte pas ${methode}`, appels: [], journal: [] }
  const entetes = {}
  if (jeton && !sansEntete) entetes.authorization = `Bearer ${jeton}`
  if (corps !== undefined || brut !== undefined) entetes['content-type'] = 'application/json'
  const req = new Request(`http://127.0.0.1/api/usine/pubs/${route}`, { method: methode, headers: entetes, body: methode === 'GET' ? undefined : (brut ?? (corps === undefined ? undefined : JSON.stringify(corps))) })
  let rep = null, exception = null
  try { rep = await handler(req) } catch (e) { exception = premiere(e) }
  const texte = rep && typeof rep.text === 'function' ? await rep.text().catch(() => '') : ''
  let json = null; try { json = JSON.parse(texte) } catch { /* pas du JSON */ }
  return { status: rep && typeof rep.status === 'number' ? rep.status : null, json, texte, exception, appels: faux.appels.slice(avant.appels).map(resume), journal: U().journal.slice(avant.journal) }
}
const ligneDe = (id) => structuredClone(faux.tables.packs_pubs.find((l) => l.id === id) ?? null)

// ── les scénarios ────────────────────────────────────────────────────────────────────────────────────────────────────────
const obs = { import: {}, gardes: {}, travail: {}, depot: {}, rendu: {} }
const { A, B, FOND, DECISION } = D.ids
const ROUTES = ['travail', 'depot', 'rendu']
const corpsNormal = (route) => route === 'depot'
  ? { travail: A, fichiers: [{ chemin: `${BUCKET}/${A}/livraison/video-1.mp4`, type: 'video/mp4', taille: 1000 }] }
  : route === 'rendu' ? { travail: A, ok: false, raison: 'essai', fichiers: [], juge: { nom: 'pub-locale-qa', code: 1, empreinte_journal: 'a'.repeat(64) } } : undefined

try {
  for (const route of ROUTES) {
    try { modules[route] = await import(pathToFileURL(path.join(racine, cfg.fichiers[route])).href); obs.import[route] = null } catch (e) { obs.import[route] = premiere(e) }
  }

  // le pack attendu : ce que le VRAI scripts/pack-pub/exporter.mjs écrit pour cette ligne, lu sur ce même faux Supabase
  semer()
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'up-export-'))
  const exporter = await new Promise((ok) => execFile(process.execPath, [path.join(depot, 'scripts/pack-pub/exporter.mjs'), A, dossier], { cwd: dossier, env: { PATH: process.env.PATH, NEXT_PUBLIC_SUPABASE_URL: faux.url, SUPABASE_SERVICE_ROLE_KEY: 'x' }, timeout: 30000 }, (err, so, se) => ok({ code: err ? (err.code ?? 1) : 0, so, se })))
  try { obs.pack_attendu = JSON.parse(fs.readFileSync(path.join(dossier, 'pack.json'), 'utf8')) } catch { obs.pack_attendu = null; obs.exporter = { code: exporter.code, se: String(exporter.se).slice(0, 300) } }
  fs.rmSync(dossier, { recursive: true, force: true })

  // ── UP-2 : les gardes, route par route ──
  for (const route of ROUTES) {
    const g = (obs.gardes[route] = {})
    const poser = ({ drapeau = true, pause = false, enPause = false } = {}) => { semer(); U().drapeaux.busAgents = drapeau; U().pause.active = pause; U().agents.get(jetons[AGENT]).en_pause = enPause }
    const normal = () => ({ corps: corpsNormal(route) })
    poser({ drapeau: false }); g.drapeau_bas = await jouer(route, normal())
    poser(); g.sans_jeton = await jouer(route, { ...normal(), sansEntete: true })
    poser(); g.jeton_inconnu = await jouer(route, { ...normal(), jeton: inconnu })
    poser(); g.livreur = await jouer(route, { ...normal(), jeton: jetons.livreur_usine })
    poser(); g.autre_agent = await jouer(route, { ...normal(), jeton: jetons.atelier_maquettes })
    poser(); g.chef = await jouer(route, { ...normal(), jeton: jetons.chef })
    poser(); g.studio = await jouer(route, normal())
    poser({ pause: true }); g.pause_generale = await jouer(route, normal())
    poser({ enPause: true }); g.agent_en_pause = await jouer(route, normal())
    poser()
  }

  // ── UP-3 : travail ──
  const T = obs.travail
  semer({ packs: [] }); T.vide = await jouer('travail')
  semer(); T.pack_1 = await jouer('travail'); T.pack_2 = await jouer('travail'); T.pack_3 = await jouer('travail')
  T.etat_apres_3 = faux.tables.packs_pubs.map((l) => ({ id: l.id, etat: l.etat }))
  avancer(89); T.bail_89 = await jouer('travail')
  avancer(2); T.bail_91 = await jouer('travail')
  semer({ packs: [], marques: DONNEES.marques(PAGE) }); T.studio_1 = await jouer('travail'); T.studio_2 = await jouer('travail')
  T.baux_studio = structuredClone(S.appels_bail)
  // le leurre : un pack dont les photos désignent aussi le dossier d'un autre artisan et un autre bucket (ses seules photos sont signées)
  {
    const AUTRE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', LEURRE = '99999999-9999-4999-8999-999999999999'
    const base = DONNEES.packs()[0]
    const faux1 = { url: `${faux.url}/storage/v1/object/public/artisan-media/${AUTRE}/secret.jpg`, role: 'detail', personnes: false, accord_personnes: false }
    const faux2 = { url: `${faux.url}/storage/v1/object/public/packs-pubs/${B}/livraison/secret.mp4`, role: 'detail', personnes: false, accord_personnes: false }
    const ligneLeurre = { ...base, id: LEURRE, matiere: { ...base.matiere, photos: [...base.matiere.photos.slice(0, 3), faux1, faux2] } }
    semer({ packs: [ligneLeurre], objets: [[`artisan-media/${AUTRE}/secret.jpg`, { octets: JPEG('secret'), type: 'image/jpeg' }], [`packs-pubs/${B}/livraison/secret.mp4`, { octets: MP4('secret'), type: 'video/mp4' }]] })
    T.leurre = await jouer('travail')
    T.leurre_id = LEURRE
  }
  // l'ordre : les packs payés d'abord (le plus ancien en tête), puis, quand il n'en reste aucun à prendre, la décision du Studio
  semer({ marques: DONNEES.marques(PAGE) }); T.ordre = [await jouer('travail'), await jouer('travail'), await jouer('travail'), await jouer('travail')]

  // ── UP-4 : depot ──
  const De = obs.depot
  const six = (n = A) => [1, 2, 3].map((i) => ({ chemin: `${BUCKET}/${n}/livraison/video-${i}.mp4`, type: 'video/mp4', taille: 5_000_000 })).concat([['visuel-1.jpg', 'image/jpeg'], ['visuel-2.jpg', 'image/jpeg'], ['visuel-3.png', 'image/png']].map(([nom, type]) => ({ chemin: `${BUCKET}/${n}/livraison/${nom}`, type, taille: 400_000 })))
  const MARQUE = 'maison-temoin-seize'
  const un = (extra) => ({ chemin: `${BUCKET}/${A}/livraison/video-1.mp4`, type: 'video/mp4', taille: 5_000_000, ...extra })
  const cas = {
    ok_pack: six(),
    autre_pack: [un({ chemin: `${BUCKET}/${B}/livraison/video-1.mp4` })],
    hors_livraison: [un({ chemin: `${BUCKET}/${A}/photos/x.jpg`, type: 'image/jpeg' })],
    traversee: [un({ chemin: `${BUCKET}/${A}/livraison/../../${B}/livraison/video-1.mp4` })],
    double_barre: [un({ chemin: `${BUCKET}/${A}/livraison//video-1.mp4` })],
    nom_majuscule: [un({ chemin: `${BUCKET}/${A}/livraison/Video-1.mp4` })],
    nom_espace: [un({ chemin: `${BUCKET}/${A}/livraison/video 1.mp4` })],
    type_avi: [un({ type: 'video/avi' })],
    type_gif: [un({ chemin: `${BUCKET}/${A}/livraison/visuel-1.gif`, type: 'image/gif' })],
    ok_60_mo: [un({ taille: 60 * 1024 * 1024 })],
    trop_gros: [un({ taille: 60 * 1024 * 1024 + 1 })],
    taille_zero: [un({ taille: 0 })],
    taille_negative: [un({ taille: -5 })],
    taille_flottante: [un({ taille: 1000.5 })],
    taille_texte: [un({ taille: '1000' })],
    sept_fichiers: six().concat([un({ chemin: `${BUCKET}/${A}/livraison/video-4.mp4` })]),
    doublon: [un(), un()],
    chemin_studio: [{ chemin: `${BUCKET}/studio/${MARQUE}/echantillon-1.mp4`, type: 'video/mp4', taille: 1000 }],
  }
  const prendrePack = async () => { semer({ octets: 0.5 * GO }); const t = await jouer('travail'); return t.json?.id ?? t.json?.travail?.id ?? null }
  for (const [nom, fichiers] of Object.entries(cas)) {
    await prendrePack()
    faux.appels.length = 0
    De[nom] = await jouer('depot', { corps: { travail: A, fichiers } })
  }
  await prendrePack(); De.corps_invalide = await jouer('depot', { brut: '{pas du json' })
  await prendrePack(); De.travail_inconnu = await jouer('depot', { corps: { travail: uuid(), fichiers: [un()] } })
  await prendrePack(); S.octets = 0.59 * GO; De.stockage_59 = await jouer('depot', { corps: { travail: A, fichiers: [un()] } })
  await prendrePack(); S.octets = 0.61 * GO; De.stockage_61 = await jouer('depot', { corps: { travail: A, fichiers: [un()] } })
  await prendrePack(); S.stockage_erreur = true; De.stockage_erreur = await jouer('depot', { corps: { travail: A, fichiers: [un()] } })
  await prendrePack(); S.stockage_nul = true; De.stockage_nul = await jouer('depot', { corps: { travail: A, fichiers: [un()] } })
  // le Studio
  const studio = async (extra = {}) => { semer({ packs: [], marques: DONNEES.marques(PAGE), ...extra }); const t = await jouer('travail'); return t.json }
  const sm = (extra) => ({ chemin: `${BUCKET}/studio/${MARQUE}/echantillon-1.mp4`, type: 'video/mp4', taille: 3 * 1024 * 1024, ...extra })
  const casStudio = {
    studio_ok: [sm()], studio_n_5: [sm({ chemin: `${BUCKET}/studio/${MARQUE}/echantillon-5.mp4` })],
    studio_trop_gros: [sm({ taille: 3 * 1024 * 1024 + 1 })], studio_autre_marque: [sm({ chemin: `${BUCKET}/studio/marque-opposee/echantillon-1.mp4` })],
    studio_deux_fichiers: [sm(), sm({ chemin: `${BUCKET}/studio/${MARQUE}/echantillon-2.mp4` })], studio_mov: [sm({ chemin: `${BUCKET}/studio/${MARQUE}/echantillon-1.mov`, type: 'video/quicktime' })],
    studio_n_0: [sm({ chemin: `${BUCKET}/studio/${MARQUE}/echantillon-0.mp4` })], studio_chemin_pack: [sm({ chemin: `${BUCKET}/${A}/livraison/video-1.mp4` })],
    studio_image: [sm({ chemin: `${BUCKET}/studio/${MARQUE}/echantillon-1.jpg`, type: 'image/jpeg' })],
  }
  for (const [nom, fichiers] of Object.entries(casStudio)) { await studio(); faux.appels.length = 0; De[nom] = await jouer('depot', { corps: { travail: DECISION, fichiers } }) }

  // ── UP-5 : rendu ──
  const R = obs.rendu
  const nomsSix = ['video-1.mp4', 'video-2.mp4', 'video-3.mp4', 'visuel-1.jpg', 'visuel-2.jpg', 'visuel-3.png']
  const octetsDe = (nom) => (nom.endsWith('.mp4') ? MP4(nom, 4096) : nom.endsWith('.png') ? Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from(`PNG-${nom}`.padEnd(64, '.'))]) : JPEG(nom))
  const objetsPack = () => nomsSix.map((n) => [`${BUCKET}/${A}/livraison/${n}`, { octets: octetsDe(n), type: n.endsWith('.mp4') ? 'video/mp4' : n.endsWith('.png') ? 'image/png' : 'image/jpeg' }])
  const annonces = () => nomsSix.map((n) => ({ chemin: `${BUCKET}/${A}/livraison/${n}`, sha256: sha256(octetsDe(n)) }))
  const juge = (extra) => ({ nom: 'pub-locale-qa', code: 0, empreinte_journal: sha256('journal-du-juge'), ...extra })
  const rendrePack = async (nom, { mutation = () => {}, corps = {} } = {}) => {
    semer({ octets: 0.5 * GO, objets: objetsPack() }); await jouer('travail')
    mutation()
    faux.appels.length = 0
    R[nom] = await jouer('rendu', { corps: { travail: A, ok: true, fichiers: annonces(), juge: juge(), ...corps } })
    R[nom].ligne = ligneDe(A)
  }
  await rendrePack('ok')
  await rendrePack('fichier_absent', { mutation: () => faux.objets.delete(`${BUCKET}/${A}/livraison/video-2.mp4`) })
  await rendrePack('sha_faux', { corps: { fichiers: annonces().map((f, i) => (i === 3 ? { ...f, sha256: sha256('autre') } : f)) } })
  await rendrePack('magiques_faux', { mutation: () => faux.objets.set(`${BUCKET}/${A}/livraison/video-1.mp4`, { octets: Buffer.from('ceci n\'est pas une video mp4 du tout, jamais'), type: 'video/mp4' }) })
  await rendrePack('magiques_faux_sha_juste', { mutation: () => { const o = { octets: Buffer.from('ceci n\'est pas une video mp4 du tout, jamais'), type: 'video/mp4' }; faux.objets.set(`${BUCKET}/${A}/livraison/video-1.mp4`, o) }, corps: { fichiers: annonces().map((f, i) => (i === 0 ? { ...f, sha256: sha256(Buffer.from('ceci n\'est pas une video mp4 du tout, jamais')) } : f)) } })
  await rendrePack('juge_rouge', { corps: { juge: juge({ code: 1 }) } })
  await rendrePack('juge_mauvais_nom', { corps: { juge: juge({ nom: 'pub-qa' }) } })
  await rendrePack('juge_absent', { corps: { juge: undefined } })
  await rendrePack('journal_vide', { corps: { juge: juge({ empreinte_journal: '' }) } })
  await rendrePack('fichier_manquant', { corps: { fichiers: annonces().slice(0, 5) } })
  await rendrePack('fichier_hors_livraison', { mutation: () => faux.objets.set(`${BUCKET}/${A}/photos/x.jpg`, { octets: JPEG('x'), type: 'image/jpeg' }), corps: { fichiers: annonces().concat([{ chemin: `${BUCKET}/${A}/photos/x.jpg`, sha256: sha256(JPEG('x')) }]) } })
  await rendrePack('ok_faux', { corps: { ok: false, raison: 'pub-locale-qa rouge', fichiers: [], juge: juge({ code: 1 }) } })
  // trois échecs de suite : le pack reste payee et n'est plus repris
  semer({ octets: 0.5 * GO, objets: objetsPack() }); await jouer('travail')
  R.trois_echecs = []
  for (let i = 0; i < 3; i++) R.trois_echecs.push(await jouer('rendu', { corps: { travail: A, ok: false, raison: `essai ${i + 1}`, fichiers: [], juge: juge({ code: 1 }) } }))
  R.trois_echecs_ligne = ligneDe(A)
  avancer(91); R.trois_echecs_repris = await jouer('travail')
  // deux échecs seulement : le pack est repris après le bail (la reprise automatique va jusqu'au 3e échec)
  semer({ octets: 0.5 * GO, objets: objetsPack() }); await jouer('travail')
  for (let i = 0; i < 2; i++) await jouer('rendu', { corps: { travail: A, ok: false, raison: `essai ${i + 1}`, fichiers: [], juge: juge({ code: 1 }) } })
  avancer(91); R.deux_echecs_repris = await jouer('travail')
  // trois échecs constatés par la route elle-même (empreinte fausse) : plus de reprise non plus
  semer({ octets: 0.5 * GO, objets: objetsPack() }); await jouer('travail')
  R.trois_verifs = []
  for (let i = 0; i < 3; i++) R.trois_verifs.push(await jouer('rendu', { corps: { travail: A, ok: true, fichiers: annonces().map((f, k) => (k === 0 ? { ...f, sha256: sha256('autre') } : f)), juge: juge() } }))
  R.trois_verifs_ligne = ligneDe(A)
  avancer(91); R.trois_verifs_repris = await jouer('travail')
  // le Studio : le premier échantillon, puis après le « envoyer » de Benj, puis un échantillon qui n'est pas le premier
  const EPATH = `${BUCKET}/studio/${MARQUE}/echantillon-1.mp4`
  const echantillon = MP4('echantillon', 4096)
  const rendreStudio = async (nom, { juge: j = juge({ nom: 'pub-qa' }), sha = sha256(echantillon) } = {}) => {
    faux.appels.length = 0
    R[nom] = await jouer('rendu', { corps: { travail: DECISION, ok: true, fichiers: [{ chemin: EPATH, sha256: sha }], juge: j } })
    R[nom].decision = structuredClone(S.decisions.get(DECISION))
    R[nom].decisions = [...S.decisions.values()].map((d) => ({ id: d.id, cle: d.cle ?? null, creee_par: d.creee_par ?? null, options: (d.options || []).map((o) => o.cle), libelles: (d.options || []).map((o) => o.libelle ?? null), statut: d.statut, choix: d.choix ?? null, contexte: d.contexte ?? null, question: d.question ?? null, defaut: d.defaut ?? null }))
  }
  await studio({ objets: [[EPATH, { octets: echantillon, type: 'video/mp4' }]] })
  await rendreStudio('studio_premier')
  const ouverte = [...S.decisions.values()].find((d) => d.options.some((o) => o.cle === 'envoyer'))
  R.studio_premier_decision = ouverte ? structuredClone(ouverte) : null
  if (ouverte) { ouverte.statut = 'tranchee'; ouverte.choix = 'envoyer'; ouverte.tranchee_le = new Date().toISOString() }
  await rendreStudio('studio_apres_envoyer')
  const precedent = { id: uuid(), cle: 'acq:studio_echantillon:autre-prospect', creee_par: 'standardiste', options: [{ cle: 'depose' }, { cle: 'ne_rien_faire' }], statut: 'tranchee', choix: 'depose', tranchee_le: '2026-09-29T10:00:00Z' }
  await studio({ objets: [[EPATH, { octets: echantillon, type: 'video/mp4' }], [`${BUCKET}/studio/autre-marque/echantillon-1.mp4`, { octets: MP4('precedent', 4096), type: 'video/mp4' }]], decisions: [precedent] })
  await rendreStudio('studio_pas_premier')
  await studio({ objets: [[EPATH, { octets: echantillon, type: 'video/mp4' }]] })
  await rendreStudio('studio_juge_pack', { juge: juge({ nom: 'pub-locale-qa' }) })
  await studio({ objets: [[EPATH, { octets: echantillon, type: 'video/mp4' }]] })
  await rendreStudio('studio_sha_faux', { sha: sha256('autre') })
  await studio({ objets: [] })
  await rendreStudio('studio_fichier_absent')
} catch (e) { obs.exception = premiere(e) }
await faux.arreter().catch(() => {})
ecrire({ obs, fautes: faux.fautes().slice(0, 12).map(resume) })
