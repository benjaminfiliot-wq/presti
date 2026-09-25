// Outils partagés des faux scripts de mutations du mini-dépôt d'essai du méta-juge (026-001).
// Un script de mutations honnête fait ses propres copies (ici sous .orchestre/travail/mutations-essai/), y applique chaque
// mutation, lance le juge, relève la ligne en échec réelle et écrit le rapport que le méta-juge relit.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const RAPPORT = path.join(RACINE, '.orchestre', 'preuves', '026-900', 'mutations.json')
export const JUGE = 'scripts/x-qa.mjs'
export const COMMANDE = `node {racine}/${JUGE}`
export const MUTATIONS = [
  { fichier: 'lib/module.mjs', avant: 'Math.min(n, 10)', apres: 'Math.min(n, 11)', critere: 'XQ-1' },
  { fichier: 'lib/module.mjs', avant: 'Math.max(0, ', apres: 'Math.max(-9, ', critere: 'XQ-1' },
  { fichier: 'lib/module.mjs', avant: 'Math.min(n, 10)', apres: 'Math.min(10, 10)', critere: 'XQ-1' },
  { fichier: 'lib/module.mjs', avant: 'n < 0 ? -1 : 1', apres: 'n < 0 ? 1 : 1', critere: 'XQ-2' },
]

/** Applique chaque mutation sur une copie, lance le juge, et rend les entrées du rapport (extrait réel, durée réelle). */
export function lancer(mutations) {
  const travail = path.join(RACINE, '.orchestre', 'travail', 'mutations-essai')
  const entrees = []
  mutations.forEach((m, i) => {
    const copie = path.join(travail, String(i))
    fs.rmSync(copie, { recursive: true, force: true })
    for (const d of ['lib', 'scripts', 'public']) fs.cpSync(path.join(RACINE, d), path.join(copie, d), { recursive: true })
    const cible = path.join(copie, m.fichier)
    const texte = fs.readFileSync(cible, 'utf8')
    const k = texte.indexOf(m.avant)
    if (k < 0 || texte.indexOf(m.avant, k + 1) >= 0) throw new Error(`« ${m.avant} » pas exactement une fois dans ${m.fichier}`)
    fs.writeFileSync(cible, texte.slice(0, k) + m.apres + texte.slice(k + m.avant.length))
    const t0 = Date.now()
    const r = spawnSync(COMMANDE.replace('{racine}', copie.split(path.sep).join('/')), { shell: true, encoding: 'utf8', cwd: copie, windowsHide: true })
    const extrait = `${r.stdout || ''}${r.stderr || ''}`.split(/\r?\n/).find((l) => l.startsWith(`FAIL ${m.critere} `))
    if (r.status === 0 || !extrait) throw new Error(`mutation non attrapée : ${m.avant} → ${m.apres}`)
    entrees.push({ juge: JUGE, commande: COMMANDE, ...m, extrait, duree_s: Math.round((Date.now() - t0) / 100) / 10 })
  })
  fs.rmSync(travail, { recursive: true, force: true })
  return entrees
}

export function ecrireRapport(mutations) {
  fs.mkdirSync(path.dirname(RAPPORT), { recursive: true })
  fs.writeFileSync(RAPPORT, JSON.stringify({ mutations }, null, 2))
  console.log(`${mutations.length} mutation(s) attrapée(s) → ${path.relative(RACINE, RAPPORT)}`)
}
