// La preuve du lot A (juges-026-lt-preuve.mjs) sait échouer : pour chaque critère JL, un fichier de lot fautif (sous
// .orchestre/travail/, option --preuve-fichier) ou un faux juge qui commet la faute ; la preuve doit sortir en code ≠ 0 avec
// ce critère en échec. Un faux juge sain doit, lui, passer (sinon les refus ne prouveraient rien).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const R = 'C:/Users/benja/Documents/presti'
const D = path.join(R, '.orchestre/travail/026-lt-preuve/sait-echouer')
fs.mkdirSync(D, { recursive: true })
const INTRUS = path.join(R, '.orchestre', '026-lt-intrus.tmp')
const FAUX = String.raw`// Faux juge de l'auto-contrôle de juges-026-lt-preuve (026-018) : commet, selon --mode, la faute qu'un critère JL doit voir.
import fs from 'node:fs'
import path from 'node:path'
const R = ${JSON.stringify(R)}
const args = process.argv.slice(2)
const mode = (args.find((a) => a.startsWith('--mode=')) ?? '--mode=sain').slice(7)
const r = args.find((a) => a.startsWith('--racine='))
const racine = r ? path.resolve(R, r.slice(9)) : R
const temoin = args.includes('--temoin')
console.log('faux-qa — mode ' + mode + (temoin ? ' (témoin)' : ''))
if (!temoin) {
  if (mode === 'pile') throw new Error('plantage volontaire du faux juge')
  console.log("❌ FX-1 lib/faux.ts absent : le module n'existe pas (encore)")
  console.log('faux-qa : FAIL — FX-1')
  process.exit(1)
}
if (mode === 'reseau') await fetch('https://api.stripe.com/v1/charges').catch(() => {})
if (mode === 'intrus') fs.writeFileSync(path.join(R, '.orchestre', '026-lt-intrus.tmp'), 'intrus du faux juge\n')
const vl = path.join(racine, '.orchestre', 'preuves', '026-999', 'verifier.log')
if (mode !== 'vide-ignore' && fs.existsSync(vl) && fs.statSync(vl).size === 0) { console.log('❌ FX-PV .orchestre/preuves/026-999/verifier.log fait 0 octet'); console.log('faux-qa : FAIL — FX-PV'); process.exit(1) }
if (mode === 'temoin-rouge') { console.log('❌ FX-2 (NR) rouge volontaire'); console.log('faux-qa : FAIL — FX-2'); process.exit(1) }
if (mode === 'sans-nr') { console.log('✅ FX-2 vert, sans marque de non-régression'); console.log('faux-qa : PASS'); process.exit(0) }
console.log('✅ FX-2 (NR) rien n’a changé')
console.log('✅ FX-PV aucune preuve vide')
console.log('faux-qa : PASS')
`
fs.writeFileSync(path.join(D, 'faux-qa.mjs'), FAUX)
const A = JSON.parse(fs.readFileSync(path.join(R, 'scripts/fixtures/026-livraison-tresor/preuve-a.json'), 'utf8'))
const faux = (mode, extra = {}) => ({ commande: `node .orchestre/travail/026-lt-preuve/sait-echouer/faux-qa.mjs --mode=${mode}`, echec_attendu: 'FX-1', cite: 'lib/faux.ts', fiche_jugee: '026-999', ...extra })
const lot = (juges) => ({ ...A, juges })
const CAS = [
  ['témoin : faux juge sain', lot([faux('sain')]), null],
  ['JL-1 : critère attendu faux (FX-3 au lieu de FX-1)', lot([faux('sain', { echec_attendu: 'FX-3' })]), 'JL-1'],
  ['JL-1 : la ligne d’échec ne cite pas le fichier attendu', lot([faux('sain', { cite: 'lib/autre.ts' })]), 'JL-1'],
  ['JL-1 : pile d’exception non rattrapée sur la référence', lot([faux('pile')]), 'JL-1'],
  ['JL-1 : un vrai juge, critère attendu SC-2 au lieu de SC-1', lot([{ ...A.juges[0], echec_attendu: 'SC-2' }]), 'JL-1'],
  ['JL-2 : témoin rouge', lot([faux('temoin-rouge')]), 'JL-2'],
  ['JL-2 : témoin vert sans critère (NR)', lot([faux('sans-nr')]), 'JL-2'],
  ['JL-3 : un fetch vers api.stripe.com en témoin', lot([faux('reseau')]), 'JL-3'],
  ['JL-4 : une preuve de 0 octet ignorée', lot([faux('vide-ignore')]), 'JL-4'],
  ['JL-5 : un fichier écrit hors scripts/ et .orchestre/{travail,preuves}/', lot([faux('intrus')]), 'JL-5'],
]
const lignes = []
let ok = 0
for (const [i, [nom, contenu, attendu]] of CAS.entries()) {
  const f = path.join(D, `lot-${i}.json`)
  fs.writeFileSync(f, JSON.stringify(contenu, null, 1))
  const r = spawnSync(process.execPath, ['scripts/juges-026-lt-preuve.mjs', '--lot=A', `--preuve-fichier=${path.relative(R, f)}`], { cwd: R, encoding: 'utf8', timeout: 600_000 })
  if (fs.existsSync(INTRUS)) fs.unlinkSync(INTRUS) // le seul fichier que le faux juge « intrus » a posé
  const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`
  fs.writeFileSync(path.join(D, `lot-${i}.sortie.log`), sortie)
  const rouges = sortie.split(/\r?\n/).filter((l) => /^❌ JL-\d/.test(l))
  const juste = attendu === null ? r.status === 0 && !rouges.length : r.status !== 0 && rouges.some((l) => l.startsWith(`❌ ${attendu} `))
  if (juste) ok++
  const cible = attendu ? rouges.find((l) => l.startsWith(`❌ ${attendu} `)) : sortie.split(/\r?\n/).find((l) => /: PASS$/.test(l))
  lignes.push(`| ${nom} | ${attendu ?? 'PASS'} | ${r.status} | ${juste ? 'oui' : 'NON'} | ${String(cible ?? rouges[0] ?? '—').replace(/\|/g, '\\|').slice(0, 260)} |`)
  console.log(`${juste ? '✓' : '✗'} ${nom} → code ${r.status} ; ${court(cible ?? rouges.join(' / '))}`)
}
function court(t) { const x = String(t ?? '').replace(/\s+/g, ' '); return x.length > 160 ? x.slice(0, 159) + '…' : x }
const st = spawnSync('git', ['status', '--porcelain', '--', '.orchestre/026-lt-intrus.tmp'], { cwd: R, encoding: 'utf8' }).stdout.trim()
const md = [
  '# La preuve du lot A sait échouer (JL-1 à JL-5)',
  '',
  `Produit par un script de Claude Code le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')} : \`node scripts/juges-026-lt-preuve.mjs --lot=A --preuve-fichier=<lot fautif>\`, fichiers de lot et faux juge sous \`.orchestre/travail/026-lt-preuve/sait-echouer/\` (sorties complètes à côté : \`lot-<n>.sortie.log\`). Le fichier posé par le faux juge « intrus » est retiré après son passage ; git status ne le montre plus : ${st ? `NON (${st})` : 'oui'}.`,
  '',
  '| Cas | Attendu | Code | Juste | Ligne relevée (extrait réel) |',
  '|---|---|---|---|---|',
  ...lignes,
  '',
  `Bilan : ${ok}/${CAS.length} justes.`,
  '',
]
fs.writeFileSync(path.join(R, '.orchestre/preuves/026-018/sait-echouer-preuve.md'), md.join('\n'))
console.log(`bilan ${ok}/${CAS.length}`)
