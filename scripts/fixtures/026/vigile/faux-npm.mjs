#!/usr/bin/env node
// Faux npm de vigile-qa (026-248). Le juge le copie dans le bac d'un passage, avec faux-npm.json à côté :
//   { "mode": "ok" | "critique" | "propre" | "illisible" | "dort", "fixture": "<entrees/npm.json>" }.
// Il consigne (faux-npm.log.jsonl, à côté de lui) son pid, son argv, son dossier courant et les NOMS de ses variables
// d'environnement (jamais une valeur) ; puis il imprime la sortie d'essai de `npm audit --json`, ou dort (tué au délai).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ici = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(ici, 'faux-npm.json'), 'utf8'))
fs.appendFileSync(path.join(ici, 'faux-npm.log.jsonl'), `${JSON.stringify({ pid: process.pid, argv: process.argv.slice(2), cwd: process.cwd(), env: Object.keys(process.env).sort() })}\n`)
const npm = JSON.parse(fs.readFileSync(cfg.fixture, 'utf8'))
if (cfg.mode === 'dort') setTimeout(() => {}, 600_000)
else if (cfg.mode === 'illisible') { process.stdout.write(npm.illisible); process.exitCode = 1 }
else {
  const x = npm[cfg.mode] ?? npm.ok
  process.stdout.write(JSON.stringify(x, null, 2))
  process.exitCode = x.metadata.vulnerabilities.total > 0 ? 1 : 0
}
