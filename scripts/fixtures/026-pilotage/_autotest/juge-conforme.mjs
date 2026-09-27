// scripts/fixtures/026-pilotage/_autotest/juge-conforme.mjs — juge FACTICE de l'autotest JA-10 de
// scripts/juges-026-pilotage-preuve.mjs (026-012). Il ne juge rien du produit : il sert de cas conforme, pour prouver que
// la preuve durcie laisse passer un juge qui sait être vert sur un témoin ET rouge sur chaque sabotage (sans ce cas, les
// refus des juges toujours rouges ou toujours verts ne prouveraient rien).
//
//   node scripts/fixtures/026-pilotage/_autotest/juge-conforme.mjs [--racine=<dossier>] [--temoin]
//
// Il lit <racine>/docs/autotest-026/regles.json et juge quatre critères : ZT-1 le fichier existe et porte exactement les
// clés attendues ; ZT-2 le plafond est un entier de 1 à 50 ; ZT-3 les canaux sont connus et sans doublon ; ZT-4 la phrase
// est exacte. --temoin : seulement l'auto-contrôle de ses propres règles (ZT-T1). Code 0 si tout est vert, 1 sinon, 2 si
// l'appel est invalide. N'écrit rien ; aucun réseau.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const NOM = 'juge-conforme (autotest JA-10)'
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const FICHIER = 'docs/autotest-026/regles.json'
const CLES = ['canaux', 'phrase', 'plafond']
const CANAUX_CONNUS = ['formulaire_site', 'messagerie', 'appel']
const PHRASE = "Aucun envoi à froid avant l'ouverture par Benj."

let racine = R, temoin = false
for (const a of process.argv.slice(2)) {
  const m = /^--racine=(.+)$/.exec(a)
  if (m) racine = path.resolve(R, m[1])
  else if (a === '--temoin') temoin = true
  else { console.log(`${NOM} : appel refusé — option inconnue ${a}`); process.exit(2) }
}
if (!fs.existsSync(racine) || !fs.statSync(racine).isDirectory()) { console.log(`${NOM} : appel refusé — --racine ${racine} n'est pas un dossier`); process.exit(2) }

const rouges = []
const juger = (id, echecs, detail) => {
  if (echecs.length) { rouges.push(id); console.log(`❌ ${id} ${echecs.join(' ; ')}`) } else console.log(`✅ ${id} ${detail}`)
}

/** Les défauts d'un objet de règles, critère par critère. → { 'ZT-2': [...], 'ZT-3': [...], 'ZT-4': [...] } */
function defauts(r) {
  const d = { 'ZT-2': [], 'ZT-3': [], 'ZT-4': [] }
  if (!Number.isInteger(r.plafond) || r.plafond < 1 || r.plafond > 50) d['ZT-2'].push(`plafond ${JSON.stringify(r.plafond)} : un entier de 1 à 50 attendu`)
  if (!Array.isArray(r.canaux) || !r.canaux.length) d['ZT-3'].push(`canaux ${JSON.stringify(r.canaux)} : une liste non vide attendue`)
  else {
    const inconnus = r.canaux.filter((c) => !CANAUX_CONNUS.includes(c))
    if (inconnus.length) d['ZT-3'].push(`canal inconnu : ${inconnus.join(', ')}`)
    if (new Set(r.canaux).size !== r.canaux.length) d['ZT-3'].push(`canal en double dans ${JSON.stringify(r.canaux)}`)
  }
  if (r.phrase !== PHRASE) d['ZT-4'].push(`phrase ${JSON.stringify(r.phrase)}, « ${PHRASE} » attendue`)
  return d
}

console.log(`${NOM} — racine ${racine}${temoin ? ' — témoin' : ''}`)
if (temoin) {
  const e = []
  const bon = defauts({ plafond: 12, canaux: ['messagerie'], phrase: PHRASE })
  for (const [id, x] of Object.entries(bon)) if (x.length) e.push(`un jeu conforme refusé par ${id} : ${x[0]}`)
  const cas = [['ZT-2', { plafond: 0 }], ['ZT-2', { plafond: 12.5 }], ['ZT-3', { canaux: ['messagerie', 'messagerie'] }], ['ZT-3', { canaux: ['pigeon'] }], ['ZT-4', { phrase: 'autre' }]]
  for (const [id, x] of cas) if (!defauts({ plafond: 12, canaux: ['messagerie'], phrase: PHRASE, ...x })[id].length) e.push(`${JSON.stringify(x)} n'est pas vu par ${id}`)
  juger('ZT-T1', e, `règles auto-contrôlées : un jeu conforme passe, ${cas.length} jeux fautifs sont vus chacun par son critère`)
} else {
  let r = null
  const e1 = []
  const f = path.join(racine, FICHIER)
  if (!fs.existsSync(f)) e1.push(`${FICHIER} absent de ${racine}`)
  else {
    try { r = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (err) { e1.push(`${FICHIER} illisible : ${String(err.message).slice(0, 80)}`) }
    if (r !== null && (typeof r !== 'object' || Array.isArray(r))) e1.push(`${FICHIER} n'est pas un objet`)
    else if (r && Object.keys(r).sort().join() !== CLES.join()) e1.push(`clés ${Object.keys(r).sort().join(', ')}, ${CLES.join(', ')} attendues`)
  }
  juger('ZT-1', e1, `${FICHIER} présent, objet aux clés ${CLES.join(', ')}`)
  if (e1.length) for (const id of ['ZT-2', 'ZT-3', 'ZT-4']) juger(id, ['non jugé : ZT-1 en échec'], '')
  else {
    const d = defauts(r)
    juger('ZT-2', d['ZT-2'], `plafond ${r.plafond}, entier de 1 à 50`)
    juger('ZT-3', d['ZT-3'], `canaux ${r.canaux.join(', ')}, connus et sans doublon`)
    juger('ZT-4', d['ZT-4'], 'phrase exacte')
  }
}
console.log(rouges.length ? `${NOM} : FAIL — ${rouges.join(', ')}` : `${NOM} : PASS`)
process.exitCode = rouges.length ? 1 : 0
