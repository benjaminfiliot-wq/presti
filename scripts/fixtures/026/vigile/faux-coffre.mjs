#!/usr/bin/env node
// Faux presti-coffre de vigile-qa (026-248), avec faux-coffre.json à côté : { "noms": "<texte>" }. Consigne son pid, son
// argv, son dossier et les NOMS de ses variables d'environnement (faux-coffre.log.jsonl). `noms` (un seul argument)
// imprime la liste d'essai ; toute autre demande sort en code 2 : il ne rend jamais une valeur.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ici = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(ici, 'faux-coffre.json'), 'utf8'))
const argv = process.argv.slice(2)
fs.appendFileSync(path.join(ici, 'faux-coffre.log.jsonl'), `${JSON.stringify({ pid: process.pid, argv, cwd: process.cwd(), env: Object.keys(process.env).sort() })}\n`)
if (argv.length === 1 && argv[0] === 'noms') process.stdout.write(cfg.noms)
else process.exitCode = 2
