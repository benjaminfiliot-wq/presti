// scripts/polices-demo.mjs — les vraies polices des sites de démonstration, une fois pour toutes.
// Le 14/09, trois agents ont livré des « woff2 » de 1,6 Ko, 5 Ko ou 40 000 octets pile : pas des polices. Ici, Claude Code
// télécharge lui-même le sous-ensemble latin de chaque police de la direction artistique (scripts/site-qa.mjs → DA_METIER)
// depuis Google Fonts, avec la licence OFL, dans public/sites-demo/_polices/<slug>/. Un agent COPIE, il ne fabrique pas.
//
// Usage : node scripts/polices-demo.mjs            (télécharge ce qui manque, vérifie ce qui est là)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// site-qa.mjs est un script (il juge dès l'import) : on lit sa table DA_METIER dans le texte, sans l'exécuter.
const DA_METIER = Object.fromEntries([...fs.readFileSync(path.join(RACINE, 'scripts', 'site-qa.mjs'), 'utf8').matchAll(/^\s*(\w+):\s*\{\s*accent:\s*'[^']+',\s*display:\s*'([^']+)'/gm)].map((m) => [m[1], { display: m[2] }]))
const DOSSIER = path.join(RACINE, 'public', 'sites-demo', '_polices')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const familles = [...new Set([...Object.values(DA_METIER).map((d) => d.display), 'IBM Plex Sans'])]  // + la police de texte des sites v2
fs.mkdirSync(DOSSIER, { recursive: true })
let ok = 0
for (const famille of familles) {
  const d = path.join(DOSSIER, slug(famille))
  fs.mkdirSync(d, { recursive: true })
  const cible = path.join(d, `${slug(famille)}.woff2`)
  if (fs.existsSync(cible) && fs.statSync(cible).size > 8000) { console.log(`  = ${famille} déjà là (${fs.statSync(cible).size} o)`); ok++; continue }
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(famille).replace(/%20/g, '+')}:wght@400;700&display=swap&subset=latin`, { headers: { 'User-Agent': UA } })).text()
    // Le bloc « latin » (pas latin-ext) : la première URL woff2 qui suit un commentaire /* latin */.
    const bloc = css.split('/* latin */').pop() || css
    const url = (bloc.match(/url\((https:[^)]+\.woff2)\)/) || css.match(/url\((https:[^)]+\.woff2)\)/) || [])[1]
    if (!url) throw new Error('aucune URL woff2 dans la réponse Google Fonts')
    const octets = Buffer.from(await (await fetch(url)).arrayBuffer())
    if (octets.length < 8000 || octets.toString('ascii', 0, 4) !== 'wOF2') throw new Error(`fichier douteux (${octets.length} o, en-tête ${octets.toString('ascii', 0, 4)})`)
    fs.writeFileSync(cible, octets)
    fs.writeFileSync(path.join(d, 'OFL.txt'), `${famille} — SIL Open Font License 1.1 (https://openfontlicense.org). Police distribuée par Google Fonts (${url}). Sous-ensemble latin, graisse 400 (et 700 si servie).\n`)
    console.log(`  ✓ ${famille} → ${path.relative(RACINE, cible)} (${octets.length} o)`); ok++
  } catch (e) { console.log(`  ✗ ${famille} : ${e.message}`) }
}
console.log(`${ok}/${familles.length} polices prêtes dans ${path.relative(RACINE, DOSSIER)}`)
process.exit(ok === familles.length ? 0 : 1)
