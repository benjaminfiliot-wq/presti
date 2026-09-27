#!/usr/bin/env node
// La preuve que le verifier de 026-052 sait échouer, rejouable : node .orchestre/preuves/026-052/sait-echouer.mjs [--seulement=sql,routes]
//
// Le verifier de 026-052 est le --preuve-echecs des trois juges. Chacun y prouve déjà que CHAQUE critère sait échouer (SB-1 :
// un sabotage du témoin par critère, rouge exigé) et qu'il sait réussir (TV-1 : le témoin intact, vert exigé). Reste à prouver
// que cette preuve elle-même refuse les trois juges qu'on ne veut pas (leçon du 26-27/09 : des juges-coquilles verts) :
//   toujours-vert   le juge rend « PASS » et 0 sans rien juger          → --preuve-echecs en code 1, avec FAIL PE-2 (la référence) ;
//   toujours-rouge  le juge rend un FAIL générique et 1 sans rien juger  → --preuve-echecs en code 1, avec FAIL TV-1 (le témoin) ;
//   critere-muet    UN critère rendu vert d'office, les autres intacts   → --preuve-echecs en code 1, avec FAIL SB-1 qui le nomme.
// Chaque cas est une COPIE du juge (scripts/_026-052-<juge>-<cas>.tmp.mjs, ignorée par git : `scripts/_*.tmp.mjs`), faite d'UN
// remplacement de texte exact, lancée comme le verifier lance le vrai juge, puis effacée. La copie écrit sa section de
// echecs-attendus.md : le fichier est sauvegardé avant et rétabli après chaque cas (empreinte vérifiée). Écrit sait-echouer.md
// et sait-echouer.log à côté de ce script. Rien n'est modifié en place.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..', '..')
const EA = path.join(ICI, 'echecs-attendus.md')
const seulement = (process.argv.find((a) => a.startsWith('--seulement=')) || '').slice(12).split(',').filter(Boolean)
const court = (s, n = 200) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const empreinte = (b) => crypto.createHash('sha256').update(b).digest('hex')
const TS = ['--import', './scripts/ts-loader.mjs']

const JUGES = {
  sql: {
    fichier: 'scripts/usine-sql-qa.mjs', prefixe: [], nom: 'usine-sql-qa',
    principal: 'else process.exitCode = juger()',
    muet: ['US-3', "  if (veut('US-3')) {\n", "  if (veut('US-3')) s.passe('US-3', 'critère muet (sabotage de la preuve)')\n  if (false) {\n"],
  },
  routes: {
    fichier: 'scripts/usine-routes-qa.mjs', prefixe: TS, nom: 'usine-routes-qa',
    principal: 'else process.exitCode = await juger(o)',
    muet: ['UR-6', "  'UR-6': (o) => parSonde('depotValide', o.racine),\n", "  'UR-6': async () => res([], 'critère muet (sabotage de la preuve)'),\n"],
  },
  production: {
    fichier: 'scripts/usine-production-qa.mjs', prefixe: TS, nom: 'usine-production-qa',
    principal: 'else process.exitCode = await juger(o)',
    muet: ['UT-15', "  async 'UT-15'(o, copie) {\n", "  async 'UT-15'() { return res([], 'critère muet (sabotage de la preuve)') },\n  async 'UT-15-origine'(o, copie) {\n"],
  },
}
// [cas, texte remplacé, remplacement, la ligne FAIL attendue (prédicat), ce qu'on attend, en clair]
const CAS = (j) => [
  ['toujours-vert', j.principal, `else { console.log('${j.nom} : PASS'); process.exitCode = 0 }`, (x) => /^FAIL PE-2 — /.test(x), 'FAIL PE-2 (la référence ne rougit plus)'],
  ['toujours-rouge', j.principal, `else { console.log('FAIL XX-0 — rouge sans rien juger'); console.log('${j.nom} : FAIL — XX-0'); process.exitCode = 1 }`, (x) => /^FAIL TV-1 — /.test(x), 'FAIL TV-1 (le témoin ne verdit plus)'],
  ['critere-muet', j.muet[1], j.muet[2], (x) => /^FAIL SB-1 — /.test(x) && x.includes(`sabotage de ${j.muet[0]} `), `FAIL SB-1 qui nomme ${j.muet[0]}`],
]

function lancer(args, delaiMs = 1_200_000) {
  return new Promise((ok) => {
    const t0 = Date.now()
    const p = spawn(process.execPath, args, { cwd: DEPOT, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } })
    let so = ''
    p.stdout.setEncoding('utf8'); p.stderr.setEncoding('utf8')
    p.stdout.on('data', (d) => { so += d }); p.stderr.on('data', (d) => { so += d })
    const m = setTimeout(() => { try { spawn('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true }) } catch { p.kill('SIGKILL') } }, delaiMs)
    p.on('close', (code) => { clearTimeout(m); ok({ code, sortie: so, duree: Math.round((Date.now() - t0) / 1000) }) })
  })
}

const lignes = [], journal = []
let tousJustes = true
const sauvegarde = fs.readFileSync(EA)
const empreinteEA = empreinte(sauvegarde)
try {
  for (const [cle, j] of Object.entries(JUGES)) {
    if (seulement.length && !seulement.includes(cle)) continue
    const src = fs.readFileSync(path.join(DEPOT, j.fichier), 'utf8')
    for (const [cas, avant, apres, attendu, dit] of CAS(j)) {
      const copie = path.join(DEPOT, 'scripts', `_026-052-${cle}-${cas}.tmp.mjs`)
      const l = { juge: j.nom, cas, remplacement: `« ${court(avant.trim(), 70)} » → « ${court(apres.trim(), 90)} »`, attendu: dit, code: null, juste: false, releve: '', duree: 0 }
      try {
        const n = src.split(avant).length - 1
        if (n !== 1) throw new Error(`« ${court(avant, 60)} » présent ${n} fois dans ${j.fichier} (une fois attendue)`)
        fs.writeFileSync(copie, src.replace(avant, () => apres))
        const r = await lancer([...j.prefixe, copie, '--preuve-echecs'])
        const fails = r.sortie.split(/\r?\n/).filter((x) => /^FAIL \S+ — /.test(x))
        l.code = r.code; l.duree = r.duree
        const vue = fails.find(attendu)
        l.juste = r.code === 1 && !!vue
        l.releve = vue || fails[0] || court(r.sortie.split(/\r?\n/).filter(Boolean).slice(-2).join(' | '))
        journal.push(`══ ${j.nom} · ${cas} · code ${r.code} · ${r.duree} s\n${r.sortie}`)
      } catch (e) { l.releve = `cas inapplicable : ${e.message}` } finally {
        fs.rmSync(copie, { force: true })
        fs.writeFileSync(EA, sauvegarde)
      }
      if (!l.juste) tousJustes = false
      lignes.push(l)
      console.log(`${l.juste ? 'oui' : 'NON'}  ${j.nom} ${cas} : code ${l.code}, ${court(l.releve, 160)}`)
    }
  }
} finally {
  fs.writeFileSync(EA, sauvegarde)
}
const retabli = empreinte(fs.readFileSync(EA)) === empreinteEA
const esc = (s) => String(s).replace(/\|/g, '\\|')
const md = [
  '# Le verifier de 026-052 sait échouer',
  '',
  `Produit par \`node .orchestre/preuves/026-052/sait-echouer.mjs\` le ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}. Chaque cas : une copie du juge faite d'UN remplacement de texte exact, lancée en \`--preuve-echecs\` comme le verifier lance le vrai juge ; code 1 exigé, avec la ligne FAIL attendue. Un juge toujours vert, un juge toujours rouge et un juge dont un seul critère est muet sont refusés. Sorties complètes : \`sait-echouer.log\`. echecs-attendus.md rétabli après chaque cas (empreinte ${retabli ? 'identique' : 'DIFFÉRENTE'}).`,
  '',
  '| Juge | Cas | Remplacement | Attendu | Code | Juste | Ligne relevée (extrait réel) | Durée |',
  '|---|---|---|---|---|---|---|---|',
  ...lignes.map((l) => `| ${l.juge} | ${l.cas} | ${esc(l.remplacement)} | ${esc(l.attendu)} | ${l.code ?? '—'} | ${l.juste ? 'oui' : 'NON'} | ${esc(court(l.releve, 240))} | ${l.duree} s |`),
  '',
  `Verdict : **${tousJustes && retabli && lignes.length ? 'PASS' : 'FAIL'}**`,
  '',
]
if (!seulement.length) {
  fs.writeFileSync(path.join(ICI, 'sait-echouer.md'), md.join('\n'))
  fs.writeFileSync(path.join(ICI, 'sait-echouer.log'), journal.join('\n\n'))
}
console.log(`sait-echouer : ${tousJustes && retabli && lignes.length ? 'PASS' : 'FAIL'} (${lignes.filter((l) => l.juste).length}/${lignes.length})`)
process.exitCode = tousJustes && retabli && lignes.length ? 0 : 1
