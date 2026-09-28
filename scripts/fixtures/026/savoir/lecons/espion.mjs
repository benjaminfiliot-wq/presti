// scripts/fixtures/026/savoir/lecons/espion.mjs — l'espion du juge savoir-lecons-qa (fiche 026-234, écrit par Claude Code).
//
// Chargé par `node --import <ce fichier> …` dans CHAQUE processus que le juge lance contre la production (lecons.mjs,
// lecons-entree.mjs, etat.mjs, la sonde du lecteur). Il consigne, dans le fichier ESPION_JOURNAL (une ligne JSON par fait),
// ce que le processus FAIT, jamais ce qu'il dit avoir fait :
//   { type: 'processus', fonction, commande, args, shell }  chaque processus enfant (spawn, spawnSync, exec, execSync,
//                                                           execFile, execFileSync, fork) ; `git` est refusé (levée).
//   { type: 'reseau', url }                                  chaque fetch / http(s).request ; hors 127.0.0.1 et
//                                                           localhost : refusé (levée), consigné avec `refuse: true`.
//   { type: 'ouverture', chemin }                            chaque lecture d'un fichier sous ESPION_OUVERTURES (préfixe
//                                                           de chemin absolu), s'il est posé.
//   { type: 'marque', etape }                               posée par la sonde elle-même (globalThis.__espionMarque).
// Les exports nommés des modules intégrés sont resynchronisés (syncBuiltinESMExports) : un `import { spawnSync }` voit
// la version espionnée. Aucun secret, aucune donnée : des chemins, des commandes, des adresses.
import fs from 'node:fs'
import path from 'node:path'
import cp from 'node:child_process'
import http from 'node:http'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'

const JOURNAL = process.env.ESPION_JOURNAL || ''
const PREFIXE = process.env.ESPION_OUVERTURES ? path.resolve(process.env.ESPION_OUVERTURES).toLowerCase() : ''
const appendOrig = fs.appendFileSync.bind(fs)
function noter(o) {
  if (!JOURNAL) return
  try { appendOrig(JOURNAL, `${JSON.stringify({ pid: process.pid, le: Date.now(), ...o })}\n`) } catch { /* l'espion ne casse jamais le processus */ }
}
globalThis.__espionMarque = (etape) => noter({ type: 'marque', etape })

// ── processus enfants ───────────────────────────────────────────────────────────────────────────────────────────────
const RE_GIT = /(^|[\\/])git(\.exe|\.cmd|\.bat)?$/i
for (const nom of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
  const orig = cp[nom]
  if (typeof orig !== 'function') continue
  cp[nom] = function espionne(commande, ...reste) {
    const args = Array.isArray(reste[0]) ? reste[0].map(String) : []
    const opts = (Array.isArray(reste[0]) ? reste[1] : reste[0])
    const shell = opts && typeof opts === 'object' ? (opts.shell ?? null) : null
    const premier = String(commande ?? '').trim().split(/\s+/)[0].replace(/^["']|["']$/g, '')
    noter({ type: 'processus', fonction: nom, commande: String(commande ?? ''), args, shell })
    if (RE_GIT.test(premier)) throw new Error('espion du juge : git refusé')
    return orig.call(this, commande, ...reste)
  }
}

// ── réseau : 127.0.0.1 et localhost seulement ──────────────────────────────────────────────────────────────────────
const local = (h) => h === '127.0.0.1' || h === 'localhost' || h === '[::1]' || h === '::1'
if (typeof globalThis.fetch === 'function') {
  const fetchOrig = globalThis.fetch
  globalThis.fetch = function fetchEspionne(entree, init) {
    const url = typeof entree === 'string' ? entree : entree?.url ?? String(entree)
    let hote = ''
    try { hote = new URL(url).hostname } catch { hote = '' }
    if (!local(hote)) { noter({ type: 'reseau', url, refuse: true }); return Promise.reject(new TypeError('espion du juge : réseau hors 127.0.0.1 refusé')) }
    noter({ type: 'reseau', url })
    return fetchOrig.call(this, entree, init)
  }
}
for (const mod of [http, https]) {
  for (const nom of ['request', 'get']) {
    const orig = mod[nom]
    mod[nom] = function requeteEspionne(a, b, c) {
      let hote = ''
      let url = ''
      try { const u = typeof a === 'string' || a instanceof URL ? new URL(String(a)) : null; hote = u ? u.hostname : (a?.hostname || a?.host || ''); url = u ? u.href : `${a?.hostname || a?.host || ''}${a?.path || ''}` } catch { hote = '' }
      if (!local(String(hote).replace(/:\d+$/, ''))) { noter({ type: 'reseau', url, refuse: true }); throw new Error('espion du juge : réseau hors 127.0.0.1 refusé') }
      noter({ type: 'reseau', url })
      return orig.call(this, a, b, c)
    }
  }
}

// ── ouvertures de fichiers sous ESPION_OUVERTURES ────────────────────────────────────────────────────────────────────
if (PREFIXE) {
  const sous = (p) => {
    try {
      const s = p instanceof URL ? p.pathname : typeof p === 'string' ? p : Buffer.isBuffer(p) ? p.toString() : null
      if (s === null) return null
      const abs = path.resolve(p instanceof URL ? decodeURIComponent(s.replace(/^\/([A-Za-z]:)/, '$1')) : s)
      return abs.toLowerCase().startsWith(PREFIXE) ? abs : null
    } catch { return null }
  }
  const envelopper = (objet, nom) => {
    const orig = objet[nom]
    if (typeof orig !== 'function') return
    objet[nom] = function ouvertureEspionnee(p, ...reste) {
      const abs = sous(p)
      if (abs) noter({ type: 'ouverture', fonction: nom, chemin: abs })
      return orig.call(this, p, ...reste)
    }
  }
  for (const nom of ['readFileSync', 'openSync', 'readFile', 'open', 'createReadStream']) envelopper(fs, nom)
  for (const nom of ['readFile', 'open']) envelopper(fs.promises, nom)
}

syncBuiltinESMExports()
