// Vérification : drapeaux « règle » par source, et présence (chemin seul) de fichiers de prospects dans l'index du cerveau.
import fs from 'node:fs'
const I = JSON.parse(fs.readFileSync('C:/Users/benja/Documents/cerveau/data/index.json', 'utf8'))
const chunks = I.chunks || []
const parSource = {}
const reglesVault = new Set()
for (const c of chunks) {
  const s = c.s
  parSource[s] ??= { morceaux: 0, regles: 0 }
  parSource[s].morceaux++
  if (c.r) { parSource[s].regles++; if (s === 'vault') reglesVault.add(c.f) }
}
console.log('cles index :', Object.keys(I))
console.log('par source :', parSource)
console.log('fichiers vault avec drapeau regle :', [...reglesVault])
const fichiers = new Set(chunks.map((c) => c.f))
const prospect = [...fichiers].filter((f) => /^vault\/Prospection\//.test(f))
console.log('fichiers vault/Prospection indexes (chemins seuls) :', prospect)
console.log('modeles indexes :', [...fichiers].filter((f) => /_modeles/i.test(f)))
const meta = I.fichiers || {}
const exclusProspection = Object.entries(meta).filter(([f, v]) => /^vault\/Prospection\//.test(f) && v && v.exclu).map(([f, v]) => [f, v.exclu])
console.log('vault/Prospection exclus (par contenu) :', exclusProspection)
console.log('date index :', I.date || I.genere || I.cree || '(champ absent)')
