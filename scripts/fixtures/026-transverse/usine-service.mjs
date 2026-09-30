// scripts/fixtures/026-transverse/usine-service.mjs — le BANC d'essai du service scripts/usine/telegram.mjs (fiche 026-194, Claude Code).
// Un banc = un faux Telegram + un faux Presti (127.0.0.1, ports libres) + un dossier d'essai + des jetons tirés au hasard + les processus
// du service lancés depuis la racine jugée, avec l'horloge accélérée (usine-horloge.mjs). Le banc consigne tout (requêtes des faux serveurs,
// sorties des processus, événements fetch de l'horloge) : le juge ne se fie à aucun journal écrit par le code jugé.
// Aucun processus ne survit au juge : chaque banc les tue à la fermeture, et un garde-fou global les tue à la sortie du juge.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { creerFauxTelegram } from './faux-telegram.mjs'
import { creerFauxPresti, adresseMorte } from './faux-presti.mjs'
import { DEPART } from './usine-horloge.mjs'
import { tirerJeton, tirerCode, jsonFixture } from './commun.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const HORLOGE_URL = `${pathToFileURL(path.join(ICI, 'usine-horloge.mjs')).href}?actif=1`
export const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms))

// ── Garde-fou : aucun processus orphelin ─────────────────────────────────────────────────────────────────────────────
const VIVANTS = new Set()
const tuerTout = () => { for (const c of VIVANTS) { try { c.kill('SIGKILL') } catch { /* déjà mort */ } } }
process.on('exit', tuerTout)
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(sig, () => { tuerTout(); process.exit(130) })

const tirerEntier = (min, max) => min + (Number.parseInt(tirerJeton('n').slice(2, 10), 16) % (max - min))

export async function attendre(condition, { max = 8000, pas = 20 } = {}) {
  const t0 = Date.now()
  for (;;) {
    try { if (await condition()) return true } catch { /* pas encore */ }
    if (Date.now() - t0 > max) return false
    await dormir(pas)
  }
}

/** Le texte d'un dossier d'essai, fichier par fichier : [{ chemin, texte }] (les binaires sont lus en latin1, sans perte de sous-chaînes ASCII). */
export function lireDossier(dossier) {
  const out = []
  const marche = (d) => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); if (e.isDirectory()) marche(p); else if (e.isFile()) { try { out.push({ chemin: path.relative(dossier, p), texte: fs.readFileSync(p, 'latin1') }) } catch { /* illisible */ } } } }
  marche(dossier)
  return out
}

/** Tous les processus dont la ligne de commande porte une des chaînes (Linux : /proc) ; [] ailleurs. */
export function cmdlinesContenant(chaines) {
  const out = []
  try {
    for (const pid of fs.readdirSync('/proc').filter((x) => /^\d+$/.test(x))) {
      let t = ''
      try { t = fs.readFileSync(`/proc/${pid}/cmdline`, 'latin1') } catch { continue }
      for (const c of chaines) if (c && t.includes(c)) out.push({ pid: Number(pid), chaine: c })
    }
  } catch { /* pas de /proc */ }
  return out
}

/** Les sockets TCP en ÉCOUTE (état 0A) appartenant à un pid : [{ adresse, port }] ; null si /proc est illisible. */
export function ecoutesTcp(pid) {
  try {
    const inodes = new Set()
    for (const fd of fs.readdirSync(`/proc/${pid}/fd`)) { try { const l = fs.readlinkSync(`/proc/${pid}/fd/${fd}`); const m = /^socket:\[(\d+)\]$/.exec(l); if (m) inodes.add(m[1]) } catch { /* fd fermé */ } }
    const out = []
    for (const f of ['tcp', 'tcp6']) {
      for (const l of fs.readFileSync(`/proc/net/${f}`, 'utf8').split('\n').slice(1)) {
        const c = l.trim().split(/\s+/)
        if (c.length > 9 && c[3] === '0A' && inodes.has(c[9])) out.push({ adresse: c[1], port: parseInt(c[1].split(':')[1], 16) })
      }
    }
    return out
  } catch { return null }
}

class Proc {
  constructor(banc, nom, enfant, argv) {
    this.banc = banc; this.nom = nom; this.enfant = enfant; this.pid = enfant.pid; this.argv = argv
    this.stdout = ''; this.stderr = ''; this.evenements = []; this.enVol = new Map(); this.temps = DEPART
    this.code = null; this.signal = null; this.sorti = false; this.cmdlines = []
    this.ferme = new Promise((ok) => { this._ok = ok })
    enfant.stdout.on('data', (d) => { this.stdout += d.toString('utf8') })
    enfant.stderr.on('data', (d) => { this.stderr += d.toString('utf8') })
    enfant.on('message', (m) => {
      if (!m) return
      if (m.t === 'fetch') { this.evenements.push(m); this.enVol.set(m.id, m.url) }
      else if (m.t === 'fin') this.enVol.delete(m.id)
      else if (m.t === 'pret' || m.t === 'fait') this.temps = m.ms
      if (m.t === 'fait') this._fait?.(m)
    })
    enfant.on('exit', (code, signal) => { this.code = code; this.signal = signal; this.sorti = true; VIVANTS.delete(enfant) })
    enfant.on('close', () => { this.sorti = true; this._ok() })
    enfant.on('error', (e) => { this.stderr += `\n[juge] erreur de lancement : ${e.message}\n`; this.sorti = true; this._ok() })
    this.echantillonnerCmdline()
  }
  /** La ligne de commande réelle vue par le noyau (argv) : à consigner pour PT-10. */
  echantillonnerCmdline() { try { const t = fs.readFileSync(`/proc/${this.pid}/cmdline`, 'latin1'); if (t && !this.cmdlines.includes(t)) this.cmdlines.push(t) } catch { /* processus fini */ } }
  journal() { return `${this.stdout}\n${this.stderr}`.split(/\r?\n/).filter((l) => l.trim() !== '') }
  enAttenteDeMiseAJour() { return [...this.enVol.values()].some((u) => /getUpdates/.test(u)) }
  fetchs(motif) { return this.evenements.filter((e) => motif.test(e.url)) }
  /** Fait avancer le temps virtuel de ms ; rend quand le service est calme ou sorti. */
  avancer(ms, delai = 60_000) {
    if (this.sorti || !this.enfant.connected) return Promise.resolve(false)
    const id = ++this.banc.seqIpc
    return new Promise((ok) => {
      const fin = (v) => { clearTimeout(t); this._fait = null; ok(v) }
      const t = setTimeout(() => fin(false), delai)
      this._fait = (m) => { if (m.id === id) fin(true) }
      this.enfant.once('exit', () => fin(false))
      try { this.enfant.send({ t: 'avancer', id, ms }) } catch { fin(false) }
    })
  }
  async arreter(signal = 'SIGKILL') { if (!this.sorti) { try { this.enfant.kill(signal) } catch { /* déjà mort */ } await Promise.race([this.ferme, dormir(3000)]) } }
}

export class Banc {
  constructor({ racine, travail, nom, chat = 'benj', code = 'juste' }) {
    this.racine = racine; this.nom = nom; this.seqIpc = 0
    this.dossier = path.join(travail, nom)
    this.jetonBot = tirerJeton('bot'); this.jetonAgent = tirerJeton('agent')
    this.benj = String(tirerEntier(300_000_000, 900_000_000))
    this.autre = `${this.benj}${tirerEntier(1, 9)}`        // la conversation de Benj est un PRÉFIXE de celle-ci
    this.autre2 = `-${this.benj}`                           // même valeur absolue, signe contraire (un groupe)
    this.nouveau = String(tirerEntier(900_000_001, 999_999_999))
    this.code = tirerCode()
    do { this.codeFaux = tirerCode() } while (this.codeFaux === this.code)
    this.chatEnv = chat === 'aucun' ? 'aucun' : this.benj
    this.codeEnv = code === 'epuise' ? 'epuise' : this.code
    this.procs = []; this.msg = 0; this.ecoule = 0
    this.telegram = null; this.presti = null; this.baseMorte = null
  }
  async ouvrir({ baseMorte = false } = {}) {
    fs.rmSync(this.dossier, { recursive: true, force: true })
    fs.mkdirSync(path.join(this.dossier, 'home'), { recursive: true }); fs.mkdirSync(path.join(this.dossier, 'tmp'), { recursive: true })
    this.telegram = await creerFauxTelegram({ jeton: this.jetonBot })
    this.presti = await creerFauxPresti({ jeton: this.jetonAgent })
    this.baseMorte = baseMorte ? await adresseMorte() : null
    this.etat = path.join(this.dossier, 'etat', 'etat.json')
    fs.mkdirSync(path.dirname(this.etat), { recursive: true })
    return this
  }
  env() {
    return { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: path.join(this.dossier, 'home'), TMPDIR: path.join(this.dossier, 'tmp'), LANG: 'C.UTF-8', TZ: 'UTC', NO_PROXY: '127.0.0.1,localhost',
      TELEGRAM_BOT_TOKEN: this.jetonBot, PRESTI_JETON_TELEGRAM: this.jetonAgent, TELEGRAM_CHAT_ID: this.chatEnv, TELEGRAM_CODE_APPAIRAGE: this.codeEnv }
  }
  /** Lance le service depuis la racine jugée. { horloge: false } : sans horloge accélérée (temps réel). */
  lancer(nom = 'A', { args = ['--service'], horloge = true, etat = this.etat } = {}) {
    const argv = [...args, `--base=${this.baseMorte ?? this.presti.url}`, `--telegram=${this.telegram.url}`, `--etat=${etat}`]
    const pre = horloge ? [`--import=${HORLOGE_URL}`] : []
    const enfant = spawn(process.execPath, [...pre, 'scripts/usine/telegram.mjs', ...argv], { cwd: this.racine, env: this.env(), stdio: ['ignore', 'pipe', 'pipe', horloge ? 'ipc' : 'ignore'] })
    VIVANTS.add(enfant)
    const p = new Proc(this, nom, enfant, argv)
    this.procs.push(p)
    this.ecoule = 0
    return p
  }
  vivants() { return this.procs.filter((p) => !p.sorti) }
  /** Attend que le service soit en attente de mises à jour (long polling en cours) ou sorti. */
  async pret(p, max = 8000) { const ok = await attendre(() => p.sorti || p.enAttenteDeMiseAJour(), { max }); p.echantillonnerCmdline(); return ok && !p.sorti }
  /** Avance le temps virtuel de tous les processus vivants, par pas, en relâchant le long polling à chaque pas. */
  async avancerPar(ms, pas = 15_000) {
    for (let fait = 0; fait < ms; fait += pas) {
      const d = Math.min(pas, ms - fait)
      await Promise.all(this.vivants().map((p) => p.avancer(d)))
      this.ecoule += d
      this.telegram.relacher()
      await dormir(4)
    }
    for (const p of this.procs) p.echantillonnerCmdline()
  }
  maintenantSec() { return Math.floor((DEPART + this.ecoule) / 1000) }
  /** Poste un message d'une conversation (benj | autre | autre2 | nouveau) ; rend l'update complet (pour rejouer). */
  poster(de, texte) {
    const id = String(this[de] ?? de)
    const cmd = /^\/[A-Za-z_]+/.exec(texte)
    const update = { message: { message_id: ++this.msg, date: this.maintenantSec(), chat: { id: Number(id), type: 'private' }, from: { id: Number(id), is_bot: false, first_name: 'Essai', language_code: 'fr' }, text: texte, ...(cmd ? { entities: [{ type: 'bot_command', offset: 0, length: cmd[0].length }] } : {}) } }
    const uid = this.telegram.poster(update)
    return { update_id: uid, ...update }
  }
  /** Développe un scénario de updates.json et le poste ; rend les updates postés. */
  scenario(nom) {
    const sc = jsonFixture('updates.json').scenarios[nom]
    if (!sc) throw new Error(`scénario inconnu : ${nom}`)
    const out = []
    for (const l of sc) {
      const textes = l.cycle ? Array.from({ length: l.fois }, (_, i) => l.cycle[i % l.cycle.length]) : [l.texte]
      for (const t of textes) out.push(this.poster(l.de, t.replaceAll('{{CODE_FAUX}}', this.codeFaux).replaceAll('{{CODE}}', this.code).replaceAll('{{N}}', String(out.length + 1))))
    }
    return out
  }
  /** Attend que le service ait acquitté (offset) tous les updates jusqu'à idMax, puis laisse le temps à un envoi fautif de se montrer. */
  async acquittes(idMax, { max = 6000, residu = 350 } = {}) { const ok = await attendre(() => this.telegram.offsetMax() >= idMax + 1, { max }); await dormir(residu); return ok }
  /** Barrière : un /etat de Benj reçoit sa réponse ; tout ce qui a été posté avant a donc été traité. */
  async barriere(max = 8000) {
    const avant = this.telegram.envoisVers(this.benj).length
    const appelsAvant = this.presti.commandes().length
    this.poster('benj', '/etat')
    return attendre(() => this.telegram.envoisVers(this.benj).length > avant && this.presti.commandes().length > appelsAvant, { max })
  }
  /** Tout ce qui est écrit sous le dossier d'essai (jamais lu par le service jugé comme journal : ce sont ses propres fichiers). */
  fichiers() { return lireDossier(this.dossier) }
  async fermer() {
    for (const p of this.procs) await p.arreter('SIGKILL')
    await this.telegram?.fermer(); await this.presti?.fermer()
  }
}

/** La valeur `v` (nombre ou chaîne) se trouve-t-elle quelque part dans un JSON ? (les clés de l'état ne sont pas imposées par le contrat) */
export function jsonContient(texte, v) {
  let x; try { x = JSON.parse(texte) } catch { return String(texte).includes(String(v)) }
  const chercher = (n) => (n === null || n === undefined ? false : typeof n === 'object' ? Object.values(n).some(chercher) : String(n) === String(v) || (typeof n === 'string' && n.split(/[^0-9A-Za-z_-]+/).includes(String(v))))
  return chercher(x)
}
