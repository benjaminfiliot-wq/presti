// scripts/mcp/presti-station.test.mjs — garde-fous du connecteur MCP « presti » (lecture seule).
// Usage : node scripts/mcp/presti-station.test.mjs        (aucun réseau : la base n'est jamais appelée)
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LECTURES, NOMS_OUTILS, masquer, etatAgent, traiter } from './presti-station.mjs'

const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'presti-station.mjs'), 'utf8')
let n = 0
const ok = (nom, fn) => { fn(); n++; console.log('ok', nom) }

// 1. une seule porte vers la base, et elle ne sait que lire
ok('toutes les lectures sont des fonctions pilotage_* de la liste blanche', () => { for (const f of LECTURES) assert.match(f, /^pilotage_[a-z_]+$/) })
ok('aucune écriture : pas de POST hors rpc, pas de PATCH/PUT/DELETE, pas de mot SQL d\'écriture', () => {
  assert.equal((source.match(/\/rest\/v1\//g) ?? []).length, 1, 'une seule URL de base')
  assert.doesNotMatch(source, /method:\s*['"](PATCH|PUT|DELETE)['"]/)
  assert.doesNotMatch(source, /\b(insert\s+into|update\s+ops|delete\s+from|drop\s+table|execute_sql)\b/i)
  assert.doesNotMatch(source, /station_(pause|consigne|reunion_(ouvrir|clore)|experience_lancer)/)
})
ok('aucun outil n\'actionne un interrupteur', () => { assert.ok(NOMS_OUTILS.includes('interrupteurs')); for (const nom of NOMS_OUTILS) assert.doesNotMatch(nom, /pause|ouvrir|envoyer|publier|payer|ecrire/) })
ok('la clé n\'est jamais écrite dans un fichier ni dans la console', () => { assert.doesNotMatch(source, /writeFile|appendFile/); assert.doesNotMatch(source, /console\.(log|error)\([^)]*CLE/) })

// 2. masquage des données de prospect
ok('masquer retire adresse, lien, numéro, nom', () => {
  const s = masquer('Contacter M. Dupont Jean au 06 12 34 56 78 ou dupont@exemple.fr sur https://dupont-toiture.fr')
  assert.doesNotMatch(s, /Dupont|06 12|@|https|dupont-toiture/)
})

// 3. états
ok('etatAgent reprend les seuils de la station', () => {
  const t = Date.parse('2026-10-05T12:00:00Z')
  assert.equal(etatAgent({ battement_le: '2026-10-05T11:58:00Z', periode_minutes: 5 }, t), 'actif')
  assert.equal(etatAgent({ battement_le: '2026-10-05T11:40:00Z', periode_minutes: 5 }, t), 'muet')
  assert.equal(etatAgent({ battement_le: '2026-10-05T07:00:00Z', periode_minutes: 5 }, t), 'panne')
  assert.equal(etatAgent({ battement_le: null }, t), 'jamais')
  assert.equal(etatAgent({ en_pause: true }, t), 'pause')
  assert.equal(etatAgent({ disjoncteur_ouvert_le: '2026-10-05T11:00:00Z' }, t), 'disjoncteur')
})

// 4. protocole
const appel = async (m) => traiter({ jsonrpc: '2.0', ...m })
const init = await appel({ id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })
ok('initialize', () => { assert.equal(init.result.serverInfo.name, 'presti'); assert.ok(init.result.capabilities.tools) })
const liste = await appel({ id: 2, method: 'tools/list' })
ok('tools/list : 7 outils, tous en lecture seule', () => { assert.equal(liste.result.tools.length, 7); for (const o of liste.result.tools) assert.equal(o.annotations.readOnlyHint, true) })
const silence = await appel({ method: 'notifications/initialized' })
ok('notification sans réponse', () => assert.equal(silence, null))
const inconnu = await appel({ id: 3, method: 'tools/call', params: { name: 'envoyer_message', arguments: {} } })
ok('un outil inconnu est refusé', () => assert.ok(inconnu.error))
const mauvais = await appel({ id: 4, method: 'resources/write' })
ok('une méthode inconnue est refusée', () => assert.equal(mauvais.error.code, -32601))

console.log(`\n${n} vérifications passées`)
