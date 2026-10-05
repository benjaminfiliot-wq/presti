// Diagnostic CL-8 sur COPIE (bac de l'usine) : sauvegarde le canevas des quatre jeux de critereDecor (hors depot).
import fs from 'node:fs'
import path from 'node:path'
import { R } from '../../../scripts/fixtures/026-pilotage/a/commun.mjs'
import { preparerCopie, construire, servir, chunksPhaser } from '../../../scripts/fixtures/026-pilotage/k/juge-arbre.mjs'
import { lancerNavigateur, critereDecor } from '../../../scripts/fixtures/026-pilotage/k/juge-rendu.mjs'
import { suiteEvenements } from '../../../scripts/fixtures/026-pilotage/k/session-simulee.mjs'
const theme = JSON.parse(fs.readFileSync(path.join(R, 'scripts/fixtures/026-pilotage/k/themes/essai/theme.json'), 'utf8'))
const copie = preparerCopie(R, { nom: 'jugee', variante: 'jugee' })
if (copie.erreurs.length) { console.log('copie', copie.erreurs); process.exit(1) }
const b = await construire(copie, 'jugee')
if (!b.ok) { console.log('build', b.log?.slice?.(0, 500)); process.exit(1) }
const serveur = await servir(b.arbre)
const nav = await lancerNavigateur()
const ctx = { nav, base: serveur.base, chunks: chunksPhaser(b.arbre), theme, suite: suiteEvenements(), arbre: b.arbre }
const r = await critereDecor(ctx, ctx.suite)
console.log(JSON.stringify(r.echecs))
await nav.close(); await serveur.arreter()
