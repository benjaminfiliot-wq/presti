// Contre-vérification de 026-227 : sabotages RÉVERSIBLES de la production (scripts/chef/lancer-experience.mjs).
// Chaque sabotage remplace UNE chaîne exacte, lance le juge sur le dépôt réel, relit le rapport JSON (critère rouge), puis
// restaure le fichier d'origine et contrôle son sha256. Une sauvegarde est copiée avant, hors du dépôt.
// Usage : node contre-verif-sabotages.mjs <dossier-de-sauvegarde>
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import cp from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..', '..')
const FICHIER = path.join(DEPOT, 'scripts', 'chef', 'lancer-experience.mjs')
const SAUVE = path.resolve(process.argv[2] || path.join(DEPOT, '.orchestre', 'travail', 'contre-verif-026-227'))
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const original = fs.readFileSync(FICHIER)
const shaAvant = sha(original)
fs.mkdirSync(SAUVE, { recursive: true })
fs.writeFileSync(path.join(SAUVE, 'lancer-experience.mjs.sauvegarde'), original)
const restaurer = () => { try { fs.writeFileSync(FICHIER, original) } catch { /* contrôle final ci-dessous */ } }
process.on('exit', restaurer)

const SABOTAGES = [
  ['EX-2', 'un indicateur « test » absent est pris pour un non', 'v.confirme === true && v.test === false && texte(v.source)', 'v.confirme === true && v.test !== true && texte(v.source)'],
  ['EX-2', "un encaissement sans source est accepté", 'v.confirme === true && v.test === false && texte(v.source))', 'v.confirme === true && v.test === false)'],
  ['EX-3', 'un accord sur un autre objectif est pris pour un accord', 'if (a.objectif !== d.objectif) return { faute: refus(', 'if (false) return { faute: refus('],
  ['EX-4', "le seuil d'arrêt n'est plus exigé", 'if (!texte(d.seuil_arret)) return refus(', 'if (false) return refus('],
  ['EX-5', 'le froid s\'ouvre avant le 12/10', "includes('froid') && maintenant < OUVERTURE_FROID", "includes('froid') && false && maintenant < OUVERTURE_FROID"],
  ['EX-6', 'un second lancement du même id redémarre', '    return { deja: true, experience: existante }', '    return demarrer(existante, deps, cle)'],
  ['EX-7', 'un cadre modifié ne demande plus de nouvel accord', 'if (changes.length) return refus(', 'if (false) return refus('],
  ['EX-8', 'une mesure absente conclut par un succès', 'succes: false, suspendue: true,', 'succes: true, suspendue: true,'],
  ['EX-9', 'le bilan bascule un drapeau', "decision: 'recommandation soumise à Benj ; aucun drapeau ni prix modifié',", "decision: (await deps.drapeaux?.basculer?.(), 'drapeau basculé'),"],
]

function juger(rapport) {
  const r = cp.spawnSync(process.execPath, ['scripts/juges-026-completude-qa.mjs', '--partie=experience', `--rapport=${rapport}`], { cwd: DEPOT, encoding: 'utf8', windowsHide: true, timeout: 240_000 })
  let json = null
  try { json = JSON.parse(fs.readFileSync(rapport, 'utf8')) } catch { /* rapport absent */ }
  return { code: r.status, rouges: json?.rouges ?? null, sortie: `${r.stdout || ''}${r.stderr || ''}` }
}

console.log(`fichier : scripts/chef/lancer-experience.mjs\nsha256 avant : ${shaAvant}\n`)
const temoin = juger(path.join(SAUVE, 'rapport-temoin.json'))
console.log(`témoin (production intacte) : code ${temoin.code}, rouges ${JSON.stringify(temoin.rouges)}\n`)
let manques = temoin.code === 0 ? 0 : 1
const texte = original.toString('utf8')
console.log('| # | Sabotage de la production | Code | Critères rouges | Critère visé |')
console.log('|---|---|---|---|---|')
let i = 0
for (const [critere, quoi, de, vers] of SABOTAGES) {
  i++
  const n = texte.split(de).length - 1
  if (n !== 1) { console.log(`| ${i} | ${quoi} | — | chaîne trouvée ${n} fois (1 attendue) | ${critere} |`); manques++; continue }
  let r
  try { fs.writeFileSync(FICHIER, texte.replace(de, () => vers)); r = juger(path.join(SAUVE, `rapport-${i}.json`)) } finally { restaurer() }
  const apres = sha(fs.readFileSync(FICHIER))
  const rouge = Array.isArray(r.rouges) && r.rouges.includes(critere)
  if (!(r.code === 1 && rouge) || apres !== shaAvant) manques++
  console.log(`| ${i} | ${quoi} | ${r.code} | ${(r.rouges || []).join(', ') || 'aucun'} | ${critere} ${rouge ? 'rouge' : 'NON ROUGE'}${apres === shaAvant ? '' : ' — FICHIER NON RESTAURÉ'} |`)
}
const shaApres = sha(fs.readFileSync(FICHIER))
console.log(`\nsha256 après : ${shaApres}\nrestauration : ${shaApres === shaAvant ? 'identique (sha256 égaux)' : 'DIFFÉRENTE'}`)
const final = juger(path.join(SAUVE, 'rapport-final.json'))
console.log(`juge après restauration : code ${final.code}, rouges ${JSON.stringify(final.rouges)}`)
console.log(`\n${manques || shaApres !== shaAvant || final.code !== 0 ? 'ÉCHEC de la contre-vérification' : `${SABOTAGES.length}/${SABOTAGES.length} sabotages rougis sur le critère visé, production restaurée`}`)
process.exitCode = manques || shaApres !== shaAvant || final.code !== 0 ? 1 : 0
