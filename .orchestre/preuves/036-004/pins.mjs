// 036-004 — calcule, hors ligne, les données épinglées des essais n8n (test_workflow) : l'entrée du déclencheur, et pour chaque « Appeler … » la
// sortie que rendrait l'enfant (les sous-workflows ne sont pas couverts par les données épinglées : fiches-depots.md:433). Le juge les REJOUE ensuite.
//   node --experimental-strip-types .orchestre/preuves/036-004/pins.mjs <dossier> --ids='{"lib-controler-conflit":"…","presti-banc-suivi":"…"}'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { executer } from '../../../scripts/demo-entreprise-qa.mjs'
import * as F from './fixtures.mjs'
import { IDS } from './construire.mjs'
const dossier = process.argv[2] || '/tmp/s36004c'
const idsArg = JSON.parse((process.argv.find((a) => a.startsWith('--ids=')) || '--ids={}').slice(6))
mkdirSync(dossier, { recursive: true })
const { W, spec } = await F.monde(idsArg)
const J = JSON.stringify
const pinsDe = (nomWf, entrees, opts = {}) => {
  const r = executer(W[nomWf], entrees, W, { politique: 'notee', modele: F.modeleEpingle(), ...opts })
  if (r.erreur) throw new Error(nomWf + ' : ' + r.erreur)
  return r
}
const sous = (c, m = F.MAINTENANT, idx = [0, 1, 3, 6, 7, 9]) => F.enveloppeSuivi(c, m, [], F.evenements(c).filter((_, i) => idx.includes(i)))
const items = (l) => l.map((json) => ({ json }))
// 1. le contrôleur seul : les 13 dossiers du compte Studio, tels que le chef les lui envoie
const rc = pinsDe('presti-dep-suivi', [F.enveloppeSuivi('A')])
const entrees = rc.par['Préparer le contrôle'][0]
writeFileSync(path.join(dossier, 'pins-conflit.json'), J({ workflowId: idsArg['lib-controler-conflit'], pinData: { 'Appelé par un chef': items(entrees) } }))
// 2. le chef, lundi, deux comptes
const appels = (r) => Object.fromEntries(Object.entries(r.par).filter(([n]) => n.startsWith('Appeler ')).map(([n, p]) => [n, items(p[0] || [])]))
const envs = [sous('A'), sous('B')]
const r1 = pinsDe('presti-dep-suivi', envs)
writeFileSync(path.join(dossier, 'pins-chef.json'), J({ workflowId: IDS['presti-dep-suivi'], pinData: { 'Appelé par le Cerveau': items(envs), ...appels(r1) } }))
// 3. le chef, mardi : les devis de Studio attendent le lot du lundi
const envM = [sous('A', F.MARDI, [0, 1])]
const r2 = pinsDe('presti-dep-suivi', envM)
writeFileSync(path.join(dossier, 'pins-chef-mardi.json'), J({ workflowId: IDS['presti-dep-suivi'], pinData: { 'Appelé par le Cerveau': items(envM), ...appels(r2) } }))
// 4. le banc : l'appel du chef est épinglé (les deux comptes du banc, 13 dossiers chacun)
const rb = pinsDe('presti-dep-suivi', [F.enveloppeSuivi('A'), F.enveloppeSuivi('B')])
writeFileSync(path.join(dossier, 'pins-banc.json'), J({ workflowId: idsArg['presti-banc-suivi'] || 'A_POSER', pinData: { 'Banc (jamais publié)': [{ json: {} }], 'Appeler presti-dep-suivi': items(rb.sorties) } }))
console.log('pins écrits :', ['pins-conflit', 'pins-chef', 'pins-chef-mardi', 'pins-banc'].join(', '), '| nœuds épinglés (chef) :', Object.keys(appels(r1)).join(' ; '))
