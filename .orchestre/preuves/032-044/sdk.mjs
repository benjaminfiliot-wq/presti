// Écrit sdk.txt : le code du SDK n8n qui construit presti-relances, tel qu'il a été passé à create_workflow_from_code (le SDK n'accepte ni fonction
// fléchée ni constante partagée : chaque nœud est écrit littéralement). Même source que l'export (workflow-def.mjs).
//   node sdk.mjs
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { noeuds, CHAINE, BRANCHES } from './workflow-def.mjs'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const ns = noeuds()
const ident = (nom) => 'n_' + nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_')
const lignes = ["import { workflow, node, trigger } from '@n8n/workflow-sdk';", '']
for (const n of ns) {
  const { name, type, typeVersion, parameters, position, notes, disabled, executeOnce, alwaysOutputData, credentials } = n
  const config = { name, parameters, position, ...(notes ? { notes } : {}), ...(disabled ? { disabled: true } : {}), ...(executeOnce ? { executeOnce: true } : {}), ...(alwaysOutputData ? { alwaysOutputData: true } : {}), ...(credentials ? { credentials } : {}) }
  lignes.push(`const ${ident(name)} = ${type.endsWith('scheduleTrigger') ? 'trigger' : 'node'}({ type: ${JSON.stringify(type)}, version: ${typeVersion}, config: ${JSON.stringify(config)} });`)
}
let chaine = `export default workflow('presti-relances', 'presti-relances')\n  .add(${ident(CHAINE[0])})`
for (const nom of CHAINE.slice(1)) chaine += `\n  .to(${ident(nom)})`
for (const [filtre, envoi] of BRANCHES) chaine += `\n  .add(${ident('Courriers a envoyer')})\n  .to(${ident(filtre)}.to(${ident(envoi)}))`
lignes.push('', chaine + ';', '')
writeFileSync(path.join(ICI, 'sdk.txt'), lignes.join('\n'))
console.log('sdk.txt :', lignes.join('\n').length, 'caractères')
