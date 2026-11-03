// Génère noeuds/decider.js à partir de noeuds/decider.modele.js et des SOURCES du chemin codé (lib/pilote/regles.ts, lib/plateformeConfig.ts,
// lib/plans.ts) : les listes de mots d'escalade et les expressions ne sont jamais retapées. Puis imprime le code du SDK n8n qui construit le
// workflow (à passer à create_workflow_from_code).
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/032-042/generer.mjs [--sdk]
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
const PLANS_AUTO = Object.keys(PLANS).filter((p) => peut(p, 'plateforme.ia.auto'))
const modele = readFileSync(path.join(ICI, 'noeuds/decider.modele.js'), 'utf8')
const code = modele
  .replace('@@MOTS_TOUJOURS@@', JSON.stringify(tableau('MOTS_ESCALADE_TOUJOURS')))
  .replace('@@MOTS_ENTIERS@@', JSON.stringify(tableau('MOTS_ESCALADE_ENTIERS')))
  .replace('@@REGEX@@', ['FAUSSE_URGENCE', 'PERTE_D_EAU', 'APPAREIL_PERD', 'NOMS_NEUTRES'].map(regex).join('\n'))
  .replace('@@PLANS_AUTO@@', JSON.stringify(PLANS_AUTO))
  .replace('@@ESCALADE_DEFAUT@@', JSON.stringify(defaut))
writeFileSync(path.join(ICI, 'noeuds/decider.js'), code)
console.log(`decider.js écrit : ${code.length} caractères ; offres avec la réponse seule : ${PLANS_AUTO.join(', ')}`)
