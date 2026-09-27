#!/usr/bin/env node
// TÉMOIN de chef-qa (026-102) — `node scripts/chef/cycle.mjs --mode=plein|leger [--base=…] [--minutes=15] [--reprise]`
// (le vrai : 026-127, puis 026-129). Verrou, quota, état, garde contre deux chefs, consignes, modèle sans réseau ni
// secret, fil verifier, appliquer, fil poster, et une ligne de journal.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { RACINE, TRAVAIL, Arret, option, args, baseSure, horodatage, lireJson, ecrireJson, principal } from './commun.mjs'

const WIN = process.platform === 'win32'
const ICI = path.join(RACINE, 'scripts', 'chef')
const JOURNAL = path.join(TRAVAIL, 'cycles.jsonl')
const VERROU = path.join(TRAVAIL, 'cycle.lock')
const QUOTAS = path.join(RACINE, '.orchestre', 'quotas.json')
const TRENTE_MIN = 30 * 60_000

function lancer(commande, argv, { env = process.env, delaiMs = 0 } = {}) {
  return new Promise((resoudre) => {
    const enfant = spawn(commande, argv, { cwd: RACINE, env, windowsHide: true, detached: !WIN, stdio: ['ignore', 'pipe', 'pipe'] })
    let sortie = ''
    let delai = false
    enfant.stdout.on('data', (d) => { sortie += d })
    enfant.stderr.on('data', (d) => { sortie += d })
    const minuterie = delaiMs ? setTimeout(() => { delai = true; tuerArbre(enfant.pid) }, delaiMs) : null
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: String(e.message), delai }) })
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: code ?? 1, sortie, delai }) })
  })
}
function tuerArbre(pid) {
  try {
    if (WIN) spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* déjà mort */ }
}
const node = (script, argv) => lancer(process.execPath, [path.join(ICI, script), ...argv])

function prendreVerrou() {
  fs.mkdirSync(TRAVAIL, { recursive: true })
  for (let essai = 0; essai < 2; essai++) {
    try {
      fs.writeFileSync(VERROU, JSON.stringify({ pid: process.pid, le: new Date().toISOString() }), { flag: 'wx' })
      return true
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      let age = 0
      try { age = Date.now() - fs.statSync(VERROU).mtimeMs } catch { continue }
      if (age < TRENTE_MIN) return false
      try { fs.unlinkSync(VERROU) } catch { /* pris entre-temps */ }
    }
  }
  return false
}

function quotaActif() {
  const q = lireJson(QUOTAS, {})?.codex
  const jusqua = q?.jusqua ? Date.parse(q.jusqua) : NaN
  return Number.isFinite(jusqua) && jusqua > Date.now()
}
function noterQuota(sortie) {
  const m = sortie.match(/try again at ([^\n.]+(?:\.\d+)?[^\n.]*)/i)
  let jusqua = m ? Date.parse(m[1].replace(/(\d)(st|nd|rd|th)\b/g, '$1').trim()) : NaN
  if (!Number.isFinite(jusqua) || jusqua <= Date.now()) jusqua = Date.now() + 6 * 3_600_000
  const q = lireJson(QUOTAS, {}) || {}
  q.codex = { jusqua: new Date(jusqua).toISOString(), vu: new Date().toISOString(), message: (sortie.match(/[^\n]*usage limit[^\n]*/i)?.[0] || 'limite d\'usage').slice(0, 300) }
  ecrireJson(QUOTAS, q)
}

function chefRecent(entree) {
  try {
    const t = fs.readFileSync(entree, 'utf8')
    const i = t.indexOf('<donnees_etat>')
    const j = t.indexOf('</donnees_etat>')
    const etat = JSON.parse(t.slice(i + '<donnees_etat>'.length, j))
    const chef = (etat.agents || []).find((a) => a.nom === 'chef')
    const b = chef?.battement_le ? Date.parse(chef.battement_le) : NaN
    return Number.isFinite(b) && Date.now() - b < 3 * 3_600_000
  } catch { return false }
}

function environnementDuModele() {
  const env = {}
  for (const n of ['PATH', 'HOME', 'LANG', 'TZ', 'CODEX_HOME']) if (process.env[n]) env[n] = process.env[n]
  return env
}

principal(async () => {
  const mode = option('mode')
  if (!['plein', 'leger'].includes(mode)) throw new Arret(2, '--mode=plein|leger')
  const base = option('base') ? baseSure(option('base')) : null
  const minutes = Number(option('minutes', 15))
  const reprise = args.includes('--reprise')
  const usine = process.env.PRESTI_HOTE === 'usine'
  const modele = mode === 'plein' ? 'gpt-6-sol' : 'gpt-6-luna'
  const debut = new Date()
  const ligne = { mode, modele, debut: debut.toISOString(), duree_s: 0, taches: 0, decisions: 0, evenements: [], code: null }
  const journal = (code) => {
    ligne.code = code
    ligne.duree_s = Math.round((Date.now() - debut.getTime()) / 1000)
    fs.mkdirSync(TRAVAIL, { recursive: true })
    fs.appendFileSync(JOURNAL, JSON.stringify(ligne) + '\n')
  }
  const b = base ? [`--base=${base}`] : []

  if (!prendreVerrou()) { console.log('cycle déjà en cours'); return 0 }
  try {
    if (quotaActif()) { console.log('✗ quota Codex actif : cycle sauté'); journal('quota'); return 3 }
    const dossier = path.join(TRAVAIL, horodatage())
    fs.mkdirSync(dossier, { recursive: true })
    const entree = path.join(dossier, 'entree.md')
    const plan = path.join(dossier, 'plan.json')

    const e = await node('etat.mjs', [`--sortie=${entree}`, ...b])
    if (e.code !== 0) { console.error(e.sortie.trim()); journal(1); return 1 }
    if (!usine && !reprise && chefRecent(entree)) { console.log("le chef tourne sur l'usine : rien à faire ici (--reprise pour reprendre)"); return 0 }
    const c = await node('consignes.mjs', [`--entree=${entree}`, ...b])
    if (c.code !== 0) { console.error(c.sortie.trim()); journal(1); return 1 }

    const bin = process.env.ORCHESTRE_CODEX_BIN || 'codex'
    const [commande, avant] = /\.m?js$/.test(bin) ? [process.execPath, [bin]] : [bin, []]
    const instruction = `Lis docs/agents/chef.md puis ${entree} et ecris le plan du cycle ${mode} dans ${plan} : un seul fichier JSON conforme a docs/agents/chef-plan.schema.json, rien d autre.`
    const argv = ['exec', '-C', RACINE, '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=false', '--skip-git-repo-check', '--color', 'never', '-o', path.join(dossier, 'dernier-message.md'), '-m', modele, instruction]
    const m = await lancer(commande, [...avant, ...argv], { env: environnementDuModele(), delaiMs: minutes * 60_000 })
    if (m.delai) { console.error(`✗ le modèle a dépassé ${minutes} min : arbre tué, rien d'appliqué`); journal('delai'); return 1 }
    if (/hit your usage limit/i.test(m.sortie)) { noterQuota(m.sortie); console.error('✗ quota Codex atteint'); journal('quota'); return 3 }
    let taille = 0
    try { taille = fs.statSync(plan).size } catch { taille = 0 }
    if (!taille) { console.error('✗ plan absent ou vide : rien d\'appliqué'); journal(1); return 1 }

    const v = await node('fil.mjs', ['verifier', plan, `--consignes=${path.join(TRAVAIL, 'consignes.json')}`])
    if (v.code !== 0) { console.error(v.sortie.trim()); journal(1); return 1 }
    const a = await node('appliquer.mjs', [plan, `--cycle=${mode}`, ...b])
    const rapports = fs.readdirSync(TRAVAIL).filter((f) => /^appliquer-.*\.json$/.test(f)).map((f) => path.join(TRAVAIL, f))
      .filter((f) => fs.statSync(f).mtimeMs >= debut.getTime() - 1000).sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)
    const rapport = rapports[0] ? lireJson(rapports[0], {}) : {}
    ligne.taches = rapport.taches ?? 0
    ligne.decisions = rapport.decisions ?? 0
    if (a.code !== 0) { console.error(a.sortie.trim()); journal(a.code); return a.code }
    const f = await node('fil.mjs', ['poster', plan, `--modele=${modele}`, ...b])
    const derniere = f.sortie.trim().split(/\r?\n/).reverse().find((l) => l.startsWith('{"evenements"'))
    try { ligne.evenements = JSON.parse(derniere).evenements } catch { ligne.evenements = [] }
    journal(f.code)
    console.log(`${f.code === 0 ? '✓' : '✗'} cycle ${mode} : ${ligne.taches} tâche(s), ${ligne.decisions} décision(s), ${ligne.evenements.length} événement(s)`)
    return f.code
  } finally {
    try { fs.unlinkSync(VERROU) } catch { /* déjà retiré */ }
  }
})
