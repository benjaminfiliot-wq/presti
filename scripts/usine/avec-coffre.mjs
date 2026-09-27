#!/usr/bin/env node
// scripts/usine/avec-coffre.mjs — lance une commande avec les seules variables du coffre qu'on lui nomme (fiche 026-050).
//
// Usage (ExecStart= d'une unité systemd de l'usine, sous le compte agents) :
//   node scripts/usine/avec-coffre.mjs NOM [NOM…] -- <commande> [arguments…]
//
// Le coffre ($HOME/.config/presti/agents.env ; PRESTI_COFFRE_FICHIER pour les essais) est lu ligne à ligne, jamais évalué :
// NOM=valeur, lignes vides, commentaires (#) et lignes mal formées ignorés. Chaque service ne reçoit que ses variables :
// jamais d'EnvironmentFile= systemd, qui chargerait tout le coffre. La commande part par spawn, sans shell, avec un
// environnement fait de zéro : les variables de passage (aucune n'est un secret) qui existent, et les noms demandés, pris
// dans le coffre (jamais dans l'environnement du parent). SIGTERM et SIGINT sont relayés à l'enfant ; son code est rendu.
// Aucune valeur n'est jamais imprimée : les messages ne citent que des noms.
//
// Codes : celui de l'enfant ; 2 usage ou nom hors de la liste fermée ; 3 nom absent du coffre (rien n'est lancé) ;
// 4 coffre lisible par d'autres que son propriétaire (pas en 600, système POSIX seulement) ; 127 lancement impossible.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { NOMS_PERMIS } from './coffre-regles.mjs'

// Les variables de passage : des réglages que l'unité pose (Environment=), aucune n'est un secret. CODEX_LANCEUR (le
// lanceur de la file IA, /usr/local/bin/presti-ia-modele) s'ajoute à la liste de la fiche : les unités du livreur, du
// Standard, du Facteur et des pubs le posent pour lib/agents/llm.ts (026-057, 026-094, 026-200) ; filtré ici, llm.ts
// rendrait null en silence et ces agents tourneraient sans modèle.
const PASSANTS = ['PATH', 'HOME', 'LANG', 'TZ', 'USER', 'PRESTI_HOTE', 'ORCHESTRE_CODEX_BIN', 'CODEX_LANCEUR', 'PLAYWRIGHT_BROWSERS_PATH', 'PRESTI_URL']
const LIGNE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/

function sortir(code, message) {
  if (message) console.error(`✗ avec-coffre : ${message}`)
  process.exit(code)
}

const argv = process.argv.slice(2)
const tiret = argv.indexOf('--')
if (tiret < 0) sortir(2, 'usage : avec-coffre.mjs NOM [NOM…] -- <commande> [arguments…] (le « -- » manque)')
const noms = argv.slice(0, tiret)
const [commande, ...args] = argv.slice(tiret + 1)
if (!noms.length) sortir(2, 'aucun nom du coffre demandé avant « -- »')
if (!commande) sortir(2, 'aucune commande après « -- »')
for (const nom of noms) if (!NOMS_PERMIS.includes(nom)) sortir(2, `un nom demandé est hors de la liste fermée du coffre (${NOMS_PERMIS.join(', ')}) : rien n'est lancé`)

const coffre = process.env.PRESTI_COFFRE_FICHIER || path.join(process.env.HOME || os.homedir(), '.config', 'presti', 'agents.env')
const lues = new Map()
let stat = null
try { stat = fs.statSync(coffre) } catch { /* pas de coffre : chaque nom demandé est absent */ }
if (stat) {
  if (!stat.isFile()) sortir(4, 'le coffre n\'est pas un fichier : rien n\'est lancé')
  // Sous Windows (le poste), le mode NTFS n'a pas de sens : le contrôle vaut sur l'usine.
  if (process.platform !== 'win32' && (stat.mode & 0o777) !== 0o600) sortir(4, `le coffre est en ${(stat.mode & 0o777).toString(8)} (600 attendu) : rien n'est lancé`)
  for (const brute of fs.readFileSync(coffre, 'utf8').split('\n')) {
    const ligne = brute.replace(/\r$/, '')
    if (!ligne || ligne.startsWith('#')) continue
    const m = ligne.match(LIGNE)
    if (m && !lues.has(m[1])) lues.set(m[1], m[2])
  }
}
const manquants = noms.filter((n) => !lues.has(n))
if (manquants.length) sortir(3, `absent du coffre : ${manquants.join(', ')} (poser par node scripts/usine-coffre.mjs poser <NOM>) ; rien n'est lancé`)

const env = {}
for (const k of PASSANTS) if (process.env[k] !== undefined) env[k] = process.env[k]
for (const n of noms) env[n] = lues.get(n)
lues.clear()

const enfant = spawn(commande, args, { env, stdio: 'inherit' })
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => { try { enfant.kill(signal) } catch { /* déjà sorti */ } })
}
enfant.on('error', (e) => sortir(127, `lancement impossible (${e.code || 'erreur'})`))
enfant.on('exit', (code, signal) => {
  if (code !== null) process.exit(code)
  process.exit(128 + (os.constants.signals[signal] || 0))
})
