// Génère noeuds/decider.js à partir de noeuds/decider.modele.js et des SOURCES du chemin codé (lib/pilote/regles.ts, lib/plateformeConfig.ts,
// lib/plans.ts) : les listes de mots d'escalade, les expressions et les offres ne sont jamais retapées.
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/032-044/generer.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const lire = (c) => readFileSync(path.join(RACINE, c), 'utf8')
const regles = lire('lib/pilote/regles.ts')
const config = lire('lib/plateformeConfig.ts')
const tableau = (nom) => {
  const m = new RegExp(`export const ${nom}: readonly string\\[\\] = \\[([\\s\\S]*?)\\n?\\]\\n`).exec(regles)
  if (!m) throw new Error(`liste absente de regles.ts : ${nom}`)
  return new Function(`return [${m[1]}]`)()
}
const regex = (nom) => {
  const m = new RegExp(`^const ${nom} = (/.*/[a-z]*)$`, 'm').exec(regles)
  if (!m) throw new Error(`expression absente de regles.ts : ${nom}`)
  return `const ${nom} = ${m[1]};`
}
const defaut = new Function(`return ${/escalade_mots: (\[[^\]]*\])/.exec(config.slice(config.indexOf('export const CONFIG_DEFAUT')))[1]}`)()
const { PLANS, peut } = await import(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)
// Les offres : ce que `peut` répond pour chaque offre connue, et pour une offre inconnue (le repli de planConf), jamais retapé.
const OFFRES = Object.fromEntries([...Object.keys(PLANS), '*'].map((p) => {
  const id = p === '*' ? '__offre_inconnue__' : p
  return [p, { plateforme: peut(id, 'plateforme.conversation'), relances_auto: peut(id, 'relances.auto') }]
}))
const modele = readFileSync(path.join(ICI, 'noeuds/decider.modele.js'), 'utf8')
const code = modele
  .replace('@@MOTS_TOUJOURS@@', JSON.stringify(tableau('MOTS_ESCALADE_TOUJOURS')))
  .replace('@@MOTS_ENTIERS@@', JSON.stringify(tableau('MOTS_ESCALADE_ENTIERS')))
  .replace('@@REGEX@@', ['FAUSSE_URGENCE', 'PERTE_D_EAU', 'APPAREIL_PERD', 'NOMS_NEUTRES'].map(regex).join('\n'))
  .replace('@@OFFRES@@', JSON.stringify(OFFRES))
  .replace('@@ESCALADE_DEFAUT@@', JSON.stringify(defaut))
writeFileSync(path.join(ICI, 'noeuds/decider.js'), code)
console.log(`decider.js écrit : ${code.length} caractères ; offres : ${Object.entries(OFFRES).map(([p, o]) => `${p}${o.plateforme ? '+P' : ''}${o.relances_auto ? '+A' : ''}`).join(' ')}`)
