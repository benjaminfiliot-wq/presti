// scripts/fixtures/026-pilotage/k/juge-grille-enfant.mjs — l'enfant de CL-15 (fiche 026-170, écrit par Claude Code).
//
//   node juge-grille-enfant.mjs <racine jugée> <theme.json>
//
// Il importe le module de la grille du MOTEUR (app/controle/station/moteur/grille/grille.ts sous la racine jugée, chargé par
// un crochet de résolution : `@/x` se résout sous la racine jugée, node:module register, Node 22 sans transpileur), joue le
// thème d'essai dessus et rend UNE ligne « @@grille@@ {json} » : les chemins, les impasses et les destinations. Aucun réseau,
// aucune lecture hors de la racine jugée et du thème. Le contrat lu dans le module (NOTES-JUGE.md) :
//   construireGrille(theme) → grille ; astar2D(grille, de, vers) → [{x,y}…] (départ exclu) | null ;
//   destinations(theme) → { salles: { <clé>: {x,y} }, postes: { <clé>: {x,y} } } ; tapisContinu(theme) → booléen.
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { CROCHET, urlDossier } from '../s/commun.mjs'
import { R } from '../a/commun.mjs'

const [racine, fichierTheme] = process.argv.slice(2)
const sortie = (o) => console.log(`@@grille@@ ${JSON.stringify(o)}`)
try {
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racine: urlDossier(racine), depot: urlDossier(R), doublures: '', doubles: {}, prefixes: {}, paquets: {} } })
  const G = await import(pathToFileURL(path.join(racine, 'app', 'controle', 'station', 'moteur', 'grille', 'grille.ts')).href)
  for (const nom of ['construireGrille', 'astar2D', 'destinations', 'tapisContinu']) if (typeof G[nom] !== 'function') throw new Error(`grille.ts n'exporte pas ${nom}`)
  const theme = JSON.parse(fs.readFileSync(fichierTheme, 'utf8'))
  const pas = theme.grille.pas
  const grille = G.construireGrille(theme)
  const cmd = theme.emplacements.find((e) => e.cle === 'commandement')
  const depart = cmd.poste
  const joignables = [], impasses = [], discontinus = []
  const voisins = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === pas
  for (const e of theme.emplacements) {
    if (e.reservee) continue
    for (const [quoi, cible] of [['porte', e.porte], ['poste', e.poste]]) {
      const ch = G.astar2D(grille, depart, cible)
      if (!Array.isArray(ch)) { impasses.push(`${e.cle}.${quoi}`); continue }
      let prec = depart
      for (const p of ch) { if (!voisins(prec, p)) { discontinus.push(`${e.cle}.${quoi}`); break } prec = p }
      if (ch.length && (prec.x !== cible.x || prec.y !== cible.y)) discontinus.push(`${e.cle}.${quoi} (n'arrive pas)`)
      joignables.push(`${e.cle}.${quoi}`)
    }
  }
  // La salle réservée : aucune case de son rectangle n'est joignable depuis le Commandement.
  const res = theme.emplacements.filter((e) => e.reservee)
  const atteintes = []
  for (const e of res) {
    const { x = 0, y = 0, l = 0, h = 0 } = e.forme
    for (let cy = y; cy < y + h; cy += pas) for (let cx = x; cx < x + l; cx += pas) {
      const ch = G.astar2D(grille, depart, { x: cx, y: cy })
      if (Array.isArray(ch)) atteintes.push(`${e.cle}@${cx},${cy}`)
    }
  }
  const d = G.destinations(theme)
  const reservees = res.map((e) => e.cle)
  const destReservee = reservees.filter((c) => d?.salles?.[c] || d?.postes?.[c])
  sortie({ ok: true, joignables: joignables.length, impasses, discontinus, atteintes: atteintes.slice(0, 5), destReservee, tapis: !!G.tapisContinu(theme), sallesDest: Object.keys(d?.salles ?? {}).length, postesDest: Object.keys(d?.postes ?? {}).length })
} catch (e) {
  sortie({ ok: false, erreur: String(e?.message ?? e).split('\n')[0].slice(0, 200) })
}
