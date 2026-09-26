#!/usr/bin/env node
// Enfant espion du juge du socle de l'usine (026-048), lancé par `avec-coffre.mjs NOM… -- <node> enfant-espion.mjs …`.
// Il écrit dans --sortie les NOMS de ses variables d'environnement et l'empreinte SHA-256 de chaque valeur (jamais une
// valeur), avec son pid, puis dort --dormir secondes et sort avec le code --code.
//   node enfant-espion.mjs --sortie=<fichier.json> [--dormir=<s>] [--code=<n>]
import fs from 'node:fs'
import crypto from 'node:crypto'

const opt = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.join('=')]))
if (!opt.sortie) { process.stderr.write('enfant espion : --sortie=<fichier> attendu\n'); process.exit(90) }
const empreintes = {}
for (const [nom, valeur] of Object.entries(process.env)) empreintes[nom] = crypto.createHash('sha256').update(String(valeur)).digest('hex')
fs.writeFileSync(opt.sortie, JSON.stringify({ pid: process.pid, noms: Object.keys(empreintes).sort(), empreintes }, null, 1))
const code = Number.parseInt(opt.code || '0', 10) || 0
const dormir = Number(opt.dormir || 0)
if (dormir > 0) setTimeout(() => process.exit(code), dormir * 1000)
else process.exit(code)
