// Essai à sec de la ligne de commande de 026-227 : données fictives, dossier de travail jetable, aucun réseau.
// Usage : node essai-cli.mjs <dossier-jetable>   (écrit ses fichiers fictifs dans ce dossier, puis y lance le CLI)
import fs from 'node:fs'
import path from 'node:path'
import cp from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const CLI = path.resolve(ICI, '..', '..', '..', 'scripts', 'chef', 'lancer-experience.mjs')
const D = path.resolve(process.argv[2] || path.join(ICI, '..', '..', 'travail', 'essai-cli-026-227'))
fs.rmSync(D, { recursive: true, force: true })
fs.mkdirSync(D, { recursive: true })
const OBJ = 'réduire les abandons de devis sur mobile (essai fictif)'
const ecrire = (n, v) => fs.writeFileSync(path.join(D, n), JSON.stringify(v, null, 2))
ecrire('demande.json', { id: 'exp-cli-a-sec', version: 1, source: 'decision-benj', objectif: OBJ, metrique: { nom: 'abandon', depart: 0.4, sens: 'baisse' }, horizon_jours: 14, population: 'artisans fictifs', seuil_arret: 'abandon > 0,5', cout_max_eur: 0, touche: ['site'], accord_benj: { id: 'accord-cli-fictif', objectif: OBJ, date: '2026-10-01T08:00:00.000Z' } })
ecrire('ventes-ok.json', [{ id: 'vente-fictive', statut: 'encaisse', confirme: true, test: false, source: 'stripe:evt_fictif (essai)' }])
ecrire('ventes-ko.json', [{ id: 'devis-fictif', statut: 'devis', confirme: false, test: false, source: 'devis:fictif' }])
ecrire('mesure-incomplete.json', { valeur: 0.3, source: 'mesure fictive' })
const T = path.join(D, 'travail')
const f = (n) => path.join(D, n)
const essais = [
  ['devis seulement (à sec)', ['--lancer=' + f('demande.json'), '--ventes=' + f('ventes-ko.json'), '--a-sec', '--travail=' + T], 3],
  ['sans fichier de ventes (à sec)', ['--lancer=' + f('demande.json'), '--a-sec', '--travail=' + T], 3],
  ['encaissement confirmé (à sec)', ['--lancer=' + f('demande.json'), '--ventes=' + f('ventes-ok.json'), '--a-sec', '--travail=' + T], 0],
  ['même id relancé (à sec)', ['--lancer=' + f('demande.json'), '--ventes=' + f('ventes-ok.json'), '--a-sec', '--travail=' + T], 0],
  ['état', ['--etat=exp-cli-a-sec', '--a-sec', '--travail=' + T], 0],
  ['arrêt forcé', ['--arreter=exp-cli-a-sec', '--motif=arrêt forcé (essai)', '--a-sec', '--travail=' + T], 0],
  ['conclure après arrêt', ['--conclure=exp-cli-a-sec', '--mesure=' + f('mesure-incomplete.json'), '--a-sec', '--travail=' + T], 0],
  ['id piégé', ['--etat=../evasion', '--a-sec', '--travail=' + T], 3],
  ['sans argument', [], 2],
]
let faux = 0
for (const [nom, args, attendu] of essais) {
  const r = cp.spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', windowsHide: true })
  const verdict = attendu === null ? 'observé' : r.status === attendu ? 'ok' : 'ÉCART'
  if (verdict === 'ÉCART') faux++
  console.log(`## ${nom} — code ${r.status}${attendu === null ? '' : ` (attendu ${attendu}) ${verdict}`}\n${(r.stdout + r.stderr).trim()}\n`)
}
console.log('## journal des événements (à sec)')
console.log(fs.readFileSync(path.join(T, 'evenements.jsonl'), 'utf8').trim())
console.log('\n## registre')
const e = JSON.parse(fs.readFileSync(path.join(T, 'experience-exp-cli-a-sec.json'), 'utf8'))
console.log(`état ${e.etat} · conclusion ${e.conclusion} · succes ${e.succes} · suspendue ${e.suspendue} · historique ${e.historique.map((h) => h.etat).join(' > ')}`)
const mod = await import(pathToFileURL(CLI).href)
const vide = path.join(D, 'racine-vide')
fs.mkdirSync(vide, { recursive: true })
const manque = mod.dependancesManquantes(vide)
console.log(`dépendances sur une racine sans verdicts : ${manque.join(', ') || 'aucune'} (3 attendues : usage réel fermé)`)
if (manque.length !== 3) faux++
console.log(`dépendances sur le dépôt : ${mod.dependancesManquantes().join(', ') || 'toutes PASS (usage réel ouvert)'}`)
console.log(`\n${faux ? 'ÉCARTS' : 'essai à sec cohérent'} : ${essais.length} essais`)
process.exitCode = faux ? 1 : 0
