// scripts/demo-images-viewport-qa.mjs — le juge de la tâche 020-14 : scripts/demo-images-cles.mjs doit accepter
// --viewport=<largeur>x<hauteur> pour capturer le bureau au format où la grille à l'aveugle note la démo (1088×800, décision du
// cahier des charges du moment signature, §0.3), SANS changer son comportement par défaut (1280×800) ni le téléphone (390×844
// à dpr 2). Le 15/09/2026, la capture 1088×800 de la grille n'était versionnée nulle part (`grep -rn 1088 scripts` : rien).
//   1. le script se compile ;
//   2. sans option : bureau-t25.png en 1280×800, les quatre instants du héros présents et non vides, planche-demo.jpg écrite ;
//   3. avec --viewport=1088x800 placé AVANT les deux arguments de position : bureau-t06/t25/t50/t80 en 1088×800 ;
//      le téléphone reste en 780×1688 ; planche-demo.jpg écrite ;
//   4. une valeur invalide (--viewport=abc) fait sortir le script en erreur, sans rien capturer au format par défaut en silence.
//
// Usage : node scripts/demo-images-viewport-qa.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(R, 'scripts', 'demo-images-cles.mjs')
const SITE = path.join(R, 'public', 'sites-demo', 'lestraque')
const echecs = [], faits = []
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'viewport-qa-'))
const lancer = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: R, encoding: 'utf8', timeout: 240000 })
const dims = async (f) => { try { const m = await sharp(f).metadata(); return `${m.width}×${m.height}` } catch { return null } }
const nonVide = (f) => { try { return fs.statSync(f).size > 20000 } catch { return false } }

try {
  const check = spawnSync(process.execPath, ['--check', SCRIPT], { encoding: 'utf8' })
  if (check.status !== 0) echecs.push(`le script ne se compile pas : ${(check.stderr || '').trim().split('\n')[0]}`)
  else {
    const defaut = path.join(tmp, 'defaut')
    const r1 = lancer([SITE, defaut])
    if (r1.status !== 0) echecs.push(`sans option, le script échoue : ${(r1.stderr || r1.stdout || '').trim().split('\n').slice(-2).join(' | ').slice(0, 200)}`)
    else {
      const d = await dims(path.join(defaut, 'bureau-t25.png'))
      if (d !== '1280×800') echecs.push(`sans option, bureau-t25.png est en ${d}, 1280×800 attendu (comportement par défaut changé)`)
      for (const t of ['t06', 't25', 't50', 't80']) if (!nonVide(path.join(defaut, `bureau-${t}.png`))) echecs.push(`sans option, bureau-${t}.png absent ou vide`)
      if (!nonVide(path.join(defaut, 'planche-demo.jpg'))) echecs.push('sans option, planche-demo.jpg absente ou vide')
      if (!echecs.length) faits.push('sans option : bureau 1280×800, quatre instants, planche')
    }

    const grille = path.join(tmp, 'grille')
    const r2 = lancer(['--viewport=1088x800', SITE, grille])
    if (r2.status !== 0) echecs.push(`avec --viewport=1088x800, le script échoue : ${(r2.stderr || r2.stdout || '').trim().split('\n').slice(-2).join(' | ').slice(0, 200)}`)
    else {
      for (const t of ['t06', 't25', 't50', 't80']) {
        const f = path.join(grille, `bureau-${t}.png`), d = await dims(f)
        if (d !== '1088×800') echecs.push(`avec --viewport=1088x800, bureau-${t}.png est en ${d ?? 'absent'}, 1088×800 attendu`)
        else if (!nonVide(f)) echecs.push(`avec --viewport=1088x800, bureau-${t}.png vide`)
      }
      const tel = fs.readdirSync(grille).filter((f) => /^mobile|^telephone|^tel/i.test(f) && f.endsWith('.png'))
      if (!tel.length) echecs.push('avec --viewport=1088x800, aucune capture du téléphone')
      for (const f of tel) { const d = await dims(path.join(grille, f)); if (d !== '780×1688') echecs.push(`avec --viewport=1088x800, ${f} est en ${d}, le téléphone doit rester en 780×1688`) }
      if (!nonVide(path.join(grille, 'planche-demo.jpg'))) echecs.push('avec --viewport=1088x800, planche-demo.jpg absente ou vide')
      if (!echecs.some((e) => e.includes('--viewport=1088x800'))) faits.push('avec --viewport=1088x800 : quatre instants en 1088×800, téléphone inchangé, planche')
    }

    const r3 = lancer(['--viewport=abc', SITE, path.join(tmp, 'invalide')])
    if (r3.status === 0) echecs.push('--viewport=abc est accepté : une valeur invalide doit faire sortir le script en erreur')
    else faits.push('--viewport=abc refusé')
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log(faits.map((f) => `  · ${f}`).join('\n'))
console.log(echecs.length ? `✗ images-clés au format de la grille : FAIL — ${echecs.join(' ; ')}` : '✓ images-clés au format de la grille : PASS — --viewport=1088x800 capture le bureau au format noté, défaut 1280×800 et téléphone inchangés, valeur invalide refusée')
process.exitCode = echecs.length ? 1 : 0
