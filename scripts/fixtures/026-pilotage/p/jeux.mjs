// scripts/fixtures/026-pilotage/p/jeux.mjs — l'auto-contrôle des jeux d'essai du lot p (JA-3 de juges-026-pilotage-preuve),
// écrit par Claude Code le 27/09 (l'ancien ne comparait que deux fichiers de 11 octets), revu le 28/09 (atelier témoin dans le
// témoin, couverture des sabotages).
//
// controleJeux vérifie, sans usine :
//   1. donnees-a.json et donnees-b.json (les deux jeux que station-planche-qa sert à la planche pour PN-6) : même forme, et
//      AUCUNE valeur commune (chaque nombre, texte et booléen diffère) — sinon un décor qui peindrait une donnée pourrait
//      rendre deux fois la même image ; ils portent les données qu'un décor serait tenté de peindre (égaliseur de 12 h,
//      histogramme de 30 jours, « J6/30 · 0 € », compteurs de la barre, tapis) et `jeu` (« a », « b »), que lisent les
//      sabotages de l'atelier ;
//   2. l'atelier témoin (./temoin/atelier-temoin, fichiers suffixés .temoin) : ses cinq fichiers, non vides ; le lot le passe
//      au juge par --atelier=atelier-temoin et le planche.md du témoin le cite par « atelier: racine » (un atelier non
//      versionné posé dans la racine jugée) ; son atlas est un PNG de 256 × 256 dont chaque pixel est transparent ou opaque
//      dans la palette ;
//   3. la palette : la même liste de 24 à 32 couleurs dans fabriquer-atlas.mjs, planche.js de l'atelier témoin et le
//      planche.md du témoin ;
//   4. les emplacements du grille.json du témoin : ceux que dessine planche.js (caseBureau), la réservée en 21e ;
//   5. les sabotages du lot : chacun de PN-1 à PN-9 est tué par au moins un ; PN-6, PN-8 et PN-9 (que les documents seuls ne
//      touchent pas) par un sabotage de l'atelier témoin — un juge dont l'un d'eux serait neutralisé ne resterait pas vert.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const T = path.join(ICI, 'temoin')
const TEMOIN_PLANCHE = path.join(T, 'docs', 'station', 'planche.md.temoin')
const TEMOIN_GRILLE = path.join(T, 'docs', 'station', 'grille.json.temoin')
const ATELIER = 'atelier-temoin'
const FICHIERS_ATELIER = ['package.json', 'server/index.js', 'planche/index.html', 'planche/planche.js', 'planche/atlas.png']
const aT = (f) => path.join(T, ATELIER, ...f.split('/')) + '.temoin'
const lire = (f) => fs.readFileSync(f, 'utf8')

// Toutes les feuilles d'un objet JSON, par chemin.
function feuilles(o, chemin = '$', acc = new Map()) {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) feuilles(v, `${chemin}.${k}`, acc)
  else acc.set(chemin, o)
  return acc
}
const palette = (texte) => [...texte.matchAll(/'(#[0-9a-f]{6})'/gi)].map((m) => m[1].toLowerCase())
const blocPlanche = (texte) => /```planche[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```/.exec(texte)?.[1] ?? ''

export async function controleJeux(ctx) {
  const e = [], d = []
  // 1. Les deux jeux de données.
  let a = null, b = null
  try { a = JSON.parse(lire(path.join(ICI, 'donnees-a.json'))); b = JSON.parse(lire(path.join(ICI, 'donnees-b.json'))) } catch (err) { e.push(`donnees-a/b.json illisibles : ${err.message}`) }
  if (a && b) {
    const fa = feuilles(a), fb = feuilles(b)
    const forme = [...fa.keys()].filter((k) => !fb.has(k)).concat([...fb.keys()].filter((k) => !fa.has(k)))
    if (forme.length) e.push(`donnees-a et donnees-b n'ont pas la même forme : ${forme.slice(0, 3).join(', ')}`)
    const communes = [...fa.keys()].filter((k) => fb.has(k) && fa.get(k) === fb.get(k))
    if (communes.length) e.push(`${communes.length} valeur(s) identique(s) entre donnees-a et donnees-b : ${communes.slice(0, 3).join(', ')}`)
    for (const [c, v] of [['$.salles.radar.egaliseur', 12], ['$.salles.recettes.histogramme', 30]]) { const x = c.split('.').slice(1).reduce((o, k) => o?.[k], a); if (!Array.isArray(x) || x.length !== v) e.push(`${c} : ${v} valeurs attendues`) }
    for (const c of ['$.salles.experience.texte', '$.barre.encaisse_mois_eur', '$.barre.envois_du_jour', '$.tapis.CONTACTE', '$.salles.radar.requetes_du_jour']) if (!fa.has(c)) e.push(`${c} absent de donnees-a.json`)
    if (a.jeu !== 'a' || b.jeu !== 'b') e.push(`« jeu » vaut ${JSON.stringify(a.jeu)} et ${JSON.stringify(b.jeu)}, « a » et « b » attendus (les sabotages de l'atelier le lisent)`)
    if (!e.length) d.push(`donnees-a/b : ${fa.size} valeurs, même forme, aucune en commun (égaliseur de 12 h, histogramme de 30 jours, « ${a.salles.experience.texte} » / « ${b.salles.experience.texte} »)`)
  }
  // 2. L'atelier témoin, posé dans la racine jugée.
  let lot = null
  try { lot = await import(`${pathToFileURL(path.join(ICI, 'lot.mjs')).href}?jeux=${Date.now()}`) } catch (err) { e.push(`lot.mjs illisible : ${err.message}`) }
  const juge = lot?.juges?.find((j) => j.commande === 'scripts/station-planche-qa.mjs')
  {
    const n = e.length
    for (const f of FICHIERS_ATELIER) { let st = null; try { st = fs.statSync(aT(f)) } catch { /* absent */ } if (!st || !st.size) e.push(`temoin/${ATELIER}/${f}.temoin ${st ? 'vide' : 'absent'}`) }
    if (!juge?.arguments?.includes(`--atelier=${ATELIER}`)) e.push(`lot.mjs ne passe pas --atelier=${ATELIER} au juge (l'atelier témoin du témoin ne serait pas jugé)`)
    if (!lot?.absents?.includes(`${ATELIER}/`)) e.push(`lot.mjs : « ${ATELIER}/ » absent de \`absents\` (la référence ne doit pas le porter)`)
    let cite = null
    try { cite = /^\s*atelier:\s*(.*?)\s*$/m.exec(blocPlanche(lire(TEMOIN_PLANCHE)))?.[1] ?? null } catch { /* absent */ }
    if (cite !== 'racine') e.push(`le planche.md du témoin cite « atelier: ${cite ?? '(rien)'} », « atelier: racine » attendu (atelier non versionné posé dans la racine jugée)`)
    try {
      const buf = fs.readFileSync(aT('planche/atlas.png'))
      if (!buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) e.push('atlas.png.temoin : pas un PNG')
      else {
        const sharp = createRequire(path.join(ctx.racine, 'package.json'))('sharp')
        const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        const pal = new Set(palette(lire(path.join(ICI, 'fabriquer-atlas.mjs'))).map((h) => parseInt(h.slice(1), 16)))
        let semi = 0, hors = 0, opaques = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue
          if (data[i + 3] !== 255) { semi++; continue }
          opaques++
          if (!pal.has((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])) hors++
        }
        if (info.width !== 256 || info.height !== 256) e.push(`atlas.png.temoin : ${info.width}×${info.height}, 256×256 attendu`)
        if (semi || hors || !opaques) e.push(`atlas.png.temoin : ${semi} pixel(s) semi-transparent(s), ${hors} hors palette, ${opaques} opaque(s)`)
        else d.push(`atlas témoin 256×256 : ${opaques} pixels opaques, tous dans la palette`)
      }
    } catch (err) { e.push(`atlas.png.temoin illisible : ${err.message}`) }
    if (e.length === n) d.push(`atelier témoin ./temoin/${ATELIER} (${FICHIERS_ATELIER.length} fichiers) passé par --atelier=${ATELIER}, cité « atelier: racine » par le planche.md du témoin, absent de la référence`)
  }
  // 3. La palette, identique aux trois endroits.
  try {
    const p1 = palette(lire(path.join(ICI, 'fabriquer-atlas.mjs'))), p2 = palette(lire(aT('planche/planche.js')))
    const p3 = (/^\s*palette:\s*(.*)$/m.exec(blocPlanche(lire(TEMOIN_PLANCHE)))?.[1]?.match(/#[0-9a-f]{6}\b/gi) ?? []).map((x) => x.toLowerCase())
    const n = e.length
    if (p1.length < 24 || p1.length > 32 || new Set(p1).size !== p1.length) e.push(`fabriquer-atlas.mjs : palette de ${p1.length} couleurs (24 à 32 distinctes attendues)`)
    if (p1.join() !== p2.join()) e.push('la palette de planche.js (atelier témoin) diffère de celle de fabriquer-atlas.mjs')
    if (p1.join() !== p3.join()) e.push('la palette du planche.md du témoin diffère de celle de fabriquer-atlas.mjs')
    if (e.length === n) d.push(`palette de ${p1.length} couleurs identique dans le fabricant d'atlas, l'atelier témoin et le planche.md du témoin`)
  } catch (err) { e.push(`palettes illisibles : ${err.message}`) }
  // 4. Les emplacements du témoin = ceux que dessine l'atelier.
  try {
    const n = e.length
    const g = JSON.parse(lire(TEMOIN_GRILLE))
    const cles = Object.keys(g.emplacements)
    const caseBureau = (i) => ({ x: 8 + (i % 7) * 56, y: 56 + Math.floor(i / 7) * 104, l: 48, h: 80 })
    if (!/caseBureau = \(i\) => \(\{ x: 8 \+ \(i % 7\) \* 56, y: 56 \+ Math\.floor\(i \/ 7\) \* 104, l: 48, h: 80 \}\)/.test(lire(aT('planche/planche.js')))) e.push('planche.js (atelier témoin) n’a plus la formule caseBureau que reprend ce contrôle')
    const faux = cles.filter((c, i) => JSON.stringify(g.emplacements[c]) !== JSON.stringify(caseBureau(i)))
    if (cles.length !== 20 || faux.length) e.push(`grille.json du témoin : ${cles.length} emplacements, ${faux.length} différent(s) de l'atelier (${faux.slice(0, 3).join(', ')})`)
    if (JSON.stringify(g.reserve) !== JSON.stringify(caseBureau(20))) e.push('grille.json du témoin : reserve n’est pas la 21e case de l’atelier')
    if (e.length === n) d.push('grille.json du témoin : les 20 emplacements et la réservée sont ceux que dessine l’atelier')
  } catch (err) { e.push(`grille.json du témoin illisible : ${err.message}`) }
  // 5. Les sabotages couvrent chaque critère ; PN-6, PN-8 et PN-9 par l'atelier.
  {
    const n = e.length
    const S = Array.isArray(juge?.sabotages) ? juge.sabotages : []
    const tues = new Map()
    for (const s of S) { const x = tues.get(s.tue) ?? { docs: 0, atelier: 0 }; x[String(s.fichier).startsWith(`${ATELIER}/`) ? 'atelier' : 'docs']++; tues.set(s.tue, x) }
    for (let i = 1; i <= 9; i++) if (!tues.has(`PN-${i}`)) e.push(`aucun sabotage du lot ne tue PN-${i}`)
    for (const id of ['PN-6', 'PN-8', 'PN-9']) if (!(tues.get(id)?.atelier > 0)) e.push(`aucun sabotage de l'atelier témoin ne tue ${id} (les documents seuls ne l'atteignent pas)`)
    if (e.length === n) d.push(`${S.length} sabotages : PN-1 à PN-9 tués chacun (${[...tues].sort().map(([k, v]) => `${k} ×${v.docs + v.atelier}`).join(', ')}), dont ${S.filter((s) => String(s.fichier).startsWith(`${ATELIER}/`)).length} dans l'atelier témoin`)
  }
  return { echecs: e, detail: d.join(' ; ') }
}
