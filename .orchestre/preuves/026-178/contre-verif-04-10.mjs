// 026-178 — contre-vérification du 04/10 : six sabotages RÉVERSIBLES de la production (lib/pilotage/station.ts et lib/pilotage/salles/),
// chacun joué contre station-route-qa --partie=salles2 --statique --racine=<copie> (sources + doublures, sans serveur). Les sabotages se font
// sur une COPIE de lib/ et de la route (sous .orchestre/travail/) : l'arbre réel, que d'autres agents lisent, n'est jamais touché (sha256 relu
// avant et après). Le fichier de la copie est rétabli octet pour octet après chaque passage ; un sabotage que le juge ne voit pas, un fichier
// non rétabli ou un fichier réel modifié rend le code 1.
//   node .orchestre/preuves/026-178/contre-verif-04-10.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const R = path.resolve(import.meta.dirname, '..', '..', '..')
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const SABOTAGES = [
  { nom: 'adresses-des-bans', fichier: 'lib/pilotage/salles/securite.ts', avant: 'abus_24h: lignes(b.abus24h).length,', apres: 'abus_24h: lignes(b.abus24h),', tue: 'SL-5' },
  { nom: 'mrr-sous-sante', fichier: 'lib/pilotage/station.ts', avant: "'salle.presti.mrr': 'comptabilite'", apres: "'salle.presti.mrr': 'sante'", tue: 'SL-2' },
  { nom: 'voix-en-texte', fichier: 'lib/pilotage/salles/natures.ts', avant: "'fish_audio': 'voix'", apres: "'fish_audio': 'texte'", tue: 'SL-8' },
  { nom: 'activite-depuis-maintenant', fichier: 'lib/pilotage/salles/index.ts', avant: '{ p_depuis: c.depuisMinuit }', apres: '{ p_depuis: c.maintenant.toISOString() }', tue: 'SL-4' },
  { nom: 'incident-en-ligne', fichier: 'lib/pilotage/salles/sante.ts', avant: "incident: 'hors ligne'", apres: "incident: 'en ligne'", tue: 'SL-3' },
  { nom: 'contenu-des-tickets', fichier: 'lib/pilotage/salles/presti.ts', avant: '({ nombre: nombre((await c.deps.lectures.ticketsOuverts()).nombre) })', apres: '(await c.deps.lectures.ticketsOuverts())', tue: 'SL-6' },
]
const COPIE = path.join(R, '.orchestre', 'travail', 'contre-verif-178', 'arbre')
fs.rmSync(path.dirname(COPIE), { recursive: true, force: true })
fs.mkdirSync(path.join(COPIE, 'app', 'api', 'controle'), { recursive: true })
fs.cpSync(path.join(R, 'lib'), path.join(COPIE, 'lib'), { recursive: true })
fs.cpSync(path.join(R, 'app', 'api', 'controle', 'station'), path.join(COPIE, 'app', 'api', 'controle', 'station'), { recursive: true })
const empreintes = () => SABOTAGES.map((s) => sha(fs.readFileSync(path.join(R, s.fichier)))).join()
const avantReel = empreintes()
const juge = () => spawnSync(process.execPath, ['--import', './scripts/ts-loader.mjs', 'scripts/station-route-qa.mjs', '--partie=salles2', '--statique', `--racine=${COPIE}`], { cwd: R, encoding: 'utf8', timeout: 300_000 })
const lignes = []
let echec = false
const base = juge()
const ok0 = base.status === 0 && /salles2 : PASS/.test(base.stdout)
lignes.push(`- copie propre : ${ok0 ? 'PASS (code 0)' : `ÉCHEC (code ${base.status})`}`)
if (!ok0) echec = true
for (const s of SABOTAGES) {
  const f = path.join(COPIE, s.fichier)
  const octets = fs.readFileSync(f)
  const t = octets.toString('utf8')
  let resultat
  if (t.split(s.avant).length !== 2) { resultat = `ILLISIBLE : « ${s.avant.slice(0, 50)} » n'apparaît pas exactement une fois`; echec = true }
  else {
    try {
      fs.writeFileSync(f, t.replace(s.avant, () => s.apres))
      const r = juge()
      const rouges = [...new Set((r.stdout.match(/^❌ (SL-\d+)/gm) ?? []).map((x) => x.slice(2)))]
      const vu = r.status !== 0 && rouges.includes(s.tue)
      if (!vu) echec = true
      resultat = `${vu ? 'vu' : 'NON VU'} : code ${r.status}, ❌ ${rouges.join(', ') || '—'} (attendu ❌ ${s.tue})`
    } finally { fs.writeFileSync(f, octets) }
    if (sha(fs.readFileSync(f)) !== sha(octets)) { resultat += ' ; FICHIER NON RÉTABLI'; echec = true } else resultat += ' ; fichier de la copie rétabli octet pour octet'
  }
  lignes.push(`- ${s.nom} (${s.fichier}) → ${resultat}`)
}
const fin = juge()
const ok1 = fin.status === 0 && /salles2 : PASS/.test(fin.stdout)
lignes.push(`- copie rétablie : ${ok1 ? 'PASS (code 0)' : `ÉCHEC (code ${fin.status})`}`)
if (!ok1) echec = true
if (empreintes() !== avantReel) { echec = true; lignes.push('- ARBRE RÉEL MODIFIÉ pendant la contre-vérification') } else lignes.push('- arbre réel : les six fichiers sabotés sont inchangés (sha256 avant = après)')
fs.rmSync(path.dirname(COPIE), { recursive: true, force: true })
console.log(lignes.join('\n'))
console.log(`contre-verif 026-178 : ${echec ? 'FAIL' : 'PASS'}`)
process.exitCode = echec ? 1 : 0
