// Audit des accroches — prompt v14 §1.2, d'après `linkedin-skills/references/hook-formulas.md`.
//
//   node scripts/audit-accroches.mjs
//
// La première ligne d'un post décide de sa portée avant que le texte soit lu. Les chiffres
// ci-dessous sont ceux du catalogue, pas mon avis :
//
//   • question en ligne 1 ............ **−34 %** de likes médians, toutes tailles d'audience [vendor]
//   • nombre précis en ligne 1 ....... **+34 %** — le plus fort signal positif de 2026 [vendor]
//   • « Here's what/how » (hook) ..... −4,3 %
//   • « It's not X, it's Y » (cadre) . −4,9 %
//   • « Stop X, start Y » ............ −6,7 %
//   • question en CLÔTURE ............ **+3 %** — le même geste, à l'autre bout du post
//   • P.-S. avec une suite ........... +7,5 %
//
// La leçon du catalogue, et elle est contre-intuitive : « 98-100 % des cent meilleurs créateurs
// humains utilisent encore les procédés signalés. La pénalité s'attache à la densité en pilote
// automatique et à l'absence de spécifique, pas au procédé lui-même. »
// Donc on ne supprime pas la question : on la DÉPLACE.

import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const lignes = fs.readFileSync(path.join(RACINE, 'plans', 'publications-10.md'), 'utf8').split(/\r?\n/)

const posts = []
let pub = '??', courant = null
for (const l of lignes) {
  const t = l.match(/^#\s+Publication n°\s*(\d+)/)
  if (t) pub = String(t[1]).padStart(2, '0')
  const v = l.match(/^##\s+Variante\s+([AB])\s*—\s*(.+)$/)
  if (v) { courant = { pub, variante: v[1], canal: v[2].trim(), l: [] }; posts.push(courant); continue }
  if (/^##?\s/.test(l)) courant = null
  if (courant && /^>\s?/.test(l)) courant.l.push(l.replace(/^>\s?/, ''))
}

console.log(`${posts.length} accroches auditées.\n${'─'.repeat(96)}`)
let malus = 0, bonus = 0
for (const p of posts) {
  const utiles = p.l.filter((x) => x.trim())
  const premiere = (utiles[0] || '').trim()
  const derniere = (utiles[utiles.length - 1] || '').trim()

  const question = /\?/.test(premiere)
  const nombre = /(^|[\s«"'(])\d/.test(premiere) || /\b(un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|trente|trente-trois|cinquante)\b/i.test(premiere)
  const questionFin = /\?/.test(derniere) || /\?/.test(utiles.slice(-3).join(' '))

  const notes = []
  if (question) { notes.push(['−34 %', 'question en ligne 1 — le plus gros malus du catalogue']); malus++ }
  if (nombre && !question) { notes.push(['+34 %', 'nombre en ligne 1 — le plus fort signal positif']); bonus++ }
  if (questionFin) notes.push(['+3 %', 'question en clôture — bien placée'])
  if (!question && !nombre) notes.push(['neutre', 'ni question ni nombre en ligne 1'])

  console.log(`\npub-${p.pub} ${p.variante} · ${p.canal}`)
  console.log(`  « ${premiere.slice(0, 78)}${premiere.length > 78 ? '…' : ''} »`)
  for (const [n, m] of notes) console.log(`    ${n.padEnd(8)} ${m}`)
}
console.log(`\n${'─'.repeat(96)}`)
console.log(`${malus} accroche(s) à −34 % · ${bonus} accroche(s) à +34 %`)
process.exit(malus ? 1 : 0)
