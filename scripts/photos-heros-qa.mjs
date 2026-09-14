// scripts/photos-heros-qa.mjs — le juge de la tâche 018-08 : réétalonner la photo du héros de la démo Lestraque.
// Pourquoi : le juge du héros (vague 2) parlait d'« un étalonnage jaune citron aux noirs bouchés qui fait filtre ». Mesuré le
// 14/09/2026 vers 22 h 10 (.orchestre/preuves/018-08/avant.json) : b* moyen 29,0 et 18 % de pixels sous L* 8 sur la vignette
// bureau (médiane des autres photos du site : b* 16) ; b* 37,7 sur le recadrage portrait.
// Contrôles :
//   1. mêmes fichiers heros-escalier* qu'avant, non vides, largeur réelle = largeur du nom de fichier ;
//   2. teinte : b* moyen de heros-escalier-480.webp entre 15 et 22, de heros-escalier-portrait-720.webp entre 15 et 24 ;
//   3. noirs : au plus 12 % de pixels sous L* 8 sur la vignette bureau, et une luminance moyenne qui ne baisse pas de plus
//      de 2 points (on relève les noirs, on n'assombrit pas) ;
//   4. un seul étalonnage pour toutes les tailles : le b* de heros-escalier-1600.webp et de heros-escalier-1600.avif à ±3 de la
//      vignette 480 ;
//   5. rien d'autre n'a bougé : empreintes des autres images et entrées d'attribution des autres photos identiques ;
//   6. les entrées heros-escalier d'attributions.json disent la nouvelle retouche (champ etalonnage différent de celui du
//      dernier commit, modifiee renseigné) ;
//   7. provenance toujours prouvée (scripts/photos-provenance.mjs lestraque) ;
//   8. une planche avant / après non vide (.orchestre/preuves/018-08/avant-apres.jpg).
//
// Usage : node scripts/photos-heros-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = path.join(R, 'public', 'sites-demo', 'lestraque')
const IMAGES = path.join(SITE, 'images')
const PREUVES = path.join(R, '.orchestre', 'preuves', '018-08')
const echecs = []
const lireJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
const sha1 = (buf) => createHash('sha1').update(buf).digest('hex')

const avant = lireJson(path.join(PREUVES, 'avant.json'), null)
if (!avant) { console.log('✗ héros : FAIL — avant.json absent (mesure de départ)'); process.exit(1) }

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
async function mesure(fichier) {
  const { data, info } = await sharp(path.join(IMAGES, fichier)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let sb = 0, sl = 0, noirs = 0, n = 0
  for (let i = 0; i < data.length; i += info.channels * 2) {
    const r = lin(data[i]), g = lin(data[i + 1]), b = lin(data[i + 2])
    const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
    const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
    const L = 116 * f(Y) - 16
    sb += 200 * (f(Y) - f(Z)); sl += L; if (L < 8) noirs++; n++
  }
  return { bMoyen: sb / n, lMoyen: sl / n, partNoirs: (noirs / n) * 100 }
}

// 1. fichiers
for (const fichier of avant.herosFichiers) {
  const p = path.join(IMAGES, fichier)
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) { echecs.push(`images/${fichier} absent ou vide`); continue }
  const attendue = Number((fichier.match(/-(\d+)\.(avif|webp)$/) || [])[1])
  if (attendue) { const m = await sharp(p).metadata(); if (m.width !== attendue) echecs.push(`images/${fichier} : ${m.width} px de large au lieu de ${attendue}`) }
}
const enPlus = fs.readdirSync(IMAGES).filter((x) => /^heros-escalier/.test(x) && !avant.herosFichiers.includes(x))
if (enPlus.length) echecs.push(`fichiers du héros en plus : ${enPlus.join(', ')}`)

// 2, 3, 4. teinte, noirs, cohérence des tailles
const bureau = await mesure('heros-escalier-480.webp').catch(() => null)
const portrait = await mesure('heros-escalier-portrait-720.webp').catch(() => null)
if (bureau && portrait) {
  console.log(`héros bureau : b* ${bureau.bMoyen.toFixed(1)} (avant ${avant.heros['heros-escalier-480.webp'].bMoyen}), L* ${bureau.lMoyen.toFixed(1)} (avant ${avant.heros['heros-escalier-480.webp'].lMoyen}), noirs ${bureau.partNoirs.toFixed(1)} % (avant ${avant.heros['heros-escalier-480.webp'].partNoirs} %) ; portrait : b* ${portrait.bMoyen.toFixed(1)} (avant ${avant.heros['heros-escalier-portrait-720.webp'].bMoyen})`)
  if (bureau.bMoyen < 15 || bureau.bMoyen > 22) echecs.push(`teinte du héros bureau : b* ${bureau.bMoyen.toFixed(1)}, attendu entre 15 et 22`)
  if (portrait.bMoyen < 15 || portrait.bMoyen > 24) echecs.push(`teinte du héros portrait : b* ${portrait.bMoyen.toFixed(1)}, attendu entre 15 et 24`)
  if (bureau.partNoirs > 12) echecs.push(`noirs bouchés : ${bureau.partNoirs.toFixed(1)} % des pixels sous L* 8, au plus 12 % attendus`)
  if (bureau.lMoyen < avant.heros['heros-escalier-480.webp'].lMoyen - 2) echecs.push(`héros assombri : L* moyen ${bureau.lMoyen.toFixed(1)} contre ${avant.heros['heros-escalier-480.webp'].lMoyen} avant`)
  for (const grand of ['heros-escalier-1600.webp', 'heros-escalier-1600.avif']) {
    const m = await mesure(grand).catch(() => null)
    if (!m) echecs.push(`${grand} illisible`)
    else if (Math.abs(m.bMoyen - bureau.bMoyen) > 3) echecs.push(`${grand} : b* ${m.bMoyen.toFixed(1)}, trop loin de la vignette 480 (${bureau.bMoyen.toFixed(1)}) — un seul étalonnage pour toutes les tailles`)
  }
} else echecs.push('vignettes du héros illisibles')

// 5. rien d'autre n'a bougé
const touchees = Object.entries(avant.autresFichiers).filter(([fch, h]) => { const p = path.join(IMAGES, fch); return !fs.existsSync(p) || sha1(fs.readFileSync(p)) !== h }).map(([fch]) => fch)
if (touchees.length) echecs.push(`autres images modifiées ou supprimées (interdit) : ${touchees.slice(0, 6).join(', ')}${touchees.length > 6 ? ` … (${touchees.length})` : ''}`)
const attributions = lireJson(path.join(SITE, 'attributions.json'), [])
if (sha1(JSON.stringify(attributions.filter((e) => !/^heros-escalier/.test(e.base)))) !== avant.autresAttributions) echecs.push('entrées d\'attribution des autres photos modifiées (interdit)')

// 6. la retouche est dite
const enTete = spawnSync('git', ['show', 'HEAD:public/sites-demo/lestraque/attributions.json'], { cwd: R, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
const avantAttr = (() => { try { return JSON.parse(enTete.stdout) } catch { return [] } })()
const ancien = (avantAttr.find((e) => e.base === 'heros-escalier') || {}).etalonnage
const nouveau = attributions.filter((e) => e.base === 'heros-escalier')
if (!nouveau.length) echecs.push('attributions.json : entrées heros-escalier absentes')
for (const e of nouveau) {
  if (!e.modifiee) { echecs.push(`${e.fichier} : champ modifiee vide`); break }
  if (!e.etalonnage || e.etalonnage === ancien) { echecs.push(`${e.fichier} : champ etalonnage inchangé — décrire la nouvelle retouche`); break }
}

// 7. provenance
const prov = spawnSync(process.execPath, [path.join(R, 'scripts', 'photos-provenance.mjs'), 'lestraque'], { cwd: R, encoding: 'utf8', timeout: 10 * 60_000 })
if (prov.status !== 0) echecs.push(`photos-provenance.mjs lestraque : code ${prov.status} — ${`${prov.stdout || ''}${prov.stderr || ''}`.trim().split('\n').slice(-2).join(' | ').slice(0, 240)}`)

// 8. planche avant / après
const planche = path.join(PREUVES, 'avant-apres.jpg')
if (!fs.existsSync(planche) || fs.statSync(planche).size < 50_000) echecs.push('avant-apres.jpg absente ou trop légère (< 50 Ko)')

console.log(echecs.length ? `✗ héros : FAIL — ${echecs.join(' ; ')}` : '✓ héros : PASS — teinte naturelle, noirs relevés, un seul étalonnage pour toutes les tailles, rien d\'autre n\'a bougé')
process.exitCode = echecs.length ? 1 : 0
