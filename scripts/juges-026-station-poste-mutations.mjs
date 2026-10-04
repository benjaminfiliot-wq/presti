#!/usr/bin/env node
// scripts/juges-026-station-poste-mutations.mjs — la contre-vérification des juges de la station qui touchent à la base ou au compte
// d'essai (fiche 026-192) : station-reglages-qa, poste-extraction-qa, station-route-qa --partie=salles2, pilotage-sql-qa
// --migration=reglages, pilotage-ecran-qa --partie=salles-suite.
//
// Ce que la fiche supposait, et ce que les juges font : ils créent un compte d'essai et lisent la vraie base SEULEMENT avec --reel
// (PC, .env.local). Sans --reel, chacun juge une racine (--racine=<copie>) sur des DOUBLURES, sans compte, sans clé, sans .env.local,
// sans aucune écriture : c'est ce mode que ce script lance, et rien d'autre (la fiche interdit --reel). Le script ne lit donc aucun
// secret, ne crée aucun compte et peut tourner sur l'usine comme sur le PC.
//
// Un juge qu'on n'a jamais vu échouer sur une vraie faute ne prouve rien. Ce script lui fait lire des COPIES :
//   · une copie intacte par commande (le témoin) : code 0 exigé ;
//   · puis, pour chaque mutation, la même copie avec UN remplacement de texte exact : code ≠ 0 exigé, avec la ligne
//     « FAIL <critère> — … » du critère attendu et le bilan qui le nomme.
// Il ne corrige JAMAIS un juge, un jeu d'essai ni le dépôt en place : seule la copie sous .orchestre/travail/026-192/ est écrite
// (liens vers node_modules retirés par fs.unlinkSync avant toute suppression ; chaque texte muté est rétabli et son empreinte relue).
// Si une mutation passe, elle est écrite en tête du rapport et le script sort en code 1.
//
// Le mode --relais lance le juge sur la copie et récrit ses lignes « ✅ ID » / « ❌ ID » en « PASS|FAIL ID — … » (une ligne par
// critère, un « (complément) » fondu dans la ligne du sien), le code de sortie étant celui du juge :
//   node scripts/juges-026-station-poste-mutations.mjs --relais=<reglages|extraction|route|sql|ecran> [options du juge] --racine={racine}
// Une ligne en échec qui dit « préalable », « non jugé » ou « interrompu » ne compte pas comme une mutation prise.
//
// Usage :
//   node scripts/juges-026-station-poste-mutations.mjs                  tout ; code 0 si tout est pris
//   node scripts/juges-026-station-poste-mutations.mjs --seul=<motif>   une mutation, un critère ou un juge (code 3 si tout est pris)
//   node scripts/juges-026-station-poste-mutations.mjs --ancres         vérifie seulement que chaque « avant » est présent une fois
//   --budget=<min> (19 par défaut) · --garder
// Écrit sous .orchestre/travail/026-192/ et .orchestre/preuves/026-192/ (mutations.md, mutations.json, journaux/). Aucun réseau,
// aucun --reel, aucune écriture en production.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const CE_SCRIPT = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(CE_SCRIPT), '..')
const FICHE = '026-192'
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', FICHE)
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', FICHE)
const COPIE = path.join(TRAVAIL, 'copie')
const JOURNAUX = path.join(PREUVES, 'journaux')
const SELF = 'scripts/juges-026-station-poste-mutations.mjs'
const slash = (p) => String(p).split(path.sep).join('/')

const JUGES = {
  reglages: { script: 'scripts/station-reglages-qa.mjs', nom: 'station-reglages-qa', loader: false },
  extraction: { script: 'scripts/poste-extraction-qa.mjs', nom: 'poste-extraction-qa', loader: false },
  route: { script: 'scripts/station-route-qa.mjs', nom: 'station-route-qa', loader: true },
  // Le compte rendu de l'essai à sec de 026-175 est une preuve du dépôt d'origine, pas un fichier de la copie.
  sql: { script: 'scripts/pilotage-sql-qa.mjs', nom: 'pilotage-sql-qa', loader: false, extra: () => [`--essai=${slash(path.join(RACINE, '.orchestre', 'preuves', '026-175', 'essai-a-sec.txt'))}`] },
  ecran: { script: 'scripts/pilotage-ecran-qa.mjs', nom: 'pilotage-ecran-qa', loader: false },
}

// ── Les mutations : UN remplacement de texte exact chacune ──────────────────────────────────────────────────────────────────
// { juge, args, critere, fichier, avant, apres, nom, rendu }  ; un « \n » d'une ancre s'écrit \r\n si le fichier est en CRLF.
const MUTATIONS = []
const muter = (juge, args, critere, fichier, avant, apres, nom, rendu = false) => MUTATIONS.push({ juge, args, critere, fichier, avant, apres, nom, rendu })
const ROUTE = 'app/api/controle/station/reglages/route.ts'
const MIG = 'supabase/migrations/0113_station_reglages.sql'
const SALLES = 'app/controle/station/salles'

// station-reglages-qa : la route des réglages, sur doublures.
muter('reglages', '', 'RX-1', ROUTE,
  "export async function PUT(req: Request) {\n  if (!actif('pilotage')) return erreur('Introuvable.', 404)\n  const f = await estDirection(req)\n  if (estRefus(f)) return reponseRefus(f)",
  "export async function PUT(req: Request) {\n  const f = await estDirection(req)\n  if (estRefus(f)) return reponseRefus(f)\n  if (!actif('pilotage')) return erreur('Introuvable.', 404)",
  'le test du drapeau pilotage passe après l’identité dans le PUT')
muter('reglages', '', 'RX-2', ROUTE,
  'const f = await estDirection(req)',
  'const f = await estFondateur(req)',
  'le PUT exige estFondateur au lieu d’estDirection')
muter('reglages', '', 'RX-4', ROUTE,
  "journalAvant = await journaliser({ acteur: f, action: actionStation, cible_type: 'station', cible_id: 'reglages', avant: { version } }, req)",
  'journalAvant = true',
  'plus de journal AVANT l’écriture (seul le journal du résultat reste)')
// poste-extraction-qa : l'extraction du Poste vers lib/.
muter('extraction', '', 'XT-2', 'app/api/controle/barre/route.ts',
  'messages: courriers.count ?? null,',
  'courriers: courriers.count ?? null,',
  'un champ de la réponse de /api/controle/barre renommé (messages → courriers)')
muter('extraction', '', 'XT-3', 'lib/controle/lectures/tickets.ts',
  ".from('tickets').select('id', { count: 'exact', head: true })",
  ".from('tickets').select('id, message', { count: 'exact', head: true })",
  'ticketsOuverts sélectionne la colonne message')
// station-route-qa --partie=salles2 : les lecteurs des vues de salle.
muter('route', '--partie=salles2', 'SL-2', 'lib/pilotage/station.ts',
  "'salle.audience': 'audience'",
  "'salle.audience': 'sante'",
  'le lecteur de l’Audience est rangé sous le domaine sante')
muter('route', '--partie=salles2', 'SL-6', 'lib/pilotage/salles/presti.ts',
  "tickets: await c.env('salle.presti.tickets', async () => ({ nombre: nombre((await c.deps.lectures.ticketsOuverts()).nombre) })),",
  "tickets: await c.env('salle.presti.tickets', async () => ({ nombre: nombre((await c.deps.lectures.ticketsOuverts()).nombre), liste: await c.deps.lectures.ticketsOuverts() })),",
  'la salle Presti rend la liste des tickets en plus de leur nombre')
// pilotage-sql-qa --migration=reglages : la migration 0113 (lecture statique ; l'essai à sec est celui de 026-175).
muter('sql', '--migration=reglages', 'SR-5', MIG,
  'if p_version is distinct from v_courante then',
  'if false and p_version is distinct from v_courante then',
  'station_reglages_ecrire n’exige plus la version courante')
muter('sql', '--migration=reglages', 'SR-7', MIG,
  'returns table(departement text, trouves integer, contactes integer, oui integer)',
  'returns table(departement text, entreprise text, trouves integer, contactes integer, oui integer)',
  'pilotage_prospects_departements rend une colonne entreprise')
// pilotage-ecran-qa --partie=salles-suite : le Radar et le Crieur (026-164).
muter('ecran', '--partie=salles-suite', 'SB-3', `${SALLES}/Radar.tsx`,
  '<Tuile libelle="OUI" attribut={`${cle}-oui`}>{e[cle].oui}</Tuile>',
  '<Tuile libelle="OUI" attribut={`${cle}-oui`}>{Math.round(e[cle].reponses / 2)}</Tuile>',
  'le compteur OUI du Radar recalculé à l’écran (la moitié des réponses) au lieu du chiffre servi', true)
muter('ecran', '--partie=salles-suite', 'SB-6', `${SALLES}/Crieur.tsx`,
  'attribut="reponses-privees">{c.texte}</Tuile></div>',
  'attribut="reponses-privees">{c.texte}</Tuile><button type="button">Publier</button></div>',
  'un bouton « Publier » ajouté au panneau du Crieur', true)

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
const court = (t, n = 240) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const eol = (texte, s) => (texte.includes('\r\n') ? s.replace(/\r?\n/g, '\r\n') : s)

const o = (() => {
  const r = { relais: null, racine: null, seul: null, ancres: false, garder: false, budget: 19, reste: [] }
  for (const a of process.argv.slice(2)) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(a)
    if (!m) { console.error(`✗ argument inattendu : ${a}`); process.exit(2) }
    const [, k, v] = m
    if (k === 'ancres' || k === 'garder') r[k] = true
    else if (k === 'budget' && /^\d+$/.test(v ?? '')) r.budget = Number(v)
    else if (['relais', 'racine', 'seul'].includes(k) && v) r[k] = v
    else if (r.relais) r.reste.push(a)
    else { console.error(`✗ option inconnue ou sans valeur : --${k}`); process.exit(2) }
  }
  return r
})()

// ═══ Le relais ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const RE_LIGNE_JUGE = /^(✅|❌) ([A-Z0-9]{1,5}-[A-Z0-9-]+)(?: (.*))?$/
const RE_BILAN = /^[\w.-]+(?: --[\w-]+(?:=\S+)?)* : (?:PASS|FAIL)(?: — .*)?$/
function relais() {
  const juge = JUGES[o.relais]
  if (!juge) { console.log(`${SELF} : appel refusé — --relais=<${Object.keys(JUGES).join('|')}> attendu`); return 2 }
  if (!o.racine || !existe(o.racine)) { console.log(`${juge.nom} : appel refusé — --racine=<dossier> attendu`); return 2 }
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
  const args = [...(juge.loader ? ['--import', './scripts/ts-loader.mjs'] : []), path.join(RACINE, juge.script), ...o.reste, ...(juge.extra ? juge.extra() : []), `--racine=${o.racine}`]
  const r = spawnSync(process.execPath, args, { cwd: RACINE, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true, timeout: 17 * 60_000 })
  const sortie = sansAnsi(`${r.stdout ?? ''}${r.stderr ?? ''}`)
  const vus = new Map()
  const autres = []
  for (const l of sortie.split(/\r?\n/)) {
    const m = RE_LIGNE_JUGE.exec(l)
    if (!m) { if (l.trim() && !/^\s+at .*:\d+:\d+/.test(l)) autres.push(l); continue }
    const [, signe, id, reste = ''] = m
    const detail = reste.replace(/ \(complément\)$/, '').trim()
    const ok = signe === '✅'
    if (vus.has(id)) { const v = vus.get(id); v.ok = v.ok && ok; v.detail += ` ; ${detail}` } else vus.set(id, { ok, detail })
  }
  const bilan = autres.filter((l) => RE_BILAN.test(l)).at(-1)
  for (const l of autres.filter((x) => x !== bilan).slice(0, 6)) console.log(`# ${court(l, 200)}`)
  for (const [id, v] of vus) console.log(`${v.ok ? 'PASS' : 'FAIL'} ${id} — ${v.detail || (v.ok ? 'conforme' : 'en échec')}`)
  const rouges = [...vus].filter(([, v]) => !v.ok).map(([id]) => id)
  console.log(bilan ?? `${juge.nom}${o.reste.length ? ` ${o.reste.join(' ')}` : ''} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : r.status === 0 ? 'PASS' : 'FAIL'}`)
  return r.status === null ? 124 : r.status
}
if (o.relais) process.exit(relais())

// ═══ La copie ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
function retirer(dir) {
  if (!existe(dir)) return
  const rel = path.relative(TRAVAIL, dir)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('suppression hors travail refusée')
  for (const nom of fs.readdirSync(dir)) {
    const p = path.join(dir, nom), st = fs.lstatSync(p)
    if (st.isSymbolicLink()) fs.unlinkSync(p)
    else if (st.isDirectory()) retirer(p)
    else fs.unlinkSync(p)
  }
  fs.rmdirSync(dir)
}
const IGNORE = new Set(['node_modules', '.next', '.git'])
const filtre = (src) => !IGNORE.has(path.basename(src)) && !src.endsWith('.tsbuildinfo')
function copier() {
  retirer(COPIE)
  fs.mkdirSync(COPIE, { recursive: true })
  // docs/ pèse 150 Mo et aucun de ces juges n'en lit : il reste dehors.
  for (const d of ['app', 'lib', 'components', 'supabase']) if (existe(path.join(RACINE, d))) fs.cpSync(path.join(RACINE, d), path.join(COPIE, d), { recursive: true, filter: filtre })
  for (const f of ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']) if (existe(path.join(RACINE, f))) fs.copyFileSync(path.join(RACINE, f), path.join(COPIE, f))
  // La route des réglages importe un thème d'essai de scripts/ ; la carte de fermeture est lue par RX-6 et XT-4.
  fs.mkdirSync(path.join(COPIE, 'scripts'), { recursive: true })
  fs.copyFileSync(path.join(RACINE, 'scripts', 'fermeture-e2e.mjs'), path.join(COPIE, 'scripts', 'fermeture-e2e.mjs'))
  // XT-5 : les suites controle-*-e2e existantes doivent rester présentes dans la racine jugée.
  for (const s of fs.readdirSync(path.join(RACINE, 'scripts'))) if (/^controle-.*-e2e.mjs$/.test(s)) fs.copyFileSync(path.join(RACINE, 'scripts', s), path.join(COPIE, 'scripts', s))
  fs.cpSync(path.join(RACINE, 'scripts', 'fixtures', '026-pilotage', 'k', 'themes'), path.join(COPIE, 'scripts', 'fixtures', '026-pilotage', 'k', 'themes'), { recursive: true })
  const pub = path.join(RACINE, 'public')
  fs.mkdirSync(path.join(COPIE, 'public'), { recursive: true })
  for (const e of fs.readdirSync(pub, { withFileTypes: true })) {
    const a = path.join(pub, e.name), b = path.join(COPIE, 'public', e.name)
    if (e.isDirectory()) fs.symlinkSync(a, b, 'junction')
    else if (fs.statSync(a).size < 8 * 1024 * 1024) fs.copyFileSync(a, b)
  }
  fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(COPIE, 'node_modules'), 'junction')
}

// ═══ Lancer ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function tuerArbre(pid) {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
function lancer(args, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, [CE_SCRIPT, '--relais=' + args[0], ...args.slice(1), `--racine=${COPIE}`], { cwd: RACINE, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, windowsHide: true })
    let sortie = '', expire = false
    const t0 = Date.now()
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)
    for (const flux of [enfant.stdout, enfant.stderr]) { flux.setEncoding('utf8'); flux.on('data', (d) => { if (sortie.length < 4_000_000) sortie += d }) }
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), sortie: sansAnsi(sortie), duree_s: (Date.now() - t0) / 1000, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sansAnsi(sortie)}\n${e.message}`, duree_s: (Date.now() - t0) / 1000, expire }) })
  })
}
const commandeDe = (m) => `node ${SELF} --relais=${m.juge}${m.args ? ` ${m.args}` : ''} --racine={racine}`
const argsDe = (m) => [m.juge, ...m.args.split(/\s+/).filter(Boolean)]
function lignesDe(sortie) {
  const par = new Map()
  for (const l of sortie.split(/\r?\n/)) { const m = /^(PASS|FAIL) (\S+) — (.*)$/.exec(l); if (m && !par.has(m[2])) par.set(m[2], { signe: m[1], ligne: l, detail: m[3] }) }
  const bilan = sortie.split(/\r?\n/).filter((l) => RE_BILAN.test(l)).at(-1) ?? null
  return { par, bilan }
}
const RE_INFRA = /préalable|non jugé|non évalué|interrompu|ne se prépare pas|absent de node_modules|Failed to compile|error TS|Type error|next build|appel refusé|injoignable|le juge ne peut pas/i
function verdict(sortie, critere) {
  const { par, bilan } = lignesDe(sortie)
  const l = par.get(critere)
  if (!l) return { ok: false, raison: `aucune ligne « ${critere} » dans la sortie` }
  if (l.signe !== 'FAIL') return { ok: false, raison: `${critere} rapporté ${l.signe} : « ${court(l.ligne, 120)} »` }
  if (RE_INFRA.test(l.detail)) return { ok: false, raison: `${critere} en échec pour une raison d'infrastructure, pas pour la faute : « ${court(l.detail, 160)} »` }
  if (!bilan || !/ : FAIL — /.test(bilan) || !bilan.split(' : FAIL — ')[1].split(/,\s*/).includes(critere)) return { ok: false, raison: `le bilan ne nomme pas ${critere} : « ${court(bilan ?? 'aucun bilan', 100)} »` }
  return { ok: true, ligne: l.ligne }
}
const rougesDe = (sortie) => [...lignesDe(sortie).par].filter(([, v]) => v.signe === 'FAIL').map(([id]) => id)

async function principal() {
  const retenues = o.seul ? MUTATIONS.filter((m) => [m.juge, m.critere, m.nom, m.fichier].some((y) => y.includes(o.seul))) : MUTATIONS
  if (!retenues.length) { console.error(`aucune mutation ne correspond à --seul=${o.seul}`); process.exitCode = 2; return }
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.mkdirSync(JOURNAUX, { recursive: true })
  const debut = Date.now(), fin = debut + o.budget * 60_000
  const defauts = [], lignes = [], rapport = [], temoins = []
  try {
    copier()
    const originaux = new Map(), jouables = []
    for (const m of retenues) {
      const f = path.join(COPIE, m.fichier)
      if (!existe(f)) { defauts.push(`${m.critere} ${m.nom} : fichier absent de la copie (${m.fichier}) ; mutation non jouée`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; ${m.fichier} absent`); continue }
      if (!originaux.has(f)) originaux.set(f, lire(f))
      const avant = eol(originaux.get(f), m.avant)
      const n = originaux.get(f).split(avant).length - 1
      if (n !== 1) { defauts.push(`${m.critere} ${m.nom} : texte « avant » présent ${n} fois dans ${m.fichier} (une seule attendue) ; mutation non jouée`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; ancre présente ${n} fois dans ${m.fichier}`); continue }
      jouables.push(m)
    }
    if (o.ancres) {
      for (const l of lignes) console.log(l)
      console.log(`${jouables.length}/${retenues.length} ancres présentes une fois`)
      process.exitCode = defauts.length ? 1 : 0
      return
    }
    jouables.sort((a, b) => Number(a.rendu) - Number(b.rendu))
    const commandes = new Map()
    let n = 0
    for (const m of jouables) {
      const cle = commandeDe(m)
      if (!commandes.has(cle)) commandes.set(cle, { temoin: null, rouges: [] })
      const c = commandes.get(cle)
      if (Date.now() + (m.rendu ? 120_000 : 30_000) > fin) { defauts.push(`${m.critere} ${m.nom} : non jouée, le budget de ${o.budget} min est épuisé`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; budget épuisé`); continue }
      if (!c.temoin) {
        const r = await lancer(argsDe(m), Math.max(60_000, Math.min(fin - Date.now(), 14 * 60_000)))
        ecrire(path.join(JOURNAUX, `${String(++n).padStart(2, '0')}-temoin-${m.juge}${m.args ? '-' + m.args.replace(/[^\w=,-]+/g, '_') : ''}.log`), `$ ${cle}\n# code ${r.code} · ${r.duree_s.toFixed(1)} s\n\n${r.sortie.slice(0, 200_000)}`)
        c.temoin = r
        c.rouges = rougesDe(r.sortie)
        const etat = r.code === 0 ? 'vert' : `rouge (code ${r.code}${r.expire ? ', délai dépassé' : ''} ; ${c.rouges.join(', ') || 'aucune ligne en échec'})`
        temoins.push(`${m.juge} ${m.args || ''} : témoin ${etat} en ${r.duree_s.toFixed(0)} s`)
        console.log(`TÉMOIN ${m.juge} ${m.args || ''} : ${etat}`)
        if (r.code !== 0) defauts.push(`TÉMOIN ${m.juge} ${m.args || ''} rouge : code ${r.code}${r.expire ? ' (délai dépassé)' : ''} ; critères en échec : ${c.rouges.join(', ') || 'aucun nommé'} ; ${court(r.sortie.split(/\r?\n/).filter(Boolean).at(-1) || '', 200)}`)
      }
      if (c.temoin.expire || c.temoin.code === 124) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; témoin hors délai`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin n'a pas fini`); continue }
      if (c.rouges.includes(m.critere)) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; le témoin échoue déjà sur ${m.critere}`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin est déjà rouge sur ${m.critere}`); continue }
      const f = path.join(COPIE, m.fichier), original = originaux.get(f)
      fs.writeFileSync(f, original.replace(eol(original, m.avant), () => eol(original, m.apres)))
      let r
      try { r = await lancer(argsDe(m), Math.max(60_000, Math.min(fin - Date.now() + 60_000, 14 * 60_000))) }
      finally { fs.writeFileSync(f, original) }
      if (sha(lire(f)) !== sha(original)) throw new Error(`${m.fichier} n'a pas été rétabli`)
      ecrire(path.join(JOURNAUX, `${String(++n).padStart(2, '0')}-${m.critere}-${m.juge}.log`), `$ ${cle}\n# ${m.fichier} : « ${court(m.avant, 120)} » → « ${court(m.apres, 120)} »\n# code ${r.code} · ${r.duree_s.toFixed(1)} s\n\n${r.sortie.slice(0, 200_000)}`)
      const v = verdict(r.sortie, m.critere)
      const ok = r.code !== 0 && !r.expire && v.ok
      const ligne = `${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.nom} ; ${m.fichier} ; ${ok ? v.ligne : `${r.expire ? 'délai dépassé' : `code ${r.code}`} : ${v.raison ?? 'aucun critère nommé en échec'}`}`
      lignes.push(ligne); console.log(ligne)
      if (!ok) defauts.push(ligne)
      else rapport.push({ juge: JUGES[m.juge].script, commande: commandeDe(m), fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait: v.ligne, duree_s: Number(r.duree_s.toFixed(1)) })
    }
    ecrire(path.join(PREUVES, 'mutations.md'), `# Mutations des juges de la station qui lisent la base (026-192)\n\nTous les juges tournent sans --reel : doublures, aucun compte, aucune clé, aucun .env.local, aucune écriture en production.\n\n${defauts.length ? `## ÉCHECS (${defauts.length})\n${defauts.map((d) => `- ${d}`).join('\n')}\n\n` : ''}## Témoins (copie intacte)\n${temoins.map((t) => `- ${t}`).join('\n') || '- aucun'}\n\n## Mutations\n${lignes.map((l) => `- ${l}`).join('\n')}\n\nBilan : ${rapport.length}/${retenues.length} mutations prises sur leur critère nommé, en ${((Date.now() - debut) / 60_000).toFixed(1)} min (budget ${o.budget} min).\n`)
    ecrire(path.join(PREUVES, 'mutations.json'), JSON.stringify({ mutations: rapport }, null, 2) + '\n')
    console.log(`026-192 : ${defauts.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${retenues.length} mutations prises`)
    process.exitCode = defauts.length ? 1 : o.seul ? 3 : 0
  } finally {
    if (!o.garder || o.ancres) { try { retirer(COPIE) } catch (e) { console.error(`copie non retirée : ${e.message}`) } }
  }
}
principal().catch((e) => { console.error(e.stack || e); process.exitCode = 1 })
