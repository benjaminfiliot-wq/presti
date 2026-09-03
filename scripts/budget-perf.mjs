// Budget de performance (v4 §13) — lu depuis la sortie du build Next.
//
// Les pages qui comptent sont celles que voient les CLIENTS de l'artisan : le site
// vitrine et la plateforme de contact, souvent ouvertes au téléphone, en 4G moyenne,
// depuis un chantier. La console de l'artisan a droit à plus de largeur.
//
// Ce contrôle existe parce que le poids ne se dégrade jamais d'un coup : il dérive de
// 2 Ko à chaque ajout, personne ne le remarque, et six mois plus tard la page rame.
// Usage : node scripts/budget-perf.mjs   (après `next build`)

import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'

const BUDGETS = [
  { route: '/site/[slug]', maxKo: 135, pourquoi: 'le site vitrine, ouvert au téléphone depuis un chantier' },
  { route: '/p/[slug]', maxKo: 135, pourquoi: 'la plateforme où le client écrit sa demande' },
]

const manifeste = path.join('.next', 'app-build-manifest.json')
if (!fs.existsSync(manifeste)) {
  console.error('❌ .next introuvable — lancez `npx next build` avant ce contrôle.')
  process.exit(1)
}

// Poids RÉELLEMENT TRANSFÉRÉ : les fichiers sont servis compressés. Mesurer les octets
// bruts donnerait un chiffre trois fois trop gros, sans rapport avec ce que subit le
// téléphone du client.
const app = JSON.parse(fs.readFileSync(manifeste, 'utf8')).pages ?? {}
const tailleDe = (fichiers) => {
  let o = 0
  for (const f of new Set(fichiers)) {
    const p = path.join('.next', f)
    if (fs.existsSync(p)) o += zlib.gzipSync(fs.readFileSync(p), { level: 9 }).length
  }
  return o
}

let ko = 0
for (const b of BUDGETS) {
  const clef = Object.keys(app).find((k) => k === `${b.route}/page` || k === b.route || k.startsWith(`${b.route}/`))
  if (!clef) { console.log(`⚠️  ${b.route} — route absente du manifeste, contrôle ignoré`); continue }
  const kilos = Math.round(tailleDe(app[clef]) / 1024)
  const ok = kilos <= b.maxKo
  if (!ok) ko++
  console.log(`${ok ? '✅' : '❌'} ${b.route} — ${kilos} Ko (budget ${b.maxKo} Ko) · ${b.pourquoi}`)
}

if (ko) {
  console.error('\n❌ Budget dépassé. Deux issues honnêtes : alléger, ou décider explicitement de relever le budget dans ce fichier — jamais le contourner.')
  process.exit(1)
}
console.log('\n✅ budgets tenus')
