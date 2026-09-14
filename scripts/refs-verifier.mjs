// scripts/refs-verifier.mjs — le verdict de la tâche 016-01 (prompt v16 §2) : les références MotionSites ont-elles été
// REGARDÉES, pas décrites ? Une fiche compte si ses sept champs sont remplis, si sa note est un entier sur 5, et si elle
// cite au moins une capture qui existe dans .orchestre/preuves/refs/ et qui est un PNG valide (en-tête IHDR ≥ 800 px,
// fin IEND — voir scripts/lib/preuves.mjs : une preuve vide est un mensonge). Il faut au moins neuf fiches complètes et
// neuf captures distinctes.
//
// Usage : node scripts/refs-verifier.mjs [--min=9] [--json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pngValide, fichiersDistincts } from './lib/preuves.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FICHIER = path.join(RACINE, 'plans', 'references-motionsites.md')
const CAPTURES = path.join(RACINE, '.orchestre', 'preuves', 'refs')
const MIN = Number((process.argv.find((a) => a.startsWith('--min=')) || '--min=9').slice(6)) || 9
const CHAMPS = ['Catégorie', 'Ce qui bouge', 'Comment', 'Rythme', 'Typographie', 'Structure des sections', 'Transposable à un site d’artisan']

const texte = fs.existsSync(FICHIER) ? fs.readFileSync(FICHIER, 'utf8') : ''
const blocs = texte.split(/^### Fiche /m).slice(1)
const pngs = fs.existsSync(CAPTURES) ? fs.readdirSync(CAPTURES).filter((f) => /\.png$/i.test(f)).map((f) => path.join(CAPTURES, f)) : []
// largeur lue dans l'en-tête IHDR (octets 16-19, grand-boutiste) : une capture d'écran fait au moins 800 px de large
const largeurPng = (f) => { try { const b = Buffer.alloc(24); const fd = fs.openSync(f, 'r'); fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd); return b.readUInt32BE(16) } catch { return 0 } }
const valides = pngs.filter((f) => pngValide(f) && largeurPng(f) >= 800)
const distinctes = fichiersDistincts(valides) ? valides : []
const fiches = blocs.map((b) => {
  const id = (b.match(/^\s*\d+\s*—\s*([^\n]+)/) || [])[1]?.trim() || '?'
  const manquants = CHAMPS.filter((c) => { const m = new RegExp(`^- ${c.replace(/[’']/g, "[’']")}\\s*:\\s*(.*)$`, 'mi').exec(b); return !m || m[1].replace(/\/5.*$/, '').trim().length < 8 })
  const note = (b.match(/artisan[^\n]*?:\s*(\d)\s*\/\s*5/i) || [])[1]
  const captures = [...b.matchAll(/([\w.-]+\.png)/gi)].map((m) => m[1]).filter((c) => valides.some((v) => path.basename(v).toLowerCase() === c.toLowerCase()))
  return { id, complete: manquants.length === 0 && !!note && captures.length >= 1, manquants, note, captures }
})
const completes = fiches.filter((f) => f.complete)
const json = process.argv.includes('--json')
if (json) console.log(JSON.stringify({ fiches, capturesValides: valides.length, distinctes: distinctes.length }, null, 1))
else {
  for (const f of fiches) console.log(`${f.complete ? '✓' : '✗'} ${f.id.padEnd(28)} note ${f.note ?? '—'}/5 · ${f.captures.length} capture(s)${f.manquants.length ? ' · manque : ' + f.manquants.join(', ') : ''}`)
  console.log(`\nrefs : ${completes.length} fiche(s) complète(s) sur ${fiches.length} (≥ ${MIN} attendues) · ${valides.length} capture(s) PNG valide(s), ${distinctes.length} distincte(s)`)
}
const ok = completes.length >= MIN && distinctes.length >= MIN
console.log(ok ? '✓ refs : PASS' : `✗ refs : FAIL — ${completes.length < MIN ? 'fiches incomplètes' : 'captures manquantes ou identiques'}`)
process.exit(ok ? 0 : 1)
