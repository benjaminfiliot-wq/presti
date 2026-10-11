// Le BAC du tourneur (usine-pubs-qa, 026-199) : une racine d'essai où `scripts/usine/pubs.mjs` de la racine jugée tourne comme sur l'usine — sous le
// compte « agents », `cwd` = la racine déployée (/srv/presti-agents), un HOME, un TMPDIR, un PATH qui ne contient QUE les doublures du juge (hyperframes,
// ffmpeg, les outils payants…) et un `node` — avec, à la place des scripts du poste, des doublures qui consignent leurs arguments dans un journal que le
// juge relit. Linux seulement (liens symboliques, modes POSIX) : sur le poste, le juge se relance sur l'usine.
//
//   hote/ bac/ (la racine déployée : scripts/usine/ de la racine jugée, ts-loader, lib, doublures des scripts du dépôt, docs/studio/prealables.md)
//         home/ (HOME) · tmp/ (TMPDIR) · bin/ (cales : hyperframes, ffmpeg, ffprobe, codex-lanceur, elevenlabs…) · bin-node/ (node seul) · journal.jsonl · cfg.json
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { ICI, DEPOT, TRAVAIL, hasard, vider, sha256 } from './commun.mjs'

const D = path.join(ICI, 'doublures-outils')
const url = (f) => pathToFileURL(f).href
export const OUTILS_PAYANTS = ['elevenlabs', 'veo', 'kling', 'heygen']

/** Le faux outil du PATH : une cale `sh` qui lance la doublure avec le chemin de la configuration. */
function cale(fichier, doublure, cfg, ...args) {
  fs.writeFileSync(fichier, `#!/bin/sh\nexec "${process.execPath}" "${path.join(D, doublure)}" "${cfg}" ${args.map((a) => `"${a}"`).join(' ')} "$@"\n`, { mode: 0o755 })
}
/** Une doublure d'un script du dépôt : le fichier du bac passe la main à la doublure du juge, la configuration insérée en 3e argument. */
function stub(fichier, doublure, cfg, ...args) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true })
  fs.writeFileSync(fichier, `process.argv.splice(2, 0, ${JSON.stringify(cfg)}, ...${JSON.stringify(args)})\nawait import(${JSON.stringify(url(path.join(D, doublure)))})\n`)
}

/** Les fichiers de lib/ : ceux de la racine jugée l'emportent, le reste vient du dépôt (liens, jamais d'écriture à travers un lien). */
function monterLib(bac, racine) {
  const cible = path.join(bac, 'lib')
  const jugee = path.join(racine, 'lib'), depot = path.join(DEPOT, 'lib')
  if (path.resolve(racine) === path.resolve(DEPOT) || !fs.existsSync(jugee)) { fs.symlinkSync(depot, cible, 'dir'); return }
  fs.mkdirSync(cible)
  const noms = new Set([...fs.readdirSync(depot), ...fs.readdirSync(jugee)])
  for (const n of noms) {
    if (fs.existsSync(path.join(jugee, n))) fs.cpSync(path.join(jugee, n), path.join(cible, n), { recursive: true })
    else fs.symlinkSync(path.join(depot, n), path.join(cible, n))
  }
}

/**
 * Prépare un bac. `scenario` : { nom, mode (les modes des doublures), prealables (le texte de docs/studio/prealables.md), outils: { hyperframes: true, ffmpeg: true } }.
 * Rend { hote, bac, home, tmp, bin, journal, cfg, env(url, jeton), lancer(), arreter() }.
 */
export function preparerBac({ racine, nom, mode = {}, prealables = null, jeton, outils = {}, extrait = '' }) {
  const hote = vider(path.join(TRAVAIL, `bac-${nom}-${hasard(6)}`))
  const bac = path.join(hote, 'bac'), home = path.join(hote, 'home'), tmp = path.join(hote, 'tmp'), bin = path.join(hote, 'bin'), binNode = path.join(hote, 'bin-node')
  for (const d of [bac, home, tmp, bin, binNode]) fs.mkdirSync(d, { recursive: true })
  const journal = path.join(hote, 'journal.jsonl'), cfg = path.join(hote, 'cfg.json')
  fs.writeFileSync(journal, '')
  fs.writeFileSync(cfg, JSON.stringify({ journal, jeton, depot: DEPOT, mode, page_extrait: extrait }))
  // la racine déployée
  fs.cpSync(path.join(racine, 'scripts', 'usine'), path.join(bac, 'scripts', 'usine'), { recursive: true })
  fs.cpSync(path.join(DEPOT, 'scripts', 'ts-loader.mjs'), path.join(bac, 'scripts', 'ts-loader.mjs'))
  for (const f of ['package.json', 'tsconfig.json']) fs.copyFileSync(path.join(DEPOT, f), path.join(bac, f))
  fs.symlinkSync(path.join(DEPOT, 'node_modules'), path.join(bac, 'node_modules'), 'dir')
  fs.symlinkSync(path.join(DEPOT, 'app'), path.join(bac, 'app'), 'dir')
  monterLib(bac, racine)
  // les scripts du dépôt que le tourneur lance : les vrais voisins sont là (un import inattendu ne casse pas), leurs points d'entrée sont doublés
  for (const d of ['pack-pub', 'studio', 'lib']) fs.cpSync(path.join(DEPOT, 'scripts', d), path.join(bac, 'scripts', d), { recursive: true })
  stub(path.join(bac, 'scripts', 'pack-pub', 'fabriquer.mjs'), 'fabriquer.mjs', cfg)
  stub(path.join(bac, 'scripts', 'pack-pub', 'exporter.mjs'), 'repli.mjs', cfg, 'exporter.mjs')
  stub(path.join(bac, 'scripts', 'pack-pub', 'deposer.mjs'), 'repli.mjs', cfg, 'deposer.mjs')
  stub(path.join(bac, 'scripts', 'studio', 'deposer-echantillon.mjs'), 'repli.mjs', cfg, 'deposer-echantillon.mjs')
  stub(path.join(bac, 'scripts', 'studio', 'garde.mjs'), 'studio.mjs', cfg, 'garde')
  stub(path.join(bac, 'scripts', 'studio', 'monter.mjs'), 'studio.mjs', cfg, 'monter')
  stub(path.join(bac, 'scripts', 'pub-locale-qa.mjs'), 'juges.mjs', cfg, 'pub-locale-qa')
  stub(path.join(bac, 'scripts', 'pub-qa.mjs'), 'juges.mjs', cfg, 'pub-qa')
  if (prealables !== null) { fs.mkdirSync(path.join(bac, 'docs', 'studio'), { recursive: true }); fs.writeFileSync(path.join(bac, 'docs', 'studio', 'prealables.md'), prealables) }
  // le PATH : les cales du juge, et un `node` (rien d'autre : un hyperframes ou un ffmpeg réels de la machine ne doivent jamais répondre)
  fs.symlinkSync(process.execPath, path.join(binNode, 'node'))
  if (outils.hyperframes !== false) { cale(path.join(bin, 'hyperframes'), 'hyperframes.mjs', cfg); cale(path.join(bin, 'npx'), 'npx.mjs', cfg) } // npx n'existe que pour joindre la doublure : « npx --yes hyperframes@0.8.33 … »
  if (outils.ffmpeg !== false) { cale(path.join(bin, 'ffmpeg'), 'ffmpeg.mjs', cfg, 'ffmpeg'); cale(path.join(bin, 'ffprobe'), 'ffmpeg.mjs', cfg, 'ffprobe') }
  for (const o of OUTILS_PAYANTS) cale(path.join(bin, o), 'payant.mjs', cfg, o)
  cale(path.join(bin, 'codex-lanceur'), 'codex.mjs', cfg)
  const env = (urlPresti) => ({
    PATH: `${bin}:${binNode}`, HOME: home, TMPDIR: tmp, LANG: 'C.UTF-8', TZ: 'Europe/Paris', USER: 'agents',
    PRESTI_JETON_STUDIO: jeton, PRESTI_URL: urlPresti, PRESTI_HOTE: 'usine', CODEX_LANCEUR: path.join(bin, 'codex-lanceur'),
  })
  return {
    hote, bac, home, tmp, bin, journal, cfg, env,
    /** Un passage du tourneur, comme l'unité le lance (cwd = la racine déployée), jusqu'à sa fin ou au délai. */
    lancer(urlPresti, { delaiMs = 90_000, options = [] } = {}) {
      return new Promise((ok) => {
        const t0 = Date.now()
        let sortie = '', erreur = ''
        const e = spawn(process.execPath, ['--import', './scripts/ts-loader.mjs', 'scripts/usine/pubs.mjs', '--une-passe', `--base=${urlPresti}`, ...options], { cwd: bac, env: env(urlPresti), stdio: ['ignore', 'pipe', 'pipe'] })
        e.stdout.on('data', (d) => { sortie += d }); e.stderr.on('data', (d) => { erreur += d })
        const minuteur = setTimeout(() => { try { e.kill('SIGKILL') } catch { /* déjà fini */ } }, delaiMs)
        e.on('close', (code, signal) => { clearTimeout(minuteur); ok({ code, signal, stdout: sortie, stderr: erreur, ms: Date.now() - t0, delai: signal === 'SIGKILL' && Date.now() - t0 >= delaiMs - 50 }) })
        e.on('error', (x) => { clearTimeout(minuteur); ok({ code: null, signal: null, stdout: sortie, stderr: String(x), ms: Date.now() - t0, delai: false }) })
      })
    },
    evenements() {
      return fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).map((l) => { try { const o = JSON.parse(l); return { ...o, t: BigInt(o.t) } } catch { return null } }).filter(Boolean)
    },
    arreter() { fs.rmSync(hote, { recursive: true, force: true }) },
  }
}

/** L'arbre d'un dossier : chemin relatif → { type, taille, mode, sha256 } (les liens ne sont pas suivis). */
export function arbre(racine) {
  const sortie = new Map()
  const marche = (d) => {
    let entrees = []
    try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entrees) {
      const p = path.join(d, e.name), rel = path.relative(racine, p).split(path.sep).join('/')
      const st = fs.lstatSync(p)
      if (st.isSymbolicLink()) { sortie.set(rel, { type: 'lien', taille: 0, mode: st.mode & 0o777, sha256: '' }); continue }
      if (st.isDirectory()) { sortie.set(rel, { type: 'dossier', taille: 0, mode: st.mode & 0o777, sha256: '' }); marche(p) }
      else sortie.set(rel, { type: 'fichier', taille: st.size, mode: st.mode & 0o777, sha256: sha256(fs.readFileSync(p)) })
    }
  }
  marche(racine)
  return sortie
}
/** Ce qui est apparu ou a changé entre deux arbres. */
export function difference(avant, apres) {
  const nouveaux = [], modifies = []
  for (const [k, v] of apres) { const a = avant.get(k); if (!a) nouveaux.push(k); else if (a.sha256 !== v.sha256 || a.type !== v.type) modifies.push(k) }
  return { nouveaux, modifies }
}
