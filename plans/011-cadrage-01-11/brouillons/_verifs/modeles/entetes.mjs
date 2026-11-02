// Décompte indépendant des valeurs de type et de status dans les en-têtes du vault (lecture seule).
import fs from 'node:fs'
import path from 'node:path'
const RACINE = 'C:/Users/benja/Documents/SaaS'
const IGNORES = new Set(['.git', '.obsidian', 'node_modules', '.trash'])
const fichiers = []
function parcourir(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (IGNORES.has(e.name)) continue
    const p = path.join(d, e.name)
    if (e.isDirectory()) parcourir(p)
    else if (/\.md$/i.test(e.name)) fichiers.push(p)
  }
}
parcourir(RACINE)
const types = {}, statutsWiki = {}, statutsTous = {}
let avecEntete = 0
for (const f of fichiers) {
  const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) continue
  avecEntete++
  const get = (k) => { const r = m[1].match(new RegExp('^' + k + ':\s*(.*)$', 'm')); return r ? r[1].trim().replace(/^["']|["']$/g, '') : null }
  const ty = get('type'); if (ty !== null) types[ty] = (types[ty] || 0) + 1
  const st = get('status')
  if (st !== null) {
    statutsTous[st] = (statutsTous[st] || 0) + 1
    const rel = path.relative(RACINE, f).split(path.sep).join('/')
    if (rel.startsWith('wiki/')) statutsWiki[st] = (statutsWiki[st] || 0) + 1
  }
}
console.log('fichiers .md :', fichiers.length, '; avec en-tête :', avecEntete)
console.log('types :', Object.entries(types).sort((a, b) => b[1] - a[1]))
console.log('status (wiki/) :', statutsWiki)
console.log('status (tout le vault) :', statutsTous)
