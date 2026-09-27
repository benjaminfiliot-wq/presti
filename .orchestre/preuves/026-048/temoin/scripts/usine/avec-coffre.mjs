#!/usr/bin/env node
// TÉMOIN du juge usine-socle-qa (026-048) : avec-coffre minimal, écrit par Claude Code pour prouver que le juge sait passer
// au vert. Ce n'est PAS le livrable de 026-050.   avec-coffre.mjs NOM… -- commande args…
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { NOMS_PERMIS } from './coffre-regles.mjs'

const PASSANTS = ['PATH', 'HOME', 'LANG', 'TZ', 'USER', 'PRESTI_HOTE', 'ORCHESTRE_CODEX_BIN', 'PLAYWRIGHT_BROWSERS_PATH', 'PRESTI_URL']
const sortir = (code, m) => { process.stderr.write(`avec-coffre : ${m}\n`); process.exit(code) }
const args = process.argv.slice(2)
const i = args.indexOf('--')
if (i <= 0 || i === args.length - 1) sortir(2, 'usage : avec-coffre.mjs NOM… -- commande args…')
const noms = args.slice(0, i)
const commande = args.slice(i + 1)
for (const n of noms) if (!NOMS_PERMIS.includes(n)) sortir(2, 'un nom hors de la liste fermée')
const fichier = path.join(process.env.HOME || os.homedir(), '.config', 'presti', 'agents.env')
if (!fs.existsSync(fichier)) sortir(3, 'coffre absent')
if (process.platform !== 'win32' && (fs.statSync(fichier).mode & 0o777) !== 0o600) sortir(4, 'le coffre n\'est pas en 600')
const coffre = new Map()
for (const brut of fs.readFileSync(fichier, 'utf8').split('\n')) {
  const l = brut.replace(/\r$/, '')
  if (!l || l.startsWith('#')) continue
  const k = l.indexOf('=')
  if (k <= 0) continue
  coffre.set(l.slice(0, k), l.slice(k + 1))
}
for (const n of noms) if (!coffre.has(n)) sortir(3, `${n} absent du coffre`)
const env = {}
for (const k of PASSANTS) if (process.env[k] !== undefined) env[k] = process.env[k]
for (const n of noms) env[n] = coffre.get(n)
const enfant = spawn(commande[0], commande.slice(1), { env, stdio: 'inherit' })
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { try { enfant.kill(s) } catch { /* déjà parti */ } })
enfant.on('error', () => sortir(127, 'commande introuvable'))
enfant.on('exit', (code, signal) => process.exit(code ?? (signal ? 143 : 1)))
