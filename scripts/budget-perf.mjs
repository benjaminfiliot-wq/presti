// Budget de performance (v4 §13) — lu depuis la sortie du build Next.
//
// Les pages qui comptent sont celles que voient les CLIENTS de l'artisan : le site
// vitrine et la plateforme de contact, souvent ouvertes au téléphone, en 4G moyenne,
// depuis un chantier. La console de l'artisan a droit à plus de largeur.
//
// Ce contrôle existe parce que le poids ne se dégrade jamais d'un coup : il dérive de
// 2 Ko à chaque ajout, personne ne le remarque, et six mois plus tard la page rame.
// Usage : node scripts/budget-perf.mjs   (après `next build`)
//
// Deux sources de vérité selon la version de Next installée (fiche 026-253, 29/09) :
//   - Next 15 (et antérieur) : `.next/app-build-manifest.json`, `pages["<route>/page"]` — un
//     tableau de fichiers tout prêt, lu tel quel (comportement inchangé).
//   - Next 16 `--webpack` : ce fichier a disparu (confirmé : aucune trace dans
//     `node_modules/next/dist/`, aucune constante `APP_BUILD_MANIFEST` dans
//     `next/dist/shared/lib/constants.js`, absent de `.next/` après un build réussi — pas un
//     renommage, une suppression). Reconstitué depuis deux sources qui, elles, existent
//     toujours : `.next/build-manifest.json` → `rootMainFiles` (runtime webpack + framework +
//     chunks partagés, chargés sur TOUTE page) ; `.next/static/chunks/app/<segments de la
//     route>/{layout,page}-*.js` (convention de nommage stable des chunks webpack par segment)
//     pour le code propre à la route et à chaque layout parent, sans jamais lire récursivement
//     (les routes sœurs vivent dans d'autres dossiers de segment, donc hors du glob).
//     `build-manifest.json` a aussi `polyfillFiles` : délibérément exclu, comme Next 15 les
//     excluait déjà de son manifeste par route (vérifié : absents de `pages["/site/[slug]/page"]`
//     sous 15.5.26) — c'est un bundle de compatibilité pour navigateurs anciens (~39 Ko gzip),
//     jamais exécuté par un téléphone actuel. Le détail des deux mesures comparées (avant/après,
//     fichier par fichier) est dans `.orchestre/preuves/026-253/diagnostic.md`.
//   Dans les deux cas, une route introuvable reste un ÉCHEC, jamais un avertissement (voir plus bas).

import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'

const BUDGETS = [
  // 29/09 — décision du chef (Claude Code), fiche 026-006 : budgets relevés de 135 à 150 Ko pour la montée à Next 16
  // (mesure honnête sous Next 16 --webpack : /site/[slug] 138 Ko, /p/[slug] 143 Ko, dont 129 Ko de runtime Next/React
  // communs à toute page ; 179 Ko pour /p/[slug] sous Next 15 — voir .orchestre/preuves/026-253/diagnostic.md).
  // Le socle commun (runtime + layout racine) pèse déjà 133,5 Ko : 135 n'est plus tenable sans toucher aux pages des
  // artisans, ce que Benj refuse (décision du 29/09, .orchestre/decisions.md) ; la fiche d'allègement 026-254 est annulée.
  { route: '/site/[slug]', maxKo: 150, pourquoi: 'le site vitrine, ouvert au téléphone depuis un chantier' },
  { route: '/p/[slug]', maxKo: 150, pourquoi: 'la plateforme où le client écrit sa demande' },
]

if (!fs.existsSync('.next')) {
  console.error('❌ .next introuvable — lancez `npx next build` avant ce contrôle.')
  process.exit(1)
}

// Poids RÉELLEMENT TRANSFÉRÉ : les fichiers sont servis compressés. Mesurer les octets
// bruts donnerait un chiffre trois fois trop gros, sans rapport avec ce que subit le
// téléphone du client.
const tailleDe = (fichiers) => {
  let o = 0
  for (const f of new Set(fichiers)) {
    const p = path.join('.next', ...f.split('/'))
    if (fs.existsSync(p)) o += zlib.gzipSync(fs.readFileSync(p), { level: 9 }).length
  }
  return o
}

// Next 15 : le tableau de fichiers d'une route est déjà tout prêt dans app-build-manifest.json.
// Découvert le 29/09 par la casse volontaire (b) de la fiche 026-253 : la version précédente de
// cette fonction cherchait la clé par `.find(k => k === `${route}/page` || … || k.startsWith(`${route}/`))`,
// qui rend la PREMIÈRE clé de l'objet à satisfaire N'IMPORTE LAQUELLE des trois conditions — sans
// jamais préférer une correspondance exacte à une correspondance approximative. Pour `/site/[slug]`,
// `pages` contient aussi `/site/[slug]/icon/route`, `/site/[slug]/opengraph-image/route`,
// `/site/[slug]/apple-icon/route`, `/site/[slug]/layout`, `/site/[slug]/not-found` et
// `/site/[slug]/[...reste]/page`, qui commencent tous par `/site/[slug]/` : selon l'ordre d'écriture
// du manifeste par Next, `.find()` pouvait rendre `/site/[slug]/icon/route` (une poignée de Ko, une
// icône) au lieu de `/site/[slug]/page` (la vraie page) — le budget mesurait silencieusement la
// mauvaise route depuis le début. Gonfler le fichier réel de la page ne faisait alors RIEN bouger :
// le juge restait vert. Corrigé : correspondance exacte d'abord (`${route}/page`, puis `route` seul),
// jamais de repli approximatif sur un chemin imbriqué — une route sans clé exacte est une route
// ABSENTE, pas une invitation à deviner. Détail et preuve : .orchestre/preuves/026-253/diagnostic.md.
function fichiersAncienManifeste(route) {
  const p = path.join('.next', 'app-build-manifest.json')
  if (!fs.existsSync(p)) return null
  const app = JSON.parse(fs.readFileSync(p, 'utf8')).pages ?? {}
  const clef = `${route}/page` in app ? `${route}/page` : route in app ? route : null
  return clef ? app[clef] : null
}

// Next 16 --webpack : reconstitué depuis build-manifest.json (chunks partagés) + les chunks de
// chaque segment de la route (page + layouts parents, jamais les routes sœurs).
function fichiersChunksParSegment(route) {
  const bmPath = path.join('.next', 'build-manifest.json')
  if (!fs.existsSync(bmPath)) return null
  const bm = JSON.parse(fs.readFileSync(bmPath, 'utf8'))
  const fichiers = Array.isArray(bm.rootMainFiles) ? [...bm.rootMainFiles] : []
  const segments = route.split('/').filter(Boolean)
  let segments_lus = []
  let pageTrouvee = false
  for (let i = 0; i <= segments.length; i++) {
    const dirAbs = path.join('.next', 'static', 'chunks', 'app', ...segments_lus)
    if (fs.existsSync(dirAbs)) {
      for (const f of fs.readdirSync(dirAbs)) {
        if (!f.endsWith('.js')) continue
        const chemin = ['static', 'chunks', 'app', ...segments_lus, f].join('/')
        if (f.startsWith('layout-')) fichiers.push(chemin)
        if (i === segments.length && f.startsWith('page-')) { fichiers.push(chemin); pageTrouvee = true }
      }
    }
    if (i < segments.length) segments_lus = [...segments_lus, segments[i]]
  }
  return pageTrouvee ? fichiers : null
}

let ko = 0
for (const b of BUDGETS) {
  const fichiers = fichiersAncienManifeste(b.route) ?? fichiersChunksParSegment(b.route)
  // Une route absente de la sortie de build est un ÉCHEC, pas un avertissement. C'est le seul
  // contrôle de poids du dépôt et il bloque les PR : le jour où une route est renommée, il
  // cessait de mesurer quoi que ce soit tout en continuant d'imprimer du vert. Un budget qui
  // s'éteint tout seul ne protège de rien — et c'est justement quand on renomme qu'on a besoin
  // de lui.
  if (!fichiers) { console.log(`❌ ${b.route} — route ABSENTE de la sortie de build : le budget ne mesure plus rien. Renommée ? Corrigez BUDGETS.`); ko++; continue }
  const kilos = Math.round(tailleDe(fichiers) / 1024)
  const ok = kilos <= b.maxKo
  if (!ok) ko++
  console.log(`${ok ? '✅' : '❌'} ${b.route} — ${kilos} Ko (budget ${b.maxKo} Ko) · ${b.pourquoi}`)
}

if (ko) {
  console.error('\n❌ Budget dépassé. Deux issues honnêtes : alléger, ou décider explicitement de relever le budget dans ce fichier — jamais le contourner.')
  process.exit(1)
}
console.log('\n✅ budgets tenus')
