// scripts/publier-suite.mjs — la suite du postage, sans les mains. La formule Starter de Publora ne tient qu'un petit nombre
// de parutions programmées à la fois et ne programme qu'à sept jours : on ne peut pas tout poser d'un coup. Ce script,
// lancé par une tâche planifiée Windows toutes les six heures (voir le bas du fichier), rejoue le juge vidéo sur les trente
// fichiers, puis appelle le pipeline qui programme ce que Publora accepte, saute ce qui est déjà au journal, et publie
// tout de suite un créneau déjà passé (--passe-maintenant). Chaque passage s'écrit dans publications/journal-suite.log.
//
// Usage : node scripts/publier-suite.mjs            (un passage)
//         node scripts/publier-suite.mjs --installer (crée la tâche planifiée « Presti publications », toutes les 6 h)
//         node scripts/publier-suite.mjs --retirer   (la supprime)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JOURNAL = path.join(RACINE, 'publications', 'journal-suite.log')
const ANCRE = '2026-09-14'   // le lundi de la semaine des dix parutions (calendrier resserré du 13/09)
const TACHE = 'Presti publications'
const log = (m) => { fs.appendFileSync(JOURNAL, `${new Date().toISOString()} ${m}\n`) }

if (process.argv.includes('--installer')) {
  const cmd = `"${process.execPath}" "${path.join(RACINE, 'scripts', 'publier-suite.mjs')}"`
  const r = spawnSync('schtasks', ['/Create', '/F', '/SC', 'HOURLY', '/MO', '6', '/ST', '06:00', '/TN', TACHE, '/TR', cmd], { encoding: 'utf8' })
  console.log((r.stdout + r.stderr).trim()); process.exit(r.status ?? 1)
}
if (process.argv.includes('--retirer')) {
  const r = spawnSync('schtasks', ['/Delete', '/F', '/TN', TACHE], { encoding: 'utf8' })
  console.log((r.stdout + r.stderr).trim()); process.exit(r.status ?? 1)
}

const fichiers = []
for (let n = 1; n <= 10; n++) for (const f of ['paysage', 'carre', 'vertical']) { const p = path.join(RACINE, 'publications', `pub-${String(n).padStart(2, '0')}`, `${f}.mp4`); if (fs.existsSync(p)) fichiers.push(p) }
const jugeLog = path.join(os.tmpdir(), 'presti-vqa-suite.log')
const juge = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'video-qa.mjs'), ...fichiers], { cwd: RACINE, encoding: 'utf8', timeout: 600_000 })
fs.writeFileSync(jugeLog, (juge.stdout || '') + (juge.stderr || ''))
const verts = ((juge.stdout || '').match(/Tout passe/g) || []).length
log(`juge : code ${juge.status} · ${verts}/${fichiers.length} vertes`)
if (juge.status !== 0 || verts < fichiers.length) { log('arrêt : le juge n\'est pas vert, rien n\'est envoyé'); process.exit(1) }

const p = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'pipeline.mjs'), '--sans-rendu', '--programmer', '--sauf=03', `--ancre=${ANCRE}`, `--juge-vert=${jugeLog}`, '--passe-maintenant'], { cwd: RACINE, encoding: 'utf8', timeout: 600_000 })
const sortie = ((p.stdout || '') + (p.stderr || '')).replace(/\x1b\[[0-9;]*m/g, '')
const lignes = sortie.split(/\r?\n/).filter((l) => /✓ pub|✗|sautée|maintenant|limit|horizon/i.test(l))
log(`pipeline : code ${p.status}\n${lignes.map((l) => '    ' + l.trim().slice(0, 160)).join('\n')}`)
process.exit(0)
