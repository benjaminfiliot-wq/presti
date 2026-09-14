// scripts/demo-video-licences-test.mjs — le juge de la tâche 018-05 (capture animée de la démo, sensible aux licences).
// La vidéo de la landing filme les photos de la démo. Une photo CC BY-SA ne doit pas y apparaître tant que Benj n'a pas
// tranché (règle : le portfolio va sur le site, pas dans une vidéo) ; et un essai ne doit JAMAIS écraser la vidéo en ligne.
// Ce juge lit le relevé des plans écrit par scripts/demo-video.mjs lancé avec --sans-sa et --sortie :
//   <sortie>/plans.json = { site, sansSa: true, plans: [ { nom, source: "bureau"|"mobile", debut, duree,
//                          visibles: [ { base, licence } ] } ], affiche: { temps, visibles: [ { base, licence } ] } }
// et vérifie : au moins 6 plans ; chaque image visible est connue d'attributions.json (ou est un graphisme .svg du site) ;
// aucune licence « SA » dans un plan ni dans l'affiche ; la vidéo et l'affiche de la sortie existent et ne sont pas vides ;
// les fichiers en ligne public/promo/demo-site/lestraque.mp4 et lestraque-affiche.webp sont identiques à ceux du commit.
//
// Usage : node scripts/demo-video-licences-test.mjs [sortie=.orchestre/preuves/018-05/video]
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = path.resolve(R, process.argv[2] || '.orchestre/preuves/018-05/video')
const ATTR = path.join(R, 'public', 'sites-demo', 'lestraque', 'attributions.json')
const echecs = []

let plans = null
try { plans = JSON.parse(fs.readFileSync(path.join(SORTIE, 'plans.json'), 'utf8')) } catch (e) { echecs.push(`plans.json absent ou illisible dans ${path.relative(R, SORTIE)} : ${e.message}`) }

const attributions = (() => { try { const a = JSON.parse(fs.readFileSync(ATTR, 'utf8')); return Array.isArray(a) ? a : (a.photos || Object.values(a)) } catch { return [] } })()
const licenceDe = (base) => { const a = attributions.find((x) => (x.base || x.fichier || x.nom) === base); return a ? String(a.licence || a.license || '') : null }

function controlerVisibles(ou, visibles) {
  if (!Array.isArray(visibles)) { echecs.push(`${ou} : champ visibles absent`); return }
  for (const v of visibles) {
    if (!v || !v.base) { echecs.push(`${ou} : image visible sans base`); continue }
    if (/\.svg$/i.test(v.base)) continue
    const connue = licenceDe(v.base)
    if (connue === null) echecs.push(`${ou} : « ${v.base} » absente d'attributions.json`)
    const lic = String(v.licence || connue || '')
    if (/\bSA\b|BY-SA/i.test(lic) || /\bSA\b|BY-SA/i.test(connue || '')) echecs.push(`${ou} : « ${v.base} » est sous ${connue || lic} — interdit dans la vidéo avec --sans-sa`)
  }
}

if (plans) {
  if (plans.sansSa !== true) echecs.push('plans.json : sansSa doit valoir true (lancer avec --sans-sa)')
  const liste = Array.isArray(plans.plans) ? plans.plans : []
  if (liste.length < 6) echecs.push(`plans.json : ${liste.length} plan(s), au moins 6 attendus`)
  liste.forEach((p, i) => {
    const ou = `plan ${i + 1} (${p && p.nom})`
    if (!p || !['bureau', 'mobile'].includes(p.source)) echecs.push(`${ou} : source bureau|mobile attendue`)
    if (!(p && p.duree > 0)) echecs.push(`${ou} : durée > 0 attendue`)
    controlerVisibles(ou, p && p.visibles)
  })
  if (!plans.affiche) echecs.push('plans.json : relevé de l\'affiche absent')
  else controlerVisibles('affiche', plans.affiche.visibles)
}

for (const f of ['lestraque.mp4', 'lestraque-affiche.webp']) {
  const p = path.join(SORTIE, f)
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) echecs.push(`${path.relative(R, p)} absent ou vide`)
}

// la vidéo en ligne n'a pas bougé : même empreinte que le blob du dernier commit
for (const f of ['public/promo/demo-site/lestraque.mp4', 'public/promo/demo-site/lestraque-affiche.webp']) {
  const enTete = spawnSync('git', ['rev-parse', `HEAD:${f}`], { cwd: R, encoding: 'utf8' }).stdout.trim()
  const disque = spawnSync('git', ['hash-object', f], { cwd: R, encoding: 'utf8' }).stdout.trim()
  if (!enTete || enTete !== disque) echecs.push(`${f} a été modifié : un essai ne doit pas écraser la vidéo en ligne (utiliser --sortie)`)
}

console.log(echecs.length ? `✗ vidéo et licences : FAIL — ${echecs.join(' ; ')}` : '✓ vidéo et licences : PASS — plans relevés, aucune photo CC BY-SA filmée, vidéo en ligne intacte')
process.exitCode = echecs.length ? 1 : 0
