// Crochet de résolution des sondes des juges des droits du bus (026-038), chargé par --import dans le processus de la sonde :
//   - `@/x` → <JUGE_RACINE>/x ; un chemin relatif sans extension → .ts, .tsx, /index.ts (comme scripts/ts-loader.mjs) ;
//   - next/server → doublures/next/server.mjs ;
//   - un fichier de la racine nommé dans JUGE_DOUBLURES (« lib/direction/garde,lib/flags ») → sa doublure doublures/<nom>.mjs,
//     quel que soit le chemin d'import (alias ou relatif) ;
//   - un paquet npm introuvable depuis la racine se résout depuis le node_modules du dépôt (JUGE_REPO).
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const ici = path.dirname(fileURLToPath(import.meta.url))
const racine = process.env.JUGE_RACINE
if (racine) {
  const doublures = {}
  for (const n of String(process.env.JUGE_DOUBLURES || '').split(',').map((x) => x.trim()).filter(Boolean)) doublures[n] = pathToFileURL(path.join(ici, `${n}.mjs`)).href
  register(pathToFileURL(path.join(ici, 'crochet-resolution.mjs')).href, {
    data: {
      racine: pathToFileURL(path.resolve(racine) + path.sep).href,
      doublures,
      next: pathToFileURL(path.join(ici, 'next', 'server.mjs')).href,
      repo: pathToFileURL(path.join(path.resolve(process.env.JUGE_REPO || '.'), 'package.json')).href,
    },
  })
}
