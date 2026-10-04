#!/usr/bin/env node
// scripts/usine-pubs-qa.mjs — le juge de la fabrication des packs pubs payés et des échantillons du Studio sur l'usine (fiche 026-199, Claude Code).
// Écrit AVANT la production (026-200 : routes app/api/usine/pubs/*, lib/pubs/usinePubs.ts, tourneur scripts/usine/pubs.mjs, unités presti-pubs) ;
// il la juge, jamais l'inverse. Lire scripts/fixtures/026-usine-pubs/CONTRAT.md : les formes que le juge exige y sont écrites.
//
//   node scripts/usine-pubs-qa.mjs [--racine=<dossier>] [--partie=routes,tourneur,unites] [--temoin] [--preuve-echecs]
//   node scripts/usine-pubs-qa.mjs --reel --etape=preparer|conclure          (026-202 : l'épreuve sur l'usine, PC éteint)
//
//   UP-1   les sept fichiers existent et ne sont pas vides
//   UP-2…5 (routes)   gardes, GET travail, POST depot, POST rendu : les trois vraies routes de la racine, dans un processus enfant, contre un faux
//                     Supabase (PostgREST + stockage) sur 127.0.0.1 ; le juge compte ce que le faux a reçu
//   UP-6…9 (tourneur) le tourneur scripts/usine/pubs.mjs LANCÉ contre un faux Presti et un faux stockage sur 127.0.0.1, avec des doublures en tête du
//                     PATH (hyperframes, ffmpeg…) et des scripts du poste doublés ; Linux seulement : ailleurs, le juge se relance sur l'usine
//   UP-10  (unites)   presti-pubs.service et presti-pubs.timer, par un analyseur INI
//   UP-R   (--reel)   l'épreuve sur l'usine : minuteur actif, un pack d'essai fabriqué PC éteint, un échantillon d'essai retenu pour Benj
//   --temoin          non-régression seulement : package.json identique à HEAD, npm run typecheck vert
//   --preuve-echecs   sur l'arbre courant UP-1 doit échouer (aucun fichier), puis, sur le TÉMOIN (une référence conforme posée dans les fixtures, jamais
//                     déployée), chaque critère passe ; puis chaque sabotage du témoin fait échouer SON critère ; puis --temoin ; écrit sa part de
//                     .orchestre/preuves/026-199/echecs-attendus.md
//
// Codes : 0 tout vert · 1 au moins un critère en échec · 2 usage, ou infrastructure absente (usine injoignable).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { DEPOT, LINUX, TRAVAIL, lf, court } from './fixtures/026-usine-pubs/commun.mjs'
import { creerSortie } from './fixtures/026-usine-pubs/sortie.mjs'
import { jouerFichiers, jouerUnites } from './fixtures/026-usine-pubs/parties/unites.mjs'
import { jouerRoutes } from './fixtures/026-usine-pubs/parties/routes.mjs'

const NOM = 'usine-pubs-qa'
const MOI = fileURLToPath(import.meta.url)
const PARTIES = { routes: ['UP-2', 'UP-3', 'UP-4', 'UP-5'], tourneur: ['UP-6', 'UP-7', 'UP-8', 'UP-9'], unites: ['UP-10'] }
const TEMOIN = path.join(DEPOT, 'scripts', 'fixtures', '026-usine-pubs', 'temoin')

// ── les options ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function lireOptions(argv) {
  const o = { racine: null, parties: null, temoin: false, preuve: false, reel: false, etape: null, decision: null, marque: null }
  for (const a of argv) {
    let m
    if ((m = /^--racine=(.+)$/.exec(a))) o.racine = path.resolve(m[1])
    else if ((m = /^--partie=(.+)$/.exec(a))) { o.parties = m[1].split(',').map((x) => x.trim()).filter(Boolean); if (!o.parties.length || o.parties.some((p) => !PARTIES[p])) throw new Error(`--partie=${Object.keys(PARTIES).join(',')} attendu (reçu ${m[1]})`) }
    else if (a === '--temoin') o.temoin = true
    else if (a === '--preuve-echecs') o.preuve = true
    else if (a === '--reel') o.reel = true
    else if ((m = /^--etape=(preparer|conclure)$/.exec(a))) o.etape = m[1]
    else if ((m = /^--(decision|marque)=(.+)$/.exec(a))) o[m[1]] = m[2]
    else throw new Error(`option inconnue ou mal formée : ${a}`)
  }
  if (o.temoin && o.preuve) throw new Error('--temoin et --preuve-echecs sont exclusifs')
  if (o.reel && (o.temoin || o.preuve || o.racine || o.parties)) throw new Error('--reel se lance seul, sur la racine du dépôt (ni --temoin, ni --preuve-echecs, ni --racine, ni --partie)')
  if (o.etape && !o.reel) throw new Error('--etape n\'a de sens qu\'avec --reel')
  return o
}

// ── la non-régression (--temoin) ─────────────────────────────────────────────────────────────────────────────────────────
export function nonRegression(racine) {
  const h = spawnSync('git', ['show', 'HEAD:package.json'], { cwd: DEPOT, encoding: 'utf8', windowsHide: true })
  let courant = null
  try { courant = fs.readFileSync(path.join(racine, 'package.json'), 'utf8') } catch { /* absent */ }
  if (h.status !== 0 || courant === null || lf(h.stdout) !== lf(courant)) return { ok: false, detail: 'package.json diffère de celui du HEAD (rien ne s\'installe : jamais npm install)' }
  const r = spawnSync('npm', ['run', 'typecheck'], { cwd: racine, shell: process.platform === 'win32', encoding: 'utf8', windowsHide: true, timeout: 20 * 60_000, maxBuffer: 1 << 26 })
  return { ok: r.status === 0, detail: r.status === 0 ? 'package.json identique au HEAD ; npm run typecheck vert' : `npm run typecheck en échec (code ${r.status})`, brut: `${r.stdout || ''}${r.stderr || ''}` }
}

// ── le tourneur : sous Linux, ici ; ailleurs, sur l'usine ──────────────────────────────────────────────────────────────────
async function tourneurIci(args) {
  const m = await import('./fixtures/026-usine-pubs/parties/tourneur.mjs')
  return m.jouerTourneur(args)
}
/** Sur le poste : le juge se relance lui-même sur l'usine (scripts/usine.mjs executer), même règle que 026-165 ; usine injoignable → code 2. */
export function surUsine(options) {
  const r = spawnSync(process.execPath, [path.join(DEPOT, 'scripts', 'usine.mjs'), 'executer', '--nom=pubs', '--delai=25', '--', 'node', '--import', './scripts/ts-loader.mjs', 'scripts/usine-pubs-qa.mjs', ...options], { cwd: DEPOT, encoding: 'utf8', windowsHide: true, timeout: 30 * 60_000, maxBuffer: 1 << 27 })
  const sortie = `${r.stdout || ''}`
  const lignes = sortie.split(/\r?\n/).map((l) => /^(PASS|FAIL) (UP-\d+|NR) — (.*)$/.exec(l)).filter(Boolean).map((m) => ({ verdict: m[1], id: m[2], detail: m[3] }))
  const fin = /^usine-pubs-qa(?: --\S+)* : (PASS|FAIL)(?: — (.*))?$/m.exec(sortie)
  const joint = sortie.split(/\r?\n/).find((l) => l.startsWith('@@UP-PREUVE '))
  let preuve = null
  try { preuve = joint ? JSON.parse(joint.slice('@@UP-PREUVE '.length)) : null } catch { /* illisible */ }
  return { code: r.status, lignes, fin, preuve, brut: sortie, erreur: `${r.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-3).join(' | ') }
}

/** Les dossiers d'essai d'un passage interrompu (plus de 6 h) : effacés, jamais les autres. */
function purgerAnciens() {
  try {
    for (const e of fs.readdirSync(TRAVAIL, { withFileTypes: true })) {
      if (!e.isDirectory() || !/^(bac|routes|sabotage|arbre-vide)-/.test(e.name)) continue
      const p = path.join(TRAVAIL, e.name)
      if (Date.now() - fs.statSync(p).mtimeMs > 6 * 3600 * 1000) fs.rmSync(p, { recursive: true, force: true })
    }
  } catch { /* le dossier n'existe pas encore */ }
}

async function principal() {
  let o
  try { o = lireOptions(process.argv.slice(2)) } catch (e) { console.error(`✗ ${NOM} : ${e.message}`); process.exitCode = 2; return }
  purgerAnciens()

  if (o.reel) {
    const { jouerReel } = await import('./fixtures/026-usine-pubs/parties/reel.mjs')
    process.exitCode = await jouerReel({ etape: o.etape, nom: NOM })
    return
  }
  if (o.preuve) {
    const { jouerPreuveEchecs } = await import('./fixtures/026-usine-pubs/preuve-echecs.mjs')
    process.exitCode = await jouerPreuveEchecs({ parties: o.parties, nom: NOM, moi: MOI, nonRegression, surUsine })
    return
  }
  const racine = o.racine ?? DEPOT
  if (!fs.existsSync(racine) || !fs.statSync(racine).isDirectory()) { console.error(`✗ ${NOM} : --racine=${racine} : dossier introuvable`); process.exitCode = 2; return }
  if (o.temoin) {
    const s = creerSortie(NOM, ['NR'], { racine, temoin: true })
    const n = nonRegression(racine)
    if (n.ok) s.passe('NR', n.detail); else s.echoue('NR', n.detail)
    process.exitCode = s.fin().code
    return
  }

  const parties = o.parties ?? Object.keys(PARTIES)
  const ids = ['UP-1', ...parties.flatMap((p) => PARTIES[p])]
  const s = creerSortie(NOM, ids, { racine })
  fs.mkdirSync(TRAVAIL, { recursive: true })
  try {
    const fichiers = jouerFichiers({ racine, s })
    if (!fichiers) { for (const id of ids.filter((x) => x !== 'UP-1')) s.echoue(id, 'non évalué : des fichiers manquent (UP-1)') }
    else {
      if (parties.includes('unites')) jouerUnites({ racine, s })
      if (parties.includes('routes')) await jouerRoutes({ racine, s })
      if (parties.includes('tourneur')) {
        if (LINUX) await tourneurIci({ racine, s })
        else {
          s.note('tourneur : Linux seulement ; ce poste n\'en est pas un, le juge se relance sur l\'usine (scripts/usine.mjs executer)')
          const u = surUsine(['--partie=tourneur', ...(o.racine ? [`--racine=${path.relative(DEPOT, racine).split(path.sep).join('/')}`] : [])])
          if (!u.lignes.length || !u.fin) { console.error(`✗ ${NOM} : usine injoignable ou verdict non rendu (code ${u.code}) : ${u.erreur || court(u.brut, 200)}`); process.exitCode = 2; return }
          for (const l of u.lignes.filter((x) => PARTIES.tourneur.includes(x.id))) (l.verdict === 'PASS' ? s.passe : s.echoue).call(s, l.id, l.detail)
        }
      }
    }
  } catch (e) {
    for (const id of ids) if (!s.evalue(id)) s.echoue(id, `interrompu : ${court(e?.stack || e?.message || e, 240)}`)
  }
  process.exitCode = s.fin().code
}

if (process.argv[1] && path.resolve(process.argv[1]) === MOI) await principal()
