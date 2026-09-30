// Le crochet de résolution des sondes de 026-194 : celui des droits du bus (026-038, scripts/fixtures/026-horloge-bus/doublures/
// crochet-resolution.mjs : `@/x` → <JUGE_RACINE>/x, extensions .ts, next/server doublé, paquets npm repris du dépôt), avec les
// doublures nommées dans JUGE_DOUBLURES prises d'abord ici, puis chez 026-038 (lib/flags).
import { register } from 'node:module'
import { existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const ici = path.dirname(fileURLToPath(import.meta.url))
const bus = path.join(ici, '..', '..', '026-horloge-bus', 'doublures')
const racine = process.env.JUGE_RACINE
if (racine) {
  const doublures = {}
  for (const n of String(process.env.JUGE_DOUBLURES || '').split(',').map((x) => x.trim()).filter(Boolean)) {
    const chez = existsSync(path.join(ici, `${n}.mjs`)) ? ici : bus
    doublures[n] = pathToFileURL(path.join(chez, `${n}.mjs`)).href
  }
  register(pathToFileURL(path.join(bus, 'crochet-resolution.mjs')).href, {
    data: {
      racine: pathToFileURL(path.resolve(racine) + path.sep).href,
      doublures,
      next: pathToFileURL(path.join(bus, 'next', 'server.mjs')).href,
      repo: pathToFileURL(path.join(path.resolve(process.env.JUGE_REPO || '.'), 'package.json')).href,
    },
  })
}
