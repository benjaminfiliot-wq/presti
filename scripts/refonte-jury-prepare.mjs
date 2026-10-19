#!/usr/bin/env node
// scripts/refonte-jury-prepare.mjs — PROMPT-BENJ §6 : le jury de design INDÉPENDANT note avant/après SANS savoir lequel est le
// nouveau. Copie chaque paire de captures (presti-ops/refonte-1018/avant|apres) dans presti-ops/refonte-1018/jury/<écran>/
// sous les noms neutres version-1.png et version-2.png, l'ordre tiré au sort par écran. La clé (quelle version est la nouvelle)
// est écrite HORS du dossier du jury, dans le chemin donné en argument (le dossier de travail de l'agent qui organise).
// Usage : node scripts/refonte-jury-prepare.mjs <chemin-de-la-cle.json>
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const cle = process.argv[2]
if (!cle) { console.error('Chemin de la clé manquant (hors du dossier du jury).'); process.exit(2) }
const OPS = path.resolve(process.cwd(), '..', 'presti-ops', 'refonte-1018')
const JURY = path.join(OPS, 'jury')
if (path.resolve(cle).startsWith(JURY)) { console.error('La clé ne doit pas être dans le dossier du jury.'); process.exit(2) }
const PAIRES = [
  ['01-landing-premier-ecran-1440', 'avant/landing/accueil-1440-ecran1.png', 'apres/landing/accueil-1440-ecran1.png'],
  ['02-landing-premier-ecran-390', 'avant/landing/accueil-390-ecran1.png', 'apres/landing/accueil-390-ecran1.png'],
  ['03-landing-page-entiere-390', 'avant/landing/accueil-390-plein.png', 'apres/landing/accueil-390-plein.png'],
  ['04-console-accueil-1440', 'avant/console/rempli-dashboard-1440.png', 'apres/console/rempli-dashboard-1440.png'],
  ['05-console-accueil-390', 'avant/console/rempli-dashboard-390.png', 'apres/console/rempli-dashboard-390.png'],
  ['06-console-devis-liste-1440', 'avant/console/rempli-devis-1440.png', 'apres/console/rempli-devis-1440.png'],
  ['07-console-devis-liste-390', 'avant/console/rempli-devis-390.png', 'apres/console/rempli-devis-390.png'],
  ['08-console-fiche-devis-1440', 'avant/console/rempli-devis-fiche-envoye-1440.png', 'apres/console/rempli-devis-fiche-envoye-1440.png'],
  ['09-console-factures-1440', 'avant/console/rempli-factures-1440.png', 'apres/console/rempli-factures-1440.png'],
  ['10-console-menu-telephone-390', 'avant/console/rempli-menu-ouvert-390.png', 'apres/console/rempli-tiroir-plus-390.png'],
]
fs.mkdirSync(JURY, { recursive: true })
const cles = {}
for (const [ecran, avant, apres] of PAIRES) {
  const a = path.join(OPS, avant), b = path.join(OPS, apres)
  if (!fs.existsSync(a) || !fs.existsSync(b)) { console.log(`— ${ecran} : capture absente`); continue }
  const d = path.join(JURY, ecran)
  fs.mkdirSync(d, { recursive: true })
  const nouvelleEn1 = crypto.randomInt(2) === 1
  fs.copyFileSync(nouvelleEn1 ? b : a, path.join(d, 'version-1.png'))
  fs.copyFileSync(nouvelleEn1 ? a : b, path.join(d, 'version-2.png'))
  cles[ecran] = { nouvelle: nouvelleEn1 ? 'version-1' : 'version-2' }
  console.log(`✓ ${ecran}`)
}
fs.writeFileSync(cle, JSON.stringify(cles, null, 1))
console.log(`clé → ${cle}`)
