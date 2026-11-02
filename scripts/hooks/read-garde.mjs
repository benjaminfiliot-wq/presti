#!/usr/bin/env node
// hooks/read-garde.mjs — hook PreToolUse « Read » de Claude Code (orchestre § routage).
//
// Pourquoi ce fichier existe : un Read sans offset/limit sur un fichier de 800 lignes remplit le
// contexte de l'agent en une seule fois, et c'est rarement voulu. Le hook refuse ce Read (code 2 =
// « bloque l'outil » pour Claude Code) et dit quoi faire à la place : Grep, Read avec offset/limit,
// ou un sous-agent haiku.
//
// Entrée : sur stdin, le JSON que Claude Code envoie aux hooks :
//   { "tool_name": "Read", "tool_input": { "file_path": "…", "offset": 12, "limit": 80 } }
// Sortie : rien (code 0) ou un message sur stderr (code 2).
// Réglage : .orchestre/orchestre.json → "lectureLibre": [motifs glob relatifs à la racine du projet],
//   défaut [".orchestre/**", "plans/**"]. La racine = le dossier qui contient .orchestre/ (remonté
//   depuis le cwd) ; sinon le cwd.
//
// Règle d'or : jamais d'exception non rattrapée — au moindre doute on laisse passer (code 0). Un hook
// qui plante bloquerait toutes les lectures.

import fs from 'node:fs'
import path from 'node:path'

const SEUIL_LIGNES = 300
const LECTURE_LIBRE_DEFAUT = ['.orchestre/**', 'plans/**']

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────
function lireStdin() {
  try { return fs.readFileSync(0, 'utf8') } catch { return '' }
}

function analyser(texte) {
  const t = (texte || '').trim()
  if (!t) return {}
  try { const v = JSON.parse(t); return v && typeof v === 'object' ? v : {} } catch { return {} }
}

// ── racine et réglage ─────────────────────────────────────────────────────────────────────────────
function trouverRacine(depart) {
  let d = path.resolve(depart)
  for (;;) {
    if (fs.existsSync(path.join(d, '.orchestre'))) return d
    const parent = path.dirname(d)
    if (parent === d) return null
    d = parent
  }
}

function lireLectureLibre(racine) {
  try {
    const brut = fs.readFileSync(path.join(racine, '.orchestre', 'orchestre.json'), 'utf8')
    const cfg = JSON.parse(brut)
    if (Array.isArray(cfg.lectureLibre)) return cfg.lectureLibre.filter((m) => typeof m === 'string' && m.trim())
  } catch { /* pas de réglage : défaut */ }
  return LECTURE_LIBRE_DEFAUT
}

// ── motifs glob (sans dépendance) : ** = tout, y compris les « / » ; * = tout sauf « / » ; ? = un caractère
function globVersRegex(motif) {
  const m = motif.replace(/\\/g, '/').replace(/^\.\//, '')
  let re = ''
  for (let i = 0; i < m.length; i++) {
    const c = m[i]
    if (c === '*') {
      if (m[i + 1] === '*') {
        // « **/ » avale zéro ou plusieurs segments ; « ** » seul avale tout
        if (m[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i += 1 }
      } else re += '[^/]*'
    } else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

function estLibre(relatif, motifs) {
  return motifs.some((motif) => { try { return globVersRegex(motif).test(relatif) } catch { return false } })
}

// ── nombre de lignes ──────────────────────────────────────────────────────────────────────────────
function compterLignes(fichier) {
  const contenu = fs.readFileSync(fichier, 'utf8')
  if (!contenu) return 0
  let n = 1
  for (let i = 0; i < contenu.length; i++) if (contenu.charCodeAt(i) === 10) n++
  if (contenu.endsWith('\n')) n-- // la dernière ligne vide après le \n final ne compte pas
  return n
}

// ── le hook ───────────────────────────────────────────────────────────────────────────────────────
function principal() {
  const entree = analyser(lireStdin())
  if (entree.tool_name !== 'Read') return 0
  const ti = entree.tool_input && typeof entree.tool_input === 'object' ? entree.tool_input : {}
  const fichier = typeof ti.file_path === 'string' ? ti.file_path.trim() : ''
  if (!fichier) return 0
  // offset ou limit donné (même 0) = lecture ciblée : on laisse passer
  if (ti.offset !== undefined && ti.offset !== null) return 0
  if (ti.limit !== undefined && ti.limit !== null) return 0

  const absolu = path.resolve(process.cwd(), fichier)
  let stat
  try { stat = fs.statSync(absolu) } catch { return 0 }
  if (!stat.isFile()) return 0

  const racine = trouverRacine(process.cwd()) || process.cwd()
  const relatif = path.relative(racine, absolu).split(path.sep).join('/')
  if (relatif.startsWith('..') === false && estLibre(relatif, lireLectureLibre(racine))) return 0

  // Une image n'a pas de lignes : le Read la montre en entier, ses octets 0x0A ne comptent pas (captures du 02/11).
  if (/\.(png|jpe?g|gif|webp|avif|bmp|ico)$/i.test(absolu)) return 0

  const lignes = compterLignes(absolu)
  if (lignes <= SEUIL_LIGNES) return 0

  process.stderr.write(`Fichier de ${lignes} lignes : utilise Grep, Read avec offset/limit, ou un sous-agent haiku (orchestre § routage)\n`)
  return 2
}

let code = 0
try { code = principal() } catch { code = 0 }
process.exit(code)
