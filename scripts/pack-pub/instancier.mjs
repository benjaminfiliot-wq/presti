import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
if (args.length !== 3) {
  console.error("Usage: instancier.mjs <gabarit> <dossier-pack> <sortie>")
  process.exit(1)
}

const [gabaritName, packDir, sortie] = args

let gabaritPath = path.join('gabarits-pubs', 'locale', gabaritName)
if (!fs.existsSync(gabaritPath)) {
  gabaritPath = gabaritName 
}

if (!fs.existsSync(gabaritPath) || !fs.existsSync(packDir)) {
  console.error("Gabarit or pack dir missing")
  process.exit(1)
}

const packPath = path.join(packDir, 'pack.json')
if (!fs.existsSync(packPath)) {
  console.error("pack.json missing")
  process.exit(1)
}
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'))
const matiere = pack.matiere

let actualGabaritPath = gabaritPath
const hasAvant = matiere.photos.some(p => p.role === 'avant')
const hasApres = matiere.photos.some(p => p.role === 'apres')
if (gabaritName.includes('avant-apres') && (!hasAvant || !hasApres)) {
  actualGabaritPath = path.join(path.dirname(gabaritPath), 'chantier')
}

fs.mkdirSync(sortie, { recursive: true })
const assetsDir = path.join(sortie, 'assets')
fs.mkdirSync(assetsDir, { recursive: true })

let indexHtml = fs.readFileSync(path.join(actualGabaritPath, 'index.html'), 'utf8')
fs.copyFileSync(path.join(actualGabaritPath, 'hyperframes.json'), path.join(sortie, 'hyperframes.json'))

function escapeHtml(str) {
  if (str == null) return ''
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m])
}

const marks = {
  '{{metier}}': matiere.metier,
  '{{ville}}': matiere.ville,
  '{{accroche}}': matiere.accroche,
  '{{cta}}': matiere.cta,
  '{{telephone}}': matiere.telephone,
  '{{duree_travaux}}': matiere.duree_travaux,
  '{{materiaux}}': matiere.materiaux,
  '{{logo}}': 'assets/logo.png',
  '{{voix}}': matiere.voix === 'synthese' ? 'assets/voix.mp3' : ''
}

if (matiere.voix === 'synthese' && matiere.texte_voix) {
  marks['{{sous_titres}}'] = escapeHtml(matiere.texte_voix) 
} else {
  marks['{{sous_titres}}'] = ''
}

for (const [mark, val] of Object.entries(marks)) {
  indexHtml = indexHtml.replaceAll(mark, val ? escapeHtml(val) : '')
}

const photos = matiere.photos || []
const roles = { avant: [], apres: [], chantier: [], detail: [], equipe: [], visuel: [] }

photos.forEach((p, i) => {
  const photoName = path.basename(p.fichier)
  const src = path.join(packDir, p.fichier)
  const dest = path.join(assetsDir, photoName)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
  }
  if (p.role && roles[p.role]) {
    roles[p.role].push(`assets/${photoName}`)
  }
  roles.visuel.push(`assets/${photoName}`)
})

if (actualGabaritPath.includes('avant-apres')) {
  indexHtml = indexHtml.replaceAll('{{photo:0}}', roles.avant[0] || roles.visuel[0] || '')
  indexHtml = indexHtml.replaceAll('{{photo:1}}', roles.apres[0] || roles.visuel[1] || '')
  indexHtml = indexHtml.replaceAll('{{photo:2}}', roles.detail[0] || roles.visuel[2] || '')
  indexHtml = indexHtml.replaceAll('{{photo:3}}', roles.detail[1] || roles.visuel[3] || '')
} else if (actualGabaritPath.includes('artisan-ville')) {
  indexHtml = indexHtml.replaceAll('{{photo:0}}', roles.equipe[0] || 'assets/logo.png')
  const pool = [...roles.chantier, ...roles.detail, ...roles.visuel]
  for (let i = 1; i < 10; i++) {
    indexHtml = indexHtml.replaceAll(`{{photo:${i}}}`, pool[i-1] || pool[0] || '')
  }
} else if (actualGabaritPath.includes('visuel')) {
  indexHtml = indexHtml.replaceAll('{{photo:0}}', roles.visuel[0] || '')
} else {
  // chantier (normal ou variant sans avant/apres)
  // If it's variant of avant-apres, maybe different order? The rule says:
  // "Sans paire avant/après, instancier.mjs remplace avant-apres par une seconde variante de chantier (ordre des photos différent)."
  let pool = [...roles.chantier, ...roles.detail, ...roles.visuel]
  if (gabaritName.includes('avant-apres') && actualGabaritPath.includes('chantier')) {
    pool = [...pool].reverse() // "ordre des photos différent"
  }
  for (let i = 0; i < 10; i++) {
    indexHtml = indexHtml.replaceAll(`{{photo:${i}}}`, pool[i] || pool[0] || '')
  }
}

const logoSrc = path.join(packDir, 'logo.png')
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(assetsDir, 'logo.png'))
} else {
  indexHtml = indexHtml.replaceAll('assets/logo.png', '') 
}

if (matiere.voix === 'synthese') {
  const voixSrc = path.join(packDir, 'voix.mp3')
  if (fs.existsSync(voixSrc)) {
    fs.copyFileSync(voixSrc, path.join(assetsDir, 'voix.mp3'))
  }
} else {
  indexHtml = indexHtml.replace(/<div[^>]*id=["']mention-ia["'][^>]*>.*?<\/div>/is, '')
  indexHtml = indexHtml.replace(/<audio[^>]*id=["']voix["'][^>]*>.*?<\/audio>/is, '')
}

const remaining = indexHtml.match(/\{\{[^}]+\}\}/g)
if (remaining) {
  console.error("Il reste des marques non remplacees:", remaining)
  process.exit(1)
}

fs.writeFileSync(path.join(sortie, 'index.html'), indexHtml)
