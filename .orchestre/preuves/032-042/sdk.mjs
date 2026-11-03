// Écrit sdk.txt : le code du SDK n8n qui construit presti-reponse-seule (à passer à validate_workflow puis create_workflow_from_code).
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { noeuds, CHAINE, BRANCHES } from './workflow-def.mjs'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const ns = noeuds().map((n) => (n.parameters?.jsCode && process.argv.includes('--stub') ? { ...n, parameters: { ...n.parameters, jsCode: 'return $input.all();' } } : n))
const ident = (nom) => 'n_' + nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_')
const lignes = ["import { workflow, node, trigger } from '@n8n/workflow-sdk';", '']
for (const n of ns) {
  const { name, type, typeVersion, parameters, position, notes, disabled, executeOnce, credentials } = n
  const config = { name, parameters, position, ...(notes ? { notes } : {}), ...(disabled ? { disabled: true } : {}), ...(executeOnce ? { executeOnce: true } : {}), ...(credentials ? { credentials } : {}) }
  const fabrique = type.endsWith('scheduleTrigger') ? 'trigger' : 'node'
  lignes.push(`const ${ident(name)} = ${fabrique}({ type: ${JSON.stringify(type)}, version: ${typeVersion}, config: ${JSON.stringify(config)} });`)
}
let chaine = `export default workflow('presti-reponse-seule', 'presti-reponse-seule')\n  .add(${ident(CHAINE[0])})`
for (const nom of CHAINE.slice(1)) chaine += `\n  .to(${ident(nom)})`
for (const [filtre, envoi] of BRANCHES) chaine += `\n  .add(${ident('Courriers a envoyer')})\n  .to(${ident(filtre)}.to(${ident(envoi)}))`
lignes.push('', chaine + ';', '')
writeFileSync(path.join(ICI, 'sdk.txt'), lignes.join('\n'))
console.log('sdk.txt :', lignes.join('\n').length, 'caractères')
