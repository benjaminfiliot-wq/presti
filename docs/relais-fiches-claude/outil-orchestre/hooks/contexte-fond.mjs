#!/usr/bin/env node
// hooks/contexte-fond.mjs — hook PostToolUse « Edit / Write » de Claude Code.
//
// Pourquoi ce fichier existe : .orchestre/contexte.md est la carte du code, régénérée depuis le code
// et jamais écrite à la main. Dès qu'un fichier de code change, on relance « orchestre contexte » en
// arrière-plan — détaché, silencieux, au plus une fois par minute — pour que la carte ne prenne pas
// de retard sans que personne n'attende.
//
// Entrée : sur stdin, le JSON de Claude Code { "tool_name": "Edit", "tool_input": { "file_path": "…" } }.
// Fichiers de code : ts, tsx, js, mjs, sql, css. Horodatage de la dernière régénération dans
// .orchestre/.contexte-stamp (millisecondes). Racine = le dossier qui contient .orchestre/, remonté
// depuis le cwd. Toujours code 0, jamais de sortie : un hook PostToolUse n'a rien à dire à l'agent.

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const EXTENSIONS_CODE = new Set(['.ts', '.tsx', '.js', '.mjs', '.sql', '.css'])
const OUTILS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const DELAI_MS = 60_000

function lireStdin() {
  try { return fs.readFileSync(0, 'utf8') } catch { return '' }
}

function analyser(texte) {
  const t = (texte || '').trim()
  if (!t) return {}
  try { const v = JSON.parse(t); return v && typeof v === 'object' ? v : {} } catch { return {} }
}

function trouverRacine(depart) {
  let d = path.resolve(depart)
  for (;;) {
    if (fs.existsSync(path.join(d, '.orchestre'))) return d
    const parent = path.dirname(d)
    if (parent === d) return null
    d = parent
  }
}

function principal() {
  const entree = analyser(lireStdin())
  if (!OUTILS.has(entree.tool_name)) return
  const ti = entree.tool_input && typeof entree.tool_input === 'object' ? entree.tool_input : {}
  const fichier = typeof ti.file_path === 'string' ? ti.file_path : (typeof ti.notebook_path === 'string' ? ti.notebook_path : '')
  if (!fichier || !EXTENSIONS_CODE.has(path.extname(fichier).toLowerCase())) return

  // La racine : d'abord depuis le fichier touché (il peut être hors du cwd), sinon depuis le cwd.
  const racine = trouverRacine(path.dirname(path.resolve(process.cwd(), fichier))) || trouverRacine(process.cwd())
  if (!racine) return
  const script = path.join(racine, 'scripts', 'orchestre.mjs')
  if (!fs.existsSync(script)) return // projet pas encore initialisé : rien à relancer

  const stamp = path.join(racine, '.orchestre', '.contexte-stamp')
  const maintenant = Date.now()
  let dernier = 0
  try { dernier = Number(fs.readFileSync(stamp, 'utf8').trim()) || 0 } catch { /* jamais régénéré */ }
  if (maintenant - dernier < DELAI_MS) return

  // L'horodatage AVANT le lancement : deux hooks dans la même seconde ne lancent qu'une régénération.
  fs.writeFileSync(stamp, String(maintenant))
  const enfant = spawn(process.execPath, [script, 'contexte', '--silencieux'], {
    cwd: racine,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  })
  enfant.on('error', () => { /* rien à dire : le prochain Edit réessaiera dans une minute */ })
  enfant.unref()
}

try { principal() } catch { /* jamais d'exception : code 0 quoi qu'il arrive */ }
process.exit(0)
