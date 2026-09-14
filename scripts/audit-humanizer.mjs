// Audit `linkedin-humanizer --mode audit`, appliqué aux dix publications — prompt v14 §1.2.
//
//   node scripts/audit-humanizer.mjs
//
// La skill est calibrée sur l'ANGLAIS. Ses listes de vocabulaire (leverage, foster, robust…) ne
// traversent pas ; ses règles de STRUCTURE, si — et c'est exactement ce que le prompt dit d'en
// tirer : « elles servent à la structure, jamais au ton ».
//
// Les cinq contrôles ci-dessous sont la transposition française des règles du tier STRICT, avec
// pour chacune le chiffre de portée que la skill lui attache. Ce n'est pas moi qui décide qu'une
// tournure est mauvaise : c'est son corpus, et il est daté.

import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const texte = fs.readFileSync(path.join(RACINE, 'plans', 'publications-10.md'), 'utf8')

// Les règles, avec leur source dans la skill.
const REGLES = [
  {
    cle: 'negation-revelation',
    quoi: '« Ce n’est pas X, c’est Y » — reveal bridge « It’s not X, it’s Y »',
    portee: '−4,9 % de portée (corpus de la skill, tier STRICT)',
    re: /\bc(?:e n['’]est|’est|e n['’]était)\s+pas\b[^.?!]{0,90}[,:;]\s*c(?:['’]est|e sont)\b/gi,
  },
  {
    cle: 'closer-interrogatif',
    quoi: 'Question d’engagement en clôture — famille « What do you think? »',
    portee: 'listé comme cliché closer tell, tier STRICT',
    re: /\?\s*\n>\s*\n>\s*prestiapp\.fr/gi,
  },
  {
    cle: 'sincerite-jouee',
    quoi: 'Sincérité annoncée — « let me be honest », performed sincerity',
    portee: '2× plus fréquent en texte LLM qu’en texte humain expert (Schilke & Reimann 2025)',
    re: /\b(je vais être (?:franc|honnête)|soyons clairs?|honnêtement,|pour être honnête|je (?:dois|peux) l['’]avouer|je sais que c['’]est)\b/gi,
  },
  {
    cle: 'parallelisme-negatif',
    quoi: 'Parallélisme négatif — « No X. No Y. Just Z. » et ses six formes',
    portee: 'tier STRICT, toutes formes scrubées',
    re: /\b(?:ni|pas de)\s+[^.?!]{1,40}\s*,\s*(?:ni|pas de)\s+[^.?!]{1,40}\s*[,.]/gi,
  },
  {
    cle: 'cadratin',
    quoi: 'Densité de tirets cadratins',
    portee: 'plafond ≈ 1 pour 100 mots (au-delà : tier FORENSIC)',
    re: /—/g,
  },
]

// On ne compte que le texte À PUBLIER : les blocs cités « > », pas mes commentaires d'auteur.
const lignesCitees = texte.split(/\r?\n/).filter((l) => /^>\s/.test(l) && !/^>\s*\*\*/.test(l))
const corpus = lignesCitees.join('\n')
const mots = corpus.split(/\s+/).filter(Boolean).length

console.log(`Corpus audité : ${lignesCitees.length} lignes publiables, ${mots} mots.\n`)
console.log('─'.repeat(94))

let bloquants = 0
for (const r of REGLES) {
  const trouves = [...corpus.matchAll(r.re)]
  const n = trouves.length
  const densite = r.cle === 'cadratin' ? ` (${((n / mots) * 100).toFixed(2)} pour 100 mots)` : ''
  const verdict = r.cle === 'cadratin'
    ? (n / mots) * 100 <= 1 ? 'OK' : 'AVERTISSEMENT'
    : n === 0 ? 'OK' : n <= 2 ? 'AVERTISSEMENT' : 'BLOQUANT'
  if (verdict === 'BLOQUANT') bloquants++
  console.log(`\n${verdict.padEnd(14)} ${r.quoi}`)
  console.log(`${' '.repeat(14)} ${n} occurrence(s)${densite} · ${r.portee}`)
  for (const t of trouves.slice(0, 8)) {
    console.log(`${' '.repeat(16)}» ${t[0].replace(/\s+/g, ' ').trim().slice(0, 84)}`)
  }
  if (n > 8) console.log(`${' '.repeat(16)}… et ${n - 8} autres`)
}

console.log('\n' + '─'.repeat(94))
console.log(bloquants ? `✗ ${bloquants} règle(s) bloquante(s).` : '✓ Aucun bloquant.')
process.exit(bloquants ? 1 : 0)
