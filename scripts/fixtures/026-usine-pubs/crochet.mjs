// Chargé par --import dans la sonde des routes (026-199) : enregistre le crochet de résolution (crochet-resolution.mjs) avec la racine jugée.
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const ici = path.dirname(fileURLToPath(import.meta.url))
const racine = process.env.UP_RACINE
if (racine) {
  const url = (p) => pathToFileURL(p).href
  register(url(path.join(ici, 'crochet-resolution.mjs')), {
    data: {
      racine: url(path.resolve(racine) + path.sep),
      depot: url(path.resolve(process.env.UP_DEPOT || '.') + path.sep),
      doublures: { 'lib/flags': url(path.join(ici, 'doublures', 'flags.mjs')), 'lib/agents/garde': url(path.join(ici, 'doublures', 'garde.mjs')), 'lib/agents/pause': url(path.join(ici, 'doublures', 'pause.mjs')) },
      next: url(path.join(ici, 'doublures', 'next-server.mjs')),
    },
  })
}
