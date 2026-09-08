// Les fichiers « à coller » se parsent-ils, et disent-ils la même chose que la migration ?
//
// Benj ne colle pas `supabase/migrations/00NN_*.sql` : il colle son jumeau `_A_COLLER_…`, fabriqué
// par un outil. Le 08/09 l'un d'eux a coupé un `comment on … is '…'` en plein milieu d'une chaîne :
// le fichier ne se parsait plus, et la découverte s'est faite dans le SQL Editor, chez lui, en
// pleine action. Aucun test ne pouvait le dire avant, parce qu'aucun test ne regardait les jumeaux.
//
// Deux contrôles, du plus important au moins important :
//
//   1. PARSABILITÉ — pour TOUS les jumeaux. Chaînes refermées, blocs `$tag$` appariés, parenthèses
//      équilibrées. C'est exactement ce qui a lâché, et ça se vérifie sans connaître la migration.
//   2. ÉQUIVALENCE — pour ceux dont on retrouve la ou les migrations d'origine. Le SQL exécutable
//      (commentaires retirés des deux côtés, blocs `$fn$` compris) doit se retrouver à l'identique.
//
// Un jumeau a le droit d'être plus court qu'une migration (on retire des `comment on`) et d'avoir en
// plus des requêtes de CONTRÔLE post-collage — celles que Benj lit pour vérifier que ça a pris. Ces
// deux libertés sont nommées ci-dessous ; tout le reste est une divergence.
//
// Usage : node scripts/migrations-jumelles-e2e.mjs

import fs from 'node:fs'
import path from 'node:path'
import { sansCommentaires, MARQUE_CONTROLE } from './sql-nu.mjs'

const DIR = 'supabase/migrations'
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

const sansCommentairesPartout = (sql) =>
  sansCommentaires(sql).replace(/\$([A-Za-z_]*)\$([\s\S]*?)\$\1\$/g, (_t, tag, corps) => `$${tag}$${sansCommentaires(corps)}$${tag}$`)
const lignes = (sql) => sansCommentairesPartout(sql).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim())

// Tolérance nommée : ce qu'un jumeau a le droit de porter en plus. Une requête que Benj lance APRÈS
// avoir collé, pour voir de ses yeux que la migration a pris.
const EST_CONTROLE = (l) => /information_schema|pg_catalog|pg_policies|pg_proc|^do \$garde\$|^end \$garde\$|^\s*raise notice/i.test(l)

/** Les migrations que ce jumeau couvre. `0047_a_0052` = la plage ; `0054_0055` = les deux ; `0068b` = 0068. */
function migrationsDe(jumeau, toutes) {
  const nums = [...jumeau.matchAll(/(\d{4})/g)].map((m) => m[1])
  if (!nums.length) return []
  const cherchees = /_a_/i.test(jumeau) && nums.length >= 2
    ? toutes.filter((f) => { const n = /^(\d{4})_/.exec(f)?.[1]; return n && n >= nums[0] && n <= nums[nums.length - 1] })
    : nums.map((n) => toutes.find((f) => f.startsWith(`${n}_`))).filter(Boolean)
  return [...new Set(cherchees)].sort()
}

// Trois jumeaux vivent à la RACINE du dépôt : ils échappaient à la suite écrite exactement pour
// les surveiller. Un fichier à coller reste un livrable, où qu'il soit rangé.
const aLaRacine = fs.readdirSync('.').filter((f) => f.startsWith('_A_COLLER_') && f.endsWith('.sql'))
const fichiers = fs.readdirSync(DIR)
const migrations = fichiers.filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort()
const jumeaux = fichiers.filter((f) => f.startsWith('_A_COLLER_') && f.endsWith('.sql')).sort()

console.log('\n══ Les fichiers « à coller » ══\n')
T(`des jumeaux à vérifier (${jumeaux.length} trouvés)`, jumeaux.length > 0, 'aucun _A_COLLER_ : la suite ne prouve rien')
T(`aucun fichier à coller n'est resté à la racine${aLaRacine.length ? ' — ' + aLaRacine.join(', ') : ''}`,
  aLaRacine.length === 0, 'déplacez-les dans supabase/migrations/ pour qu’ils soient vérifiés')

console.log('\n1. Ils se parsent — le contrôle que le 08/09 a rendu obligatoire')
for (const j of jumeaux) {
  const brut = fs.readFileSync(path.join(DIR, j), 'utf8')
  const noc = sansCommentairesPartout(brut)
  // Le corps des blocs `$tag$` est du texte : ses apostrophes et parenthèses ne comptent pas.
  const hors = noc.replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, '$$$$')
  const apos = (hors.match(/'/g) ?? []).length
  const tags = [...noc.matchAll(/\$([A-Za-z_]*)\$/g)].map((m) => m[0])
  const compte = tags.reduce((a, t) => ({ ...a, [t]: (a[t] ?? 0) + 1 }), {})
  const impairs = Object.entries(compte).filter(([, n]) => n % 2 !== 0).map(([t]) => t)
  const sansChaines = hors.replace(/'(?:[^']|'')*'/g, "''")
  const par = (sansChaines.match(/\(/g) ?? []).length - (sansChaines.match(/\)/g) ?? []).length

  T(`${j} : chaînes refermées`, apos % 2 === 0, `${apos} apostrophes hors bloc — une chaîne coupée en deux`)
  T(`${j} : blocs $…$ appariés`, impairs.length === 0, `impairs : ${impairs.join(', ')}`)
  T(`${j} : parenthèses équilibrées`, par === 0, `${par > 0 ? par + ' de trop' : -par + ' manquantes'}`)
}

console.log('\n2. Ils portent le SQL de leur migration')
for (const j of jumeaux) {
  const src = migrationsDe(j, migrations)
  if (!src.length) { T(`${j} → ses migrations sont retrouvables`, false, 'aucun numéro exploitable dans le nom'); continue }
  const attendu = lignes(src.map((f) => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n'))
  // Le générateur ajoute en fin de fichier un bloc qui LIT l'état de la base après collage, pour
  // que Benj voie ce qui a été créé au lieu de le supposer. Il ne modifie rien, et il n'a donc pas
  // à se retrouver dans la migration. On coupe dessus au lieu d'élargir une regex à vue.
  const brutJ = fs.readFileSync(path.join(DIR, j), 'utf8')
  const trouve = lignes(brutJ.split(MARQUE_CONTROLE)[0])

  let i = 0, perdue = null
  for (const l of trouve) {
    if (EST_CONTROLE(l)) continue
    const k = attendu.indexOf(l, i)
    if (k === -1) { if (attendu.includes(l)) continue; perdue = l; break } // hors ordre : toléré, absent : non
    i = k + 1
  }
  T(`${j} ⊂ ${src.join(' + ')}`, perdue === null,
    perdue === null ? '' : `cette ligne du jumeau n'existe dans aucune :\n        ${perdue.slice(0, 150)}`)
}

console.log('\n3. Le piège qui a réellement fait refuser une migration')
//
// Il n'y en a qu'un ici, et pas trois. J'avais aussi accusé `pg_column_size` dans un CHECK : c'est
// faux. `0053_plateforme_persona.sql` en porte un depuis des semaines et tourne en prod — Postgres
// n'exige l'immutabilité que pour les index, pas pour les contraintes. Une suite qui allume un
// rouge permanent sur une migration qui marche apprend à ignorer ses propres rouges.
const pieges = []
for (const f of [...jumeaux, ...migrations]) {
  const noc = sansCommentairesPartout(fs.readFileSync(path.join(DIR, f), 'utf8'))
  // U&'...' dépend de `standard_conforming_strings` côté serveur : écrire le caractère en clair.
  if (/U&'/.test(noc)) pieges.push(`${f} : littéral U&'…' — écrire le caractère en clair`)
}
T(`aucun littéral U&'…' dans une migration`, pieges.length === 0, pieges.join('\n        '))

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués\n`)
process.exitCode = ko ? 1 : 0
