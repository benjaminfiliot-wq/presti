// scripts/landing-demo-qa.mjs — le juge de la tâche 018-10 : le texte du bloc « Et le site qui va avec » de la landing
// (app/DemoSite.tsx) doit décrire la démo Atelier Lestraque TELLE QU'ELLE EST après les vagues 1 à 3 (15/09/2026), pas la
// version du v16. Le paragraphe parlait de « lumière sur la matière » et le texte de l'affiche d'« un rabot sur une planche » :
// ni l'un ni l'autre n'existe plus. Contrôles :
//   1. plus aucune trace des anciens mots : « rabot », « lumière sur la matière », « titre qui entre », « Menuisier à Rennes »
//      comme titre d'affiche ;
//   2. le paragraphe d'accroche fait entre 60 et 180 caractères, sans chiffre (aucun score, aucune durée : rien d'invérifiable
//      sur la landing) ;
//   3. le texte alternatif de l'affiche et l'aria-label de la vidéo nomment ce qu'on voit : l'escalier et « Fait pour rester » ;
//   4. rien d'autre ne bouge dans le bloc : la ligne de crédits (juge credits-landing-qa), le lien de démonstration et la ligne
//      de prix restent ;
//   5. les types passent.
//
// Usage : node scripts/landing-demo-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(R, 'app', 'DemoSite.tsx'), 'utf8')
const echecs = []

for (const [mot, motif] of [['rabot', /rabot/i], ['lumière sur la matière', /lumi[èe]re sur la mati[èe]re/i], ['titre qui entre', /titre qui entre/i], ['« Menuisier à Rennes » dans le texte de l\'affiche', /alt="[^"]*Menuisier à Rennes/i]]) {
  if (motif.test(src)) echecs.push(`ancien texte encore présent : ${mot}`)
}

const para = (src.match(/<span className="lp-kick">Et le site qui va avec<\/span><h2>[\s\S]*?<\/h2><p>([\s\S]*?)<\/p>/) || [])[1]
if (!para) echecs.push('paragraphe d\'accroche introuvable sous le titre du bloc')
else {
  const texte = para.replace(/\{[^}]*\}/g, '').replace(/&apos;/g, "'").trim()
  if (texte.length < 60 || texte.length > 180) echecs.push(`accroche de ${texte.length} caractères, attendu 60 à 180 : « ${texte} »`)
  if (/\d/.test(texte)) echecs.push(`accroche avec un chiffre (rien d'invérifiable sur la landing) : « ${texte} »`)
}

const alt = (src.match(/<img[^>]*alt="([^"]*)"/) || [])[1] || ''
const aria = (src.match(/<video[^>]*aria-label="([^"]*)"/) || [])[1] || ''
for (const [nom, t] of [['texte alternatif de l\'affiche', alt], ['aria-label de la vidéo', aria]]) {
  if (!/escalier/i.test(t)) echecs.push(`${nom} : l'escalier n'est pas nommé (« ${t} »)`)
  if (!/Fait pour rester/.test(t)) echecs.push(`${nom} : le titre « Fait pour rester » n'est pas cité (« ${t} »)`)
}

for (const [nom, motif] of [['lien de démonstration', /className="ds-lien"/], ['ligne de prix', /className="ds-prix"/], ['cadre de la vidéo', /className="ds-cadre"/]]) {
  if (!motif.test(src)) echecs.push(`${nom} disparu du bloc`)
}
const credits = spawnSync(process.execPath, [path.join(R, 'scripts', 'credits-landing-qa.mjs')], { cwd: R, encoding: 'utf8' })
if (credits.status !== 0) echecs.push(`crédits : ${(credits.stdout || credits.stderr || '').trim().slice(0, 200)}`)
const types = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'typecheck'], { cwd: R, encoding: 'utf8', shell: process.platform === 'win32' })
if (types.status !== 0) echecs.push(`typecheck : ${(types.stdout + types.stderr).trim().split('\n').slice(-3).join(' | ').slice(0, 240)}`)

console.log(echecs.length ? `✗ bloc démo de la landing : FAIL — ${echecs.join(' ; ')}` : '✓ bloc démo de la landing : PASS — le texte décrit la démo actuelle, affiche et vidéo nomment ce qu\'on voit, crédits et prix intacts, types verts')
process.exitCode = echecs.length ? 1 : 0
