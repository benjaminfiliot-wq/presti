// TEMPORAIRE (essai du chef de chantier, supprimé avant le commit) : joue UN sabotage de lot.mjs sur l'arbre témoin et rend la sortie du juge.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { R } from '../a/commun.mjs'
import { arbreTemoinE } from './commun.mjs'
import { juges, reference } from './lot.mjs'
const [nom, ...args] = process.argv.slice(2)
const a = arbreTemoinE(reference)
const s = juges.flatMap((j) => j.sabotages).find((x) => x.nom === nom)
if (!s) throw new Error('sabotage inconnu ' + nom)
const f = path.join(a.dest, s.fichier)
if (s.retirer) fs.rmSync(f); else { const t = fs.readFileSync(f, 'utf8'); if (!t.includes(s.avant)) throw new Error('avant absent'); fs.writeFileSync(f, t.replace(s.avant, () => s.apres)) }
console.log('sabotage', nom, 'posé sur', path.relative(R, f), 'octets', fs.existsSync(f) ? fs.statSync(f).size : 'retiré')
const r = spawnSync(process.execPath, ['scripts/station-ecran-qa.mjs', `--racine=${a.dest}`, ...args], { cwd: R, encoding: 'utf8', env: { ...process.env, STATION_ECRAN_TRACE: '1' }, maxBuffer: 1 << 26 })
process.stdout.write(`${r.stdout}\n${r.stderr}\ncode ${r.status}\n`)
