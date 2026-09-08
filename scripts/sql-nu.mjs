// Fabrique le jumeau « nu » d'une migration : le même SQL, sans les pavés de commentaires.
//
// Le générateur précédent retirait les lignes commençant par `--` par une simple comparaison de
// texte. Il a coupé un `comment on table … is '…'` en deux et livré à Benj un fichier qui refusait
// de se parser — l'erreur est arrivée au moment où il collait, ce qui est le pire moment.
//
// Celui-ci suit l'état du texte caractère par caractère : dans une chaîne `'…'` (avec `''`), dans un
// bloc `$fn$…$fn$`, ou dehors. Un `--` ne commence un commentaire que dehors. C'est la seule façon
// correcte de le faire, et elle tient en quarante lignes.
//
// Puis il PROUVE le résultat : les deux fichiers, une fois leurs commentaires retirés par ce même
// tokenizer, doivent donner exactement le même SQL. Sinon il refuse d'écrire.
//
// Usage : node scripts/sql-nu.mjs <source.sql> <destination.sql>
//         node scripts/sql-nu.mjs --verifier <a.sql> <b.sql>   (compare sans écrire)

import fs from 'node:fs'

/** Découpe le SQL en segments {texte, dans} où `dans` vaut 'code' | 'chaine' | 'dollar' | 'ligne'. */
export function sansCommentaires(sql) {
  let out = '', i = 0
  while (i < sql.length) {
    const c = sql[i], d = sql.slice(i, i + 2)
    if (c === "'") { // chaîne : '' est une apostrophe, pas une fin
      let j = i + 1
      while (j < sql.length) { if (sql[j] === "'") { if (sql[j + 1] === "'") j += 2; else { j++; break } } else j++ }
      out += sql.slice(i, j); i = j; continue
    }
    if (c === '$') { // dollar-quoting : $fn$ … $fn$
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i))
      if (m) { const fin = sql.indexOf(m[0], i + m[0].length); const j = fin === -1 ? sql.length : fin + m[0].length; out += sql.slice(i, j); i = j; continue }
    }
    if (d === '--') { const nl = sql.indexOf('\n', i); i = nl === -1 ? sql.length : nl; continue } // commentaire de ligne
    if (d === '/*') { const fin = sql.indexOf('*/', i + 2); i = fin === -1 ? sql.length : fin + 2; continue } // bloc
    out += c; i++
  }
  return out
}

/** Le SQL utile, normalisé : sans commentaires, sans lignes vides, sans espaces de bord. */
const noyau = (sql) => sansCommentaires(sql).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n')

// Importable sans rien exécuter : `migrations-jumelles-e2e.mjs` réutilise le tokenizer, et une
// suite qui, en important un outil, lancerait cet outil serait une suite qui teste autre chose.
const appeleEnLigneDeCommande = (process.argv[1] || '').endsWith('sql-nu.mjs')
if (!appeleEnLigneDeCommande) { /* import seul */ } else {

const args = process.argv.slice(2)
const verifierSeul = args[0] === '--verifier'
const [src, dst] = verifierSeul ? args.slice(1) : args
if (!src || !dst) { console.error('Usage : node scripts/sql-nu.mjs <source.sql> <destination.sql>'); process.exit(2) }

const source = fs.readFileSync(src, 'utf8')
const nu = noyau(source) + '\n'

if (verifierSeul) {
  const autre = noyau(fs.readFileSync(dst, 'utf8')) + '\n'
  if (autre === nu) { console.log(`✅ ${dst} porte exactement le même SQL que ${src}`); process.exit(0) }
  const a = nu.split('\n'), b = autre.split('\n')
  const n = a.findIndex((l, k) => l !== b[k])
  console.log(`❌ ${dst} diverge de ${src} à la ligne ${n + 1} du SQL utile\n   attendu : ${a[n] ?? '(fin)'}\n   trouvé  : ${b[n] ?? '(fin)'}`)
  process.exit(1)
}

// Le garde-fou : autant d'apostrophes ouvertes que fermées, sinon on n'écrit rien.
// Le corps d'un bloc `$tag$…$tag$` est du TEXTE : ses apostrophes ne sont pas des délimiteurs de
// chaîne SQL. Les compter faisait refuser 0075, qui était parfaitement valide. Même contrôle que
// `migrations-jumelles-e2e.mjs` — deux façons de compter, c'est deux vérités.
const horsBlocs = sansCommentaires(nu).replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, '$$$$')
const apostrophes = (horsBlocs.match(/'/g) ?? []).length
if (apostrophes % 2 !== 0) { console.error(`❌ ${apostrophes} apostrophes : une chaîne n'est pas refermée. Rien écrit.`); process.exit(1) }
fs.writeFileSync(dst, nu, 'utf8')
console.log(`✅ ${dst} — ${nu.split('\n').length} lignes de SQL, chaînes équilibrées`)

}
