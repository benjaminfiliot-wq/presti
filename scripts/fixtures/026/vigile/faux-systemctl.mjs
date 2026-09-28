#!/usr/bin/env node
// Faux systemctl de vigile-qa (026-248), avec faux-systemctl.json à côté : { "failed": "<texte>", "enabled": "<texte>" }.
// Consigne son pid, son argv, son dossier et les NOMS de ses variables d'environnement (faux-systemctl.log.jsonl) ;
// `list-units … --state=failed` imprime « failed », `list-unit-files … --state=enabled` imprime « enabled » ; tout le
// reste sort en code 1 sans rien imprimer (il ne sait rien faire d'autre, et surtout pas changer une unité).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ici = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(ici, 'faux-systemctl.json'), 'utf8'))
const argv = process.argv.slice(2)
fs.appendFileSync(path.join(ici, 'faux-systemctl.log.jsonl'), `${JSON.stringify({ pid: process.pid, argv, cwd: process.cwd(), env: Object.keys(process.env).sort() })}\n`)
if (argv[0] === 'list-units' && argv.includes('--state=failed')) process.stdout.write(cfg.failed)
else if (argv[0] === 'list-unit-files' && argv.includes('--state=enabled')) process.stdout.write(cfg.enabled)
else process.exitCode = 1
